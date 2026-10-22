import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as expedicaoGet, POST as expedicaoPost } from '@/app/api/expedicao/route';
import { limparCacheRevogacao } from '@/server/auth';
import { createCharacter, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { agirNaExpedicao, ErroDeExpedicao, estadoDaExpedicao } from '@/server/expedicao';
import { ajustarJogador } from '@/server/jogadores';
import { DONOS_DO_PROJETO, type SessaoMestre } from '@/server/mestre';
import { limparCacheDeSancoes } from '@/server/sancoes';
import { limparCacheDeSistemas } from '@/server/sistemasLeitura';
import { HORA_MS } from '@/rules/expedicao';
import { MATERIAIS_MUNDO_MAP } from '@/rules/materiaisArmas';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
const erro = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e as ErroDeExpedicao);
const req = (uid: string, corpo?: unknown) =>
  new NextRequest('http://t/api/expedicao', { method: corpo ? 'POST' : 'GET', headers: { authorization: `Bearer ${tokenDeTeste(uid)}`, 'content-type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined });
const dono: SessaoMestre = { uid: 'dono1', email: 'dono1@test.com', papel: 'dono', origem: 'ambiente' };
const T0 = new Date('2026-10-22T12:00:00.000Z');
const depois = (horas: number) => new Date(T0.getTime() + horas * HORA_MS);

describe('Expedição: servidor', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    (DONOS_DO_PROJETO as string[]).length = 0;
    process.env.MESTRE_DONO_UIDS = 'dono1';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDeSancoes();
    limparCacheDeSistemas();
    await createCharacter('u1', { nome: 'Aragorn', racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
    await updateCharacter('u1', { nivel: 15, ouro: 10000 });
  });
  afterEach(() => {
    delete process.env.MESTRE_DONO_UIDS;
  });

  it('abre no nível 15', async () => {
    await updateCharacter('u1', { nivel: 14 });
    expect((await erro(agirNaExpedicao('u1', 'enviar', { horas: 2 }, T0)))?.message).toMatch(/nível 15/);
  });

  it('enviar paga o ouro e ocupa uma vaga; no máximo 3; turno e ouro conferidos', async () => {
    const r = await agirNaExpedicao('u1', 'enviar', { horas: 12 }, T0);
    expect(r.estado.ouro).toBe(10000 - 1750);
    expect(r.estado.expedicoes).toEqual([{ vaga: 0, horas: 12, inicio: T0.toISOString(), fim: depois(12).toISOString() }]);
    await agirNaExpedicao('u1', 'enviar', { horas: 2 }, T0);
    await agirNaExpedicao('u1', 'enviar', { horas: 6 }, T0);
    expect((await erro(agirNaExpedicao('u1', 'enviar', { horas: 2 }, T0)))?.message).toMatch(/3 vagas/);
    expect((await erro(agirNaExpedicao('u1', 'enviar', { horas: 5 }, T0)))?.message).toMatch(/Escolha o turno/);
    await updateCharacter('u1', { ouro: 100, expedicoes: [] });
    expect((await erro(agirNaExpedicao('u1', 'enviar', { horas: 2 }, T0)))?.message).toMatch(/210 de ouro/);
  });

  it('não coleta antes de voltar; coleta depois e entrega selos, Memória, Pedras e materiais de mundo', async () => {
    await agirNaExpedicao('u1', 'enviar', { horas: 12 }, T0);
    expect((await erro(agirNaExpedicao('u1', 'coletar', { vaga: 0 }, depois(11))))?.message).toMatch(/ainda não voltou/);
    const r = await agirNaExpedicao('u1', 'coletar', { vaga: 0 }, depois(12), 99);
    expect(r.coletadas).toHaveLength(1);
    expect(r.estado.expedicoes).toEqual([]);
    const c = (await getCharacterByUid('u1'))!;
    expect(c.selosDeBusca).toEqual({ desgastado: 60, encantado: 15, eternidade: 5, origem: 1 });
    expect(c.fragmentosDeMemoria).toBe(150);
    expect(c.pedrasDaRecordacao).toBe(3);
    const doMundo = Object.entries(c.inventario ?? {}).filter(([id]) => MATERIAIS_MUNDO_MAP[id]);
    const porRaridade = (r: string) => doMundo.filter(([id]) => MATERIAIS_MUNDO_MAP[id].raridade === r).reduce((s, [, q]) => s + q, 0);
    expect([porRaridade('comum'), porRaridade('raro'), porRaridade('muitoRaro'), porRaridade('epico'), porRaridade('lendario')]).toEqual([5, 4, 2, 1, 0]);
    expect((await erro(agirNaExpedicao('u1', 'coletar', {}, depois(12))))?.message).toMatch(/Não há expedição pronta/);
  });

  it('Avanço de expedição tira 1 hora; não gasta mais do que falta; coletar todas pega só as prontas', async () => {
    await updateCharacter('u1', { avancosDeExpedicao: 5 });
    await agirNaExpedicao('u1', 'enviar', { horas: 2 }, T0);
    await agirNaExpedicao('u1', 'enviar', { horas: 6 }, T0);
    expect((await erro(agirNaExpedicao('u1', 'avancar', { vaga: 2 }, T0)))?.message).toMatch(/Não há expedição/);
    const a = await agirNaExpedicao('u1', 'avancar', { vaga: 1, quantidade: 1 }, T0);
    expect(a.estado.expedicoes[1]).toMatchObject({ fim: depois(5).toISOString(), avancos: 1 });
    expect(a.estado.avancos).toBe(4);
    // a de 2 h, meia hora depois, só precisa de 2 Avanços mesmo pedindo 4
    const b = await agirNaExpedicao('u1', 'avancar', { vaga: 0, quantidade: 4 }, depois(0.5));
    expect(b.estado.avancos).toBe(2);
    expect(b.estado.expedicoes[0].fim).toBe(T0.toISOString());
    expect((await erro(agirNaExpedicao('u1', 'avancar', { vaga: 0 }, depois(0.5))))?.message).toMatch(/já terminou/);
    const todas = await agirNaExpedicao('u1', 'coletar', {}, depois(0.5));
    expect(todas.coletadas!.map((x) => x.vaga)).toEqual([0]);
    expect(todas.estado.expedicoes.map((x) => x.vaga)).toEqual([1]);
    await updateCharacter('u1', { avancosDeExpedicao: undefined });
    expect((await erro(agirNaExpedicao('u1', 'avancar', { vaga: 1 }, depois(1))))?.message).toMatch(/insuficientes/);
  });

  it('o Mestre dá Avanços de expedição pelo ajuste', async () => {
    await ajustarJogador(dono, 'u1', { campos: { avancosDeExpedicao: 3 }, motivo: 'Evento de teste' });
    expect((await estadoDaExpedicao('u1')).avancos).toBe(3);
  });

  it('rotas', async () => {
    expect((await expedicaoGet(new NextRequest('http://t/api/expedicao'))).status).toBe(401);
    const g = await expedicaoGet(req('u1'));
    expect(g.status).toBe(200);
    expect(await g.json()).toMatchObject({ nivelNecessario: 15, meuNivel: 15, ouro: 10000, avancos: 0, expedicoes: [] });
    expect((await expedicaoPost(req('u1', { acao: 'voar' }))).status).toBe(400);
    const p = await expedicaoPost(req('u1', { acao: 'enviar', horas: 8 }));
    expect(p.status).toBe(200);
    expect((await p.json()).estado.expedicoes).toHaveLength(1);
  });
});
