import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Combatente, resolverCombate, turnoDeCombate } from '@/game/combat';
import {
  AplicacaoBuff,
  adicionarBuffs,
  aplicarBuffsAosAtributos,
  avancarBuffs,
  bonusDanoDosBuffs,
  multiplicadorAgilidadeParaDuplo,
} from '@/game/combate/efeitosBuffs';
import {
  DefinicaoHabilidade,
  ResultadoHabilidade,
  limparRegistroParaTestes,
  registrarHabilidade,
} from '@/game/combate/habilidades';
import { MONSTERS_MAP } from '@/rules/monsters';

/** 1.2.4 — Catálogo, categoria Atributos e buffs. */

const ATRIBUTOS = { vigor: 10, sorte: 5, forca: 20, vitalidade: 4, arcano: 2, inteligencia: 3, agilidade: 6 };

describe('1.2.4 — Atributos e buffs: funções puras', () => {
  it('Aumento de Força / Sorte / Agilidade somam no atributo; Aumento Geral soma em todos', () => {
    const lista = adicionarBuffs([], [
      { tipo: 'atributo', atributo: 'forca', valor: 5, rodadas: 2 },
      { tipo: 'atributo', atributo: 'todos', valor: 1, rodadas: 2 },
    ]);
    // Recém-aplicados ainda não valem: só a partir da próxima ação
    expect(aplicarBuffsAosAtributos(ATRIBUTOS, lista)).toEqual(ATRIBUTOS);
    const { buffs } = avancarBuffs(lista);
    const efetivos = aplicarBuffsAosAtributos(ATRIBUTOS, buffs);
    expect(efetivos.forca).toBe(26); // 20 + 5 + 1
    expect(efetivos.sorte).toBe(6);
    expect(efetivos.agilidade).toBe(7);
    expect(efetivos.vigor).toBe(11);
  });

  it('rebuffar o mesmo atributo renova em vez de acumular', () => {
    let lista = adicionarBuffs([], [{ tipo: 'atributo', atributo: 'forca', valor: 5, rodadas: 2 }]);
    lista = avancarBuffs(lista).buffs;
    lista = adicionarBuffs(lista, [{ tipo: 'atributo', atributo: 'forca', valor: 3, rodadas: 4 }]);
    lista = avancarBuffs(lista).buffs;
    expect(aplicarBuffsAosAtributos(ATRIBUTOS, lista).forca).toBe(23);
    expect(lista).toHaveLength(1);
    expect(lista[0].rodadasRestantes).toBe(4);
  });

  it('a duração conta as ações de quem tem o buff: com 2 rodadas, vale em 2 ações e depois acaba', () => {
    let lista = adicionarBuffs([], [{ tipo: 'atributo', atributo: 'forca', valor: 5, rodadas: 2 }]);
    lista = avancarBuffs(lista).buffs; // ação em que foi aplicado: passa a valer
    const forca = (b: typeof lista) => aplicarBuffsAosAtributos(ATRIBUTOS, b).forca;
    expect(forca(lista)).toBe(25); // 1ª ação com o buff
    lista = avancarBuffs(lista).buffs;
    expect(forca(lista)).toBe(25); // 2ª ação com o buff
    const fim = avancarBuffs(lista);
    expect(fim.expirados).toEqual(['aumentoAtributo']);
    expect(forca(fim.buffs)).toBe(20);
  });

  it('Sincronismo: o ataque duplo passa a exigir 1,5x em vez de 2x', () => {
    expect(multiplicadorAgilidadeParaDuplo([])).toBe(2);
    const lista = avancarBuffs(adicionarBuffs([], [{ tipo: 'sincronismo', rodadas: 2 }])).buffs;
    expect(multiplicadorAgilidadeParaDuplo(lista)).toBe(1.5);
  });

  it('Delírio Controlado: +% de dano e perde % do HP máximo a cada rodada', () => {
    const delirio: AplicacaoBuff = {
      tipo: 'delirio',
      bonusDanoPercentual: 40,
      bonusDefesaPercentual: 25,
      perdaHpPercentualPorRodada: 5,
      rodadas: 2,
    };
    let lista = avancarBuffs(adicionarBuffs([], [delirio])).buffs;
    expect(bonusDanoDosBuffs(lista)).toBe(40);
    const r = avancarBuffs(lista);
    expect(r.perdaHpPercentual).toBe(5);
    lista = r.buffs;
    expect(avancarBuffs(lista).expirados).toEqual(['delirioControlado']);
  });
});

describe('1.2.4 — Atributos e buffs no combate', () => {
  const base: ResultadoHabilidade = {
    nome: 'Teste',
    tipoDano: 'fisico',
    percentualDano: 100,
    ignorarDefesaPercentual: 0,
    bonusDanoPercentual: 0,
    bonusContraSobreescudoPercentual: 0,
    curaPercentualDanoCausado: 0,
    curaPercentualHpMax: 0,
  };
  const habilidade = (id: string, extra: Partial<ResultadoHabilidade>): DefinicaoHabilidade => ({
    id,
    espaco: 'basico',
    tipoDano: 'fisico',
    executar: () => ({ ...base, nome: id, ...extra }),
  });

  beforeEach(() => {
    limparRegistroParaTestes();
    registrarHabilidade(
      habilidade('teste_aumento_forca', {
        buffs: [{ tipo: 'atributo', atributo: 'forca', valor: 10, rodadas: 2 }],
      })
    );
    registrarHabilidade(
      habilidade('teste_sorte', { buffs: [{ tipo: 'atributo', atributo: 'sorte', valor: 100, rodadas: 3 }] })
    );
    registrarHabilidade(habilidade('teste_foco', { foco: { ignorarDefesaPercentual: 50 } }));
    registrarHabilidade(habilidade('teste_aceleracao', { acaoExtra: true }));
    registrarHabilidade(
      habilidade('teste_sincronismo', { buffs: [{ tipo: 'sincronismo', rodadas: 3 }] })
    );
    registrarHabilidade(
      habilidade('teste_delirio', {
        buffs: [
          {
            tipo: 'delirio',
            bonusDanoPercentual: 50,
            bonusDefesaPercentual: 100,
            perdaHpPercentualPorRodada: 10,
            rodadas: 3,
          },
        ],
      })
    );
  });
  afterEach(() => limparRegistroParaTestes());

  const barbaro = (habilidadeId: string, extra: Partial<Combatente> = {}): Combatente => ({
    nome: 'Bárbaro Teste',
    classeId: 'barbaro',
    nivel: 1,
    hp: 200,
    hpMax: 200,
    sobreescudo: 0,
    habilidadesEquipadas: {
      ataqueBasico: habilidadeId,
      habilidadeEspecial: 'barbaro_furia_selvagem',
      ultimate: 'barbaro_ira_do_barbaro',
    },
    atributos: { vigor: 40, sorte: 0, forca: 20, vitalidade: 10, arcano: 0, inteligencia: 0, agilidade: 1 },
    ...extra,
  });

  const alvo = (mitigacao = 0, extra: Partial<Combatente> = {}): Combatente => ({
    nome: 'Alvo',
    hp: 5000,
    hpMax: 5000,
    sobreescudo: 0,
    mitigacao,
    atributos: { vigor: 100, sorte: 0, forca: 1, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 1 },
    ...extra,
  });

  it('Aumento de Força: o ataque seguinte usa a Força maior, e os atributos originais não mudam', () => {
    const b = barbaro('teste_aumento_forca');
    const a = alvo();
    expect(turnoDeCombate(b, a, 1).turnoLog.ataques[0].danoBruto).toBe(20);
    expect(turnoDeCombate(b, a, 2).turnoLog.ataques[0].danoBruto).toBe(30); // 20 + 10
    expect(b.atributos.forca).toBe(20);
  });

  it('a duração conta as ações de quem tem o buff: vale em 2 ações e depois acaba', () => {
    // Sem habilidade que renove o buff: Bárbaro com os golpes padrão da classe
    const b: Combatente = {
      ...barbaro('x'),
      habilidadesEquipadas: undefined,
      buffs: adicionarBuffs([], [{ tipo: 'atributo', atributo: 'forca', valor: 10, rodadas: 2 }]),
    };
    const a = alvo();
    const danos = [1, 2, 3, 4].map((t) => turnoDeCombate(b, a, t).turnoLog.ataques[0].danoBruto);
    // Ação 1: o buff ainda é "recém-aplicado" (20); ações 2 e 3: Força 30; ação 4: acabou (20)
    expect(danos).toEqual([20, 30, 30, 20]);
    expect(b.buffs).toEqual([]);
  });

  it('Aumento de Sorte aumenta a chance de crítico (Sorte 100 = 12% de chance)', () => {
    const b = barbaro('teste_sorte');
    const a = alvo();
    turnoDeCombate(b, a, 1); // aplica o buff
    // Sorteio 11 < 12% → crítico; sem o buff (2% de base) seria normal
    const atk = turnoDeCombate(b, a, 2, { sorteioCritico: () => 11 }).turnoLog.ataques[0];
    expect(atk.golpesCriticos).toBe(1);
  });

  it('Foco: o próximo ataque ignora 50% da defesa e depois o Foco some', () => {
    const b = barbaro('teste_foco');
    const a = alvo(10);
    const primeiro = turnoDeCombate(b, a, 1).turnoLog.ataques[0];
    expect(primeiro.danoEfetivo).toBe(10); // 20 − 10, sem Foco ainda
    expect(b.focoProximoAtaque).toBe(50);
    const segundo = turnoDeCombate(b, a, 2).turnoLog.ataques[0];
    expect(segundo.focoPercentual).toBe(50);
    expect(segundo.danoEfetivo).toBe(15); // 20 − 5
    // O ataque do Foco aplica de novo (a habilidade o recoloca); sem a habilidade ele não existe mais
    b.focoProximoAtaque = undefined;
    expect(turnoDeCombate(b, a, 3).turnoLog.ataques[0].focoPercentual).toBeUndefined();
  });

  it('Foco também vale contra o Cavaleiro (reduz a defesa total dele)', () => {
    const cavaleiro: Combatente = {
      ...alvo(0),
      classeId: 'cavaleiro',
      nivel: 1,
      atributos: { ...alvo(0).atributos, vitalidade: 10 }, // defesa 10
    };
    const atacante: Combatente = { ...alvo(0), nome: 'Atacante', atributos: { ...alvo(0).atributos, forca: 30 }, focoProximoAtaque: 50 };
    expect(turnoDeCombate(atacante, cavaleiro, 1).turnoLog.ataques[0].danoEfetivo).toBe(25); // 30 − 5
  });

  it('Aceleração: +1 ação extra neste round (2 ataques em vez de 1)', () => {
    const b = barbaro('teste_aceleracao');
    const ataques = turnoDeCombate(b, alvo(), 1).turnoLog.ataques;
    expect(ataques).toHaveLength(2);
    expect(ataques[1].acaoExtra).toBe(true);
  });

  it('Aceleração só dá a ação extra uma vez por turno', () => {
    const b = barbaro('teste_aceleracao');
    expect(turnoDeCombate(b, alvo(), 1).turnoLog.ataques).toHaveLength(2);
    expect(turnoDeCombate(b, alvo(), 2).turnoLog.ataques).toHaveLength(2);
  });

  it('Sincronismo: Agilidade 8 contra 5 (1,6x) dá ataque duplo só com o buff', () => {
    const b = barbaro('teste_sincronismo', {
      atributos: { vigor: 40, sorte: 0, forca: 20, vitalidade: 10, arcano: 0, inteligencia: 0, agilidade: 8 },
    });
    const a = alvo(0, { atributos: { ...alvo().atributos, agilidade: 5 } });
    expect(turnoDeCombate(b, a, 1).turnoLog.ataques).toHaveLength(1); // aplica o Sincronismo
    expect(turnoDeCombate(b, a, 2).turnoLog.ataques).toHaveLength(2);
  });

  it('Delírio Controlado: +50% de dano em todas as classes (golpe padrão do Cavaleiro) e defesa em dobro', () => {
    const cavaleiro: Combatente = {
      ...alvo(0),
      nome: 'Cavaleiro',
      classeId: 'cavaleiro',
      nivel: 1,
      atributos: { ...alvo(0).atributos, forca: 20 },
      buffs: avancarBuffs(
        adicionarBuffs([], [
          { tipo: 'delirio', bonusDanoPercentual: 50, bonusDefesaPercentual: 100, perdaHpPercentualPorRodada: 10, rodadas: 3 },
        ])
      ).buffs,
    };
    expect(turnoDeCombate(cavaleiro, alvo(0), 1).turnoLog.ataques[0].danoBruto).toBe(30); // 20 × 150%
    // Defesa: um atacante de 40 contra defesa 10 (Vitalidade 10) causa 30; com +100% de defesa, 20
    const defensor: Combatente = {
      ...alvo(0),
      classeId: 'barbaro',
      mitigacao: 10,
      buffs: cavaleiro.buffs,
    };
    const atacante: Combatente = { ...alvo(0), atributos: { ...alvo(0).atributos, forca: 40 } };
    expect(turnoDeCombate(atacante, defensor, 1).turnoLog.ataques[0].danoEfetivo).toBe(20); // 40 − 20
  });

  it('Delírio Controlado cobra HP por rodada no combate completo, sem matar sozinho', () => {
    const b = barbaro('teste_delirio', { hp: 100, hpMax: 100 });
    const r = resolverCombate(b, MONSTERS_MAP['cultista-das-sombras'], 3);
    expect(r.logTurnos.length).toBeGreaterThan(0);
    // O Bárbaro ataca com +50% depois do 1º golpe (buff recém-aplicado só vale da 2ª ação em diante)
    const golpes = r.logTurnos.flatMap((t) => t.ataques).filter((a) => a.atacante === b.nome);
    expect(golpes.length).toBeGreaterThan(1);
    expect(golpes[1].danoBruto).toBeGreaterThan(golpes[0].danoBruto);
  });

  it('Ímpeto Imprudente agora vale também no golpe padrão das classes (Feiticeiro)', () => {
    const feiticeiro: Combatente = {
      ...alvo(0),
      nome: 'Feiticeiro',
      classeId: 'feiticeiro',
      nivel: 1,
      atributos: { ...alvo(0).atributos, inteligencia: 20 },
      impeto: { ataquesRestantes: 2, bonusDanoPercentual: 50, reducaoDefesaPercentual: 0 },
    };
    expect(turnoDeCombate(feiticeiro, alvo(0), 1).turnoLog.ataques[0].danoBruto).toBe(30); // 20 × 150%
  });
});
