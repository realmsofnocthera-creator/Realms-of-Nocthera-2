import React from 'react';

const BRASAS = Array.from({ length: 18 }, (_, i) => ({
  esquerda: (i * 37 + 11) % 100,
  tamanho: 3 + (i % 3) * 2,
  duracao: 9 + ((i * 5) % 8),
  atraso: -((i * 7) % 12),
  deriva: ((i % 2 ? 1 : -1) * (12 + ((i * 13) % 40))),
}));

/** Três tipos de partícula: brasa (laranja), poeira (clara, pequena) e vaga-lume (verde-amarelo, com brilho). */
const TIPOS = [
  { cor: '#ED8A0C', brilho: 'rgba(237,138,12,0.8)', escala: 1 },
  { cor: '#E2D6B6', brilho: 'rgba(226,214,182,0.5)', escala: 0.6 },
  { cor: '#C8E070', brilho: 'rgba(200,224,112,0.9)', escala: 1.3 },
] as const;

/** Partículas flutuando (só CSS, 18 pontos, em degraus). Somem se o aparelho pede menos movimento. */
export function Brasas() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
      {BRASAS.map((b, i) => {
        const tipo = TIPOS[i % TIPOS.length];
        const lado = Math.max(2, Math.round(b.tamanho * tipo.escala));
        return (
        <span
          key={i}
          className="nocthera-brasa absolute bottom-0"
          style={{
            left: `${b.esquerda}%`,
            width: lado,
            height: lado,
            backgroundColor: tipo.cor,
            boxShadow: `0 0 6px ${tipo.brilho}`,
            ['--duracao' as string]: `${b.duracao}s`,
            ['--atraso' as string]: `${b.atraso}s`,
            ['--deriva' as string]: `${b.deriva}px`,
          }}
        />
        );
      })}
    </div>
  );
}
