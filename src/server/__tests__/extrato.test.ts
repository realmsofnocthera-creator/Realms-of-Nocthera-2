import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { limparCacheRevogacao } from '@/server/auth';
import { agirNaAlma, entregarCartas } from '@/server/almas';
import { carregarPersonagem, createCharacter, executarCombate, getCharacterByUid, salvarPersonagem, updateCharacter, type CharacterDocument, type TransactionDocument } from '@/server/characterService';
import { conferirExtrato, fecharExtrato, saldosDoExtrato } from '@/server/extrato';
import { ajustarJogador, buscarJogador } from '@/server/jogadores';
import { DONOS_DO_PROJETO, type SessaoMestre } from '@/server/mestre';
import { repositorio } from '@/server/persistencia';
import { tiposDaRaridadeDeCarta } from '@/rules/almas';
import { getTransactionsByUid, resetCharacterStore } from '@/test/repositorioMemoria';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
const FORTE = { vigor: 300, sorte: 0, forca: 300, vitalidade: 100, arcano: 0, inteligencia: 0, agilidade: 50 };
const dono: SessaoMestre = { uid: 'dono1', email: 'dono1@test.com', papel: 'dono', origem: 'ambiente' };
const linha = (extra: Partial<TransactionDocument>): TransactionDocument => ({ uid: 'u1', tipo: 'ganho', quantidade: 10, moeda: 'ouro', motivo: 'x', timestamp: '2026-10-24T10:00:00.000Z', ...extra });
const char = (extra: Partial<CharacterDocument>) => ({ uid: 'u1', ouro: 0, diamantes: 0, ...extra }) as CharacterDocument;
const carta = (id: string) => ({ id, tipo: 't', efeitos: [], despertar: 0 });

describe('Ledger da economia (6.5-3): fechamento do extrato', () => {
  it('cada linha ganha o saldo antes e depois, na ordem; a operação fica registrada', () => {
    const antes = char({ ouro: 100 });
    const depois = char({ ouro: 130, diamantes: 5 });
    const r = fecharExtrato('combate', new Map([['u1', antes]]), new Map([['u1', depois]]), [linha({ quantidade: 50 }), linha({ tipo: 'perda', quantidade: 20 }), linha({ moeda: 'diamantes', quantidade: 5 })]);
    expect(r.divergencias).toEqual([]);
    expect(r.transacoes.map((t) => [t.moeda, t.saldoAntes, t.saldoDepois, t.operacao, t.ordem])).toEqual([
      ['ouro', 100, 150, 'combate', 0],
      ['ouro', 150, 130, 'combate', 1],
      ['diamantes', 0, 5, 'combate', 2],
    ]);
  });

  it('cartas e emblemas que entram ou saem viram linhas sozinhas, com a quantidade de itens como saldo', () => {
    const antes = char({ cartasItens: [carta('a'), carta('b'), carta('c')] });
    const depois = char({ cartasItens: [carta('c'), carta('d')], emblemasItens: [{ id: 'e1' } as never] });
    const r = fecharExtrato('alma:despertar', new Map([['u1', antes]]), new Map([['u1', depois]]), []);
    expect(r.divergencias).toEqual([]);
    expect(r.transacoes.map((t) => [t.moeda, t.tipo, t.quantidade, t.saldoAntes, t.saldoDepois, t.motivo])).toEqual([
      ['cartas', 'perda', 2, 3, 1, 'Despertar carta: 2 cartas'],
      ['cartas', 'ganho', 1, 1, 2, 'Despertar carta: 1 carta'],
      ['emblemas', 'ganho', 1, 0, 1, 'Despertar carta: 1 emblema'],
    ]);
  });

  it('fragmentos de subclasse: o saldo é por subclasse', () => {
    const antes = char({ fragmentosSubclasse: { berserker: 4 } });
    const depois = char({ fragmentosSubclasse: { berserker: 1, colosso: 2 } });
    const r = fecharExtrato(
      'x',
      new Map([['u1', antes]]),
      new Map([['u1', depois]]),
      [linha({ moeda: 'fragmentosSubclasse', chave: 'berserker', tipo: 'perda', quantidade: 3 }), linha({ moeda: 'fragmentosSubclasse', chave: 'colosso', quantidade: 2 })]
    );
    expect(r.divergencias).toEqual([]);
    expect(r.transacoes.map((t) => [t.chave, t.saldoAntes, t.saldoDepois])).toEqual([
      ['berserker', 4, 1],
      ['colosso', 0, 2],
    ]);
  });

  it('moeda mexida sem registro: a divergência aparece e uma linha "sem registro" acerta o saldo', () => {
    const r = fecharExtrato('qualquer', new Map([['u1', char({ ouro: 100 })]]), new Map([['u1', char({ ouro: 175 })]]), [linha({ quantidade: 25 })]);
    expect(r.divergencias).toEqual([{ uid: 'u1', chave: 'ouro', esperado: 125, real: 175 }]);
    expect(r.transacoes.at(-1)).toMatchObject({ moeda: 'ouro', tipo: 'ganho', quantidade: 50, saldoAntes: 125, saldoDepois: 175, semRegistro: true, motivo: 'Ajuste sem registro (qualquer)' });
  });

  it('a conferência acha salto entre linhas, saldo que não bate e linha sem registro', () => {
    const c = char({ ouro: 300 });
    const boas = [linha({ saldoAntes: 0, saldoDepois: 100, timestamp: '2026-10-24T10:00:00.000Z' }), linha({ saldoAntes: 100, saldoDepois: 300, quantidade: 200, timestamp: '2026-10-24T11:00:00.000Z' })];
    expect(conferirExtrato(c, boas)).toEqual({ confere: true, linhasConferidas: 2, semRegistro: 0, problemas: [] });
    // linhas antigas (sem saldo) ficam de fora
    expect(conferirExtrato(c, [...boas, linha({ timestamp: '2026-01-01T00:00:00.000Z' })]).confere).toBe(true);
    const salto = conferirExtrato(c, [boas[0], { ...boas[1], saldoAntes: 120, quantidade: 180 }]);
    expect(salto.problemas.map((p) => p.descricao)).toEqual([expect.stringMatching(/terminou em 100 e esta começa em 120/)]);
    const editado = conferirExtrato(char({ ouro: 999 }), boas);
    expect(editado.problemas).toEqual([{ chave: 'ouro', descricao: 'O saldo atual é 999, mas o extrato termina em 300.' }]);
    expect(conferirExtrato(c, [...boas, linha({ semRegistro: true, timestamp: '2026-10-24T12:00:00.000Z', saldoAntes: 300, saldoDepois: 300, quantidade: 0 })])).toMatchObject({ confere: false, semRegistro: 1 });
  });

  it('saldos acompanhados', () => {
    expect(saldosDoExtrato(null)).toEqual({});
    expect(saldosDoExtrato(char({ ouro: 5, fragmentosSubclasse: { colosso: 2, berserker: 0 }, cartasItens: [carta('a')] }))).toMatchObject({ ouro: 5, 'fragmentosSubclasse:colosso': 2, cartas: 1, emblemas: 0 });
  });
});

describe('Ledger da economia (6.5-3): no servidor', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    (DONOS_DO_PROJETO as string[]).length = 0;
    process.env.MESTRE_DONO_UIDS = 'dono1';
    resetCharacterStore();
    limparCacheRevogacao();
    await createCharacter('u1', { nome: 'Aragorn', racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
    await updateCharacter('u1', { nivel: 25, atributos: FORTE, ouro: 1000 });
  });
  afterEach(() => {
    delete process.env.MESTRE_DONO_UIDS;
    delete process.env.EXTRATO_SO_AVISA;
  });

  it('a vitória registra o ouro com o saldo antes e depois', async () => {
    const r = await executarCombate('u1', 'rato-da-peste', { seed: 7 });
    expect(r.resultado.vencedor).toBe('personagem');
    const t = getTransactionsByUid('u1').at(-1)!;
    const ouro = (await getCharacterByUid('u1'))!.ouro;
    expect(t).toMatchObject({ moeda: 'ouro', tipo: 'ganho', saldoAntes: 1000, saldoDepois: ouro, operacao: 'combate' });
  });

  it('destruir cartas entra no extrato como perda de cartas', async () => {
    const c = (await getCharacterByUid('u1'))!;
    const tipo = tiposDaRaridadeDeCarta('comum')[0].id;
    const entrega = entregarCartas(c, [tipo, tipo, tipo], 3);
    await updateCharacter('u1', entrega.patch);
    await agirNaAlma('u1', 'destruir', { ids: entrega.criadas.slice(0, 2).map((x) => x.id) });
    expect(getTransactionsByUid('u1').at(-1)).toMatchObject({ moeda: 'cartas', tipo: 'perda', quantidade: 2, saldoAntes: 3, saldoDepois: 1, motivo: 'Destruir cartas: 2 cartas' });
  });

  it('nos testes, mexer em moeda sem extrato falha e não grava nada', async () => {
    const mexer = () =>
      repositorio.executarTransacao('codigo-com-defeito', async (ctx) => {
        const c = await carregarPersonagem(ctx, 'u1');
        return salvarPersonagem(ctx, c, { diamantes: (c.diamantes ?? 0) + 50 });
      });
    await expect(mexer()).rejects.toThrow(/Extrato: "diamantes" de u1 mudou sem registro em "codigo-com-defeito"/);
    expect((await getCharacterByUid('u1'))!.diamantes ?? 0).toBe(0);
    // em produção não trava: grava a linha "sem registro", e a ficha do Mestre mostra que não confere
    process.env.EXTRATO_SO_AVISA = '1';
    await mexer();
    expect(getTransactionsByUid('u1').at(-1)).toMatchObject({ moeda: 'diamantes', quantidade: 50, semRegistro: true });
    const ficha = await buscarJogador(dono, 'u1');
    expect(ficha.conferenciaDoExtrato).toMatchObject({ confere: false, semRegistro: 1 });
  });

  it('a ficha do Mestre confere o extrato e aponta saldo mudado por fora', async () => {
    await ajustarJogador(dono, 'u1', { campos: { diamantes: 30 }, motivo: 'teste do extrato' });
    expect((await buscarJogador(dono, 'u1')).conferenciaDoExtrato).toMatchObject({ confere: true, problemas: [] });
    // como uma edição direta no banco: o saldo muda e o extrato não acompanha
    await updateCharacter('u1', { diamantes: 999 });
    const f = await buscarJogador(dono, 'u1');
    expect(f.conferenciaDoExtrato.confere).toBe(false);
    expect(f.conferenciaDoExtrato.problemas).toEqual([{ chave: 'diamantes', descricao: 'O saldo atual é 999, mas o extrato termina em 30.' }]);
  });
});
