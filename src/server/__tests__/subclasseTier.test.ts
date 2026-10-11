import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createCharacter,
  getCharacterByUid,
  updateCharacter,
  escolherSubclasse,
  resetarSubclasse,
  subirTierSubclasse,
} from '@/server/characterService';
import { getTransactionsByUid, resetCharacterStore, setTestPersistenceFailHook } from '@/test/repositorioMemoria';
import { custoDoTier } from '@/rules/subclasseTiers';

/** 2.1.4 — Subir o tier da subclasse (servidor): custos definidos pelo Yuri em 10/10/2026. */

describe('2.1.4 — Subir o tier da subclasse (servidor)', () => {
  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    setTestPersistenceFailHook(null);
    vi.restoreAllMocks();
  });

  async function setup(uid: string, overrides: Record<string, unknown> = {}) {
    await createCharacter(uid, {
      nome: 'Mago_' + uid,
      racaId: 'humano',
      classeId: 'feiticeiro',
      pontos: { vigor: 0, sorte: 0, forca: 0, vitalidade: 0, arcano: 5, inteligencia: 5, agilidade: 0 },
    });
    const { subclasseTiers, ...resto } = overrides;
    await updateCharacter(uid, { nivel: 20, ouro: 200_000, fragmentosAlma: 300, diamantes: 200, ...resto });
    await escolherSubclasse(uid, 'arquimago'); // paga o tier 0 (10.000 de ouro e 30 fragmentos)
    if (subclasseTiers) await updateCharacter(uid, { subclasseTiers: subclasseTiers as Record<string, number> });
    return (await getCharacterByUid(uid))!;
  }

  it('(a) tier 1: cobra 15 fragmentos de alma e 15.000 de ouro, grava o tier e as transações', async () => {
    const antes = await setup('t_a');
    const depois = await subirTierSubclasse('t_a', 'arquimago');

    expect(depois.subclasseTiers?.arquimago).toBe(1);
    expect(depois.ouro).toBe(antes.ouro - 15_000);
    expect(depois.fragmentosAlma).toBe(antes.fragmentosAlma! - 15);

    const txs = getTransactionsByUid('t_a').filter((t) => t.motivo === 'Tier 1 da subclasse Arquimago');
    expect(txs.map((t) => [t.moeda, t.tipo, t.quantidade]).sort()).toEqual([
      ['fragmentosAlma', 'perda', 15],
      ['ouro', 'perda', 15_000],
    ]);
  });

  it('(b) tiers 1, 2 e 3 em sequência: cada um cobra o seu custo', async () => {
    const inicial = await setup('t_b');
    const c3 = (await subirTierSubclasse('t_b', 'arquimago'), await subirTierSubclasse('t_b', 'arquimago'), await subirTierSubclasse('t_b', 'arquimago'));
    expect(c3.subclasseTiers?.arquimago).toBe(3);
    expect(c3.ouro).toBe(inicial.ouro - (15_000 + 20_000 + 25_000));
    expect(c3.fragmentosAlma).toBe(inicial.fragmentosAlma! - (15 + 25 + 40));
  });

  it('(c) tier 4: exige 5 fragmentos da própria subclasse; sem eles nada é cobrado', async () => {
    await setup('t_c', { subclasseTiers: { arquimago: 3 } });
    // o setup grava o tier 3 direto, depois de escolher a subclasse
    const antes = (await getCharacterByUid('t_c'))!;
    expect(antes.subclasseTiers?.arquimago).toBe(3);

    await expect(subirTierSubclasse('t_c', 'arquimago')).rejects.toThrow('Fragmentos de subclasse insuficientes');
    const semMudanca = (await getCharacterByUid('t_c'))!;
    expect(semMudanca.ouro).toBe(antes.ouro);
    expect(semMudanca.fragmentosAlma).toBe(antes.fragmentosAlma);
    expect(semMudanca.subclasseTiers?.arquimago).toBe(3);
    expect(getTransactionsByUid('t_c').some((t) => t.motivo === 'Tier 4 da subclasse Arquimago')).toBe(false);

    // Com os fragmentos da subclasse (4 não bastam)
    await updateCharacter('t_c', { fragmentosSubclasse: { arquimago: 4 } });
    await expect(subirTierSubclasse('t_c', 'arquimago')).rejects.toThrow('Fragmentos de subclasse insuficientes');

    await updateCharacter('t_c', { fragmentosSubclasse: { arquimago: 7 } });
    const depois = await subirTierSubclasse('t_c', 'arquimago');
    expect(depois.subclasseTiers?.arquimago).toBe(4);
    expect(depois.ouro).toBe(antes.ouro - 40_000);
    expect(depois.fragmentosAlma).toBe(antes.fragmentosAlma! - 60);
    expect(depois.fragmentosSubclasse?.arquimago).toBe(2);
    const tx = getTransactionsByUid('t_c').find((t) => t.moeda === 'fragmentosSubclasse');
    expect(tx).toMatchObject({ tipo: 'perda', quantidade: 5, motivo: 'Tier 4 da subclasse Arquimago' });
  });

  it('(d) tier máximo, outra subclasse (não é a do personagem), de outra classe ou inexistente: erro e nada cobrado', async () => {
    await setup('t_d', { subclasseTiers: { arquimago: 4 } });
    const antes = (await getCharacterByUid('t_d'))!;

    await expect(subirTierSubclasse('t_d', 'arquimago')).rejects.toThrow('Tier máximo atingido');
    await expect(subirTierSubclasse('t_d', 'sabio_arcano')).rejects.toThrow('Subclasse não desbloqueada');
    await expect(subirTierSubclasse('t_d', 'berserker')).rejects.toThrow('Subclasse inválida');
    await expect(subirTierSubclasse('t_d', 'nao_existe')).rejects.toThrow('Subclasse inválida');
    await expect(subirTierSubclasse('t_d', 42)).rejects.toThrow('Subclasse inválida');

    const depois = (await getCharacterByUid('t_d'))!;
    expect(depois.ouro).toBe(antes.ouro);
    expect(depois.fragmentosAlma).toBe(antes.fragmentosAlma);
  });

  it('(e) ouro ou fragmentos de alma insuficientes: erro e nada cobrado', async () => {
    await setup('t_e');
    const base = (await getCharacterByUid('t_e'))!;

    await updateCharacter('t_e', { ouro: custoDoTier(1).ouro - 1 });
    await expect(subirTierSubclasse('t_e', 'arquimago')).rejects.toThrow('Ouro insuficiente');

    await updateCharacter('t_e', { ouro: base.ouro, fragmentosAlma: custoDoTier(1).fragmentosAlma - 1 });
    await expect(subirTierSubclasse('t_e', 'arquimago')).rejects.toThrow('Fragmentos de alma insuficientes');

    const depois = (await getCharacterByUid('t_e'))!;
    expect(depois.ouro).toBe(base.ouro);
    expect(depois.fragmentosAlma).toBe(custoDoTier(1).fragmentosAlma - 1);
    expect(depois.subclasseTiers?.arquimago).toBe(0);
  });

  it('(f) só a subclasse do personagem sobe de tier; depois do reset os tiers voltam a zero e tudo é pago de novo', async () => {
    await setup('t_f', { subclasseTiers: { arquimago: 2 } });
    await expect(subirTierSubclasse('t_f', 'sabio_arcano')).rejects.toThrow('Subclasse não desbloqueada');

    await resetarSubclasse('t_f');
    const reset = (await getCharacterByUid('t_f'))!;
    expect(reset.subclasseAtualId).toBeNull();
    expect(reset.subclasseTiers).toEqual({});
    // sem subclasse não há tier para subir
    await expect(subirTierSubclasse('t_f', 'arquimago')).rejects.toThrow('Subclasse não desbloqueada');

    // volta a escolher: tier 0 de novo, e o tier 1 de novo
    await escolherSubclasse('t_f', 'arquimago');
    const c = await subirTierSubclasse('t_f', 'arquimago');
    expect(c.subclasseTiers).toEqual({ arquimago: 1 });
  });

  it('(g) 0.5-C2: se o commit falhar, ouro, fragmentos e tier ficam intactos', async () => {
    await setup('t_g', { subclasseTiers: { arquimago: 3 }, fragmentosSubclasse: { arquimago: 9 } });
    const antes = (await getCharacterByUid('t_g'))!;
    const txAntes = getTransactionsByUid('t_g').length;

    setTestPersistenceFailHook((operacao) => {
      if (operacao === 'subirTierSubclasse') throw new Error('Falha simulada ao subir o tier');
    });
    await expect(subirTierSubclasse('t_g', 'arquimago')).rejects.toThrow('Falha simulada ao subir o tier');
    setTestPersistenceFailHook(null);

    const depois = (await getCharacterByUid('t_g'))!;
    expect(depois.ouro).toBe(antes.ouro);
    expect(depois.fragmentosAlma).toBe(antes.fragmentosAlma);
    expect(depois.fragmentosSubclasse?.arquimago).toBe(9);
    expect(depois.subclasseTiers?.arquimago).toBe(3);
    expect(getTransactionsByUid('t_g').length).toBe(txAntes);
  });

  it('(h) o reset mantém os fragmentos da própria subclasse', async () => {
    await setup('t_h', { subclasseTiers: { arquimago: 3 }, fragmentosSubclasse: { arquimago: 4 } });
    const depois = await resetarSubclasse('t_h');
    expect(depois.fragmentosSubclasse?.arquimago).toBe(4);
  });
});
