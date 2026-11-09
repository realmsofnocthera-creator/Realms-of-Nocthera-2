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
