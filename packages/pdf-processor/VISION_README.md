# PDF Vision LLM Processor - Optimisations Sharp + Zod + AI SDK

Version optimisée de votre PDF processor avec les optimisations Sharp pour Vision LLM et validation Zod + AI SDK.

## ✨ Fonctionnalités

### 🎯 **Optimisations Sharp pour Vision LLM**
- **Préservation couleur** (Vision LLM vs grayscale OCR)
- **Haute qualité JPEG** (95% vs 70-80% OCR)
- **Recadrage intelligent** (`cropSize`)
- **Redimensionnement optimal** par provider
- **Enhancement subtil** (pas agressif comme OCR)

### 📋 **Validation Zod + Types TypeScript**
- **Schémas structurés** avec types automatiques
- **Validation automatique** avec `generateObject`
- **Support factures complexes multi-pages**
- **Montants en `number` avec devise séparée**

### 🤖 **AI SDK Integration**
- **Scaleway** : `mistral-small-3.1-24b-instruct-2503`
- **Ollama** : `llava:13b` (local)
- **generateObject** pour validation automatique
- **Multi-tentatives** avec récupération d'erreurs

## 🚀 API Endpoints

### 📊 Extraction générale
```bash
curl -X POST http://localhost:3001/api/v1/vision/extract \
  -F "file=@facture.pdf" \
  -F "provider=scaleway" \
  -F "cropSize=60"
```

**Paramètres:**
- `provider`: `scaleway`, `ollama`
- `model`: Modèle Vision (ex: `mistral-small-3.1-24b-instruct-2503`, `llava:13b`)
- `cropSize`: % de recadrage (10-100)
- `documentType`: `invoice`, `receipt`, `basic`

### 🧾 Extraction facture rapide
```bash
curl -X POST http://localhost:3001/api/v1/vision/invoice \
  -F "file=@facture.pdf" \
  -F "provider=scaleway"
```

### 📋 Extraction tableaux
```bash
curl -X POST http://localhost:3001/api/v1/vision/tables \
  -F "file=@document.pdf" \
  -F "provider=ollama"
```

## 💻 Utilisation Programmatique

```typescript
import { extractInvoice, extractTables } from './ai-vision-processor.js';

// Extraction facture avec structure complexe
const invoice = await extractInvoice('facture.pdf', {
  provider: 'scaleway',
  cropSize: 60,
});

// Les montants sont maintenant des numbers
console.log(invoice.financial_totals?.montant_ttc); // 1173.10
console.log(invoice.financial_totals?.currency); // "EUR"

// Support structure multi-pages
console.log(invoice.pages?.[0]?.page_tables?.[0]?.billed_services);
```

## ⚙️ Configuration

```bash
# Variables d'environnement (.env)
AI_API_KEY=your_scaleway_api_key
AI_BASE_URL=https://api.scaleway.ai/v1
OLLAMA_BASE_URL=http://localhost:11434  # Ollama local
VISION_PORT=3001
TMPDIR=/tmp
```

## 📊 Providers Supportés

| Provider | Models | Vision Support |
|----------|--------|----------------|
| Scaleway | `mistral-small-3.1-24b-instruct-2503` | ✅ Excellent |
| Ollama | `llava:13b`, `llava:7b` | ✅ Local |

## 🎯 Schemas Supportés

### 📄 ComprehensiveInvoice
- Structure classique (seller_info, buyer_info, line_items)
- **Structure multi-pages** : `pages[{page: 1, page_tables: [...]}]`
- **Sections imbriquées** : `etablissement_des_comptes_annuels.acompte_10`
- **Montants numériques** : `montant_ttc: 1173.10`
- **Devise séparée** : `currency: "EUR"`

### 📋 TablesOnly
- Extraction de tableaux uniquement
- Détection automatique des structures

### 🧾 BasicInvoice
- Version simplifiée pour tests rapides

## 🚀 Démarrage

```bash
cd packages/pdf-processor
bun run src/vision-api.ts  # Port 3001
```

## 📁 Structure Finale

```
src/
├── ai-vision-processor.ts    # Processeur principal Zod + AI SDK
├── vision-optimizer.ts       # Optimisations Sharp pour Vision LLM
├── vision-api.ts            # API REST endpoints
├── zod-schemas.ts           # Schémas Zod avec types TypeScript
├── file-processor.ts        # Extraction images PDF
├── pdf-extractor.ts         # Utils PDF
├── ocr-processor.ts         # OCR traditionnel (fallback)
├── worker-manager.ts        # Pool de workers
├── workers/
│   └── ocr-worker.ts        # Worker OCR
├── types.ts                 # Types partagés
└── index.ts                 # API OCR existante (port 3000)
```

Le système est maintenant optimisé pour traiter vos factures complexes avec la même précision que Sparrow ! 🎯