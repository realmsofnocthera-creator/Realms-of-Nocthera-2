import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { limparCacheRevogacao } from '@/server/auth';
import { createCharacter, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { agirNaGuilda, limparCacheDasGuildas } from '@/server/guildas';
import { limparCacheDoMercado } from '@/server/mercado';
import { limparCacheDeSistemas } from '@/server/sistemasLeitura';
import { repositorio } from '@/server/persistencia';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';
import { POST as combatStart } from '@/app/api/combat/start/route';
import { POST as cacadaIniciar } from '@/app/api/cacada/iniciar/route';
import { POST as forjaFabricar } from '@/app/api/forja/fabricar/route';
import { POST as forjaReforjar } from '@/app/api/forja/reforjar/route';
import { POST as forjaCustomizar } from '@/app/api/forja/customizar/route';
import { POST as armaduraFabricar } from '@/app/api/armadura/fabricar/route';
import { POST as armaduraOrbes } from '@/app/api/armadura/orbes/route';
import { POST as conquistas } from '@/app/api/conquistas/route';
import { POST as colecionaveis } from '@/app/api/colecionaveis/route';
import { POST as almas } from '@/app/api/almas/route';
import { POST as mercado } from '@/app/api/mercado/route';
import { POST as emblemasFundir } from '@/app/api/emblemas/fundir/route';
import { POST as emblemasEquipar } from '@/app/api/emblemas/equipar/route';
import { POST as equipar } from '@/app/api/equipamento/equipar/route';
import { POST as guerreiro } from '@/app/api/guerreiro/iniciar/route';
import { POST as batalhaSangrenta } from '@/app/api/batalha-sangrenta/iniciar/route';
import { POST as loja } from '@/app/api/loja/route';
import { POST as diario } from '@/app/api/diario/route';
import { POST as testeEquipe } from '@/app/api/teste-equipe/route';
import { POST as guilda } from '@/app/api/guilda/route';
import { POST as subclasseEscolher } from '@/app/api/character/subclasse/escolher/route';
import { POST as habilidadeEquipar } from '@/app/api/character/habilidades/equipar/route';

// o limite de requisições por minuto esconderia o resultado (um 429 no lugar da validação): aqui ele fica de fora
vi.mock('@/server/rateLimit', async (original) => ({ ...(await original<typeof import('@/server/rateLimit')>()), limitarPorConta: () => null, limitarPorIp: () => null }));

/**
 * P0 de segurança: ids do protótipo de objeto ("constructor", "__proto__"...) nunca podem passar como se existissem num catálogo. Para cada rota que
 * recebe um id do jogador, o teste manda cada um deles e exige um erro de validação (4xx, nunca 500) e que o personagem e a guilda não mudem.
 */
const PERIGOSOS = ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf', 'prototype'] as const;
const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };

const pedido = (url: string, uid: string, corpo: unknown) =>
  new NextRequest(`http://t/api/${url}`, { method: 'POST', headers: { authorization: `Bearer ${tokenDeTeste(uid)}`, 'content-type': 'application/json' }, body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo) });

type Rota = (req: NextRequest) => Promise<Response>;
interface Caso {
  nome: string;
  url: string;
  rota: Rota;
  /** O corpo da requisição com o id perigoso no lugar certo. */
  corpo: (id: string) => unknown;
}

const CASOS: Caso[] = [
  { nome: 'combate: monsterId', url: 'combat/start', rota: combatStart, corpo: (id) => ({ monsterId: id }) },
  { nome: 'caçada: monstroId', url: 'cacada/iniciar', rota: cacadaIniciar, corpo: (id) => ({ monstroId: id }) },
  { nome: 'forja: baseId', url: 'forja/fabricar', rota: forjaFabricar, corpo: (id) => ({ baseId: id, categoria: 'lanca' }) },
  { nome: 'forja: categoria', url: 'forja/fabricar', rota: forjaFabricar, corpo: (id) => ({ baseId: 'ferro-de-cacada', categoria: id }) },
  { nome: 'forja: reforjar', url: 'forja/reforjar', rota: forjaReforjar, corpo: (id) => ({ armaId: id }) },
  { nome: 'forja: customizar', url: 'forja/customizar', rota: forjaCustomizar, corpo: (id) => ({ armaId: id, opcao: id }) },
  { nome: 'armadura: pecaId', url: 'armadura/fabricar', rota: armaduraFabricar, corpo: (id) => ({ pecaId: id }) },
  { nome: 'armadura: orbes', url: 'armadura/orbes', rota: armaduraOrbes, corpo: (id) => ({ armaduraId: 'a1', orbes: { [id]: 1 } }) },
  { nome: 'armadura: armaduraId', url: 'armadura/orbes', rota: armaduraOrbes, corpo: (id) => ({ armaduraId: id, orbes: { 'orbe-comum': 1 } }) },
  { nome: 'conquistas: resgatar', url: 'conquistas', rota: conquistas, corpo: (id) => ({ acao: 'resgatar', id }) },
  { nome: 'conquistas: título', url: 'conquistas', rota: conquistas, corpo: (id) => ({ acao: 'titulo', titulo: id }) },
  { nome: 'conquistas: moldura', url: 'conquistas', rota: conquistas, corpo: (id) => ({ acao: 'moldura', moldura: id }) },
  { nome: 'colecionáveis: ativar', url: 'colecionaveis', rota: colecionaveis, corpo: (id) => ({ acao: 'ativar', id }) },
  { nome: 'colecionáveis: reforçar', url: 'colecionaveis', rota: colecionaveis, corpo: (id) => ({ acao: 'reforcar', id, niveis: 1 }) },
  { nome: 'colecionáveis: estrelas', url: 'colecionaveis', rota: colecionaveis, corpo: (id) => ({ acao: 'estrelas', id }) },
  { nome: 'colecionáveis: selo', url: 'colecionaveis', rota: colecionaveis, corpo: (id) => ({ acao: 'buscar', selo: id, vezes: 1 }) },
  { nome: 'alma: equipar', url: 'almas', rota: almas, corpo: (id) => ({ acao: 'equipar', id }) },
  { nome: 'alma: destruir', url: 'almas', rota: almas, corpo: (id) => ({ acao: 'destruir', ids: [id] }) },
  { nome: 'mercado: anunciar material', url: 'mercado', rota: mercado, corpo: (id) => ({ acao: 'anunciar', item: { tipo: 'material', id }, quantidade: 999999, moeda: 'ouro', preco: 10 }) },
  { nome: 'mercado: anunciar recurso', url: 'mercado', rota: mercado, corpo: (id) => ({ acao: 'anunciar', item: { tipo: 'recurso', id }, quantidade: 5, moeda: 'ouro', preco: 10 }) },
  { nome: 'mercado: anunciar arma', url: 'mercado', rota: mercado, corpo: (id) => ({ acao: 'anunciar', item: { tipo: 'arma', id }, quantidade: 1, moeda: 'ouro', preco: 10 }) },
  { nome: 'mercado: comprar', url: 'mercado', rota: mercado, corpo: (id) => ({ acao: 'comprar', id }) },
  { nome: 'mercado: cancelar', url: 'mercado', rota: mercado, corpo: (id) => ({ acao: 'cancelar', id }) },
  { nome: 'emblemas: fundir', url: 'emblemas/fundir', rota: emblemasFundir, corpo: (id) => ({ tipo: id, estrelas: 1 }) },
  { nome: 'emblemas: equipar', url: 'emblemas/equipar', rota: emblemasEquipar, corpo: (id) => ({ id, acao: 'equipar' }) },
  { nome: 'equipamento: equipar', url: 'equipamento/equipar', rota: equipar, corpo: (id) => ({ tipo: 'arma', id }) },
  { nome: 'equipamento: tipo', url: 'equipamento/equipar', rota: equipar, corpo: (id) => ({ tipo: id, id: 'x' }) },
  { nome: 'guerreiro: dificuldade', url: 'guerreiro/iniciar', rota: guerreiro, corpo: (id) => ({ dificuldade: id }) },
  { nome: 'batalha sangrenta: dificuldade', url: 'batalha-sangrenta/iniciar', rota: batalhaSangrenta, corpo: (id) => ({ dificuldade: id }) },
  { nome: 'loja: chave', url: 'loja', rota: loja, corpo: (id) => ({ chave: id, quantidade: 1 }) },
  { nome: 'diário: baú', url: 'diario', rota: diario, corpo: (id) => ({ acao: 'bau', tipo: id }) },
  { nome: 'teste de equipe: categoria', url: 'teste-equipe', rota: testeEquipe, corpo: (id) => ({ acao: 'iniciar', categoria: id, dificuldade: 1 }) },
  { nome: 'guilda: ramo da pesquisa', url: 'guilda', rota: guilda, corpo: (id) => ({ acao: 'doarPesquisa', ramo: id, ouro: 1 }) },
  { nome: 'guilda: material da pesquisa', url: 'guilda', rota: guilda, corpo: (id) => ({ acao: 'doarPesquisa', ramo: 'xp', materiais: { [id]: 1 } }) },
  { nome: 'subclasse: escolher', url: 'character/subclasse/escolher', rota: subclasseEscolher, corpo: (id) => ({ subclasseId: id }) },
  { nome: 'habilidade: equipar', url: 'character/habilidades/equipar', rota: habilidadeEquipar, corpo: (id) => ({ slot: 'ataqueBasico', habilidadeId: id }) },
];

/** O estado que não pode mudar: o personagem inteiro e a guilda. */
async function retrato(uid: string) {
  const c = await getCharacterByUid(uid);
  const g = c?.guildaId ? await repositorio.lerGuilda(c.guildaId) : null;
  return JSON.stringify({ c, g });
}

describe('P0: ids "constructor", "__proto__" e afins nos catálogos', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDeSistemas();
    limparCacheDasGuildas();
    limparCacheDoMercado();
    await createCharacter('u1', { nome: 'Aragorn', racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
    await updateCharacter('u1', { nivel: 30, ouro: 400_000, diamantes: 100, inventario: { 'pelo-de-rato': 50 } });
    // uma guilda em Respeitada, para a Pesquisa
    await agirNaGuilda('u1', 'criar', { nome: 'Folhaviva', descricao: 'Teste' });
    const eu = (await getCharacterByUid('u1'))!;
    const g = (await repositorio.lerGuilda(eu.guildaId!))!;
    await repositorio.executarTransacao('t', async (ctx) => ctx.gravarGuilda({ ...g, xp: 7500 }));
  });

  for (const c of CASOS) {
    it(`${c.nome}: erro de validação (nunca 500) e nada muda`, async () => {
      const antes = await retrato('u1');
      for (const id of PERIGOSOS) {
        const res = await c.rota(pedido(c.url, 'u1', c.corpo(id)));
        expect(res.status, `${c.url} com ${id}: ${await res.clone().text()}`).toBeGreaterThanOrEqual(400);
        expect(res.status, `${c.url} com ${id}`).toBeLessThan(500);
        expect(res.status, `${c.url} com ${id}: limite de requisições, não validação`).not.toBe(429);
        expect(await retrato('u1'), `${c.url} com ${id} mudou o jogo`).toBe(antes);
      }
    });
  }

  it('JSON com a chave "__proto__" de verdade (como o corpo chega do cliente) também é recusado', async () => {
    const antes = await retrato('u1');
    for (const url of ['guilda', 'mercado']) {
      const corpo = url === 'guilda' ? '{"acao":"doarPesquisa","ramo":"xp","materiais":{"__proto__":1}}' : '{"acao":"anunciar","item":{"tipo":"material","id":"__proto__"},"quantidade":5,"moeda":"ouro","preco":10}';
      const res = await (url === 'guilda' ? guilda : mercado)(pedido(url, 'u1', corpo));
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    }
    expect(await retrato('u1')).toBe(antes);
  });
});

describe('Pesquisa da guilda: quantidades e número de materiais', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDeSistemas();
    limparCacheDasGuildas();
    await createCharacter('u1', { nome: 'Aragorn', racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
    await updateCharacter('u1', { nivel: 30, ouro: 400_000, inventario: { 'pelo-de-rato': 50 } });
    await agirNaGuilda('u1', 'criar', { nome: 'Folhaviva', descricao: 'Teste' });
    const g = (await repositorio.lerGuilda((await getCharacterByUid('u1'))!.guildaId!))!;
    await repositorio.executarTransacao('t', async (ctx) => ctx.gravarGuilda({ ...g, xp: 7500 }));
  });

  const doar = (materiais: unknown) => agirNaGuilda('u1', 'doarPesquisa', { ramo: 'xp', materiais } as never).then(() => null, (e: Error & { status?: number }) => e);

  it('só inteiros positivos e seguros: NaN, Infinity, negativos, zero, decimais e enormes são recusados', async () => {
    const antes = await retrato('u1');
    for (const q of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 2, 1e21, '5', null]) {
      const e = await doar({ 'pelo-de-rato': q });
      expect(e?.message, String(q)).toMatch(/Materiais inválidos/);
    }
    expect(await retrato('u1')).toBe(antes);
  });

  it('no máximo 20 materiais diferentes numa doação', async () => {
    const muitos = Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`material-${i}`, 1]));
    expect((await doar(muitos))?.message).toMatch(/demais/);
  });

  it('uma doação boa continua funcionando', async () => {
    expect(await doar({ 'pelo-de-rato': 10 })).toBeNull();
    expect((await getCharacterByUid('u1'))!.inventario?.['pelo-de-rato']).toBe(40);
  });
});
