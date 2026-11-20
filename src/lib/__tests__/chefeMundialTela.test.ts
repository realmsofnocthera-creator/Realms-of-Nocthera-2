import { describe, expect, it } from 'vitest';
import { nomeCurtoDoChefe, subtituloDoChefe, tempoAteFechar, valorCompacto } from '../chefeMundialTela';

describe('tela do Chefe Mundial', () => {
  it('separa o nome do título do chefe', () => {
    expect(nomeCurtoDoChefe('Solvaris, o Arauto do Último Amanhecer')).toBe('Solvaris');
    expect(subtituloDoChefe('Solvaris, o Arauto do Último Amanhecer')).toBe('o Arauto do Último Amanhecer');
    expect(nomeCurtoDoChefe('Sem título')).toBe('Sem título');
    expect(subtituloDoChefe('Sem título')).toBe('');
  });

  it('a contagem até fechar é HH:MM:SS e para em zero', () => {
    const fecha = new Date(Date.UTC(2026, 10, 24, 3, 0, 0)).toISOString();
    expect(tempoAteFechar(fecha, Date.UTC(2026, 10, 23, 20, 47, 15))).toBe('06:12:45');
    expect(tempoAteFechar(fecha, Date.UTC(2026, 10, 24, 2, 59, 59))).toBe('00:00:01');
    expect(tempoAteFechar(fecha, Date.UTC(2026, 10, 24, 5, 0, 0))).toBe('00:00:00');
  });

  it('valores curtos para os espaços pequenos', () => {
    expect([5, 950, 1000, 1500, 8000, 20000, 123456, 1_000_000, 2_340_000].map(valorCompacto)).toEqual(['5', '950', '1K', '1,5K', '8K', '20K', '123K', '1M', '2,3M']);
  });
});
