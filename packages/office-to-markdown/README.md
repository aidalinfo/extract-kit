# Office to Markdown Converter

A TypeScript library for converting Office documents (especially DOCX) to Markdown format, optimized for the Bun runtime. Inspired by Microsoft's MarkItDown Python library but designed for modern TypeScript/JavaScript ecosystems.

## Features

- ✅ **DOCX to Markdown conversion** with high-fidelity table support
- ✅ **Math equation conversion** (OMML to LaTeX format)
- ✅ **Heading hierarchy preservation** with proper Markdown formatting
- ✅ **Image handling** with alt text support
- ✅ **Custom styling support** via mammoth style maps
- ✅ **Batch processing** capabilities for multiple documents
- ✅ **Comprehensive error handling** with detailed error codes
- ✅ **File type detection** using magic bytes and MIME types
- ✅ **Production-ready** with TypeScript types and robust error handling

## Installation

```bash
bun add mammoth jszip turndown @types/node
```

## Quick Start

### Simple API

```typescript
import { docxToMarkdown } from "office-to-markdown";

// Convert a DOCX file to Markdown string
const markdown = await docxToMarkdown("document.docx");
console.log(markdown);
```

### Advanced API

```typescript
import { OfficeToMarkdown } from "office-to-markdown";

// Create converter with options
const converter = new OfficeToMarkdown({
  preserveTables: true,      // Keep table formatting
  convertMath: true,         // Convert math equations to LaTeX
  headingStyle: "atx"        // Use # style headings
});

// Convert with full result info
const result = await converter.convertDocx("document.docx", {
  styleMap: "p[style-name='Heading 1'] => h1"  // Custom style mapping
});

console.log("Title:", result.title);
console.log("Markdown:", result.markdown);
```

### Testing

```bash
# Run basic functionality tests
bun run src/test.ts

# Test with a real DOCX file (place file in directory first)
bun run src/test.ts path/to/document.docx
```

## API Reference

### Main Classes

#### `OfficeToMarkdown`

The main converter class that orchestrates document conversion.

**Constructor Options:**
- `preserveTables: boolean` - Keep table formatting (default: true)
- `convertMath: boolean` - Convert math equations to LaTeX (default: true)  
- `headingStyle: "atx" | "setext"` - Markdown heading style (default: "atx")
- `styleMap: string` - Custom mammoth style mapping

**Methods:**
- `convert(source, options?)` - Convert any supported document
- `convertDocx(source, options?)` - Convert DOCX specifically
- `convertMultiple(sources, options?)` - Batch convert multiple documents
- `isSupported(source)` - Check if file type is supported
- `getFileInfo(source)` - Get file metadata without converting
- `getSupportedTypes()` - Get list of supported formats

## Supported Formats

Currently supported input formats:
- **DOCX** - Microsoft Word (Office Open XML)

## Architecture

The library follows a modular architecture inspired by MarkItDown:

```
src/
├── index.ts                 # Main API exports
├── types/                   # TypeScript type definitions
├── converters/             
│   ├── base-converter.ts    # Abstract converter base class
│   └── docx-converter.ts    # DOCX-specific implementation
├── preprocessing/
│   └── docx-preprocessor.ts # Math equation handling
├── utils/
│   ├── html-to-markdown.ts  # HTML → Markdown conversion
│   ├── file-detector.ts     # File type detection
│   └── error-handler.ts     # Error handling utilities
```

## Conversion Pipeline

The DOCX conversion follows this pipeline:

1. **File Detection** - Identify file type using magic bytes
2. **Preprocessing** - Convert OMML math equations to LaTeX
3. **DOCX → HTML** - Use mammoth.js for initial conversion
4. **HTML → Markdown** - Custom converter with table support
5. **Post-processing** - Clean up formatting and structure

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- Inspired by Microsoft's [MarkItDown](https://github.com/microsoft/markitdown) Python library
- Built on top of [mammoth.js](https://github.com/mwilliamson/mammoth.js) for DOCX processing
- Uses [Turndown](https://github.com/mixmark-io/turndown) for HTML to Markdown conversion
