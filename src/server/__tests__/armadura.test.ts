import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter, fabricarArmadura, getCharacterByUid, reforjarArmadura, updateCharacter, usarOrbesArmadura } from '@/server/characterService';
import { getTransactionsByUid, resetCharacterStore, setTestPersistenceFailHook } from '@/test/repositorioMemoria';
import { custoDaReceita } from '@/game/forja';
import { PECAS_ARMADURA_MAP } from '@/rules/armadurasCatalogo';

/** Armaduras no servidor: fabricar, reforjar e usar orbes numa transação, sem gravar nada quando falha. */
describe('Armaduras (servidor)', () => {
  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    setTestPersistenceFailHook(null);
  });

  const PECA = 'lobo-cinzento-elmo';
  const custo = custoDaReceita(PECAS_ARMADURA_MAP[PECA].receita);

  async function setup(uid: string, extra: Record<string, unknown> = {}) {
    await createCharacter(uid, {
      nome: 'Armeiro_' + uid,
      racaId: 'elfo',
      classeId: 'cavaleiro',
      pontos: { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 },
    });
    await updateCharacter(uid, { ouro: 5000, inventario: { ...custo.itens }, ...extra });
  }

  it('fabrica a peça, tira materiais e ouro e registra a transação', async () => {
    await setup('a1');
    const r = await fabricarArmadura('a1', PECA, { aleatorio: () => 0.5 });
    expect(r.armadura).toMatchObject({ pecaId: PECA, atributo: 'vigor', pontos: 2, xp: 0 });
    const c = (await getCharacterByUid('a1'))!;
    expect(c.armaduras).toHaveLength(1);
    expect(c.ouro).toBe(5000 - custo.ouro);
    expect(c.inventario).toEqual({});
    expect(getTransactionsByUid('a1').some((t) => t.moeda === 'ouro' && t.quantidade === custo.ouro)).toBe(true);
  });

  it('bloqueio não grava nada', async () => {
    await setup('a2', { ouro: 0 });
    await expect(fabricarArmadura('a2', PECA)).rejects.toThrow('Ouro insuficiente');
    const c = (await getCharacterByUid('a2'))!;
    expect(c.armaduras).toEqual([]);
    expect(c.inventario).toEqual(custo.itens);
  });

  it('reforja e usa orbes', async () => {
    const meio = custoDaReceita(PECAS_ARMADURA_MAP[PECA].receita, 50).itens;
    const inv: Record<string, number> = { ...custo.itens, 'orbe-de-armadura': 3 };
    for (const [id, q] of Object.entries(meio)) inv[id] = (inv[id] ?? 0) + q;
    await setup('a3', { inventario: inv });
    const { armadura } = await fabricarArmadura('a3', PECA, { aleatorio: () => 0 });
    const r = await reforjarArmadura('a3', armadura.id, { aleatorio: () => 0.999 });
    expect(r.armadura).toMatchObject({ atributo: 'arcano', pontos: 3, reforjas: 1 });
    const o = await usarOrbesArmadura('a3', armadura.id, { 'orbe-de-armadura': 3 });
    expect([o.xpGanho, o.nivelDepois, o.armadura.xp]).toEqual([30, 1, 30]);
    expect(o.character.inventario).toEqual({});
    await expect(usarOrbesArmadura('a3', armadura.id, { 'orbe-de-armadura': 1 })).rejects.toThrow('Orbes de armadura insuficientes');
  });
});
