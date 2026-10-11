import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ascenderHabilidade,
  createCharacter,
  getCharacterByUid,
  getPublicCharacterByName,
  reforcarHabilidade,
  updateCharacter,
} from '@/server/characterService';
import { getTransactionsByUid, resetCharacterStore, setTestPersistenceFailHook } from '@/test/repositorioMemoria';

/** 2.2.1 e 2.2.2 — Reforço e Ascensão de Habilidade no servidor. */
describe('Reforço e Ascensão de Habilidade (servidor)', () => {
  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    setTestPersistenceFailHook(null);
    vi.restoreAllMocks();
  });

  async function setup(uid: string, overrides: Record<string, unknown> = {}) {
    await createCharacter(uid, {
      nome: 'Heroi_' + uid,
      racaId: 'humano',
      classeId: 'barbaro',
      pontos: { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 },
    });
    if (Object.keys(overrides).length > 0) await updateCharacter(uid, overrides);
    return (await getCharacterByUid(uid))!;
  }

  it('personagem novo começa com tudo zerado', async () => {
    const c = await setup('r0');
    expect(c.reforcoHabilidade).toBe(0);
    expect(c.ascensaoHabilidade).toBe(0);
    expect(c.essenciaHabilidade).toBe(0);
    expect(c.fragmentosAscensao).toBe(0);
  });

  it('Reforço: cobra a essência do nível, sobe 1 e grava a transação', async () => {
    await setup('r1', { essenciaHabilidade: 250 });
    const c1 = await reforcarHabilidade('r1');
    expect(c1.reforcoHabilidade).toBe(1);
    expect(c1.essenciaHabilidade).toBe(150);
    const c2 = await reforcarHabilidade('r1');
    expect(c2.reforcoHabilidade).toBe(2);
    expect(c2.essenciaHabilidade).toBe(30);
    await expect(reforcarHabilidade('r1')).rejects.toThrow('Essência de habilidade insuficiente');
    const tx = getTransactionsByUid('r1').filter((t) => t.moeda === 'essenciaHabilidade');
    expect(tx.map((t) => t.quantidade)).toEqual([100, 120]);
  });

  it('Reforço: no nível 30 não sobe mais', async () => {
    await setup('r2', { reforcoHabilidade: 30, essenciaHabilidade: 50_000 });
    await expect(reforcarHabilidade('r2')).rejects.toThrow('Reforço no nível máximo');
  });

  it('Reforço soma nos atributos efetivos (derivados e perfil), sem mudar os atributos gravados', async () => {
    const base = await setup('r3');
    await updateCharacter('r3', { reforcoHabilidade: 30 });
    const com = (await getCharacterByUid('r3'))!;
    expect(com.atributos).toEqual(base.atributos);
    expect(com.bonusReforco?.vigor).toBe(Math.floor(base.atributos.vigor * 1.25) - base.atributos.vigor);
    expect(com.hpMax).toBeGreaterThanOrEqual(base.hpMax);
    const perfil = await getPublicCharacterByName(com.nome);
    expect(perfil?.atributosFinais.vigor).toBe(Math.floor(base.atributos.vigor * 1.25));
  });

  it('Ascensão: bloqueada antes do Reforço 30; depois cobra 1 fragmento por passo até o A10', async () => {
    await setup('a1', { reforcoHabilidade: 29, fragmentosAscensao: 20 });
    await expect(ascenderHabilidade('a1')).rejects.toThrow('Ascensão bloqueada');
    await updateCharacter('a1', { reforcoHabilidade: 30 });
    let c = await ascenderHabilidade('a1');
    expect(c.ascensaoHabilidade).toBe(1);
    expect(c.fragmentosAscensao).toBe(19);
    for (let i = 2; i <= 10; i++) c = await ascenderHabilidade('a1');
    expect(c.ascensaoHabilidade).toBe(10);
    expect(c.fragmentosAscensao).toBe(10);
    await expect(ascenderHabilidade('a1')).rejects.toThrow('Ascensão no nível máximo');
    const tx = getTransactionsByUid('a1').filter((t) => t.moeda === 'fragmentosAscensao');
    expect(tx).toHaveLength(10);
    expect(tx[0].motivo).toBe('Ascensão A1: Ataque Básico nível 2');
  });

  it('Ascensão sem fragmentos: nada muda', async () => {
    await setup('a2', { reforcoHabilidade: 30 });
    await expect(ascenderHabilidade('a2')).rejects.toThrow('Fragmentos de ascensão insuficientes');
    expect((await getCharacterByUid('a2'))!.ascensaoHabilidade).toBe(0);
  });
});
