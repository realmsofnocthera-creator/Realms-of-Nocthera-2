import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { EFEITOS } from '@/assets/efeitosPixelfx';
import { ITENS_COSMETICOS } from '@/rules/lojaPaga';
import { EFEITOS_DE_ENTRADA, efeitoDeEntrada } from '@/rules/efeitosDeEntrada';

describe('efeitos de entrada em combate', () => {
  const ids = ITENS_COSMETICOS.filter((i) => i.tipo === 'efeito').map((i) => i.id);

  it('cada cosmético "efeito de entrada" da loja tem o seu efeito, com folha de quadros que existe', () => {
    expect(ids).toEqual(['efeito-raro-gelo', 'efeito-raro-relampago', 'efeito-epico-sombrio', 'efeito-epico-sagrado', 'efeito-lendario-fogo', 'efeito-lendario-vento']);
    for (const id of ids) {
      const e = EFEITOS_DE_ENTRADA[id];
      expect(e, id).toBeDefined();
      expect(EFEITOS[e.fx], id).toBeDefined();
      expect(existsSync(`public/images/cacada/pixelfx/${e.fx}.webp`), e.fx).toBe(true);
      expect(e.camadas.length).toBeGreaterThan(0);
    }
  });

  it('mais raro dura mais, e nenhum efeito depende de uma classe', () => {
    expect(EFEITOS_DE_ENTRADA['efeito-raro-gelo'].duracaoMs).toBeLessThan(EFEITOS_DE_ENTRADA['efeito-epico-sombrio'].duracaoMs);
    expect(EFEITOS_DE_ENTRADA['efeito-epico-sombrio'].duracaoMs).toBeLessThan(EFEITOS_DE_ENTRADA['efeito-lendario-fogo'].duracaoMs);
    for (const e of Object.values(EFEITOS_DE_ENTRADA)) expect(JSON.stringify(e)).not.toMatch(/barbaro|cavaleiro|feiticeiro|bandido|profeta|samurai/);
  });

  it('id que não existe (inclusive __proto__ e constructor) não vira efeito', () => {
    for (const v of ['nada', '__proto__', 'constructor', undefined, 5, null]) expect(efeitoDeEntrada(v)).toBeUndefined();
    expect(efeitoDeEntrada('efeito-lendario-fogo')?.tema).toBe('Fogo');
  });
});
