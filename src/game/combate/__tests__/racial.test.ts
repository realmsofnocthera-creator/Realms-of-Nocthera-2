import { describe, it, expect } from 'vitest';
import { Combatente, resolverCombate, turnoDeCombate } from '@/game/combat';
import { racialDeveDisparar } from '@/game/combate/racial';
import { MONSTERS_MAP } from '@/rules/monsters';

/** 1.8.1 — Habilidades raciais ativas: automáticas com HP abaixo de 50%, sem custo, recarga de 8 rodadas. */

const alvo = (extra: Partial<Combatente> = {}): Combatente => ({
  nome: 'Alvo',
  hp: 5000,
  hpMax: 5000,
  sobreescudo: 0,
  atributos: { vigor: 100, sorte: 0, forca: 1, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 1 },
  ...extra,
});

const heroi = (racaId: string, classeId: string, extra: Partial<Combatente> = {}): Combatente => ({
  nome: `${racaId} ${classeId}`,
  racaId,
  classeId,
  nivel: 1,
  hp: 40, // 40% de 100: abaixo de 50%
  hpMax: 100,
  sobreescudo: 0,
  atributos: { vigor: 20, sorte: 0, forca: 20, vitalidade: 5, arcano: 2, inteligencia: 20, agilidade: 5 },
  ...extra,
});

describe('1.8.1 — quando a racial dispara', () => {
  it('só com HP abaixo de 50% e recarga pronta', () => {
    expect(racialDeveDisparar({ racaId: 'orc', hp: 49, hpMax: 100 })).toBe(true);
    expect(racialDeveDisparar({ racaId: 'orc', hp: 50, hpMax: 100 })).toBe(false); // 50% exatos: não
    expect(racialDeveDisparar({ racaId: 'orc', hp: 10, hpMax: 100, recargaRestante: 3 })).toBe(false);
    expect(racialDeveDisparar({ racaId: 'orc', hp: 0, hpMax: 100 })).toBe(false);
    expect(racialDeveDisparar({ racaId: undefined, hp: 10, hpMax: 100 })).toBe(false);
    expect(racialDeveDisparar({ racaId: 'monstro', hp: 10, hpMax: 100 })).toBe(false);
  });

  it('com HP cheio não dispara', () => {
    const h = heroi('humano', 'barbaro', { hp: 100 });
    const atk = turnoDeCombate(h, alvo(), 1).turnoLog.ataques[0];
    expect(atk.racialAcionada).toBeUndefined();
    expect(h.recargaRacialRestante ?? 0).toBe(0);
  });

  it('dispara uma vez e só volta depois de 8 rodadas (ações)', () => {
    const h = heroi('humano', 'barbaro', { hp: 40, hpMax: 100000 }); // sempre abaixo de 50%
    const a = alvo();
    const disparos: number[] = [];
    for (let t = 1; t <= 18; t++) {
      const atk = turnoDeCombate(h, a, t).turnoLog.ataques[0];
      if (atk.racialAcionada) disparos.push(t);
    }
    expect(disparos).toEqual([1, 9, 17]);
  });
});

describe('1.8.1 — racias de buff (Humano, Anão, Elfo, Orc)', () => {
  it('Humano: +2 Força e +1 Agilidade por 2 ações, valendo já na ação em que dispara', () => {
    const h = heroi('humano', 'barbaro');
    const a = alvo();
    const [primeiro, segundo, terceiro] = [1, 2, 3].map((t) => turnoDeCombate(h, a, t).turnoLog.ataques[0]);
    expect(primeiro.racialAcionada).toBe('Instinto de Sobrevivência');
    expect(primeiro.danoBruto).toBe(22); // Força 20 + 2 já nesta ação
    expect(segundo.danoBruto).toBe(22);
    expect(terceiro.danoBruto).toBe(20); // acabou (2 ações)
    expect(h.atributos.forca).toBe(20); // os atributos originais não mudam
  });

  it('Anão: −20% de dano físico recebido, +3 Força e −2 Agilidade', () => {
    const h = heroi('anao', 'barbaro', { mitigacao: 0 });
    const atacante: Combatente = alvo({ nome: 'Atacante', atributos: { ...alvo().atributos, forca: 50 } });
    const antes = turnoDeCombate(atacante, { ...h, hp: 100 }, 1).turnoLog.ataques[0].danoEfetivo;
    // Anão já resiste 15% do dano físico (1.4: passiva Resistência Ancestral 10% + racial 5%): 50 → 42
    expect(antes).toBe(42);
    const primeiro = turnoDeCombate(h, alvo(), 1).turnoLog.ataques[0];
    expect(primeiro.racialAcionada).toBe('Fúria da Forja');
    expect(primeiro.danoBruto).toBe(23); // 20 + 3
    expect(turnoDeCombate(atacante, h, 2).turnoLog.ataques[0].danoEfetivo).toBe(32); // 50 − (15% + 20% da Fúria da Forja, somados)
  });

  it('Orc: +10% de dano físico (soma na regra 1.2.2) e −2 de Agilidade', () => {
    const h = heroi('orc', 'barbaro');
    const atk = turnoDeCombate(h, alvo(), 1).turnoLog.ataques[0];
    expect(atk.racialAcionada).toBe('Fúria Orc');
    expect(atk.danoBruto).toBe(27); // ceil((20 + 4 de Força) × 110%) = ceil(26,4)
  });

  it('Elfo: +15% de dano mágico e +3 Inteligência para o Feiticeiro', () => {
    const h = heroi('elfo', 'feiticeiro');
    const atk = turnoDeCombate(h, alvo(), 1).turnoLog.ataques[0];
    expect(atk.racialAcionada).toBe('Graça de Alfheim');
    expect(atk.danoBruto).toBe(Math.ceil(23 * 1.15)); // (20 + 3 de Inteligência) × 115%
  });

  it('Elfo: o bônus de dano mágico não vale para dano físico', () => {
    const h = heroi('elfo', 'barbaro');
    const atk = turnoDeCombate(h, alvo(), 1).turnoLog.ataques[0];
    expect(atk.danoBruto).toBe(20);
  });
});

describe('1.8.1 — racias de ataque (Vampiro, Draconiano)', () => {
  it('Vampiro: Drenar Sangue substitui o ataque, causa dano mágico e cura 50% do dano causado', () => {
    const h = heroi('vampiro', 'barbaro');
    const rapido = alvo({ atributos: { ...alvo().atributos, agilidade: 100 } }); // sem ataque duplo
    const atk = turnoDeCombate(h, rapido, 1).turnoLog.ataques[0];
    expect(atk.racialAcionada).toBe('Drenar Sangue');
    expect(atk.habilidadeAcionada).toBe('Drenar Sangue');
    expect(atk.danoBruto).toBe(20); // dano mágico por Inteligência
    expect(h.hp).toBe(40 + 10); // cura 50% de 20
  });

  it('Vampiro: cura 75% se o alvo estiver abaixo de 30% do HP', () => {
    const h = heroi('vampiro', 'barbaro');
    const quaseMorto = alvo({ hp: 1000, hpMax: 5000, atributos: { ...alvo().atributos, agilidade: 100 } });
    turnoDeCombate(h, quaseMorto, 1);
    expect(h.hp).toBe(40 + 15); // 75% de 20
  });

  it('Draconiano: Sopro Dracônico no elemento da linhagem (gelo reduz a Agilidade do alvo)', () => {
    const h = heroi('draconiano', 'feiticeiro', { linhagem: 'gelo' });
    const a = alvo({ modificadoresElementais: { gelo: 50 } });
    const atk = turnoDeCombate(h, a, 1).turnoLog.ataques[0];
    expect(atk.racialAcionada).toBe('Sopro Dracônico');
    expect(atk.elemento).toBe('gelo');
    expect(atk.danoBruto).toBe(30); // 20 × (100 + 50)% do elemento fraco
    expect(a.debuffs?.map((d) => d.tipo)).toEqual(['exaustao']);
  });

  it('Draconiano de terra reduz a defesa do alvo; de vento aumenta a Agilidade dele', () => {
    const terra = heroi('draconiano', 'feiticeiro', { linhagem: 'terra' });
    const a = alvo();
    turnoDeCombate(terra, a, 1);
    expect(a.debuffs?.map((d) => d.tipo)).toEqual(['reducaoDefesa']);

    const vento = heroi('draconiano', 'feiticeiro', { linhagem: 'vento' });
    turnoDeCombate(vento, alvo(), 1);
    expect(vento.buffs?.some((b) => b.tipo === 'aumentoAtributo' && b.atributo === 'agilidade')).toBe(true);
  });

  it('a redução de defesa do Sopro de terra faz o alvo sofrer mais dano', () => {
    const atacante = alvo({ nome: 'Atacante', atributos: { ...alvo().atributos, forca: 40 } });
    const normal = alvo({ mitigacao: 20 });
    expect(turnoDeCombate(atacante, normal, 1).turnoLog.ataques[0].danoEfetivo).toBe(20);
    const reduzida = alvo({ mitigacao: 20, debuffs: [{ tipo: 'reducaoDefesa', percentual: 50, rodadasRestantes: 3 }] });
    expect(turnoDeCombate(atacante, reduzida, 1).turnoLog.ataques[0].danoEfetivo).toBe(30);
  });

  it('o Vampiro sem classe definida (sem como atacar por habilidade) não perde a ação', () => {
    const h = heroi('vampiro', 'barbaro', { classeId: undefined });
    const atk = turnoDeCombate(h, alvo(), 1).turnoLog.ataques[0];
    expect(atk.racialAcionada).toBeUndefined();
  });
});

describe('1.8.1 — no combate completo', () => {
  it('a mensagem avisa quando a racial dispara', () => {
    const h = heroi('humano', 'barbaro', { hp: 30, hpMax: 60 });
    const r = resolverCombate(h, MONSTERS_MAP['cavaleiro-do-vazio'], 5);
    const acionadas = r.logTurnos.flatMap((t) => t.ataques).filter((a) => a.racialAcionada);
    expect(acionadas.length).toBeGreaterThan(0);
    expect(acionadas[0].mensagem).toContain('aciona Instinto de Sobrevivência');
  });

  it('é determinístico', () => {
    const h = heroi('orc', 'samurai', { hp: 30, hpMax: 60 });
    const m = MONSTERS_MAP['cavaleiro-do-vazio'];
    expect(resolverCombate(h, m, 9)).toEqual(resolverCombate(h, m, 9));
  });
});
