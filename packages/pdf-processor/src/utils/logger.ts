import pino from 'pino';

const isDevelopment = process.env.EK_NODE_ENV === 'development' || process.env.EK_NODE_ENV !== 'production';

const pinoConfig: pino.LoggerOptions = {
  level: process.env.EK_LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  ...(isDevelopment
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss.l',
            ignore: 'pid,hostname',
            singleLine: true,
          },
        },
      }
    : {
        formatters: {
          level: (label) => {
            return { level: label.toUpperCase() };
          },
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }),
};

export const logger = pino(pinoConfig);

export function createModuleLogger(module: string) {
  return logger.child({ module });
}