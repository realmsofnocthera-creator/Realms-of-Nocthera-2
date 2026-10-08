import { describe, it, expect, beforeEach } from 'vitest';
import { Combatente, resolverCombate } from '@/game/combat';
import { MONSTERS_MAP, MonsterDefinition } from '@/rules/monsters';
import {
  obterHabilidade,
  registrarHabilidadesDeSubclasse,
  resolverDanoHabilidade,
  aplicarPassivasDanoDaClasse,
  ContextoHabilidade,
} from '@/game/combate/habilidades';

const MONSTRO_SINTETICO_ESCUDO: MonsterDefinition = {
  id: 'monstro-sintetico-escudo',
  nome: 'Guardião Ancestral Blindado',
  nivel: 30,
  hp: 25000,
  atributos: {
    vigor: 80,
    mente: 30,
    forca: 50,
    vitalidade: 150,
    arcano: 20,
    inteligencia: 20,
    agilidade: 12,
  },
  xpConcedido: 2000,
  ouroConcedido: {
    min: 100,
    max: 200,
  },
};

describe('ORDEM 48C — Habilidades Ativas do Berserker e do Colosso', () => {
  beforeEach(() => {
    registrarHabilidadesDeSubclasse();
  });

  describe('1. Verificação de Registro e Resolução Direta das 6 Habilidades', () => {
    it('Berserker — Golpe Desenfreado (115% físico)', () => {
      const def = obterHabilidade('berserker_golpe_desenfreado');
      expect(def).toBeDefined();
      expect(def!.espaco).toBe('basico');
      expect(def!.tipoDano).toBe('fisico');

      const ctx: ContextoHabilidade = {
        atacante: { hp: 100, hpMax: 100, nivel: 30 },
        alvo: { hp: 100, hpMax: 100, sobreescudo: 0, mitigacaoFisica: 20, mitigacaoMagica: 20 },
        danoBase: 20,
      };

      const res = def!.executar(ctx);
      expect(res.nome).toBe('Golpe Desenfreado');
      expect(res.tipoDano).toBe('fisico');

      // base = ceil(20 * 115 / 100) = 23; mitigacao = 20
      const dano = resolverDanoHabilidade(res, ctx);
      expect(dano.danoBruto).toBe(23);
      expect(dano.mitigacaoEfetiva).toBe(20);
    });

    it('Berserker — Investida Sangrenta (170% normal vs 210% com HP < 50%, ignora 10% Def)', () => {
      const def = obterHabilidade('berserker_investida_sangrenta');
      expect(def).toBeDefined();
      expect(def!.espaco).toBe('especial');

      // Caso 1: HP 60% (normal)
      const ctx60: ContextoHabilidade = {
        atacante: { hp: 60, hpMax: 100, nivel: 30 },
        alvo: { hp: 100, hpMax: 100, sobreescudo: 0, mitigacaoFisica: 20, mitigacaoMagica: 20 },
        danoBase: 20,
      };
      const res60 = def!.executar(ctx60);
      expect(res60.nome).toBe('Investida Sangrenta');
      expect(res60.percentualDano).toBe(170);
      expect(res60.ignorarDefesaPercentual).toBe(10);

      // base = ceil(20 * 170 / 100) = 34; mitigacao = floor(20 * 0.90) = 18
      const dano60 = resolverDanoHabilidade(res60, ctx60);
      expect(dano60.danoBruto).toBe(34);
      expect(dano60.mitigacaoEfetiva).toBe(18);

      // Caso 2: HP 40% (abaixo de 50%)
      const ctx40: ContextoHabilidade = {
        atacante: { hp: 40, hpMax: 100, nivel: 30 },
        alvo: { hp: 100, hpMax: 100, sobreescudo: 0, mitigacaoFisica: 20, mitigacaoMagica: 20 },
        danoBase: 20,
      };
      const res40 = def!.executar(ctx40);
      expect(res40.percentualDano).toBe(210);

      // base = ceil(20 * 210 / 100) = 42; mitigacao = 18
      const dano40 = resolverDanoHabilidade(res40, ctx40);
      expect(dano40.danoBruto).toBe(42);
      expect(dano40.mitigacaoEfetiva).toBe(18);
    });

    it('Berserker — Desvario Final (350%, ignora 20% Def, +25% vs Escudo, +30% bônus se HP < 30%)', () => {
      const def = obterHabilidade('berserker_desvario_final');
      expect(def).toBeDefined();
      expect(def!.espaco).toBe('ultimate');

      // Caso 1: HP 40% (sem bônus <30%), Escudo = 0
      const ctx40SemEscudo: ContextoHabilidade = {
        atacante: { hp: 40, hpMax: 100, nivel: 30 },
        alvo: { hp: 100, hpMax: 100, sobreescudo: 0, mitigacaoFisica: 20, mitigacaoMagica: 20 },
        danoBase: 20,
      };
      const res40 = def!.executar(ctx40SemEscudo);
      expect(res40.nome).toBe('Desvario Final');
      expect(res40.bonusDanoPercentual).toBe(0);
      expect(res40.bonusContraSobreescudoPercentual).toBe(25);
      expect(res40.ignorarDefesaPercentual).toBe(20);

      // base = ceil(20 * 350 / 100) = 70; mitigacao = floor(20 * 0.80) = 16
      const dano40 = resolverDanoHabilidade(res40, ctx40SemEscudo);
      expect(dano40.danoBruto).toBe(70);
      expect(dano40.mitigacaoEfetiva).toBe(16);

      // Caso 2: HP 25% (com bônus <30%), Escudo = 0
      const ctx25SemEscudo: ContextoHabilidade = {
        atacante: { hp: 25, hpMax: 100, nivel: 30 },
        alvo: { hp: 100, hpMax: 100, sobreescudo: 0, mitigacaoFisica: 20, mitigacaoMagica: 20 },
        danoBase: 20,
      };
      const res25 = def!.executar(ctx25SemEscudo);
      expect(res25.bonusDanoPercentual).toBe(30);

      // base = ceil(20 * 350 / 100) = 70; com +30% -> ceil(70 * 130 / 100) = 91; mitigacao = 16
      const dano25 = resolverDanoHabilidade(res25, ctx25SemEscudo);
      expect(dano25.danoBruto).toBe(91);
      expect(dano25.mitigacaoEfetiva).toBe(16);

      // Caso 3: HP 25% (com bônus <30%), Escudo = 50 (> 0)
      const ctx25ComEscudo: ContextoHabilidade = {
        atacante: { hp: 25, hpMax: 100, nivel: 30 },
        alvo: { hp: 100, hpMax: 100, sobreescudo: 50, mitigacaoFisica: 20, mitigacaoMagica: 20 },
        danoBase: 20,
      };
      const res25Escudo = def!.executar(ctx25ComEscudo);
      // Regra 1.2.2: 20 × 350% × (100% + 30% de HP baixo + 25% contra Sobreescudo) = 108,5 -> 109; mitigacao = 16
      const dano25Escudo = resolverDanoHabilidade(res25Escudo, ctx25ComEscudo);
      expect(dano25Escudo.danoBruto).toBe(109);
      expect(dano25Escudo.mitigacaoEfetiva).toBe(16);
    });

    it('Colosso — Golpe Esmagador (105% físico, cura 5% dano causado)', () => {
      const def = obterHabilidade('colosso_golpe_esmagador');
      expect(def).toBeDefined();
      expect(def!.espaco).toBe('basico');

      const ctx: ContextoHabilidade = {
        atacante: { hp: 100, hpMax: 100, nivel: 30 },
        alvo: { hp: 100, hpMax: 100, sobreescudo: 0, mitigacaoFisica: 20, mitigacaoMagica: 20 },
        danoBase: 20,
      };
      const res = def!.executar(ctx);
      expect(res.nome).toBe('Golpe Esmagador');
      expect(res.percentualDano).toBe(105);
      expect(res.curaPercentualDanoCausado).toBe(5);
      expect(res.curaPercentualHpMax).toBe(0);

      // base = ceil(20 * 105 / 100) = 21; mitigacao = 20
      const dano = resolverDanoHabilidade(res, ctx);
      expect(dano.danoBruto).toBe(21);
      expect(dano.mitigacaoEfetiva).toBe(20);
    });

    it('Colosso — Impacto Sísmico (160% físico, cura 10% hpMax)', () => {
      const def = obterHabilidade('colosso_impacto_sismico');
      expect(def).toBeDefined();
      expect(def!.espaco).toBe('especial');

      const ctx: ContextoHabilidade = {
        atacante: { hp: 100, hpMax: 100, nivel: 30 },
        alvo: { hp: 100, hpMax: 100, sobreescudo: 0, mitigacaoFisica: 20, mitigacaoMagica: 20 },
        danoBase: 20,
      };
      const res = def!.executar(ctx);
      expect(res.nome).toBe('Impacto Sísmico');
      expect(res.percentualDano).toBe(160);
      expect(res.curaPercentualDanoCausado).toBe(0);
      expect(res.curaPercentualHpMax).toBe(10);

      // base = ceil(20 * 160 / 100) = 32; mitigacao = 20
      const dano = resolverDanoHabilidade(res, ctx);
      expect(dano.danoBruto).toBe(32);
      expect(dano.mitigacaoEfetiva).toBe(20);
    });

    it('Colosso — Fúria do Colosso (320% físico, +25% vs Escudo, cura 15% hpMax)', () => {
      const def = obterHabilidade('colosso_furia_do_colosso');
      expect(def).toBeDefined();
      expect(def!.espaco).toBe('ultimate');

      // Escudo = 0
      const ctxSemEscudo: ContextoHabilidade = {
        atacante: { hp: 100, hpMax: 100, nivel: 30 },
        alvo: { hp: 100, hpMax: 100, sobreescudo: 0, mitigacaoFisica: 20, mitigacaoMagica: 20 },
        danoBase: 20,
      };
      const resSemEscudo = def!.executar(ctxSemEscudo);
      expect(resSemEscudo.nome).toBe('Fúria do Colosso');
      expect(resSemEscudo.percentualDano).toBe(320);
      expect(resSemEscudo.bonusContraSobreescudoPercentual).toBe(25);
      expect(resSemEscudo.curaPercentualHpMax).toBe(15);

      // base = ceil(20 * 320 / 100) = 64; mitigacao = 20
      const danoSemEscudo = resolverDanoHabilidade(resSemEscudo, ctxSemEscudo);
      expect(danoSemEscudo.danoBruto).toBe(64);
      expect(danoSemEscudo.mitigacaoEfetiva).toBe(20);

      // Escudo > 0
      const ctxComEscudo: ContextoHabilidade = {
        atacante: { hp: 100, hpMax: 100, nivel: 30 },
        alvo: { hp: 100, hpMax: 100, sobreescudo: 50, mitigacaoFisica: 20, mitigacaoMagica: 20 },
        danoBase: 20,
      };
      const resComEscudo = def!.executar(ctxComEscudo);
      // base = ceil(64 * 125 / 100) = 80; mitigacao = 20
      const danoComEscudo = resolverDanoHabilidade(resComEscudo, ctxComEscudo);
      expect(danoComEscudo.danoBruto).toBe(80);
      expect(danoComEscudo.mitigacaoEfetiva).toBe(20);
    });
  });

  describe('2. aplicarPassivasDanoDaClasse (Instinto de Sobrevivência)', () => {
    it('Bárbaro nível 12+ aplica bônus de Instinto de Sobrevivência conforme HP', () => {
      const danoBasePlano = 20;

      // HP 100%: normal (0 bônus) -> 20
      const dano100 = aplicarPassivasDanoDaClasse({
        classeId: 'barbaro',
        danoBasePlano,
        hp: 100,
        hpMax: 100,
        nivel: 30,
      });
      expect(dano100).toBe(20);

      // HP 40%: abaixo de 50% (+2 Força, +10% dano) -> ceil((20 + 2) * 1.10) = ceil(24.2) = 25
      const dano40 = aplicarPassivasDanoDaClasse({
        classeId: 'barbaro',
        danoBasePlano,
        hp: 40,
        hpMax: 100,
        nivel: 30,
      });
      expect(dano40).toBe(25);

      // HP 20%: abaixo de 25% (+4 Força, +20% dano) -> ceil((20 + 4) * 1.20) = ceil(28.8) = 29
      const dano20 = aplicarPassivasDanoDaClasse({
        classeId: 'barbaro',
        danoBasePlano,
        hp: 20,
        hpMax: 100,
        nivel: 30,
      });
      expect(dano20).toBe(29);
    });

    it('Outras classes retornam o danoBasePlano sem alteração', () => {
      const danoCavaleiro = aplicarPassivasDanoDaClasse({
        classeId: 'cavaleiro',
        danoBasePlano: 20,
        hp: 20,
        hpMax: 100,
        nivel: 30,
      });
      expect(danoCavaleiro).toBe(20);

      const danoFeiticeiro = aplicarPassivasDanoDaClasse({
        classeId: 'feiticeiro',
        danoBasePlano: 35,
        hp: 15,
        hpMax: 100,
        nivel: 30,
      });
      expect(danoFeiticeiro).toBe(35);
    });
  });

  describe('3. Integração em Combate Real (resolverCombate)', () => {
    it('Bárbaro nv30 com kit Berserker contra Rato da Peste e Guardião Ancestral', () => {
      const rato = MONSTERS_MAP['rato-da-peste'];
      expect(rato).toBeDefined();

      const barbaroBerserker: Combatente = {
        nome: 'Guerreiro Berserker',
        classeId: 'barbaro',
        racaId: 'humano',
        nivel: 30,
        hp: 600,
        hpMax: 600,
        sobreescudo: 100,
        atributos: {
          vigor: 40,
          mente: 5,
          forca: 45,
          vitalidade: 30,
          arcano: 0,
          inteligencia: 0,
          agilidade: 15,
        },
        habilidadesEquipadas: {
          ataqueBasico: 'berserker_golpe_desenfreado',
          habilidadeEspecial: 'berserker_investida_sangrenta',
          ultimate: 'berserker_desvario_final',
        },
      };

      // Contra o Rato da Peste
      const resRato = resolverCombate(barbaroBerserker, rato, 42);
      expect(resRato.vencedor).toBe('personagem');
      expect(resRato.logTurnos[0].ataques[0].habilidadeAcionada).toBe('Golpe Desenfreado');

      // Contra o Guardião Ancestral Blindado (luta mais longa)
      const resGuardiao = resolverCombate(barbaroBerserker, MONSTRO_SINTETICO_ESCUDO, 42);
      expect(resGuardiao.logTurnos.length).toBeGreaterThan(5);

      // Coleta todas as habilidades acionadas pelo atacante
      const habilidadesUsadas = resGuardiao.logTurnos
        .flatMap((t) => t.ataques)
        .filter((a) => a.atacante === barbaroBerserker.nome)
        .map((a) => a.habilidadeAcionada);

      expect(habilidadesUsadas).toContain('Golpe Desenfreado');
      expect(habilidadesUsadas).toContain('Investida Sangrenta');
      expect(habilidadesUsadas).toContain('Desvario Final');

      // O 7º ataque do atacante deve ser exatamente o Ultimate 'Desvario Final'
      const ataquesAtacante = resGuardiao.logTurnos
        .flatMap((t) => t.ataques)
        .filter((a) => a.atacante === barbaroBerserker.nome);

      expect(ataquesAtacante[0].habilidadeAcionada).toBe('Golpe Desenfreado');
      expect(ataquesAtacante[1].habilidadeAcionada).toBe('Golpe Desenfreado');
      expect(ataquesAtacante[2].habilidadeAcionada).toBe('Investida Sangrenta'); // 3º ataque
      expect(ataquesAtacante[6].habilidadeAcionada).toBe('Desvario Final'); // 7º ataque
    });

    it('Bárbaro nv30 com kit Colosso contra Guardião Ancestral (cura e teto de HP)', () => {
      const barbaroColosso: Combatente = {
        nome: 'Guerreiro Colosso',
        classeId: 'barbaro',
        racaId: 'humano',
        nivel: 30,
        hp: 600,
        hpMax: 600,
        sobreescudo: 100,
        atributos: {
          vigor: 40,
          mente: 5,
          forca: 35,
          vitalidade: 30,
          arcano: 0,
          inteligencia: 0,
          agilidade: 15,
        },
        habilidadesEquipadas: {
          ataqueBasico: 'colosso_golpe_esmagador',
          habilidadeEspecial: 'colosso_impacto_sismico',
          ultimate: 'colosso_furia_do_colosso',
        },
      };

      const res = resolverCombate(barbaroColosso, MONSTRO_SINTETICO_ESCUDO, 42);
      expect(res.logTurnos.length).toBeGreaterThan(5);

      const ataquesAtacante = res.logTurnos
        .flatMap((t) => t.ataques)
        .filter((a) => a.atacante === barbaroColosso.nome);

      expect(ataquesAtacante[0].habilidadeAcionada).toBe('Golpe Esmagador');
      expect(ataquesAtacante[2].habilidadeAcionada).toBe('Impacto Sísmico');
      expect(ataquesAtacante[6].habilidadeAcionada).toBe('Fúria do Colosso');

      // Verifica que o HP do atacante nunca ultrapassou o hpMax
      for (const turno of res.logTurnos) {
        for (const atk of turno.ataques) {
          if (atk.atacanteHpRestante !== undefined) {
            expect(atk.atacanteHpRestante).toBeLessThanOrEqual(barbaroColosso.hpMax);
          }
        }
      }
    });
  });
});
