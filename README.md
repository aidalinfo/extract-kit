# Extract Kit 🚀

Welcome to **Extract Kit** - a powerful, modern solution for document data extraction and conversion, powered by AI vision models! Transform your PDFs and Office documents into structured, validated data with ease.

> 🌟 **Inspired by [Sparrow](https://github.com/katanaml/sparrow)** - This project builds upon the innovative concepts from Katana ML's Sparrow framework, reimagined with modern TypeScript, Bun runtime, and enhanced AI vision capabilities.

## 🎯 What is Extract Kit?

Extract Kit is a monorepo containing a suite of production-ready TypeScript/Bun-based tools that leverage cutting-edge AI vision models and advanced parsing techniques to intelligently extract and convert data from various document formats.

## 🛠️ Available Packages

This repository contains the following open-source packages:

### 1. PDF Processor

[![npm version](https://badge.fury.io/js/%40aidalinfo%2Fpdf-processor.svg)](https://www.npmjs.com/package/@aidalinfo/pdf-processor)
[![npm downloads](https://img.shields.io/npm/dm/@aidalinfo/pdf-processor.svg?style=flat-square)](https://www.npmjs.com/package/@aidalinfo/pdf-processor)

A service that leverages cutting-edge AI vision models (Scaleway, Mistral, Ollama) to intelligently extract structured data from PDF documents. It's perfect for processing invoices, receipts, tables, or any custom document type.

- **NPM Package**: [`@aidalinfo/pdf-processor`](https://www.npmjs.com/package/@aidalinfo/pdf-processor)
- **Documentation**: [Read the PDF Processor README](./packages/pdf-processor/README.md)

### 2. Office to Markdown

[![npm version](https://badge.fury.io/js/%40aidalinfo%2Foffice-to-markdown.svg)](https://www.npmjs.com/package/@aidalinfo/office-to-markdown)
[![npm downloads](https://img.shields.io/npm/dm/@aidalinfo/office-to-markdown.svg?style=flat-square)](https://www.npmjs.com/package/@aidalinfo/office-to-markdown)

A modern TypeScript library for converting Office documents (DOCX) to Markdown format. It's optimized for the Bun ecosystem and includes advanced support for mathematical equations (OMML) and tables.

- **NPM Package**: [`@aidalinfo/office-to-markdown`](https://www.npmjs.com/package/@aidalinfo/office-to-markdown)
- **Documentation**: [Read the Office to Markdown README](./packages/office-to-markdown/README.md)

## ✨ Key Features

- **🤖 AI-Powered Extraction**: Harness the power of Scaleway Pixtral, Mistral AI, Ollama LLaVA, and custom AI providers for PDF processing.
- **🔄 Advanced DOCX Conversion**: Convert `.docx` files to clean Markdown, preserving structure, styles, and even complex mathematical equations.
- **📄 Smart PDF Processing**: Automatic PDF to optimized image conversion using Sharp for better AI recognition.
- **⚡ Lightning Fast**: Built on Bun runtime with parallel worker processing for maximum performance.
- **🔒 Type-Safe**: Full TypeScript implementation with Zod schema validation for reliable data extraction.
- **📦 Dual Mode**: Use as a standalone REST API microservice or as a library in your existing Node.js/Bun projects.

## 🚀 Quick Start

For detailed instructions, please refer to the README file of the specific package you want to use:

- **For PDF Extraction**: [`packages/pdf-processor/README.md`](./packages/pdf-processor/README.md)
- **For DOCX Conversion**: [`packages/office-to-markdown/README.md`](https://github.com/aidalinfo/extract-kit/blob/main/packages/office-to-markdown/README.md)

## 🤝 Contributing

We welcome contributions! Please read our contribution guidelines (coming soon). For now, you can:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [Bun](https://bun.sh/) - The fast JavaScript runtime.
- PDF Processor is powered by [Scaleway AI](https://www.scaleway.com/en/ai/), [Mistral AI](https://mistral.ai/), and [Ollama](https://ollama.ai/).
- Office to Markdown is inspired by Microsoft's [MarkItDown](https://github.com/microsoft/markitdown).

---

**Happy Extracting!** 🎉