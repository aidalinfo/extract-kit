import { generateObject, type LanguageModel } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { createModuleLogger } from "../../utils/logger";
import { DEFAULT_MODELS } from '../types';
import type { PdfProcessorConfig } from '../types';
import type { ProcessedVisionImage } from './image-optimization';
import type { AIVisionProcessingOptions } from './processor';

const logger = createModuleLogger('ai-generator');

/**
 * Générateur de données structurées avec AI SDK + validation Zod
 */
export class AIGenerator {
  
  /**
   * Génère les données structurées avec AI SDK + validation Zod automatique
   */
  async generate<T extends z.ZodSchema>(
    images: ProcessedVisionImage[],
    schema: T,
    options: AIVisionProcessingOptions
  ): Promise<{ object: z.infer<T>; modelUsed: string }> {
    
    const provider = options.provider || 'scaleway';
    const modelName = options.model || options.pdfProcessor?.providers?.[provider as keyof typeof options.pdfProcessor.providers]?.model || DEFAULT_MODELS[provider as keyof typeof DEFAULT_MODELS];
    const model = this.getModelInstance(provider, options.model, options.pdfProcessor);
    
    // Construction du prompt optimisé selon le schéma
    const prompt = this.buildPromptForSchema(schema, options);
    
    const modelToUse = options.model || DEFAULT_MODELS[provider];
    logger.debug({ provider, model: modelToUse }, '🎯 Génération avec AI');
    
    // Préparation des images selon le format du provider
    const imageMessages = this.formatImagesForProvider(images, provider);
    
    // GÉNÉRATION AVEC AI SDK + VALIDATION ZOD AUTOMATIQUE
    logger.debug({
      provider,
      model: modelName,
      imageCount: images.length,
      schemaKeys: Object.keys((schema as any).shape || {}),
      promptLength: prompt.length,
      systemPromptLength: this.getSystemPrompt(provider).length,
      maxRetries: options.maxRetries || 2
    }, '🎯 Début génération AI avec tous les détails');
    
    try {
      const result = await generateObject({
        model,
        schema,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(provider)
          },
          {
            role: 'user', 
            content: [
              { type: 'text', text: prompt },
              ...imageMessages
            ]
          }
        ],
        maxRetries: options.maxRetries || 2,
      });
      
      logger.debug('✅ Données structurées générées et validées par Zod');
      
      return { ...result, modelUsed: modelName };
    } catch (error: any) {
      console.log('❌ Erreur lors de la génération AI', error);
      logger.error({
        error: error.message || error.toString(),
        stack: error.stack,
        name: error.name,
        provider,
        model: modelName,
        cause: error.cause
      }, '❌ Erreur génération AI');
      throw error;
    }
  }

  /**
   * Obtient l'instance du modèle selon le provider avec config personnalisée
   */
  private getModelInstance(provider: string, model?: string, config?: PdfProcessorConfig): LanguageModel {
    const providerConfig = config?.providers?.[provider as keyof typeof config.providers];
    const modelToUse = model || providerConfig?.model || DEFAULT_MODELS[provider as keyof typeof DEFAULT_MODELS];
    
    logger.debug({ 
      provider, 
      model: modelToUse, 
      hasCustomConfig: !!providerConfig 
    }, '🤖 Configuration modèle');

    switch (provider) {
      case 'scaleway':
        const apiKey = providerConfig?.apiKey || process.env.EK_AI_API_KEY;
        const baseURL = providerConfig?.baseURL || process.env.EK_AI_BASE_URL || 'https://api.scaleway.ai/v1';
        
        if (!apiKey) {
          throw new Error('Scaleway API key requis: fournissez-le via pdfProcessor.providers.scaleway.apiKey ou EK_AI_API_KEY');
        }
        
        const scalewayClient = createOpenAI({ apiKey, baseURL });
        return scalewayClient.chat(modelToUse); // Force l'utilisation de Chat Completions API
      
      case 'mistral':
        const mistralApiKey = providerConfig?.apiKey || process.env.EK_MISTRAL_API_KEY;
        const mistralBaseURL = providerConfig?.baseURL;
        
        if (!mistralApiKey) {
          throw new Error('Mistral API key requis: fournissez-le via pdfProcessor.providers.mistral.apiKey ou EK_MISTRAL_API_KEY');
        }
        
        const mistralConfig: any = { apiKey: mistralApiKey, baseURL: 'https://api.mistral.ai/v1' };
        if (mistralBaseURL) {
          mistralConfig.baseURL = mistralBaseURL;
        }
        
        const mistralClient = createOpenAI(mistralConfig);
        return mistralClient.chat(modelToUse);
      
      case 'ollama':
        const defaultOllamaURL = 'http://localhost:11434/v1';
        const ollamaConfig: any = {
          baseURL: providerConfig?.baseURL || defaultOllamaURL,
          apiKey: 'not-needed', // Ollama doesn't require API key
        };
        
        logger.debug({
          provider: 'ollama',
          baseURL: ollamaConfig.baseURL,
          model: modelToUse
        }, '🦙 Configuration Ollama');
        
        const ollama = createOpenAI(ollamaConfig);
        return ollama.chat(modelToUse);
      
      case 'custom':
        const customApiKey = providerConfig?.apiKey || process.env.CUSTOM_API_KEY || 'not-needed';
        const customBaseURL = providerConfig?.baseURL;
        
        if (!customBaseURL) {
          throw new Error('Custom baseURL requis: fournissez-le via pdfProcessor.providers.custom.baseURL');
        }
        
        // For local providers like Ollama, API key is not needed
        const customClient = createOpenAI({ apiKey: customApiKey, baseURL: customBaseURL });
        return customClient.chat(modelToUse); // Force l'utilisation de Chat Completions API
      
      default:
        throw new Error(`Provider non supporté: ${provider}. Seuls 'scaleway', 'mistral', 'ollama' et 'custom' sont supportés.`);
    }
  }

  /**
   * Construit le prompt optimisé selon le schéma Zod
   */
  private buildPromptForSchema(schema: z.ZodSchema, options: AIVisionProcessingOptions): string {
    const basePrompt = `Extract structured data from this document following the provided schema exactly.`;
    
    if (options.tablesOnly) {
      return `${basePrompt}

TASK: Focus exclusively on extracting tables and tabular data.
- Identify all tables in the document
- Extract headers and all data rows completely
- Preserve data types (numbers as numbers)
- Use null for empty cells
- Include table context/summary if visible`;
    }
    
    if (options.documentType === 'invoice') {
      return `${basePrompt}

TASK: Extract comprehensive invoice information.
- Invoice details (number, date, amounts)
- Seller and buyer information
- Line items with quantities and prices
- Financial totals and tax information
- Payment terms and banking details
- Use null for missing fields - never guess`;
    }
    
    return `${basePrompt}

TASK: Perform comprehensive document data extraction.
- Extract all visible information systematically
- Follow the schema structure exactly
- Use appropriate data types (numbers as numbers, not strings)
- Use null for fields that are not visible or unclear
- Maintain high precision - only extract clearly visible data
`;
  }

  /**
   * Formate les images selon le provider
   */
  private formatImagesForProvider(images: ProcessedVisionImage[], provider: string): any[] {
    return images.map(img => ({
      type: 'image',
      image: `data:image/jpeg;base64,${img.base64}`,
    }));
  }

  /**
   * Prompt système optimisé par provider
   */
  private getSystemPrompt(provider: string): string {
    return `You are a professional document data extraction specialist. You excel at:
- Extracting structured data from invoices, receipts, and business documents
- Following schemas with absolute precision
- Using appropriate data types (numbers as numbers, not strings)
- Returning null for missing or unclear fields - never guess
- Maintaining high accuracy with complex document layouts
- Generate valid JSON only - no trailing commas, no empty objects with trailing commas
- If an object/array is empty, write it as {} or [] without trailing commas

Extract data exactly as requested in the schema.`;
  }
}