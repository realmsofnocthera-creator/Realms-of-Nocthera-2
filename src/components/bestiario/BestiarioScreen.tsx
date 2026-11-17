'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Crown } from 'lucide-react';
import type { CharacterDocument } from '@/server/characterService';
import { LIVRO_DA_CACADA as L, caixaEmPorcento } from '@/assets/cacadaLivroUi';
import { LIVRO_DAS_PROVACOES as P } from '@/assets/provacoesLivroUi';
import { FICHA_UI } from '@/assets/personagemUi';
import { categoriasDoBestiario, paginasDoBestiario, primeiraPaginaDaCategoria } from '@/lib/bestiarioTela';
import type { MonstroTela } from '@/lib/cacadaTela';
import { NIVEL_MAXIMO_DO_BESTIARIO, XP_PARA_NIVEL_DO_BESTIARIO, nivelDoBestiario, xpDoBestiario } from '@/rules/bestiario';
import { ICONES_DAS_TRILHAS_DE_MONSTRO } from '@/assets/maestriasUi';
import { textoDaFicha } from '@/rules/textosDaFicha';
import { TEXTOS_DA_CACADA as TC } from '@/rules/textosDaCacada';
import { TEXTOS_DO_BESTIARIO as T } from '@/rules/textosDoBestiario';
import { BotaoDePagina } from '../provacoes/LivroAnimado';
import { DetalhesDoMonstro, Retrato, type InfoDoIcone } from '../cacada/DetalhesDoMonstro';
import { BotaoPixel, JanelaDaCacada, TINTA } from '../cacada/JanelaDaCacada';
import { QuadrosDaVirada, useViradaDoLivro } from '../cacada/useViradaDoLivro';

type Personagem = Pick<CharacterDocument, 'nome' | 'nivel' | 'bestiario' | 'monstrosDerrotados'>;

export interface BestiarioScreenProps {
  personagem: Personagem;
}

/** Onde o jogador está no livro: a página (da esquerda) e a criatura aberta na da direita. */
export interface LugarNoBestiario {
  pagina: number;
  monstroId: string;
}

const pixel: React.CSSProperties = { imageRendering: 'pixelated' };
/** Pinta o glifo branco da classificação com a cor do fundo (máscara). */
function mascara(src?: string): React.CSSProperties {
  if (!src) return {};
  return { WebkitMaskImage: `url(${src})`, maskImage: `url(${src})`, WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center', WebkitMaskSize: 'contain', maskSize: 'contain', imageRendering: 'pixelated' };
}

const SOMBRA_CLARA = '0.3cqw 0.3cqw 0 #1A0805';

/** Os quatro quadradinhos do nível do Bestiário de uma criatura. */
function Marcas({ nivel }: { nivel: number }) {
  return (
    <span role="img" aria-label={textoDaFicha(T.nivelDoBestiarioAria, { n: nivel, max: NIVEL_MAXIMO_DO_BESTIARIO })} className="flex gap-[0.4cqw]">
      {Array.from({ length: NIVEL_MAXIMO_DO_BESTIARIO }, (_, i) => (
        <span key={i} aria-hidden="true" className="inline-block w-[1.3cqw] h-[1.3cqw] border-[0.25cqw] border-[#2A0F0A]" style={{ background: i < nivel ? '#B3261E' : 'rgba(42,15,10,0.18)' }} />
      ))}
    </span>
  );
}

/** O tamanho do nome (cqw) pela maior palavra, para ela caber na coluna estreita sem estourar. */
export function tamanhoDoNome(nome: string): number {
  const maior = Math.max(...nome.split(/\s+/).map((p) => p.length));
  return maior >= 10 ? 1.55 : maior >= 8 ? 1.7 : 1.8;
}

function CriaturaNaLista({ monstro, nivel, escolhida, aoEscolher }: { monstro: MonstroTela; nivel: number; escolhida: boolean; aoEscolher: () => void }) {
  return (
    <button
      type="button"
      onClick={aoEscolher}
      aria-pressed={escolhida}
      aria-label={textoDaFicha(TC.escolher, { nome: monstro.nome })}
      className="flex flex-col items-center gap-[0.3cqw] px-[0.4cqw] py-[0.2cqw] text-center cursor-pointer border-[0.4cqw] active:translate-y-px focus-visible:outline focus-visible:outline-[0.6cqw] focus-visible:outline-[#6FE3EE]"
      style={{ borderColor: escolhida ? '#8E2A1B' : 'transparent', background: escolhida ? 'rgba(142,42,27,0.16)' : 'transparent', color: TINTA }}
    >
      <span className="relative">
        <Retrato monstro={monstro} tamanho="5.6cqw" />
        {monstro.chave && <Crown aria-label={TC.monstroChave} className="absolute -top-[1cqw] -right-[1.2cqw]" style={{ width: '2.6cqw', height: '2.6cqw', color: '#B8832E', filter: 'drop-shadow(0 0 0.2cqw #2A0F0A)' }} />}
      </span>
      <span className="font-cinzel font-black leading-[1.1] line-clamp-2 [overflow-wrap:anywhere]" style={{ fontSize: `${tamanhoDoNome(monstro.nome.split(',')[0])}cqw` }}>{monstro.nome.split(',')[0]}</span>
      <Marcas nivel={nivel} />
    </button>
  );
}

/**
 * O Bestiário (o livro vermelho do Yuri): todas as criaturas do jogo, por categoria de monstro. A página da esquerda lista
 * as criaturas da classificação (6 por página) e a da direita abre a ficha da escolhida. Cada vitória rende 1 XP de bestiário
 * àquela criatura (nível 0 a 4) e cada nível revela mais da ficha: nível 1, metade dos drops; 2, o restante; 3, as
 * resistências; 4, as fraquezas. O que ainda não foi revelado aparece como "?". As setas viram a página (e passam de uma
 * categoria para a seguinte); a faixa de baixo pula direto para uma categoria.
 */
export function BestiarioScreen({ personagem }: BestiarioScreenProps) {
  const paginas = React.useMemo(() => paginasDoBestiario(), []);
  const categorias = React.useMemo(() => categoriasDoBestiario(), []);
  const [lugar, setLugar] = useState<LugarNoBestiario>(() => ({ pagina: 0, monstroId: paginas[0].monstros[0].id }));
  const [info, setInfo] = useState<InfoDoIcone | null>(null);
  const inicioDoGesto = useRef<number | null>(null);
  const faixa = useRef<HTMLDivElement>(null);
  const { virando, quadro, ir } = useViradaDoLivro<LugarNoBestiario>(setLugar);

  const pagina = paginas[lugar.pagina];
  const monstro = pagina.monstros.find((m) => m.id === lugar.monstroId) ?? pagina.monstros[0];
  const nivelDe = (id: string) => nivelDoBestiario(xpDoBestiario(personagem, id));
  const nivel = nivelDe(monstro.id);
  const xp = xpDoBestiario(personagem, monstro.id);
  const proximo = XP_PARA_NIVEL_DO_BESTIARIO[nivel];

  const irParaPagina = useCallback(
    (passo: 1 | -1) => {
      const destino = paginas[lugar.pagina + passo];
      if (destino) ir({ pagina: lugar.pagina + passo, monstroId: destino.monstros[0].id }, passo);
    },
    [paginas, lugar.pagina, ir]
  );
  const irParaCategoria = (nome: string) => {
    const alvo = primeiraPaginaDaCategoria(paginas, nome);
    if (alvo === lugar.pagina || paginas[alvo].categoria === pagina.categoria) return;
    ir({ pagina: alvo, monstroId: paginas[alvo].monstros[0].id }, alvo > lugar.pagina ? 1 : -1);
  };

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (info) return;
      if (e.key === 'ArrowRight') irParaPagina(1);
      else if (e.key === 'ArrowLeft') irParaPagina(-1);
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [irParaPagina, info]);

  // a categoria atual fica à vista na faixa de baixo
  useEffect(() => {
    const botao = faixa.current?.querySelector<HTMLElement>('[aria-current="true"]');
    if (botao && faixa.current) faixa.current.scrollTo?.({ left: botao.offsetLeft - faixa.current.clientWidth / 2 + botao.clientWidth / 2, behavior: 'smooth' });
  }, [pagina.categoria]);

  const abaEsquerda = L.abas.baixo;
  return (
    <main className="relative h-[100dvh] max-h-[100dvh] w-full overflow-hidden select-none bg-[#1A0F0A] text-[#F5F3E0]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={L.mesa} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />

      <div className="forja-palco !justify-start gap-[1.6cqw] pt-[max(1.4cqw,env(safe-area-inset-top))] pb-[max(1.6cqw,env(safe-area-inset-bottom))]">
        <header className="flex items-center gap-[2cqw] px-[2.4cqw] shrink-0">
          <Link href="/menu" aria-label={T.voltar} className="relative block w-[8cqw] shrink-0 cursor-pointer active:translate-y-px">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={FICHA_UI.voltar} alt="" aria-hidden="true" draggable={false} className="block w-full h-auto pointer-events-none" style={pixel} />
          </Link>
          <div className="relative w-[50cqw] shrink-0" style={{ aspectRatio: '132 / 30' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={P.pergaminho} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" style={pixel} />
            <h1 className="absolute inset-0 flex items-center justify-center pt-[0.6cqw] font-cinzel font-black uppercase tracking-widest text-[4cqw] leading-none" style={{ color: TINTA }}>{T.titulo}</h1>
          </div>
          <div className="relative ml-auto w-[27cqw] shrink-0" style={{ aspectRatio: '64 / 22' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={P.etiqueta} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" style={pixel} />
            <span className="absolute inset-y-0 left-[12%] right-[12%] flex items-center justify-center pt-[0.4cqw] font-cinzel font-extrabold text-[2cqw] leading-none whitespace-nowrap" style={{ color: TINTA }}>
              <span className="truncate">{textoDaFicha(TC.jogador, { nome: personagem.nome, nivel: personagem.nivel })}</span>
            </span>
          </div>
        </header>

        <div className="flex-1 min-h-0 flex items-center px-[2cqw] overflow-y-auto">
          <section
            aria-label={T.livro}
            className="relative w-full select-none pb-[4cqw]"
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={L.livro} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" style={pixel} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={abaEsquerda.src} alt="" aria-hidden="true" draggable={false} className="absolute pointer-events-none" style={{ ...caixaEmPorcento(abaEsquerda.caixa), ...pixel }} />

              {/* as duas abas de cima: a categoria e o nível da criatura no Bestiário */}
              <span className="absolute flex items-center justify-center font-cinzel font-black uppercase text-[2.1cqw] leading-none whitespace-nowrap overflow-hidden text-ellipsis pointer-events-none px-[1cqw]" style={{ ...caixaEmPorcento({ x: abaEsquerda.caixa.x + 30, y: 22, largura: abaEsquerda.caixa.largura - 60, altura: 92 }), color: '#FFE9B0', textShadow: SOMBRA_CLARA }}>
                {pagina.categoria}
              </span>
              <span className="absolute flex items-center justify-center font-cinzel font-black uppercase tracking-wider text-[2.3cqw] leading-none whitespace-nowrap pointer-events-none" style={{ ...caixaEmPorcento({ x: L.abas.alto.caixa.x + 30, y: 30, largura: L.abas.alto.caixa.largura - 60, altura: 84 }), color: '#E9DCC8', textShadow: SOMBRA_CLARA }}>
                {textoDaFicha(T.abaDoNivel, { n: nivel, max: NIVEL_MAXIMO_DO_BESTIARIO })}
              </span>

              <div className="absolute inset-0 pointer-events-none" style={{ opacity: virando ? 0 : 1, transition: 'opacity 120ms ease-out' }} aria-hidden={virando || undefined}>
                <div className="absolute grid grid-cols-2 grid-rows-3 place-items-center pointer-events-auto" style={caixaEmPorcento(L.paginas.esquerda)} data-pagina="esquerda">
                  {pagina.monstros.map((m) => (
                    <CriaturaNaLista key={m.id} monstro={m} nivel={nivelDe(m.id)} escolhida={m.id === monstro.id} aoEscolher={() => setLugar({ ...lugar, monstroId: m.id })} />
                  ))}
                </div>
                <div className="absolute pointer-events-auto" style={caixaEmPorcento(L.paginas.direita)} data-pagina="direita">
                  <DetalhesDoMonstro
                    monstro={monstro}
                    nivelBestiario={nivel}
                    aoInfo={setInfo}
                  />
                </div>
              </div>

              <QuadrosDaVirada virando={virando} quadro={quadro} />
            </div>

            <nav aria-label={T.livro} className="flex items-center justify-center gap-[4cqw] mt-[2.4cqw]">
              <BotaoDePagina lado="esq" ativo={lugar.pagina > 0 && !virando} rotulo={TC.paginaAnterior} aoClicar={() => irParaPagina(-1)} />
              <div className="relative w-[22cqw] shrink-0" style={{ aspectRatio: '64 / 22' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={P.etiqueta} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" style={pixel} />
                <span role="status" aria-label={textoDaFicha(TC.paginaDe, { n: lugar.pagina + 1, total: paginas.length })} className="absolute inset-0 flex items-center justify-center pt-[0.4cqw] font-cinzel font-extrabold text-[2.8cqw] leading-none" style={{ color: TINTA }}>
                  {textoDaFicha(TC.paginaCurta, { n: lugar.pagina + 1, total: paginas.length })}
                </span>
              </div>
              <BotaoDePagina lado="dir" ativo={lugar.pagina < paginas.length - 1 && !virando} rotulo={TC.paginaSeguinte} aoClicar={() => irParaPagina(1)} />
            </nav>

            <p role="status" className="mt-[2.4cqw] text-center font-cinzel font-bold text-[2.8cqw] leading-tight text-[#F5E3B3]" style={{ textShadow: SOMBRA_CLARA }}>
              {proximo === undefined ? textoDaFicha(T.completo, { nome: monstro.nome }) : xp === 0 ? textoDaFicha(T.semDerrotas, { nome: monstro.nome }) : textoDaFicha(T.progresso, { nome: monstro.nome, atual: xp, proximo })}
            </p>

            {/* a faixa de categorias: toque para pular direto para uma */}
            <div ref={faixa} role="group" aria-label={T.categorias} className="mt-[3cqw] flex gap-[2cqw] overflow-x-auto pb-[1.4cqw]" style={{ scrollbarWidth: 'none' }}>
              {categorias.map((c) => {
                const atual = c.nome === pagina.categoria;
                return (
                  <BotaoPixel key={c.nome} compacto destaque={atual} aoClicar={() => irParaCategoria(c.nome)} rotulo={textoDaFicha(T.irParaCategoria, { nome: c.nome })} className="shrink-0 whitespace-nowrap">
                    <span aria-current={atual ? 'true' : undefined} className="inline-flex items-center gap-[1cqw]">
                      <span
                        aria-hidden="true"
                        className="inline-block shrink-0"
                        style={{ width: '3.4cqw', height: '3.4cqw', backgroundColor: atual ? '#FFE9B0' : '#E6C775', ...mascara(ICONES_DAS_TRILHAS_DE_MONSTRO[`monstro:${c.id}`]) }}
                      />
                      {c.nome}
                    </span>
                  </BotaoPixel>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {info && (
        <JanelaDaCacada titulo={info.titulo} aoFechar={() => setInfo(null)}>
          <p className="text-center font-cinzel font-bold text-[3.2cqw] leading-snug">{info.texto}</p>
        </JanelaDaCacada>
      )}
    </main>
  );
}
