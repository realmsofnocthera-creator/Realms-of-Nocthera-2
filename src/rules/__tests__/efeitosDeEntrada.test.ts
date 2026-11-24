import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { ITENS_COSMETICOS } from '@/rules/lojaPaga';
import { EFEITOS_DE_ENTRADA, efeitoDeEntrada } from '@/rules/efeitosDeEntrada';
import { arteDoEfeito } from '@/assets/cosmeticosArte';

describe('efeitos de entrada em combate', () => {
  const ids = ITENS_COSMETICOS.filter((i) => i.tipo === 'efeito').map((i) => i.id);

  it('cada cosmético "efeito de entrada" da loja tem a arte do Yuri (as duas camadas existem)', () => {
    expect(ids).toEqual(['efeito-raro-gelo', 'efeito-raro-relampago', 'efeito-epico-sombrio', 'efeito-epico-sagrado', 'efeito-lendario-fogo', 'efeito-lendario-vento']);
    for (const id of ids) {
      const e = EFEITOS_DE_ENTRADA[id];
      const a = arteDoEfeito(id)!;
      expect(e, id).toBeDefined();
      expect(a, id).toBeDefined();
      expect(existsSync(`public${a.atras.src}`), a.atras.src).toBe(true);
      expect(existsSync(`public${a.frente.src}`), a.frente.src).toBe(true);
      expect(e.duracaoMs).toBe(1250);
      // o herói só aparece depois dos quadros em que a arte esconde o personagem
      expect(e.revelacaoMs).toBeGreaterThan(0);
      expect(e.revelacaoMs).toBeLessThan(e.duracaoMs);
    }
  });

  it('id que não existe (inclusive __proto__ e constructor) não vira efeito', () => {
    for (const v of ['nada', '__proto__', 'constructor', undefined, 5, null]) {
      expect(efeitoDeEntrada(v)).toBeUndefined();
      expect(arteDoEfeito(v)).toBeUndefined();
    }
    expect(efeitoDeEntrada('efeito-lendario-fogo')?.tema).toBe('Fogo');
  });
});
