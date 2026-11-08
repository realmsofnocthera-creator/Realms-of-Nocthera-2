'use client';

import React from 'react';
import { ChevronsUp, X } from 'lucide-react';
import { ATTRIBUTE_ICONS } from '@/assets/icons';
import { EstrelaPixel, IconeDeMoeda, IconeDeRaridade } from '@/components/colecao/ArtesDaColecao';
import { ATTRIBUTE_DISPLAY_NAMES } from '@/rules/attributeInfo';
import {
  custoDaEstrela,
  custoDoReforco,
  ESTRELAS_MAXIMAS,
  estaAtivo,
  FRAGMENTOS_PARA_ATIVAR,
  NOME_DA_CATEGORIA_DE_COLECIONAVEL,
  NOME_DA_RARIDADE_DE_COLECIONAVEL,
  nivelMaximoDoReforco,
  proximaEstrelaQueSobe,
  proximoNivelQueSobe,
  valorDoColecionavel,
  type Colecionavel,
  type EstadoDoColecionavel,
} from '@/rules/colecionaveis';
import { loreDoColecionavel } from '@/rules/loreColecionaveis';
import { EMBLEMA_RARIDADE_MAP } from '@/rules/emblemas';
import { MolduraDoColecionavel } from './MolduraDoColecionavel';

const VERMELHO = '#E5484D';
const VERDE = '#7BC47F';

/** Custo de reforçar `niveis` níveis a partir do nível atual. */
export function custoDeVariosNiveis(c: Colecionavel, nivel: number, niveis: number) {
  let total = 0;
  for (let n = nivel; n < nivel + niveis; n++) total += custoDoReforco(c.raridade, n);
  return total;
}

function BotaoDoPopup({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="botao-kit botao-kit-dourado flex-1 min-w-[120px] px-1.5 font-cinzel font-bold uppercase text-[11px] leading-tight text-[#2B1D0E] flex items-center justify-center gap-1.5 flex-wrap"
    >
      {children}
    </button>
  );
}

/** Um custo em ícone e número; fica vermelho quando falta. */
function Custo({ moeda, n, falta }: { moeda?: 'fragmento' | 'pedra'; n: number; falta: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 font-[family-name:var(--font-silk)] text-[11px] normal-case" style={{ color: falta ? '#7A1F1F' : '#2B1D0E' }}>
      {moeda ? <IconeDeMoeda moeda={moeda} className="w-4 h-4" /> : <span className="text-[9px] uppercase">frag.</span>}
      {n}
    </span>
  );
}

export interface PopupDoColecionavelProps {
  c: Colecionavel;
  e: EstadoDoColecionavel | undefined;
  /** Fragmentos de Memória e Pedras da Recordação do jogador. */
  memoria: number;
  pedras: number;
  ocupado: boolean;
  aviso: { texto: string; erro: boolean } | null;
  aoAgir: (acao: 'ativar' | 'reforcar' | 'estrela', extra: Record<string, unknown>) => void;
  aoFechar: () => void;
}

/**
 * O pop-up do colecionável: a arte grande com a moldura da raridade, o bônus de atributo com o ícone, o nível e as
 * estrelas, um mini texto de lore e os botões para ativar pela primeira vez, reforçar e subir estrela.
 */
export function PopupDoColecionavel({ c, e, memoria, pedras, ocupado, aviso, aoAgir, aoFechar }: PopupDoColecionavelProps) {
  const def = EMBLEMA_RARIDADE_MAP[c.raridade];
  const fragmentos = e?.fragmentos ?? 0;
  const ativo = estaAtivo(e);
  const nivel = e?.nivel ?? 0;
  const estrelas = e?.estrelas ?? 0;
  const maximo = nivelMaximoDoReforco(estrelas);
  const custoAtivar = FRAGMENTOS_PARA_ATIVAR[c.raridade];
  const bonus = ativo ? valorDoColecionavel(c.raridade, nivel, estrelas) : valorDoColecionavel(c.raridade, 1, 0);
  const proximoNivel = ativo ? proximoNivelQueSobe(c.raridade, nivel) : null;
  const proximaEstrela = ativo ? proximaEstrelaQueSobe(c.raridade, estrelas) : null;
  const lore = loreDoColecionavel(c.id);
  const custoEstrela = estrelas < ESTRELAS_MAXIMAS ? custoDaEstrela(c.raridade, estrelas + 1) : null;

  return (
    <div role="dialog" aria-modal="true" aria-label={c.nome} onClick={aoFechar} className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-3 py-4">
      <div onClick={(ev) => ev.stopPropagation()} className="caixa-pixel relative w-full max-w-[360px] max-h-[92dvh] overflow-y-auto p-3.5 flex flex-col items-center gap-2.5">
        <button type="button" onClick={aoFechar} aria-label="Fechar" className="pilula-pixel absolute top-2.5 right-2.5 z-10 w-8 h-8 flex items-center justify-center cursor-pointer">
          <X className="w-4 h-4 text-[#F5E3B3]" aria-hidden="true" />
        </button>

        <p className="flex items-center gap-1.5 font-[family-name:var(--font-pixel)] text-[8px] leading-none uppercase [text-shadow:1px_1px_0_#1A120B]" style={{ color: def.cor }}>
          <IconeDeRaridade raridade={c.raridade} className="w-6 h-6" />
          {NOME_DA_RARIDADE_DE_COLECIONAVEL[c.raridade]}
        </p>
        <h2 className="font-cinzel font-extrabold text-lg leading-tight text-center text-[#F5E3B3] [text-shadow:2px_2px_0_#1A120B] px-6">{c.nome}</h2>
        <p className="font-[family-name:var(--font-silk)] text-[10px] uppercase tracking-wide text-[#B2A66C] -mt-1.5">{NOME_DA_CATEGORIA_DE_COLECIONAVEL[c.categoria]}</p>

        <div style={{ filter: ativo ? `drop-shadow(0 0 10px ${def.cor})` : undefined }}>
          <MolduraDoColecionavel c={c} ativo={ativo} className="w-36 h-36" />
        </div>

        {/* Nível e estrelas, ou o progresso dos fragmentos para ativar */}
        {ativo ? (
          <div className="w-full flex flex-col items-center gap-1">
            <div className="flex items-center gap-1" aria-label={`${estrelas} de ${ESTRELAS_MAXIMAS} estrelas`}>
              {Array.from({ length: ESTRELAS_MAXIMAS }, (_, i) => <EstrelaPixel key={i} cheia={i < estrelas} className="w-4 h-4" />)}
            </div>
            <div className="w-full flex items-center gap-2">
              <span className="font-[family-name:var(--font-pixel)] text-[8px] text-[#ED8A0C] shrink-0">NV {nivel}/{maximo}</span>
              <div role="progressbar" aria-valuemin={0} aria-valuemax={maximo} aria-valuenow={nivel} aria-label="Nível" className="barra-pixel h-2.5 flex-1 overflow-hidden">
                <div className="h-full" style={{ width: `${Math.min(100, (nivel / maximo) * 100)}%`, backgroundColor: '#2EE6D6', boxShadow: 'inset 0 -2px 0 #1FA89C' }} />
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full flex items-center gap-2">
            <span className="font-[family-name:var(--font-silk)] text-[11px] text-[#E2D6B6] shrink-0 tabular-nums">{fragmentos}/{custoAtivar} frag.</span>
            <div role="progressbar" aria-valuemin={0} aria-valuemax={custoAtivar} aria-valuenow={Math.min(fragmentos, custoAtivar)} aria-label="Fragmentos para ativar" className="barra-pixel h-2.5 flex-1 overflow-hidden">
              <div className="h-full" style={{ width: `${Math.min(100, (fragmentos / custoAtivar) * 100)}%`, backgroundColor: def.cor, boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.35)' }} />
            </div>
          </div>
        )}

        {/* O bônus de atributo, com o ícone */}
        <div className="pilula-pixel w-full flex items-center gap-2 px-2 py-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ATTRIBUTE_ICONS[c.atributo]} alt="" aria-hidden="true" className="w-8 h-8 object-contain shrink-0" style={{ imageRendering: 'pixelated' }} />
          <div className="min-w-0 flex-1">
            <p className="font-[family-name:var(--font-silk)] text-[12px] font-bold text-[#F5F3E0] leading-tight">{ATTRIBUTE_DISPLAY_NAMES[c.atributo]}</p>
            <p className="font-[family-name:var(--font-silk)] text-[10px] text-[#B2A66C] leading-tight">{ativo ? 'bônus atual' : 'ao ativar'}</p>
          </div>
          <span className="font-[family-name:var(--font-pixel)] text-[14px] leading-none [text-shadow:1px_1px_0_#1A120B]" style={{ color: ativo ? VERDE : '#E2D6B6' }}>+{bonus}</span>
        </div>
        {(proximoNivel || proximaEstrela) && (
          <p className="w-full flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 font-[family-name:var(--font-silk)] text-[10px] text-[#B2A66C]">
            {proximoNivel && <span className="inline-flex items-center gap-0.5"><ChevronsUp className="w-3 h-3 text-[#7BC47F]" aria-hidden="true" />+1 no nível {proximoNivel}</span>}
            {proximaEstrela && <span className="inline-flex items-center gap-0.5"><ChevronsUp className="w-3 h-3 text-[#7BC47F]" aria-hidden="true" />+1 com {proximaEstrela}<EstrelaPixel cheia className="w-2.5 h-2.5" /></span>}
          </p>
        )}

        {/* O mini texto de lore */}
        {lore && (
          <p className="slot-kit w-full px-2 py-1.5 font-cinzel italic text-[12px] leading-snug text-center text-[#E2D6B6]">{lore}</p>
        )}

        {/* Os botões: ativar pela primeira vez; reforçar e subir estrela depois */}
        <div className="w-full flex flex-wrap gap-1.5 justify-center">
          {!ativo ? (
            <BotaoDoPopup disabled={ocupado || fragmentos < custoAtivar} onClick={() => aoAgir('ativar', { id: c.id })}>
              Ativar <Custo n={custoAtivar} falta={fragmentos < custoAtivar} />
            </BotaoDoPopup>
          ) : (
            <>
              {nivel < maximo ? (
                <>
                  <BotaoDoPopup disabled={ocupado || memoria < custoDoReforco(c.raridade, nivel)} onClick={() => aoAgir('reforcar', { id: c.id, niveis: 1 })}>
                    Reforçar +1 <Custo moeda="fragmento" n={custoDoReforco(c.raridade, nivel)} falta={memoria < custoDoReforco(c.raridade, nivel)} />
                  </BotaoDoPopup>
                  {maximo - nivel >= 5 && (
                    <BotaoDoPopup disabled={ocupado || memoria < custoDeVariosNiveis(c, nivel, 5)} onClick={() => aoAgir('reforcar', { id: c.id, niveis: 5 })}>
                      +5 <Custo moeda="fragmento" n={custoDeVariosNiveis(c, nivel, 5)} falta={memoria < custoDeVariosNiveis(c, nivel, 5)} />
                    </BotaoDoPopup>
                  )}
                </>
              ) : estrelas < ESTRELAS_MAXIMAS ? (
                <p className="font-[family-name:var(--font-silk)] text-[10px] text-[#B2A66C] w-full text-center">Nível no limite: suba uma estrela.</p>
              ) : (
                <p className="font-[family-name:var(--font-silk)] text-[11px] text-[#F2C94C] w-full text-center">Reforço máximo</p>
              )}
              {custoEstrela && (
                <BotaoDoPopup disabled={ocupado || fragmentos < custoEstrela.fragmentos || pedras < custoEstrela.pedras} onClick={() => aoAgir('estrela', { id: c.id })}>
                  <EstrelaPixel cheia className="w-3 h-3" />{estrelas + 1}
                  <Custo n={custoEstrela.fragmentos} falta={fragmentos < custoEstrela.fragmentos} />
                  <Custo moeda="pedra" n={custoEstrela.pedras} falta={pedras < custoEstrela.pedras} />
                </BotaoDoPopup>
              )}
            </>
          )}
        </div>
        {aviso && (
          <p role={aviso.erro ? 'alert' : 'status'} className="w-full text-center font-[family-name:var(--font-silk)] text-[11px] font-bold" style={{ color: aviso.erro ? VERMELHO : VERDE }}>{aviso.texto}</p>
        )}
      </div>
    </div>
  );
}
