'use client';

import React, { useEffect, useState } from 'react';
import { falanteDaTela, fundoDaTela, type CenaDados } from '@/rules/cena';

/**
 * Toca uma cena (cutscene ou diálogo): uma tela por vez, com o fundo da cena, o texto na caixa de baixo e, quando
 * alguém fala, o retrato dele logo acima da caixa. Toque/clique ou Enter avança; "Pular" encerra.
 */
export function CenaPlayer({
  cena,
  jogador,
  aoTerminar,
  permitirPular = true,
}: {
  cena: CenaDados;
  jogador: { nome: string; retrato?: string };
  aoTerminar: () => void;
  permitirPular?: boolean;
}) {
  const [indice, setIndice] = useState(0);
  const tela = cena.telas[indice];
  const ultima = indice >= cena.telas.length - 1;
  const falante = tela ? falanteDaTela(cena, tela, jogador) : null;
  const fundo = tela ? fundoDaTela(cena, indice) : null;

  const avancar = () => (ultima ? aoTerminar() : setIndice((i) => i + 1));

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (indice >= cena.telas.length - 1) aoTerminar();
        else setIndice((i) => i + 1);
      }
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [indice, cena.telas.length, aoTerminar]);

  if (!tela) return null;
  return (
    <div role="dialog" aria-label={cena.titulo} data-testid="cena" className="fixed inset-0 z-50 flex flex-col justify-end bg-black text-white" onClick={avancar}>
      {fundo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fundo} alt="" className="absolute inset-0 h-full w-full object-cover" data-testid="cena-fundo" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30" />
      {permitirPular && (
        <button
          type="button"
          className="absolute right-3 top-3 z-10 rounded border border-white/40 bg-black/50 px-3 py-1 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            aoTerminar();
          }}
        >
          Pular
        </button>
      )}
      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col gap-1 px-3 pb-4">
        {falante?.retrato && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={falante.retrato} alt={falante.nome} data-testid="cena-retrato" className="ml-2 h-40 w-auto max-w-[60%] self-start object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] sm:h-56" />
        )}
        <div className="rounded-md border border-white/30 bg-black/75 px-4 py-3">
          {falante && <p className="mb-1 text-sm font-bold text-amber-300" data-testid="cena-nome">{falante.nome}</p>}
          <p className={`whitespace-pre-line text-[15px] leading-relaxed ${tela.tipo === 'narracao' ? 'italic' : ''}`} data-testid="cena-texto">{tela.texto}</p>
          <p className="mt-2 text-right text-[11px] text-white/60">{ultima ? 'Toque para fechar' : 'Toque para continuar'} · {indice + 1}/{cena.telas.length}</p>
        </div>
      </div>
    </div>
  );
}
