import { describe, expect, it } from 'vitest';
import { iconeDaRecompensa } from '@/lib/checkinTela';
import { BAU_PEQUENO } from '@/assets/checkinUi';
import { DIAS_DO_CHECKIN, recompensaDoCheckin } from '@/rules/diario';
import { textoDoPresente } from '@/rules/correio';

describe('Check-in: ícone de cada dia', () => {
  it('todos os 30 dias do calendário têm um ícone próprio da recompensa (nenhum cai no baú genérico)', () => {
    for (let dia = 1; dia <= DIAS_DO_CHECKIN; dia++) {
      const src = iconeDaRecompensa(textoDoPresente(recompensaDoCheckin(dia)));
      expect(src, `dia ${dia}`).toBeTruthy();
      expect(src, `dia ${dia}`).not.toBe(BAU_PEQUENO);
    }
  });

  it('o dia especial (Diamantes) usa um ícone diferente do dia de ouro', () => {
    expect(iconeDaRecompensa(textoDoPresente(recompensaDoCheckin(7)))).not.toBe(iconeDaRecompensa(textoDoPresente(recompensaDoCheckin(1))));
  });

  it('sem texto de recompensa, cai no baú genérico', () => {
    expect(iconeDaRecompensa([])).toBe(BAU_PEQUENO);
  });
});
