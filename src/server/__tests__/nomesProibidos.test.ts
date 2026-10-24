import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter, updateCharacterSobre } from '@/server/characterService';
import { resetCharacterStore } from '@/test/repositorioMemoria';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };

describe('Filtro de ofensas no servidor (6.5-13)', () => {
  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
  });

  it('o personagem não nasce com nome ofensivo, e o "Sobre" também passa pelo filtro', async () => {
    await expect(createCharacter('u1', { nome: 'C4ralh0', racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS })).rejects.toThrow(/não é permitida/);
    await createCharacter('u1', { nome: 'Lucas', racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
    await expect(updateCharacterSobre('u1', 'sou fã do hitler')).rejects.toThrow(/não é permitida/);
    expect((await updateCharacterSobre('u1', 'Caçador da disputa noturna.')).sobre).toBe('Caçador da disputa noturna.');
  });
});
