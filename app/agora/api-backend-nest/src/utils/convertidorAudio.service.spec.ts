import { execFile } from 'child_process';
import fs from 'fs';

jest.mock('child_process', () => ({
  execFile: jest.fn(),
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

const mockExecFile = execFile as unknown as jest.Mock;
const mockExistsSync = fs.existsSync as unknown as jest.Mock;
const mockUnlinkSync = fs.unlinkSync as unknown as jest.Mock;

describe('convertirWebmAOgg', () => {
  let convertirWebmAOgg: typeof import('./convertidorAudio.service').convertirWebmAOgg;

  beforeAll(() => {
    // Load module once after mocks are set up
    convertirWebmAOgg = jest.requireActual(
      './convertidorAudio.service',
    ).convertirWebmAOgg;
  });

  beforeEach(() => {
    mockExecFile.mockReset();
    mockExecFile.mockImplementation(
      (_cmd: string, _args: string[], cb: (...args: any[]) => void) => {
        cb(null, { stdout: '', stderr: '' });
      },
    );
    mockExistsSync.mockReset();
    mockUnlinkSync.mockReset();
  });

  it('convierte webm a ogg exitosamente y elimina el original', async () => {
    mockExistsSync.mockReturnValue(true);

    const result = await convertirWebmAOgg('/tmp/audio.webm');

    expect(mockExecFile).toHaveBeenCalledWith(
      'ffmpeg',
      [
        '-i',
        '/tmp/audio.webm',
        '-c:a',
        'libopus',
        '-b:a',
        '32k',
        '-ar',
        '48000',
        '-ac',
        '1',
        '-vn',
        '/tmp/audio_wa.ogg',
        '-y',
      ],
      expect.any(Function),
    );
    expect(mockUnlinkSync).toHaveBeenCalledWith('/tmp/audio.webm');
    expect(result).toBe('/tmp/audio_wa.ogg');
  });

  it('retorna null si ffmpeg falla', async () => {
    mockExecFile.mockReset();
    mockExecFile.mockImplementation(
      (_cmd: string, _args: string[], cb: (...args: any[]) => void) => {
        cb(new Error('ffmpeg not found'));
      },
    );
    mockExistsSync.mockReturnValue(false);

    const result = await convertirWebmAOgg('/tmp/audio.webm');

    expect(result).toBeNull();
  });

  it('retorna null si no se generó el archivo ogg', async () => {
    mockExistsSync.mockReturnValue(false);

    const result = await convertirWebmAOgg('/tmp/audio.webm');

    expect(result).toBeNull();
  });
});
