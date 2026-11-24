import { beforeEach, describe, expect, it } from 'vitest';
import { createCharacter, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { ErroDoVip, resgatarRecompensasDoVip } from '@/server/vip';
import { molduraDoPersonagem } from '@/rules/molduras';
import { resetCharacterStore } from '@/test/repositorioMemoria';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };

describe('baú do VIP (servidor)', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    await createCharacter('v1', { nome: 'Vip_Um', racaId: 'humano', classeId: 'barbaro', pontos: PONTOS });
  });
  it('quem tem o nível resgata os títulos e as molduras dele; as artes que esperam o inventário ficam para depois', async () => {
    await updateCharacter('v1', { gastoReal: 300_000 }); // VIP 10
    const r = await resgatarRecompensasDoVip('v1');
    expect(r.resgatados.sort()).toEqual(['vip-10-moldura', 'vip-10-titulo', 'vip-1-moldura', 'vip-2-titulo', 'vip-3-moldura', 'vip-5-moldura', 'vip-8-moldura', 'vip-9-titulo'].sort());
    const c = (await getCharacterByUid('v1'))!;
    expect(c.titulos).toEqual(expect.arrayContaining(['vip-adepto', 'vip-especial', 'vip-transcendente']));
    // as molduras abrem pelo id da recompensa resgatada
    expect(molduraDoPersonagem(c).filter((m) => m.grupo === 'vip').map((m) => m.id).sort()).toEqual(['vip-1', 'vip-10', 'vip-3', 'vip-5', 'vip-8']);
    // resgatar de novo: nada pronto (skins, aura, emblema, decoração e efeitos ainda não)
    await expect(resgatarRecompensasDoVip('v1')).rejects.toBeInstanceOf(ErroDoVip);
    expect((await getCharacterByUid('v1'))!.titulos!.filter((t) => t === 'vip-adepto')).toHaveLength(1);
  });

  it('no VIP 2 só vêm as do 1 e do 2; sem nível, nada (400) e nada é gravado', async () => {
    await updateCharacter('v1', { gastoReal: 3_000 });
    expect((await resgatarRecompensasDoVip('v1')).resgatados.sort()).toEqual(['vip-1-moldura', 'vip-2-titulo']);
    await updateCharacter('v1', { gastoReal: 0, vipResgatados: undefined, titulos: [] });
    await expect(resgatarRecompensasDoVip('v1')).rejects.toBeInstanceOf(ErroDoVip);
    expect((await getCharacterByUid('v1'))!.vipResgatados).toBeUndefined();
  });
});
