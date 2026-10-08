import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { DESENVOLVIMENTO_ASSETS } from '@/rules/desenvolvimentoAssets';

describe('DESENVOLVIMENTO_ASSETS', () => {
  it('todos os caminhos começam com /images/desenvolvimento/', () => {
    for (const [key, assetPath] of Object.entries(DESENVOLVIMENTO_ASSETS)) {
      expect(
        assetPath.startsWith('/images/desenvolvimento/'),
        `O caminho do asset "${key}" (${assetPath}) deve começar com "/images/desenvolvimento/"`
      ).toBe(true);
    }
  });

  it('nenhum caminho começa com http ou link externo', () => {
    for (const [key, assetPath] of Object.entries(DESENVOLVIMENTO_ASSETS)) {
      expect(
        assetPath.startsWith('http'),
        `O asset "${key}" não pode começar com "http"`
      ).toBe(false);
    }
  });

  it('todos os arquivos existem em public/images/desenvolvimento/', () => {
    const publicDir = path.resolve(process.cwd(), 'public');
    for (const [key, assetPath] of Object.entries(DESENVOLVIMENTO_ASSETS)) {
      const fullPath = path.join(publicDir, assetPath);
      expect(
        fs.existsSync(fullPath),
        `Arquivo físico do asset "${key}" (${fullPath}) não foi encontrado`
      ).toBe(true);
    }
  });
});
