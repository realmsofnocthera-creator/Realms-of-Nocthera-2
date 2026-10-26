import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as campeonatoGet } from '@/app/api/campeonato/route';
import { limparCacheRevogacao } from '@/server/auth';
import { abrirBauDeEscolha, limparCacheDaArena } from '@/server/arena';
import { avancarCampeonato, estadoDoCampeonato, limparCacheDoCampeonato, replayDoCampeonato } from '@/server/campeonato';
import { createCharacter, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { estadoDoCorreio, limparCacheDoCorreio } from '@/server/correio';
import { repositorio } from '@/server/persistencia';
import { limparCacheDeSancoes } from '@/server/sancoes';
import { limparCacheDeSistemas } from '@/server/sistemasLeitura';
import { faixaPelaRodada, horaDaRodada, inicioDoCampeonato, ordemDaChave, primeiraRodada, proximoCampeonato, temCampeonato, tituloPelasVitorias } from '@/rules/campeonato';
import { TITULO_MAP } from '@/rules/titulos';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
const DIA = '2026-11-07';
const SEMANA = '2026-11-02';
const ANTES = new Date('2026-11-07T22:00:00.000Z'); // 19h de Brasília
const INICIO = inicioDoCampeonato(DIA);

/** n jogadores do nível 10 com pontos na ranqueada da semana (o 1º com mais pontos). */
async function jogadores(n: number) {
  for (let i = 0; i < n; i++) {
    const uid = `j${i}`;
    await createCharacter(uid, { nome: `Jogador${String(i).padStart(2, '0')}`, racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
    await updateCharacter(uid, { nivel: 10 });
  }
  await repositorio.executarTransacao('teste:ranqueada', async (ctx) => {
    for (let i = 0; i < n; i++)
      ctx.gravarEntradaDaArena({ uid: `j${i}`, modo: 'ranqueada', semana: SEMANA, nome: `Jogador${String(i).padStart(2, '0')}`, nivel: 10, classeId: 'cavaleiro', pontos: 3_000 - i * 10, lutas: 3 });
  });
}

describe('Campeonato (7.5): regras', () => {
  it('quinzenal a partir de 7/11/2026, às 20h de Brasília, uma rodada a cada 5 minutos', () => {
    expect(['2026-11-07', '2026-11-21', '2026-12-05'].every(temCampeonato)).toBe(true);
    expect(['2026-10-31', '2026-11-14', '2026-11-08'].some(temCampeonato)).toBe(false);
    expect(proximoCampeonato('2026-10-26')).toBe('2026-11-07');
    expect(proximoCampeonato('2026-11-08')).toBe('2026-11-21');
    expect(INICIO.toISOString()).toBe('2026-11-07T23:00:00.000Z');
    expect(horaDaRodada(DIA, 0).toISOString()).toBe('2026-11-07T23:05:00.000Z');
  });

  it('chave: 1 e 2 só na final; quem sobra passa direto (os de mais pontos)', () => {
    expect(ordemDaChave(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
    const r = primeiraRodada(40); // chave de 64: 24 passam direto
    expect(r).toHaveLength(32);
    const diretos = r.filter((l) => l.b === null).map((l) => l.a).sort((a, b) => a - b);
    expect(diretos).toEqual(Array.from({ length: 24 }, (_, i) => i));
  });

  it('faixas pela rodada em que caiu e títulos pelas vitórias', () => {
    expect(faixaPelaRodada(6, 6).id).toBe('campeao');
    expect(faixaPelaRodada(5, 6).id).toBe('vice');
    expect(faixaPelaRodada(4, 6).id).toBe('semifinal');
    expect(faixaPelaRodada(0, 6).id).toBe('demais');
    expect(faixaPelaRodada(0, 5).id).toBe('dezesseis');
    expect([1, 2, 3, 4, 5].map(tituloPelasVitorias)).toEqual(['campeao-de-nocthera', 'bicampeao-de-nocthera', 'tricampeao-de-nocthera', undefined, 'lenda-de-nocthera']);
    expect(['campeao-de-nocthera', 'lenda-de-nocthera'].every((t) => TITULO_MAP[t])).toBe(true);
  });
});

describe('Campeonato (7.5): servidor', () => {
  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDeSancoes();
    limparCacheDeSistemas();
    limparCacheDoCorreio();
    limparCacheDaArena();
    limparCacheDoCampeonato();
  });

  it('a edição completa: chave às 20h, uma rodada a cada 5 minutos, prêmios e o baú mítico do campeão', async () => {
    await jogadores(40);
    expect(await avancarCampeonato(ANTES)).toBeNull();
    const c0 = (await avancarCampeonato(INICIO))!;
    expect(c0).toMatchObject({ estado: 'andamento', rodadas: [expect.any(Array)] });
    expect(c0.jogadores).toHaveLength(40);
    expect(c0.jogadores[0].nome).toBe('Jogador00');
    // 5 minutos depois: a primeira rodada
    const c1 = (await avancarCampeonato(new Date(INICIO.getTime() + 5 * 60_000)))!;
    expect(c1.rodadas).toHaveLength(2);
    expect(c1.rodadas[0].every((l) => l.vencedor !== undefined)).toBe(true);
    // 30 minutos depois: as 6 rodadas da chave de 64
    const fim = new Date(INICIO.getTime() + 31 * 60_000);
    const c = (await avancarCampeonato(fim))!;
    expect(c.estado).toBe('encerrado');
    expect(c.rodadas).toHaveLength(6);
    const campeao = c.jogadores[c.rodadas[5][0].vencedor!];
    // o replay da final
    const rep = await replayDoCampeonato(campeao.uid, DIA, 5, 0);
    expect([rep.lados.a.nome, rep.lados.b.nome]).toContain(campeao.nome);
    // os prêmios pelo Correio
    const msg = (await estadoDoCorreio(campeao.uid, fim)).mensagens.find((m) => m.de === 'Campeonato')!;
    expect(msg.titulo).toBe('Campeonato: Campeão');
    expect(msg.presente).toMatchObject({ ouro: 10_000, diamantes: 100, selos: { origem: 30 }, titulos: ['campeao-de-nocthera'] });
    const eu = await getCharacterByUid(campeao.uid);
    expect(eu!.campeonatosVencidos).toBe(1);
    expect(eu!.bausDeEscolha?.[0]).toMatchObject({ tipo: 'mitico' });
    // o baú: carta ou emblema mítico
    const e = await estadoDoCampeonato(campeao.uid, fim);
    expect(e.baus).toHaveLength(1);
    const emblema = e.opcoesMiticas.find((o) => o.nome.startsWith('Emblema'))!;
    await abrirBauDeEscolha(campeao.uid, e.baus[0].id, emblema.id, fim);
    expect((await getCharacterByUid(campeao.uid))!.emblemasItens?.some((x) => x.tipo === emblema.id)).toBe(true);
    // quem caiu na primeira rodada ganha a última faixa; não recebe duas vezes
    const caiu = c.jogadores[c.rodadas[0].find((l) => l.b !== null && l.vencedor === l.a)!.b!];
    await estadoDoCorreio(caiu.uid, fim);
    const deles = (await estadoDoCorreio(caiu.uid, fim)).mensagens.filter((m) => m.de === 'Campeonato');
    expect(deles).toHaveLength(1);
    expect(deles[0].titulo).toBe('Campeonato: 33º em diante');
    // a tela mostra a chave e o campeão
    expect(e.edicao).toMatchObject({ dia: DIA, estado: 'encerrado', jogadores: 40, campeao: campeao.nome });
    expect(e.edicao!.rodadas.at(-1)!.nome).toBe('Final');
  });

  it('com menos de 32 a edição não acontece e todos recebem o aviso', async () => {
    await jogadores(10);
    const c = (await avancarCampeonato(INICIO))!;
    expect(c.estado).toBe('cancelado');
    await createCharacter('outro', { nome: 'Outro', racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
    const aviso = (await estadoDoCorreio('outro', INICIO)).mensagens.find((m) => m.titulo === 'Campeonato cancelado');
    expect(aviso?.texto).toMatch(/havia 10/);
  });

  it('antes da primeira edição a tela mostra a próxima', async () => {
    await createCharacter('u1', { nome: 'Aldric', racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
    const e = await estadoDoCampeonato('u1', new Date('2026-10-26T15:00:00.000Z'));
    expect(e).toMatchObject({ edicao: null, proxima: { dia: '2026-11-07' }, pontosParaEntrar: 1_350 });
    expect((await campeonatoGet(new NextRequest('http://t/api/campeonato'))).status).toBe(401);
    expect((await campeonatoGet(new NextRequest('http://t/api/campeonato', { headers: { authorization: `Bearer ${tokenDeTeste('u1')}` } }))).status).toBe(200);
  });
});
