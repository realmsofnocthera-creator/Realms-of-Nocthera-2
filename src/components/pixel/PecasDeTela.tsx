'use client';

import React from 'react';
import Link from 'next/link';
import { ARENA_UI, POSICAO } from '@/assets/arenaUi';
import { Peca, Texto, pixel, u, SOMBRA_DO_TEXTO } from '@/components/pixel/GradePixel';

export const CREME = '#F5E3B3';
export const DOURADO = '#F3C769';
export const SUB = '#C8A25A';
export const TINTA = '#2A1A0E';
export const VERDE = '#B8F0B0';
export const VERMELHO = '#FF9A8F';

/** O cabeçalho das telas: a placa do título (com o subtítulo), o voltar (link ou ação) e, se houver, o livro de regras. */
export function Cabecalho({ titulo, voltar, aoAbrirLivro, rotuloVoltar = 'Voltar', rotuloLivro = 'Como funciona' }: {
  titulo: string; voltar: string | (() => void); aoAbrirLivro?: () => void; rotuloVoltar?: string; rotuloLivro?: string;
}) {
  const estiloVoltar = { left: u(POSICAO.voltar.x), top: u(POSICAO.voltar.y), width: u(POSICAO.voltar.l), height: u(POSICAO.voltar.a), backgroundImage: `url(${ARENA_UI.voltar})`, backgroundSize: '100% 100%', ...pixel };
  return (
    <>
      <Peca src={ARENA_UI.titulo} p={POSICAO.titulo}>
        <Texto x={100} y={48} tamanho={titulo.length > 9 ? 9 : 11} caixaAlta largura={150} cor={TINTA}>{titulo}</Texto>
      </Peca>
      {typeof voltar === 'string'
        ? <Link href={voltar} aria-label={rotuloVoltar} className="absolute active:translate-y-px z-10" style={estiloVoltar} />
        : <button type="button" onClick={voltar} aria-label={rotuloVoltar} className="absolute cursor-pointer active:translate-y-px z-10" style={estiloVoltar} />}
      {aoAbrirLivro && (
        <button type="button" onClick={aoAbrirLivro} aria-label={rotuloLivro} className="absolute cursor-pointer active:translate-y-px z-10" style={{ left: u(POSICAO.livro.x), top: u(POSICAO.livro.y), width: u(POSICAO.livro.l), height: u(POSICAO.livro.a), backgroundImage: `url(${ARENA_UI.livro})`, backgroundSize: '100% 100%', ...pixel }} />
      )}
    </>
  );
}

/** O aviso do alto (o que deu certo, ou o erro). */
export function AvisoDaTela({ aviso, y = 74 }: { aviso: { texto: string; erro: boolean } | null; y?: number }) {
  if (!aviso) return null;
  return (
    <p role={aviso.erro ? 'alert' : 'status'} className="absolute font-cinzel font-bold text-center z-30" style={{ left: u(24), width: u(312), top: u(y), fontSize: u(7.4), color: aviso.erro ? VERMELHO : VERDE, textShadow: SOMBRA_DO_TEXTO, backgroundColor: 'rgba(8,6,12,.88)', border: `${u(0.8)} solid ${aviso.erro ? '#8a4a40' : '#5a8a50'}`, padding: `${u(3)} ${u(5)}` }}>{aviso.texto}</p>
  );
}

/** Um texto centralizado no meio da tela (carregando, vazio, erro). */
export function Recado({ children, y = 250, erro }: { children: React.ReactNode; y?: number; erro?: boolean }) {
  return (
    <p role={erro ? 'alert' : undefined} className="absolute font-cinzel font-bold text-center" style={{ left: u(30), width: u(300), top: u(y), fontSize: u(8.6), lineHeight: 1.35, color: erro ? VERMELHO : CREME, textShadow: SOMBRA_DO_TEXTO }}>{children}</p>
  );
}

/**
 * Uma faixa da arte em fluxo (para listas que rolam): a peça estica na horizontal sem deformar as pontas (`esq` e `dir`, em pixels da arte), com
 * a altura `a` da grade. Os filhos usam coordenadas da própria faixa.
 */
export function FaixaDeArte({ src, a, esq, dir, children, className = '', style, onClick, rotulo, pressionada }: {
  src: string; a: number; esq: number; dir: number; children?: React.ReactNode; className?: string; style?: React.CSSProperties; onClick?: () => void; rotulo?: string; pressionada?: boolean;
}) {
  const fundo = (
    <span aria-hidden className="absolute inset-0 pointer-events-none" style={{ borderStyle: 'solid', borderWidth: `0 ${u(dir)} 0 ${u(esq)}`, borderImage: `url(${src}) 0 ${dir} 0 ${esq} fill stretch`, ...pixel }} />
  );
  const base: React.CSSProperties = { position: 'relative', height: u(a), flexShrink: 0, ...style };
  return onClick ? (
    <button type="button" onClick={onClick} aria-label={rotulo} aria-pressed={pressionada} className={`block w-full text-left cursor-pointer active:translate-y-px ${className}`} style={base}>{fundo}{children}</button>
  ) : (
    <div className={className} style={base}>{fundo}{children}</div>
  );
}

/** Um texto dentro de uma peça em fluxo (coordenadas da peça, em unidades da grade; `x` é a esquerda). */
export function Rotulo({ x, y, tamanho, children, cor = CREME, largura = 200, negrito = true, caixaAlta = false, alinhar = 'left' }: {
  x: number; y: number; tamanho: number; children: React.ReactNode; cor?: string; largura?: number; negrito?: boolean; caixaAlta?: boolean; alinhar?: 'left' | 'right' | 'center';
}) {
  return (
    <span className="absolute font-cinzel leading-none whitespace-nowrap overflow-hidden text-ellipsis" style={{ left: alinhar === 'right' ? undefined : u(alinhar === 'center' ? x - largura / 2 : x), right: alinhar === 'right' ? u(x) : undefined, top: u(y - tamanho * 0.6), width: u(largura), fontSize: u(tamanho), color: cor, textShadow: SOMBRA_DO_TEXTO, fontWeight: negrito ? 800 : 500, textTransform: caixaAlta ? 'uppercase' : undefined, textAlign: alinhar }}>{children}</span>
  );
}

/** Uma imagem pequena posicionada dentro de uma peça em fluxo. */
export function Icone({ src, x, y, l, a, alt = '', style }: { src: string; x: number; y: number; l: number; a: number; alt?: string; style?: React.CSSProperties }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} aria-hidden={alt ? undefined : true} draggable={false} className="absolute pointer-events-none" style={{ left: u(x), top: u(y), width: u(l), height: u(a), objectFit: 'contain', ...pixel, ...style }} />;
}

/** O pergaminho da Torre como painel (uma carta aberta, um anúncio): título, o texto que rola e os botões embaixo, sobre a tela escurecida. */
export function PergaminhoAberto({ src, titulo, aoFechar, rotuloFechar, children, rodape }: { src: string; titulo: string; aoFechar: () => void; rotuloFechar: string; children: React.ReactNode; rodape?: React.ReactNode }) {
  return (
    <div role="dialog" aria-label={titulo} className="absolute inset-0 z-40" style={{ backgroundColor: 'rgba(5,4,10,.72)' }}>
      <div className="absolute" style={{ left: u(22), top: u(40), width: u(316), height: u(431), backgroundImage: `url(${src})`, backgroundSize: '100% 100%', ...pixel }}>
        <h2 className="absolute font-cinzel font-black text-center" style={{ left: u(30), right: u(30), top: u(34), fontSize: u(10.5), lineHeight: 1.15, color: TINTA }}>{titulo}</h2>
        <div className="absolute overflow-y-auto font-cinzel" style={{ left: u(34), right: u(34), top: u(64), bottom: u(40), fontSize: u(7.6), lineHeight: 1.45, color: '#3a2614' }}>{children}</div>
        <button type="button" onClick={aoFechar} aria-label={rotuloFechar} className="absolute cursor-pointer font-cinzel font-black" style={{ right: u(18), top: u(14), width: u(22), height: u(22), fontSize: u(13), color: '#5a2a14', lineHeight: 1 }}>×</button>
      </div>
      {rodape && <div className="absolute flex justify-center" style={{ left: 0, right: 0, top: u(478), gap: u(8) }}>{rodape}</div>}
    </div>
  );
}

/** O botão largo de arte (em fluxo, para o rodapé do pergaminho e das janelas). */
export function BotaoLargo({ children, onClick, desligado, largura = 150, perigo }: { children: React.ReactNode; onClick: () => void; desligado?: boolean; largura?: number; perigo?: boolean }) {
  const [pressionado, setPressionado] = React.useState(false);
  const arte = desligado ? ARENA_UI.botaoOff : pressionado ? ARENA_UI.botaoPress : ARENA_UI.botao;
  return (
    <button type="button" onClick={onClick} disabled={desligado}
      onPointerDown={() => setPressionado(true)} onPointerUp={() => setPressionado(false)} onPointerLeave={() => setPressionado(false)} onPointerCancel={() => setPressionado(false)}
      className="relative cursor-pointer disabled:cursor-not-allowed shrink-0" style={{ width: u(largura), height: u(28), backgroundImage: `url(${arte})`, backgroundSize: '100% 100%', ...pixel }}>
      <span className="absolute inset-0 flex items-center justify-center font-cinzel font-black uppercase" style={{ fontSize: u(8), color: desligado ? '#A99C80' : perigo ? '#7a1d12' : TINTA, paddingTop: u(pressionado ? 1.5 : 0) }}>{children}</span>
    </button>
  );
}

/** As abas de arte (a placa do cabeçalho da chave do Campeonato: acesa ou apagada), em fluxo, lado a lado. */
export function Abas<T extends string>({ abas, ativa, aoMudar, y, rotulo }: { abas: readonly { id: T; nome: string; ponto?: boolean }[]; ativa: T; aoMudar: (a: T) => void; y: number; rotulo: string }) {
  const largura = Math.min(84, Math.floor(344 / abas.length));
  const altura = (largura / 84) * 41;
  const x0 = (360 - largura * abas.length - 4 * (abas.length - 1)) / 2;
  return (
    <div role="tablist" aria-label={rotulo}>
      {abas.map((a, i) => {
        const on = a.id === ativa;
        return (
          <button key={a.id} type="button" role="tab" aria-selected={on} onClick={() => aoMudar(a.id)} className="absolute cursor-pointer" style={{ left: u(x0 + i * (largura + 4)), top: u(y), width: u(largura), height: u(altura), backgroundImage: `url(${ARENA_UI.cabecalho(on)})`, backgroundSize: '100% 100%', ...pixel }}>
            <span className="absolute inset-0 flex items-center justify-center font-cinzel font-black uppercase" style={{ paddingTop: u(5), fontSize: u(a.nome.length > 9 ? 5.6 : 6.6), color: on ? DOURADO : CREME, textShadow: SOMBRA_DO_TEXTO }}>{a.nome}{a.ponto ? ' •' : ''}</span>
          </button>
        );
      })}
    </div>
  );
}

/** A área que rola, entre o cabeçalho e o rodapé (as listas). */
export function AreaQueRola({ topo, base, children, rotulo }: { topo: number; base: number; children: React.ReactNode; rotulo?: string }) {
  return (
    <div aria-label={rotulo} className="absolute overflow-y-auto overflow-x-hidden" style={{ left: u(10), width: u(340), top: u(topo), height: u(base - topo), display: 'flex', flexDirection: 'column', gap: u(4), overscrollBehavior: 'contain', scrollbarWidth: 'none' }}>{children}</div>
  );
}

export { Peca, Texto, pixel, u, SOMBRA_DO_TEXTO };

/** Um botão pequeno de arte, dentro de uma faixa (à direita: `direita` é a distância da borda direita). */
export function BotaoPequeno({ children, onClick, desligado, direita, y, largura = 64, altura = 18, perigo, rotulo }: {
  children: React.ReactNode; onClick: () => void; desligado?: boolean; direita: number; y: number; largura?: number; altura?: number; perigo?: boolean; rotulo?: string;
}) {
  const arte = desligado ? ARENA_UI.botaoOff : ARENA_UI.botao;
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onClick(); }} disabled={desligado} aria-label={rotulo} className="absolute cursor-pointer disabled:cursor-not-allowed active:translate-y-px" style={{ right: u(direita), top: u(y), width: u(largura), height: u(altura), backgroundImage: `url(${arte})`, backgroundSize: '100% 100%', ...pixel }}>
      <span className="absolute inset-0 flex items-center justify-center font-cinzel font-black uppercase" style={{ fontSize: u(5.6), color: desligado ? '#A99C80' : perigo ? '#7a1d12' : TINTA }}>{children}</span>
    </button>
  );
}

/** O estilo dos campos (busca, listas de escolha e números) sobre a arte: fundo escuro e borda dourada. */
export const CAMPO: React.CSSProperties = { backgroundColor: 'rgba(20,14,10,.94)', border: `${u(0.8)} solid #8a6d2a`, color: CREME, fontSize: u(7.4), padding: `${u(2.5)} ${u(4)}`, borderRadius: 0, minWidth: 0 };
