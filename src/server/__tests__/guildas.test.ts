import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as guildaGet, POST as guildaPost } from '@/app/api/guilda/route';
import { GET as guildasGet } from '@/app/api/guildas/route';
import { GET as guildaPublicaGet } from '@/app/api/guildas/[id]/route';
import { limparCacheRevogacao } from '@/server/auth';
import { createCharacter, executarCacada, getCharacterByUid, getPublicCharacterByName, updateCharacter } from '@/server/characterService';
import { agirNaGuilda, ErroDeGuilda, estadoDaGuilda, limparCacheDoChefeSemanal, lutarChefeSemanal, lutarIncursao, resgatarChefeSemanal, limparCacheDasGuildas, listarGuildasParaJogador, tirarDaGuildaAntesDeExcluir, verGuilda } from '@/server/guildas';
import { limparCacheDeSistemas } from '@/server/sistemasLeitura';
import { configuracaoPadrao } from '@/rules/sistemas';
import { REGRAS_PADRAO_DE_GUILDA } from '@/rules/guilda';
import { TIPO_DE_CARTA_MAP } from '@/rules/almas';
import { repositorio } from '@/server/persistencia';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
const req = (url: string, uid: string, corpo?: unknown) =>
  new NextRequest(`http://t${url}`, { method: corpo ? 'POST' : 'GET', headers: { authorization: `Bearer ${tokenDeTeste(uid)}`, 'content-type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined });
const agir = (uid: string, acao: string, pedido: Record<string, unknown> = {}) => agirNaGuilda(uid, acao, pedido);
const NOMES: Record<string, string> = { u1: 'Aragorn', u2: 'Boromir', u3: 'Celeborn', u4: 'Denethor', u5: 'Elrond' };

async function criarGuilda(uid = 'u1', nome = 'Folhaviva') {
  await agir(uid, 'criar', { nome, descricao: 'Guardiões da floresta' });
  return (await getCharacterByUid(uid))!.guildaId!;
}
async function entrar(guildaId: string, uid: string, lider = 'u1') {
  await agir(lider, 'convidar', { nome: NOMES[uid] });
  await agir(uid, 'aceitarConvite', { guildaId });
}
const erro = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e as ErroDeGuilda);

describe('Guildas (7.3)', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDeSistemas();
    limparCacheDasGuildas();
    for (const [uid, nome] of Object.entries(NOMES)) {
      await createCharacter(uid, { nome, racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
      await updateCharacter(uid, { nivel: 12, ouro: 6000 });
    }
  });

  describe('criar', () => {
    it('cobra o ouro, registra a transação e faz o criador Líder', async () => {
      const id = await criarGuilda();
      const eu = (await getCharacterByUid('u1'))!;
      expect(eu.ouro).toBe(1000);
      expect(eu.guildaNome).toBe('Folhaviva');
      const g = (await repositorio.lerGuilda(id))!;
      expect(g.membros).toEqual([expect.objectContaining({ uid: 'u1', cargo: 'lider' })]);
      expect(g.descricao).toBe('Guardiões da floresta');
      expect((await repositorio.listarTransacoes('u1', 5))[0]).toMatchObject({ tipo: 'perda', quantidade: 5000, moeda: 'ouro' });
    });

    it('exige nível, ouro, nome livre e válido, e não estar noutra guilda', async () => {
      await updateCharacter('u2', { nivel: 9 });
      expect((await erro(agir('u2', 'criar', { nome: 'Outra' })))?.message).toMatch(/nível 10/);
      await updateCharacter('u3', { ouro: 10 });
      expect((await erro(agir('u3', 'criar', { nome: 'Outra' })))?.message).toMatch(/5000 de ouro/);
      expect((await getCharacterByUid('u3'))!.ouro).toBe(10);
      await criarGuilda();
      expect((await erro(agir('u4', 'criar', { nome: '  folhaVIVA ' })))?.message).toMatch(/Já existe/);
      expect((await erro(agir('u4', 'criar', { nome: 'ab' })))?.message).toMatch(/entre 3 e 20/);
      expect((await erro(agir('u4', 'criar', { nome: 'Nome<script>' })))?.message).toMatch(/Use só letras/);
      expect((await erro(agir('u1', 'criar', { nome: 'Segunda' })))?.status).toBe(409);
    });

    it('as regras vêm do painel (Sistemas)', async () => {
      await repositorio.gravarConfiguracaoDeSistemas({ ...configuracaoPadrao(), guildas: { nivelMinimo: 1, custoOuro: 0, xpPorNivel: [100, 200, 300, 400, 500, 600, 700], membrosPorNivel: [2, 3, 4, 5, 6, 7, 8, 9] } });
      limparCacheDeSistemas();
      await updateCharacter('u2', { nivel: 1, ouro: 0 });
      const id = await criarGuilda('u2', 'Gratis');
      expect((await getCharacterByUid('u2'))!.ouro).toBe(0);
      await entrar(id, 'u3', 'u2');
      expect((await erro(agir('u2', 'convidar', { nome: 'Denethor' })))?.message).toMatch(/cheia \(2 membros no nível Emergente\)/);
    });

    it('o sistema pode ser desligado no painel', async () => {
      const cfg = configuracaoPadrao();
      cfg.sistemas.guildas = { ativo: false, mensagem: '' };
      await repositorio.gravarConfiguracaoDeSistemas(cfg);
      limparCacheDeSistemas();
      await expect(agir('u1', 'criar', { nome: 'Folhaviva' })).rejects.toThrow(/Guildas está temporariamente desligado/);
    });
  });

  describe('convites', () => {
    it('Líder convida, o jogador vê o convite e aceita', async () => {
      const id = await criarGuilda();
      await agir('u1', 'convidar', { nome: 'boromir' });
      const estado = await estadoDaGuilda('u2');
      expect(estado.convites.map((g) => g.nome)).toEqual(['Folhaviva']);
      expect((await estadoDaGuilda('u1')).minha!.convites.map((c) => c.nome)).toEqual(['Boromir']);
      await agir('u2', 'aceitarConvite', { guildaId: id });
      const g = (await repositorio.lerGuilda(id))!;
      expect(g.membros.map((m) => [m.nome, m.cargo])).toEqual([['Aragorn', 'lider'], ['Boromir', 'membro']]);
      expect(g.convites).toEqual([]);
      expect((await getCharacterByUid('u2'))!.convitesDeGuilda).toBeUndefined();
    });

    it('Membro não convida; não convida quem já está numa guilda nem quem não existe', async () => {
      const id = await criarGuilda();
      await entrar(id, 'u2');
      expect((await erro(agir('u2', 'convidar', { nome: 'Celeborn' })))?.message).toMatch(/Só o Líder e os Oficiais/);
      expect((await erro(agir('u1', 'convidar', { nome: 'Ninguem' })))?.status).toBe(404);
      await criarGuilda('u3', 'Lorien');
      expect((await erro(agir('u1', 'convidar', { nome: 'Celeborn' })))?.message).toMatch(/já está numa guilda/);
    });

    it('recusar e cancelar convite limpam os dois lados', async () => {
      const id = await criarGuilda();
      await agir('u1', 'convidar', { nome: 'Boromir' });
      await agir('u2', 'recusarConvite', { guildaId: id });
      expect((await repositorio.lerGuilda(id))!.convites).toEqual([]);
      await agir('u1', 'convidar', { nome: 'Boromir' });
      await agir('u1', 'cancelarConvite', { uid: 'u2' });
      expect((await getCharacterByUid('u2'))!.convitesDeGuilda).toBeUndefined();
      expect((await erro(agir('u2', 'aceitarConvite', { guildaId: id })))?.status).toBe(404);
    });

    it('ao entrar numa guilda, os outros convites e pedidos do jogador somem', async () => {
      const a = await criarGuilda('u1', 'Folhaviva');
      const b = await criarGuilda('u3', 'Lorien');
      await agir('u3', 'convidar', { nome: 'Boromir' });
      await agir('u1', 'convidar', { nome: 'Boromir' });
      await agir('u2', 'aceitarConvite', { guildaId: a });
      expect((await repositorio.lerGuilda(b))!.convites).toEqual([]);
      expect((await getCharacterByUid('u2'))!.guildaId).toBe(a);
    });
  });

  describe('pedidos', () => {
    it('jogador pede, Oficial aceita', async () => {
      const id = await criarGuilda();
      await entrar(id, 'u2');
      await agir('u1', 'promover', { uid: 'u2' });
      await agir('u3', 'pedir', { guildaId: id });
      expect((await estadoDaGuilda('u3')).pedidos.map((g) => g.nome)).toEqual(['Folhaviva']);
      expect((await estadoDaGuilda('u2')).minha!.pedidos.map((p) => p.nome)).toEqual(['Celeborn']);
      expect((await estadoDaGuilda('u1')).minha!.membros.map((m) => m.cargo)).toEqual(['lider', 'oficial']);
      await agir('u2', 'aceitarPedido', { uid: 'u3' });
      expect((await getCharacterByUid('u3'))!.guildaId).toBe(id);
    });

    it('recusar e cancelar pedido; pedido velho (o jogador entrou noutra) é só removido', async () => {
      const id = await criarGuilda();
      await agir('u2', 'pedir', { guildaId: id });
      await agir('u1', 'recusarPedido', { uid: 'u2' });
      expect((await getCharacterByUid('u2'))!.pedidosDeGuilda).toBeUndefined();
      await agir('u2', 'pedir', { guildaId: id });
      await agir('u2', 'cancelarPedido', { guildaId: id });
      expect((await repositorio.lerGuilda(id))!.pedidos).toEqual([]);
      // pedido em duas guildas; entra pela outra e o pedido aqui deixa de valer
      const outra = await criarGuilda('u3', 'Lorien');
      await agir('u4', 'pedir', { guildaId: id });
      await agir('u4', 'pedir', { guildaId: outra });
      await agir('u3', 'aceitarPedido', { uid: 'u4' });
      expect((await repositorio.lerGuilda(id))!.pedidos).toEqual([]);
    });

    it('não pede duas vezes nem passa do limite de pedidos', async () => {
      const ids = [await criarGuilda('u1', 'Aaa'), await criarGuilda('u2', 'Bbb'), await criarGuilda('u3', 'Ccc'), await criarGuilda('u4', 'Ddd')];
      await agir('u5', 'pedir', { guildaId: ids[0] });
      expect((await erro(agir('u5', 'pedir', { guildaId: ids[0] })))?.status).toBe(409);
      await agir('u5', 'pedir', { guildaId: ids[1] });
      await agir('u5', 'pedir', { guildaId: ids[2] });
      expect((await erro(agir('u5', 'pedir', { guildaId: ids[3] })))?.message).toMatch(/3 pedidos/);
    });
  });

  describe('cargos e saída', () => {
    it('Oficial expulsa Membro mas não Oficial; Líder expulsa qualquer um', async () => {
      const id = await criarGuilda();
      await entrar(id, 'u2');
      await entrar(id, 'u3');
      await entrar(id, 'u4');
      await agir('u1', 'promover', { uid: 'u2' });
      await agir('u1', 'promover', { uid: 'u3' });
      expect((await erro(agir('u2', 'expulsar', { uid: 'u3' })))?.message).toMatch(/só expulsam Membros/);
      await agir('u2', 'expulsar', { uid: 'u4' });
      expect((await getCharacterByUid('u4'))!.guildaId).toBeUndefined();
      await agir('u1', 'expulsar', { uid: 'u3' });
      expect((await repositorio.lerGuilda(id))!.membros.map((m) => m.nome)).toEqual(['Aragorn', 'Boromir']);
      expect((await erro(agir('u2', 'promover', { uid: 'u1' })))?.message).toMatch(/Só o Líder/);
    });

    it('rebaixar e passar a liderança', async () => {
      const id = await criarGuilda();
      await entrar(id, 'u2');
      await agir('u1', 'promover', { uid: 'u2' });
      await agir('u1', 'rebaixar', { uid: 'u2' });
      expect((await erro(agir('u1', 'rebaixar', { uid: 'u2' })))?.status).toBe(409);
      await agir('u1', 'transferir', { uid: 'u2' });
      const cargos = Object.fromEntries((await repositorio.lerGuilda(id))!.membros.map((m) => [m.uid, m.cargo]));
      expect(cargos).toEqual({ u1: 'oficial', u2: 'lider' });
    });

    it('Líder não sai com membros; sozinho, sair desfaz a guilda e libera o nome', async () => {
      const id = await criarGuilda();
      await entrar(id, 'u2');
      expect((await erro(agir('u1', 'sair')))?.message).toMatch(/Passe a liderança/);
      await agir('u2', 'sair');
      expect((await getCharacterByUid('u2'))!.guildaId).toBeUndefined();
      await agir('u1', 'sair');
      expect(await repositorio.lerGuilda(id)).toBeNull();
      await agir('u3', 'criar', { nome: 'Folhaviva' });
      expect((await getCharacterByUid('u3'))!.guildaNome).toBe('Folhaviva');
    });

    it('desfazer pede o nome para confirmar e tira todo mundo, inclusive convites', async () => {
      const id = await criarGuilda();
      await entrar(id, 'u2');
      await agir('u1', 'convidar', { nome: 'Celeborn' });
      await agir('u4', 'pedir', { guildaId: id });
      expect((await erro(agir('u1', 'desfazer', { nome: 'errado' })))?.message).toMatch(/digite o nome/);
      await agir('u1', 'desfazer', { nome: 'folhaviva' });
      expect(await repositorio.lerGuilda(id)).toBeNull();
      for (const uid of ['u1', 'u2']) expect((await getCharacterByUid(uid))!.guildaId).toBeUndefined();
      expect((await getCharacterByUid('u3'))!.convitesDeGuilda).toBeUndefined();
      expect((await getCharacterByUid('u4'))!.pedidosDeGuilda).toBeUndefined();
    });

    it('Líder muda a descrição', async () => {
      const id = await criarGuilda();
      await agir('u1', 'editarDescricao', { descricao: 'Nova' });
      expect((await verGuilda(id)).descricao).toBe('Nova');
      expect((await erro(agir('u1', 'editarDescricao', { descricao: 'x'.repeat(201) })))?.message).toMatch(/200/);
    });
  });

  it('excluir o jogador pelo painel passa a liderança ao Oficial mais antigo', async () => {
    const id = await criarGuilda();
    await entrar(id, 'u2');
    await entrar(id, 'u3');
    await agir('u1', 'promover', { uid: 'u3' });
    await tirarDaGuildaAntesDeExcluir('u1');
    const g = (await repositorio.lerGuilda(id))!;
    expect(g.membros.map((m) => [m.nome, m.cargo])).toEqual([['Boromir', 'membro'], ['Celeborn', 'lider']]);
  });

  it('excluir o único membro desfaz a guilda', async () => {
    const id = await criarGuilda();
    await tirarDaGuildaAntesDeExcluir('u1');
    expect(await repositorio.lerGuilda(id)).toBeNull();
  });

  it('o estado se conserta quando a guilda do personagem não existe mais', async () => {
    await updateCharacter('u2', { guildaId: 'g_inexistente1', guildaNome: 'Fantasma', convitesDeGuilda: ['g_naoexiste22'] });
    const e = await estadoDaGuilda('u2');
    expect(e.minha).toBeNull();
    expect(e.convites).toEqual([]);
    const c = (await getCharacterByUid('u2'))!;
    expect(c.guildaId).toBeUndefined();
    expect(c.convitesDeGuilda).toBeUndefined();
  });

  it('lista as maiores e busca pelo começo do nome; o perfil público mostra a guilda', async () => {
    const a = await criarGuilda('u1', 'Folhaviva');
    await criarGuilda('u3', 'Floresta Negra');
    await entrar(a, 'u2');
    expect((await listarGuildasParaJogador('')).map((g) => [g.nome, g.quantidadeMembros, g.lider])).toEqual([['Folhaviva', 2, 'Aragorn'], ['Floresta Negra', 1, 'Celeborn']]);
    expect((await listarGuildasParaJogador('flo')).map((g) => g.nome)).toEqual(['Floresta Negra']);
    await expect(listarGuildasParaJogador('f')).rejects.toBeInstanceOf(ErroDeGuilda);
    expect((await getPublicCharacterByName('Boromir', 'u1'))?.guilda).toBe('Folhaviva');
    expect((await getPublicCharacterByName('Elrond', 'u1'))?.guilda).toBeUndefined();
  });

  describe('rotas', () => {
    it('401 sem login', async () => {
      expect((await guildaGet(new NextRequest('http://t/api/guilda'))).status).toBe(401);
      expect((await guildasGet(new NextRequest('http://t/api/guildas'))).status).toBe(401);
    });

    it('POST faz a ação e devolve o estado; erro de regra vira 400/409', async () => {
      const res = await guildaPost(req('/api/guilda', 'u1', { acao: 'criar', nome: 'Folhaviva' }));
      expect(res.status).toBe(200);
      const corpo = await res.json();
      expect(corpo.mensagem).toMatch(/foi criada/);
      expect(corpo.estado.minha.nome).toBe('Folhaviva');
      expect((await guildaPost(req('/api/guilda', 'u1', { acao: 'criar', nome: 'Outra' }))).status).toBe(409);
      expect((await guildaPost(req('/api/guilda', 'u1', { acao: 'voar' }))).status).toBe(400);
    });

    it('GET da guilda, da lista e da página pública', async () => {
      const id = await criarGuilda();
      expect((await (await guildaGet(req('/api/guilda', 'u1'))).json()).minha.meuCargo).toBe('lider');
      expect((await (await guildasGet(req('/api/guildas', 'u2'))).json()).guildas).toHaveLength(1);
      const pub = await guildaPublicaGet(req(`/api/guildas/${id}`, 'u2'), { params: Promise.resolve({ id }) });
      expect((await pub.json()).guilda.membros).toEqual([{ nome: 'Aragorn', cargo: 'lider' }]);
      expect((await guildaPublicaGet(req('/api/guildas/g_naoexiste22', 'u2'), { params: Promise.resolve({ id: 'g_naoexiste22' }) })).status).toBe(404);
    });
  });
});

describe('Níveis e Quadro de contratos (7.3)', () => {
  const FORTE = { vigor: 400, sorte: 0, forca: 300, vitalidade: 100, arcano: 0, inteligencia: 0, agilidade: 50 };
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDeSistemas();
    limparCacheDasGuildas();
    for (const [uid, nome] of Object.entries(NOMES)) {
      await createCharacter(uid, { nome, racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
      await updateCharacter(uid, { nivel: 12, ouro: 6000, atributos: FORTE });
    }
  });

  it('a guilda começa Emergente com 8 vagas', async () => {
    const id = await criarGuilda();
    const e = await estadoDaGuilda('u1');
    expect(e.minha!.nivel).toMatchObject({ nivel: 1, nome: 'Emergente', maxMembros: 8 });
    expect((await verGuilda(id)).maxMembros).toBe(8);
  });

  it('abrir a guilda gera os 3 contratos do dia uma vez só', async () => {
    await criarGuilda();
    const a = await estadoDaGuilda('u1');
    expect(a.contratos.map((c) => c.tipo)).toEqual(['derrotar', 'entregar', 'vencer']);
    const b = await estadoDaGuilda('u1');
    expect(b.contratos).toEqual(a.contratos);
    expect((await estadoDaGuilda('u2')).contratos).toEqual([]);
  });

  it('vitórias na Caçada contam; entregar dá ouro e material e soma XP à guilda e ao membro', async () => {
    const id = await criarGuilda();
    const derrotar = (await estadoDaGuilda('u1')).contratos[0];
    expect((await erro(agir('u1', 'entregarContrato', { contratoId: 'c1' })))?.message).toMatch(/ainda não está pronto/);
    let vitorias = 0;
    for (let seed = 1; vitorias < derrotar.quantidade && seed < 60; seed++) {
      const r = await executarCacada('u1', derrotar.alvo, { seed, combateId: `contrato-teste-${seed}` });
      if (r.resultado.vencedor === 'personagem') vitorias++;
    }
    const pronto = (await estadoDaGuilda('u1')).contratos[0];
    expect(pronto).toMatchObject({ feito: derrotar.quantidade, pronto: true });
    expect((await estadoDaGuilda('u1')).contratos[2].feito).toBeGreaterThanOrEqual(Math.min(vitorias, 5));
    const ouroAntes = (await getCharacterByUid('u1'))!.ouro;
    const { mensagem } = await agir('u1', 'entregarContrato', { contratoId: 'c1' });
    expect(mensagem).toMatch(/Contrato entregue/);
    const depois = (await getCharacterByUid('u1'))!;
    expect(depois.ouro).toBe(ouroAntes + derrotar.recompensa.ouro);
    for (const m of derrotar.recompensa.materiais) expect(depois.inventario?.[m.id]).toBeGreaterThanOrEqual(m.qtd);
    const g = (await repositorio.lerGuilda(id))!;
    expect(g.xp).toBe(33);
    expect(g.membros[0].xpContribuido).toBe(33);
    expect((await erro(agir('u1', 'entregarContrato', { contratoId: 'c1' })))?.message).toMatch(/já foi entregue/);
  });

  it('o contrato de entregar tira os materiais da mochila', async () => {
    await criarGuilda();
    const entregar = (await estadoDaGuilda('u1')).contratos[1];
    await updateCharacter('u1', { inventario: { [entregar.alvo]: entregar.quantidade + 2 } });
    await agir('u1', 'entregarContrato', { contratoId: 'c2' });
    expect((await getCharacterByUid('u1'))!.inventario?.[entregar.alvo]).toBe(2);
  });

  it('XP suficiente sobe a guilda de nível e abre mais vagas; contratos de outro dia não entregam', async () => {
    const id = await criarGuilda();
    await estadoDaGuilda('u1');
    const g = (await repositorio.lerGuilda(id))!;
    await repositorio.executarTransacao('t', async (ctx) => ctx.gravarGuilda({ ...g, xp: 2490 }));
    const entregar = (await estadoDaGuilda('u1')).contratos[1];
    await updateCharacter('u1', { inventario: { [entregar.alvo]: entregar.quantidade } });
    const { mensagem } = await agir('u1', 'entregarContrato', { contratoId: 'c2' });
    expect(mensagem).toMatch(/subiu para Reconhecida/);
    expect((await estadoDaGuilda('u1')).minha!.maxMembros).toBe(10);
    const c = (await getCharacterByUid('u1'))!.contratos!;
    await updateCharacter('u1', { contratos: { ...c, dia: '2000-01-01' } });
    expect((await erro(agir('u1', 'entregarContrato', { contratoId: 'c3' })))?.message).toMatch(/já venceram/);
  });
});

describe('Incursões e Pesquisa (7.3)', () => {
  const MEDIO = { vigor: 30, sorte: 3, forca: 26, vitalidade: 3, arcano: 0, inteligencia: 0, agilidade: 1 };
  const FORTE = { vigor: 400, sorte: 0, forca: 300, vitalidade: 100, arcano: 0, inteligencia: 0, agilidade: 50 };
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDeSistemas();
    limparCacheDasGuildas();
    for (const [uid, nome] of Object.entries(NOMES)) {
      await createCharacter(uid, { nome, racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
      await updateCharacter(uid, { nivel: 12, ouro: 300000, atributos: MEDIO });
    }
  });
  const darXp = async (id: string, xp: number, extra: Record<string, unknown> = {}) => {
    const g = (await repositorio.lerGuilda(id))!;
    await repositorio.executarTransacao('t', async (ctx) => ctx.gravarGuilda({ ...g, xp, ...extra }));
  };

  it('Incursões só abrem em Reconhecida', async () => {
    const id = await criarGuilda();
    expect((await erro(lutarIncursao('u1', REGRAS_PADRAO_DE_GUILDA, 1)))?.message).toMatch(/Reconhecida/);
    expect((await estadoDaGuilda('u1')).minha!.incursao.liberada).toBe(false);
    await darXp(id, 2500);
    expect((await estadoDaGuilda('u1')).minha!.incursao).toMatchObject({ liberada: true, nivel: 1, dificuldade: 'Iniciante', minhasLutasHoje: 0 });
  });

  it('o dano entra na vida global, sem cura entre lutas, e são 3 lutas por dia', async () => {
    const id = await criarGuilda();
    await entrar(id, 'u2');
    await darXp(id, 2500);
    await lutarIncursao('u1', REGRAS_PADRAO_DE_GUILDA, 11);
    const a = (await repositorio.lerGuilda(id))!.incursao!;
    expect(a.hp).toBeLessThan(a.hpMax);
    await lutarIncursao('u2', REGRAS_PADRAO_DE_GUILDA, 12);
    const b = (await repositorio.lerGuilda(id))!.incursao!;
    expect(b.hp).toBeLessThan(a.hp);
    expect(b.participantes.map((p) => [p.nome, p.lutas])).toEqual([['Aragorn', 1], ['Boromir', 1]]);
    await lutarIncursao('u1', REGRAS_PADRAO_DE_GUILDA, 13);
    await lutarIncursao('u1', REGRAS_PADRAO_DE_GUILDA, 14);
    expect((await erro(lutarIncursao('u1', REGRAS_PADRAO_DE_GUILDA, 15)))?.message).toMatch(/3 lutas/);
    const e = (await estadoDaGuilda('u1')).minha!.incursao;
    expect(e.minhasLutasHoje).toBe(3);
    expect(e.participantes[0].lutas + e.participantes[1].lutas).toBe(4);
  });

  it('chefe derrotado: quem lutou e ainda está na guilda recebe; a guilda ganha XP e passa ao próximo nível', async () => {
    const id = await criarGuilda();
    await entrar(id, 'u2');
    await darXp(id, 2500, { incursao: { nivel: 1, hpMax: 999999, hp: 1, participantes: [{ uid: 'u2', nome: 'Boromir', dano: 500, lutas: 1 }, { uid: 'u5', nome: 'Elrond', dano: 100, lutas: 1 }] } });
    const antes1 = (await getCharacterByUid('u1'))!;
    const antes2 = (await getCharacterByUid('u2'))!;
    const antes5 = (await getCharacterByUid('u5'))!;
    const { mensagem } = await lutarIncursao('u1', REGRAS_PADRAO_DE_GUILDA, 21);
    expect(mensagem).toMatch(/foi derrotado/);
    const g = (await repositorio.lerGuilda(id))!;
    expect(g.xp).toBe(2600);
    expect(g.incursao).toMatchObject({ nivel: 2, participantes: [], ultima: { nivel: 1, dificuldade: 'Iniciante' } });
    expect(g.incursao!.hp).toBe(g.incursao!.hpMax);
    const depois1 = (await getCharacterByUid('u1'))!;
    const depois2 = (await getCharacterByUid('u2'))!;
    expect(depois1.ouro).toBeGreaterThan(antes1.ouro);
    expect(depois2.ouro - antes2.ouro).toBeGreaterThan(depois1.ouro - antes1.ouro);
    expect(depois2.diamantes).toBe((antes2.diamantes ?? 0) + 2);
    expect(depois2.xpAtual + depois2.nivel * 1e6).toBeGreaterThan(antes2.xpAtual + antes2.nivel * 1e6);
    expect(Object.values(depois2.inventario ?? {}).reduce((a, b) => a + b, 0)).toBe(1);
    expect((await getCharacterByUid('u5'))!.ouro).toBe(antes5.ouro);
    // Alma: no máximo 1 carta por participante, e só para quem lutou
    expect((await getCharacterByUid('u5'))!.cartasItens).toBeUndefined();
    expect((depois1.cartasItens ?? []).length).toBeLessThanOrEqual(1);
    expect((depois2.cartasItens ?? []).length).toBeLessThanOrEqual(1);
  });

  it('Pesquisa: abre em Respeitada; doações enchem as barras e o ramo sobe; o bônus vai para todos os membros', async () => {
    const id = await criarGuilda();
    await entrar(id, 'u2');
    expect((await erro(agir('u1', 'doarPesquisa', { ramo: 'xp', ouro: 100 })))?.message).toMatch(/Respeitada/);
    await darXp(id, 7500);
    await agir('u1', 'doarPesquisa', { ramo: 'xp', ouro: 5000 });
    let ramo = (await estadoDaGuilda('u1')).minha!.pesquisa.ramos.find((r) => r.id === 'xp')!;
    expect(ramo).toMatchObject({ nivel: 0, ouro: 2000, materiais: 0, custo: { ouro: 2000, materiais: 30 } });
    expect((await getCharacterByUid('u1'))!.ouro).toBe(300000 - 5000 - 2000);
    expect((await erro(agir('u1', 'doarPesquisa', { ramo: 'xp', ouro: 10 })))?.message).toMatch(/barra já está cheia/);
    expect((await erro(agir('u2', 'doarPesquisa', { ramo: 'xp', materiais: { 'pelo-de-rato': 5 } })))?.message).toMatch(/não tem/);
    await updateCharacter('u2', { inventario: { 'pelo-de-rato': 40 } });
    const { mensagem } = await agir('u2', 'doarPesquisa', { ramo: 'xp', materiais: { 'pelo-de-rato': 40 } });
    expect(mensagem).toMatch(/subiu para o nível 1/);
    expect((await getCharacterByUid('u2'))!.inventario?.['pelo-de-rato']).toBe(10);
    ramo = (await estadoDaGuilda('u1')).minha!.pesquisa.ramos.find((r) => r.id === 'xp')!;
    expect(ramo).toMatchObject({ nivel: 1, bonus: 1, ouro: 0, materiais: 0 });
    for (const uid of ['u1', 'u2']) expect((await getCharacterByUid(uid))!.bonusDeGuilda).toEqual({ xp: 1, ouro: 0, materiais: 0 });
    await entrar(id, 'u3');
    expect((await getCharacterByUid('u3'))!.bonusDeGuilda).toEqual({ xp: 1, ouro: 0, materiais: 0 });
    await agir('u3', 'sair');
    expect((await getCharacterByUid('u3'))!.bonusDeGuilda).toBeUndefined();
  });

  it('o bônus da Pesquisa entra nas lutas', async () => {
    await updateCharacter('u1', { atributos: FORTE, bonusDeGuilda: { xp: 10, ouro: 10, materiais: 0 } });
    const r = await executarCacada('u1', 'rato-da-floresta', { seed: 3, combateId: 'pesquisa-bonus-1' });
    expect(r.resultado.vencedor).toBe('personagem');
    expect(r.resultado.mensagens.join(' ') + r.mensagens.join(' ')).toMatch(/Pesquisa da guilda/);
  });
});

describe('Chefe de guildas (7.3)', () => {
  const MEDIO = { vigor: 120, sorte: 3, forca: 90, vitalidade: 30, arcano: 0, inteligencia: 0, agilidade: 30 };
  const QUARTA = new Date('2026-10-21T15:00:00Z');
  const SEGUNDA_SEGUINTE = new Date('2026-10-26T15:00:00Z');
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDeSistemas();
    limparCacheDasGuildas();
    limparCacheDoChefeSemanal();
    for (const [uid, nome] of Object.entries(NOMES)) {
      await createCharacter(uid, { nome, racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
      await updateCharacter(uid, { nivel: 12, ouro: 6000, atributos: MEDIO });
    }
  });
  const subir = async (id: string) => {
    const g = (await repositorio.lerGuilda(id))!;
    await repositorio.executarTransacao('t', async (ctx) => ctx.gravarGuilda({ ...g, xp: 15500 }));
  };

  it('abre em Prestigiada; vale o maior dano de cada membro e o total da guilda é a soma', async () => {
    const id = await criarGuilda();
    await entrar(id, 'u2');
    expect((await erro(lutarChefeSemanal('u1', REGRAS_PADRAO_DE_GUILDA, 1, QUARTA)))?.message).toMatch(/Prestigiada/);
    await subir(id);
    await lutarChefeSemanal('u1', REGRAS_PADRAO_DE_GUILDA, 1, QUARTA);
    await lutarChefeSemanal('u1', REGRAS_PADRAO_DE_GUILDA, 2, QUARTA);
    await lutarChefeSemanal('u2', REGRAS_PADRAO_DE_GUILDA, 3, QUARTA);
    const e = (await repositorio.lerEntradaChefeSemanal('2026-10-19', id))!;
    expect(e.membros.u1.dano).toBeGreaterThan(0);
    expect(e.total).toBe(e.membros.u1.dano + e.membros.u2.dano);
    expect((await getCharacterByUid('u1'))!.chefeSemanal).toEqual([{ semana: '2026-10-19', guildaId: id }]);
  });

  it('ranking entre guildas e resgate pela posição final, só depois da semana', async () => {
    const a = await criarGuilda('u1', 'Folhaviva');
    const b = await criarGuilda('u3', 'Lorien');
    await entrar(a, 'u2');
    await subir(a);
    await subir(b);
    await repositorio.executarTransacao('t', async (ctx) => {
      ctx.gravarEntradaChefeSemanal({ semana: '2026-10-19', guildaId: a, nomeDaGuilda: 'Folhaviva', total: 900, membros: { u1: { nome: 'Aragorn', dano: 500 }, u2: { nome: 'Boromir', dano: 400 } } });
      ctx.gravarEntradaChefeSemanal({ semana: '2026-10-19', guildaId: b, nomeDaGuilda: 'Lorien', total: 300, membros: { u3: { nome: 'Celeborn', dano: 300 } } });
    });
    for (const uid of ['u1', 'u2']) await updateCharacter(uid, { chefeSemanal: [{ semana: '2026-10-19', guildaId: a }] });
    await updateCharacter('u3', { chefeSemanal: [{ semana: '2026-10-19', guildaId: b }] });
    expect((await erro(agir('u1', 'resgatarChefeSemanal', { semana: '2026-10-19' })))?.message).toBeTruthy();
    expect((await erro(resgatarChefeSemanal('u1', '2026-10-19', QUARTA)))?.message).toMatch(/ainda não acabou/);
    const ouro1 = (await getCharacterByUid('u1'))!.ouro;
    const { mensagem } = await resgatarChefeSemanal('u1', '2026-10-19', SEGUNDA_SEGUINTE);
    expect(mensagem).toMatch(/1º/);
    const d1 = (await getCharacterByUid('u1'))!;
    expect(d1.ouro).toBe(ouro1 + 20000);
    expect(d1.emblemasItens).toHaveLength(2);
    // Alma: o 1º lugar leva 1 carta mítica
    expect(d1.cartasItens).toHaveLength(1);
    expect(TIPO_DE_CARTA_MAP[d1.cartasItens![0].tipo].raridade).toBe('mitico');
    expect((await repositorio.lerGuilda(a))!.xp).toBe(15500 + 3000);
    await resgatarChefeSemanal('u2', '2026-10-19', SEGUNDA_SEGUINTE);
    expect((await repositorio.lerGuilda(a))!.xp).toBe(15500 + 3000);
    expect((await getCharacterByUid('u2'))!.emblemasItens).toHaveLength(2);
    expect((await erro(resgatarChefeSemanal('u1', '2026-10-19', SEGUNDA_SEGUINTE)))?.message).toMatch(/já resgatou/);
    await resgatarChefeSemanal('u3', '2026-10-19', SEGUNDA_SEGUINTE);
    expect((await getCharacterByUid('u3'))!.emblemasItens).toHaveLength(1);
    expect(TIPO_DE_CARTA_MAP[(await getCharacterByUid('u3'))!.cartasItens![0].tipo].raridade).toBe('lendario');
    expect((await erro(resgatarChefeSemanal('u4', '2026-10-19', SEGUNDA_SEGUINTE)))?.status).toBe(404);
  });

  it('quem saiu da guilda não resgata', async () => {
    const a = await criarGuilda();
    await entrar(a, 'u2');
    await subir(a);
    await repositorio.executarTransacao('t', async (ctx) => ctx.gravarEntradaChefeSemanal({ semana: '2026-10-19', guildaId: a, nomeDaGuilda: 'Folhaviva', total: 10, membros: { u2: { nome: 'Boromir', dano: 10 } } }));
    await updateCharacter('u2', { chefeSemanal: [{ semana: '2026-10-19', guildaId: a }] });
    await agir('u2', 'sair');
    expect((await erro(resgatarChefeSemanal('u2', '2026-10-19', SEGUNDA_SEGUINTE)))?.status).toBe(404);
  });

  it('a tela mostra o chefe, o melhor do jogador, a posição e o top', async () => {
    const id = await criarGuilda();
    await subir(id);
    await lutarChefeSemanal('u1', REGRAS_PADRAO_DE_GUILDA, 5);
    const c = (await estadoDaGuilda('u1')).minha!.chefeSemanal;
    expect(c.liberado).toBe(true);
    expect(c.meuMelhor).toBeGreaterThan(0);
    expect(c.posicao).toBe(1);
    expect(c.top).toEqual([{ posicao: 1, nome: 'Folhaviva', total: c.totalDaGuilda, minha: true }]);
    expect(c.chefe).toMatch(/Chefe Semanal/);
  });
});
