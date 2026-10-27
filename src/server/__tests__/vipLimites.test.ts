import { describe, it, expect, beforeEach } from 'vitest';
import { criarCarta, CARTAS_MAXIMAS, TIPOS_DE_CARTA } from '@/rules/almas';
import { guardarCartas } from '@/game/almas';
import { conferirEntradaBatalha, diaDeBrasilia, tentativasRestantes } from '@/game/batalhaSangrenta';
import { conferirEntradaGuerreiro, gastarTentativaDoGuerreiro, tentativaDisponivel } from '@/game/guerreiro';
import { planejarFabricacao, MAX_ARMAS_POR_PERSONAGEM, type ArmaPersonagem } from '@/game/forja';
import { chavesGratisRestantes, chavesDisponiveis, gastarChave, CHAVES_GRATIS_POR_DIA } from '@/rules/testeEquipe';
import { CATEGORIAS_ARMA } from '@/rules/armas';
import { espacosExtrasDoVip, NIVEIS_DO_VIP, tentativaExtraDoVip } from '@/rules/vip';
import { createCharacter, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { estadoDoCorreio, limparCacheDoCorreio, agirNoCorreio } from '@/server/correio';
import { entregarItem } from '@/server/mercado';
import { repositorio } from '@/server/persistencia';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { limparCacheDeSistemas } from '@/server/sistemasLeitura';
import { limparCacheDeSancoes } from '@/server/sancoes';
import { limparCacheRevogacao } from '@/server/auth';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
const VIP = (nivel: number) => NIVEIS_DO_VIP[nivel].gastoCentavos;
const AGORA = new Date('2026-10-27T15:00:00.000Z');

describe('VIP (8.5): mochila e tentativas extras', () => {
  it('o +20 da mochila vale do VIP 3 em diante, e só ele', () => {
    expect([0, 1, 2].map((n) => espacosExtrasDoVip(VIP(n)))).toEqual([0, 0, 0]);
    expect([3, 4, 10].map((n) => espacosExtrasDoVip(VIP(n)))).toEqual([20, 20, 20]);
    expect(espacosExtrasDoVip(undefined)).toBe(0);
  });

  it('as cartas: o que passa do limite vira cacos, e com o VIP 3 cabem 20 a mais', () => {
    const sorteio = () => 0.5;
    const tipo = TIPOS_DE_CARTA[0].id;
    const cheio = Array.from({ length: CARTAS_MAXIMAS }, (_, i) => criarCarta(`x${i}`, tipo, sorteio));
    const sem = guardarCartas(cheio, [criarCarta('n1', tipo, sorteio)]);
    expect(sem.itens).toHaveLength(CARTAS_MAXIMAS);
    expect(sem.cacosDoExcesso).toBeGreaterThan(0);
    const com = guardarCartas(cheio, [criarCarta('n1', tipo, sorteio)], 20);
    expect(com.itens).toHaveLength(CARTAS_MAXIMAS + 1);
    expect(com.cacosDoExcesso).toBe(0);
  });

  it('a Batalha Sangrenta ganha 1 tentativa a partir do VIP 5', () => {
    const hoje = diaDeBrasilia(AGORA);
    const gastas3 = { dia: hoje, tentativas: 3 };
    expect(tentativaExtraDoVip(VIP(4), 'batalhaSangrenta')).toBe(0);
    expect(tentativaExtraDoVip(VIP(5), 'batalhaSangrenta')).toBe(1);
    expect(tentativasRestantes(gastas3, AGORA)).toBe(0);
    expect(tentativasRestantes(gastas3, AGORA, 1)).toBe(1);
    expect(conferirEntradaBatalha('facil', 25, gastas3, [], AGORA)).toMatchObject({ ok: false, motivo: 'semTentativas' });
    expect(conferirEntradaBatalha('facil', 25, gastas3, [], AGORA, 1)).toMatchObject({ ok: true });
    expect(tentativasRestantes({ dia: '2026-10-26', tentativas: 3 }, AGORA, 1)).toBe(4); // dia novo: zera
  });

  it('o Guerreiro ganha 1 tentativa extra por dificuldade a partir do VIP 2', () => {
    expect(tentativaExtraDoVip(VIP(1), 'guerreiro')).toBe(0);
    expect(tentativaExtraDoVip(VIP(2), 'guerreiro')).toBe(1);
    const hoje = diaDeBrasilia(AGORA);
    // sem VIP: 1 por dia por chefe
    let t: Record<string, string> | undefined;
    expect(tentativaDisponivel(t, 1, AGORA)).toBe(true);
    let r = gastarTentativaDoGuerreiro(t, undefined, 1, AGORA);
    expect(r.guerreiroTentativas).toEqual({ '1': hoje });
    expect(r.guerreiroExtras).toBeUndefined();
    t = r.guerreiroTentativas;
    expect(tentativaDisponivel(t, 1, AGORA)).toBe(false);
    // com VIP: a segunda do dia é a extra, a terceira não
    const extra = (usadas?: Record<string, string>) => ({ permitida: true, usadas });
    expect(tentativaDisponivel(t, 1, AGORA, extra())).toBe(true);
    expect(conferirEntradaGuerreiro(1, 25, t, [], AGORA)).toMatchObject({ ok: false, motivo: 'semTentativa' });
    expect(conferirEntradaGuerreiro(1, 25, t, [], AGORA, extra())).toMatchObject({ ok: true });
    r = gastarTentativaDoGuerreiro(t, undefined, 1, AGORA);
    expect(r.guerreiroTentativas).toEqual({ '1': hoje });
    expect(r.guerreiroExtras).toEqual({ '1': hoje });
    expect(tentativaDisponivel(r.guerreiroTentativas, 1, AGORA, extra(r.guerreiroExtras))).toBe(false);
    // outra dificuldade segue com a tentativa normal; e no dia seguinte tudo volta
    expect(tentativaDisponivel(r.guerreiroTentativas, 2, AGORA, extra(r.guerreiroExtras))).toBe(true);
    const amanha = new Date(AGORA.getTime() + 86_400_000);
    expect(tentativaDisponivel(r.guerreiroTentativas, 1, amanha, extra(r.guerreiroExtras))).toBe(true);
    // sem direito ao extra, a marca antiga não vale nada
    expect(tentativaDisponivel(r.guerreiroTentativas, 1, AGORA, { permitida: false, usadas: undefined })).toBe(false);
  });

  it('o Teste de Equipe ganha 1 chave grátis por dia a partir do VIP 6', () => {
    expect(tentativaExtraDoVip(VIP(5), 'testeEquipe')).toBe(0);
    expect(tentativaExtraDoVip(VIP(6), 'testeEquipe')).toBe(1);
    const usou3 = { dia: '2026-10-27', gratisUsadas: CHAVES_GRATIS_POR_DIA, compradasHoje: 0, guardadas: 0 };
    expect(chavesGratisRestantes(usou3)).toBe(0);
    expect(chavesGratisRestantes(usou3, 1)).toBe(1);
    expect(chavesDisponiveis(usou3)).toBe(0);
    expect(chavesDisponiveis(usou3, 1)).toBe(1);
    expect(gastarChave(usou3)).toBeNull();
    expect(gastarChave(usou3, 1)).toMatchObject({ gratisUsadas: CHAVES_GRATIS_POR_DIA + 1 });
    expect(gastarChave({ ...usou3, guardadas: 2 })).toMatchObject({ guardadas: 1 });
  });
});

describe('VIP (8.5): mochila no servidor', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDeSancoes();
    limparCacheDeSistemas();
    limparCacheDoCorreio();
    await createCharacter('u1', { nome: 'Aldric', racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
  });

  const armas = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `a${i}`, baseId: 'ferro-de-cacada', categoria: CATEGORIAS_ARMA[0].id }) as unknown as ArmaPersonagem);

  it('item que não cabe vai pelo Correio, e com o VIP 3 cabem 20 a mais', async () => {
    await updateCharacter('u1', { armas: armas(MAX_ARMAS_POR_PERSONAGEM) });
    const doc = (await repositorio.lerPersonagem('u1'))!;
    const nova = armas(1)[0];
    expect(entregarItem(null as never, doc, { tipo: 'arma', arma: nova as never }, 'teste').pelaCaixa).toEqual({ armas: [nova] });
    const vip = { ...doc, gastoReal: VIP(3) };
    const r = entregarItem(null as never, vip, { tipo: 'arma', arma: nova as never }, 'teste');
    expect(r.pelaCaixa).toBeUndefined();
    expect(r.patch.armas).toHaveLength(MAX_ARMAS_POR_PERSONAGEM + 1);
  });

  it('o Correio só recusa o presente quando passa do limite do jogador', async () => {
    await updateCharacter('u1', { armas: armas(MAX_ARMAS_POR_PERSONAGEM) });
    const msg = { titulo: 'Arma', texto: 'arma', de: 'Mestre', presente: { armas: armas(1).map((a) => ({ ...a, id: 'nova' })) } };
    const enviar = async () => {
      const eu = (await getCharacterByUid('u1'))!;
      const agora = new Date();
      await repositorio.executarTransacao('correio:mestre', async (ctx) => {
        const c = await ctx.lerPersonagem('u1');
        ctx.gravarPersonagem({ ...c!, correio: [{ id: 'm' + Math.random(), criadaEm: agora.toISOString(), expiraEm: new Date(agora.getTime() + 86_400_000).toISOString(), ...msg } as never] });
      });
      void eu;
      limparCacheDoCorreio();
      return (await estadoDoCorreio('u1')).mensagens[0].id;
    };
    const id = await enviar();
    await expect(agirNoCorreio('u1', 'resgatar', { id })).rejects.toThrow(/armas estão cheias \(200\)/);
    await updateCharacter('u1', { gastoReal: VIP(3) });
    await expect(agirNoCorreio('u1', 'resgatar', { id })).resolves.toMatchObject({ mensagem: 'Presente resgatado!' });
    expect((await getCharacterByUid('u1'))!.armas).toHaveLength(MAX_ARMAS_POR_PERSONAGEM + 1);
  });

  it('o planejamento da forja respeita o limite com e sem VIP', () => {
    const estado = { inventario: {}, ouro: 0, armas: armas(MAX_ARMAS_POR_PERSONAGEM) };
    const pedido = { baseId: 'ferro-de-cacada', categoria: CATEGORIAS_ARMA[0].id } as never;
    const amb = { aleatorio: () => 0.5, novoId: () => 'n', agora: AGORA.toISOString() } as never;
    const r = planejarFabricacao(estado, pedido, amb);
    expect(r).toMatchObject({ ok: false, motivo: 'limiteDeArmas' });
    const r2 = planejarFabricacao({ ...estado, espacosExtras: 20 }, pedido, amb);
    expect(r2).not.toMatchObject({ motivo: 'limiteDeArmas' });
  });
});
