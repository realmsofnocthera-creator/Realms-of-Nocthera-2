'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LIVRO_DAS_PROVACOES as L, PAGINAS_DO_LIVRO } from '@/assets/provacoesLivroUi';
import { textoDaFicha } from '@/rules/textosDaFicha';
import { TEXTOS_DAS_PROVACOES as T } from '@/rules/textosDasProvacoes';

/** Uma abertura do livro: o que vai na página da esquerda e na da direita. */
export interface AberturaDoLivro {
  esquerda: React.ReactNode;
  direita: React.ReactNode;
}

const pixel: React.CSSProperties = { imageRendering: 'pixelated' };

/** A ordem em que os quadros da virada tocam: para frente, do primeiro ao último; para trás, ao contrário. */
export function sequenciaDeQuadros(direcao: 1 | -1, total: number = L.quadros): number[] {
  const ordem = Array.from({ length: total }, (_, i) => i);
  return direcao === 1 ? ordem : ordem.reverse();
}

/** Onde o quadro `i` fica na folha de quadros (em % do tamanho da folha, para o `background-position`). */
export function posicaoDoQuadro(i: number, colunas: number = L.colunas, linhas: number = L.linhas): { x: number; y: number } {
  const coluna = i % colunas;
  const linha = Math.floor(i / colunas);
  return { x: colunas > 1 ? (coluna / (colunas - 1)) * 100 : 0, y: linhas > 1 ? (linha / (linhas - 1)) * 100 : 0 };
}

/** A caixa de uma página, em % do quadro do livro (480 x 312). */
function caixaDaPagina(p: { x: number; y: number; largura: number; altura: number }): React.CSSProperties {
  return { left: `${(p.x / L.largura) * 100}%`, top: `${(p.y / L.altura) * 100}%`, width: `${(p.largura / L.largura) * 100}%`, height: `${(p.altura / L.altura) * 100}%` };
}

export function BotaoDePagina({ lado, ativo, rotulo, aoClicar }: { lado: 'esq' | 'dir'; ativo: boolean; rotulo: string; aoClicar: () => void }) {
  const src = lado === 'esq' ? (ativo ? L.setas.esq : L.setas.esqApagada) : ativo ? L.setas.dir : L.setas.dirApagada;
  return (
    <button
      type="button"
      onClick={aoClicar}
      disabled={!ativo}
      aria-label={rotulo}
      className={`relative block w-[13cqw] shrink-0 before:absolute before:-inset-[1.6cqw] before:content-[''] ${ativo ? 'cursor-pointer active:translate-y-px' : 'cursor-not-allowed'}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" aria-hidden="true" draggable={false} className="block w-full h-auto pointer-events-none" style={pixel} />
    </button>
  );
}

/**
 * O livro aberto em pixel (arte do Yuri), sem fundo: duas páginas, cada abertura com o seu conteúdo. Os botões (e as setas
 * do teclado, e o gesto de arrastar) viram a página com a animação de 8 quadros: para frente a página da direita passa para
 * a esquerda; para trás, os mesmos quadros ao contrário. O conteúdo some enquanto a página vira e volta no fim. Com
 * "reduzir movimento" ligado, a página troca na hora, sem a animação.
 */
export function LivroAnimado({ aberturas, rotulo, className = '' }: { aberturas: readonly AberturaDoLivro[]; rotulo: string; className?: string }) {
  const [indice, setIndice] = useState(0);
  const [virando, setVirando] = useState<1 | -1 | null>(null);
  const [quadro, setQuadro] = useState(0);
  const inicioDoGesto = useRef<number | null>(null);
  const total = aberturas.length;

  // a folha de quadros já fica baixada antes da primeira virada
  useEffect(() => {
    const img = new Image();
    img.src = L.virada;
  }, []);

  const virar = useCallback(
    (direcao: 1 | -1) => {
      if (virando) return;
      const destino = indice + direcao;
      if (destino < 0 || destino >= total) return;
      const reduzir = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduzir) setIndice(destino);
      else setVirando(direcao);
    },
    [virando, indice, total]
  );

  // toca os quadros da virada e, no fim, troca a abertura
  useEffect(() => {
    if (!virando) return;
    const sequencia = sequenciaDeQuadros(virando);
    let passo = 0;
    setQuadro(sequencia[0]);
    const id = setInterval(() => {
      passo += 1;
      if (passo >= sequencia.length) {
        clearInterval(id);
        setIndice((v) => v + virando);
        setVirando(null);
        return;
      }
      setQuadro(sequencia[passo]);
    }, L.msPorQuadro);
    return () => clearInterval(id);
  }, [virando]);

  // setas do teclado
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') virar(1);
      else if (e.key === 'ArrowLeft') virar(-1);
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [virar]);

  const pos = posicaoDoQuadro(quadro);
  const temAnterior = indice > 0;
  const temSeguinte = indice < total - 1;

  return (
    <section
      aria-label={rotulo}
      className={`w-full select-none ${className}`}
      style={{ containerType: 'inline-size', touchAction: 'pan-y' }}
      onPointerDown={(e) => {
        inicioDoGesto.current = e.clientX;
      }}
      onPointerUp={(e) => {
        const inicio = inicioDoGesto.current;
        inicioDoGesto.current = null;
        if (inicio === null) return;
        const dx = e.clientX - inicio;
        if (Math.abs(dx) > 48) virar(dx < 0 ? 1 : -1);
      }}
    >
      <div className="relative w-full" style={{ aspectRatio: `${L.largura} / ${L.altura}` }}>
        {/* o livro parado */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={L.livro} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" style={pixel} />

        {/* o conteúdo das páginas (todas as aberturas ficam no documento; só a atual aparece) */}
        {aberturas.map((a, i) => (
          <div
            key={i}
            hidden={i !== indice}
            aria-hidden={virando ? true : undefined}
            className="absolute inset-0"
            style={{ opacity: virando ? 0 : 1, transition: 'opacity 140ms ease-out' }}
          >
            <div className="absolute" style={caixaDaPagina(PAGINAS_DO_LIVRO.esquerda)}>{a.esquerda}</div>
            <div className="absolute" style={caixaDaPagina(PAGINAS_DO_LIVRO.direita)}>{a.direita}</div>
          </div>
        ))}

        {/* a página virando (por cima de tudo, só durante a virada) */}
        {virando && (
          <div
            aria-hidden="true"
            data-quadro={quadro}
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `url(${L.virada})`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: `${L.colunas * 100}% ${L.linhas * 100}%`,
              backgroundPosition: `${pos.x}% ${pos.y}%`,
              ...pixel,
            }}
          />
        )}
      </div>

      {/* os botões de página, no mesmo estilo do livro */}
      <nav aria-label={rotulo} className="flex items-center justify-center gap-[4cqw] mt-[2.4cqw]">
        <BotaoDePagina lado="esq" ativo={temAnterior && !virando} rotulo={T.paginaAnterior} aoClicar={() => virar(-1)} />
        <div className="relative w-[22cqw] shrink-0" style={{ aspectRatio: '64 / 22' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={L.etiqueta} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" style={pixel} />
          <span
            role="status"
            aria-label={textoDaFicha(T.paginaDe, { n: indice + 1, total })}
            className="absolute inset-0 flex items-center justify-center pt-[0.4cqw] font-cinzel font-extrabold text-[2.8cqw] leading-none text-[#582914]"
          >
            {textoDaFicha(T.paginaCurta, { n: indice + 1, total })}
          </span>
        </div>
        <BotaoDePagina lado="dir" ativo={temSeguinte && !virando} rotulo={T.paginaSeguinte} aoClicar={() => virar(1)} />
      </nav>
    </section>
  );
}
