# Extract Kit 🚀

Welcome to **Extract Kit** - a powerful, modern PDF data extraction solution powered by AI vision models! Transform your PDFs into structured, validated data with ease.

> 🌟 **Inspired by [Sparrow](https://github.com/katanaml/sparrow)** - This project builds upon the innovative concepts from Katana ML's Sparrow framework, reimagined with modern TypeScript, Bun runtime, and enhanced AI vision capabilities. 

## 🎯 What is Extract Kit?

Extract Kit is a production-ready TypeScript/Bun-based service that leverages cutting-edge AI vision models to intelligently extract structured data from PDF documents. Whether you're processing invoices, receipts, tables, or custom documents, Extract Kit makes it simple and reliable.

## ✨ Key Features

- **🤖 AI-Powered Extraction**: Harness the power of Scaleway Pixtral and Ollama LLaVA vision models
- **📄 Smart PDF Processing**: Automatic PDF to optimized image conversion using Sharp
- **⚡ Lightning Fast**: Built on Bun runtime with parallel worker processing for maximum performance
- **🔒 Type-Safe**: Full TypeScript implementation with Zod schema validation
- **📊 Structured Logging**: Professional-grade logging with Pino for debugging and monitoring
- **🌐 REST API Ready**: Deploy as a microservice with built-in CORS support
- **📦 Library Mode**: Use as a Node.js/Bun package in your existing projects
- **🎨 Image Optimization**: Automatic contrast enhancement and quality optimization for better AI recognition

## 🏗️ Architecture

Extract Kit follows a modular, scalable architecture:

```
extract-kit/
├── packages/
│   └── pdf-processor/          # Core extraction service
│       ├── src/
│       │   ├── api/           # REST API endpoints
│       │   ├── core/          # Business logic & AI integration
│       │   │   ├── vision/    # Vision processing pipeline
│       │   │   ├── workers/   # Parallel processing workers
│       │   │   └── schemas/   # Zod validation schemas
│       │   ├── lib/           # Public library interface
│       │   └── utils/         # Utilities & logging
│       └── package.json
├── docker-compose-dev.yml      # Development environment
└── example.env.development     # Environment template
```

## 🚀 Quick Start

### Using Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd extract-kit
   ```

2. **Set up environment**
   ```bash
   cp example.env.development .env
   # Edit .env with your API keys
   ```

3. **Start with Docker Compose**
   ```bash
   docker-compose -f docker-compose-dev.yml up
   ```

   Your API is now running at `http://localhost:3000` 🎉

### Manual Installation

1. **Install Bun** (if not already installed)
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **Install dependencies**
   ```bash
   cd packages/pdf-processor
   bun install
   ```

3. **Configure environment**
   ```bash
   cp ../../example.env.development .env
   # Add your Scaleway API key or Ollama configuration
   ```

4. **Start the server**
   ```bash
   bun run dev
   ```

## 📡 API Usage

### Extract Invoice Data

```bash
curl -X POST http://localhost:3000/api/v1/vision/invoice \
  -F "file=@invoice.pdf" \
  -F "provider=scaleway"
```

### Extract Tables

```bash
curl -X POST http://localhost:3000/api/v1/vision/tables \
  -F "file=@report.pdf"
```

### Custom Extraction

```bash
curl -X POST http://localhost:3000/api/v1/vision/extract \
  -F "file=@document.pdf" \
  -F "provider=scaleway" \
  -F "documentType=custom" \
  -F "query=Extract all product information"
```

## 📦 Using as a Library

### Installation

```bash
# Using npm
npm install @aidalinfo/pdf-processor

# Using bun
bun add @aidalinfo/pdf-processor

# Using yarn
yarn add @aidalinfo/pdf-processor
```

### Basic Usage

```typescript
import { extractInvoicePdf, extractTablesPdf, extractPdf, schemas } from '@aidalinfo/pdf-processor';

// Extract invoice data with validation
const invoice = await extractInvoicePdf('path/to/invoice.pdf', {
  provider: 'scaleway',
  enhanceContrast: true
});

console.log(`Invoice #${invoice.invoice_details?.invoice_number}`);
console.log(`Total: ${invoice.financial_totals?.total_amount}`);

// Extract tables from any document
const tables = await extractTablesPdf('path/to/report.pdf');
tables.detected_tables.forEach(table => {
  console.log(`Found table: ${table.table_name}`);
  console.log(`Headers: ${table.headers.join(', ')}`);
});

// Custom extraction with your own schema
const customData = await extractPdf('document.pdf', schemas.invoice, {
  provider: 'scaleway',
  model: 'pixtral-12b-2409'
});
```

### Configuration Options

#### Method 1: Environment Variables (Traditional)

```bash
# Set environment variables
export EK_AI_API_KEY="your-scaleway-api-key"
export EK_AI_BASE_URL="https://api.scaleway.ai/v1"
```

```typescript
// Use with environment variables
const invoice = await extractInvoicePdf('invoice.pdf', {
  provider: 'scaleway'
});
```

#### Method 2: Configuration Object (New & Recommended)

```typescript
import { extractInvoicePdf, type PdfProcessorConfig } from '@aidalinfo/pdf-processor';

// Configure providers programmatically
const pdfProcessor: PdfProcessorConfig = {
  providers: {
    scaleway: {
      model: "mistral-small-3.1-24b-instruct-2503",
      apiKey: "your-scaleway-api-key",
      baseURL: "https://api.scaleway.ai/v1" // optional
    },
    ollama: {
      model: "llava:13b",
      baseURL: "http://localhost:11434" // optional, defaults to localhost
    }
  }
};

// Use configuration object
const invoice = await extractInvoicePdf('invoice.pdf', {
  provider: 'scaleway',
  pdfProcessor
});

// Configuration takes priority over environment variables
const receipt = await extractReceiptPdf('receipt.pdf', {
  provider: 'ollama',
  pdfProcessor
});
```

### Advanced Features

#### With Detailed Metadata

```typescript
import { extractPdfWithMetadata } from '@aidalinfo/pdf-processor';

const result = await extractPdfWithMetadata('document.pdf', schemas.invoice, {
  provider: 'scaleway',
  pdfProcessor
});

console.log('Extracted data:', result.data);
console.log('Processing time:', result.metadata.processingTime);
console.log('Pages processed:', result.metadata.pageCount);
console.log('Model used:', result.metadata.model);
```

#### Custom Models and Settings

```typescript
const advancedConfig: PdfProcessorConfig = {
  providers: {
    scaleway: {
      model: "llama-3.2-11b-vision-instruct", // Different model
      apiKey: "your-api-key",
      baseURL: "https://custom-endpoint.ai/v1"
    }
  }
};

const result = await extractInvoicePdf('invoice.pdf', {
  provider: 'scaleway',
  enhanceContrast: true,
  targetQuality: 90,
  dpi: 300,
  maxRetries: 3,
  pdfProcessor: advancedConfig
});
```

### Available Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `extractInvoicePdf()` | Extract complete invoice data | `ComprehensiveInvoice` |
| `extractTablesPdf()` | Extract tables and tabular data | `TablesOnly` |
| `extractReceiptPdf()` | Extract receipt data | `BasicReceipt` |
| `extractPdf()` | Custom extraction with your schema | Generic `T` |
| `extractPdfWithMetadata()` | Extract with processing metadata | `ExtractResult<T>` |

### Configuration Priority

The library uses the following priority order:

1. **Configuration object** (`pdfProcessor` parameter)
2. **Environment variables** (`EK_AI_API_KEY`, `EK_AI_BASE_URL`)  
3. **Default values**

This allows you to mix approaches - for example, use environment variables for API keys and configuration objects for model selection.

### TypeScript Support

Full TypeScript support with exported types:

```typescript
import type { 
  PdfProcessorConfig, 
  ProviderConfig,
  ComprehensiveInvoice,
  TablesOnly,
  BasicReceipt,
  ExtractOptions
} from '@aidalinfo/pdf-processor';
```

## 🔧 Configuration

### Environment Variables

```env
# AI Provider Configuration
AI_API_KEY=your-scaleway-api-key
AI_BASE_URL=https://api.scaleway.ai/v1

# Server Configuration
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Performance Tuning
ENABLE_WORKERS=true
PDF_WORKERS=2
VISION_WORKERS=3
CPU_USED=2
```

### Supported AI Providers

#### Scaleway AI (Cloud)
- **Models**: `pixtral-12b-2409`, `llama-3.2-11b-vision-instruct`
- **Best for**: Production deployments, high accuracy

#### Ollama (Local)
- **Models**: `llava:latest`, `llava:13b`, `llava:34b`
- **Best for**: Privacy-sensitive data, offline processing

## 📊 Extraction Capabilities

### Document Types

- **📄 Invoices**: Complete invoice extraction with line items, totals, and vendor details
- **🧾 Receipts**: Receipt parsing with items, prices, and transaction information
- **📊 Tables**: Automatic table detection and structured data extraction
- **📝 Custom**: Define your own schemas for any document type

### Data Validation

All extracted data is validated using Zod schemas, ensuring:
- Type safety
- Consistent structure
- Null-safe handling
- Custom validation rules

## 🎯 Use Cases

- **Accounts Payable Automation**: Automate invoice processing and data entry
- **Expense Management**: Extract receipt data for expense reports
- **Data Migration**: Convert legacy PDF documents to structured databases
- **Business Intelligence**: Extract tables and charts for analysis
- **Compliance & Auditing**: Structured extraction for regulatory reporting

## 🛠️ Development

### Running Tests
```bash
bun test
```

### Development Mode
```bash
bun run dev  # Hot reload enabled
```

### Building for Production
```bash
bun run build
```

## 🐳 Docker Deployment

The project includes a production-ready Docker setup:

```yaml
services:
  pdf-processor:
    image: oven/bun
    environment:
      - AI_API_KEY=${AI_API_KEY}
      - AI_BASE_URL=${AI_BASE_URL}
    ports:
      - "3000:3000"
    volumes:
      - ./packages/pdf-processor:/app
```

## 📈 Performance

- **Processing Speed**: ~2-5 seconds per page (depending on complexity)
- **Accuracy**: 95%+ for standard invoice formats
- **Concurrent Processing**: Handles multiple PDFs simultaneously
- **Memory Efficient**: Streaming processing for large documents

## 🔐 Security

- API key authentication
- Input validation and sanitization
- No data persistence (stateless processing)
- Docker containerization for isolation

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📚 Documentation

For detailed documentation, check out:
- [API Documentation](./packages/pdf-processor/README.md)
- [Vision Processing Guide](./packages/pdf-processor/VISION_README.md)
- [Development Plan](./sparrow-doc/plan_detailled.md)

## 🐛 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| `AI_API_KEY not found` | Set your API key in the `.env` file |
| `Port already in use` | Change the port in `.env` or stop the conflicting service |
| `Worker timeout` | Increase worker timeout in environment variables |
| `PDF processing failed` | Ensure the PDF is valid and not password-protected |

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [Bun](https://bun.sh/) - The fast JavaScript runtime
- Powered by [Scaleway AI](https://www.scaleway.com/en/ai/) and [Ollama](https://ollama.ai/)
- Image processing by [Sharp](https://sharp.pixelplumbing.com/)
- Schema validation by [Zod](https://zod.dev/)

## 💬 Support

Need help? 
- Check the [documentation](./packages/pdf-processor/README.md)
- Open an [issue](https://github.com/aidalinfo/extract-kit/issues)
- Contact the maintainers

---

**Happy Extracting!** 🎉 Transform your PDFs into actionable data with Extract Kit!