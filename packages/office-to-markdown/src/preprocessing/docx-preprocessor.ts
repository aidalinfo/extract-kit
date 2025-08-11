import JSZip from "jszip";
import { convertOmmlStringToLatex } from "../math/omml-processor.js";

/**
 * Template for wrapping OMML math in a complete Word document structure
 */
const MATH_ROOT_TEMPLATE = [
  '<w:document ',
  'xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" ',
  'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" ',
  'xmlns:o="urn:schemas-microsoft-com:office:office" ',
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ',
  'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" ',
  'xmlns:v="urn:schemas-microsoft-com:vml" ',
  'xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" ',
  'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ',
  'xmlns:w10="urn:schemas-microsoft-com:office:word" ',
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ',
  'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" ',
  'xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" ',
  'xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" ',
  'xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" ',
  'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 wp14">',
  '{0}</w:document>'
].join('');

/**
 * Convert OMML XML string to LaTeX format
 */
function convertOmmlElementToLatex(ommlXml: string): string {
  try {
    // Convert using the OMML processor
    const latex = convertOmmlStringToLatex(ommlXml);
    return latex || "";
  } catch (error) {
    console.warn("Failed to convert OMML to LaTeX:", error);
    // Fallback: extract text content
    return ommlXml.replace(/<[^>]*>/g, '').trim();
  }
}

/**
 * Create a replacement text run for OMML math elements
 */
function createLatexTextRun(latex: string, isBlock: boolean = false): string {
  const delimiter = isBlock ? "$$" : "$";
  return `<w:r><w:t>${delimiter}${latex}${delimiter}</w:t></w:r>`;
}

/**
 * Pre-process math content in XML by converting OMML to LaTeX using regex
 */
function preprocessMath(xmlContent: Buffer): Buffer {
  try {
    let content = xmlContent.toString("utf-8");
    
    // Replace block math (m:oMathPara or oMathPara)
    content = content.replace(/<(m:)?oMathPara[^>]*>([\s\S]*?)<\/(m:)?oMathPara>/gi, (match, _, mathContent) => {
      // Extract oMath elements inside oMathPara
      const omathMatches = mathContent.match(/<(m:)?oMath[^>]*>([\s\S]*?)<\/(m:)?oMath>/gi);
      if (omathMatches) {
        const latexElements = omathMatches.map((omathMatch: string) => {
          const latex = convertOmmlElementToLatex(omathMatch);
          return createLatexTextRun(latex, true); // block math
        });
        return `<w:p>${latexElements.join('')}</w:p>`;
      }
      return match;
    });
    
    // Replace remaining inline math (m:oMath or oMath)
    content = content.replace(/<(m:)?oMath[^>]*>([\s\S]*?)<\/(m:)?oMath>/gi, (match, _, mathContent) => {
      const latex = convertOmmlElementToLatex(match);
      return createLatexTextRun(latex, false); // inline math
    });
    
    return Buffer.from(content, "utf-8");
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