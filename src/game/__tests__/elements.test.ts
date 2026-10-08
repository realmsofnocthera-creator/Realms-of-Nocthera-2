import { describe, it, expect } from 'vitest';
import {
  DRACONIANO_FRAQUEZA_OPOSTA,
  DRACONIANO_RESISTENCIA_LINHAGEM,
  ELEMENTOS,
  MODIFICADOR_FRAQUEZA,
  MODIFICADOR_IMUNIDADE,
  MODIFICADOR_RESISTENCIA_FORTE,
  MULTIPLICADOR_ELEMENTAL_MINIMO,
} from '@/rules/elements';
import { CLASSES_MAP } from '@/rules/classes';
import { MONSTERS_MAP } from '@/rules/monsters';
import {
  aplicarMultiplicadorElemental,
  calcularMultiplicadorElemental,
  combinarModificadores,
  obterModificadoresRaciais,
  obterTextoReacaoElemental,
} from '@/game/elements';
import { Combatente, resolverCombate, turnoDeCombate } from '@/game/combat';

describe('ORDEM 22 — Sistema de Elementos (Bloco A)', () => {
  describe('1. Dados e Constantes Elementais (src/rules/elements.ts)', () => {
    it('exporta os 7 elementos e as constantes oficiais de modificadores e limites', () => {
      expect(ELEMENTOS).toEqual([
        'fogo',
        'gelo',
        'relampago',
        'terra',
        'vento',
        'sagrado',
        'sombrio',
      ]);
      expect(MODIFICADOR_FRAQUEZA).toBe(40);
      expect(MODIFICADOR_RESISTENCIA_FORTE).toBe(-40);
      expect(MODIFICADOR_IMUNIDADE).toBe(-90);
      expect(MULTIPLICADOR_ELEMENTAL_MINIMO).toBe(0.1);
      expect(DRACONIANO_RESISTENCIA_LINHAGEM).toBe(25);
      expect(DRACONIANO_FRAQUEZA_OPOSTA).toBe(10);
    });

    it('Profeta é a única classe com elemento cadastrado (Luz Sagrada e Milagre Divino = sagrado)', () => {
      const profeta = CLASSES_MAP['profeta'];
      expect(profeta.progressao.ataqueBasico.elemento).toBe('sagrado');
      expect(profeta.progressao.ultimate.elemento).toBe('sagrado');
      expect(profeta.progressao.habilidadeEspecial.elemento).toBeUndefined();

      for (const classeId of ['barbaro', 'cavaleiro', 'feiticeiro', 'bandido', 'samurai']) {
        const cls = CLASSES_MAP[classeId];
        expect(cls.progressao.ataqueBasico.elemento).toBeUndefined();
        expect(cls.progressao.habilidadeEspecial.elemento).toBeUndefined();
        expect(cls.progressao.passivaI.elemento).toBeUndefined();
        expect(cls.progressao.passivaII.elemento).toBeUndefined();
        expect(cls.progressao.ultimate.elemento).toBeUndefined();
      }
    });

    it('monstros possuem os modificadoresElementais cadastrados conforme a proposta de teste', () => {
      expect(MONSTERS_MAP['rato-da-peste'].modificadoresElementais).toEqual({
        fogo: MODIFICADOR_FRAQUEZA,
      });
      expect(MONSTERS_MAP['cultista-das-sombras'].modificadoresElementais).toEqual({
        sombrio: MODIFICADOR_RESISTENCIA_FORTE,
        sagrado: MODIFICADOR_FRAQUEZA,
      });
      expect(MONSTERS_MAP['cavaleiro-do-vazio'].modificadoresElementais).toEqual({
        sombrio: MODIFICADOR_IMUNIDADE,
        sagrado: MODIFICADOR_FRAQUEZA,
      });
    });
  });

  describe('2. Funções Puras Elementais (src/game/elements.ts)', () => {
    it('calcularMultiplicadorElemental: sem elemento = 1; fraqueza (+40) = 1.4; resistência forte (-40) = 0.6; imunidade (-90) = 0.1; nunca abaixo do mínimo', () => {
      expect(calcularMultiplicadorElemental(undefined, { fogo: MODIFICADOR_FRAQUEZA })).toBe(1);
      expect(calcularMultiplicadorElemental('fogo', {})).toBe(1);
      expect(
        calcularMultiplicadorElemental('fogo', { fogo: MODIFICADOR_FRAQUEZA })
      ).toBe(1.4);
      expect(
        calcularMultiplicadorElemental('sombrio', { sombrio: MODIFICADOR_RESISTENCIA_FORTE })
      ).toBe(0.6);
      expect(
        calcularMultiplicadorElemental('sombrio', { sombrio: MODIFICADOR_IMUNIDADE })
      ).toBe(0.1);

      // Soma de modificadores muito negativa (-130, -250) nunca fica abaixo de MULTIPLICADOR_ELEMENTAL_MINIMO (0.1)
      const modsMuitoNegativos = combinarModificadores(
        { sombrio: MODIFICADOR_IMUNIDADE },
        { sombrio: MODIFICADOR_RESISTENCIA_FORTE },
        { sombrio: -120 }
      );
      expect(calcularMultiplicadorElemental('sombrio', modsMuitoNegativos)).toBe(
        MULTIPLICADOR_ELEMENTAL_MINIMO
      );
    });

    it('combinarModificadores: soma corretamente dois modificadores do mesmo elemento e mantém elementos distintos separados', () => {
      const fonteA = { fogo: 40, gelo: -25 };
      const fonteB = { fogo: -15, sagrado: 40 };

      const combinado = combinarModificadores(fonteA, fonteB);
      expect(combinado).toEqual({
        fogo: 25,
        gelo: -25,
        sagrado: 40,
      });
      expect(combinado.vento).toBeUndefined();
    });

    it('aplicarMultiplicadorElemental: aplica Math.floor(danoBruto * multiplicador) sem forçar mínimo de 1', () => {
      expect(aplicarMultiplicadorElemental(20, 1.4)).toBe(28);
      expect(aplicarMultiplicadorElemental(20, 0.6)).toBe(12);
      expect(aplicarMultiplicadorElemental(20, 0.1)).toBe(2);
      // Dano pequeno reduzido por imunidade (5 * 0.1 = 0.5 -> floor = 0; o mínimo de 1 fica a cargo de aplicarDano)
      expect(aplicarMultiplicadorElemental(5, 0.1)).toBe(0);
    });

    it('obterModificadoresRaciais — Draconiano de fogo ({fogo: -25, gelo: +10}) e Draconiano de vento ({vento: -25, relampago: +10})', () => {
      expect(obterModificadoresRaciais('draconiano', 'fogo')).toEqual({
        fogo: -25,
        gelo: 10,
      });

      expect(obterModificadoresRaciais('draconiano', 'vento')).toEqual({
        vento: -25,
        relampago: 10,
      });

      // Também valida as demais linhagens da tabela fraquezaElementoOposto
      expect(obterModificadoresRaciais('draconiano', 'gelo')).toEqual({
        gelo: -25,
        fogo: 10,
      });
      expect(obterModificadoresRaciais('draconiano', 'relampago')).toEqual({
        relampago: -25,
        terra: 10,
      });
      expect(obterModificadoresRaciais('draconiano', 'terra')).toEqual({
        terra: -25,
        vento: 10,
      });
    });

    it('obterModificadoresRaciais — Vampiro retorna {sombrio: -15, fogo: +10} e demais raças retornam {}', () => {
      expect(obterModificadoresRaciais('vampiro')).toEqual({
        sombrio: -15,
        fogo: 10,
      });

      expect(obterModificadoresRaciais('humano')).toEqual({});
      expect(obterModificadoresRaciais('anao')).toEqual({});
      expect(obterModificadoresRaciais('elfo')).toEqual({});
      expect(obterModificadoresRaciais('orc')).toEqual({});
    });

    it('obterTextoReacaoElemental retorna "fraqueza", "resistência" ou "imune" conforme o modificador do alvo', () => {
      expect(obterTextoReacaoElemental('sagrado', { sagrado: 40 })).toBe('fraqueza');
      expect(obterTextoReacaoElemental('sombrio', { sombrio: -40 })).toBe('resistência');
      expect(obterTextoReacaoElemental('sombrio', { sombrio: -90 })).toBe('imune');
      expect(obterTextoReacaoElemental('sombrio', { sombrio: -120 })).toBe('imune');
      expect(obterTextoReacaoElemental('fogo', {})).toBeUndefined();
      expect(obterTextoReacaoElemental(undefined, { fogo: 40 })).toBeUndefined();
    });
  });

  describe('3. Integração no Combate (src/game/combat.ts)', () => {
    it('um Profeta atacando o Cultista das Sombras (fraco a sagrado) causa mais dano que atacando um monstro sem modificadores, e registra elemento, multiplicadorElemental e "fraqueza" no log', () => {
      const criarProfeta = (): Combatente => ({
        nome: 'Profeta de Yggdrasil',
        racaId: 'humano',
        classeId: 'profeta',
        nivel: 1,
        hp: 100,
        hpMax: 100,
        mana: 100,
        manaMax: 100,
        sobreescudo: 0,
        atributos: {
          vigor: 10,
          mente: 10,
          forca: 0,
          vitalidade: 0,
          arcano: 5,
          inteligencia: 20, // Dano mágico base = 20
          agilidade: 10,
        },
      });

      const cultista = MONSTERS_MAP['cultista-das-sombras'];
      const alvoCultista: Combatente = {
        nome: cultista.nome,
        hp: 100,
        hpMax: 100,
        sobreescudo: 0,
        atributos: { ...cultista.atributos },
        modificadoresElementais: cultista.modificadoresElementais,
      };

      const alvoSemModificadores: Combatente = {
        nome: 'Boneco Neutro',
        hp: 100,
        hpMax: 100,
        sobreescudo: 0,
        atributos: { ...cultista.atributos },
      };

      const turnoContraCultista = turnoDeCombate(criarProfeta(), alvoCultista, 1);
      const turnoContraNeutro = turnoDeCombate(criarProfeta(), alvoSemModificadores, 1);

      const atkCultista = turnoContraCultista.turnoLog.ataques[0];
      const atkNeutro = turnoContraNeutro.turnoLog.ataques[0];

      // Contra alvo sem modificadores: 20 * 1 = 20
      expect(atkNeutro.danoBruto).toBe(20);
      expect(atkNeutro.danoEfetivo).toBe(20);
      expect(atkNeutro.elemento).toBe('sagrado');
      expect(atkNeutro.multiplicadorElemental).toBe(1);

      // Contra Cultista das Sombras (sagrado: +40% -> multiplicador 1.4): floor(20 * 1.4) = 28
      expect(atkCultista.danoBruto).toBe(28);
      expect(atkCultista.danoEfetivo).toBe(28);
      expect(atkCultista.danoEfetivo).toBeGreaterThan(atkNeutro.danoEfetivo);
      expect(atkCultista.elemento).toBe('sagrado');
      expect(atkCultista.multiplicadorElemental).toBe(1.4);
      expect(atkCultista.reacaoElemental).toBe('fraqueza');
      expect(atkCultista.mensagem).toContain('fraqueza');
    });

    it('contra o Cavaleiro do Vazio (sombrio imune, sagrado fraco), confirma o dano sagrado aumentado do Profeta (inclusive no Milagre Divino) e a imunidade a sombrio', () => {
      const cavaleiroDoVazio = MONSTERS_MAP['cavaleiro-do-vazio'];

      // 1) Profeta (Luz Sagrada e Milagre Divino = sagrado) contra Cavaleiro do Vazio (sagrado: +40)
      const profetaLv30: Combatente = {
        nome: 'Sumo Profeta',
        racaId: 'humano',
        classeId: 'profeta',
        nivel: 30,
        hp: 150,
        hpMax: 200,
        mana: 150,
        manaMax: 200,
        sobreescudo: 0,
        contadorMilagreDivino: 6, // próximo golpe é o 7º -> Milagre Divino (150% de 20 = 30 antes do elemento)
        atributos: {
          vigor: 20,
          mente: 20,
          forca: 0,
          vitalidade: 0,
          arcano: 10,
          inteligencia: 20,
          agilidade: 10,
        },
      };

      const alvoCavaleiroVazio: Combatente = {
        nome: cavaleiroDoVazio.nome,
        hp: 200,
        hpMax: 200,
        sobreescudo: 0,
        atributos: { ...cavaleiroDoVazio.atributos },
        modificadoresElementais: cavaleiroDoVazio.modificadoresElementais,
      };

      const resMilagre = turnoDeCombate(profetaLv30, alvoCavaleiroVazio, 1);
      const atkMilagre = resMilagre.turnoLog.ataques[0];

      // Milagre Divino base = 30; com fraqueza a sagrado (+40%, mult 1.4) = floor(30 * 1.4) = 42
      expect(atkMilagre.habilidadeAcionada).toBe('Milagre Divino');
      expect(atkMilagre.elemento).toBe('sagrado');
      expect(atkMilagre.multiplicadorElemental).toBe(1.4);
      expect(atkMilagre.reacaoElemental).toBe('fraqueza');
      expect(atkMilagre.danoBruto).toBe(42);
      expect(atkMilagre.danoEfetivo).toBe(42);
      expect(atkMilagre.mensagem).toContain('fraqueza');

      // E via resolverCombate direto contra MONSTERS_MAP['cavaleiro-do-vazio']:
      const combateReal = resolverCombate(
        {
          nome: 'Profeta Real',
          racaId: 'humano',
          classeId: 'profeta',
          nivel: 1,
          hp: 200,
          hpMax: 200,
          sobreescudo: 0,
          atributos: {
            vigor: 20,
            mente: 10,
            forca: 0,
            vitalidade: 0,
            arcano: 5,
            inteligencia: 20,
            agilidade: 10,
          },
        },
        cavaleiroDoVazio,
        42
      );
      const primeiroAtaqueProfeta = combateReal.logTurnos[0].ataques[0];
      expect(primeiroAtaqueProfeta.elemento).toBe('sagrado');
      expect(primeiroAtaqueProfeta.multiplicadorElemental).toBe(1.4);
      expect(primeiroAtaqueProfeta.danoEfetivo).toBe(28); // floor(20 * 1.4)

      // 2) Golpe sombrio contra Cavaleiro do Vazio (sombrio: -90 -> imune, mult 0.1)
      const atacanteSombrio: Combatente = {
        nome: 'Espectro Abissal',
        hp: 100,
        hpMax: 100,
        sobreescudo: 0,
        elementoAtaque: 'sombrio',
        atributos: {
          vigor: 10,
          mente: 5,
          forca: 0,
          vitalidade: 0,
          arcano: 5,
          inteligencia: 30, // Dano mágico base = 30 -> floor(30 * 0.1) = 3
          agilidade: 5,
        },
      };
      const resImune = turnoDeCombate(atacanteSombrio, alvoCavaleiroVazio, 2);
      const atkImune = resImune.turnoLog.ataques[0];
      expect(atkImune.elemento).toBe('sombrio');
      expect(atkImune.multiplicadorElemental).toBe(0.1);
      expect(atkImune.reacaoElemental).toBe('imune');
      expect(atkImune.danoBruto).toBe(3);
      expect(atkImune.mensagem).toContain('imune');
    });

    it('Dano mínimo: um golpe elemental muito reduzido (imunidade) contra um alvo com mitigação alta ainda causa pelo menos 1 de dano', () => {
      const atacanteFracoElemental: Combatente = {
        nome: 'Acólito Sombrio',
        hp: 50,
        hpMax: 50,
        sobreescudo: 0,
        elementoAtaque: 'sombrio',
        atributos: {
          vigor: 5,
          mente: 5,
          forca: 0,
          vitalidade: 0,
          arcano: 2,
          inteligencia: 5, // Dano bruto inicial = 5; com imunidade (0.1) -> floor(5 * 0.1) = 0
          agilidade: 2,
        },
      };

      const alvoImuneComAltaMitigacao: Combatente = {
        nome: 'Cavaleiro do Vazio Blindado',
        hp: 100,
        hpMax: 100,
        sobreescudo: 0,
        mitigacao: 50, // Mitigação alta (50) + Imunidade a sombrio (-90)
        modificadoresElementais: {
          sombrio: MODIFICADOR_IMUNIDADE,
        },
        atributos: {
          vigor: 10,
          mente: 2,
          forca: 5,
          vitalidade: 10,
          arcano: 0,
          inteligencia: 0,
          agilidade: 2,
        },
      };

      const res = turnoDeCombate(atacanteFracoElemental, alvoImuneComAltaMitigacao, 1);
      const atk = res.turnoLog.ataques[0];

      // aplicarMultiplicadorElemental(5, 0.1) resulta em 0 bruto, mas aplicarDano garante no mínimo 1 de dano efetivo!
      expect(atk.danoBruto).toBe(0);
      expect(atk.danoEfetivo).toBe(1);
      expect(res.defensorHp).toBe(99);
      expect(atk.reacaoElemental).toBe('imune');
      expect(atk.mensagem).toContain('imune');
    });

    it('monstro com elementoAtaque atacando personagem Draconiano ou Vampiro aplica obterModificadoresRaciais corretamente', () => {
      const monstroFogo: Combatente = {
        nome: 'Elemental de Cinzas',
        hp: 100,
        hpMax: 100,
        sobreescudo: 0,
        elementoAtaque: 'fogo',
        atributos: {
          vigor: 10,
          mente: 5,
          forca: 2,
          vitalidade: 0,
          arcano: 5,
          inteligencia: 20, // Dano mágico = 20
          agilidade: 2,
        },
      };

      const draconianoFogo: Combatente = {
        nome: 'Draconiano de Fogo',
        racaId: 'draconiano',
        linhagem: 'fogo',
        hp: 100,
        hpMax: 100,
        sobreescudo: 0,
        atributos: {
          vigor: 10,
          mente: 2,
          forca: 5,
          vitalidade: 2,
          arcano: 2,
          inteligencia: 0,
          agilidade: 2,
        },
      };

      const vampiro: Combatente = {
        nome: 'Vampiro Ancião',
        racaId: 'vampiro',
        hp: 100,
        hpMax: 100,
        sobreescudo: 0,
        atributos: {
          vigor: 10,
          mente: 2,
          forca: 5,
          vitalidade: 2,
          arcano: 2,
          inteligencia: 0,
          agilidade: 2,
        },
      };

      // Draconiano de fogo tem -25% de dano de fogo (mult 0.75): floor(20 * 0.75) = 15
      const resDrac = turnoDeCombate({ ...monstroFogo }, draconianoFogo, 1);
      const atkDrac = resDrac.turnoLog.ataques[0];
      expect(atkDrac.multiplicadorElemental).toBe(0.75);
      expect(atkDrac.reacaoElemental).toBe('resistência');
      expect(atkDrac.danoEfetivo).toBe(15);
      expect(atkDrac.mensagem).toContain('resistência');

      // Vampiro tem +10% de fraqueza a fogo (mult 1.1): floor(20 * 1.1) = 22
      const resVamp = turnoDeCombate({ ...monstroFogo }, vampiro, 1);
      const atkVamp = resVamp.turnoLog.ataques[0];
      expect(atkVamp.multiplicadorElemental).toBe(1.1);
      expect(atkVamp.reacaoElemental).toBe('fraqueza');
      expect(atkVamp.danoEfetivo).toBe(22);
      expect(atkVamp.mensagem).toContain('fraqueza');
    });
  });
});
