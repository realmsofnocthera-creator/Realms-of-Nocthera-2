import { describe, it, expect } from 'vitest';
import { montarCombatenteDoMonstro, resolverCombate, type Combatente } from '@/game/combat';
import { MONSTROS_CACADA, MONSTROS_CACADA_MAP, DADOS_CACADA_MAP } from '@/rules/cacada';
import { DEF_DO_MONSTRO_PERCENTUAL_DA_VITALIDADE, defDoMonstro, MONSTERS_MAP, MonsterDefinition } from '@/rules/monsters';
import { montarChefeMundial } from '@/rules/chefeMundial';

const base: MonsterDefinition = { ...MONSTERS_MAP['rato-da-peste'], id: 't', nome: 'Alvo', hp: 5000, efeitosAplicados: undefined, modificadoresElementais: undefined, habilidades: undefined, mitigacao: undefined, chefe: undefined, blindado: undefined };
const comVit = (vitalidade: number, extra: Partial<MonsterDefinition> = {}): MonsterDefinition => ({ ...base, atributos: { ...base.atributos, vitalidade }, ...extra });

describe('DEF dos monstros (5.1.11, opção 3)', () => {
  it('só blindados e chefes têm DEF, e ela vale metade da Vitalidade', () => {
    expect(DEF_DO_MONSTRO_PERCENTUAL_DA_VITALIDADE).toBe(50);
    expect(defDoMonstro(comVit(100))).toBe(0);
    expect(defDoMonstro(comVit(100, { blindado: true }))).toBe(50);
    expect(defDoMonstro(comVit(101, { chefe: true }))).toBe(50);
    expect(defDoMonstro(comVit(0, { chefe: true }))).toBe(0);
  });

  it('a DEF definida no monstro vale mais que a automática', () => {
    expect(defDoMonstro(comVit(100, { chefe: true, mitigacao: 7 }))).toBe(7);
    expect(montarCombatenteDoMonstro(comVit(100, { chefe: true, mitigacao: 7 })).mitigacao).toBe(7);
    expect(montarCombatenteDoMonstro(comVit(100, { chefe: true })).mitigacao).toBe(50);
    expect(montarCombatenteDoMonstro(comVit(100)).mitigacao).toBe(0);
  });

  it('na Caçada, os 6 blindados e os monstros-chave têm DEF; os comuns, não', () => {
    const blindados = MONSTROS_CACADA.filter((m) => DADOS_CACADA_MAP[m.id].perfil === 'blindado');
    expect(blindados.length).toBeGreaterThan(0);
    for (const m of MONSTROS_CACADA) {
      const d = DADOS_CACADA_MAP[m.id];
      const temDef = d.perfil === 'blindado' || d.chave === true;
      expect((montarCombatenteDoMonstro(m).mitigacao ?? 0) > 0, m.id).toBe(temDef && m.atributos.vitalidade > 1);
    }
    expect(MONSTROS_CACADA_MAP[blindados[0].id].blindado).toBe(true);
  });

  it('os chefes dos outros modos também têm DEF', () => {
    const mundial = montarChefeMundial('2026-10-22');
    expect(montarCombatenteDoMonstro(mundial).mitigacao).toBe(Math.floor(mundial.atributos.vitalidade / 2));
  });

  it('o golpe do herói causa menos dano num chefe com DEF do que num monstro igual sem DEF', () => {
    const heroi: Combatente = {
      nome: 'Herói', racaId: 'humano', classeId: 'barbaro', nivel: 10, hp: 50000, hpMax: 50000, sobreescudo: 0, mitigacao: 10,
      atributos: { vigor: 20, sorte: 0, forca: 60, vitalidade: 20, arcano: 0, inteligencia: 0, agilidade: 10 },
    };
    const dano = (m: MonsterDefinition) => resolverCombate(heroi, m, 7, { rngStatus: () => 99.9, rngCritico: () => 99.9 }).logTurnos[0].ataques.find((a) => a.atacante === 'Herói')!.danoEfetivo;
    expect(dano(comVit(80, { chefe: true }))).toBeLessThan(dano(comVit(80)));
  });
});
