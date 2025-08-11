# 📄 @aidalinfo/office-to-markdown

[![npm version](https://badge.fury.io/js/%40aidalinfo%2Foffice-to-markdown.svg)](https://badge.fury.io/js/%40aidalinfo%2Foffice-to-markdown)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=flat&logo=bun&logoColor=white)](https://bun.sh/)

A modern TypeScript library for converting Office documents (DOCX) to Markdown format, optimized for the Bun ecosystem with advanced support for mathematical equations and tables.

## 🚀 Features

- ✅ **DOCX to Markdown conversion** with structure preservation
- ✅ **Mathematical equation support** (OMML → LaTeX)
- ✅ **Table handling** with automatic formatting
- ✅ **Style preservation** (bold, italic, headings)
- ✅ **Image processing** with alt text
- ✅ **Simple and advanced API** for different use cases
- ✅ **Robust error handling** with specific error codes
- ✅ **Optimized performance** with Bun runtime
- ✅ **Complete TypeScript types** for better DX

## 📦 Installation

### With Bun (recommended)
```bash
bun add @aidalinfo/office-to-markdown
```

### With npm/yarn/pnpm
```bash
npm install @aidalinfo/office-to-markdown
# or
yarn add @aidalinfo/office-to-markdown
# or  
pnpm add @aidalinfo/office-to-markdown
```

### Required Dependencies
The following dependencies are automatically installed:
- `mammoth` - DOCX to HTML conversion
- `turndown` - HTML to Markdown conversion  
- `jszip` - ZIP archive manipulation (DOCX)

## 🛠️ Conversion Workflow

The conversion process follows these steps:

1. **File Detection** - MIME type and extension verification
2. **Preprocessing** - DOCX content extraction and modification
3. **Math Processing** - OMML → LaTeX conversion
4. **Main Conversion** - DOCX → HTML via mammoth
5. **Post-processing** - HTML → Markdown with custom rules

## 🎯 Simple Usage

### Basic Conversion

```typescript
import { docxToMarkdown } from '@aidalinfo/office-to-markdown';

// Simple file conversion
const markdown = await docxToMarkdown('./document.docx');
console.log(markdown);
```

### Advanced API

```typescript
import { OfficeToMarkdown } from '@aidalinfo/office-to-markdown';

const converter = new OfficeToMarkdown({
  headingStyle: 'atx',           // Use ## for headings
  preserveTables: true,          // Preserve tables
  convertMath: true,             // Convert equations to LaTeX
});

// Conversion with options
const result = await converter.convertDocx('./document.docx');
console.log('Title:', result.title);
console.log('Content:', result.markdown);
```

### Conversion from Different Sources

```typescript
import { OfficeToMarkdown } from '@aidalinfo/office-to-markdown';

const converter = new OfficeToMarkdown();

// From file path
const result1 = await converter.convert('./document.docx');

// From Buffer
const buffer = await Bun.file('./document.docx').arrayBuffer();
const result2 = await converter.convert(buffer);

// From Bun file
const file = Bun.file('./document.docx');
const result3 = await converter.convert(file);

// Batch processing
const results = await converter.convertMultiple([
  './doc1.docx',
  './doc2.docx',
  buffer
]);
```

## ⚙️ Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `headingStyle` | `'atx' \| 'setext'` | `'atx'` | Markdown heading style |
| `preserveTables` | `boolean` | `true` | Preserve tables |
| `convertMath` | `boolean` | `true` | Convert mathematical equations |
| `styleMap` | `string` | - | Custom mapping for mammoth |

## 🔧 Technical Architecture

### Module Structure

```
src/
├── converters/           # Document converters
│   ├── base-converter.ts    # Abstract base class
│   └── docx-converter.ts    # Specialized DOCX converter
├── preprocessing/        # Preliminary processing
│   └── docx-preprocessor.ts # DOCX preprocessing (math)
├── math/                # Mathematical processing
│   └── omml-processor.ts    # OMML → LaTeX converter
├── utils/               # Utilities
│   ├── html-to-markdown.ts # HTML → Markdown conversion
│   ├── file-detector.ts     # File type detection
│   └── error-handler.ts     # Error handling
└── types/               # TypeScript definitions
    ├── converter.ts         # Converter types
    ├── result.ts           # Result types
    └── stream-info.ts      # File info types
```

### Conversion Pipeline

1. **File Detection** - MIME type and extension verification
2. **Preprocessing** - DOCX content extraction and modification
3. **Mathematical Processing** - OMML → LaTeX conversion
4. **Main Conversion** - DOCX → HTML via mammoth
5. **Post-processing** - HTML → Markdown with custom rules

### Mathematical Equation Handling

The equation conversion follows this process:

```typescript
// OMML (Office Math Markup Language)
<m:f>
  <m:num>1</m:num>
  <m:den>2</m:den>
</m:f>

// ↓ Preprocessing

<w:r><w:t>$\frac{1}{2}$</w:t></w:r>

// ↓ Mammoth (HTML)

<p>$\frac{1}{2}$</p>

// ↓ Turndown (Markdown)

$\frac{1}{2}$
```

### Supported Mathematical Elements

| OMML | LaTeX | Description |
|------|-------|-------------|
| `<m:f>` | `\frac{}{}` | Fractions |
| `<m:sSup>` | `^{}` | Exponents |
| `<m:sSub>` | `_{}` | Subscripts |
| `<m:rad>` | `\sqrt{}` | Square roots |
| `<m:rad><m:deg>` | `\sqrt[]{}` | Nth roots |

## 🎨 Advanced Usage Examples

### Error Handling

```typescript
import { 
  OfficeToMarkdown, 
  FileConversionException, 
  UnsupportedFormatException 
} from '@aidalinfo/office-to-markdown';

async function convertSafely(filePath: string) {
  try {
    const converter = new OfficeToMarkdown();
    const result = await converter.convertDocx(filePath);
    return result.markdown;
  } catch (error) {
    if (error instanceof UnsupportedFormatException) {
      console.error('Unsupported format:', error.message);
    } else if (error instanceof FileConversionException) {
      console.error('Conversion error:', error.message);
    } else {
      console.error('Unexpected error:', error.message);
    }
    throw error;
  }
}
```

### Capability Checking

```typescript
import { OfficeToMarkdown } from '@aidalinfo/office-to-markdown';

const converter = new OfficeToMarkdown();

// Check supported types
const info = converter.getSupportedTypes();
console.log('Extensions:', info.extensions); // ['.docx']
console.log('MIME types:', info.mimeTypes);

// Check if a file is supported
const isSupported = await converter.isSupported('./document.pdf');
console.log('PDF supported:', isSupported); // false

// Get file information
const fileInfo = await converter.getFileInfo('./document.docx');
console.log('MIME type:', fileInfo.mimetype);
console.log('Supported:', fileInfo.supported);
```

### Usage with Node.js

```typescript
import { readFile } from 'fs/promises';
import { OfficeToMarkdown } from '@aidalinfo/office-to-markdown';

// From Node.js Buffer
const buffer = await readFile('./document.docx');
const converter = new OfficeToMarkdown();
const result = await converter.convert(buffer);

console.log(result.markdown);
```

## 🧪 Testing and Validation

### Test Results

- ✅ HTML → Markdown conversion with tables
- ✅ File type detection (DOCX vs others)
- ✅ OMML → LaTeX mathematical conversion
- ✅ Error handling with specific codes
- ✅ Complete pipeline tested with real documents

### Performance

- **Speed**: ~80ms for an average document (7KB)
- **Fidelity**: Complete preservation of structure and content
- **Robustness**: Graceful error handling with fallbacks

## 🔧 Development

### Prerequisites

- **Bun** >= 1.2.0 (recommended) or **Node.js** >= 20.0.0
- **TypeScript** >= 4.5.0

### Development Installation

```bash
git clone https://github.com/aidalinfo/extract-kit.git
cd extract-kit/packages/office-to-markdown
bun install
```

### Available Scripts

```bash
bun run build          # Complete build (ESM + types)
bun run dev            # Development mode with watch
bun run clean          # Clean dist/ folder
```

### Testing

```bash
# Basic functionality test
bun run src/test.ts

# Test with real DOCX file
bun run test-docx.ts "your-file.docx"
```

## 🚀 Roadmap

- [ ] **PPT/PPTX format support** - Presentation conversion
- [ ] **XLS/XLSX format support** - Spreadsheet conversion
- [ ] **Streaming API** - Large file streaming processing
- [ ] **Plugin system** - Support for custom converters
- [ ] **Web interface** - Optional user interface
- [ ] **Embedded image support** - Image extraction and conversion
- [ ] **CLI batch mode** - Command-line interface

## 🤝 Contributing

Contributions are welcome! Please see our [contribution guide](https://github.com/aidalinfo/extract-kit/blob/main/CONTRIBUTING.md).

### Contribution Process

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

## 📄 License

This project is licensed under **ISC** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by Microsoft's [MarkItDown](https://github.com/microsoft/markitdown) project
- Uses [mammoth.js](https://github.com/mwilliamson/mammoth.js) for DOCX → HTML conversion  
- Uses [turndown](https://github.com/mixmark-io/turndown) for HTML → Markdown conversion
- Optimized for [Bun](https://bun.sh/) runtime

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/aidalinfo/extract-kit/issues)
- **Documentation**: [GitHub Repository](https://github.com/aidalinfo/extract-kit/tree/main/packages/office-to-markdown)
- **Email**: contact@aidalinfo.com

---

<div align="center">
  
**[@aidalinfo/office-to-markdown](https://www.npmjs.com/package/@aidalinfo/office-to-markdown)**

*Simple, fast, and reliable DOCX to Markdown conversion* ⚡

</div>