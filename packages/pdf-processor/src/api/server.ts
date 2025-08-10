// Conditional import for Bun compatibility
let serve: any = null;

try {
  // Try to import Bun serve - works only in Bun runtime
  if (typeof Bun !== 'undefined') {
    const bunModule = await import("bun");
    serve = bunModule.serve;
  }
} catch (error) {
  // Bun not available - server functionality disabled
  console.warn('Bun runtime not detected. Server functionality requires Bun runtime.');
}
import { createModuleLogger } from "../utils/logger";
import { handleExtractRequest, handleInvoiceRequest, handleTablesRequest } from './handlers';
import { createCorsHeaders } from './utils';

const logger = createModuleLogger('api-server');

/**
 * Configuration du serveur API
 */
export interface APIServerConfig {
  port?: number;
  cors?: boolean;
  corsOrigins?: string[];
}

/**
 * Crée et configure un serveur API Vision
 */
export function createVisionAPI(config: APIServerConfig = {}) {
  // Check if serve is available (Bun runtime required)
  if (!serve) {
    throw new Error('Server functionality requires Bun runtime. Install and run with Bun: https://bun.sh');
  }

  const serverConfig = {
    port: config.port || process.env.PORT ? parseInt(process.env.PORT) : 3001,
    cors: config.cors !== false,
    corsOrigins: config.corsOrigins || ["*"]
  };

  const corsHeaders = serverConfig.cors ? createCorsHeaders(serverConfig.corsOrigins) : {};

  const server = serve({
    port: serverConfig.port,
    
    async fetch(req) {
      const url = new URL(req.url);
      
      // CORS Preflight
      if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
      }
      
      // Health Check
      if (url.pathname === "/health") {
        return new Response(JSON.stringify({ 
          status: "ok", 
          service: "vision-llm-api",
          features: ["sharp-optimization", "zod-validation", "ai-sdk"],
          providers: ["scaleway", "ollama"]
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      // Route handlers
      if (url.pathname === "/api/v1/vision/extract" && req.method === "POST") {
        return await handleExtractRequest(req, corsHeaders);
      }
      
      if (url.pathname === "/api/v1/vision/invoice" && req.method === "POST") {
        return await handleInvoiceRequest(req, corsHeaders);
      }
      
      if (url.pathname === "/api/v1/vision/tables" && req.method === "POST") {
        return await handleTablesRequest(req, corsHeaders);
      }
      
      // 404
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Route non trouvée",
          availableEndpoints: [
            "POST /api/v1/vision/extract - Extraction configurable",
            "POST /api/v1/vision/invoice - Extraction facture rapide",
            "POST /api/v1/vision/tables - Extraction tableaux rapide",
            "GET /health - Status"
          ]
        }),
        { 
          status: 404, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    },
  });

  logger.info({ port: server.port }, '🚀 Vision LLM API démarré');
  logger.info('Routes disponibles:');
  logger.info('- GET  /health: Status du service');
  logger.info('- POST /api/v1/vision/extract: Extraction configurable avec Zod + AI SDK');
  logger.info('- POST /api/v1/vision/invoice: Extraction facture rapide');
  logger.info('- POST /api/v1/vision/tables: Extraction tableaux rapide');
  logger.info('✨ Optimisations: Sharp Vision LLM + Zod validation + AI SDK generateObject');
  logger.info({ baseUrl: process.env.EK_AI_BASE_URL }, '📊 Providers: Scaleway + Ollama local');

  return server;
}