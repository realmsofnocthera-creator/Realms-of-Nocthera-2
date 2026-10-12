import { describe, it, expect } from 'vitest';
import {
  DADOS_CACADA_MAP,
  ESTRELAS_CACADA,
  MONSTROS_CACADA,
  MONSTROS_CACADA_DADOS,
  MONSTROS_CACADA_MAP,
  montarMonstroCacada,
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

  it('78 monstros (35 originais e 43 subespécies), todos com nome e id únicos', () => {
    expect(MONSTROS_CACADA_DADOS).toHaveLength(78);
    expect(MONSTROS_CACADA_DADOS.filter((m) => m.subespecie)).toHaveLength(43);
    expect(new Set(MONSTROS_CACADA_DADOS.map((m) => m.id)).size).toBe(78);
    expect(new Set(MONSTROS_CACADA_DADOS.map((m) => m.nome)).size).toBe(78);
    expect(MONSTROS_CACADA_DADOS.filter((m) => m.estrela === 7 && !m.subespecie).map((m) => m.nome)).toEqual([
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

  it('283 materiais (142 dos originais e 141 das subespécies); cada um cai de algum monstro e guarda a menor estrela de onde cai', () => {
    expect(MATERIAIS).toHaveLength(283);
    expect(new Set(MATERIAIS.map((m) => m.id)).size).toBe(283);
    for (const mat of MATERIAIS) {
      const fontes = MONSTROS_CACADA_DADOS.filter((d) => d.drops.includes(mat.id));
      expect(fontes.length, mat.id).toBeGreaterThan(0);
      expect(mat.estrelaOrigem).toBe(Math.min(...fontes.map((f) => f.estrela)));
    }
  });
});

describe('Subespécies', () => {
  const subs = MONSTROS_CACADA_DADOS.filter((m) => m.subespecie);
  const original = (id: string) => DADOS_CACADA_MAP[DADOS_CACADA_MAP[id].varianteDe!];

  it('aparecem do 3★ ao 8★, nunca são chave e os originais de 8★ e 9★ não têm', () => {
    expect([...new Set(subs.map((s) => s.estrela))].sort()).toEqual([3, 4, 5, 6, 7, 8]);
    for (const s of subs) {
      expect(s.chave, s.id).toBeUndefined();
      expect(original(s.id).subespecie, s.id).toBeUndefined();
      expect(original(s.id).estrela, s.id).toBeLessThanOrEqual(7);
      expect(s.estrela, s.id).toBeGreaterThan(original(s.id).estrela);
    }
  });

  it('herdam perfil, habilidades, Enfurecido e imunidades; dividem o Comum e têm Raro, Muito raro, Épico (e Lendário no 8★)', () => {
    for (const s of subs) {
      const o = original(s.id);
      expect(s.perfil).toBe(o.perfil);
      expect(s.habilidades).toBe(o.habilidades);
      expect(s.enfurecido).toBe(o.enfurecido);
      expect(s.imunidadesStatus).toBe(o.imunidadesStatus);
      expect(s.drops[0]).toBe(o.drops[0]);
      const esperado: RaridadeMaterial[] = s.estrela >= 8 ? ['comum', 'raro', 'muitoRaro', 'epico', 'lendario'] : ['comum', 'raro', 'muitoRaro', 'epico'];
      expect(s.drops.map((id) => MATERIAIS_MAP[id].raridade), s.id).toEqual(esperado);
    }
  });

  it('elemento novo troca o do original, resiste a ele e fica fraca ao oposto; o status soma aos do original', () => {
    const cinzas = DADOS_CACADA_MAP['rato-das-cinzas'];
    expect([cinzas.elementoAtaque, cinzas.resisteA, cinzas.fracoA]).toEqual(['fogo', ['fogo'], ['gelo']]);
    const pestilento = DADOS_CACADA_MAP['rato-pestilento'];
    expect([pestilento.elementoAtaque, pestilento.efeitosAplicados, pestilento.fracoA]).toEqual([undefined, ['veneno'], ['fogo']]);
    expect(DADOS_CACADA_MAP['zyrak-carmesim'].efeitosAplicados).toEqual(['veneno']);
    expect(DADOS_CACADA_MAP['cryovarn-abissal'].resisteA).toEqual(['gelo', 'sombrio']);
    expect(DADOS_CACADA_MAP['cryovarn-abissal'].fracoA).toEqual(['fogo', 'sagrado']);
  });

  it('Força +15% no Urso Colérico, Cryovarn Furioso e Dromvark Devastador; Vitalidade +15% no Kharvok de Obsidiana', () => {
    expect(subs.filter((s) => s.forcaPercentual).map((s) => s.id).sort()).toEqual(['cryovarn-furioso', 'dromvark-devastador', 'urso-colerico']);
    expect(subs.filter((s) => s.vitalidadePercentual).map((s) => s.id)).toEqual(['kharvok-de-obsidiana']);
    const semAjuste = { ...DADOS_CACADA_MAP['urso-colerico'], id: 'teste', forcaPercentual: undefined };
    const comAjuste = MONSTROS_CACADA_MAP['urso-colerico'];
    expect(comAjuste.atributos.forca).toBeGreaterThan(montarMonstroCacada(semAjuste).atributos.forca);
  });
});

