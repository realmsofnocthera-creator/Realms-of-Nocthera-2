import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as testeGet, POST as testePost } from '@/app/api/teste-equipe/route';
import { limparCacheRevogacao } from '@/server/auth';
import { createCharacter, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { agirNaGuilda, ErroDeGuilda, limparCacheDasGuildas } from '@/server/guildas';
import { agirNoTeste, estadoDoTeste, iniciarTeste } from '@/server/testeEquipe';
import { limparCacheDeSistemas } from '@/server/sistemasLeitura';
import { repositorio } from '@/server/persistencia';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
const FORTE = { vigor: 900, sorte: 0, forca: 700, vitalidade: 300, arcano: 0, inteligencia: 0, agilidade: 150 };
const NOMES: Record<string, string> = { u1: 'Aragorn', u2: 'Boromir', u3: 'Celeborn', u4: 'Denethor' };
const erro = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e as ErroDeGuilda);
const req = (uid: string, corpo?: unknown) =>
  new NextRequest('http://t/api/teste-equipe', { method: corpo ? 'POST' : 'GET', headers: { authorization: `Bearer ${tokenDeTeste(uid)}`, 'content-type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined });

async function guildaCom(uids: string[]) {
  await agirNaGuilda('u1', 'criar', { nome: 'Folhaviva' });
  const id = (await getCharacterByUid('u1'))!.guildaId!;
  for (const uid of uids.filter((u) => u !== 'u1')) {
    await agirNaGuilda('u1', 'convidar', { nome: NOMES[uid] });
    await agirNaGuilda(uid, 'aceitarConvite', { guildaId: id });
  }
  return id;
}

async function partyPronta(uids: string[]) {
  await agirNoTeste(uids[0], 'criar', {});
  const partyId = (await estadoDoTeste(uids[0])).minhaParty!.id;
  for (const uid of uids.slice(1)) await agirNoTeste(uid, 'entrar', { partyId });
  for (const uid of uids) await agirNoTeste(uid, 'pronto', { pronto: true });
  return partyId;
}

describe('Party e Teste de Equipe (7.4)', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDeSistemas();
    limparCacheDasGuildas();
    for (const [uid, nome] of Object.entries(NOMES)) {
      await createCharacter(uid, { nome, racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
      await updateCharacter(uid, { nivel: 25, ouro: 10000, atributos: FORTE });
    }
  });

  it('a party é da guilda: sem guilda, nada; com guilda, criar e entrar', async () => {
    expect((await estadoDoTeste('u1')).naGuilda).toBe(false);
    expect((await erro(agirNoTeste('u1', 'criar', {})))?.status).toBe(404);
    await guildaCom(['u1', 'u2']);
    await agirNoTeste('u1', 'criar', {});
    const e2 = await estadoDoTeste('u2');
    expect(e2.partysAbertas).toEqual([{ id: expect.any(String), lider: 'Aragorn', membros: ['Aragorn'] }]);
    await agirNoTeste('u2', 'entrar', { partyId: e2.partysAbertas[0].id });
    expect((await estadoDoTeste('u1')).minhaParty).toMatchObject({ souLider: true, membros: [{ nome: 'Aragorn' }, { nome: 'Boromir' }] });
    expect((await erro(agirNoTeste('u2', 'criar', {})))?.message).toMatch(/já está numa party/);
  });

  it('nível 25, até 3 membros, mínimo 2 e todos prontos para o líder iniciar', async () => {
    await guildaCom(['u1', 'u2', 'u3', 'u4']);
    await updateCharacter('u4', { nivel: 24 });
    await agirNoTeste('u1', 'criar', {});
    const partyId = (await estadoDoTeste('u1')).minhaParty!.id;
    expect((await erro(iniciarTeste('u1', 1, 1)))?.message).toMatch(/pelo menos 2/);
    expect((await erro(agirNoTeste('u4', 'entrar', { partyId })))?.message).toMatch(/nível 25/);
    await agirNoTeste('u2', 'entrar', { partyId });
    await agirNoTeste('u3', 'entrar', { partyId });
    await updateCharacter('u4', { nivel: 25 });
    expect((await erro(agirNoTeste('u4', 'entrar', { partyId })))?.message).toMatch(/cheia/);
    await agirNoTeste('u1', 'pronto', { pronto: true });
    expect((await erro(iniciarTeste('u1', 1, 1)))?.message).toMatch(/Pronto/);
    await agirNoTeste('u2', 'pronto', { pronto: true });
    await agirNoTeste('u3', 'pronto', { pronto: true });
    expect((await erro(iniciarTeste('u2', 1, 1)))?.message).toMatch(/Só o líder/);
    expect((await erro(iniciarTeste('u1', 2, 1)))?.message).toMatch(/ainda não venceu a dificuldade 1/);
  });

  it('vitória: recompensa para todos, dificuldade vencida, tentativa do dia usada e resultado na party', async () => {
    await guildaCom(['u1', 'u2']);
    await partyPronta(['u1', 'u2']);
    const antes = (await getCharacterByUid('u2'))!;
    const r = await iniciarTeste('u1', 1, 42);
    expect(r.resultado.venceu).toBe(true);
    const depois = (await getCharacterByUid('u2'))!;
    expect(depois.ouro).toBe(antes.ouro + 1500);
    expect(depois.diamantes).toBe((antes.diamantes ?? 0) + 10);
    expect(depois.testeEquipeVencidas).toEqual([1]);
    const e = await estadoDoTeste('u2');
    expect(e.dificuldades[0]).toMatchObject({ vencida: true, tentouHoje: true });
    expect(e.dificuldades[1].liberada).toBe(true);
    expect(e.minhaParty!.ultimoResultado).toMatchObject({ dificuldade: 1, venceu: true });
    expect(e.minhaParty!.membros.every((m) => !m.pronto)).toBe(true);
    for (const uid of ['u1', 'u2']) await agirNoTeste(uid, 'pronto', { pronto: true });
    expect((await erro(iniciarTeste('u1', 1, 43)))?.message).toMatch(/já tentou a dificuldade 1 hoje/);
  });

  it('derrota: só gasta a tentativa', async () => {
    await guildaCom(['u1', 'u2']);
    for (const uid of ['u1', 'u2']) await updateCharacter(uid, { atributos: { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 1 } });
    await partyPronta(['u1', 'u2']);
    const ouro = (await getCharacterByUid('u1'))!.ouro;
    const r = await iniciarTeste('u1', 1, 1);
    expect(r.resultado.venceu).toBe(false);
    const d = (await getCharacterByUid('u1'))!;
    expect(d.ouro).toBe(ouro);
    expect(d.testeEquipeVencidas).toBeUndefined();
    expect(Object.keys(d.testeEquipeTentativas ?? {})).toEqual(['1']);
  });

  it('sair da party passa a liderança; sair da guilda tira da party', async () => {
    const id = await guildaCom(['u1', 'u2', 'u3']);
    await partyPronta(['u1', 'u2', 'u3']);
    await agirNoTeste('u1', 'sair', {});
    expect((await estadoDoTeste('u2')).minhaParty).toMatchObject({ souLider: true });
    await agirNaGuilda('u3', 'sair', {});
    const g = (await repositorio.lerGuilda(id))!;
    expect(g.partys![0].membros.map((m) => m.nome)).toEqual(['Boromir']);
  });

  it('rotas', async () => {
    expect((await testeGet(new NextRequest('http://t/api/teste-equipe'))).status).toBe(401);
    await guildaCom(['u1', 'u2']);
    const res = await testePost(req('u1', { acao: 'criar' }));
    expect(res.status).toBe(200);
    expect((await res.json()).estado.minhaParty.souLider).toBe(true);
    expect((await testePost(req('u1', { acao: 'voar' }))).status).toBe(400);
    expect((await (await testeGet(req('u2'))).json()).partysAbertas).toHaveLength(1);
  });
});
