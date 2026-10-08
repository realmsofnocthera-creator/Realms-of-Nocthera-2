import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Combatente, resolverCombate, turnoDeCombate } from '../../combat';
import { MONSTERS_MAP } from '../../../rules/monsters';
import { CLASSES, getClassById } from '../../../rules/classes';
import {
  DefinicaoHabilidade,
  registrarHabilidade,
  limparRegistroParaTestes,
  obterSlotAcionado,
  resolverDanoHabilidade,
  ContextoHabilidade,
} from '../habilidades';

describe('ORDEM 48B — Integração de Habilidades Equipadas ao Motor', () => {
  beforeEach(() => {
    limparRegistroParaTestes();
  });

  afterEach(() => {
    limparRegistroParaTestes();
  });

  describe('obterSlotAcionado para as 6 classes', () => {
    it('retorna os slots corretos para cada classe', () => {
      for (const classe of CLASSES) {
        const { ataqueBasico, habilidadeEspecial, ultimate } = classe.progressao;

        // Ataque básico (com nome e sem nome/undefined)
        expect(obterSlotAcionado(classe.id, ataqueBasico.nome)).toBe('ataqueBasico');
        expect(obterSlotAcionado(classe.id, undefined)).toBe('ataqueBasico');
        expect(obterSlotAcionado(classe.id, '')).toBe('ataqueBasico');

        // Habilidade Especial
        expect(obterSlotAcionado(classe.id, habilidadeEspecial.nome)).toBe('habilidadeEspecial');

        // Ultimate
        expect(obterSlotAcionado(classe.id, ultimate.nome)).toBe('ultimate');

        // Nome desconhecido
        expect(obterSlotAcionado(classe.id, 'Golpe Inexistente')).toBeNull();
      }
    });

    it('retorna null para classe inválida ou desconhecida', () => {
      expect(obterSlotAcionado('classe_invalida', 'Golpe')).toBeNull();
    });
  });

  describe('Preservação do Combate Atual (sem habilidades customizadas registradas)', () => {
    it('(1) Com habilidadesEquipadas ausente ou com IDs padrão da classe: resolverCombate produz resultado idêntico', () => {
      const monstro = MONSTERS_MAP['rato-da-peste'];
      expect(monstro).toBeDefined();

      const baseCombatente: Combatente = {
        nome: 'Guerreiro Teste',
        classeId: 'barbaro',
        racaId: 'humano',
        nivel: 5,
        hp: 100,
        hpMax: 100,
        sobreescudo: 20,
        atributos: {
          vigor: 10,
          mente: 2,
          forca: 15,
          vitalidade: 10,
          arcano: 0,
          inteligencia: 0,
          agilidade: 5,
        },
        ouro: 50,
      };

      const seed = 12345;
      const resSemCampo = resolverCombate(baseCombatente, monstro, seed);

      const combatenteComPadrao: Combatente = {
        ...baseCombatente,
        habilidadesEquipadas: {
          ataqueBasico: 'barbaro_golpe_barbaro',
          habilidadeEspecial: 'barbaro_furia_selvagem',
          ultimate: 'barbaro_ira_do_barbaro',
        },
      };
      const resComPadrao = resolverCombate(combatenteComPadrao, monstro, seed);

      expect(resComPadrao.vencedor).toBe(resSemCampo.vencedor);
      expect(resComPadrao.logTurnos).toEqual(resSemCampo.logTurnos);
      expect(resComPadrao.mensagens).toEqual(resSemCampo.mensagens);
      expect(resComPadrao.xpGanho).toBe(resSemCampo.xpGanho);
      expect(resComPadrao.personagemFinal).toEqual(resSemCampo.personagemFinal);
    });
  });

  describe('Interceptação de Habilidades Customizadas', () => {
    it('(2) Bárbaro nv5 com FALSA no espaço ataqueBasico: ataques 1 e 2 mostram nome da falsa; 3º continua Fúria Selvagem', () => {
      const idFalsa = 'falsa_corte_sombrio';
      const defFalsa: DefinicaoHabilidade = {
        id: idFalsa,
        espaco: 'basico',
        tipoDano: 'fisico',
        executar: () => ({
          nome: 'Corte Sombrio',
          tipoDano: 'fisico',
          percentualDano: 120,
          ignorarDefesaPercentual: 0,
          bonusDanoPercentual: 0,
          bonusContraSobreescudoPercentual: 0,
          curaPercentualDanoCausado: 0,
          curaPercentualHpMax: 0,
        }),
      };
      registrarHabilidade(defFalsa);

      const atacante: Combatente = {
        nome: 'Bárbaro Custom',
        classeId: 'barbaro',
        nivel: 5,
        hp: 100,
        hpMax: 100,
        sobreescudo: 0,
        atributos: {
          vigor: 10,
          mente: 2,
          forca: 15,
          vitalidade: 5,
          arcano: 0,
          inteligencia: 0,
          agilidade: 5,
        },
        habilidadesEquipadas: {
          ataqueBasico: idFalsa,
          habilidadeEspecial: 'barbaro_furia_selvagem',
          ultimate: 'barbaro_ira_do_barbaro',
        },
        contadorFuriaSelvagem: 0,
      };

      const defensor: Combatente = {
        nome: 'Alvo Robusto',
        hp: 500,
        hpMax: 500,
        sobreescudo: 0,
        atributos: {
          vigor: 50,
          mente: 0,
          forca: 1,
          vitalidade: 0,
          arcano: 0,
          inteligencia: 0,
          agilidade: 5,
        },
      };

      // Turno 1 (ataque 1 -> ataqueBasico interceptado)
      const t1 = turnoDeCombate(atacante, defensor, 1);
      expect(t1.turnoLog.ataques[0].habilidadeAcionada).toBe('Corte Sombrio');
      expect(atacante.contadorFuriaSelvagem).toBe(1);

      // Turno 2 (ataque 2 -> ataqueBasico interceptado)
      const t2 = turnoDeCombate(atacante, defensor, 2);
      expect(t2.turnoLog.ataques[0].habilidadeAcionada).toBe('Corte Sombrio');
      expect(atacante.contadorFuriaSelvagem).toBe(2);

      // Turno 3 (ataque 3 -> especial de classe NÃO interceptado, dispara Fúria Selvagem)
      const t3 = turnoDeCombate(atacante, defensor, 3);
      expect(t3.turnoLog.ataques[0].habilidadeAcionada).toBe('Fúria Selvagem');
      expect(atacante.contadorFuriaSelvagem).toBe(0);
    });

    it('(3) FALSA no espaço habilidadeEspecial: no 3º ataque o log mostra nome da falsa e o contador zera normalmente', () => {
      const idEspecialFalsa = 'falsa_impacto_trovao';
      const defFalsa: DefinicaoHabilidade = {
        id: idEspecialFalsa,
        espaco: 'especial',
        tipoDano: 'fisico',
        executar: () => ({
          nome: 'Impacto de Trovão',
          tipoDano: 'fisico',
          percentualDano: 250,
          ignorarDefesaPercentual: 0,
          bonusDanoPercentual: 0,
          bonusContraSobreescudoPercentual: 0,
          curaPercentualDanoCausado: 0,
          curaPercentualHpMax: 0,
        }),
      };
      registrarHabilidade(defFalsa);

      const atacante: Combatente = {
        nome: 'Bárbaro Custom',
        classeId: 'barbaro',
        nivel: 5,
        hp: 100,
        hpMax: 100,
        sobreescudo: 0,
        atributos: {
          vigor: 10,
          mente: 2,
          forca: 15,
          vitalidade: 5,
          arcano: 0,
          inteligencia: 0,
          agilidade: 5,
        },
        habilidadesEquipadas: {
          ataqueBasico: 'barbaro_golpe_barbaro',
          habilidadeEspecial: idEspecialFalsa,
          ultimate: 'barbaro_ira_do_barbaro',
        },
        contadorFuriaSelvagem: 2, // Próximo ataque será o 3º
      };

      const defensor: Combatente = {
        nome: 'Alvo',
        hp: 500,
        hpMax: 500,
        sobreescudo: 0,
        atributos: {
          vigor: 50,
          mente: 0,
          forca: 1,
          vitalidade: 0,
          arcano: 0,
          inteligencia: 0,
          agilidade: 5,
        },
      };

      const t = turnoDeCombate(atacante, defensor, 1);
      expect(t.turnoLog.ataques[0].habilidadeAcionada).toBe('Impacto de Trovão');
      expect(atacante.contadorFuriaSelvagem).toBe(0); // Zerou normalmente
    });

    it('(4) O dano de um ataque confere exatamente com resolverDanoHabilidade', () => {
      const idFalsa = 'falsa_perfurar';
      const defFalsa: DefinicaoHabilidade = {
        id: idFalsa,
        espaco: 'basico',
        tipoDano: 'fisico',
        executar: () => ({
          nome: 'Perfurar Armadura',
          tipoDano: 'fisico',
          percentualDano: 150,
          ignorarDefesaPercentual: 50,
          bonusDanoPercentual: 20,
          bonusContraSobreescudoPercentual: 0,
          curaPercentualDanoCausado: 0,
          curaPercentualHpMax: 0,
        }),
      };
      registrarHabilidade(defFalsa);

      const atacante: Combatente = {
        nome: 'Guerreiro',
        classeId: 'samurai',
        nivel: 10,
        hp: 100,
        hpMax: 100,
        sobreescudo: 0,
        atributos: {
          vigor: 10,
          mente: 0,
          forca: 20,
          vitalidade: 0,
          arcano: 0,
          inteligencia: 0,
          agilidade: 10,
        },
        habilidadesEquipadas: {
          ataqueBasico: idFalsa,
          habilidadeEspecial: 'samurai_iaijutsu',
          ultimate: 'samurai_corte_do_vazio',
        },
      };

      const defensor: Combatente = {
        nome: 'Alvo Blindado',
        hp: 500,
        hpMax: 500,
        sobreescudo: 0,
        mitigacao: 10,
        atributos: {
          vigor: 50,
          mente: 0,
          forca: 1,
          vitalidade: 0,
          arcano: 0,
          inteligencia: 0,
          agilidade: 5,
        },
      };

      const danoBase = 20; // Força 20 no Samurai nível 10
      const ctxHab: ContextoHabilidade = {
        atacante: { hp: 100, hpMax: 100, nivel: 10 },
        alvo: { hp: 500, hpMax: 500, sobreescudo: 0, mitigacaoFisica: 10, mitigacaoMagica: 10 },
        danoBase,
      };
      const resEsperado = resolverDanoHabilidade(defFalsa.executar(ctxHab), ctxHab);

      const t = turnoDeCombate(atacante, defensor, 1);
      const atk = t.turnoLog.ataques[0];

      expect(atk.danoBruto).toBe(resEsperado.danoBruto);
      expect(atk.danoEfetivo).toBe(resEsperado.danoBruto - resEsperado.mitigacaoEfetiva);
    });

    it('(5) Cura: falsa com curaPercentualDanoCausado e curaPercentualHpMax recupera HP sem ultrapassar hpMax', () => {
      const idCura = 'falsa_dreno_vida';
      const defCura: DefinicaoHabilidade = {
        id: idCura,
        espaco: 'basico',
        tipoDano: 'fisico',
        executar: () => ({
          nome: 'Dreno de Vida',
          tipoDano: 'fisico',
          percentualDano: 100,
          ignorarDefesaPercentual: 0,
          bonusDanoPercentual: 0,
          bonusContraSobreescudoPercentual: 0,
          curaPercentualDanoCausado: 50, // 50% do dano efetivo
          curaPercentualHpMax: 10,       // 10% do HP máximo
        }),
      };
      registrarHabilidade(defCura);

      const atacante: Combatente = {
        nome: 'Vampiro Guerreiro',
        classeId: 'barbaro',
        nivel: 10,
        hp: 30, // HP reduzido para testar cura
        hpMax: 100,
        sobreescudo: 0,
        atributos: {
          vigor: 10,
          mente: 0,
          forca: 20,
          vitalidade: 0,
          arcano: 0,
          inteligencia: 0,
          agilidade: 5,
        },
        habilidadesEquipadas: {
          ataqueBasico: idCura,
          habilidadeEspecial: 'barbaro_furia_selvagem',
          ultimate: 'barbaro_ira_do_barbaro',
        },
      };

      const defensor: Combatente = {
        nome: 'Alvo',
        hp: 500,
        hpMax: 500,
        sobreescudo: 0,
        mitigacao: 0,
        atributos: {
          vigor: 50,
          mente: 0,
          forca: 1,
          vitalidade: 0,
          arcano: 0,
          inteligencia: 0,
          agilidade: 5,
        },
      };

      // Dano causado = 20. Cura dano (50%) = 10. Cura HpMax (10% de 100) = 10. Total cura = 20.
      // HP inicial = 30 -> HP final = 50.
      const t = turnoDeCombate(atacante, defensor, 1);
      expect(atacante.hp).toBe(50);
      expect(t.turnoLog.ataques[0].atacanteHpRestante).toBe(50);

      // Teste de teto no hpMax: atacante com 95 de HP recebe +20 de cura -> fica com 100
      atacante.hp = 95;
      turnoDeCombate(atacante, defensor, 2);
      expect(atacante.hp).toBe(100);
    });

    it('(6) Lança erro se resultado.tipoDano for diferente do def.tipoDano', () => {
      const idMismatch = 'falsa_mismatch';
      const defMismatch: DefinicaoHabilidade = {
        id: idMismatch,
        espaco: 'basico',
        tipoDano: 'fisico',
        executar: () => ({
          nome: 'Golpe Mágico Disfarçado',
          tipoDano: 'magico', // Divergência intencional
          percentualDano: 100,
          ignorarDefesaPercentual: 0,
          bonusDanoPercentual: 0,
          bonusContraSobreescudoPercentual: 0,
          curaPercentualDanoCausado: 0,
          curaPercentualHpMax: 0,
        }),
      };
      registrarHabilidade(defMismatch);

      const atacante: Combatente = {
        nome: 'Atacante',
        classeId: 'barbaro',
        nivel: 1,
        hp: 100,
        hpMax: 100,
        sobreescudo: 0,
        atributos: {
          vigor: 10,
          mente: 0,
          forca: 10,
          vitalidade: 0,
          arcano: 0,
          inteligencia: 0,
          agilidade: 5,
        },
        habilidadesEquipadas: {
          ataqueBasico: idMismatch,
          habilidadeEspecial: 'barbaro_furia_selvagem',
          ultimate: 'barbaro_ira_do_barbaro',
        },
      };

      const defensor: Combatente = {
        nome: 'Alvo',
        hp: 100,
        hpMax: 100,
        sobreescudo: 0,
        atributos: {
          vigor: 10,
          mente: 0,
          forca: 1,
          vitalidade: 0,
          arcano: 0,
          inteligencia: 0,
          agilidade: 5,
        },
      };

      expect(() => turnoDeCombate(atacante, defensor, 1)).toThrowError(
        /Tipo de dano retornado \(magico\) difere do tipo de dano definido na habilidade "falsa_mismatch" \(fisico\)/
      );
    });

    it('(7) Ignorar defesa sem duplicação — Bárbaro nv5 contra defensor com mitigação 20', () => {
      const idFalsa = 'falsa_perfuracao_50';
      const defFalsa: DefinicaoHabilidade = {
        id: idFalsa,
        espaco: 'basico',
        tipoDano: 'fisico',
        executar: () => ({
          nome: 'Golpe Perfurante 50%',
          tipoDano: 'fisico',
          percentualDano: 100, // 100% de dano base
          ignorarDefesaPercentual: 50, // ignora 50% da mitigação
          bonusDanoPercentual: 0,
          bonusContraSobreescudoPercentual: 0,
          curaPercentualDanoCausado: 0,
          curaPercentualHpMax: 0,
        }),
      };
      registrarHabilidade(defFalsa);

      const atacante: Combatente = {
        nome: 'Bárbaro Nv5',
        classeId: 'barbaro',
        nivel: 5,
        hp: 100,
        hpMax: 100,
        sobreescudo: 0,
        atributos: {
          vigor: 10,
          mente: 0,
          forca: 25, // dano físico base = 25
          vitalidade: 0,
          arcano: 0,
          inteligencia: 0,
          agilidade: 5,
        },
        habilidadesEquipadas: {
          ataqueBasico: idFalsa,
          habilidadeEspecial: 'barbaro_furia_selvagem',
          ultimate: 'barbaro_ira_do_barbaro',
        },
      };

      const defensor: Combatente = {
        nome: 'Defensor Blindado',
        hp: 100,
        hpMax: 100,
        sobreescudo: 0,
        mitigacao: 20, // Mitigação física = 20
        atributos: {
          vigor: 10,
          mente: 0,
          forca: 1,
          vitalidade: 0,
          arcano: 0,
          inteligencia: 0,
          agilidade: 5,
        },
      };

      // Cálculo manual:
      // danoBase = 25
      // percentualDano = 100% -> danoBruto = 25
      // mitigação inicial = 20. Com 50% de penetração -> mitigacaoEfetiva = 20 - (20 * 50 / 100) = 10.
      // Dano efetivo esperado = 25 - 10 = 15.
      // Defensor HP inicial 100 -> HP final 85.
      const t = turnoDeCombate(atacante, defensor, 1);
      const atk = t.turnoLog.ataques[0];

      expect(atk.danoBruto).toBe(25);
      expect(atk.danoEfetivo).toBe(15);
      expect(atk.hpRestante).toBe(85);
      expect(t.defensorHp).toBe(85);
    });

    it('(8) Ignorar defesa sem duplicação — Bandido nv5 (que possui ramo de multigolpe) interceptado', () => {
      const idFalsa = 'falsa_tiro_preciso';
      const defFalsa: DefinicaoHabilidade = {
        id: idFalsa,
        espaco: 'basico',
        tipoDano: 'fisico',
        executar: () => ({
          nome: 'Tiro Preciso',
          tipoDano: 'fisico',
          percentualDano: 100,
          ignorarDefesaPercentual: 50,
          bonusDanoPercentual: 0,
          bonusContraSobreescudoPercentual: 0,
          curaPercentualDanoCausado: 0,
          curaPercentualHpMax: 0,
        }),
      };
      registrarHabilidade(defFalsa);

      const atacante: Combatente = {
        nome: 'Bandido Nv5',
        classeId: 'bandido',
        nivel: 5,
        hp: 100,
        hpMax: 100,
        sobreescudo: 0,
        atributos: {
          vigor: 10,
          mente: 0,
          forca: 25, // dano físico base = 25
          vitalidade: 0,
          arcano: 0,
          inteligencia: 0,
          agilidade: 5,
        },
        habilidadesEquipadas: {
          ataqueBasico: idFalsa,
          habilidadeEspecial: 'bandido_rajada_de_golpes',
          ultimate: 'bandido_danca_das_laminas',
        },
      };

      const defensor: Combatente = {
        nome: 'Defensor Blindado',
        hp: 100,
        hpMax: 100,
        sobreescudo: 0,
        mitigacao: 20, // Mitigação física = 20
        atributos: {
          vigor: 10,
          mente: 0,
          forca: 1,
          vitalidade: 0,
          arcano: 0,
          inteligencia: 0,
          agilidade: 5,
        },
      };

      // Como o ataque básico do bandido foi interceptado por uma habilidade de golpe único,
      // multigolpes devem estar anulados e o ignorar defesa aplicado uma única vez (mitigação 10).
      // Dano efetivo esperado = 25 - 10 = 15.
      // Defensor HP inicial 100 -> HP final 85.
      const t = turnoDeCombate(atacante, defensor, 1);
      const atk = t.turnoLog.ataques[0];

      expect(atk.danoBruto).toBe(25);
      expect(atk.danoEfetivo).toBe(15);
      expect(atk.numeroGolpes).toBeUndefined();
      expect(atk.golpes).toBeUndefined();
      expect(atk.hpRestante).toBe(85);
      expect(t.defensorHp).toBe(85);
    });
  });
});
