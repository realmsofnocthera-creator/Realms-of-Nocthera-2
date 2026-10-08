import { describe, it, expect, beforeEach, vi } from 'vitest';

// Autenticação e semente controladas só nos testes (0.5-A5, 0.5-B1)
vi.mock('../../server/auth', () => import('../../server/__tests__/helpers/authFake'));
vi.mock('../../server/combatSeed', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../server/combatSeed')>()),
  gerarSemente: () => 42,
}));
import {
  iniciativa,
  calcularDanoFisico,
  calcularDanoMagico,
  aplicarSedeDeSangue,
  calcularInstintoSobrevivencia,
  processarFuriaSelvagem,
  processarIraDoBarbaro,
  calcularGolpeBarbaro,
  aplicarResistenciaBarbara,
  aplicarMuralhaDeFerro,
  calcularDefesaFisica,
  processarPosturaDoGuardiao,
  calcularUltimoBastiao,
  processarJuramentoDoGuardiao,
  aplicarDefesaCavaleiro,
  aplicarFluxoArcano,
  calcularMitigacaoMagicaEfetiva,
  processarExplosaoArcana,
  processarAcumuloArcano,
  aplicarCargasAcumuloArcano,
  processarCataclismoArcano,
  calcularGolpeFeiticeiro,
  aplicarPassosRapidos,
  calcularAgilidadeEfetiva,
  calcularMitigacaoFisicaEfetiva,
  processarRajadaDeGolpes,
  processarSedeDeSangueBandido,
  aplicarCargasSedeDeSangueBandido,
  processarDancaDasLaminas,
  calcularGolpeBandido,
  aplicarGracaDivina,
  processarBencaoDivina,
  processarFeInabalavel,
  aplicarCargasFeInabalavel,
  processarMilagreDivino,
  calcularAcaoProfeta,
  aplicarDisciplinaDoGuerreiro,
  processarIaijutsu,
  processarFocoAbsoluto,
  aplicarCargasFocoAbsoluto,
  processarCorteDoVazio,
  calcularGolpeSamurai,
  turnoDeCombate,
  resolverCombate,
  Combatente,
} from '../combat';
import { MONSTERS_MAP } from '../../rules/monsters';
import { GAME_CONFIG } from '../../rules/config';
import { calcularHpMax, calcularManaMax, calcularSobreescudoMax } from '../index';
import {
  createCharacter,
  applyCombatResult,
  getTransactionsByUid,
  resetCharacterStore,
} from '../../server/characterService';

describe('ORDEM 3 - Motor de Combate (Testes Puros e Sistema)', () => {
  beforeEach(() => {
    resetCharacterStore();
  });

  describe('Funções Puras de Combate', () => {
    it('iniciativa deve retornar o mais ágil ou resolver empate por seed de forma determinística', () => {
      // Agilidade maior vence
      expect(iniciativa(10, 5)).toBe('A');
      expect(iniciativa(3, 8)).toBe('B');

      // Empate: seed par dá 'A', seed ímpar dá 'B'
      expect(iniciativa(5, 5, 2)).toBe('A');
      expect(iniciativa(5, 5, 3)).toBe('B');
    });

    it('calcularDanoFisico e calcularDanoMagico (+1 por ponto)', () => {
      expect(calcularDanoFisico(5)).toBe(5);
      expect(calcularDanoFisico(0)).toBe(0);
      expect(calcularDanoMagico(8)).toBe(8);
      expect(calcularDanoMagico(0)).toBe(0);
    });

    it('turnoDeCombate respeita 2 ataques quando agilidade do atacante for o dobro ou mais', () => {
      const atacanteRapido: Combatente = {
        nome: 'Ladino',
        hp: 30,
        hpMax: 30,
        sobreescudo: 0,
        atributos: {
          vigor: 2,
          mente: 2,
          forca: 4,
          vitalidade: 0,
          arcano: 0,
          inteligencia: 0,
          agilidade: 6, // 6 >= 2 * 2 (dobro da agilidade)
        },
      };

      const defensorLento: Combatente = {
        nome: 'Golem',
        hp: 50,
        hpMax: 50,
        sobreescudo: 0,
        atributos: {
          vigor: 5,
          mente: 0,
          forca: 2,
          vitalidade: 0,
          arcano: 0,
          inteligencia: 0,
          agilidade: 2,
        },
      };

      const turno = turnoDeCombate(atacanteRapido, defensorLento, 1);
      // Deve ter desferido 2 ataques no turno
      expect(turno.turnoLog.ataques.length).toBe(2);
      expect(defensorLento.hp).toBe(50 - 4 * 2); // 42
    });
  });

  describe('1. Determinismo com Seed Fixa', () => {
    it('resolverCombate com seed fixa dá resultado determinístico e 100% repetível', () => {
      const char: Combatente = {
        nome: 'Aldor',
        hp: 30,
        hpMax: 30,
        sobreescudo: 0,
        atributos: {
          vigor: 4,
          mente: 2,
          forca: 4,
          vitalidade: 2,
          arcano: 0,
          inteligencia: 1,
          agilidade: 3,
        },
        ouro: 100,
      };

      const monstro = MONSTERS_MAP['cultista-das-sombras'];
      const seedFixa = 987654;

      const res1 = resolverCombate(char, monstro, seedFixa);
      const res2 = resolverCombate(char, monstro, seedFixa);

      expect(res1.vencedor).toBe(res2.vencedor);
      expect(res1.xpGanho).toBe(res2.xpGanho);
      expect(res1.ouroGanho).toBe(res2.ouroGanho);
      expect(res1.ouroPerdido).toBe(res2.ouroPerdido);
      expect(res1.logTurnos.length).toBe(res2.logTurnos.length);
      expect(res1.personagemFinal.hp).toBe(res2.personagemFinal.hp);
      expect(res1.personagemFinal.ouro).toBe(res2.personagemFinal.ouro);
    });
  });

  describe('2. Vitória: Ganho de XP e Ouro no Intervalo', () => {
    it('personagem vencendo ganha XP e ouro dentro do intervalo do monstro', () => {
      // Personagem forte o suficiente para vencer com certeza
      const heroiForte: Combatente = {
        nome: 'Campeão',
        hp: 80,
        hpMax: 80,
        sobreescudo: 10,
        atributos: {
          vigor: 10,
          mente: 2,
          forca: 10,
          vitalidade: 5,
          arcano: 0,
          inteligencia: 0,
          agilidade: 5,
        },
        ouro: 50,
      };

      const monstro = MONSTERS_MAP['rato-da-peste'];
      const res = resolverCombate(heroiForte, monstro, 123);

      expect(res.vencedor).toBe('personagem');
      expect(res.xpGanho).toBe(monstro.xpConcedido);
      expect(res.ouroGanho).toBeGreaterThanOrEqual(monstro.ouroConcedido.min);
      expect(res.ouroGanho).toBeLessThanOrEqual(monstro.ouroConcedido.max);
      expect(res.personagemFinal.ouro).toBe(50 + res.ouroGanho);
    });
  });

  describe('3. Derrota: Regra de Morte, HP/Mana Restaurados e Perda de Ouro', () => {
    it('personagem perdendo tem HP/Mana restaurados e perde até 50 de ouro (sem negativar)', () => {
      // Personagem fraco que certamente perderá para o Cavaleiro do Vazio
      const heroiFragil: Combatente = {
        nome: 'Novato',
        hp: 5,
        hpMax: 30,
        sobreescudo: 0,
        atributos: {
          vigor: 6, // 6 * 5 = 30 HP max
          mente: 4, // 4 * 5 = 20 Mana max
          forca: 1,
          vitalidade: 0,
          arcano: 0,
          inteligencia: 0,
          agilidade: 1,
        },
        ouro: 120,
      };

      const monstro = MONSTERS_MAP['cavaleiro-do-vazio'];
      const res = resolverCombate(heroiFragil, monstro, 456);

      expect(res.vencedor).toBe('monstro');
      expect(res.ouroPerdido).toBe(GAME_CONFIG.OURO_PERDIDO_MORTE); // 50
      expect(res.personagemFinal.ouro).toBe(120 - 50); // 70

      // HP e Mana restaurados ao valor máximo
      expect(res.personagemFinal.hp).toBe(calcularHpMax(heroiFragil.atributos.vigor)); // 30
      expect(res.personagemFinal.mana).toBe(calcularManaMax(heroiFragil.atributos.mente)); // 20

      // Teste com ouro menor que 50: não deve ficar negativo
      const heroiPobre: Combatente = {
        ...heroiFragil,
        ouro: 30,
      };
      const resPobre = resolverCombate(heroiPobre, monstro, 789);
      expect(resPobre.ouroPerdido).toBe(30);
      expect(resPobre.personagemFinal.ouro).toBe(0); // Não negativo
    });
  });

  describe('4. Level Up e Limite Máximo de Nível 30', () => {
    it('level up soma pontosDisponiveis por nível e nunca ultrapassa o nível 30', async () => {
      const uid = 'test_levelup_user';
      await createCharacter(uid, {
        nome: 'Ascendente',
        pontos: {
          vigor: 4,
          mente: 2,
          forca: 2,
          vitalidade: 2,
          arcano: 0,
          inteligencia: 0,
          agilidade: 0,
        },
      });

      // Simula resultado com vitória que concede 45 XP (nível 1 precisa de 20 XP)
      const fakeResultadoVitoria = {
        vencedor: 'personagem' as const,
        logTurnos: [],
        mensagens: [],
        xpGanho: 45,
        ouroGanho: 20,
        ouroPerdido: 0,
        personagemFinal: {
          hp: 30,
          hpMax: 30,
          mana: 20,
          manaMax: 20,
          ouro: 20,
        },
      };

      const { character, levelUps } = await applyCombatResult(
        uid,
        fakeResultadoVitoria,
        'Cultista das Sombras'
      );

      // Deve ter subido do nível 1 para o nível 2
      expect(levelUps).toBe(1);
      expect(character.nivel).toBe(2);
      expect(character.xpAtual).toBe(25); // 45 - 20 (necessário para o lvl 1) = 25
      expect(character.pontosDisponiveis).toBe(GAME_CONFIG.PONTOS_POR_NIVEL); // 3

      // Agora simula ganho massivo de XP para testar teto de nível 30
      const fakeResultadoMassivo = {
        vencedor: 'personagem' as const,
        logTurnos: [],
        mensagens: [],
        xpGanho: 200000, // XP massivo
        ouroGanho: 500,
        ouroPerdido: 0,
        personagemFinal: {
          hp: 30,
          hpMax: 30,
          mana: 20,
          manaMax: 20,
          ouro: 520,
        },
      };

      const resMassivo = await applyCombatResult(
        uid,
        fakeResultadoMassivo,
        'Dragão Ancestral'
      );

      expect(resMassivo.character.nivel).toBe(GAME_CONFIG.NIVEL_MAXIMO_GRAU_1); // 30
      expect(resMassivo.character.nivel).not.toBeGreaterThan(30);
      expect(resMassivo.character.pontosDisponiveis).toBeGreaterThan(0);
    });
  });

  describe('5. Registro de Transações (Coleção transactions/)', () => {
    it('toda vitória ou derrota com alteração de ouro grava uma transação na coleção transactions/', async () => {
      const uid = 'test_tx_user';
      await createCharacter(uid, {
        nome: 'Bancário',
        pontos: {
          vigor: 4,
          mente: 2,
          forca: 2,
          vitalidade: 2,
          arcano: 0,
          inteligencia: 0,
          agilidade: 0,
        },
      });

      // 1. Vitória com ganho de ouro
      const vitoria = {
        vencedor: 'personagem' as const,
        logTurnos: [],
        mensagens: [],
        xpGanho: 20,
        ouroGanho: 35,
        ouroPerdido: 0,
        personagemFinal: { hp: 30, hpMax: 30, mana: 20, manaMax: 20, ouro: 35 },
      };

      await applyCombatResult(uid, vitoria, 'Cultista das Sombras');
      let txs = getTransactionsByUid(uid);
      expect(txs.length).toBe(1);
      expect(txs[0].uid).toBe(uid);
      expect(txs[0].tipo).toBe('ganho');
      expect(txs[0].quantidade).toBe(35);
      expect(txs[0].motivo).toContain('Cultista das Sombras');
      expect(txs[0].timestamp).toBeDefined();

      // 2. Derrota com perda de ouro
      const derrota = {
        vencedor: 'monstro' as const,
        logTurnos: [],
        mensagens: [],
        xpGanho: 0,
        ouroGanho: 0,
        ouroPerdido: 35, // perde os 35 que tinha
        personagemFinal: { hp: 30, hpMax: 30, mana: 20, manaMax: 20, ouro: 0 },
      };

      await applyCombatResult(uid, derrota, 'Cavaleiro do Vazio');
      txs = getTransactionsByUid(uid);
      expect(txs.length).toBe(2);
      expect(txs[1].uid).toBe(uid);
      expect(txs[1].tipo).toBe('perda');
      expect(txs[1].quantidade).toBe(35);
      expect(txs[1].motivo).toContain('Cavaleiro do Vazio');
      expect(txs[1].timestamp).toBeDefined();
    });
  });

  describe('6. ORDEM 4 - Passiva Racial Adaptabilidade (+5% XP em Combate)', () => {
    it('POST /api/combat/start aplica +5% sobre o XP base do monstro (arredondado para baixo) antes de somar ao personagem Humano', async () => {
      const { POST } = await import('../../app/api/combat/start/route');
      const { NextRequest } = await import('next/server');

      const uid = 'combat_humano_xp_user';
      await createCharacter(uid, {
        nome: 'Vanguardista Humano',
        racaId: 'humano',
        pontos: {
          vigor: 4,
          mente: 0,
          forca: 4,
          vitalidade: 1,
          arcano: 0,
          inteligencia: 0,
          agilidade: 1,
        },
      });

      const req = new NextRequest('http://localhost:3000/api/combat/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer test-token-${uid}`,
        },
        body: JSON.stringify({
          monsterId: 'rato-da-peste', // XP base = 25 -> com +5% = floor(26.25) = 26
          seed: 42,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.resultado.vencedor).toBe('personagem');
      const xpBaseMonstro = MONSTERS_MAP['rato-da-peste'].xpConcedido; // 25
      const xpEsperado = Math.floor(xpBaseMonstro * 1.05); // 26
      expect(data.resultado.xpGanho).toBe(xpEsperado);
      // Como nível 1 requer 20 XP, 26 XP sobe para o nível 2 e sobra 6 XP
      expect(data.character.nivel).toBe(2);
      expect(data.character.xpAtual).toBe(xpEsperado - 20); // 6
    });
  });

  describe('7. ORDEM 8 - Passiva Racial Sede de Sangue (Vampiro)', () => {
    it('um Vampiro causando dano físico recupera 5% desse dano em HP (função pura e turnoDeCombate)', () => {
      // Teste direto da função pura: 20 HP atual, 50 HP máx, causando 40 de dano físico -> recupera 5% de 40 = 2 HP -> 22 HP
      expect(aplicarSedeDeSangue(20, 50, 40)).toBe(22);

      // Teste integrado no turno de combate: Vampiro ferido (20/50 HP) com Força 40 causa 40 de dano físico e recupera 2 HP
      const vampiroAtacante: Combatente = {
        nome: 'Lord Noctis',
        racaId: 'vampiro',
        hp: 20,
        hpMax: 50,
        sobreescudo: 0,
        atributos: {
          vigor: 10,
          mente: 3,
          forca: 40,
          vitalidade: 0,
          arcano: 1,
          inteligencia: 0,
          agilidade: 2,
        },
      };

      const alvo: Combatente = {
        nome: 'Guardião de Pedra',
        hp: 100,
        hpMax: 100,
        sobreescudo: 0,
        atributos: {
          vigor: 20,
          mente: 0,
          forca: 5,
          vitalidade: 0,
          arcano: 0,
          inteligencia: 0,
          agilidade: 2,
        },
      };

      const resultadoTurno = turnoDeCombate(vampiroAtacante, alvo, 1);
      expect(resultadoTurno.defensorHp).toBe(60); // 100 - 40
      expect(resultadoTurno.atacanteHp).toBe(22); // 20 + 5% de 40 (2) = 22
      expect(vampiroAtacante.hp).toBe(22);
    });

    it('a cura da Sede de Sangue nunca ultrapassa o HP máximo mesmo que o cálculo passe do teto', () => {
      // Função pura: 49 HP atual, 50 HP máx, causando 100 de dano físico -> 5% de 100 = 5 de cura -> 49 + 5 = 54, limitado a 50
      expect(aplicarSedeDeSangue(49, 50, 100)).toBe(50);
      expect(aplicarSedeDeSangue(50, 50, 100)).toBe(50);

      // Teste integrado em turnoDeCombate: Vampiro com 49/50 HP causando 100 de dano físico fica cravado em 50/50 HP
      const vampiroQuaseCheio: Combatente = {
        nome: 'Conde Vorador',
        racaId: 'vampiro',
        hp: 49,
        hpMax: 50,
        sobreescudo: 0,
        atributos: {
          vigor: 10,
          mente: 3,
          forca: 100,
          vitalidade: 0,
          arcano: 1,
          inteligencia: 0,
          agilidade: 2,
        },
      };

      const alvo: Combatente = {
        nome: 'Colosso',
        hp: 200,
        hpMax: 200,
        sobreescudo: 0,
        atributos: {
          vigor: 40,
          mente: 0,
          forca: 5,
          vitalidade: 0,
          arcano: 0,
          inteligencia: 0,
          agilidade: 2,
        },
      };

      const resultadoTurno = turnoDeCombate(vampiroQuaseCheio, alvo, 1);
      expect(resultadoTurno.atacanteHp).toBe(50);
      expect(vampiroQuaseCheio.hp).toBe(50);
    });
  });

  describe('8. ORDEM 10 - Sistema de Classes (Bárbaro em Combate)', () => {
    const criarAlvoSacoDePancadas = (): Combatente => ({
      nome: 'Boneco de Treino',
      hp: 1000,
      hpMax: 1000,
      sobreescudo: 0,
      atributos: {
        vigor: 200,
        mente: 0,
        forca: 1,
        vitalidade: 0,
        arcano: 0,
        inteligencia: 0,
        agilidade: 1,
      },
    });

    it('um Bárbaro nível 1 lutando não aciona nenhuma habilidade além do ataque básico', () => {
      const barbaroLv1: Combatente = {
        nome: 'Bárbaro Nv1',
        classeId: 'barbaro',
        nivel: 1,
        hp: 30,
        hpMax: 100, // Mesmo abaixo de 30% de HP, nível 1 não ativa Instinto nem Fúria nem Ira
        sobreescudo: 0,
        atributos: {
          vigor: 20,
          mente: 2,
          forca: 10,
          vitalidade: 2,
          arcano: 0,
          inteligencia: 0,
          agilidade: 1,
        },
      };

      const alvo = criarAlvoSacoDePancadas();
      const habilidades: string[] = [];

      for (let t = 1; t <= 10; t++) {
        const res = turnoDeCombate(barbaroLv1, alvo, t);
        for (const atk of res.turnoLog.ataques) {
          habilidades.push(atk.habilidadeAcionada || '');
          expect(atk.danoEfetivo).toBe(10); // Apenas o dano físico normal da Força 10
          expect(atk.instintoSobrevivenciaAtivo).toBe(false);
          expect(atk.iraAbaixo30Ativo).toBe(false);
        }
      }

      expect(habilidades).toHaveLength(10);
      expect(habilidades.every((h) => h === 'Golpe Bárbaro')).toBe(true);
    });

    it('um Bárbaro nível 5+ aciona Fúria Selvagem exatamente no 3º, 6º, 9º ataque básico (contador reinicia)', () => {
      const barbaroLv5: Combatente = {
        nome: 'Bárbaro Nv5',
        classeId: 'barbaro',
        nivel: 5,
        hp: 100,
        hpMax: 100,
        sobreescudo: 0,
        atributos: {
          vigor: 20,
          mente: 2,
          forca: 10,
          vitalidade: 2,
          arcano: 0,
          inteligencia: 0,
          agilidade: 1,
        },
      };

      const alvo = criarAlvoSacoDePancadas();
      const habilidadesPorAtaque: string[] = [];
      const danosPorAtaque: number[] = [];

      for (let t = 1; t <= 9; t++) {
        const res = turnoDeCombate(barbaroLv5, alvo, t);
        const atk = res.turnoLog.ataques[0];
        habilidadesPorAtaque.push(atk.habilidadeAcionada || '');
        danosPorAtaque.push(atk.danoEfetivo);
      }

      expect(habilidadesPorAtaque).toEqual([
        'Golpe Bárbaro', // 1º
        'Golpe Bárbaro', // 2º
        'Fúria Selvagem', // 3º (reinicia contador para 0)
        'Golpe Bárbaro', // 4º
        'Golpe Bárbaro', // 5º
        'Fúria Selvagem', // 6º (reinicia contador para 0)
        'Golpe Bárbaro', // 7º
        'Golpe Bárbaro', // 8º
        'Fúria Selvagem', // 9º (reinicia contador para 0)
      ]);

      // Contador deve ter reiniciado para 0 após o 9º ataque
      expect(barbaroLv5.contadorFuriaSelvagem).toBe(0);

      // O golpe de Fúria Selvagem causa mais dano que o ataque básico (10 + 3 Força + 2 dano adicional = 15)
      expect(danosPorAtaque[0]).toBe(10);
      expect(danosPorAtaque[2]).toBeGreaterThan(danosPorAtaque[0]);
      expect(danosPorAtaque[5]).toBe(danosPorAtaque[2]);
      expect(danosPorAtaque[8]).toBe(danosPorAtaque[2]);
    });

    it('um Bárbaro nível 12+ com HP abaixo de 50% causa mais dano físico que um idêntico com HP cheio (e <25% não acumula)', () => {
      const atributosIguais = {
        vigor: 20,
        mente: 2,
        forca: 10,
        vitalidade: 2,
        arcano: 0,
        inteligencia: 0,
        agilidade: 1,
      };

      const barbaroCheio: Combatente = {
        nome: 'Bárbaro HP Cheio',
        classeId: 'barbaro',
        nivel: 12,
        hp: 100,
        hpMax: 100,
        sobreescudo: 0,
        atributos: { ...atributosIguais },
      };

      const barbaroFerido40: Combatente = {
        nome: 'Bárbaro HP 40%',
        classeId: 'barbaro',
        nivel: 12,
        hp: 40,
        hpMax: 100,
        sobreescudo: 0,
        atributos: { ...atributosIguais },
      };

      const barbaroCritico20: Combatente = {
        nome: 'Bárbaro HP 20%',
        classeId: 'barbaro',
        nivel: 12,
        hp: 20,
        hpMax: 100,
        sobreescudo: 0,
        atributos: { ...atributosIguais },
      };

      const resCheio = turnoDeCombate(barbaroCheio, criarAlvoSacoDePancadas(), 1);
      const resFerido40 = turnoDeCombate(barbaroFerido40, criarAlvoSacoDePancadas(), 1);
      const resCritico20 = turnoDeCombate(barbaroCritico20, criarAlvoSacoDePancadas(), 1);

      const danoCheio = resCheio.turnoLog.ataques[0].danoEfetivo;
      const danoFerido40 = resFerido40.turnoLog.ataques[0].danoEfetivo;
      const danoCritico20 = resCritico20.turnoLog.ataques[0].danoEfetivo;

      expect(danoFerido40).toBeGreaterThan(danoCheio);
      expect(danoCritico20).toBeGreaterThan(danoFerido40);

      // Verifica que a função pura não acumula os dois tiers (<25% substitui <50%)
      const instinto20 = calcularInstintoSobrevivencia(20, 100, 12);
      expect(instinto20.faixa).toBe('abaixo25');
      expect(instinto20.bonusForca).toBe(4); // e não 2 + 4 = 6
      expect(instinto20.percentualBonusDano).toBe(20); // e não 10 + 20 = 30
    });

    it('um Bárbaro nível 20+ tem HP máximo e Sobreescudo máximo maiores que um idêntico nível 19', () => {
      const vigor = 10; // Base 50 HP
      const vitalidade = 5; // Base 10 Sobreescudo

      const hpLv19 = calcularHpMax(vigor, { classeId: 'barbaro', nivel: 19 });
      const hpLv20 = calcularHpMax(vigor, { classeId: 'barbaro', nivel: 20 });

      const escudoLv19 = calcularSobreescudoMax(vitalidade, { classeId: 'barbaro', nivel: 19 });
      const escudoLv20 = calcularSobreescudoMax(vitalidade, { classeId: 'barbaro', nivel: 20 });

      expect(hpLv20).toBeGreaterThan(hpLv19);
      expect(escudoLv20).toBeGreaterThan(escudoLv19);
      expect(hpLv20).toBe(55); // +10% de 50
      expect(escudoLv20).toBe(11); // ceil(10 * 1.05) = 11

      const resPura = aplicarResistenciaBarbara(100, 20, 20, 'barbaro');
      expect(resPura.hpMax).toBe(110);
      expect(resPura.sobreescudoMax).toBe(21);
    });

    it('um Bárbaro nível 30 aciona Ira do Bárbaro no 7º ataque básico, com bônus extra se HP < 30%', () => {
      const criarBarbaroLv30 = (hpAtual: number): Combatente => ({
        nome: 'Bárbaro Nv30',
        classeId: 'barbaro',
        nivel: 30,
        hp: hpAtual,
        hpMax: 100,
        sobreescudo: 0,
        atributos: {
          vigor: 20,
          mente: 2,
          forca: 15,
          vitalidade: 5,
          arcano: 0,
          inteligencia: 0,
          agilidade: 1,
        },
      });

      const barbaroNormal = criarBarbaroLv30(80); // 80% HP
      const barbaroAbaixo30 = criarBarbaroLv30(25); // 25% HP (< 30%)

      const alvo1 = criarAlvoSacoDePancadas();
      const alvo2 = criarAlvoSacoDePancadas();

      const habilidadesNormal: string[] = [];
      let danoIraNormal = 0;
      let danoIraAbaixo30 = 0;

      for (let t = 1; t <= 7; t++) {
        const r1 = turnoDeCombate(barbaroNormal, alvo1, t);
        const r2 = turnoDeCombate(barbaroAbaixo30, alvo2, t);

        const atk1 = r1.turnoLog.ataques[0];
        const atk2 = r2.turnoLog.ataques[0];

        habilidadesNormal.push(atk1.habilidadeAcionada || '');

        if (t === 7) {
          danoIraNormal = atk1.danoEfetivo;
          danoIraAbaixo30 = atk2.danoEfetivo;
          expect(atk1.habilidadeAcionada).toBe('Ira do Bárbaro');
          expect(atk2.habilidadeAcionada).toBe('Ira do Bárbaro');
          expect(atk1.iraAbaixo30Ativo).toBe(false);
          expect(atk2.iraAbaixo30Ativo).toBe(true);
        }
      }

      // 3º e 6º foram Fúria Selvagem, 7º foi Ira do Bárbaro
      expect(habilidadesNormal[2]).toBe('Fúria Selvagem');
      expect(habilidadesNormal[5]).toBe('Fúria Selvagem');
      expect(habilidadesNormal[6]).toBe('Ira do Bárbaro');

      // Contador de Ira reiniciou para 0 após o 7º ataque
      expect(barbaroNormal.contadorIraBarbaro).toBe(0);
      expect(barbaroAbaixo30.contadorIraBarbaro).toBe(0);

      // Com HP < 30%, a Ira do Bárbaro recebe bônus extra e causa mais dano que com HP >= 30%
      expect(danoIraAbaixo30).toBeGreaterThan(danoIraNormal);

      // Teste direto da função pura processarIraDoBarbaro no 7º ataque (contador 6 -> 7)
      const iraPuraNormal = processarIraDoBarbaro(6, 80, 100, 30);
      const iraPuraCritica = processarIraDoBarbaro(6, 20, 100, 30);
      expect(iraPuraNormal.acionada).toBe(true);
      expect(iraPuraNormal.novoContador).toBe(0);
      expect(iraPuraNormal.bonusExtraAbaixo30Ativo).toBe(false);
      expect(iraPuraCritica.acionada).toBe(true);
      expect(iraPuraCritica.novoContador).toBe(0);
      expect(iraPuraCritica.bonusExtraAbaixo30Ativo).toBe(true);
      expect(iraPuraCritica.bonusForca).toBeGreaterThan(iraPuraNormal.bonusForca);
      expect(iraPuraCritica.percentualBonusDano).toBeGreaterThan(iraPuraNormal.percentualBonusDano);
    });
  });

  describe('9. ORDEM 11 - Sistema de Classes (Cavaleiro em Combate)', () => {
    const criarMonstroAtacante = (forca: number = 30): Combatente => ({
      nome: 'Brutamontes Abissal',
      hp: 1000,
      hpMax: 1000,
      sobreescudo: 0,
      atributos: {
        vigor: 200,
        mente: 0,
        forca,
        vitalidade: 0,
        arcano: 0,
        inteligencia: 0,
        agilidade: 1,
      },
    });

    it('Cavaleiro nível 5+ aciona Postura do Guardião no 3º, 6º, 9º ataque básico (após realizar 3 ataques básicos) e aplica no próximo turno defensivo', () => {
      const cavaleiroLv5: Combatente = {
        nome: 'Sir Roland',
        classeId: 'cavaleiro',
        nivel: 5,
        hp: 100,
        hpMax: 100,
        sobreescudo: 10,
        atributos: {
          vigor: 20,
          mente: 2,
          forca: 8,
          vitalidade: 5,
          arcano: 0,
          inteligencia: 0,
          agilidade: 1,
        },
      };

      const monstro = criarMonstroAtacante(25);
      const habilidadesPorAtaque: string[] = [];

      for (let t = 1; t <= 9; t++) {
        const res = turnoDeCombate(cavaleiroLv5, monstro, t);
        const atk = res.turnoLog.ataques[0];
        habilidadesPorAtaque.push(atk.habilidadeAcionada || '');
      }

      expect(habilidadesPorAtaque).toEqual([
        'Golpe do Guardião', // 1º
        'Golpe do Guardião', // 2º
        'Postura do Guardião', // 3º (contador reinicia para 0 e ativa postura para o próximo turno defensivo)
        'Golpe do Guardião', // 4º
        'Golpe do Guardião', // 5º
        'Postura do Guardião', // 6º
        'Golpe do Guardião', // 7º
        'Golpe do Guardião', // 8º
        'Postura do Guardião', // 9º
      ]);

      expect(cavaleiroLv5.contadorPosturaGuardiao).toBe(0);
      expect(cavaleiroLv5.posturaGuardiaoAtiva).toBe(true);

      // No próximo turno defensivo (monstro ataca o Cavaleiro com Postura do Guardião ativa),
      // o dano recebido é reduzido, o Sobreescudo absorve parte adicional e a postura é consumida
      const cavaleiroSemPostura: Combatente = {
        ...cavaleiroLv5,
        atributos: { ...cavaleiroLv5.atributos },
        posturaGuardiaoAtiva: false,
      };

      const defComPostura = turnoDeCombate(criarMonstroAtacante(30), cavaleiroLv5, 10);
      const defSemPostura = turnoDeCombate(criarMonstroAtacante(30), cavaleiroSemPostura, 10);

      expect(defComPostura.turnoLog.ataques[0].posturaDefensivaAplicada).toBe(true);
      expect(defComPostura.turnoLog.ataques[0].danoEfetivo).toBeLessThan(
        defSemPostura.turnoLog.ataques[0].danoEfetivo
      );
      expect(defComPostura.defensorHp).toBeGreaterThan(defSemPostura.defensorHp);
      // Postura é consumida após o turno defensivo
      expect(cavaleiroLv5.posturaGuardiaoAtiva).toBe(false);
    });

    it('Cavaleiro nível 12+ tem Defesa Física e Sobreescudo máximo maiores que nível 11 (Muralha de Ferro)', () => {
      const vitalidade = 10; // Base Defesa = 10, Base Sobreescudo = 20

      const defLv11 = calcularDefesaFisica(vitalidade, { classeId: 'cavaleiro', nivel: 11 });
      const defLv12 = calcularDefesaFisica(vitalidade, { classeId: 'cavaleiro', nivel: 12 });

      const escudoLv11 = calcularSobreescudoMax(vitalidade, { classeId: 'cavaleiro', nivel: 11 });
      const escudoLv12 = calcularSobreescudoMax(vitalidade, { classeId: 'cavaleiro', nivel: 12 });

      expect(defLv12).toBeGreaterThan(defLv11);
      expect(escudoLv12).toBeGreaterThan(escudoLv11);
      expect(defLv12).toBe(11); // +10% de 10
      expect(escudoLv12).toBe(22); // +10% de 20

      const muralhaPura = aplicarMuralhaDeFerro(20, 40, 12, 'cavaleiro');
      expect(muralhaPura.defesaFisica).toBe(22);
      expect(muralhaPura.sobreescudoMax).toBe(44);
    });

    it('Cavaleiro nível 20+ com HP abaixo de 30% recebe menos dano que um idêntico com HP cheio (Último Bastião)', () => {
      const atributosIguais = {
        vigor: 20,
        mente: 2,
        forca: 8,
        vitalidade: 10,
        arcano: 0,
        inteligencia: 0,
        agilidade: 1,
      };

      const cavaleiroHpCheio: Combatente = {
        nome: 'Cavaleiro HP Cheio',
        classeId: 'cavaleiro',
        nivel: 20,
        hp: 100,
        hpMax: 100,
        sobreescudo: 0,
        atributos: { ...atributosIguais },
      };

      const cavaleiroHpAbaixo30: Combatente = {
        nome: 'Cavaleiro HP 25%',
        classeId: 'cavaleiro',
        nivel: 20,
        hp: 25, // 25% < 30%
        hpMax: 100,
        sobreescudo: 0,
        atributos: { ...atributosIguais },
      };

      const monstro1 = criarMonstroAtacante(40);
      const monstro2 = criarMonstroAtacante(40);

      const resCheio = turnoDeCombate(monstro1, cavaleiroHpCheio, 1);
      const resAbaixo30 = turnoDeCombate(monstro2, cavaleiroHpAbaixo30, 1);

      const atkCheio = resCheio.turnoLog.ataques[0];
      const atkAbaixo30 = resAbaixo30.turnoLog.ataques[0];

      expect(atkCheio.ultimoBastiaoAtivo).toBe(false);
      expect(atkAbaixo30.ultimoBastiaoAtivo).toBe(true);
      expect(atkAbaixo30.danoEfetivo).toBeLessThan(atkCheio.danoEfetivo);
    });

    it('Cavaleiro nível 30 aciona Juramento do Guardião no 7º ataque básico e reduz o dano no próximo turno defensivo', () => {
      const cavaleiroLv30: Combatente = {
        nome: 'Lorde Guardião',
        classeId: 'cavaleiro',
        nivel: 30,
        hp: 100,
        hpMax: 100,
        sobreescudo: 20,
        atributos: {
          vigor: 20,
          mente: 2,
          forca: 10,
          vitalidade: 10,
          arcano: 0,
          inteligencia: 0,
          agilidade: 1,
        },
      };

      const monstro = criarMonstroAtacante(50);
      const habilidades: string[] = [];

      for (let t = 1; t <= 7; t++) {
        const res = turnoDeCombate(cavaleiroLv30, monstro, t);
        habilidades.push(res.turnoLog.ataques[0].habilidadeAcionada || '');
      }

      // 3º e 6º acionam Postura do Guardião; 7º aciona Juramento do Guardião
      expect(habilidades[2]).toBe('Postura do Guardião');
      expect(habilidades[5]).toBe('Postura do Guardião');
      expect(habilidades[6]).toBe('Juramento do Guardião');
      expect(cavaleiroLv30.contadorJuramentoGuardiao).toBe(0);
      expect(cavaleiroLv30.juramentoGuardiaoAtivo).toBe(true);

      // No próximo turno defensivo, o Juramento reduz drasticamente o dano recebido
      const cavaleiroSemJuramento: Combatente = {
        ...cavaleiroLv30,
        atributos: { ...cavaleiroLv30.atributos },
        posturaGuardiaoAtiva: false,
        juramentoGuardiaoAtivo: false,
      };
      // Testando exclusivamente o efeito do Juramento do Guardião no turno defensivo
      cavaleiroLv30.posturaGuardiaoAtiva = false;

      const defComJuramento = turnoDeCombate(criarMonstroAtacante(50), cavaleiroLv30, 8);
      const defSemJuramento = turnoDeCombate(criarMonstroAtacante(50), cavaleiroSemJuramento, 8);

      expect(defComJuramento.turnoLog.ataques[0].juramentoDefensivoAplicado).toBe(true);
      expect(defComJuramento.turnoLog.ataques[0].danoEfetivo).toBeLessThan(
        defSemJuramento.turnoLog.ataques[0].danoEfetivo
      );
      expect(cavaleiroLv30.juramentoGuardiaoAtivo).toBe(false);
    });
  });

  describe('10. ORDEM 12 - Sistema de Classes (Feiticeiro em Combate)', () => {
    const criarAlvoMagico = (mitigacao: number = 10, sobreescudo: number = 0): Combatente => ({
      nome: 'Golem Rúnico',
      hp: 2000,
      hpMax: 2000,
      sobreescudo,
      mitigacao,
      atributos: {
        vigor: 200,
        mente: 10,
        forca: 1,
        vitalidade: 0,
        arcano: 0,
        inteligencia: 0,
        agilidade: 1,
      },
    });

    it('Feiticeiro nível 5+ aciona Explosão Arcana no 3º, 6º, 9º ataque com 200% de dano mágico e ignorando 10% da Defesa Mágica do alvo', () => {
      const feiticeiroLv5: Combatente = {
        nome: 'Feiticeiro Nv5',
        classeId: 'feiticeiro',
        nivel: 5,
        hp: 100,
        hpMax: 100,
        sobreescudo: 0,
        atributos: {
          vigor: 10,
          mente: 10,
          forca: 2,
          vitalidade: 0,
          arcano: 5,
          inteligencia: 20, // Dano mágico base = 20
          agilidade: 1,
        },
      };

      const alvo = criarAlvoMagico(10, 0); // Mitigação mágica = 10
      const habilidades: string[] = [];
      const danosBrutos: number[] = [];
      const danosEfetivos: number[] = [];

      for (let t = 1; t <= 9; t++) {
        const res = turnoDeCombate(feiticeiroLv5, alvo, t);
        const atk = res.turnoLog.ataques[0];
        habilidades.push(atk.habilidadeAcionada || '');
        danosBrutos.push(atk.danoBruto);
        danosEfetivos.push(atk.danoEfetivo);
      }

      expect(habilidades).toEqual([
        'Faísca Arcana', // 1º
        'Faísca Arcana', // 2º
        'Explosão Arcana', // 3º (reinicia contador A)
        'Faísca Arcana', // 4º
        'Faísca Arcana', // 5º
        'Explosão Arcana', // 6º (reinicia contador A)
        'Faísca Arcana', // 7º
        'Faísca Arcana', // 8º
        'Explosão Arcana', // 9º (reinicia contador A)
      ]);

      expect(feiticeiroLv5.contadorExplosaoArcana).toBe(0);

      // No ataque normal (Faísca Arcana): danoBruto = 20, mitigação = 10 -> danoEfetivo = 10
      expect(danosBrutos[0]).toBe(20);
      expect(danosEfetivos[0]).toBe(10);

      // Na Explosão Arcana (3º, 6º, 9º): danoBruto = 40 (200% de 20), mitigação reduzida em 10% (10 -> 9) -> danoEfetivo = 31
      expect(danosBrutos[2]).toBe(40);
      expect(danosEfetivos[2]).toBe(31);
      expect(danosEfetivos[5]).toBe(31);
      expect(danosEfetivos[8]).toBe(31);
    });

    it('Feiticeiro nível 12+ tem Mana máxima e dano mágico base maiores que nível 11 (Fluxo Arcano +10%)', () => {
      const mente = 10; // Base Mana = 50
      const inteligencia = 20; // Base Dano Mágico = 20

      const manaLv11 = calcularManaMax(mente, { classeId: 'feiticeiro', nivel: 11 });
      const manaLv12 = calcularManaMax(mente, { classeId: 'feiticeiro', nivel: 12 });

      const danoLv11 = calcularDanoMagico(inteligencia, { classeId: 'feiticeiro', nivel: 11 });
      const danoLv12 = calcularDanoMagico(inteligencia, { classeId: 'feiticeiro', nivel: 12 });

      expect(manaLv12).toBeGreaterThan(manaLv11);
      expect(danoLv12).toBeGreaterThan(danoLv11);
      expect(manaLv11).toBe(50);
      expect(manaLv12).toBe(55); // +10%
      expect(danoLv11).toBe(20);
      expect(danoLv12).toBe(22); // +10%

      const fluxoPuro = aplicarFluxoArcano(100, 30, 12, 'feiticeiro');
      expect(fluxoPuro.manaMax).toBe(110);
      expect(fluxoPuro.danoMagico).toBe(33);
    });

    it('Feiticeiro nível 20+ acumula até 3 cargas de Acúmulo Arcano e aplica o bônus certo no ataque que as consome, rodando junto e independente da Explosão Arcana', () => {
      // 1) Verifica que o acumulador acumula corretamente até o limite máximo de 3 cargas (a cada 3 ataques do contador B)
      let contadorB = 0;
      let cargas = 0;
      for (let i = 1; i <= 12; i++) {
        const res = processarAcumuloArcano(contadorB, cargas, 20);
        contadorB = res.novoContador;
        cargas = res.novasCargas;
        if (i === 3) expect(cargas).toBe(1);
        if (i === 6) expect(cargas).toBe(2);
        if (i === 9) expect(cargas).toBe(3);
        if (i === 12) expect(cargas).toBe(3); // teto de 3 cargas
      }

      // 2) Rodando Explosão Arcana (contador A) e Acúmulo Arcano (contador B) JUNTOS em combate real:
      // Caso sincronizado inicial (ambos em 0):
      // - No 3º ataque: Explosão Arcana dispara (contador A: 2->3->0) e Acúmulo Arcano gera 1 carga para o próximo ataque (contador B: 2->3->0, cargas = 1)
      // - No 4º ataque: Faísca Arcana consome a 1 carga (+10% dano), zerando as cargas, enquanto contador A e B avançam para 1
      const feiticeiroSync: Combatente = {
        nome: 'Feiticeiro Nv20 Sync',
        classeId: 'feiticeiro',
        nivel: 20,
        hp: 100,
        hpMax: 100,
        sobreescudo: 0,
        atributos: {
          vigor: 10,
          mente: 10,
          forca: 0,
          vitalidade: 0,
          arcano: 5,
          inteligencia: 20, // Com Fluxo Arcano (Nv12+): dano mágico base = 22
          agilidade: 1,
        },
      };

      const alvoSync = criarAlvoMagico(0, 0);
      const t1 = turnoDeCombate(feiticeiroSync, alvoSync, 1).turnoLog.ataques[0];
      const t2 = turnoDeCombate(feiticeiroSync, alvoSync, 2).turnoLog.ataques[0];
      const t3 = turnoDeCombate(feiticeiroSync, alvoSync, 3).turnoLog.ataques[0];

      expect(t1.habilidadeAcionada).toBe('Faísca Arcana');
      expect(t1.danoBruto).toBe(22);
      expect(t2.habilidadeAcionada).toBe('Faísca Arcana');
      expect(t2.danoBruto).toBe(22);

      // 3º ataque: Explosão Arcana (200% de 22 = 44) e acumula 1 carga para o próximo ataque
      expect(t3.habilidadeAcionada).toBe('Explosão Arcana');
      expect(t3.danoBruto).toBe(44);
      expect(t3.cargasAcumuloRestantes).toBe(1);
      expect(feiticeiroSync.cargasAcumuloArcano).toBe(1);

      // 4º ataque: consome a 1 carga acumulada (+10% de 22 = ceil(24.2) = 25) e zera cargas
      const t4 = turnoDeCombate(feiticeiroSync, alvoSync, 4).turnoLog.ataques[0];
      expect(t4.habilidadeAcionada).toBe('Faísca Arcana');
      expect(t4.cargasAcumuloConsumidas).toBe(1);
      expect(t4.cargasAcumuloRestantes).toBe(0);
      expect(t4.danoBruto).toBe(25);
      expect(feiticeiroSync.cargasAcumuloArcano).toBe(0);
      expect(feiticeiroSync.contadorAcumuloArcano).toBe(1);
      expect(feiticeiroSync.contadorExplosaoArcana).toBe(1);

      // 3) Teste com contadores A e B defasados e 3 cargas acumuladas rodando juntos:
      // Contador A = 1 (falta 2 para Explosão), Contador B = 1 (falta 2 para nova carga), Cargas = 3
      const feiticeiroDefasado: Combatente = {
        nome: 'Feiticeiro Nv20 Defasado',
        classeId: 'feiticeiro',
        nivel: 20,
        hp: 100,
        hpMax: 100,
        sobreescudo: 0,
        contadorExplosaoArcana: 0, // vai para 1, 2, 3 (Explosão no 3º golpe daqui)
        contadorAcumuloArcano: 1, // vai para 2, 3 (nova carga no 2º golpe daqui!)
        cargasAcumuloArcano: 3, // 3 cargas prontas (+30%)
        atributos: {
          vigor: 10,
          mente: 10,
          forca: 0,
          vitalidade: 0,
          arcano: 5,
          inteligencia: 20, // base c/ Fluxo = 22
          agilidade: 1,
        },
      };

      // Golpe 1: consome as 3 cargas (+30% sobre 22 = ceil(28.6) = 29).
      // Contador A vai de 0 -> 1. Contador B NÃO reinicia ao consumir cargas: vai de 1 -> 2!
      const g1 = turnoDeCombate(feiticeiroDefasado, alvoSync, 1).turnoLog.ataques[0];
      expect(g1.habilidadeAcionada).toBe('Faísca Arcana');
      expect(g1.cargasAcumuloConsumidas).toBe(3);
      expect(g1.danoBruto).toBe(29);
      expect(feiticeiroDefasado.cargasAcumuloArcano).toBe(0);
      expect(feiticeiroDefasado.contadorExplosaoArcana).toBe(1);
      expect(feiticeiroDefasado.contadorAcumuloArcano).toBe(2);

      // Golpe 2: Contador B chega a 3 (2 -> 3 -> 0) e ganha 1 carga, enquanto Contador A vai de 1 -> 2 (não é Explosão ainda!)
      const g2 = turnoDeCombate(feiticeiroDefasado, alvoSync, 2).turnoLog.ataques[0];
      expect(g2.habilidadeAcionada).toBe('Faísca Arcana');
      expect(g2.cargasAcumuloConsumidas).toBe(0);
      expect(g2.cargasAcumuloRestantes).toBe(1);
      expect(feiticeiroDefasado.contadorExplosaoArcana).toBe(2);
      expect(feiticeiroDefasado.contadorAcumuloArcano).toBe(0);
      expect(feiticeiroDefasado.cargasAcumuloArcano).toBe(1);

      // Golpe 3: Contador A chega a 3 (2 -> 3 -> 0 -> Explosão Arcana!) E consome a 1 carga ganha no Golpe 2!
      // Explosão Arcana (200% de 22 = 44) + 1 carga (+10% de 44 = ceil(48.4) = 49)
      const g3 = turnoDeCombate(feiticeiroDefasado, alvoSync, 3).turnoLog.ataques[0];
      expect(g3.habilidadeAcionada).toBe('Explosão Arcana');
      expect(g3.cargasAcumuloConsumidas).toBe(1);
      expect(g3.danoBruto).toBe(49);
      expect(feiticeiroDefasado.contadorExplosaoArcana).toBe(0);
      expect(feiticeiroDefasado.contadorAcumuloArcano).toBe(1);
      expect(feiticeiroDefasado.cargasAcumuloArcano).toBe(0);
    });

    it('Feiticeiro nível 30 aciona Cataclismo Arcano no 7º ataque com 400% dano mágico, ignorando 20% da Defesa Mágica e +25% de dano contra Sobreescudo', () => {
      const criarFeiticeiroLv30 = (): Combatente => ({
        nome: 'Arquimago do Caos',
        classeId: 'feiticeiro',
        nivel: 30,
        hp: 100,
        hpMax: 100,
        sobreescudo: 0,
        atributos: {
          vigor: 10,
          mente: 15,
          forca: 0,
          vitalidade: 0,
          arcano: 10,
          inteligencia: 20, // Dano mágico base com Fluxo Arcano (+10%) = 22
          agilidade: 1,
        },
      });

      const feiticeiroSemEscudoAlvo = criarFeiticeiroLv30();
      const feiticeiroComEscudoAlvo = criarFeiticeiroLv30();

      // Mitigação mágica = 20 (20% ignorado -> mitigação efetiva = 16)
      const alvoSemEscudo = criarAlvoMagico(20, 0);
      const alvoComEscudo = criarAlvoMagico(20, 500);

      const habilidades: string[] = [];
      let atk7SemEscudo = turnoDeCombate(feiticeiroSemEscudoAlvo, alvoSemEscudo, 1).turnoLog
        .ataques[0];
      let atk7ComEscudo = turnoDeCombate(feiticeiroComEscudoAlvo, alvoComEscudo, 1).turnoLog
        .ataques[0];
      habilidades.push(atk7SemEscudo.habilidadeAcionada || '');

      for (let t = 2; t <= 7; t++) {
        atk7SemEscudo = turnoDeCombate(feiticeiroSemEscudoAlvo, alvoSemEscudo, t).turnoLog
          .ataques[0];
        atk7ComEscudo = turnoDeCombate(feiticeiroComEscudoAlvo, alvoComEscudo, t).turnoLog
          .ataques[0];
        habilidades.push(atk7SemEscudo.habilidadeAcionada || '');
      }

      // 3º e 6º ataques são Explosão Arcana; 7º ataque é Cataclismo Arcano
      expect(habilidades[2]).toBe('Explosão Arcana');
      expect(habilidades[5]).toBe('Explosão Arcana');
      expect(habilidades[6]).toBe('Cataclismo Arcano');
      expect(feiticeiroSemEscudoAlvo.contadorCataclismoArcano).toBe(0);

      // Nota: no 6º ataque, o contador B completou o 2º ciclo (ataque 6) e gerou 1 carga para o 7º ataque!
      // Então no 7º ataque (Cataclismo Arcano):
      // - Sem Sobreescudo no alvo: 22 * 400% = 88; com +10% da 1 carga = ceil(96.8) = 97.
      //   Mitigação 20 ignorando 20% = 16 -> danoEfetivo = 97 - 16 = 81.
      // - Com Sobreescudo no alvo: recebe +25% adicional sobre 97 = ceil(97 * 1.25) = 122.
      //   Mitigação 16 -> danoEfetivo = 122 - 16 = 106.
      expect(atk7SemEscudo.bonusSobreescudoCataclismoAtivo).toBe(false);
      expect(atk7ComEscudo.bonusSobreescudoCataclismoAtivo).toBe(true);
      expect(atk7SemEscudo.danoBruto).toBe(97);
      expect(atk7SemEscudo.danoEfetivo).toBe(81);
      expect(atk7ComEscudo.danoBruto).toBe(122);
      expect(atk7ComEscudo.danoEfetivo).toBe(106);
      expect(atk7ComEscudo.danoEfetivo).toBeGreaterThan(atk7SemEscudo.danoEfetivo);
    });
  });

  describe('11. ORDEM 13 - Sistema de Classes (Bandido em Combate)', () => {
    const criarAlvoCombate = (mitigacao: number = 0): Combatente => ({
      nome: 'Sentinela de Bronze',
      hp: 3000,
      hpMax: 3000,
      sobreescudo: 0,
      mitigacao,
      atributos: {
        vigor: 300,
        mente: 5,
        forca: 1,
        vitalidade: 0,
        arcano: 0,
        inteligencia: 0,
        agilidade: 100, // Alta agilidade para que o Bandido faça exatamente 1 ação por turno nos testes de contador
      },
    });

    it('Bandido nível 5+ aciona Rajada de Golpes no 3º, 6º, 9º ataque com o dano total de 160% dividido em 2 golpes de 80%', () => {
      const bandidoLv5: Combatente = {
        nome: 'Vane Lâmina-Sombria',
        classeId: 'bandido',
        nivel: 5,
        hp: 100,
        hpMax: 100,
        sobreescudo: 0,
        atributos: {
          vigor: 10,
          mente: 2,
          forca: 20, // Dano físico base = 20
          vitalidade: 0,
          arcano: 0,
          inteligencia: 0,
          agilidade: 10,
        },
      };

      const alvo = criarAlvoCombate(0);
      const habilidades: string[] = [];
      const logsAtaques = [];

      for (let t = 1; t <= 9; t++) {
        const res = turnoDeCombate(bandidoLv5, alvo, t);
        const atk = res.turnoLog.ataques[0];
        habilidades.push(atk.habilidadeAcionada || '');
        logsAtaques.push(atk);
      }

      expect(habilidades).toEqual([
        'Golpe Rápido', // 1º
        'Golpe Rápido', // 2º
        'Rajada de Golpes', // 3º (reinicia contador A)
        'Golpe Rápido', // 4º
        'Golpe Rápido', // 5º
        'Rajada de Golpes', // 6º (reinicia contador A)
        'Golpe Rápido', // 7º
        'Golpe Rápido', // 8º
        'Rajada de Golpes', // 9º (reinicia contador A)
      ]);

      expect(bandidoLv5.contadorRajadaGolpes).toBe(0);

      // Golpe normal (1º ataque): 1 golpe de 100% (20)
      expect(logsAtaques[0].numeroGolpes).toBe(1);
      expect(logsAtaques[0].danoPorGolpe).toBe(20);
      expect(logsAtaques[0].danoBruto).toBe(20);
      expect(logsAtaques[0].danoEfetivo).toBe(20);

      // Rajada de Golpes (3º, 6º e 9º ataques): 2 golpes consecutivos de 80% cada (16 + 16 = 32 -> 160% de 20)
      for (const idx of [2, 5, 8]) {
        expect(logsAtaques[idx].numeroGolpes).toBe(2);
        expect(logsAtaques[idx].danoPorGolpe).toBe(16);
        expect(logsAtaques[idx].golpes).toEqual([16, 16]);
        expect(logsAtaques[idx].danoBruto).toBe(32);
        expect(logsAtaques[idx].danoEfetivo).toBe(32);
      }
    });

    it('Bandido nível 12+ tem Agilidade (+2) e dano físico base (+5%) maiores que nível 11 (Passos Rápidos)', () => {
      const agilidade = 10;
      const forca = 20;

      const agilLv11 = calcularAgilidadeEfetiva(agilidade, { classeId: 'bandido', nivel: 11 });
      const agilLv12 = calcularAgilidadeEfetiva(agilidade, { classeId: 'bandido', nivel: 12 });

      const danoLv11 = calcularDanoFisico(forca, { classeId: 'bandido', nivel: 11 });
      const danoLv12 = calcularDanoFisico(forca, { classeId: 'bandido', nivel: 12 });

      expect(agilLv12).toBeGreaterThan(agilLv11);
      expect(danoLv12).toBeGreaterThan(danoLv11);
      expect(agilLv11).toBe(10);
      expect(agilLv12).toBe(12); // +2 Agilidade
      expect(danoLv11).toBe(20);
      expect(danoLv12).toBe(21); // +5% de 20 = 21

      const passosPuro = aplicarPassosRapidos(15, 40, 12, 'bandido');
      expect(passosPuro.agilidade).toBe(17);
      expect(passosPuro.danoFisico).toBe(42);
    });

    it('Bandido nível 20+ acumula cargas de Sede de Sangue (Bandido) e SÓ aplica/consome quando Rajada de Golpes ou Dança das Lâminas disparam (ataque comum entre os ciclos NÃO recebe bônus de carga)', () => {
      // 1) Verifica que o acumulador acumula até o máximo de 3 cargas de +5% cada
      let contadorB = 0;
      let cargas = 0;
      for (let i = 1; i <= 12; i++) {
        const res = processarSedeDeSangueBandido(contadorB, cargas, 20);
        contadorB = res.novoContador;
        cargas = res.novasCargas;
        if (i === 3) expect(cargas).toBe(1);
        if (i === 6) expect(cargas).toBe(2);
        if (i === 9) expect(cargas).toBe(3);
        if (i === 12) expect(cargas).toBe(3);
      }

      // 2) Combate real com Bandido Nível 20 (Força 40 -> com Passos Rápidos +5% = 42 de dano físico base):
      // - Ataques 1 e 2: Golpe Rápido (dano = 42, cargas = 0)
      // - Ataque 3: Rajada de Golpes (2x 80% de 42 = 2x 34 = 68); ao final do 3º ataque, Contador B completa ciclo de 3 e gera 1 carga!
      // - Ataque 4 (ataque comum Golpe Rápido entre os ciclos!): possui 1 carga acumulada, mas NÃO aplica o bônus e NÃO consome a carga (dano continua 42, cargas continuam 1)!
      // - Ataque 5 (ataque comum Golpe Rápido entre os ciclos!): continua com 1 carga acumulada, NÃO aplica o bônus e NÃO consome a carga (dano continua 42, cargas continuam 1)!
      // - Ataque 6 (Rajada de Golpes): agora SIM consome a 1 carga pendente (+5% sobre 34 = ceil(35.7) = 36 por golpe -> 72 total)!
      const bandidoLv20: Combatente = {
        nome: 'Bandido Nv20',
        classeId: 'bandido',
        nivel: 20,
        hp: 100,
        hpMax: 100,
        sobreescudo: 0,
        atributos: {
          vigor: 10,
          mente: 2,
          forca: 40, // Base c/ Passos Rápidos (+5%) = 42
          vitalidade: 0,
          arcano: 0,
          inteligencia: 0,
          agilidade: 10,
        },
      };

      const alvo = criarAlvoCombate(0);

      const a1 = turnoDeCombate(bandidoLv20, alvo, 1).turnoLog.ataques[0];
      const a2 = turnoDeCombate(bandidoLv20, alvo, 2).turnoLog.ataques[0];
      const a3 = turnoDeCombate(bandidoLv20, alvo, 3).turnoLog.ataques[0];

      expect(a1.habilidadeAcionada).toBe('Golpe Rápido');
      expect(a1.danoBruto).toBe(42);
      expect(a2.habilidadeAcionada).toBe('Golpe Rápido');
      expect(a2.danoBruto).toBe(42);

      // 3º ataque: Rajada de Golpes sem cargas prévias (2x ceil(42*0.8) = 2x 34 = 68), mas Contador B gera 1 carga
      expect(a3.habilidadeAcionada).toBe('Rajada de Golpes');
      expect(a3.cargasSedeSangueBandidoConsumidas).toBe(0);
      expect(a3.cargasSedeSangueBandidoRestantes).toBe(1);
      expect(a3.danoBruto).toBe(68);
      expect(bandidoLv20.cargasSedeSangueBandido).toBe(1);

      // 4º e 5º ataques são ataques comuns (Golpe Rápido) ENTRE os ciclos:
      // Diferente do Feiticeiro, o Bandido NÃO gasta e NÃO aplica a carga em ataques comuns!
      const a4 = turnoDeCombate(bandidoLv20, alvo, 4).turnoLog.ataques[0];
      expect(a4.habilidadeAcionada).toBe('Golpe Rápido');
      expect(a4.cargasSedeSangueBandidoConsumidas).toBe(0);
      expect(a4.cargasSedeSangueBandidoRestantes).toBe(1);
      expect(a4.danoBruto).toBe(42); // Sem bônus de carga!
      expect(bandidoLv20.cargasSedeSangueBandido).toBe(1);

      const a5 = turnoDeCombate(bandidoLv20, alvo, 5).turnoLog.ataques[0];
      expect(a5.habilidadeAcionada).toBe('Golpe Rápido');
      expect(a5.cargasSedeSangueBandidoConsumidas).toBe(0);
      expect(a5.cargasSedeSangueBandidoRestantes).toBe(1);
      expect(a5.danoBruto).toBe(42); // Sem bônus de carga!
      expect(bandidoLv20.cargasSedeSangueBandido).toBe(1);

      // 6º ataque: Rajada de Golpes dispara e CONSOME a carga acumulada (+5% sobre 34 = ceil(35.7) = 36 por golpe -> 72 total)
      const a6 = turnoDeCombate(bandidoLv20, alvo, 6).turnoLog.ataques[0];
      expect(a6.habilidadeAcionada).toBe('Rajada de Golpes');
      expect(a6.cargasSedeSangueBandidoConsumidas).toBe(1);
      expect(a6.danoPorGolpe).toBe(36);
      expect(a6.golpes).toEqual([36, 36]);
      expect(a6.danoBruto).toBe(72);
      expect(a6.danoBruto).toBeGreaterThan(a3.danoBruto);

      // 3) Verifica também com 3 cargas acumuladas e contadores A e B defasados:
      const bandido3Cargas: Combatente = {
        nome: 'Bandido 3 Cargas',
        classeId: 'bandido',
        nivel: 20,
        hp: 100,
        hpMax: 100,
        sobreescudo: 0,
        contadorRajadaGolpes: 1, // próximo ataque é comum (1->2), depois Rajada (2->3->0)
        contadorSedeSangueBandido: 0,
        cargasSedeSangueBandido: 3, // 3 cargas (+15%)
        atributos: {
          vigor: 10,
          mente: 2,
          forca: 40, // Base c/ Passos Rápidos = 42
          vitalidade: 0,
          arcano: 0,
          inteligencia: 0,
          agilidade: 10,
        },
      };

      // Ataque comum com 3 cargas prontas: NÃO consome as 3 cargas e causa apenas 42
      const comumCom3Cargas = turnoDeCombate(bandido3Cargas, alvo, 1).turnoLog.ataques[0];
      expect(comumCom3Cargas.habilidadeAcionada).toBe('Golpe Rápido');
      expect(comumCom3Cargas.cargasSedeSangueBandidoConsumidas).toBe(0);
      expect(comumCom3Cargas.danoBruto).toBe(42);
      expect(bandido3Cargas.cargasSedeSangueBandido).toBe(3);

      // Próximo ataque é Rajada de Golpes: consome todas as 3 cargas (+15% sobre 34 = ceil(39.1) = 40 por golpe -> 80 total) e zera cargas!
      const rajadaCom3Cargas = turnoDeCombate(bandido3Cargas, alvo, 2).turnoLog.ataques[0];
      expect(rajadaCom3Cargas.habilidadeAcionada).toBe('Rajada de Golpes');
      expect(rajadaCom3Cargas.cargasSedeSangueBandidoConsumidas).toBe(3);
      expect(rajadaCom3Cargas.danoPorGolpe).toBe(40);
      expect(rajadaCom3Cargas.danoBruto).toBe(80);
      expect(bandido3Cargas.cargasSedeSangueBandido).toBe(0);
    });

    it('Bandido nível 30 aciona Dança das Lâminas no 7º ataque com 5 golpes de 75% (375% total), ignorando 5% da Defesa Física em cada golpe e consumindo cargas pendentes', () => {
      const bandidoLv30: Combatente = {
        nome: 'Mestre das Lâminas',
        classeId: 'bandido',
        nivel: 30,
        hp: 100,
        hpMax: 100,
        sobreescudo: 0,
        atributos: {
          vigor: 10,
          mente: 2,
          forca: 40, // Com Passos Rápidos (+5%) = 42 de dano físico base
          vitalidade: 0,
          arcano: 0,
          inteligencia: 0,
          agilidade: 10,
        },
      };

      // Alvo com Defesa Física / mitigação = 20 (5% ignorado -> mitigação efetiva por golpe = 19)
      const alvoComDefesa = criarAlvoCombate(20);
      const habilidades: string[] = [];
      let atk7 = turnoDeCombate(bandidoLv30, alvoComDefesa, 1).turnoLog.ataques[0];
      habilidades.push(atk7.habilidadeAcionada || '');

      for (let t = 2; t <= 7; t++) {
        atk7 = turnoDeCombate(bandidoLv30, alvoComDefesa, t).turnoLog.ataques[0];
        habilidades.push(atk7.habilidadeAcionada || '');
      }

      // 3º e 6º são Rajada de Golpes; 7º é Dança das Lâminas
      expect(habilidades[2]).toBe('Rajada de Golpes');
      expect(habilidades[5]).toBe('Rajada de Golpes');
      expect(habilidades[6]).toBe('Dança das Lâminas');
      expect(bandidoLv30.contadorDancaLaminas).toBe(0);

      // No 6º ataque, o contador B gerou 1 carga; no 7º ataque (Dança das Lâminas), essa 1 carga é consumida!
      // Base por golpe de Dança das Lâminas (75% de 42) = ceil(31.5) = 32.
      // Com 1 carga consumida (+5% sobre 32) = ceil(33.6) = 34 por golpe.
      // 5 golpes de 34 = 170 de dano bruto.
      // Cada um dos 5 golpes ignora 5% da Defesa Física (20 -> 19), causando 34 - 19 = 15 de dano efetivo por golpe -> 5 * 15 = 75 total!
      expect(atk7.numeroGolpes).toBe(5);
      expect(atk7.ignorarDefesaFisicaPercentual).toBe(5);
      expect(atk7.cargasSedeSangueBandidoConsumidas).toBe(1);
      expect(atk7.danoPorGolpe).toBe(34);
      expect(atk7.golpes).toEqual([34, 34, 34, 34, 34]);
      expect(atk7.danoBruto).toBe(170);
      expect(atk7.danoEfetivo).toBe(75);
      expect(bandidoLv30.cargasSedeSangueBandido).toBe(0);

      // Também verifica cálculo puro de Dança das Lâminas sem cargas (5 golpes de 75% = 375% total)
      const golpePuroSemCargas = calcularGolpeBandido({
        forcaBase: 40, // danoFisicoBase = 42
        nivel: 30,
        contadorRajada: 0,
        contadorSedeSangue: 0,
        cargasSedeSangue: 0,
        contadorDanca: 6, // 7º ataque
        mitigacaoFisicaAlvo: 20,
      });
      expect(golpePuroSemCargas.habilidadeAcionada).toBe('Dança das Lâminas');
      expect(golpePuroSemCargas.numeroGolpes).toBe(5);
      expect(golpePuroSemCargas.multiplicadorPorGolpePercentual).toBe(75);
      expect(golpePuroSemCargas.multiplicadorTotalPercentual).toBe(375);
      expect(golpePuroSemCargas.danoPorGolpe).toBe(32); // ceil(42 * 0.75) = 32
      expect(golpePuroSemCargas.danoBruto).toBe(160); // 5 * 32
      expect(golpePuroSemCargas.mitigacaoPorGolpeEfetiva).toBe(19); // 20 - 5% = 19
    });
  });

  describe('12. ORDEM 14 - Sistema de Classes (Profeta em Combate)', () => {
    const criarAlvoProfeta = (mitigacao: number = 0): Combatente => ({
      nome: 'Arauto do Vazio',
      hp: 3000,
      hpMax: 3000,
      sobreescudo: 0,
      mitigacao,
      atributos: {
        vigor: 300,
        mente: 10,
        forca: 1,
        vitalidade: 0,
        arcano: 0,
        inteligencia: 0,
        agilidade: 10,
      },
    });

    it('Profeta nível 5+ aciona Bênção Divina no 3º, 6º, 9º ataque (ao invés de atacar), curando 15% do HP máx e 10% do MP máx sem ultrapassar os tetos (incluindo teste partindo de HP/MP quase cheio)', () => {
      const profetaLv5: Combatente = {
        nome: 'Profeta Nv5',
        classeId: 'profeta',
        nivel: 5,
        hp: 20, // Começa com 20/100 HP
        hpMax: 100,
        mana: 30, // Começa com 30/100 MP
        manaMax: 100,
        sobreescudo: 0,
        atributos: {
          vigor: 20,
          mente: 20,
          forca: 0,
          vitalidade: 0,
          arcano: 5,
          inteligencia: 18, // Dano mágico = 18
          agilidade: 2,
        },
      };

      const alvo = criarAlvoProfeta(0);
      const habilidades: string[] = [];
      const logs = [];

      for (let t = 1; t <= 9; t++) {
        const res = turnoDeCombate(profetaLv5, alvo, t);
        const atk = res.turnoLog.ataques[0];
        habilidades.push(atk.habilidadeAcionada || '');
        logs.push(atk);
      }

      expect(habilidades).toEqual([
        'Luz Sagrada', // 1º (ataca com 18 de dano mágico)
        'Luz Sagrada', // 2º (ataca com 18 de dano mágico)
        'Bênção Divina', // 3º (cura +15 HP e +10 MP, 0 de dano, reinicia contador A)
        'Luz Sagrada', // 4º
        'Luz Sagrada', // 5º
        'Bênção Divina', // 6º (cura +15 HP e +10 MP, 0 de dano, reinicia contador A)
        'Luz Sagrada', // 7º
        'Luz Sagrada', // 8º
        'Bênção Divina', // 9º (cura +15 HP e +10 MP, 0 de dano, reinicia contador A)
      ]);

      expect(profetaLv5.contadorBencaoDivina).toBe(0);

      // Nos turnos 1 e 2 (Luz Sagrada), causa 18 de dano mágico cada
      expect(logs[0].danoEfetivo).toBe(18);
      expect(logs[1].danoEfetivo).toBe(18);

      // Nos turnos 3, 6 e 9 (Bênção Divina), NÃO ataca (danoEfetivo = 0) e cura +15 HP (15% de 100) e +10 MP (10% de 100)
      for (const idx of [2, 5, 8]) {
        expect(logs[idx].danoBruto).toBe(0);
        expect(logs[idx].danoEfetivo).toBe(0);
        expect(logs[idx].curaHp).toBe(15);
        expect(logs[idx].curaMana).toBe(10);
      }

      // Após 3 ativações de Bênção Divina: HP subiu de 20 -> 35 -> 50 -> 65; MP subiu de 30 -> 40 -> 50 -> 60
      expect(profetaLv5.hp).toBe(65);
      expect(profetaLv5.mana).toBe(60);

      // Teste partindo de HP e MP quase cheios (95/100 HP e 96/100 MP) para confirmar que NÃO estoura o teto máximo!
      const profetaQuaseCheio: Combatente = {
        ...profetaLv5,
        atributos: { ...profetaLv5.atributos },
        hp: 95,
        hpMax: 100,
        mana: 96,
        manaMax: 100,
        contadorBencaoDivina: 2, // próximo turno é o 3º ataque -> Bênção Divina (+15 HP e +10 MP)
      };

      const resTeto = turnoDeCombate(profetaQuaseCheio, alvo, 10);
      expect(resTeto.turnoLog.ataques[0].habilidadeAcionada).toBe('Bênção Divina');
      expect(resTeto.atacanteHp).toBe(100); // 95 + 15 seria 110, limitado a 100
      expect(resTeto.atacanteMana).toBe(100); // 96 + 10 seria 106, limitado a 100
      expect(profetaQuaseCheio.hp).toBe(100);
      expect(profetaQuaseCheio.mana).toBe(100);
    });

    it('Profeta nível 12+ tem HP máximo e MP máximo maiores que nível 11 (Graça Divina +10%)', () => {
      const vigor = 10; // Base HP = 50
      const mente = 12; // Base MP = 60

      const hpLv11 = calcularHpMax(vigor, { classeId: 'profeta', nivel: 11 });
      const hpLv12 = calcularHpMax(vigor, { classeId: 'profeta', nivel: 12 });

      const mpLv11 = calcularManaMax(mente, { classeId: 'profeta', nivel: 11 });
      const mpLv12 = calcularManaMax(mente, { classeId: 'profeta', nivel: 12 });

      expect(hpLv12).toBeGreaterThan(hpLv11);
      expect(mpLv12).toBeGreaterThan(mpLv11);
      expect(hpLv11).toBe(50);
      expect(hpLv12).toBe(55); // +10%
      expect(mpLv11).toBe(60);
      expect(mpLv12).toBe(66); // +10%

      const gracaPura = aplicarGracaDivina(100, 80, 12, 'profeta');
      expect(gracaPura.hpMax).toBe(110);
      expect(gracaPura.manaMax).toBe(88);
    });

    it('Profeta nível 20+ acumula até 2 cargas de Fé Inabalável (+15% eficácia de cura por carga) e aplica na próxima cura sem vazar para curas fora do ciclo', () => {
      // 1) Verifica que o acumulador acumula até o teto de 2 cargas (a cada 3 ataques do contador B)
      let contadorB = 0;
      let cargas = 0;
      for (let i = 1; i <= 9; i++) {
        const res = processarFeInabalavel(contadorB, cargas, 20);
        contadorB = res.novoContador;
        cargas = res.novasCargas;
        if (i === 3) expect(cargas).toBe(1);
        if (i === 6) expect(cargas).toBe(2);
        if (i === 9) expect(cargas).toBe(2); // teto máximo de 2 cargas
      }

      // 2) Teste em combate com 2 cargas acumuladas e contadores controlados para verificar:
      // - Ataque comum (Luz Sagrada) NÃO consome as 2 cargas;
      // - A primeira cura (Bênção Divina) consome as 2 cargas (+30% eficácia de cura: 15% de 200 = 30 -> 30 * 1.30 = 39 HP; 10% de 200 = 20 -> 20 * 1.30 = 26 MP) e zera as cargas;
      // - Uma cura subsequente fora do ciclo de B (antes do contador B completar 3 novamente) recebe 0 cargas (cura base de 30 HP e 20 MP), sem vazar o bônus!
      const profetaLv20: Combatente = {
        nome: 'Profeta Nv20',
        classeId: 'profeta',
        nivel: 20,
        hp: 50,
        hpMax: 200,
        mana: 50,
        manaMax: 200,
        sobreescudo: 0,
        contadorBencaoDivina: 1, // próximo é Luz Sagrada (1->2), depois Bênção Divina (2->3->0)
        contadorFeInabalavel: 0, // vai para 1 no ataque comum e para 2 na Bênção (não gera nova carga ainda)
        cargasFeInabalavel: 2, // 2 cargas acumuladas (+30% eficácia de cura)
        atributos: {
          vigor: 20,
          mente: 20,
          forca: 0,
          vitalidade: 0,
          arcano: 5,
          inteligencia: 20,
          agilidade: 2,
        },
      };

      const alvo = criarAlvoProfeta(0);

      // Passo A: Ataque comum (Luz Sagrada) não consome nem aplica as 2 cargas de cura
      const turnoAtaqueComum = turnoDeCombate(profetaLv20, alvo, 1).turnoLog.ataques[0];
      expect(turnoAtaqueComum.habilidadeAcionada).toBe('Luz Sagrada');
      expect(turnoAtaqueComum.cargasFeInabalavelConsumidas).toBe(0);
      expect(profetaLv20.cargasFeInabalavel).toBe(2);
      expect(profetaLv20.hp).toBe(50);
      expect(profetaLv20.mana).toBe(50);

      // Passo B: Próxima ação é Bênção Divina (contador A: 2 -> 3 -> 0).
      // Aplica e consome as 2 cargas (+30% sobre 30 HP = 39 HP; +30% sobre 20 MP = 26 MP) e zera cargas!
      const turnoCuraCom2Cargas = turnoDeCombate(profetaLv20, alvo, 2).turnoLog.ataques[0];
      expect(turnoCuraCom2Cargas.habilidadeAcionada).toBe('Bênção Divina');
      expect(turnoCuraCom2Cargas.cargasFeInabalavelConsumidas).toBe(2);
      expect(turnoCuraCom2Cargas.curaHp).toBe(39);
      expect(turnoCuraCom2Cargas.curaMana).toBe(26);
      expect(profetaLv20.hp).toBe(89); // 50 + 39
      expect(profetaLv20.mana).toBe(76); // 50 + 26
      expect(profetaLv20.cargasFeInabalavel).toBe(0); // Cargas consumidas!

      // Passo C: Se outra cura ocorrer fora do ciclo do contador B (ex: ajustando contadorA = 2 enquanto contadorB = 0 e cargas = 0),
      // ela NÃO recebe o bônus de Fé Inabalável (cura apenas os 30 HP e 20 MP base, sem vazar)!
      profetaLv20.contadorBencaoDivina = 2;
      profetaLv20.contadorFeInabalavel = 0;
      const turnoCuraSemCarga = turnoDeCombate(profetaLv20, alvo, 3).turnoLog.ataques[0];
      expect(turnoCuraSemCarga.habilidadeAcionada).toBe('Bênção Divina');
      expect(turnoCuraSemCarga.cargasFeInabalavelConsumidas).toBe(0);
      expect(turnoCuraSemCarga.curaHp).toBe(30); // 15% de 200 sem bônus
      expect(turnoCuraSemCarga.curaMana).toBe(20); // 10% de 200 sem bônus
      expect(profetaLv20.hp).toBe(119); // 89 + 30
      expect(profetaLv20.mana).toBe(96); // 76 + 20
    });

    it('Profeta nível 30 aciona Milagre Divino no 7º ataque, curando 30% do HP máx e 25% do MP máx e causando 150% de dano mágico no mesmo turno', () => {
      // Primeiro valida a função pura calcularAcaoProfeta sem cargas extras no 7º ataque:
      // HP máx = 200 (30% = 60), MP máx = 200 (25% = 50), Inteligência = 20 (150% = 30 de dano mágico)
      const milagrePuro = calcularAcaoProfeta({
        inteligenciaBase: 20,
        hpAtual: 100,
        hpMax: 200,
        manaAtual: 80,
        manaMax: 200,
        nivel: 30,
        contadorBencao: 0,
        contadorFeInabalavel: 0,
        cargasFeInabalavel: 0,
        contadorMilagre: 6, // 7º ataque
      });

      expect(milagrePuro.habilidadeAcionada).toBe('Milagre Divino');
      expect(milagrePuro.causaDano).toBe(true);
      expect(milagrePuro.danoBruto).toBe(30); // 150% de 20
      expect(milagrePuro.curaHp).toBe(60); // 30% de 200
      expect(milagrePuro.curaMana).toBe(50); // 25% de 200
      expect(milagrePuro.novoHp).toBe(160); // 100 + 60
      expect(milagrePuro.novaMana).toBe(130); // 80 + 50
      expect(milagrePuro.novoContadorMilagre).toBe(0);

      // Agora valida os 7 turnos em turnoDeCombate:
      const profetaLv30: Combatente = {
        nome: 'Sumo Profeta',
        classeId: 'profeta',
        nivel: 30,
        hp: 40,
        hpMax: 200,
        mana: 40,
        manaMax: 200,
        sobreescudo: 0,
        atributos: {
          vigor: 20,
          mente: 20,
          forca: 0,
          vitalidade: 0,
          arcano: 10,
          inteligencia: 20, // Dano mágico normal = 20; 150% = 30
          agilidade: 2,
        },
      };

      const alvo = criarAlvoProfeta(0);
      const habilidades: string[] = [];
      let atk7 = turnoDeCombate(profetaLv30, alvo, 1).turnoLog.ataques[0];
      habilidades.push(atk7.habilidadeAcionada || '');

      for (let t = 2; t <= 7; t++) {
        atk7 = turnoDeCombate(profetaLv30, alvo, t).turnoLog.ataques[0];
        habilidades.push(atk7.habilidadeAcionada || '');
      }

      // 3º e 6º são Bênção Divina; 7º é Milagre Divino
      expect(habilidades[2]).toBe('Bênção Divina');
      expect(habilidades[5]).toBe('Bênção Divina');
      expect(habilidades[6]).toBe('Milagre Divino');
      expect(profetaLv30.contadorMilagreDivino).toBe(0);

      // No 7º ataque (Milagre Divino):
      // - Causa 150% do dano mágico normal (30) contra o inimigo no mesmo turno;
      // - E recupera 30% do HP máx (60 base, amplificado pela 1 carga de Fé Inabalável gerada no fim do 6º turno -> 60 * 1.15 = 69 HP)
      //   e 25% do MP máx (50 base, amplificado por +15% -> 50 * 1.15 = 57.5 MP)!
      expect(atk7.danoBruto).toBe(30);
      expect(atk7.danoEfetivo).toBe(30);
      expect(atk7.cargasFeInabalavelConsumidas).toBe(1);
      expect(atk7.curaHp).toBe(69);
      expect(atk7.curaMana).toBe(57.5);
    });
  });

  describe('13. ORDEM 15 - Sistema de Classes (Samurai em Combate)', () => {
    const criarAlvoSamurai = (
      mitigacao: number = 0,
      hp: number = 3000,
      sobreescudo: number = 0
    ): Combatente => ({
      nome: 'Ronin Corrompido',
      hp,
      hpMax: hp,
      sobreescudo,
      mitigacao,
      atributos: {
        vigor: 300,
        mente: 2,
        forca: 1,
        vitalidade: 0,
        arcano: 0,
        inteligencia: 0,
        agilidade: 10,
      },
    });

    it('Samurai nível 5+ aciona Iaijutsu no 3º, 6º, 9º ataque com 220% de dano físico e 10% de Defesa Física ignorada', () => {
      const samuraiLv5: Combatente = {
        nome: 'Samurai Nv5',
        classeId: 'samurai',
        nivel: 5,
        hp: 100,
        hpMax: 100,
        sobreescudo: 0,
        atributos: {
          vigor: 10,
          mente: 2,
          forca: 20, // Dano físico base = 20; Iaijutsu (220%) = 44
          vitalidade: 0,
          arcano: 0,
          inteligencia: 0,
          agilidade: 10,
        },
      };

      // Alvo com Defesa Física / mitigação = 10 (10% ignorado -> mitigação efetiva = 9)
      const alvo = criarAlvoSamurai(10);
      const habilidades: string[] = [];
      const logs = [];

      for (let t = 1; t <= 9; t++) {
        const res = turnoDeCombate(samuraiLv5, alvo, t);
        const atk = res.turnoLog.ataques[0];
        habilidades.push(atk.habilidadeAcionada || '');
        logs.push(atk);
      }

      expect(habilidades).toEqual([
        'Corte Preciso', // 1º (danoBruto 20, mitigação 10 -> 10 efetivo)
        'Corte Preciso', // 2º
        'Iaijutsu', // 3º (220% = 44 bruto, 10% defesa ignorada -> mitigação 9 -> 35 efetivo)
        'Corte Preciso', // 4º
        'Corte Preciso', // 5º
        'Iaijutsu', // 6º
        'Corte Preciso', // 7º
        'Corte Preciso', // 8º
        'Iaijutsu', // 9º
      ]);

      expect(samuraiLv5.contadorIaijutsu).toBe(0);

      // Ataques normais: 20 bruto - 10 mitigação = 10 efetivo
      expect(logs[0].danoBruto).toBe(20);
      expect(logs[0].danoEfetivo).toBe(10);
      expect(logs[1].danoBruto).toBe(20);
      expect(logs[1].danoEfetivo).toBe(10);

      // No 3º, 6º e 9º ataques (Iaijutsu): 220% de 20 = 44 bruto; ignora 10% de 10 (mitigação = 9) -> 44 - 9 = 35 efetivo
      for (const idx of [2, 5, 8]) {
        expect(logs[idx].danoBruto).toBe(44);
        expect(logs[idx].ignorarDefesaFisicaPercentual).toBe(10);
        expect(logs[idx].danoEfetivo).toBe(35);
      }
    });

    it('Samurai nível 12+ tem Agilidade (+2) e dano físico base (+5%) maiores que nível 11 (Disciplina do Guerreiro)', () => {
      const agilidade = 10;
      const forca = 20;

      const agilLv11 = calcularAgilidadeEfetiva(agilidade, { classeId: 'samurai', nivel: 11 });
      const agilLv12 = calcularAgilidadeEfetiva(agilidade, { classeId: 'samurai', nivel: 12 });

      const danoLv11 = calcularDanoFisico(forca, { classeId: 'samurai', nivel: 11 });
      const danoLv12 = calcularDanoFisico(forca, { classeId: 'samurai', nivel: 12 });

      expect(agilLv12).toBeGreaterThan(agilLv11);
      expect(danoLv12).toBeGreaterThan(danoLv11);
      expect(agilLv11).toBe(10);
      expect(agilLv12).toBe(12); // +2 Agilidade
      expect(danoLv11).toBe(20);
      expect(danoLv12).toBe(21); // +5% de 20 = 21

      const disciplinaPura = aplicarDisciplinaDoGuerreiro(15, 40, 12, 'samurai');
      expect(disciplinaPura.agilidade).toBe(17);
      expect(disciplinaPura.danoFisico).toBe(42);
    });

    it('Samurai nível 20+ acumula cargas de Foco Absoluto e SÓ aplica no Iaijutsu ou Corte do Vazio, nunca em ataques comuns', () => {
      // 1) Verifica que o acumulador acumula até o máximo de 3 cargas de +5% cada
      let contadorB = 0;
      let cargas = 0;
      for (let i = 1; i <= 12; i++) {
        const res = processarFocoAbsoluto(contadorB, cargas, 20);
        contadorB = res.novoContador;
        cargas = res.novasCargas;
        if (i === 3) expect(cargas).toBe(1);
        if (i === 6) expect(cargas).toBe(2);
        if (i === 9) expect(cargas).toBe(3);
        if (i === 12) expect(cargas).toBe(3);
      }

      // 2) Combate com Samurai Nível 20 (Força 40 -> com Disciplina do Guerreiro +5% = 42 de dano físico base):
      // - Ataques 1 e 2: Corte Preciso (dano = 42, cargas = 0)
      // - Ataque 3: Iaijutsu (220% de 42 = ceil(92.4) = 93); ao final do 3º ataque, Contador B completa ciclo de 3 e gera 1 carga!
      // - Ataques 4 e 5 (ataques comuns Corte Preciso entre os ciclos!): possuem 1 carga acumulada, mas NÃO aplicam o bônus e NÃO consomem a carga (dano continua 42, cargas continuam 1)!
      // - Ataque 6 (Iaijutsu): agora SIM consome a 1 carga pendente (+5% sobre 93 = ceil(97.65) = 98)!
      const samuraiLv20: Combatente = {
        nome: 'Samurai Nv20',
        classeId: 'samurai',
        nivel: 20,
        hp: 100,
        hpMax: 100,
        sobreescudo: 0,
        atributos: {
          vigor: 10,
          mente: 2,
          forca: 40, // Base c/ Disciplina do Guerreiro (+5%) = 42
          vitalidade: 0,
          arcano: 0,
          inteligencia: 0,
          agilidade: 10,
        },
      };

      const alvo = criarAlvoSamurai(0);

      const a1 = turnoDeCombate(samuraiLv20, alvo, 1).turnoLog.ataques[0];
      const a2 = turnoDeCombate(samuraiLv20, alvo, 2).turnoLog.ataques[0];
      const a3 = turnoDeCombate(samuraiLv20, alvo, 3).turnoLog.ataques[0];

      expect(a1.habilidadeAcionada).toBe('Corte Preciso');
      expect(a1.danoBruto).toBe(42);
      expect(a2.habilidadeAcionada).toBe('Corte Preciso');
      expect(a2.danoBruto).toBe(42);

      // 3º ataque: Iaijutsu sem cargas prévias (ceil(42 * 2.2) = 93), mas Contador B gera 1 carga ao final
      expect(a3.habilidadeAcionada).toBe('Iaijutsu');
      expect(a3.cargasFocoAbsolutoConsumidas).toBe(0);
      expect(a3.cargasFocoAbsolutoRestantes).toBe(1);
      expect(a3.danoBruto).toBe(93);
      expect(samuraiLv20.cargasFocoAbsoluto).toBe(1);

      // 4º e 5º ataques são ataques comuns (Corte Preciso) ENTRE os ciclos:
      // Nunca recebem o bônus nem consomem a carga!
      const a4 = turnoDeCombate(samuraiLv20, alvo, 4).turnoLog.ataques[0];
      expect(a4.habilidadeAcionada).toBe('Corte Preciso');
      expect(a4.cargasFocoAbsolutoConsumidas).toBe(0);
      expect(a4.cargasFocoAbsolutoRestantes).toBe(1);
      expect(a4.danoBruto).toBe(42); // Sem bônus de carga!
      expect(samuraiLv20.cargasFocoAbsoluto).toBe(1);

      const a5 = turnoDeCombate(samuraiLv20, alvo, 5).turnoLog.ataques[0];
      expect(a5.habilidadeAcionada).toBe('Corte Preciso');
      expect(a5.cargasFocoAbsolutoConsumidas).toBe(0);
      expect(a5.cargasFocoAbsolutoRestantes).toBe(1);
      expect(a5.danoBruto).toBe(42); // Sem bônus de carga!
      expect(samuraiLv20.cargasFocoAbsoluto).toBe(1);

      // 6º ataque: Iaijutsu dispara e CONSOME a carga acumulada (+5% sobre 93 = ceil(97.65) = 98)
      const a6 = turnoDeCombate(samuraiLv20, alvo, 6).turnoLog.ataques[0];
      expect(a6.habilidadeAcionada).toBe('Iaijutsu');
      expect(a6.cargasFocoAbsolutoConsumidas).toBe(1);
      expect(a6.danoBruto).toBe(98);
      expect(a6.danoBruto).toBeGreaterThan(a3.danoBruto);

      // 3) Verifica também com 3 cargas acumuladas em um ataque comum seguido de Iaijutsu:
      const samurai3Cargas: Combatente = {
        nome: 'Samurai 3 Cargas',
        classeId: 'samurai',
        nivel: 20,
        hp: 100,
        hpMax: 100,
        sobreescudo: 0,
        contadorIaijutsu: 1, // próximo é Corte Preciso (1->2), depois Iaijutsu (2->3->0)
        contadorFocoAbsoluto: 0,
        cargasFocoAbsoluto: 3, // 3 cargas (+15%)
        atributos: {
          vigor: 10,
          mente: 2,
          forca: 40, // Base c/ Disciplina do Guerreiro = 42
          vitalidade: 0,
          arcano: 0,
          inteligencia: 0,
          agilidade: 10,
        },
      };

      const comumCom3Cargas = turnoDeCombate(samurai3Cargas, alvo, 1).turnoLog.ataques[0];
      expect(comumCom3Cargas.habilidadeAcionada).toBe('Corte Preciso');
      expect(comumCom3Cargas.cargasFocoAbsolutoConsumidas).toBe(0);
      expect(comumCom3Cargas.danoBruto).toBe(42);
      expect(samurai3Cargas.cargasFocoAbsoluto).toBe(3);

      const iaijutsuCom3Cargas = turnoDeCombate(samurai3Cargas, alvo, 2).turnoLog.ataques[0];
      expect(iaijutsuCom3Cargas.habilidadeAcionada).toBe('Iaijutsu');
      expect(iaijutsuCom3Cargas.cargasFocoAbsolutoConsumidas).toBe(3);
      expect(iaijutsuCom3Cargas.danoBruto).toBe(107); // ceil(93 * 1.15) = ceil(106.95) = 107
      expect(samurai3Cargas.cargasFocoAbsoluto).toBe(0);
    });

    it('Samurai nível 30 aciona Corte do Vazio no 7º ataque (450% dano, 25% Defesa ignorada, +25% vs Sobreescudo) e testa especificamente os DOIS cenários do golpe extra (> 20% HP sem golpe extra vs <= 20% HP com golpe extra)', () => {
      // 1) Valida bônus contra Sobreescudo (+25%) e 25% de Defesa Física ignorada na função pura:
      const corteSemEscudo = calcularGolpeSamurai({
        forcaBase: 40, // Com Disciplina do Guerreiro (+5%) = 42; 450% de 42 = 189
        nivel: 30,
        contadorIaijutsu: 0,
        contadorFocoAbsoluto: 0,
        cargasFocoAbsoluto: 0,
        contadorCorteDoVazio: 6, // 7º ataque
        sobreescudoAlvo: 0,
        mitigacaoFisicaAlvo: 20,
      });
      const corteComEscudo = calcularGolpeSamurai({
        forcaBase: 40,
        nivel: 30,
        contadorIaijutsu: 0,
        contadorFocoAbsoluto: 0,
        cargasFocoAbsoluto: 0,
        contadorCorteDoVazio: 6,
        sobreescudoAlvo: 50,
        mitigacaoFisicaAlvo: 20,
      });

      expect(corteSemEscudo.habilidadeAcionada).toBe('Corte do Vazio');
      expect(corteSemEscudo.danoBrutoPrincipal).toBe(189); // 450% de 42
      expect(corteSemEscudo.ignorarDefesaFisicaPercentual).toBe(25);
      expect(corteSemEscudo.mitigacaoEfetiva).toBe(15); // 20 - 25% = 15
      expect(corteSemEscudo.danoGolpeExtraBase).toBe(42); // 100% do dano físico normal

      expect(corteComEscudo.bonusSobreescudoCorteDoVazioAtivo).toBe(true);
      expect(corteComEscudo.danoBrutoPrincipal).toBe(237); // ceil(189 * 1.25) = 237

      // 2) CENÁRIO A DO GOLPE EXTRA:
      // Combate onde o Corte do Vazio no 7º ataque deixa o inimigo ACIMA de 20% do HP máximo -> SEM golpe extra!
      const samuraiCenarioA: Combatente = {
        nome: 'Samurai Cenário A',
        classeId: 'samurai',
        nivel: 30,
        hp: 200,
        hpMax: 200,
        sobreescudo: 0,
        atributos: {
          vigor: 20,
          mente: 2,
          forca: 40, // Dano físico base = 42
          vitalidade: 0,
          arcano: 0,
          inteligencia: 0,
          agilidade: 10,
        },
      };

      // Inimigo com HP máximo = 2000 (20% = 400 HP) e mitigação = 20.
      // Ao longo dos 7 ataques, o inimigo terminará o 7º ataque bem acima de 400 HP (> 20%).
      const inimigoAltoHp = criarAlvoSamurai(20, 2000, 0);
      let atk7CenarioA = turnoDeCombate(samuraiCenarioA, inimigoAltoHp, 1).turnoLog.ataques[0];
      for (let t = 2; t <= 7; t++) {
        atk7CenarioA = turnoDeCombate(samuraiCenarioA, inimigoAltoHp, t).turnoLog.ataques[0];
      }

      // No 7º ataque (Corte do Vazio):
      // - 450% de 42 = 189; com 1 carga de Foco Absoluto gerada no fim do 6º ataque (+5%) = ceil(189 * 1.05) = 199 bruto.
      // - Ignora 25% da Defesa Física (20 -> 15 de mitigação) -> 199 - 15 = 184 de dano efetivo.
      // - HP restante do inimigo fica em 1592 (> 400, ou seja, > 20% de 2000) -> golpeExtraCorteDoVazioAtivo = false!
      expect(atk7CenarioA.habilidadeAcionada).toBe('Corte do Vazio');
      expect(atk7CenarioA.cargasFocoAbsolutoConsumidas).toBe(1);
      expect(atk7CenarioA.hpRestante).toBeGreaterThan(inimigoAltoHp.hpMax * 0.2);
      expect(atk7CenarioA.golpeExtraCorteDoVazioAtivo).toBe(false);
      expect(atk7CenarioA.danoGolpeExtraCorteDoVazio).toBe(0);
      expect(atk7CenarioA.danoEfetivoGolpeExtraCorteDoVazio).toBe(0);
      expect(atk7CenarioA.danoBruto).toBe(199);
      expect(atk7CenarioA.danoEfetivo).toBe(184);

      // 3) CENÁRIO B DO GOLPE EXTRA:
      // Combate onde o Corte do Vazio no 7º ataque deixa o inimigo em 20% do HP máximo OU MENOS -> COM golpe extra aplicado (100% do dano físico normal, dano separado, mesma mitigação)!
      const samuraiCenarioB: Combatente = {
        nome: 'Samurai Cenário B',
        classeId: 'samurai',
        nivel: 30,
        hp: 200,
        hpMax: 200,
        sobreescudo: 0,
        atributos: {
          vigor: 20,
          mente: 2,
          forca: 40, // Dano físico base = 42
          vitalidade: 0,
          arcano: 0,
          inteligencia: 0,
          agilidade: 10,
        },
      };

      // Inimigo com HP = 500 e hpMax = 500 (20% = 100 HP) e mitigação = 20:
      // - Ataques 1, 2, 4, 5 (Corte Preciso): 42 - 20 = 22 de dano efetivo cada (4 * 22 = 88)
      // - Ataque 3 (Iaijutsu, 0 cargas): 93 - 18 = 75 de dano efetivo
      // - Ataque 6 (Iaijutsu, 1 carga): 98 - 18 = 80 de dano efetivo
      // Antes do 7º ataque, inimigo está com 500 - (88 + 75 + 80) = 257 HP.
      // No 7º ataque (Corte do Vazio):
      // - Golpe principal causa 199 bruto - 15 mitigação (25% de 20 ignorado) = 184 de dano efetivo.
      // - Inimigo cai de 257 HP para 73 HP!
      // - Como 73 HP <= 100 HP (20% de 500), o GOLPE EXTRA dispara automaticamente:
      //   +100% do dano físico normal (42 bruto) com a MESMA mitigação (15) = 27 de dano efetivo adicional!
      // - Inimigo termina com 73 - 27 = 46 HP!
      const inimigoBaixoHp = criarAlvoSamurai(20, 500, 0);
      let atk7CenarioB = turnoDeCombate(samuraiCenarioB, inimigoBaixoHp, 1).turnoLog.ataques[0];
      for (let t = 2; t <= 7; t++) {
        atk7CenarioB = turnoDeCombate(samuraiCenarioB, inimigoBaixoHp, t).turnoLog.ataques[0];
      }

      expect(atk7CenarioB.habilidadeAcionada).toBe('Corte do Vazio');
      expect(atk7CenarioB.golpeExtraCorteDoVazioAtivo).toBe(true);
      expect(atk7CenarioB.danoGolpeExtraCorteDoVazio).toBe(42); // 100% do dano físico normal (42)
      expect(atk7CenarioB.danoEfetivoGolpeExtraCorteDoVazio).toBe(27); // 42 - 15 (mesma mitigação com 25% ignorado)
      expect(atk7CenarioB.danoBruto).toBe(199 + 42); // 241 total bruto (199 + 42)
      expect(atk7CenarioB.danoEfetivo).toBe(184 + 27); // 211 total efetivo (184 + 27)
      expect(atk7CenarioB.hpRestante).toBe(46); // 257 - 184 = 73 (<= 100), depois 73 - 27 = 46
      expect(inimigoBaixoHp.hp).toBe(46);
    });
  });
});
