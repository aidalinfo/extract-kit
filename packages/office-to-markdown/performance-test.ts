/**
 * Performance test showing the capabilities of our DOCX to Markdown converter
 */

import { OfficeToMarkdown } from "./src/index.js";
import { readdirSync, statSync } from "fs";
import { join } from "path";

async function performanceTest() {
  console.log("⚡ Performance Test - Office to Markdown Converter");
  console.log("=".repeat(60));
  console.log();

  const converter = new OfficeToMarkdown({
    preserveTables: true,
    convertMath: true,
    headingStyle: "atx"
  });

  // Find all DOCX files in data directory
  const dataDir = "data";
  let docxFiles: string[] = [];
  
  try {
    const files = readdirSync(dataDir);
    docxFiles = files
      .filter(file => file.endsWith('.docx'))
      .map(file => join(dataDir, file));
  } catch (error) {
    console.log("📁 No data directory found, creating test files...");
    docxFiles = [];
  }

  if (docxFiles.length === 0) {
    console.log("⚠️  No DOCX files found in data/ directory");
    console.log("Please add some .docx files to test with.");
    return;
  }

  console.log(`📊 Performance Analysis on ${docxFiles.length} files:`);
  console.log();

  const results = [];
  let totalTime = 0;
  let totalSizeKB = 0;
  let totalCharacters = 0;

  for (const filePath of docxFiles) {
    console.log(`🔄 Processing: ${filePath.split('/').pop()}`);
    
    try {
      // Get file size
      const stats = statSync(filePath);
      const sizeKB = Math.round(stats.size / 1024);
      totalSizeKB += sizeKB;

      // Time the conversion
      const startTime = process.hrtime.bigint();
      const result = await converter.convertDocx(filePath);
      const endTime = process.hrtime.bigint();
      
      const durationMs = Number(endTime - startTime) / 1000000; // Convert to ms
      totalTime += durationMs;
      totalCharacters += result.markdown.length;

      // Analyze content
      const lines = result.markdown.split('\n');
      const headings = lines.filter(line => line.startsWith('#')).length;
      const tables = (result.markdown.match(/\|.*\|/g) || []).length;
      const bold = (result.markdown.match(/\*\*.*?\*\*/g) || []).length;
      const italic = (result.markdown.match(/\*[^*]*\*/g) || []).length;

      const fileResult = {
        filename: filePath.split('/').pop(),
        sizeKB,
        durationMs: Math.round(durationMs),
        characters: result.markdown.length,
        lines: lines.length,
        headings,
        tables: Math.floor(tables / 3), // Approximate table count
        bold,
        italic,
        kbPerSecond: Math.round((sizeKB / durationMs) * 1000),
        charsPerSecond: Math.round((result.markdown.length / durationMs) * 1000)
      };

      results.push(fileResult);

      console.log(`  ✅ ${durationMs.toFixed(0)}ms | ${sizeKB}KB → ${result.markdown.length} chars`);

    } catch (error: any) {
      console.log(`  ❌ Failed: ${error.message}`);
      results.push({
        filename: filePath.split('/').pop(),
        error: error.message
      });
    }
  }

  console.log();
  console.log("📈 Performance Summary:");
  console.log("=".repeat(60));

  // Summary statistics
  const successfulResults = results.filter(r => !r.error);
  let avgTime = 0;
  
  if (successfulResults.length > 0) {
    avgTime = totalTime / successfulResults.length;
    const avgSize = totalSizeKB / successfulResults.length;
    const avgChars = totalCharacters / successfulResults.length;
    const throughputKB = Math.round((totalSizeKB / totalTime) * 1000);
    const throughputChars = Math.round((totalCharacters / totalTime) * 1000);

    console.log(`📊 Files processed: ${successfulResults.length}/${results.length}`);
    console.log(`⏱️  Total time: ${totalTime.toFixed(0)}ms`);
    console.log(`📏 Total input size: ${totalSizeKB} KB`);
    console.log(`📝 Total output: ${totalCharacters.toLocaleString()} characters`);
    console.log();
    console.log(`⚡ Average conversion time: ${avgTime.toFixed(0)}ms`);
    console.log(`📐 Average file size: ${avgSize.toFixed(1)} KB`);
    console.log(`📄 Average output: ${avgChars.toLocaleString()} characters`);
    console.log();
    console.log(`🚀 Throughput: ${throughputKB} KB/s | ${throughputChars.toLocaleString()} chars/s`);
    console.log();

    // Detailed results table
    console.log("📋 Detailed Results:");
    console.log("─".repeat(90));
    console.log("File".padEnd(20) + 
                "Size".padEnd(8) + 
                "Time".padEnd(8) + 
                "Output".padEnd(10) + 
                "H".padEnd(4) + 
                "T".padEnd(4) + 
                "B".padEnd(4) + 
                "I".padEnd(4) + 
                "Speed");
    console.log("─".repeat(90));

    successfulResults.forEach(r => {
      console.log(
        r.filename!.substring(0, 18).padEnd(20) +
        `${r.sizeKB}KB`.padEnd(8) +
        `${r.durationMs}ms`.padEnd(8) +
        `${r.characters}`.padEnd(10) +
        `${r.headings}`.padEnd(4) +
        `${r.tables}`.padEnd(4) +
        `${r.bold}`.padEnd(4) +
        `${r.italic}`.padEnd(4) +
        `${r.kbPerSecond} KB/s`
      );
    });

    console.log("─".repeat(90));
    console.log("Legend: H=Headings, T=Tables, B=Bold, I=Italic");
  }

  // Show errors if any
  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    console.log();
    console.log("❌ Errors:");
    errors.forEach(e => {
      console.log(`  ${e.filename}: ${e.error}`);
    });
  }

  console.log();
  console.log("🎯 Conversion Quality Assessment:");
  console.log("─".repeat(50));
  
  if (successfulResults.length > 0) {
    const totalHeadings = successfulResults.reduce((sum, r) => sum + r.headings!, 0);
    const totalTables = successfulResults.reduce((sum, r) => sum + r.tables!, 0);
    const totalBold = successfulResults.reduce((sum, r) => sum + r.bold!, 0);
    const totalItalic = successfulResults.reduce((sum, r) => sum + r.italic!, 0);

    console.log(`📋 Structure preserved:`);
    console.log(`  • ${totalHeadings} headings converted`);
    console.log(`  • ${totalTables} tables preserved`);
    console.log(`  • ${totalBold} bold text elements`);
    console.log(`  • ${totalItalic} italic text elements`);
    
    console.log();
    console.log(`✅ Success rate: ${Math.round((successfulResults.length / results.length) * 100)}%`);
    
    if (avgTime < 100) {
      console.log(`🚀 Performance: Excellent (${avgTime.toFixed(0)}ms avg)`);
    } else if (avgTime < 500) {
      console.log(`⚡ Performance: Good (${avgTime.toFixed(0)}ms avg)`);
    } else {
      console.log(`⏳ Performance: Acceptable (${avgTime.toFixed(0)}ms avg)`);
    }
  }

  console.log();
  console.log("🔧 System Information:");
  console.log(`  Runtime: Bun ${process.versions.bun || 'unknown'}`);
  console.log(`  Platform: ${process.platform} ${process.arch}`);
  console.log(`  Memory usage: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`);

  console.log();
  console.log("🎉 Performance test completed!");
}

if (import.meta.main) {
  performanceTest().catch(console.error);
}