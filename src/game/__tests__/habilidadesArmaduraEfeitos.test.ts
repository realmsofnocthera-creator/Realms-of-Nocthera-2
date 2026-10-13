import { describe, it, expect } from 'vitest';
import { HABILIDADES_ARMADURA_APLICADAS, efeitoEstaticoDaHabilidade, somarEfeitosEstaticos } from '@/game/habilidadesArmaduraEfeitos';
import { HABILIDADES_ARMADURA_MAP } from '@/rules/habilidadesArmadura';

/** Habilidades de armadura que a ficha de combate já aplica (parte 1). */
describe('Efeitos das habilidades de armadura (parte 1)', () => {
  it('só entram habilidades que o motor já suporta, e cada nível tem efeito', () => {
    for (const id of HABILIDADES_ARMADURA_APLICADAS) {
      const def = HABILIDADES_ARMADURA_MAP[id];
      expect(def, id).toBeDefined();
      expect(def.situacao, id).toBe('motorAtual');
      for (let n = 1; n <= def.nivelMaximo; n++) expect(efeitoEstaticoDaHabilidade(id, n), `${id} nv ${n}`).toBeDefined();
    }
    expect(efeitoEstaticoDaHabilidade('olho-critico', 3)).toBeUndefined(); // dano e crítico: próximo PR
    expect(efeitoEstaticoDaHabilidade('reforco-de-vida', 0)).toBeUndefined();
  });

  it('Reforço de Vida: +3%, +6% e +10% de HP', () => {
    expect([1, 2, 3].map((n) => efeitoEstaticoDaHabilidade('reforco-de-vida', n)?.hpPercentual)).toEqual([3, 6, 10]);
  });

  it('Reforço de Defesa: mitigação fixa e %, e a partir do nível 4 resistência a todos os elementos', () => {
    expect(efeitoEstaticoDaHabilidade('reforco-de-defesa', 1)).toMatchObject({ mitigacaoFixa: 2, mitigacaoPercentual: 0 });
    expect(efeitoEstaticoDaHabilidade('reforco-de-defesa', 3)).toMatchObject({ mitigacaoFixa: 4, mitigacaoPercentual: 5 });
    const nv7 = efeitoEstaticoDaHabilidade('reforco-de-defesa', 7)!;
    expect(nv7).toMatchObject({ mitigacaoFixa: 14, mitigacaoPercentual: 10 });
    expect(Object.keys(nv7.resistenciaElemental!)).toHaveLength(7);
    expect(nv7.resistenciaElemental!.fogo).toBe(2);
    expect(efeitoEstaticoDaHabilidade('reforco-de-defesa', 3)!.resistenciaElemental).toBeUndefined();
  });

  it('resistências elementais: −3%, −6%, −10% e, no nível 3, mitigação +4 (Água é o elemento Vento; Dragão, o Sombrio)', () => {
    expect(efeitoEstaticoDaHabilidade('resistencia-a-fogo', 2)).toEqual({ resistenciaElemental: { fogo: 6 } });
    expect(efeitoEstaticoDaHabilidade('resistencia-a-fogo', 3)).toEqual({ resistenciaElemental: { fogo: 10 }, mitigacaoFixa: 4 });
    expect(efeitoEstaticoDaHabilidade('resistencia-a-agua', 1)?.resistenciaElemental).toEqual({ vento: 3 });
    expect(efeitoEstaticoDaHabilidade('resistencia-a-raio', 1)?.resistenciaElemental).toEqual({ relampago: 3 });
    expect(efeitoEstaticoDaHabilidade('resistencia-a-dragao', 1)?.resistenciaElemental).toEqual({ sombrio: 3 });
    expect(efeitoEstaticoDaHabilidade('resistencia-a-gelo', 1)?.resistenciaElemental).toEqual({ gelo: 3 });
  });

  it('Antivento: 10, 20, 35, 50 e, no nível 5, anula o dano de vento; Tremor e Antifrio', () => {
    expect([1, 2, 3, 4, 5].map((n) => efeitoEstaticoDaHabilidade('antivento', n)?.resistenciaElemental?.vento)).toEqual([10, 20, 35, 50, 90]);
    expect([1, 2, 3].map((n) => efeitoEstaticoDaHabilidade('resistencia-a-tremor', n)?.resistenciaElemental?.terra)).toEqual([0, 20, 40]);
    expect(efeitoEstaticoDaHabilidade('antifrio', 1)?.resistenciaElemental?.gelo).toBe(50);
  });

  it('Agilidade e dano fixo da arma', () => {
    expect([1, 2, 3].map((n) => efeitoEstaticoDaHabilidade('extensor-de-esquiva', n)?.agilidadePercentual)).toEqual([3, 6, 10]);
    expect([1, 2, 3].map((n) => efeitoEstaticoDaHabilidade('mobilidade-aquatica-polar', n)?.agilidadePercentual)).toEqual([0, 5, 10]);
    expect([1, 2, 3, 4, 5].map((n) => efeitoEstaticoDaHabilidade('artesanato', n)?.danoFixoArmaPercentual)).toEqual([3, 6, 9, 12, 15]);
    expect(efeitoEstaticoDaHabilidade('reforco-nao-elemental', 1)?.danoFixoArmaSemElementoPercentual).toBe(10);
  });

  it('os efeitos somam entre habilidades (regra 1.2.2); resistências ao mesmo elemento também', () => {
    const t = somarEfeitosEstaticos({ 'reforco-de-vida': 2, 'resistencia-a-agua': 3, antivento: 2, 'reforco-de-defesa': 4, artesanato: 1 });
    expect(t).toMatchObject({ hpPercentual: 6, mitigacaoFixa: 4 + 8, mitigacaoPercentual: 5, danoFixoArmaPercentual: 3 });
    expect(t.resistenciaElemental.vento).toBe(10 + 20 + 1);
    expect(t.resistenciaElemental.fogo).toBe(1);
    expect(somarEfeitosEstaticos({ 'olho-critico': 7 })).toMatchObject({ hpPercentual: 0, mitigacaoFixa: 0, resistenciaElemental: {} });
  });
});
