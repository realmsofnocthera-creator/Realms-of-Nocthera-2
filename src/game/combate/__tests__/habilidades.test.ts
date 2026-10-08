import { describe, it, expect, beforeEach } from 'vitest';
import { GAME_CONFIG } from '@/rules/config';
import {
  DefinicaoHabilidade,
  DefinicaoPassiva,
  ContextoHabilidade,
  ResultadoHabilidade,
  registrarHabilidade,
  obterHabilidade,
  registrarPassiva,
  obterPassiva,
  limparRegistroParaTestes,
  resolverDanoHabilidade,
} from '@/game/combate/habilidades';

describe('ORDEM 47 — Interface, Registro e Resolução de Habilidades', () => {
  beforeEach(() => {
    limparRegistroParaTestes();
  });

  describe('Registro de Habilidades e Passivas', () => {
    it('registra e obtém uma habilidade com sucesso', () => {
      const habilidadeMock: DefinicaoHabilidade = {
        id: 'habilidade_teste_1',
        espaco: 'basico',
        executar: (ctx) => ({
          nome: 'Golpe de Teste',
          tipoDano: 'fisico',
          percentualDano: 100,
          ignorarDefesaPercentual: 0,
          bonusDanoPercentual: 0,
          bonusContraSobreescudoPercentual: 0,
          curaPercentualDanoCausado: 0,
          curaPercentualHpMax: 0,
        }),
      };

      registrarHabilidade(habilidadeMock);
      const obtida = obterHabilidade('habilidade_teste_1');
      expect(obtida).toBeDefined();
      expect(obtida?.id).toBe('habilidade_teste_1');
      expect(obtida?.espaco).toBe('basico');
    });

    it('retorna undefined para id desconhecido', () => {
      expect(obterHabilidade('inexistente')).toBeUndefined();
      expect(obterPassiva('inexistente')).toBeUndefined();
    });

    it('lança erro contendo o id ao registrar habilidade com id duplicado', () => {
      const def1: DefinicaoHabilidade = {
        id: 'hab_duplicada',
        espaco: 'especial',
        executar: () => ({} as ResultadoHabilidade),
      };
      const def2: DefinicaoHabilidade = {
        id: 'hab_duplicada',
        espaco: 'ultimate',
        executar: () => ({} as ResultadoHabilidade),
      };

      registrarHabilidade(def1);
      expect(() => registrarHabilidade(def2)).toThrowError(/hab_duplicada/);
    });

    it('registra e obtém passiva, e lança erro ao registrar passiva duplicada', () => {
      const passivaMock: DefinicaoPassiva = {
        id: 'passiva_teste_1',
        modificadores: () => ({
          bonusDanoFisicoPercentual: 10,
          reducaoDanoFisicoRecebidoPercentual: 5,
          bonusSobreescudoMaxPercentual: 0,
        }),
      };

      registrarPassiva(passivaMock);
      expect(obterPassiva('passiva_teste_1')).toBeDefined();
      expect(() => registrarPassiva(passivaMock)).toThrowError(/passiva_teste_1/);
    });

    it('limparRegistroParaTestes limpa todas as habilidades e passivas registradas', () => {
      registrarHabilidade({
        id: 'hab_temp',
        espaco: 'basico',
        executar: () => ({} as ResultadoHabilidade),
      });
      registrarPassiva({
        id: 'passiva_temp',
        modificadores: () => ({
          bonusDanoFisicoPercentual: 0,
          reducaoDanoFisicoRecebidoPercentual: 0,
          bonusSobreescudoMaxPercentual: 0,
        }),
      });

      expect(obterHabilidade('hab_temp')).toBeDefined();
      expect(obterPassiva('passiva_temp')).toBeDefined();

      limparRegistroParaTestes();

      expect(obterHabilidade('hab_temp')).toBeUndefined();
      expect(obterPassiva('passiva_temp')).toBeUndefined();
    });
  });

  describe('Resolução de Dano de Habilidades (resolverDanoHabilidade)', () => {
    const criarContexto = (params?: {
      danoBase?: number;
      sobreescudo?: number;
      mitigacaoFisica?: number;
      mitigacaoMagica?: number;
    }): ContextoHabilidade => ({
      danoBase: params?.danoBase ?? 20,
      atacante: {
        hp: 100,
        hpMax: 100,
        nivel: 20,
      },
      alvo: {
        hp: 100,
        hpMax: 100,
        sobreescudo: params?.sobreescudo ?? 0,
        mitigacaoFisica: params?.mitigacaoFisica ?? 0,
        mitigacaoMagica: params?.mitigacaoMagica ?? 0,
      },
    });

    it('calcula 115% de dano sobre base 20 (resultado 23)', () => {
      const resultadoHab: ResultadoHabilidade = {
        nome: 'Golpe Preciso',
        tipoDano: 'fisico',
        percentualDano: 115,
        ignorarDefesaPercentual: 0,
        bonusDanoPercentual: 0,
        bonusContraSobreescudoPercentual: 0,
        curaPercentualDanoCausado: 0,
        curaPercentualHpMax: 0,
      };

      const ctx = criarContexto({ danoBase: 20 });
      const { danoBruto } = resolverDanoHabilidade(resultadoHab, ctx);

      // Math.ceil((20 * 115) / 100) = 23
      expect(danoBruto).toBe(23);
    });

    it('calcula 170% com ignorar 10% de mitigação 20 (mitigação efetiva 18)', () => {
      const resultadoHab: ResultadoHabilidade = {
        nome: 'Estocada Perfurante',
        tipoDano: 'fisico',
        percentualDano: 170,
        ignorarDefesaPercentual: 10,
        bonusDanoPercentual: 0,
        bonusContraSobreescudoPercentual: 0,
        curaPercentualDanoCausado: 0,
        curaPercentualHpMax: 0,
      };

      const ctx = criarContexto({ danoBase: 100, mitigacaoFisica: 20 });
      const { danoBruto, mitigacaoEfetiva } = resolverDanoHabilidade(resultadoHab, ctx);

      // Math.ceil((100 * 170) / 100) = 170
      expect(danoBruto).toBe(170);
      // Math.floor((20 * (100 - 10)) / 100) = 18
      expect(mitigacaoEfetiva).toBe(18);
    });

    it('aplica bônus condicional somado (+30)', () => {
      const resultadoHab: ResultadoHabilidade = {
        nome: 'Golpe Enfurecido',
        tipoDano: 'fisico',
        percentualDano: 100,
        ignorarDefesaPercentual: 0,
        bonusDanoPercentual: 30,
        bonusContraSobreescudoPercentual: 0,
        curaPercentualDanoCausado: 0,
        curaPercentualHpMax: 0,
      };

      const ctx = criarContexto({ danoBase: 20 });
      const { danoBruto } = resolverDanoHabilidade(resultadoHab, ctx);

      // Base: 20 * 100% = 20. Bônus +30%: Math.ceil((20 * 130) / 100) = 26
      expect(danoBruto).toBe(26);
    });

    it('aplica +25% contra Sobreescudo com escudo 0 (170) e com escudo > 0 (ceil(170 * 1.25) = 213)', () => {
      const resultadoHab: ResultadoHabilidade = {
        nome: 'Quebrador de Escudos',
        tipoDano: 'fisico',
        percentualDano: 170,
        ignorarDefesaPercentual: 0,
        bonusDanoPercentual: 0,
        bonusContraSobreescudoPercentual: 25,
        curaPercentualDanoCausado: 0,
        curaPercentualHpMax: 0,
      };

      // Cenário com sobreescudo = 0: não recebe bônus
      const ctxSemEscudo = criarContexto({ danoBase: 100, sobreescudo: 0 });
      const resSemEscudo = resolverDanoHabilidade(resultadoHab, ctxSemEscudo);
      expect(resSemEscudo.danoBruto).toBe(170);

      // Cenário com sobreescudo > 0: ceil((170 * 125) / 100) = 213
      const ctxComEscudo = criarContexto({ danoBase: 100, sobreescudo: 50 });
      const resComEscudo = resolverDanoHabilidade(resultadoHab, ctxComEscudo);
      expect(resComEscudo.danoBruto).toBe(213);
    });

    it('respeita o dano mínimo de GAME_CONFIG.DANO_MINIMO (1)', () => {
      const resultadoHab: ResultadoHabilidade = {
        nome: 'Toque Fraco',
        tipoDano: 'fisico',
        percentualDano: 0,
        ignorarDefesaPercentual: 0,
        bonusDanoPercentual: 0,
        bonusContraSobreescudoPercentual: 0,
        curaPercentualDanoCausado: 0,
        curaPercentualHpMax: 0,
      };

      const ctx = criarContexto({ danoBase: 0 });
      const { danoBruto } = resolverDanoHabilidade(resultadoHab, ctx);

      expect(danoBruto).toBe(GAME_CONFIG.DANO_MINIMO);
      expect(danoBruto).toBe(1);
    });

    it('seleciona corretamente mitigação mágica vs física conforme tipoDano', () => {
      const habFisica: ResultadoHabilidade = {
        nome: 'Ataque Físico',
        tipoDano: 'fisico',
        percentualDano: 100,
        ignorarDefesaPercentual: 0,
        bonusDanoPercentual: 0,
        bonusContraSobreescudoPercentual: 0,
        curaPercentualDanoCausado: 0,
        curaPercentualHpMax: 0,
      };

      const habMagica: ResultadoHabilidade = {
        nome: 'Ataque Mágico',
        tipoDano: 'magico',
        percentualDano: 100,
        ignorarDefesaPercentual: 0,
        bonusDanoPercentual: 0,
        bonusContraSobreescudoPercentual: 0,
        curaPercentualDanoCausado: 0,
        curaPercentualHpMax: 0,
      };

      const ctx = criarContexto({
        danoBase: 50,
        mitigacaoFisica: 15,
        mitigacaoMagica: 30,
      });

      const resFisico = resolverDanoHabilidade(habFisica, ctx);
      expect(resFisico.mitigacaoEfetiva).toBe(15);

      const resMagico = resolverDanoHabilidade(habMagica, ctx);
      expect(resMagico.mitigacaoEfetiva).toBe(30);
    });
  });
});
