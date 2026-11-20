'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { NOME_DO_SELO, SELOS_DE_BUSCA, type SeloDeBusca } from '@/rules/colecionaveis';
import { EMBLEMA_RARIDADE_MAP } from '@/rules/emblemas';
import { TURNOS_DE_EXPEDICAO, VAGAS_DE_EXPEDICAO, type ExpedicaoEmAndamento, type TurnoDeExpedicao } from '@/rules/expedicao';
import type { RaridadeMaterial } from '@/rules/raridades';
import type { EstadoDaExpedicao, RecompensaColetada } from '@/server/expedicao';
import { TEXTOS_DA_EXPEDICAO as T } from '@/rules/textosDaExpedicao';
import { faltaDepoisDoAvanco, horasValidas, limiteDoAvanco, progressoDaExpedicao } from '@/lib/expedicaoTela';
import {
  ANIMACOES_DA_EXPEDICAO, botao, DURACAO_DO_CARIMBO_MS, EXPEDICAO_UI, MATERIAL_POR_RARIDADE, POP, SELO_EM_LACO, turno as arteDoTurno, type TipoDeBotao,
} from '@/assets/expedicaoUi';

type Token = () => Promise<string | null>;
const VERMELHO = '#FF8A80';
const VERDE = '#9BE39F';
const TINTA = '#3B2412';
const CREME = '#F5E3B3';
const pixel = { imageRendering: 'pixelated' } as const;
/** Um tamanho da arte (grade de 360 px de largura) em pixels da tela: a tela escala com a largura. */
const u = (n: number) => `calc(var(--u) * ${n})`;

const NOME_DA_RARIDADE: Readonly<Record<RaridadeMaterial, readonly [string, string]>> = {
  comum: ['comum', 'comuns'],
  raro: ['raro', 'raros'],
  muitoRaro: ['muito raro', 'muito raros'],
  epico: ['épico', 'épicos'],
  lendario: ['lendário', 'lendários'],
};

async function chamar(tokenFresco: Token, corpo?: unknown): Promise<{ ok: boolean; dados: Record<string, unknown> }> {
  try {
    const token = await tokenFresco();
    const res = await fetch('/api/expedicao', {
      method: corpo ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token ?? ''}`, ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    return { ok: res.ok, dados: (await res.json().catch(() => ({}))) as Record<string, unknown> };
  } catch {
    return { ok: false, dados: { error: T.semConexao } };
  }
}

/** "1 h 05 min", "12 min 30 s". */
export function tempoRestante(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  if (h) return `${h} h ${String(m).padStart(2, '0')} min`;
  if (m) return `${m} min ${String(seg).padStart(2, '0')} s`;
  return `${seg} s`;
}

/** As recompensas de um turno, em texto curto. */
export function textoDaRecompensa(t: Pick<TurnoDeExpedicao, 'selos' | 'fragmentosDeMemoria' | 'pedrasDaRecordacao' | 'materiais'>): string[] {
  const selos = SELOS_DE_BUSCA.filter((s) => t.selos[s]).map((s) => `${t.selos[s]} ${NOME_DO_SELO[s].replace('Selo ', '')}`);
  const materiais = (Object.entries(t.materiais) as [RaridadeMaterial, number][]).map(([r, q]) => `${q} ${NOME_DA_RARIDADE[r][q > 1 ? 1 : 0]}`);
  return [
    `Selos: ${selos.join(', ')}`,
    `${t.fragmentosDeMemoria} Fragmentos de Memória${t.pedrasDaRecordacao ? ` · ${t.pedrasDaRecordacao} Pedra${t.pedrasDaRecordacao > 1 ? 's' : ''} da Recordação` : ''}`,
    `Materiais de mundo: ${materiais.join(', ')}`,
  ];
}

/** Um botão de pixel do Yuri (ouro ou carmesim), com o texto por cima; escurece quando desativado e afunda ao apertar. */
export function BotaoPixel({ tipo, children, onClick, disabled, largura = 96, rotulo }: { tipo: TipoDeBotao; children: React.ReactNode; onClick: () => void; disabled?: boolean; largura?: number; rotulo?: string }) {
  const [apertado, setApertado] = useState(false);
  const estado = disabled ? 'desativado' : apertado ? 'pressionado' : 'normal';
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={rotulo}
      onPointerDown={() => setApertado(true)} onPointerUp={() => setApertado(false)} onPointerLeave={() => setApertado(false)} onPointerCancel={() => setApertado(false)}
      className="shrink-0 flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
      style={{ width: u(largura), height: u(largura * 39 / 112), backgroundImage: `url(${botao(tipo, estado)})`, backgroundSize: '100% 100%', ...pixel }}>
      <span className="font-cinzel font-black uppercase leading-none whitespace-nowrap" style={{ fontSize: u(largura >= 96 ? 8.5 : 7.5), color: disabled ? '#B9A98A' : CREME, textShadow: '0 1px 0 #000', transform: apertado ? `translateY(${u(1)})` : undefined }}>{children}</span>
    </button>
  );
}

/**
 * A barra de pixel do Yuri para escolher de 1 hora até o limite: o preenchimento e o ícone de ampulheta mostram a escolha; a
 * barra de verdade é um controle deslizante (teclado e toque) por cima.
 */
export function BarraDeHoras({ valor, limite, aoMudar }: { valor: number; limite: number; aoMudar: (v: number) => void }) {
  const pct = limite > 1 ? ((valor - 1) / (limite - 1)) * 100 : 100;
  return (
    <div className="relative shrink-0" style={{ width: u(220), height: u(25), backgroundImage: `url(${EXPEDICAO_UI.barraTrilho})`, backgroundSize: '100% 100%', ...pixel }}>
      <div aria-hidden className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pct}% 0 0)`, backgroundImage: `url(${EXPEDICAO_UI.barraPreenchimento})`, backgroundSize: '100% 100%', ...pixel }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img aria-hidden src={EXPEDICAO_UI.ampulheta} alt="" draggable={false} className="absolute pointer-events-none" style={{ width: u(28), height: u(28), left: `calc(${pct}% * 0.88 - ${u(2)})`, top: u(-1.5), ...pixel }} />
      <input type="range" min={1} max={Math.max(1, limite)} step={1} value={valor} disabled={limite <= 1}
        aria-label={T.barra} aria-valuetext={T.horasDoAvanco(valor)} onChange={(e) => aoMudar(Number(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default" />
    </div>
  );
}

/** O painel de acelerar: a barra de 1 hora até o máximo (o que falta ou os Avanços que você tem), o resumo e os botões. */
export function PainelDeAvanco({ faltaMs, avancos, ocupado, aoUsar, aoCancelar }: { faltaMs: number; avancos: number; ocupado: boolean; aoUsar: (horas: number) => void; aoCancelar: () => void }) {
  const limite = limiteDoAvanco(faltaMs, avancos);
  const [escolha, setEscolha] = useState(1);
  const horas = horasValidas(escolha, limite);
  const depois = faltaDepoisDoAvanco(faltaMs, horas);
  return (
    <div className="flex flex-col items-center gap-[1.6cqw]" style={{ padding: `${u(8)} ${u(6)}`, color: TINTA, gap: u(5) }}>
      <div className="font-cinzel font-black uppercase text-center" style={{ fontSize: u(9) }}>{T.quantasHoras}</div>
      {limite === 0 ? (
        <p role="status" className="font-semibold text-center" style={{ fontSize: u(9) }}>{T.semAvancos}</p>
      ) : (
        <>
          <div className="flex items-center justify-center" style={{ gap: u(4) }}>
            <button type="button" aria-label={T.menos} disabled={horas <= 1} onClick={() => setEscolha(horas - 1)} className="font-black cursor-pointer disabled:opacity-40" style={{ fontSize: u(16), width: u(22), lineHeight: 1 }}>−</button>
            <BarraDeHoras valor={horas} limite={limite} aoMudar={setEscolha} />
            <button type="button" aria-label={T.mais} disabled={horas >= limite} onClick={() => setEscolha(horas + 1)} className="font-black cursor-pointer disabled:opacity-40" style={{ fontSize: u(16), width: u(22), lineHeight: 1 }}>+</button>
          </div>
          <div className="flex items-center justify-between font-cinzel font-bold" style={{ width: u(220), fontSize: u(8) }}>
            <span>1 h</span>
            <span aria-live="polite" className="font-black" style={{ fontSize: u(14) }}>{T.horasDoAvanco(horas)}</span>
            <button type="button" onClick={() => setEscolha(limite)} disabled={horas >= limite} className="underline cursor-pointer disabled:opacity-40 font-bold">{T.maximo} ({limite} h)</button>
          </div>
          <p className="text-center font-semibold" style={{ fontSize: u(8.5), lineHeight: 1.35 }}>
            {T.usa(horas, avancos)}<br />
            {depois > 0 ? T.falta(tempoRestante(faltaMs), tempoRestante(depois)) : T.terminaNaHora(tempoRestante(faltaMs))}
          </p>
        </>
      )}
      <div className="flex items-center justify-center" style={{ gap: u(8) }}>
        <BotaoPixel tipo="carmesim" disabled={ocupado || limite === 0} onClick={() => aoUsar(horas)}>{T.confirmar}{limite > 0 ? ` ${horas} h` : ''}</BotaoPixel>
        <BotaoPixel tipo="ouro" disabled={ocupado} onClick={aoCancelar}>{T.cancelar}</BotaoPixel>
      </div>
    </div>
  );
}

/** Uma moldura de pergaminho do Yuri (nove fatias): os cantos ornamentados não esticam. */
function Pergaminho({ children, borda = 16, className = '', style }: { children: React.ReactNode; borda?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={className} style={{ borderStyle: 'solid', borderWidth: u(borda), borderImage: `url(${EXPEDICAO_UI.vagaLivre}) 26 fill / ${u(borda)} stretch`, ...pixel, ...style }}>
      {children}
    </div>
  );
}

/** Uma animação de uma vez só (carimbo, pop): o `key` a reinicia, e ela some para quem pede "reduzir movimento". */
function Anim({ src, className = '', style }: { src: string; className?: string; style?: React.CSSProperties }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" aria-hidden draggable={false} className={`exp-anim ${className}`} style={{ ...pixel, ...style }} />;
}

const CSS = `
@media (prefers-reduced-motion: reduce){.exp-anim{display:none}}
@keyframes expTremor{0%,34%{transform:translate(0,0)}38%{transform:translate(2px,2px)}44%{transform:translate(-2px,1px)}52%{transform:translate(1px,-1px)}60%,100%{transform:translate(0,0)}}
`;

function VagaCard({ vaga, e, horaDoServidor, ocupado, avancos, aberta, carimbo, onAcelerar, onColetar, onUsarAvanco, onFechar }: {
  vaga: number; e?: ExpedicaoEmAndamento; horaDoServidor: number; ocupado: boolean; avancos: number; aberta: boolean; carimbo?: 'enviar' | 'coletar';
  onAcelerar: () => void; onColetar: () => void; onUsarAvanco: (horas: number) => void; onFechar: () => void;
}) {
  const falta = e ? Date.parse(e.fim) - horaDoServidor : 0;
  const pronta = !!e && falta <= 0;
  const andando = !!e && falta > 0;
  const arte = !e ? EXPEDICAO_UI.vagaLivre : pronta ? EXPEDICAO_UI.vagaPronta : EXPEDICAO_UI.vagaAndamento;
  const progresso = e ? progressoDaExpedicao(e, horaDoServidor) : 0;
  return (
    <div className="flex flex-col" style={{ gap: u(4) }}>
      <div className="relative w-full" style={{ aspectRatio: '316 / 90', backgroundImage: `url(${arte})`, backgroundSize: '100% 100%', ...pixel }} data-estado={!e ? 'livre' : pronta ? 'pronta' : 'andamento'}>
        {pronta && <Anim src={ANIMACOES_DA_EXPEDICAO.vagaProntaBrilho} className="absolute inset-0 w-full h-full pointer-events-none" />}
        <span className="absolute font-cinzel font-black" style={{ left: '24.7%', top: '14%', fontSize: u(9), color: TINTA }}>{T.vaga(vaga + 1)}</span>
        <span className="absolute font-cinzel font-bold text-right" style={{ right: '8%', top: '14%', fontSize: u(8.5), color: pronta ? '#1E5E1E' : TINTA }}>
          {!e ? T.livre : pronta ? T.voltou : `${T.duracao(e.horas)} · ${T.faltam(tempoRestante(falta))}`}
        </span>
        {andando && (
          <div className="absolute" style={{ left: '24.7%', top: '60%', width: '69.6%', height: '27.8%' }}>
            <div aria-hidden className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - progresso * 100}% 0 0)`, backgroundImage: `url(${EXPEDICAO_UI.barraPreenchimento})`, backgroundSize: '100% 100%', ...pixel }} />
            <Anim src={ANIMACOES_DA_EXPEDICAO.barraBrilho} className="absolute inset-0 w-full h-full pointer-events-none" style={{ clipPath: `inset(0 ${100 - progresso * 100}% 0 0)` }} />
          </div>
        )}
        {pronta && (
          <div className="absolute" style={{ right: '5%', bottom: '10%' }}>
            <BotaoPixel tipo="ouro" disabled={ocupado} onClick={onColetar} largura={84}>{T.coletar}</BotaoPixel>
          </div>
        )}
        {carimbo && (
          <div aria-hidden className="absolute pointer-events-none z-20" style={{ left: '50%', top: '50%', width: u(120), height: u(150), transform: 'translate(-50%, -50%)' }}>
            <Anim key={`${carimbo}-${vaga}`} src={carimbo === 'enviar' ? ANIMACOES_DA_EXPEDICAO.carimboEnviar : ANIMACOES_DA_EXPEDICAO.carimboColetar}
              className="w-full h-full" style={{ animation: `expTremor ${DURACAO_DO_CARIMBO_MS}ms linear both` }} />
          </div>
        )}
      </div>
      {andando && !aberta && (
        <div className="flex justify-end" style={{ paddingRight: u(6) }}>
          <BotaoPixel tipo="carmesim" disabled={ocupado} onClick={onAcelerar} largura={96}>
            <span className="inline-flex items-center" style={{ gap: u(3) }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={EXPEDICAO_UI.ampulheta} alt="" aria-hidden draggable={false} style={{ width: u(12), height: u(12), ...pixel }} />
              {T.acelerar}
            </span>
          </BotaoPixel>
        </div>
      )}
      {andando && aberta && (
        <Pergaminho borda={14} style={{ marginInline: u(2) }}>
          <PainelDeAvanco faltaMs={falta} avancos={avancos} ocupado={ocupado} aoUsar={onUsarAvanco} aoCancelar={onFechar} />
        </Pergaminho>
      )}
    </div>
  );
}

/** Uma recompensa com o pop do Yuri, a quantidade e o nome. */
function Premio({ src, quantidade, nome, cor }: { src: string; quantidade: number; nome: string; cor?: string }) {
  return (
    <div className="flex flex-col items-center text-center" style={{ width: u(54), gap: u(1) }} title={nome}>
      <Anim src={src} style={{ width: u(40), height: u(40) }} />
      <span className="font-cinzel font-black leading-none" style={{ fontSize: u(8.5), color: cor ?? TINTA }}>×{quantidade}</span>
      <span className="font-semibold leading-tight" style={{ fontSize: u(6.5), color: cor ?? TINTA }}>{nome}</span>
    </div>
  );
}

/** Expedição: vagas; o jogador paga ouro, manda uma expedição de 2, 6, 8 ou 12 horas e coleta a recompensa quando ela volta. */
export function ExpedicaoScreen({ tokenFresco }: { tokenFresco: Token }) {
  const [estado, setEstado] = useState<EstadoDaExpedicao | null>(null);
  /** Diferença entre o relógio do servidor e o do aparelho, para a contagem usar a hora do servidor. */
  const [diferenca, setDiferenca] = useState(0);
  const [agora, setAgora] = useState(() => Date.now());
  const [erroAoCarregar, setErroAoCarregar] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [coletadas, setColetadas] = useState<RecompensaColetada[]>([]);
  const [turnoEscolhido, setTurnoEscolhido] = useState(TURNOS_DE_EXPEDICAO[0].horas);
  const [acelerando, setAcelerando] = useState<number | null>(null);
  const [carimbos, setCarimbos] = useState<Record<number, 'enviar' | 'coletar'>>({});
  const temporizador = useRef<number | null>(null);

  const receber = useCallback((e: EstadoDaExpedicao) => {
    setEstado(e);
    setDiferenca(Date.parse(e.agora) - Date.now());
  }, []);

  const carregar = useCallback(async () => {
    const r = await chamar(tokenFresco);
    if (r.ok) receber(r.dados as unknown as EstadoDaExpedicao);
    else setErroAoCarregar(true);
  }, [tokenFresco, receber]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => () => {
    if (temporizador.current) window.clearTimeout(temporizador.current);
  }, []);

  const mostrarCarimbos = (novos: Record<number, 'enviar' | 'coletar'>) => {
    setCarimbos(novos);
    if (temporizador.current) window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => setCarimbos({}), DURACAO_DO_CARIMBO_MS);
  };

  async function agir(acao: string, extra: Record<string, unknown> = {}) {
    setOcupado(true);
    setAviso(null);
    const r = await chamar(tokenFresco, { acao, ...extra });
    setOcupado(false);
    if (!r.ok) {
      setAviso({ texto: String(r.dados.error ?? T.naoFoiPossivel), erro: true });
      return;
    }
    setAviso({ texto: String(r.dados.mensagem ?? T.feito), erro: false });
    const coletou = (r.dados.coletadas as RecompensaColetada[]) ?? [];
    setColetadas(coletou);
    const novo = r.dados.estado as EstadoDaExpedicao;
    if (acao === 'enviar') {
      const antes = new Set(estado?.expedicoes.map((x) => x.vaga));
      const chegou = novo.expedicoes.find((x) => !antes.has(x.vaga));
      if (chegou) mostrarCarimbos({ [chegou.vaga]: 'enviar' });
    } else if (acao === 'coletar' && coletou.length) {
      mostrarCarimbos(Object.fromEntries(coletou.map((c) => [c.vaga, 'coletar' as const])));
    }
    if (acao === 'avancar') setAcelerando(null);
    receber(novo);
  }

  const horaDoServidor = agora + diferenca;
  const prontas = estado?.expedicoes.filter((e) => Date.parse(e.fim) <= horaDoServidor) ?? [];
  const bloqueado = !!estado && estado.meuNivel < estado.nivelNecessario;
  const turno = TURNOS_DE_EXPEDICAO.find((t) => t.horas === turnoEscolhido)!;
  const vagas = estado?.vagas ?? VAGAS_DE_EXPEDICAO;
  const cheias = !!estado && estado.expedicoes.length >= vagas;

  return (
    <main className="min-h-dvh w-full flex justify-center select-none" style={{ backgroundColor: '#0d0a12' }}>
      <style>{CSS}</style>
      <div className="relative w-full max-w-[480px] min-h-dvh" style={{ containerType: 'inline-size' }}>
        <div aria-hidden className="absolute inset-0" style={{ backgroundImage: `url(${EXPEDICAO_UI.cenario})`, backgroundSize: 'cover', backgroundPosition: 'center top', filter: 'brightness(.6)', ...pixel }} />
        <div className="relative flex flex-col items-center" style={{ ['--u' as string]: 'calc(100cqw / 360)', padding: `${u(6)} ${u(8)} ${u(16)}` }}>
          {/* a fita do título e a volta */}
          <div className="relative flex items-center justify-center z-10" style={{ width: u(232), height: u(48), backgroundImage: `url(${EXPEDICAO_UI.fita})`, backgroundSize: '100% 100%', ...pixel }}>
            <h1 className="font-cinzel font-black uppercase" style={{ fontSize: u(13), color: CREME, textShadow: '0 1px 0 #000', letterSpacing: '0.08em' }}>{T.titulo}</h1>
          </div>
          <Link href="/provacoes" aria-label={T.voltar} className="absolute active:scale-95" style={{ right: u(10), top: u(10), width: u(28), height: u(28), backgroundImage: `url(${EXPEDICAO_UI.fechar})`, backgroundSize: '100% 100%', ...pixel }} />

          <Pergaminho borda={18} className="w-full" style={{ marginTop: u(-14), paddingTop: u(14), color: TINTA }}>
            <div className="flex flex-col" style={{ gap: u(6) }}>
              <p style={{ fontSize: u(8), lineHeight: 1.4 }}>{T.explicacao(vagas)}</p>
              {aviso && <p role={aviso.erro ? 'alert' : 'status'} className="font-bold" style={{ fontSize: u(9), color: aviso.erro ? '#9B1C1C' : '#1E5E1E' }}>{aviso.texto}</p>}
              {erroAoCarregar ? (
                <p role="alert" style={{ fontSize: u(9), color: '#9B1C1C' }}>{T.erroAoCarregar}</p>
              ) : !estado ? (
                <p style={{ fontSize: u(9) }}>{T.carregando}</p>
              ) : (
                <>
                  {bloqueado && <p className="font-bold" style={{ fontSize: u(9), color: '#9B1C1C' }}>{T.nivel(estado.nivelNecessario, estado.meuNivel)}</p>}
                  <div className="flex items-center justify-between font-cinzel font-black" style={{ fontSize: u(9.5) }}>
                    <span className="inline-flex items-center" style={{ gap: u(3) }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={EXPEDICAO_UI.ouro} alt={T.ouro} draggable={false} style={{ width: u(20), height: u(20), ...pixel }} /> {estado.ouro.toLocaleString('pt-BR')}
                    </span>
                    <span className="inline-flex items-center" style={{ gap: u(3) }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={EXPEDICAO_UI.ampulheta} alt={T.avancos} draggable={false} style={{ width: u(20), height: u(20), ...pixel }} /> {T.avancos}: {estado.avancos}
                    </span>
                  </div>
                  {((estado.reducaoDeTempoPercentual ?? 0) > 0 || (estado.materiaisExtras ?? 0) > 0) && (
                    <p className="font-semibold" style={{ fontSize: u(7.5), color: '#1E5E1E' }}>{T.maestria(estado.reducaoDeTempoPercentual, estado.materiaisExtras)}</p>
                  )}

                  <section aria-label="Vagas" className="flex flex-col" style={{ gap: u(8) }}>
                    {[...Array(vagas).keys()].map((vaga) => (
                      <VagaCard key={vaga} vaga={vaga} e={estado.expedicoes.find((x) => x.vaga === vaga)} horaDoServidor={horaDoServidor} ocupado={ocupado} avancos={estado.avancos}
                        aberta={acelerando === vaga} carimbo={carimbos[vaga]}
                        onAcelerar={() => setAcelerando(vaga)} onFechar={() => setAcelerando(null)}
                        onColetar={() => void agir('coletar', { vaga })}
                        onUsarAvanco={(horas) => void agir('avancar', { vaga, quantidade: horas })} />
                    ))}
                  </section>
                  {prontas.length > 1 && (
                    <div className="flex justify-center">
                      <BotaoPixel tipo="ouro" disabled={ocupado} onClick={() => void agir('coletar')} largura={112}>{T.coletarTodas(prontas.length)}</BotaoPixel>
                    </div>
                  )}

                  <section aria-label={T.enviarExpedicao} className="flex flex-col" style={{ gap: u(6) }}>
                    <h2 className="font-cinzel font-black uppercase" style={{ fontSize: u(10) }}>{T.enviarExpedicao}</h2>
                    <div role="radiogroup" aria-label={T.turno} className="grid grid-cols-4" style={{ gap: u(6) }}>
                      {TURNOS_DE_EXPEDICAO.map((t) => {
                        const escolhido = t.horas === turnoEscolhido;
                        return (
                          <button key={t.horas} type="button" role="radio" aria-checked={escolhido} onClick={() => setTurnoEscolhido(t.horas)} className="relative flex flex-col items-center cursor-pointer" style={{ gap: u(2) }}>
                            <span className="relative block w-full" style={{ aspectRatio: '1', backgroundImage: `url(${arteDoTurno(t.horas)})`, backgroundSize: '100% 100%', ...pixel }}>
                              {escolhido && <Anim src={ANIMACOES_DA_EXPEDICAO.turnoSelecionado} className="absolute pointer-events-none" style={{ left: '-5%', top: '-5%', width: '110%', height: '110%' }} />}
                            </span>
                            <span className="font-cinzel font-black leading-none" style={{ fontSize: u(9) }}>{t.horas} h</span>
                            <span className="inline-flex items-center font-bold leading-none" style={{ fontSize: u(7), gap: u(1) }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={EXPEDICAO_UI.ouro} alt="" aria-hidden draggable={false} style={{ width: u(10), height: u(10), ...pixel }} />{t.custoOuro}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <ul aria-label={T.recompensas} className="flex flex-wrap justify-center" style={{ gap: u(4) }}>
                      {SELOS_DE_BUSCA.filter((s) => turno.selos[s]).map((s: SeloDeBusca) => (
                        <li key={s}><Premio src={SELO_EM_LACO[s]} quantidade={turno.selos[s]!} nome={NOME_DO_SELO[s].replace('Selo ', '')} /></li>
                      ))}
                      <li><Premio src={EXPEDICAO_UI.fragmentoDeMemoria} quantidade={turno.fragmentosDeMemoria} nome="Fragmentos de Memória" /></li>
                      {turno.pedrasDaRecordacao > 0 && <li><Premio src={EXPEDICAO_UI.pedraDaRecordacao} quantidade={turno.pedrasDaRecordacao} nome="Pedra da Recordação" /></li>}
                      {(Object.entries(turno.materiais) as [RaridadeMaterial, number][]).map(([r, q]) => (
                        <li key={r}><Premio src={MATERIAL_POR_RARIDADE[r]} quantidade={q} nome={`${q > 1 ? 'Materiais' : 'Material'} ${NOME_DA_RARIDADE[r][q > 1 ? 1 : 0]}`} /></li>
                      ))}
                    </ul>
                    <div className="flex justify-center">
                      <BotaoPixel tipo="ouro" disabled={ocupado || bloqueado || cheias || estado.ouro < turno.custoOuro} largura={150} onClick={() => void agir('enviar', { horas: turno.horas })}>
                        {cheias ? T.vagasOcupadas : T.enviarTurno(turno.horas, turno.custoOuro)}
                      </BotaoPixel>
                    </div>
                  </section>

                  {coletadas.length > 0 && (
                    <section aria-label="Recompensas coletadas" className="flex flex-col" style={{ gap: u(5) }}>
                      <h2 className="font-cinzel font-black uppercase" style={{ fontSize: u(10), color: '#1E5E1E' }}>{T.recompensas}</h2>
                      {coletadas.map((c) => (
                        <div key={c.vaga} className="flex flex-col" style={{ gap: u(3) }}>
                          <span className="font-bold" style={{ fontSize: u(9) }}>{T.vaga(c.vaga + 1)} · {T.duracao(c.horas)}</span>
                          <div className="flex flex-wrap justify-center" style={{ gap: u(4) }}>
                            {SELOS_DE_BUSCA.filter((s) => c.selos[s]).map((s) => <Premio key={s} src={POP.selo[s]} quantidade={c.selos[s]!} nome={NOME_DO_SELO[s].replace('Selo ', '')} />)}
                            <Premio src={POP.fragmentoDeMemoria} quantidade={c.fragmentosDeMemoria} nome="Fragmentos de Memória" />
                            {c.pedrasDaRecordacao > 0 && <Premio src={POP.pedraDaRecordacao} quantidade={c.pedrasDaRecordacao} nome="Pedra da Recordação" />}
                          </div>
                          <span className="flex flex-wrap justify-center" style={{ gap: `0 ${u(8)}`, fontSize: u(8) }}>
                            {c.materiais.map((m) => (
                              <span key={m.id} className="inline-flex items-center font-bold" style={{ color: EMBLEMA_RARIDADE_MAP[m.raridade].cor, filter: 'brightness(.6)' }}>{m.quantidade}× {m.nome}</span>
                            ))}
                          </span>
                        </div>
                      ))}
                      <Link href="/buscar" className="underline font-semibold" style={{ fontSize: u(8.5) }}>{T.usarSelos}</Link>
                    </section>
                  )}
                </>
              )}
            </div>
          </Pergaminho>
        </div>
      </div>
    </main>
  );
}
