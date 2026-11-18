'use client';

import React, { useState } from 'react';
import type { AcaoDaLuta } from '@/lib/cacadaReplay';
import { efeitoDaAcao, tamanhoDoNumero } from '@/lib/cacadaCoreografia';
import { EFEITO_DO_STATUS, EFEITOS, efeitosDaHabilidade, layoutDoEfeito, PASTA_DOS_EFEITOS, type CopiaDoEfeito, type NomeDoEfeito } from '@/assets/efeitosPixelfx';
import { textoDaFicha } from '@/rules/textosDaFicha';
import { TEXTOS_DO_IMPACTO as T } from '@/rules/textosDoCombate';

const CONTORNO = '2px 2px 0 #2A0606, -2px -2px 0 #2A0606, 2px -2px 0 #2A0606, -2px 2px 0 #2A0606, 0 3px 0 #2A0606';

/** A caixa (em px) de um efeito sobre um alvo: a largura segue a altura do alvo e o ponto de ancoragem decide onde ele cai. */
export function caixaDoEfeito(nome: NomeDoEfeito, alvo: { x: number; pes: number; altura: number }, copia?: CopiaDoEfeito): { left: number; top: number; width: number; height: number } {
  const info = EFEITOS[nome];
  const lay = layoutDoEfeito(nome);
  const width = alvo.altura * lay.largura * (copia?.escala ?? 1);
  const height = width * (info.altura / info.largura);
  const base =
    lay.ancora === 'pes' ? alvo.pes - height / 2
    : lay.ancora === 'cabeca' ? alvo.pes - alvo.altura - height * 0.1
    : lay.ancora === 'chao' ? alvo.pes - height * 0.5 + height * 0.18
    : lay.ancora === 'topo' ? alvo.pes - alvo.altura * 0.66 - height * 0.5
    : alvo.pes - alvo.altura / 2;
  const centroY = base + (copia?.dy ?? 0) * alvo.altura;
  const centroX = alvo.x + (copia?.dx ?? 0) * alvo.altura;
  return { left: centroX - width / 2, top: centroY - height / 2, width, height };
}

/**
 * Um efeito do pixelfx (folha de quadros lado a lado): toca uma vez e some, ou fica em repetição (`laco`, os status).
 * `atraso` e `velocidade` ajustam o começo e o ritmo; `espelhar` vira o efeito para o outro lado.
 */
export function FxPixelfx({ nome, alvo, atraso = 0, velocidade = 1, espelhar = false, laco, z = 20, copia }: { nome: NomeDoEfeito; alvo: { x: number; pes: number; altura: number }; atraso?: number; velocidade?: number; espelhar?: boolean; laco?: boolean; z?: number; copia?: CopiaDoEfeito }) {
  const info = EFEITOS[nome];
  const [vivo, setVivo] = useState(true);
  const repete = laco ?? info.laco;
  const caixa = caixaDoEfeito(nome, alvo, copia);
  if (!vivo) return null;
  const ms = Math.round((info.quadros / info.fps) * 1000 / velocidade);
  return (
    <span
      aria-hidden="true"
      data-efeito={nome}
      className="absolute pointer-events-none"
      onAnimationEnd={() => !repete && setVivo(false)}
      style={{
        ...caixa,
        zIndex: z,
        backgroundImage: `url(${PASTA_DOS_EFEITOS}${nome}.webp)`,
        backgroundSize: `${info.quadros * 100}% 100%`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
        transform: espelhar ? 'scaleX(-1)' : undefined,
        animation: `cacadaPfx ${ms}ms steps(${info.quadros}, jump-none) ${atraso + (copia?.atraso ?? 0)}ms ${repete ? 'infinite' : '1 both'}`,
        ['--fim' as string]: '100%',
      }}
    />
  );
}

/**
 * Os efeitos que ficam em repetição sobre quem está sob status (veneno, sangramento, sono...). As poças e os relâmpagos
 * ficam atrás do corpo (`z` 3), as chamas e os cristais na frente, em cópias, para não cobrir as pernas.
 */
export function EfeitosDeStatus({ status, alvo }: { status: readonly string[]; alvo: { x: number; pes: number; altura: number } }) {
  const nomes = Array.from(new Set(status.map((s) => EFEITO_DO_STATUS[s]).filter(Boolean)));
  return (
    <>
      {nomes.flatMap((n) => {
        const lay = layoutDoEfeito(n);
        const z = lay.camada === 'atras' ? 3 : 15;
        return (lay.copias ?? [undefined]).map((c, i) => <FxPixelfx key={`${n}-${i}`} nome={n} alvo={alvo} laco z={z} copia={c} />);
      })}
    </>
  );
}

/**
 * O que aparece quando o golpe acerta: o efeito de golpe do pixelfx (e, no crítico, o grande por cima), os números (um por
 * golpe, um depois do outro), o aviso de crítico/fraqueza/resistência. O alvo é dado em pixels: centro (`x`), pés e altura.
 */
export function ImpactoDaAcao({ acao, alvoVidaMaxima, alvo, alvoSi, topo, indice, velocidade }: { acao: AcaoDaLuta; alvoVidaMaxima: number; alvo: { x: number; pes: number; altura: number }; alvoSi?: { x: number; pes: number; altura: number }; topo: number; indice: number; velocidade: number }) {
  void indice;
  const critico = acao.criticos > 0;
  const x = alvo.x;
  const golpes = acao.golpes.length > 1 ? acao.golpes.slice(0, 7) : [acao.dano];
  // a habilidade do herói tem efeito próprio (ataque básico e especial de cada classe e subclasse)
  const hab = acao.de === 'jogador' && acao.habilidade ? efeitosDaHabilidade(acao.habilidade) : undefined;
  // habilidade que não ataca (só protege ou cura quem usou): nada cai no inimigo
  if (hab && !hab.inimigo && acao.dano === 0) {
    return hab.si && alvoSi ? <FxPixelfx nome={hab.si} alvo={alvoSi} velocidade={velocidade} z={22} /> : null;
  }
  return (
    <>
      {acao.bloqueado ? (
        <FxPixelfx nome="bloqueio" alvo={alvo} velocidade={velocidade} />
      ) : (
        <FxPixelfx nome={hab?.inimigo ?? efeitoDaAcao(acao)} alvo={alvo} velocidade={velocidade} espelhar={acao.de === 'jogador'} />
      )}
      {hab?.si && alvoSi && <FxPixelfx nome={hab.si} alvo={alvoSi} velocidade={velocidade} z={22} />}
      {critico && !acao.bloqueado && <FxPixelfx nome="golpe-critico" alvo={alvo} velocidade={velocidade} atraso={90} z={22} />}

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

/** A cura: o efeito do pixelfx nos pés de quem curou e o número verde. */
export function ImpactoDeCura({ valor, alvo, topo, semEfeito = false }: { valor: number; alvo: { x: number; pes: number; altura: number }; topo: number; semEfeito?: boolean }) {
  return (
    <>
      {!semEfeito && <FxPixelfx nome="cura" alvo={alvo} />}
      <span aria-label={textoDaFicha(T.curaAria, { n: valor })} className="cacada-numero-grande absolute z-30 pointer-events-none font-cinzel font-black leading-none" style={{ left: alvo.x, top: topo, fontSize: 30, color: '#8CF08C', textShadow: CONTORNO }}>+{valor}</span>
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
