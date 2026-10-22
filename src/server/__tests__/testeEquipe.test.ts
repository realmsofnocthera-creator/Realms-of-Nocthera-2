import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as testeGet, POST as testePost } from '@/app/api/teste-equipe/route';
import { limparCacheRevogacao } from '@/server/auth';
import { createCharacter, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { agirNoTeste, ErroDeParty, estadoDoTeste, iniciarTeste } from '@/server/testeEquipe';
import { limparCacheDeSistemas } from '@/server/sistemasLeitura';
import { repositorio } from '@/server/persistencia';
import { VALIDADE_DA_PARTY_MS } from '@/rules/testeEquipe';
import { TIPO_DE_CARTA_MAP } from '@/rules/almas';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
const FORTE = { vigor: 900, sorte: 0, forca: 700, vitalidade: 300, arcano: 0, inteligencia: 0, agilidade: 150 };
const NOMES: Record<string, string> = { u1: 'Aragorn', u2: 'Boromir', u3: 'Celeborn', u4: 'Denethor' };
const erro = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e as ErroDeParty);
const req = (uid: string, corpo?: unknown) =>
  new NextRequest('http://t/api/teste-equipe', { method: corpo ? 'POST' : 'GET', headers: { authorization: `Bearer ${tokenDeTeste(uid)}`, 'content-type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined });

/** O líder cria a party, chama os outros pelo nome, eles aceitam e todos marcam Pronto. */
async function partyPronta(uids: string[]) {
  await agirNoTeste(uids[0], 'criar', {});
  const partyId = (await estadoDoTeste(uids[0])).minhaParty!.id;
  for (const uid of uids.slice(1)) {
    await agirNoTeste(uids[0], 'convidar', { nome: NOMES[uid] });
    await agirNoTeste(uid, 'aceitar', { partyId });
  }
  for (const uid of uids) await agirNoTeste(uid, 'pronto', { pronto: true });
  return partyId;
}

describe('Party e Teste de Equipe (7.4)', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDeSistemas();
    for (const [uid, nome] of Object.entries(NOMES)) {
      await createCharacter(uid, { nome, racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
      await updateCharacter(uid, { nivel: 25, ouro: 10000, atributos: FORTE });
    }
  });

  it('não precisa de guilda: criar a party, chamar pelo nome e aceitar', async () => {
    expect((await getCharacterByUid('u1'))!.guildaId).toBeUndefined();
    await agirNoTeste('u1', 'criar', {});
    await agirNoTeste('u1', 'convidar', { nome: 'boromir' });
    const e2 = await estadoDoTeste('u2');
    expect(e2.convites).toEqual([{ partyId: expect.any(String), de: 'Aragorn' }]);
    expect((await estadoDoTeste('u1')).minhaParty!.convites.map((c) => c.nome)).toEqual(['Boromir']);
    await agirNoTeste('u2', 'aceitar', { partyId: e2.convites[0].partyId });
    const e1 = await estadoDoTeste('u1');
    expect(e1.minhaParty).toMatchObject({ souLider: true, membros: [{ nome: 'Aragorn' }, { nome: 'Boromir' }], convites: [] });
    expect((await estadoDoTeste('u2')).minhaParty!.souLider).toBe(false);
    expect((await getCharacterByUid('u2'))!.convitesDeParty).toBeUndefined();
    expect((await erro(agirNoTeste('u2', 'criar', {})))?.message).toMatch(/já está numa party/);
  });

  it('nível 25 para criar, chamar e aceitar; só o líder chama; não chama quem não existe nem repete', async () => {
    await updateCharacter('u3', { nivel: 24 });
    expect((await erro(agirNoTeste('u3', 'criar', {})))?.message).toMatch(/nível 25/);
    await agirNoTeste('u1', 'criar', {});
    expect((await erro(agirNoTeste('u1', 'convidar', { nome: 'Celeborn' })))?.message).toMatch(/ainda não tem o nível 25/);
    expect((await erro(agirNoTeste('u1', 'convidar', { nome: 'Ninguem' })))?.status).toBe(404);
    expect((await erro(agirNoTeste('u1', 'convidar', { nome: 'a' })))?.message).toMatch(/Digite o nome/);
    await agirNoTeste('u1', 'convidar', { nome: 'Boromir' });
    expect((await erro(agirNoTeste('u1', 'convidar', { nome: 'Boromir' })))?.message).toMatch(/já foi chamado/);
    const partyId = (await estadoDoTeste('u1')).minhaParty!.id;
    await agirNoTeste('u2', 'aceitar', { partyId });
    expect((await erro(agirNoTeste('u2', 'convidar', { nome: 'Denethor' })))?.message).toMatch(/Só o líder/);
    expect((await erro(agirNoTeste('u1', 'convidar', { nome: 'Boromir' })))?.message).toMatch(/já está na party/);
    expect((await erro(agirNoTeste('u4', 'aceitar', { partyId })))?.status).toBe(404);
  });

  it('a party tem no máximo 3; recusar limpa o convite', async () => {
    await createCharacter('u5', { nome: 'Elrond', racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
    await updateCharacter('u5', { nivel: 25 });
    NOMES.u5 = 'Elrond';
    await partyPronta(['u1', 'u2', 'u3']);
    expect((await erro(agirNoTeste('u1', 'convidar', { nome: 'Denethor' })))?.message).toMatch(/cheia/);
    await agirNoTeste('u1', 'pronto', { pronto: false });
    await agirNoTeste('u3', 'sair', {});
    await agirNoTeste('u1', 'convidar', { nome: 'Denethor' });
    const partyId = (await estadoDoTeste('u1')).minhaParty!.id;
    await agirNoTeste('u4', 'recusar', { partyId });
    expect((await estadoDoTeste('u4')).convites).toEqual([]);
    expect((await estadoDoTeste('u1')).minhaParty!.convites).toEqual([]);
    delete NOMES.u5;
  });

  it('mínimo 2, todos prontos e só o líder inicia; dificuldade bloqueada', async () => {
    await agirNoTeste('u1', 'criar', {});
    await agirNoTeste('u1', 'pronto', { pronto: true });
    expect((await erro(iniciarTeste('u1', 1, 1)))?.message).toMatch(/pelo menos 2/);
    await agirNoTeste('u1', 'convidar', { nome: 'Boromir' });
    await agirNoTeste('u2', 'aceitar', { partyId: (await estadoDoTeste('u1')).minhaParty!.id });
    expect((await erro(iniciarTeste('u1', 1, 1)))?.message).toMatch(/Pronto/);
    await agirNoTeste('u2', 'pronto', { pronto: true });
    expect((await erro(iniciarTeste('u2', 1, 1)))?.message).toMatch(/Só o líder/);
    expect((await erro(iniciarTeste('u1', 2, 1)))?.message).toMatch(/ainda não venceu a dificuldade 1/);
    expect((await erro(iniciarTeste('u1', 11, 1)))?.message).toMatch(/inválida/);
  });

  it('vitória: recompensa para todos, dificuldade vencida, tentativa do dia usada e resultado na party', async () => {
    await partyPronta(['u1', 'u2']);
    const antes = (await getCharacterByUid('u2'))!;
    const r = await iniciarTeste('u1', 1, 42);
    expect(r.resultado.venceu).toBe(true);
    const depois = (await getCharacterByUid('u2'))!;
    expect(depois.ouro).toBe(antes.ouro + 1500);
    expect(depois.diamantes).toBe((antes.diamantes ?? 0) + 10);
    expect(depois.testeEquipeVencidas).toEqual([1]);
    // Alma: poeira de alma (dobro na primeira vitória) e 1 carta por vitória
    expect(depois.poeiraDeAlma).toBe(20);
    expect(depois.cartasItens).toHaveLength(1);
    expect(depois.cartasDescobertas).toHaveLength(1);
    expect(['comum', 'raro']).toContain(TIPO_DE_CARTA_MAP[depois.cartasItens![0].tipo].raridade);
    const e = await estadoDoTeste('u2');
    expect(e.dificuldades[0]).toMatchObject({ vencida: true, tentouHoje: true });
    expect(e.dificuldades[1].liberada).toBe(true);
    expect(e.minhaParty!.ultimoResultado).toMatchObject({ dificuldade: 1, venceu: true });
    expect(e.minhaParty!.membros.every((m) => !m.pronto)).toBe(true);
    for (const uid of ['u1', 'u2']) await agirNoTeste(uid, 'pronto', { pronto: true });
    expect((await erro(iniciarTeste('u1', 1, 43)))?.message).toMatch(/já tentou a dificuldade 1 hoje/);
  });

  it('derrota: só gasta a tentativa', async () => {
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

  it('sair passa a liderança; o último a sair apaga a party', async () => {
    await partyPronta(['u1', 'u2', 'u3']);
    await agirNoTeste('u1', 'sair', {});
    expect((await getCharacterByUid('u1'))!.partyId).toBeUndefined();
    expect((await estadoDoTeste('u2')).minhaParty).toMatchObject({ souLider: true });
    const id = (await estadoDoTeste('u2')).minhaParty!.id;
    await agirNoTeste('u2', 'sair', {});
    await agirNoTeste('u3', 'sair', {});
    expect(await repositorio.lerParty(id)).toBeNull();
    expect((await erro(agirNoTeste('u3', 'sair', {})))?.status).toBe(404);
  });

  it('party parada há mais de 2 horas deixa de valer', async () => {
    await partyPronta(['u1', 'u2']);
    const id = (await estadoDoTeste('u1')).minhaParty!.id;
    const p = (await repositorio.lerParty(id))!;
    await repositorio.executarTransacao('t', async (ctx) => ctx.gravarParty({ ...p, atualizadaEm: new Date(Date.now() - VALIDADE_DA_PARTY_MS - 1000).toISOString() }));
    expect((await estadoDoTeste('u1')).minhaParty).toBeNull();
    await agirNoTeste('u1', 'criar', {});
    expect((await estadoDoTeste('u1')).minhaParty!.membros).toHaveLength(1);
  });

  it('rotas', async () => {
    expect((await testeGet(new NextRequest('http://t/api/teste-equipe'))).status).toBe(401);
    const res = await testePost(req('u1', { acao: 'criar' }));
    expect(res.status).toBe(200);
    expect((await res.json()).estado.minhaParty.souLider).toBe(true);
    expect((await testePost(req('u1', { acao: 'convidar', nome: 'Boromir' }))).status).toBe(200);
    expect((await (await testeGet(req('u2'))).json()).convites).toHaveLength(1);
    expect((await testePost(req('u1', { acao: 'voar' }))).status).toBe(400);
    expect((await testePost(req('u3', { acao: 'aceitar', partyId: 'p_000000000000' }))).status).toBe(404);
  });
});
