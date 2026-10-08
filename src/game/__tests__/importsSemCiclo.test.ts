import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * Ordem 46C — o motor (src/game/) não pode ter ciclo de imports.
 * Antes: combat.ts → combate/habilidades → danoBase.ts → combat.ts.
 */
const RAIZ_SRC = path.resolve(__dirname, '../..');
const RAIZ_GAME = path.join(RAIZ_SRC, 'game');

function listarArquivos(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : listarArquivos(p);
    return /\.tsx?$/.test(e.name) ? [p] : [];
  });
}

function resolver(origem: string, especificador: string): string | null {
  let base: string;
  if (especificador.startsWith('@/')) base = path.join(RAIZ_SRC, especificador.slice(2));
  else if (especificador.startsWith('.')) base = path.resolve(path.dirname(origem), especificador);
  else return null;
  for (const candidato of [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
    if (fs.existsSync(candidato)) return candidato;
  }
  return null;
}

function grafoDoMotor(): Map<string, string[]> {
  const grafo = new Map<string, string[]>();
  for (const arquivo of listarArquivos(RAIZ_GAME)) {
    const codigo = fs.readFileSync(arquivo, 'utf8');
    const deps = new Set<string>();
    // Só imports com valor: "import type" não existe em tempo de execução
    for (const m of codigo.matchAll(/(?:^|\n)\s*(import|export)\s+(?!type\s)[^;]*?from\s*['"]([^'"]+)['"]/g)) {
      const alvo = resolver(arquivo, m[2]);
      if (alvo && alvo.startsWith(RAIZ_GAME)) deps.add(alvo);
    }
    grafo.set(arquivo, [...deps]);
  }
  return grafo;
}

function encontrarCiclo(grafo: Map<string, string[]>): string[] | null {
  const estado = new Map<string, 'visitando' | 'feito'>();
  const pilha: string[] = [];
  const visitar = (no: string): string[] | null => {
    estado.set(no, 'visitando');
    pilha.push(no);
    for (const dep of grafo.get(no) ?? []) {
      if (estado.get(dep) === 'visitando') return [...pilha.slice(pilha.indexOf(dep)), dep];
      if (!estado.has(dep)) {
        const ciclo = visitar(dep);
        if (ciclo) return ciclo;
      }
    }
    pilha.pop();
    estado.set(no, 'feito');
    return null;
  };
  for (const no of grafo.keys()) {
    if (!estado.has(no)) {
      const ciclo = visitar(no);
      if (ciclo) return ciclo;
    }
  }
  return null;
}

describe('Ordem 46C — imports do motor', () => {
  it('src/game/ não tem ciclo de imports', () => {
    const ciclo = encontrarCiclo(grafoDoMotor());
    expect(ciclo?.map((p) => path.relative(RAIZ_SRC, p)).join(' → ') ?? null).toBeNull();
  });

  it('o detector acusa um ciclo quando ele existe', () => {
    const grafo = new Map([
      ['a', ['b']],
      ['b', ['c']],
      ['c', ['a']],
    ]);
    expect(encontrarCiclo(grafo)).toEqual(['a', 'b', 'c', 'a']);
  });
});
