/**
 * Vision LLM providers disponibles
 */
export type VisionProvider = 'scaleway' | 'ollama';

/**
 * Options pour extraction Vision LLM (style Sparrow)
 */
export interface VisionExtractionOptions {
  /**
   * Provider Vision LLM
   */
  provider: VisionProvider;
  
  /**
   * Modèle spécifique (optionnel, utilise le défaut du provider)
   */
  model?: string;
  
  /**
   * Résolution DPI pour extraction d'images
   */
  dpi?: number;
  
  /**
   * Recadrage intelligent Sparrow (pourcentage)
   */
  cropSize?: number;
  
  /**
   * Qualité JPEG pour Vision LLM (70-100)
   */
  targetQuality?: number;
  
  /**
   * Enhancement de contraste
   */
  enhanceContrast?: boolean;
}

/**
 * Options complètes pour traitement (usage interne)
 */
export interface InternalProcessingOptions extends VisionExtractionOptions {
  // Options Vision spécifiques
  tablesOnly?: boolean;
  documentType?: 'invoice' | 'receipt' | 'basic';
  query?: string;
  customSchema?: any;
  
  // Options techniques (toujours true pour Vision LLM)
  extractImages: boolean;
}

/**
 * Modèles par défaut selon provider
 */
export const DEFAULT_MODELS: Record<VisionProvider, string> = {
  'scaleway': 'mistral-small-3.1-24b-instruct-2503',
  'ollama': 'llava:13b'
};

/**
 * Configuration d'un provider AI
 */
export interface ProviderConfig {
  /** Modèle à utiliser pour ce provider */
  model?: string;
  /** Clé API (pour Scaleway) */
  apiKey?: string;
  /** URL de base personnalisée */
  baseURL?: string;
}

/**
 * Configuration complète du processeur PDF
 */
export interface PdfProcessorConfig {
  providers?: {
    scaleway?: ProviderConfig;
    ollama?: ProviderConfig;
  };
}

/**
 * Options par défaut Vision LLM
 */
export const DEFAULT_VISION_OPTIONS: Partial<VisionExtractionOptions> = {
  dpi: 300,
  targetQuality: 95,
  enhanceContrast: false, // Préservation couleur pour Vision LLM
  cropSize: undefined     // Pas de crop par défaut
};