import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as colecionaveisPost } from '@/app/api/colecionaveis/route';
import { POST as conquistasPost } from '@/app/api/conquistas/route';
import { POST as correioPost } from '@/app/api/correio/route';
import { POST as diarioPost } from '@/app/api/diario/route';
import { POST as expedicaoPost } from '@/app/api/expedicao/route';
import { limparCacheRevogacao } from '@/server/auth';
import { createCharacter, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { enviarMensagemDoMestre, limparCacheDoCorreio } from '@/server/correio';
import { agirNoDiario } from '@/server/diario';
import { DONOS_DO_PROJETO, type SessaoMestre } from '@/server/mestre';
import { limparCacheDeSancoes } from '@/server/sancoes';
import { limparCacheDeSistemas } from '@/server/sistemasLeitura';
import { getTransactionsByUid, resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

/**
 * Testes adversariais (6.5-8): reenvio da mesma requisição, requisições simultâneas e corpo manipulado. Em todos,
 * o que vale é o que o servidor decide; nada do corpo vira valor de moeda.
 */

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
const dono: SessaoMestre = { uid: 'dono1', email: 'dono1@test.com', papel: 'dono', origem: 'ambiente' };
let ip = 0;
const post = (rota: string, uid: string, corpo: unknown) =>
  new NextRequest(`http://t/api/${rota}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${tokenDeTeste(uid)}`, 'content-type': 'application/json', 'x-forwarded-for': `10.0.0.${++ip % 250}` },
    body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
  });
const saldo = async (uid: string) => {
  const c = (await getCharacterByUid(uid))!;
  return { ouro: c.ouro, diamantes: c.diamantes ?? 0, selos: c.selosDeBusca ?? {} };
};

describe('Testes adversariais (6.5-8)', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    (DONOS_DO_PROJETO as string[]).length = 0;
    process.env.MESTRE_DONO_UIDS = 'dono1';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDeSancoes();
    limparCacheDeSistemas();
    limparCacheDoCorreio();
    for (const [uid, nome] of [['a1', 'Aldric'], ['a2', 'Borin']]) {
      await createCharacter(uid, { nome, racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
      await updateCharacter(uid, { nivel: 20, ouro: 1000, selosDeBusca: { desgastado: 30 } });
    }
  });
  afterEach(() => {
    delete process.env.MESTRE_DONO_UIDS;
  });

  describe('reenvio (replay)', () => {
    it('o mesmo Check-in reenviado entrega uma vez só', async () => {
      const primeiro = await diarioPost(post('diario', 'a1', { acao: 'checkin' }));
      expect(primeiro.status).toBe(200);
      const depois = await saldo('a1');
      for (let i = 0; i < 3; i++) expect((await diarioPost(post('diario', 'a1', { acao: 'checkin' }))).status).toBe(400);
      expect(await saldo('a1')).toEqual(depois);
    });

    it('o presente do Correio reenviado sai uma vez só', async () => {
      const { id } = await enviarMensagemDoMestre(dono, { destino: 'a1', titulo: 'Presente', texto: 'Para você.', campos: { diamantes: 7 } });
      expect((await correioPost(post('correio', 'a1', { acao: 'resgatar', id }))).status).toBe(200);
      expect((await correioPost(post('correio', 'a1', { acao: 'resgatar', id }))).status).toBe(400);
      expect((await saldo('a1')).diamantes).toBe(7);
    });

    it('o degrau da conquista reenviado sai uma vez só', async () => {
      // nível 20: 4 degraus da conquista Nível
      expect((await conquistasPost(post('conquistas', 'a1', { acao: 'resgatar', id: 'nivel' }))).status).toBe(200);
      const d = (await saldo('a1')).diamantes;
      expect((await conquistasPost(post('conquistas', 'a1', { acao: 'resgatar', id: 'nivel' }))).status).toBe(400);
      expect((await saldo('a1')).diamantes).toBe(d);
    });
  });

  describe('requisições simultâneas', () => {
    it('cinco Check-ins ao mesmo tempo: só um passa', async () => {
      const r = await Promise.allSettled(Array.from({ length: 5 }, () => agirNoDiario('a1', 'checkin', {})));
      expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
      expect(getTransactionsByUid('a1').filter((t) => t.motivo.startsWith('Check-in'))).toHaveLength(1);
    });

    it('o baú resgatado em paralelo não paga duas vezes', async () => {
      await updateCharacter('a1', { diario: { dia: '2026-10-24', semana: '2026-10-19', hoje: { checkin: 1, vitorias: 5 }, estaSemana: {}, bausDiarios: 0, bausSemanais: 0 } });
      const agora = new Date('2026-10-24T15:00:00.000Z');
      const r = await Promise.allSettled(Array.from({ length: 4 }, () => agirNoDiario('a1', 'bau', { tipo: 'diario' }, agora)));
      expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
      expect((await saldo('a1')).diamantes).toBe(2);
    });

    it('o mesmo presente do Correio em paralelo sai uma vez só', async () => {
      const { id } = await enviarMensagemDoMestre(dono, { destino: 'a1', titulo: 'Presente', texto: 'Para você.', campos: { diamantes: 9 } });
      const r = await Promise.all(Array.from({ length: 4 }, () => correioPost(post('correio', 'a1', { acao: 'resgatar', id }))));
      expect(r.filter((x) => x.status === 200)).toHaveLength(1);
      expect((await saldo('a1')).diamantes).toBe(9);
    });
  });

  describe('corpo manipulado', () => {
    it('campos de valor no corpo são ignorados', async () => {
      await updateCharacter('a1', { diario: { dia: '2026-10-24', semana: '2026-10-19', hoje: { checkin: 1, vitorias: 5 }, estaSemana: {}, bausDiarios: 0, bausSemanais: 0 } });
      const antes = await saldo('a1');
      const r = await diarioPost(post('diario', 'a1', { acao: 'checkin', diamantes: 9999, ouro: 9999, dia: 1, recompensa: { diamantes: 500 } }));
      expect([200, 400]).toContain(r.status);
      const depois = await saldo('a1');
      expect(depois.diamantes - antes.diamantes).toBeLessThanOrEqual(25);
      expect(depois.ouro - antes.ouro).toBeLessThanOrEqual(2000);
    });

    it('quantidades fora do permitido são recusadas sem gastar nada', async () => {
      const antes = await saldo('a1');
      for (const vezes of [-10, 0, 3, 10.5, 1e9, '10', null, [10], { valor: 10 }]) {
        const r = await colecionaveisPost(post('colecionaveis', 'a1', { acao: 'buscar', selo: 'desgastado', vezes }));
        expect(r.status, JSON.stringify(vezes)).toBe(400);
      }
      for (const selo of ['origem', '__proto__', 'constructor', 7]) {
        const r = await colecionaveisPost(post('colecionaveis', 'a1', { acao: 'buscar', selo, vezes: 1 }));
        expect(r.status, String(selo)).toBe(400);
      }
      expect(await saldo('a1')).toEqual(antes);
    });

    it('expedição com horas e vagas inválidas não abre nada', async () => {
      for (const corpo of [{ acao: 'enviar', horas: -2 }, { acao: 'enviar', horas: 1e6 }, { acao: 'enviar', horas: '2' }, { acao: 'coletar', vaga: -1 }, { acao: 'coletar', vaga: 99 }]) {
        const r = await expedicaoPost(post('expedicao', 'a1', corpo));
        expect(r.status, JSON.stringify(corpo)).toBeGreaterThanOrEqual(400);
      }
      expect((await getCharacterByUid('a1'))!.expedicoes ?? []).toEqual([]);
    });

    it('não dá para resgatar o presente de outro jogador', async () => {
      const { id } = await enviarMensagemDoMestre(dono, { destino: 'a1', titulo: 'Presente', texto: 'Só do a1.', campos: { diamantes: 5 } });
      expect((await correioPost(post('correio', 'a2', { acao: 'resgatar', id }))).status).toBe(400);
      expect((await saldo('a2')).diamantes).toBe(0);
    });

    it('corpo que não é JSON, JSON quebrado e tipos trocados não derrubam o servidor', async () => {
      for (const corpo of ['isto não é json', '{"acao": ', 'null', '[]', '"checkin"', '{"acao": {"$ne": null}}', '{"__proto__": {"admin": true}, "acao": "bau", "tipo": "diario"}']) {
        const r = await diarioPost(post('diario', 'a2', corpo));
        expect(r.status, corpo).toBe(400);
      }
      expect(({} as Record<string, unknown>).admin).toBeUndefined();
      expect((await saldo('a2')).diamantes).toBe(0);
    });
  });
});
