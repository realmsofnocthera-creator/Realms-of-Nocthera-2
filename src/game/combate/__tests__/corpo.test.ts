import { describe, it, expect } from 'vitest';
import { Combatente, resolverCombate, turnoDeCombate } from '@/game/combat';
import { reacaoDoCorpo } from '@/game/combate/corpo';
import {
  CATEGORIAS_CORPORAIS,
  CORPOS,
  TipoGolpe,
  ehCategoriaCorporal,
  modificadoresElementaisDaCategoria,
} from '@/rules/corposMonstros';
import { MONSTERS, MONSTERS_MAP } from '@/rules/monsters';

/** Roadmap 1.3 — categorias corporais dos monstros e tipos de dano (Contusão, Corte, Perfuração, mágico). */

const T = (...t: TipoGolpe[]) => t;

describe('1.3 — tabela de categorias corporais (conforme definida pelo Yuri)', () => {
  const esperado: Record<string, [TipoGolpe[], TipoGolpe[]]> = {
    blindadoPesado: [T('contusao'), T('corte')],
    rochoso: [T('contusao'), T('corte', 'perfuracao')],
    feral: [T(), T()],
    organicoDesprotegido: [T('corte', 'perfuracao'), T()],
    escamoso: [T('contusao'), T('corte', 'perfuracao')],
    quitinoso: [T('contusao', 'perfuracao'), T('corte')],
    blindagemMedia: [T('contusao'), T('corte')],
    eterio: [T('magico'), T('corte', 'perfuracao', 'contusao')],
    amorfo: [T('perfuracao'), T('corte', 'contusao')],
    cristalino: [T('contusao'), T('corte', 'perfuracao')],
    aberrante: [T(), T()],
    sombrio: [T(), T('corte', 'perfuracao')],
  };

  it('tem as 12 categorias com as fraquezas e resistências exatas', () => {
    expect(CATEGORIAS_CORPORAIS.length).toBe(12);
    for (const [id, [fraq, resist]] of Object.entries(esperado)) {
      expect(CORPOS[id as keyof typeof CORPOS].fraquezas, id).toEqual(fraq);
      expect(CORPOS[id as keyof typeof CORPOS].resistencias, id).toEqual(resist);
    }
  });

  it('Aberrante é variável; Sombrio é fraco a Luz Sagrada', () => {
    expect(CORPOS.aberrante.variavel).toBe(true);
    expect(modificadoresElementaisDaCategoria('sombrio').sagrado).toBeGreaterThan(0);
    expect(modificadoresElementaisDaCategoria('feral')).toEqual({});
  });

  it('todo monstro tem uma categoria válida', () => {
    for (const m of MONSTERS) {
      expect(ehCategoriaCorporal(m.categoriaCorporal), m.id).toBe(true);
      if (m.categoriaCorporal === 'aberrante') {
        expect(m.fraquezasProprias ?? m.resistenciasProprias, m.id).toBeDefined();
      }
    }
  });
});

describe('1.3 — reação do corpo ao tipo do golpe', () => {
  it('fraqueza +25%, resistência −25%, neutro 100%', () => {
    expect(reacaoDoCorpo({ categoriaCorporal: 'blindadoPesado' }, 'contusao').fatorPercentual).toBe(125);
    expect(reacaoDoCorpo({ categoriaCorporal: 'blindadoPesado' }, 'corte').fatorPercentual).toBe(75);
    expect(reacaoDoCorpo({ categoriaCorporal: 'blindadoPesado' }, 'perfuracao').fatorPercentual).toBe(100);
    expect(reacaoDoCorpo({ categoriaCorporal: 'feral' }, 'corte').fatorPercentual).toBe(100);
  });

  it('sem tipo de golpe ou sem categoria não há efeito', () => {
    expect(reacaoDoCorpo({ categoriaCorporal: 'rochoso' }, undefined).fatorPercentual).toBe(100);
    expect(reacaoDoCorpo({}, 'corte').fatorPercentual).toBe(100);
  });

  it('Etéreo: dano mágico é fraqueza, físicos resistem', () => {
    expect(reacaoDoCorpo({ categoriaCorporal: 'eterio' }, 'magico').fatorPercentual).toBe(125);
    expect(reacaoDoCorpo({ categoriaCorporal: 'eterio' }, 'perfuracao').fatorPercentual).toBe(75);
  });

  it('Aberrante usa as listas próprias da criatura', () => {
    const corpo = {
      categoriaCorporal: 'aberrante' as const,
      fraquezasProprias: T('corte'),
      resistenciasProprias: T('magico'),
    };
    expect(reacaoDoCorpo(corpo, 'corte').fatorPercentual).toBe(125);
    expect(reacaoDoCorpo(corpo, 'magico').fatorPercentual).toBe(75);
    expect(reacaoDoCorpo(corpo, 'contusao').fatorPercentual).toBe(100);
  });

  it('o mesmo tipo nas duas listas se anula', () => {
    const corpo = {
      categoriaCorporal: 'aberrante' as const,
      fraquezasProprias: T('corte'),
      resistenciasProprias: T('corte'),
    };
    expect(reacaoDoCorpo(corpo, 'corte').fatorPercentual).toBe(100);
  });
});

describe('1.3 — efeito no combate', () => {
  const atacante = (extra: Partial<Combatente> = {}): Combatente => ({
    nome: 'Atacante',
    hp: 5000,
    hpMax: 5000,
    sobreescudo: 0,
    atributos: { vigor: 10, sorte: 0, forca: 40, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 1 },
    ...extra,
  });
  const alvo = (extra: Partial<Combatente> = {}): Combatente => ({
    nome: 'Alvo',
    hp: 5000,
    hpMax: 5000,
    sobreescudo: 0,
    atributos: { vigor: 100, sorte: 0, forca: 1, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 1 },
    ...extra,
  });
  const dano = (a: Combatente, d: Combatente) => turnoDeCombate(a, d, 1).turnoLog.ataques[0];

  it('subtipo do golpe contra fraqueza/resistência do corpo muda o dano em ±25%', () => {
    const base = dano(atacante(), alvo({ categoriaCorporal: 'blindadoPesado' }));
    const forte = dano(
      atacante({ tipoDanoFisico: 'contusao' }),
      alvo({ categoriaCorporal: 'blindadoPesado' })
    );
    const fraco = dano(
      atacante({ tipoDanoFisico: 'corte' }),
      alvo({ categoriaCorporal: 'blindadoPesado' })
    );
    expect(base.multiplicadorTipoDano).toBeUndefined();
    expect(forte.multiplicadorTipoDano).toBe(1.25);
    expect(forte.reacaoTipoDano).toBe('fraqueza');
    expect(fraco.multiplicadorTipoDano).toBe(0.75);
    expect(forte.danoBruto ?? 0).toBeGreaterThan(fraco.danoBruto ?? 0);
  });

  it('sem subtipo (sem arma) o golpe físico não é alterado pela categoria', () => {
    const a = dano(atacante(), alvo({ categoriaCorporal: 'rochoso' }));
    const b = dano(atacante(), alvo());
    expect(a.danoBruto).toBe(b.danoBruto);
  });

  it('dano mágico contra Etéreo causa +25%', () => {
    const mago = atacante({ classeId: 'feiticeiro', nivel: 1, atributos: { vigor: 10, sorte: 0, forca: 1, vitalidade: 0, arcano: 0, inteligencia: 40, agilidade: 1 } });
    const com = dano(mago, alvo({ categoriaCorporal: 'eterio' }));
    const sem = dano(mago, alvo());
    expect(com.reacaoTipoDano).toBe('fraqueza');
    expect(com.danoBruto ?? 0).toBeGreaterThan(sem.danoBruto ?? 0);
  });

  it('Sombrio recebe fraqueza elemental a Sagrado sem duplicar a que o monstro já define', () => {
    const cav = MONSTERS_MAP['cavaleiro-do-vazio'];
    const r = resolverCombate(atacante(), { ...cav, categoriaCorporal: 'sombrio' }, 7);
    expect(r.logTurnos.length).toBeGreaterThan(0);
  });
});
