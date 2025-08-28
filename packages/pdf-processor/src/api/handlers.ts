import { aiVisionProcessor, extractInvoice, extractTables } from "../core/vision";
import { createModuleLogger } from "../utils/logger";
import { validateExtractRequest } from './validation';
import { createTempFile } from './utils';

const logger = createModuleLogger('api-handlers');

/**
 * Handler pour l'extraction configurable
 */
export async function handleExtractRequest(req: Request, corsHeaders: Record<string, string>) {
  try {
    logger.info('🎯 Requête Vision LLM reçue');
    
    const contentType = req.headers.get("Content-Type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(
        JSON.stringify({ success: false, error: "Content-Type doit être multipart/form-data" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    const formData = await req.formData();
    const pdfFile = formData.get("file");
    
    if (!pdfFile || !(pdfFile instanceof File)) {
      return new Response(
        JSON.stringify({ success: false, error: "Fichier PDF manquant ou invalide" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    const requestBody = {
      provider: formData.get("provider")?.toString(),
      model: formData.get("model")?.toString(),
      query: formData.get("query")?.toString(),
      cropSize: formData.get("cropSize") ? parseInt(formData.get("cropSize")!.toString()) : undefined,
      tablesOnly: formData.get("tablesOnly")?.toString() === "true",
      documentType: formData.get("documentType")?.toString(),
      enhanceContrast: formData.get("enhanceContrast")?.toString() !== "false",
      targetQuality: formData.get("targetQuality") ? parseInt(formData.get("targetQuality")!.toString()) : undefined,
      debug: formData.get("debug")?.toString() === "true",
    };
    
    const validation = validateExtractRequest(requestBody);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: `Paramètres invalides: ${validation.error}` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    const options = validation.data!;
    logger.info({ provider: options.provider, model: options.model || 'default', query: options.query }, '🔧 Configuration requête');
    
    const { filePath, cleanup } = await createTempFile(await pdfFile.arrayBuffer());
    
    try {
      const result = await aiVisionProcessor.process(filePath, {
        provider: options.provider!,
        model: options.model,
        query: options.query,
        cropSize: options.cropSize,
        tablesOnly: options.tablesOnly,
        documentType: options.documentType,
        enhanceContrast: options.enhanceContrast,
        targetQuality: options.targetQuality,
        dpi: 300,
      });
      
      logger.info({ processingTime: result.metadata.processingTime, pages: result.metadata.pageCount }, '✅ Extraction réussie');
      
      return new Response(
        JSON.stringify({ success: true, ...result }, null, options.debug ? 2 : 0),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } finally {
      await cleanup();
    }
  } catch (error: any) {
    logger.error({ error }, '❌ Erreur Vision API');
    return new Response(
      JSON.stringify({ success: false, error: `Erreur serveur: ${error.message}` }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
}

/**
 * Handler pour l'extraction de factures
 */
export async function handleInvoiceRequest(req: Request, corsHeaders: Record<string, string>) {
  try {
    const formData = await req.formData();
    const pdfFile = formData.get("file");
    
    if (!pdfFile || !(pdfFile instanceof File)) {
      return new Response(
        JSON.stringify({ success: false, error: "Fichier PDF requis" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    const { filePath, cleanup } = await createTempFile(await pdfFile.arrayBuffer());
    
    try {
      const invoiceData = await extractInvoice(filePath, {
        provider: (formData.get("provider")?.toString() as any) || 'scaleway',
        model: formData.get("model")?.toString(),
        cropSize: formData.get("cropSize") ? parseInt(formData.get("cropSize")!.toString()) : undefined,
      });
      
      return new Response(
        JSON.stringify({ success: true, invoice: invoiceData }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } finally {
      await cleanup();
    }
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
}

/**
 * Handler pour l'extraction de tableaux
 */
export async function handleTablesRequest(req: Request, corsHeaders: Record<string, string>) {
  try {
    const formData = await req.formData();
    const pdfFile = formData.get("file");
    
    if (!pdfFile || !(pdfFile instanceof File)) {
      return new Response(
        JSON.stringify({ success: false, error: "Fichier PDF requis" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    const { filePath, cleanup } = await createTempFile(await pdfFile.arrayBuffer());
    
    try {
      const tablesData = await extractTables(filePath, {
        provider: (formData.get("provider")?.toString() as any) || 'scaleway',
        model: formData.get("model")?.toString(),
      });
      
      return new Response(
        JSON.stringify({ success: true, tables: tablesData }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } finally {
      await cleanup();
    }
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
}