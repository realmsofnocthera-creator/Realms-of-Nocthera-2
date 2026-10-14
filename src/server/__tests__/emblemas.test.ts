import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createCharacter,
  desequiparEmblemaDoPersonagem,
  equiparEmblemaDoPersonagem,
  executarCacada,
  fundirEmblemasDoPersonagem,
  getCharacterByUid,
  updateCharacter,
} from '@/server/characterService';
import { resetCharacterStore, setTestPersistenceFailHook } from '@/test/repositorioMemoria';

/** Emblemas no servidor: equipar, desequipar e fundir. */
describe('Emblemas (servidor)', () => {
  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    setTestPersistenceFailHook(null);
    vi.restoreAllMocks();
  });

  async function setup(uid: string, itens: { id: string; tipo: string; estrelas: number }[], equipados?: string[]) {
    await createCharacter(uid, {
      nome: 'Emblema_' + uid,
      racaId: 'elfo',
      classeId: 'cavaleiro',
      pontos: { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 },
    });
    await updateCharacter(uid, { emblemasItens: itens, ...(equipados ? { emblemasEquipados: equipados } : {}) });
  }

  it('equipa até 4 emblemas (podem ser do mesmo tipo) e recusa o quinto', async () => {
    await setup('e1', [1, 2, 3, 4, 5].map((n) => ({ id: `d${n}`, tipo: 'dargan', estrelas: 1 })));
    for (const id of ['d1', 'd2', 'd3', 'd4']) await equiparEmblemaDoPersonagem('e1', id);
    expect((await getCharacterByUid('e1'))!.emblemasEquipados).toEqual(['d1', 'd2', 'd3', 'd4']);
    await expect(equiparEmblemaDoPersonagem('e1', 'd5')).rejects.toThrow('4 espaços');
    await expect(equiparEmblemaDoPersonagem('e1', 'd1')).rejects.toThrow('já está equipado');
    await expect(equiparEmblemaDoPersonagem('e1', 'nao-tem')).rejects.toThrow('não encontrado');
  });

  it('desequipa e libera o espaço', async () => {
    await setup('e2', [{ id: 'a', tipo: 'vesper', estrelas: 1 }, { id: 'b', tipo: 'dargan', estrelas: 1 }], ['a']);
    await desequiparEmblemaDoPersonagem('e2', 'a');
    expect((await getCharacterByUid('e2'))!.emblemasEquipados ?? []).toEqual([]);
    await expect(desequiparEmblemaDoPersonagem('e2', 'a')).rejects.toThrow('não está equipado');
    await equiparEmblemaDoPersonagem('e2', 'b');
    expect((await getCharacterByUid('e2'))!.emblemasEquipados).toEqual(['b']);
  });

  it('funde 2 emblemas de 1★ em 1 de 2★ e 3 de 2★ em 1 de 3★ (um id novo, os usados somem)', async () => {
    await setup('e3', [{ id: 'a', tipo: 'dargan', estrelas: 1 }, { id: 'b', tipo: 'dargan', estrelas: 1 }, { id: 'c', tipo: 'dargan', estrelas: 1 }]);
    const r = await fundirEmblemasDoPersonagem('e3', 'dargan', 1);
    expect(r.criado).toMatchObject({ tipo: 'dargan', estrelas: 2 });
    const c = (await getCharacterByUid('e3'))!;
    expect(c.emblemasItens).toHaveLength(2);
    expect(c.emblemasItens!.map((i) => i.estrelas).sort()).toEqual([1, 2]);
    await expect(fundirEmblemasDoPersonagem('e3', 'dargan', 2)).rejects.toThrow('insuficientes');

    await setup('e4', ['a', 'b', 'c'].map((id) => ({ id, tipo: 'vesper', estrelas: 2 })));
    const tres = await fundirEmblemasDoPersonagem('e4', 'vesper', 2);
    expect(tres.criado!.estrelas).toBe(3);
    expect((await getCharacterByUid('e4'))!.emblemasItens).toHaveLength(1);
    await expect(fundirEmblemasDoPersonagem('e4', 'vesper', 3)).rejects.toThrow('estrela máxima');
  });

  it('os emblemas equipados não entram na fusão', async () => {
    await setup('e5', [{ id: 'a', tipo: 'dargan', estrelas: 1 }, { id: 'b', tipo: 'dargan', estrelas: 1 }], ['a']);
    await expect(fundirEmblemasDoPersonagem('e5', 'dargan', 1)).rejects.toThrow('insuficientes');
    await desequiparEmblemaDoPersonagem('e5', 'a');
    await expect(fundirEmblemasDoPersonagem('e5', 'dargan', 1)).resolves.toBeDefined();
  });

  it('tipo ou estrela inválidos são recusados e nada muda', async () => {
    await setup('e6', [{ id: 'a', tipo: 'dargan', estrelas: 1 }]);
    await expect(fundirEmblemasDoPersonagem('e6', 'inventado', 1)).rejects.toThrow('Tipo de emblema inválido');
    await expect(fundirEmblemasDoPersonagem('e6', 'dargan', 'x')).rejects.toThrow('Estrela de emblema inválida');
    expect((await getCharacterByUid('e6'))!.emblemasItens).toHaveLength(1);
  });

  it('equipar emblemas muda os atributos efetivos e o HP; desequipar volta ao normal', async () => {
    await setup('e7', [{ id: 'a', tipo: 'odrak', estrelas: 3 }, { id: 'b', tipo: 'odrak', estrelas: 3 }]);
    const antes = (await getCharacterByUid('e7'))!;
    expect(antes.bonusEquipamento?.vigor ?? 0).toBe(0);
    await equiparEmblemaDoPersonagem('e7', 'a');
    await equiparEmblemaDoPersonagem('e7', 'b');
    const com = (await getCharacterByUid('e7'))!;
    // Odrak é Lendário: 6 pontos em Vigor, Vitalidade e Força por emblema na 3★
    expect(com.bonusEquipamento).toMatchObject({ vigor: 12, vitalidade: 12, forca: 12 });
    expect(com.hpMax).toBeGreaterThan(antes.hpMax);
    expect(com.sobreescudoMax).toBeGreaterThan(antes.sobreescudoMax);
    await desequiparEmblemaDoPersonagem('e7', 'a');
    await desequiparEmblemaDoPersonagem('e7', 'b');
    const depois = (await getCharacterByUid('e7'))!;
    expect(depois.hpMax).toBe(antes.hpMax);
    expect(depois.bonusEquipamento?.vigor ?? 0).toBe(0);
  });

  it('com emblemas de efeito fixo equipados o combate roda e o HP máximo sobe com o +12% do Odrak', async () => {
    await setup('e8', [{ id: 'o1', tipo: 'odrak', estrelas: 2 }, { id: 'l1', tipo: 'lautrec', estrelas: 1 }]);
    await updateCharacter('e8', { nivel: 2, atributos: { vigor: 400, sorte: 0, forca: 300, vitalidade: 100, arcano: 0, inteligencia: 0, agilidade: 50 } });
    const antes = (await getCharacterByUid('e8'))!;
    await equiparEmblemaDoPersonagem('e8', 'o1');
    await equiparEmblemaDoPersonagem('e8', 'l1');
    const com = (await getCharacterByUid('e8'))!;
    // Odrak 2★ (Lendário): +4 Vigor, Vitalidade e Força; Lautrec 1★ (Mítico): +3 Força, Vigor e Vitalidade; e o HP ainda sobe 12%
    const hpSoDosAtributos = Math.floor(antes.hpMax + (7 * antes.hpMax) / Math.max(1, antes.atributos.vigor));
    expect(com.hpMax).toBeGreaterThan(hpSoDosAtributos);
    const r = await executarCacada('e8', 'lobo-cinzento', { seed: 7, combateId: 'cacada-emblema-0001' });
    expect(['personagem', 'monstro']).toContain(r.resultado.vencedor);
    expect(r.resultado.logTurnos.length).toBeGreaterThan(0);
  });
});
