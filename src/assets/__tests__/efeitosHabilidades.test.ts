import { describe, expect, it } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CLASSES } from '@/rules/classes';
import { TEXTOS_SUBCLASSE } from '@/rules/subclasseTextos';
import { EFEITOS, efeitosDaHabilidade, IDS_COM_EFEITO_DE_HABILIDADE, layoutDoEfeito, PASTA_DOS_EFEITOS, type NomeDoEfeito } from '../efeitosPixelfx';

const nomes = [
  ...CLASSES.flatMap((c) => [c.progressao.ataqueBasico.nome, c.progressao.habilidadeEspecial.nome]),
  ...Object.values(TEXTOS_SUBCLASSE).flatMap((t) => [t.basico.nome, t.especial.nome]),
];

describe('efeitos do ataque básico e da especial (pixelfx)', () => {
  it('as 6 classes e as 12 subclasses: 36 habilidades, cada uma com efeito próprio', () => {
    expect(nomes).toHaveLength(36);
    expect(IDS_COM_EFEITO_DE_HABILIDADE).toHaveLength(36);
    for (const n of nomes) expect(efeitosDaHabilidade(n), n).toBeDefined();
  });
  it('cada efeito existe, é leve e tem tamanho e lugar', () => {
    for (const n of nomes) {
      const e = efeitosDaHabilidade(n)!;
      for (const nome of [e.inimigo, e.si].filter(Boolean) as NomeDoEfeito[]) {
        const arq = join(process.cwd(), 'public', PASTA_DOS_EFEITOS, `${nome}.webp`);
        expect(existsSync(arq), nome).toBe(true);
        expect(statSync(arq).size, nome).toBeLessThanOrEqual(350 * 1024);
        expect(EFEITOS[nome].quadros).toBeGreaterThan(1);
        expect(layoutDoEfeito(nome).largura).toBeGreaterThan(0);
      }
    }
  });
  it('as que só protegem ou curam caem em quem usou; ataques comuns não têm efeito de habilidade', () => {
    expect(efeitosDaHabilidade('Postura do Guardião')).toEqual({ si: 'hab-cavaleiro_postura_do_guardiao-si' });
    expect(efeitosDaHabilidade('Bênção Divina')).toEqual({ si: 'hab-profeta_bencao_divina-si' });
    expect(efeitosDaHabilidade('Muralha Inabalável')).toEqual({ inimigo: 'hab-bastiao_muralha_inabalavel', si: 'hab-bastiao_muralha_inabalavel-si' });
    expect(efeitosDaHabilidade('Ira do Bárbaro')).toBeUndefined();
    expect(efeitosDaHabilidade('qualquer coisa')).toBeUndefined();
  });
});
