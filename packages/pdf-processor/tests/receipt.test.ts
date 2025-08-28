
import { extractReceiptPdf } from '../src/lib';
import type { PdfProcessorConfig } from '../src/lib';
import { describe, test, expect } from 'bun:test';
import path from 'path';


describe('Configuration pdfProcessor', () => {
    const testPdfPath = path.join(__dirname, '../data/receipt.pdf');
    const testApiKey = process.env.EK_MISTRAL_API_KEY;

    test('devrait extraire une facture avec configuration objet', async () => {
        // Skip si pas de clé API de test
        if (!testApiKey) {
            console.warn('⚠️ TEST API KEY non définie, test ignoré');
            return;
        }

        // Configuration via objet (priorité sur les env vars)
        const pdfProcessor: PdfProcessorConfig = {
            providers: {
                mistral: {
                    model: 'mistral-medium-latest',
                    apiKey: testApiKey,
                }
            }
        };

        console.log('📄 Test d\'extraction avec configuration objet...');

        const result = await extractReceiptPdf(testPdfPath, {
            provider: 'mistral',
            pdfProcessor,
        });

        // Vérifications de base
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');

        // Vérifications des champs obligatoires
        expect(result.merchant_name).toBeDefined();
        expect(result.merchant_name).not.toBeNull();
        expect(typeof result.merchant_name).toBe('string');
        expect(result.merchant_name!.length).toBeGreaterThan(0);

        expect(result.transaction_date).toBeDefined();
        expect(typeof result.transaction_date).toBe('string');

        expect(result.total_amount).toBeDefined();
        expect(result.total_amount).not.toBeNull();
        expect(typeof result.total_amount).toBe('number');
        expect(result.total_amount!).toBeGreaterThan(0);

        expect(result.currency).toBeDefined();
        expect(typeof result.currency).toBe('string');

        expect(result.items).toBeDefined();
        expect(result.items).not.toBeUndefined();
        expect(Array.isArray(result.items)).toBe(true);
        expect(result.items!.length).toBeGreaterThan(0);

        // Vérifications des items
        result.items!.forEach(item => {
            expect(item.name).toBeDefined();
            expect(item.name).not.toBeNull();
            expect(typeof item.name).toBe('string');
            expect(item.name!.length).toBeGreaterThan(0);

            expect(item.price).toBeDefined();
            expect(typeof item.price).toBe('number');
            expect(item.price).toBeGreaterThan(0);

            expect(item.quantity).toBeDefined();
            expect(typeof item.quantity).toBe('number');
            expect(item.quantity).toBeGreaterThan(0);

            expect(item.total).toBeDefined();
            expect(item.total).not.toBeNull();
            expect(typeof item.total).toBe('number');
            expect(item.total!).toBeGreaterThan(0);
        });

        // Vérification de cohérence: somme des items = total
        const itemsTotal = result.items!.reduce((sum, item) => sum + (item.total || 0), 0);
        expect(Math.abs(itemsTotal - (result.total_amount || 0))).toBeLessThanOrEqual(0.01);

        console.log('✅ Extraction réussie avec configuration objet');
        console.log('📊 Résultat:', JSON.stringify(result, null, 2));
    }, 120000); // Timeout 120 secondes
});