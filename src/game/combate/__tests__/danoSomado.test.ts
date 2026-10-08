import { describe, it, expect } from 'vitest';
import { GAME_CONFIG } from '@/rules/config';
import {
  calcularDanoComBonusSomados,
  limitarReducaoDanoPercentual,
} from '@/game/combate/efeitos';
import { calcularGolpeFeiticeiro, calcularGolpeSamurai } from '@/game/combat';
import { bonusPassivaPermanenteDanoPercentual } from '@/game';
import { resolverDanoHabilidade } from '@/game/combate/habilidades/resolver';
import { ContextoHabilidade, ResultadoHabilidade } from '@/game/combate/habilidades';

/** Ordem 1.2.3 — todos os bônus de dano somam num grupo só (regra 1.2.2). */
describe('1.2.3 — bônus de dano somados num grupo só', () => {
  it('soma os bônus e arredonda uma vez: 100 × 150% × (100 + 10 + 25)% = 202,5 -> 203', () => {
    expect(calcularDanoComBonusSomados(100, 150, [10, 25])).toBe(203);
    // Multiplicando em sequência daria ceil(ceil(150 × 1,10) × 1,25) = 207
    expect(Math.ceil((Math.ceil((100 * 150 * 110) / 10_000) * 125) / 100)).toBe(207);
  });

  it('sem bônus, vale só o percentual da habilidade; bônus nulos não mudam nada', () => {
    expect(calcularDanoComBonusSomados(40, 200, [])).toBe(80);
    expect(calcularDanoComBonusSomados(40, 200, [0, 0])).toBe(80);
  });

  it('o fator nunca fica negativo', () => {
    expect(calcularDanoComBonusSomados(40, 100, [-150])).toBe(0);
  });

  it('o teto da redução de dano recebido é 80%', () => {
    expect(GAME_CONFIG.TETO_REDUCAO_DANO_PERCENTUAL).toBe(80);
    expect(limitarReducaoDanoPercentual(95)).toBe(80);
    expect(limitarReducaoDanoPercentual(30)).toBe(30);
    expect(limitarReducaoDanoPercentual(-10)).toBe(0);
  });

  it('passivas permanentes: Fluxo +10 (mágico), Passos/Disciplina +5 (físico), só do nível 12', () => {
    expect(bonusPassivaPermanenteDanoPercentual('feiticeiro', 12, 'magico')).toBe(10);
    expect(bonusPassivaPermanenteDanoPercentual('feiticeiro', 11, 'magico')).toBe(0);
    expect(bonusPassivaPermanenteDanoPercentual('feiticeiro', 30, 'fisico')).toBe(0);
    expect(bonusPassivaPermanenteDanoPercentual('bandido', 12, 'fisico')).toBe(5);
    expect(bonusPassivaPermanenteDanoPercentual('samurai', 12, 'fisico')).toBe(5);
    expect(bonusPassivaPermanenteDanoPercentual('barbaro', 30, 'fisico')).toBe(0);
  });

  it('Cataclismo com 3 cargas e escudo: INT 20 × 400% × (100 + 10 + 30 + 25)% = 132', () => {
    const r = calcularGolpeFeiticeiro({
      inteligenciaBase: 20,
      nivel: 30,
      contadorExplosao: 0,
      contadorAcumulo: 0,
      cargasAcumulo: 3,
      contadorCataclismo: 6,
      sobreescudoAlvo: 50,
      mitigacaoMagicaAlvo: 0,
    });
    expect(r.habilidadeAcionada).toBe('Cataclismo Arcano');
    expect(r.danoBruto).toBe(calcularDanoComBonusSomados(20, 400, [10, 30, 25]));
    expect(r.danoBruto).toBe(132);
  });

  it('Corte do Vazio com 3 cargas e escudo: FOR 40 × 450% × (100 + 5 + 15 + 25)% = 261', () => {
    const r = calcularGolpeSamurai({
      forcaBase: 40,
      nivel: 30,
      contadorIaijutsu: 0,
      contadorFocoAbsoluto: 0,
      cargasFocoAbsoluto: 3,
      contadorCorteDoVazio: 6,
      sobreescudoAlvo: 50,
      mitigacaoFisicaAlvo: 0,
    });
    expect(r.habilidadeAcionada).toBe('Corte do Vazio');
    expect(r.danoBrutoPrincipal).toBe(261);
  });

  describe('habilidades do registro (resolverDanoHabilidade)', () => {
    const resultado: ResultadoHabilidade = {
      nome: 'Teste',
      tipoDano: 'fisico',
      percentualDano: 350,
      ignorarDefesaPercentual: 0,
      bonusDanoPercentual: 30,
      bonusContraSobreescudoPercentual: 25,
      curaPercentualDanoCausado: 0,
      curaPercentualHpMax: 0,
    };
    const ctxBase = (sobreescudo: number, extra?: number): ContextoHabilidade => ({
      atacante: { hp: 25, hpMax: 100, nivel: 30 },
      alvo: { hp: 100, hpMax: 100, sobreescudo, mitigacaoFisica: 0, mitigacaoMagica: 0 },
      danoBase: 20,
      bonusDanoExtraPercentual: extra,
    });

    it('bônus da habilidade, do escudo e de passivas (Frenesi/Instinto) somam juntos', () => {
      // 20 × 350% × (100 + 30 + 25 + 20)% = 122,5 -> 123
      expect(resolverDanoHabilidade(resultado, ctxBase(50, 20)).danoBruto).toBe(123);
    });

    it('o bônus contra Sobreescudo só entra se o alvo tem escudo', () => {
      // 20 × 350% × (100 + 30)% = 91
      expect(resolverDanoHabilidade(resultado, ctxBase(0)).danoBruto).toBe(91);
    });
  });
});
