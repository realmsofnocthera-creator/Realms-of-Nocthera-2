'use client';

import React from 'react';
import type { AcaoDaLuta } from '@/lib/cacadaReplay';
import { efeitoDaAcao, faiscasDoImpacto, filtroDoElemento, QUADROS_DO_EFEITO, sorteioEstavel, tamanhoDoNumero, type EfeitoDeGolpe } from '@/lib/cacadaCoreografia';
import { textoDaFicha } from '@/rules/textosDaFicha';
import { TEXTOS_DO_IMPACTO as T } from '@/rules/textosDoCombate';

const pasta = '/images/cacada/fx/';
const CONTORNO = '2px 2px 0 #2A0606, -2px -2px 0 #2A0606, 2px -2px 0 #2A0606, -2px 2px 0 #2A0606, 0 3px 0 #2A0606';

/** Um efeito em folha de quadros (um ao lado do outro): toca uma vez, no tamanho e no lugar dados, e some. */
export function FxDeFolha({ efeito, x, y, tamanho, ms, atraso = 0, giro = 0, espelhar = false, filtro = 'none' }: { efeito: EfeitoDeGolpe | 'critico' | 'cura' | 'escudo'; x: number; y: number; tamanho: number; ms: number; atraso?: number; giro?: number; espelhar?: boolean; filtro?: string }) {
  const n = QUADROS_DO_EFEITO[efeito];
  return (
    <span
      aria-hidden="true"
      className="cacada-fx absolute pointer-events-none"
      style={{
        left: x - tamanho / 2,
        top: y - tamanho / 2,
        width: tamanho,
        height: tamanho,
        backgroundImage: `url(${pasta}${efeito}.webp)`,
        backgroundSize: `${n * 100}% 100%`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
        filter: filtro,
        transform: `rotate(${giro}deg) scaleX(${espelhar ? -1 : 1})`,
        animation: `cacadaFx ${ms}ms steps(${n - 1}, end) ${atraso}ms both`,
        ['--fim' as string]: '100%',
      }}
    />
  );
}

/** Faíscas que saem do ponto de impacto em todas as direções. */
export function Faiscas({ x, y, quantidade, cor, semente }: { x: number; y: number; quantidade: number; cor: string; semente: number }) {
  return (
    <>
      {Array.from({ length: quantidade }, (_, i) => {
        const ang = ((i / quantidade) * 360 + sorteioEstavel(semente + i) * 40) * (Math.PI / 180);
        const dist = 38 + sorteioEstavel(semente * 3 + i) * 58;
        const lado = 3 + Math.round(sorteioEstavel(semente * 5 + i) * 4);
        return (
          <span
            key={i}
            aria-hidden="true"
            className="cacada-faisca absolute pointer-events-none"
            style={{ left: x, top: y, width: lado, height: lado, background: i % 3 === 0 ? '#FFF6D8' : cor, ['--fx' as string]: `${Math.cos(ang) * dist}px`, ['--fy' as string]: `${Math.sin(ang) * dist - 10}px`, animationDelay: `${Math.round(sorteioEstavel(semente + i * 7) * 60)}ms` }}
          />
        );
      })}
    </>
  );
}

/**
 * O que aparece quando o golpe acerta: o efeito de golpe e, no crítico, a estrela, as faíscas, os números (um por golpe,
 * um depois do outro), o aviso de crítico/fraqueza/resistência e o nome da habilidade. `x` e `y` são o centro do alvo e
 * `topo` é onde fica a cabeça dele (os números sobem dali).
 */
export function ImpactoDaAcao({ acao, alvoVidaMaxima, x, y, topo, escala, indice, ms }: { acao: AcaoDaLuta; alvoVidaMaxima: number; x: number; y: number; topo: number; escala: number; indice: number; ms: number }) {
  const critico = acao.criticos > 0;
  const efeito = efeitoDaAcao(acao);
  const filtro = filtroDoElemento(acao.elemento);
  const tamFx = Math.min(escala * 1.3, 320) * (critico ? 1.25 : 1);
  const corFaisca = acao.elemento ? '#FFD45C' : '#FFB347';
  const giro = acao.de === 'jogador' ? -24 : 22;
  const golpes = acao.golpes.length > 1 ? acao.golpes.slice(0, 7) : [acao.dano];
  return (
    <>
      {!acao.bloqueado && <FxDeFolha efeito={efeito} x={x} y={y} tamanho={tamFx} ms={ms} giro={giro} espelhar={acao.de === 'monstro'} filtro={filtro} />}
      {acao.bloqueado && <FxDeFolha efeito="escudo" x={x} y={y} tamanho={tamFx * 0.8} ms={ms} />}
      {critico && <FxDeFolha efeito="critico" x={x} y={y} tamanho={tamFx * 1.15} ms={ms + 120} filtro={filtro} />}
      {!acao.bloqueado && <Faiscas x={x} y={y} quantidade={faiscasDoImpacto(acao.dano, alvoVidaMaxima, critico)} cor={corFaisca} semente={indice + 1} />}

      {acao.bloqueado ? (
        <Rotulo x={x} y={topo} cor="#BFE0FF" tamanho={22} texto={T.bloqueado} />
      ) : (
        golpes.map((g, i) => {
          const crit = critico && i >= golpes.length - Math.min(acao.criticos, golpes.length);
          const px = tamanhoDoNumero(g, alvoVidaMaxima, crit);
          const deslocamento = golpes.length > 1 ? (i - (golpes.length - 1) / 2) * 34 : 0;
          return (
            <span
              key={i}
              aria-label={textoDaFicha(crit ? T.danoCriticoAria : T.danoAria, { n: g })}
              className={`${crit ? 'cacada-numero-critico' : 'cacada-numero-grande'} absolute z-30 pointer-events-none font-cinzel font-black leading-none whitespace-nowrap`}
              style={{
                left: x + deslocamento,
                top: topo - px * 0.2 - i * 6,
                fontSize: px,
                color: crit ? '#FFC93C' : '#FFF1C2',
                textShadow: CONTORNO,
                animationDelay: `${i * 130}ms`,
                WebkitTextStroke: crit ? '1px #7A1608' : undefined,
              }}
            >
              {g}
            </span>
          );
        })
      )}
      {critico && <Rotulo x={x} y={topo - tamanhoDoNumero(acao.dano, alvoVidaMaxima, true) * 0.95} cor="#FF6A3C" tamanho={30} texto={T.critico} tremer />}
      {acao.reacao && !acao.bloqueado && <Rotulo x={x} y={topo + tamanhoDoNumero(acao.dano, alvoVidaMaxima, critico) * 0.75} cor={acao.reacao === 'fraqueza' ? '#FFB347' : '#B8C4D6'} tamanho={19} texto={T[acao.reacao]} atraso={160} />}
    </>
  );
}

function Rotulo({ x, y, cor, tamanho, texto, tremer = false, atraso = 0 }: { x: number; y: number; cor: string; tamanho: number; texto: string; tremer?: boolean; atraso?: number }) {
  return (
    <span aria-hidden="true" className={`${tremer ? 'cacada-rotulo-critico' : 'cacada-rotulo'} absolute z-30 pointer-events-none font-cinzel font-black leading-none whitespace-nowrap tracking-wide`}
      style={{ left: x, top: y, fontSize: tamanho, color: cor, textShadow: CONTORNO, animationDelay: `${atraso}ms` }}>
      {texto}
    </span>
  );
}

/** O número verde da cura, com as cruzes subindo. */
export function ImpactoDeCura({ valor, x, y, topo, escala }: { valor: number; x: number; y: number; topo: number; escala: number }) {
  return (
    <>
      <FxDeFolha efeito="cura" x={x} y={y} tamanho={Math.min(escala, 220)} ms={760} />
      <span aria-label={textoDaFicha(T.curaAria, { n: valor })} className="cacada-numero-grande absolute z-30 pointer-events-none font-cinzel font-black leading-none" style={{ left: x, top: topo, fontSize: 30, color: '#8CF08C', textShadow: CONTORNO }}>+{valor}</span>
    </>
  );
}

/** O nome da habilidade que acabou de ser usada, numa faixa no alto da cena. */
export function FaixaDeHabilidade({ nome, icone, heroi, duracao }: { nome: string; icone: string | null; heroi: boolean; duracao: number }) {
  return (
    <div className="cacada-faixa absolute left-1/2 z-40 pointer-events-none flex items-center gap-2 pl-2 pr-5 py-1.5 border-2"
      style={{ top: '19%', ['--dur' as string]: `${duracao}ms`, background: heroi ? 'linear-gradient(90deg,rgba(20,8,10,.92),rgba(110,24,24,.88))' : 'linear-gradient(90deg,rgba(20,8,24,.92),rgba(70,20,90,.88))', borderColor: heroi ? '#C9873A' : '#9B6CF0', boxShadow: '0 3px 12px rgba(0,0,0,.6)' }}>
      {icone && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icone} alt="" aria-hidden="true" className="w-9 h-9 object-cover border border-black/60" />
      )}
      <span className="font-cinzel font-black text-[19px] tracking-wider uppercase text-[#FFE9B0] whitespace-nowrap" style={{ textShadow: '2px 2px 0 #1A0505' }}>{textoDaFicha(T.habilidade, { nome })}</span>
    </div>
  );
}
