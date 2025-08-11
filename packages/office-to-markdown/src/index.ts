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
 * Main converter class that orchestrates different document converters.
 * 
 * This class provides a high-level API for converting Office documents to Markdown.
 * It handles file type detection, routing to appropriate converters, and provides
 * both single-file and batch processing capabilities.
 * 
 * **Supported Formats:**
 * - DOCX (Microsoft Word documents)
 * - Future: PPTX, XLSX (planned)
 * 
 * **Key Features:**
 * - Automatic file type detection
 * - Configurable conversion options
 * - Batch processing support
 * - Error handling with graceful fallbacks
 * - File information analysis
 * 
 * @example
 * ```typescript
 * const converter = new OfficeToMarkdown({
 *   convertMath: true,
 *   preserveTables: true,
 *   headingStyle: 'atx'
 * });
 * 
 * // Convert a single file
 * const result = await converter.convert('./document.docx');
 * console.log(result.markdown);
 * 
 * // Batch processing
 * const results = await converter.convertMultiple([
 *   './doc1.docx',
 *   './doc2.docx'
 * ]);
 * ```
 */
export class OfficeToMarkdown {
  private docxConverter: DocxConverter;

  constructor(options: ConverterOptions = {}) {
    this.docxConverter = new DocxConverter(options);
  }

  /**
   * Convert a document to Markdown format with automatic format detection.
   * 
   * This is the main conversion method that:
   * 1. **Source Processing**: Converts input to buffer and extracts metadata
   * 2. **Format Detection**: Analyzes file signature, MIME type, and extension
   * 3. **Validation**: Ensures the file type is supported
   * 4. **Routing**: Delegates to the appropriate specialized converter
   * 
   * **Supported Input Types:**
   * - File path (string)
   * - Buffer, ArrayBuffer, Uint8Array
   * - File-like objects with arrayBuffer() method
   * - ReadableStream<Uint8Array>
   * 
   * @param source - The source to convert (various formats supported)
   * @param options - Conversion options (math processing, table handling, etc.)
   * @returns Promise resolving to DocumentConverterResult with markdown and metadata
   * @throws UnsupportedFormatException for unsupported file types
   * @throws FileConversionException for processing errors
   * 
   * @example
   * ```typescript
   * // From file path
   * const result = await converter.convert('./document.docx');
   * 
   * // From buffer
   * const buffer = await Bun.file('./document.docx').arrayBuffer();
   * const result = await converter.convert(buffer);
   * 
   * // With options
   * const result = await converter.convert('./document.docx', {
   *   convertMath: true,
   *   preserveTables: true
   * });
   * ```
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
   * Convert a DOCX file specifically without format detection.
   * 
   * This method bypasses file type detection and directly uses the DOCX converter.
   * Use this when you're certain the input is a DOCX file for better performance.
   * 
   * **Processing Pipeline:**
   * 1. Source to buffer conversion
   * 2. Metadata inference
   * 3. Enhanced file info detection
   * 4. Direct DOCX converter processing
   * 
   * @param source - The DOCX source to convert (same types as convert())
   * @param options - Conversion options specific to DOCX processing
   * @returns Promise resolving to DocumentConverterResult
   * 
   * @example
   * ```typescript
   * // When you know it's a DOCX file
   * const result = await converter.convertDocx('./report.docx', {
   *   styleMap: 'p[style-name="Heading 1"] => h1:fresh',
   *   convertMath: true
   * });
   * ```
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
   * Batch convert multiple documents with error resilience.
   * 
   * Processes multiple documents sequentially, handling individual failures gracefully.
   * Failed conversions are logged but don't prevent other files from being processed.
   * The returned array maintains the same order and length as the input.
   * 
   * **Error Handling:**
   * - Individual file failures result in placeholder results
   * - Warnings are logged for failed conversions
   * - Processing continues for remaining files
   * - Final result array always matches input array length
   * 
   * @param sources - Array of sources to convert (mixed types supported)
   * @param options - Conversion options applied to all files
   * @returns Promise resolving to array of DocumentConverterResult (same length as input)
   * 
   * @example
   * ```typescript
   * const sources = [
   *   './doc1.docx',
   *   './doc2.docx',
   *   await Bun.file('./doc3.docx').arrayBuffer()
   * ];
   * 
   * const results = await converter.convertMultiple(sources, {
   *   preserveTables: true
   * });
   * 
   * results.forEach((result, index) => {
   *   if (result.title !== 'Conversion failed') {
   *     console.log(`Document ${index + 1}:`, result.title);
   *   }
   * });
   * ```
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
   * Get detailed information about a file without converting it.
   * 
   * Performs file analysis to extract metadata including:
   * - File type detection (MIME type, extension)
   * - Format support status
   * - File size and structure information
   * - Available converter capabilities
   * 
   * Useful for validation, UI display, or pre-conversion checks.
   * 
   * @param source - The source to analyze (any supported input type)
   * @returns Promise resolving to detailed file information object
   * 
   * @example
   * ```typescript
   * const info = await converter.getFileInfo('./document.docx');
   * console.log('File type:', info.mimetype);
   * console.log('Supported:', info.supported);
   * console.log('Size:', info.size);
   * ```
   */
  async getFileInfo(source: ConvertibleSource): Promise<ReturnType<typeof getFileInfo>> {
    const buffer = await this.sourceToBuffer(source);
    const streamInfo = this.inferStreamInfo(source);
    
    return getFileInfo(buffer, streamInfo);
  }

  /**
   * Check if a file type is supported for conversion.
   * 
   * Quick validation method that determines if the given source can be processed
   * by any of the available converters. Returns false for any errors during analysis.
   * 
   * @param source - The source to check (any supported input type)
   * @returns Promise resolving to boolean (true if convertible, false otherwise)
   * 
   * @example
   * ```typescript
   * if (await converter.isSupported('./unknown.pdf')) {
   *   const result = await converter.convert('./unknown.pdf');
   * } else {
   *   console.log('File type not supported');
   * }
   * ```
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
   * Get comprehensive information about supported file types and converter capabilities.
   * 
   * Returns metadata about:
   * - Supported file extensions
   * - Recognized MIME types
   * - Available converters and their features
   * - Converter-specific capabilities
   * 
   * Useful for:
   * - UI file picker configuration
   * - Feature availability checks
   * - Documentation generation
   * - Validation logic
   * 
   * @returns Object containing supported formats and converter information
   * 
   * @example
   * ```typescript
   * const info = converter.getSupportedTypes();
   * console.log('Extensions:', info.extensions); // ['.docx']
   * console.log('MIME types:', info.mimeTypes);
   * 
   * info.converters.forEach(conv => {
   *   console.log(`${conv.name}:`, conv.info.features);
   * });
   * ```
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

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Convert a DOCX file to Markdown using the simple API.
 * 
 * This is a convenience function that creates a converter instance and returns
 * just the markdown content (not the full result object). Perfect for simple
 * use cases where you just need the converted text.
 * 
 * **Use this when:**
 * - You just need the Markdown text
 * - You don't need metadata like title or conversion info
 * - You want a simple one-line conversion
 * 
 * **Use OfficeToMarkdown class when:**
 * - You need metadata (title, conversion info)
 * - You're doing multiple conversions
 * - You need batch processing
 * - You want to reuse converter configuration
 * 
 * @param filePath - Path to the DOCX file on filesystem
 * @param options - Optional conversion options
 * @returns Promise resolving to Markdown string content
 * @throws Same exceptions as OfficeToMarkdown.convertDocx()
 * 
 * @example
 * ```typescript
 * // Simple conversion
 * const markdown = await docxToMarkdown('./report.docx');
 * console.log(markdown);
 * 
 * // With options
 * const markdown = await docxToMarkdown('./math-heavy.docx', {
 *   convertMath: true,
 *   preserveTables: true
 * });
 * ```
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
 * Convert any supported office document to Markdown using the simple API.
 * 
 * This convenience function handles any supported input type with automatic
 * format detection. Like docxToMarkdown(), it returns only the Markdown content
 * without metadata.
 * 
 * **Input Types Supported:**
 * - File paths (string)
 * - Binary data (Buffer, ArrayBuffer, Uint8Array)
 * - File-like objects
 * - Readable streams
 * 
 * @param source - The source to convert (any supported type)
 * @param options - Optional conversion options
 * @returns Promise resolving to Markdown string content
 * @throws Same exceptions as OfficeToMarkdown.convert()
 * 
 * @example
 * ```typescript
 * // From file path
 * const markdown = await officeToMarkdown('./document.docx');
 * 
 * // From buffer
 * const buffer = await fetch('http://example.com/doc.docx')
 *   .then(r => r.arrayBuffer());
 * const markdown = await officeToMarkdown(buffer);
 * 
 * // From Bun file
 * const file = Bun.file('./document.docx');
 * const markdown = await officeToMarkdown(file);
 * ```
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
 * Default converter instance with standard configuration.
 * 
 * Pre-configured OfficeToMarkdown instance that can be used immediately
 * without creating your own instance. Uses default options:
 * - Math conversion enabled
 * - Table preservation enabled
 * - ATX heading style
 * - Standard error handling
 * 
 * **When to use:**
 * - You don't need custom configuration
 * - You want to avoid creating converter instances
 * - You're doing simple conversions with default behavior
 * 
 * **When to create your own:**
 * - You need custom options (heading style, math processing, etc.)
 * - You're doing many conversions (better to reuse configured instance)
 * - You need different settings for different files
 * 
 * @example
 * ```typescript
 * // Quick conversion with defaults
 * const result = await defaultConverter.convert('./document.docx');
 * 
 * // Check if file is supported
 * const supported = await defaultConverter.isSupported('./unknown.pdf');
 * 
 * // Get file information
 * const info = await defaultConverter.getFileInfo('./document.docx');
 * ```
 */

export const defaultConverter = new OfficeToMarkdown();