import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCharacter, executarBatalhaSangrenta, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { getTransactionsByUid, resetCharacterStore, setTestPersistenceFailHook } from '@/test/repositorioMemoria';

/** Provação de Batalha Sangrenta no servidor: nível, 5 ondas, fragmentos, tentativas por dia e idempotência. */
describe('Batalha Sangrenta (servidor)', () => {
  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    setTestPersistenceFailHook(null);
    vi.restoreAllMocks();
  });

  const MUITO_FORTE = { vigor: 9000, sorte: 0, forca: 9000, vitalidade: 5000, arcano: 0, inteligencia: 0, agilidade: 200 };
  const FRACO = { vigor: 1, sorte: 0, forca: 0, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
  const CHAVES = [1, 2, 3, 4, 5];
  const HOJE = new Date('2026-10-13T15:00:00Z');

  async function setup(uid: string, extra: Record<string, unknown> = {}) {
    await createCharacter(uid, {
      nome: 'Sangrento_' + uid,
      racaId: 'elfo',
      classeId: 'cavaleiro',
      pontos: { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 },
    });
    await updateCharacter(uid, { nivel: 20, atributos: MUITO_FORTE, cacadaChavesVencidas: CHAVES, ...extra });
    return (await getCharacterByUid(uid))!;
  }

  it('bloqueia quem não tem o nível, sem gastar tentativa nem gravar nada', async () => {
    await setup('b1', { nivel: 19 });
    await expect(executarBatalhaSangrenta('b1', { seed: 1, agora: HOJE })).rejects.toThrow('Nível insuficiente');
    const c = (await getCharacterByUid('b1'))!;
    expect(c.batalhaSangrenta).toBeUndefined();
    expect(c.fragmentosAlma).toBe(0);
  });

  it('vitória: 5 ondas com o chefe por último, HP que passa de uma luta para a outra e 8 fragmentos de alma', async () => {
    await setup('b2');
    const r = await executarBatalhaSangrenta('b2', { seed: 11, combateId: 'batalha-teste-0001', agora: HOJE });
    expect(r.estrela).toBe(6);
    expect(r.ondas).toHaveLength(5);
    expect(r.ondas.map((o) => o.chefe)).toEqual([false, false, false, false, true]);
    expect(r.ondas.every((o) => o.vencedor === 'personagem')).toBe(true);
    for (let i = 1; i < r.ondas.length; i++) expect(r.ondas[i].hpInicial).toBe(r.ondas[i - 1].hpFinal);
    expect(r.chefeVencido).toBe(true);
    expect(r.fragmentosAlma).toBe(8);
    expect(r.fragmentosSubclasse).toBe(0); // sem subclasse
    expect(r.character.fragmentosAlma).toBe(8);
    expect(r.tentativasRestantes).toBe(2);
    expect(r.character.batalhaSangrenta).toEqual({ dia: '2026-10-13', tentativas: 1 });
    expect(r.ondas[0].resultado?.logTurnos.length).toBeGreaterThan(0);
    const tx = await getTransactionsByUid('b2');
    expect(tx.some((t) => t.moeda === 'fragmentosAlma' && t.quantidade === 8 && t.motivo === 'Batalha Sangrenta')).toBe(true);
  });

  it('não dá XP, ouro nem drops', async () => {
    const antes = await setup('b3', { ouro: 500 });
    const r = await executarBatalhaSangrenta('b3', { seed: 5, agora: HOJE });
    expect(r.character.xpAtual).toBe(antes.xpAtual);
    expect(r.character.ouro).toBe(500);
    expect(r.character.inventario).toEqual({});
  });

  it('derrota na primeira onda: a tentativa é gasta e não há fragmentos', async () => {
    await setup('b4', { atributos: FRACO });
    const r = await executarBatalhaSangrenta('b4', { seed: 3, agora: HOJE });
    expect(r.ondas).toHaveLength(1);
    expect(r.ondas[0].vencedor).toBe('monstro');
    expect(r.ondasVencidas).toBe(0);
    expect(r.chefeVencido).toBe(false);
    expect(r.fragmentosAlma).toBe(0);
    expect(r.character.fragmentosAlma).toBe(0);
    expect(r.tentativasRestantes).toBe(2);
    expect(r.mensagens[0]).toContain('Você caiu na onda 1');
  });

  it('3 tentativas por dia; a 4ª é recusada e, no dia seguinte (Brasília), o contador zera', async () => {
    await setup('b5');
    for (let i = 0; i < 3; i++) await executarBatalhaSangrenta('b5', { seed: 20 + i, agora: HOJE });
    await expect(executarBatalhaSangrenta('b5', { seed: 99, agora: HOJE })).rejects.toThrow('tentativas de hoje');
    expect((await getCharacterByUid('b5'))!.fragmentosAlma).toBe(24);
    const amanha = new Date('2026-10-14T15:00:00Z');
    const r = await executarBatalhaSangrenta('b5', { seed: 100, agora: amanha });
    expect(r.tentativasRestantes).toBe(2);
    expect(r.character.batalhaSangrenta).toEqual({ dia: '2026-10-14', tentativas: 1 });
  });

  it('mesmo combateId não gasta outra tentativa nem paga de novo (idempotente)', async () => {
    await setup('b6');
    const a = await executarBatalhaSangrenta('b6', { seed: 7, combateId: 'batalha-teste-0002', agora: HOJE });
    const b = await executarBatalhaSangrenta('b6', { seed: 99, combateId: 'batalha-teste-0002', agora: HOJE });
    expect(b.repetido).toBe(true);
    expect(b.fragmentosAlma).toBe(a.fragmentosAlma);
    expect(b.ondas.map((o) => o.monstroId)).toEqual(a.ondas.map((o) => o.monstroId));
    expect(b.ondas[0].resultado).toBeUndefined(); // o log só vem na resposta original
    expect(b.character.fragmentosAlma).toBe(8);
    expect(b.character.batalhaSangrenta?.tentativas).toBe(1);
  });

  it('com subclasse, o chefe dá 1 fragmento da subclasse atual', async () => {
    await setup('b7', { subclasseAtualId: 'berserker' });
    const r = await executarBatalhaSangrenta('b7', { seed: 13, agora: HOJE });
    expect(r.chefeVencido).toBe(true);
    expect(r.fragmentosSubclasse).toBe(1);
    expect(r.character.fragmentosSubclasse?.berserker).toBe(1);
    const tx = await getTransactionsByUid('b7');
    expect(tx.some((t) => t.moeda === 'fragmentosSubclasse' && t.quantidade === 1)).toBe(true);
  });

  it('o combateId de outra provação não pode ser reaproveitado aqui', async () => {
    await setup('b8');
    const { executarCacada } = await import('@/server/characterService');
    await updateCharacter('b8', { nivel: 20 });
    await executarCacada('b8', 'rato-da-floresta', { seed: 1, combateId: 'combate-misturado-001' });
    await expect(executarBatalhaSangrenta('b8', { seed: 2, combateId: 'combate-misturado-001', agora: HOJE })).rejects.toThrow('fora da Batalha Sangrenta');
  });

  it('personagem inexistente', async () => {
    await expect(executarBatalhaSangrenta('ninguem', { seed: 1, agora: HOJE })).rejects.toThrow('Personagem não encontrado');
  });
});
