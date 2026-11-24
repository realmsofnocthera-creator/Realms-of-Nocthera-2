import { describe, expect, it } from 'vitest';
import { AJUSTE_DE_ESTRELA, ajusteDaEstrela, categoriaDeEscala, escalarAtaque, escalarVida } from '@/rules/escalaMonstros';
import { MONSTROS_CACADA_DADOS, montarMonstroCacada, pontosDeReferencia, PERFIS, MULT_CHAVE } from '@/rules/cacada';

describe('Nerf dos monstros de 6★', () => {
  it('só a 6★ tem ajuste; as outras estrelas valem a tabela', () => {
    expect(Object.keys(AJUSTE_DE_ESTRELA)).toEqual(['6']);
    for (const e of [1, 2, 3, 4, 5, 7, 8, 9]) expect(ajusteDaEstrela(e, 'boss')).toEqual({ kh: 1, kf: 1 });
    for (const cat of ['normal', 'dificil', 'boss'] as const) {
      const a = ajusteDaEstrela(6, cat);
      expect(a.kh).toBeLessThan(1);
      expect(a.kf).toBeLessThan(1);
    }
    // o monstro-chave (chefe) leva o maior corte de vida
    expect(ajusteDaEstrela(6, 'boss').kh).toBeLessThan(ajusteDaEstrela(6, 'normal').kh);
  });
  it('cada monstro de 6★ tem a vida e o ataque da tabela vezes o ajuste, e os de 5★ e 7★ não mudam', () => {
    for (const d of MONSTROS_CACADA_DADOS.filter((x) => x.estrela === 6)) {
      const m = montarMonstroCacada(d);
      const cat = categoriaDeEscala(d.perfil, d.chave === true);
      const p = pontosDeReferencia(m.nivel);
      const perfil = PERFIS[d.perfil ?? 'normal'];
      const hpDaTabela = escalarVida(Math.round(p * perfil.hp * (d.chave ? MULT_CHAVE.hp : 1)), m.nivel, cat);
      expect(m.hp, d.id).toBe(Math.max(1, Math.round(hpDaTabela * ajusteDaEstrela(6, cat).kh)));
      const ataqueDaTabela = escalarAtaque(Math.max(1, Math.round(p * perfil.forca * (d.chave ? MULT_CHAVE.forca : 1) * (1 + (d.forcaPercentual ?? 0) / 100))), m.nivel, cat);
      expect(m.atributos.forca, d.id).toBe(Math.max(1, Math.round(ataqueDaTabela * ajusteDaEstrela(6, cat).kf)));
    }
    for (const d of MONSTROS_CACADA_DADOS.filter((x) => x.estrela === 5 || x.estrela === 7)) {
      const m = montarMonstroCacada(d);
      const cat = categoriaDeEscala(d.perfil, d.chave === true);
      const perfil = PERFIS[d.perfil ?? 'normal'];
      expect(m.hp, d.id).toBe(escalarVida(Math.round(pontosDeReferencia(m.nivel) * perfil.hp * (d.chave ? MULT_CHAVE.hp : 1)), m.nivel, cat));
    }
  });
});
