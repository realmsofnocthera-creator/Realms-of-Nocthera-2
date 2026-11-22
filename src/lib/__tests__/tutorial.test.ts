import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CAPITULOS_DO_TUTORIAL } from '@/rules/tutorial';
import { avancar, oQueMostrar, PROGRESSO_VAZIO, pularCapitulo, pularTudo, rotaCombina } from '../tutorialProgresso';
import { PROVACOES } from '@/rules/provacoes';

const nada = () => false;

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? (f === '__tests__' ? [] : arquivos(p)) : p.endsWith('.tsx') ? [p] : [];
  });
}

describe('tutorial: os capítulos', () => {
  it('vão do nível 1 ao 25, com ids únicos e cada passo com título e texto', () => {
    const ids = CAPITULOS_DO_TUTORIAL.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Math.min(...CAPITULOS_DO_TUTORIAL.map((c) => c.nivel))).toBe(1);
    expect(Math.max(...CAPITULOS_DO_TUTORIAL.map((c) => c.nivel))).toBe(25);
    for (const c of CAPITULOS_DO_TUTORIAL) {
      expect(c.passos.length, c.id).toBeGreaterThan(0);
      for (const p of c.passos) {
        expect(p.titulo.length, c.id).toBeGreaterThan(2);
        expect(p.texto.length, c.id).toBeGreaterThan(10);
        if (p.tocar) expect(p.alvo, `${c.id}: passo de tocar sem destaque`).toBeTruthy();
      }
    }
  });

  it('cada provação tem o capítulo dela, no nível em que abre', () => {
    for (const p of PROVACOES) {
      const capitulo = CAPITULOS_DO_TUTORIAL.find((c) => c.passos.some((s) => s.alvo === `provacao-${p.id}`));
      expect(capitulo, p.id).toBeDefined();
      expect(capitulo!.nivel, p.id).toBe(p.nivelRequerido);
    }
  });

  it('todo destaque existe nas telas (data-tutorial no código)', () => {
    const codigo = arquivos(join(__dirname, '..', '..', 'components')).map((f) => readFileSync(f, 'utf8')).join('\n');
    const alvos = new Set(CAPITULOS_DO_TUTORIAL.flatMap((c) => [...c.passos.map((p) => p.alvo), c.quando]).filter((a): a is string => !!a));
    for (const a of alvos) {
      const fixo = codigo.includes(`data-tutorial="${a}"`) || codigo.includes(`'${a}'`);
      const montado = ['hub-', 'menu-', 'provacao-', 'arena-modo-'].some((pre) => a.startsWith(pre) && codigo.includes(`data-tutorial={\`${pre}\${`));
      expect(fixo || montado, a).toBe(true);
    }
  });
});

describe('tutorial: o progresso', () => {
  it('no nível 1, no Hub, começa pelas boas-vindas; em outra tela, espera', () => {
    expect(oQueMostrar(PROGRESSO_VAZIO, 1, '/hub', nada)?.capitulo.id).toBe('boas-vindas');
    expect(oQueMostrar(PROGRESSO_VAZIO, 1, '/cacada', nada)).toBeNull();
  });

  it('avança passo a passo e fecha o capítulo no último; o seguinte da fila vem depois', () => {
    let p = PROGRESSO_VAZIO;
    const passos = CAPITULOS_DO_TUTORIAL[0].passos.length;
    for (let i = 0; i < passos; i++) p = avancar(p, 'boas-vindas', i);
    expect(p.feitos).toEqual(['boas-vindas']);
    expect(p.atual).toBeNull();
    expect(oQueMostrar(p, 1, '/personagem', nada)?.capitulo.id).toBe('ficha');
  });

  it('o capítulo só aparece a partir do nível dele', () => {
    const feitosAte4 = { ...PROGRESSO_VAZIO, feitos: CAPITULOS_DO_TUTORIAL.filter((c) => c.nivel <= 4).map((c) => c.id) };
    expect(oQueMostrar(feitosAte4, 4, '/hub', nada)).toBeNull();
    expect(oQueMostrar(feitosAte4, 5, '/hub', nada)?.capitulo.id).toBe('torre');
  });

  it('a primeira luta aparece quando a luta está na tela, na frente da fila', () => {
    expect(oQueMostrar(PROGRESSO_VAZIO, 2, '/cacada', (a) => a === 'combate-pronto')?.capitulo.id).toBe('combate');
  });

  it('pular um capítulo ou todos', () => {
    expect(pularCapitulo(PROGRESSO_VAZIO, 'boas-vindas').feitos).toEqual(['boas-vindas']);
    expect(oQueMostrar(pularTudo(PROGRESSO_VAZIO), 25, '/hub', () => true)).toBeNull();
  });

  it('a rota combina com o começo do caminho', () => {
    expect(rotaCombina('/hub', '/hub')).toBe(true);
    expect(rotaCombina('/hub', '/hub/x')).toBe(true);
    expect(rotaCombina('/hub', '/hubx')).toBe(false);
    expect(rotaCombina('*', '/qualquer')).toBe(true);
  });
});
