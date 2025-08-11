import type { 
  ConvertibleSource, 
  ConverterOptions, 
  FileSource 
} from "../types/converter.js";
import type { DocumentConverterResult } from "../types/result.js";
import type { StreamInfo } from "../types/stream-info.js";

/**
 * Abstract base class for all document converters.
 */
export abstract class DocumentConverter {
  /**
   * Determine if this converter can handle the given file.
   * 
   * @param buffer - The file data as a buffer
   * @param streamInfo - Information about the file
   * @param options - Conversion options
   * @returns True if this converter can handle the file
   */
  abstract accepts(
    buffer: Buffer,
    streamInfo: StreamInfo,
    options?: ConverterOptions
  ): boolean;

  /**
   * Convert the file to Markdown.
   * 
   * @param buffer - The file data as a buffer
   * @param streamInfo - Information about the file
   * @param options - Conversion options
   * @returns The conversion result
   */
  abstract convert(
    buffer: Buffer,
    streamInfo: StreamInfo,
    options?: ConverterOptions
  ): Promise<DocumentConverterResult>;

  /**
   * Helper method to convert various source types to Buffer.
   */
  protected async sourceToBuffer(source: ConvertibleSource): Promise<Buffer> {
    if (typeof source === "string") {
      // File path
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
   * Type guard to check if source is a FileSource.
   */
  private isFileSource(source: any): source is FileSource {
    return source && typeof source.arrayBuffer === "function";
  }

  /**
   * Helper method to infer stream info from various sources.
   */
  protected inferStreamInfo(
    source: ConvertibleSource,
    providedInfo?: Partial<StreamInfo>
  ): StreamInfo {
    const streamInfo: StreamInfo = { ...providedInfo };

    if (typeof source === "string") {
      // File path
      const path = source;
      streamInfo.localPath = path;
      streamInfo.filename = path.split("/").pop() || path;
      
      const ext = path.lastIndexOf(".") > -1 ? 
        path.substring(path.lastIndexOf(".")) : undefined;
      if (ext && !streamInfo.extension) {
        streamInfo.extension = ext;
      }
    }

    if (this.isFileSource(source)) {
      if (source.name && !streamInfo.filename) {
        streamInfo.filename = source.name;
      }
      if (source.type && !streamInfo.mimetype) {
        streamInfo.mimetype = source.type;
      }
    }

    return streamInfo;
  }

  /**
   * Helper method to guess MIME type from file extension.
   */
  protected guessMimeTypeFromExtension(extension: string): string | undefined {
    const mimeMap: { [key: string]: string } = {
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".doc": "application/msword",
      ".pdf": "application/pdf",
      ".html": "text/html",
      ".htm": "text/html",
      ".txt": "text/plain",
      ".md": "text/markdown",
      ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    };

    return mimeMap[extension.toLowerCase()];
  }
}