import { describe, expect, it } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { MONSTROS_CACADA_DADOS } from '@/rules/cacada';
import { SPRITE_MONSTRO } from '../cacadaArte';

describe('arte das criaturas', () => {
  it('toda criatura da Caçada tem a sua arte, e o arquivo existe e é leve', () => {
    for (const m of MONSTROS_CACADA_DADOS) {
      const arte = SPRITE_MONSTRO[m.id];
      expect(arte, m.id).toBeDefined();
      const arquivo = join(process.cwd(), 'public', arte.src);
      expect(existsSync(arquivo), arquivo).toBe(true);
      expect(statSync(arquivo).size, m.id).toBeLessThanOrEqual(350 * 1024);
    }
  });
  it('não sobra arte de criatura que não existe no jogo', () => {
    const ids = new Set(MONSTROS_CACADA_DADOS.map((m) => m.id));
    for (const id of Object.keys(SPRITE_MONSTRO)) expect(ids.has(id), id).toBe(true);
  });
});
