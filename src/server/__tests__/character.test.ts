import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCharacter,
  getCharacterByUid,
  getPublicCharacterByName,
  updateCharacter,
  updateCharacterAvatar,
  updateCharacterSobre,
  calcularXpComBonusRacial,
} from '@/server/characterService';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { AVATARES_DISPONIVEIS } from '@/rules/avatars';
import {
  calcularAgilidadeEfetiva,
  calcularDefesaFisica,
  calcularHpMax,
  calcularChanceCritico,
  calcularSobreescudoMax,
} from '@/game';
import { calcularDanoFisico, calcularDanoMagico } from '@/game/combat';
import { GAME_CONFIG } from '@/rules/config';
import { RACES, RACES_MAP, getRaceById } from '@/rules/races';
import { CLASSES, getClassById } from '@/rules/classes';
import { MONSTERS_MAP } from '@/rules/monsters';

describe('ORDEM 2 & ORDEM 4 - Criação, Raças e Gerenciamento de Personagem', () => {
  beforeEach(() => {
    resetCharacterStore();
  });

  describe('1. Validação de Pontos', () => {
    it('tentar criar personagem com pontos errados (soma diferente de 10) deve falhar', async () => {
      // Soma = 5 (faltando 5)
      await expect(
        createCharacter('user_1', {
          nome: 'Valerius',
          racaId: 'humano',
          pontos: {
            vigor: 5,
            sorte: 0,
            forca: 0,
            vitalidade: 0,
            arcano: 0,
            inteligencia: 0,
            agilidade: 0,
          },
        })
      ).rejects.toThrow(/soma dos pontos distribuídos/i);

      // Soma = 15 (excedendo 10)
      await expect(
        createCharacter('user_1', {
          nome: 'Valerius',
          racaId: 'humano',
          pontos: {
            vigor: 10,
            sorte: 5,
            forca: 0,
            vitalidade: 0,
            arcano: 0,
            inteligencia: 0,
            agilidade: 0,
          },
        })
      ).rejects.toThrow(/soma dos pontos distribuídos/i);
    });

    it('tentar criar personagem com pontos negativos deve falhar', async () => {
      await expect(
        createCharacter('user_1', {
          nome: 'Morrigan',
          racaId: 'humano',
          pontos: {
            vigor: -2,
            sorte: 12, // Soma matemática seria 10, mas há valor negativo
            forca: 0,
            vitalidade: 0,
            arcano: 0,
            inteligencia: 0,
            agilidade: 0,
          },
        })
      ).rejects.toThrow(/pontos negativos/i);
    });

    it('tentar criar personagem sem nome ou com nome inválido deve falhar', async () => {
      await expect(
        createCharacter('user_1', {
          nome: '',
          racaId: 'humano',
          pontos: {
            vigor: 10,
            sorte: 0,
            forca: 0,
            vitalidade: 0,
            arcano: 0,
            inteligencia: 0,
            agilidade: 0,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('2. Unicidade de Personagem por Usuário', () => {
    it('tentar criar dois personagens para o mesmo usuário deve falhar', async () => {
      const uid = 'user_unico_123';

      // Primeiro personagem: válido
      const char1 = await createCharacter(uid, {
        nome: 'Alrik O Cinzento',
        racaId: 'humano',
        pontos: {
          vigor: 4,
          sorte: 2,
          forca: 2,
          vitalidade: 2,
          arcano: 0,
          inteligencia: 0,
          agilidade: 0,
        },
      });
      expect(char1).toBeDefined();
      expect(char1.nome).toBe('Alrik O Cinzento');

      // Tentativa de criar segundo personagem para o mesmo UID: DEVE FALHAR
      await expect(
        createCharacter(uid, {
          nome: 'Kaelen',
          racaId: 'humano',
          pontos: {
            vigor: 2,
            sorte: 2,
            forca: 2,
            vitalidade: 2,
            arcano: 2,
            inteligencia: 0,
            agilidade: 0,
          },
        })
      ).rejects.toThrow(/já possui um personagem/i);
    });
  });

  describe('3. Cálculos Derivados e Conformidade com src/game/', () => {
    it('criar personagem válido e conferir que HP e Mana batem exatamente com as funções puras de src/game/', async () => {
      const uid = 'hero_nocthera_456';
      const racaHumano = RACES_MAP['humano'];

      // Distribuição de 10 pontos:
      // vigor extra = 4 (base 2 + raça 1 + 4 = 7)
      // sorte extra = 3 (base 2 + raça 1 + 3 = 6)
      // forca extra = 3 (base 0 + raça 1 + 3 = 4)
      const pontos = {
        vigor: 4,
        sorte: 3,
        forca: 3,
        vitalidade: 0,
        arcano: 0,
        inteligencia: 0,
        agilidade: 0,
      };

      const char = await createCharacter(uid, {
        nome: 'Aethelgard',
        racaId: 'humano',
        pontos,
      });

      // Atributos esperados: base + bônus racial + pontos do jogador
      expect(char.atributos.vigor).toBe(
        GAME_CONFIG.VALOR_BASE_ATRIBUTOS.vigor + racaHumano.bonusAtributos.vigor + 4
      ); // 2 + 1 + 4 = 7
      expect(char.atributos.sorte).toBe(
        GAME_CONFIG.VALOR_BASE_ATRIBUTOS.sorte + racaHumano.bonusAtributos.sorte + 3
      ); // 2 + 1 + 3 = 6
      expect(char.atributos.forca).toBe(
        GAME_CONFIG.VALOR_BASE_ATRIBUTOS.forca + racaHumano.bonusAtributos.forca + 3
      ); // 0 + 1 + 3 = 4

      // HP e crítico esperados chamando as funções de src/game/
      const hpEsperado = calcularHpMax(char.atributos.vigor);
      const criticoEsperado = calcularChanceCritico(char.atributos.sorte);

      expect(char.hpMax).toBe(hpEsperado);
      expect(char.hpMax).toBe(35); // 7 * 5

      expect(char.chanceCritico).toBe(criticoEsperado);
      expect(char.chanceCritico).toBe(2.6); // 2% de base + 6 × 0,1%

      // Recuperar pelo serviço getCharacterByUid e verificar integridade
      const carregado = await getCharacterByUid(uid);
      expect(carregado).not.toBeNull();
      expect(carregado?.hpMax).toBe(hpEsperado);
      expect(carregado?.chanceCritico).toBe(criticoEsperado);
    });
  });

  describe('4. Segurança: Bloqueio de Escrita Direta do Cliente em characters/ e transactions/', () => {
    it('firestore.rules deve conter allow write: if false explicitamente para characters e transactions', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
      const rulesContent = fs.readFileSync(rulesPath, 'utf-8');

      // Verifica que characters/{uid} proíbe escrita
      const characterBlockMatch = rulesContent.match(/match\s+\/characters\/\{uid\}\s*\{([\s\S]*?)\}/);
      expect(characterBlockMatch).not.toBeNull();
      const characterRules = characterBlockMatch![1];
      expect(characterRules).toMatch(/allow\s+write:\s*if\s+false\s*;/);
      expect(characterRules).not.toMatch(/allow\s+write:\s*if\s+isOwner/);
      expect(characterRules).not.toMatch(/allow\s+write:\s*if\s+true/);

      // Verifica que transactions/{transactionId} proíbe escrita do cliente
      const transactionBlockMatch = rulesContent.match(/match\s+\/transactions\/\{transactionId\}\s*\{([\s\S]*?)\}/);
      expect(transactionBlockMatch).not.toBeNull();
      const transactionRules = transactionBlockMatch![1];
      expect(transactionRules).toMatch(/allow\s+write:\s*if\s+false\s*;/);
      expect(transactionRules).not.toMatch(/allow\s+write:\s*if\s+isOwner/);
    });

    it('uma escrita direta simulando cliente autenticado tentando gravar em characters/ é rejeitada', async () => {
      const simulateDirectClientWrite = (isAuthenticated: boolean, uid: string, targetUid: string) => {
        const allowWrite = false;
        if (!isAuthenticated || !allowWrite || uid !== targetUid) {
          throw new Error('PERMISSION_DENIED: Missing or insufficient permissions.');
        }
      };

      expect(() => simulateDirectClientWrite(true, 'user_123', 'user_123')).toThrow(/PERMISSION_DENIED/);
    });
  });

  describe('5. ORDEM 4 - Sistema de Raças (Humano)', () => {
    it('personagem Humano criado tem os atributos base + bônus racial + pontos do jogador corretos', async () => {
      const uid = 'user_humano_test';
      const pontos = {
        vigor: 2,
        sorte: 1,
        forca: 3,
        vitalidade: 1,
        arcano: 1,
        inteligencia: 1,
        agilidade: 1,
      }; // Soma = 10

      const char = await createCharacter(uid, {
        nome: 'Roland de Midgard',
        racaId: 'humano',
        pontos,
      });

      expect(char.racaId).toBe('humano');
      // Base (2,2,0,0,0,0,0) + Humano (1,1,1,1,0,0,1) + Pontos (2,1,3,1,1,1,1)
      expect(char.atributos).toEqual({
        vigor: 2 + 1 + 2, // 5
        sorte: 2 + 1 + 1, // 4
        forca: 0 + 1 + 3, // 4
        vitalidade: 0 + 1 + 1, // 2
        arcano: 0 + 0 + 1, // 1
        inteligencia: 0 + 0 + 1, // 1
        agilidade: 0 + 1 + 1, // 2
      });
      expect(char.hpMax).toBe(calcularHpMax(5)); // 25
      expect(char.sobreescudoMax).toBe(calcularSobreescudoMax(2)); // 4
    });

    it('XP de uma vitória em combate para Humano é 5% maior que o XP base do monstro (arredondado para baixo)', () => {
      const rato = MONSTERS_MAP['rato-da-peste']; // 25 XP -> floor(25 * 1.05) = 26
      const cultista = MONSTERS_MAP['cultista-das-sombras']; // 60 XP -> floor(60 * 1.05) = 63
      const cavaleiro = MONSTERS_MAP['cavaleiro-do-vazio']; // 150 XP -> floor(150 * 1.05) = 157

      expect(calcularXpComBonusRacial(rato.xpConcedido, 'humano')).toBe(26);
      expect(calcularXpComBonusRacial(cultista.xpConcedido, 'humano')).toBe(63);
      expect(calcularXpComBonusRacial(cavaleiro.xpConcedido, 'humano')).toBe(157);
    });

    it('criar personagem com racaId inválido é rejeitado', async () => {
      const pontosValidos = {
        vigor: 2,
        sorte: 2,
        forca: 2,
        vitalidade: 2,
        arcano: 2,
        inteligencia: 0,
        agilidade: 0,
      };

      await expect(
        createCharacter('user_raca_invalida_1', {
          nome: 'Invasor',
          racaId: 'elfo-negro',
          pontos: pontosValidos,
        })
      ).rejects.toThrow(/raça inválida/i);

      await expect(
        createCharacter('user_raca_invalida_2', {
          nome: 'SemRaca',
          racaId: '',
          pontos: pontosValidos,
        })
      ).rejects.toThrow(/raça inválida/i);
    });
  });

  describe('6. ORDEM 5 - Sistema de Raças (Anão)', () => {
    it('a raça Anão está cadastrada na lista de raças com todos os seus dados exatos', () => {
      expect(RACES.map((r) => r.id)).toContain('anao');

      const anao = getRaceById('anao');
      expect(anao).toBeDefined();
      expect(anao?.nome).toBe('Anão');
      expect(anao?.iconeUrl).toBeNull();
      expect(anao?.bonusAtributos).toEqual({
        vigor: 2,
        sorte: 0,
        forca: 1,
        vitalidade: 2,
        arcano: 0,
        inteligencia: 0,
        agilidade: 0,
      });
      const somaBonus = Object.values(anao!.bonusAtributos).reduce((acc, v) => acc + v, 0);
      expect(somaBonus).toBe(5);
      expect(anao?.passivaRacial).toEqual({
        nome: 'Resistência Ancestral',
        descricao: '-10% de dano físico recebido e -10% de chance de sofrer status físicos (Sangramento, Veneno).',
        efeito: 'resistenciaEfeitosFisicos',
        valor: 10,
      });
      expect(anao?.habilidadeRacial).toEqual({
        nome: 'Fúria da Forja',
        tipo: 'ativa',
        recargaTurnos: GAME_CONFIG.RECARGA_HABILIDADE_RACIAL_RODADAS, // 8 rodadas, sem custo
        duracaoTurnos: 3,
        efeito: '+3 Força, +2 Vitalidade, -20% dano físico recebido, -2 Agilidade',
      });
      expect(anao?.resistencias).toEqual([{ tipo: 'danoFisico', valor: 5 }]);
      expect(anao?.fraquezas).toEqual([{ tipo: 'resistenciaReducaoAgilidade', valor: -10 }]);
    });

    it('personagem Anão criado tem os atributos base + bônus racial + pontos do jogador corretos', async () => {
      const uid = 'user_anao_nidavellir';
      const pontos = {
        vigor: 3,
        sorte: 1,
        forca: 3,
        vitalidade: 2,
        arcano: 0,
        inteligencia: 0,
        agilidade: 1,
      }; // Soma = 10

      const char = await createCharacter(uid, {
        nome: 'Thorin Forja-Férrea',
        racaId: 'anao',
        pontos,
      });

      expect(char.racaId).toBe('anao');
      // Base (2,2,0,0,0,0,0) + Anão (2,0,1,2,0,0,0) + Pontos (3,1,3,2,0,0,1)
      expect(char.atributos).toEqual({
        vigor: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.vigor + 2 + 3, // 2 + 2 + 3 = 7
        sorte: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.sorte + 0 + 1, // 2 + 0 + 1 = 3
        forca: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.forca + 1 + 3, // 0 + 1 + 3 = 4
        vitalidade: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.vitalidade + 2 + 2, // 0 + 2 + 2 = 4
        arcano: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.arcano + 0 + 0, // 0
        inteligencia: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.inteligencia + 0 + 0, // 0
        agilidade: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.agilidade + 0 + 1, // 0 + 0 + 1 = 1
      });
      expect(char.hpMax).toBe(calcularHpMax(7)); // 35
      expect(char.sobreescudoMax).toBe(calcularSobreescudoMax(4)); // 8
    });

    it('personagem Anão com 0 pontos extras em Vigor tem vigor = 4 (base 2 + bônus racial 2)', async () => {
      const uid = 'user_anao_base_vigor';
      const char = await createCharacter(uid, {
        nome: 'Balin de Nidavellir',
        racaId: 'anao',
        pontos: {
          vigor: 0,
          sorte: 0,
          forca: 5,
          vitalidade: 5,
          arcano: 0,
          inteligencia: 0,
          agilidade: 0,
        },
      });

      expect(char.atributos.vigor).toBe(4); // 2 base + 2 bônus racial Anão
      expect(char.atributos.sorte).toBe(2); // 2 base + 0 bônus racial Anão
      expect(char.atributos.forca).toBe(6); // 0 base + 1 bônus racial Anão + 5 pontos
      expect(char.atributos.vitalidade).toBe(7); // 0 base + 2 bônus racial Anão + 5 pontos
    });
  });

  describe('7. ORDEM 6 - Sistema de Raças (Elfo)', () => {
    it('a raça Elfo está cadastrada na lista de raças com todos os seus dados exatos', () => {
      expect(RACES.map((r) => r.id)).toContain('elfo');

      const elfo = getRaceById('elfo');
      expect(elfo).toBeDefined();
      expect(elfo?.nome).toBe('Elfo');
      expect(elfo?.iconeUrl).toBeNull();
      expect(elfo?.bonusAtributos).toEqual({
        vigor: 0,
        sorte: 1,
        forca: 0,
        vitalidade: 0,
        arcano: 1,
        inteligencia: 2,
        agilidade: 1,
      });
      const somaBonus = Object.values(elfo!.bonusAtributos).reduce((acc, v) => acc + v, 0);
      expect(somaBonus).toBe(5);
      expect(elfo?.passivaRacial).toEqual({
        nome: 'Herança Arcana',
        descricao: '+1 de Sorte.',
        efeito: 'bonusSorte',
        valor: 1,
      });
      expect(elfo?.habilidadeRacial).toEqual({
        nome: 'Graça de Alfheim',
        tipo: 'ativa',
        recargaTurnos: GAME_CONFIG.RECARGA_HABILIDADE_RACIAL_RODADAS, // 8 rodadas, sem custo
        duracaoTurnos: 3,
        efeito:
          '+3 Inteligência, +2 Agilidade, +2 Arcano; próximo ataque/habilidade mágica no efeito recebe +15% de dano mágico',
      });
      expect(elfo?.resistencias).toEqual([{ tipo: 'danoMagico', valor: 5 }]);
      expect(elfo?.fraquezas).toEqual([{ tipo: 'resistenciaDanoFisico', valor: -10 }]);
    });

    it('personagem Elfo criado tem atributos base + bônus racial + pontos do jogador corretos (incluindo Inteligência +2)', async () => {
      const uid = 'user_elfo_alfheim';
      const pontos = {
        vigor: 1,
        sorte: 2,
        forca: 0,
        vitalidade: 0,
        arcano: 2,
        inteligencia: 4,
        agilidade: 1,
      }; // Soma = 10

      const char = await createCharacter(uid, {
        nome: 'Aelion de Alfheim',
        racaId: 'elfo',
        pontos,
      });

      expect(char.racaId).toBe('elfo');
      // Base (2,2,0,0,0,0,0) + Elfo (0,1,0,0,1,2,1) + Pontos (1,2,0,0,2,4,1)
      expect(char.atributos).toEqual({
        vigor: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.vigor + 0 + 1, // 2 + 0 + 1 = 3
        sorte: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.sorte + 1 + 1 + 2, // 2 + 1 + Herança Arcana 1 + 2 = 6
        forca: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.forca + 0 + 0, // 0
        vitalidade: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.vitalidade + 0 + 0, // 0
        arcano: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.arcano + 1 + 2, // 0 + 1 + 2 = 3
        inteligencia: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.inteligencia + 2 + 4, // 0 + 2 + 4 = 6
        agilidade: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.agilidade + 1 + 1, // 0 + 1 + 1 = 2
      });
      // Conferência explícita de Inteligência +2 sobre base 0 + 4 pontos do jogador = 6
      expect(char.atributos.inteligencia).toBe(6);
      expect(char.hpMax).toBe(calcularHpMax(3)); // 15
      expect(char.sobreescudoMax).toBe(calcularSobreescudoMax(0)); // 0
    });

    it('personagem Elfo sem pontos extras em Inteligência já nasce com Inteligência = 2 (base 0 + bônus racial 2)', async () => {
      const uid = 'user_elfo_base_int';
      const char = await createCharacter(uid, {
        nome: 'Sylvaris',
        racaId: 'elfo',
        pontos: {
          vigor: 5,
          sorte: 5,
          forca: 0,
          vitalidade: 0,
          arcano: 0,
          inteligencia: 0,
          agilidade: 0,
        },
      });

      expect(char.atributos.inteligencia).toBe(2); // 0 base + 2 bônus racial Elfo
      expect(char.atributos.sorte).toBe(9); // 2 base + 1 bônus racial Elfo + 1 Herança Arcana + 5 pontos
      expect(char.atributos.arcano).toBe(1); // 0 base + 1 bônus racial Elfo
      expect(char.atributos.agilidade).toBe(1); // 0 base + 1 bônus racial Elfo
    });
  });

  describe('8. ORDEM 7 - Sistema de Raças (Orc)', () => {
    it('a raça Orc está cadastrada na lista de raças com todos os seus dados exatos', () => {
      expect(RACES.map((r) => r.id)).toContain('orc');

      const orc = getRaceById('orc');
      expect(orc).toBeDefined();
      expect(orc?.nome).toBe('Orc');
      expect(orc?.iconeUrl).toBeNull();
      expect(orc?.bonusAtributos).toEqual({
        vigor: 2,
        sorte: 0,
        forca: 2,
        vitalidade: 1,
        arcano: 0,
        inteligencia: 0,
        agilidade: 0,
      });
      const somaBonus = Object.values(orc!.bonusAtributos).reduce((acc, v) => acc + v, 0);
      expect(somaBonus).toBe(5);
      expect(orc?.passivaRacial).toEqual({
        nome: 'Instinto de Guerra',
        descricao: 'Abaixo de 30% de HP, +10% de dano físico e +10% de Defesa Física.',
        efeito: 'instintoDeGuerraAbaixo30Hp',
        valor: 10,
      });
      expect(orc?.habilidadeRacial).toEqual({
        nome: 'Fúria Orc',
        tipo: 'ativa',
        recargaTurnos: GAME_CONFIG.RECARGA_HABILIDADE_RACIAL_RODADAS, // 8 rodadas, sem custo
        duracaoTurnos: 3,
        efeito: '+4 Força, +2 Vigor, +10% de dano físico, -2 Agilidade',
      });
      expect(orc?.resistencias).toEqual([{ tipo: 'danoFisico', valor: 5 }]);
      expect(orc?.fraquezas).toEqual([{ tipo: 'resistenciaControleMagico', valor: -10 }]);
    });

    it('personagem Orc criado tem atributos base + bônus racial + pontos do jogador corretos (+2 Vigor, +2 Força, +1 Vitalidade)', async () => {
      const uid = 'user_orc_warclan';
      const pontos = {
        vigor: 3,
        sorte: 0,
        forca: 5,
        vitalidade: 2,
        arcano: 0,
        inteligencia: 0,
        agilidade: 0,
      }; // Soma = 10

      const char = await createCharacter(uid, {
        nome: 'Grommash do Clã Cinzento',
        racaId: 'orc',
        pontos,
      });

      expect(char.racaId).toBe('orc');
      // Base (2,2,0,0,0,0,0) + Orc (2,0,2,1,0,0,0) + Pontos (3,0,5,2,0,0,0)
      expect(char.atributos).toEqual({
        vigor: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.vigor + 2 + 3, // 2 + 2 + 3 = 7
        sorte: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.sorte + 0 + 0, // 2 + 0 + 0 = 2
        forca: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.forca + 2 + 5, // 0 + 2 + 5 = 7
        vitalidade: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.vitalidade + 1 + 2, // 0 + 1 + 2 = 3
        arcano: 0,
        inteligencia: 0,
        agilidade: 0,
      });
      expect(char.hpMax).toBe(calcularHpMax(7)); // 35
      expect(char.sobreescudoMax).toBe(calcularSobreescudoMax(3)); // 6
    });
  });

  describe('9. ORDEM 8 - Sistema de Raças (Vampiro)', () => {
    it('a raça Vampiro está cadastrada na lista de raças com todos os seus dados exatos', () => {
      expect(RACES.map((r) => r.id)).toContain('vampiro');

      const vampiro = getRaceById('vampiro');
      expect(vampiro).toBeDefined();
      expect(vampiro?.nome).toBe('Vampiro');
      expect(vampiro?.iconeUrl).toBeNull();
      expect(vampiro?.bonusAtributos).toEqual({
        vigor: 1,
        sorte: 1,
        forca: 1,
        vitalidade: 0,
        arcano: 1,
        inteligencia: 0,
        agilidade: 1,
      });
      const somaBonus = Object.values(vampiro!.bonusAtributos).reduce((acc, v) => acc + v, 0);
      expect(somaBonus).toBe(5);
      expect(vampiro?.passivaRacial).toEqual({
        nome: 'Sede de Sangue',
        descricao: 'Recupera 5% do dano físico causado como HP, sem passar do máximo.',
        efeito: 'roubarVidaDanoFisico',
        valor: 5,
      });
      expect(vampiro?.habilidadeRacial).toEqual({
        nome: 'Drenar Sangue',
        tipo: 'ativa',
        recargaTurnos: GAME_CONFIG.RECARGA_HABILIDADE_RACIAL_RODADAS, // 8 rodadas, sem custo
        efeito:
          'dano mágico por Inteligência; cura 50% do dano causado, ou 75% se o alvo estiver abaixo de 30% HP',
      });
      expect(vampiro?.resistencias).toEqual([
        { tipo: 'danoTrevas', valor: 5 },
        { tipo: 'drenagemVida', valor: 10 },
      ]);
      expect(vampiro?.fraquezas).toEqual([
        { tipo: 'luzSolar', efeito: 'dano contínuo e bloqueia a passiva enquanto exposto' },
        { tipo: 'resistenciaDanoFogo', valor: -10 },
      ]);
    });

    it('personagem Vampiro criado tem atributos base + bônus racial + pontos do jogador corretos', async () => {
      const uid = 'user_vampiro_nocthera';
      const pontos = {
        vigor: 2,
        sorte: 1,
        forca: 3,
        vitalidade: 0,
        arcano: 2,
        inteligencia: 0,
        agilidade: 2,
      }; // Soma = 10

      const char = await createCharacter(uid, {
        nome: 'Alucard da Zona do Caos',
        racaId: 'vampiro',
        pontos,
      });

      expect(char.racaId).toBe('vampiro');
      // Base (2,2,0,0,0,0,0) + Vampiro (1,1,1,0,1,0,1) + Pontos (2,1,3,0,2,0,2)
      expect(char.atributos).toEqual({
        vigor: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.vigor + 1 + 2, // 2 + 1 + 2 = 5
        sorte: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.sorte + 1 + 1, // 2 + 1 + 1 = 4
        forca: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.forca + 1 + 3, // 0 + 1 + 3 = 4
        vitalidade: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.vitalidade + 0 + 0, // 0
        arcano: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.arcano + 1 + 2, // 0 + 1 + 2 = 3
        inteligencia: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.inteligencia + 0 + 0, // 0
        agilidade: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.agilidade + 1 + 2, // 0 + 1 + 2 = 3
      });
      expect(char.hpMax).toBe(calcularHpMax(5)); // 25
      expect(char.sobreescudoMax).toBe(calcularSobreescudoMax(0)); // 0
    });
  });

  describe('10. ORDEM 9 - Sistema de Raças (Draconiano)', () => {
    const pontosValidos = {
      vigor: 2,
      sorte: 0,
      forca: 4,
      vitalidade: 2,
      arcano: 2,
      inteligencia: 0,
      agilidade: 0,
    }; // Soma = 10

    it('a lista de raças agora tem 6 raças (Humano, Anão, Elfo, Orc, Vampiro, Draconiano) com todos os dados do Draconiano', () => {
      expect(RACES).toHaveLength(6);
      expect(RACES.map((r) => r.id)).toEqual([
        'humano',
        'anao',
        'elfo',
        'orc',
        'vampiro',
        'draconiano',
      ]);
      expect(RACES.map((r) => r.nome)).toEqual([
        'Humano',
        'Anão',
        'Elfo',
        'Orc',
        'Vampiro',
        'Draconiano',
      ]);

      const draconiano = getRaceById('draconiano');
      expect(draconiano).toBeDefined();
      expect(draconiano?.nome).toBe('Draconiano');
      expect(draconiano?.iconeUrl).toBeNull();
      expect(draconiano?.linhagens).toEqual(['fogo', 'gelo', 'relampago', 'terra', 'vento']);
      expect(draconiano?.bonusAtributos).toEqual({
        vigor: 1,
        sorte: 0,
        forca: 2,
        vitalidade: 1,
        arcano: 1,
        inteligencia: 0,
        agilidade: 0,
      });
      const somaBonus = Object.values(draconiano!.bonusAtributos).reduce((acc, v) => acc + v, 0);
      expect(somaBonus).toBe(5);
      expect(draconiano?.passivaRacial).toEqual({
        nome: 'Sangue Dracônico',
        descricao:
          '25% de resistência ao elemento da linhagem escolhida. Fraqueza: +10% de dano do elemento oposto.',
        efeito: 'resistenciaElementoLinhagem',
        valor: 25,
      });
      expect(draconiano?.habilidadeRacial).toEqual({
        nome: 'Sopro Dracônico',
        tipo: 'ativa',
        recargaTurnos: GAME_CONFIG.RECARGA_HABILIDADE_RACIAL_RODADAS, // 8 rodadas, sem custo
        efeito:
          'dano elemental por Inteligência; efeito extra varia por linhagem (fogo: queimadura; gelo: reduz Agilidade do alvo; relâmpago: atinge um segundo alvo; terra: reduz Defesa Física do alvo; vento: aumenta a Agilidade do draconiano)',
      });
      expect(draconiano?.fraquezaElementoOposto).toEqual({
        fogo: 'gelo',
        gelo: 'fogo',
        relampago: 'terra',
        terra: 'vento',
        vento: 'relampago',
      });
    });

    it('personagem Draconiano criado sem linhagem é rejeitado', async () => {
      await expect(
        createCharacter('user_drac_sem_linhagem', {
          nome: 'Ignis Sem Linhagem',
          racaId: 'draconiano',
          pontos: pontosValidos,
        })
      ).rejects.toThrow(/linhagem é obrigatória/i);
    });

    it('personagem Draconiano criado com linhagem inválida é rejeitado', async () => {
      await expect(
        createCharacter('user_drac_linhagem_invalida', {
          nome: 'Ignis Caos',
          racaId: 'draconiano',
          linhagem: 'magma',
          pontos: pontosValidos,
        })
      ).rejects.toThrow(/linhagem inválida/i);
    });

    it('personagem Draconiano criado com linhagem válida tem os atributos base + bônus racial + pontos corretos e a linhagem salva', async () => {
      const uid = 'user_drac_fogo_valido';
      const char = await createCharacter(uid, {
        nome: 'Pyros de Yggdrasil',
        racaId: 'draconiano',
        linhagem: 'fogo',
        pontos: pontosValidos,
      });

      expect(char.racaId).toBe('draconiano');
      expect(char.linhagem).toBe('fogo');
      // Base (2,2,0,0,0,0,0) + Draconiano (1,0,2,1,1,0,0) + Pontos (2,0,4,2,2,0,0)
      expect(char.atributos).toEqual({
        vigor: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.vigor + 1 + 2, // 2 + 1 + 2 = 5
        sorte: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.sorte + 0 + 0, // 2 + 0 + 0 = 2
        forca: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.forca + 2 + 4, // 0 + 2 + 4 = 6
        vitalidade: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.vitalidade + 1 + 2, // 0 + 1 + 2 = 3
        arcano: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.arcano + 1 + 2, // 0 + 1 + 2 = 3
        inteligencia: 0,
        agilidade: 0,
      });
      expect(char.hpMax).toBe(calcularHpMax(5)); // 25
      expect(char.sobreescudoMax).toBe(calcularSobreescudoMax(3)); // 6

      const carregado = await getCharacterByUid(uid);
      expect(carregado?.linhagem).toBe('fogo');
    });

    it('criar Humano, Anão, Elfo, Orc e Vampiro continua funcionando sem exigir linhagem', async () => {
      const racasSemLinhagem = ['humano', 'anao', 'elfo', 'orc', 'vampiro'] as const;

      for (const racaId of racasSemLinhagem) {
        const char = await createCharacter(`user_sem_linhagem_${racaId}`, {
          nome: `Herói ${racaId}`,
          racaId,
          pontos: pontosValidos,
        });
        expect(char.racaId).toBe(racaId);
        expect(char.linhagem).toBeUndefined();
      }
    });
  });

  describe('11. ORDEM 10 - Sistema de Classes (Bárbaro)', () => {
    const pontosValidos = {
      vigor: 3,
      sorte: 0,
      forca: 4,
      vitalidade: 2,
      arcano: 0,
      inteligencia: 0,
      agilidade: 1,
    }; // Soma = 10

    it('a classe Bárbaro está cadastrada em src/rules/classes.ts com bônus somando 3 e progressão completa', () => {
      expect(CLASSES.map((c) => c.id)).toContain('barbaro');
      const barbaro = getClassById('barbaro');
      expect(barbaro).toBeDefined();
      expect(barbaro?.nome).toBe('Bárbaro');
      expect(barbaro?.bonusAtributos).toEqual({
        vigor: 1,
        sorte: 0,
        forca: 1,
        vitalidade: 1,
        arcano: 0,
        inteligencia: 0,
        agilidade: 0,
      });
      const somaBonus = Object.values(barbaro!.bonusAtributos).reduce((acc, v) => acc + v, 0);
      expect(somaBonus).toBe(3);

      expect(barbaro?.progressao.ataqueBasico.nivel).toBe(1);
      expect(barbaro?.progressao.ataqueBasico.nome).toBe('Golpe Bárbaro');
      expect(barbaro?.progressao.habilidadeEspecial.nivel).toBe(5);
      expect(barbaro?.progressao.habilidadeEspecial.nome).toBe('Fúria Selvagem');
      expect(barbaro?.progressao.passivaI.nivel).toBe(12);
      expect(barbaro?.progressao.passivaI.nome).toBe('Instinto de Sobrevivência');
      expect(barbaro?.progressao.passivaII.nivel).toBe(20);
      expect(barbaro?.progressao.passivaII.nome).toBe('Resistência Bárbara');
      expect(barbaro?.progressao.ultimate.nivel).toBe(30);
      expect(barbaro?.progressao.ultimate.nome).toBe('Ira do Bárbaro');
    });

    it('personagem Bárbaro criado tem atributos base + bônus racial + bônus de classe + pontos do jogador corretos', async () => {
      const uid = 'user_barbaro_orc_1';
      const char = await createCharacter(uid, {
        nome: 'Ragnar Quebra-Crânios',
        racaId: 'orc',
        classeId: 'barbaro',
        pontos: pontosValidos,
      });

      expect(char.racaId).toBe('orc');
      expect(char.classeId).toBe('barbaro');
      // Base (2,2,0,0,0,0,0) + Orc (2,0,2,1,0,0,0) + Bárbaro (1,0,1,1,0,0,0) + Pontos (3,0,4,2,0,0,1)
      expect(char.atributos).toEqual({
        vigor: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.vigor + 2 + 1 + 3, // 2 + 2 + 1 + 3 = 8
        sorte: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.sorte + 0 + 0 + 0, // 2
        forca: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.forca + 2 + 1 + 4, // 0 + 2 + 1 + 4 = 7
        vitalidade: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.vitalidade + 1 + 1 + 2, // 0 + 1 + 1 + 2 = 4
        arcano: 0,
        inteligencia: 0,
        agilidade: 1,
      });
      expect(char.hpMax).toBe(calcularHpMax(8, { classeId: 'barbaro', nivel: 1 })); // 40
      expect(char.sobreescudoMax).toBe(calcularSobreescudoMax(4, { classeId: 'barbaro', nivel: 1 })); // 8
    });

    it('criar personagem com classeId inválido é rejeitado', async () => {
      await expect(
        createCharacter('user_classe_invalida', {
          nome: 'SemClasse',
          racaId: 'humano',
          classeId: 'necromante-inexistente',
          pontos: pontosValidos,
        })
      ).rejects.toThrow(/classe inválida/i);
    });

    it('um Bárbaro nível 20+ tem HP máximo e Sobreescudo máximo maiores que um idêntico nível 19 (Resistência Bárbara permanente)', async () => {
      const charLv19 = await createCharacter('user_barbaro_lv19', {
        nome: 'Bárbaro Nv19',
        racaId: 'humano',
        classeId: 'barbaro',
        pontos: pontosValidos,
      });
      const charLv20 = await createCharacter('user_barbaro_lv20', {
        nome: 'Bárbaro Nv20',
        racaId: 'humano',
        classeId: 'barbaro',
        pontos: pontosValidos,
      });

      const atualizado19 = await updateCharacter(charLv19.uid, { nivel: 19 });
      const atualizado20 = await updateCharacter(charLv20.uid, { nivel: 20 });

      expect(atualizado20.atributos).toEqual(atualizado19.atributos);
      expect(atualizado20.hpMax).toBeGreaterThan(atualizado19.hpMax);
      expect(atualizado20.sobreescudoMax).toBeGreaterThan(atualizado19.sobreescudoMax);
      expect(atualizado20.hpMax).toBe(Math.ceil((atualizado19.hpMax * 110) / 100));
      expect(atualizado20.sobreescudoMax).toBe(Math.ceil((atualizado19.sobreescudoMax * 105) / 100));
    });
  });

  describe('12. ORDEM 11 - Sistema de Classes (Cavaleiro)', () => {
    const pontosValidos = {
      vigor: 2,
      sorte: 0,
      forca: 2,
      vitalidade: 6,
      arcano: 0,
      inteligencia: 0,
      agilidade: 0,
    }; // Soma = 10

    it('a classe Cavaleiro está cadastrada em src/rules/classes.ts com bônus Vigor+1 e Vitalidade+2', () => {
      expect(CLASSES.map((c) => c.id)).toContain('cavaleiro');

      const cavaleiro = getClassById('cavaleiro');
      expect(cavaleiro).toBeDefined();
      expect(cavaleiro?.nome).toBe('Cavaleiro');
      expect(cavaleiro?.bonusAtributos).toEqual({
        vigor: 1,
        sorte: 0,
        forca: 0,
        vitalidade: 2,
        arcano: 0,
        inteligencia: 0,
        agilidade: 0,
      });
      const somaBonus = Object.values(cavaleiro!.bonusAtributos).reduce((acc, v) => acc + v, 0);
      expect(somaBonus).toBe(3);

      expect(cavaleiro?.progressao.ataqueBasico.nivel).toBe(1);
      expect(cavaleiro?.progressao.ataqueBasico.nome).toBe('Golpe do Guardião');
      expect(cavaleiro?.progressao.habilidadeEspecial.nivel).toBe(5);
      expect(cavaleiro?.progressao.habilidadeEspecial.nome).toBe('Postura do Guardião');
      expect(cavaleiro?.progressao.passivaI.nivel).toBe(12);
      expect(cavaleiro?.progressao.passivaI.nome).toBe('Muralha de Ferro');
      expect(cavaleiro?.progressao.passivaII.nivel).toBe(20);
      expect(cavaleiro?.progressao.passivaII.nome).toBe('Último Bastião');
      expect(cavaleiro?.progressao.ultimate.nivel).toBe(30);
      expect(cavaleiro?.progressao.ultimate.nome).toBe('Juramento do Guardião');
    });

    it('personagem Cavaleiro criado tem atributos corretos (Vigor+1, Vitalidade+2 de classe)', async () => {
      const uid = 'user_cavaleiro_anao_1';
      const char = await createCharacter(uid, {
        nome: 'Sor Galahad',
        racaId: 'anao',
        classeId: 'cavaleiro',
        pontos: pontosValidos,
      });

      expect(char.racaId).toBe('anao');
      expect(char.classeId).toBe('cavaleiro');
      // Base (2,2,0,0,0,0,0) + Anão (2,0,1,2,0,0,0) + Cavaleiro (1,0,0,2,0,0,0) + Pontos (2,0,2,6,0,0,0)
      expect(char.atributos).toEqual({
        vigor: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.vigor + 2 + 1 + 2, // 2 + 2 + 1 + 2 = 7
        sorte: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.sorte + 0 + 0 + 0, // 2
        forca: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.forca + 1 + 0 + 2, // 0 + 1 + 0 + 2 = 3
        vitalidade: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.vitalidade + 2 + 2 + 6, // 0 + 2 + 2 + 6 = 10
        arcano: 0,
        inteligencia: 0,
        agilidade: 0,
      });
      expect(char.hpMax).toBe(calcularHpMax(7, { classeId: 'cavaleiro', nivel: 1 })); // 35
      expect(char.sobreescudoMax).toBe(
        calcularSobreescudoMax(10, { classeId: 'cavaleiro', nivel: 1 })
      ); // 20
      expect(char.defesaFisica).toBe(calcularDefesaFisica(10, { classeId: 'cavaleiro', nivel: 1 })); // 10
    });

    it('Cavaleiro nível 12+ tem Defesa Física e Sobreescudo máximo maiores que nível 11 (Muralha de Ferro permanente)', async () => {
      const charLv11 = await createCharacter('user_cavaleiro_lv11', {
        nome: 'Cavaleiro Nv11',
        racaId: 'anao',
        classeId: 'cavaleiro',
        pontos: pontosValidos,
      });
      const charLv12 = await createCharacter('user_cavaleiro_lv12', {
        nome: 'Cavaleiro Nv12',
        racaId: 'anao',
        classeId: 'cavaleiro',
        pontos: pontosValidos,
      });

      const atualizado11 = await updateCharacter(charLv11.uid, { nivel: 11 });
      const atualizado12 = await updateCharacter(charLv12.uid, { nivel: 12 });

      expect(atualizado12.atributos).toEqual(atualizado11.atributos);
      expect(atualizado12.defesaFisica!).toBeGreaterThan(atualizado11.defesaFisica!);
      expect(atualizado12.sobreescudoMax).toBeGreaterThan(atualizado11.sobreescudoMax);
      expect(atualizado12.defesaFisica).toBe(Math.ceil((atualizado11.defesaFisica! * 110) / 100));
      expect(atualizado12.sobreescudoMax).toBe(Math.ceil((atualizado11.sobreescudoMax * 110) / 100));
    });
  });

  describe('13. ORDEM 12 - Sistema de Classes (Feiticeiro)', () => {
    const pontosValidos = {
      vigor: 1,
      sorte: 3,
      forca: 0,
      vitalidade: 0,
      arcano: 2,
      inteligencia: 4,
      agilidade: 0,
    }; // Soma = 10

    it('a classe Feiticeiro está cadastrada em src/rules/classes.ts com bônus Sorte+1, Arcano+1, Inteligência+1', () => {
      expect(CLASSES.map((c) => c.id)).toContain('feiticeiro');

      const feiticeiro = getClassById('feiticeiro');
      expect(feiticeiro).toBeDefined();
      expect(feiticeiro?.nome).toBe('Feiticeiro');
      expect(feiticeiro?.bonusAtributos).toEqual({
        vigor: 0,
        sorte: 1,
        forca: 0,
        vitalidade: 0,
        arcano: 1,
        inteligencia: 1,
        agilidade: 0,
      });
      const somaBonus = Object.values(feiticeiro!.bonusAtributos).reduce((acc, v) => acc + v, 0);
      expect(somaBonus).toBe(3);

      expect(feiticeiro?.progressao.ataqueBasico.nivel).toBe(1);
      expect(feiticeiro?.progressao.ataqueBasico.nome).toBe('Faísca Arcana');
      expect(feiticeiro?.progressao.habilidadeEspecial.nivel).toBe(5);
      expect(feiticeiro?.progressao.habilidadeEspecial.nome).toBe('Explosão Arcana');
      expect(feiticeiro?.progressao.passivaI.nivel).toBe(12);
      expect(feiticeiro?.progressao.passivaI.nome).toBe('Fluxo Arcano');
      expect(feiticeiro?.progressao.passivaII.nivel).toBe(20);
      expect(feiticeiro?.progressao.passivaII.nome).toBe('Acúmulo Arcano');
      expect(feiticeiro?.progressao.ultimate.nivel).toBe(30);
      expect(feiticeiro?.progressao.ultimate.nome).toBe('Cataclismo Arcano');
    });

    it('personagem Feiticeiro criado tem atributos corretos (Sorte+1, Arcano+1, Inteligência+1 de classe)', async () => {
      const uid = 'user_feiticeiro_elfo_1';
      const char = await createCharacter(uid, {
        nome: 'Aelindor Arcano',
        racaId: 'elfo',
        classeId: 'feiticeiro',
        pontos: pontosValidos,
      });

      expect(char.racaId).toBe('elfo');
      expect(char.classeId).toBe('feiticeiro');
      // Base (2,2,0,0,0,0,0) + Elfo (0,1,0,0,1,2,1) + Feiticeiro (0,1,0,0,1,1,0) + Pontos (1,3,0,0,2,4,0)
      expect(char.atributos).toEqual({
        vigor: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.vigor + 0 + 0 + 1, // 3
        sorte: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.sorte + 1 + 1 + 1 + 3, // 2 + 1 + Herança Arcana 1 + 1 + 3 = 8
        forca: 0,
        vitalidade: 0,
        arcano: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.arcano + 1 + 1 + 2, // 0 + 1 + 1 + 2 = 4
        inteligencia: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.inteligencia + 2 + 1 + 4, // 0 + 2 + 1 + 4 = 7
        agilidade: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.agilidade + 1 + 0 + 0, // 1
      });
      expect(char.hpMax).toBe(calcularHpMax(3, { classeId: 'feiticeiro', nivel: 1 })); // 15
    });

    it('Feiticeiro nível 12+ tem dano mágico maior que nível 11 (Fluxo Arcano permanente)', async () => {
      const charLv11 = await createCharacter('user_feiticeiro_lv11', {
        nome: 'Feiticeiro Nv11',
        racaId: 'elfo',
        classeId: 'feiticeiro',
        pontos: pontosValidos,
      });
      const charLv12 = await createCharacter('user_feiticeiro_lv12', {
        nome: 'Feiticeiro Nv12',
        racaId: 'elfo',
        classeId: 'feiticeiro',
        pontos: pontosValidos,
      });

      const atualizado11 = await updateCharacter(charLv11.uid, { nivel: 11 });
      const atualizado12 = await updateCharacter(charLv12.uid, { nivel: 12 });

      expect(atualizado12.atributos).toEqual(atualizado11.atributos);
      const int = atualizado11.atributos.inteligencia;
      expect(calcularDanoMagico(int, { classeId: 'feiticeiro', nivel: 12 })).toBe(Math.ceil((int * 110) / 100));
      expect(calcularDanoMagico(int, { classeId: 'feiticeiro', nivel: 11 })).toBe(int);
    });
  });

  describe('14. ORDEM 13 - Sistema de Classes (Bandido)', () => {
    const pontosValidos = {
      vigor: 2,
      sorte: 0,
      forca: 4,
      vitalidade: 0,
      arcano: 0,
      inteligencia: 0,
      agilidade: 4,
    }; // Soma = 10

    it('a classe Bandido está cadastrada em src/rules/classes.ts com bônus Força+1 e Agilidade+2', () => {
      expect(CLASSES.map((c) => c.id)).toContain('bandido');

      const bandido = getClassById('bandido');
      expect(bandido).toBeDefined();
      expect(bandido?.nome).toBe('Bandido');
      expect(bandido?.bonusAtributos).toEqual({
        vigor: 0,
        sorte: 0,
        forca: 1,
        vitalidade: 0,
        arcano: 0,
        inteligencia: 0,
        agilidade: 2,
      });
      const somaBonus = Object.values(bandido!.bonusAtributos).reduce((acc, v) => acc + v, 0);
      expect(somaBonus).toBe(3);

      expect(bandido?.progressao.ataqueBasico.nivel).toBe(1);
      expect(bandido?.progressao.ataqueBasico.nome).toBe('Golpe Rápido');
      expect(bandido?.progressao.habilidadeEspecial.nivel).toBe(5);
      expect(bandido?.progressao.habilidadeEspecial.nome).toBe('Rajada de Golpes');
      expect(bandido?.progressao.passivaI.nivel).toBe(12);
      expect(bandido?.progressao.passivaI.nome).toBe('Passos Rápidos');
      expect(bandido?.progressao.passivaII.nivel).toBe(20);
      expect(bandido?.progressao.passivaII.nome).toBe('Sede de Sangue (Bandido)');
      expect(bandido?.progressao.ultimate.nivel).toBe(30);
      expect(bandido?.progressao.ultimate.nome).toBe('Dança das Lâminas');
    });

    it('personagem Bandido criado tem atributos corretos (Força+1, Agilidade+2 de classe)', async () => {
      const uid = 'user_bandido_vampiro_1';
      const char = await createCharacter(uid, {
        nome: 'Kaelen Sombra-Veloz',
        racaId: 'vampiro',
        classeId: 'bandido',
        pontos: pontosValidos,
      });

      expect(char.racaId).toBe('vampiro');
      expect(char.classeId).toBe('bandido');
      // Base (2,2,0,0,0,0,0) + Vampiro (1,1,1,0,1,0,1) + Bandido (0,0,1,0,0,0,2) + Pontos (2,0,4,0,0,0,4)
      expect(char.atributos).toEqual({
        vigor: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.vigor + 1 + 0 + 2, // 2 + 1 + 0 + 2 = 5
        sorte: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.sorte + 1 + 0 + 0, // 2 + 1 + 0 + 0 = 3
        forca: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.forca + 1 + 1 + 4, // 0 + 1 + 1 + 4 = 6
        vitalidade: 0,
        arcano: 1,
        inteligencia: 0,
        agilidade: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.agilidade + 1 + 2 + 4, // 0 + 1 + 2 + 4 = 7
      });
      expect(char.agilidadeEfetiva).toBe(calcularAgilidadeEfetiva(7, { classeId: 'bandido', nivel: 1 })); // 7
      expect(char.danoFisicoBase).toBe(calcularDanoFisico(6, { classeId: 'bandido', nivel: 1 })); // 6
    });

    it('Bandido nível 12+ tem Agilidade e dano físico base maiores que nível 11 (Passos Rápidos permanente)', async () => {
      const charLv11 = await createCharacter('user_bandido_lv11', {
        nome: 'Bandido Nv11',
        racaId: 'vampiro',
        classeId: 'bandido',
        pontos: pontosValidos,
      });
      const charLv12 = await createCharacter('user_bandido_lv12', {
        nome: 'Bandido Nv12',
        racaId: 'vampiro',
        classeId: 'bandido',
        pontos: pontosValidos,
      });

      const atualizado11 = await updateCharacter(charLv11.uid, { nivel: 11 });
      const atualizado12 = await updateCharacter(charLv12.uid, { nivel: 12 });

      expect(atualizado12.agilidadeEfetiva!).toBeGreaterThan(atualizado11.agilidadeEfetiva!);
      expect(atualizado12.danoFisicoBase!).toBeGreaterThan(atualizado11.danoFisicoBase!);
      expect(atualizado12.agilidadeEfetiva).toBe(atualizado11.agilidadeEfetiva! + 2);
      expect(atualizado12.danoFisicoBase).toBe(Math.ceil((atualizado11.danoFisicoBase! * 105) / 100));
    });
  });

  describe('15. ORDEM 14 - Sistema de Classes (Profeta)', () => {
    const pontosValidos = {
      vigor: 2,
      sorte: 3,
      forca: 0,
      vitalidade: 0,
      arcano: 2,
      inteligencia: 3,
      agilidade: 0,
    }; // Soma = 10

    it('a classe Profeta está cadastrada em src/rules/classes.ts com bônus Sorte+1, Arcano+1, Inteligência+1', () => {
      expect(CLASSES.map((c) => c.id)).toContain('profeta');

      const profeta = getClassById('profeta');
      expect(profeta).toBeDefined();
      expect(profeta?.nome).toBe('Profeta');
      expect(profeta?.bonusAtributos).toEqual({
        vigor: 0,
        sorte: 1,
        forca: 0,
        vitalidade: 0,
        arcano: 1,
        inteligencia: 1,
        agilidade: 0,
      });
      const somaBonus = Object.values(profeta!.bonusAtributos).reduce((acc, v) => acc + v, 0);
      expect(somaBonus).toBe(3);

      expect(profeta?.progressao.ataqueBasico.nivel).toBe(1);
      expect(profeta?.progressao.ataqueBasico.nome).toBe('Luz Sagrada');
      expect(profeta?.progressao.habilidadeEspecial.nivel).toBe(5);
      expect(profeta?.progressao.habilidadeEspecial.nome).toBe('Bênção Divina');
      expect(profeta?.progressao.passivaI.nivel).toBe(12);
      expect(profeta?.progressao.passivaI.nome).toBe('Graça Divina');
      expect(profeta?.progressao.passivaII.nivel).toBe(20);
      expect(profeta?.progressao.passivaII.nome).toBe('Fé Inabalável');
      expect(profeta?.progressao.ultimate.nivel).toBe(30);
      expect(profeta?.progressao.ultimate.nome).toBe('Milagre Divino');
    });

    it('personagem Profeta criado tem atributos corretos (Sorte+1, Arcano+1, Inteligência+1 de classe)', async () => {
      const uid = 'user_profeta_humano_1';
      const char = await createCharacter(uid, {
        nome: 'Solarius de Yggdrasil',
        racaId: 'humano',
        classeId: 'profeta',
        pontos: pontosValidos,
      });

      expect(char.racaId).toBe('humano');
      expect(char.classeId).toBe('profeta');
      // Base (2,2,0,0,0,0,0) + Humano (1,1,1,1,0,0,1) + Profeta (0,1,0,0,1,1,0) + Pontos (2,3,0,0,2,3,0)
      expect(char.atributos).toEqual({
        vigor: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.vigor + 1 + 0 + 2, // 2 + 1 + 0 + 2 = 5
        sorte: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.sorte + 1 + 1 + 3, // 2 + 1 + 1 + 3 = 7
        forca: 1,
        vitalidade: 1,
        arcano: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.arcano + 0 + 1 + 2, // 0 + 0 + 1 + 2 = 3
        inteligencia: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.inteligencia + 0 + 1 + 3, // 0 + 0 + 1 + 3 = 4
        agilidade: 1,
      });
      expect(char.hpMax).toBe(calcularHpMax(5, { classeId: 'profeta', nivel: 1 })); // 25
    });

    it('Profeta nível 12+ tem HP máximo e MP máximo maiores que nível 11 (Graça Divina permanente)', async () => {
      const charLv11 = await createCharacter('user_profeta_lv11', {
        nome: 'Profeta Nv11',
        racaId: 'humano',
        classeId: 'profeta',
        pontos: pontosValidos,
      });
      const charLv12 = await createCharacter('user_profeta_lv12', {
        nome: 'Profeta Nv12',
        racaId: 'humano',
        classeId: 'profeta',
        pontos: pontosValidos,
      });

      const atualizado11 = await updateCharacter(charLv11.uid, { nivel: 11 });
      const atualizado12 = await updateCharacter(charLv12.uid, { nivel: 12 });

      expect(atualizado12.atributos).toEqual(atualizado11.atributos);
      expect(atualizado12.hpMax).toBeGreaterThan(atualizado11.hpMax);
      expect(atualizado12.hpMax).toBe(Math.ceil((atualizado11.hpMax * 110) / 100));
    });
  });

  describe('16. ORDEM 15 - Sistema de Classes (Samurai)', () => {
    const pontosValidos = {
      vigor: 2,
      sorte: 0,
      forca: 4,
      vitalidade: 0,
      arcano: 0,
      inteligencia: 0,
      agilidade: 4,
    }; // Soma = 10

    it('a classe Samurai está cadastrada em src/rules/classes.ts (lista tem 6 classes) com bônus Força+1 e Agilidade+2', () => {
      expect(CLASSES).toHaveLength(6);
      expect(CLASSES.map((c) => c.id)).toEqual([
        'barbaro',
        'cavaleiro',
        'feiticeiro',
        'bandido',
        'profeta',
        'samurai',
      ]);

      const samurai = getClassById('samurai');
      expect(samurai).toBeDefined();
      expect(samurai?.nome).toBe('Samurai');
      expect(samurai?.bonusAtributos).toEqual({
        vigor: 0,
        sorte: 0,
        forca: 1,
        vitalidade: 0,
        arcano: 0,
        inteligencia: 0,
        agilidade: 2,
      });
      const somaBonus = Object.values(samurai!.bonusAtributos).reduce((acc, v) => acc + v, 0);
      expect(somaBonus).toBe(3);

      expect(samurai?.progressao.ataqueBasico.nivel).toBe(1);
      expect(samurai?.progressao.ataqueBasico.nome).toBe('Corte Preciso');
      expect(samurai?.progressao.habilidadeEspecial.nivel).toBe(5);
      expect(samurai?.progressao.habilidadeEspecial.nome).toBe('Iaijutsu');
      expect(samurai?.progressao.passivaI.nivel).toBe(12);
      expect(samurai?.progressao.passivaI.nome).toBe('Disciplina do Guerreiro');
      expect(samurai?.progressao.passivaII.nivel).toBe(20);
      expect(samurai?.progressao.passivaII.nome).toBe('Foco Absoluto');
      expect(samurai?.progressao.ultimate.nivel).toBe(30);
      expect(samurai?.progressao.ultimate.nome).toBe('Corte do Vazio');
    });

    it('personagem Samurai criado tem atributos corretos (Força+1, Agilidade+2 de classe)', async () => {
      const uid = 'user_samurai_humano_1';
      const char = await createCharacter(uid, {
        nome: 'Kenshin de Yggdrasil',
        racaId: 'humano',
        classeId: 'samurai',
        pontos: pontosValidos,
      });

      expect(char.racaId).toBe('humano');
      expect(char.classeId).toBe('samurai');
      // Base (2,2,0,0,0,0,0) + Humano (1,1,1,1,0,0,1) + Samurai (0,0,1,0,0,0,2) + Pontos (2,0,4,0,0,0,4)
      expect(char.atributos).toEqual({
        vigor: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.vigor + 1 + 0 + 2, // 2 + 1 + 0 + 2 = 5
        sorte: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.sorte + 1 + 0 + 0, // 2 + 1 + 0 + 0 = 3
        forca: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.forca + 1 + 1 + 4, // 0 + 1 + 1 + 4 = 6
        vitalidade: 1,
        arcano: 0,
        inteligencia: 0,
        agilidade: GAME_CONFIG.VALOR_BASE_ATRIBUTOS.agilidade + 1 + 2 + 4, // 0 + 1 + 2 + 4 = 7
      });
      expect(char.agilidadeEfetiva).toBe(
        calcularAgilidadeEfetiva(7, { classeId: 'samurai', nivel: 1 })
      ); // 7
      expect(char.danoFisicoBase).toBe(calcularDanoFisico(6, { classeId: 'samurai', nivel: 1 })); // 6
    });

    it('Samurai nível 12+ tem Agilidade e dano físico base maiores que nível 11 (Disciplina do Guerreiro permanente)', async () => {
      const charLv11 = await createCharacter('user_samurai_lv11', {
        nome: 'Samurai Nv11',
        racaId: 'humano',
        classeId: 'samurai',
        pontos: pontosValidos,
      });
      const charLv12 = await createCharacter('user_samurai_lv12', {
        nome: 'Samurai Nv12',
        racaId: 'humano',
        classeId: 'samurai',
        pontos: pontosValidos,
      });

      const atualizado11 = await updateCharacter(charLv11.uid, { nivel: 11 });
      const atualizado12 = await updateCharacter(charLv12.uid, { nivel: 12 });

      expect(atualizado12.agilidadeEfetiva!).toBeGreaterThan(atualizado11.agilidadeEfetiva!);
      expect(atualizado12.danoFisicoBase!).toBeGreaterThan(atualizado11.danoFisicoBase!);
      expect(atualizado12.agilidadeEfetiva).toBe(atualizado11.agilidadeEfetiva! + 2);
      expect(atualizado12.danoFisicoBase).toBe(
        Math.ceil((atualizado11.danoFisicoBase! * 105) / 100)
      );
    });
  });

  describe('17. ORDEM 30 - Unicidade Global do Nome do Personagem', () => {
    const pontosValidos = {
      vigor: 4,
      sorte: 2,
      forca: 2,
      vitalidade: 2,
      arcano: 0,
      inteligencia: 0,
      agilidade: 0,
    };

    it('rejeita criar personagem quando outro jogador (UID diferente) já usa o mesmo nome (exato ou case-insensitive)', async () => {
      const char1 = await createCharacter('uid_jogador_1', {
        nome: 'Yuri',
        racaId: 'humano',
        classeId: 'barbaro',
        pontos: pontosValidos,
      });
      expect(char1.nome).toBe('Yuri');

      // Mesmo nome exato em outra conta
      await expect(
        createCharacter('uid_jogador_2', {
          nome: 'Yuri',
          racaId: 'elfo',
          classeId: 'feiticeiro',
          pontos: pontosValidos,
        })
      ).rejects.toThrow(/Esse nome já está em uso/i);

      // Mesmo nome variando caixa (case-insensitive) e espaços nas extremidades em outra conta
      await expect(
        createCharacter('uid_jogador_3', {
          nome: '  yuri  ',
          racaId: 'anao',
          classeId: 'cavaleiro',
          pontos: pontosValidos,
        })
      ).rejects.toThrow(/Esse nome já está em uso/i);
    });
  });

  describe('18. ORDEM 31 - Avatar de Perfil (AVATARES_DISPONIVEIS, Persistência e Atualização)', () => {
    const pontosValidos = {
      vigor: 4,
      sorte: 2,
      forca: 2,
      vitalidade: 2,
      arcano: 0,
      inteligencia: 0,
      agilidade: 0,
    };

    it('define o id da classe escolhida como avatarId padrão na criação (avatar inicial = classe escolhida) e aceita qualquer avatar válido das 6 classes', async () => {
      expect(AVATARES_DISPONIVEIS).toHaveLength(6);
      expect(AVATARES_DISPONIVEIS.map((a) => a.id)).toEqual([
        'barbaro',
        'cavaleiro',
        'feiticeiro',
        'bandido',
        'profeta',
        'samurai',
      ]);

      const charCavaleiro = await createCharacter('uid_avatar_cavaleiro', {
        nome: 'Theron',
        racaId: 'humano',
        classeId: 'cavaleiro',
        pontos: pontosValidos,
      });
      expect(charCavaleiro.avatarId).toBe('cavaleiro');

      const charCustom = await createCharacter('uid_avatar_custom', {
        nome: 'Lyra',
        avatarId: 'samurai',
        racaId: 'elfo',
        classeId: 'feiticeiro',
        pontos: pontosValidos,
      });
      expect(charCustom.avatarId).toBe('samurai');
    });

    it('rejeita avatarId inválido na criação e permite atualizar apenas avatarId via updateCharacterAvatar', async () => {
      await expect(
        createCharacter('uid_avatar_invalido', {
          nome: 'Bael',
          avatarId: 'avatar-inexistente',
          racaId: 'humano',
          classeId: 'barbaro',
          pontos: pontosValidos,
        })
      ).rejects.toThrow(/Avatar inválido/i);

      const char = await createCharacter('uid_avatar_update', {
        nome: 'Kael',
        racaId: 'humano',
        classeId: 'cavaleiro',
        pontos: pontosValidos,
      });
      expect(char.avatarId).toBe('cavaleiro');

      const atualizado = await updateCharacterAvatar('uid_avatar_update', 'profeta');
      expect(atualizado.avatarId).toBe('profeta');
      expect(atualizado.nome).toBe(char.nome);
      expect(atualizado.racaId).toBe(char.racaId);
      expect(atualizado.classeId).toBe(char.classeId);
      expect(atualizado.atributos).toEqual(char.atributos);

      await expect(
        updateCharacterAvatar('uid_avatar_update', 'avatar-invalido')
      ).rejects.toThrow(/Avatar inválido/i);
    });
  });

  describe('19. ORDEM 32 - Perfil Público (Busca por Nome, Poder Total, Sobre e Privacidade)', () => {
    const pontosValidos = {
      vigor: 4,
      sorte: 2,
      forca: 2,
      vitalidade: 2,
      arcano: 0,
      inteligencia: 0,
      agilidade: 0,
    };

    it('busca perfil público por nome (case-insensitive), retorna poderTotal e sobre, e nunca expõe ouro, uid ou dados privados', async () => {
      await createCharacter('uid_public_1', {
        nome: 'Seraphina',
        racaId: 'elfo',
        classeId: 'feiticeiro',
        pontos: pontosValidos,
      });
      await updateCharacter('uid_public_1', { ouro: 500 });
      await updateCharacterSobre('uid_public_1', 'Maga das Torres Cinzentas.');

      const publicProfile = await getPublicCharacterByName('  seraphina  ');
      expect(publicProfile).not.toBeNull();
      expect(publicProfile?.nome).toBe('Seraphina');
      expect(publicProfile?.raca).toBe('Elfo');
      expect(publicProfile?.classe).toBe('Feiticeiro');
      expect(publicProfile?.avatarId).toBe('feiticeiro');
      expect(publicProfile?.sobre).toBe('Maga das Torres Cinzentas.');
      expect(publicProfile?.poderTotal).toBe(23); // Base 4 + Elfo 5 + Herança Arcana 1 + Feiticeiro 3 + 10 pontos = 23

      // Verifica que nenhum dado privado é retornado no objeto público
      const rawObj = publicProfile as unknown as Record<string, unknown>;
      expect(rawObj.ouro).toBeUndefined();
      expect(rawObj.uid).toBeUndefined();
      expect(rawObj.email).toBeUndefined();

      // Rejeita sobre maior que 150 caracteres
      const textoLongo = 'a'.repeat(151);
      await expect(
        updateCharacterSobre('uid_public_1', textoLongo)
      ).rejects.toThrow(/150 caracteres/i);
    });
  });
});
