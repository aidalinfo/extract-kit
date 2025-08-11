import type { StreamInfo } from "../types/stream-info.js";
import { createStreamInfo } from "../types/stream-info.js";

/**
 * File type detection utilities
 */

/**
 * MIME type mappings for common file extensions
 */
const EXTENSION_TO_MIME: { [key: string]: string } = {
  // Microsoft Office
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".ppt": "application/vnd.ms-powerpoint",
  
  // Documents
  ".pdf": "application/pdf",
  ".rtf": "application/rtf",
  ".odt": "application/vnd.oasis.opendocument.text",
  ".ods": "application/vnd.oasis.opendocument.spreadsheet",
  ".odp": "application/vnd.oasis.opendocument.presentation",
  
  // Web
  ".html": "text/html",
  ".htm": "text/html",
  ".xml": "text/xml",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  
  // Text
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".csv": "text/csv",
  
  // Images
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  
  // Archives
  ".zip": "application/zip",
  ".rar": "application/x-rar-compressed",
  ".tar": "application/x-tar",
  ".gz": "application/gzip",
};

/**
 * File signatures (magic bytes) for file type detection
 */
const FILE_SIGNATURES: Array<{
  signature: number[];
  mimetype: string;
  extension: string;
  offset?: number;
}> = [
  // ZIP-based formats (DOCX, XLSX, etc.)
  { signature: [0x50, 0x4B, 0x03, 0x04], mimetype: "application/zip", extension: ".zip" },
  { signature: [0x50, 0x4B, 0x07, 0x08], mimetype: "application/zip", extension: ".zip" },
  
  // PDF
  { signature: [0x25, 0x50, 0x44, 0x46], mimetype: "application/pdf", extension: ".pdf" },
  
  // Microsoft Office (old format)
  { signature: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], mimetype: "application/msword", extension: ".doc" },
  
  // RTF
  { signature: [0x7B, 0x5C, 0x72, 0x74, 0x66], mimetype: "application/rtf", extension: ".rtf" },
  
  // Images
  { signature: [0xFF, 0xD8, 0xFF], mimetype: "image/jpeg", extension: ".jpg" },
  { signature: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], mimetype: "image/png", extension: ".png" },
  { signature: [0x47, 0x49, 0x46, 0x38], mimetype: "image/gif", extension: ".gif" },
  { signature: [0x42, 0x4D], mimetype: "image/bmp", extension: ".bmp" },
];

/**
 * Detect file type from buffer content using magic bytes
 */
export function detectFileType(buffer: Buffer): { mimetype: string; extension: string } | null {
  for (const { signature, mimetype, extension, offset = 0 } of FILE_SIGNATURES) {
    if (buffer.length >= signature.length + offset) {
      const matches = signature.every((byte, index) => 
        buffer[offset + index] === byte
      );
      
      if (matches) {
        // Special handling for ZIP-based formats
        if (mimetype === "application/zip") {
          return detectOfficeFormat(buffer) || { mimetype, extension };
        }
        
        return { mimetype, extension };
      }
    }
  }
  
  return null;
}

/**
 * Detect specific Office format from ZIP-based files
 */
function detectOfficeFormat(buffer: Buffer): { mimetype: string; extension: string } | null {
  const bufferString = buffer.toString("binary", 0, Math.min(1024, buffer.length));
  
  // Check for specific Office document markers
  if (bufferString.includes("word/") && bufferString.includes("document.xml")) {
    return {
      mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      extension: ".docx"
    };
  }
  
  if (bufferString.includes("xl/") && bufferString.includes("workbook.xml")) {
    return {
      mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      extension: ".xlsx"
    };
  }
  
  if (bufferString.includes("ppt/") && bufferString.includes("presentation.xml")) {
    return {
      mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      extension: ".pptx"
    };
  }
  
  return null;
}

/**
 * Guess MIME type from file extension
 */
export function guessMimeTypeFromExtension(extension: string): string | undefined {
  return EXTENSION_TO_MIME[extension.toLowerCase()];
}

/**
 * Guess file extension from MIME type
 */
export function guessExtensionFromMimeType(mimetype: string): string | undefined {
  const entries = Object.entries(EXTENSION_TO_MIME);
  const match = entries.find(([, mime]) => mime === mimetype);
  return match ? match[0] : undefined;
}

/**
 * Enhanced stream info detection that combines multiple methods
 */
export function enhanceStreamInfo(
  buffer: Buffer,
  baseInfo: Partial<StreamInfo> = {}
): StreamInfo {
  const streamInfo = createStreamInfo(baseInfo);
  
  // Try to detect file type from content
  const detected = detectFileType(buffer);
  if (detected) {
    if (!streamInfo.mimetype) {
      streamInfo.mimetype = detected.mimetype;
    }
    if (!streamInfo.extension) {
      streamInfo.extension = detected.extension;
    }
  }
  
  // Try to guess MIME type from extension if we have one
  if (streamInfo.extension && !streamInfo.mimetype) {
    const guessedMime = guessMimeTypeFromExtension(streamInfo.extension);
    if (guessedMime) {
      streamInfo.mimetype = guessedMime;
    }
  }
  
  // Try to guess extension from MIME type if we have one
  if (streamInfo.mimetype && !streamInfo.extension) {
    const guessedExt = guessExtensionFromMimeType(streamInfo.mimetype);
    if (guessedExt) {
      streamInfo.extension = guessedExt;
    }
  }
  
  // Extract filename from local path if available
  if (streamInfo.localPath && !streamInfo.filename) {
    streamInfo.filename = streamInfo.localPath.split("/").pop() || streamInfo.localPath;
  }
  
  return streamInfo;
}

/**
 * Check if a file type is supported for conversion
 */
export function isSupportedFileType(mimetype?: string, extension?: string): boolean {
  const supportedMimes = [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/html",
    "text/plain",
    "text/markdown",
  ];
  
  const supportedExtensions = [
    ".docx",
    ".doc", 
    ".html",
    ".htm",
    ".txt",
    ".md"
  ];
  
  if (mimetype && supportedMimes.includes(mimetype)) {
    return true;
  }
  
  if (extension && supportedExtensions.includes(extension.toLowerCase())) {
    return true;
  }
  
  return false;
}

/**
 * Get detailed file information for debugging
 */
export function getFileInfo(buffer: Buffer, streamInfo: StreamInfo): {
  size: number;
  detected: { mimetype: string; extension: string } | null;
  enhanced: StreamInfo;
  supported: boolean;
} {
  const detected = detectFileType(buffer);
  const enhanced = enhanceStreamInfo(buffer, streamInfo);
  const supported = isSupportedFileType(enhanced.mimetype, enhanced.extension);
  
  return {
    size: buffer.length,
    detected,
    enhanced,
    supported
  };
}