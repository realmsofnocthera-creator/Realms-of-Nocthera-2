'use client';

import React, { useEffect, useState } from 'react';
import { BRILHO_DA_RARIDADE, VERSO_DO_COLECIONAVEL } from '@/assets/buscarUi';
import { IconeDeRaridade } from '@/components/colecao/ArtesDaColecao';
import type { ResultadoDaBusca } from '@/game/colecionaveis';
import { COLECIONAVEL_MAP, NOME_DA_RARIDADE_DE_COLECIONAVEL, RARIDADES_DE_COLECIONAVEL, type RaridadeDeColecionavel } from '@/rules/colecionaveis';
import { MolduraDoColecionavel } from './MolduraDoColecionavel';

const ORDEM = (r: RaridadeDeColecionavel) => RARIDADES_DE_COLECIONAVEL.indexOf(r);
const BRILHA_MUITO = (r: RaridadeDeColecionavel) => r === 'lendario' || r === 'mitico';

/** A melhor raridade entre os resultados (a que dá o ápice da revelação). */
export function melhorRaridade(resultados: readonly ResultadoDaBusca[]): RaridadeDeColecionavel {
  return resultados.reduce<RaridadeDeColecionavel>((m, r) => (ORDEM(r.raridade) > ORDEM(m) ? r.raridade : m), 'comum');
}

/** O texto da etiqueta de um resultado: Novo, fragmentos, e se veio da garantia. */
export function etiquetaDoResultado(r: ResultadoDaBusca): string {
  return r.ativou ? 'NOVO!' : `+${r.fragmentos} FRAG.`;
}

function Etiqueta({ r, grande }: { r: ResultadoDaBusca; grande: boolean }) {
  return (
    <span className="flex flex-col items-center gap-0.5">
      <span
        className={`${r.ativou ? 'revela-etiqueta bg-[#ED8A0C] text-[#1A120B]' : 'bg-[#1A120B] text-[#E2D6B6] border border-[#B2A66C]'} px-1.5 py-0.5 font-[family-name:var(--font-pixel)] leading-none ${grande ? 'text-[9px]' : 'text-[6px]'}`}
      >
        {etiquetaDoResultado(r)}
      </span>
      {r.garantido && <span className={`font-[family-name:var(--font-pixel)] leading-none text-[#F2C94C] ${grande ? 'text-[8px]' : 'text-[5px]'}`}>GARANTIA</span>}
    </span>
  );
}

/** Uma carta que começa virada para baixo, tremendo na cor da raridade (o brilho já entrega o que veio) e vira ao ser revelada. */
function CartaRevelada({ r, virada, grande }: { r: ResultadoDaBusca; virada: boolean; grande: boolean }) {
  const c = COLECIONAVEL_MAP[r.id];
  const cor = BRILHO_DA_RARIDADE[r.raridade];
  return (
    <div className="flex flex-col items-center gap-1 min-w-0" style={{ ['--cor' as string]: cor }}>
      <div className={`revela-carta w-full ${virada ? '' : 'revela-carta--aguarda'}`} style={{ aspectRatio: '2 / 3' }}>
        <div className={`revela-carta__giro ${virada ? 'revela-carta__giro--virada' : ''}`}>
          <div className="revela-carta__face">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={VERSO_DO_COLECIONAVEL} alt="" aria-hidden="true" className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} />
          </div>
          <div className="revela-carta__face revela-carta__face--frente">
            <div
              className={`caixa-pixel relative w-full h-full flex flex-col items-center justify-center gap-1 ${grande ? 'p-2' : 'p-0.5'} ${virada && BRILHA_MUITO(r.raridade) ? 'revela-brilha' : ''}`}
              style={{ ['--caixa-a' as string]: '#2A1B3A', ['--caixa-b' as string]: '#150C20' }}
            >
              {c && <MolduraDoColecionavel c={c} ativo className={grande ? 'w-[88%] aspect-square' : 'w-[92%] aspect-square'} />}
              {virada && <Etiqueta r={r} grande={grande} />}
            </div>
          </div>
        </div>
      </div>
      <span
        className={`font-cinzel font-bold text-center leading-tight transition-opacity duration-300 ${grande ? 'text-sm' : 'text-[9px]'} ${virada ? 'opacity-100' : 'opacity-0'}`}
        style={{ color: cor }}
      >
        {r.nome}
      </span>
    </div>
  );
}

/**
 * A revelação da busca, no estilo gacha: as cartas chegam viradas para baixo, tremendo na cor da raridade, e viram
 * uma a uma (com um clarão e, nas lendárias e míticas, raios girando atrás). "Pular" revela tudo; com movimento
 * reduzido no aparelho, tudo aparece de uma vez.
 */
export function RevelacaoDaBusca({ resultados, aoFechar }: { resultados: readonly ResultadoDaBusca[]; aoFechar: () => void }) {
  const total = resultados.length;
  const [viradas, setViradas] = useState(0);
  const grande = total === 1;

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setViradas(total);
      return;
    }
    setViradas(0);
    let n = 0;
    let t: ReturnType<typeof setTimeout>;
    const proxima = () => {
      n += 1;
      setViradas(n);
      if (n < total) t = setTimeout(proxima, 480);
    };
    t = setTimeout(proxima, grande ? 1500 : 1100);
    return () => clearTimeout(t);
  }, [resultados, total, grande]);

  const ultima = viradas > 0 ? resultados[viradas - 1] : undefined;
  const acabou = viradas >= total;
  const melhor = melhorRaridade(resultados);
  const novos = resultados.filter((r) => r.ativou).length;
  const fragmentos = resultados.reduce((s, r) => s + r.fragmentos, 0);
  const corDoFundo = BRILHO_DA_RARIDADE[acabou ? melhor : (ultima?.raridade ?? 'comum')];

  return (
    <div role="dialog" aria-modal="true" aria-label="Resultado da busca" className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-black/85 px-3 py-4" style={{ ['--cor' as string]: corDoFundo }}>
      {BRILHA_MUITO(acabou ? melhor : (ultima?.raridade ?? 'comum')) && <span aria-hidden="true" className="revela-raios" />}
      {ultima && <span key={viradas} aria-hidden="true" className="revela-flash" style={{ ['--cor' as string]: BRILHO_DA_RARIDADE[ultima.raridade], opacity: BRILHA_MUITO(ultima.raridade) ? 1 : ultima.raridade === 'muitoRaro' ? 0.4 : 0.15 }} />}

      <div className="relative z-10 w-full max-w-[420px] flex flex-col items-center gap-3">
        <div className={grande ? 'w-[200px]' : 'w-full grid grid-cols-5 gap-x-1.5 gap-y-2'}>
          {resultados.map((r, i) => (
            <CartaRevelada key={i} r={r} virada={i < viradas} grande={grande} />
          ))}
        </div>

        {acabou ? (
          <div className="revela-entrada w-full flex flex-col items-center gap-2">
            <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-[family-name:var(--font-silk)] text-[12px] text-[#E2D6B6]">
              <span className="inline-flex items-center gap-1" style={{ color: BRILHO_DA_RARIDADE[melhor] }}>
                <IconeDeRaridade raridade={melhor} className="w-5 h-5" />
                Melhor: {NOME_DA_RARIDADE_DE_COLECIONAVEL[melhor]}
              </span>
              {novos > 0 && <span className="text-[#ED8A0C] font-bold">{novos} {novos === 1 ? 'novo' : 'novos'}</span>}
              {fragmentos > 0 && <span>{fragmentos} frag.</span>}
            </p>
            <button type="button" onClick={aoFechar} className="botao-kit botao-kit-dourado px-6 font-cinzel font-bold uppercase text-sm text-[#2B1D0E]">
              Ótimo!
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setViradas(total)} className="botao-kit botao-kit-cinza px-5 font-cinzel font-bold uppercase text-[11px] text-[#2B2118]">
            Pular
          </button>
        )}
      </div>
    </div>
  );
}
