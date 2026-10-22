import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as testeGet, POST as testePost } from '@/app/api/teste-equipe/route';
import { limparCacheRevogacao } from '@/server/auth';
import { createCharacter, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { agirNoTeste, ErroDeParty, estadoDoTeste, iniciarTeste } from '@/server/testeEquipe';
import { limparCacheDeSistemas } from '@/server/sistemasLeitura';
import { repositorio } from '@/server/persistencia';
import { VALIDADE_DA_PARTY_MS } from '@/rules/testeEquipe';
import { diaDeBrasilia } from '@/game/batalhaSangrenta';
import { sorteadorDaSemente } from '@/server/almas';
import { TIPO_DE_CARTA_MAP } from '@/rules/almas';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
const FORTE = { vigor: 900, sorte: 0, forca: 700, vitalidade: 300, arcano: 0, inteligencia: 0, agilidade: 150 };
const FORTISSIMO = { vigor: 20000, sorte: 0, forca: 20000, vitalidade: 20000, arcano: 0, inteligencia: 0, agilidade: 2000 };
const hoje = () => diaDeBrasilia(new Date());
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

  it('mínimo 2, todos prontos e só o líder inicia; teste e dificuldade bloqueada', async () => {
    await agirNoTeste('u1', 'criar', {});
    await agirNoTeste('u1', 'pronto', { pronto: true });
    expect((await erro(iniciarTeste('u1', 'alma', 1, 1)))?.message).toMatch(/pelo menos 2/);
    await agirNoTeste('u1', 'convidar', { nome: 'Boromir' });
    await agirNoTeste('u2', 'aceitar', { partyId: (await estadoDoTeste('u1')).minhaParty!.id });
    expect((await erro(iniciarTeste('u1', 'alma', 1, 1)))?.message).toMatch(/Pronto/);
    await agirNoTeste('u2', 'pronto', { pronto: true });
    expect((await erro(iniciarTeste('u2', 'alma', 1, 1)))?.message).toMatch(/Só o líder/);
    expect((await erro(iniciarTeste('u1', 'alma', 2, 1)))?.message).toMatch(/ainda não concluiu o Muito fácil do Teste da Alma/);
    expect((await erro(iniciarTeste('u1', 'alma', 7, 1)))?.message).toMatch(/inválida/);
    expect((await erro(iniciarTeste('u1', 'fogo', 1, 1)))?.message).toMatch(/Escolha o teste/);
  });

  it('vitória: chave gasta, cacos e 1 carta da categoria; diamantes só na primeira conclusão; abre a próxima só naquele teste', async () => {
    await partyPronta(['u1', 'u2']);
    const antes = (await getCharacterByUid('u2'))!;
    const r = await iniciarTeste('u1', 'corpo', 1, 42);
    expect(r.resultado).toMatchObject({ categoria: 'corpo', dificuldade: 1, venceu: true });
    const depois = (await getCharacterByUid('u2'))!;
    expect(depois.ouro).toBe(antes.ouro);
    expect(depois.xpAtual).toBe(antes.xpAtual);
    expect(depois.diamantes).toBe((antes.diamantes ?? 0) + 10);
    expect(depois.cacosDeAlma).toBe(10);
    expect(depois.poeiraDeAlma ?? 0).toBe(0);
    expect(depois.testeEquipeConcluidas).toEqual(['corpo:1']);
    expect(depois.cartasItens).toHaveLength(3);
    for (const c of depois.cartasItens!) expect(TIPO_DE_CARTA_MAP[c.tipo]).toMatchObject({ categoria: 'corpo', raridade: 'comum' });
    const e = await estadoDoTeste('u2');
    expect(e.chaves.gratisRestantes).toBe(2);
    const corpo = e.testes.find((t) => t.categoria === 'corpo')!;
    expect(corpo.dificuldades[0]).toMatchObject({ concluida: true, diamantes: 0 });
    expect(corpo.dificuldades[1].liberada).toBe(true);
    expect(e.testes.find((t) => t.categoria === 'alma')!.dificuldades[1].liberada).toBe(false);
    expect(e.minhaParty!.ultimoResultado).toMatchObject({ categoria: 'corpo', dificuldade: 1, venceu: true });
    expect(e.minhaParty!.membros.every((m) => !m.pronto)).toBe(true);
    // De novo na mesma dificuldade: sem diamantes, mais cacos e mais uma carta
    for (const uid of ['u1', 'u2']) await agirNoTeste(uid, 'pronto', { pronto: true });
    await iniciarTeste('u1', 'corpo', 1, 43);
    const outra = (await getCharacterByUid('u2'))!;
    expect(outra.diamantes).toBe(depois.diamantes);
    expect(outra.cacosDeAlma).toBe(20);
    expect(outra.cartasItens).toHaveLength(6);
    expect((await estadoDoTeste('u2')).chaves.gratisRestantes).toBe(1);
  });

  it('derrota: só gasta a chave de cada um', async () => {
    for (const uid of ['u1', 'u2']) await updateCharacter(uid, { atributos: { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 1 } });
    await partyPronta(['u1', 'u2']);
    const r = await iniciarTeste('u1', 'alma', 1, 1);
    expect(r.resultado.venceu).toBe(false);
    for (const uid of ['u1', 'u2']) {
      const d = (await getCharacterByUid(uid))!;
      expect(d.testeEquipeConcluidas).toBeUndefined();
      expect(d.cacosDeAlma ?? 0).toBe(0);
      expect(d.chavesDaProvacao).toMatchObject({ dia: hoje(), gratisUsadas: 1 });
    }
  });

  it('chaves: 3 grátis por dia (não acumulam), até 3 compradas por dia a 50 diamantes (ficam guardadas)', async () => {
    await partyPronta(['u1', 'u2']);
    await updateCharacter('u2', { chavesDaProvacao: { dia: hoje(), gratisUsadas: 3, compradasHoje: 0, guardadas: 0 }, diamantes: 120 });
    expect((await erro(iniciarTeste('u1', 'alma', 1, 1)))?.message).toMatch(/Boromir não tem chave da provação/);
    await agirNoTeste('u2', 'comprarChave', {});
    await agirNoTeste('u2', 'comprarChave', {});
    expect((await erro(agirNoTeste('u2', 'comprarChave', {})))?.message).toMatch(/50 diamantes/);
    await updateCharacter('u2', { diamantes: 1000 });
    await agirNoTeste('u2', 'comprarChave', {});
    expect((await erro(agirNoTeste('u2', 'comprarChave', {})))?.message).toMatch(/já comprou as chaves de hoje/);
    let e = await estadoDoTeste('u2');
    expect(e.chaves).toMatchObject({ gratisRestantes: 0, guardadas: 3, comprasRestantes: 0, preco: 50 });
    expect(e.diamantes).toBe(950);
    await iniciarTeste('u1', 'alma', 1, 42);
    expect((await estadoDoTeste('u2')).chaves.guardadas).toBe(2);
    expect((await estadoDoTeste('u1')).chaves.gratisRestantes).toBe(2);
    // Virou o dia: as grátis voltam a 3 (sem acumular) e as compradas continuam
    await updateCharacter('u2', { chavesDaProvacao: { dia: '2000-01-01', gratisUsadas: 3, compradasHoje: 3, guardadas: 2 } });
    e = await estadoDoTeste('u2');
    expect(e.chaves).toMatchObject({ gratisRestantes: 3, guardadas: 2, comprasRestantes: 3 });
  });

  it('Inferno: pede o selo do abismo de cada um; dá poeira e cartas das raridades altas', async () => {
    for (const uid of ['u1', 'u2']) await updateCharacter(uid, { atributos: FORTISSIMO, testeEquipeConcluidas: ['mente:5'] });
    await partyPronta(['u1', 'u2']);
    await updateCharacter('u1', { selosDoAbismo: 1 });
    expect((await erro(iniciarTeste('u1', 'mente', 6, 1)))?.message).toMatch(/Boromir não tem selo do abismo/);
    await updateCharacter('u2', { selosDoAbismo: 2 });
    const r = await iniciarTeste('u1', 'mente', 6, 7);
    expect(r.resultado.venceu).toBe(true);
    const u1 = (await getCharacterByUid('u1'))!;
    const u2 = (await getCharacterByUid('u2'))!;
    expect(u1.selosDoAbismo).toBeUndefined();
    expect(u2.selosDoAbismo).toBe(1);
    expect(u1.chavesDaProvacao).toBeUndefined();
    expect(u1.poeiraDeAlma).toBe(30);
    expect(u1.cacosDeAlma).toBe(120);
    expect(u1.testeEquipeConcluidas).toEqual(['mente:5', 'mente:6']);
    expect(u1.cartasItens).toHaveLength(3);
    for (const c of u1.cartasItens!) {
      const tipo = TIPO_DE_CARTA_MAP[c.tipo];
      expect(tipo.categoria).toBe('mente');
      expect(['muitoRaro', 'epico', 'lendario', 'mitico']).toContain(tipo.raridade);
    }
  });

  it('Muito difícil: a chance do selo do abismo na vitória', async () => {
    // Uma semente em que o 7º sorteio do líder (depois da raridade e do tipo das 3 cartas) cai abaixo de 10%
    const semente = Array.from({ length: 500 }, (_, i) => i + 1).find((s) => {
      const r = sorteadorDaSemente(s);
      for (let i = 0; i < 6; i++) r();
      return r() < 0.1;
    })!;
    for (const uid of ['u1', 'u2']) await updateCharacter(uid, { atributos: FORTISSIMO, testeEquipeConcluidas: ['corpo:4'] });
    await partyPronta(['u1', 'u2']);
    const r = await iniciarTeste('u1', 'corpo', 5, semente);
    expect(r.resultado.venceu).toBe(true);
    expect((await getCharacterByUid('u1'))!.selosDoAbismo).toBe(1);
    expect((await estadoDoTeste('u1')).testes.find((t) => t.categoria === 'corpo')!.dificuldades[5].liberada).toBe(true);
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
