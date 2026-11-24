import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { ARTE_DAS_AURAS, ARTE_DAS_MOLDURAS, ARTE_DAS_SKINS, ARTE_DOS_EFEITOS, arteDaAura, arteDaMoldura, arteDaSkin } from '@/assets/cosmeticosArte';
import { ITENS_COSMETICOS } from '@/rules/lojaPaga';

const idsDe = (tipo: string) => ITENS_COSMETICOS.filter((i) => i.tipo === tipo).map((i) => i.id);

/** A largura e a altura de um webp (VP8L ou VP8X) lidas do cabeçalho, para conferir que a tira tem mesmo `quadros` quadros. */
function tamanhoDoWebp(arquivo: string): [number, number] {
  const b = readFileSync(`public${arquivo}`);
  const tipo = b.toString('ascii', 12, 16);
  if (tipo === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (tipo === 'VP8L') { const v = b.readUInt32LE(21); return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1]; }
  throw new Error(`webp inesperado: ${tipo}`);
}

describe('artes dos cosméticos pagos (Yuri)', () => {
  it('toda moldura, aura, efeito e skin da loja que tem arte aponta para uma tira que existe e mede quadros x lado', () => {
    for (const id of idsDe('aura')) {
      const a = arteDaAura(id)!;
      expect(a, id).toBeDefined();
      for (const f of [a.atras, a.frente]) expect(tamanhoDoWebp(f.src), f.src).toEqual([f.quadros * f.lado, f.lado]);
    }
    for (const id of idsDe('efeito')) {
      const a = ARTE_DOS_EFEITOS[id];
      for (const f of [a.atras, a.frente]) expect(tamanhoDoWebp(f.src), f.src).toEqual([f.quadros * f.lado, f.lado]);
    }
    for (const id of idsDe('moldura')) {
      const m = arteDaMoldura(id)!;
      expect(m, id).toBeDefined();
      expect(tamanhoDoWebp(m.src)).toEqual([m.quadros * m.lado, m.lado]);
      expect(m.buraco).toBe(52);
    }
    for (const id of idsDe('skin')) {
      const s = arteDaSkin(id)!;
      expect(s, id).toBeDefined();
      expect(s.classe).toBe('samurai');
      for (const l of [s.frente, s.costas]) {
        for (const f of [l.parado, l.ataque]) {
          expect(existsSync(`public${f.src}`), f.src).toBe(true);
          expect(tamanhoDoWebp(f.src), f.src).toEqual([f.quadros * l.largura, l.altura]);
          expect(f.ms).toHaveLength(f.quadros);
        }
        // o golpe acerta no mesmo instante do herói da classe
        expect(l.impacto).toBe(520);
      }
    }
  });
  it('cada arte entregue tem um item na loja (nenhuma sobra sem produto)', () => {
    expect(Object.keys(ARTE_DAS_AURAS).sort()).toEqual(idsDe('aura').sort());
    expect(Object.keys(ARTE_DOS_EFEITOS).sort()).toEqual(idsDe('efeito').sort());
    expect(Object.keys(ARTE_DAS_MOLDURAS).sort()).toEqual(idsDe('moldura').sort());
    expect(Object.keys(ARTE_DAS_SKINS).sort()).toEqual(idsDe('skin').sort());
  });
  it('id inventado não vira arte (nem __proto__ nem constructor)', () => {
    for (const v of ['nada', '__proto__', 'constructor', undefined, 3]) {
      expect(arteDaAura(v)).toBeUndefined();
      expect(arteDaMoldura(v)).toBeUndefined();
      expect(arteDaSkin(v)).toBeUndefined();
    }
  });
});
