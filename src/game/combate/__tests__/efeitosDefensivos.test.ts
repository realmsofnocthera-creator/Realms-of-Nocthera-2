import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Combatente, resolverCombate, turnoDeCombate } from '@/game/combat';
import { calcularSobreescudoMax } from '@/game';
import {
  AplicacaoEfeitoDefensivo,
  EfeitoDefensivoAtivo,
  adicionarEfeitoDefensivo,
  avancarRodadaEfeitosDefensivos,
  calcularDanoRedirecionado,
  reducaoContrapesoPercentual,
  reducaoDanoRecebidoPorEfeitos,
} from '@/game/combate/efeitosDefensivos';
import {
  DefinicaoHabilidade,
  limparRegistroParaTestes,
  registrarHabilidade,
} from '@/game/combate/habilidades';
import { MONSTERS_MAP } from '@/rules/monsters';

/** 1.2.4 — Catálogo, categoria Mitigação e defesa. */

const ativo = (
  efeito: EfeitoDefensivoAtivo['efeito'],
  valorPercentual: number,
  rodadasRestantes = 1,
  escudoRestante?: number
): EfeitoDefensivoAtivo => ({ efeito, valorPercentual, rodadasRestantes, escudoRestante });

function atacanteFisico(forca = 30): Combatente {
  return {
    nome: 'Atacante',
    hp: 100,
    hpMax: 100,
    sobreescudo: 0,
    atributos: { vigor: 20, sorte: 0, forca, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 1 },
  };
}

function defensor(mitigacao: number, efeitos: EfeitoDefensivoAtivo[], extra: Partial<Combatente> = {}): Combatente {
  return {
    nome: 'Defensor',
    hp: 1000,
    hpMax: 1000,
    sobreescudo: 0,
    mitigacao,
    efeitosDefensivos: efeitos,
    atributos: { vigor: 200, sorte: 0, forca: 1, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 1 },
    ...extra,
  };
}

const golpe = (atk: Combatente, def: Combatente) => turnoDeCombate(atk, def, 1).turnoLog.ataques[0];

describe('1.2.4 — Mitigação e defesa: funções puras', () => {
  it('Contrapeso: 15% com HP cheio, caindo em linha reta até 0%', () => {
    expect(reducaoContrapesoPercentual(0, 100, 100)).toBe(15);
    expect(reducaoContrapesoPercentual(0, 50, 100)).toBe(7.5);
    expect(reducaoContrapesoPercentual(0, 0, 100)).toBe(0);
    expect(reducaoContrapesoPercentual(20, 100, 100)).toBe(20); // valor próprio da habilidade
  });

  it('as reduções somam; a Absorção Mágica só conta contra dano mágico', () => {
    const lista = [ativo('resistenciaFisica', 20), ativo('contrapeso', 0), ativo('absorcaoMagica', 30)];
    expect(reducaoDanoRecebidoPorEfeitos(lista, { ehDanoFisico: true, hp: 100, hpMax: 100 })).toBe(35);
    expect(reducaoDanoRecebidoPorEfeitos(lista, { ehDanoFisico: false, hp: 100, hpMax: 100 })).toBe(45);
  });

  it('Escudo Temporário: dá X% do Sobreescudo máximo; renovar substitui o que sobrou', () => {
    const aplic: AplicacaoEfeitoDefensivo = { efeito: 'escudoTemporario', valorPercentual: 20, duracaoRodadas: 2 };
    const primeiro = adicionarEfeitoDefensivo([], aplic, 100);
    expect(primeiro.sobreescudoGanho).toBe(20);
    expect(primeiro.efeitos[0].escudoRestante).toBe(20);

    const sobra = [{ ...primeiro.efeitos[0], escudoRestante: 7 }];
    const renovado = adicionarEfeitoDefensivo(sobra, aplic, 100);
    expect(renovado.sobreescudoRemovido).toBe(7);
    expect(renovado.sobreescudoGanho).toBe(20);
    expect(renovado.efeitos).toHaveLength(1);
  });

  it('a duração cai a cada turno do inimigo; o escudo temporário que sobrou é retirado', () => {
    const lista = [ativo('resistenciaFisica', 10, 2), ativo('escudoTemporario', 20, 1, 5)];
    const r = avancarRodadaEfeitosDefensivos(lista);
    expect(r.efeitos).toEqual([ativo('resistenciaFisica', 10, 1)]);
    expect(r.expirados).toEqual(['escudoTemporario']);
    expect(r.sobreescudoRemovido).toBe(5);
  });

  it('Redirecionamento devolve X% do dano recebido, arredondado para baixo', () => {
    expect(calcularDanoRedirecionado(25, 50)).toBe(12);
    expect(calcularDanoRedirecionado(0, 50)).toBe(0);
    expect(calcularDanoRedirecionado(25, 0)).toBe(0);
  });
});

describe('1.2.4 — Mitigação e defesa no turno de combate', () => {
  it('Resistência Física: −20% de dano físico recebido (30 → 24, menos 10 de defesa = 14)', () => {
    expect(golpe(atacanteFisico(), defensor(10, [])).danoEfetivo).toBe(20);
    const atk = golpe(atacanteFisico(), defensor(10, [ativo('resistenciaFisica', 20)]));
    expect(atk.danoBruto).toBe(24);
    expect(atk.danoEfetivo).toBe(14);
  });

  it('Resistência Mágica não reduz dano físico', () => {
    expect(golpe(atacanteFisico(), defensor(10, [ativo('resistenciaMagica', 50)])).danoEfetivo).toBe(20);
  });

  it('as reduções somam com teto de 80%: 50% + 15% de Contrapeso = 65%; 90% vira 80%', () => {
    expect(
      golpe(atacanteFisico(), defensor(0, [ativo('resistenciaFisica', 50), ativo('contrapeso', 0)])).danoEfetivo
    ).toBe(10); // floor(30 × 35%) = 10
    expect(golpe(atacanteFisico(), defensor(0, [ativo('resistenciaFisica', 90)])).danoEfetivo).toBe(6); // 30 × 20%
  });

  it('Imortalidade Breve: o golpe não tira nada', () => {
    const def = defensor(0, [ativo('imortalidadeBreve', 0)], { sobreescudo: 5 });
    const atk = golpe(atacanteFisico(), def);
    expect(atk.danoEfetivo).toBe(0);
    expect(atk.imortalidadeBreve).toBe(true);
    expect(def.hp).toBe(1000);
    expect(def.sobreescudo).toBe(5);
    expect(atk.mensagem).toContain('Imortalidade Breve');
  });

  it('Redirecionamento: 50% dos 20 de dano recebido voltam para o atacante', () => {
    const atacante = atacanteFisico();
    const atk = golpe(atacante, defensor(10, [ativo('redirecionamento', 50)]));
    expect(atk.danoEfetivo).toBe(20);
    expect(atk.danoRedirecionado).toBe(10);
    expect(atacante.hp).toBe(90);
  });

  it('Absorção Mágica: reduz o primeiro ataque mágico e depois some', () => {
    const feiticeiro: Combatente = {
      ...atacanteFisico(0),
      classeId: 'feiticeiro',
      nivel: 1,
      atributos: { ...atacanteFisico(0).atributos, inteligencia: 30 },
    };
    const def = defensor(0, [ativo('absorcaoMagica', 50, 5)]);
    expect(turnoDeCombate(feiticeiro, def, 1).turnoLog.ataques[0].danoEfetivo).toBe(15);
    expect(def.efeitosDefensivos).toEqual([]);
    expect(turnoDeCombate(feiticeiro, def, 2).turnoLog.ataques[0].danoEfetivo).toBe(30);
  });

  it('Absorção Mágica não é gasta por ataque físico', () => {
    const def = defensor(0, [ativo('absorcaoMagica', 50, 5)]);
    expect(golpe(atacanteFisico(), def).danoEfetivo).toBe(30);
    expect(def.efeitosDefensivos).toHaveLength(1);
  });

  it('Escudo Temporário: o Sobreescudo gasto sai dele primeiro', () => {
    const def = defensor(10, [ativo('escudoTemporario', 20, 1, 20)], { sobreescudo: 30 });
    golpe(atacanteFisico(), def); // 20 de dano no escudo
    expect(def.sobreescudo).toBe(10);
    expect(def.efeitosDefensivos?.[0].escudoRestante).toBe(0);
  });

  it('Cavaleiro defendendo: a resistência entra na soma das reduções dele', () => {
    const cav = (efeitos: EfeitoDefensivoAtivo[]) =>
      defensor(0, efeitos, {
        classeId: 'cavaleiro',
        nivel: 1,
        atributos: { vigor: 200, sorte: 0, forca: 1, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 1 },
      });
    expect(golpe(atacanteFisico(), cav([])).danoEfetivo).toBe(30);
    expect(golpe(atacanteFisico(), cav([ativo('resistenciaFisica', 20)])).danoEfetivo).toBe(24);
  });
});

describe('1.2.4 — habilidade do registro aplicando efeitos em quem a usa', () => {
  const HABILIDADE_TESTE: DefinicaoHabilidade = {
    id: 'teste_guarda_de_pedra',
    espaco: 'basico',
    tipoDano: 'fisico',
    executar: () => ({
      nome: 'Guarda de Pedra',
      tipoDano: 'fisico',
      percentualDano: 100,
      ignorarDefesaPercentual: 0,
      bonusDanoPercentual: 0,
      bonusContraSobreescudoPercentual: 0,
      curaPercentualDanoCausado: 0,
      curaPercentualHpMax: 0,
      efeitosNoUsuario: [
        { efeito: 'resistenciaFisica', valorPercentual: 30, duracaoRodadas: 2 },
        { efeito: 'escudoTemporario', valorPercentual: 50, duracaoRodadas: 2 },
      ],
    }),
  };

  const IMORTAL: DefinicaoHabilidade = {
    ...HABILIDADE_TESTE,
    id: 'teste_imortal',
    executar: () => ({
      ...HABILIDADE_TESTE.executar({} as never),
      nome: 'Pele de Pedra',
      efeitosNoUsuario: [{ efeito: 'imortalidadeBreve', valorPercentual: 0, duracaoRodadas: 1 }],
    }),
  };

  beforeEach(() => {
    limparRegistroParaTestes();
    registrarHabilidade(HABILIDADE_TESTE);
    registrarHabilidade(IMORTAL);
  });
  afterEach(() => limparRegistroParaTestes());

  const barbaro = (habilidadeId: string): Combatente => ({
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
    atributos: { vigor: 40, sorte: 0, forca: 10, vitalidade: 10, arcano: 0, inteligencia: 0, agilidade: 5 },
  });

  it('coloca os efeitos e soma o Escudo Temporário ao Sobreescudo', () => {
    const b = barbaro('teste_guarda_de_pedra');
    const atk = golpe(b, defensor(0, []));
    expect(atk.efeitosDefensivosAplicados).toEqual(['resistenciaFisica', 'escudoTemporario']);
    const escudoMax = calcularSobreescudoMax(10, { classeId: 'barbaro', nivel: 1 }); // 20
    expect(b.sobreescudo).toBe(Math.ceil(escudoMax * 0.5)); // +10
    expect(b.efeitosDefensivos?.map((e) => e.efeito)).toEqual(['resistenciaFisica', 'escudoTemporario']);
  });

  it('no combate completo, a Imortalidade Breve de 1 rodada protege do próximo turno do monstro', () => {
    const b = barbaro('teste_imortal');
    b.atributos.agilidade = 1; // age na mesma ordem do monstro, uma ação por rodada
    const monstro = MONSTERS_MAP['cultista-das-sombras'];
    const r = resolverCombate(b, monstro, 4242);
    const ataques = r.logTurnos.flatMap((t) => t.ataques);
    const primeiraAcaoBarbaro = ataques.findIndex((a) => a.atacante === b.nome);
    // Antes da 1ª ação do Bárbaro, o monstro bate normalmente
    expect(ataques.slice(0, primeiraAcaoBarbaro).every((a) => a.danoEfetivo > 0)).toBe(true);
    // Toda ação do Bárbaro renova a Imortalidade: daí em diante, os ataques do monstro não causam dano
    const depoisDaPrimeiraAcao = ataques
      .slice(primeiraAcaoBarbaro)
      .filter((a) => a.atacante === monstro.nome);
    expect(depoisDaPrimeiraAcao.length).toBeGreaterThan(0);
    for (const a of depoisDaPrimeiraAcao) {
      expect(a.danoEfetivo).toBe(0);
      expect(a.imortalidadeBreve).toBe(true);
    }
  });
});
