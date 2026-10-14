import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCharacter,
  definirEquipamentosDoPerfil,
  equiparArmaDoPersonagem,
  equiparArmaduraDoPersonagem,
  desequiparArmaDoPersonagem,
  getCharacterByUid,
  getPublicCharacterByName,
  updateCharacter,
} from '@/server/characterService';
import { resetCharacterStore, setTestPersistenceFailHook } from '@/test/repositorioMemoria';
import type { ArmaPersonagem } from '@/game/forja';
import type { ArmaduraPersonagem } from '@/game/armaduraForja';

/** Equipamentos principais do perfil público: o jogador escolhe até 4 itens equipados para mostrar. */
describe('Perfil público: equipamentos principais (servidor)', () => {
  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    setTestPersistenceFailHook(null);
  });

  const ARMA: ArmaPersonagem = { id: 'w1', baseId: 'lamina-da-geada', categoria: 'espadaGrande', atributo: 'sorte', pontos: 12, reforjas: 0, criadaEm: '' };
  const OUTRA: ArmaPersonagem = { id: 'w2', baseId: 'ferro-de-cacada', categoria: 'katana', atributo: 'vigor', pontos: 3, reforjas: 0, criadaEm: '' };
  const ELMO: ArmaduraPersonagem = { id: 'p1', pecaId: 'lobo-cinzento-elmo', atributo: 'arcano', pontos: 3, reforjas: 0, xp: 0, criadaEm: '' };
  const PEITORAL: ArmaduraPersonagem = { id: 'p2', pecaId: 'lobo-cinzento-peitoral', atributo: 'vigor', pontos: 2, reforjas: 0, xp: 0, criadaEm: '' };

  async function setup(uid: string) {
    await createCharacter(uid, {
      nome: 'Vitrine_' + uid,
      racaId: 'elfo',
      classeId: 'cavaleiro',
      pontos: { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 },
    });
    await updateCharacter(uid, { nivel: 2, armas: [ARMA, OUTRA], armaduras: [ELMO, PEITORAL] });
    await equiparArmaDoPersonagem(uid, 'w1');
    await equiparArmaduraDoPersonagem(uid, 'p1');
    await equiparArmaduraDoPersonagem(uid, 'p2');
  }

  const publico = async (uid: string) => (await getPublicCharacterByName('Vitrine_' + uid))!;

  it('sem escolha, o perfil público mostra a seleção automática do que está equipado', async () => {
    await setup('v1');
    const p = await publico('v1');
    const ids = p.equipamentosPrincipais.map((i) => i.id);
    expect(ids[0]).toBe('w1'); // a arma primeiro
    expect([...ids].sort()).toEqual(['p1', 'p2', 'w1']);
    expect(p.equipamentosPrincipais[0]).toMatchObject({ slot: 'arma', nome: 'Lâmina da Geada' });
  });

  it('grava a escolha e o perfil público passa a mostrar só os itens escolhidos, na ordem', async () => {
    await setup('v2');
    const c = await definirEquipamentosDoPerfil('v2', ['p2', 'w1']);
    expect(c.perfilEquipamentos).toEqual(['p2', 'w1']);
    expect((await getCharacterByUid('v2'))?.perfilEquipamentos).toEqual(['p2', 'w1']);
    expect((await publico('v2')).equipamentosPrincipais.map((i) => i.id)).toEqual(['p2', 'w1']);
  });

  it('deixar todos os espaços vazios é uma escolha válida e fica gravada', async () => {
    await setup('v3');
    await definirEquipamentosDoPerfil('v3', ['w1']);
    await definirEquipamentosDoPerfil('v3', []);
    expect((await getCharacterByUid('v3'))?.perfilEquipamentos).toEqual([]);
    expect((await publico('v3')).equipamentosPrincipais).toEqual([]);
  });

  it('recusa item que não está equipado, lista grande, repetidos e não-lista, sem gravar nada', async () => {
    await setup('v4');
    await expect(definirEquipamentosDoPerfil('v4', ['w2'])).rejects.toThrow(/equipados/);
    await expect(definirEquipamentosDoPerfil('v4', ['w1', 'w1'])).rejects.toThrow(/até 4/);
    await expect(definirEquipamentosDoPerfil('v4', 'w1')).rejects.toThrow(/até 4/);
    await expect(definirEquipamentosDoPerfil('v4', ['w1', 'p1', 'p2', 'x', 'y'])).rejects.toThrow(/até 4/);
    expect((await getCharacterByUid('v4'))?.perfilEquipamentos).toBeUndefined();
  });

  it('o item que o jogador desequipa some do perfil público', async () => {
    await setup('v5');
    await definirEquipamentosDoPerfil('v5', ['w1', 'p1']);
    await desequiparArmaDoPersonagem('v5');
    expect((await publico('v5')).equipamentosPrincipais.map((i) => i.id)).toEqual(['p1']);
  });

  it('o perfil público só traz o que o jogador escolheu mostrar: sem ids de itens que ele não escolheu nem dados privados', async () => {
    await setup('v6');
    await definirEquipamentosDoPerfil('v6', ['w1']);
    const p = await publico('v6');
    expect(p.equipamentosPrincipais).toHaveLength(1);
    expect(Object.keys(p.equipamentosPrincipais[0]).sort()).toEqual(['cor', 'curto', 'id', 'nome', 'raridadeNome', 'slot', 'slotNome']);
    const bruto = p as unknown as Record<string, unknown>;
    expect(bruto.ouro).toBeUndefined();
    expect(bruto.armas).toBeUndefined();
    expect(bruto.perfilEquipamentos).toBeUndefined();
  });
});
