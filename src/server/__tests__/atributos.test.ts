import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createCharacter,
  getCharacterByUid,
  distribuirPontos,
  resetarAtributos,
  alterarDiamantes,
  updateCharacter,
  applyCombatResult,
} from '@/server/characterService';
import {
  ErroPersistencia,
  getTransactionsByUid,
  resetCharacterStore,
  setTestPersistenceFailHook,
} from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';
import { ResultadoCombate } from '@/game/combat';
import { GAME_CONFIG } from '@/rules/config';

describe('ORDEM 39 — Distribuição de Pontos e Reset de Atributos (Servidor)', () => {
  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    vi.restoreAllMocks();
  });

  it('distribuir 3 pontos em Vigor aumenta atributos.vigor em 3, hpMax em 3 × HP_POR_PONTO_VIGOR, reduz pontosDisponiveis e registra em pontosAlocadosPorNivel', async () => {
    const char = await createCharacter('user_attr_1', {
      nome: 'Valerius',
      racaId: 'humano',
      classeId: 'barbaro',
      pontos: {
        vigor: 5,
        sorte: 0,
        forca: 5,
        vitalidade: 0,
        arcano: 0,
        inteligencia: 0,
        agilidade: 0,
      },
    });

    // Simula concessão de 6 pontos (ex: subiu 2 níveis)
    await updateCharacter('user_attr_1', { pontosDisponiveis: 6 });

    const charAntes = await getCharacterByUid('user_attr_1');
    const vigorAntes = charAntes!.atributos.vigor;
    const hpMaxAntes = charAntes!.hpMax;

    const charDepois = await distribuirPontos('user_attr_1', { vigor: 3 });

    expect(charDepois.atributos.vigor).toBe(vigorAntes + 3);
    expect(charDepois.hpMax).toBe(hpMaxAntes + 3 * GAME_CONFIG.HP_POR_PONTO_VIGOR);
    expect(charDepois.pontosDisponiveis).toBe(3);
    expect(charDepois.pontosAlocadosPorNivel?.vigor).toBe(3);
  });

  it('distribuir pontos em Vitalidade aumenta sobreescudoMax em SOBREESCUDO_POR_PONTO_VITALIDADE por ponto e Sorte aumenta a chance de crítico', async () => {
    await createCharacter('user_attr_2', {
      nome: 'Eldrin',
      racaId: 'elfo',
      classeId: 'feiticeiro',
      pontos: {
        vigor: 2,
        sorte: 5,
        forca: 0,
        vitalidade: 0,
        arcano: 0,
        inteligencia: 3,
        agilidade: 0,
      },
    });

    await updateCharacter('user_attr_2', { pontosDisponiveis: 5 });

    const antes = await getCharacterByUid('user_attr_2');
    const criticoAntes = antes!.chanceCritico!;
    const sobreescudoAntes = antes!.sobreescudoMax;

    const depois = await distribuirPontos('user_attr_2', {
      vitalidade: 2,
      sorte: 3,
    });

    expect(depois.atributos.vitalidade).toBe(antes!.atributos.vitalidade + 2);
    expect(depois.atributos.sorte).toBe(antes!.atributos.sorte + 3);
    expect(depois.sobreescudoMax).toBe(
      sobreescudoAntes + 2 * GAME_CONFIG.SOBREESCUDO_POR_PONTO_VITALIDADE
    );
    expect(depois.chanceCritico).toBeCloseTo(
      criticoAntes + 3 * GAME_CONFIG.CHANCE_CRITICO_POR_PONTO_SORTE,
      4
    );
    expect(depois.pontosDisponiveis).toBe(0);
  });

  it('distribuição inválida não altera nada no personagem', async () => {
    await createCharacter('user_attr_3', {
      nome: 'Kael',
      racaId: 'humano',
      classeId: 'cavaleiro',
      pontos: {
        vigor: 5,
        sorte: 0,
        forca: 2,
        vitalidade: 3,
        arcano: 0,
        inteligencia: 0,
        agilidade: 0,
      },
    });

    await updateCharacter('user_attr_3', { pontosDisponiveis: 3 });

    const snapshotAntes = await getCharacterByUid('user_attr_3');

    await expect(
      distribuirPontos('user_attr_3', { vigor: 5 }) // Excede 3 pontos disponíveis
    ).rejects.toThrow('Pontos insuficientes');

    await expect(
      distribuirPontos('user_attr_3', { carisma: 1 }) // Chave inválida
    ).rejects.toThrow('Distribuição inválida');

    const snapshotDepois = await getCharacterByUid('user_attr_3');
    expect(snapshotDepois).toEqual(snapshotAntes);
  });

  it('reset: devolve só os pontos alocados por nível (os 10 da criação permanecem), custa 100 diamantes e grava transação "perda"', async () => {
    await createCharacter('user_attr_4', {
      nome: 'Thorin',
      racaId: 'anao',
      classeId: 'barbaro',
      pontos: {
        vigor: 5,
        sorte: 0,
        forca: 5,
        vitalidade: 0,
        arcano: 0,
        inteligencia: 0,
        agilidade: 0,
      },
    });

    const charCriado = await getCharacterByUid('user_attr_4');
    const atributosCriacao = { ...charCriado!.atributos };

    // Ganha 150 diamantes e 6 pontos
    await alterarDiamantes('user_attr_4', 150, 'Crédito teste');
    await updateCharacter('user_attr_4', { pontosDisponiveis: 6 });

    // Aloca 6 pontos
    await distribuirPontos('user_attr_4', { vigor: 2, forca: 4 });

    const charAntesReset = await getCharacterByUid('user_attr_4');
    expect(charAntesReset!.atributos.vigor).toBe(atributosCriacao.vigor + 2);
    expect(charAntesReset!.atributos.forca).toBe(atributosCriacao.forca + 4);
    expect(charAntesReset!.pontosDisponiveis).toBe(0);
    expect(charAntesReset!.diamantes).toBe(150);

    // Executa reset
    const charAposReset = await resetarAtributos('user_attr_4');

    expect(charAposReset.atributos).toEqual(atributosCriacao);
    expect(charAposReset.pontosDisponiveis).toBe(6);
    expect(charAposReset.pontosAlocadosPorNivel).toEqual({
      vigor: 0,
      sorte: 0,
      forca: 0,
      vitalidade: 0,
      arcano: 0,
      inteligencia: 0,
      agilidade: 0,
    });
    expect(charAposReset.diamantes).toBe(50); // 150 - 100

    // Verifica transação de reset
    const txs = getTransactionsByUid('user_attr_4');
    const txPerda = txs.find(
      (t) => t.tipo === 'perda' && t.moeda === 'diamantes' && t.motivo === 'Reset de atributos'
    );
    expect(txPerda).toBeDefined();
    expect(txPerda?.quantidade).toBe(100);
  });

  it('reset sem diamantes suficientes lança erro, não altera atributos e não cobra nada', async () => {
    await createCharacter('user_attr_5', {
      nome: 'Gildor',
      racaId: 'elfo',
      classeId: 'feiticeiro',
      pontos: {
        vigor: 2,
        sorte: 5,
        forca: 0,
        vitalidade: 0,
        arcano: 0,
        inteligencia: 3,
        agilidade: 0,
      },
    });

    await alterarDiamantes('user_attr_5', 50, 'Saldo menor que 100');
    await updateCharacter('user_attr_5', { pontosDisponiveis: 3 });
    await distribuirPontos('user_attr_5', { sorte: 3 });

    const snapshotAntes = await getCharacterByUid('user_attr_5');

    await expect(resetarAtributos('user_attr_5')).rejects.toThrow('Diamantes insuficientes');

    const snapshotDepois = await getCharacterByUid('user_attr_5');
    expect(snapshotDepois).toEqual(snapshotAntes);
    expect(snapshotDepois?.diamantes).toBe(50);
  });

  it('reset sem pontos alocados lança erro e NÃO cobra diamantes', async () => {
    await createCharacter('user_attr_6', {
      nome: 'Lyra',
      racaId: 'humano',
      classeId: 'bandido',
      pontos: {
        vigor: 3,
        sorte: 0,
        forca: 2,
        vitalidade: 0,
        arcano: 0,
        inteligencia: 0,
        agilidade: 5,
      },
    });

    await alterarDiamantes('user_attr_6', 200, 'Saldo suficiente');
    const snapshotAntes = await getCharacterByUid('user_attr_6');

    await expect(resetarAtributos('user_attr_6')).rejects.toThrow(
      'Nenhum ponto alocado para resetar'
    );

    const snapshotDepois = await getCharacterByUid('user_attr_6');
    expect(snapshotDepois?.diamantes).toBe(200); // Não cobrou
    expect(snapshotDepois?.atributos).toEqual(snapshotAntes?.atributos);
  });

  it('operações de distribuição e reset nunca alteram o ouro do personagem', async () => {
    await createCharacter('user_attr_7', {
      nome: 'Darek',
      racaId: 'humano',
      classeId: 'cavaleiro',
      pontos: {
        vigor: 5,
        sorte: 0,
        forca: 2,
        vitalidade: 3,
        arcano: 0,
        inteligencia: 0,
        agilidade: 0,
      },
    });

    await updateCharacter('user_attr_7', { ouro: 250, pontosDisponiveis: 3 });
    await alterarDiamantes('user_attr_7', 100, 'Diamantes');

    await distribuirPontos('user_attr_7', { forca: 3 });
    const charDist = await getCharacterByUid('user_attr_7');
    expect(charDist?.ouro).toBe(250);

    await resetarAtributos('user_attr_7');
    const charReset = await getCharacterByUid('user_attr_7');
    expect(charReset?.ouro).toBe(250);
  });

  it('duas distribuições simultâneas com pontos para apenas uma: mutex serializa e rejeita a segunda', async () => {
    await createCharacter('user_attr_8', {
      nome: 'Aria',
      racaId: 'humano',
      classeId: 'profeta',
      pontos: {
        vigor: 3,
        sorte: 5,
        forca: 0,
        vitalidade: 0,
        arcano: 2,
        inteligencia: 0,
        agilidade: 0,
      },
    });

    // Apenas 3 pontos disponíveis
    await updateCharacter('user_attr_8', { pontosDisponiveis: 3 });

    // Dispara duas chamadas concorrentes de 3 pontos
    const p1 = distribuirPontos('user_attr_8', { vigor: 3 });
    const p2 = distribuirPontos('user_attr_8', { sorte: 3 });

    const results = await Promise.allSettled([p1, p2]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const finalChar = await getCharacterByUid('user_attr_8');
    expect(finalChar?.pontosDisponiveis).toBe(0);
  });

  it('0.5-C2: se o commit do reset falhar, nada é cobrado nem gravado (transação atômica)', async () => {
    await createCharacter('user_attr_9', {
      nome: 'Zephyr',
      racaId: 'elfo',
      classeId: 'feiticeiro',
      pontos: {
        vigor: 2,
        sorte: 5,
        forca: 0,
        vitalidade: 0,
        arcano: 0,
        inteligencia: 3,
        agilidade: 0,
      },
    });

    await alterarDiamantes('user_attr_9', 150, 'Saldo inicial');
    await updateCharacter('user_attr_9', { pontosDisponiveis: 3 });
    await distribuirPontos('user_attr_9', { sorte: 3 });

    const antes = (await getCharacterByUid('user_attr_9'))!;
    const txAntes = getTransactionsByUid('user_attr_9').length;

    // Falha simulada no commit da transação do reset
    setTestPersistenceFailHook((operacao) => {
      if (operacao === 'resetarAtributos') {
        throw new Error('Falha simulada de I/O na persistência');
      }
    });

    await expect(resetarAtributos('user_attr_9')).rejects.toThrow(
      'Falha simulada de I/O na persistência'
    );

    setTestPersistenceFailHook(null);

    const charFinal = (await getCharacterByUid('user_attr_9'))!;
    expect(charFinal.diamantes).toBe(150);
    expect(charFinal.atributos).toEqual(antes.atributos);
    expect(charFinal.pontosAlocadosPorNivel).toEqual(antes.pontosAlocadosPorNivel);
    expect(getTransactionsByUid('user_attr_9').length).toBe(txAntes);
  });

  it('Promise.all([combate com level up, distribuirPontos]) no mesmo uid: total final de pontos consistente', async () => {
    await createCharacter('user_mutex_combat_1', {
      nome: 'Gildor',
      racaId: 'humano',
      classeId: 'cavaleiro',
      pontos: {
        vigor: 5,
        sorte: 0,
        forca: 5,
        vitalidade: 0,
        arcano: 0,
        inteligencia: 0,
        agilidade: 0,
      },
    });

    // Dá 3 pontos iniciais para permitir uma distribuição
    await updateCharacter('user_mutex_combat_1', { pontosDisponiveis: 3 });

    // Combate que concede 20 XP (level up: nível 1 -> 2, +3 pontos)
    const combateVitoria: ResultadoCombate = {
      vencedor: 'personagem',
      xpGanho: 20,
      ouroGanho: 20,
      ouroPerdido: 0,
      logTurnos: [],
      mensagens: ['Vitória!'],
      personagemFinal: {
        hp: 20,
        hpMax: 20,
        ouro: 20,
      },
    };

    // Dispara concorrência entre aplicar resultado de combate e distribuir pontos
    await Promise.all([
      applyCombatResult('user_mutex_combat_1', combateVitoria, 'Goblin'),
      distribuirPontos('user_mutex_combat_1', { forca: 3 }),
    ]);

    const finalChar = await getCharacterByUid('user_mutex_combat_1');
    expect(finalChar).not.toBeNull();
    // Tinha 3, ganhou 3 do level up = 6 pontos totais no ciclo. Gastou 3 em força. Sobram 3 disponíveis.
    const pontosGastos = Object.values(finalChar!.pontosAlocadosPorNivel || {}).reduce((a, b) => a + b, 0);
    expect(pontosGastos + finalChar!.pontosDisponiveis).toBe(6);
    expect(finalChar!.nivel).toBe(2);
    expect(finalChar!.atributos.forca).toBe(9); // 6 base/criação + 3 distribuídos
  });

  it('Promise.all([combate, resetarAtributos]) no mesmo uid: saldo de diamantes e pontos consistentes', async () => {
    await createCharacter('user_mutex_combat_2', {
      nome: 'Eldrin',
      racaId: 'elfo',
      classeId: 'feiticeiro',
      pontos: {
        vigor: 2,
        sorte: 5,
        forca: 0,
        vitalidade: 0,
        arcano: 0,
        inteligencia: 3,
        agilidade: 0,
      },
    });

    await alterarDiamantes('user_mutex_combat_2', 150, 'Saldo diamantes');
    await updateCharacter('user_mutex_combat_2', { pontosDisponiveis: 3 });
    await distribuirPontos('user_mutex_combat_2', { sorte: 3 });

    const combateVitoria: ResultadoCombate = {
      vencedor: 'personagem',
      xpGanho: 20, // sobe de nível (+3 pontos)
      ouroGanho: 10,
      ouroPerdido: 0,
      logTurnos: [],
      mensagens: ['Vitória!'],
      personagemFinal: {
        hp: 20,
        hpMax: 20,
        ouro: 10,
      },
    };

    await Promise.all([
      applyCombatResult('user_mutex_combat_2', combateVitoria, 'Lobo'),
      resetarAtributos('user_mutex_combat_2'),
    ]);

    const finalChar = await getCharacterByUid('user_mutex_combat_2');
    expect(finalChar).not.toBeNull();
    expect(finalChar!.diamantes).toBe(50); // 150 - 100
    // O reset devolveu os 3 alocados e o combate deu mais 3 = 6 disponíveis
    expect(finalChar!.pontosDisponiveis).toBe(6);
    expect(finalChar!.pontosAlocadosPorNivel?.sorte).toBe(0);
    expect(finalChar!.nivel).toBe(2);
  });

  it('se uma operação dentro do mutex lançar erro, a próxima operação do mesmo uid executa normalmente', async () => {
    await createCharacter('user_mutex_error_1', {
      nome: 'Kael',
      racaId: 'humano',
      classeId: 'barbaro',
      pontos: {
        vigor: 5,
        sorte: 0,
        forca: 5,
        vitalidade: 0,
        arcano: 0,
        inteligencia: 0,
        agilidade: 0,
      },
    });

    await updateCharacter('user_mutex_error_1', { pontosDisponiveis: 3 });

    // 1. Operação com falha (distribuição inválida)
    await expect(
      distribuirPontos('user_mutex_error_1', { atributoInexistente: 5 })
    ).rejects.toThrow();

    // 2. Operação subsequente no mesmo uid executa normalmente sem ficar travada
    const updated = await distribuirPontos('user_mutex_error_1', { vigor: 3 });
    expect(updated.atributos.vigor).toBe(12);
    expect(updated.pontosDisponiveis).toBe(0);
  });

  it('0.5-C1: falha de gravação no cadastro vira erro 503 para o cliente, nunca sucesso silencioso', async () => {
    const { POST } = await import('@/app/api/character/create/route');
    const { NextRequest } = await import('next/server');

    setTestPersistenceFailHook((operacao) => {
      if (operacao === 'criarPersonagem') {
        throw new ErroPersistencia(operacao);
      }
    });

    try {
      const req = new NextRequest('http://localhost:3000/api/character/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenDeTeste('user_env_test_1')}`,
        },
        body: JSON.stringify({
          nome: 'Thorin',
          racaId: 'anao',
          classeId: 'cavaleiro',
          pontos: { vigor: 5, sorte: 0, forca: 2, vitalidade: 3, arcano: 0, inteligencia: 0, agilidade: 0 },
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(503);
      expect(await getCharacterByUid('user_env_test_1')).toBeNull();
    } finally {
      setTestPersistenceFailHook(null);
    }

    // O nome não fica reservado por um cadastro que falhou
    await expect(
      createCharacter('outro_uid_thorin', {
        nome: 'Thorin',
        racaId: 'anao',
        classeId: 'cavaleiro',
        pontos: { vigor: 5, sorte: 0, forca: 2, vitalidade: 3, arcano: 0, inteligencia: 0, agilidade: 0 },
      })
    ).resolves.toMatchObject({ nome: 'Thorin' });
  });
});
