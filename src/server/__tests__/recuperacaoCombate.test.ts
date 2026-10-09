import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter, executarCombate } from '@/server/characterService';
import { resetCharacterStore } from '@/test/repositorioMemoria';

/**
 * 1.7.2 / 1.7.3 — Decisão do Yuri (09/10/2026): o Sobreescudo (e a vida, "igual ao Sobreescudo")
 * recupera 100% quando um combate termina: toda luta começa com HP e Sobreescudo cheios.
 */
describe('1.7.2 e 1.7.3 — recuperação total depois do combate', () => {
  beforeEach(() => {
    resetCharacterStore();
  });

  it('uma luta perdida (HP e Sobreescudo gastos) não afeta a luta seguinte: ela começa com tudo cheio', async () => {
    await createCharacter('user_rec', {
      nome: 'Recupera',
      racaId: 'humano',
      classeId: 'barbaro',
      pontos: { vigor: 0, sorte: 0, forca: 5, vitalidade: 5, arcano: 0, inteligencia: 0, agilidade: 0 },
    } as never);

    const primeira = await executarCombate('user_rec', 'cavaleiro-do-vazio', { seed: 11, combateId: 'rec-combate-0001' });
    const segunda = await executarCombate('user_rec', 'cavaleiro-do-vazio', { seed: 11, combateId: 'rec-combate-0002' });

    // Mesma semente e mesmo personagem: se a segunda luta começasse com menos HP/Sobreescudo, o log seria outro
    expect(segunda.resultado.logTurnos[0]).toEqual(primeira.resultado.logTurnos[0]);
    expect(segunda.resultado.personagemFinal.hpMax).toBe(primeira.resultado.personagemFinal.hpMax);
  });
});
