'use client';

import React from 'react';
import { SPRITES_DO_FERREIRO } from '@/assets/ferreiro';
import type { CategoriaArma, RaridadeArma } from '@/rules/armas';
import { BRILHO_DA_ARMA } from './IconeDeCategoria';
import { BotaoDoKit, PlacaDeRaridade, TEXTO_PIXEL } from './KitDaForja';
import { SlotComIcone } from './PopupsDaForja';

/** Uma linha do resultado: o que mudou, com o antes (se houver) e o depois; `subiu` pinta de verde ou de vermelho. */
export interface LinhaDoResultado {
  rotulo: string;
  antes?: string;
  depois: string;
  subiu?: boolean | null;
}

export interface AnimacaoDeForjaProps {
  fase: 'martelando' | 'revelada';
  titulo: string;
  nome: string;
  raridade: RaridadeArma;
  categoria: CategoriaArma;
  linhas: readonly LinhaDoResultado[];
  aoFechar: () => void;
}

/** O tempo mínimo da martelada antes de mostrar o resultado (zero com movimento reduzido). */
export const TEMPO_DA_MARTELADA_MS = 2300;
export const semMovimento = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** As faíscas que voam da bigorna a cada martelada (posição em % do ferreiro, atraso e direção fixos). */
const FAISCAS = [
  { left: 42, top: 52, dx: '-34px', dy: '-80px', atraso: '0s', dur: '0.7s' },
  { left: 45, top: 50, dx: '-8px', dy: '-100px', atraso: '0.1s', dur: '0.8s' },
  { left: 48, top: 52, dx: '26px', dy: '-86px', atraso: '0.2s', dur: '0.7s' },
  { left: 44, top: 54, dx: '-46px', dy: '-52px', atraso: '0.3s', dur: '0.6s' },
  { left: 49, top: 50, dx: '44px', dy: '-62px', atraso: '0.15s', dur: '0.75s' },
  { left: 41, top: 51, dx: '-20px', dy: '-112px', atraso: '0.35s', dur: '0.85s' },
  { left: 47, top: 53, dx: '12px', dy: '-120px', atraso: '0.45s', dur: '0.8s' },
  { left: 46, top: 51, dx: '58px', dy: '-40px', atraso: '0.05s', dur: '0.65s' },
];

/**
 * A animação de forjar: o ferreiro martela a bigorna (faíscas voando e a tela tremendo) e, quando o servidor
 * responde, a arma sobe com um clarão na cor da raridade (raios nas lendárias e míticas) e as linhas do resultado.
 */
export function AnimacaoDeForja({ fase, titulo, nome, raridade, categoria, linhas, aoFechar }: AnimacaoDeForjaProps) {
  const cor = BRILHO_DA_ARMA[raridade];
  const grande = raridade === 'lendario' || raridade === 'mitico';
  return (
    <div role="dialog" aria-modal="true" aria-label={titulo} className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#05070D]/92 px-3" style={{ ['--cor' as string]: cor }}>
      {fase === 'revelada' && grande && <span aria-hidden="true" className="revela-raios" />}
      {fase === 'revelada' && <span aria-hidden="true" className="revela-flash" style={{ opacity: grande ? 1 : 0.55 }} />}

      {fase === 'martelando' ? (
        <div className="relative z-10 flex flex-col items-center gap-3 w-full max-w-[400px]">
          <div className="relative w-[82%] fx-batida">
            <span aria-hidden="true" className="ferreiro-sprite" style={{ backgroundImage: `url(${SPRITES_DO_FERREIRO})`, transform: 'translateX(14%)' }} />
            {FAISCAS.map((f, i) => (
              <span key={i} aria-hidden="true" className="fx-faisca" style={{ left: `${f.left}%`, top: `${f.top}%`, ['--dx' as string]: f.dx, ['--dy' as string]: f.dy, ['--atraso' as string]: f.atraso, ['--dur' as string]: f.dur }} />
            ))}
          </div>
          <p role="status" className="font-[family-name:var(--font-pixel)] text-[10px] leading-none text-[#F5E3B3] [text-shadow:2px_2px_0_#05070D]">{titulo}</p>
          <p className="font-cinzel font-bold text-[13px] text-center" style={{ color: cor }}>{nome}</p>
        </div>
      ) : (
        <div className="relative z-10 flex flex-col items-center gap-3 w-full max-w-[360px]">
          <p className="font-[family-name:var(--font-pixel)] text-[11px] leading-none text-[#F5E3B3] [text-shadow:2px_2px_0_#05070D] fx-aparece">{titulo}</p>
          <div className="fx-subida" style={{ filter: `drop-shadow(0 0 ${grande ? 22 : 12}px ${cor})` }}>
            <SlotComIcone categoria={categoria} raridade={raridade} destaque tamanho={132} />
          </div>
          <div className="w-full fx-aparece" style={{ animationDelay: '0.25s' }}>
            <PlacaDeRaridade raridade={raridade}>
              <span className="font-cinzel font-extrabold text-[15px] leading-tight text-[#F5F3E0] [text-shadow:1px_1px_0_#05070D]">{nome}</span>
            </PlacaDeRaridade>
          </div>
          <ul aria-label="Resultado" className="w-full flex flex-col gap-1">
            {linhas.map((l, i) => (
              <li key={l.rotulo} className="fx-aparece flex items-center gap-2 px-2.5 py-1.5 bg-[#080C16]/90 border border-[#3A5B7A]" style={{ animationDelay: `${0.5 + i * 0.2}s` }}>
                <span className={`${TEXTO_PIXEL} text-[11px] text-[#8FB3D1]`}>{l.rotulo}</span>
                <span className={`${TEXTO_PIXEL} text-[13px] font-bold ml-auto tabular-nums flex items-center gap-1.5`} style={{ color: l.subiu === false ? '#FF7A7A' : l.subiu ? '#7BE08C' : '#F5F3E0' }}>
                  {l.antes !== undefined && (
                    <>
                      <span className="text-[#8FB3D1] font-normal">{l.antes}</span>
                      <span aria-hidden="true">{l.subiu === false ? '▼' : l.subiu ? '▲' : '→'}</span>
                    </>
                  )}
                  {l.depois}
                </span>
              </li>
            ))}
          </ul>
          <div className="fx-aparece w-full" style={{ animationDelay: `${0.6 + linhas.length * 0.2}s` }}>
            <BotaoDoKit onClick={aoFechar} className="w-full py-1">Ótimo!</BotaoDoKit>
          </div>
        </div>
      )}
    </div>
  );
}
