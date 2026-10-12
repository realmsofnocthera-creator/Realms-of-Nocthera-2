import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCharacter, executarCacada, executarCombate, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { getTransactionsByUid, resetCharacterStore, setTestPersistenceFailHook } from '@/test/repositorioMemoria';

/** Provação da Caçada no servidor: validação da estrela, drops no inventário, XP com trava e progresso. */
describe('Caçada (servidor)', () => {
  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    setTestPersistenceFailHook(null);
    vi.restoreAllMocks();
  });

  const FORTE = { vigor: 400, sorte: 0, forca: 300, vitalidade: 100, arcano: 0, inteligencia: 0, agilidade: 50 };
  const FRACO = { vigor: 1, sorte: 0, forca: 0, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };

  async function setup(uid: string, extra: Record<string, unknown> = {}) {
    await createCharacter(uid, {
      nome: 'Cacador_' + uid,
      racaId: 'elfo',
      classeId: 'cavaleiro',
      pontos: { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 },
    });
    await updateCharacter(uid, { nivel: 2, atributos: FORTE, ouro: 500, ...extra });
    return (await getCharacterByUid(uid))!;
  }

  it('bloqueia estrela sem nível ou sem o monstro-chave anterior, sem gravar nada', async () => {
    await setup('c1', { nivel: 1 });
    await expect(executarCacada('c1', 'rato-da-floresta', { seed: 1 })).rejects.toThrow('Nível insuficiente');
    await updateCharacter('c1', { nivel: 30 });
    await expect(executarCacada('c1', 'vargheist', { seed: 1 })).rejects.toThrow('Vença o monstro-chave');
    await expect(executarCacada('c1', 'rato-da-peste', { seed: 1 })).rejects.toThrow('Monstro da Caçada inválido');
    const c = (await getCharacterByUid('c1'))!;
    expect(c.inventario).toEqual({});
    expect(c.ouro).toBe(500);
  });

  it('vitória: drop Comum garantido no inventário, ouro e XP da Caçada', async () => {
    const antes = await setup('c2');
    const r = await executarCacada('c2', 'lobo-cinzento', { seed: 7, combateId: 'cacada-teste-0001' });
    expect(r.resultado.vencedor).toBe('personagem');
    expect(r.cacada.estrela).toBe(1);
    expect(r.cacada.drops[0]).toEqual({ materialId: 'pele-de-lobo-cinzento', quantidade: 1 });
    expect(r.character.inventario?.['pele-de-lobo-cinzento']).toBe(1);
    expect(r.cacada.xpBase).toBe(2); // 5% de 40 (XP do nível 2)
    expect(r.character.ouro).toBeGreaterThan(antes.ouro);
    expect(r.mensagens.some((m) => m.startsWith('Drops:'))).toBe(true);
  });

  it('mesmo combateId não aplica de novo (idempotente)', async () => {
    await setup('c3');
    const a = await executarCacada('c3', 'lobo-cinzento', { seed: 7, combateId: 'cacada-teste-0002' });
    const b = await executarCacada('c3', 'lobo-cinzento', { seed: 99, combateId: 'cacada-teste-0002' });
    expect(b.repetido).toBe(true);
    expect(b.cacada).toEqual(a.cacada);
    expect(b.character.inventario?.['pele-de-lobo-cinzento']).toBe(1);
  });

  it('o inventário acumula entre caçadas', async () => {
    await setup('c4');
    await executarCacada('c4', 'lobo-cinzento', { seed: 1 });
    await executarCacada('c4', 'lobo-cinzento', { seed: 2 });
    const c = (await getCharacterByUid('c4'))!;
    expect(c.inventario?.['pele-de-lobo-cinzento']).toBe(2);
  });

  it('vencer o monstro-chave abre a estrela seguinte', async () => {
    await setup('c5', { nivel: 5 });
    await expect(executarCacada('c5', 'vargheist', { seed: 3 })).rejects.toThrow('Vença o monstro-chave');
    const r = await executarCacada('c5', 'urso-gigante', { seed: 3 });
    expect(r.cacada.chaveVencida).toBe(1);
    expect(r.character.cacadaChavesVencidas).toEqual([1]);
    const v = await executarCacada('c5', 'vargheist', { seed: 3 });
    expect(v.cacada.estrela).toBe(2);
    // vencer o chave de novo não duplica o progresso
    const de_novo = await executarCacada('c5', 'urso-gigante', { seed: 4 });
    expect(de_novo.cacada.chaveVencida).toBeUndefined();
    expect(de_novo.character.cacadaChavesVencidas).toEqual([1]);
  });

  it('trava de XP: muito acima da estrela não ganha XP, mas ganha os drops', async () => {
    await setup('c6', { nivel: 20 });
    const r = await executarCacada('c6', 'lobo-cinzento', { seed: 5 });
    expect(r.cacada.xpGanho).toBe(0);
    expect(r.cacada.drops.length).toBeGreaterThan(0);
  });

  it('derrota: perde 50 de ouro, sem drops nem progresso', async () => {
    await setup('c7', { atributos: FRACO, ouro: 120 });
    const r = await executarCacada('c7', 'urso-gigante', { seed: 2 });
    expect(r.resultado.vencedor).toBe('monstro');
    expect(r.cacada.drops).toEqual([]);
    expect(r.character.ouro).toBe(70);
    expect(r.character.inventario).toEqual({});
    expect(r.character.cacadaChavesVencidas).toEqual([]);
    expect(getTransactionsByUid('c7').some((t) => t.moeda === 'ouro' && t.tipo === 'perda' && t.quantidade === 50)).toBe(true);
  });

  it('os monstros da Caçada não entram pelo combate comum', async () => {
    await setup('c8');
    await expect(executarCombate('c8', 'lobo-cinzento', { seed: 1 })).rejects.toThrow('não encontrado');
  });
});
