#!/usr/bin/env bun

/**
 * Serveur de démarrage simple
 * Démarre l'API Vision LLM sur le port configuré
 */

import { createVisionAPI } from './api/server';

// Configuration du serveur
const server = createVisionAPI({
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  cors: true,
  corsOrigins: ["*"]
});

// Gestion propre des signaux d'arrêt
process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt du serveur...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Arrêt du serveur...');
  server.stop();
  process.exit(0);
});