/**
 * Worker Pool Manager pour Bun
 * Gère les workers PDF et Vision avec load balancing et error recovery
 */

import path from "path";
import crypto from "crypto";
import { createModuleLogger } from "../../utils/logger";

const logger = createModuleLogger('worker-pool-manager');

export interface WorkerTask {
  taskId: string;
  data: any;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
  timeout?: number;
}

export interface WorkerPoolConfig {
  maxWorkers: number;
  workerScript: string;
  taskTimeout: number;
}

/**
 * Pool de workers Bun avec gestion automatique des tâches
 */
export class WorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private pendingTasks: WorkerTask[] = [];
  private activeTasks = new Map<string, WorkerTask>();
  private config: WorkerPoolConfig;

  constructor(config: WorkerPoolConfig) {
    this.config = config;
    this.initializeWorkers();
  }

  /**
   * Initialise le pool de workers
   */
  private initializeWorkers() {
    logger.info({ maxWorkers: this.config.maxWorkers, script: path.basename(this.config.workerScript) }, '🏭 Initialisation pool');
    
    for (let i = 0; i < this.config.maxWorkers; i++) {
      const worker = new Worker(this.config.workerScript);
      
      worker.onmessage = (event) => {
        this.handleWorkerMessage(worker, event.data);
      };
      
      worker.onerror = (error) => {
        this.handleWorkerError(worker, error);
      };
      
      this.workers.push(worker);
      this.availableWorkers.push(worker);
    }
  }

  /**
   * Execute une tâche dans le pool de workers
   */
  async executeTask<T>(data: any, timeout?: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const taskId = crypto.randomUUID();
      const task: WorkerTask = {
        taskId,
        data: { ...data, taskId },
        resolve,
        reject,
        timeout: timeout || this.config.taskTimeout
      };

      this.pendingTasks.push(task);
      this.processPendingTasks();
    });
  }

  /**
   * Traite les tâches en attente
   */
  private processPendingTasks() {
    while (this.pendingTasks.length > 0 && this.availableWorkers.length > 0) {
      const task = this.pendingTasks.shift()!;
      const worker = this.availableWorkers.shift()!;
      
      this.activeTasks.set(task.taskId, task);
      
      // Timeout de la tâche
      setTimeout(() => {
        if (this.activeTasks.has(task.taskId)) {
          this.handleTaskTimeout(task);
        }
      }, task.timeout!);
      
      worker.postMessage(task.data);
    }
  }

  /**
   * Gère la réponse d'un worker
   */
  private handleWorkerMessage(worker: Worker, result: any) {
    const taskId = result.taskId;
    const task = this.activeTasks.get(taskId);
    
    if (!task) {
      logger.warn({ taskId }, '⚠️ Réponse worker pour tâche inconnue');
      return;
    }

    this.activeTasks.delete(taskId);
    this.availableWorkers.push(worker);
    
    if (result.success) {
      task.resolve(result);
    } else {
      task.reject(new Error(result.error || 'Worker task failed'));
    }

    // Traite les tâches suivantes
    this.processPendingTasks();
  }

  /**
   * Gère les erreurs de worker
   */
  private handleWorkerError(worker: Worker, error: ErrorEvent) {
    logger.error({ error }, '❌ Erreur worker');
    
    // Trouve les tâches actives de ce worker et les rejette
    for (const [taskId, task] of this.activeTasks.entries()) {
      task.reject(new Error(`Worker error: ${error.message}`));
      this.activeTasks.delete(taskId);
    }

    // Retire le worker défaillant
    this.workers = this.workers.filter(w => w !== worker);
    this.availableWorkers = this.availableWorkers.filter(w => w !== worker);
    
    // Crée un nouveau worker de remplacement
    this.createReplacementWorker();
  }

  /**
   * Gère le timeout d'une tâche
   */
  private handleTaskTimeout(task: WorkerTask) {
    this.activeTasks.delete(task.taskId);
    task.reject(new Error(`Task timeout after ${task.timeout}ms`));
    
    // Le worker pourrait encore répondre - on l'ignore dans handleWorkerMessage
  }

  /**
   * Crée un worker de remplacement
   */
  private createReplacementWorker() {
    try {
      const worker = new Worker(this.config.workerScript);
      
      worker.onmessage = (event) => {
        this.handleWorkerMessage(worker, event.data);
      };
      
      worker.onerror = (error) => {
        this.handleWorkerError(worker, error);
      };
      
      this.workers.push(worker);
      this.availableWorkers.push(worker);
      
      logger.info('🔄 Worker de remplacement créé');
    } catch (error) {
      logger.error({ error }, '❌ Impossible de créer un worker de remplacement');
    }
  }

  /**
   * Statistiques du pool
   */
  getStats() {
    return {
      totalWorkers: this.workers.length,
      availableWorkers: this.availableWorkers.length,
      activeTasks: this.activeTasks.size,
      pendingTasks: this.pendingTasks.length,
      utilization: ((this.workers.length - this.availableWorkers.length) / this.workers.length) * 100
    };
  }

  /**
   * Ferme le pool et termine tous les workers
   */
  async shutdown() {
    logger.info('🔻 Arrêt du pool de workers...');
    
    // Rejette toutes les tâches actives
    for (const [taskId, task] of this.activeTasks.entries()) {
      task.reject(new Error('Worker pool shutdown'));
    }
    this.activeTasks.clear();
    
    // Rejette toutes les tâches en attente
    this.pendingTasks.forEach(task => {
      task.reject(new Error('Worker pool shutdown'));
    });
    this.pendingTasks.length = 0;
    
    // Termine tous les workers
    await Promise.all(
      this.workers.map(worker => worker.terminate())
    );
    
    this.workers.length = 0;
    this.availableWorkers.length = 0;
  }
}

/**
 * Manager global des pools de workers
 */
export class WorkerPoolManager {
  private pools = new Map<string, WorkerPool>();
  
  /**
   * Crée ou récupère un pool de workers
   */
  getPool(name: string, config?: WorkerPoolConfig): WorkerPool {
    if (!this.pools.has(name)) {
      if (!config) {
        throw new Error(`Pool '${name}' n'existe pas et aucune configuration fournie`);
      }
      this.pools.set(name, new WorkerPool(config));
    }
    return this.pools.get(name)!;
  }

  /**
   * Statistiques globales
   */
  getGlobalStats() {
    const stats = new Map<string, any>();
    for (const [name, pool] of this.pools.entries()) {
      stats.set(name, pool.getStats());
    }
    return Object.fromEntries(stats);
  }

  /**
   * Arrêt de tous les pools
   */
  async shutdownAll() {
    logger.info('🔻 Arrêt de tous les pools de workers...');
    await Promise.all(
      Array.from(this.pools.values()).map(pool => pool.shutdown())
    );
    this.pools.clear();
  }
}

// Instance singleton
export const workerPoolManager = new WorkerPoolManager();

// Nettoyage automatique au shutdown du process
process.on('SIGINT', async () => {
  await workerPoolManager.shutdownAll();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await workerPoolManager.shutdownAll();
  process.exit(0);
});