import { describe, it, expect } from 'vitest';
import {
  CATEGORIAS_ARMA,
  CUSTOMIZACAO,
  RARIDADES_ARMA,
  RaridadeArma,
  atributoDoDanoFixo,
  atributosSorteaveis,
  danoFixoDaArma,
  percentualCustoReforja,
  podeCustomizar,
  sortearAtributoDaArma,
  sortearPontosDaArma,
} from '@/rules/armas';
import { ARMAS_BASE, ARMAS_BASE_MAP } from '@/rules/armasCatalogo';
import { MATERIAIS, MATERIAIS_MAP } from '@/rules/materiais';
import { MATERIAIS_MUNDO, MATERIAIS_MUNDO_MAP } from '@/rules/materiaisArmas';
import { DADOS_CACADA_MAP, MONSTROS_CACADA_DADOS } from '@/rules/cacada';
import { RaridadeMaterial } from '@/rules/raridades';

/** Armas — catálogo e regras decididos pelo Yuri em 12/10/2026. */

const ORDEM_MATERIAL: RaridadeMaterial[] = ['comum', 'raro', 'muitoRaro', 'epico', 'lendario'];
const ORDEM_ARMA: RaridadeArma[] = [...ORDEM_MATERIAL, 'mitico'];
const raridadeMaterial = (id: string): RaridadeMaterial | undefined => MATERIAIS_MAP[id]?.raridade;

describe('Categorias e raridades', () => {
  it('6 categorias: 4 físicas e 2 mágicas, cada uma com bônus e penalidade', () => {
    expect(CATEGORIAS_ARMA.map((c) => c.id)).toEqual(['espadaGrande', 'katana', 'lanca', 'espadaEscudo', 'grimorio', 'cajado']);
    expect(CATEGORIAS_ARMA.filter((c) => c.tipoDano === 'fisico').every((c) => c.subtipoFisico)).toBe(true);
    expect(CATEGORIAS_ARMA.filter((c) => c.tipoDano === 'magico').map((c) => c.id)).toEqual(['grimorio', 'cajado']);
    for (const c of CATEGORIAS_ARMA) {
      expect(c.bonus.percentual, c.id).toBeGreaterThan(0);
      expect(c.penalidade.percentual, c.id).toBeLessThan(0);
    }
  });

  it('6 raridades com faixas de pontos seguidas e sem buraco (1 a 150)', () => {
    expect(RARIDADES_ARMA.map((r) => r.id)).toEqual(ORDEM_ARMA);
    expect(RARIDADES_ARMA[0].pontosMin).toBe(1);
    expect(RARIDADES_ARMA[RARIDADES_ARMA.length - 1].pontosMax).toBe(150);
    for (let i = 1; i < RARIDADES_ARMA.length; i++) {
      expect(RARIDADES_ARMA[i].pontosMin).toBe(RARIDADES_ARMA[i - 1].pontosMax + 1);
    }
  });
});

describe('Dano fixo', () => {
  it('parte da base da estrela e sobe 1/3 até a estrela seguinte por arma', () => {
    expect(danoFixoDaArma(1, 1)).toBe(17);
    expect(danoFixoDaArma(1, 4)).toBe(26);
    expect(danoFixoDaArma(5, 4)).toBe(111);
    expect(danoFixoDaArma(8, 4)).toBe(141);
  });

  it('na 9★ sobe 5% por arma; sem elemento nem status ganha +20%', () => {
    expect(danoFixoDaArma(9, 1)).toBe(141);
    expect(danoFixoDaArma(9, 2)).toBe(148);
    expect(danoFixoDaArma(1, 1, true)).toBe(20);
    expect(danoFixoDaArma(1, 2, true)).toBe(24);
  });

  it('recusa estrela e posição inválidas', () => {
    expect(() => danoFixoDaArma(10, 1)).toThrow();
    expect(() => danoFixoDaArma(1, 0)).toThrow();
  });
});

describe('Atributo sorteado', () => {
  it('sai entre os 6 atributos que não são o do dano fixo', () => {
    expect(atributoDoDanoFixo('espadaGrande')).toBe('forca');
    expect(atributoDoDanoFixo('cajado')).toBe('inteligencia');
    for (const c of CATEGORIAS_ARMA) {
      const opcoes = atributosSorteaveis(c.id);
      expect(opcoes).toHaveLength(6);
      expect(opcoes).not.toContain(atributoDoDanoFixo(c.id));
    }
  });

  it('o sorteio respeita os extremos da faixa da raridade', () => {
    for (const r of RARIDADES_ARMA) {
      expect(sortearPontosDaArma(r.id, () => 0)).toBe(r.pontosMin);
      expect(sortearPontosDaArma(r.id, () => 0.999999)).toBe(r.pontosMax);
    }
    expect(sortearAtributoDaArma('katana', () => 0)).toBe('vigor');
    expect(sortearAtributoDaArma('katana', () => 0.999999)).toBe('agilidade');
  });
});

describe('Reforjar e Customização', () => {
  it('reforjar custa 50% e sobe 25% a cada reforja, até 200%', () => {
    expect(percentualCustoReforja(0)).toBe(50);
    expect(percentualCustoReforja(1)).toBe(75);
    expect(percentualCustoReforja(6)).toBe(200);
    expect(percentualCustoReforja(20)).toBe(200);
  });

  it('só a Mítica aceita Customização, até +20', () => {
    expect(ORDEM_ARMA.filter(podeCustomizar)).toEqual(['mitico']);
    expect(CUSTOMIZACAO.pontosMaximos).toBe(20);
    expect(CUSTOMIZACAO.ouroPorPonto).toBe(20000);
  });
});

describe('Materiais novos', () => {
  it('35 de mundo, sem repetir id nem nome com os 283 dos monstros', () => {
    expect(MATERIAIS_MUNDO).toHaveLength(35);
    const ids = [...MATERIAIS, ...MATERIAIS_MUNDO].map((m) => m.id);
    const nomes = [...MATERIAIS, ...MATERIAIS_MUNDO].map((m) => m.nome.toLowerCase());
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(nomes).size).toBe(nomes.length);
  });

  it('mundo: por raridade, 2 ossos, 2 minérios, 1 planta e 2 diversos', () => {
    for (const r of ORDEM_MATERIAL) {
      const daRaridade = MATERIAIS_MUNDO.filter((m) => m.raridade === r);
      const conta = (tipo: string) => daRaridade.filter((m) => m.tipo === tipo).length;
      expect([conta('osso'), conta('minerio'), conta('planta'), conta('diverso')], r).toEqual([2, 2, 1, 2]);
    }
  });
});

describe('Catálogo de armas', () => {
  it('164 armas base com ids únicos; 984 nomes únicos nas 6 categorias', () => {
    expect(ARMAS_BASE).toHaveLength(164);
    expect(new Set(ARMAS_BASE.map((a) => a.id)).size).toBe(164);
    const nomes = ARMAS_BASE.flatMap((a) => CATEGORIAS_ARMA.map((c) => a.nomes[c.id]));
    expect(nomes).toHaveLength(984);
    expect(new Set(nomes).size).toBe(984);
  });

  it('cobre os 35 monstros originais da Caçada, na estrela de cada um', () => {
    const porMonstro = new Set(ARMAS_BASE.map((a) => a.monstroId));
    expect(porMonstro.size).toBe(MONSTROS_CACADA_DADOS.filter((d) => !d.subespecie).length);
    for (const a of ARMAS_BASE) {
      const m = MONSTROS_CACADA_DADOS.find((d) => d.id === a.monstroId);
      expect(m, a.id).toBeDefined();
      expect(a.estrela, a.id).toBe(m!.estrela);
    }
  });

  it('contagem por raridade: 24 Comum, 31 Raro, 39 Muito raro, 47 Épico, 19 Lendário e 4 Mítico', () => {
    const conta = (r: RaridadeArma) => ARMAS_BASE.filter((a) => a.raridade === r).length;
    expect(ORDEM_ARMA.map(conta)).toEqual([24, 31, 39, 47, 19, 4]);
    expect(ARMAS_BASE.filter((a) => a.raridade === 'mitico').every((a) => a.estrela === 9)).toBe(true);
  });

  it('a arma consumida é a anterior da mesma árvore e nunca tem raridade maior', () => {
    for (const a of ARMAS_BASE) {
      if (a.posicao === 1) {
        expect(a.consome, a.id).toBeNull();
        continue;
      }
      const anterior = ARMAS_BASE_MAP[a.consome ?? ''];
      expect(anterior, a.id).toBeDefined();
      expect(anterior.monstroId).toBe(a.monstroId);
      expect(anterior.posicao).toBe(a.posicao - 1);
      expect(ORDEM_ARMA.indexOf(anterior.raridade)).toBeLessThanOrEqual(ORDEM_ARMA.indexOf(a.raridade));
    }
  });

  it('só as armas principais do Rato da Floresta não têm elemento nem status', () => {
    const sem = ARMAS_BASE.filter((a) => a.semElementoNemStatus);
    expect(sem.map((a) => a.id)).toEqual(['ferro-de-cacada', 'montante-de-pelo']);
    for (const a of ARMAS_BASE) expect(Boolean(a.semElementoNemStatus), a.id).toBe(a.elementos.length + a.status.length === 0);
  });

  it('o dano fixo da Mítica chega a 148 (207 com a Customização máxima)', () => {
    for (const a of ARMAS_BASE.filter((x) => x.raridade === 'mitico')) {
      const dano = danoFixoDaArma(a.estrela, a.posicao, a.semElementoNemStatus);
      expect(dano).toBe(148);
      expect(Math.round(dano * (1 + (CUSTOMIZACAO.danoPercentualPorPonto * CUSTOMIZACAO.pontosMaximos) / 100))).toBe(207);
    }
  });
});

describe('Receitas', () => {
  it('todo material existe e cai do próprio monstro ou da subespécie do ramo', () => {
    for (const a of ARMAS_BASE) {
      const fonte = DADOS_CACADA_MAP[a.parte === 'principal' ? a.monstroId : a.parte];
      expect(fonte, a.id).toBeDefined();
      if (a.parte !== 'principal') expect(fonte.varianteDe, a.id).toBe(a.monstroId);
      for (const item of a.receita.materiaisMonstro) {
        expect(item.qtd, a.id).toBeGreaterThan(0);
        expect(MATERIAIS_MAP[item.id], `${a.id}: ${item.id}`).toBeDefined();
        expect(fonte.drops, `${a.id}: ${item.id}`).toContain(item.id);
      }
      for (const item of a.receita.materiaisMundo) {
        expect(item.qtd, a.id).toBeGreaterThan(0);
        expect(MATERIAIS_MUNDO_MAP[item.id], `${a.id}: ${item.id}`).toBeDefined();
        expect(MATERIAIS_MUNDO_MAP[item.id].tipo).not.toBe('diverso');
      }
    }
  });

  it('a receita não pede material de monstro acima da raridade da arma', () => {
    for (const a of ARMAS_BASE) {
      const teto = Math.min(ORDEM_ARMA.indexOf(a.raridade), ORDEM_MATERIAL.indexOf('lendario'));
      for (const item of a.receita.materiaisMonstro) {
        expect(ORDEM_MATERIAL.indexOf(raridadeMaterial(item.id)!), `${a.id}: ${item.id}`).toBeLessThanOrEqual(teto);
      }
    }
  });

  it('diversos só a partir de Muito raro, e só de raridade que o monstro dropa', () => {
    for (const a of ARMAS_BASE) {
      const d = a.receita.diversos;
      if (!d) continue;
      expect(ORDEM_ARMA.indexOf(a.raridade), a.id).toBeGreaterThanOrEqual(ORDEM_ARMA.indexOf('muitoRaro'));
      const raridadesDaFamilia = a.receita.materiaisMonstro.map((i) => ORDEM_MATERIAL.indexOf(raridadeMaterial(i.id)!));
      expect(ORDEM_MATERIAL.indexOf(d.raridade), a.id).toBeLessThanOrEqual(Math.max(...raridadesDaFamilia));
    }
  });

  it('ouro = 100 × (base da estrela ÷ 17) × posição, em dezenas', () => {
    expect(ARMAS_BASE_MAP['ferro-de-cacada'].receita.ouro).toBe(100);
    for (const a of ARMAS_BASE) {
      expect(a.receita.ouro % 10, a.id).toBe(0);
      expect(a.receita.ouro, a.id).toBe(Math.round((100 * danoFixoDaArma(a.estrela, 1)) / 17 * a.posicao / 10) * 10);
    }
  });
});
