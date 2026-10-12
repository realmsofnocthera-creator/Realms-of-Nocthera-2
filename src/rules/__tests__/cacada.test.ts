import { describe, it, expect } from 'vitest';
import {
  DADOS_CACADA_MAP,
  ESTRELAS_CACADA,
  MONSTROS_CACADA,
  MONSTROS_CACADA_DADOS,
  MONSTROS_CACADA_MAP,
} from '@/rules/cacada';
import { MATERIAIS, MATERIAIS_MAP } from '@/rules/materiais';
import { RARIDADES_MATERIAL, RaridadeMaterial } from '@/rules/raridades';
import { MONSTERS_MAP } from '@/rules/monsters';
import { resolverCombate } from '@/game/combat';

/** Provação da Caçada — bestiário v2 (35 monstros, 142 materiais), decidido pelo Yuri em 12/10/2026. */

const ORDEM: RaridadeMaterial[] = ['comum', 'raro', 'muitoRaro', 'epico', 'lendario'];
const tetoRaridade = (estrela: number, chave: boolean): RaridadeMaterial => {
  if (estrela <= 2) return chave ? 'epico' : 'muitoRaro';
  if (estrela <= 5) return 'epico';
  if (estrela <= 7) return chave ? 'lendario' : 'epico';
  return 'lendario';
};

describe('Estrelas e ranques', () => {
  it('9 estrelas: ranque baixo 1★–5★ e alto 6★–9★, com os níveis mínimos aprovados', () => {
    expect(ESTRELAS_CACADA.map((e) => [e.estrela, e.ranque, e.nivelMinimo])).toEqual([
      [1, 'baixo', 2], [2, 'baixo', 5], [3, 'baixo', 8], [4, 'baixo', 12], [5, 'baixo', 16],
      [6, 'alto', 20], [7, 'alto', 23], [8, 'alto', 26], [9, 'alto', 30],
    ]);
  });

  it('cada estrela de 1 a 8 tem exatamente um monstro-chave; a 9★ não tem', () => {
    for (let e = 1; e <= 9; e++) {
      const chaves = MONSTROS_CACADA_DADOS.filter((m) => m.estrela === e && m.chave);
      expect(chaves.length, `${e}★`).toBe(e === 9 ? 0 : 1);
    }
  });

  it('35 monstros, todos com nome e id únicos', () => {
    expect(MONSTROS_CACADA_DADOS).toHaveLength(35);
    expect(new Set(MONSTROS_CACADA_DADOS.map((m) => m.id)).size).toBe(35);
    expect(MONSTROS_CACADA_DADOS.filter((m) => m.estrela === 7).map((m) => m.nome)).toEqual([
      'Rathmorn', 'Kharvok', 'Zyrak', 'Dromvark, Mandíbula de Ferro',
    ]);
  });
});

describe('Monstros prontos para o combate', () => {
  it('nível = mínimo da estrela (chave +1); o chave é chefe', () => {
    for (const m of MONSTROS_CACADA) {
      const d = DADOS_CACADA_MAP[m.id];
      const min = ESTRELAS_CACADA.find((e) => e.estrela === d.estrela)!.nivelMinimo;
      expect(m.nivel).toBe(Math.min(30, min + (d.chave ? 1 : 0)));
      expect(m.chefe).toBe(d.chave === true);
      expect(m.hp).toBeGreaterThan(0);
    }
  });

  it('ficam fora do combate comum (só entram pela Caçada)', () => {
    for (const m of MONSTROS_CACADA) expect(MONSTERS_MAP[m.id]).toBeUndefined();
  });

  it('peças novas do bestiário: Esqueleto imune a Sangramento e Veneno; Enfurecido nos que o bestiário pede', () => {
    expect(MONSTROS_CACADA_MAP['esqueleto'].imunidadesStatus).toEqual(['sangramento', 'veneno']);
    expect(MONSTROS_CACADA_MAP['urso-gigante'].enfurecido).toBe(true);
    expect(MONSTROS_CACADA_MAP['lobo-cinzento'].enfurecido).toBeUndefined();
    expect(MONSTROS_CACADA_MAP['grizzharn'].habilidades?.[0].acoes.map((a) => a.nome)).toEqual(['Agarrão', 'Esmagamento']);
  });

  it('variantes: mesma categoria corporal da espécie e dividem o material Comum', () => {
    for (const d of MONSTROS_CACADA_DADOS.filter((x) => x.varianteDe)) {
      const base = DADOS_CACADA_MAP[d.varianteDe!];
      expect(base, d.id).toBeDefined();
      expect(d.categoriaCorporal).toBe(base.categoriaCorporal);
      expect(d.estrela).toBeGreaterThanOrEqual(base.estrela);
      expect(d.drops[0]).toBe(base.drops[0]);
    }
  });

  it('toda luta termina e é determinística', () => {
    const heroi = () => ({
      nome: 'Caçador', racaId: 'humano', classeId: 'cavaleiro', nivel: 30, hp: 600, hpMax: 600, sobreescudo: 100,
      atributos: { vigor: 120, sorte: 5, forca: 60, vitalidade: 30, arcano: 0, inteligencia: 0, agilidade: 25 },
    });
    for (const m of MONSTROS_CACADA) {
      const a = resolverCombate(heroi(), m, 3);
      expect(a.logTurnos.length, m.id).toBeLessThan(100);
      expect(resolverCombate(heroi(), m, 3)).toEqual(a);
    }
  });
});

describe('Drops e materiais', () => {
  it('raridades: Comum garantido, Raro 35%, Muito raro 12%, Épico 4%, Lendário 1%', () => {
    expect(RARIDADES_MATERIAL.map((r) => [r.id, r.estrelas, r.chancePercentual])).toEqual([
      ['comum', 1, 100], ['raro', 2, 35], ['muitoRaro', 3, 12], ['epico', 4, 4], ['lendario', 5, 1],
    ]);
  });

  it('todo drop existe no catálogo; cada monstro tem um Comum (o primeiro) e raridades em ordem, sem repetir', () => {
    for (const d of MONSTROS_CACADA_DADOS) {
      const rar = d.drops.map((id) => {
        expect(MATERIAIS_MAP[id], `${d.id}: ${id}`).toBeDefined();
        return MATERIAIS_MAP[id].raridade;
      });
      expect(rar[0]).toBe('comum');
      expect(rar.filter((r) => r === 'comum')).toHaveLength(1);
      expect(new Set(d.drops).size).toBe(d.drops.length);
      expect(rar.map((r) => ORDEM.indexOf(r))).toEqual([...rar.map((r) => ORDEM.indexOf(r))].sort((x, y) => x - y));
    }
  });

  it('teto de raridade por estrela (1★–2★ até Muito raro, chave até Épico; Lendário só em chaves 6★–7★ e em 8★–9★)', () => {
    for (const d of MONSTROS_CACADA_DADOS) {
      const max = Math.max(...d.drops.map((id) => ORDEM.indexOf(MATERIAIS_MAP[id].raridade)));
      expect(max, d.id).toBe(ORDEM.indexOf(tetoRaridade(d.estrela, d.chave === true)));
    }
  });

  it('142 materiais; cada um cai de algum monstro e guarda a menor estrela de onde cai', () => {
    expect(MATERIAIS).toHaveLength(142);
    expect(new Set(MATERIAIS.map((m) => m.id)).size).toBe(142);
    for (const mat of MATERIAIS) {
      const fontes = MONSTROS_CACADA_DADOS.filter((d) => d.drops.includes(mat.id));
      expect(fontes.length, mat.id).toBeGreaterThan(0);
      expect(mat.estrelaOrigem).toBe(Math.min(...fontes.map((f) => f.estrela)));
    }
  });
});
