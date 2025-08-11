/**
 * Test de configuration avec objet pdfProcessor
 * Utilise TEST_SCALEWAY_KEY comme variable d'environnement
 */

import { extractInvoicePdf } from '../src/lib';
import type { PdfProcessorConfig } from '../src/lib';
import { describe, test, expect } from 'bun:test';
import path from 'path';

describe('Configuration pdfProcessor', () => {
  const testPdfPath = path.join(__dirname, '../data/facture3.pdf');
  const testApiKey = process.env.TEST_SCALEWAY_KEY;

  test('devrait extraire une facture avec configuration objet', async () => {
    // Skip si pas de clé API de test
    if (!testApiKey) {
      console.warn('⚠️ TEST_SCALEWAY_KEY non définie, test ignoré');
      return;
    }

    // Configuration via objet (priorité sur les env vars)
    const pdfProcessor: PdfProcessorConfig = {
      providers: {
        scaleway: {
          model: "mistral-small-3.1-24b-instruct-2503",
          apiKey: testApiKey,
          baseURL: "https://api.scaleway.ai/v1"
        }
      }
    };

    console.log('📄 Test d\'extraction avec configuration objet...');
    
    const result = await extractInvoicePdf(testPdfPath, {
      provider: 'scaleway',
      pdfProcessor
    });

    // Vérifications de base
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    
    // Vérifications du schéma ComprehensiveInvoice
    if (result.document_info) {
      expect(result.document_info.document_type).toBeDefined();
    }
    
    if (result.seller_info) {
      expect(result.seller_info.name).toBeDefined();
    }

    console.log('✅ Extraction réussie avec configuration objet');
    console.log('📊 Résultat:', JSON.stringify(result, null, 2));
  }, 120000); // Timeout 30 secondes
});