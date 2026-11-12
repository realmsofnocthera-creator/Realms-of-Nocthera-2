'use client';

import React, { useState } from 'react';
import type { CharacterDocument } from '@/server/characterService';
import { KIT_DA_FORJA } from '@/assets/forjaUi';
import { iconeDaTrilha } from '@/assets/maestriasUi';
import { diaDeBrasilia } from '@/game/batalhaSangrenta';
import {
  marcosAlcancados,
  MARCO_A_CADA,
  NIVEL_MAXIMO_DA_MAESTRIA,
  NOME_DO_GRUPO_DE_MAESTRIA,
  nivelDaMaestria,
  TETO_DIARIO_DE_XP,
  textoDoBonusDaTrilha,
  TRILHAS_DE_MAESTRIA,
  xpRestanteHoje,
  type GrupoDeMaestria,
  type TrilhaDeMaestria,
} from '@/rules/maestrias';
import { textoDaFicha, TEXTOS_DA_FICHA } from '@/rules/textosDaFicha';
import { PainelDaForja } from '@/components/forja/KitDaForja';
import { CONTORNO_PIXEL } from '@/components/ficha/PlacaPixel';

interface MaestriasPanelProps {
  character: CharacterDocument;
  className?: string;
}

const GRUPOS = Object.keys(NOME_DO_GRUPO_DE_MAESTRIA) as GrupoDeMaestria[];
const fmt = (n: number) => n.toLocaleString('pt-BR');
const pixel: React.CSSProperties = { imageRendering: 'pixelated' };

export function Trilha({ trilha, character, dia }: { trilha: TrilhaDeMaestria; character: CharacterDocument; dia: string }) {
  const t = TEXTOS_DA_FICHA.maestrias;
  const progresso = character.maestrias?.[trilha.id];
  const { nivel, xpNoNivel, xpParaProximo } = nivelDaMaestria(progresso?.xp ?? 0);
  const hoje = TETO_DIARIO_DE_XP - xpRestanteHoje(progresso, dia);
  const proximoMarco = nivel >= NIVEL_MAXIMO_DA_MAESTRIA ? null : (marcosAlcancados(nivel) + 1) * MARCO_A_CADA;
  const largura = xpParaProximo ? (xpNoNivel / xpParaProximo) * 100 : 100;
  const icone = iconeDaTrilha(trilha);
  const totalDeMarcos = NIVEL_MAXIMO_DA_MAESTRIA / MARCO_A_CADA;
  const marcos = marcosAlcancados(nivel);

  return (
    <li className={trilha.bloqueada ? 'opacity-60' : ''}>
      <PainelDaForja borda="2cqw" className="flex flex-col gap-[1cqw]">
        <div className="flex items-center justify-between gap-[1cqw]">
          <span className="flex items-center gap-[1.4cqw] font-cinzel font-black text-[2.8cqw] leading-[1.35] text-[#F5F3E0]" style={{ textShadow: CONTORNO_PIXEL }}>
            {icone && (
              <span className="shrink-0 w-[9cqw] h-[9cqw] flex items-center justify-center border-[0.5cqw] border-[#B8862B] bg-[#05070D] p-[0.6cqw]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={icone} alt="" aria-hidden="true" draggable={false} className="w-full h-full object-contain pointer-events-none" style={{ ...pixel, opacity: trilha.bloqueada ? 0.6 : 1 }} />
              </span>
            )}
            {trilha.bloqueada && !icone && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={KIT_DA_FORJA.proibido} alt="" aria-hidden="true" draggable={false} className="w-[3.4cqw] h-[3.4cqw] shrink-0 pointer-events-none" style={pixel} />
            )}
            {trilha.nome}
          </span>
          <span className="shrink-0 font-cinzel font-bold text-[2cqw] leading-[1.4] px-[1cqw] bg-[#05070D]/80 border border-[#B8862B] text-[#EDB44C]">
            {trilha.bloqueada ? t.emBreve : textoDaFicha(t.nivel, { n: nivel, max: NIVEL_MAXIMO_DA_MAESTRIA })}
          </span>
        </div>
        {!trilha.bloqueada && (
          <>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={xpParaProximo ?? 1}
              aria-valuenow={xpParaProximo ? xpNoNivel : 1}
              aria-label={textoDaFicha(t.progressoAria, { nome: trilha.nome })}
              className="h-[2.6cqw] border-[0.5cqw] border-[#B8862B] bg-[#05070D] p-[0.3cqw]"
            >
              <div className="h-full" style={{ width: `${largura}%`, backgroundImage: 'repeating-linear-gradient(90deg, #6FE3EE 0 1.1cqw, #2F9FB8 1.1cqw 1.4cqw)' }} />
            </div>
            {/* os marcos (a cada 10 níveis): um quadradinho para cada, aceso quando já foi alcançado */}
            <div role="img" aria-label={textoDaFicha(t.marcos, { n: marcos, max: totalDeMarcos })} className="flex gap-[0.8cqw]">
              {Array.from({ length: totalDeMarcos }, (_, i) => (
                <span key={i} aria-hidden="true" className={`flex-1 h-[1.6cqw] border border-[#05070D] ${i < marcos ? 'bg-[#EDB44C]' : 'bg-[#2B3F5C]'}`} />
              ))}
            </div>
            <span className="font-cinzel text-[2cqw] leading-snug text-[#C9D6EA]">
              {xpParaProximo ? textoDaFicha(t.xp, { atual: fmt(xpNoNivel), total: fmt(xpParaProximo) }) : t.nivelMaximo} · {textoDaFicha(t.hoje, { n: fmt(hoje), max: fmt(TETO_DIARIO_DE_XP) })}
              {proximoMarco ? ` · ${textoDaFicha(t.proximoMarco, { n: proximoMarco })}` : ''}
            </span>
            <span className="font-cinzel font-bold text-[2.2cqw] leading-snug text-[#EDB44C]">{textoDoBonusDaTrilha(trilha.id, nivel)}</span>
          </>
        )}
        <span className="font-cinzel text-[1.9cqw] leading-snug text-[#9CC4E0]">
          {trilha.comoSobe} {t.porNivel} {trilha.porNivel} {textoDaFicha(t.aCada, { n: MARCO_A_CADA })} {trilha.porMarco}
        </span>
      </PainelDaForja>
    </li>
  );
}

/**
 * Maestrias em pixel: 100 níveis por trilha, marcos a cada 10. Sobem jogando (lutas, forja e expedição), com teto de XP por
 * dia em cada trilha. As de monstro aparecem bloqueadas até o bestiário ser classificado. Os textos saem de `textosDaFicha.ts`.
 */
export function MaestriasPanel({ character, className = '' }: MaestriasPanelProps) {
  const t = TEXTOS_DA_FICHA.maestrias;
  const [grupo, setGrupo] = useState<GrupoDeMaestria>('armas');
  const dia = diaDeBrasilia(new Date());

  return (
    <div className={`flex flex-col gap-[1.8cqw] w-full select-none ${className}`}>
      <div role="tablist" aria-label={t.grupos} className="flex flex-wrap gap-[1cqw]">
        {GRUPOS.map((g) => {
          const ativo = grupo === g;
          return (
            <button
              key={g}
              type="button"
              role="tab"
              aria-selected={ativo}
              onClick={() => setGrupo(g)}
              className={`relative font-cinzel font-extrabold uppercase text-[2.2cqw] leading-[1.3] text-center px-[0.6cqw] cursor-pointer active:translate-y-px ${ativo ? 'text-[#0A1A22]' : 'text-[#9CC4E0]'}`}
              style={{ borderStyle: 'solid', borderWidth: '1.8cqw 2cqw', borderImage: `url(${ativo ? KIT_DA_FORJA.abaAtiva : KIT_DA_FORJA.aba}) 20 24 fill / 1.8cqw 2cqw stretch`, filter: ativo ? 'drop-shadow(0 0 1.2cqw rgba(255,180,60,0.85))' : undefined, ...pixel }}
            >
              {NOME_DO_GRUPO_DE_MAESTRIA[g]}
            </button>
          );
        })}
      </div>
      <span className="font-cinzel text-[2cqw] leading-snug text-[#9CC4E0]">
        {textoDaFicha(t.teto, { n: fmt(TETO_DIARIO_DE_XP) })}
        {grupo === 'monstros' && t.avisoMonstros}
      </span>
      <ul className="flex flex-col gap-[1.6cqw]">
        {TRILHAS_DE_MAESTRIA.filter((tr) => tr.grupo === grupo).map((tr) => (
          <Trilha key={tr.id} trilha={tr} character={character} dia={dia} />
        ))}
      </ul>
    </div>
  );
}
