import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../auth', () => import('./helpers/authFake'));
const { gerarSementeMock } = vi.hoisted(() => ({ gerarSementeMock: vi.fn(() => 7) }));
vi.mock('../combatSeed', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../combatSeed')>()),
  gerarSemente: gerarSementeMock,
}));

import { NextRequest } from 'next/server';
import { POST } from '../../app/api/combat/start/route';
import { createCharacter, getCharacterByUid, resetCharacterStore, getTransactionsByUid } from '../characterService';
import { memoriaDeTeste } from '../persistence';

const PONTOS = { vigor: 4, mente: 0, forca: 4, vitalidade: 1, arcano: 0, inteligencia: 0, agilidade: 1 };

function lutar(uid: string, corpo: Record<string, unknown>) {
  return POST(
    new NextRequest('http://localhost:3000/api/combat/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer test-token-${uid}` },
      body: JSON.stringify({ monsterId: 'rato-da-peste', ...corpo }),
    })
  );
}

describe('0.5-B1 — semente gerada só no servidor', () => {
  beforeEach(async () => {
    resetCharacterStore();
    gerarSementeMock.mockClear();
    await createCharacter('u_seed', { nome: 'Semeador', racaId: 'humano', classeId: 'barbaro', pontos: PONTOS });
  });

  it('ignora a seed enviada pelo cliente e grava a semente do servidor no registro do combate', async () => {
    const res = await lutar('u_seed', { seed: 123456 });
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(gerarSementeMock).toHaveBeenCalledTimes(1);
    const registro = [...memoriaDeTeste.registrosCombate.values()][0];
    expect(registro.seed).toBe(7);
    expect(registro.seed).not.toBe(123456);
    expect(data.combatId).toBeTruthy();
  });
});

describe('0.5-B3 — idempotência do resultado do combate', () => {
  beforeEach(async () => {
    resetCharacterStore();
    await createCharacter('u_idem', { nome: 'Idempotente', racaId: 'humano', classeId: 'barbaro', pontos: PONTOS });
  });

  it('reenviar o mesmo combatId não aplica XP e ouro duas vezes', async () => {
    const combatId = 'combate-abc-12345';
    const r1 = await (await lutar('u_idem', { combatId })).json();
    expect(r1.repetido).toBe(false);
    const aposPrimeiro = await getCharacterByUid('u_idem');
    const txs = getTransactionsByUid('u_idem').length;

    const r2 = await (await lutar('u_idem', { combatId })).json();
    expect(r2.repetido).toBe(true);
    expect(r2.character.xpAtual).toBe(aposPrimeiro!.xpAtual);
    expect(r2.character.ouro).toBe(aposPrimeiro!.ouro);

    const depois = await getCharacterByUid('u_idem');
    expect(depois!.xpAtual).toBe(aposPrimeiro!.xpAtual);
    expect(depois!.ouro).toBe(aposPrimeiro!.ouro);
    expect(depois!.nivel).toBe(aposPrimeiro!.nivel);
    expect(getTransactionsByUid('u_idem').length).toBe(txs);
  });

  it('combatIds diferentes são combates diferentes', async () => {
    await lutar('u_idem', { combatId: 'combate-um-123456' });
    const apos1 = await getCharacterByUid('u_idem');
    const r = await (await lutar('u_idem', { combatId: 'combate-dois-12345' })).json();
    expect(r.repetido).toBe(false);
    const apos2 = await getCharacterByUid('u_idem');
    expect(apos2!.xpAtual + apos2!.nivel * 1000).toBeGreaterThan(apos1!.xpAtual + apos1!.nivel * 1000 - 1);
  });
});

describe('0.5-C2 — concorrência no mesmo personagem', () => {
  beforeEach(async () => {
    resetCharacterStore();
    await createCharacter('u_conc', { nome: 'Concorrente', racaId: 'humano', classeId: 'barbaro', pontos: PONTOS });
  });

  it('20 alterações simultâneas de ouro não perdem nenhuma atualização', async () => {
    const { alterarOuro } = await import('../characterService');
    await Promise.all(Array.from({ length: 20 }, (_, i) => alterarOuro('u_conc', 1, `t${i}`)));
    const final = await getCharacterByUid('u_conc');
    expect(final!.ouro).toBe(20);
    expect(getTransactionsByUid('u_conc')).toHaveLength(20);
  });

  it('saldo insuficiente em operações simultâneas nunca fica negativo', async () => {
    const { alterarOuro } = await import('../characterService');
    await alterarOuro('u_conc', 5, 'inicial');
    const res = await Promise.allSettled(
      Array.from({ length: 10 }, () => alterarOuro('u_conc', -1, 'gasto'))
    );
    expect(res.filter((r) => r.status === 'fulfilled')).toHaveLength(5);
    expect((await getCharacterByUid('u_conc'))!.ouro).toBe(0);
  });
});
