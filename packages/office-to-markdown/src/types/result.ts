/**
 * The result of converting a document to Markdown.
 */
export interface DocumentConverterResult {
  /**
   * The converted Markdown text.
   */
  markdown: string;

  /**
   * Optional title of the document.
   */
  title?: string;
}

/**
 * Create a DocumentConverterResult instance.
 */
export function createDocumentConverterResult(
  markdown: string,
  title?: string
): DocumentConverterResult {
  return {
    markdown,
    title,
  };
}