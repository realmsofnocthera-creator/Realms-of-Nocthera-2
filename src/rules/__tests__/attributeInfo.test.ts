import { describe, it, expect } from 'vitest';
import { ATTRIBUTES, AttributeName } from '@/rules/attributes';
import { GAME_CONFIG } from '@/rules/config';
import { getAttributeExplanation, ATTRIBUTE_DISPLAY_NAMES } from '@/rules/attributeInfo';
import { getCharacterOtherBonuses } from '@/rules/otherBonuses';
import { CharacterDocument } from '@/server/characterService';

describe('attributeInfo', () => {
  it('garante que todos os 7 atributos possuem nome de exibição e explicação não vazia', () => {
    expect(ATTRIBUTES).toHaveLength(7);

    for (const attr of ATTRIBUTES) {
      const nome = ATTRIBUTE_DISPLAY_NAMES[attr];
      expect(nome).toBeDefined();
      expect(typeof nome).toBe('string');
      expect(nome.length).toBeGreaterThan(0);

      const explicacao = getAttributeExplanation(attr);
      expect(explicacao).toBeDefined();
      expect(typeof explicacao).toBe('string');
      expect(explicacao.trim().length).toBeGreaterThan(0);
    }
  });

  it('verifica que cada explicação contém os números/constantes de cálculo esperados', () => {
    const vigorExp = getAttributeExplanation('vigor');
    expect(vigorExp).toContain(String(GAME_CONFIG.HP_POR_PONTO_VIGOR));
    expect(vigorExp).toBe('Cada ponto de Vigor aumenta seu HP máximo em 5.');

    const sorteExp = getAttributeExplanation('sorte');
    expect(sorteExp).toBe(
      'Cada ponto de Sorte aumenta a chance de acerto crítico em 0,1% (base de 2%; o crítico causa 2x de dano) e a chance de drops em 0,1%.'
    );

    const forcaExp = getAttributeExplanation('forca');
    expect(forcaExp).toContain('1');
    expect(forcaExp).toBe('Cada ponto de Força aumenta seu dano físico em 1.');

    const vitalidadeExp = getAttributeExplanation('vitalidade');
    expect(vitalidadeExp).toContain('1');
    expect(vitalidadeExp).toContain(String(GAME_CONFIG.SOBREESCUDO_POR_PONTO_VITALIDADE));
    expect(vitalidadeExp).toBe('Cada ponto de Vitalidade aumenta sua mitigação física em 1 e seu Sobreescudo máximo em 2.');

    const arcanoExp = getAttributeExplanation('arcano');
    expect(arcanoExp).toContain('1');
    expect(arcanoExp).toBe('Cada ponto de Arcano aumenta sua mitigação mágica em 1.');

    const inteligenciaExp = getAttributeExplanation('inteligencia');
    expect(inteligenciaExp).toContain('1');
    expect(inteligenciaExp).toBe('Cada ponto de Inteligência aumenta seu dano mágico em 1.');

    const agilidadeExp = getAttributeExplanation('agilidade');
    expect(agilidadeExp).toContain(String(GAME_CONFIG.MAXIMO_ATAQUES_POR_TURNO));
    expect(agilidadeExp).toBe(
      'Quem tem mais Agilidade começa o combate (em caso de empate, é sorteio). Com o dobro da Agilidade do oponente, você ataca 2 vezes por turno (máximo de 2).'
    );
  });

  it('retorna string vazia para atributo desconhecido', () => {
    expect(getAttributeExplanation('invalido' as unknown as AttributeName)).toBe('');
  });

  it('getCharacterOtherBonuses devolve lista vazia [] para um personagem de exemplo', () => {
    const mockCharacter: CharacterDocument = {
      uid: 'user-123',
      nome: 'Valerius',
      avatarId: 'barbaro_default',
      racaId: 'humano',
      classeId: 'barbaro',
      nivel: 10,
      xpAtual: 500,
      ouro: 100,
      hpMax: 50,
      sobreescudoMax: 10,
      atributos: {
        vigor: 10,
        sorte: 4,
        forca: 15,
        vitalidade: 5,
        arcano: 2,
        inteligencia: 2,
        agilidade: 8,
      },
      pontosDisponiveis: 0,
      criadoEm: '2026-10-03T00:00:00.000Z',
    };

    const bonuses = getCharacterOtherBonuses(mockCharacter);
    expect(bonuses).toEqual([]);
    expect(Array.isArray(bonuses)).toBe(true);
    expect(bonuses).toHaveLength(0);
  });
});
