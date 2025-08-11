import type { ReadableStream } from "node:stream/web";
import type { DocumentConverterResult } from "./result.js";
import type { StreamInfo } from "./stream-info.js";

/**
 * Options for document conversion.
 */
export interface ConverterOptions {
  /**
   * Custom style map for mammoth conversion (DOCX specific)
   */
  styleMap?: string;

  /**
   * Whether to preserve tables in the output
   */
  preserveTables?: boolean;

  /**
   * Whether to convert math equations to LaTeX
   */
  convertMath?: boolean;

  /**
   * Custom heading style for Markdown output
   */
  headingStyle?: "atx" | "setext";

  /**
   * Additional options passed to underlying converters
   */
  [key: string]: any;
}

/**
 * Interface for file-like objects that can be converted.
 */
export interface FileSource {
  /**
   * Read the entire file as a buffer
   */
  arrayBuffer(): Promise<ArrayBuffer>;

  /**
   * Get the file size in bytes
   */
  size?: number;

  /**
   * Get the file name
   */
  name?: string;

  /**
   * Get the file type/MIME type
   */
  type?: string;
}

/**
 * Union type for all supported input sources
 */
export type ConvertibleSource = 
  | string        // file path
  | Buffer        // binary data
  | ArrayBuffer   // binary data
  | Uint8Array    // binary data
  | FileSource    // file-like object
  | ReadableStream<Uint8Array>; // stream

/**
 * Exception thrown when a conversion fails
 */
export class FileConversionException extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = "FileConversionException";
  }
}

/**
 * Exception thrown when a required dependency is missing
 */
export class MissingDependencyException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissingDependencyException";
  }
}

/**
 * Exception thrown when a file format is not supported
 */
export class UnsupportedFormatException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedFormatException";
  }
}

/**
 * Common interface for all file converters
 */
export interface IDocumentConverter {
  /** Check if this converter can handle the given file */
  accepts(buffer: Buffer, streamInfo: StreamInfo): boolean;
  
  /** Convert the file to Markdown */
  convert(buffer: Buffer, streamInfo: StreamInfo, options?: ConverterOptions): Promise<DocumentConverterResult>;
  
  /** Get information about this converter's capabilities */
  getConversionInfo(): ConverterInfo;
}

/**
 * Information about a converter's capabilities
 */
export interface ConverterInfo {
  /** Supported file extensions */
  supportedExtensions: string[];
  /** Supported MIME types */
  supportedMimeTypes: string[];
  /** List of features this converter supports */
  features: string[];
  /** Converter name/identifier */
  name?: string;
}