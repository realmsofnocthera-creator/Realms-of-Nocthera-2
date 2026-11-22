import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { ErroDaIntro, executarIntro } from '@/server/intro';
import { MONSTROS_CACADA_MAP } from '@/rules/cacada';
import { CLASSES } from '@/rules/classes';
import { xpParaProximoNivel } from '@/game';
import { resetCharacterStore } from '@/test/repositorioMemoria';

const PONTOS = { vigor: 0, sorte: 0, forca: 0, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };

describe('Introdução: o lobo (vitória garantida) e a criatura de 9★ (derrota roteirizada)', () => {
  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
  });

  for (const c of CLASSES) {
    it(`${c.id}: vence o lobo em qualquer semente, sobe ao nível 2 e cai para a criatura de 9★`, async () => {
      for (const [i, seed] of [1, 2, 99, 12345, 2 ** 31 - 1].entries()) {
        const uid = `i-${c.id}-${i}`;
        // o personagem mais fraco possível: todos os pontos no atributo menos útil
        await createCharacter(uid, { nome: `Novato_${c.id}_${i}`, racaId: 'humano', classeId: c.id, pontos: { ...PONTOS, vigor: 10 } });
        const antes = (await getCharacterByUid(uid))!;
        const r = await executarIntro(uid, seed);
        expect(r.vitoria.vencedor).toBe('personagem');
        expect(r.derrota.vencedor).toBe('monstro');
        expect(r.loboId).toBe('lobo-cinzento');
        expect(MONSTROS_CACADA_MAP[r.criaturaId].nivel).toBe(30);
        expect(r.xpGanho).toBeGreaterThanOrEqual(xpParaProximoNivel(1));
        expect(r.character.nivel).toBe(2);
        expect(r.character.introConcluida).toBe(true);
        expect(r.character.pontosDisponiveis).toBe(antes.pontosDisponiveis + 3);
        expect(r.character.ouro).toBe(antes.ouro); // a derrota roteirizada não custa ouro
        const salvo = (await getCharacterByUid(uid))!;
        expect(salvo.nivel).toBe(2);
        expect(salvo.introConcluida).toBe(true);
      }
    });
  }

  it('vale uma vez só por personagem, e só no nível 1', async () => {
    await createCharacter('i-uma', { nome: 'Novato_Uma', racaId: 'humano', classeId: 'barbaro', pontos: { ...PONTOS, vigor: 10 } });
    await executarIntro('i-uma', 5);
    const de = await executarIntro('i-uma', 5).catch((e: unknown) => e);
    expect(de).toBeInstanceOf(ErroDaIntro);
    expect((de as ErroDaIntro).status).toBe(409);
    expect((await getCharacterByUid('i-uma'))!.nivel).toBe(2);
    await createCharacter('i-alto', { nome: 'Novato_Alto', racaId: 'humano', classeId: 'barbaro', pontos: { ...PONTOS, vigor: 10 } });
    await updateCharacter('i-alto', { nivel: 5 });
    await expect(executarIntro('i-alto', 5)).rejects.toBeInstanceOf(ErroDaIntro);
    expect((await getCharacterByUid('i-alto'))!.nivel).toBe(5);
  });
});
