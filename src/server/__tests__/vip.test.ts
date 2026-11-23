import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createCharacter, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { ErroDoVip, resgatarRecompensasDoVip } from '@/server/vip';
import { RECOMPENSAS_DO_VIP, type RecompensaDoVip } from '@/rules/vipRecompensas';
import { TITULOS } from '@/rules/titulos';
import { resetCharacterStore } from '@/test/repositorioMemoria';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };

describe('baú do VIP (servidor)', () => {
  const tabela = RECOMPENSAS_DO_VIP as RecompensaDoVip[];
  const tamanho = tabela.length;
  const original = tabela.map((x) => ({ ...x }));
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    await createCharacter('v1', { nome: 'Vip_Um', racaId: 'humano', classeId: 'barbaro', pontos: PONTOS });
  });
  afterEach(() => {
    tabela.length = tamanho;
    tabela.forEach((x, i) => Object.assign(x, original[i]));
    for (const x of tabela) if (!original.find((o) => o.id === x.id)?.entrega) delete x.entrega;
  });

  it('sem nada pronto, recusa (400) e não grava', async () => {
    await updateCharacter('v1', { gastoReal: 300_000 });
    await expect(resgatarRecompensasDoVip('v1')).rejects.toBeInstanceOf(ErroDoVip);
    expect((await getCharacterByUid('v1'))!.vipResgatados).toBeUndefined();
  });

  it('com a recompensa pronta, entrega o título uma vez só e marca como resgatada', async () => {
    const x = tabela.find((r) => r.id === 'vip-2-titulo')!;
    x.entrega = { titulo: TITULOS[0].id };
    await updateCharacter('v1', { gastoReal: 3_000 });
    const r = await resgatarRecompensasDoVip('v1');
    expect(r.resgatados).toEqual(['vip-2-titulo']);
    const c = (await getCharacterByUid('v1'))!;
    expect(c.titulos).toContain(TITULOS[0].id);
    expect(c.vipResgatados).toEqual(['vip-2-titulo']);
    await expect(resgatarRecompensasDoVip('v1')).rejects.toBeInstanceOf(ErroDoVip);
    expect((await getCharacterByUid('v1'))!.titulos!.filter((t) => t === TITULOS[0].id)).toHaveLength(1);
  });

  it('quem ainda não chegou no nível não resgata a recompensa dele', async () => {
    tabela.find((r) => r.id === 'vip-2-titulo')!.entrega = { titulo: TITULOS[0].id };
    await updateCharacter('v1', { gastoReal: 1_000 });
    await expect(resgatarRecompensasDoVip('v1')).rejects.toBeInstanceOf(ErroDoVip);
  });
});
