import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as arenaGet } from '@/app/api/arena/route';
import { limparCacheRevogacao } from '@/server/auth';
import { createCharacter, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { estadoDoCorreio, limparCacheDoCorreio } from '@/server/correio';
import { comprarLuta, ErroDaArena, estadoDaArena, limparCacheDaArena, lutar, trocarLista, verReplay } from '@/server/arena';
import { limparCacheDeSancoes } from '@/server/sancoes';
import { limparCacheDeSistemas } from '@/server/sistemasLeitura';
import { faixaDaArena, pontosDepoisDaLuta, PONTOS_INICIAIS } from '@/rules/arena';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
const erro = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e as Error);
// segunda-feira, 26/10/2026, 12h de Brasília
const AGORA = new Date('2026-10-26T15:00:00.000Z');
const IP = '200.1.2.3';

describe('Arena (7.5): regras', () => {
  it('pontos: +20 (ou +30 contra quem tem mais), -10 ao perder, +5 ao defender; empate tira dos dois; nunca abaixo de 0', () => {
    expect(pontosDepoisDaLuta(1000, 1000, 'a')).toEqual({ atacante: 1020, defensor: 990 });
    expect(pontosDepoisDaLuta(1000, 1100, 'a')).toEqual({ atacante: 1030, defensor: 1090 });
    expect(pontosDepoisDaLuta(1000, 1000, 'b')).toEqual({ atacante: 990, defensor: 1005 });
    expect(pontosDepoisDaLuta(1000, 1000, 'ninguem')).toEqual({ atacante: 990, defensor: 990 });
    expect(pontosDepoisDaLuta(5, 0, 'b')).toEqual({ atacante: 0, defensor: 5 });
  });

  it('faixas do pódio', () => {
    expect(faixaDaArena(1)).toMatchObject({ ouro: 5000, diamantes: 25 });
    expect(faixaDaArena(7).nome).toBe('4º ao 10º');
    expect(faixaDaArena(500)).toMatchObject({ ouro: 250, diamantes: 0 });
  });
});

describe('Arena (7.5): servidor', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDeSancoes();
    limparCacheDeSistemas();
    limparCacheDoCorreio();
    limparCacheDaArena();
    const nomes = ['Aldric', 'Borin', 'Cassia', 'Dorian', 'Elora', 'Fenris', 'Novato'];
    for (const [i, nome] of nomes.entries()) await createCharacter(`u${i + 1}`, { nome, racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
    for (let i = 1; i <= 6; i++) await updateCharacter(`u${i}`, { nivel: 10, diamantes: 100 });
  });

  it('nível 4; a primeira lista vem de jogadores de qualquer pontuação (sem o próprio e sem quem está abaixo do nível 4)', async () => {
    const novato = await estadoDaArena('u7', AGORA);
    expect(novato).toMatchObject({ podeLutar: false, adversarios: [] });
    const e = await estadoDaArena('u1', AGORA);
    expect(e).toMatchObject({ podeLutar: true, pontos: PONTOS_INICIAIS, lutasRestantes: 5, posicao: null, acabaEm: '2026-11-02T03:00:00.000Z' });
    expect(e.adversarios).toHaveLength(5);
    expect(e.adversarios.map((a) => a.uid)).not.toContain('u1');
    expect(e.adversarios.map((a) => a.uid)).not.toContain('u7');
    expect((await erro(lutar('u7', 'u1', IP, AGORA)))?.message).toMatch(/nível 4/);
  });

  it('a luta muda os pontos dos dois, entra no histórico dos dois e pode ser vista de novo', async () => {
    const e = await estadoDaArena('u1', AGORA);
    const alvo = e.adversarios[0];
    const r = await lutar('u1', alvo.uid, IP, AGORA);
    const esperado = pontosDepoisDaLuta(1000, 1000, r.combate.vencedor);
    expect(r.pontos).toBe(esperado.atacante);
    const depois = await estadoDaArena('u1', AGORA);
    expect(depois).toMatchObject({ pontos: esperado.atacante, lutasRestantes: 4 });
    expect(depois.historico[0]).toMatchObject({ atacou: true, adversario: alvo.nome, pontos: esperado.atacante - 1000 });
    const dele = await estadoDaArena(alvo.uid, AGORA);
    expect(dele.pontos).toBe(esperado.defensor);
    expect(dele.historico[0]).toMatchObject({ atacou: false, adversario: 'Aldric' });
    // o replay refaz a mesma luta, para quem atacou e para quem defendeu
    const rep = await verReplay('u1', depois.historico[0].id, AGORA);
    expect(rep.combate).toEqual(r.combate);
    expect((await verReplay(alvo.uid, dele.historico[0].id, AGORA)).combate).toEqual(r.combate);
    // quem não lutou não vê (a lista é sorteada: escolhe alguém que não é o adversário)
    const deFora = ['u2', 'u3', 'u4'].find((u) => u !== alvo.uid)!;
    expect(await erro(verReplay(deFora, depois.historico[0].id, AGORA))).toBeInstanceOf(ErroDaArena);
    // o pódio mostra os dois (depois dos 30 segundos de cache)
    limparCacheDaArena();
    expect((await estadoDaArena('u1', AGORA)).podio.map((p) => p.nome)).toEqual(expect.arrayContaining(['Aldric', alvo.nome]));
  });

  it('5 lutas por dia, até 5 compradas por 5 Diamantes; no dia seguinte zera', async () => {
    const e = await estadoDaArena('u1', AGORA);
    for (let i = 0; i < 5; i++) await lutar('u1', e.adversarios[i % 5].uid, IP, AGORA);
    expect((await erro(lutar('u1', e.adversarios[0].uid, IP, AGORA)))?.message).toMatch(/acabaram/);
    await comprarLuta('u1', AGORA);
    expect((await getCharacterByUid('u1'))!.diamantes).toBe(95);
    expect((await estadoDaArena('u1', AGORA)).lutasRestantes).toBe(1);
    for (let i = 0; i < 4; i++) await comprarLuta('u1', AGORA);
    expect((await erro(comprarLuta('u1', AGORA)))?.message).toMatch(/já comprou/);
    const amanha = new Date('2026-10-27T15:00:00.000Z');
    expect((await estadoDaArena('u1', amanha))).toMatchObject({ lutasRestantes: 5, comprasFeitas: 0 });
  });

  it('o mesmo adversário só 3 vezes por dia', async () => {
    const alvo = (await estadoDaArena('u1', AGORA)).adversarios[0].uid;
    for (let i = 0; i < 3; i++) await lutar('u1', alvo, IP, AGORA);
    expect((await erro(lutar('u1', alvo, IP, AGORA)))?.message).toMatch(/3 vezes hoje/);
    expect((await erro(lutar('u1', 'u7', IP, AGORA)))?.message).toMatch(/não está na sua lista/);
  });

  it('trocar a lista: de graça uma vez por hora', async () => {
    await estadoDaArena('u1', AGORA);
    await trocarLista('u1', AGORA);
    expect((await erro(trocarLista('u1', new Date(AGORA.getTime() + 30 * 60_000))))?.message).toMatch(/30 min/);
    await trocarLista('u1', new Date(AGORA.getTime() + 61 * 60_000));
  });

  it('na semana seguinte os pontos voltam a 1.000 e o prêmio chega pelo Correio', async () => {
    const e = await estadoDaArena('u1', AGORA);
    let pontos = 1000;
    for (let i = 0; i < 5; i++) pontos = (await lutar('u1', e.adversarios[i].uid, IP, AGORA)).pontos;
    const proxima = new Date('2026-11-02T15:00:00.000Z');
    const nova = await estadoDaArena('u1', proxima);
    expect(nova).toMatchObject({ pontos: 1000, lutasRestantes: 5, historico: [] });
    const msg = (await estadoDoCorreio('u1', proxima)).mensagens.find((m) => m.de === 'Arena')!;
    expect(msg.texto).toMatch(new RegExp(`${pontos.toLocaleString('pt-BR')} pontos`));
    expect(msg.presente?.ouro).toBeGreaterThan(0);
    // não manda de novo
    await estadoDaArena('u1', proxima);
    expect((await estadoDoCorreio('u1', proxima)).mensagens.filter((m) => m.de === 'Arena')).toHaveLength(1);
  });

  it('rota com login', async () => {
    expect((await arenaGet(new NextRequest('http://t/api/arena'))).status).toBe(401);
    const r = await arenaGet(new NextRequest('http://t/api/arena', { headers: { authorization: `Bearer ${tokenDeTeste('u1')}` } }));
    expect(r.status).toBe(200);
  });
});
