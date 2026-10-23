import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as conquistasGet, POST as conquistasPost } from '@/app/api/conquistas/route';
import { limparCacheRevogacao } from '@/server/auth';
import { createCharacter, executarCombate, fabricarArma, getCharacterByUid, getPublicCharacterByName, updateCharacter } from '@/server/characterService';
import { lutarChefeMundial } from '@/server/chefeMundial';
import { agirNosColecionaveis } from '@/server/colecionaveis';
import { agirNasConquistas, ErroDeConquista, estadoDasConquistas } from '@/server/conquistas';
import { agirNoCorreio, enviarMensagemDoMestre, limparCacheDoCorreio } from '@/server/correio';
import { agirNaExpedicao } from '@/server/expedicao';
import { DONOS_DO_PROJETO, type SessaoMestre } from '@/server/mestre';
import { limparCacheDeSancoes } from '@/server/sancoes';
import { limparCacheDeSistemas } from '@/server/sistemasLeitura';
import { definirSistema } from '@/server/sistemasPainel';
import { HORA_MS } from '@/rules/expedicao';
import { getTransactionsByUid, resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
const FORTE = { vigor: 300, sorte: 0, forca: 300, vitalidade: 100, arcano: 0, inteligencia: 0, agilidade: 50 };
const MATERIAIS_FERRO = { 'pelo-de-rato': 6, 'mundo-osso-bruto': 2, 'mundo-minerio-de-ferro-bruto': 2, 'mundo-fibra-silvestre': 1 };
const erro = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e as Error & { status?: number });
const req = (uid: string, corpo?: unknown) =>
  new NextRequest('http://t/api/conquistas', { method: corpo ? 'POST' : 'GET', headers: { authorization: `Bearer ${tokenDeTeste(uid)}`, 'content-type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined });
const dono: SessaoMestre = { uid: 'dono1', email: 'dono1@test.com', papel: 'dono', origem: 'ambiente' };
const T0 = new Date('2026-10-22T18:00:00.000Z');

describe('Conquistas: servidor', () => {
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

  it('os totais contam jogando: vitórias, forja, expedição, buscas e dias de Chefe Mundial', async () => {
    const luta = await executarCombate('u1', 'rato-da-peste', { seed: 7 });
    expect(luta.resultado.vencedor).toBe('personagem');
    await fabricarArma('u1', { baseId: 'ferro-de-cacada', categoria: 'lanca' }, { aleatorio: () => 0.5 });
    await agirNaExpedicao('u1', 'enviar', { horas: 2 }, T0);
    await agirNaExpedicao('u1', 'coletar', { vaga: 0 }, new Date(T0.getTime() + 2 * HORA_MS), 5);
    await agirNosColecionaveis('u1', 'buscar', { selo: 'desgastado', vezes: 10 }, 3);
    await lutarChefeMundial('u1', 11, T0);
    await lutarChefeMundial('u1', 12, T0);
    expect((await getCharacterByUid('u1'))!.estatisticas).toEqual({ vitorias: 1, forjas: 1, expedicoes: 1, buscas: 10, diasDeChefeMundial: 1 });
    const e = await estadoDasConquistas('u1');
    const por = (id: string) => e.conquistas.find((c) => c.id === id)!;
    expect([por('vitorias').progresso, por('forja').prontos, por('buscas').prontos, por('chefeMundial').prontos, por('nivel').prontos]).toEqual([1, 1, 1, 1, 3]);
  });

  it('resgatar entrega Diamantes (com extrato), selos e Avanços, e não resgata duas vezes', async () => {
    await updateCharacter('u1', { estatisticas: { expedicoes: 10 } });
    // Nível 18: 3 degraus (5, 10 e 15)
    const r = await agirNasConquistas('u1', 'resgatar', { id: 'nivel' });
    expect(r.mensagem).toMatch(/^3 degraus resgatados: 18 Diamantes, 15 selos de busca/);
    let c = (await getCharacterByUid('u1'))!;
    expect([c.diamantes, c.selosDeBusca, c.conquistas]).toEqual([18, { desgastado: 110, encantado: 5 }, { nivel: 3 }]);
    expect(getTransactionsByUid('u1').some((t) => t.moeda === 'diamantes' && t.quantidade === 18 && t.motivo === 'Conquista: Nível')).toBe(true);
    expect((await erro(agirNasConquistas('u1', 'resgatar', { id: 'nivel' })))?.message).toMatch(/Ainda não há degrau/);
    expect(await erro(agirNasConquistas('u1', 'resgatar', { id: 'xyz' }))).toBeInstanceOf(ErroDeConquista);
    // Expedição: 2 degraus, com Avanços no lugar dos selos
    const tudo = await agirNasConquistas('u1', 'resgatarTudo', {});
    c = (await getCharacterByUid('u1'))!;
    expect(c.avancosDeExpedicao).toBe(3);
    expect(c.diamantes).toBe(18 + 3 + 5);
    expect(tudo.estado.prontos).toBe(0);
    expect((await erro(agirNasConquistas('u1', 'resgatarTudo', {})))?.message).toMatch(/Não há conquistas/);
  });

  it('o 5º degrau dá o título; o jogador escolhe o título e ele aparece no perfil público', async () => {
    await updateCharacter('u1', { torreAndar: 300 });
    expect((await erro(agirNasConquistas('u1', 'titulo', { titulo: 'conquistador-da-torre' })))?.message).toMatch(/ainda não tem/);
    const r = await agirNasConquistas('u1', 'resgatar', { id: 'torre' });
    expect(r.mensagem).toMatch(/5 degraus resgatados: 78 Diamantes, .*o título Conquistador da Torre/);
    expect(r.estado.titulos.map((t) => t.id)).toEqual(['conquistador-da-torre']);
    expect(r.estado.conquistas.find((c) => c.id === 'torre')).toMatchObject({ resgatados: 5, proximaMeta: null, recompensa: null });
    const escolhido = await agirNasConquistas('u1', 'titulo', { titulo: 'conquistador-da-torre' });
    expect(escolhido.estado.tituloId).toBe('conquistador-da-torre');
    expect((await getPublicCharacterByName('Aragorn'))?.titulo).toBe('Conquistador da Torre');
    await agirNasConquistas('u1', 'titulo', { titulo: '' });
    expect((await getPublicCharacterByName('Aragorn'))?.titulo).toBeUndefined();
  });

  it('títulos pelo Correio: o Mestre manda um título; título desconhecido é recusado', async () => {
    await enviarMensagemDoMestre(dono, { destino: 'u1', titulo: 'Evento', texto: 'Parabéns!', titulos: ['campeao-do-chefe-mundial'] }, undefined, T0);
    await agirNoCorreio('u1', 'resgatarTudo', {}, T0);
    expect((await getCharacterByUid('u1'))!.titulos).toEqual(['campeao-do-chefe-mundial']);
    await expect(enviarMensagemDoMestre(dono, { destino: 'u1', titulo: 'Evento', texto: 'Parabéns!', titulos: ['falso'] }, undefined, T0)).rejects.toMatchObject({ status: 400 });
  });

  it('desligar o sistema barra o resgate (escolher título continua)', async () => {
    await definirSistema(dono, { alvo: 'conquistas', ativo: false, motivo: 'teste do sistema' });
    await expect(agirNasConquistas('u1', 'resgatar', { id: 'nivel' })).rejects.toMatchObject({ name: 'ErroSistemaDesligado' });
    await expect(agirNasConquistas('u1', 'titulo', { titulo: '' })).resolves.toBeDefined();
  });

  it('rotas', async () => {
    const g = await conquistasGet(req('u1'));
    expect(g.status).toBe(200);
    expect((await g.json()).prontos).toBe(3);
    const p = await conquistasPost(req('u1', { acao: 'resgatar', id: 'nivel' }));
    expect(p.status).toBe(200);
    const ruim = await conquistasPost(req('u1', { acao: 'voar' }));
    expect(ruim.status).toBe(400);
    expect((await conquistasGet(new NextRequest('http://t/api/conquistas'))).status).toBe(401);
  });
});
