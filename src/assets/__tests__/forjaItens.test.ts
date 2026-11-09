import { describe, expect, it } from 'vitest';
import { glifoDoMaterial, iconeDeStatus } from '@/assets/forjaItens';
import { MATERIAIS } from '@/rules/materiais';
import { MATERIAIS_MUNDO } from '@/rules/materiaisArmas';
import { EFEITOS_STATUS } from '@/rules/statusEffects';

describe('ícones da Forja', () => {
  it('todo material de monstro e de mundo tem glifo', () => {
    const sem = [...MATERIAIS, ...MATERIAIS_MUNDO].filter((m) => !glifoDoMaterial(m.id, m.nome)).map((m) => m.nome);
    expect(sem).toEqual([]);
  });
  it('todo status tem ícone', () => {
    const sem = Object.values(EFEITOS_STATUS).filter((e) => !iconeDeStatus(e.nome)).map((e) => e.nome);
    expect(sem).toEqual([]);
  });
});

describe('arte das armas de criatura (1★, 2★ e Grizzharn)', () => {
  it('toda arma de 1★, de 2★ e do Grizzharn tem arte nas 6 categorias', async () => {
    const { arteDaArma } = await import('@/assets/armasCriatura');
    const { ARMAS_BASE } = await import('@/rules/armasCatalogo');
    const cats = ['espadaGrande', 'katana', 'lanca', 'espadaEscudo', 'grimorio', 'cajado'] as const;
    const sem = ARMAS_BASE.filter((a) => a.estrela <= 2 || a.monstroId === 'grizzharn').flatMap((a) => cats.filter((c) => !arteDaArma(a.id, c)).map((c) => `${a.id}:${c}`));
    expect(sem).toEqual([]);
    const outra = ARMAS_BASE.find((a) => a.estrela === 4);
    expect(outra && arteDaArma(outra.id, 'katana')).toBeNull();
  });
});
