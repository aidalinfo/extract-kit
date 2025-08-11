# CLAUDE.md - Extract Kit Project Guide

## Project Overview

Extract Kit is a production-ready PDF data extraction service powered by AI vision models. It converts PDFs into structured, validated data using TypeScript/Bun runtime with AI providers like Scaleway (Pixtral, Mistral), Mistral AI, and Ollama LLaVA.

**Main Purpose**: Transform PDF documents (invoices, receipts, tables) into structured JSON data through AI-powered vision processing.

## Key Commands

### Development
```bash
# Start development server with hot reload
bun run dev

# Run tests
bun test

# Build for production
bun run build

# Start production server
bun run start
```

### Docker Operations
```bash
# Start with Docker Compose
docker-compose -f docker-compose-dev.yml up

# Stop services
docker-compose -f docker-compose-dev.yml down
```

## Project Structure

```
extract-kit/
├── packages/
│   └── pdf-processor/          # Core extraction service
│       ├── src/
│       │   ├── api/           # REST API endpoints & handlers
│       │   │   ├── server.ts      # Main server setup
│       │   │   ├── handlers.ts    # Request handlers
│       │   │   └── validation.ts  # Input validation
│       │   ├── core/          # Business logic
│       │   │   ├── vision/        # AI vision processing
│       │   │   │   ├── processor.ts       # Main processor
│       │   │   │   ├── ai-generator.ts    # AI model interface
│       │   │   │   └── image-optimization.ts  # Image enhancement
│       │   │   ├── workers/      # Parallel processing
│       │   │   │   ├── pdf-extraction-worker.ts
│       │   │   │   └── vision-optimization-worker.ts
│       │   │   └── schemas/       # Zod validation schemas
│       │   │       ├── invoice.ts  # Invoice schema
│       │   │       ├── tables.ts   # Table schema
│       │   │       └── factory.ts  # Schema factory
│       │   ├── lib/           # Public library interface
│       │   └── utils/         # Logging & utilities
│       └── package.json       # Dependencies & scripts
├── docker-compose-dev.yml     # Docker development setup
└── example.env.development    # Environment template
```

## Important Files

- **Entry Point**: `packages/pdf-processor/src/server.ts` - Main server initialization
- **API Routes**: `packages/pdf-processor/src/api/handlers.ts` - REST endpoint handlers
- **Core Logic**: `packages/pdf-processor/src/core/vision/processor.ts` - Vision processing pipeline
- **AI Integration**: `packages/pdf-processor/src/core/vision/ai-generator.ts` - AI model interface
- **Schemas**: `packages/pdf-processor/src/core/schemas/` - Data validation schemas
- **Config**: `.env` file for API keys and settings (copy from `example.env.development`)

## Development Notes

### Environment Setup
1. **Required**: Set API keys for your chosen provider:
   - Scaleway: `EK_AI_API_KEY`
   - Mistral AI: `EK_MISTRAL_API_KEY`
2. **Optional**: Configure `EK_AI_BASE_URL` for different AI providers
3. **Performance**: Adjust worker counts via `EK_PDF_WORKERS` and `EK_VISION_WORKERS`

### Key Technologies
- **Runtime**: Bun (fast JavaScript/TypeScript runtime)
- **Framework**: Native Bun server with CORS support
- **AI Providers**: Scaleway (cloud), Mistral AI (cloud) or Ollama (local)
- **Image Processing**: Sharp library for PDF to image conversion
- **Validation**: Zod for type-safe schema validation
- **Logging**: Pino for structured logging

### API Endpoints
- `POST /api/v1/vision/invoice` - Extract invoice data
- `POST /api/v1/vision/tables` - Extract table data
- `POST /api/v1/vision/extract` - Custom extraction with query

### Common Tasks
- **Add new schema**: Create in `src/core/schemas/`, register in `factory.ts`
- **Modify AI provider**: Update `src/core/vision/ai-generator.ts`
- **Add API endpoint**: Update `src/api/handlers.ts` and `server.ts`
- **Optimize performance**: Adjust worker configuration in `.env`

## Testing

### Run All Tests
```bash
bun test
```

### Test Specific Features
```bash
# Test API endpoints
curl -X POST http://localhost:3000/api/v1/vision/invoice \
  -F "file=@test.pdf" \
  -F "provider=scaleway"

# Health check
curl http://localhost:3000/health
```

### Verification Steps
1. Check server starts without errors: `bun run dev`
2. Verify health endpoint: `curl http://localhost:3000/health`
3. Test PDF processing with sample file
4. Check logs for errors: Monitor console output
5. Validate response schemas match expectations

## Troubleshooting

### Common Issues
- **Port conflict**: Change `PORT` in `.env` (default: 3000)
- **API key errors**: Verify `AI_API_KEY` is set correctly
- **PDF processing fails**: Check PDF is valid and not password-protected
- **Worker timeout**: Increase timeout settings in environment
- **Memory issues**: Reduce worker counts or optimize image size

### Debug Mode
Enable detailed logging:
```bash
LOG_LEVEL=debug bun run dev
```

## Performance Optimization

- **Worker Pools**: Configured for parallel processing
- **Image Optimization**: Automatic contrast enhancement for better AI recognition
- **Streaming**: Large files processed in chunks
- **Caching**: Consider implementing Redis for repeated extractions

## Security Considerations

- API keys stored in environment variables
- Input validation on all endpoints
- File type verification for uploads
- No persistent storage of uploaded files
- CORS configured for production use

## Library Usage

When using as a package:
```typescript
import { extractInvoicePdf, extractTablesPdf, type PdfProcessorConfig } from '@aidalinfo/pdf-processor';

// Method 1: Using environment variables
const result = await extractInvoicePdf('path/to/file.pdf', {
  provider: 'scaleway',
  enhanceContrast: true
});

// Method 2: Using configuration object (recommended)
const pdfProcessor: PdfProcessorConfig = {
  providers: {
    scaleway: {
      model: "mistral-small-3.1-24b-instruct-2503",
      apiKey: "your-scaleway-api-key",
      baseURL: "https://api.scaleway.ai/v1"
    },
    mistral: {
      model: "pixtral-large-latest", // or "mistral-medium-latest"
      apiKey: "your-mistral-api-key",
      baseURL: "https://api.mistral.ai/v1" // optional
    }
  }
};

const result2 = await extractInvoicePdf('path/to/file.pdf', {
  provider: 'scaleway',
  pdfProcessor
});
```

## Notes for AI Assistants

1. **Always check existing code patterns** before making changes
2. **Run tests** after modifications: `bun test`
3. **Follow TypeScript conventions** throughout the codebase
4. **Use Zod schemas** for all data validation
5. **Log important operations** using the Pino logger
6. **Handle errors gracefully** with proper error messages
7. **Update this file** when adding major features or changes