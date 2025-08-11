/**
 * Type definitions for mathematical content processing
 */

/**
 * OMML conversion pattern for regex-based processing
 */
export interface OmmlPattern {
  /** Regular expression pattern to match OMML elements */
  pattern: RegExp;
  /** LaTeX replacement string with capture groups */
  replacement: string;
  /** Optional description of what this pattern converts */
  description?: string;
}

/**
 * Unicode to LaTeX symbol mapping
 */
export interface SymbolMapping {
  [unicode: string]: string;
}

/**
 * Configuration for OMML to LaTeX conversion
 */
export interface OmmlConversionConfig {
  /** Whether to enable Unicode symbol conversion */
  convertSymbols?: boolean;
  /** Custom symbol mappings to add or override */
  customSymbols?: SymbolMapping;
  /** Whether to preserve original text on conversion failure */
  preserveOnError?: boolean;
}

/**
 * Result of OMML to LaTeX conversion
 */
export interface ConversionResult {
  /** The converted LaTeX string */
  latex: string;
  /** Whether the conversion was successful */
  success: boolean;
  /** Any warnings or errors encountered */
  warnings?: string[];
  /** Original OMML content (for debugging) */
  original?: string;
}