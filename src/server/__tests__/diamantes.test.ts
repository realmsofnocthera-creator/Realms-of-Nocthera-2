import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCharacter,
  getCharacterByUid,
  getPublicCharacterByName,
  alterarDiamantes,
} from '@/server/characterService';
import { getTransactionsByUid, resetCharacterStore } from '@/test/repositorioMemoria';
import { GAME_CONFIG } from '@/rules/config';

describe('ORDEM 38 — Moeda Diamantes (Camada de Dados / Servidor)', () => {
  beforeEach(() => {
    resetCharacterStore();
  });

  it('GAME_CONFIG.CUSTO_RESET_ATRIBUTOS_DIAMANTES deve ser igual a 100', () => {
    expect(GAME_CONFIG.CUSTO_RESET_ATRIBUTOS_DIAMANTES).toBe(100);
  });

  it('personagem novo tem 0 diamantes por padrão', async () => {
    const char = await createCharacter('user_diamantes_1', {
      nome: 'Gildor',
      racaId: 'humano',
      classeId: 'cavaleiro',
      pontos: {
        vigor: 5,
        sorte: 0,
        forca: 5,
        vitalidade: 0,
        arcano: 0,
        inteligencia: 0,
        agilidade: 0,
      },
    });

    expect(char.diamantes).toBe(0);

    const loaded = await getCharacterByUid('user_diamantes_1');
    expect(loaded).not.toBeNull();
    expect(loaded?.diamantes).toBe(0);
  });

  it('alterarDiamantes(+150): saldo vai para 150, registra transação de ganho com moeda diamantes', async () => {
    await createCharacter('user_diamantes_2', {
      nome: 'Eldrin',
      racaId: 'elfo',
      classeId: 'feiticeiro',
      pontos: {
        vigor: 2,
        sorte: 5,
        forca: 0,
        vitalidade: 0,
        arcano: 0,
        inteligencia: 3,
        agilidade: 0,
      },
    });

    const updated = await alterarDiamantes('user_diamantes_2', 150, 'Recompensa especial');
    expect(updated.diamantes).toBe(150);

    const transactions = getTransactionsByUid('user_diamantes_2');
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      uid: 'user_diamantes_2',
      tipo: 'ganho',
      quantidade: 150,
      moeda: 'diamantes',
      motivo: 'Recompensa especial',
    });
  });

  it('alterarDiamantes(-100) subsequente: saldo vai para 50, registra transação de perda com quantidade 100', async () => {
    await createCharacter('user_diamantes_3', {
      nome: 'Kael',
      racaId: 'humano',
      classeId: 'barbaro',
      pontos: {
        vigor: 5,
        sorte: 0,
        forca: 5,
        vitalidade: 0,
        arcano: 0,
        inteligencia: 0,
        agilidade: 0,
      },
    });

    await alterarDiamantes('user_diamantes_3', 150, 'Depósito inicial');
    const updated = await alterarDiamantes('user_diamantes_3', -100, 'Reset de atributos');

    expect(updated.diamantes).toBe(50);

    const transactions = getTransactionsByUid('user_diamantes_3');
    expect(transactions).toHaveLength(2);
    expect(transactions[1]).toMatchObject({
      uid: 'user_diamantes_3',
      tipo: 'perda',
      quantidade: 100,
      moeda: 'diamantes',
      motivo: 'Reset de atributos',
    });
  });

  it('alterarDiamantes(-100) com saldo 50: lança "Diamantes insuficientes", saldo continua 50 e nenhuma transação nova é criada', async () => {
    await createCharacter('user_diamantes_4', {
      nome: 'Thorin',
      racaId: 'anao',
      classeId: 'cavaleiro',
      pontos: {
        vigor: 5,
        sorte: 0,
        forca: 2,
        vitalidade: 3,
        arcano: 0,
        inteligencia: 0,
        agilidade: 0,
      },
    });

    await alterarDiamantes('user_diamantes_4', 50, 'Crédito');

    const txCountBefore = getTransactionsByUid('user_diamantes_4').length;
    expect(txCountBefore).toBe(1);

    await expect(
      alterarDiamantes('user_diamantes_4', -100, 'Tentativa de gasto sem saldo')
    ).rejects.toThrow('Diamantes insuficientes');

    const loaded = await getCharacterByUid('user_diamantes_4');
    expect(loaded?.diamantes).toBe(50);

    const txCountAfter = getTransactionsByUid('user_diamantes_4').length;
    expect(txCountAfter).toBe(1);
  });

  it('delta 0 e deltas não inteiros (ex: 1.5, -0.5, NaN) são rejeitados com erro', async () => {
    await createCharacter('user_diamantes_5', {
      nome: 'Lyra',
      racaId: 'elfo',
      classeId: 'feiticeiro',
      pontos: {
        vigor: 2,
        sorte: 5,
        forca: 0,
        vitalidade: 0,
        arcano: 0,
        inteligencia: 3,
        agilidade: 0,
      },
    });

    await expect(alterarDiamantes('user_diamantes_5', 0, 'Zero')).rejects.toThrow();
    await expect(alterarDiamantes('user_diamantes_5', 1.5, 'Fracionário')).rejects.toThrow();
    await expect(alterarDiamantes('user_diamantes_5', -2.7, 'Fracionário negativo')).rejects.toThrow();
    await expect(alterarDiamantes('user_diamantes_5', NaN, 'NaN')).rejects.toThrow();
  });

  it('operações de diamantes não alteram o ouro do personagem', async () => {
    const char = await createCharacter('user_diamantes_6', {
      nome: 'Darek',
      racaId: 'humano',
      classeId: 'bandido',
      pontos: {
        vigor: 3,
        sorte: 0,
        forca: 2,
        vitalidade: 0,
        arcano: 0,
        inteligencia: 0,
        agilidade: 5,
      },
    });

    expect(char.ouro).toBe(0);

    await alterarDiamantes('user_diamantes_6', 200, 'Presente');
    const loaded1 = await getCharacterByUid('user_diamantes_6');
    expect(loaded1?.ouro).toBe(0);
    expect(loaded1?.diamantes).toBe(200);

    await alterarDiamantes('user_diamantes_6', -50, 'Uso');
    const loaded2 = await getCharacterByUid('user_diamantes_6');
    expect(loaded2?.ouro).toBe(0);
    expect(loaded2?.diamantes).toBe(150);
  });

  it('o perfil público não contém a chave diamantes nem a chave ouro', async () => {
    await createCharacter('user_diamantes_7', {
      nome: 'Vespera',
      racaId: 'vampiro',
      classeId: 'feiticeiro',
      pontos: {
        vigor: 2,
        sorte: 3,
        forca: 0,
        vitalidade: 0,
        arcano: 5,
        inteligencia: 0,
        agilidade: 0,
      },
    });

    await alterarDiamantes('user_diamantes_7', 500, 'Saldo vip');

    const publicProfile = await getPublicCharacterByName('Vespera');
    expect(publicProfile).not.toBeNull();
    expect(publicProfile).not.toHaveProperty('diamantes');
    expect(publicProfile).not.toHaveProperty('ouro');
    expect(publicProfile).not.toHaveProperty('uid');
  });
});
