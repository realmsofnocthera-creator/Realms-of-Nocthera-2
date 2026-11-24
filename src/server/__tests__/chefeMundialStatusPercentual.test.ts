import { describe, expect, it, beforeEach } from 'vitest';
import { resolverCombate, type OpcoesResolverCombate } from '@/game/combat';
import { montarChefeMundial, VIDA_DO_CHEFE_MUNDIAL } from '@/rules/chefeMundial';
import { montarChefeSemanal, VIDA_DO_CHEFE_SEMANAL } from '@/rules/chefeSemanal';
import { combatenteDoPersonagem, createCharacter, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import type { MonsterDefinition } from '@/rules/monsters';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
const FORTE = { vigor: 300, sorte: 300, forca: 300, vitalidade: 100, arcano: 0, inteligencia: 0, agilidade: 50 };
/** rngStatus 0: todo status que o jogador tenta aplicar pega, sempre (o pior caso para os danos em % da vida máxima). */
const SEMPRE_PEGA: OpcoesResolverCombate = { rngStatus: () => 0 };

/** O dano medido como o servidor mede: vida + escudo do começo menos o que sobrou. */
const danoMedido = (m: MonsterDefinition, vida: number, r: ReturnType<typeof resolverCombate>) => vida + (m.sobreescudoInicial ?? 0) - r.monstroFinal!.hp - r.monstroFinal!.sobreescudo;

describe('chefes de ranking: os danos em % da vida máxima não valem a vida "sem fim"', () => {
  beforeEach(() => resetCharacterStore());

  it('Sangramento, Veneno e Queimadura sempre aplicados não dão milhões de dano grátis no Chefe Mundial nem no Semanal', async () => {
    for (const classe of ['bandido', 'feiticeiro', 'barbaro', 'cavaleiro', 'profeta', 'samurai']) {
      await createCharacter(`u-${classe}`, { nome: `P-${classe}`, racaId: 'elfo', classeId: classe, pontos: PONTOS });
      await updateCharacter(`u-${classe}`, { nivel: 30, atributos: FORTE });
      const eu = (await getCharacterByUid(`u-${classe}`))!;
      for (const [chefe, vida] of [[montarChefeMundial('2026-11-04'), VIDA_DO_CHEFE_MUNDIAL], [montarChefeSemanal('2026-11-02'), VIDA_DO_CHEFE_SEMANAL]] as const) {
        for (const seed of [1, 2, 3]) {
          // uma arma que aplica os três status em % da vida máxima (a forma comum de um jogador chegar neles)
          const heroi = combatenteDoPersonagem(eu);
          heroi.equipamento = { bonusDanoFisicoPercentual: 0, bonusDanoMagicoPercentual: 0, bonusChanceCriticoPontos: 0, bonusChanceEfeitosPontos: 0, statusArma: ['sangramento', 'veneno', 'queimadura'], elementosArma: [], habilidadesArmadura: {}, ...heroi.equipamento };
          heroi.equipamento.statusArma = ['sangramento', 'veneno', 'queimadura'];
          const r = resolverCombate(heroi, chefe, seed, SEMPRE_PEGA);
          // uma luta de 100 rodadas de um herói de nível 30 fica longe de 1 milhão; com os status em % da vida de 1 bilhão passava de 100 milhões
          expect(danoMedido(chefe, vida, r), `${classe} ${chefe.id} seed ${seed}`).toBeLessThan(2_000_000);
        }
      }
    }
  });

  it('o chefe de ranking guarda a vida de referência dos percentuais, e o monstro comum não', () => {
    const mundial = montarChefeMundial('2026-11-04');
    expect(mundial.hp).toBe(VIDA_DO_CHEFE_MUNDIAL);
    expect(mundial.hpReferenciaDePercentuais).toBeGreaterThan(0);
    expect(mundial.hpReferenciaDePercentuais).toBeLessThan(1_000_000);
    expect(montarChefeSemanal('2026-11-02').hpReferenciaDePercentuais).toBeLessThan(1_000_000);
  });
});
