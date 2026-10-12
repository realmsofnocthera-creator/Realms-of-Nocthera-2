import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter, customizarArma, fabricarArma, getCharacterByUid, reforjarArma, updateCharacter } from '@/server/characterService';
import { getTransactionsByUid, resetCharacterStore, setTestPersistenceFailHook } from '@/test/repositorioMemoria';
import { BILHETE_DE_MELHORIA } from '@/game/forja';
import { ARMAS_BASE } from '@/rules/armasCatalogo';

/** Forja no servidor: tudo numa transação (inventário, armas e ouro), sem gravar nada quando falha. */
describe('Forja (servidor)', () => {
  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    setTestPersistenceFailHook(null);
  });

  const MATERIAIS_FERRO = { 'pelo-de-rato': 6, 'mundo-osso-bruto': 2, 'mundo-minerio-de-ferro-bruto': 2, 'mundo-fibra-silvestre': 1 };

  async function setup(uid: string, extra: Record<string, unknown> = {}) {
    await createCharacter(uid, {
      nome: 'Ferreiro_' + uid,
      racaId: 'elfo',
      classeId: 'cavaleiro',
      pontos: { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 },
    });
    await updateCharacter(uid, { ouro: 1000, inventario: { ...MATERIAIS_FERRO }, ...extra });
  }

  it('fabrica: grava a arma, tira materiais e ouro e registra a transação', async () => {
    await setup('f1');
    const r = await fabricarArma('f1', { baseId: 'ferro-de-cacada', categoria: 'lanca' }, { aleatorio: () => 0.5 });
    expect(r.arma).toMatchObject({ baseId: 'ferro-de-cacada', categoria: 'lanca', pontos: 5, reforjas: 0 });
    const c = (await getCharacterByUid('f1'))!;
    expect(c.armas).toHaveLength(1);
    expect(c.armas![0].id).toBe(r.arma.id);
    expect(c.ouro).toBe(900);
    expect(c.inventario).toEqual({});
    expect(getTransactionsByUid('f1').some((t) => t.moeda === 'ouro' && t.tipo === 'perda' && t.quantidade === 100)).toBe(true);
  });

  it('bloqueio não grava nada', async () => {
    await setup('f2', { ouro: 50 });
    await expect(fabricarArma('f2', { baseId: 'ferro-de-cacada', categoria: 'lanca' })).rejects.toThrow('Ouro insuficiente');
    const c = (await getCharacterByUid('f2'))!;
    expect(c.armas).toEqual([]);
    expect(c.inventario).toEqual(MATERIAIS_FERRO);
    expect(c.ouro).toBe(50);
  });

  it('reforja: sorteia os pontos de novo pagando 50% da receita', async () => {
    await setup('f3', { inventario: { 'pelo-de-rato': 9, 'mundo-osso-bruto': 3, 'mundo-minerio-de-ferro-bruto': 3, 'mundo-fibra-silvestre': 2 } });
    const { arma } = await fabricarArma('f3', { baseId: 'ferro-de-cacada', categoria: 'cajado' }, { aleatorio: () => 0 });
    const r = await reforjarArma('f3', arma.id, { aleatorio: () => 0.999 });
    expect(r.arma).toMatchObject({ id: arma.id, atributo: arma.atributo, pontos: 9, reforjas: 1 });
    expect(r.character.ouro).toBe(1000 - 100 - 50);
    expect(r.character.inventario).toEqual({});
  });

  it('customiza uma Mítica com ouro e Bilhete de melhoria', async () => {
    const mitica = ARMAS_BASE.find((a) => a.raridade === 'mitico')!;
    await setup('f4', {
      ouro: 20000,
      inventario: { [BILHETE_DE_MELHORIA.id]: 1 },
      armas: [{ id: 'm1', baseId: mitica.id, categoria: 'katana', atributo: 'vigor', pontos: 120, reforjas: 0, criadaEm: '' }],
    });
    const r = await customizarArma('f4', 'm1', 'atributo');
    expect(r.arma.customizacao).toEqual({ atributo: 1 });
    expect(r.character.ouro).toBe(0);
    expect(r.character.inventario).toEqual({});
    await expect(customizarArma('f4', 'm1', 'atributo')).rejects.toThrow('Bilhete de melhoria insuficiente');
  });
});
