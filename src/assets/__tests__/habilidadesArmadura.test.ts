import { describe, expect, it } from 'vitest';
import { iconeDaHabilidade } from '@/assets/habilidadesArmadura';
import { HABILIDADES_ARMADURA } from '@/rules/habilidadesArmadura';

describe('ícones das habilidades de armadura', () => {
  it('toda habilidade tem ícone (são 86)', () => {
    expect(HABILIDADES_ARMADURA).toHaveLength(86);
    expect(HABILIDADES_ARMADURA.filter((h) => !iconeDaHabilidade(h.id)).map((h) => h.id)).toEqual([]);
  });
  it('habilidade que não existe fica sem ícone', () => {
    expect(iconeDaHabilidade('nao-existe')).toBeNull();
  });
});
