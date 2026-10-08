import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createCharacter, getCharacterByUid } from '@/server/characterService';
import { resolverCombate, Combatente } from '@/game/combat';
import { MONSTERS_MAP } from '@/rules/monsters';
import {
  getTransactionsByUid,
  obterCombateRegistrado,
  resetCharacterStore,
  setTestPersistenceFailHook,
} from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

const SEMENTE_DO_SERVIDOR = 12345;
vi.mock('../combateSemente', () => ({ gerarSementeCombate: vi.fn(() => SEMENTE_DO_SERVIDOR) }));

const { POST } = await import('@/app/api/combat/start/route');

async function criarHeroi(uid: string) {
  await createCharacter(uid, {
    nome: `Heroi ${uid}`.slice(0, 32),
    racaId: 'humano',
    classeId: 'barbaro',
    pontos: { vigor: 4, mente: 0, forca: 4, vitalidade: 1, arcano: 0, inteligencia: 0, agilidade: 1 },
  });
}

function requisicao(uid: string, body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/combat/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenDeTeste(uid)}` },
    body: JSON.stringify(body),
  });
}

describe('0.5-B — Integridade do combate', () => {
  beforeEach(() => {
    resetCharacterStore();
  });

  it('B1: ignora a semente do cliente, usa a do servidor e grava semente + entrada para replay', async () => {
    const uid = 'b1_semente';
    await criarHeroi(uid);

    const res = await POST(requisicao(uid, { monsterId: 'rato-da-peste', seed: 1, combateId: 'combate-b1-0001' }));
    expect(res.status).toBe(200);
    const data = await res.json();

    const registro = obterCombateRegistrado(`${uid}__combate-b1-0001`)!;
    expect(registro).toBeDefined();
    expect(registro.seed).toBe(SEMENTE_DO_SERVIDOR);
    expect(registro.monstroId).toBe('rato-da-peste');

    // Replay: a mesma entrada com a semente gravada reproduz o mesmo combate
    const entrada = registro.entrada.combatente as Combatente;
    const replay = resolverCombate(structuredClone(entrada), MONSTERS_MAP['rato-da-peste'], registro.seed);
    expect(replay.vencedor).toBe(data.resultado.vencedor);
    expect(JSON.parse(JSON.stringify(replay.logTurnos))).toEqual(data.resultado.logTurnos);
    expect(replay.ouroGanho).toBe(data.resultado.ouroGanho);
  });

  it('B3: reenvio com o mesmo combateId não aplica XP nem ouro duas vezes', async () => {
    const uid = 'b3_idempotencia';
    await criarHeroi(uid);
    const corpo = { monsterId: 'rato-da-peste', combateId: 'combate-b3-0001' };

    const primeira = await (await POST(requisicao(uid, corpo))).json();
    const depoisDaPrimeira = (await getCharacterByUid(uid))!;
    const txDepoisDaPrimeira = getTransactionsByUid(uid).length;

    const segundaRes = await POST(requisicao(uid, corpo));
    expect(segundaRes.status).toBe(200);
    const segunda = await segundaRes.json();

    expect(primeira.repetido).toBe(false);
    expect(segunda.repetido).toBe(true);
    expect(segunda.resultado).toEqual(primeira.resultado);

    const depoisDaSegunda = (await getCharacterByUid(uid))!;
    expect(depoisDaSegunda.xpAtual).toBe(depoisDaPrimeira.xpAtual);
    expect(depoisDaSegunda.nivel).toBe(depoisDaPrimeira.nivel);
    expect(depoisDaSegunda.ouro).toBe(depoisDaPrimeira.ouro);
    expect(getTransactionsByUid(uid).length).toBe(txDepoisDaPrimeira);
  });

  it('B3: combateIds diferentes contam como combates diferentes', async () => {
    const uid = 'b3_distintos';
    await criarHeroi(uid);
    await POST(requisicao(uid, { monsterId: 'rato-da-peste', combateId: 'combate-b3-aaaa' }));
    const xp1 = (await getCharacterByUid(uid))!;
    await POST(requisicao(uid, { monsterId: 'rato-da-peste', combateId: 'combate-b3-bbbb' }));
    const xp2 = (await getCharacterByUid(uid))!;
    expect(xp2.xpAtual + xp2.nivel * 1000).toBeGreaterThan(xp1.xpAtual + xp1.nivel * 1000);
  });

  it('rejeita combateId em formato inválido com 400', async () => {
    const uid = 'b3_invalido';
    await criarHeroi(uid);
    const res = await POST(requisicao(uid, { monsterId: 'rato-da-peste', combateId: '../x' }));
    expect(res.status).toBe(400);
  });

  it('C2: falha no commit do combate não aplica XP/ouro nem registra o combate', async () => {
    const uid = 'c2_combate_falha';
    await criarHeroi(uid);
    const antes = (await getCharacterByUid(uid))!;

    setTestPersistenceFailHook((operacao) => {
      if (operacao === 'combate') throw new Error('Falha simulada no commit');
    });
    try {
      const res = await POST(requisicao(uid, { monsterId: 'rato-da-peste', combateId: 'combate-c2-0001' }));
      expect(res.status).toBe(500);
    } finally {
      setTestPersistenceFailHook(null);
    }

    const depois = (await getCharacterByUid(uid))!;
    expect(depois.xpAtual).toBe(antes.xpAtual);
    expect(depois.ouro).toBe(antes.ouro);
    expect(obterCombateRegistrado(`${uid}__combate-c2-0001`)).toBeUndefined();
    expect(getTransactionsByUid(uid)).toHaveLength(0);
  });

  it('C2: combates simultâneos do mesmo personagem somam XP sem perder nenhuma gravação', async () => {
    const uid = 'c2_concorrencia';
    await criarHeroi(uid);
    const ids = ['combate-c2-p001', 'combate-c2-p002', 'combate-c2-p003', 'combate-c2-p004'];

    const respostas = await Promise.all(
      ids.map((combateId) => POST(requisicao(uid, { monsterId: 'rato-da-peste', combateId })))
    );
    expect(respostas.every((r) => r.status === 200)).toBe(true);

    for (const id of ids) {
      expect(obterCombateRegistrado(`${uid}__${id}`)).toBeDefined();
    }
    const vitorias = ids.filter((id) => obterCombateRegistrado(`${uid}__${id}`)!.vencedor === 'personagem');
    const ouroEsperado = vitorias.reduce(
      (soma, id) => soma + obterCombateRegistrado(`${uid}__${id}`)!.ouroGanho,
      0
    );
    // Sem derrotas aqui (mesma semente, mesmo monstro): todo ouro ganho precisa estar no saldo
    expect(vitorias).toHaveLength(ids.length);
    expect((await getCharacterByUid(uid))!.ouro).toBe(ouroEsperado);
  });
});
