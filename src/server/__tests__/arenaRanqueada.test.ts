import { describe, it, expect, beforeEach } from 'vitest';
import { limparCacheRevogacao } from '@/server/auth';
import { createCharacter, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { estadoDoCorreio, limparCacheDoCorreio } from '@/server/correio';
import { abrirBauDeEscolha, estadoDaArena, limparCacheDaArena, lutar } from '@/server/arena';
import { repositorio } from '@/server/persistencia';
import { limparCacheDeSancoes } from '@/server/sancoes';
import { limparCacheDeSistemas } from '@/server/sistemasLeitura';
import { indiceDoRanque, pontosDepoisDasQuedas, pontosRanqueadosDepois, RANQUES, ranqueDe } from '@/rules/arenaRanqueada';
import type { EntradaDaArena } from '@/rules/arena';
import { TITULO_MAP } from '@/rules/titulos';
import { resetCharacterStore } from '@/test/repositorioMemoria';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
const erro = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e as Error);
// segunda-feira, 26/10/2026, 12h de Brasília
const AGORA = new Date('2026-10-26T15:00:00.000Z');
const SEMANA = '2026-10-26';
const PROXIMA = new Date('2026-11-02T15:00:00.000Z');
const IP = '200.1.2.3';

/** Põe uma entrada da ranqueada direto no banco de teste (pontos de outros jogadores). */
async function entrada(uid: string, nome: string, pontos: number, semana = SEMANA, extra: Partial<EntradaDaArena> = {}) {
  await repositorio.executarTransacao('teste:arena', async (ctx) => {
    ctx.gravarEntradaDaArena({ uid, modo: 'ranqueada', semana, nome, nivel: 10, classeId: 'cavaleiro', pontos, lutas: 1, ...extra });
  });
}

describe('Arena ranqueada (7.5): regras', () => {
  it('ranques por pontos, +25/-15 e a queda de 40% por semana', () => {
    expect(RANQUES).toHaveLength(10);
    expect(ranqueDe(0).nome).toBe('Recruta');
    expect(ranqueDe(99).nome).toBe('Recruta');
    expect(ranqueDe(100).nome).toBe('Combatente');
    expect(ranqueDe(1_000).nome).toBe('Campeão');
    expect(ranqueDe(9_999).nome).toBe('Eterno');
    expect(pontosRanqueadosDepois(100, true)).toBe(125);
    expect(pontosRanqueadosDepois(10, false)).toBe(0);
    expect(pontosDepoisDasQuedas(1_000, 1)).toBe(600);
    expect(pontosDepoisDasQuedas(1_000, 2)).toBe(360);
    // os títulos de todos os ranques existem
    expect(RANQUES.every((r) => TITULO_MAP[r.titulo])).toBe(true);
    // selos só até o Lendário (sem o Selo da Origem)
    expect(RANQUES.every((r) => !('origem' in r.selos))).toBe(true);
  });
});

describe('Arena ranqueada (7.5): servidor', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDeSancoes();
    limparCacheDeSistemas();
    limparCacheDoCorreio();
    limparCacheDaArena();
    for (const [i, nome] of ['Aldric', 'Borin', 'Cassia', 'Dorian', 'Elora', 'Fenris'].entries()) await createCharacter(`u${i + 1}`, { nome, racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
    for (let i = 1; i <= 6; i++) await updateCharacter(`u${i}`, { nivel: 10 });
  });

  it('começa no Recruta; só quem ataca ganha ou perde pontos; 5 lutas por dia, sem compra; separada da Arena', async () => {
    const e = await estadoDaArena('u1', AGORA, 'ranqueada');
    expect(e).toMatchObject({ modo: 'ranqueada', pontos: 0, lutasRestantes: 5, podeComprarLuta: false });
    const alvo = e.adversarios[0];
    const r = await lutar('u1', alvo.uid, IP, AGORA, 'ranqueada');
    expect(r.pontos).toBe(pontosRanqueadosDepois(0, r.venceu));
    expect((await estadoDaArena(alvo.uid, AGORA, 'ranqueada')).pontos).toBe(0);
    // a Arena normal não mudou
    expect((await estadoDaArena('u1', AGORA, 'arena')).pontos).toBe(1_000);
    for (let i = 1; i < 5; i++) await lutar('u1', e.adversarios[i % e.adversarios.length].uid, IP, AGORA, 'ranqueada');
    expect((await erro(lutar('u1', alvo.uid, IP, AGORA, 'ranqueada')))?.message).toMatch(/Volte amanhã/);
  });

  it('a lista traz quem está a um ranque de distância (sem ninguém ali, o mais próximo)', async () => {
    await entrada('u1', 'Aldric', 1_000); // Campeão (índice 5)
    await entrada('u2', 'Borin', 1_400); // Ascendente (6): entra
    await entrada('u3', 'Cassia', 750); // Elite (4): entra
    await entrada('u4', 'Dorian', 2_800); // Eterno (9): fica de fora
    await entrada('u5', 'Elora', 0); // Recruta (0): fica de fora
    const e = await estadoDaArena('u1', AGORA, 'ranqueada');
    const nomes = e.adversarios.map((a) => a.nome);
    expect(nomes).toEqual(expect.arrayContaining(['Borin', 'Cassia']));
    expect(nomes).not.toContain('Dorian');
    expect(nomes).not.toContain('Elora');
    // sozinho no topo: vem o ranque mais próximo que tiver gente
    await entrada('u6', 'Fenris', 2_800);
    const topo = await estadoDaArena('u6', AGORA, 'ranqueada');
    expect(topo.adversarios[0].nome).toBe('Dorian');
  });

  it('na semana seguinte os pontos caem 40% e o prêmio do ranque chega pelo Correio (título e selos)', async () => {
    await entrada('u1', 'Aldric', 1_000);
    await updateCharacter('u1', { ranqueada: [{ semana: SEMANA }] });
    const nova = await estadoDaArena('u1', PROXIMA, 'ranqueada');
    expect(nova.pontos).toBe(600);
    expect(ranqueDe(nova.pontos).nome).toBe('Gladiador');
    const msg = (await estadoDoCorreio('u1', PROXIMA)).mensagens.find((m) => m.de === 'Arena ranqueada')!;
    expect(msg.titulo).toBe('Arena ranqueada: Campeão');
    expect(msg.presente).toMatchObject({ ouro: 1_600, diamantes: 12, selos: { encantado: 15 }, titulos: ['campeao-da-arena'] });
    // não manda de novo
    await estadoDaArena('u1', PROXIMA, 'ranqueada');
    expect((await estadoDoCorreio('u1', PROXIMA)).mensagens.filter((m) => m.de === 'Arena ranqueada')).toHaveLength(1);
  });

  it('sem luta na semana não há prêmio', async () => {
    await entrada('u1', 'Aldric', 300, SEMANA, { lutas: 0 });
    await updateCharacter('u1', { ranqueada: [{ semana: SEMANA }] });
    expect((await estadoDoCorreio('u1', PROXIMA)).mensagens.filter((m) => m.de === 'Arena ranqueada')).toHaveLength(0);
  });

  it('o Eterno ganha o baú de escolha de carta lendária e escolhe a carta', async () => {
    await entrada('u1', 'Aldric', 3_000);
    await updateCharacter('u1', { ranqueada: [{ semana: SEMANA }] });
    const e = await estadoDaArena('u1', PROXIMA, 'ranqueada');
    expect(e.baus).toHaveLength(1);
    expect(e.cartasLendarias).toHaveLength(9);
    expect((await erro(abrirBauDeEscolha('u1', e.baus[0].id, 'nao-existe', PROXIMA)))?.message).toMatch(/Escolha a carta lendária/);
    const carta = e.cartasLendarias[0];
    await abrirBauDeEscolha('u1', e.baus[0].id, carta.id, PROXIMA);
    const c = await getCharacterByUid('u1');
    expect(c!.cartasItens?.some((x) => x.tipo === carta.id)).toBe(true);
    expect(c!.bausDeEscolha ?? []).toHaveLength(0);
    expect((await erro(abrirBauDeEscolha('u1', e.baus[0].id, carta.id, PROXIMA)))?.message).toMatch(/já foi aberto/);
  });

  it('o replay da ranqueada é separado do da Arena', async () => {
    const e = await estadoDaArena('u1', AGORA, 'ranqueada');
    const r = await lutar('u1', e.adversarios[0].uid, IP, AGORA, 'ranqueada');
    const h = (await estadoDaArena('u1', AGORA, 'ranqueada')).historico[0];
    expect(h.replay).toBe('u1_r0');
    const { verReplay } = await import('@/server/arena');
    expect((await verReplay('u1', h.id, AGORA, 'ranqueada')).combate).toEqual(r.combate);
    expect((await estadoDaArena('u1', AGORA, 'arena')).historico).toHaveLength(0);
  });

  it('o índice do ranque cresce com os pontos', () => {
    expect(RANQUES.map((r) => indiceDoRanque(r.minimo))).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});
