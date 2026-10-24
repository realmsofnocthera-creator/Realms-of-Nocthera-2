import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as criarRota } from '@/app/api/character/create/route';
import { GET as filaGet, POST as filaPost } from '@/app/api/mestre/revisao/route';
import { exigirEmailVerificado, limparCacheRevogacao, verifyAuthToken } from '@/server/auth';
import { carregarPersonagem, createCharacter, executarCombate, getCharacterByUid, salvarPersonagem, updateCharacter, type CharacterDocument } from '@/server/characterService';
import { cadastrarNaRede, ErroDeMulticonta, marcaDaRede, observarJogadores } from '@/server/integridade';
import { DONOS_DO_PROJETO, type SessaoMestre } from '@/server/mestre';
import { repositorio } from '@/server/persistencia';
import { ipDaRequisicao } from '@/server/rateLimit';
import { filaDeRevisao, marcarComoRevisadas } from '@/server/revisao';
import { limparCacheDeSancoes } from '@/server/sancoes';
import {
  MARCAS_DO_RITMO,
  regularidade,
  ritmoDoDocumento,
  sinaisDoRitmo,
  somarRitmo,
  TETO_DE_ACOES_POR_HORA,
  tetoDeOuroPorHora,
  type RitmoDoJogador,
} from '@/rules/integridade';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
const FORTE = { vigor: 300, sorte: 0, forca: 300, vitalidade: 100, arcano: 0, inteligencia: 0, agilidade: 50 };
const dono: SessaoMestre = { uid: 'dono1', email: 'dono1@test.com', papel: 'dono', origem: 'ambiente' };
const suporte: SessaoMestre = { uid: 'sup1', email: 'sup1@test.com', papel: 'suporte', origem: 'painel' };
const T0 = new Date('2026-10-24T13:05:00.000Z');
const ritmo = (extra: Partial<RitmoDoJogador> = {}): RitmoDoJogador => ({ hora: '2026-10-24T13', acoes: 0, ouro: 0, niveis: 0, marcas: [], avisados: [], ...extra });
const char = (extra: Partial<CharacterDocument> = {}) => ({ uid: 'u1', nome: 'Aragorn', nivel: 30, ouro: 0, ...extra }) as CharacterDocument;
const pedidoDeCriacao = (uid: string, nome: string, xff: string) =>
  new NextRequest('http://t/api/character/create', {
    method: 'POST',
    headers: { authorization: `Bearer ${tokenDeTeste(uid)}`, 'content-type': 'application/json', 'x-forwarded-for': xff },
    body: JSON.stringify({ nome, racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS }),
  });
const mestre = (uid: string, metodo = 'GET', corpo?: unknown) =>
  new NextRequest('http://t/api/mestre/revisao', { method: metodo, headers: { authorization: `Bearer ${tokenDeTeste(uid)}`, 'content-type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined });

describe('Integridade: regras do ritmo (6.5-4)', () => {
  it('soma ações, ouro e níveis da hora e zera quando a hora vira (as marcas ficam)', () => {
    let r = somarRitmo(undefined, { ouro: 100, niveis: 0 }, T0);
    r = somarRitmo(r, { ouro: 50, niveis: 1 }, new Date(T0.getTime() + 60_000));
    expect(r).toMatchObject({ hora: '2026-10-24T13', acoes: 2, ouro: 150, niveis: 1 });
    const depois = somarRitmo({ ...r, avisados: ['acoesPorHora'] }, { ouro: 10, niveis: 0 }, new Date('2026-10-24T14:00:01.000Z'));
    expect(depois).toMatchObject({ hora: '2026-10-24T14', acoes: 1, ouro: 10, niveis: 0, avisados: [] });
    expect(depois.marcas).toHaveLength(3);
  });

  it('os tetos: ações, ouro pelo nível e níveis só depois do 20', () => {
    expect(TETO_DE_ACOES_POR_HORA).toBe(600);
    expect(tetoDeOuroPorHora(30)).toBe(270_000);
    expect(sinaisDoRitmo(ritmo({ acoes: 599, ouro: 269_999 }), 30)).toEqual([]);
    expect(sinaisDoRitmo(ritmo({ acoes: 600, ouro: 270_000 }), 30).map((s) => s.tipo)).toEqual(['acoesPorHora', 'ouroPorHora']);
    // do 3 ao 9 em uma hora é normal; do 25 ao 31, não
    expect(sinaisDoRitmo(ritmo({ niveis: 6 }), 9)).toEqual([]);
    expect(sinaisDoRitmo(ritmo({ niveis: 6 }), 31).map((s) => s.tipo)).toEqual(['niveisPorHora']);
  });

  it('ritmo de robô: 20 ações a intervalos quase iguais; o humano varia', () => {
    const robo = Array.from({ length: MARCAS_DO_RITMO }, (_, i) => T0.getTime() + i * 5000 + (i % 2) * 50);
    expect(regularidade(robo)!.variacao).toBeLessThan(0.08);
    expect(sinaisDoRitmo(ritmo({ marcas: robo }), 30).map((s) => s.tipo)).toEqual(['ritmoDeRobo']);
    const humano = Array.from({ length: MARCAS_DO_RITMO }, (_, i) => T0.getTime() + i * 5000 + ((i * 7919) % 4000));
    expect(sinaisDoRitmo(ritmo({ marcas: humano }), 30)).toEqual([]);
    // regular, mas devagar (uma ação por minuto): não é sinal
    expect(sinaisDoRitmo(ritmo({ marcas: robo.map((m, i) => m + i * 55_000) }), 30)).toEqual([]);
    expect(regularidade(robo.slice(0, 5))).toBeNull();
  });

  it('cada sinal vai para a fila uma vez por hora', () => {
    const gravados = new Map([['u1', char({ ritmo: ritmo({ acoes: TETO_DE_ACOES_POR_HORA - 1 }) })]]);
    const lidos = new Map([['u1', char()]]);
    const primeira = observarJogadores('combate', lidos, gravados, [], [], T0);
    expect(primeira.map((r) => [r.tipo, r.id])).toEqual([['acoesPorHora', 'u1__2026-10-24T13__acoesPorHora']]);
    expect(gravados.get('u1')!.ritmo!.avisados).toEqual(['acoesPorHora']);
    expect(observarJogadores('combate', lidos, gravados, [], [], T0)).toEqual([]);
    // transação do Mestre não conta como ação do jogador
    observarJogadores('ajusteDoMestre', lidos, gravados, [], [], T0);
    expect(gravados.get('u1')!.ritmo!.acoes).toBe(TETO_DE_ACOES_POR_HORA + 1);
  });

  it('leitura tolerante do ritmo', () => {
    expect(ritmoDoDocumento({ hora: 'x' })).toBeUndefined();
    expect(ritmoDoDocumento({ hora: '2026-10-24T13', acoes: 3.7, ouro: -1, marcas: [1, 'a', 2], avisados: ['ritmoDeRobo', 'falso'] })).toEqual({
      hora: '2026-10-24T13',
      acoes: 3,
      ouro: 0,
      niveis: 0,
      marcas: [1, 2],
      avisados: ['ritmoDeRobo'],
    });
  });
});

describe('Integridade: rede e contas (6.5-6)', () => {
  it('a marca da rede é curta, não é o IP, e o IPv6 conta pela faixa /64', () => {
    const m = marcaDaRede('200.150.10.20')!;
    expect(m).toMatch(/^r[0-9a-f]{6}$/);
    expect(m).not.toContain('200');
    expect(marcaDaRede('::ffff:200.150.10.20')).toBe(m);
    expect(marcaDaRede('2804:14c:5b:a1::1')).toBe(marcaDaRede('2804:14c:5b:a1:ffff:1:2:3'));
    expect(marcaDaRede('2804:14c:5b:a2::1')).not.toBe(marcaDaRede('2804:14c:5b:a1::1'));
    expect(marcaDaRede('desconhecido')).toBeNull();
  });

  it('3 contas por rede em 24 horas; depois de 24 horas a vaga volta', () => {
    let c = cadastrarNaRede(null, 'r1', 'a', T0);
    c = cadastrarNaRede(c, 'r1', 'b', T0);
    c = cadastrarNaRede(c, 'r1', 'c', T0);
    expect(() => cadastrarNaRede(c, 'r1', 'd', T0)).toThrow(ErroDeMulticonta);
    const amanha = new Date(T0.getTime() + 24 * 3600_000 + 1);
    expect(cadastrarNaRede(c, 'r1', 'd', amanha).contas.map((x) => x.uid)).toEqual(['d']);
  });

  it('o IP vem do fim do X-Forwarded-For: o que o cliente põe na frente não vale', () => {
    const req = (xff: string) => new NextRequest('http://t/x', { headers: { 'x-forwarded-for': xff } });
    expect(ipDaRequisicao(req('1.2.3.4'))).toBe('1.2.3.4');
    expect(ipDaRequisicao(req('6.6.6.6, 1.2.3.4'))).toBe('1.2.3.4');
    expect(ipDaRequisicao(req('6.6.6.6, 7.7.7.7 , 1.2.3.4,'))).toBe('1.2.3.4');
  });
});

describe('Integridade: no servidor', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    (DONOS_DO_PROJETO as string[]).length = 0;
    process.env.MESTRE_DONO_UIDS = 'dono1';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDeSancoes();
    await repositorio.gravarPapelMestre({ uid: 'sup1', papel: 'suporte', concedidoPor: 'dono1', concedidoEm: new Date().toISOString(), motivo: 'teste' });
  });
  afterEach(() => {
    delete process.env.MESTRE_DONO_UIDS;
    delete process.env.EXTRATO_SO_AVISA;
  });

  it('a 4ª conta da mesma rede é barrada e vai para a fila, mesmo trocando o início do X-Forwarded-For', async () => {
    for (const [i, uid] of ['c1', 'c2', 'c3'].entries()) expect((await criarRota(pedidoDeCriacao(uid, `Conta${uid}`, `9.9.9.${i}, 177.10.20.30`))).status).toBe(201);
    const barrada = await criarRota(pedidoDeCriacao('c4', 'Contac4', '1.1.1.1, 177.10.20.30'));
    expect(barrada.status).toBe(429);
    expect((await barrada.json()).error).toMatch(/3 contas nesta rede/);
    expect(await getCharacterByUid('c4')).toBeNull();
    const fila = await filaDeRevisao(dono);
    expect(fila).toEqual([expect.objectContaining({ uid: 'c4', tipo: 'contasNoMesmoIp', contasDaRede: ['c1', 'c2', 'c3'] })]);
    // outra rede continua criando
    expect((await criarRota(pedidoDeCriacao('c5', 'Contac5', '177.10.20.31'))).status).toBe(201);
  });

  it('a luta conta no ritmo; moeda mexida sem registro entra na fila', async () => {
    await createCharacter('u1', { nome: 'Aragorn', racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
    await updateCharacter('u1', { nivel: 25, atributos: FORTE });
    await executarCombate('u1', 'rato-da-peste', { seed: 7 });
    const c = (await getCharacterByUid('u1'))!;
    expect(c.ritmo).toMatchObject({ acoes: 1, ouro: c.ouro });
    process.env.EXTRATO_SO_AVISA = '1';
    await repositorio.executarTransacao('codigo-com-defeito', async (ctx) => {
      const eu = await carregarPersonagem(ctx, 'u1');
      return salvarPersonagem(ctx, eu, { diamantes: 40 });
    });
    expect(await filaDeRevisao(dono)).toEqual([expect.objectContaining({ uid: 'u1', nome: 'Aragorn', tipo: 'extratoSemRegistro', descricao: expect.stringMatching(/diamantes devia ficar em 0 e ficou em 40/) })]);
  });

  it('a fila no painel: ver é de quem vê jogadores; marcar como revisado é de quem sanciona, e sai da fila', async () => {
    await repositorio.gravarRevisao({ id: 'u9__2026-10-24T13__ritmoDeRobo', uid: 'u9', nome: 'Bot', tipo: 'ritmoDeRobo', descricao: 'x', criadaEm: T0.toISOString(), revisada: false });
    expect((await filaGet(mestre('sup1'))).status).toBe(200);
    expect((await filaPost(mestre('sup1', 'POST', { ids: ['u9__2026-10-24T13__ritmoDeRobo'] }))).status).toBe(403);
    await expect(marcarComoRevisadas(dono, ['../x'])).rejects.toThrow(/Escolha as entradas/);
    const r = await filaPost(mestre('dono1', 'POST', { ids: ['u9__2026-10-24T13__ritmoDeRobo'] }));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ marcadas: 1, fila: [] });
    expect(await filaDeRevisao(suporte)).toEqual([]);
    expect((await filaGet(mestre('u9'))).status).toBe(403);
  });

  it('e-mail confirmado: fica no login e é exigido para o comércio', async () => {
    const ok = await verifyAuthToken(`Bearer ${tokenDeTeste('u1')}`);
    const nao = await verifyAuthToken(`Bearer ${tokenDeTeste('naoverificado1')}`);
    expect([ok?.emailVerificado, nao?.emailVerificado]).toEqual([true, false]);
    expect(() => exigirEmailVerificado(ok!)).not.toThrow();
    expect(() => exigirEmailVerificado(nao!)).toThrow(/Confirme o seu e-mail/);
  });
});
