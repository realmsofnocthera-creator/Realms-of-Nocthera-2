import { describe, it, expect, beforeEach } from 'vitest';
import { Combatente, turnoDeCombate } from '@/game/combat';
import {
  habilidadeLiberadaPorTier,
  registrarHabilidadesDeSubclasse,
  subclasseDaHabilidade,
} from '@/game/combate/habilidades';
import { CUSTO_TIER_SUBCLASSE, TIER_POR_ESPACO_HABILIDADE, custoDoTier } from '@/rules/subclasseTiers';

/** 2.1.4 — Tiers das subclasses: custos definidos pelo Yuri em 10/10/2026 e bloqueio das habilidades por tier. */

describe('Custo dos tiers', () => {
  it('tier 0 a 4: fragmentos de alma, ouro e fragmentos da própria subclasse', () => {
    expect(CUSTO_TIER_SUBCLASSE).toEqual([
      { fragmentosAlma: 30, ouro: 10_000, fragmentosSubclasse: 0 },
      { fragmentosAlma: 15, ouro: 15_000, fragmentosSubclasse: 0 },
      { fragmentosAlma: 25, ouro: 20_000, fragmentosSubclasse: 0 },
      { fragmentosAlma: 40, ouro: 25_000, fragmentosSubclasse: 0 },
      { fragmentosAlma: 60, ouro: 40_000, fragmentosSubclasse: 5 },
    ]);
  });

  it('custoDoTier recusa tier fora de 0 a 4', () => {
    expect(custoDoTier(4).fragmentosSubclasse).toBe(5);
    expect(() => custoDoTier(5)).toThrow('Tier inválido');
    expect(() => custoDoTier(-1)).toThrow('Tier inválido');
    expect(() => custoDoTier(1.5)).toThrow('Tier inválido');
  });

  it('o tier de cada espaço: básico no 2, especial no 3 e ultimate no 4 (a passiva vale a partir do 1)', () => {
    expect(TIER_POR_ESPACO_HABILIDADE).toEqual({ basico: 2, especial: 3, ultimate: 4 });
  });
});

describe('Bloqueio das habilidades por tier', () => {
  beforeEach(() => registrarHabilidadesDeSubclasse());

  it('descobre a subclasse dona da habilidade pelo id', () => {
    expect(subclasseDaHabilidade('sabio_arcano_lanca_de_gelo')?.id).toBe('sabio_arcano');
    expect(subclasseDaHabilidade('arquimago_meteoro')?.id).toBe('arquimago');
    expect(subclasseDaHabilidade('profeta_luz_sagrada')).toBeUndefined();
  });

  it('só vale com a subclasse ativa e o tier do espaço', () => {
    const com = (tier: number, ativa: string | null = 'sacerdote') => ({ subclasseAtualId: ativa, subclasseTiers: { sacerdote: tier } });
    expect(habilidadeLiberadaPorTier('sacerdote_toque_sagrado', com(1))).toBe(false);
    expect(habilidadeLiberadaPorTier('sacerdote_toque_sagrado', com(2))).toBe(true);
    expect(habilidadeLiberadaPorTier('sacerdote_prece_de_cura', com(2))).toBe(false);
    expect(habilidadeLiberadaPorTier('sacerdote_prece_de_cura', com(3))).toBe(true);
    expect(habilidadeLiberadaPorTier('sacerdote_graca_redentora', com(3))).toBe(false);
    expect(habilidadeLiberadaPorTier('sacerdote_graca_redentora', com(4))).toBe(true);
    // Tier alto, mas a subclasse ativa é outra (ou nenhuma)
    expect(habilidadeLiberadaPorTier('sacerdote_graca_redentora', com(4, 'inquisidor'))).toBe(false);
    expect(habilidadeLiberadaPorTier('sacerdote_graca_redentora', com(4, null))).toBe(false);
  });

  it('habilidades que não são de kit de subclasse sempre valem', () => {
    expect(habilidadeLiberadaPorTier('profeta_luz_sagrada', {})).toBe(true);
    expect(habilidadeLiberadaPorTier('teste_raio', {})).toBe(true);
  });

  const arquimago = (tier: number, extra: Partial<Combatente> = {}): Combatente => ({
    nome: 'Feiticeiro Arquimago', classeId: 'feiticeiro', nivel: 30, hp: 1000, hpMax: 1000, sobreescudo: 0,
    subclasseAtualId: 'arquimago', subclasseTiers: { arquimago: tier },
    habilidadesEquipadas: {
      ataqueBasico: 'arquimago_bola_de_fogo',
      habilidadeEspecial: 'arquimago_tempestade_de_raios',
      ultimate: 'arquimago_meteoro',
    },
    atributos: { vigor: 5, sorte: 0, forca: 1, vitalidade: 5, arcano: 4, inteligencia: 100, agilidade: 5 },
    ...extra,
  });
  const alvo = (): Combatente => ({
    nome: 'Alvo', hp: 100000, hpMax: 100000, sobreescudo: 0, mitigacao: 0,
    atributos: { vigor: 100, sorte: 0, forca: 1, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 5 },
  });
  const usada = (c: Combatente) => turnoDeCombate(c, alvo(), 1).turnoLog.ataques[0].habilidadeAcionada;

  it('em combate: sem o tier o golpe é o da classe; com o tier, o da subclasse', () => {
    expect(usada(arquimago(1))).toBe('Faísca Arcana');
    expect(usada(arquimago(2))).toBe('Bola de Fogo');
    expect(usada(arquimago(2, { contadorExplosaoArcana: 2 }))).toBe('Explosão Arcana');
    expect(usada(arquimago(3, { contadorExplosaoArcana: 2 }))).toBe('Tempestade de Raios');
    expect(usada(arquimago(3, { contadorCataclismoArcano: 6 }))).toBe('Cataclismo Arcano');
    expect(usada(arquimago(4, { contadorCataclismoArcano: 6 }))).toBe('Meteoro');
  });

  it('em combate: com outra subclasse ativa, a habilidade do kit não vale', () => {
    expect(usada(arquimago(4, { subclasseAtualId: 'sabio_arcano' }))).toBe('Faísca Arcana');
    expect(usada(arquimago(4, { subclasseAtualId: null }))).toBe('Faísca Arcana');
  });
});
