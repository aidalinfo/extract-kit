# Plan TypeScript - Système d'Extraction de Factures Optimisé

## Vue d'Ensemble

Création d'un système TypeScript haute performance pour l'extraction de données de factures, inspiré des optimisations Sparrow mais adapté pour les APIs modernes (OpenAI, Ollama, etc.).

## Architecture Globale

### Structure du Projet
```
invoice-extractor-ts/
├── src/
│   ├── core/
│   │   ├── pipeline.ts           # Pipeline principal d'extraction
│   │   ├── engine.ts             # Moteur d'orchestration
│   │   └── validator.ts          # Validation JSON Schema
│   ├── providers/
│   │   ├── base-provider.ts      # Interface provider abstrait
│   │   ├── openai-provider.ts    # Provider OpenAI
│   │   ├── ollama-provider.ts    # Provider Ollama
│   │   └── anthropic-provider.ts # Provider Claude
│   ├── processors/
│   │   ├── pdf-processor.ts      # Traitement PDF → images
│   │   ├── image-optimizer.ts    # Optimisation images
│   │   └── schema-generator.ts   # Génération schémas dynamiques
│   ├── utils/
│   │   ├── prompt-builder.ts     # Construction prompts optimisés
│   │   ├── cache-manager.ts      # Cache intelligent
│   │   └── performance-monitor.ts # Monitoring performances
│   └── api/
│       ├── routes/
│       │   ├── extract.ts        # Endpoint extraction
│       │   └── health.ts         # Health check
│       └── server.ts             # Serveur FastAPI/Express
├── config/
│   └── providers.json            # Configuration providers
├── tests/
│   ├── fixtures/                 # PDFs de test
│   └── integration/              # Tests d'intégration
└── docker/
    ├── Dockerfile
    └── docker-compose.yml
```

## Composants Clés

### 1. Pipeline Principal (`core/pipeline.ts`)

```typescript
interface ExtractionOptions {
  provider: 'openai' | 'ollama' | 'anthropic' | 'custom';
  model: string;
  query: string | '*'; // '*' pour extraction complète
  cropSize?: number;
  tablesOnly?: boolean;
  validationOff?: boolean;
  debugMode?: boolean;
}

interface ExtractionResult {
  data: Record<string, any>;
  metadata: {
    pages: number;
    processingTime: number;
    model: string;
    valid: boolean;
    confidence?: number;
  };
  errors?: string[];
}

class ExtractionPipeline {
  private providers: Map<string, BaseProvider>;
  private processor: PDFProcessor;
  private validator: SchemaValidator;
  private cache: CacheManager;
  
  constructor(config: PipelineConfig) {
    this.initializeProviders(config);
    this.processor = new PDFProcessor();
    this.validator = new SchemaValidator();
    this.cache = new CacheManager();
  }
  
  async extract(
    pdfBuffer: Buffer, 
    options: ExtractionOptions
  ): Promise<ExtractionResult> {
    const startTime = Date.now();
    
    try {
      // 1. Traitement PDF → Images optimisées
      const processedImages = await this.processor.process(
        pdfBuffer, 
        options.cropSize
      );
      
      // 2. Préparation requête intelligente
      const { prompt, schema } = await this.prepareQuery(
        options.query, 
        processedImages.length,
        options.tablesOnly
      );
      
      // 3. Exécution extraction avec provider sélectionné
      const rawResults = await this.executeExtraction(
        processedImages, 
        prompt, 
        options
      );
      
      // 4. Validation et formatage
      const validatedResults = await this.validateAndFormat(
        rawResults, 
        schema, 
        options.validationOff
      );
      
      return {
        data: validatedResults,
        metadata: {
          pages: processedImages.length,
          processingTime: Date.now() - startTime,
          model: options.model,
          valid: true
        }
      };
      
    } catch (error) {
      throw new ExtractionError(`Pipeline failed: ${error.message}`);
    }
  }
  
  // Préparation intelligente des requêtes (comme Sparrow)
  private async prepareQuery(
    query: string | '*', 
    pageCount: number,
    tablesOnly?: boolean
  ): Promise<{prompt: string, schema: JSONSchema}> {
    
    if (query === '*') {
      // Mode découverte automatique comme Sparrow
      return await this.generateDiscoveryPrompt(pageCount, tablesOnly);
    }
    
    // Validation JSON et transformation en prompt optimisé
    if (this.isValidJSON(query)) {
      return this.transformJSONToPrompt(query);
    }
    
    throw new Error('Invalid query format. Use JSON schema or "*" for auto-discovery');
  }
}
```

### 2. Providers Modulaires (`providers/`)

#### Interface Base Provider
```typescript
interface VisionModel {
  name: string;
  maxTokens: number;
  supportsImages: boolean;
  costPerImage: number;
}

abstract class BaseProvider {
  protected config: ProviderConfig;
  protected models: VisionModel[];
  
  constructor(config: ProviderConfig) {
    this.config = config;
    this.loadSupportedModels();
  }
  
  abstract async processImages(
    images: ProcessedImage[],
    prompt: string,
    model: string
  ): Promise<string>;
  
  abstract async validateConnection(): Promise<boolean>;
  
  protected abstract loadSupportedModels(): void;
}
```

#### Provider OpenAI
```typescript
class OpenAIProvider extends BaseProvider {
  private client: OpenAI;
  
  constructor(config: OpenAIConfig) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl // Support custom endpoints
    });
  }
  
  protected loadSupportedModels(): void {
    this.models = [
      {
        name: 'gpt-4o',
        maxTokens: 4096,
        supportsImages: true,
        costPerImage: 0.01275
      },
      {
        name: 'gpt-4o-mini',
        maxTokens: 16384,
        supportsImages: true,
        costPerImage: 0.003825
      }
    ];
  }
  
  async processImages(
    images: ProcessedImage[],
    prompt: string,
    model: string
  ): Promise<string> {
    const messages = this.buildVisionMessages(images, prompt);
    
    const response = await this.client.chat.completions.create({
      model,
      messages,
      max_tokens: 4000,
      temperature: 0.1, // Précision maximale pour extraction
      response_format: { type: 'json_object' }
    });
    
    return response.choices[0]?.message?.content || '';
  }
  
  private buildVisionMessages(
    images: ProcessedImage[], 
    prompt: string
  ): ChatCompletionMessageParam[] {
    const imageContent = images.map(img => ({
      type: 'image_url' as const,
      image_url: {
        url: `data:image/jpeg;base64,${img.base64}`,
        detail: 'high' as const // Précision maximale
      }
    }));
    
    return [
      {
        role: 'system',
        content: 'You are a precise document extraction specialist. Always return valid JSON.'
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          ...imageContent
        ]
      }
    ];
  }
}
```

#### Provider Ollama
```typescript
class OllamaProvider extends BaseProvider {
  private baseUrl: string;
  private httpClient: AxiosInstance;
  
  constructor(config: OllamaConfig) {
    super(config);
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 120000 // 2 minutes timeout pour vision models
    });
  }
  
  protected loadSupportedModels(): void {
    this.models = [
      {
        name: 'llava:34b',
        maxTokens: 4096,
        supportsImages: true,
        costPerImage: 0 // Local = gratuit
      },
      {
        name: 'llava-phi3:latest',
        maxTokens: 2048,
        supportsImages: true,
        costPerImage: 0
      }
    ];
  }
  
  async processImages(
    images: ProcessedImage[],
    prompt: string,
    model: string
  ): Promise<string> {
    
    // Ollama supporte multi-images via encodage base64
    const response = await this.httpClient.post('/api/generate', {
      model,
      prompt: this.buildOllamaPrompt(prompt),
      images: images.map(img => img.base64),
      stream: false,
      options: {
        temperature: 0.1,
        top_p: 0.9
      }
    });
    
    return response.data.response;
  }
  
  private buildOllamaPrompt(basePrompt: string): string {
    return `${basePrompt}

CRITICAL INSTRUCTIONS:
- Return ONLY valid JSON, no markdown or explanations
- If a field is not visible, use null
- Be precise with numbers and dates
- Structure data logically`;
  }
}
```

### 3. Traitement PDF Optimisé (`processors/pdf-processor.ts`)

```typescript
interface ProcessedImage {
  base64: string;
  width: number;
  height: number;
  pageNumber: number;
  optimized: boolean;
}

class PDFProcessor {
  private poppler: any; // pdf-poppler ou pdf2pic
  private sharp: Sharp;
  
  constructor() {
    this.initializeLibraries();
  }
  
  async process(
    pdfBuffer: Buffer, 
    cropSize?: number
  ): Promise<ProcessedImage[]> {
    try {
      // 1. Conversion PDF → Images haute résolution
      const pages = await this.convertPDFToImages(pdfBuffer);
      
      // 2. Optimisation parallèle des images
      const optimizedPages = await Promise.all(
        pages.map((page, index) => 
          this.optimizeImage(page, index + 1, cropSize)
        )
      );
      
      return optimizedPages;
      
    } catch (error) {
      throw new ProcessingError(`PDF processing failed: ${error.message}`);
    }
  }
  
  private async convertPDFToImages(pdfBuffer: Buffer): Promise<Buffer[]> {
    const options = {
      format: 'jpeg',
      out_dir: '/tmp',
      out_prefix: 'page',
      page: null, // Toutes les pages
      quality: 100,
      density: 300 // DPI élevé pour précision OCR
    };
    
    return await pdf.convert(pdfBuffer, options);
  }
  
  private async optimizeImage(
    imageBuffer: Buffer, 
    pageNumber: number,
    cropSize?: number
  ): Promise<ProcessedImage> {
    
    let processor = sharp(imageBuffer);
    
    // Optimisations conditionnelles
    if (cropSize) {
      // Crop intelligent pour focus sur contenu principal
      const metadata = await processor.metadata();
      const cropHeight = Math.floor(metadata.height! * (cropSize / 100));
      
      processor = processor.extract({
        left: 0,
        top: Math.floor((metadata.height! - cropHeight) / 2),
        width: metadata.width!,
        height: cropHeight
      });
    }
    
    // Optimisations pour vision models
    const optimized = await processor
      .resize(2048, 2048, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .jpeg({ quality: 95 })
      .toBuffer();
    
    const { width, height } = await sharp(optimized).metadata();
    
    return {
      base64: optimized.toString('base64'),
      width: width!,
      height: height!,
      pageNumber,
      optimized: true
    };
  }
}
```

### 4. Générateur de Schémas Dynamique (`processors/schema-generator.ts`)

```typescript
class SchemaGenerator {
  private knownPatterns: InvoicePattern[];
  
  constructor() {
    this.loadInvoicePatterns();
  }
  
  // Génération automatique comme le "*" de Sparrow
  async generateDiscoverySchema(
    pageCount: number,
    tablesOnly = false
  ): Promise<{prompt: string, schema: JSONSchema}> {
    
    if (tablesOnly) {
      return this.generateTableExtractionSchema();
    }
    
    // Schéma facture complet avec tous les champs possibles
    const schema = {
      type: 'object',
      properties: {
        // Informations de base
        invoice_number: { type: ['string', 'null'] },
        invoice_date: { type: ['string', 'null'] },
        due_date: { type: ['string', 'null'] },
        
        // Vendeur
        seller: {
          type: 'object',
          properties: {
            name: { type: ['string', 'null'] },
            address: { type: ['string', 'null'] },
            phone: { type: ['string', 'null'] },
            email: { type: ['string', 'null'] },
            vat_number: { type: ['string', 'null'] }
          }
        },
        
        // Acheteur
        buyer: {
          type: 'object',
          properties: {
            name: { type: ['string', 'null'] },
            address: { type: ['string', 'null'] },
            phone: { type: ['string', 'null'] },
            email: { type: ['string', 'null'] }
          }
        },
        
        // Articles
        line_items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description: { type: ['string', 'null'] },
              quantity: { type: ['number', 'null'] },
              unit_price: { type: ['number', 'null'] },
              total_price: { type: ['number', 'null'] },
              tax_rate: { type: ['number', 'null'] }
            }
          }
        },
        
        // Totaux
        subtotal: { type: ['number', 'null'] },
        tax_amount: { type: ['number', 'null'] },
        total_amount: { type: ['number', 'null'] },
        
        // Métadonnées
        currency: { type: ['string', 'null'] },
        language: { type: ['string', 'null'] },
        confidence: { type: ['number', 'null'] }
      }
    };
    
    const prompt = this.buildDiscoveryPrompt(schema, pageCount);
    
    return { prompt, schema };
  }
  
  private buildDiscoveryPrompt(
    schema: JSONSchema, 
    pageCount: number
  ): string {
    const fields = this.extractSchemaFields(schema);
    
    return `You are a precise invoice data extraction specialist. 

TASK: Extract ALL visible data from this ${pageCount}-page invoice document.

FIELDS TO EXTRACT:
${fields.join(', ')}

CRITICAL INSTRUCTIONS:
1. Return ONLY valid JSON following the exact schema provided
2. If a field is not visible or cannot be determined, use null
3. For numbers, extract numeric values only (no currency symbols)
4. For dates, use the format found in the document
5. For arrays (line_items), extract ALL items found
6. Be extremely precise - do not guess or infer missing information
7. Include confidence score (0-1) for extraction quality

SCHEMA TO FOLLOW EXACTLY:
${JSON.stringify(schema, null, 2)}

Extract all visible information from the invoice document(s):`;
  }
}
```

### 5. Validation Robuste (`core/validator.ts`)

```typescript
class SchemaValidator {
  private ajv: Ajv;
  
  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      removeAdditional: true,
      coerceTypes: true
    });
  }
  
  async validate(
    data: any, 
    schema: JSONSchema
  ): Promise<ValidationResult> {
    
    const validate = this.ajv.compile(schema);
    const valid = validate(data);
    
    if (valid) {
      return {
        valid: true,
        data: data,
        errors: []
      };
    }
    
    // Tentative de correction automatique
    const corrected = await this.attemptAutoCorrection(
      data, 
      validate.errors!, 
      schema
    );
    
    return {
      valid: false,
      data: corrected,
      errors: validate.errors!.map(err => ({
        field: err.instancePath,
        message: err.message!,
        value: err.data
      }))
    };
  }
  
  private async attemptAutoCorrection(
    data: any,
    errors: ErrorObject[],
    schema: JSONSchema
  ): Promise<any> {
    let corrected = { ...data };
    
    for (const error of errors) {
      switch (error.keyword) {
        case 'type':
          corrected = this.fixTypeError(corrected, error);
          break;
        case 'format':
          corrected = this.fixFormatError(corrected, error);
          break;
        case 'required':
          corrected = this.addMissingFields(corrected, error, schema);
          break;
      }
    }
    
    return corrected;
  }
}
```

### 6. API Express Optimisée (`api/server.ts`)

```typescript
interface ExtractRequest {
  provider: string;
  model: string;
  query?: string;
  options?: {
    cropSize?: number;
    tablesOnly?: boolean;
    validationOff?: boolean;
    debug?: boolean;
  };
}

class ExtractionServer {
  private app: Express;
  private pipeline: ExtractionPipeline;
  private monitor: PerformanceMonitor;
  
  constructor() {
    this.app = express();
    this.pipeline = new ExtractionPipeline();
    this.monitor = new PerformanceMonitor();
    this.setupMiddleware();
    this.setupRoutes();
  }
  
  private setupMiddleware(): void {
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ limit: '50mb', extended: true }));
    this.app.use(cors());
    this.app.use(helmet());
    
    // Middleware de monitoring
    this.app.use((req, res, next) => {
      req.startTime = Date.now();
      next();
    });
  }
  
  private setupRoutes(): void {
    // Endpoint principal d'extraction
    this.app.post('/api/v1/extract', 
      upload.single('pdf'),
      this.validateRequest.bind(this),
      this.extractInvoice.bind(this)
    );
    
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', version: '1.0.0' });
    });
  }
  
  private async extractInvoice(
    req: Request, 
    res: Response
  ): Promise<void> {
    try {
      const { provider, model, query = '*', options = {} } = req.body;
      const pdfBuffer = req.file?.buffer;
      
      if (!pdfBuffer) {
        return res.status(400).json({ 
          error: 'PDF file is required' 
        });
      }
      
      const startTime = Date.now();
      
      const result = await this.pipeline.extract(pdfBuffer, {
        provider,
        model,
        query,
        ...options
      });
      
      // Logging performance
      this.monitor.logExtraction({
        duration: Date.now() - startTime,
        provider,
        model,
        pages: result.metadata.pages,
        success: true
      });
      
      res.json(result);
      
    } catch (error) {
      res.status(500).json({
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}
```

## Optimisations Clés

### 1. **Performance**
- Traitement parallèle des images
- Cache intelligent des résultats
- Pool de connexions pour providers
- Monitoring temps réel

### 2. **Précision**
- Prompts spécialisés par type de document
- Validation JSON Schema automatique
- Correction d'erreurs intelligente
- Gestion des types nullables

### 3. **Flexibilité**
- Support multiple providers (OpenAI, Ollama, Claude...)
- Configuration dynamique des modèles
- Options granulaires (crop, tables, validation)
- Mode découverte automatique avec "*"

### 4. **Robustesse**
- Gestion d'erreurs multi-niveaux
- Validation avant/après extraction
- Logging détaillé pour debug
- Tests d'intégration automatisés

## Plan de Développement

### Phase 1: Core (2-3 semaines)
- [ ] Structure projet TypeScript
- [ ] Pipeline de base avec validation
- [ ] Provider OpenAI
- [ ] Traitement PDF basique

### Phase 2: Optimisations (2 semaines)
- [ ] Provider Ollama
- [ ] Générateur de schémas dynamique
- [ ] Cache et monitoring
- [ ] Optimisations images

### Phase 3: API et Tests (1-2 semaines)
- [ ] Serveur Express complet
- [ ] Tests d'intégration
- [ ] Documentation API
- [ ] Docker deployment

### Phase 4: Extensions (1 semaine)
- [ ] Support Claude/Anthropic
- [ ] Interface web simple
- [ ] Métriques avancées
- [ ] Optimisations finales

## Technologies Requises

### Dépendances Core
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "multer": "^1.4.5",
    "sharp": "^0.32.0",
    "pdf-poppler": "^0.2.0",
    "ajv": "^8.12.0",
    "axios": "^1.6.0",
    "openai": "^4.24.0",
    "node-cache": "^5.1.2",
    "helmet": "^7.1.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/express": "^4.17.0",
    "@types/multer": "^1.4.0",
    "typescript": "^5.3.0",
    "jest": "^29.7.0",
    "supertest": "^6.3.0"
  }
}
```

## Résultat Attendu

Une solution TypeScript qui égale les performances de Sparrow :

- **Précision**: Extraction structurée avec validation automatique
- **Flexibilité**: Support providers multiples et configuration dynamique  
- **Performance**: Traitement parallèle et optimisations intelligentes
- **Simplicité**: Upload PDF → JSON structuré en une requête
- **Mode Auto**: Query "*" génère automatiquement le schéma optimal

Cette approche garantit les mêmes résultats que Sparrow tout en offrant plus de flexibilité dans le choix des modèles et providers API.