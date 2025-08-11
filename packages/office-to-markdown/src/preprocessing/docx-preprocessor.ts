import JSZip from "jszip";

/**
 * OMML namespace used in Microsoft Word math elements
 */
const OMML_NS = "m:";

/**
 * Basic OMML to LaTeX conversion mapping
 * This is a simplified version - a full implementation would require extensive OMML parsing
 */
const OMML_TO_LATEX_MAP: { [key: string]: string } = {
  // Fractions
  "m:f": "\\frac",
  
  // Superscript
  "m:sSup": "^",
  
  // Subscript
  "m:sSub": "_",
  
  // Square root
  "m:rad": "\\sqrt",
  
  // Sum
  "m:nary": "\\sum",
  
  // Integral
  "m:int": "\\int",
  
  // Greek letters
  "m:α": "\\alpha",
  "m:β": "\\beta",
  "m:γ": "\\gamma",
  "m:δ": "\\delta",
  "m:π": "\\pi",
  "m:σ": "\\sigma",
  "m:θ": "\\theta",
  "m:λ": "\\lambda",
  "m:μ": "\\mu",
  "m:φ": "\\phi",
  "m:ψ": "\\psi",
  "m:ω": "\\omega",
};

/**
 * Template for wrapping OMML math in a complete Word document structure
 */
const MATH_ROOT_TEMPLATE = `
<w:document 
  xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" 
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" 
  xmlns:o="urn:schemas-microsoft-com:office:office" 
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" 
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" 
  xmlns:v="urn:schemas-microsoft-com:vml" 
  xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" 
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" 
  xmlns:w10="urn:schemas-microsoft-com:office:word" 
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" 
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" 
  xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" 
  xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" 
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" 
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" 
  mc:Ignorable="w14 wp14">
  {0}
</w:document>`;

/**
 * Convert OMML (Office Math Markup Language) to LaTeX format
 * This is a simplified implementation - a production version would need more comprehensive parsing
 */
function convertOmmlToLatex(ommlContent: string): string {
  try {
    // Basic conversion - replace known OMML elements with LaTeX equivalents
    let latex = ommlContent;
    
    // Remove XML tags and extract text content
    latex = latex.replace(/<[^>]*>/g, " ");
    
    // Clean up whitespace
    latex = latex.replace(/\s+/g, " ").trim();
    
    // Apply basic OMML to LaTeX mappings
    for (const [omml, latexEquiv] of Object.entries(OMML_TO_LATEX_MAP)) {
      latex = latex.replace(new RegExp(omml.replace("m:", ""), "g"), latexEquiv);
    }
    
    return latex;
  } catch (error) {
    // If conversion fails, return the original content
    console.warn("Failed to convert OMML to LaTeX:", error);
    return ommlContent;
  }
}

/**
 * Create a replacement element for OMML math elements
 */
function getOmathTagReplacement(ommlContent: string, isBlock: boolean = false): string {
  const latex = convertOmmlToLatex(ommlContent);
  const delimiter = isBlock ? "$$" : "$";
  
  return `<w:r><w:t>${delimiter}${latex}${delimiter}</w:t></w:r>`;
}

/**
 * Replace OMML math elements with LaTeX equivalents in XML content
 */
function replaceMathEquations(xmlContent: string): string {
  try {
    // Replace block math (oMathPara)
    xmlContent = xmlContent.replace(
      /<m:oMathPara[^>]*>(.*?)<\/m:oMathPara>/gs,
      (match, content) => {
        const oMathMatch = content.match(/<m:oMath[^>]*>(.*?)<\/m:oMath>/s);
        if (oMathMatch) {
          return `<w:p>${getOmathTagReplacement(oMathMatch[1], true)}</w:p>`;
        }
        return match;
      }
    );
    
    // Replace inline math (oMath)
    xmlContent = xmlContent.replace(
      /<m:oMath[^>]*>(.*?)<\/m:oMath>/gs,
      (match, content) => {
        return getOmathTagReplacement(content, false);
      }
    );
    
    return xmlContent;
  } catch (error) {
    console.warn("Failed to replace math equations:", error);
    return xmlContent;
  }
}

/**
 * Pre-process math content in XML by converting OMML to LaTeX
 */
function preprocessMath(xmlContent: Buffer): Buffer {
  try {
    const content = xmlContent.toString("utf-8");
    const processedContent = replaceMathEquations(content);
    return Buffer.from(processedContent, "utf-8");
  } catch (error) {
    console.warn("Failed to preprocess math content:", error);
    return xmlContent;
  }
}

/**
 * Pre-process a DOCX file to convert OMML math equations to LaTeX
 * 
 * @param inputDocx - The DOCX file as a Buffer
 * @returns A processed DOCX file as a Buffer
 */
export async function preprocessDocx(inputDocx: Buffer): Promise<Buffer> {
  try {
    const zip = await JSZip.loadAsync(inputDocx);
    
    // Files that need math preprocessing
    const mathProcessFiles = [
      "word/document.xml",
      "word/footnotes.xml", 
      "word/endnotes.xml"
    ];
    
    // Process each file that might contain math
    for (const filename of mathProcessFiles) {
      const file = zip.file(filename);
      if (file) {
        try {
          const content = await file.async("nodebuffer");
          const processedContent = preprocessMath(content);
          zip.file(filename, processedContent);
        } catch (error) {
          // If processing fails, keep original content
          console.warn(`Failed to process ${filename}:`, error);
        }
      }
    }
    
    // Generate the processed DOCX
    return Buffer.from(await zip.generateAsync({ type: "nodebuffer" }));
  } catch (error) {
    console.warn("Failed to preprocess DOCX file:", error);
    // Return original file if preprocessing fails
    return inputDocx;
  }
}