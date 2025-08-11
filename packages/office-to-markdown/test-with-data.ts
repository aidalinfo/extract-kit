/**
 * Test the DOCX to Markdown converter with real files from the data/ directory
 */

import { OfficeToMarkdown, docxToMarkdown } from "./src/index.js";
import { writeFileSync } from "fs";
import { join } from "path";

async function testWithRealFiles() {
  console.log("🧪 Testing Office to Markdown Converter with Real DOCX Files\n");

  const converter = new OfficeToMarkdown({
    preserveTables: true,
    convertMath: true,
    headingStyle: "atx"
  });

  // Test files from data directory
  const testFiles = [
    "data/Ortho - 1.docx",
    "data/Ortho - 2.docx"
  ];

  console.log("📁 Found test files:");
  testFiles.forEach(file => console.log(`  - ${file}`));
  console.log();

  // Test each file individually
  for (const filePath of testFiles) {
    console.log(`🔄 Processing: ${filePath}`);
    console.log("─".repeat(50));

    try {
      // Get file information first
      const fileInfo = await converter.getFileInfo(filePath);
      console.log("📊 File Info:");
      console.log(`  Size: ${Math.round(fileInfo.size / 1024)} KB`);
      console.log(`  Detected type: ${fileInfo.detected?.mimetype || "unknown"}`);
      console.log(`  Extension: ${fileInfo.detected?.extension || "unknown"}`);
      console.log(`  Supported: ${fileInfo.supported ? "✅" : "❌"}`);
      console.log();

      // Check if supported
      if (!fileInfo.supported) {
        console.log("❌ File not supported, skipping...\n");
        continue;
      }

      // Convert the file
      console.log("🔄 Converting to Markdown...");
      const startTime = Date.now();
      
      const result = await converter.convertDocx(filePath);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Conversion completed in ${duration}ms`);
      console.log();

      // Display results
      console.log("📋 Conversion Results:");
      console.log(`  Title: ${result.title || "No title found"}`);
      console.log(`  Content length: ${result.markdown.length} characters`);
      console.log(`  Lines: ${result.markdown.split('\n').length}`);
      console.log();

      // Show preview of content (first 500 characters)
      console.log("👁️  Content Preview:");
      console.log("─".repeat(30));
      const preview = result.markdown.substring(0, 500);
      console.log(preview);
      if (result.markdown.length > 500) {
        console.log("\n... (truncated)");
      }
      console.log("─".repeat(30));
      console.log();

      // Save to file
      const outputFileName = filePath.replace('.docx', '.md').replace('data/', 'output-');
      writeFileSync(outputFileName, result.markdown);
      console.log(`💾 Saved to: ${outputFileName}`);
      console.log();

      // Analyze content structure
      console.log("📊 Content Analysis:");
      const lines = result.markdown.split('\n');
      const headings = lines.filter(line => line.startsWith('#'));
      const tables = result.markdown.match(/\|.*\|/g);
      const images = result.markdown.match(/!\[.*\]\(.*\)/g);
      const mathExpressions = result.markdown.match(/\$.*?\$/g);
      const boldText = result.markdown.match(/\*\*.*?\*\*/g);
      const italicText = result.markdown.match(/\*.*?\*/g);

      console.log(`  Headings: ${headings ? headings.length : 0}`);
      if (headings && headings.length > 0) {
        headings.slice(0, 3).forEach(h => console.log(`    - ${h.trim()}`));
        if (headings.length > 3) console.log(`    ... and ${headings.length - 3} more`);
      }
      
      console.log(`  Tables: ${tables ? Math.floor(tables.length / 3) : 0} detected`);
      console.log(`  Images: ${images ? images.length : 0}`);
      console.log(`  Math expressions: ${mathExpressions ? mathExpressions.length : 0}`);
      console.log(`  Bold text: ${boldText ? boldText.length : 0}`);
      console.log(`  Italic text: ${italicText ? italicText.length : 0}`);
      console.log();

    } catch (error: any) {
      console.error("❌ Conversion failed:");
      console.error(`  Error: ${error.message}`);
      
      if (error.code) {
        console.error(`  Code: ${error.code}`);
      }
      
      if (error.context) {
        console.error(`  Context:`, error.context);
      }
      
      console.log();
    }
  }

  // Test batch processing
  console.log("🔄 Testing batch conversion...");
  console.log("─".repeat(50));
  
  try {
    const batchResults = await converter.convertMultiple(testFiles);
    console.log(`✅ Batch conversion completed!`);
    console.log(`  Processed: ${batchResults.length} files`);
    
    batchResults.forEach((result, index) => {
      const success = result.markdown.length > 0 && !result.title?.includes("failed");
      console.log(`  File ${index + 1}: ${success ? "✅" : "❌"} ${result.title || "No title"}`);
    });
    
  } catch (error: any) {
    console.error("❌ Batch conversion failed:", error.message);
  }

  console.log("\n🎉 Testing completed!");
  console.log("\n📁 Check the generated .md files for the conversion results.");
  console.log("\n💡 Tip: You can now use these files in your Extract Kit PDF processor:");
  console.log("  1. The Markdown files contain structured text");
  console.log("  2. Tables are preserved in Markdown format");
  console.log("  3. Math equations are converted to LaTeX");
}

// Test simple API as well
async function testSimpleAPI() {
  console.log("\n🔬 Testing Simple API...");
  console.log("─".repeat(30));
  
  try {
    const markdown = await docxToMarkdown("data/Ortho - 1.docx");
    console.log("✅ Simple API test successful!");
    console.log(`  Length: ${markdown.length} characters`);
    console.log(`  Preview: ${markdown.substring(0, 100)}...`);
  } catch (error: any) {
    console.error("❌ Simple API test failed:", error.message);
  }
}

// Run tests
if (import.meta.main) {
  testWithRealFiles()
    .then(() => testSimpleAPI())
    .catch(console.error);
}