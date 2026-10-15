import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as eu } from '@/app/api/mestre/eu/route';
import { GET as listarPapeis, POST as conceder, DELETE as revogar } from '@/app/api/mestre/papeis/route';
import { GET as lerLog } from '@/app/api/mestre/log/route';
import { limparCacheRevogacao } from '@/server/auth';
import { createCharacter } from '@/server/characterService';
import { repositorio } from '@/server/persistencia';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

/** As rotas /api/mestre/*: 401 sem login, 403 sem o papel certo (decidido no servidor) e o fluxo do Dono. */
describe('Rotas do Painel do Mestre', () => {
  const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
  let ipSeq = 0;

  const pedido = (url: string, uid: string | null, metodo = 'GET', corpo?: unknown) =>
    new NextRequest(`http://localhost${url}`, {
      method: metodo,
      headers: {
        ...(uid ? { authorization: `Bearer ${tokenDeTeste(uid)}` } : {}),
        'content-type': 'application/json',
        // cada pedido de um IP diferente: o limite por IP não atrapalha os testes
        'x-forwarded-for': `10.0.0.${++ipSeq % 250}`,
      },
      ...(corpo !== undefined ? { body: JSON.stringify(corpo) } : {}),
    });

  async function jogador(uid: string) {
    await createCharacter(uid, { nome: 'Jogador_' + uid, racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
  }

  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    process.env.MESTRE_DONO_UIDS = 'dono1';
    resetCharacterStore();
    limparCacheRevogacao();
  });
  afterEach(() => {
    delete process.env.MESTRE_DONO_UIDS;
  });

  it('/eu: 401 sem login; 403 com o uid para quem não tem papel; 200 com papel e permissões para o Dono', async () => {
    expect((await eu(pedido('/api/mestre/eu', null))).status).toBe(401);

    const negado = await eu(pedido('/api/mestre/eu', 'estranho'));
    expect(negado.status).toBe(403);
    expect(await negado.json()).toMatchObject({ uid: 'estranho' });

    const ok = await eu(pedido('/api/mestre/eu', 'dono1'));
    expect(ok.status).toBe(200);
    const dados = await ok.json();
    expect(dados).toMatchObject({ uid: 'dono1', papel: 'dono', nomeDoPapel: 'Dono', origem: 'ambiente' });
    expect(dados.permissoes).toContain('papeis.gerir');
  });

  it('/papeis e /log: 401 sem login e 403 sem papel, antes de qualquer leitura', async () => {
    for (const [nome, rota] of [['papeis', listarPapeis], ['log', lerLog]] as const) {
      expect((await rota(pedido(`/api/mestre/${nome}`, null))).status, `${nome} sem login`).toBe(401);
      expect((await rota(pedido(`/api/mestre/${nome}`, 'estranho'))).status, `${nome} sem papel`).toBe(403);
    }
  });

  it('um Mestre lê o log mas não gere papéis: 403 em listar, conceder e remover', async () => {
    await jogador('m1');
    await jogador('j1');
    await repositorio.gravarPapelMestre({ uid: 'm1', papel: 'mestre', concedidoPor: 'dono1', concedidoEm: '2026-10-15T00:00:00.000Z', motivo: 'teste' });
    expect((await lerLog(pedido('/api/mestre/log', 'm1'))).status).toBe(200);
    expect((await listarPapeis(pedido('/api/mestre/papeis', 'm1'))).status).toBe(403);
    expect((await conceder(pedido('/api/mestre/papeis', 'm1', 'POST', { uidAlvo: 'j1', papel: 'suporte', motivo: 'tentativa' }))).status).toBe(403);
    expect((await revogar(pedido('/api/mestre/papeis', 'm1', 'DELETE', { uidAlvo: 'm1', motivo: 'tentativa' }))).status).toBe(403);
    expect(await repositorio.lerPapelMestre('j1')).toBeNull();
  });

  it('o Dono concede, lista, remove e vê tudo no log', async () => {
    await jogador('j2');
    const dado = await conceder(pedido('/api/mestre/papeis', 'dono1', 'POST', { uidAlvo: 'j2', papel: 'moderador', motivo: 'vai moderar' }));
    expect(dado.status).toBe(200);
    expect((await dado.json()).papeis.map((p: { uid: string }) => p.uid)).toEqual(['dono1', 'j2']);

    const lista = await listarPapeis(pedido('/api/mestre/papeis', 'dono1'));
    expect((await lista.json()).papeis).toHaveLength(2);

    const tirou = await revogar(pedido('/api/mestre/papeis', 'dono1', 'DELETE', { uidAlvo: 'j2', motivo: 'saiu da equipe' }));
    expect(tirou.status).toBe(200);
    expect((await tirou.json()).papeis).toHaveLength(1);

    const log = await (await lerLog(pedido('/api/mestre/log?limite=10', 'dono1'))).json();
    expect(log.log.map((e: { acao: string }) => e.acao)).toEqual(['papel.revogar', 'papel.conceder']);
  });

  it('erros de validação voltam como 400 ou 404 com a mensagem, e corpo quebrado vira 400', async () => {
    const semMotivo = await conceder(pedido('/api/mestre/papeis', 'dono1', 'POST', { uidAlvo: 'j3', papel: 'mestre', motivo: '' }));
    expect(semMotivo.status).toBe(400);
    expect((await semMotivo.json()).error).toMatch(/motivo/i);

    const inexistente = await conceder(pedido('/api/mestre/papeis', 'dono1', 'POST', { uidAlvo: 'ninguem', papel: 'mestre', motivo: 'motivo bom' }));
    expect(inexistente.status).toBe(404);

    const quebrado = new NextRequest('http://localhost/api/mestre/papeis', {
      method: 'POST',
      headers: { authorization: `Bearer ${tokenDeTeste('dono1')}`, 'x-forwarded-for': '10.9.9.9' },
      body: '{nao é json',
    });
    expect((await conceder(quebrado)).status).toBe(400);
  });
});
