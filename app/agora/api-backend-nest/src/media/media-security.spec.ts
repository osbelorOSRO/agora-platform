import { BadRequestException } from '@nestjs/common';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  familiesForTipo,
  isSafeUploadsPath,
  assertTrustedMediaUrl,
  validateStoredMediaFile,
  ensureCanonicalExtension,
  removeFileQuietly,
} from './media-security';

describe('familiesForTipo', () => {
  it('imagen → [image]', () =>
    expect(familiesForTipo('imagen')).toEqual(['image']));
  it('image → [image]', () =>
    expect(familiesForTipo('image')).toEqual(['image']));
  it('audio → [audio]', () =>
    expect(familiesForTipo('audio')).toEqual(['audio']));
  it('video → [video]', () =>
    expect(familiesForTipo('video')).toEqual(['video']));
  it('documento → [document]', () =>
    expect(familiesForTipo('documento')).toEqual(['document']));
  it('file → [document]', () =>
    expect(familiesForTipo('file')).toEqual(['document']));
  it('desconocido → todas las families', () => {
    expect(familiesForTipo('otro')).toEqual([
      'image',
      'audio',
      'video',
      'document',
    ]);
  });
  it('vacío → todas las families', () => {
    expect(familiesForTipo('')).toEqual([
      'image',
      'audio',
      'video',
      'document',
    ]);
  });
});

describe('isSafeUploadsPath', () => {
  it('acepta ruta /uploads/<uuid>.jpg', () => {
    expect(
      isSafeUploadsPath('/uploads/123e4567-e89b-12d3-a456-426614174000.jpg'),
    ).toBe(true);
  });

  it('acepta ruta /agora-media/<uuid>.mp3', () => {
    expect(
      isSafeUploadsPath(
        '/agora-media/123e4567-e89b-12d3-a456-426614174000.mp3',
      ),
    ).toBe(true);
  });

  it('rechaza ruta con path traversal ..', () => {
    expect(isSafeUploadsPath('/uploads/../etc/passwd')).toBe(false);
  });

  it('rechaza ruta con backslash', () => {
    expect(isSafeUploadsPath('/uploads/file\\name.jpg')).toBe(false);
  });

  it('rechaza ruta con subdirectorio', () => {
    expect(isSafeUploadsPath('/uploads/subdir/file.jpg')).toBe(false);
  });

  it('rechaza ruta con prefijo desconocido', () => {
    expect(isSafeUploadsPath('/files/image.jpg')).toBe(false);
  });

  it('rechaza extensión no permitida', () => {
    expect(
      isSafeUploadsPath('/uploads/123e4567-e89b-12d3-a456-426614174000.exe'),
    ).toBe(false);
  });

  it('acepta variante wa', () => {
    expect(
      isSafeUploadsPath('/uploads/123e4567-e89b-12d3-a456-426614174000_wa.jpg'),
    ).toBe(true);
  });
});

describe('assertTrustedMediaUrl', () => {
  beforeEach(() => {
    process.env.MEDIA_BASE_URL = 'http://localhost:9000';
  });

  it('lanza BadRequestException con URL vacía', () => {
    expect(() => assertTrustedMediaUrl('')).toThrow(BadRequestException);
  });

  it('lanza BadRequestException con URL malformada', () => {
    expect(() => assertTrustedMediaUrl('no-es-una-url')).toThrow(
      BadRequestException,
    );
  });

  it('lanza BadRequestException con protocolo ftp', () => {
    expect(() =>
      assertTrustedMediaUrl('ftp://host.com/uploads/file.jpg'),
    ).toThrow(BadRequestException);
  });

  it('lanza BadRequestException con ruta insegura', () => {
    expect(() =>
      assertTrustedMediaUrl('http://localhost:9000/etc/passwd'),
    ).toThrow(BadRequestException);
  });

  it('acepta URL con host de MEDIA_BASE_URL y ruta segura', () => {
    const url =
      'http://localhost:9000/uploads/123e4567-e89b-12d3-a456-426614174000.jpg';
    expect(() => assertTrustedMediaUrl(url)).not.toThrow();
  });

  it('lanza BadRequestException con host no confiable', () => {
    expect(() =>
      assertTrustedMediaUrl(
        'http://evil.com/uploads/123e4567-e89b-12d3-a456-426614174000.jpg',
      ),
    ).toThrow(BadRequestException);
  });
});

describe('removeFileQuietly', () => {
  it('elimina un archivo existente sin lanzar', () => {
    const tmp = path.join(os.tmpdir(), `test-${Date.now()}.txt`);
    fs.writeFileSync(tmp, 'hello');
    expect(() => removeFileQuietly(tmp)).not.toThrow();
    expect(fs.existsSync(tmp)).toBe(false);
  });

  it('no lanza si el archivo no existe', () => {
    expect(() => removeFileQuietly('/tmp/no-existe-abc.bin')).not.toThrow();
  });

  it('no lanza si la ruta es vacía', () => {
    expect(() => removeFileQuietly('')).not.toThrow();
  });
});

describe('validateStoredMediaFile', () => {
  const PNG_HEADER = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);
  const JPG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  const PDF_HEADER = Buffer.from('%PDF-1.4\n');

  function makeTmpFile(content: Buffer): Express.Multer.File {
    const tmpPath = path.join(os.tmpdir(), `test-media-${Date.now()}.bin`);
    fs.writeFileSync(tmpPath, content);
    return {
      path: tmpPath,
      filename: path.basename(tmpPath),
      fieldname: 'file',
      originalname: 'test.bin',
      encoding: '7bit',
      mimetype: 'application/octet-stream',
      size: content.length,
      destination: os.tmpdir(),
      buffer: content,
      stream: null as any,
    };
  }

  it('lanza BadRequest si no hay path', async () => {
    await expect(
      validateStoredMediaFile({ path: '' } as any, ['image']),
    ).rejects.toThrow(BadRequestException);
  });

  it('detecta PNG correctamente', async () => {
    const content = Buffer.concat([PNG_HEADER, Buffer.alloc(100)]);
    const file = makeTmpFile(content);
    const result = await validateStoredMediaFile(file, ['image']);
    expect(result.extension).toBe('png');
    expect(result.family).toBe('image');
  });

  it('detecta JPEG correctamente', async () => {
    const content = Buffer.concat([JPG_HEADER, Buffer.alloc(100)]);
    const file = makeTmpFile(content);
    const result = await validateStoredMediaFile(file, ['image']);
    expect(result.extension).toBe('jpg');
  });

  it('lanza BadRequest si el tipo no está en familias permitidas', async () => {
    const content = Buffer.concat([PDF_HEADER, Buffer.alloc(100)]);
    const file = makeTmpFile(content);
    await expect(validateStoredMediaFile(file, ['image'])).rejects.toThrow(
      BadRequestException,
    );
  });

  it('lanza BadRequest si el header no coincide con ningún formato conocido', async () => {
    const file = makeTmpFile(Buffer.from('este no es un archivo valido'));
    await expect(
      validateStoredMediaFile(file, ['image', 'audio', 'video', 'document']),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('ensureCanonicalExtension', () => {
  it('no renombra si la extensión ya es correcta', () => {
    const tmp = path.join(os.tmpdir(), `test-${Date.now()}.png`);
    fs.writeFileSync(tmp, 'x');
    const file: Express.Multer.File = {
      path: tmp,
      filename: path.basename(tmp),
    } as any;
    const result = ensureCanonicalExtension(file, {
      family: 'image',
      mimeType: 'image/png',
      extension: 'png',
    });
    expect(result.filename).toBe(file.filename);
    fs.existsSync(tmp) && fs.unlinkSync(tmp);
  });

  it('renombra el archivo si la extensión no coincide', () => {
    const baseName = `test-${Date.now()}`;
    const tmp = path.join(os.tmpdir(), `${baseName}.bin`);
    fs.writeFileSync(tmp, 'x');
    const file: Express.Multer.File = {
      path: tmp,
      filename: `${baseName}.bin`,
      destination: os.tmpdir(),
    } as any;
    const result = ensureCanonicalExtension(file, {
      family: 'image',
      mimeType: 'image/jpeg',
      extension: 'jpg',
    });
    expect(result.filename.endsWith('.jpg')).toBe(true);
    fs.existsSync(result.path) && fs.unlinkSync(result.path);
  });
});
