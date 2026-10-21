import { describe, it, expect } from 'vitest';
import { incursaoDoDocumento, incursaoNova, montarChefeDeIncursao, nivelDeIncursao, recompensaDaIncursao, vidaGlobalDoNivel } from '@/rules/incursao';
import { bonusDoRamo, bonusDosMembros, custoDoNivel, pesquisaDoDocumento } from '@/rules/pesquisa';

describe('Incursões (regras)', () => {
  it('100 níveis: 10 chefes por dificuldade; depois do 10º volta ao 1º na dificuldade seguinte', () => {
    expect(nivelDeIncursao(1)).toMatchObject({ dificuldade: 0, nomeDaDificuldade: 'Iniciante' });
    expect(nivelDeIncursao(1).chefe.id).toBe('incursao-chefe-1');
    expect(nivelDeIncursao(10).chefe.id).toBe('incursao-chefe-10');
    expect(nivelDeIncursao(11)).toMatchObject({ nomeDaDificuldade: 'Muito fácil' });
    expect(nivelDeIncursao(11).chefe.id).toBe('incursao-chefe-1');
    expect(nivelDeIncursao(100)).toMatchObject({ nomeDaDificuldade: 'Inferno' });
    expect(nivelDeIncursao(100).chefe.id).toBe('incursao-chefe-10');
  });

  it('a força sobe dentro da dificuldade e o mesmo chefe é mais forte na dificuldade seguinte', () => {
    for (let n = 2; n <= 100; n++) {
      if ((n - 1) % 10 !== 0) expect(montarChefeDeIncursao(n).hp, `nível ${n}`).toBeGreaterThan(montarChefeDeIncursao(n - 1).hp);
      if (n > 10) expect(montarChefeDeIncursao(n).hp, `nível ${n}`).toBeGreaterThan(montarChefeDeIncursao(n - 10).hp);
    }
    expect(vidaGlobalDoNivel(1)).toBe(montarChefeDeIncursao(1).hp * 30);
  });

  it('recompensa: parte fixa e bônus pelo dano; material mais raro a partir de Difícil', () => {
    const pouco = recompensaDaIncursao(1, 0, 4);
    const muito = recompensaDaIncursao(1, 1, 4);
    expect(muito.ouro).toBeGreaterThan(pouco.ouro);
    expect(muito.fracaoDeXp).toBeGreaterThan(pouco.fracaoDeXp);
    expect(recompensaDaIncursao(31, 0.5, 2).raridadeDoMaterial).toBe('raro');
    expect(recompensaDaIncursao(41, 0.5, 2).raridadeDoMaterial).toBe('muitoRaro');
    expect(recompensaDaIncursao(1, 0, 1, 30).ouro).toBe(Math.floor(140 * 1.3));
  });

  it('lê a incursão do banco com tolerância', () => {
    const i = incursaoNova(3);
    expect(incursaoDoDocumento(JSON.parse(JSON.stringify(i)))).toEqual(i);
    expect(incursaoDoDocumento({ nivel: 0, hpMax: 1, hp: 1 })).toBeUndefined();
    expect(incursaoDoDocumento({ nivel: 2, hpMax: 10, hp: 99, participantes: [{ uid: 'a', nome: 'A', dano: 'x' }] })).toEqual({ nivel: 2, hpMax: 10, hp: 10, participantes: [{ uid: 'a', nome: 'A', dano: 0, lutas: 0 }] });
  });
});

describe('Pesquisa (regras)', () => {
  it('custos e bônus', () => {
    expect(custoDoNivel(1)).toEqual({ ouro: 2000, materiais: 30 });
    expect(custoDoNivel(10)).toEqual({ ouro: 200000, materiais: 300 });
    const p = { xp: { nivel: 3, ouro: 0, materiais: 0 }, materiais: { nivel: 2, ouro: 0, materiais: 0 }, contratos: { nivel: 1, ouro: 0, materiais: 0 } };
    expect(bonusDoRamo(p, 'xp')).toBe(3);
    expect(bonusDoRamo(p, 'contratos')).toBe(3);
    expect(bonusDosMembros(p)).toEqual({ xp: 3, ouro: 0, materiais: 1 });
    expect(bonusDosMembros({ contratos: { nivel: 1, ouro: 0, materiais: 0 } })).toBeUndefined();
    expect(pesquisaDoDocumento({ xp: { nivel: 99, ouro: -1 }, lixo: 1 })).toEqual({ xp: { nivel: 10, ouro: 0, materiais: 0 } });
  });
});
