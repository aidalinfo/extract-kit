# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-10-31

### Added
- Initial release of Extract Kit
- AI-powered PDF data extraction using Scaleway and Ollama providers
- TypeScript support with full type definitions
- Zod schema validation for extracted data
- Sharp-based PDF to image conversion with optimization
- Support for invoice, receipt, and table extraction
- Dual configuration methods: environment variables and configuration objects
- RESTful API server with CORS support
- Library mode for programmatic usage
- Comprehensive test suite
- Docker support with development environment
- Professional logging with Pino

### Features
- **Document Types**: Invoice, receipt, table, and custom document extraction
- **AI Providers**: Scaleway Pixtral and Ollama LLaVA integration
- **Configuration**: Flexible provider configuration with priority handling
- **Type Safety**: Full TypeScript support with Zod validation
- **Performance**: Parallel processing with worker pools
- **Image Processing**: Automatic contrast enhancement and quality optimization

### Supported Models
- **Scaleway**: `pixtral-12b-2409`, `mistral-small-3.1-24b-instruct-2503`
- **Ollama**: `llava:latest`, `llava:13b`, `llava:34b`

### Dependencies
- Node.js >= 18.0.0
- TypeScript >= 4.5.0
- Zod for schema validation
- Sharp for image processing
- AI SDK for AI provider integration