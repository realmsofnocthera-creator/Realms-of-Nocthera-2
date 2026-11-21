import { describe, expect, it } from 'vitest';
import { GEMA_DA_RARIDADE, TELAS_UI } from '../telasSociaisUi';
import { RARIDADES_DO_MERCADO } from '@/rules/mercado';

describe('peças das telas do Correio, Mercado, Missões, Anúncios e Personalizar', () => {
  it('toda peça aponta para uma imagem', () => {
    for (const [nome, src] of Object.entries(TELAS_UI)) expect(typeof src === 'string' && src.length > 0, nome).toBe(true);
  });

  it('toda raridade do Mercado tem a gema da Coleção', () => {
    for (const r of RARIDADES_DO_MERCADO) expect(GEMA_DA_RARIDADE[r], r).toBeTruthy();
  });
});
