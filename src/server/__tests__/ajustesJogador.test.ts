import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as ajustar } from '@/app/api/mestre/jogadores/[uid]/ajustes/route';
import { limparCacheRevogacao } from '@/server/auth';
import { createCharacter } from '@/server/characterService';
import { ajustarJogador } from '@/server/jogadores';
import { DONOS_DO_PROJETO, type SessaoMestre } from '@/server/mestre';
import { repositorio } from '@/server/persistencia';
import { limparCacheDeSancoes } from '@/server/sancoes';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';
import { descreverAcao } from '@/lib/mestreTela';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
const sessao = (papel: SessaoMestre['papel'], uid = papel + '1'): SessaoMestre => ({ uid, email: `${uid}@test.com`, papel, origem: papel === 'dono' ? 'ambiente' : 'painel' });
const dono = sessao('dono', 'dono1');

describe('Ajustes do Painel do Mestre (3.5.4.2)', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    (DONOS_DO_PROJETO as string[]).length = 0;
    process.env.MESTRE_DONO_UIDS = 'dono1';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDeSancoes();
    await createCharacter('j1', { nome: 'Aldric', racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
  });
  afterEach(() => {
    delete process.env.MESTRE_DONO_UIDS;
  });

  it('soma moedas, grava transação com o motivo e registra no log antes/depois', async () => {
    const antes = (await repositorio.lerPersonagem('j1'))!;
    const f = await ajustarJogador(dono, 'j1', { campos: { ouro: 500, diamantes: 3 }, motivo: 'Compensação do bug da loja' }, '1.2.3.4');
    expect(f.personagem.ouro).toBe(antes.ouro + 500);
    expect(f.personagem.diamantes).toBe(3);
    expect(f.transacoes.map((t) => t.motivo)).toEqual(expect.arrayContaining(['Ajuste do painel: Compensação do bug da loja']));
    const [e] = await repositorio.listarLogAdmin(1);
    expect(e).toMatchObject({ acao: 'jogador.ajustar', alvo: 'j1', uid: 'dono1', ip: '1.2.3.4', depois: { ouro: 500, diamantes: 3 } });
    expect(descreverAcao(e)).toMatch(/Ajustou j1: ouro \+500, diamantes \+3/);
  });

  it('retirar além do saldo: 400 e nada muda (nem transação)', async () => {
    const antes = (await repositorio.lerPersonagem('j1'))!;
    await expect(ajustarJogador(dono, 'j1', { campos: { ouro: -(antes.ouro + 1) }, motivo: 'Teste de saldo' })).rejects.toMatchObject({ status: 400 });
    expect((await repositorio.lerPersonagem('j1'))!.ouro).toBe(antes.ouro);
    expect((await repositorio.listarTransacoes('j1', 10)).length).toBe(0);
  });

  it('XP sobe de nível como no combate e dá os pontos', async () => {
    const f = await ajustarJogador(dono, 'j1', { campos: { xp: 100_000 }, motivo: 'Recompensa de evento' });
    expect(f.personagem.nivel).toBeGreaterThan(1);
    expect(f.personagem.pontosDisponiveis).toBeGreaterThan(0);
  });

  it('XP negativo é recusado', async () => {
    await expect(ajustarJogador(dono, 'j1', { campos: { xp: -5 }, motivo: 'Teste de xp' })).rejects.toMatchObject({ status: 400 });
  });

  it('materiais: soma, subtrai e remove a entrada em zero; desconhecido e saldo negativo são recusados', async () => {
    await ajustarJogador(dono, 'j1', { materiais: { 'pelo-de-rato': 5 }, motivo: 'Reposição de drop' });
    expect((await repositorio.lerPersonagem('j1'))!.inventario).toMatchObject({ 'pelo-de-rato': 5 });
    await ajustarJogador(dono, 'j1', { materiais: { 'pelo-de-rato': -5 }, motivo: 'Retirada indevida' });
    expect((await repositorio.lerPersonagem('j1'))!.inventario?.['pelo-de-rato']).toBeUndefined();
    await expect(ajustarJogador(dono, 'j1', { materiais: { 'pelo-de-rato': -1 }, motivo: 'Teste de saldo' })).rejects.toMatchObject({ status: 400 });
    await expect(ajustarJogador(dono, 'j1', { materiais: { inventado: 1 }, motivo: 'Teste de id' })).rejects.toMatchObject({ status: 400 });
  });

  it('validações: sem valor, campo estranho, não inteiro, acima do limite, motivo curto, jogador inexistente', async () => {
    const m = 'Motivo válido';
    await expect(ajustarJogador(dono, 'j1', { campos: {}, motivo: m })).rejects.toMatchObject({ status: 400 });
    await expect(ajustarJogador(dono, 'j1', { campos: { nivel: 99 }, motivo: m })).rejects.toMatchObject({ status: 400 });
    await expect(ajustarJogador(dono, 'j1', { campos: { ouro: 1.5 }, motivo: m })).rejects.toMatchObject({ status: 400 });
    await expect(ajustarJogador(dono, 'j1', { campos: { ouro: 2_000_000 }, motivo: m })).rejects.toMatchObject({ status: 400 });
    await expect(ajustarJogador(dono, 'j1', { campos: { ouro: 5 }, motivo: 'oi' })).rejects.toMatchObject({ status: 400 });
    await expect(ajustarJogador(dono, 'nadie', { campos: { ouro: 5 }, motivo: m })).rejects.toMatchObject({ status: 404 });
  });

  it('só o Dono ajusta: mestre, moderador e suporte recebem 403 e nada muda', async () => {
    for (const p of ['mestre', 'moderador', 'suporte'] as const) {
      await expect(ajustarJogador(sessao(p), 'j1', { campos: { ouro: 5 }, motivo: 'Tentativa indevida' })).rejects.toMatchObject({ status: 403 });
    }
    expect(await repositorio.listarLogAdmin(5)).toHaveLength(0);
  });

  it('rota: Dono ajusta (200); quem não tem papel recebe 403', async () => {
    const req = (uid: string) => new NextRequest('http://t/api/mestre/jogadores/j1/ajustes', {
      method: 'POST',
      headers: { authorization: `Bearer ${tokenDeTeste(uid)}`, 'content-type': 'application/json' },
      body: JSON.stringify({ campos: { diamantes: 2 }, motivo: 'Pelo painel' }),
    });
    const ctx = { params: Promise.resolve({ uid: 'j1' }) };
    expect((await ajustar(req('dono1'), ctx)).status).toBe(200);
    expect((await ajustar(req('j1'), ctx)).status).toBe(403);
  });
});
