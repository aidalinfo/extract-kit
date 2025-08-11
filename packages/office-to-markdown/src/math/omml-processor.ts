/**
 * Office Math Markup Language (OMML) to LaTeX Processor
 * 
 * This module provides functionality to convert Microsoft Office's OMML (Office Math Markup Language)
 * format to LaTeX. OMML is used in DOCX files to represent mathematical equations and expressions.
 * 
 * **Conversion Strategy:**
 * - Uses regex-based pattern matching for reliability and performance
 * - Handles common math elements: fractions, superscripts, subscripts, roots
 * - Converts Unicode mathematical symbols to LaTeX equivalents
 * - Provides fallback to plain text for unsupported elements
 * 
 * **Supported OMML Elements:**
 * - `<f>` (fractions) → `\frac{}{}`
 * - `<sSup>` (superscripts) → `^{}`
 * - `<sSub>` (subscripts) → `_{}`
 * - `<rad>` (roots) → `\sqrt{}` or `\sqrt[]{}`
 * - Unicode symbols → LaTeX commands
 * 
 * @module OmmlProcessor
 */



/**
 * Unicode to LaTeX symbol mapping for mathematical characters.
 * 
 * This mapping covers common mathematical symbols found in OMML content:
 * - Greek letters (α, β, γ, etc.)
 * - Mathematical operators (∞, ±, ≤, etc.)
 * - Set theory symbols (∈, ∪, ∩, etc.)
 * - Calculus symbols (∑, ∏, ∫, etc.)
 * - Arrows and other symbols
 * 
 * @example
 * ```typescript
 * // α becomes \alpha
 * // ∞ becomes \infty
 * // ∑ becomes \sum
 * ```
 */

const UNICODE_TO_LATEX: Record<string, string> = {
  // Greek letters
  'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'δ': '\\delta',
  'ε': '\\epsilon', 'ζ': '\\zeta', 'η': '\\eta', 'θ': '\\theta',
  'ι': '\\iota', 'κ': '\\kappa', 'λ': '\\lambda', 'μ': '\\mu',
  'ν': '\\nu', 'ξ': '\\xi', 'π': '\\pi', 'ρ': '\\rho',
  'σ': '\\sigma', 'τ': '\\tau', 'υ': '\\upsilon', 'φ': '\\phi',
  'χ': '\\chi', 'ψ': '\\psi', 'ω': '\\omega',
  
  // Math symbols
  '∞': '\\infty', '±': '\\pm', '∓': '\\mp', '≤': '\\leq', '≥': '\\geq',
  '≠': '\\neq', '≈': '\\approx', '∈': '\\in', '∉': '\\notin',
  '∪': '\\cup', '∩': '\\cap', '∑': '\\sum', '∏': '\\prod',
  '∫': '\\int', '√': '\\sqrt', '→': '\\rightarrow', '←': '\\leftarrow',
  '↔': '\\leftrightarrow'
};

/**
 * Apply Unicode to LaTeX symbol replacements to a text string.
 * 
 * Iterates through the UNICODE_TO_LATEX mapping and replaces all occurrences
 * of Unicode mathematical symbols with their LaTeX equivalents.
 * 
 * @param text - Input text potentially containing Unicode math symbols
 * @returns Text with Unicode symbols replaced by LaTeX commands
 * 
 * @example
 * ```typescript
 * replaceUnicodeSymbols('α + β = γ'); // Returns '\alpha + \beta = \gamma'
 * replaceUnicodeSymbols('x → ∞'); // Returns 'x \rightarrow \infty'
 * ```
 */

function replaceUnicodeSymbols(text: string): string {
  let result = text;
  for (const [unicode, latex] of Object.entries(UNICODE_TO_LATEX)) {
    result = result.replace(new RegExp(unicode, 'g'), latex + ' ');
  }
  return result;
}

/**
 * Regular expression patterns for converting OMML elements to LaTeX.
 * 
 * Each pattern object contains:
 * - `pattern`: RegExp that matches specific OMML XML structure
 * - `replacement`: LaTeX replacement string with capture groups ($1, $2, etc.)
 * 
 * **Pattern Processing Order:**
 * 1. Fractions: `<f><num>a</num><den>b</den></f>` → `\frac{a}{b}`
 * 2. Superscripts: `<sSup><e>x</e><sup>2</sup></sSup>` → `x^{2}`
 * 3. Subscripts: `<sSub><e>x</e><sub>i</sub></sSub>` → `x_{i}`
 * 4. Square roots: `<rad><e>x</e></rad>` → `\sqrt{x}`
 * 5. Nth roots: `<rad><deg>n</deg><e>x</e></rad>` → `\sqrt[n]{x}`
 * 6. Text runs: `<r><t>text</t></r>` → `text`
 * 
 * @note Uses non-greedy matching ([\s\S]*?) to handle nested structures
 */

const OMML_PATTERNS = [
  // Fractions: <f><num>a</num><den>b</den></f> -> \frac{a}{b}
  {
    pattern: /<f>[\s\S]*?<num>(.*?)<\/num>[\s\S]*?<den>(.*?)<\/den>[\s\S]*?<\/f>/g,
    replacement: '\\frac{$1}{$2}'
  },
  // Superscripts: <sSup><e>x</e><sup>2</sup></sSup> -> x^{2}
  {
    pattern: /<sSup>[\s\S]*?<e>(.*?)<\/e>[\s\S]*?<sup>(.*?)<\/sup>[\s\S]*?<\/sSup>/g,
    replacement: '$1^{$2}'
  },
  // Subscripts: <sSub><e>x</e><sub>i</sub></sSub> -> x_{i}
  {
    pattern: /<sSub>[\s\S]*?<e>(.*?)<\/e>[\s\S]*?<sub>(.*?)<\/sub>[\s\S]*?<\/sSub>/g,
    replacement: '$1_{$2}'
  },
  // Square roots: <rad><e>x</e></rad> -> \sqrt{x}
  {
    pattern: /<rad>[\s\S]*?<e>(.*?)<\/e>[\s\S]*?<\/rad>/g,
    replacement: '\\sqrt{$1}'
  },
  // Nth roots: <rad><deg>n</deg><e>x</e></rad> -> \sqrt[n]{x}
  {
    pattern: /<rad>[\s\S]*?<deg>(.*?)<\/deg>[\s\S]*?<e>(.*?)<\/e>[\s\S]*?<\/rad>/g,
    replacement: '\\sqrt[$1]{$2}'
  },
  // Text runs: <r><t>text</t></r> -> text
  {
    pattern: /<r>[\s\S]*?<t>(.*?)<\/t>[\s\S]*?<\/r>/g,
    replacement: '$1'
  }
];

/**
 * Convert OMML XML string to LaTeX using regex-based pattern matching.
 * 
 * This is the main conversion function that processes OMML XML content through
 * a series of transformations to produce clean LaTeX output.
 * 
 * **Processing Steps:**
 * 1. Remove XML namespace prefixes for cleaner processing
 * 2. Apply all OMML conversion patterns in sequence
 * 3. Clean up remaining XML tags
 * 4. Convert Unicode symbols to LaTeX equivalents
 * 5. Normalize whitespace and return result
 * 
 * **Error Handling:**
 * - Catches any processing errors and logs warnings
 * - Falls back to plain text extraction if conversion fails
 * - Never throws exceptions to avoid breaking the conversion pipeline
 * 
 * @param ommlXml - The OMML XML content to convert
 * @returns Clean LaTeX string representation of the math expression
 * 
 * @example
 * ```typescript
 * const omml = '<m:f><m:num>1</m:num><m:den>2</m:den></m:f>';
 * const latex = convertOmmlStringToLatex(omml); // Returns '\frac{1}{2}'
 * 
 * const complex = '<m:sSup><m:e>x</m:e><m:sup>2</m:sup></m:sSup>';
 * const result = convertOmmlStringToLatex(complex); // Returns 'x^{2}'
 * ```
 */

export function convertOmmlStringToLatex(ommlXml: string): string {
  try {
    let latex = ommlXml;
    
    // Remove namespace prefixes for cleaner processing
    latex = latex.replace(/[a-zA-Z]+:/g, '');
    
    // Apply all conversion patterns
    for (const { pattern, replacement } of OMML_PATTERNS) {
      latex = latex.replace(pattern, replacement);
    }
    
    // Clean up remaining XML tags
    latex = latex.replace(/<[^>]*>/g, ' ');
    
    // Convert Unicode symbols to LaTeX
    latex = replaceUnicodeSymbols(latex);
    
    // Normalize whitespace
    return latex.replace(/\s+/g, ' ').trim();
    
  } catch (error) {
    console.warn('Failed to convert OMML to LaTeX:', error);
    // Fallback: extract plain text
    return ommlXml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}