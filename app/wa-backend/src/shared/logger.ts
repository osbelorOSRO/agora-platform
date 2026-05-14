// src/shared/logger.ts
import { env } from '../config/env.js';

type Level = 'debug' | 'info' | 'warn' | 'error';

const order: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function shouldLog(level: Level): boolean {
  const current = (env.logLevel as Level) || 'info';
  return order[level] >= order[current];
}

function fmt(level: Level, msg: string, meta?: unknown) {
  const ts = new Date().toISOString();
  if (meta === undefined) return `[${ts}] ${level.toUpperCase()} ${msg}`;
  return `[${ts}] ${level.toUpperCase()} ${msg} ${safeJson(meta)}`;
}

function safeJson(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return '"[unserializable]"';
  }
}

export const logger = {
  debug: (msg: string, meta?: unknown) => shouldLog('debug') && console.log(fmt('debug', msg, meta)),
  info: (msg: string, meta?: unknown) => shouldLog('info') && console.log(fmt('info', msg, meta)),
  warn: (msg: string, meta?: unknown) => shouldLog('warn') && console.warn(fmt('warn', msg, meta)),
  error: (msg: string, meta?: unknown) => shouldLog('error') && console.error(fmt('error', msg, meta)),
};

export const log = logger;
