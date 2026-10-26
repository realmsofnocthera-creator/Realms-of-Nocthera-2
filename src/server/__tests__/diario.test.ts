import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as avisosGet } from '@/app/api/avisos/route';
import { GET as diarioGet, POST as diarioPost } from '@/app/api/diario/route';
import { limparCacheRevogacao } from '@/server/auth';
import { createCharacter, executarCombate, fabricarArma, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { lutarChefeMundial } from '@/server/chefeMundial';
import { agirNosColecionaveis } from '@/server/colecionaveis';
import { limparCacheDoCorreio } from '@/server/correio';
import { agirNoDiario, avisosDoJogador, ErroDoDiario, estadoDoDiario } from '@/server/diario';
import { agirNaExpedicao } from '@/server/expedicao';
import { DONOS_DO_PROJETO } from '@/server/mestre';
import { limparCacheDeSancoes } from '@/server/sancoes';
import { limparCacheDeSistemas } from '@/server/sistemasLeitura';
import { definirSistema } from '@/server/sistemasPainel';
import { HORA_MS } from '@/rules/expedicao';
import { getTransactionsByUid, resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';
import type { SessaoMestre } from '@/server/mestre';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
const FORTE = { vigor: 300, sorte: 0, forca: 300, vitalidade: 100, arcano: 0, inteligencia: 0, agilidade: 50 };
const MATERIAIS_FERRO = { 'pelo-de-rato': 6, 'mundo-osso-bruto': 2, 'mundo-minerio-de-ferro-bruto': 2, 'mundo-fibra-silvestre': 1 };
const erro = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e as Error & { status?: number });
const req = (uid: string, corpo?: unknown, rota = 'diario') =>
  new NextRequest(`http://t/api/${rota}`, { method: corpo ? 'POST' : 'GET', headers: { authorization: `Bearer ${tokenDeTeste(uid)}`, 'content-type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined });
const dono: SessaoMestre = { uid: 'dono1', email: 'dono1@test.com', papel: 'dono', origem: 'ambiente' };
const T0 = new Date('2026-10-22T18:00:00.000Z');
const UM_DIA = 24 * HORA_MS;

describe('Missões diárias, semanais e Check-in: servidor', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    (DONOS_DO_PROJETO as string[]).length = 0;
    process.env.MESTRE_DONO_UIDS = 'dono1';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDeSancoes();
    limparCacheDeSistemas();
    limparCacheDoCorreio();
    await createCharacter('u1', { nome: 'Aragorn', racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
    await updateCharacter('u1', { nivel: 18, atributos: FORTE, ouro: 10000, inventario: { ...MATERIAIS_FERRO }, selosDeBusca: { desgastado: 100 } });
  });
  afterEach(() => {
    delete process.env.MESTRE_DONO_UIDS;
  });

  it('o Check-in entrega a recompensa do dia, só uma vez por dia, e segue o calendário', async () => {
    const e0 = await estadoDoDiario('u1', T0);
    expect([e0.checkin.feitoHoje, e0.checkin.proximoDia, e0.avisos.checkin]).toEqual([false, 1, true]);
    const r = await agirNoDiario('u1', 'checkin', {}, T0);
    expect(r.mensagem).toBe('Check-in do dia 1 feito: 1.000 de ouro.');
    expect(r.estado.checkin.feitoHoje).toBe(true);
    expect(r.estado.avisos.checkin).toBe(false);
    expect((await getCharacterByUid('u1'))!.ouro).toBe(11000);
    expect(getTransactionsByUid('u1').some((t) => t.moeda === 'ouro' && t.quantidade === 1000 && t.motivo === 'Check-in (dia 1)')).toBe(true);
    expect((await erro(agirNoDiario('u1', 'checkin', {}, new Date(T0.getTime() + HORA_MS))))?.message).toMatch(/já fez o Check-in/);
    const amanha = await agirNoDiario('u1', 'checkin', {}, new Date(T0.getTime() + UM_DIA));
    expect(amanha.mensagem).toMatch(/dia 2 feito: 5× Selo Desgastado/);
    // o calendário marca os dias feitos
    expect(amanha.estado.checkin.calendario.filter((d) => d.feito).map((d) => d.dia)).toEqual([1, 2]);
  });

  it('o dia 7 dá Diamantes; no 30º o ciclo recomeça', async () => {
    await updateCharacter('u1', { checkin: { ultimoDia: '2026-10-20', feitos: 6 } });
    const r = await agirNoDiario('u1', 'checkin', {}, T0);
    expect(r.mensagem).toMatch(/dia 7 feito: 5 Diamantes/);
    expect((await getCharacterByUid('u1'))!.diamantes).toBe(5);
    await updateCharacter('u1', { checkin: { ultimoDia: '2026-10-20', feitos: 29 } });
    const fim = await agirNoDiario('u1', 'checkin', {}, new Date(T0.getTime() + UM_DIA));
    expect(fim.mensagem).toMatch(/dia 30 feito: 25 Diamantes/);
    expect(fim.estado.checkin.feitoHoje).toBe(true);
    expect((await getCharacterByUid('u1'))!.checkin).toEqual({ ultimoDia: '2026-10-23', feitos: 0 });
    const depois = await estadoDoDiario('u1', new Date(T0.getTime() + 2 * UM_DIA));
    expect([depois.checkin.proximoDia, depois.checkin.calendario.some((d) => d.feito)]).toEqual([1, false]);
  });

  it('as missões contam jogando: vitória, forja, expedição, buscas e Chefe Mundial', async () => {
    // vitória, forja e buscas usam o relógio de agora: ele fica parado em T0, para tudo cair na mesma semana em qualquer data
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
    try {
      const luta = await executarCombate('u1', 'rato-da-peste', { seed: 7 });
      expect(luta.resultado.vencedor).toBe('personagem');
      await fabricarArma('u1', { baseId: 'ferro-de-cacada', categoria: 'lanca' }, { aleatorio: () => 0.5 });
      const agora = (await getCharacterByUid('u1'))!.diario!;
      expect([agora.hoje.vitorias, agora.hoje.forja]).toEqual([1, 1]);
      await agirNaExpedicao('u1', 'enviar', { horas: 2 }, T0);
      await agirNaExpedicao('u1', 'coletar', { vaga: 0 }, new Date(T0.getTime() + 2 * HORA_MS), 5);
      await agirNosColecionaveis('u1', 'buscar', { selo: 'desgastado', vezes: 10 }, 3);
      await lutarChefeMundial('u1', 11, T0);
      await lutarChefeMundial('u1', 12, T0);
      const d = (await getCharacterByUid('u1'))!.diario!;
      expect(d.estaSemana).toMatchObject({ vitorias: 1, forja: 1, expedicoes: 1, buscas: 10 });
      // o Chefe Mundial conta uma vez por dia, mesmo com duas lutas
      expect(d.estaSemana.chefeMundial).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('o baú do dia abre por degraus, entrega Diamantes com extrato e não repete', async () => {
    await updateCharacter('u1', { diario: { dia: '2026-10-22', semana: '2026-10-19', hoje: { checkin: 1, vitorias: 5 }, estaSemana: {}, bausDiarios: 0, bausSemanais: 0 } });
    const antes = await avisosDoJogador('u1', T0);
    expect(antes.missoes).toBe(1);
    const r = await agirNoDiario('u1', 'bau', { tipo: 'diario' }, T0);
    expect(r.mensagem).toBe('1 degrau do baú resgatado: 2 Diamantes.');
    expect((await getCharacterByUid('u1'))!.diamantes).toBe(2);
    expect(getTransactionsByUid('u1').some((t) => t.moeda === 'diamantes' && t.quantidade === 2 && t.motivo === 'Baú diário de missões')).toBe(true);
    expect(r.estado.avisos.missoes).toBe(0);
    expect((await erro(agirNoDiario('u1', 'bau', { tipo: 'diario' }, T0)))?.message).toMatch(/Não há degrau/);
    // mais missões: os degraus 2 e 3 saem juntos
    await updateCharacter('u1', { diario: { dia: '2026-10-22', semana: '2026-10-19', hoje: { checkin: 1, vitorias: 30, chefes: 1, torre: 1, forja: 1 }, estaSemana: {}, bausDiarios: 1, bausSemanais: 0 } });
    const todo = await agirNoDiario('u1', 'bau', { tipo: 'diario' }, T0);
    expect(todo.mensagem).toBe('2 degraus do baú resgatados: 10 Diamantes.');
    expect((await getCharacterByUid('u1'))!.diamantes).toBe(12);
  });

  it('o baú semanal e a troca de dia e de semana', async () => {
    await updateCharacter('u1', { diario: { dia: '2026-10-22', semana: '2026-10-19', hoje: {}, estaSemana: { checkin: 5, diarias: 20, vitorias: 250, chefes: 10 }, bausDiarios: 0, bausSemanais: 0 } });
    const r = await agirNoDiario('u1', 'bau', { tipo: 'semanal' }, T0);
    expect(r.mensagem).toBe('2 degraus do baú resgatados: 15 Diamantes.'); // 5 missões: 5 + 10
    // dia novo na mesma semana: o dia zera e a semana fica
    const amanha = await estadoDoDiario('u1', new Date(T0.getTime() + UM_DIA));
    expect(amanha.diarias.every((m) => m.progresso === 0)).toBe(true);
    expect(amanha.semanais.find((m) => m.id === 's-chefes')!.completa).toBe(true);
    // semana nova (a segunda-feira seguinte): tudo zera, os baús voltam a fechar
    const proxima = await estadoDoDiario('u1', new Date(T0.getTime() + 4 * UM_DIA));
    expect(proxima.semanais.every((m) => m.progresso === 0)).toBe(true);
    expect(proxima.bauSemanal.every((b) => !b.aberto && !b.resgatado)).toBe(true);
  });

  it('avisos: baú pronto, check-in, expedição pronta e Chefe de guildas de semana passada', async () => {
    const a0 = await avisosDoJogador('u1', T0);
    expect(a0).toEqual({ missoes: 0, checkin: true, expedicao: false, guilda: false });
    await agirNaExpedicao('u1', 'enviar', { horas: 2 }, T0);
    expect((await avisosDoJogador('u1', new Date(T0.getTime() + 3 * HORA_MS))).expedicao).toBe(true);
    await updateCharacter('u1', { chefeSemanal: [{ semana: '2026-10-12', resgatada: false } as never] });
    expect((await avisosDoJogador('u1', T0)).guilda).toBe(true);
  });

  it('ações inválidas e sistema desligado', async () => {
    expect(await erro(agirNoDiario('u1', 'xyz', {}, T0))).toBeInstanceOf(ErroDoDiario);
    expect((await erro(agirNoDiario('u1', 'bau', {}, T0)))?.message).toMatch(/Escolha o baú/);
    await definirSistema(dono, { alvo: 'diario', ativo: false, motivo: 'teste do sistema' });
    limparCacheDeSistemas();
    expect((await erro(agirNoDiario('u1', 'checkin', {}, T0)))?.message).toMatch(/desligad|manuten/i);
  });

  it('rotas: estado, ação e avisos exigem login', async () => {
    const g = await diarioGet(req('u1'));
    expect(g.status).toBe(200);
    expect((await g.json()).diarias).toHaveLength(7);
    const p = await diarioPost(req('u1', { acao: 'checkin' }));
    expect(p.status).toBe(200);
    expect((await p.json()).mensagem).toMatch(/Check-in do dia 1/);
    const ruim = await diarioPost(req('u1', { acao: 'bau', tipo: 'diario' }));
    expect(ruim.status).toBe(400);
    const av = await avisosGet(req('u1', undefined, 'avisos'));
    expect((await av.json()).checkin).toBe(false);
    expect((await diarioGet(new NextRequest('http://t/api/diario'))).status).toBe(401);
    expect((await avisosGet(new NextRequest('http://t/api/avisos'))).status).toBe(401);
  });
});
