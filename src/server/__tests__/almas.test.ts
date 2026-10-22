import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as almaRota } from '@/app/api/almas/route';
import { limparCacheRevogacao } from '@/server/auth';
import { agirNaAlma, entregarCartas, ErroDeAlma, sortearTipoDaRaridade, sorteadorDaSemente } from '@/server/almas';
import { combatenteDoPersonagem, createCharacter, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { tiposDaRaridadeDeCarta, TIPOS_DE_CARTA, type CartaItem } from '@/rules/almas';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
const req = (uid: string, corpo: unknown) => new NextRequest('http://t/api/almas', { method: 'POST', headers: { authorization: `Bearer ${tokenDeTeste(uid)}`, 'content-type': 'application/json' }, body: JSON.stringify(corpo) });
const erro = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e as ErroDeAlma);
const hpComum = tiposDaRaridadeDeCarta('comum').find((t) => t.fixo === 'hp')!.id;

async function darCartas(uid: string, tipos: string[], semente = 1) {
  const c = (await getCharacterByUid(uid))!;
  const r = entregarCartas(c, tipos, semente);
  await updateCharacter(uid, r.patch);
  return r.criadas;
}

describe('Alma (7.8): servidor', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    limparCacheRevogacao();
    await createCharacter('u1', { nome: 'Aragorn', racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
    await updateCharacter('u1', { nivel: 25 });
  });

  it('entregar cartas cria os efeitos aleatórios, marca como descoberta e é determinístico pela semente', async () => {
    const criadas = await darCartas('u1', [hpComum, tiposDaRaridadeDeCarta('mitico')[0].id], 7);
    expect(criadas.map((c) => [c.raridade, c.nova])).toEqual([['comum', true], ['mitico', true]]);
    const c = (await getCharacterByUid('u1'))!;
    expect(c.cartasItens).toHaveLength(2);
    expect(c.cartasItens![0].efeitos).toHaveLength(1);
    expect(c.cartasItens![1].efeitos).toHaveLength(3);
    expect(c.cartasDescobertas).toEqual([hpComum, tiposDaRaridadeDeCarta('mitico')[0].id]);
    const a = entregarCartas(c, [hpComum], 42).patch.cartasItens!.at(-1)!.efeitos;
    const b = entregarCartas(c, [hpComum], 42).patch.cartasItens!.at(-1)!.efeitos;
    expect(a).toEqual(b);
    expect((await darCartas('u1', [hpComum], 9))[0].nova).toBe(false);
  });

  it('só do nível 25 em diante', async () => {
    await updateCharacter('u1', { nivel: 24 });
    expect((await erro(agirNaAlma('u1', 'equipar', { id: 'x' })))?.message).toMatch(/nível 25/);
  });

  it('equipar e desequipar; o bônus de HP das cartas entra no personagem', async () => {
    await darCartas('u1', [hpComum]);
    const id = (await getCharacterByUid('u1'))!.cartasItens![0].id;
    const antes = (await getCharacterByUid('u1'))!.hpMax;
    const r = await agirNaAlma('u1', 'equipar', { id });
    expect(r.character.cartasEquipadas).toEqual([id]);
    expect(r.character.hpMax).toBeGreaterThan(antes);
    expect(combatenteDoPersonagem(r.character).hpMax).toBe(r.character.hpMax);
    const d = await agirNaAlma('u1', 'desequipar', { id });
    expect(d.character.cartasEquipadas).toEqual([]);
    expect(d.character.hpMax).toBe(antes);
    expect((await erro(agirNaAlma('u1', 'equipar', { id: 'nada' })))?.message).toBe('Carta não encontrada.');
  });

  it('destruir dá cacos e refinar gasta cacos para sortear de novo um efeito', async () => {
    await darCartas('u1', [hpComum, hpComum, tiposDaRaridadeDeCarta('raro')[0].id]);
    const [a, b, c] = (await getCharacterByUid('u1'))!.cartasItens! as CartaItem[];
    const d = await agirNaAlma('u1', 'destruir', { ids: [a.id, b.id] });
    expect(d.character.cacosDeAlma).toBe(6);
    expect(d.character.cartasItens!.map((i) => i.id)).toEqual([c.id]);
    expect((await erro(agirNaAlma('u1', 'refinar', { id: c.id, indice: 0 })))?.message).toMatch(/Cacos de alma insuficientes/);
    await updateCharacter('u1', { cacosDeAlma: 25 });
    const r = await agirNaAlma('u1', 'refinar', { id: c.id, indice: 0 });
    expect(r.character.cacosDeAlma).toBe(15);
    expect(r.character.cartasItens![0].efeitos).toHaveLength(1);
  });

  it('despertar gasta poeira e cópias', async () => {
    const lend = tiposDaRaridadeDeCarta('lendario')[0].id;
    await darCartas('u1', [lend, lend, lend]);
    const ids = (await getCharacterByUid('u1'))!.cartasItens!.map((i) => i.id);
    expect((await erro(agirNaAlma('u1', 'despertar', { id: ids[0] })))?.message).toMatch(/Poeira/);
    await updateCharacter('u1', { poeiraDeAlma: 60 });
    const r = await agirNaAlma('u1', 'despertar', { id: ids[0] });
    expect(r.character.poeiraDeAlma).toBe(40);
    expect(r.character.cartasItens).toHaveLength(1);
    expect(r.character.cartasItens![0]).toMatchObject({ id: ids[0], despertar: 1 });
  });

  it('o bônus de coleção vale mesmo depois de destruir as cartas', async () => {
    const GRANDE = { vigor: 1000, sorte: 0, forca: 100, vitalidade: 100, arcano: 0, inteligencia: 0, agilidade: 10 };
    await updateCharacter('u1', { atributos: GRANDE });
    await createCharacter('u2', { nome: 'Boromir', racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
    await updateCharacter('u2', { nivel: 25, atributos: GRANDE });
    const semColecao = (await getCharacterByUid('u2'))!.hpMax;
    await darCartas('u1', tiposDaRaridadeDeCarta('comum').map((t) => t.id));
    const ids = (await getCharacterByUid('u1'))!.cartasItens!.map((i) => i.id);
    const r = await agirNaAlma('u1', 'destruir', { ids });
    expect(r.character.cartasItens).toEqual([]);
    expect(r.character.cartasDescobertas).toHaveLength(9);
    // conjunto Comum completo: +1% de HP
    expect(r.character.hpMax).toBeGreaterThan(semColecao);
    expect(r.character.hpMax).toBe(Math.floor((semColecao * 101) / 100));
  });

  it('sorteios: a raridade do tipo sorteado é a pedida', () => {
    const s = sorteadorDaSemente(5);
    for (const r of ['comum', 'epico', 'mitico'] as const) expect(sortearTipoDaRaridade(r, s).includes(r)).toBe(true);
    expect(TIPOS_DE_CARTA).toHaveLength(54);
  });

  it('rota: 401 sem login, 400 em ação inválida, 200 com o personagem', async () => {
    expect((await almaRota(new NextRequest('http://t/api/almas', { method: 'POST', body: '{}' }))).status).toBe(401);
    expect((await almaRota(req('u1', { acao: 'voar' }))).status).toBe(400);
    await darCartas('u1', [hpComum]);
    const id = (await getCharacterByUid('u1'))!.cartasItens![0].id;
    const res = await almaRota(req('u1', { acao: 'equipar', id }));
    expect(res.status).toBe(200);
    expect((await res.json()).character.cartasEquipadas).toEqual([id]);
    expect((await almaRota(req('u1', { acao: 'equipar', id }))).status).toBe(400);
  });
});
