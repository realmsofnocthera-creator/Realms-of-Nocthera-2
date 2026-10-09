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

/** Etapa 2 — Kit do Bastião (Cavaleiro defensivo): proposta aprovada pelo Yuri em 09/10/2026. */

const ctx = (): ContextoHabilidade => ({
  atacante: { hp: 100, hpMax: 100, nivel: 30 },
  alvo: { hp: 1000, hpMax: 1000, sobreescudo: 0, mitigacaoFisica: 0, mitigacaoMagica: 0 },
  danoBase: 100,
});

describe('Bastião — habilidades', () => {
  beforeEach(() => registrarHabilidadesDeSubclasse());

  it('Golpe de Escudo: 95% e −3% de dano físico recebido por 1 rodada', () => {
    const def = obterHabilidade('bastiao_golpe_de_escudo')!;
    expect(def.espaco).toBe('basico');
    const r = def.executar(ctx());
    expect(r).toMatchObject({ nome: 'Golpe de Escudo', percentualDano: 95 });
    expect(r.efeitosNoUsuario).toEqual([{ efeito: 'resistenciaFisica', valorPercentual: 3, duracaoRodadas: 1 }]);
    expect(resolverDanoHabilidade(r, ctx()).danoBruto).toBe(95);
  });

  it('Muralha Inabalável: 120%, Escudo Temporário de 15% e −10% de dano físico e mágico por 2 rodadas', () => {
    const def = obterHabilidade('bastiao_muralha_inabalavel')!;
    expect(def.espaco).toBe('especial');
    const r = def.executar(ctx());
    expect(r.percentualDano).toBe(120);
    expect(r.efeitosNoUsuario).toEqual([
      { efeito: 'escudoTemporario', valorPercentual: 15, duracaoRodadas: 2 },
      { efeito: 'resistenciaFisica', valorPercentual: 10, duracaoRodadas: 2 },
      { efeito: 'resistenciaMagica', valorPercentual: 10, duracaoRodadas: 2 },
    ]);
  });

  it('Último Juramento: 260%, Imortalidade Breve (1 rodada), Redirecionamento de 25% e Escudo Temporário de 25% (2 rodadas)', () => {
    const def = obterHabilidade('bastiao_ultimo_juramento')!;
    expect(def.espaco).toBe('ultimate');
    const r = def.executar(ctx());
    expect(r.percentualDano).toBe(260);
    expect(r.efeitosNoUsuario).toEqual([
      { efeito: 'imortalidadeBreve', valorPercentual: 0, duracaoRodadas: 1 },
      { efeito: 'redirecionamento', valorPercentual: 25, duracaoRodadas: 2 },
      { efeito: 'escudoTemporario', valorPercentual: 25, duracaoRodadas: 2 },
    ]);
  });
});

describe('Bastião — passiva Fortaleza Viva', () => {
  it('tier 1: +10% de Sobreescudo máximo e −5% de dano físico recebido', () => {
    const m = obterModificadoresPassivaSubclasse({ subclasseAtualId: 'bastiao', subclasseTiers: { bastiao: 1 }, hp: 100, hpMax: 100 });
    expect(m).toEqual({ bonusDanoFisicoPercentual: 0, reducaoDanoFisicoRecebidoPercentual: 5, bonusSobreescudoMaxPercentual: 10 });
    const semTier = obterModificadoresPassivaSubclasse({ subclasseAtualId: 'bastiao', subclasseTiers: { bastiao: 0 }, hp: 100, hpMax: 100 });
    expect(semTier.bonusSobreescudoMaxPercentual).toBe(0);
  });
});

describe('Bastião — em combate', () => {
  const bastiao = (extra: Partial<Combatente> = {}): Combatente => ({
    nome: 'Cavaleiro Bastião', classeId: 'cavaleiro', nivel: 30, hp: 3000, hpMax: 3000, sobreescudo: 0,
    subclasseAtualId: 'bastiao', subclasseTiers: { bastiao: 4 },
    habilidadesEquipadas: {
      ataqueBasico: 'bastiao_golpe_de_escudo',
      habilidadeEspecial: 'bastiao_muralha_inabalavel',
      ultimate: 'bastiao_ultimo_juramento',
    },
    atributos: { vigor: 40, sorte: 0, forca: 30, vitalidade: 100, arcano: 4, inteligencia: 0, agilidade: 5 },
    ...extra,
  });
  const alvo = (): Combatente => ({
    nome: 'Alvo', hp: 100000, hpMax: 100000, sobreescudo: 0, mitigacao: 0,
    atributos: { vigor: 100, sorte: 0, forca: 30, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 5 },
  });

  it('o Golpe de Escudo coloca a resistência física no próprio Cavaleiro', () => {
    const b = bastiao();
    turnoDeCombate(b, alvo(), 1);
    expect(b.efeitosDefensivos?.[0]).toMatchObject({ efeito: 'resistenciaFisica', valorPercentual: 3 });
  });

  it('a Muralha Inabalável dá Sobreescudo temporário', () => {
    const b = bastiao({ contadorPosturaGuardiao: 2 });
    const atk = turnoDeCombate(b, alvo(), 1).turnoLog.ataques[0];
    expect(atk.habilidadeAcionada).toBe('Muralha Inabalável');
    expect(b.sobreescudo).toBeGreaterThan(0);
    expect(b.efeitosDefensivos?.map((e) => e.efeito)).toEqual(
      expect.arrayContaining(['escudoTemporario', 'resistenciaFisica', 'resistenciaMagica'])
    );
  });

  it('a luta usa as três habilidades', () => {
    const monstro: MonsterDefinition = {
      id: 'saco-de-pancada', nome: 'Saco de Pancada', nivel: 30, hp: 60000, categoriaCorporal: 'blindadoPesado',
      atributos: { vigor: 50, sorte: 0, forca: 10, vitalidade: 20, arcano: 0, inteligencia: 0, agilidade: 5 },
      xpConcedido: 10, ouroConcedido: { min: 1, max: 1 },
    };
    const r = resolverCombate(bastiao(), monstro, 42);
    const usadas = r.logTurnos.flatMap((t) => t.ataques).filter((a) => a.atacante === 'Cavaleiro Bastião').map((a) => a.habilidadeAcionada);
    expect(usadas).toContain('Golpe de Escudo');
    expect(usadas).toContain('Muralha Inabalável');
    expect(usadas).toContain('Último Juramento');
  });
});
