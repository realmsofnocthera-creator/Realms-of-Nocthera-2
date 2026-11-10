'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { getAvatarFaceStyle, resolveAvatarSrc } from '@/assets/avatars';
import { FUNDO_DA_MOCHILA } from '@/assets/mochilaUi';
import { KIT_DA_FORJA } from '@/assets/forjaUi';
import { ARTE_DO_RANKING, MEDALHAS_DO_PODIO, PODIO } from '@/assets/rankingUi';
import { CRITERIOS_DE_RANKING, EXPLICACAO_DO_RANKING, NOME_DO_RANKING, UNIDADE_DO_RANKING, type CriterioDeRanking, type EntradaDoRanking } from '@/rules/social';
import { CLASSES_MAP } from '@/rules/classes';
import { formatarCompacto } from '@/rules/numerosCompactos';
import { BarraDeTitulo, FundoDaForja, PainelDaForja, PalcoDaForja, TEXTO_PIXEL } from '@/components/forja/KitDaForja';
import { PrivacidadeSocial } from './PrivacidadeSocial';

interface Resposta {
  criterio: CriterioDeRanking;
  atualizadoEm: string;
  entradas: EntradaDoRanking[];
  minhaPosicao: number | null;
  estouEscondido: boolean;
}

const pixel: React.CSSProperties = { imageRendering: 'pixelated' };

/** Onde cada lugar fica sobre a arte do pódio (em % da imagem): o centro da face de cima e as faixas do estandarte. */
const LUGARES = [
  { x: 49.8, topo: 31.5, tamanho: 17, medalha: 44, nome: 55.5, valor: 66, larguraTexto: 12 },
  { x: 25.7, topo: 51, tamanho: 13.5, medalha: 63, nome: 72, valor: 80, larguraTexto: 15 },
  { x: 74.5, topo: 58.5, tamanho: 13.5, medalha: 70.5, nome: 79, valor: 86.5, larguraTexto: 15 },
] as const;

/** O rosto do avatar num círculo, em cqw (cresce com o palco), com a moldura dourada do kit. */
function AvatarDoRanking({ e, tamanho, destaque = false }: { e: EntradaDoRanking; tamanho: number; destaque?: boolean }) {
  return (
    <span className="shrink-0 rounded-full overflow-hidden block bg-[#16120E]" style={{ width: `${tamanho}cqw`, height: `${tamanho}cqw`, border: `${destaque ? 0.7 : 0.5}cqw solid ${destaque ? '#E7C46A' : '#B2A66C'}`, boxShadow: destaque ? '0 0 2.4cqw rgba(231,196,106,0.55)' : undefined }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={resolveAvatarSrc(e.avatarId, e.classeId)} alt={`Avatar de ${e.nome}`} style={getAvatarFaceStyle(e.avatarId, e.classeId)} className="w-full h-full select-none pointer-events-none" />
    </span>
  );
}

/** O pódio: os 3 primeiros sobre os pedestais (1º no centro, 2º à esquerda, 3º à direita). */
function Podio({ entradas, unidade }: { entradas: EntradaDoRanking[]; unidade: readonly [string, string] }) {
  return (
    <div role="list" aria-label="Pódio" className="relative w-full" style={{ aspectRatio: '1536 / 965' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={PODIO} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full" style={{ ...pixel, mixBlendMode: 'lighten' }} />
      {LUGARES.map((l, i) => {
        const e = entradas[i];
        return (
          <div key={i} role="listitem" aria-label={e ? `${i + 1}º lugar: ${e.nome}, ${e.valor} ${e.valor === 1 ? unidade[0] : unidade[1]}` : `${i + 1}º lugar vago`}>
            <div className="absolute flex justify-center" style={{ left: `${l.x}%`, top: `${l.topo}%`, transform: 'translate(-50%, -100%)', paddingBottom: '0.4cqw' }}>
              {e ? (
                <AvatarDoRanking e={e} tamanho={l.tamanho} destaque={i === 0} />
              ) : (
                <span className="rounded-full flex items-center justify-center border-dashed border-[#3A5B7A] bg-[#080C16]/70" style={{ width: `${l.tamanho}cqw`, height: `${l.tamanho}cqw`, borderWidth: '0.5cqw' }}>
                  <span className={`${TEXTO_PIXEL} text-[5cqw] font-bold text-[#5E7390]`}>?</span>
                </span>
              )}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={MEDALHAS_DO_PODIO[i]} alt="" aria-hidden="true" draggable={false} className="absolute object-contain" style={{ left: `${l.x}%`, top: `${l.medalha}%`, width: '8cqw', height: '8cqw', transform: 'translate(-50%, -50%)', ...pixel }} />
            <p className="absolute text-center font-cinzel font-extrabold leading-none text-[#F5F3E0]" style={{ textShadow: '0.25cqw 0 0 #05070D, -0.25cqw 0 0 #05070D, 0 0.25cqw 0 #05070D, 0 -0.25cqw 0 #05070D', left: `${l.x}%`, top: `${l.nome}%`, width: `${l.larguraTexto}cqw`, transform: 'translate(-50%, -50%)', fontSize: '2.3cqw' }}>
              <span className="block truncate">{e ? e.nome : 'Vago'}</span>
            </p>
            {e && (
              <p className="absolute text-center font-[family-name:var(--font-silk)] font-bold leading-none text-[#FFF3C4] tabular-nums" style={{ left: `${l.x}%`, top: `${l.valor}%`, width: `${l.larguraTexto}cqw`, transform: 'translate(-50%, -50%)', fontSize: '2.9cqw', textShadow: '0.3cqw 0 0 #05070D, -0.3cqw 0 0 #05070D, 0 0.3cqw 0 #05070D, 0 -0.3cqw 0 #05070D' }}>
                {formatarCompacto(e.valor)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** O cartão de seleção de um ranking: a arte grande; o escolhido ganha a moldura ciano e o brilho. */
function CartaoDoRanking({ c, ativo, aoEscolher }: { c: CriterioDeRanking; ativo: boolean; aoEscolher: () => void }) {
  const arte = ARTE_DO_RANKING[c];
  return (
    <button type="button" aria-pressed={ativo} aria-label={NOME_DO_RANKING[c]} onClick={aoEscolher} className="relative block w-full cursor-pointer active:translate-y-px" style={{ aspectRatio: '16 / 9', filter: ativo ? 'drop-shadow(0 0 2cqw rgba(111,227,238,0.6))' : 'brightness(0.6) saturate(0.7)', transition: 'filter 150ms' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {arte.icone ? (
        <>
          <span aria-hidden="true" className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 35%, #3A2A66 0%, #151038 55%, #080A1C 100%)', border: '0.5cqw solid #B2A66C' }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={arte.src} alt="" aria-hidden="true" draggable={false} className="absolute left-1/2 top-[6%] h-[58%] -translate-x-1/2 object-contain" style={{ imageRendering: 'pixelated' }} />
        </>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={arte.src} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full" style={{ objectFit: 'cover' }} />
      )}
      {!arte.comTitulo && (
        <span className="absolute inset-x-[6%] bottom-[8%] flex items-center justify-center py-[1cqw] bg-[#05070D]/80 border border-[#B2A66C]">
          <span className="font-cinzel font-extrabold uppercase text-[3.4cqw] tracking-wider text-[#F5F3E0] [text-shadow:1px_1px_0_#05070D]">{NOME_DO_RANKING[c]}</span>
        </span>
      )}
      {ativo && <span aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 0 0.7cqw #6FE3EE' }} />}
    </button>
  );
}

/**
 * Ranking (7.1) em pixel (kit azul e dourado): as 4 seleções em cartões com a arte das provações, o pódio com os 3
 * primeiros, a lista do 4º em diante e, embaixo, a sua posição. O retrato é renovado a cada 30 minutos no servidor.
 */
export function RankingScreen({ tokenFresco }: { tokenFresco: () => Promise<string | null> }) {
  const [criterio, setCriterio] = useState<CriterioDeRanking>('nivel');
  const [dados, setDados] = useState<Resposta | null>(null);
  const [erro, setErro] = useState(false);

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
    void carregar();
  }, [carregar]);

  const unidade = UNIDADE_DO_RANKING[criterio];
  const [singular, plural] = unidade;
  const resto = dados?.entradas.filter((e) => e.posicao > 3) ?? [];
  const meu = dados
    ? dados.estouEscondido ? 'Você está escondido deste ranking' : dados.minhaPosicao ? `Sua posição: ${dados.minhaPosicao}º` : 'Você ainda não está neste ranking'
    : erro ? 'Não foi possível carregar o ranking agora' : 'Carregando...';

  return (
    <main className="fixed inset-0 overflow-hidden select-none bg-[#05070D]">
      <FundoDaForja />
      <PalcoDaForja>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={FUNDO_DA_MOCHILA} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none" style={{ objectFit: 'fill', zIndex: -1 }} />

        <header className="flex items-center gap-[1.4cqw] px-[3.4cqw] pt-[3.4cqw]">
          <Link href="/menu" aria-label="Voltar ao Menu" className="w-[9cqw] h-[9cqw] shrink-0 cursor-pointer active:translate-y-px">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={KIT_DA_FORJA.voltar} alt="" aria-hidden="true" className="w-full h-full object-contain" style={pixel} />
          </Link>
          <BarraDeTitulo titulo="Ranking" className="w-[58cqw]" />
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto forja-rolagem px-[3.4cqw] pt-[2.4cqw] pb-[1cqw] flex flex-col gap-[2cqw]">
          <nav aria-label="Rankings" className="grid grid-cols-2 gap-[1.6cqw]">
            {CRITERIOS_DE_RANKING.map((c) => (
              <CartaoDoRanking key={c} c={c} ativo={c === criterio} aoEscolher={() => setCriterio(c)} />
            ))}
          </nav>
          <p className={`${TEXTO_PIXEL} text-[2.3cqw] text-center text-[#9CC4E0] leading-snug`}>{EXPLICACAO_DO_RANKING[criterio]}</p>

          {erro ? (
            <p role="alert" className={`${TEXTO_PIXEL} text-[2.8cqw] text-center text-[#FFB4B4] py-[6cqw]`}>Não foi possível carregar o ranking agora. Tente de novo em instantes.</p>
          ) : !dados ? (
            <p role="status" className={`${TEXTO_PIXEL} text-[2.8cqw] text-center text-[#8FB3D1] py-[6cqw]`}>Carregando...</p>
          ) : dados.entradas.length === 0 ? (
            <p role="status" className={`${TEXTO_PIXEL} text-[2.8cqw] text-center text-[#8FB3D1] py-[6cqw]`}>Ninguém no ranking ainda.</p>
          ) : (
            <>
              <Podio entradas={dados.entradas} unidade={unidade} />
              {resto.length > 0 && (
                <PainelDaForja as="section" aria-label="Do 4º lugar em diante" borda="2.6cqw">
                  <ol className="flex flex-col pt-[1.6cqw] pb-[0.6cqw]">
                    {resto.map((e) => {
                      const eu = dados.minhaPosicao === e.posicao;
                      return (
                        <li key={`${e.posicao}-${e.nome}`} className={`flex items-center gap-[2cqw] py-[1.2cqw] px-[1cqw] border-b border-[#1C2D44] ${eu ? 'bg-[#0F3A4A]/70' : ''}`}>
                          <span className={`font-cinzel w-[8cqw] text-center text-[3.2cqw] font-extrabold tabular-nums ${eu ? 'text-[#6FE3EE]' : 'text-[#E7C46A]'}`}>{e.posicao}º</span>
                          <AvatarDoRanking e={e} tamanho={9} />
                          <span className="flex-1 min-w-0 flex flex-col leading-tight">
                            <span className="font-cinzel font-bold text-[2.9cqw] text-[#F5F3E0] truncate [text-shadow:1px_1px_0_#05070D]">{e.nome}</span>
                            <span className={`${TEXTO_PIXEL} text-[2cqw] text-[#9CC4E0] truncate`}>{CLASSES_MAP[e.classeId]?.nome ?? e.classeId} · nível {e.nivel}</span>
                          </span>
                          <span className={`${TEXTO_PIXEL} text-[2.5cqw] font-bold text-[#F5F3E0] whitespace-nowrap tabular-nums`}>{formatarCompacto(e.valor)} {e.valor === 1 ? singular : plural}</span>
                        </li>
                      );
                    })}
                  </ol>
                </PainelDaForja>
              )}
              <p className={`${TEXTO_PIXEL} text-[1.9cqw] text-center text-[#6F8CA8] leading-snug`}>Atualizado em {new Date(dados.atualizadoEm).toLocaleString('pt-BR')}. O ranking é renovado a cada 30 minutos.</p>
            </>
          )}
          <div className={`${TEXTO_PIXEL} text-[2.4cqw] flex justify-center [&_label]:!text-[#C7D8E8] [&_label]:!text-[2.4cqw] [&_input]:!w-[3.4cqw] [&_input]:!h-[3.4cqw]`}>
            <PrivacidadeSocial tokenFresco={tokenFresco} campo="escondidoNoRanking" aoMudar={() => void carregar()} />
          </div>
        </div>

        <div className="px-[3.4cqw] pt-[1.2cqw] pb-[3cqw]">
          <div className="relative w-full" style={{ aspectRatio: '415 / 64', maxWidth: '78%', margin: '0 auto' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={KIT_DA_FORJA.barraStatus} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full" style={{ ...pixel, objectFit: 'fill' }} />
            <p role="status" className="absolute inset-0 flex items-center justify-center px-[6%] text-center font-cinzel font-bold text-[3cqw] leading-tight text-[#DFF3FF] [text-shadow:1px_1px_0_#05070D]">{meu}</p>
          </div>
        </div>
      </PalcoDaForja>
    </main>
  );
}
