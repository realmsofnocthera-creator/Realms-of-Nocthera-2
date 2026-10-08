import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createCharacter,
  getCharacterByUid,
  updateCharacter,
  distribuirPontos,
  resetarAtributos,
  escolherSubclasse,
} from '../characterService';
import { getTransactionsByUid, resetCharacterStore, setTestPersistenceFailHook } from '../../test/repositorioMemoria';
import { GAME_CONFIG } from '../../rules/config';
import { obterSubclasse } from '../../game/subclasses';
import { tokenDeTeste } from '../../test/firebaseAdminMock';

describe('ORDEM 44 — Desbloqueio e Troca de Subclasse (Servidor)', () => {
  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    setTestPersistenceFailHook(null);
    vi.restoreAllMocks();
  });

  async function setupPersonagem(uid: string, classeId = 'barbaro', overrides: Record<string, unknown> = {}) {
    await createCharacter(uid, {
      nome: 'Guerreiro_' + uid,
      racaId: 'humano',
      classeId,
      pontos: {
        vigor: 5,
        mente: 0,
        forca: 5,
        vitalidade: 0,
        arcano: 0,
        inteligencia: 0,
        agilidade: 0,
      },
    });

    return await updateCharacter(uid, {
      nivel: 20,
      ouro: 15000,
      fragmentosAlma: 10,
      diamantes: 200,
      ...overrides,
    });
  }

  it('(a) primeiro desbloqueio com requisitos ok: cobra exatamente 10000 de ouro e 5 fragmentos, soma os 40 pontos nos atributos finais, define subclasseAtualId, bonusSubclasseAplicado e subclasseTiers[id] = 0, e grava transações de ouro e de fragmentos', async () => {
    const charInicial = await setupPersonagem('user_sub_a');
    const atributosAntes = { ...charInicial.atributos };

    const berserker = obterSubclasse('berserker')!;
    const charApos = await escolherSubclasse('user_sub_a', 'berserker');

    // Cobrança
    expect(charApos.ouro).toBe(15000 - GAME_CONFIG.SUBCLASSE_CUSTO_OURO); // 5000
    expect(charApos.fragmentosAlma).toBe(10 - GAME_CONFIG.SUBCLASSE_CUSTO_FRAGMENTOS_ALMA); // 5

    // Atributos somados
    expect(charApos.atributos.forca).toBe(atributosAntes.forca + berserker.bonusAtributos.forca);
    expect(charApos.atributos.vigor).toBe(atributosAntes.vigor + berserker.bonusAtributos.vigor);
    expect(charApos.atributos.agilidade).toBe(atributosAntes.agilidade + berserker.bonusAtributos.agilidade);

    // Identificadores e tiers
    expect(charApos.subclasseAtualId).toBe('berserker');
    expect(charApos.bonusSubclasseAplicado).toEqual(berserker.bonusAtributos);
    expect(charApos.subclasseTiers?.['berserker']).toBe(0);

    // Transações registradas
    const txs = getTransactionsByUid('user_sub_a');
    const txOuro = txs.find(
      (t) => t.tipo === 'perda' && t.moeda === 'ouro' && t.motivo === 'Desbloqueio de subclasse'
    );
    const txFragmentos = txs.find(
      (t) => t.tipo === 'perda' && t.moeda === 'fragmentosAlma' && t.motivo === 'Desbloqueio de subclasse'
    );

    expect(txOuro).toBeDefined();
    expect(txOuro?.quantidade).toBe(10000);

    expect(txFragmentos).toBeDefined();
    expect(txFragmentos?.quantidade).toBe(5);
  });

  it('(b) requisitos insuficientes (um teste por motivo: nível, ouro, fragmentos): lança a mensagem certa e NÃO altera ouro, fragmentos nem atributos', async () => {
    // 1. Nível insuficiente (< 20)
    await setupPersonagem('user_sub_b1', 'barbaro', { nivel: 19 });
    const snap1 = await getCharacterByUid('user_sub_b1');

    await expect(escolherSubclasse('user_sub_b1', 'berserker')).rejects.toThrow('Nível insuficiente');

    const depois1 = await getCharacterByUid('user_sub_b1');
    expect(depois1?.ouro).toBe(snap1?.ouro);
    expect(depois1?.fragmentosAlma).toBe(snap1?.fragmentosAlma);
    expect(depois1?.atributos).toEqual(snap1?.atributos);

    // 2. Ouro insuficiente (< 10000)
    await setupPersonagem('user_sub_b2', 'barbaro', { ouro: 9999 });
    const snap2 = await getCharacterByUid('user_sub_b2');

    await expect(escolherSubclasse('user_sub_b2', 'berserker')).rejects.toThrow('Ouro insuficiente');

    const depois2 = await getCharacterByUid('user_sub_b2');
    expect(depois2?.ouro).toBe(9999);
    expect(depois2?.fragmentosAlma).toBe(snap2?.fragmentosAlma);
    expect(depois2?.atributos).toEqual(snap2?.atributos);

    // 3. Fragmentos de alma insuficientes (< 5)
    await setupPersonagem('user_sub_b3', 'barbaro', { fragmentosAlma: 4 });
    const snap3 = await getCharacterByUid('user_sub_b3');

    await expect(escolherSubclasse('user_sub_b3', 'berserker')).rejects.toThrow(
      'Fragmentos de alma insuficientes'
    );

    const depois3 = await getCharacterByUid('user_sub_b3');
    expect(depois3?.ouro).toBe(snap3?.ouro);
    expect(depois3?.fragmentosAlma).toBe(4);
    expect(depois3?.atributos).toEqual(snap3?.atributos);
  });

  it('(c) subclasse de outra classe → "Subclasse inválida", nada cobrado; mesma subclasse já ativa → "Subclasse já ativa"', async () => {
    await setupPersonagem('user_sub_c', 'barbaro');
    const snapAntes = await getCharacterByUid('user_sub_c');

    // Subclasse de feiticeiro tentada por bárbaro
    await expect(escolherSubclasse('user_sub_c', 'arquimago')).rejects.toThrow('Subclasse inválida');

    // Subclasse inexistente
    await expect(escolherSubclasse('user_sub_c', 'inexistente_xyz')).rejects.toThrow('Subclasse inválida');

    // Tipo inválido
    await expect(escolherSubclasse('user_sub_c', 123)).rejects.toThrow('Subclasse inválida');

    const snapAposFalhas = await getCharacterByUid('user_sub_c');
    expect(snapAposFalhas?.ouro).toBe(snapAntes?.ouro);
    expect(snapAposFalhas?.fragmentosAlma).toBe(snapAntes?.fragmentosAlma);

    // Desbloqueia berserker com sucesso
    await escolherSubclasse('user_sub_c', 'berserker');
    const snapAtivo = await getCharacterByUid('user_sub_c');
    const ouroAposDesbloqueio = snapAtivo?.ouro;

    // Tenta ativar berserker novamente
    await expect(escolherSubclasse('user_sub_c', 'berserker')).rejects.toThrow('Subclasse já ativa');

    const snapFinal = await getCharacterByUid('user_sub_c');
    expect(snapFinal?.ouro).toBe(ouroAposDesbloqueio);
    expect(snapFinal?.subclasseAtualId).toBe('berserker');
  });

  it('(d) troca: cobra só 100 diamantes (ouro e fragmentos intactos), remove o bônus antigo e aplica o novo (atributos finais corretos), tier da nova começa em 0', async () => {
    await setupPersonagem('user_sub_d', 'barbaro');
    const charBase = await getCharacterByUid('user_sub_d');
    const atributosBase = { ...charBase!.atributos };

    // 1º desbloqueio: Berserker
    await escolherSubclasse('user_sub_d', 'berserker');
    const charBerserker = (await getCharacterByUid('user_sub_d'))!;
    const ouroAposDesbloqueio = charBerserker.ouro;
    const fragmentosAposDesbloqueio = charBerserker.fragmentosAlma;
    const diamantesAntesTroca = charBerserker.diamantes!;

    const colosso = obterSubclasse('colosso')!;

    // Troca para Colosso
    const charColosso = await escolherSubclasse('user_sub_d', 'colosso');

    // Diamantes cobrados, ouro e fragmentos intactos
    expect(charColosso.diamantes).toBe(diamantesAntesTroca - GAME_CONFIG.SUBCLASSE_CUSTO_TROCA_DIAMANTES);
    expect(charColosso.ouro).toBe(ouroAposDesbloqueio);
    expect(charColosso.fragmentosAlma).toBe(fragmentosAposDesbloqueio);

    // Atributos: retirou Berserker (+20 for, +12 vig, +8 agi) e somou Colosso (+6 for, +18 vig, +16 vit)
    expect(charColosso.atributos.forca).toBe(atributosBase.forca + colosso.bonusAtributos.forca);
    expect(charColosso.atributos.vigor).toBe(atributosBase.vigor + colosso.bonusAtributos.vigor);
    expect(charColosso.atributos.vitalidade).toBe(atributosBase.vitalidade + colosso.bonusAtributos.vitalidade);
    expect(charColosso.atributos.agilidade).toBe(atributosBase.agilidade + colosso.bonusAtributos.agilidade);

    // Subclasse atual e tiers
    expect(charColosso.subclasseAtualId).toBe('colosso');
    expect(charColosso.bonusSubclasseAplicado).toEqual(colosso.bonusAtributos);
    expect(charColosso.subclasseTiers?.['colosso']).toBe(0);

    // Transação de troca
    const txs = getTransactionsByUid('user_sub_d');
    const txTroca = txs.find(
      (t) => t.tipo === 'perda' && t.moeda === 'diamantes' && t.motivo === 'Troca de subclasse'
    );
    expect(txTroca).toBeDefined();
    expect(txTroca?.quantidade).toBe(100);
  });

  it('(e) troca de volta para uma subclasse já usada mantém o tier dela (ex.: coloque subclasseTiers[a] = 2, troque para b e volte para a: tier 2)', async () => {
    await setupPersonagem('user_sub_e', 'barbaro');
    await escolherSubclasse('user_sub_e', 'berserker');

    // Simula evolução da subclasse berserker para tier 2
    await updateCharacter('user_sub_e', {
      subclasseTiers: { berserker: 2 },
    });

    // Troca para colosso
    await escolherSubclasse('user_sub_e', 'colosso');
    const charColosso = (await getCharacterByUid('user_sub_e'))!;
    expect(charColosso.subclasseTiers?.['berserker']).toBe(2);
    expect(charColosso.subclasseTiers?.['colosso']).toBe(0);

    // Troca de volta para berserker
    await updateCharacter('user_sub_e', { diamantes: 300 }); // garante saldo
    await escolherSubclasse('user_sub_e', 'berserker');

    const charVolta = (await getCharacterByUid('user_sub_e'))!;
    expect(charVolta.subclasseAtualId).toBe('berserker');
    expect(charVolta.subclasseTiers?.['berserker']).toBe(2);
    expect(charVolta.subclasseTiers?.['colosso']).toBe(0);
  });

  it('(f) troca sem diamantes suficientes: lança "Diamantes insuficientes" e não altera nada', async () => {
    await setupPersonagem('user_sub_f', 'barbaro');
    await escolherSubclasse('user_sub_f', 'berserker');

    // Deixa saldo de diamantes abaixo de 100
    await updateCharacter('user_sub_f', { diamantes: 50 });
    const snapAntes = (await getCharacterByUid('user_sub_f'))!;

    await expect(escolherSubclasse('user_sub_f', 'colosso')).rejects.toThrow('Diamantes insuficientes');

    const snapDepois = (await getCharacterByUid('user_sub_f'))!;
    expect(snapDepois.diamantes).toBe(50);
    expect(snapDepois.subclasseAtualId).toBe('berserker');
    expect(snapDepois.atributos).toEqual(snapAntes.atributos);
  });

  it('(g) 0.5-C2: se o commit falhar, ouro, fragmentos e diamantes ficam intactos (desbloqueio e troca)', async () => {
    // 1. Primeiro desbloqueio
    await setupPersonagem('user_sub_g1', 'barbaro');
    const txAntesG1 = getTransactionsByUid('user_sub_g1').length;

    setTestPersistenceFailHook((operacao) => {
      if (operacao === 'escolherSubclasse') {
        throw new Error('Falha simulada na gravação da subclasse');
      }
    });

    await expect(escolherSubclasse('user_sub_g1', 'berserker')).rejects.toThrow(
      'Falha simulada na gravação da subclasse'
    );
    setTestPersistenceFailHook(null);

    const charG1 = (await getCharacterByUid('user_sub_g1'))!;
    expect(charG1.ouro).toBe(15000);
    expect(charG1.fragmentosAlma).toBe(10);
    expect(charG1.subclasseAtualId).toBeNull();
    expect(getTransactionsByUid('user_sub_g1').length).toBe(txAntesG1);

    // 2. Troca de subclasse
    await setupPersonagem('user_sub_g2', 'barbaro');
    await escolherSubclasse('user_sub_g2', 'berserker');
    const diamantesAntesG2 = (await getCharacterByUid('user_sub_g2'))!.diamantes!;
    const txAntesG2 = getTransactionsByUid('user_sub_g2').length;

    setTestPersistenceFailHook((operacao) => {
      if (operacao === 'escolherSubclasse') {
        throw new Error('Falha simulada na troca de subclasse');
      }
    });

    await expect(escolherSubclasse('user_sub_g2', 'colosso')).rejects.toThrow(
      'Falha simulada na troca de subclasse'
    );
    setTestPersistenceFailHook(null);

    const charG2 = (await getCharacterByUid('user_sub_g2'))!;
    expect(charG2.diamantes).toBe(diamantesAntesG2);
    expect(charG2.subclasseAtualId).toBe('berserker');
    expect(getTransactionsByUid('user_sub_g2').length).toBe(txAntesG2);
  });

  it('(h) duas chamadas simultâneas (Promise.all) com a mesma subclasse no primeiro desbloqueio: uma tem sucesso e a outra falha com "Subclasse já ativa", cobrando UMA vez só', async () => {
    await setupPersonagem('user_sub_h', 'barbaro');

    const [res1, res2] = await Promise.allSettled([
      escolherSubclasse('user_sub_h', 'berserker'),
      escolherSubclasse('user_sub_h', 'berserker'),
    ]);

    const statusList = [res1.status, res2.status];
    expect(statusList).toContain('fulfilled');
    expect(statusList).toContain('rejected');

    const rejeitado = res1.status === 'rejected' ? res1 : (res2 as PromiseRejectedResult);
    expect(rejeitado.reason?.message).toBe('Subclasse já ativa');

    const charFinal = (await getCharacterByUid('user_sub_h'))!;
    expect(charFinal.ouro).toBe(15000 - GAME_CONFIG.SUBCLASSE_CUSTO_OURO); // Cobrou só uma vez (10000)
    expect(charFinal.fragmentosAlma).toBe(10 - GAME_CONFIG.SUBCLASSE_CUSTO_FRAGMENTOS_ALMA); // Cobrou só uma vez (5)
    expect(charFinal.subclasseAtualId).toBe('berserker');
  });

  it('(i) reset de atributos depois de escolher subclasse NÃO remove o bônus da subclasse (só os pontos alocados por nível)', async () => {
    await setupPersonagem('user_sub_i', 'barbaro');
    const charBase = (await getCharacterByUid('user_sub_i'))!;
    const atributosBase = { ...charBase.atributos };

    // Desbloqueia berserker (+20 for, +12 vig, +8 agi)
    await escolherSubclasse('user_sub_i', 'berserker');
    const berserker = obterSubclasse('berserker')!;

    // Concede 6 pontos de atributo e aloca 4 em força e 2 em vigor
    await updateCharacter('user_sub_i', { pontosDisponiveis: 6 });
    await distribuirPontos('user_sub_i', { forca: 4, vigor: 2 });

    const charAntesReset = (await getCharacterByUid('user_sub_i'))!;
    expect(charAntesReset.atributos.forca).toBe(
      atributosBase.forca + berserker.bonusAtributos.forca + 4
    );
    expect(charAntesReset.atributos.vigor).toBe(
      atributosBase.vigor + berserker.bonusAtributos.vigor + 2
    );
    expect(charAntesReset.pontosDisponiveis).toBe(0);

    // Garante diamantes para o reset
    await updateCharacter('user_sub_i', { diamantes: 200 });

    // Executa reset de atributos
    const charAposReset = await resetarAtributos('user_sub_i');

    // Devolveu os 6 pontos alocados
    expect(charAposReset.pontosDisponiveis).toBe(6);
    expect(charAposReset.pontosAlocadosPorNivel).toEqual({
      vigor: 0,
      mente: 0,
      forca: 0,
      vitalidade: 0,
      arcano: 0,
      inteligencia: 0,
      agilidade: 0,
    });

    // O bônus da subclasse PERMANECE integralmente aplicado nos atributos
    expect(charAposReset.atributos.forca).toBe(atributosBase.forca + berserker.bonusAtributos.forca);
    expect(charAposReset.atributos.vigor).toBe(atributosBase.vigor + berserker.bonusAtributos.vigor);
    expect(charAposReset.atributos.agilidade).toBe(
      atributosBase.agilidade + berserker.bonusAtributos.agilidade
    );

    // Identificador e bônus da subclasse continuam ativos
    expect(charAposReset.subclasseAtualId).toBe('berserker');
    expect(charAposReset.bonusSubclasseAplicado).toEqual(berserker.bonusAtributos);
  });

  describe('Rota POST /api/character/subclasse/escolher', () => {
    it('deve retornar 401 quando não autenticado', async () => {
      const { POST } = await import('../../app/api/character/subclasse/escolher/route');
      const req = new Request('http://localhost:3000/api/character/subclasse/escolher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subclasseId: 'berserker' }),
      });

      const res = await POST(req as any);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain('Não autorizado');
    });

    it('deve retornar 400 com mensagem exata para erro de regra', async () => {
      const { POST } = await import('../../app/api/character/subclasse/escolher/route');

      await setupPersonagem('user_route_err', 'barbaro', { nivel: 19 });
      const token = tokenDeTeste('user_route_err');

      const req = new Request('http://localhost:3000/api/character/subclasse/escolher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subclasseId: 'berserker' }),
      });

      const res = await POST(req as any);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Nível insuficiente');
    });

    it('deve retornar 200 com { character } no sucesso', async () => {
      const { POST } = await import('../../app/api/character/subclasse/escolher/route');

      await setupPersonagem('user_route_ok', 'barbaro');
      const token = tokenDeTeste('user_route_ok');

      const req = new Request('http://localhost:3000/api/character/subclasse/escolher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subclasseId: 'berserker' }),
      });

      const res = await POST(req as any);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.character).toBeDefined();
      expect(data.character.subclasseAtualId).toBe('berserker');
    });
  });
});
