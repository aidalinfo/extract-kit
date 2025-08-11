/**
 * Office to Markdown Converter
 * 
 * A TypeScript library for converting Office documents (especially DOCX) to Markdown format.
 * Inspired by Microsoft's MarkItDown Python library but optimized for the Bun/TypeScript ecosystem.
 * 
 * Features:
 * - DOCX to Markdown conversion with table support
 * - Math equation conversion (OMML to LaTeX) 
 * - Heading hierarchy preservation
 * - Image handling with alt text
 * - Custom styling support
 * - Batch processing capabilities
 */

import { DocxConverter } from "./converters/docx-converter.js";
import { enhanceStreamInfo, isSupportedFileType, getFileInfo } from "./utils/file-detector.js";
import { createStreamInfo } from "./types/stream-info.js";
import { 
  FileConversionException, 
  UnsupportedFormatException 
} from "./types/converter.js";

import type { 
  ConvertibleSource, 
  ConverterOptions,
  FileSource 
} from "./types/converter.js";
import type { DocumentConverterResult } from "./types/result.js";
import type { StreamInfo } from "./types/stream-info.js";

// Re-export types and classes for external use
export type {
  ConvertibleSource,
  ConverterOptions,
  FileSource,
  DocumentConverterResult,
  StreamInfo
};

export {
  DocxConverter,
  FileConversionException,
  UnsupportedFormatException,
  createStreamInfo,
  enhanceStreamInfo,
  isSupportedFileType,
  getFileInfo
};

/**
 * Main converter class that orchestrates different document converters
 */
export class OfficeToMarkdown {
  private docxConverter: DocxConverter;

  constructor(options: ConverterOptions = {}) {
    this.docxConverter = new DocxConverter(options);
  }

  /**
   * Convert a document to Markdown format
   * 
   * @param source - The source to convert (file path, buffer, etc.)
   * @param options - Conversion options
   * @returns Promise resolving to conversion result
   */
  async convert(
    source: ConvertibleSource,
    options: ConverterOptions = {}
  ): Promise<DocumentConverterResult> {
    // Convert source to buffer
    const buffer = await this.sourceToBuffer(source);
    
    // Infer stream information
    const streamInfo = this.inferStreamInfo(source, options);
    
    // Enhance stream info with file type detection
    const enhancedInfo = enhanceStreamInfo(buffer, streamInfo);
    
    // Check if file type is supported
    if (!isSupportedFileType(enhancedInfo.mimetype, enhancedInfo.extension)) {
      throw new UnsupportedFormatException(
        `Unsupported file type: ${enhancedInfo.mimetype || "unknown"} (${enhancedInfo.extension || "unknown extension"})`
      );
    }

    // Route to appropriate converter
    if (this.docxConverter.accepts(buffer, enhancedInfo)) {
      return await this.docxConverter.convert(buffer, enhancedInfo, options);
    }

    throw new UnsupportedFormatException(
      "No suitable converter found for this file type"
    );
  }

  /**
   * Convert a DOCX file specifically
   * 
   * @param source - The DOCX source to convert
   * @param options - Conversion options
   * @returns Promise resolving to conversion result
   */
  async convertDocx(
    source: ConvertibleSource,
    options: ConverterOptions = {}
  ): Promise<DocumentConverterResult> {
    const buffer = await this.sourceToBuffer(source);
    const streamInfo = this.inferStreamInfo(source, options);
    const enhancedInfo = enhanceStreamInfo(buffer, streamInfo);
    
    return await this.docxConverter.convert(buffer, enhancedInfo, options);
  }

  /**
   * Batch convert multiple documents
   * 
   * @param sources - Array of sources to convert
   * @param options - Conversion options
   * @returns Promise resolving to array of conversion results
   */
  async convertMultiple(
    sources: ConvertibleSource[],
    options: ConverterOptions = {}
  ): Promise<DocumentConverterResult[]> {
    const results: DocumentConverterResult[] = [];
    
    for (const source of sources) {
      try {
        const result = await this.convert(source, options);
        results.push(result);
      } catch (error) {
        console.warn("Failed to convert document:", error);
        results.push({
          markdown: "",
          title: "Conversion failed"
        });
      }
    }
    
    return results;
  }

  /**
   * Get information about a file without converting it
   * 
   * @param source - The source to analyze
   * @returns Promise resolving to file information
   */
  async getFileInfo(source: ConvertibleSource): Promise<ReturnType<typeof getFileInfo>> {
    const buffer = await this.sourceToBuffer(source);
    const streamInfo = this.inferStreamInfo(source);
    
    return getFileInfo(buffer, streamInfo);
  }

  /**
   * Check if a file type is supported
   * 
   * @param source - The source to check
   * @returns Promise resolving to boolean indicating support
   */
  async isSupported(source: ConvertibleSource): Promise<boolean> {
    try {
      const info = await this.getFileInfo(source);
      return info.supported;
    } catch {
      return false;
    }
  }

  /**
   * Get list of supported file types
   */
  getSupportedTypes(): {
    extensions: string[];
    mimeTypes: string[];
    converters: Array<{
      name: string;
      info: ReturnType<DocxConverter['getConversionInfo']>;
    }>;
  } {
    return {
      extensions: [".docx"],
      mimeTypes: [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ],
      converters: [
        {
          name: "DocxConverter",
          info: this.docxConverter.getConversionInfo()
        }
      ]
    };
  }

  /**
   * Helper method to convert source to buffer
   */
  private async sourceToBuffer(source: ConvertibleSource): Promise<Buffer> {
    if (typeof source === "string") {
      const file = Bun.file(source);
      return Buffer.from(await file.arrayBuffer());
    }

    if (Buffer.isBuffer(source)) {
      return source;
    }

    if (source instanceof ArrayBuffer) {
      return Buffer.from(source);
    }

    if (source instanceof Uint8Array) {
      return Buffer.from(source);
    }

    if (this.isFileSource(source)) {
      return Buffer.from(await source.arrayBuffer());
    }

    // ReadableStream
    const chunks: Uint8Array[] = [];
    const reader = source.getReader();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return Buffer.from(result);
  }

  /**
   * Helper method to infer stream info
   */
  private inferStreamInfo(
    source: ConvertibleSource,
    _options: ConverterOptions = {}
  ): StreamInfo {
    const streamInfo = createStreamInfo();

    if (typeof source === "string") {
      streamInfo.localPath = source;
      streamInfo.filename = source.split("/").pop() || source;
      
      const ext = source.lastIndexOf(".") > -1 ? 
        source.substring(source.lastIndexOf(".")) : undefined;
      if (ext) {
        streamInfo.extension = ext;
      }
    }

    if (this.isFileSource(source)) {
      if (source.name) {
        streamInfo.filename = source.name;
      }
      if (source.type) {
        streamInfo.mimetype = source.type;
      }
    }

    return streamInfo;
  }

  /**
   * Type guard for FileSource
   */
  private isFileSource(source: any): source is FileSource {
    return source && typeof source.arrayBuffer === "function";
  }
}

/**
 * Convenience functions for quick conversions
 */

/**
 * Convert a DOCX file to Markdown (simple API)
 * 
 * @param filePath - Path to the DOCX file
 * @param options - Conversion options
 * @returns Promise resolving to Markdown string
 */
export async function docxToMarkdown(
  filePath: string,
  options: ConverterOptions = {}
): Promise<string> {
  const converter = new OfficeToMarkdown(options);
  const result = await converter.convertDocx(filePath, options);
  return result.markdown;
}

/**
 * Convert any supported office document to Markdown
 * 
 * @param source - The source to convert
 * @param options - Conversion options
 * @returns Promise resolving to Markdown string
 */
export async function officeToMarkdown(
  source: ConvertibleSource,
  options: ConverterOptions = {}
): Promise<string> {
  const converter = new OfficeToMarkdown(options);
  const result = await converter.convert(source, options);
  return result.markdown;
}

/**
 * Default converter instance for quick usage
 */
export const defaultConverter = new OfficeToMarkdown();