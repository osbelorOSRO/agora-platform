import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import type { Options as MulterOptions } from 'multer';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

export type MediaFamily = 'image' | 'audio' | 'video' | 'document';

export type DetectedMedia = {
  family: MediaFamily;
  mimeType: string;
  extension: string;
};

export const MAX_MEDIA_UPLOAD_BYTES = Number(
  process.env.MAX_MEDIA_UPLOAD_BYTES || 50 * 1024 * 1024,
);

const UPLOAD_DIR = './uploads';
const FAMILY_MAX_BYTES: Record<MediaFamily, number> = {
  image: Number(process.env.MAX_IMAGE_UPLOAD_BYTES || 10 * 1024 * 1024),
  audio: Number(process.env.MAX_AUDIO_UPLOAD_BYTES || 25 * 1024 * 1024),
  video: Number(process.env.MAX_VIDEO_UPLOAD_BYTES || 50 * 1024 * 1024),
  document: Number(process.env.MAX_DOCUMENT_UPLOAD_BYTES || 10 * 1024 * 1024),
};
const ALLOWED_CLIENT_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.ogg',
  '.mp3',
  '.wav',
  '.m4a',
  '.mp4',
  '.webm',
  '.pdf',
]);
const BLOCKED_CLIENT_MIME_PREFIXES = ['text/html', 'image/svg+xml'];
const BLOCKED_CLIENT_EXTENSIONS = new Set([
  '.html',
  '.htm',
  '.svg',
  '.js',
  '.mjs',
  '.css',
  '.xml',
  '.xhtml',
]);

export const secureMediaStorage = diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const ext = sanitizeExtension(path.extname(file.originalname));
    cb(null, `${randomUUID()}${ext || '.bin'}`);
  },
});

export const secureMediaMulterOptions: MulterOptions = {
  storage: secureMediaStorage,
  limits: {
    fileSize: MAX_MEDIA_UPLOAD_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const ext = sanitizeExtension(path.extname(file.originalname));
    const mimeType = String(file.mimetype || '').toLowerCase();

    if (
      !ext ||
      BLOCKED_CLIENT_EXTENSIONS.has(ext) ||
      BLOCKED_CLIENT_MIME_PREFIXES.includes(mimeType) ||
      !ALLOWED_CLIENT_EXTENSIONS.has(ext)
    ) {
      cb(null, false);
      return;
    }

    cb(null, true);
  },
};

export async function validateStoredMediaFile(
  file: Express.Multer.File,
  allowedFamilies: MediaFamily[],
): Promise<DetectedMedia> {
  if (!file?.path) {
    throw new BadRequestException('Archivo no recibido');
  }

  const stat = fs.statSync(file.path);
  if (!stat.size) {
    removeFileQuietly(file.path);
    throw new BadRequestException('Archivo vacio');
  }
  if (stat.size > MAX_MEDIA_UPLOAD_BYTES) {
    removeFileQuietly(file.path);
    throw new BadRequestException('Archivo excede el tamano maximo permitido');
  }

  const fd = fs.openSync(file.path, 'r');
  const header = Buffer.alloc(Math.min(4100, stat.size));
  fs.readSync(fd, header, 0, header.length, 0);
  fs.closeSync(fd);

  const detected = detectMedia(header);
  if (!detected || !allowedFamilies.includes(detected.family)) {
    removeFileQuietly(file.path);
    throw new BadRequestException('Tipo de archivo no permitido o no verificable');
  }
  if (stat.size > FAMILY_MAX_BYTES[detected.family]) {
    removeFileQuietly(file.path);
    throw new BadRequestException('Archivo excede el tamano maximo permitido para su tipo');
  }

  return detected;
}

export function ensureCanonicalExtension(
  file: Express.Multer.File,
  detected: DetectedMedia,
): Express.Multer.File {
  const currentExt = path.extname(file.filename).toLowerCase();
  const canonicalExt = `.${detected.extension}`;
  if (currentExt === canonicalExt) return file;

  const nextFilename = `${path.basename(file.filename, currentExt)}${canonicalExt}`;
  const nextPath = path.join(path.dirname(file.path), nextFilename);
  if (fs.existsSync(nextPath)) {
    removeFileQuietly(file.path);
    throw new BadRequestException('No se pudo almacenar el archivo con nombre seguro');
  }
  fs.renameSync(file.path, nextPath);

  file.filename = nextFilename;
  file.path = nextPath;
  return file;
}

export function familiesForTipo(tipo: string): MediaFamily[] {
  const normalized = String(tipo || '').trim().toLowerCase();
  if (['imagen', 'image'].includes(normalized)) return ['image'];
  if (['audio'].includes(normalized)) return ['audio'];
  if (['video'].includes(normalized)) return ['video'];
  if (['documento', 'document', 'file'].includes(normalized)) return ['document'];
  return ['image', 'audio', 'video', 'document'];
}

export function assertTrustedMediaUrl(rawUrl: string): string {
  const normalized = String(rawUrl || '').trim();
  if (!normalized) {
    throw new BadRequestException('mediaUrl requerido');
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new BadRequestException('mediaUrl invalido');
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new BadRequestException('mediaUrl debe usar http o https');
  }

  if (!isSafeUploadsPath(parsed.pathname)) {
    throw new BadRequestException('mediaUrl debe apuntar a /uploads');
  }

  const allowedHosts = trustedMediaHosts();
  if (!allowedHosts.has(parsed.host)) {
    throw new BadRequestException('mediaUrl no pertenece a un host confiable');
  }

  return parsed.toString();
}

export function isSafeUploadsPath(pathname: string): boolean {
  const normalized = String(pathname || '');
  if (!normalized.startsWith('/uploads/')) return false;
  if (normalized.includes('\\') || /%2f|%5c/i.test(normalized)) return false;

  const relative = normalized.slice('/uploads/'.length);
  if (!relative || relative.includes('/')) return false;

  let decoded: string;
  try {
    decoded = decodeURIComponent(relative);
  } catch {
    return false;
  }
  if (decoded !== relative || decoded.includes('..') || decoded.startsWith('.')) {
    return false;
  }

  return /^[a-f0-9-]{36}(?:_(?:wa|ig))?\.(?:jpg|png|gif|webp|ogg|mp3|wav|m4a|mp4|webm|pdf)$/i.test(decoded);
}

export function removeFileQuietly(filePath: string) {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // Best effort cleanup.
  }
}

function trustedMediaHosts(): Set<string> {
  const hosts = new Set<string>();
  const rawValues = [
    process.env.MEDIA_BASE_URL,
    process.env.API_PUBLIC_URL,
    process.env.TRUSTED_MEDIA_URL_HOSTS,
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(','))
    .map((value) => value.trim())
    .filter(Boolean);

  for (const value of rawValues) {
    try {
      hosts.add(new URL(value).host);
    } catch {
      hosts.add(value.replace(/^https?:\/\//, '').replace(/\/.*$/, ''));
    }
  }

  return hosts;
}

function detectMedia(header: Buffer): DetectedMedia | null {
  if (header.length >= 4 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return { family: 'image', mimeType: 'image/jpeg', extension: 'jpg' };
  }
  if (matchesAscii(header, 1, 'PNG')) {
    return { family: 'image', mimeType: 'image/png', extension: 'png' };
  }
  if (matchesAscii(header, 0, 'GIF87a') || matchesAscii(header, 0, 'GIF89a')) {
    return { family: 'image', mimeType: 'image/gif', extension: 'gif' };
  }
  if (matchesAscii(header, 0, 'RIFF') && matchesAscii(header, 8, 'WEBP')) {
    return { family: 'image', mimeType: 'image/webp', extension: 'webp' };
  }
  if (matchesAscii(header, 0, '%PDF-')) {
    return { family: 'document', mimeType: 'application/pdf', extension: 'pdf' };
  }
  if (matchesAscii(header, 0, 'OggS')) {
    return { family: 'audio', mimeType: 'audio/ogg', extension: 'ogg' };
  }
  if (matchesAscii(header, 0, 'ID3') || isMp3Frame(header)) {
    return { family: 'audio', mimeType: 'audio/mpeg', extension: 'mp3' };
  }
  if (matchesAscii(header, 0, 'RIFF') && matchesAscii(header, 8, 'WAVE')) {
    return { family: 'audio', mimeType: 'audio/wav', extension: 'wav' };
  }
  const mp4Like = detectMp4Like(header);
  if (mp4Like) {
    return mp4Like;
  }
  if (header.length >= 4 && header[0] === 0x1a && header[1] === 0x45 && header[2] === 0xdf && header[3] === 0xa3) {
    return { family: 'video', mimeType: 'video/webm', extension: 'webm' };
  }

  return null;
}

function sanitizeExtension(ext: string): string {
  const normalized = String(ext || '').toLowerCase();
  if (/^\.[a-z0-9]{1,8}$/.test(normalized)) return normalized;
  return '';
}

function matchesAscii(buffer: Buffer, offset: number, value: string): boolean {
  return buffer.length >= offset + value.length && buffer.subarray(offset, offset + value.length).toString('ascii') === value;
}

function isMp3Frame(buffer: Buffer): boolean {
  return buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0;
}

function detectMp4Like(buffer: Buffer): DetectedMedia | null {
  if (buffer.length < 12 || !matchesAscii(buffer, 4, 'ftyp')) return null;
  const brand = buffer.subarray(8, 12).toString('ascii');
  if (brand === 'M4A ') {
    return { family: 'audio', mimeType: 'audio/mp4', extension: 'm4a' };
  }
  if (['isom', 'iso2', 'mp41', 'mp42', 'avc1', 'M4V ', '3gp4', '3gp5', 'qt  '].includes(brand)) {
    return { family: 'video', mimeType: 'video/mp4', extension: 'mp4' };
  }
  return null;
}
