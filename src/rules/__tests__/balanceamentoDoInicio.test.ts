import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter, combatenteDoPersonagem, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { resolverCombate } from '@/game/combat';
import { MONSTROS_CACADA_DADOS, montarMonstroCacada } from '@/rules/cacada';
import { categoriaDeEscala, escalaDoNivel, pesoDoAjusteDeInicio } from '@/rules/escalaMonstros';
import { CLASSES } from '@/rules/classes';
import { resetCharacterStore } from '@/test/repositorioMemoria';

/**
 * Regressão do começo do jogo: um personagem CRU (sem equipamento nenhum), de nível 2, de qualquer classe, vence os monstros de 1★ da Caçada.
 * (A tabela do Balanceamento foi calibrada para um jogador com equipamento; o ajuste de início a desce no começo.)
 */
const PRINCIPAL: Record<string, string> = { barbaro: 'forca', cavaleiro: 'forca', feiticeiro: 'inteligencia', bandido: 'forca', profeta: 'inteligencia', samurai: 'forca' };

describe('começo do jogo: personagem cru contra a 1★', () => {
  beforeEach(() => resetCharacterStore());

  // os cenários: com os 3 pontos do nível 2 gastos e SEM gastar (quem sobe de nível pela introdução e vai direto à Caçada), em 3 builds
  const BUILDS: Record<string, (p: string) => Record<string, number>> = {
    principal: (p) => ({ [p]: 6, vigor: 4 }),
    puro: (p) => ({ [p]: 10 }),
    espalhado: (p) => ({ [p]: 2, vigor: 2, vitalidade: 2, agilidade: 2, sorte: 1, arcano: 1 }),
  };

  for (const gastou of [true, false]) {
    it(`nível 2, sem equipamento, ${gastou ? 'com' : 'SEM gastar'} os pontos do nível: vence a 1★ em todas as classes e builds`, async () => {
      const por: Record<string, [number, number]> = {};
      const porClasse: Record<string, [number, number]> = {};
      for (const c of CLASSES) {
        for (const [build, montar] of Object.entries(BUILDS)) {
          const uid = `cru-${c.id}-${build}`;
          const pontos = { vigor: 0, sorte: 0, forca: 0, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0, ...montar(PRINCIPAL[c.id]) } as Record<string, number>;
          await createCharacter(uid, { nome: `Cru${c.id.slice(0, 3)}${build.slice(0, 3)}${gastou ? 'g' : 'n'}`, racaId: 'humano', classeId: c.id, pontos } as never);
          const ch0 = (await getCharacterByUid(uid))!;
          const atributos = gastou ? { ...ch0.atributos, [PRINCIPAL[c.id]]: ch0.atributos[PRINCIPAL[c.id] as 'forca'] + 2, vigor: ch0.atributos.vigor + 1 } : ch0.atributos;
          await updateCharacter(uid, { nivel: 2, pontosDisponiveis: gastou ? 0 : 3, atributos });
          const ch = (await getCharacterByUid(uid))!;
          for (const d of MONSTROS_CACADA_DADOS.filter((x) => x.estrela === 1)) {
            const cat = categoriaDeEscala(d.perfil, d.chave === true);
            for (let s = 1; s <= 5; s++) {
              const r = resolverCombate(combatenteDoPersonagem(ch), montarMonstroCacada(d), s * 977);
              for (const [mapa, chave] of (cat === 'boss' ? ([[por, cat]] as const) : ([[por, cat], [porClasse, c.id]] as const))) {
                const a = (mapa[chave] ??= [0, 0]);
                a[1]++;
                if (r.vencedor === 'personagem') a[0]++;
              }
            }
          }
        }
      }
      const taxa = (k: string) => por[k][0] / por[k][1];
      expect(taxa('normal')).toBeGreaterThanOrEqual(0.95);
      expect(taxa('dificil')).toBeGreaterThanOrEqual(0.9);
      expect(taxa('boss')).toBeGreaterThanOrEqual(0.7);
      // mesmo as classes de menos vida (Feiticeiro, Profeta...) vencem quase sempre os monstros comuns e difíceis (o monstro-chave é o desafio)
      for (const [c, [v, t]] of Object.entries(porClasse)) expect(v / t, c).toBeGreaterThanOrEqual(0.88);
    }, 180000);
  }

  it('o ajuste de início vale por inteiro até o nível 8, some aos poucos e a tabela do documento volta no nível 14', () => {
    expect(pesoDoAjusteDeInicio(2)).toBe(1);
    expect(pesoDoAjusteDeInicio(8)).toBe(1);
    expect(pesoDoAjusteDeInicio(11)).toBe(0.5);
    expect(pesoDoAjusteDeInicio(14)).toBe(0);
    expect(escalaDoNivel(30, 'boss')).toEqual({ kh: 12.9, kf: 8.1 });
    expect(escalaDoNivel(2, 'normal').kh).toBeLessThan(2);
    expect(escalaDoNivel(2, 'normal').kf).toBeLessThan(1.5);
  });
});
