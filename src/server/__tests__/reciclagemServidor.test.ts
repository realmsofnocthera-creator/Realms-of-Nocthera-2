import { beforeEach, describe, expect, it } from 'vitest';
import { createCharacter, getCharacterByUid, reciclarArma, reciclarArmadura, updateCharacter } from '@/server/characterService';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { devolucaoDaReceita } from '@/game/reciclagem';
import { ARMAS_BASE_MAP } from '@/rules/armasCatalogo';
import { PECAS_ARMADURA } from '@/rules/armadurasCatalogo';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
const erro = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e as Error);
const BASE = 'ferro-de-cacada';
const arma = (id: string) => ({ id, baseId: BASE, categoria: 'katana' as const, atributo: 'vigor' as const, pontos: 3, reforjas: 0, criadaEm: '' });

describe('Reciclar: servidor', () => {
  beforeEach(async () => {
    resetCharacterStore();
    await createCharacter('u1', { nome: 'Forjador', racaId: 'humano', classeId: 'cavaleiro', pontos: PONTOS } as never);
  });

  it('recicla a arma: ela some, 30% dos materiais voltam e o ouro não muda', async () => {
    await updateCharacter('u1', { armas: [arma('a1'), arma('a2')], inventario: { 'pelo-de-rato': 1 }, ouro: 777 });
    const r = await reciclarArma('u1', 'a1');
    const depois = (await getCharacterByUid('u1'))!;
    expect(depois.armas?.map((a) => a.id)).toEqual(['a2']);
    const esperado = devolucaoDaReceita(ARMAS_BASE_MAP[BASE].receita);
    expect(r.devolvido).toEqual(esperado);
    for (const [id, q] of Object.entries(esperado)) expect(depois.inventario?.[id]).toBe(q + (id === 'pelo-de-rato' ? 1 : 0));
    expect(depois.ouro).toBe(777);
    // reciclar duas vezes a mesma arma não devolve de novo
    expect((await erro(reciclarArma('u1', 'a1')))?.message).toMatch(/não encontrado/i);
  });

  it('arma equipada não recicla, e o servidor confere mesmo que a tela mande', async () => {
    await updateCharacter('u1', { armas: [arma('a1')], equipamento: { armaId: 'a1', armadura: {} } });
    expect((await erro(reciclarArma('u1', 'a1')))?.message).toMatch(/Desequipe/);
    expect((await getCharacterByUid('u1'))!.armas).toHaveLength(1);
  });

  it('recicla a peça de armadura (e a equipada é recusada)', async () => {
    const p = PECAS_ARMADURA[0];
    const peca = (id: string) => ({ id, pecaId: p.id, atributo: 'vigor' as const, pontos: 3, reforjas: 0, xp: 0, criadaEm: '' });
    await updateCharacter('u1', { armaduras: [peca('p1'), peca('p2')], equipamento: { armaId: null, armadura: { [p.espaco]: 'p2' } as never } });
    expect((await erro(reciclarArmadura('u1', 'p2')))?.message).toMatch(/Desequipe/);
    const r = await reciclarArmadura('u1', 'p1');
    expect(r.nome).toBe(p.nome);
    const depois = (await getCharacterByUid('u1'))!;
    expect(depois.armaduras?.map((a) => a.id)).toEqual(['p2']);
    for (const [id, q] of Object.entries(r.devolvido)) expect(depois.inventario?.[id]).toBe(q);
  });
});
