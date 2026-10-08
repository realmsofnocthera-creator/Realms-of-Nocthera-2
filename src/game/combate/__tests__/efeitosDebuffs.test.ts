import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Combatente, resolverCombate, turnoDeCombate } from '@/game/combat';
import { calcularDanoEfeito, formatarEventoEfeito } from '@/game/statusEffects';
import {
  adicionarDebuffs,
  agilidadeComExaustao,
  avancarDebuffs,
  bonusDanoDosDebuffs,
  consumirDistracao,
  estaDistraido,
  fatorCuraPercentual,
  percentualPontoFraco,
  reducaoDefesaPorPressao,
} from '@/game/combate/efeitosDebuffs';
import {
  DefinicaoHabilidade,
  ResultadoHabilidade,
  limparRegistroParaTestes,
  registrarHabilidade,
} from '@/game/combate/habilidades';
import { MONSTERS_MAP } from '@/rules/monsters';

/** 1.2.4 — Catálogo, categoria Debuffs e controle. */

describe('1.2.4 — Debuffs e controle: funções puras', () => {
  it('Enfraquecimento vira bônus de dano negativo; Cicatrização reduz a eficácia das curas', () => {
    const lista = adicionarDebuffs([], [
      { tipo: 'enfraquecimento', percentual: 25, rodadas: 2 },
      { tipo: 'cicatrizacao', percentual: 40, rodadas: 2 },
    ]);
    expect(bonusDanoDosDebuffs(lista)).toBe(-25);
    expect(fatorCuraPercentual(lista)).toBe(60);
    expect(bonusDanoDosDebuffs([])).toBe(0);
    expect(fatorCuraPercentual([])).toBe(100);
  });

  it('Ponto Fraco: guarda o % do próximo dano recebido', () => {
    const lista = adicionarDebuffs([], [{ tipo: 'pontoFraco', percentual: 30 }]);
    expect(percentualPontoFraco(lista)).toBe(30);
  });

  it('Pressão: só reduz a defesa com o HP do alvo abaixo do limite', () => {
    const lista = adicionarDebuffs([], [{ tipo: 'pressao', percentualDefesa: 40, limiteHpPercentual: 50, rodadas: 3 }]);
    expect(reducaoDefesaPorPressao(lista, 60, 100)).toBe(0);
    expect(reducaoDefesaPorPressao(lista, 49, 100)).toBe(40);
    expect(reducaoDefesaPorPressao(lista, 50, 100)).toBe(0); // 50% exatos: não está abaixo
  });

  it('Exaustão: Agilidade −30% (arredondada para baixo)', () => {
    const lista = adicionarDebuffs([], [{ tipo: 'exaustao', percentual: 30, rodadas: 2 }]);
    expect(agilidadeComExaustao(10, lista)).toBe(7);
    expect(agilidadeComExaustao(5, lista)).toBe(3); // 3,5 → 3
    expect(agilidadeComExaustao(10, [])).toBe(10);
  });

  it('Distração: perde a ação e some; com 2 ações perde as duas', () => {
    let lista = adicionarDebuffs([], [{ tipo: 'distracao', acoes: 2 }]);
    expect(estaDistraido(lista)).toBe(true);
    lista = consumirDistracao(lista);
    expect(estaDistraido(lista)).toBe(true);
    lista = consumirDistracao(lista);
    expect(estaDistraido(lista)).toBe(false);
  });

  it('a duração conta as ações de quem sofre; Ponto Fraco e Distração não expiram por tempo', () => {
    let lista = adicionarDebuffs([], [
      { tipo: 'enfraquecimento', percentual: 25, rodadas: 2 },
      { tipo: 'pontoFraco', percentual: 30 },
      { tipo: 'distracao', acoes: 1 },
    ]);
    lista = avancarDebuffs(lista).debuffs;
    expect(lista.map((d) => d.tipo).sort()).toEqual(['distracao', 'enfraquecimento', 'pontoFraco']);
    const r = avancarDebuffs(lista);
    expect(r.expirados).toEqual(['enfraquecimento']);
  });

  it('o mesmo debuff renova (valor e duração novos)', () => {
    let lista = adicionarDebuffs([], [{ tipo: 'enfraquecimento', percentual: 10, rodadas: 1 }]);
    lista = adicionarDebuffs(lista, [{ tipo: 'enfraquecimento', percentual: 40, rodadas: 3 }]);
    expect(lista).toHaveLength(1);
    expect(bonusDanoDosDebuffs(lista)).toBe(-40);
  });
});

describe('1.2.4 — Debuffs e controle no combate', () => {
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
    registrarHabilidade(habilidade('teste_enfraquece', { efeitosNoAlvo: [{ tipo: 'enfraquecimento', percentual: 50, rodadas: 2 }] }));
    registrarHabilidade(habilidade('teste_ponto_fraco', { efeitosNoAlvo: [{ tipo: 'pontoFraco', percentual: 50 }] }));
    registrarHabilidade(habilidade('teste_pressao', { efeitosNoAlvo: [{ tipo: 'pressao', percentualDefesa: 100, limiteHpPercentual: 50, rodadas: 3 }] }));
    registrarHabilidade(habilidade('teste_exaustao', { efeitosNoAlvo: [{ tipo: 'exaustao', percentual: 30, rodadas: 2 }] }));
    registrarHabilidade(habilidade('teste_distracao', { efeitosNoAlvo: [{ tipo: 'distracao', acoes: 1 }] }));
    registrarHabilidade(habilidade('teste_cicatriza', { efeitosNoAlvo: [{ tipo: 'cicatrizacao', percentual: 50, rodadas: 3 }] }));
    registrarHabilidade(habilidade('teste_sangramento', { statusForcadosNoAlvo: ['sangramento'] }));
    registrarHabilidade(habilidade('teste_inversao', { inversaoDeSorte: { percentualHpMaxAlvo: 10 } }));
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
    atributos: { vigor: 40, sorte: 0, forca: 20, vitalidade: 10, arcano: 0, inteligencia: 0, agilidade: 5 },
    ...extra,
  });

  const alvo = (mitigacao = 0, extra: Partial<Combatente> = {}): Combatente => ({
    nome: 'Alvo',
    hp: 1000,
    hpMax: 1000,
    sobreescudo: 0,
    mitigacao,
    atributos: { vigor: 100, sorte: 0, forca: 30, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 5 },
    ...extra,
  });

  it('Enfraquecimento: o alvo passa a causar −50% de dano por 2 ações dele', () => {
    const b = barbaro('teste_enfraquece');
    const a = alvo();
    turnoDeCombate(b, a, 1); // aplica
    expect(a.debuffs?.[0].tipo).toBe('enfraquecimento');
    const dano = (t: number) => turnoDeCombate(a, barbaro('teste_enfraquece', { hp: 5000, hpMax: 5000 }), t).turnoLog.ataques[0].danoBruto;
    expect(dano(2)).toBe(15); // 30 − 50%
    expect(dano(3)).toBe(15);
    expect(dano(4)).toBe(30); // acabou
  });

  it('Ponto Fraco: o próximo golpe que o alvo receber causa +50% e o Ponto Fraco é consumido', () => {
    const b = barbaro('teste_ponto_fraco');
    const a = alvo();
    expect(turnoDeCombate(b, a, 1).turnoLog.ataques[0].danoBruto).toBe(20); // aplica; este golpe não o usa
    const segundo = turnoDeCombate(b, a, 2).turnoLog.ataques[0];
    expect(segundo.danoBruto).toBe(30);
    expect(segundo.pontoFracoConsumido).toBe(50);
    // A habilidade aplica de novo no mesmo golpe; sem ela, o terceiro golpe voltaria ao normal
    a.debuffs = [];
    expect(turnoDeCombate(b, a, 3).turnoLog.ataques[0].pontoFracoConsumido).toBeUndefined();
  });

  it('Pressão: com o HP do alvo abaixo de 50%, ele perde toda a defesa (100%)', () => {
    const atacante: Combatente = { ...alvo(0), atributos: { ...alvo().atributos, forca: 40 } };
    const comPressao = alvo(10, {
      hp: 400,
      debuffs: adicionarDebuffs([], [{ tipo: 'pressao', percentualDefesa: 100, limiteHpPercentual: 50, rodadas: 3 }]),
    });
    expect(turnoDeCombate(atacante, comPressao, 1).turnoLog.ataques[0].danoEfetivo).toBe(40); // sem defesa
    const cheio = alvo(10, { debuffs: comPressao.debuffs });
    expect(turnoDeCombate(atacante, cheio, 1).turnoLog.ataques[0].danoEfetivo).toBe(30); // HP cheio: defesa normal
  });

  it('Pressão também vale contra o Cavaleiro', () => {
    const atacante: Combatente = { ...alvo(0), atributos: { ...alvo().atributos, forca: 40 } };
    const cavaleiro = alvo(0, {
      classeId: 'cavaleiro',
      nivel: 1,
      hp: 400,
      atributos: { ...alvo().atributos, vitalidade: 10 },
      debuffs: adicionarDebuffs([], [{ tipo: 'pressao', percentualDefesa: 100, limiteHpPercentual: 50, rodadas: 3 }]),
    });
    expect(turnoDeCombate(atacante, cavaleiro, 1).turnoLog.ataques[0].danoEfetivo).toBe(40);
  });

  it('Exaustão: a Agilidade do alvo cai 30% e o ataque duplo passa a depender disso', () => {
    // Bárbaro Agilidade 5 contra alvo Agilidade 10: sem Exaustão não há ataque duplo (precisa de 2x)
    const b = barbaro('teste_exaustao');
    const a = alvo(0, { atributos: { ...alvo().atributos, agilidade: 10 } });
    expect(turnoDeCombate(b, a, 1).turnoLog.ataques).toHaveLength(1);
    // Com Exaustão: 10 → 7; 5 < 14, continua sem ataque duplo
    expect(turnoDeCombate(b, a, 2).turnoLog.ataques).toHaveLength(1);
    // Alvo de Agilidade 8: com Exaustão vira 5 (floor 5,6) e o Bárbaro (5) não dobra; com 10 de Agilidade dele, dobraria
    const rapido = barbaro('teste_exaustao', {
      atributos: { vigor: 40, sorte: 0, forca: 20, vitalidade: 10, arcano: 0, inteligencia: 0, agilidade: 10 },
    });
    const alvoAgil = alvo(0, { atributos: { ...alvo().atributos, agilidade: 14 } });
    expect(turnoDeCombate(rapido, alvoAgil, 1).turnoLog.ataques).toHaveLength(1); // 10 < 28
    expect(turnoDeCombate(rapido, alvoAgil, 2).turnoLog.ataques).toHaveLength(1); // alvo 14 → 9; 10 < 18
  });

  it('Exaustão: contra uma Agilidade que cai o suficiente, o ataque duplo passa a valer', () => {
    // Alvo com Agilidade 10 vira 7: um atacante com Agilidade 14 passa a ter o dobro (14 ≥ 14)
    const atacante = barbaro('teste_exaustao', {
      habilidadesEquipadas: undefined,
      atributos: { vigor: 40, sorte: 0, forca: 20, vitalidade: 10, arcano: 0, inteligencia: 0, agilidade: 14 },
    });
    const normal = alvo(0, { atributos: { ...alvo().atributos, agilidade: 10 } });
    expect(turnoDeCombate(atacante, normal, 1).turnoLog.ataques).toHaveLength(1);
    const exausto = alvo(0, {
      atributos: { ...alvo().atributos, agilidade: 10 },
      debuffs: adicionarDebuffs([], [{ tipo: 'exaustao', percentual: 30, rodadas: 2 }]),
    });
    expect(turnoDeCombate(atacante, exausto, 1).turnoLog.ataques).toHaveLength(2);
  });

  it('Distração: o alvo perde a próxima ação e depois volta a agir', () => {
    const b = barbaro('teste_distracao');
    const a = alvo();
    turnoDeCombate(b, a, 1); // aplica
    const perdida = turnoDeCombate(a, barbaro('teste_distracao'), 2).turnoLog.ataques[0];
    expect(perdida.distraido).toBe(true);
    expect(perdida.danoEfetivo).toBe(0);
    expect(perdida.mensagem).toContain('distraído');
    const seguinte = turnoDeCombate(a, barbaro('teste_distracao'), 3).turnoLog.ataques[0];
    expect(seguinte.distraido).toBeUndefined();
    expect(seguinte.danoEfetivo).toBeGreaterThan(0);
  });

  it('Cicatrização: a cura do alvo cai pela metade (Sede de Sangue do Vampiro)', () => {
    const curaNormal = (extra: Partial<Combatente> = {}) => {
      const vampiro: Combatente = { ...barbaro('teste_cicatriza'), racaId: 'vampiro', habilidadesEquipadas: undefined, hp: 100, ...extra };
      turnoDeCombate(vampiro, alvo(), 1);
      return vampiro.hp - 100;
    };
    const normal = curaNormal();
    const cicatrizado = curaNormal({
      debuffs: adicionarDebuffs([], [{ tipo: 'cicatrizacao', percentual: 50, rodadas: 3 }]),
    });
    expect(normal).toBeGreaterThan(0);
    expect(cicatrizado).toBeCloseTo(normal / 2, 5);
  });

  it('Cicatrização reduz a Cura Direta de uma habilidade do próprio alvo', () => {
    registrarHabilidade(
      habilidade('teste_cura', { efeitosCura: [{ efeito: 'curaDireta', percentualHpMax: 20 }] })
    );
    const curar = (debuffs?: Combatente['debuffs']) => {
      const b = barbaro('teste_cura', { hp: 50, debuffs });
      turnoDeCombate(b, alvo(), 1);
      return b.hp - 50;
    };
    expect(curar()).toBe(40);
    expect(curar(adicionarDebuffs([], [{ tipo: 'cicatrizacao', percentual: 50, rodadas: 3 }]))).toBe(20);
  });

  it('Sangramento Forçado: causa o dano do Sangramento no monstro sem sorteio', () => {
    const monstro = MONSTERS_MAP['cavaleiro-do-vazio'];
    const r = resolverCombate(barbaro('teste_sangramento', { hp: 2000, hpMax: 2000 }), monstro, 11, {
      rngStatus: () => 99, // o monstro nunca consegue aplicar status; só o jogador aplica
    });
    const eventos = r.logTurnos.flatMap((t) => t.eventosEfeitos);
    const noMonstro = eventos.filter((e) => e.alvo === monstro.nome);
    // O Sangramento é instantâneo: 30% do HP máximo do monstro de uma vez, sem sorteio
    const instantaneo = noMonstro.find((e) => e.tipo === 'instantaneo' && e.efeito === 'sangramento');
    expect(instantaneo?.dano).toBe(calcularDanoEfeito(monstro.hp, 30));
    expect(instantaneo?.dano).toBeGreaterThan(0);
    expect(formatarEventoEfeito(instantaneo!)).toContain(`em ${monstro.nome}`);
  });

  it('Inversão de Sorte: com Agilidade do alvo menor ou igual, ele sofre 10% do HP máximo', () => {
    const b = barbaro('teste_inversao'); // Agilidade 5
    const igual = alvo(0, { atributos: { ...alvo().atributos, agilidade: 5 } });
    const atk = turnoDeCombate(b, igual, 1).turnoLog.ataques[0];
    expect(atk.inversaoDeSorteDano).toBe(100);
    expect(igual.hp).toBe(1000 - 20 - 100);

    const maisRapido = alvo(0, { atributos: { ...alvo().atributos, agilidade: 6 } });
    const sem = turnoDeCombate(b, maisRapido, 1).turnoLog.ataques[0];
    expect(sem.inversaoDeSorteDano).toBeUndefined();
    expect(maisRapido.hp).toBe(1000 - 20);
  });
});
