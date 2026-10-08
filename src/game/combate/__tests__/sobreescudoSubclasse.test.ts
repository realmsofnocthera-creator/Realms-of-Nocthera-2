import { describe, it, expect, beforeEach } from 'vitest';
import { calcularSobreescudoMax } from '@/game';
import { createCharacter, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { resetCharacterStore } from '@/test/repositorioMemoria';

/**
 * Ordem 48E — Casca de Pedra do Colosso: +5% de Sobreescudo máximo, somado (regra 1.2.2)
 * à Resistência Bárbara (+5%) num grupo só.
 *
 * Vitalidade 50 = base 100 (2 de Sobreescudo por ponto).
 */
describe('ORDEM 48E — Sobreescudo máximo: soma da classe com a subclasse', () => {
  const VITALIDADE_BASE_100 = 50;

  it('Bárbaro nível 20 sem subclasse: só a Resistência Bárbara (+5%), igual a antes', () => {
    expect(calcularSobreescudoMax(VITALIDADE_BASE_100, { classeId: 'barbaro', nivel: 20 })).toBe(105);
  });

  it('Colosso com a passiva ativa (tier 1): +5% + +5% = +10% sobre a base, e não 111 (multiplicando)', () => {
    const valor = calcularSobreescudoMax(VITALIDADE_BASE_100, {
      classeId: 'barbaro',
      nivel: 20,
      subclasseAtualId: 'colosso',
      subclasseTiers: { colosso: 1 },
    });
    expect(valor).toBe(110);
    expect(valor).not.toBe(Math.ceil((Math.ceil((100 * 105) / 100) * 105) / 100)); // 111
  });

  it('o arredondamento é feito uma vez só, no total', () => {
    // base 10 (vitalidade 5): ceil(10 × 110 / 100) = 11; multiplicando daria ceil(ceil(10,5) × 1,05) = 12
    expect(
      calcularSobreescudoMax(5, {
        classeId: 'barbaro',
        nivel: 20,
        subclasseAtualId: 'colosso',
        subclasseTiers: { colosso: 1 },
      })
    ).toBe(11);
  });

  it('Colosso no tier 0: a passiva ainda não vale (exige tier 1)', () => {
    expect(
      calcularSobreescudoMax(VITALIDADE_BASE_100, {
        classeId: 'barbaro',
        nivel: 20,
        subclasseAtualId: 'colosso',
        subclasseTiers: { colosso: 0 },
      })
    ).toBe(105);
  });

  it('Berserker no tier 1: a passiva dele não mexe no Sobreescudo', () => {
    expect(
      calcularSobreescudoMax(VITALIDADE_BASE_100, {
        classeId: 'barbaro',
        nivel: 20,
        subclasseAtualId: 'berserker',
        subclasseTiers: { berserker: 1 },
      })
    ).toBe(105);
  });

  it('Cavaleiro nível 12 (Muralha de Ferro +10%) continua igual a antes', () => {
    expect(calcularSobreescudoMax(VITALIDADE_BASE_100, { classeId: 'cavaleiro', nivel: 12 })).toBe(110);
  });

  it('sem classe nem subclasse: valor base', () => {
    expect(calcularSobreescudoMax(VITALIDADE_BASE_100)).toBe(100);
    expect(calcularSobreescudoMax(VITALIDADE_BASE_100, { classeId: 'feiticeiro', nivel: 30 })).toBe(100);
  });

  describe('no servidor (personagem salvo)', () => {
    beforeEach(() => {
      resetCharacterStore();
    });

    async function criarBarbaroNivel20(uid: string) {
      await createCharacter(uid, {
        nome: `Titan ${uid}`.slice(0, 32),
        racaId: 'humano',
        classeId: 'barbaro',
        pontos: { vigor: 2, mente: 0, forca: 2, vitalidade: 6, arcano: 0, inteligencia: 0, agilidade: 0 },
      });
      return updateCharacter(uid, { nivel: 20 });
    }

    it('o Sobreescudo máximo do personagem Colosso com tier 1 usa a soma, e o do tier 0 não muda', async () => {
      const uid = 'sobreescudo_colosso';
      const char = await criarBarbaroNivel20(uid);
      const base = char.atributos.vitalidade * 2;

      expect(char.sobreescudoMax).toBe(Math.ceil((base * 105) / 100));

      const tier0 = await updateCharacter(uid, { subclasseAtualId: 'colosso', subclasseTiers: { colosso: 0 } });
      expect(tier0.sobreescudoMax).toBe(Math.ceil((base * 105) / 100));

      const tier1 = await updateCharacter(uid, { subclasseTiers: { colosso: 1 } });
      expect(tier1.sobreescudoMax).toBe(Math.ceil((base * 110) / 100));

      // E o valor persistido e relido pelo servidor é o mesmo
      expect((await getCharacterByUid(uid))!.sobreescudoMax).toBe(tier1.sobreescudoMax);
    });

    it('voltar a outra subclasse tira o bônus', async () => {
      const uid = 'sobreescudo_troca';
      const char = await criarBarbaroNivel20(uid);
      const base = char.atributos.vitalidade * 2;

      await updateCharacter(uid, { subclasseAtualId: 'colosso', subclasseTiers: { colosso: 1, berserker: 1 } });
      const comBerserker = await updateCharacter(uid, { subclasseAtualId: 'berserker' });
      expect(comBerserker.sobreescudoMax).toBe(Math.ceil((base * 105) / 100));
    });
  });
});
