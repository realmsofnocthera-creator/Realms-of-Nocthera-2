import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as missoesRota } from '@/app/api/campanha/missoes/route';
import { POST as acionarRota } from '@/app/api/campanha/acionar/route';
import { POST as bauRota } from '@/app/api/campanha/bau/route';
import { limparCacheRevogacao } from '@/server/auth';
import { campanhaAbrirBau, campanhaAcionar, campanhaAtravessarPorta, campanhaLutar, campanhaMissoes, createCharacter, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { criarConteudo, limparCacheDoConteudo, publicarConteudo, salvarRascunho } from '@/server/conteudo';
import { DONOS_DO_PROJETO, type SessaoMestre } from '@/server/mestre';
import { limparCacheDeSancoes } from '@/server/sancoes';
import { limparCacheDeSistemas } from '@/server/sistemasLeitura';
import { definirMapaInicial } from '@/server/sistemasPainel';
import { cenaEmBranco } from '@/rules/cena';
import { mapaVazio } from '@/rules/mapa';
import type { MissaoDados } from '@/rules/missao';
import { objetoNovo, type ObjetoDoMapa } from '@/rules/objetosDoMapa';
import { repositorio } from '@/server/persistencia';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

const sessao = (papel: SessaoMestre['papel'], uid = papel + '1'): SessaoMestre => ({ uid, email: `${uid}@test.com`, papel, origem: papel === 'dono' ? 'ambiente' : 'painel' });
const dono = sessao('dono', 'dono1');
const mestre = sessao('mestre', 'mes1');
const M = 'Preparando as missões';
const FORTE = { vigor: 400, sorte: 0, forca: 300, vitalidade: 100, arcano: 0, inteligencia: 0, agilidade: 50 };
const T0 = new Date('2026-10-22T12:00:00Z');
const NO_RATO = { mapaId: 'vila', x: 4, y: 3 };
const req = (url: string, uid: string, corpo?: unknown) =>
  new NextRequest(`http://t${url}`, { method: corpo ? 'POST' : 'GET', headers: { authorization: `Bearer ${tokenDeTeste(uid)}`, 'content-type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined });

const primeira: MissaoDados = {
  formato: 1,
  titulo: 'Primeiros passos',
  descricao: 'Conheça a estação.',
  objetivos: [
    { id: 'falar', tipo: 'falar', mapa: 'vila', objeto: 'npc-1' },
    { id: 'bau', tipo: 'bau', mapa: 'vila', objeto: 'bau-1' },
    { id: 'rato', tipo: 'derrotar', monstroId: 'rato-da-floresta', quantidade: 1 },
  ],
  requisitos: { missoes: [], nivelMinimo: 0 },
  recompensa: { xp: 50, ouro: 20, itens: [{ id: 'pelo-de-rato', qtd: 2 }] },
};

/** Vila com NPC que começa a missão, baú, área de monstros, porta trancada até concluir e ativador que só vale com a missão em andamento. */
async function prepararMundo(extra: ObjetoDoMapa[] = []) {
  await criarConteudo(mestre, { tipo: 'cena', id: 'chegada', nome: 'Chegada', dados: cenaEmBranco('Chegada') });
  await publicarConteudo(mestre, 'cena', 'chegada', { revisao: 1, motivo: 'publicada no teste' });
  await criarConteudo(mestre, { tipo: 'missao', id: 'primeira', nome: 'Primeiros passos', dados: { ...primeira, objetivos: [{ id: 'rato', tipo: 'derrotar', monstroId: 'rato-da-floresta', quantidade: 1 }] } });
  const floresta = mapaVazio(10, 8);
  await criarConteudo(mestre, { tipo: 'mapa', id: 'floresta', nome: 'Floresta', dados: floresta });
  const vila = mapaVazio(10, 8);
  vila.objetos = [
    objetoNovo('inicio', 'inicio-1', 1, 1),
    { ...objetoNovo('npc', 'npc-1', 3, 1), nome: 'Chefe', missaoId: 'primeira' },
    { ...objetoNovo('bau', 'bau-1', 3, 2), item: { id: 'pelo-de-rato', qtd: 1 } },
    { ...objetoNovo('cacada', 'area-rato', 4, 3), largura: 2, altura: 2, monstroId: 'rato-da-floresta' },
    { ...objetoNovo('porta', 'porta-1', 6, 1), destino: { mapa: 'floresta', x: 2, y: 2 }, condicao: { missaoConcluida: 'primeira', mensagem: 'A porta está trancada.' } },
    { ...objetoNovo('cena', 'cena-1', 1, 5), largura: 2, altura: 2, cenaId: 'chegada', condicao: { missaoAtiva: 'primeira' } },
    ...extra,
  ];
  await criarConteudo(mestre, { tipo: 'mapa', id: 'vila', nome: 'Vila', dados: vila });
  await salvarRascunho(mestre, 'missao', 'primeira', { revisao: 1, dados: primeira });
  await publicarConteudo(mestre, 'missao', 'primeira', { revisao: 2, motivo: 'publicada no teste' });
  await publicarConteudo(mestre, 'mapa', 'vila', { revisao: 1, motivo: 'publicado no teste' });
  await publicarConteudo(mestre, 'mapa', 'floresta', { revisao: 1, motivo: 'publicado no teste' });
  limparCacheDoConteudo();
  await definirMapaInicial(dono, { mapa: 'vila', motivo: M });
}

describe('Campanha: missões e condições no jogo', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    (DONOS_DO_PROJETO as string[]).length = 0;
    process.env.MESTRE_DONO_UIDS = 'dono1';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDeSancoes();
    limparCacheDeSistemas();
    limparCacheDoConteudo();
    await repositorio.gravarPapelMestre({ uid: 'mes1', papel: 'mestre', concedidoPor: 'dono1', concedidoEm: new Date().toISOString(), motivo: 'teste' });
    await createCharacter('j1', { nome: 'Heroi_j1', racaId: 'elfo', classeId: 'cavaleiro', pontos: { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 } });
    await updateCharacter('j1', { nivel: 2, atributos: FORTE, ouro: 100 });
  });
  afterEach(() => {
    delete process.env.MESTRE_DONO_UIDS;
  });

  it('uma missão do começo ao fim: NPC começa, baú e luta andam, conclui com a recompensa, e a porta trancada abre', async () => {
    await prepararMundo();

    // a porta está trancada e o ativador também (a missão ainda não começou)
    await expect(campanhaAtravessarPorta('j1', 'porta-1', { mapaId: 'vila', x: 6, y: 1 })).rejects.toMatchObject({ message: 'A porta está trancada.' });
    expect(await campanhaAcionar('j1', 'cena-1', { mapaId: 'vila', x: 1, y: 5 })).toMatchObject({ bloqueio: 'Você ainda não pode passar por aqui.' });
    expect((await getCharacterByUid('j1'))!.campanha?.cenas).toBeUndefined();

    // falar com o NPC começa a missão e já cumpre o primeiro objetivo
    const fala = await campanhaAcionar('j1', 'npc-1', { mapaId: 'vila', x: 2, y: 1 });
    expect(fala.missoes?.iniciadas).toEqual([{ id: 'primeira', titulo: 'Primeiros passos' }]);
    expect((await getCharacterByUid('j1'))!.campanha?.missoes?.primeira).toMatchObject({ estado: 'ativa', progresso: { falar: 1 } });
    expect((await campanhaMissoes('j1')).ativas[0]).toMatchObject({ id: 'primeira', titulo: 'Primeiros passos', objetivos: [{ atual: 1, meta: 1, cumprido: true }, { atual: 0, meta: 1, cumprido: false }, { atual: 0, meta: 1, cumprido: false }] });

    // com a missão em andamento o ativador toca a cena
    expect(await campanhaAcionar('j1', 'cena-1', { mapaId: 'vila', x: 1, y: 5 })).toMatchObject({ cenaId: 'chegada' });

    // baú e luta
    const bau = await campanhaAbrirBau('j1', 'bau-1', { mapaId: 'vila', x: 3, y: 3 });
    expect(bau.missoes).toBeUndefined();
    const antes = (await getCharacterByUid('j1'))!;
    const luta = await campanhaLutar('j1', 'area-rato', { seed: 7, posicao: NO_RATO, agora: T0 });
    expect(luta.campanha.vencedor).toBe('personagem');
    expect(luta.campanha.missoes?.concluidas).toHaveLength(1);
    expect(luta.campanha.missoes?.concluidas[0]).toMatchObject({ id: 'primeira', titulo: 'Primeiros passos' });
    expect(luta.campanha.missoes?.concluidas[0].mensagens).toEqual(expect.arrayContaining(['+50 XP', '+20 de ouro', '+2 × pelo de rato']));

    // a recompensa chegou ao personagem, junto com o que a luta já dava
    const depois = (await getCharacterByUid('j1'))!;
    expect(depois.campanha?.missoes?.primeira).toMatchObject({ estado: 'concluida', concluidaEm: expect.any(String) });
    expect(depois.ouro).toBe(antes.ouro + luta.campanha.ouroGanho + 20);
    expect(depois.inventario?.['pelo-de-rato']).toBe((antes.inventario?.['pelo-de-rato'] ?? 0) + 2);
    expect(depois.nivel * 1_000_000 + depois.xpAtual).toBeGreaterThan(antes.nivel * 1_000_000 + antes.xpAtual + 49);

    // a porta agora abre
    const porta = await campanhaAtravessarPorta('j1', 'porta-1', { mapaId: 'vila', x: 6, y: 1 });
    expect(porta.progresso?.mapaId).toBe('floresta');

    const lista = await campanhaMissoes('j1');
    expect(lista.ativas).toEqual([]);
    expect(lista.concluidas.map((m) => m.id)).toEqual(['primeira']);
  });

  it('conversar sem novidade não grava (a posição sozinha não vale uma gravação); a rota responde', async () => {
    await prepararMundo();
    await campanhaAcionar('j1', 'npc-1', { mapaId: 'vila', x: 2, y: 1 });
    const gravado = (await getCharacterByUid('j1'))!.campanha!;
    const de_novo = await campanhaAcionar('j1', 'npc-1', { mapaId: 'vila', x: 2, y: 2 });
    expect(de_novo.missoes).toBeUndefined();
    expect((await getCharacterByUid('j1'))!.campanha).toEqual(gravado);
    const rota = await acionarRota(req('/api/campanha/acionar', 'j1', { objetoId: 'npc-1', posicao: { mapaId: 'vila', x: 2, y: 1 } }));
    expect(rota.status).toBe(200);
    const m = await missoesRota(req('/api/campanha/missoes', 'j1'));
    expect(m.status).toBe(200);
    expect((await m.json()).ativas).toHaveLength(1);
    expect((await missoesRota(new NextRequest('http://t/api/campanha/missoes'))).status).toBe(401);
  });

  it('requisitos: nível baixo não começa a missão e o motivo volta; o baú trancado por item abre com a chave', async () => {
    await criarConteudo(mestre, { tipo: 'missao', id: 'dificil', nome: 'Difícil', dados: { ...primeira, titulo: 'Difícil', objetivos: [{ id: 'rato', tipo: 'derrotar', monstroId: 'rato-da-floresta', quantidade: 1 }], requisitos: { missoes: [], nivelMinimo: 25 } } });
    await publicarConteudo(mestre, 'missao', 'dificil', { revisao: 1, motivo: 'publicada no teste' });
    await prepararMundo([
      { ...objetoNovo('npc', 'npc-2', 2, 3), nome: 'Veterano', missaoId: 'dificil' },
      { ...objetoNovo('bau', 'bau-2', 5, 5), item: { id: 'pelo-de-rato', qtd: 1 }, condicao: { item: { id: 'pelo-de-rato', qtd: 1 }, mensagem: 'Falta a chave.' } },
    ]);
    const r = await campanhaAcionar('j1', 'npc-2', { mapaId: 'vila', x: 1, y: 3 });
    expect(r.missoes?.motivoDoNaoComeco).toMatch(/nível 25/);
    expect((await getCharacterByUid('j1'))!.campanha?.missoes).toBeUndefined();

    await updateCharacter('j1', { inventario: {} });
    await expect(campanhaAbrirBau('j1', 'bau-2', { mapaId: 'vila', x: 5, y: 4 })).rejects.toMatchObject({ message: 'Falta a chave.' });
    await updateCharacter('j1', { inventario: { 'pelo-de-rato': 1 } });
    const ok = await bauRota(req('/api/campanha/bau', 'j1', { objetoId: 'bau-2', posicao: { mapaId: 'vila', x: 5, y: 4 } }));
    expect(ok.status).toBe(200);
    expect((await getCharacterByUid('j1'))!.inventario?.['pelo-de-rato']).toBe(2); // a chave não é gasta
  });
});
