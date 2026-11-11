'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { BAU_ABERTO, MARCA_DE_FEITO, PRESENTE, TABULEIRO_DO_CHECKIN } from '@/assets/checkinUi';
import { iconeDaRecompensa } from '@/lib/checkinTela';
import type { EstadoDoDiario } from '@/server/diario';

type Token = () => Promise<string | null>;
const pixel: React.CSSProperties = { imageRendering: 'pixelated' };
const OURO = '#E0B24A';
const CONTORNO = '0.25cqw 0 0 #1A0A0E, -0.25cqw 0 0 #1A0A0E, 0 0.25cqw 0 #1A0A0E, 0 -0.25cqw 0 #1A0A0E';

const tokenPadrao: Token = async () => (auth.currentUser ? auth.currentUser.getIdToken() : null);

/** As mesmas chamadas de antes (`/api/diario`): uma leitura do estado e uma gravação por check-in. */
async function chamar(tokenFresco: Token, corpo?: unknown): Promise<{ ok: boolean; dados: Record<string, unknown> }> {
  try {
    const token = await tokenFresco();
    const res = await fetch('/api/diario', {
      method: corpo ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token ?? ''}`, ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    return { ok: res.ok, dados: (await res.json().catch(() => ({}))) as Record<string, unknown> };
  } catch {
    return { ok: false, dados: { error: 'Sem conexão. Tente de novo.' } };
  }
}

/**
 * Check-in em pop-up sobre a tela (saiu das Missões): o calendário de 30 dias no tabuleiro, a recompensa de hoje e o botão
 * de resgatar. Dias feitos ganham a marca dourada; o de hoje brilha; os especiais (7, 14, 21 e 30) têm a borda roxa.
 * Se faltar um dia, o calendário continua de onde parou.
 */
export function CheckinPopup({ aoFechar, tokenFresco = tokenPadrao, estadoInicial }: { aoFechar: () => void; tokenFresco?: Token; estadoInicial?: EstadoDoDiario['checkin'] }) {
  const [estado, setEstado] = useState<EstadoDoDiario['checkin'] | null>(estadoInicial ?? null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [recebido, setRecebido] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const r = await chamar(tokenFresco);
    if (!r.ok) {
      setErro(String(r.dados.error ?? 'Não foi possível carregar o Check-in agora.'));
      return;
    }
    setEstado((r.dados as unknown as EstadoDoDiario).checkin);
    setErro(null);
  }, [tokenFresco]);

  useEffect(() => {
    if (!estadoInicial) void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fechar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar();
    };
    window.addEventListener('keydown', fechar);
    return () => window.removeEventListener('keydown', fechar);
  }, [aoFechar]);

  async function fazer() {
    setOcupado(true);
    setErro(null);
    const r = await chamar(tokenFresco, { acao: 'checkin' });
    setOcupado(false);
    if (!r.ok) {
      setErro(String(r.dados.error ?? 'Não foi possível fazer o Check-in agora.'));
      return;
    }
    setRecebido(String(r.dados.mensagem ?? 'Check-in feito.'));
    setEstado((r.dados.estado as EstadoDoDiario).checkin);
  }

  const hoje = estado?.calendario.find((d) => d.hoje);
  const proximo = estado?.calendario.find((d) => d.dia === estado.proximoDia);
  const feitos = estado?.calendario.filter((d) => d.feito).length ?? 0;

  return (
    <div role="dialog" aria-modal="true" aria-label="Check-in" onClick={aoFechar} className="forja-palco !fixed inset-0 !z-[80] !items-center !justify-center px-[3cqw]" style={{ backgroundColor: 'rgba(8,3,6,0.62)', left: 0, right: 0 }}>
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-[94cqw] flex flex-col items-center gap-[1.4cqw] max-h-[96dvh] overflow-y-auto forja-rolagem">
        <button type="button" aria-label="Fechar" onClick={aoFechar} className="absolute top-0 right-0 z-10 w-[8cqw] h-[8cqw] flex items-center justify-center cursor-pointer active:translate-y-px border-[0.5cqw] border-[#B8862B] bg-[#4A1620] text-[#F5E3B3] font-cinzel font-black text-[4.4cqw] leading-none" style={{ boxShadow: '0 0 0 0.3cqw #1A0A0E' }}>×</button>

        <h2 className="font-cinzel font-black uppercase tracking-widest text-[5.4cqw] leading-none text-[#F5E3B3] pt-[1cqw]" style={{ textShadow: CONTORNO }}>Check-in</h2>

        {/* O tabuleiro com o calendário em cima do pergaminho */}
        <div className="relative w-full" style={{ aspectRatio: '640 / 559' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={TABULEIRO_DO_CHECKIN} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full" style={pixel} />
          <ul aria-label="Calendário do Check-in" className="absolute grid grid-cols-6 gap-[0.7cqw] content-between" style={{ left: '12.5%', right: '11.5%', top: '29.5%', bottom: '22%', padding: '1cqw', background: 'linear-gradient(180deg, #E9D5A6 0%, #DCC590 100%)', boxShadow: 'inset 0 0 0 0.3cqw #B89A5E' }}>
            {(estado?.calendario ?? Array.from({ length: 30 }, (_, i) => ({ dia: i + 1, recompensa: [] as string[], especial: false, feito: false, hoje: false }))).map((d) => (
              <li key={d.dia} aria-label={`Dia ${d.dia}${d.feito ? ', feito' : d.hoje ? ', hoje' : ''}${d.recompensa.length ? `: ${d.recompensa.join(' e ')}` : ''}`} title={d.recompensa.join(' + ')} className="relative flex items-center justify-center min-h-[7.6cqw]" style={{ background: d.especial ? 'linear-gradient(180deg, #3B1740 0%, #240E2A 100%)' : 'linear-gradient(180deg, #5A1C28 0%, #3A1018 100%)', border: `0.4cqw solid ${d.hoje ? '#FFE07A' : d.especial ? '#A77BDB' : '#B8862B'}`, boxShadow: d.hoje ? '0 0 2.2cqw 0.4cqw rgba(255,214,90,0.85)' : undefined, opacity: d.feito ? 0.6 : 1 }}>
                <span className="absolute top-0 left-0 px-[0.7cqw] bg-[#E9D5A6] border-b border-r border-[#B8862B] font-cinzel font-black text-[1.9cqw] leading-[1.5] text-[#3A1018]">{d.dia}</span>
                {d.recompensa.length > 0 && !d.feito && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={iconeDaRecompensa(d.recompensa)} alt="" aria-hidden="true" draggable={false} className="w-[5.4cqw] h-[5.4cqw] object-contain mt-[1.6cqw]" style={pixel} />
                )}
                {d.feito && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={MARCA_DE_FEITO} alt="Feito" draggable={false} className="absolute inset-0 m-auto w-[6.4cqw] h-[6.4cqw] object-contain" style={pixel} />
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* A recompensa de hoje e o botão */}
        <section aria-label="Recompensa de hoje" className="w-full flex flex-col items-center gap-[1.4cqw] px-[3cqw] py-[2cqw]" style={{ background: 'linear-gradient(180deg, #4A1620 0%, #2A0C14 100%)', border: '0.5cqw solid #B8862B', boxShadow: '0 0 0 0.3cqw #1A0A0E' }}>
          {erro ? (
            <p role="alert" className="font-cinzel font-bold text-[3cqw] text-center text-[#FFB4B4]">{erro}</p>
          ) : !estado ? (
            <p role="status" className="font-cinzel font-bold text-[3cqw] text-center text-[#E9D5A6]">Carregando...</p>
          ) : recebido ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={PRESENTE} alt="" aria-hidden="true" draggable={false} className="w-[16cqw] h-[16cqw] object-contain" style={pixel} />
              <p role="status" className="font-cinzel font-bold text-[3.2cqw] text-center leading-snug text-[#F5E3B3]" style={{ textShadow: CONTORNO }}>{recebido}</p>
            </>
          ) : (
            <>
              <p className="font-cinzel font-extrabold uppercase text-[3.2cqw] text-[#E0B24A] leading-none" style={{ textShadow: CONTORNO }}>
                {estado.feitoHoje ? 'Check-in de hoje feito' : `Dia ${estado.proximoDia} de 30`}
              </p>
              {(estado.feitoHoje ? proximo : hoje) && (
                <p className="flex items-center justify-center gap-[1.4cqw] font-cinzel font-bold text-[3cqw] text-center leading-snug text-[#F5E3B3]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={iconeDaRecompensa((estado.feitoHoje ? proximo : hoje)!.recompensa)} alt="" aria-hidden="true" draggable={false} className="w-[6.4cqw] h-[6.4cqw] object-contain shrink-0" style={pixel} />
                  <span>{estado.feitoHoje ? 'Amanhã: ' : ''}{(estado.feitoHoje ? proximo : hoje)!.recompensa.join(' + ')}</span>
                </p>
              )}
              <p className="font-cinzel text-[2.3cqw] text-center text-[#C9B27A]">{feitos} de 30 dias no ciclo. Os dias com borda roxa (7, 14, 21 e 30) dão Diamantes.</p>
            </>
          )}
          {estado && !recebido && (
            <button type="button" disabled={ocupado || estado.feitoHoje} onClick={() => void fazer()} className="w-full max-w-[64cqw] py-[1.6cqw] font-cinzel font-black uppercase tracking-wider text-[3.6cqw] leading-none enabled:cursor-pointer enabled:active:translate-y-px disabled:cursor-not-allowed" style={{ color: estado.feitoHoje ? '#8C7A5A' : '#2A0C14', background: estado.feitoHoje ? '#3A2A24' : `linear-gradient(180deg, #FFD966 0%, ${OURO} 55%, #B8862B 100%)`, border: '0.5cqw solid #1A0A0E', boxShadow: estado.feitoHoje ? undefined : 'inset 0 0.4cqw 0 #FFF0B0, 0 0 2cqw rgba(255,214,90,0.5)' }}>
              {ocupado ? 'Resgatando...' : estado.feitoHoje ? 'Volte amanhã' : 'Fazer o Check-in'}
            </button>
          )}
          {recebido && (
            <button type="button" onClick={aoFechar} className="w-full max-w-[64cqw] py-[1.6cqw] font-cinzel font-black uppercase tracking-wider text-[3.6cqw] leading-none cursor-pointer active:translate-y-px" style={{ color: '#2A0C14', background: `linear-gradient(180deg, #FFD966 0%, ${OURO} 55%, #B8862B 100%)`, border: '0.5cqw solid #1A0A0E' }}>Fechar</button>
          )}
        </section>
        {/* O baú aberto aparece como prêmio do dia 30 */}
        {estado && !recebido && estado.proximoDia >= 24 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={BAU_ABERTO} alt="" aria-hidden="true" draggable={false} className="absolute -bottom-[1cqw] -left-[3cqw] w-[20cqw] h-[20cqw] object-contain pointer-events-none" style={pixel} />
        )}
      </div>
    </div>
  );
}
