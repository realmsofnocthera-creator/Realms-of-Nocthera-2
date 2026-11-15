'use client';

import React from 'react';
import Link from 'next/link';
import { CharacterDocument } from '@/server/characterService';
import { PROVACOES, ProvacaoDefinition, ProvacaoId } from '@/rules/provacoes';
import { CARTAS_DAS_PROVACOES, LIVRO_DAS_PROVACOES } from '@/assets/provacoesLivroUi';
import { FICHA_UI } from '@/assets/personagemUi';
import { KIT_DA_FORJA } from '@/assets/forjaUi';
import { textoDaFicha } from '@/rules/textosDaFicha';
import { TEXTOS_DAS_PROVACOES as T } from '@/rules/textosDasProvacoes';
import { AberturaDoLivro, LivroAnimado } from './LivroAnimado';

export interface ProvacoesScreenProps {
  personagem: CharacterDocument;
}

const pixel: React.CSSProperties = { imageRendering: 'pixelated' };
const TINTA = '#582914';

/** A tela de cada provação (todas já têm a sua). */
const DESTINOS: Readonly<Record<ProvacaoId, string>> = {
  cacada: '/cacada',
  'batalha-sangrenta': '/batalha-sangrenta',
  'torre-celestial': '/torre-celestial',
  guerreiro: '/guerreiro',
  'teste-equipe': '/teste-equipe',
  expedicao: '/expedicao',
  'chefe-mundial': '/chefe-mundial',
};

/** Quantas provações cabem em cada página do livro. */
export const PROVACOES_POR_PAGINA = 2;

/** As provações em ordem de nível (do menor para o maior; no empate, a ordem em que foram definidas). */
export function provacoesPorNivel(): ProvacaoDefinition[] {
  return PROVACOES.map((p, i) => ({ p, i })).sort((a, b) => a.p.nivelRequerido - b.p.nivelRequerido || a.i - b.i).map(({ p }) => p);
}

/**
 * Reparte as provações (já em ordem de nível) nas aberturas do livro: cada página leva 2 provações, então cada abertura
 * (esquerda e direita) leva até 4. Devolve, para cada abertura, as provações da página da esquerda e da direita.
 */
export function aberturasDoLivro(lista: readonly ProvacaoDefinition[]): { esquerda: ProvacaoDefinition[]; direita: ProvacaoDefinition[] }[] {
  const porAbertura = PROVACOES_POR_PAGINA * 2;
  const resultado: { esquerda: ProvacaoDefinition[]; direita: ProvacaoDefinition[] }[] = [];
  for (let i = 0; i < lista.length; i += porAbertura) {
    const grupo = lista.slice(i, i + porAbertura);
    resultado.push({ esquerda: grupo.slice(0, PROVACOES_POR_PAGINA), direita: grupo.slice(PROVACOES_POR_PAGINA) });
  }
  return resultado;
}

/** Uma provação colada na página: a carta com fita, o selo do nível e o nome à mão, embaixo. */
function ProvacaoNaPagina({ provacao, nivelDoPersonagem, proxima, inclinacao }: { provacao: ProvacaoDefinition; nivelDoPersonagem: number; proxima: boolean; inclinacao: number }) {
  const aberta = nivelDoPersonagem >= provacao.nivelRequerido;
  const carta = CARTAS_DAS_PROVACOES[provacao.id];
  const vertical = carta.altura > carta.largura; // a arte da Expedição é vertical: corta para caber e refaz a moldura dourada
  const faltam = provacao.nivelRequerido - nivelDoPersonagem;
  const conteudo = (
    <article
      aria-label={textoDaFicha(aberta ? T.abertaAria : T.bloqueadaAria, { nome: provacao.nome, n: provacao.nivelRequerido })}
      className={`relative w-full h-full flex flex-col items-center justify-center ${aberta ? '' : 'cursor-not-allowed'}`}
      style={{ transform: `rotate(${inclinacao}deg)` }}
    >
      <div className="relative w-[78%]" style={{ aspectRatio: '16 / 9' }}>
        {/* a carta, com uma sombra dura de papel colado */}
        <div className="absolute inset-0 overflow-hidden" style={{ outline: '0.35cqw solid #3A1E10', boxShadow: '0.7cqw 0.8cqw 0 rgba(58,30,16,0.35)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={carta.src}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
            style={{ objectPosition: vertical ? '50% 40%' : 'center', filter: aberta ? undefined : 'grayscale(0.75) brightness(0.55)' }}
          />
          {vertical && <span aria-hidden="true" className="absolute inset-0 pointer-events-none border-y-[0.8cqw] border-x-0 border-[#C8962E]" />}
        </div>
        {/* a fita que prende a carta */}
        <span aria-hidden="true" className="absolute -top-[1.3cqw] left-1/2 -translate-x-1/2 w-[9cqw] h-[2.6cqw] border border-[#B89860] bg-[#EBDDB0]/85" style={{ transform: 'translateX(-50%) rotate(-3deg)' }} />
        {/* o selo do nível */}
        <span
          role="img"
          aria-label={textoDaFicha(T.nivelAria, { n: provacao.nivelRequerido })}
          className="absolute -left-[1.8cqw] -top-[1.8cqw] z-10 flex flex-col items-center justify-center w-[6.4cqw] h-[6.4cqw] border-[0.3cqw] border-[#340E23] bg-[#AA1F2C] font-cinzel font-black leading-none text-[#FBECC8]"
          style={{ clipPath: 'polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%)' }}
        >
          <span className="text-[1.5cqw] uppercase">Nv</span>
          <span className="text-[2.7cqw]">{provacao.nivelRequerido}</span>
        </span>
        {/* o cadeado e o nível que falta, quando ainda não abriu */}
        {!aberta && (
          <span className="absolute inset-x-[6%] bottom-[5%] z-10 flex items-center justify-center gap-[0.8cqw] border border-[#E5484D] bg-[#1E0B1B]/90 px-[1cqw] py-[0.3cqw] font-cinzel font-extrabold uppercase text-[1.5cqw] leading-[1.35] text-[#FFB4B4]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={KIT_DA_FORJA.proibido} alt="" aria-hidden="true" draggable={false} className="w-[2.4cqw] h-[2.4cqw] shrink-0" style={pixel} />
            {textoDaFicha(T.abreNoNivel, { n: provacao.nivelRequerido })}
          </span>
        )}
        {!aberta && proxima && (
          <span className="absolute -right-[1.2cqw] -top-[1.6cqw] z-10 border border-[#A65610] bg-[#F2C245] px-[1cqw] py-[0.2cqw] font-cinzel font-extrabold uppercase text-[1.35cqw] leading-[1.35] text-[#340E23]" style={{ transform: 'rotate(3deg)' }}>
            {T.proxima} · {faltam === 1 ? T.falta : textoDaFicha(T.faltam, { n: faltam })}
          </span>
        )}
      </div>
      {/* o nome, escrito à tinta na página */}
      <span className="mt-[1.2cqw] w-[96%] text-center font-cinzel font-extrabold uppercase leading-[1.2] text-[2.05cqw]" style={{ color: aberta ? TINTA : '#8A6A58' }}>
        {provacao.nome}
      </span>
    </article>
  );
  return aberta ? (
    <Link href={DESTINOS[provacao.id]} aria-label={textoDaFicha(T.entrar, { nome: provacao.nome })} className="block w-full h-full cursor-pointer active:translate-y-px">
      {conteudo}
    </Link>
  ) : (
    conteudo
  );
}

/** Uma página: as provações empilhadas (até 2), cada uma com uma pequena inclinação, como colagem. */
function Pagina({ provacoes, nivel, proximaId, lado }: { provacoes: readonly ProvacaoDefinition[]; nivel: number; proximaId?: ProvacaoId; lado: 'esq' | 'dir' }) {
  const inclinacoes = lado === 'esq' ? [-1.1, 0.9] : [0.8, -1];
  return (
    <div className="h-full flex flex-col">
      {Array.from({ length: PROVACOES_POR_PAGINA }, (_, i) => {
        const p = provacoes[i];
        return (
          <div key={p?.id ?? `vazio-${i}`} className="flex-1 min-h-0">
            {p && <ProvacaoNaPagina provacao={p} nivelDoPersonagem={nivel} proxima={p.id === proximaId} inclinacao={inclinacoes[i]} />}
          </div>
        );
      })}
    </div>
  );
}

/**
 * As Provações em forma de livro (arte do Yuri): a mesa de madeira ao fundo e o livro aberto no centro. Cada página leva 2
 * provações, em ordem de nível; os botões de página (e as setas do teclado, e o arrastar) viram a página. Cada provação
 * aberta é um link para a tela dela; as que ainda não abriram ficam apagadas, com o cadeado e o nível que pedem, e a
 * próxima a abrir ganha a fita "Próxima".
 */
export function ProvacoesScreen({ personagem }: ProvacoesScreenProps) {
  const lista = provacoesPorNivel();
  const proximaId = lista.find((p) => personagem.nivel < p.nivelRequerido)?.id;
  const aberturas: AberturaDoLivro[] = aberturasDoLivro(lista).map((a) => ({
    esquerda: <Pagina provacoes={a.esquerda} nivel={personagem.nivel} proximaId={proximaId} lado="esq" />,
    direita: <Pagina provacoes={a.direita} nivel={personagem.nivel} proximaId={proximaId} lado="dir" />,
  }));

  return (
    <main className="relative h-[100dvh] max-h-[100dvh] w-full overflow-hidden select-none bg-[#1A0F0A] text-[#F5F3E0]">
      {/* a mesa de madeira (arte do Yuri), cobrindo a tela inteira */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LIVRO_DAS_PROVACOES.mesa} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />

      <div className="forja-palco !justify-start gap-[1.6cqw] pt-[max(1.4cqw,env(safe-area-inset-top))] pb-[max(1.6cqw,env(safe-area-inset-bottom))]">
        <header className="flex items-center gap-[2cqw] px-[2.4cqw] shrink-0">
          <Link href="/hub" aria-label={T.voltar} className="relative block w-[8cqw] shrink-0 cursor-pointer active:translate-y-px">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={FICHA_UI.voltar} alt="" aria-hidden="true" draggable={false} className="block w-full h-auto pointer-events-none" style={pixel} />
          </Link>
          {/* o título, num pergaminho enrolado */}
          <div className="relative w-[50cqw] shrink-0" style={{ aspectRatio: '132 / 30' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LIVRO_DAS_PROVACOES.pergaminho} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" style={pixel} />
            <h1 className="absolute inset-0 flex items-center justify-center pt-[0.6cqw] font-cinzel font-black uppercase tracking-widest text-[4cqw] leading-none" style={{ color: TINTA }}>{T.titulo}</h1>
          </div>
          {/* o jogador, numa etiqueta de pergaminho */}
          <div className="relative ml-auto w-[27cqw] shrink-0" style={{ aspectRatio: '64 / 22' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LIVRO_DAS_PROVACOES.etiqueta} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" style={pixel} />
            <span className="absolute inset-y-0 left-[12%] right-[12%] flex items-center justify-center pt-[0.4cqw] font-cinzel font-extrabold text-[2cqw] leading-none whitespace-nowrap" style={{ color: TINTA }}>
              <span className="truncate">{textoDaFicha(T.jogador, { nome: personagem.nome, nivel: personagem.nivel })}</span>
            </span>
          </div>
        </header>

        <div className="flex-1 min-h-0 flex items-center px-[2cqw]">
          <LivroAnimado aberturas={aberturas} rotulo={T.livro} className="mb-[8cqw]" />
        </div>
      </div>
    </main>
  );
}
