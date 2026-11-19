'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, Crown, Skull } from 'lucide-react';
import type { CharacterDocument, RespostaTorre } from '@/server/characterService';
import { estrelaDoAndar, montarMonstroDaTorre, TORRE } from '@/game/torreCelestial';
import { andaresDaLista, cenarioDoAndar, fundoDaTorre, recompensasEmTexto, torreDoPersonagem } from '@/lib/torreTela';
import type { RecompensaTela } from '@/lib/torreTela';
import { CENARIOS_DA_TORRE, FUNDOS_DA_TORRE, TORRE_UI } from '@/assets/torreUi';
import { mapaDoAndar } from '@/assets/mapasDaTorre';
import { HUD_ICONS } from '@/assets/hud';
import { ICONES_DE_SALDO } from '@/assets/mochilaUi';
import { TEXTOS_DA_TORRE as T } from '@/rules/textosDaTorre';
import { NOCTHERA_THEME } from '@/theme/theme';
import { CombateCacada } from '@/components/cacada/CombateCacada';
import { SpriteAnimado } from '@/components/cena/SpriteAnimado';
import { ANIMACAO_DO_MONSTRO } from '@/lib/cacadaArte';

interface TorreCelestialScreenProps {
  character: CharacterDocument;
  onCharacterChange: (c: CharacterDocument) => void;
  tokenFresco: () => Promise<string | null>;
  /** Começa numa etapa (para os testes e a pré-visualização); sem ela, começa na torre. */
  etapaInicial?: Etapa;
}

export type Etapa =
  | { tipo: 'torre' }
  | { tipo: 'combate'; antes: CharacterDocument; resposta: RespostaTorre }
  | { tipo: 'resultado'; antes: CharacterDocument; resposta: RespostaTorre };

const OURO = '#C8A656';
const TINTA = '#3B2412';

const ICONE_DA_RECOMPENSA: Readonly<Record<string, string | undefined>> = {
  'Essência de habilidade': ICONES_DE_SALDO.essenciaHabilidade,
  Diamantes: HUD_ICONS.diamante,
  'Fragmento de ascensão': ICONES_DE_SALDO.fragmentosAscensao,
};

const pixel = { imageRendering: 'pixelated' } as const;

/** Um painel de pergaminho (nove fatias: os cantos ornamentados não esticam). */
function Pergaminho({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={className} style={{ borderStyle: 'solid', borderWidth: 30, borderImage: `url(${TORRE_UI.pergaminho}) 110 fill / 30px stretch`, ...pixel, ...style }}>
      {children}
    </div>
  );
}

/** Os ícones das recompensas de um andar: um quadro pequeno com o ícone e o valor. */
function Recompensas({ lista, tamanho = 38 }: { lista: RecompensaTela[]; tamanho?: number }) {
  const itens = lista.filter((r) => ICONE_DA_RECOMPENSA[r.rotulo]);
  return (
    <>
      {itens.map((r) => (
        <div key={r.rotulo} className="relative shrink-0 flex items-center justify-center" style={{ width: tamanho, height: tamanho, backgroundImage: `url(${TORRE_UI.molduraPequena})`, backgroundSize: '100% 100%', ...pixel }} title={`${r.rotulo} +${r.valor}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ICONE_DA_RECOMPENSA[r.rotulo]} alt={r.rotulo} className="w-[62%] h-[62%] object-contain" draggable={false} />
          <span className="absolute -bottom-1 right-0 text-[9px] font-black leading-none px-0.5 rounded-sm" style={{ backgroundColor: '#000000cc', color: '#F5E3B3' }}>{r.valor}</span>
        </div>
      ))}
    </>
  );
}

/**
 * A subida depois de vencer um andar (em ms desde a volta à torre): o andar vencido ganha o selo, o cadeado do próximo
 * treme e quebra, e a lista sobe uma linha (a torre desce no fundo, com um feixe de luz subindo).
 */
export const TEMPOS_DA_SUBIDA = { selo: 350, treme: 900, quebra: 1350, desliza: 1800, fim: 2700 } as const;

type FaseDaSubida = 'parada' | 'selo' | 'treme' | 'quebra' | 'desliza' | 'fim';

function useFaseDaSubida(subidaDe: number | null): FaseDaSubida {
  // a fase vale só para a subida em que foi marcada: uma subida nova começa parada, sem passar pelo fim da anterior
  const [estado, setEstado] = useState<{ de: number | null; fase: FaseDaSubida }>({ de: null, fase: 'fim' });
  useEffect(() => {
    if (subidaDe === null) return;
    const reduzir = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduzir) {
      setEstado({ de: subidaDe, fase: 'fim' });
      return;
    }
    const timers = (['selo', 'treme', 'quebra', 'desliza', 'fim'] as const).map((f) => window.setTimeout(() => setEstado({ de: subidaDe, fase: f }), TEMPOS_DA_SUBIDA[f]));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [subidaDe]);
  if (subidaDe === null) return 'fim';
  return estado.de === subidaDe ? estado.fase : 'parada';
}

const ORDEM_DAS_FASES: readonly FaseDaSubida[] = ['parada', 'selo', 'treme', 'quebra', 'desliza', 'fim'];
const chegou = (fase: FaseDaSubida, alvo: FaseDaSubida) => ORDEM_DAS_FASES.indexOf(fase) >= ORDEM_DAS_FASES.indexOf(alvo);

/**
 * A lista dos andares (o atual e os 4 seguintes). Com `subidaDe` (o andar que acabou de ser vencido), ela começa nele e
 * anima a subida até o próximo.
 */
function ListaDeAndares({ andar, nivel, subidaDe, fase }: { andar: number; nivel: number; subidaDe: number | null; fase: FaseDaSubida }) {
  const subindo = subidaDe !== null;
  const lista = andaresDaLista(subindo ? subidaDe : andar, nivel, subindo ? 6 : 5);
  const primeira = useRef<HTMLLIElement>(null);
  const [passo, setPasso] = useState(0);
  useLayoutEffect(() => {
    if (primeira.current) setPasso(primeira.current.offsetHeight + 8);
  }, [subindo]);
  const deslizou = subindo && chegou(fase, 'desliza');
  const atualAgora = subindo ? (chegou(fase, 'quebra') ? subidaDe + 1 : subidaDe) : andar;
  return (
    <div className="relative overflow-hidden" style={subindo && passo ? { height: passo * 5 - 8 } : undefined}>
      <ol aria-label="Andares" className="relative flex flex-col gap-2" style={{ transform: deslizou ? `translateY(-${passo}px)` : 'none', transition: 'transform 800ms cubic-bezier(.45,0,.2,1)' }}>
        <span aria-hidden className="absolute top-3 bottom-3 w-0.5" style={{ left: 5, backgroundColor: '#6b4a2a' }} />
        {lista.map((a, i) => {
          const vencido = subindo && a.andar === subidaDe;
          const atual = a.andar === atualAgora;
          const trancado = !vencido && !atual;
          const quebrando = subindo && a.andar === subidaDe + 1;
          return (
            <li key={a.andar} ref={i === 0 ? primeira : undefined} className="flex items-center gap-1.5" style={vencido && deslizou ? { opacity: 0, transition: 'opacity 600ms' } : undefined}>
              <span className={`shrink-0 w-3 h-3 rotate-45 border ${atual && subindo ? 'torre-no-acende' : ''}`} style={{ backgroundColor: atual || vencido ? '#F3C769' : '#6b4a2a', borderColor: '#2b1a0c' }} aria-hidden />
              <div className="relative flex-1 min-w-0" style={{ aspectRatio: '300 / 228', backgroundImage: `url(${CENARIOS_DA_TORRE[cenarioDoAndar(a.andar)]})`, backgroundSize: '100% 100%', filter: atual ? 'drop-shadow(0 0 5px #F3C769)' : vencido ? 'brightness(0.9)' : 'brightness(0.55) saturate(0.7)', transition: 'filter 500ms', ...pixel }}>
                {(trancado || (quebrando && chegou(fase, 'quebra') && !chegou(fase, 'fim'))) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={TORRE_UI.iconeCadeado} alt={trancado ? T.bloqueado : ''} draggable={false}
                    className={`absolute inset-0 m-auto w-[44%] ${quebrando && fase === 'treme' ? 'torre-cadeado-treme' : ''} ${quebrando && chegou(fase, 'quebra') ? 'torre-cadeado-quebra' : ''}`} style={pixel} />
                )}
                {quebrando && chegou(fase, 'quebra') && !chegou(fase, 'fim') && <span aria-hidden className="torre-clarao absolute inset-0" />}
                {vencido && chegou(fase, 'selo') && (
                  <span className="torre-selo absolute inset-0 m-auto flex items-center justify-center w-9 h-9 rounded-full border-2" style={{ backgroundColor: '#1f6a29e6', borderColor: '#F3C769' }} role="img" aria-label={T.seloVencido}>
                    <Check className="w-6 h-6" style={{ color: '#F5E3B3' }} strokeWidth={3.5} />
                  </span>
                )}
                <span className="absolute left-1 bottom-0.5 inline-flex items-center gap-0.5 text-[10px] font-cinzel font-black leading-none px-1 py-0.5 rounded-sm" style={{ backgroundColor: '#000000b0', color: a.chefe ? '#F3C769' : '#F5E3B3' }}>
                  {a.chefe && <Crown className="w-2.5 h-2.5" aria-label={T.chefe} />}{a.andar}
                </span>
              </div>
              <div className="shrink-0 flex flex-col gap-1.5 items-center w-[38px]">
                <Recompensas lista={a.recompensas.slice(-1)} />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const CSS_DA_SUBIDA = `
@keyframes torreSelo{0%{transform:scale(2.4);opacity:0}60%{transform:scale(.9);opacity:1}100%{transform:scale(1);opacity:1}}
@keyframes torreTreme{0%,100%{transform:translateX(0) rotate(0)}20%{transform:translateX(-3px) rotate(-8deg)}40%{transform:translateX(3px) rotate(8deg)}60%{transform:translateX(-2px) rotate(-5deg)}80%{transform:translateX(2px) rotate(5deg)}}
@keyframes torreQuebra{0%{transform:scale(1);opacity:1;filter:brightness(1)}40%{transform:scale(1.25);opacity:1;filter:brightness(2.2)}100%{transform:scale(1.9) rotate(12deg);opacity:0;filter:brightness(3)}}
@keyframes torreClarao{0%{opacity:0}30%{opacity:.85}100%{opacity:0}}
@keyframes torreNo{0%{box-shadow:0 0 0 0 #F3C769}50%{box-shadow:0 0 10px 4px #F3C769}100%{box-shadow:0 0 0 0 #F3C769}}
@keyframes torreFundoSobe{0%{transform:translateY(0) scale(1.06)}55%{transform:translateY(3.5%) scale(1.06)}100%{transform:translateY(0) scale(1.06)}}
@keyframes torreFeixe{0%{transform:translateY(110%);opacity:0}20%{opacity:.9}100%{transform:translateY(-110%);opacity:0}}
.torre-selo{animation:torreSelo 450ms cubic-bezier(.2,1.4,.4,1) both}
.torre-cadeado-treme{animation:torreTreme 420ms ease-in-out infinite}
.torre-cadeado-quebra{animation:torreQuebra 500ms ease-out both}
.torre-clarao{animation:torreClarao 600ms ease-out both;background:radial-gradient(circle,rgba(255,236,170,.95),rgba(243,199,105,.35) 55%,transparent 75%)}
.torre-no-acende{animation:torreNo 900ms ease-out 2}
.torre-fundo-sobe{animation:torreFundoSobe 1100ms cubic-bezier(.45,0,.2,1) both}
.torre-feixe{animation:torreFeixe 1100ms ease-in-out both;background:linear-gradient(to top,transparent,rgba(255,226,150,.0) 20%,rgba(255,226,150,.45) 50%,rgba(255,226,150,0) 80%,transparent)}
@media (prefers-reduced-motion: reduce){.torre-selo,.torre-cadeado-treme,.torre-cadeado-quebra,.torre-clarao,.torre-no-acende,.torre-fundo-sobe,.torre-feixe{animation:none}}
`;

/**
 * Provação da Torre Celestial: o andar atual, o que ele dá, o próximo chefe e a luta (com o replay da Caçada).
 * Toda regra (nível, andar e recompensas) é conferida no servidor; a tela só mostra. Não dá para voltar andares.
 */
export function TorreCelestialScreen({ character, onCharacterChange, tokenFresco, etapaInicial }: TorreCelestialScreenProps) {
  const { colors } = NOCTHERA_THEME;
  const [etapa, setEtapa] = useState<Etapa>(etapaInicial ?? { tipo: 'torre' });
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const subir = async () => {
    if (ocupado) return;
    setOcupado(true);
    setErro(null);
    try {
      const token = await tokenFresco();
      if (!token) throw new Error(T.sessaoExpirada);
      const combateId = `tor-${crypto.randomUUID()}`;
      const res = await fetch('/api/torre-celestial/iniciar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ combateId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || T.falhaAoSubir);
      setEtapa({ tipo: 'combate', antes: character, resposta: data as RespostaTorre });
    } catch (e) {
      setErro(e instanceof Error ? e.message : T.erroAoSubir);
    } finally {
      setOcupado(false);
    }
  };

  // a volta à torre depois de vencer um andar (que não seja o último): a animação de subida
  const subidaDe = etapa.tipo === 'resultado' && etapa.resposta.torre.venceu && etapa.resposta.torre.andar < TORRE.andares ? etapa.resposta.torre.andar : null;
  const fase = useFaseDaSubida(subidaDe);

  const terminarCombate = useCallback(() => {
    setEtapa((e) => {
      if (e.tipo !== 'combate') return e;
      onCharacterChange(e.resposta.character);
      return { tipo: 'resultado', antes: e.antes, resposta: e.resposta };
    });
  }, [onCharacterChange]);

  if (etapa.tipo === 'combate') {
    const { resposta, antes } = etapa;
    const monstro = montarMonstroDaTorre(resposta.torre.andar);
    return (
      <CombateCacada
        resultado={resposta.resultado}
        personagem={antes}
        monstro={monstro}
        titulo={`Torre Celestial · Andar ${resposta.torre.andar} · ${resposta.torre.nome}`}
        estrela={estrelaDoAndar(resposta.torre.andar)}
        mapaDaTorre={mapaDoAndar(resposta.torre.andar)}
        onFim={terminarCombate}
      />
    );
  }

  const torre = torreDoPersonagem(character);
  const andarMostrado = torre.andar ?? TORRE.andares;
  const fundo = FUNDOS_DA_TORRE[fundoDaTorre(andarMostrado)];

  return (
    <main className="min-h-dvh w-full flex justify-center select-none" style={{ backgroundColor: '#0b0a14', color: colors.text.primary }}>
      <div className="relative w-full max-w-[480px] h-dvh overflow-hidden flex flex-col">
        <style>{CSS_DA_SUBIDA}</style>
        <div aria-hidden className={`absolute inset-0 ${subidaDe !== null && chegou(fase, 'desliza') ? 'torre-fundo-sobe' : ''}`} style={{ backgroundImage: `url(${fundo})`, backgroundSize: 'cover', backgroundPosition: 'right top', ...pixel }} />
        {subidaDe !== null && chegou(fase, 'desliza') && <div aria-hidden className="torre-feixe absolute inset-y-0 left-[18%] w-[34%] pointer-events-none" />}
        {subidaDe !== null && (
          <div role="status" className="sr-only">{chegou(fase, 'desliza') ? T.subindoPara(subidaDe + 1) : ''}</div>
        )}
        {/* topo: o emblema, o título com o progresso e a volta */}
        <header className="relative z-10 flex items-center gap-1 px-2 pt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={TORRE_UI.iconeTorre} alt="" className="w-14 h-14 shrink-0" style={pixel} draggable={false} />
          <div className="relative flex-1 min-w-0 -ml-2 flex flex-col items-center justify-center" style={{ height: 46, backgroundImage: `url(${TORRE_UI.barraTitulo})`, backgroundSize: '100% 100%', ...pixel }}>
            <span className="font-cinzel font-black text-[13px] tracking-widest uppercase leading-none" style={{ color: '#F5E3B3' }}>{T.titulo}</span>
            <span className="font-cinzel font-bold text-[10px] leading-none mt-0.5" role="progressbar" aria-valuemin={0} aria-valuemax={TORRE.andares} aria-valuenow={torre.vencidos} style={{ color: '#C8A8F0' }}>{T.progresso(torre.vencidos, TORRE.andares)}</span>
          </div>
          <Link href="/provacoes" aria-label={T.voltar} className="shrink-0 active:scale-95">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={TORRE_UI.iconeCasa} alt="" className="w-14 h-14" style={pixel} draggable={false} />
          </Link>
        </header>

        {erro && (
          <div role="alert" className="relative z-20 mx-3 mt-1 rounded px-2 py-1.5 text-xs font-semibold" style={{ backgroundColor: colors.status.danger, color: colors.text.primary }}>{erro}</div>
        )}

        {/* a lista dos andares (à direita) */}
        <div className="relative z-10 flex-1 min-h-0 flex justify-end px-1.5 pt-1">
          {etapa.tipo === 'torre' && torre.completa && (
            <Pergaminho className="self-start w-[62%]" style={{ color: TINTA }}>
              <div className="font-cinzel font-black text-center text-sm" role="status">{T.topo}</div>
            </Pergaminho>
          )}
          {((etapa.tipo === 'torre' && !torre.completa && torre.andar !== null) || subidaDe !== null) && (
            <Pergaminho className={`w-[56%] max-h-full ${subidaDe !== null ? 'overflow-hidden' : 'overflow-y-auto'}`} style={{ color: TINTA }}>
              <ListaDeAndares andar={torre.andar ?? TORRE.andares} nivel={character.nivel} subidaDe={subidaDe} fase={fase} />
            </Pergaminho>
          )}
        </div>

        {/* embaixo: o andar atual e o botão */}
        <Pergaminho className="relative z-10 mx-1.5 mb-1.5" style={{ color: TINTA }}>
          {etapa.tipo === 'torre' && !torre.completa && torre.andar !== null && (
            <section aria-label="Andar atual" className="flex gap-2">
              <div className="relative shrink-0 w-[34%] self-start" style={{ aspectRatio: '300 / 228', backgroundImage: `url(${CENARIOS_DA_TORRE[cenarioDoAndar(torre.andar)]})`, backgroundSize: '100% 100%', ...pixel }}>
                {torre.chefe && torre.monstroId && ANIMACAO_DO_MONSTRO[torre.monstroId] && (
                  <div className="absolute bottom-[8%] left-1/2 -translate-x-1/2" style={{ height: '62%', aspectRatio: String(ANIMACAO_DO_MONSTRO[torre.monstroId].proporcao) }}>
                    <SpriteAnimado parado={ANIMACAO_DO_MONSTRO[torre.monstroId].parado} ataque={ANIMACAO_DO_MONSTRO[torre.monstroId].ataque} golpe={null} rotulo={torre.nome ?? ''} />
                  </div>
                )}
                <span className="absolute left-1 bottom-1 inline-flex items-center gap-0.5 text-[11px] font-cinzel font-black leading-none px-1.5 py-1 rounded-sm" style={{ backgroundColor: '#000000b8', color: torre.chefe ? '#F3C769' : '#F5E3B3' }}>
                  {torre.chefe && <Crown className="w-3 h-3" aria-label={T.chefe} />}{T.andar(torre.andar)}
                </span>
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <div className="flex items-center justify-center text-center" style={{ minHeight: 58, padding: '4px 26px', backgroundImage: `url(${TORRE_UI.barraTitulo})`, backgroundSize: '100% 100%', ...pixel }}>
                  <span className="font-cinzel font-black text-[10px] leading-tight" style={{ color: '#F5E3B3' }}>{torre.nome}</span>
                </div>
                <div className="flex items-center justify-center text-center text-[10.5px] leading-snug font-semibold" style={{ minHeight: 62, padding: '14px 18px', backgroundImage: `url(${TORRE_UI.molduraVazia})`, backgroundSize: '100% 100%', color: '#E9D9B0', ...pixel }}>
                  <div>
                    {torre.efeitos && <div style={{ color: '#C8A8F0' }}>{torre.efeitos}</div>}
                    {torre.proximoChefe && !torre.chefe ? <div>{T.proximoChefe(torre.proximoChefe.nome, torre.proximoChefe.andar, torre.proximoChefe.faltam)}</div> : null}
                    {!torre.efeitos && !torre.proximoChefe && <div>{T.regra}</div>}
                  </div>
                </div>
              </div>
            </section>
          )}

          {etapa.tipo === 'torre' && !torre.completa && torre.andar !== null && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-[11px] font-cinzel font-black uppercase shrink-0">{T.recompensas}</span>
              <div className="flex gap-1.5 flex-1 min-w-0 flex-wrap">
                {torre.recompensas.length === 0 && <b className="text-[11px]">{T.nenhumaRecompensa}</b>}
                <Recompensas lista={torre.recompensas.filter((r) => r.rotulo !== 'XP')} />
                {torre.recompensas.filter((r) => r.rotulo === 'XP').map((r) => <b key="xp" className="self-center text-[11px]">XP +{r.valor}</b>)}
              </div>
              {torre.bloqueio ? (
                <span className="text-[11px] font-cinzel font-black text-right" style={{ color: '#7a1010' }}>{torre.bloqueio}</span>
              ) : null}
            </div>
          )}
          {etapa.tipo === 'torre' && !torre.completa && torre.andar !== null && (
            <button type="button" disabled={ocupado || !!torre.bloqueio} onClick={subir} aria-label={T.subir}
              className="mt-2 w-full flex items-center justify-center cursor-pointer disabled:cursor-not-allowed active:scale-[0.98]"
              style={{ height: 46, backgroundImage: `url(${torre.bloqueio ? TORRE_UI.botaoCinza : ocupado ? TORRE_UI.botaoVermelhoEscuro : TORRE_UI.botaoVermelho})`, backgroundSize: '100% 100%', ...pixel }}>
              <span className="font-cinzel font-black text-base tracking-widest uppercase" style={{ color: '#F5E3B3', textShadow: '0 2px 0 #000' }}>{ocupado ? T.subindo : T.subir}</span>
            </button>
          )}
          {etapa.tipo === 'torre' && !torre.completa && torre.andar !== null && (
            <p className="mt-1.5 text-[10px] leading-snug text-center font-semibold" style={{ opacity: 0.8 }}>{T.regra}</p>
          )}

          {etapa.tipo === 'torre' && torre.completa && (
            <div className="font-cinzel font-black text-center text-sm py-2">{T.topo}</div>
          )}

          {etapa.tipo === 'resultado' && (() => {
            const { resposta, antes } = etapa;
            const t = resposta.torre;
            const proximo = t.proximoAndar;
            const ganhos = recompensasEmTexto(t.andar, antes.nivel).filter((r) => t.venceu && (
              (r.rotulo === 'XP' && t.xpGanho > 0) ||
              (r.rotulo === 'Essência de habilidade' && t.essenciaHabilidade > 0) ||
              (r.rotulo === 'Diamantes' && t.diamantes > 0) ||
              (r.rotulo === 'Fragmento de ascensão' && t.fragmentosAscensao > 0)
            )).map((r) => ({
              ...r,
              valor: r.rotulo === 'XP' ? t.xpGanho : r.rotulo === 'Essência de habilidade' ? t.essenciaHabilidade : r.rotulo === 'Diamantes' ? t.diamantes : t.fragmentosAscensao,
            }));
            return (
              <section aria-label="Resultado da Torre" className="flex flex-col gap-2 text-center">
                <div className="font-cinzel font-black text-xl" style={{ color: t.venceu ? '#7a4a00' : '#7a1010' }}>{t.venceu ? T.vencido(t.andar) : T.derrotado}</div>
                <div className="text-sm flex items-center justify-center gap-1 font-semibold">
                  {t.chefe && <Crown className="w-3.5 h-3.5" style={{ color: '#9a6a00' }} />} {t.nome}
                </div>
                {t.venceu ? (
                  <div className="flex flex-wrap justify-center items-center gap-1.5">
                    <Recompensas lista={ganhos.filter((g) => g.rotulo !== 'XP')} tamanho={42} />
                    {ganhos.filter((g) => g.rotulo === 'XP').map((g) => <b key="xp" className="text-sm font-cinzel">XP +{g.valor}</b>)}
                  </div>
                ) : (
                  <div className="inline-flex items-center justify-center gap-1 text-sm font-semibold" style={{ color: '#7a1010' }}><Skull className="w-4 h-4" /> {T.nadaPerdido(t.andar)}</div>
                )}
                {resposta.levelUps > 0 && <div className="font-cinzel font-bold" style={{ color: '#1f6a29' }}>{T.nivel(resposta.character.nivel)}</div>}
                <button type="button" onClick={() => setEtapa({ tipo: 'torre' })} className="w-full flex items-center justify-center cursor-pointer active:scale-[0.98]"
                  style={{ height: 46, backgroundImage: `url(${TORRE_UI.botaoVermelho})`, backgroundSize: '100% 100%', ...pixel }}>
                  <span className="font-cinzel font-black text-sm tracking-wider uppercase px-3" style={{ color: '#F5E3B3', textShadow: '0 2px 0 #000' }}>
                    {proximo === null ? T.voltarTorre : t.venceu ? T.seguir(proximo) : T.tentar(proximo)}
                  </span>
                </button>
              </section>
            );
          })()}
        </Pergaminho>
      </div>
    </main>
  );
}
