import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as rankingRota } from '@/app/api/ranking/route';
import { GET as buscarRota } from '@/app/api/buscar/route';
import { GET as privacidadeGet, POST as privacidadePost } from '@/app/api/character/privacidade/route';
import { GET as publicoRota } from '@/app/api/character/public/[nome]/route';
import { limparCacheRevogacao } from '@/server/auth';
import { createCharacter, getCharacterByUid, getPublicCharacterByName, updateCharacter } from '@/server/characterService';
import { buscarJogadores, definirPrivacidade, ErroDeBusca, lerRanking, limparCacheDoRanking, rankingParaJogador } from '@/server/social';
import { repositorio } from '@/server/persistencia';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
const req = (url: string, uid: string, corpo?: unknown) =>
  new NextRequest(`http://t${url}`, { method: corpo ? 'POST' : 'GET', headers: { authorization: `Bearer ${tokenDeTeste(uid)}`, 'content-type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined });
const T0 = new Date('2026-10-22T12:00:00Z');
const MIN = 60_000;

describe('social (7.1)', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDoRanking();
    for (const [uid, nome, nivel] of [['u1', 'Aragorn', 10], ['u2', 'Aramis', 7], ['u3', 'Boromir', 12]] as const) {
      await createCharacter(uid, { nome, racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
      await updateCharacter(uid, { nivel });
    }
  });

  it('ranking de nível: ordena e informa a posição de quem pede', async () => {
    const r = await rankingParaJogador('u1', 'nivel');
    expect(r.entradas.map((e) => e.nome)).toEqual(['Boromir', 'Aragorn', 'Aramis']);
    expect(r.minhaPosicao).toBe(2);
    expect(r.estouEscondido).toBe(false);
  });

  it('ranking de torre só tem quem subiu', async () => {
    await updateCharacter('u2', { torreAndar: 4 });
    const r = await rankingParaJogador('u1', 'torre');
    expect(r.entradas.map((e) => e.nome)).toEqual(['Aramis']);
    expect(r.minhaPosicao).toBeNull();
  });

  it('o retrato só é renovado depois de 30 minutos', async () => {
    const a = await lerRanking('nivel', T0);
    await updateCharacter('u2', { nivel: 30 });
    limparCacheDoRanking();
    const b = await lerRanking('nivel', new Date(T0.getTime() + 29 * MIN));
    expect(b.atualizadoEm).toBe(a.atualizadoEm);
    expect(b.entradas[0].nome).toBe('Boromir');
    limparCacheDoRanking();
    const c = await lerRanking('nivel', new Date(T0.getTime() + 31 * MIN));
    expect(c.entradas[0].nome).toBe('Aramis');
  });

  it('esconder-se do ranking tira do retrato na hora', async () => {
    await lerRanking('nivel', new Date());
    const p = await definirPrivacidade('u3', { escondidoNoRanking: true });
    expect(p).toEqual({ escondidoNoRanking: true, escondidoNaBusca: false });
    const r = await rankingParaJogador('u3', 'nivel');
    expect(r.entradas.map((e) => e.nome)).not.toContain('Boromir');
    expect(r.estouEscondido).toBe(true);
    await definirPrivacidade('u3', { escondidoNoRanking: false });
    limparCacheDoRanking();
    expect((await repositorio.lerRanking('nivel'))?.entradas.length).toBe(2);
  });

  it('busca por começo do nome, sem o próprio jogador e sem escondidos', async () => {
    expect((await buscarJogadores('u3', 'ara')).map((r) => r.nome)).toEqual(['Aragorn', 'Aramis']);
    expect((await buscarJogadores('u1', 'ARA')).map((r) => r.nome)).toEqual(['Aramis']);
    await definirPrivacidade('u2', { escondidoNaBusca: true });
    expect((await buscarJogadores('u3', 'ara')).map((r) => r.nome)).toEqual(['Aragorn']);
  });

  it('busca recusa texto curto ou longo demais', async () => {
    await expect(buscarJogadores('u1', 'a')).rejects.toBeInstanceOf(ErroDeBusca);
    await expect(buscarJogadores('u1', undefined)).rejects.toBeInstanceOf(ErroDeBusca);
    await expect(buscarJogadores('u1', 'x'.repeat(25))).rejects.toBeInstanceOf(ErroDeBusca);
  });

  it('perfil público de quem se escondeu da busca só aparece para ele mesmo', async () => {
    await definirPrivacidade('u2', { escondidoNaBusca: true });
    expect(await getPublicCharacterByName('Aramis', 'u1')).toBeNull();
    expect((await getPublicCharacterByName('Aramis', 'u2'))?.nome).toBe('Aramis');
    expect((await getPublicCharacterByName('Aragorn', 'u2'))?.nome).toBe('Aragorn');
  });

  it('privacidade guarda só o que mudou e ignora valores que não são boolean', async () => {
    await definirPrivacidade('u1', { escondidoNaBusca: 'sim' as unknown as boolean });
    expect((await getCharacterByUid('u1'))?.escondidoNaBusca).toBeFalsy();
  });

  describe('rotas', () => {
    it('401 sem login', async () => {
      const sem = new NextRequest('http://t/api/ranking');
      expect((await rankingRota(sem)).status).toBe(401);
      expect((await buscarRota(new NextRequest('http://t/api/buscar?q=ara'))).status).toBe(401);
      expect((await privacidadeGet(new NextRequest('http://t/api/character/privacidade'))).status).toBe(401);
    });

    it('ranking: 200 e 400 para tipo desconhecido', async () => {
      const ok = await rankingRota(req('/api/ranking?tipo=nivel', 'u1'));
      expect(ok.status).toBe(200);
      expect((await ok.json()).entradas).toHaveLength(3);
      expect((await rankingRota(req('/api/ranking?tipo=xis', 'u1'))).status).toBe(400);
    });

    it('buscar: 200 com resultados e 400 com texto curto', async () => {
      const ok = await buscarRota(req('/api/buscar?q=bor', 'u1'));
      expect((await ok.json()).resultados.map((r: { nome: string }) => r.nome)).toEqual(['Boromir']);
      expect((await buscarRota(req('/api/buscar?q=b', 'u1'))).status).toBe(400);
    });

    it('privacidade: lê e muda', async () => {
      expect(await (await privacidadeGet(req('/api/character/privacidade', 'u1'))).json()).toEqual({ escondidoNoRanking: false, escondidoNaBusca: false });
      const res = await privacidadePost(req('/api/character/privacidade', 'u1', { escondidoNaBusca: true }));
      expect(await res.json()).toEqual({ escondidoNoRanking: false, escondidoNaBusca: true });
    });

    it('perfil público respeita a busca escondida', async () => {
      await definirPrivacidade('u2', { escondidoNaBusca: true });
      expect((await publicoRota(req('/api/character/public/Aramis', 'u1'), { params: Promise.resolve({ nome: 'Aramis' }) })).status).toBe(404);
      expect((await publicoRota(req('/api/character/public/Aramis', 'u2'), { params: Promise.resolve({ nome: 'Aramis' }) })).status).toBe(200);
    });
  });
});
