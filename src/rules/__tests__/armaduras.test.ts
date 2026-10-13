import { describe, it, expect } from 'vitest';
import {
  ATRIBUTOS_SORTEAVEIS_ARMADURA,
  ESPACOS_ARMADURA,
  FAIXA_SORTEIO_ARMADURA,
  NIVEIS_HABILIDADE_CONJUNTO,
  ORBES_ARMADURA,
  XP_POR_NIVEL_ARMADURA,
  XP_TOTAL_ARMADURA,
  fixoDaPeca,
  nivelDoXpArmadura,
  somarHabilidades,
  sortearAtributoDaArmadura,
  sortearPontosDaArmadura,
  xpAcumuladoAteNivel,
} from '@/rules/armaduras';
import { PECAS_ARMADURA } from '@/rules/armadurasCatalogo';
import { HABILIDADES_ARMADURA, HABILIDADES_ARMADURA_MAP } from '@/rules/habilidadesArmadura';
import { DADOS_CACADA_MAP, MONSTROS_CACADA_DADOS } from '@/rules/cacada';
import { MATERIAIS_MAP } from '@/rules/materiais';
import { MATERIAIS_MUNDO_MAP } from '@/rules/materiaisArmas';
import type { RaridadeArma } from '@/rules/armas';

/** Armaduras — regras e catálogo decididos pelo Yuri em 13/10/2026. */

const ORDEM: RaridadeArma[] = ['comum', 'raro', 'muitoRaro', 'epico', 'lendario', 'mitico'];
const conjuntos = () => {
  const m = new Map<string, typeof PECAS_ARMADURA[number][]>();
  for (const p of PECAS_ARMADURA) m.set(p.conjuntoId, [...(m.get(p.conjuntoId) ?? []), p]);
  return m;
};

describe('Regras da armadura', () => {
  it('5 espaços: Elmo e Luvas dão Vida, Peitoral e Perneiras dão Defesa, Botas dão Agilidade', () => {
    expect(ESPACOS_ARMADURA.map((e) => [e.id, e.fixo])).toEqual([
      ['elmo', 'vida'], ['peitoral', 'defesa'], ['luvas', 'vida'], ['perneiras', 'defesa'], ['botas', 'agilidade'],
    ]);
  });

  it('fixo pela base da estrela e +1% por nível da peça (até o 30)', () => {
    expect([fixoDaPeca(9, 'peitoral'), fixoDaPeca(9, 'perneiras'), fixoDaPeca(9, 'elmo'), fixoDaPeca(9, 'luvas'), fixoDaPeca(9, 'botas')]).toEqual([42, 35, 141, 88, 18]);
    expect(fixoDaPeca(9, 'peitoral', 30)).toBe(55);
    expect(fixoDaPeca(9, 'peitoral', 99)).toBe(55);
    expect(() => fixoDaPeca(10, 'elmo')).toThrow();
  });

  it('sorteio só entre Arcano, Vigor e Vitalidade, na faixa da raridade', () => {
    expect(ATRIBUTOS_SORTEAVEIS_ARMADURA).toEqual(['arcano', 'vigor', 'vitalidade']);
    expect(sortearAtributoDaArmadura(() => 0)).toBe('arcano');
    expect(sortearAtributoDaArmadura(() => 0.999)).toBe('vitalidade');
    for (const r of ORDEM) {
      expect(sortearPontosDaArmadura(r, () => 0)).toBe(FAIXA_SORTEIO_ARMADURA[r].min);
      expect(sortearPontosDaArmadura(r, () => 0.9999)).toBe(FAIXA_SORTEIO_ARMADURA[r].max);
    }
  });

  it('XP: 30 níveis somando 10.000; o nível sai do XP acumulado', () => {
    expect(XP_POR_NIVEL_ARMADURA).toHaveLength(30);
    expect(XP_POR_NIVEL_ARMADURA.reduce((s, c) => s + c, 0)).toBe(XP_TOTAL_ARMADURA);
    expect(XP_POR_NIVEL_ARMADURA[0]).toBe(22);
    expect(xpAcumuladoAteNivel(30)).toBe(10000);
    expect(nivelDoXpArmadura(0)).toBe(0);
    expect(nivelDoXpArmadura(21)).toBe(0);
    expect(nivelDoXpArmadura(22)).toBe(1);
    expect(nivelDoXpArmadura(9999)).toBe(29);
    expect(nivelDoXpArmadura(50000)).toBe(30);
  });

  it('5 orbes, um por raridade de material, de +10 a +1.000 de XP', () => {
    expect(ORBES_ARMADURA.map((o) => [o.raridade, o.xp])).toEqual([
      ['comum', 10], ['raro', 50], ['muitoRaro', 200], ['epico', 500], ['lendario', 1000],
    ]);
  });

  it('habilidades de peças diferentes somam até o nível máximo', () => {
    const total = somarHabilidades(
      [{ habilidades: [{ id: 'reforco-de-vida', nivel: 2 }] }, { habilidades: [{ id: 'reforco-de-vida', nivel: 2 }, { id: 'olho-critico', nivel: 1 }] }],
      (id) => HABILIDADES_ARMADURA_MAP[id].nivelMaximo
    );
    expect(total).toEqual({ 'reforco-de-vida': 3, 'olho-critico': 1 });
  });
});

describe('Habilidades de armadura', () => {
  it('135 habilidades com ids únicos, sem a Parte 6 original, e 4 exclusivas dos 9★', () => {
    expect(HABILIDADES_ARMADURA).toHaveLength(135);
    expect(new Set(HABILIDADES_ARMADURA.map((h) => h.id)).size).toBe(135);
    expect(HABILIDADES_ARMADURA.filter((h) => h.exclusivaDe).map((h) => h.exclusivaDe)).toEqual(['oryndrak', 'reydras', 'dravakhar', 'urdumor']);
    for (const h of HABILIDADES_ARMADURA) {
      expect(h.niveis[h.nivelMaximo], h.id).toBeTruthy();
      for (const k of Object.keys(h.niveis)) expect(Number(k)).toBeLessThanOrEqual(h.nivelMaximo);
    }
  });
});

describe('Catálogo de armaduras', () => {
  it('82 conjuntos de 5 peças (410), com ids e nomes únicos', () => {
    expect(PECAS_ARMADURA).toHaveLength(410);
    expect(new Set(PECAS_ARMADURA.map((p) => p.id)).size).toBe(410);
    expect(new Set(PECAS_ARMADURA.map((p) => p.nome)).size).toBe(410);
    const c = conjuntos();
    expect(c.size).toBe(82);
    for (const [id, pecas] of c) expect(pecas.map((p) => p.espaco).sort(), id).toEqual(['botas', 'elmo', 'luvas', 'peitoral', 'perneiras']);
  });

  it('um conjunto por monstro e subespécie (78) e um Mítico para cada 9★', () => {
    const c = conjuntos();
    for (const m of MONSTROS_CACADA_DADOS) expect(c.has(m.id), m.id).toBe(true);
    const miticos = [...c.keys()].filter((k) => k.endsWith('-mitico'));
    expect(miticos.sort()).toEqual(['dravakhar-mitico', 'oryndrak-mitico', 'reydras-mitico', 'urdumor-mitico']);
  });

  it('raridade pela estrela; subespécie uma acima do original (teto Lendário); Mítico só nos 4', () => {
    const porEstrela = (e: number): RaridadeArma => (e <= 2 ? 'comum' : e <= 4 ? 'raro' : e <= 6 ? 'muitoRaro' : e <= 8 ? 'epico' : 'lendario');
    for (const [id, pecas] of conjuntos()) {
      const r = pecas[0].raridade;
      expect(new Set(pecas.map((p) => p.raridade)).size, id).toBe(1);
      const dados = DADOS_CACADA_MAP[pecas[0].monstroId];
      if (id.endsWith('-mitico')) expect(r).toBe('mitico');
      else if (dados.subespecie) {
        const original = DADOS_CACADA_MAP[dados.varianteDe!];
        expect(r, id).toBe(ORDEM[Math.min(4, ORDEM.indexOf(porEstrela(original.estrela)) + 1)]);
      } else expect(r, id).toBe(porEstrela(dados.estrela));
    }
  });

  it('níveis de habilidade do conjunto pela raridade, pelo menos 1 por peça e nenhum acima do máximo', () => {
    for (const [id, pecas] of conjuntos()) {
      const total = pecas.reduce((s, p) => s + p.habilidades.reduce((t, h) => t + h.nivel, 0), 0);
      expect(total, id).toBe(NIVEIS_HABILIDADE_CONJUNTO[pecas[0].raridade]);
      for (const p of pecas) expect(p.habilidades.length, p.id).toBeGreaterThan(0);
      const soma: Record<string, number> = {};
      for (const p of pecas) for (const h of p.habilidades) soma[h.id] = (soma[h.id] ?? 0) + h.nivel;
      for (const [h, n] of Object.entries(soma)) {
        expect(HABILIDADES_ARMADURA_MAP[h], h).toBeDefined();
        expect(n, `${id}: ${h}`).toBeLessThanOrEqual(HABILIDADES_ARMADURA_MAP[h].nivelMaximo);
      }
    }
  });

  it('as habilidades exclusivas dos 9★ só aparecem nos conjuntos do próprio monstro', () => {
    for (const p of PECAS_ARMADURA) {
      for (const h of p.habilidades) {
        const exclusiva = HABILIDADES_ARMADURA_MAP[h.id].exclusivaDe;
        if (exclusiva) expect(p.monstroId, p.id).toBe(exclusiva);
      }
    }
  });

  it('receitas: material do próprio monstro e materiais de mundo que existem', () => {
    for (const p of PECAS_ARMADURA) {
      const fonte = DADOS_CACADA_MAP[p.monstroId];
      expect(fonte, p.id).toBeDefined();
      for (const i of p.receita.materiaisMonstro) {
        expect(MATERIAIS_MAP[i.id], `${p.id}: ${i.id}`).toBeDefined();
        expect(fonte.drops, `${p.id}: ${i.id}`).toContain(i.id);
        expect(i.qtd).toBeGreaterThan(0);
      }
      for (const i of p.receita.materiaisMundo) {
        expect(MATERIAIS_MUNDO_MAP[i.id], `${p.id}: ${i.id}`).toBeDefined();
        expect(i.qtd).toBeGreaterThan(0);
      }
      if (p.receita.diversos) expect(['peitoral', 'perneiras']).toContain(p.espaco);
      expect(p.receita.ouro).toBeGreaterThan(0);
    }
  });
});
