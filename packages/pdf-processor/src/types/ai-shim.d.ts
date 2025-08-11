// Lightweight type shim for 'ai' to avoid deep generic instantiation
// during declaration-only builds.

declare module 'ai' {
  import type { z } from 'zod';

  export type LanguageModel = string | unknown;

  export interface GenerateObjectResult<OBJECT = unknown> {
    readonly object: OBJECT;
    readonly finishReason: unknown;
    readonly usage: unknown;
    readonly warnings?: unknown[];
    readonly request: unknown;
    readonly response: unknown;
    readonly providerMetadata?: unknown;
    toJsonResponse(init?: ResponseInit): Response;
  }

  export function generateObject<T = unknown>(options: {
    model: LanguageModel;
    schema: z.ZodTypeAny;
    system?: string;
    prompt?: string | Array<unknown>;
    messages?: Array<unknown>;
    maxRetries?: number;
    abortSignal?: AbortSignal;
    headers?: Record<string, string | undefined>;
  }): Promise<GenerateObjectResult<T>>;
}

