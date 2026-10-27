import React from 'react';

const BRASAS = Array.from({ length: 18 }, (_, i) => ({
  esquerda: (i * 37 + 11) % 100,
  tamanho: 3 + (i % 3) * 2,
  duracao: 9 + ((i * 5) % 8),
  atraso: -((i * 7) % 12),
  deriva: ((i % 2 ? 1 : -1) * (12 + ((i * 13) % 40))),
}));

/** Brasas flutuando (só CSS, 18 pontos, em degraus). Somem se o aparelho pede menos movimento. */
export function Brasas() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
      {BRASAS.map((b, i) => (
        <span
          key={i}
          className="nocthera-brasa absolute bottom-0 bg-[#ED8A0C]"
          style={{
            left: `${b.esquerda}%`,
            width: b.tamanho,
            height: b.tamanho,
            boxShadow: '0 0 6px rgba(237,138,12,0.8)',
            ['--duracao' as string]: `${b.duracao}s`,
            ['--atraso' as string]: `${b.atraso}s`,
            ['--deriva' as string]: `${b.deriva}px`,
          }}
        />
      ))}
    </div>
  );
}
