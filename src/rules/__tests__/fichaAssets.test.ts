import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { FICHA_ASSETS } from '../fichaAssets';

describe('FICHA_ASSETS', () => {
  it('todos os caminhos começam com /images/ficha/', () => {
    for (const [key, assetPath] of Object.entries(FICHA_ASSETS)) {
      expect(
        assetPath.startsWith('/images/ficha/'),
        `O caminho do asset "${key}" (${assetPath}) deve começar com "/images/ficha/"`
      ).toBe(true);
    }
  });

  it('nenhum caminho começa com http', () => {
    for (const [key, assetPath] of Object.entries(FICHA_ASSETS)) {
      expect(
        assetPath.startsWith('http'),
        `O asset "${key}" não pode começar com "http"`
      ).toBe(false);
    }
  });

  it('todos os arquivos existem em public/images/ficha/', () => {
    const publicDir = path.resolve(process.cwd(), 'public');
    for (const [key, assetPath] of Object.entries(FICHA_ASSETS)) {
      const fullPath = path.join(publicDir, assetPath);
      expect(
        fs.existsSync(fullPath),
        `Arquivo para asset "${key}" deve existir em ${fullPath}`
      ).toBe(true);
    }
  });
});
