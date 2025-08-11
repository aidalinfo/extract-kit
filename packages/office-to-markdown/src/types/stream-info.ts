/**
 * Information about a file stream used for conversion.
 */
export interface StreamInfo {
  /**
   * The MIME type of the file (e.g., "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
   */
  mimetype?: string;

  /**
   * The file extension (e.g., ".docx")
   */
  extension?: string;

  /**
   * The character encoding (e.g., "utf-8")
   */
  charset?: string;

  /**
   * The filename (e.g., "document.docx")
   */
  filename?: string;

  /**
   * The local file path
   */
  localPath?: string;

  /**
   * The URL if the file was downloaded
   */
  url?: string;
}

/**
 * Create a StreamInfo instance with optional parameters.
 */
export function createStreamInfo(options: Partial<StreamInfo> = {}): StreamInfo {
  return {
    mimetype: options.mimetype,
    extension: options.extension,
    charset: options.charset,
    filename: options.filename,
    localPath: options.localPath,
    url: options.url,
  };
}

/**
 * Copy StreamInfo and update with new values.
 */
export function copyAndUpdateStreamInfo(
  base: StreamInfo,
  updates: Partial<StreamInfo>
): StreamInfo {
  return {
    ...base,
    ...updates,
  };
}