'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { resolveAvatarSrc } from '@/assets/avatars';
import { FUNDO_DA_MOCHILA } from '@/assets/mochilaUi';
import { KIT_DA_FORJA } from '@/assets/forjaUi';
import { ABAS_DO_RANKING, EXPLICACAO_DO_PODER, FEIXES_DO_PODIO, MEDALHAS_DO_PODIO, PODIO, type AbaDoRanking } from '@/assets/rankingUi';
import { EXPLICACAO_DO_RANKING, UNIDADE_DO_RANKING, type CriterioDeRanking, type EntradaDoRanking } from '@/rules/social';
import { CLASSES_MAP } from '@/rules/classes';
import { formatarCompacto } from '@/rules/numerosCompactos';
import type { CharacterDocument } from '@/server/characterService';
import { BarraDeTitulo, FundoDaForja, PalcoDaForja, TEXTO_PIXEL } from '@/components/forja/KitDaForja';
import { PrivacidadeSocial } from './PrivacidadeSocial';

interface Resposta {
  criterio: CriterioDeRanking;
  atualizadoEm: string;
  entradas: EntradaDoRanking[];
  minhaPosicao: number | null;
  estouEscondido: boolean;
}

const pixel: React.CSSProperties = { imageRendering: 'pixelated' };
const CONTORNO = '0.25cqw 0 0 #05070D, -0.25cqw 0 0 #05070D, 0 0.25cqw 0 #05070D, 0 -0.25cqw 0 #05070D';

/** Onde cada lugar fica sobre a arte do pódio (em % da imagem): o centro da face de cima e as faixas do estandarte. */
const LUGARES = [
  { x: 49.8, topo: 31.5, altura: 25, feixe: 24, medalha: 44, nome: 55.5, valor: 66, larguraTexto: 12 },
  { x: 25.7, topo: 51, altura: 19.5, feixe: 19, medalha: 63, nome: 72, valor: 80, larguraTexto: 15 },
  { x: 74.5, topo: 58.5, altura: 19.5, feixe: 19, medalha: 70.5, nome: 79, valor: 86.5, larguraTexto: 15 },
] as const;

/** O personagem de corpo inteiro (a arte do avatar tem fundo transparente), em pé, com o rosto na parte de cima. */
function Personagem({ e, altura }: { e: EntradaDoRanking; altura: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={resolveAvatarSrc(e.avatarId, e.classeId)} alt={`Avatar de ${e.nome}`} draggable={false} className="block object-contain select-none pointer-events-none" style={{ height: `${altura}cqw`, width: `${altura * (2 / 3)}cqw`, filter: 'drop-shadow(0 0.6cqw 0.4cqw rgba(0,0,0,0.6))' }} />
  );
}

/** O avatar num quadro quadrado dourado (as linhas da lista e a sua linha fixa); mostra o rosto da arte de corpo inteiro. */
function QuadroDoAvatar({ avatarId, classeId, nome, tamanho }: { avatarId: string; classeId: string; nome: string; tamanho: number }) {
  return (
    <span className="shrink-0 block overflow-hidden bg-[#16120E]" style={{ width: `${tamanho}cqw`, height: `${tamanho}cqw`, border: '0.5cqw solid #B2A66C', boxShadow: '0 0 0 0.3cqw #05070D' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={resolveAvatarSrc(avatarId, classeId)} alt={`Avatar de ${nome}`} draggable={false} className="w-full h-full select-none pointer-events-none" style={{ objectFit: 'cover', objectPosition: '50% 10%', transform: 'scale(1.9)', transformOrigin: '50% 12%' }} />
    </span>
  );
}

/** O pódio: os 3 primeiros em pé sobre os pedestais (1º no centro, 2º à esquerda, 3º à direita), com o feixe de luz e o número de cada lugar. */
function Podio({ entradas, unidade }: { entradas: EntradaDoRanking[]; unidade: readonly [string, string] }) {
  return (
    <div className="relative w-full pt-[8cqw]">
      <div role="list" aria-label="Pódio" className="relative w-full" style={{ aspectRatio: '1536 / 965' }}>
        {LUGARES.map((l, i) => (
          <React.Fragment key={`f${i}`}>
            <span aria-hidden="true" className="absolute" style={{ left: `${l.x}%`, top: `${l.topo - (l.altura / 58.5) * 100 - 2}%`, bottom: `${100 - l.topo}%`, width: `${l.feixe}cqw`, transform: 'translateX(-50%)', background: `linear-gradient(180deg, ${FEIXES_DO_PODIO[i]}00 0%, ${FEIXES_DO_PODIO[i]}55 55%, ${FEIXES_DO_PODIO[i]}99 100%)`, clipPath: 'polygon(14% 0, 86% 0, 100% 100%, 0 100%)' }} />
            <span aria-hidden="true" className="absolute font-cinzel font-black leading-none" style={{ left: `${l.x}%`, top: `${l.topo - (l.altura / 58.5) * 100 * 0.55}%`, transform: 'translate(-50%, -50%)', fontSize: `${l.altura * 0.62}cqw`, color: `${FEIXES_DO_PODIO[i]}`, opacity: 0.32 }}>{i + 1}</span>
          </React.Fragment>
        ))}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={PODIO} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full" style={{ ...pixel, mixBlendMode: 'lighten', WebkitMaskImage: 'radial-gradient(ellipse 62% 70% at 50% 58%, #000 70%, transparent 100%)', maskImage: 'radial-gradient(ellipse 62% 70% at 50% 58%, #000 70%, transparent 100%)' }} />
        {LUGARES.map((l, i) => {
          const e = entradas[i];
          return (
            <div key={i} role="listitem" aria-label={e ? `${i + 1}º lugar: ${e.nome}, ${e.valor} ${e.valor === 1 ? unidade[0] : unidade[1]}` : `${i + 1}º lugar vago`}>
              <div className="absolute flex justify-center" style={{ left: `${l.x}%`, top: `${l.topo}%`, transform: 'translate(-50%, -100%)', marginTop: '0.6cqw' }}>
                {e ? (
                  <Personagem e={e} altura={l.altura} />
                ) : (
                  <span className={`${TEXTO_PIXEL} font-bold text-[#3A5B7A] leading-none`} style={{ fontSize: `${l.altura * 0.5}cqw` }}>?</span>
                )}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={MEDALHAS_DO_PODIO[i]} alt="" aria-hidden="true" draggable={false} className="absolute object-contain" style={{ left: `${l.x}%`, top: `${l.medalha}%`, width: '8cqw', height: '8cqw', transform: 'translate(-50%, -50%)', ...pixel }} />
              <p className="absolute text-center font-cinzel font-extrabold leading-none text-[#F5F3E0]" style={{ left: `${l.x}%`, top: `${l.nome}%`, width: `${l.larguraTexto}cqw`, transform: 'translate(-50%, -50%)', fontSize: '2.3cqw', textShadow: CONTORNO }}>
                <span className="block truncate">{e ? e.nome : 'Vago'}</span>
              </p>
              {e && (
                <p className="absolute text-center font-[family-name:var(--font-silk)] font-bold leading-none text-[#FFF3C4] tabular-nums" style={{ left: `${l.x}%`, top: `${l.valor}%`, width: `${l.larguraTexto}cqw`, transform: 'translate(-50%, -50%)', fontSize: '2.9cqw', textShadow: CONTORNO }}>
                  {formatarCompacto(e.valor)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Uma linha do ranking como na referência: a posição numa aba quadrada, o avatar, o nome e o valor numa pílula com o ícone. */
function Linha({ posicao, avatarId, classeId, nome, subtitulo, valor, unidade, icone, eu = false }: { posicao: number; avatarId: string; classeId: string; nome: string; subtitulo: string; valor: string; unidade: string; icone: string; eu?: boolean }) {
  return (
    <li className="flex items-stretch gap-[1.6cqw] border" style={{ borderColor: eu ? '#3AB8D0' : '#2B5C80', background: eu ? 'linear-gradient(90deg, #0B3A52 0%, #0A2740 60%, #08172B 100%)' : 'linear-gradient(90deg, #12233A 0%, #0B1626 70%, #080F1C 100%)', boxShadow: eu ? 'inset 0 0 0 0.3cqw #6FE3EE55' : 'inset 0 0 0 0.3cqw #B2A66C33' }}>
      <span className="flex items-center justify-center w-[11cqw] shrink-0 border-r border-[#1F3550] bg-[#05101D]/70">
        <span className="font-cinzel font-black text-[4.4cqw] leading-none tabular-nums" style={{ color: eu ? '#6FE3EE' : '#E7C46A', textShadow: CONTORNO }}>{posicao}</span>
      </span>
      <span className="flex items-center py-[1cqw]"><QuadroDoAvatar avatarId={avatarId} classeId={classeId} nome={nome} tamanho={11} /></span>
      <span className="flex-1 min-w-0 flex flex-col justify-center leading-tight">
        <span className="font-cinzel font-extrabold text-[3.1cqw] text-[#F5F3E0] truncate" style={{ textShadow: CONTORNO }}>{nome}</span>
        <span className={`${TEXTO_PIXEL} text-[1.9cqw] text-[#9CC4E0] truncate`}>{subtitulo}</span>
      </span>
      <span className="flex items-center pr-[1.6cqw]">
        <span className="pilula-pixel flex items-center gap-[1cqw] pl-[0.8cqw] pr-[1.6cqw] py-[0.6cqw]" title={`${valor} ${unidade}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={icone} alt="" aria-hidden="true" draggable={false} className="w-[5.6cqw] h-[5.6cqw] object-contain shrink-0" style={pixel} />
          <span className={`${TEXTO_PIXEL} text-[2.8cqw] font-bold text-[#F5F3E0] tabular-nums whitespace-nowrap`}>{valor}</span>
        </span>
      </span>
    </li>
  );
}

/**
 * Ranking (7.1) em pixel (kit azul e dourado), na disposição da referência: o pódio com os 3 primeiros de corpo inteiro,
 * os títulos de coluna, a lista do 4º em diante, a sua linha fixa e, embaixo, a seta de voltar e as categorias com
 * emblema. O Poder Total é a categoria principal, mas ainda não tem dados no servidor (aba bloqueada, "em breve").
 * O retrato é renovado a cada 30 minutos no servidor.
 */
export function RankingScreen({ tokenFresco, character }: { tokenFresco: () => Promise<string | null>; character?: CharacterDocument }) {
  const [aba, setAba] = useState<AbaDoRanking>('nivel');
  const [dados, setDados] = useState<Resposta | null>(null);
  const [erro, setErro] = useState(false);
  const definicao = ABAS_DO_RANKING.find((a) => a.id === aba)!;
  const bloqueada = !!definicao.bloqueada;
  const criterio: CriterioDeRanking = aba === 'poder' ? 'nivel' : aba;

  const carregar = useCallback(async () => {
    setErro(false);
    try {
      const token = await tokenFresco();
      const res = await fetch(`/api/ranking?tipo=${criterio}`, { headers: { Authorization: `Bearer ${token ?? ''}` } });
      if (!res.ok) throw new Error('falhou');
      setDados((await res.json()) as Resposta);
    } catch {
      setErro(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criterio]);

  useEffect(() => {
    setDados(null);
    if (!bloqueada) void carregar();
  }, [carregar, bloqueada]);

  const unidade = UNIDADE_DO_RANKING[criterio];
  const [singular, plural] = unidade;
  const resto = dados?.entradas.filter((e) => e.posicao > 3) ?? [];
  const minhaEntrada = dados?.minhaPosicao ? dados.entradas.find((e) => e.posicao === dados.minhaPosicao) : undefined;
  const textoDoValor = (v: number) => formatarCompacto(v);
  const explicacao = bloqueada ? EXPLICACAO_DO_PODER : EXPLICACAO_DO_RANKING[criterio];
  const aviso = dados?.estouEscondido ? 'Você está escondido deste ranking' : dados && !dados.minhaPosicao ? 'Você ainda não está neste ranking' : null;

  return (
    <main className="fixed inset-0 overflow-hidden select-none bg-[#05070D]">
      <FundoDaForja />
      <PalcoDaForja>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={FUNDO_DA_MOCHILA} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none" style={{ objectFit: 'fill', zIndex: -1 }} />

        <header className="flex items-center justify-center px-[3.4cqw] pt-[3.4cqw]">
          <BarraDeTitulo titulo={definicao.nome} className="w-[66cqw]" />
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto forja-rolagem px-[3.4cqw] pt-[1.4cqw] pb-[1cqw] flex flex-col gap-[1.6cqw]">
          <p className={`${TEXTO_PIXEL} text-[2.2cqw] text-center text-[#9CC4E0] leading-snug`}>{explicacao}</p>

          {bloqueada ? (
            <div role="status" className="flex flex-col items-center gap-[2cqw] py-[10cqw]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={definicao.icone} alt="" aria-hidden="true" draggable={false} className="w-[34cqw] h-[34cqw] object-contain opacity-60 grayscale" style={pixel} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={KIT_DA_FORJA.proibido} alt="" aria-hidden="true" className="w-[10cqw] h-[10cqw] object-contain" style={pixel} />
              <p className="font-cinzel font-extrabold uppercase text-[3.6cqw] text-[#9CD8FF]">Chega em breve</p>
            </div>
          ) : erro ? (
            <p role="alert" className={`${TEXTO_PIXEL} text-[2.8cqw] text-center text-[#FFB4B4] py-[6cqw]`}>Não foi possível carregar o ranking agora. Tente de novo em instantes.</p>
          ) : !dados ? (
            <p role="status" className={`${TEXTO_PIXEL} text-[2.8cqw] text-center text-[#8FB3D1] py-[6cqw]`}>Carregando...</p>
          ) : dados.entradas.length === 0 ? (
            <p role="status" className={`${TEXTO_PIXEL} text-[2.8cqw] text-center text-[#8FB3D1] py-[6cqw]`}>Ninguém no ranking ainda.</p>
          ) : (
            <>
              <Podio entradas={dados.entradas} unidade={unidade} />
              {resto.length > 0 && (
                <>
                  <div aria-hidden="true" className="grid items-center font-cinzel font-bold text-[2.3cqw] text-[#C9B27A] px-[1cqw]" style={{ gridTemplateColumns: '11cqw 1fr auto' }}>
                    <span>Posição</span>
                    <span className="pl-[2cqw]">Informações do jogador</span>
                    <span className="capitalize pr-[2cqw]">{plural}</span>
                  </div>
                  <ol aria-label="Do 4º lugar em diante" className="flex flex-col gap-[1.2cqw]">
                    {resto.map((e) => (
                      <Linha key={`${e.posicao}-${e.nome}`} posicao={e.posicao} avatarId={e.avatarId} classeId={e.classeId} nome={e.nome} subtitulo={`${CLASSES_MAP[e.classeId]?.nome ?? e.classeId} · nível ${e.nivel}`} valor={textoDoValor(e.valor)} unidade={e.valor === 1 ? singular : plural} icone={definicao.icone} eu={dados.minhaPosicao === e.posicao} />
                    ))}
                  </ol>
                </>
              )}
              <p className={`${TEXTO_PIXEL} text-[1.9cqw] text-center text-[#6F8CA8] leading-snug`}>Atualizado em {new Date(dados.atualizadoEm).toLocaleString('pt-BR')}. O ranking é renovado a cada 30 minutos.</p>
            </>
          )}
          <div className={`${TEXTO_PIXEL} text-[2.4cqw] flex justify-center [&_label]:!text-[#C7D8E8] [&_label]:!text-[2.4cqw] [&_input]:!w-[3.4cqw] [&_input]:!h-[3.4cqw]`}>
            <PrivacidadeSocial tokenFresco={tokenFresco} campo="escondidoNoRanking" aoMudar={() => void carregar()} />
          </div>
        </div>

        {/* A sua linha, fixa acima das categorias */}
        {dados && !bloqueada && (dados.minhaPosicao || aviso) && (
          <div className="px-[3.4cqw] pt-[1cqw]">
            {dados.minhaPosicao && (minhaEntrada || character) ? (
              <ol aria-label="Sua posição">
                <Linha posicao={dados.minhaPosicao} avatarId={minhaEntrada?.avatarId ?? character!.avatarId} classeId={minhaEntrada?.classeId ?? character!.classeId} nome={minhaEntrada?.nome ?? character!.nome} subtitulo={`${CLASSES_MAP[minhaEntrada?.classeId ?? character!.classeId]?.nome ?? ''} · nível ${minhaEntrada?.nivel ?? character!.nivel}`} valor={minhaEntrada ? textoDoValor(minhaEntrada.valor) : '—'} unidade={plural} icone={definicao.icone} eu />
              </ol>
            ) : (
              <p role="status" className="font-cinzel font-bold text-[3cqw] text-center text-[#DFF3FF] py-[1.4cqw] border border-[#2B5C80] bg-[#0A1B2E]">{aviso ?? `Sua posição: ${dados.minhaPosicao}º`}</p>
            )}
          </div>
        )}

        {/* EMBAIXO: a seta de voltar e as categorias, com o emblema de cada uma */}
        <nav aria-label="Rankings" className="flex items-stretch gap-[1.4cqw] px-[3.4cqw] pt-[1.4cqw] pb-[3cqw]">
          <Link href="/menu" aria-label="Voltar ao Menu" className="w-[11cqw] shrink-0 self-center aspect-square cursor-pointer active:translate-y-px">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={KIT_DA_FORJA.voltar} alt="" aria-hidden="true" className="w-full h-full object-contain" style={pixel} />
          </Link>
          <div className="flex-1 grid grid-cols-5 gap-[1cqw]">
            {ABAS_DO_RANKING.map((a) => {
              const ativa = a.id === aba;
              return (
                <button key={a.id} type="button" aria-pressed={ativa} aria-label={a.bloqueada ? `${a.nome} (em breve)` : a.nome} onClick={() => setAba(a.id)} className="relative flex flex-col items-center gap-[0.4cqw] pt-[1cqw] pb-[0.8cqw] cursor-pointer active:translate-y-px min-w-0" style={{ background: ativa ? 'linear-gradient(180deg, #0F5A6E 0%, #0A2F45 100%)' : 'linear-gradient(180deg, #12233A 0%, #0A1422 100%)', border: `0.5cqw solid ${ativa ? '#6FE3EE' : '#2B5C80'}`, boxShadow: ativa ? '0 0 2cqw rgba(111,227,238,0.55)' : undefined }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.icone} alt="" aria-hidden="true" draggable={false} className="w-[10.4cqw] h-[10.4cqw] object-contain" style={{ ...pixel, filter: ativa ? undefined : 'brightness(0.7) saturate(0.8)' }} />
                  <span className="font-cinzel font-extrabold uppercase text-[1.9cqw] leading-none truncate max-w-full" style={{ color: ativa ? '#F5F3E0' : '#9CC4E0' }}>{a.curto}</span>
                  {a.bloqueada && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={KIT_DA_FORJA.proibido} alt="" aria-hidden="true" className="absolute -top-[1cqw] -right-[1cqw] w-[4.4cqw] h-[4.4cqw]" style={pixel} />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </PalcoDaForja>
    </main>
  );
}
