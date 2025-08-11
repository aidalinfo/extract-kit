import mammoth from "mammoth";
import { DocumentConverter } from "./base-converter.js";
import { preprocessDocx } from "../preprocessing/docx-preprocessor.js";
import { CustomHtmlToMarkdown } from "../utils/html-to-markdown.js";
import { createDocumentConverterResult } from "../types/result.js";
import { 
  FileConversionException, 
  MissingDependencyException 
} from "../types/converter.js";
import { ErrorHandler, ErrorCode, OfficeToMarkdownError } from "../utils/error-handler.js";
import type { DocumentConverterResult } from "../types/result.js";
import type { StreamInfo } from "../types/stream-info.js";
import type { ConverterOptions } from "../types/converter.js";

/**
 * Accepted MIME types for DOCX files
 */
const ACCEPTED_MIME_TYPE_PREFIXES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

/**
 * Accepted file extensions for DOCX files
 */
const ACCEPTED_FILE_EXTENSIONS = [".docx"];

/**
 * Converter for DOCX files to Markdown.
 * Converts DOCX → HTML → Markdown with support for:
 * - Tables
 * - Math equations (OMML to LaTeX)
 * - Headings and formatting
 * - Images (with alt text)
 * - Lists and other structural elements
 */
export class DocxConverter extends DocumentConverter {
  private htmlConverter: CustomHtmlToMarkdown;

  constructor(options: ConverterOptions = {}) {
    super();
    this.htmlConverter = new CustomHtmlToMarkdown(options);
  }

  /**
   * Check if this converter can handle the given file
   */
  accepts(buffer: Buffer, streamInfo: StreamInfo): boolean {
    const mimetype = (streamInfo.mimetype || "").toLowerCase();
    const extension = (streamInfo.extension || "").toLowerCase();

    // Check by file extension
    if (ACCEPTED_FILE_EXTENSIONS.includes(extension)) {
      return true;
    }

    // Check by MIME type
    for (const prefix of ACCEPTED_MIME_TYPE_PREFIXES) {
      if (mimetype.startsWith(prefix)) {
        return true;
      }
    }

    // Check by file signature (magic bytes) for DOCX files
    // DOCX files are ZIP archives, so they start with PK
    if (buffer.length >= 4) {
      const signature = buffer.subarray(0, 4);
      if (signature[0] === 0x50 && signature[1] === 0x4B) {
        // This is a ZIP file, could be DOCX
        // Additional check: look for word/ folder in the ZIP structure
        const bufferString = buffer.toString("binary", 0, Math.min(1024, buffer.length));
        if (bufferString.includes("word/") && bufferString.includes("document.xml")) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Convert DOCX file to Markdown
   */
  async convert(
    buffer: Buffer,
    streamInfo: StreamInfo,
    options: ConverterOptions = {}
  ): Promise<DocumentConverterResult> {
    return ErrorHandler.wrapAsync(async () => {
      // Check if mammoth is available
      if (!mammoth) {
        throw new OfficeToMarkdownError(
          "mammoth library is required for DOCX conversion. Please install it with: bun add mammoth",
          ErrorCode.MISSING_DEPENDENCY,
          { library: "mammoth" }
        );
      }

      // Step 1: Preprocess the DOCX file to handle math equations
      let processedBuffer = buffer;
      if (options.convertMath !== false) {
        try {
          processedBuffer = await preprocessDocx(buffer);
        } catch (error) {
          // Log warning but continue with original buffer
          ErrorHandler.logError(
            ErrorHandler.createConversionError(
              "preprocessing",
              error instanceof Error ? error : new Error("Unknown preprocessing error"),
              { filename: streamInfo.filename }
            )
          );
          processedBuffer = buffer; // Fallback to original
        }
      }

      // Step 2: Convert DOCX to HTML using mammoth
      const mammothOptions: any = {};
      
      // Apply custom style map if provided
      if (options.styleMap) {
        mammothOptions.styleMap = options.styleMap;
      }

      // Convert to HTML
      let result: any;
      try {
        result = await mammoth.convertToHtml(
          { buffer: processedBuffer },
          mammothOptions
        );
      } catch (error) {
        throw ErrorHandler.createConversionError(
          "docx-to-html",
          error instanceof Error ? error : new Error("Mammoth conversion failed"),
          { 
            filename: streamInfo.filename,
            bufferSize: processedBuffer.length,
            hasStyleMap: !!options.styleMap
          }
        );
      }

      // Check for conversion warnings and errors
      if (result.messages && result.messages.length > 0) {
        const errors = result.messages.filter((m: any) => m.type === "error");
        const warnings = result.messages.filter((m: any) => m.type === "warning");
        
        if (errors.length > 0) {
          console.warn(`Mammoth conversion errors (${errors.length}):`, errors);
        }
        
        if (warnings.length > 5) { // Only warn about excessive warnings
          console.warn(`Mammoth conversion warnings (${warnings.length} total)`);
        }
      }

      // Step 3: Extract title from HTML if available
      let title: string | undefined;
      try {
        const titleMatch = result.value.match(/<h1[^>]*>(.*?)<\/h1>/i);
        if (titleMatch) {
          title = titleMatch[1].replace(/<[^>]*>/g, "").trim();
        } else {
          // Try to get title from filename
          if (streamInfo.filename) {
            title = streamInfo.filename.replace(/\.(docx|doc)$/i, "");
          }
        }
      } catch (error) {
        // Title extraction is not critical, continue without it
        console.warn("Failed to extract title:", error);
      }

      // Step 4: Convert HTML to Markdown
      let markdown: string;
      try {
        markdown = this.htmlConverter.convert(result.value);
      } catch (error) {
        throw ErrorHandler.createConversionError(
          "html-to-markdown",
          error instanceof Error ? error : new Error("HTML to Markdown conversion failed"),
          { 
            filename: streamInfo.filename,
            htmlLength: result.value?.length || 0
          }
        );
      }

      return createDocumentConverterResult(markdown, title);

    }, {
      operation: "convert",
      filename: streamInfo.filename,
      filesize: buffer.length,
      mimetype: streamInfo.mimetype,
      extension: streamInfo.extension
    });
  }

  /**
   * Convert DOCX file from file path (convenience method)
   */
  async convertFile(filePath: string, options: ConverterOptions = {}): Promise<DocumentConverterResult> {
    try {
      const buffer = await this.sourceToBuffer(filePath);
      const streamInfo = this.inferStreamInfo(filePath);
      return await this.convert(buffer, streamInfo, options);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new FileConversionException(
        `Failed to convert DOCX file at ${filePath}: ${message}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Convert DOCX from multiple sources (batch processing)
   */
  async convertMultiple(
    sources: Array<{ buffer: Buffer; streamInfo: StreamInfo }>,
    options: ConverterOptions = {}
  ): Promise<DocumentConverterResult[]> {
    const results: DocumentConverterResult[] = [];
    const errors: Array<{ index: number; error: Error }> = [];

    for (let i = 0; i < sources.length; i++) {
      const { buffer, streamInfo } = sources[i];
      try {
        const result = await this.convert(buffer, streamInfo, options);
        results.push(result);
      } catch (error) {
        errors.push({ 
          index: i, 
          error: error instanceof Error ? error : new Error("Unknown error") 
        });
        // Add placeholder result to maintain array length
        results.push(createDocumentConverterResult("", "Failed to convert"));
      }
    }

    if (errors.length > 0) {
      console.warn(`Failed to convert ${errors.length} out of ${sources.length} documents:`, errors);
    }

    return results;
  }

  /**
   * Get conversion statistics and information
   */
  getConversionInfo(): {
    supportedExtensions: string[];
    supportedMimeTypes: string[];
    features: string[];
  } {
    return {
      supportedExtensions: [...ACCEPTED_FILE_EXTENSIONS],
      supportedMimeTypes: [...ACCEPTED_MIME_TYPE_PREFIXES],
      features: [
        "Tables",
        "Math equations (OMML to LaTeX)",
        "Headings and formatting", 
        "Images with alt text",
        "Lists and structural elements",
        "Custom style mapping",
        "Batch processing"
      ]
    };
  }
}