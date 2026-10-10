import { describe, it, expect, beforeEach } from 'vitest';
import { Combatente, resolverCombate, turnoDeCombate } from '@/game/combat';
import {
  ContextoHabilidade,
  obterHabilidade,
  obterModificadoresPassivaSubclasse,
  registrarHabilidadesDeSubclasse,
  resolverDanoHabilidade,
} from '@/game/combate/habilidades';
import { MonsterDefinition } from '@/rules/monsters';

/** Etapa 2 — Kit do Inquisidor (Profeta de dano e punição): proposta aprovada pelo Yuri em 10/10/2026. */

const ctx = (extra: Partial<ContextoHabilidade['alvo']> = {}): ContextoHabilidade => ({
  atacante: { hp: 100, hpMax: 100, nivel: 30 },
  alvo: { hp: 1000, hpMax: 1000, sobreescudo: 0, mitigacaoFisica: 0, mitigacaoMagica: 0, ...extra },
  danoBase: 100,
});

describe('Inquisidor — habilidades', () => {
  beforeEach(() => registrarHabilidadesDeSubclasse());

  it('Sentença: 115% de dano sagrado, +15% contra Sombrio (10% da habilidade + 5% do pacote)', () => {
    const def = obterHabilidade('inquisidor_sentenca')!;
    expect(def.espaco).toBe('basico');
    const r = def.executar(ctx());
    expect(r).toMatchObject({ nome: 'Sentença', tipoDano: 'magico', percentualDano: 115, elemento: 'sagrado' });
    expect(resolverDanoHabilidade(r, ctx()).danoBruto).toBe(115);
    expect(resolverDanoHabilidade(r, ctx({ elemento: 'sombrio' })).danoBruto).toBe(133); // regra 1.2.2: 100 × 115% × (100 + 15)% = 132,25
  });

  it('Fogo Sagrado: 165% de dano, Queimadura com +20 pontos de chance e Enfraquecimento de 20% por 2 rodadas', () => {
    const def = obterHabilidade('inquisidor_fogo_sagrado')!;
    expect(def.espaco).toBe('especial');
    const r = def.executar(ctx());
    expect(r).toMatchObject({ nome: 'Fogo Sagrado', percentualDano: 165 });
    expect(resolverDanoHabilidade(r, ctx()).danoBruto).toBe(165);
    expect(r.statusComChanceNoAlvo).toEqual([{ status: 'queimadura', chanceExtraPercentual: 20 }]);
    expect(r.efeitosNoAlvo).toEqual([{ tipo: 'enfraquecimento', percentual: 20, rodadas: 2 }]);
  });

  it('Julgamento Final: 330%, ignora 15% da defesa, +25% contra Sombrio, bônus por status e cura 15% do dano', () => {
    const def = obterHabilidade('inquisidor_julgamento_final')!;
    expect(def.espaco).toBe('ultimate');
    const r = def.executar(ctx());
    expect(r).toMatchObject({ nome: 'Julgamento Final', percentualDano: 330, ignorarDefesaPercentual: 15, curaPercentualDanoCausado: 15 });
    expect(resolverDanoHabilidade(r, ctx()).danoBruto).toBe(330);
    expect(resolverDanoHabilidade(r, ctx({ elemento: 'sombrio' })).danoBruto).toBe(413); // 100 × 330% × 125% = 412,5
    // Dormindo (+15%) e Paralisado (+20%) somam no mesmo grupo
    expect(resolverDanoHabilidade(r, ctx({ condicoes: ['dormindo', 'paralisado'] })).danoBruto).toBe(446); // 100 × 330% × 135% = 445,5
  });
});

describe('Inquisidor — passiva Olhar Julgador', () => {
  it('tier 1: +6% de dano mágico e +5% contra alvo com status negativo', () => {
    const m = obterModificadoresPassivaSubclasse({ subclasseAtualId: 'inquisidor', subclasseTiers: { inquisidor: 1 }, hp: 100, hpMax: 100 });
    expect(m).toMatchObject({ bonusDanoMagicoPercentual: 6, bonusDanoMagicoContraStatusPercentual: 5, bonusDanoFisicoPercentual: 0 });
    const zero = obterModificadoresPassivaSubclasse({ subclasseAtualId: 'inquisidor', subclasseTiers: { inquisidor: 0 }, hp: 100, hpMax: 100 });
    expect(zero.bonusDanoMagicoPercentual ?? 0).toBe(0);
  });
});

describe('Inquisidor — em combate', () => {
  const inquisidor = (extra: Partial<Combatente> = {}): Combatente => ({
    nome: 'Profeta Inquisidor', classeId: 'profeta', nivel: 30, hp: 500, hpMax: 1000, sobreescudo: 0,
    subclasseAtualId: 'inquisidor', subclasseTiers: { inquisidor: 4 },
    habilidadesEquipadas: {
      ataqueBasico: 'inquisidor_sentenca',
      habilidadeEspecial: 'inquisidor_fogo_sagrado',
      ultimate: 'inquisidor_julgamento_final',
    },
    atributos: { vigor: 20, sorte: 0, forca: 1, vitalidade: 5, arcano: 0, inteligencia: 100, agilidade: 5 },
    ...extra,
  });
  const alvo = (extra: Partial<Combatente> = {}): Combatente => ({
    nome: 'Alvo', hp: 100000, hpMax: 100000, sobreescudo: 0, mitigacao: 0,
    atributos: { vigor: 100, sorte: 0, forca: 1, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 5 },
    ...extra,
  });

  it('a passiva soma +6% ao dano mágico, e +5% a mais contra alvo com status negativo', () => {
    const base = (tier: number, a: Combatente) =>
      turnoDeCombate(inquisidor({ subclasseTiers: { inquisidor: tier }, contadorBencaoDivina: 0, contadorMilagreDivino: 0 }), a, 1).turnoLog.ataques[0].danoBruto;
    const sem = base(0, alvo());
    const com = base(4, alvo());
    const comStatus = base(4, alvo({ statusAtivos: ['veneno'] }));
    expect(com).toBeGreaterThan(sem);
    expect(comStatus).toBeGreaterThan(com);
  });

  it('o Fogo Sagrado enfraquece o alvo e declara a Queimadura com chance', () => {
    const a = alvo();
    const atk = turnoDeCombate(inquisidor({ contadorBencaoDivina: 2, contadorMilagreDivino: 0 }), a, 1).turnoLog.ataques[0];
    expect(atk.habilidadeAcionada).toBe('Fogo Sagrado');
    expect(atk.statusComChanceNoAlvo).toEqual([{ status: 'queimadura', chanceExtraPercentual: 20 }]);
    expect(a.debuffs?.some((d) => d.tipo === 'enfraquecimento' && d.percentual === 20)).toBe(true);
  });

  it('o Julgamento Final cura 15% do dano causado', () => {
    const i = inquisidor({ hp: 200, contadorBencaoDivina: 0, contadorMilagreDivino: 6 });
    const atk = turnoDeCombate(i, alvo(), 1).turnoLog.ataques[0];
    expect(atk.habilidadeAcionada).toBe('Julgamento Final');
    expect(i.hp).toBeGreaterThan(200);
    expect(i.hp).toBeLessThanOrEqual(200 + Math.ceil(atk.danoEfetivo * 0.15) + 1);
  });

  it('a luta usa as três habilidades', () => {
    const monstro: MonsterDefinition = {
      id: 'saco-de-pancada', nome: 'Saco de Pancada', nivel: 30, hp: 60000, categoriaCorporal: 'blindadoPesado',
      atributos: { vigor: 50, sorte: 0, forca: 10, vitalidade: 20, arcano: 0, inteligencia: 0, agilidade: 5 },
      xpConcedido: 10, ouroConcedido: { min: 1, max: 1 },
    };
    const r = resolverCombate(inquisidor({ hp: 1000 }), monstro, 42);
    const usadas = r.logTurnos.flatMap((t) => t.ataques).filter((a) => a.atacante === 'Profeta Inquisidor').map((a) => a.habilidadeAcionada);
    expect(usadas).toContain('Sentença');
    expect(usadas).toContain('Fogo Sagrado');
    expect(usadas).toContain('Julgamento Final');
  });
});
