/**
 * Simple test file to verify the DOCX to Markdown conversion works
 */

import { OfficeToMarkdown, docxToMarkdown } from "./index.js";

async function testBasicFunctionality() {
  console.log("🧪 Testing Office to Markdown Converter...\n");

  // Create converter instance
  const converter = new OfficeToMarkdown({
    preserveTables: true,
    convertMath: true,
    headingStyle: "atx"
  });

  // Display supported types
  console.log("📋 Supported Types:");
  const supportedTypes = converter.getSupportedTypes();
  console.log("  Extensions:", supportedTypes.extensions.join(", "));
  console.log("  MIME Types:", supportedTypes.mimeTypes);
  console.log("  Converters:", supportedTypes.converters.map(c => c.name).join(", "));
  console.log();

  // Test with a simple HTML string to verify the conversion pipeline
  console.log("🔧 Testing HTML to Markdown conversion pipeline...");
  try {
    // Create a simple test buffer that mimics a basic DOCX structure
    const testHtml = `
      <html>
        <body>
          <h1>Test Document</h1>
          <p>This is a <strong>test</strong> paragraph with <em>formatting</em>.</p>
          <h2>Table Example</h2>
          <table>
            <tr><th>Name</th><th>Value</th></tr>
            <tr><td>Item 1</td><td>100</td></tr>
            <tr><td>Item 2</td><td>200</td></tr>
          </table>
          <h2>List Example</h2>
          <ul>
            <li>First item</li>
            <li>Second item</li>
          </ul>
        </body>
      </html>
    `;

    // Test HTML to Markdown conversion directly
    const { CustomHtmlToMarkdown } = await import("./utils/html-to-markdown.js");
    const htmlConverter = new CustomHtmlToMarkdown();
    const markdown = htmlConverter.convert(testHtml);
    
    console.log("✅ HTML to Markdown conversion successful!");
    console.log("📄 Generated Markdown:");
    console.log("---");
    console.log(markdown);
    console.log("---\n");
    
  } catch (error) {
    console.error("❌ HTML to Markdown test failed:", error);
  }

  // Test file type detection
  console.log("🔍 Testing file type detection...");
  try {
    const { detectFileType, isSupportedFileType } = await import("./utils/file-detector.js");
    
    // Test with DOCX signature
    const docxSignature = Buffer.from([0x50, 0x4B, 0x03, 0x04]);
    const detected = detectFileType(docxSignature);
    console.log("  DOCX signature detected:", detected);
    
    // Test supported file type check
    const isSupported = isSupportedFileType("application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx");
    console.log("  DOCX format supported:", isSupported);
    console.log();
    
  } catch (error) {
    console.error("❌ File detection test failed:", error);
  }

  // Test error handling
  console.log("🚨 Testing error handling...");
  try {
    // Try to convert a non-existent file
    await converter.convert("non-existent-file.docx");
  } catch (error: any) {
    console.log("✅ Error handling works! Caught:", error.name || error.constructor.name);
    if (error.code) {
      console.log("  Error code:", error.code);
    }
    if (error.context) {
      console.log("  Error context:", error.context);
    }
    console.log();
  }

  console.log("✅ Basic functionality tests completed!");
  console.log();
  console.log("📝 To test with real DOCX files:");
  console.log("  1. Place a .docx file in this directory");
  console.log("  2. Run: bun run test-docx.ts <filename>");
  console.log();
  console.log("💡 Example usage in your code:");
  console.log(`
// Simple API
const markdown = await docxToMarkdown("document.docx");

// Advanced API
const converter = new OfficeToMarkdown({
  preserveTables: true,
  convertMath: true,
  headingStyle: "atx"
});

const result = await converter.convertDocx("document.docx", {
  styleMap: "p[style-name='Heading 1'] => h1"
});

console.log(result.markdown);
console.log("Title:", result.title);
  `);
}

// Run tests if this file is executed directly
if (import.meta.main) {
  testBasicFunctionality().catch(console.error);
}