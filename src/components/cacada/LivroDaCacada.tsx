'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { QuadrosDaVirada, useViradaDoLivro } from './useViradaDoLivro';
import { Crown, Lock } from 'lucide-react';
import type { RanqueCacada } from '@/rules/cacada';
import { LIVRO_DA_CACADA as L, caixaEmPorcento } from '@/assets/cacadaLivroUi';
import { LIVRO_DAS_PROVACOES as P } from '@/assets/provacoesLivroUi';
import { estrelasDoRanque, monstrosDaEstrela, ranquesDaCacada, type MonstroTela } from '@/lib/cacadaTela';
import { fitaDaEstrela, ladoNaPagina, paginasDeMonstros } from '@/lib/cacadaLivro';
import { textoDaFicha } from '@/rules/textosDaFicha';
import { TEXTOS_DA_CACADA as T } from '@/rules/textosDaCacada';
import type { CharacterDocument } from '@/server/characterService';
import { BotaoDePagina } from '../provacoes/LivroAnimado';
import { BotaoPixel, JanelaDaCacada, TINTA } from './JanelaDaCacada';
import { DetalhesDoMonstro, Retrato, type InfoDoIcone } from './DetalhesDoMonstro';
import { nivelDaCriatura } from '@/rules/bestiario';

/** Onde o jogador está no livro: o ranque (aba), a estrela (fita) e o monstro aberto na página da direita. */
export interface LugarNoLivro {
  ranque: RanqueCacada;
  estrela: number;
  monstroId: string;
}

type Personagem = Pick<CharacterDocument, 'nivel' | 'cacadaChavesVencidas' | 'bestiario' | 'monstrosDerrotados'>;

interface LivroDaCacadaProps {
  personagem: Personagem;
  lugar: LugarNoLivro;
  aoMudarLugar: (l: LugarNoLivro) => void;
  ocupado: boolean;
  aoCacar: (l: LugarNoLivro) => void;
  className?: string;
}

const pixel: React.CSSProperties = { imageRendering: 'pixelated' };
const SOMBRA_CLARA = '0.3cqw 0.3cqw 0 #1A0805';

/** O primeiro monstro de uma estrela (o que abre quando se troca de fita). */
export function primeiroMonstro(estrela: number): string {
  return monstrosDaEstrela(estrela)[0]?.id ?? '';
}

/** O lugar inicial do livro: ranque Baixo, 1★, primeiro monstro. */
export function lugarInicial(): LugarNoLivro {
  return { ranque: 'baixo', estrela: 1, monstroId: primeiroMonstro(1) };
}

function MonstroNaLista({ monstro, indice, escolhido, aoEscolher }: { monstro: MonstroTela; indice: number; escolhido: boolean; aoEscolher: () => void }) {
  const lado = ladoNaPagina(indice);
  return (
    <button
      type="button"
      onClick={aoEscolher}
      aria-label={textoDaFicha(T.escolher, { nome: monstro.nome })}
      aria-pressed={escolhido}
      data-lado={lado}
      className={`flex flex-col items-center gap-[0.4cqw] w-[72%] px-[0.6cqw] py-[0.4cqw] text-center cursor-pointer border-[0.4cqw] active:translate-y-px focus-visible:outline focus-visible:outline-[0.6cqw] focus-visible:outline-[#6FE3EE] ${lado === 'dir' ? 'self-end' : 'self-start'}`}
      style={{ borderColor: escolhido ? '#8E2A1B' : 'transparent', background: escolhido ? 'rgba(142,42,27,0.16)' : 'transparent', transform: `rotate(${lado === 'dir' ? 1 : -1}deg)`, color: TINTA }}
    >
      <Retrato monstro={monstro} tamanho="5.4cqw" />
      <span className="font-cinzel font-black text-[2.2cqw] leading-[1.1] flex items-center justify-center gap-[0.5cqw]">
        {monstro.chave && <Crown aria-label={T.monstroChave} className="shrink-0" style={{ width: '2.4cqw', height: '2.4cqw', color: '#B8832E' }} />}
        <span className="line-clamp-2 [overflow-wrap:break-word]">{monstro.nome.split(',')[0]}</span>
      </span>
    </button>
  );
}

/**
 * O livro da Caçada (arte do Yuri, o livro vermelho): a página da esquerda lista os monstros da dificuldade (3 por página,
 * em zigue-zague, um à esquerda e o seguinte à direita), e a da direita abre os ícones do monstro escolhido (retrato,
 * fraquezas, resistências e drops). As duas abas de cima são os ranques e as fitas da borda são as estrelas, todas
 * clicáveis. Trocar de página, de aba ou de fita vira a página com a animação de 6 quadros; escolher um monstro só muda
 * a página da direita. Com "reduzir movimento" ligado, tudo troca na hora. Os pré-requisitos só travam o botão Caçar:
 * o livro todo pode ser lido.
 */
export function LivroDaCacada({ personagem, lugar, aoMudarLugar, ocupado, aoCacar, className = '' }: LivroDaCacadaProps) {
  const [info, setInfo] = useState<InfoDoIcone | null>(null);
  const inicioDoGesto = useRef<number | null>(null);

  const monstros = monstrosDaEstrela(lugar.estrela);
  const paginas = paginasDeMonstros(monstros);
  const indiceDoMonstro = Math.max(0, monstros.findIndex((m) => m.id === lugar.monstroId));
  const pagina = Math.max(0, paginas.findIndex((p) => p.some((m) => m.id === lugar.monstroId)));
  const monstro = monstros[indiceDoMonstro];
  const ranques = ranquesDaCacada(personagem);
  const estrelas = estrelasDoRanque(personagem, lugar.ranque);
  const ranqueAtual = ranques.find((r) => r.ranque === lugar.ranque)!;
  const estrelaAtual = estrelas.find((e) => e.estrela === lugar.estrela);
  const bloqueio = !ranqueAtual.liberado ? textoDaFicha(T.requer, { x: ranqueAtual.requisito.charAt(0).toLowerCase() + ranqueAtual.requisito.slice(1) }) : estrelaAtual && !estrelaAtual.liberada ? estrelaAtual.bloqueio : null;

  const { virando, quadro, ir } = useViradaDoLivro<LugarNoLivro>(aoMudarLugar);

  const irParaPagina = useCallback(
    (passo: 1 | -1) => {
      const destino = paginas[pagina + passo];
      if (destino?.[0]) ir({ ...lugar, monstroId: destino[0].id }, passo);
    },
    [paginas, pagina, lugar, ir]
  );

  const escolherAba = (ranque: RanqueCacada) => {
    if (ranque === lugar.ranque) return;
    const primeira = ranque === 'baixo' ? 1 : 6;
    ir({ ranque, estrela: primeira, monstroId: primeiroMonstro(primeira) }, ranque === 'alto' ? 1 : -1);
  };
  const escolherEstrela = (estrela: number) => {
    if (estrela === lugar.estrela) return;
    ir({ ...lugar, estrela, monstroId: primeiroMonstro(estrela) }, estrela > lugar.estrela ? 1 : -1);
  };

  // setas do teclado
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (info) return;
      if (e.key === 'ArrowRight') irParaPagina(1);
      else if (e.key === 'ArrowLeft') irParaPagina(-1);
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [irParaPagina, info]);

  const abas = [
    { ranque: 'baixo' as const, rotulo: T.abaBaixo, arte: L.abas.baixo },
    { ranque: 'alto' as const, rotulo: T.abaAlto, arte: L.abas.alto },
  ];
  const fitaAtiva = L.fitas[fitaDaEstrela(lugar.estrela)];
  const conteudoOculto = !!virando;

  return (
    <section
      aria-label={T.livro}
      className={`relative w-full select-none ${className}`}
      style={{ containerType: 'inline-size', touchAction: 'pan-y' }}
      onPointerDown={(e) => {
        inicioDoGesto.current = e.clientX;
      }}
      onPointerUp={(e) => {
        const inicio = inicioDoGesto.current;
        inicioDoGesto.current = null;
        if (inicio === null) return;
        const dx = e.clientX - inicio;
        if (Math.abs(dx) > 48) irParaPagina(dx < 0 ? 1 : -1);
      }}
    >
      <div className="relative w-full" style={{ aspectRatio: `${L.largura} / ${L.altura}` }}>
        {/* o livro parado, com a aba e a fita escolhidas por cima */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={L.livro} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" style={pixel} />
        {abas.filter((a) => a.ranque === lugar.ranque).map((a) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={a.ranque} src={a.arte.src} alt="" aria-hidden="true" draggable={false} data-aba={a.ranque} className="absolute pointer-events-none" style={{ ...caixaEmPorcento(a.arte.caixa), ...pixel }} />
        ))}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fitaAtiva.src} alt="" aria-hidden="true" draggable={false} data-fita={lugar.estrela} className="absolute pointer-events-none" style={{ ...caixaEmPorcento(fitaAtiva.caixa), ...pixel }} />

        {/* as abas de cima (ranque) */}
        {abas.map((a) => {
          const r = ranques.find((x) => x.ranque === a.ranque)!;
          const ativa = a.ranque === lugar.ranque;
          return (
            <button
              key={a.ranque}
              type="button"
              onClick={() => escolherAba(a.ranque)}
              aria-pressed={ativa}
              aria-label={r.liberado ? textoDaFicha(T.abaAria, { nome: a.rotulo, faixa: r.faixa }) : textoDaFicha(T.abaBloqueadaAria, { nome: a.rotulo, faixa: r.faixa, requisito: r.requisito })}
              className="absolute flex items-center justify-center gap-[0.8cqw] cursor-pointer font-cinzel font-black uppercase tracking-wider text-[2.5cqw] leading-none whitespace-nowrap focus-visible:outline focus-visible:outline-[0.6cqw] focus-visible:outline-[#6FE3EE]"
              style={{ ...caixaEmPorcento({ x: a.arte.caixa.x + 30, y: 22, largura: a.arte.caixa.largura - 60, altura: 92 }), color: ativa ? '#FFE9B0' : '#C9B7A0', textShadow: SOMBRA_CLARA, opacity: r.liberado ? 1 : 0.7 }}
            >
              {!r.liberado && <Lock aria-hidden="true" style={{ width: '2.6cqw', height: '2.6cqw' }} />}
              {a.rotulo}
            </button>
          );
        })}

        {/* as fitas da borda (estrelas) */}
        {estrelas.map((e) => {
          const fita = L.fitas[fitaDaEstrela(e.estrela)];
          const ativa = e.estrela === lugar.estrela;
          return (
            <button
              key={e.estrela}
              type="button"
              onClick={() => escolherEstrela(e.estrela)}
              aria-pressed={ativa}
              aria-label={e.liberada ? textoDaFicha(T.estrelaAria, { n: e.estrela }) : textoDaFicha(T.estrelaBloqueadaAria, { n: e.estrela, requisito: e.bloqueio ?? '' })}
              className="absolute flex items-center justify-center cursor-pointer font-cinzel font-black text-[3cqw] leading-none focus-visible:outline focus-visible:outline-[0.6cqw] focus-visible:outline-[#6FE3EE]"
              style={{ ...caixaEmPorcento({ ...fita.caixa, x: fita.caixa.x - 55, largura: fita.caixa.largura + 51 }), color: '#FFE9B0', textShadow: SOMBRA_CLARA, opacity: e.liberada ? 1 : 0.65, paddingRight: ativa ? '1.7cqw' : '4.8cqw' }}
            >
              {e.liberada ? textoDaFicha(T.estrelaRotulo, { n: e.estrela }) : <Lock aria-hidden="true" style={{ width: '3cqw', height: '3cqw' }} />}
            </button>
          );
        })}

        {/* o conteúdo das páginas */}
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: conteudoOculto ? 0 : 1, transition: 'opacity 120ms ease-out' }} aria-hidden={conteudoOculto || undefined}>
          <div className="absolute flex flex-col justify-around pointer-events-auto" style={caixaEmPorcento(L.paginas.esquerda)} data-pagina="esquerda">
            {(paginas[pagina] ?? []).map((m, i) => (
              <MonstroNaLista key={m.id} monstro={m} indice={i} escolhido={m.id === lugar.monstroId} aoEscolher={() => aoMudarLugar({ ...lugar, monstroId: m.id })} />
            ))}
            {!monstros.length && <p className="text-center font-cinzel font-bold text-[2.6cqw]" style={{ color: TINTA }}>{T.semMonstros}</p>}
          </div>
          <div className="absolute pointer-events-auto" style={caixaEmPorcento(L.paginas.direita)} data-pagina="direita">
            {monstro && (
              <DetalhesDoMonstro
                monstro={monstro}
                nivelBestiario={nivelDaCriatura(personagem, monstro.id)}
                aoInfo={setInfo}
                rodape={<BotaoPixel compacto destaque aoClicar={() => aoCacar(lugar)} desligado={!!bloqueio || ocupado || !!virando}>{ocupado ? T.cacando : T.cacar}</BotaoPixel>}
              />
            )}
          </div>
        </div>

        {/* a página virando, por cima de tudo */}
        <QuadrosDaVirada virando={virando} quadro={quadro} />
      </div>

      {/* os botões de página, a etiqueta e as ações */}
      <nav aria-label={T.livro} className="flex items-center justify-center gap-[4cqw] mt-[2.4cqw]">
        <BotaoDePagina lado="esq" ativo={pagina > 0 && !virando} rotulo={T.paginaAnterior} aoClicar={() => irParaPagina(-1)} />
        <div className="relative w-[22cqw] shrink-0" style={{ aspectRatio: '64 / 22' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={P.etiqueta} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" style={pixel} />
          <span role="status" aria-label={textoDaFicha(T.paginaDe, { n: pagina + 1, total: paginas.length })} className="absolute inset-0 flex items-center justify-center pt-[0.4cqw] font-cinzel font-extrabold text-[2.8cqw] leading-none" style={{ color: TINTA }}>
            {textoDaFicha(T.paginaCurta, { n: pagina + 1, total: paginas.length })}
          </span>
        </div>
        <BotaoDePagina lado="dir" ativo={pagina < paginas.length - 1 && !virando} rotulo={T.paginaSeguinte} aoClicar={() => irParaPagina(1)} />
      </nav>
      <div className="flex flex-col items-center gap-[1.6cqw] mt-[3cqw]">
        {bloqueio && <p role="status" className="flex items-center gap-[1cqw] font-cinzel font-bold text-[2.8cqw] leading-tight text-[#FFB4A8]" style={{ textShadow: SOMBRA_CLARA }}><Lock aria-hidden="true" style={{ width: '2.8cqw', height: '2.8cqw' }} />{bloqueio}</p>}
      </div>

      {info && (
        <JanelaDaCacada titulo={info.titulo} aoFechar={() => setInfo(null)}>
          <p className="text-center font-cinzel font-bold text-[3.2cqw] leading-snug">{info.texto}</p>
        </JanelaDaCacada>
      )}
    </section>
  );
}
