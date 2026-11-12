import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ICONES_HABILIDADE_SUBCLASSE, iconeDaHabilidadeSubclasse, SUBCLASSE_ICONE_BASE } from '@/rules/subclasseAssets';
import { TEXTOS_SUBCLASSE } from '@/rules/subclasseTextos';
import { SUBCLASSES } from '@/rules/subclasses';

const publico = (caminho: string) => join(process.cwd(), 'public', caminho);

describe('Ícones das habilidades das subclasses (arte do Yuri)', () => {
  const todas = SUBCLASSES.flatMap((s) => {
    const t = TEXTOS_SUBCLASSE[s.id];
    return [t.passiva, t.basico, t.especial, t.ultimate].map((h) => ({ subclasse: s.id, id: h.id }));
  });

  it('as 12 subclasses têm as 4 habilidades, 48 ao todo, cada uma com o seu ícone', () => {
    expect(todas).toHaveLength(48);
    for (const h of todas) {
      expect(ICONES_HABILIDADE_SUBCLASSE[h.id], h.id).toBeTruthy();
      expect(iconeDaHabilidadeSubclasse(h.id)).not.toBe(SUBCLASSE_ICONE_BASE);
    }
  });

  it('nenhum ícone se repete e todos os arquivos existem', () => {
    const caminhos = todas.map((h) => ICONES_HABILIDADE_SUBCLASSE[h.id]);
    expect(new Set(caminhos).size).toBe(48);
    for (const c of caminhos) expect(existsSync(publico(c)), c).toBe(true);
  });

  it('os arquivos são webp quadrados de 256 x 256 e leves (menos de 350 KB)', () => {
    for (const h of todas) {
      const arquivo = publico(ICONES_HABILIDADE_SUBCLASSE[h.id]);
      expect(statSync(arquivo).size).toBeLessThan(350 * 1024);
      const b = readFileSync(arquivo);
      expect(b.subarray(0, 4).toString()).toBe('RIFF');
      expect(b.subarray(8, 12).toString()).toBe('WEBP');
      // o webp com transparência (VP8X) guarda largura e altura menos 1, em 3 bytes cada
      expect(b.subarray(12, 16).toString()).toBe('VP8X');
      expect(b.readUIntLE(24, 3) + 1).toBe(256);
      expect(b.readUIntLE(27, 3) + 1).toBe(256);
    }
  });
});
