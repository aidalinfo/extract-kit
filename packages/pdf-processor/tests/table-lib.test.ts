/**
 * Test simple d'extraction de tables
 */

import { extractTablesPdf } from '../src/lib';
import type { PdfProcessorConfig } from '../src/lib';
import { describe, test, expect } from 'bun:test';
import path from 'path';

describe('Test Tables', () => {
  const testPdfPath = path.join(__dirname, '../data/table.pdf');
  const testApiKey = process.env.TEST_SCALEWAY_KEY;

  test('extraction de tables', async () => {
    if (!testApiKey) {
      console.warn('⚠️ TEST_SCALEWAY_KEY non définie, test ignoré');
      return;
    }

    const pdfProcessor: PdfProcessorConfig = {
      providers: {
        scaleway: {
          model: "mistral-small-3.1-24b-instruct-2503",
          apiKey: testApiKey,
        }
      }
    };

    const result = await extractTablesPdf(testPdfPath, {
      provider: 'scaleway',
      pdfProcessor
    });
    console.log("Resultat de l'extraction :", result);
    expect(result).toBeDefined();
    expect(result.detected_tables).toBeDefined();
    expect(Array.isArray(result.detected_tables)).toBe(true);

    console.log(`✅ ${result.detected_tables.length} table(s) détectée(s)`);
  }, 1200000);
});