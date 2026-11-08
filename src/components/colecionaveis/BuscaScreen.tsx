'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, HelpCircle } from 'lucide-react';
import { ANEL_DA_ROLETA, BRILHO_DA_RARIDADE, FUNDO_DO_BUSCAR, GEMA_DA_ROLETA, ICONES_DOS_SELOS } from '@/assets/buscarUi';
import type { ResultadoDaBusca } from '@/game/colecionaveis';
import { formatarCompacto, formatarTotal } from '@/rules/numerosCompactos';
import { BUSCAS_PARA_GARANTIA, NOME_DO_SELO, RARIDADE_DO_SELO, SELOS_DE_BUSCA, SELOS_POR_BUSCA, type SeloDeBusca } from '@/rules/colecionaveis';
import { chamarColecionaveis, type EstadoDosColecionaveis, type Token } from './api';
import { InfoDaBusca } from './InfoDaBusca';
import { RevelacaoDaBusca } from './RevelacaoDaBusca';

const VERMELHO = '#E5484D';
const SOMBRA = '[text-shadow:1px_1px_0_#1A120B]';
const FAISCAS = [
  { left: '8%', atraso: '0s', dur: '4.2s' },
  { left: '19%', atraso: '1.3s', dur: '5s' },
  { left: '31%', atraso: '0.6s', dur: '3.8s' },
  { left: '43%', atraso: '2.1s', dur: '4.6s' },
  { left: '55%', atraso: '0.2s', dur: '4s' },
  { left: '67%', atraso: '1.7s', dur: '5.2s' },
  { left: '79%', atraso: '0.9s', dur: '4.4s' },
  { left: '91%', atraso: '2.5s', dur: '3.9s' },
];
/** A volta da roleta dura pelo menos isto, para a expectativa crescer (e acaba quando a resposta chegar). */
const GIRO_MINIMO_MS = 1600;
const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const semMovimento = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Buscar em tela cheia, no estilo gacha: a roleta gira e brilha na cor da raridade do selo escolhido, a carta vira e
 * a revelação explode em luz. Cada busca gasta 10 selos; as chances e a garantia ficam no "?".
 */
export function BuscaScreen({ tokenFresco }: { tokenFresco: Token }) {
  const [estado, setEstado] = useState<EstadoDosColecionaveis | null>(null);
  const [erroAoCarregar, setErroAoCarregar] = useState(false);
  const [selo, setSelo] = useState<SeloDeBusca>('desgastado');
  const [girando, setGirando] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const [resultados, setResultados] = useState<ResultadoDaBusca[]>([]);
  const [infoAberta, setInfoAberta] = useState(false);
  const [totalAberto, setTotalAberto] = useState<SeloDeBusca | null>(null);

  const carregar = useCallback(async () => {
    const r = await chamarColecionaveis(tokenFresco);
    if (r.ok) setEstado(r.dados as unknown as EstadoDosColecionaveis);
    else setErroAoCarregar(true);
  }, [tokenFresco]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (!totalAberto) return;
    const t = setTimeout(() => setTotalAberto(null), 3000);
    return () => clearTimeout(t);
  }, [totalAberto]);

  async function buscar(vezes: number) {
    setGirando(true);
    setAviso(null);
    const [r] = await Promise.all([chamarColecionaveis(tokenFresco, { acao: 'buscar', selo, vezes }), esperar(semMovimento() ? 0 : GIRO_MINIMO_MS)]);
    setGirando(false);
    if (!r.ok) {
      setAviso({ texto: String(r.dados.error ?? 'Não foi possível buscar agora.'), erro: true });
      return;
    }
    setEstado(r.dados.estado as EstadoDosColecionaveis);
    setResultados((r.dados.resultados as ResultadoDaBusca[]) ?? []);
  }

  const cor = BRILHO_DA_RARIDADE[RARIDADE_DO_SELO[selo]];
  const tenho = estado?.selos[selo] ?? 0;
  const feitas = estado?.garantia[selo] ?? 0;
  const pode = (vezes: number) => !girando && !!estado && tenho >= SELOS_POR_BUSCA * vezes;

  return (
    <main className="fixed inset-0 overflow-hidden select-none bg-[#0D0D0D] flex flex-col" style={{ ['--cor' as string]: cor }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={FUNDO_DO_BUSCAR} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover pointer-events-none" style={{ imageRendering: 'pixelated' }} />
      {FAISCAS.map((f, i) => (
        <span key={i} aria-hidden="true" className="busca-faisca" style={{ left: f.left, bottom: '6%', ['--atraso' as string]: f.atraso, ['--dur' as string]: f.dur }} />
      ))}

      <header className="relative z-10 flex items-center gap-2 px-2.5 pt-3 sm:px-5">
        <Link href="/menu" aria-label="Voltar ao Menu" className="caixa-pixel relative inline-flex items-center gap-1.5 pl-2 pr-3 py-1.5">
          <ArrowLeft className="w-4 h-4 text-[#F5E3B3]" aria-hidden="true" />
          <span className={`font-[family-name:var(--font-pixel)] text-[8px] leading-none uppercase text-[#F5E3B3] ${SOMBRA}`}>Menu</span>
        </Link>
        <Link href="/colecao" className="caixa-pixel relative ml-auto inline-flex items-center px-3 py-1.5">
          <span className={`font-[family-name:var(--font-pixel)] text-[8px] leading-none uppercase text-[#F5E3B3] ${SOMBRA}`}>Coleção</span>
        </Link>
        <button type="button" onClick={() => setInfoAberta(true)} aria-label="Chances e garantia da busca" className="caixa-pixel relative inline-flex items-center justify-center w-8 h-8 cursor-pointer">
          <HelpCircle className="w-4 h-4 text-[#F5E3B3]" aria-hidden="true" />
        </button>
      </header>

      {erroAoCarregar ? (
        <p role="alert" className="relative z-10 m-4 caixa-pixel p-3 text-center text-sm font-semibold" style={{ color: VERMELHO }}>Não foi possível carregar agora. Tente de novo em instantes.</p>
      ) : !estado ? (
        <p role="status" className={`relative z-10 mt-6 text-center font-[family-name:var(--font-silk)] text-sm text-[#E2D6B6] ${SOMBRA}`}>Carregando...</p>
      ) : (
        <>
          {/* Os 4 selos: a HUD e, ao mesmo tempo, a escolha de qual usar */}
          <div role="radiogroup" aria-label="Selo da busca" className="relative z-10 grid grid-cols-4 gap-1.5 px-2.5 pt-3 sm:px-5">
            {SELOS_DE_BUSCA.map((s, i) => {
              const ativo = s === selo;
              const corDoSelo = BRILHO_DA_RARIDADE[RARIDADE_DO_SELO[s]];
              const n = estado.selos[s] ?? 0;
              const g = estado.garantia[s] ?? 0;
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={ativo}
                  aria-label={`${NOME_DO_SELO[s]}: ${formatarTotal(n)}, garantia ${g} de ${BUSCAS_PARA_GARANTIA}`}
                  disabled={girando}
                  onClick={() => (ativo ? setTotalAberto((a) => (a === s ? null : s)) : setSelo(s))}
                  className={`pilula-pixel relative flex flex-col items-center gap-0.5 px-1 pt-1 pb-1.5 cursor-pointer transition-transform ${ativo ? '-translate-y-0.5 brightness-125' : 'opacity-70'}`}
                  style={{ ['--cor' as string]: corDoSelo, ...(ativo ? { boxShadow: `0 0 0 2px #1A120B, inset 0 0 0 2px ${corDoSelo}, 0 0 14px ${corDoSelo}` } : {}) }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ICONES_DOS_SELOS[s]} alt="" aria-hidden="true" className={`w-full aspect-square object-contain ${ativo ? 'busca-selo busca-selo--escolhido' : ''}`} style={{ imageRendering: 'pixelated', ['--atraso' as string]: `${i * 0.4}s` }} />
                  <span className={`font-[family-name:var(--font-silk)] text-[12px] font-bold tabular-nums text-[#F5F3E0] ${SOMBRA}`}>{formatarCompacto(n)}</span>
                  <span className="barra-pixel block h-1.5 w-[84%] overflow-hidden" aria-hidden="true">
                    <span className="block h-full" style={{ width: `${(g / BUSCAS_PARA_GARANTIA) * 100}%`, backgroundColor: corDoSelo }} />
                  </span>
                  {totalAberto === s && (
                    <span role="status" className="caixa-pixel absolute left-1/2 -translate-x-1/2 top-full z-40 mt-2 whitespace-nowrap px-2 py-1 text-[11px] text-[#F5F3E0]">
                      {NOME_DO_SELO[s]} {formatarTotal(n)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* A roleta: o anel gira, a gema pulsa; ao buscar, tudo acelera e brilha na cor da raridade */}
          <div className="relative z-10 flex-1 min-h-0 flex items-center justify-center">
            <div className={`relative ${girando ? 'busca-tremer' : ''}`} style={{ width: 'min(78vw, 36dvh, 340px)', aspectRatio: '1' }}>
              <span aria-hidden="true" className={`absolute inset-[8%] rounded-full ${girando ? 'busca-aura--girando' : 'busca-aura'}`} style={{ background: `radial-gradient(circle, ${cor} 0%, color-mix(in srgb, ${cor} 40%, transparent) 45%, transparent 70%)` }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ANEL_DA_ROLETA} alt="" aria-hidden="true" className={`absolute inset-0 w-full h-full ${girando ? 'busca-anel--girando' : 'busca-anel'}`} style={{ imageRendering: 'pixelated' }} />
              <span className="absolute inset-0 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={GEMA_DA_ROLETA} alt="" aria-hidden="true" className={`w-[34%] ${girando ? 'busca-gema--girando' : 'busca-gema'}`} style={{ imageRendering: 'pixelated' }} />
              </span>
            </div>
          </div>

          <div className="relative z-10 px-3 pb-4 sm:px-6 flex flex-col items-center gap-2.5">
            <p aria-label={`Garantia: ${feitas} de ${BUSCAS_PARA_GARANTIA} buscas com este selo`} className="caixa-pixel relative px-3 py-1 font-[family-name:var(--font-pixel)] text-[7px] leading-none text-[#F5E3B3]">
              GARANTIA <span className="text-[#ED8A0C] tabular-nums">{feitas}/{BUSCAS_PARA_GARANTIA}</span>
            </p>
            {aviso && <p role={aviso.erro ? 'alert' : 'status'} className="caixa-pixel relative px-3 py-1.5 text-center font-[family-name:var(--font-silk)] text-[12px] font-bold" style={{ color: aviso.erro ? '#FF8A8A' : '#7BC47F' }}>{aviso.texto}</p>}
            <div className="w-full max-w-[420px] grid grid-cols-2 gap-2">
              {[1, 10].map((vezes) => {
                const custo = SELOS_POR_BUSCA * vezes;
                const ok = pode(vezes);
                return (
                  <button
                    key={vezes}
                    type="button"
                    disabled={!ok}
                    onClick={() => void buscar(vezes)}
                    className={`botao-kit botao-kit-dourado px-1.5 py-1 font-cinzel font-extrabold uppercase text-[#2B1D0E] flex flex-col items-center leading-tight ${ok ? 'busca-botao-pronto' : ''}`}
                  >
                    <span className="text-[13px]">Buscar {vezes}x</span>
                    <span className="flex items-center gap-1 font-[family-name:var(--font-silk)] text-[12px] normal-case" style={{ color: tenho >= custo ? '#2B1D0E' : '#7A1F1F' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ICONES_DOS_SELOS[selo]} alt="" aria-hidden="true" className="w-5 h-5 object-contain" style={{ imageRendering: 'pixelated' }} />
                      {custo}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {infoAberta && <InfoDaBusca seloInicial={selo} aoFechar={() => setInfoAberta(false)} />}
      {resultados.length > 0 && <RevelacaoDaBusca resultados={resultados} aoFechar={() => setResultados([])} />}
    </main>
  );
}
