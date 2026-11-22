import { describe, it, expect, beforeEach } from 'vitest';
import { limparCacheRevogacao } from '@/server/auth';
import { createCharacter, getCharacterByUid } from '@/server/characterService';
import { agirNoCorreio, enviarMensagemDoMestre, limparCacheDoCorreio } from '@/server/correio';
import { DONOS_DO_PROJETO, type SessaoMestre } from '@/server/mestre';
import { limparCacheDeSancoes } from '@/server/sancoes';
import { limparCacheDeSistemas } from '@/server/sistemasLeitura';
import { MATERIAIS_MUNDO } from '@/rules/materiaisArmas';
import { materiaisDeMundoEm, MAXIMO_DE_MATERIAIS_POR_PEDIDO } from '@/rules/ajustes';
import { resetCharacterStore } from '@/test/repositorioMemoria';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
const dono: SessaoMestre = { uid: DONOS_DO_PROJETO[0], email: 'dono@test.com', papel: 'dono', origem: 'ambiente' };

describe('Correio do Mestre: 400 de cada material de mundo para todos', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDeSancoes();
    limparCacheDeSistemas();
    limparCacheDoCorreio();
    for (const uid of ['p1', 'p2']) await createCharacter(uid, { nome: `Jogador_${uid}`, racaId: 'humano', classeId: 'barbaro', pontos: PONTOS });
  });

  it('o pacote tem os 35 materiais de mundo, todos com 400, e cabe no limite de um pedido', () => {
    const pacote = materiaisDeMundoEm(400);
    expect(Object.keys(pacote)).toHaveLength(MATERIAIS_MUNDO.length);
    expect(MATERIAIS_MUNDO.length).toBeLessThanOrEqual(MAXIMO_DE_MATERIAIS_POR_PEDIDO);
    expect(Object.values(pacote).every((q) => q === 400)).toBe(true);
  });

  it('uma mensagem "para todos" com o pacote entrega 400 de cada material a quem resgata, uma vez só por jogador', async () => {
    const { id } = await enviarMensagemDoMestre(dono, { destino: 'todos', titulo: 'Materiais de mundo', texto: '400 de cada, enquanto a campanha não abre.', materiais: materiaisDeMundoEm(400) });
    for (const uid of ['p1', 'p2']) {
      await agirNoCorreio(uid, 'resgatar', { id });
      const c = (await getCharacterByUid(uid))!;
      for (const m of MATERIAIS_MUNDO) expect(c.inventario?.[m.id], `${uid} ${m.id}`).toBe(400);
      await expect(agirNoCorreio(uid, 'resgatar', { id })).rejects.toThrow();
      expect((await getCharacterByUid(uid))!.inventario?.[MATERIAIS_MUNDO[0].id]).toBe(400);
    }
  });

  it('um material que não existe, ou uma quantidade fora do limite, é recusado', async () => {
    await expect(enviarMensagemDoMestre(dono, { destino: 'todos', titulo: 'Teste', texto: 'Teste', materiais: { 'mundo-inexistente': 400 } })).rejects.toThrow('desconhecido');
    await expect(enviarMensagemDoMestre(dono, { destino: 'todos', titulo: 'Teste', texto: 'Teste', materiais: { 'mundo-osso-bruto': 5000 } })).rejects.toThrow();
  });
});
