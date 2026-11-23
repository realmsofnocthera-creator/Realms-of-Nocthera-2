'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Frame, MessageSquare, Palette, Shirt, Sparkles, UserSquare2, Wand2 } from 'lucide-react';
import { ARENA_UI, peca } from '@/assets/arenaUi';
import { EFEITOS, PASTA_DOS_EFEITOS, type NomeDoEfeito } from '@/assets/efeitosPixelfx';
import { getAvatarFaceStyle, resolveAvatarSrc } from '@/assets/avatars';
import { TELAS_UI, GEMA_DA_RARIDADE } from '@/assets/telasSociaisUi';
import { MolduraDoAvatar } from '@/components/perfil/MolduraDoAvatar';
import { ANIMACAO_DO_HEROI } from '@/lib/cacadaArte';
import { ICONES_DE_ABA } from '@/assets/mochilaUi';
import { EXPEDICAO_UI } from '@/assets/expedicaoUi';
import { HUD_ICONS } from '@/assets/hud';
import { formatarReais } from '@/rules/vip';
import { PACOTES_MENSAIS, NOME_DA_CADEIA, CADEIAS_MENSAIS } from '@/rules/compras';
import {
  CONJUNTOS, DADOS_DO_TIPO, DIAMANTES_NA_VITRINE, EXPANSOES_DA_MOCHILA, ITENS_COSMETICOS, NOME_DA_RARIDADE, PACOTE_DO_INICIANTE_NA_VITRINE, PASSE_DO_INICIANTE, PASSES_NA_VITRINE,
  RARIDADES_DA_LOJA, SECOES_DA_LOJA, TEMAS_PROVISORIOS, TIPOS_DE_COSMETICO, TOTAL_DA_EXPANSAO_DA_MOCHILA_CENTAVOS, TOTAL_DE_ESPACOS_DA_EXPANSAO, VAGA_EXTRA_DE_EXPEDICAO,
  type Conjunto, type ItemCosmetico, type RaridadeDaLoja, type SecaoDaLoja, type TipoDeCosmetico,
} from '@/rules/lojaPaga';

/**
 * A Loja Premium (vitrine): o catálogo da loja de compra com dinheiro real, só a parte visual. As compras ainda não estão ligadas (cada botão diz
 * "Em breve"); o que o jogador pode comprar hoje continua na aba VIP da Loja. Os cosméticos usam um quadro de arte provisório até as artes do Yuri.
 */

const COR: Readonly<Record<RaridadeDaLoja, { principal: string; claro: string; escuro: string }>> = {
  comum: { principal: '#B8B8B8', claro: '#E6E6E6', escuro: '#3a3a3a' },
  raro: { principal: '#5AA7F0', claro: '#BFE0FF', escuro: '#12263d' },
  epico: { principal: '#C27BF0', claro: '#EBCBFF', escuro: '#2a1240' },
  lendario: { principal: '#F3B13C', claro: '#FFE2A3', escuro: '#3d2606' },
};
const OURO = '#C8A656';
const CREME = '#F5E3B3';

const ICONE_DO_TIPO: Readonly<Record<TipoDeCosmetico, React.ReactNode>> = {
  moldura: <Frame className="w-7 h-7" />,
  avatar: <UserSquare2 className="w-7 h-7" />,
  efeito: <Wand2 className="w-7 h-7" />,
  aura: <Sparkles className="w-7 h-7" />,
  skin: <Shirt className="w-7 h-7" />,
  decoracao: <MessageSquare className="w-7 h-7" />,
};

const ESTILOS = `
@keyframes lp-brilho { 0% { transform: translateX(-130%) skewX(-18deg); } 55%, 100% { transform: translateX(260%) skewX(-18deg); } }
@keyframes lp-pulso { 0%, 100% { opacity: .55; transform: scale(1); } 50% { opacity: 1; transform: scale(1.12); } }
@keyframes lp-flutua { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
@keyframes lp-folha { from { background-position-x: 0%; } to { background-position-x: 100%; } }
@keyframes lp-gira { to { transform: rotate(360deg); } }
@keyframes lp-anel { 0% { transform: scale(.55); opacity: .9; } 100% { transform: scale(1.35); opacity: 0; } }
@keyframes lp-faisca { 0%, 100% { opacity: 0; transform: scale(.4); } 50% { opacity: 1; transform: scale(1); } }
.lp-brilho::after { content: ''; position: absolute; inset: 0; width: 38%; background: linear-gradient(100deg, transparent, rgba(255,255,255,.34), transparent); animation: lp-brilho 3.6s ease-in-out infinite; pointer-events: none; }
.lp-pulso { animation: lp-pulso 2.6s ease-in-out infinite; }
.lp-pix { image-rendering: pixelated; }
.lp-gira { animation: lp-gira 14s linear infinite; }
.lp-anel { animation: lp-anel 2.4s ease-out infinite; }
.lp-flutua { animation: lp-flutua 3.2s ease-in-out infinite; }
.lp-faisca { animation: lp-faisca 2.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .lp-folha, .lp-gira, .lp-anel, .lp-brilho::after, .lp-pulso, .lp-flutua, .lp-faisca { animation: none !important; } }
`;

const DIVISOR = '/images/perfil/divisor.webp';
const FAIXA_DA_SECAO = peca('c-faixa');

function Divisor() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={DIVISOR} alt="" aria-hidden="true" draggable={false} className="lp-pix w-full max-w-[300px] h-auto self-center opacity-90" />
  );
}

/** O cabeçalho de cada seção: a faixa de louros da Arena com o nome em cima. */
function Cabecalho({ id, nome, subtitulo }: { id: string; nome: string; subtitulo: string }) {
  return (
    <header className="flex flex-col items-center gap-1">
      <div className="relative w-[84%] max-w-[330px]" style={{ aspectRatio: '240 / 57' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={FAIXA_DA_SECAO} alt="" aria-hidden="true" draggable={false} className="lp-pix absolute inset-0 w-full h-full" style={{ filter: 'drop-shadow(0 0 10px rgba(243,177,60,.35))' }} />
        <h2 id={id} className="absolute inset-0 flex items-center justify-center pb-[1%] font-cinzel font-black uppercase tracking-[0.16em] text-[17px]" style={{ color: '#FFF6DC', textShadow: '0 2px 0 #06303f, 0 0 8px rgba(0,0,0,.6)' }}>{nome}</h2>
      </div>
      <p className="text-[11px] text-center px-4" style={{ color: '#D9BE82', textShadow: '0 1px 0 #000' }}>{subtitulo}</p>
    </header>
  );
}

/** O botão da vitrine: a placa cinza da Arena (a dourada fica para quando a compra for ligada). */
function BotaoEmBreve({ preco, cor = OURO }: { preco: string; cor?: string }) {
  return (
    <button type="button" disabled aria-disabled="true" className="relative w-full h-9 cursor-not-allowed font-cinzel" style={{ color: '#EFE2BE' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ARENA_UI.botaoOff} alt="" aria-hidden="true" draggable={false} className="lp-pix absolute inset-0 w-full h-full" style={{ filter: `drop-shadow(0 0 4px ${cor}66)` }} />
      <span className="relative flex items-center justify-between pl-[17%] pr-[15%] h-full">
        <span className="text-[13px] font-black" style={{ textShadow: '0 1px 0 #000' }}>{preco}</span>
        <span className="text-[8px] font-black uppercase tracking-widest opacity-80" style={{ textShadow: '0 1px 0 #000' }}>Em breve</span>
      </span>
    </button>
  );
}

// ---- As prévias vivas dos cosméticos, feitas com as artes que o jogo já tem ----

const MOLDURAS_DE_PREVIA: Readonly<Record<RaridadeDaLoja, readonly [string, string]>> = {
  comum: ['ranque-recruta', 'ranque-combatente'],
  raro: ['ranque-elite', 'ranque-campeao'],
  epico: ['ranque-ascendente', 'ranque-transcendente'],
  lendario: ['ranque-soberano', 'ranque-eterno'],
};
const CLASSES_DE_PREVIA = ['barbaro', 'cavaleiro', 'feiticeiro', 'bandido', 'profeta', 'samurai'] as const;
/** A cor de cada tema provisório (os elementos do jogo) e o quanto girar o matiz do herói para a skin de exemplo. */
const TEMA: Readonly<Record<string, { cor: string; claro: string; matiz: number; efeito: NomeDoEfeito }>> = {
  Terra: { cor: '#B58A3E', claro: '#F0D79A', matiz: 35, efeito: 'magia-terra' },
  Vento: { cor: '#6FE0CC', claro: '#D4FFF6', matiz: 150, efeito: 'magia-vento' },
  Gelo: { cor: '#6CC6FF', claro: '#D6F0FF', matiz: 190, efeito: 'magia-gelo' },
  'Relâmpago': { cor: '#FFE24A', claro: '#FFF8C4', matiz: 80, efeito: 'golpe-relampago' },
  Sombrio: { cor: '#9A66FF', claro: '#E0CFFF', matiz: 260, efeito: 'magia-sombrio' },
  Sagrado: { cor: '#FFE9A0', claro: '#FFFBE6', matiz: 50, efeito: 'magia-sagrado' },
  Fogo: { cor: '#FF7A2A', claro: '#FFD3B0', matiz: 340, efeito: 'magia-fogo' },
};
const tema = (t: string) => TEMA[t] ?? TEMA.Fogo;

/** Uma folha de quadros (o herói parado, os efeitos de magia) tocando em laço, por CSS. */
function Folha({ src, quadros, largura, altura, fps, escala, style }: { src: string; quadros: number; largura: number; altura: number; fps: number; escala: number; style?: React.CSSProperties }) {
  return (
    <div
      aria-hidden="true"
      className="lp-pix lp-folha"
      style={{
        width: largura * escala,
        height: altura * escala,
        backgroundImage: `url(${src})`,
        backgroundSize: `${quadros * 100}% 100%`,
        backgroundRepeat: 'no-repeat',
        animation: `lp-folha ${(quadros / Math.max(1, fps)).toFixed(2)}s steps(${Math.max(1, quadros - 1)}, jump-none) infinite`,
        ...style,
      }}
    />
  );
}

/** O herói da classe, de frente, parado e animado, com a arte do Yuri. */
function Heroi({ classe, altura = 74, style }: { classe: string; altura?: number; style?: React.CSSProperties }) {
  const a = ANIMACAO_DO_HEROI[classe]?.frente ?? ANIMACAO_DO_HEROI.barbaro.frente;
  const media = a.parado.ms.reduce((t, x) => t + x, 0) / a.parado.ms.length;
  return <Folha src={a.parado.src} quadros={a.parado.quadros} largura={a.largura} altura={a.altura} fps={1000 / media} escala={altura / a.altura} style={style} />;
}

/** O quadro de arte de um cosmético: a moldura da raridade da Coleção, a gema, e dentro a prévia. */
function Vitrine({ raridade, children, titulo }: { raridade: RaridadeDaLoja; children: React.ReactNode; titulo?: string }) {
  const c = COR[raridade];
  const brilha = raridade === 'epico' || raridade === 'lendario';
  const moldura = raridade === 'lendario' ? TELAS_UI.molduraDourada : raridade === 'comum' ? TELAS_UI.molduraCinza : TELAS_UI.molduraAzul;
  return (
    <div className={`relative w-full ${brilha ? 'lp-brilho' : ''}`} style={{ aspectRatio: '1 / 1' }} role="img" aria-label={titulo}>
      <div className="absolute overflow-hidden" style={{ inset: '9%', background: `radial-gradient(circle at 50% 55%, ${c.principal}40 0%, ${c.escuro} 58%, #0b0806 100%)` }}>
        {brilha && [18, 52, 80].map((x, i) => <span key={x} aria-hidden="true" className="lp-faisca absolute w-1.5 h-1.5 rotate-45" style={{ left: `${x}%`, top: `${[20, 68, 36][i]}%`, backgroundColor: c.claro, boxShadow: `0 0 6px ${c.claro}`, animationDelay: `${i * 0.7}s` }} />)}
        {children}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={moldura} alt="" aria-hidden="true" draggable={false} className="lp-pix absolute inset-0 w-full h-full" style={raridade === 'epico' ? { filter: 'hue-rotate(78deg) saturate(1.25)' } : undefined} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={GEMA_DA_RARIDADE[raridade]} alt="" aria-hidden="true" draggable={false} className="lp-pix absolute -top-1 -left-1 w-[22%] h-auto z-10" style={{ filter: `drop-shadow(0 0 5px ${c.principal})` }} />
      <span className="absolute bottom-[11%] inset-x-0 text-center text-[7px] font-black uppercase tracking-widest z-10" style={{ color: `${c.claro}c0`, textShadow: '0 1px 0 #000' }}>prévia</span>
    </div>
  );
}

function PreviaDoCosmetico({ item, indice }: { item: ItemCosmetico; indice: number }) {
  const t = tema(item.tema);
  const classe = CLASSES_DE_PREVIA[indice % CLASSES_DE_PREVIA.length];
  const fx = EFEITOS[t.efeito];
  switch (item.tipo) {
    case 'moldura': {
      const id = MOLDURAS_DE_PREVIA[item.raridade][item.tema === TEMAS_PROVISORIOS[item.raridade][0] ? 0 : 1];
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative" style={{ width: '70%', aspectRatio: '1 / 1' }}>
            <div className="absolute overflow-hidden rounded-full" style={{ left: '7%', top: '7%', width: '86%', height: '86%', backgroundColor: '#16120E' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resolveAvatarSrc(undefined, classe)} alt="" aria-hidden="true" draggable={false} className="w-full h-full" style={getAvatarFaceStyle(undefined, classe)} />
            </div>
            <MolduraDoAvatar molduraId={id} />
          </div>
        </div>
      );
    }
    case 'avatar':
      return (
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resolveAvatarSrc(undefined, classe)} alt="" aria-hidden="true" draggable={false} className="w-full h-full object-cover object-top" style={{ filter: `hue-rotate(${(t.matiz % 40) - 20}deg) saturate(1.1)` }} />
          <div className="absolute inset-x-0 bottom-0 h-1/3" style={{ background: `linear-gradient(0deg, ${t.cor}88, transparent)` }} />
        </div>
      );
    case 'efeito': {
      const escala = Math.min(100 / fx.altura, 100 / fx.largura) * 1.15;
      return (
        <div className="absolute inset-0 flex items-end justify-center pb-[8%]">
          <Heroi classe={classe} altura={64} style={{ position: 'absolute', bottom: '10%' }} />
          <div className="absolute left-1/2 top-[48%]" style={{ transform: 'translate(-50%, -50%)', mixBlendMode: 'screen' }}>
            <Folha src={`${PASTA_DOS_EFEITOS}${t.efeito}.webp`} quadros={fx.quadros} largura={fx.largura} altura={fx.altura} fps={fx.fps} escala={escala} style={{ filter: `drop-shadow(0 0 5px ${t.cor}) saturate(1.6)` }} />
          </div>
        </div>
      );
    }
    case 'aura': {
      const lendaria = item.raridade === 'lendario';
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div aria-hidden="true" className="absolute lp-pulso rounded-full" style={{ width: '88%', height: '88%', background: `radial-gradient(circle, ${t.cor}cc 0%, ${t.cor}44 45%, transparent 70%)` }} />
          {lendaria && <div aria-hidden="true" className="absolute lp-gira" style={{ width: '120%', height: '120%', background: `repeating-conic-gradient(from 0deg, ${t.claro}55 0deg 6deg, transparent 6deg 30deg)`, maskImage: 'radial-gradient(circle, #000 20%, transparent 62%)', WebkitMaskImage: 'radial-gradient(circle, #000 20%, transparent 62%)' }} />}
          <span aria-hidden="true" className="lp-anel absolute rounded-full" style={{ width: '70%', height: '70%', border: `2px solid ${t.claro}` }} />
          <Heroi classe={classe} altura={72} style={{ position: 'relative', filter: `drop-shadow(0 0 6px ${t.cor}) drop-shadow(0 0 12px ${t.cor})` }} />
        </div>
      );
    }
    case 'skin':
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div aria-hidden="true" className="absolute bottom-[12%] w-[60%] h-[10%] rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(0,0,0,.65), transparent 70%)' }} />
          <Heroi classe={classe} altura={78} style={{ position: 'relative', filter: `hue-rotate(${t.matiz}deg) saturate(1.35) brightness(1.05) drop-shadow(0 0 4px ${t.cor}88)` }} />
        </div>
      );
    case 'decoracao':
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-[8%]">
          <div className="w-full rounded-sm px-1.5 py-1" style={{ background: 'rgba(16,12,8,.92)', border: `1px solid ${t.cor}`, boxShadow: `0 0 8px ${t.cor}77` }}>
            <p className="text-[9px] font-black leading-none flex items-center gap-1" style={{ color: t.cor, textShadow: `0 0 6px ${t.cor}aa` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/perfil/losango.webp" alt="" aria-hidden="true" className="lp-pix w-3 h-3" />
              Aventureiro
            </p>
            <p className="text-[8px] mt-0.5" style={{ color: '#E9DCC0' }}>Bora para a Caçada?</p>
          </div>
          <div className="w-full rounded-sm px-1.5 py-1" style={{ background: 'rgba(16,12,8,.92)', border: '1px solid #5b4a2e' }}>
            <p className="text-[9px] font-black leading-none" style={{ color: '#C9C0A8' }}>Sem decoração</p>
            <p className="text-[8px] mt-0.5" style={{ color: '#9a9078' }}>Bora!</p>
          </div>
        </div>
      );
  }
}

function CartaoCosmetico({ item, indice = 0 }: { item: ItemCosmetico; indice?: number }) {
  const c = COR[item.raridade];
  return (
    <article aria-label={`${item.nome}, ${formatarReais(item.precoCentavos)}`} className="relative flex flex-col gap-1.5 p-1.5 rounded-sm" style={{ background: 'linear-gradient(180deg, rgba(32,24,16,.95), rgba(14,10,7,.97))', border: `1px solid ${c.principal}88`, boxShadow: `0 0 ${item.raridade === 'lendario' ? 18 : item.raridade === 'epico' ? 12 : 5}px ${c.principal}${item.raridade === 'comum' ? '33' : '66'}` }}>
      {item.conjunto && <span className="absolute top-1 right-1 z-20 text-[7px] font-black uppercase tracking-wider px-1 py-0.5 rounded-sm" style={{ backgroundColor: '#1d150b', color: c.claro, border: `1px solid ${c.principal}` }}>Conjunto</span>}
      <Vitrine raridade={item.raridade} titulo={`Prévia: ${item.nome}`}><PreviaDoCosmetico item={item} indice={indice} /></Vitrine>
      <div className="flex flex-col leading-tight px-0.5">
        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: c.principal }}>{NOME_DA_RARIDADE[item.raridade]}</span>
        <span className="text-[11px] font-bold" style={{ color: CREME }}>{DADOS_DO_TIPO[item.tipo].nome} · {item.tema}</span>
      </div>
      <BotaoEmBreve preco={formatarReais(item.precoCentavos)} cor={c.principal} />
    </article>
  );
}

function Moldura({ children, cor = OURO, brilho = false, selo }: { children: React.ReactNode; cor?: string; brilho?: boolean; selo?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-sm p-2 flex flex-col gap-1.5 ${brilho ? 'lp-brilho' : ''}`} style={{ background: 'linear-gradient(180deg, rgba(36,26,16,.97), rgba(16,12,8,.98))', border: `1px solid ${cor}bb`, boxShadow: `0 0 ${brilho ? 18 : 8}px ${cor}55, inset 0 0 18px ${cor}1a` }}>
      {selo && <span className="absolute top-0 left-0 z-10 text-[9px] font-black uppercase tracking-widest px-2 py-0.5" style={{ backgroundColor: cor, color: '#1A120B', borderBottomRightRadius: 6 }}>{selo}</span>}
      {children}
    </div>
  );
}

/** O medalhão de um item que não é cosmético: a moldura da raridade da Coleção com a arte do jogo dentro (e o brilho nos mais raros). */
function Medalhao({ raridade, lado = 64, children, flutua = true }: { raridade: RaridadeDaLoja; lado?: number; children: React.ReactNode; flutua?: boolean }) {
  const c = COR[raridade];
  const moldura = raridade === 'lendario' ? TELAS_UI.molduraDourada : raridade === 'comum' ? TELAS_UI.molduraCinza : TELAS_UI.molduraAzul;
  return (
    <div className="relative shrink-0" style={{ width: lado, height: lado }} aria-hidden="true">
      <div className="absolute overflow-hidden flex items-center justify-center" style={{ inset: '10%', background: `radial-gradient(circle at 50% 55%, ${c.principal}55 0%, ${c.escuro} 62%, #0b0806 100%)` }}>
        <div className={flutua ? 'lp-flutua' : ''} style={{ filter: `drop-shadow(0 0 6px ${c.principal})` }}>{children}</div>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={moldura} alt="" draggable={false} className="lp-pix absolute inset-0 w-full h-full" style={raridade === 'epico' ? { filter: 'hue-rotate(78deg) saturate(1.25)' } : undefined} />
    </div>
  );
}

const Pix = ({ src, l }: { src: string; l: number }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt="" aria-hidden="true" draggable={false} className="lp-pix" style={{ width: l, height: 'auto' }} />
);

function Diamantes() {
  return (
    <div className="grid grid-cols-2 gap-2">
      {DIAMANTES_NA_VITRINE.map((p, i) => {
        const total = p.base + p.bonus;
        const destaque = i === 3 ? 'Mais vendido' : i === 5 ? 'Melhor valor' : undefined;
        return (
          <Moldura key={p.id} cor={i >= 4 ? '#F3B13C' : '#5AA7F0'} brilho={i >= 4} selo={destaque}>
            <div className="self-center pt-3">
              <Medalhao raridade={i >= 4 ? 'lendario' : i >= 2 ? 'raro' : 'comum'} lado={76}>
                <div className="flex items-end justify-center gap-px" style={{ width: 52 }}>
                  {Array.from({ length: Math.min(4, 1 + Math.floor(i / 1.4)) }, (_, k) => <Pix key={k} src={ARENA_UI.diamante} l={14 + k * 2 + i} />)}
                </div>
              </Medalhao>
            </div>
            <div className="text-center leading-tight">
              <p className="font-cinzel font-black text-base" style={{ color: CREME }}>{total.toLocaleString('pt-BR')} <span className="text-[10px] font-bold">Diamantes</span></p>
              <p className="text-[10px]" style={{ color: '#9fd4a0' }}>{p.bonus > 0 ? `${p.base} + ${p.bonus} de bônus` : p.nome}</p>
            </div>
            <BotaoEmBreve preco={formatarReais(p.precoCentavos)} cor={i >= 4 ? '#F3B13C' : '#5AA7F0'} />
          </Moldura>
        );
      })}
      <p className="col-span-2 text-center text-[10px]" style={{ color: '#C8A25A' }}>A primeira compra de Diamantes da conta vale o dobro (base e bônus).</p>
    </div>
  );
}

function Pacotes() {
  const [verTodos, setVerTodos] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <Moldura cor="#7BC47F" selo="Para começar">
          <div className="self-center mt-4"><Medalhao raridade="raro" lado={76}><Pix src={TELAS_UI.presente} l={36} /></Medalhao></div>
          <div className="text-center leading-tight"><p className="font-cinzel font-black text-sm" style={{ color: CREME }}>{PACOTE_DO_INICIANTE_NA_VITRINE.nome}</p><p className="text-[10px]" style={{ color: '#C8A25A' }}>{PACOTE_DO_INICIANTE_NA_VITRINE.ouro.toLocaleString('pt-BR')} de ouro, {PACOTE_DO_INICIANTE_NA_VITRINE.diamantes} Diamantes e um baú de emblema épico. 1 por conta.</p></div>
          <BotaoEmBreve preco={formatarReais(PACOTE_DO_INICIANTE_NA_VITRINE.precoCentavos)} cor="#7BC47F" />
        </Moldura>
        <Moldura cor="#F3B13C" brilho selo="Novo">
          <div className="self-center mt-4"><Medalhao raridade="lendario" lado={76}><Pix src={ARENA_UI.louros} l={40} /></Medalhao></div>
          <div className="text-center leading-tight"><p className="font-cinzel font-black text-sm" style={{ color: CREME }}>{PASSE_DO_INICIANTE.nome}</p><p className="text-[10px]" style={{ color: '#C8A25A' }}>{PASSE_DO_INICIANTE.regras}</p></div>
          <BotaoEmBreve preco={formatarReais(PASSE_DO_INICIANTE.precoCentavos)} cor="#F3B13C" />
        </Moldura>
        <div className="col-span-2">
          <Moldura cor="#5AA7F0" selo="Novo">
            <div className="flex items-center gap-3 pt-3">
              <Medalhao raridade="raro" lado={64}><Pix src={EXPEDICAO_UI.ampulheta} l={34} /></Medalhao>
              <div className="leading-tight flex-1"><p className="font-cinzel font-black text-sm" style={{ color: CREME }}>{VAGA_EXTRA_DE_EXPEDICAO.nome} ({VAGA_EXTRA_DE_EXPEDICAO.duracaoEmDias} dias)</p><p className="text-[10px]" style={{ color: '#C8A25A' }}>{VAGA_EXTRA_DE_EXPEDICAO.regras}</p></div>
            </div>
            <BotaoEmBreve preco={formatarReais(VAGA_EXTRA_DE_EXPEDICAO.precoCentavos)} cor="#5AA7F0" />
          </Moldura>
        </div>
      </div>

      <Moldura cor="#C27BF0" selo="Novo">
        <div className="flex items-center gap-3 pt-3">
          <Medalhao raridade="epico" lado={64}><Pix src={ICONES_DE_ABA.todos} l={34} /></Medalhao>
          <div className="leading-tight">
            <p className="font-cinzel font-black text-sm" style={{ color: CREME }}>Expansão da Mochila</p>
            <p className="text-[10px]" style={{ color: '#C8A25A' }}>+20 espaços por pacote, em 10 pacotes que se compram em ordem. Todos juntos: +{TOTAL_DE_ESPACOS_DA_EXPANSAO} espaços por {formatarReais(TOTAL_DA_EXPANSAO_DA_MOCHILA_CENTAVOS)}. O 1º é o mais barato.</p>
          </div>
        </div>
        <ol className="grid grid-cols-5 gap-1" aria-label="Os 10 pacotes da Expansão da Mochila">
          {EXPANSOES_DA_MOCHILA.map((p) => (
            <li key={p.id} aria-label={`${p.ordem}º pacote, ${formatarReais(p.precoCentavos)}`} className="relative flex flex-col items-center gap-0.5 py-1 rounded-sm" style={{ border: `1px solid ${p.ordem === 1 ? '#C27BF0' : '#5b4a2e'}`, backgroundColor: p.ordem === 1 ? 'rgba(194,123,240,.14)' : 'rgba(20,14,9,.9)', boxShadow: p.ordem === 1 ? '0 0 10px rgba(194,123,240,.5)' : undefined }}>
              <span className="text-[8px] font-bold" style={{ color: '#C8A25A' }}>{p.ordem}º</span>
              <span className="text-[11px] font-black font-cinzel" style={{ color: p.ordem === 1 ? '#EBCBFF' : CREME }}>+{p.espacos}</span>
              <span className="text-[9px] font-bold" style={{ color: '#E9D9AE' }}>{formatarReais(p.precoCentavos)}</span>
            </li>
          ))}
        </ol>
        <p className="text-[10px] text-center" style={{ color: '#C8A25A' }}>O 1º pacote ({formatarReais(EXPANSOES_DA_MOCHILA[0].precoCentavos)}) é barato de propósito. Você só pode comprar o pacote seguinte depois do anterior.</p>
        <BotaoEmBreve preco={`A partir de ${formatarReais(EXPANSOES_DA_MOCHILA[0].precoCentavos)}`} cor="#C27BF0" />
      </Moldura>

      <div className="flex flex-col gap-2">
        <button type="button" onClick={() => setVerTodos((v) => !v)} aria-expanded={verTodos} className="self-center text-[11px] font-cinzel font-bold uppercase tracking-widest px-3 py-1 border rounded-sm cursor-pointer" style={{ borderColor: `${OURO}88`, color: CREME, backgroundColor: 'rgba(28,20,12,.9)' }}>
          {verTodos ? 'Esconder' : 'Ver'} os pacotes mensais
        </button>
        {verTodos && (
          <div className="grid grid-cols-1 gap-2">
            {CADEIAS_MENSAIS.map((cadeia) => (
              <Moldura key={cadeia} cor="#C8A656">
                <p className="font-cinzel font-black text-sm text-center" style={{ color: CREME }}>Pacote mensal · {NOME_DA_CADEIA[cadeia]}</p>
                <ul className="grid grid-cols-4 gap-1">
                  {PACOTES_MENSAIS.filter((p) => p.cadeia === cadeia).map((p) => (
                    <li key={p.id} className="flex flex-col items-center py-1 rounded-sm" style={{ border: '1px solid #5b4a2e', backgroundColor: 'rgba(20,14,9,.9)' }}>
                      <span className="text-[9px] font-bold" style={{ color: '#C8A25A' }}>{p.nome.split(' ').at(-1)}</span>
                      <span className="text-[11px] font-black" style={{ color: CREME }}>{formatarReais(p.precoCentavos)}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-[10px] text-center" style={{ color: '#C8A25A' }}>4 pacotes por mês, em ordem. Reinicia no dia 1.</p>
              </Moldura>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Passes() {
  return (
    <div className="grid grid-cols-1 gap-2">
      {PASSES_NA_VITRINE.map((p, i) => (
        <Moldura key={p.id} cor={i === 1 ? '#F3B13C' : '#C27BF0'} brilho={i === 1} selo={i === 1 ? 'Completo' : undefined}>
          <div className="flex items-center gap-3 pt-3">
            <Medalhao raridade={i === 1 ? 'lendario' : 'epico'} lado={64}><Pix src={i === 0 ? ARENA_UI.louros : i === 1 ? ARENA_UI.trofeu : i === 2 ? EXPEDICAO_UI.pedraDaRecordacao : HUD_ICONS.diamante} l={30} /></Medalhao>
            <div className="leading-tight flex-1">
              <p className="font-cinzel font-black text-sm" style={{ color: CREME }}>{p.nome}</p>
              <ul className="text-[10px] list-disc pl-3" style={{ color: '#C8A25A' }}>{p.beneficios.map((b) => <li key={b}>{b}</li>)}</ul>
            </div>
          </div>
          <BotaoEmBreve preco={`${formatarReais(p.precoCentavos)} · 30 dias`} cor={i === 1 ? '#F3B13C' : '#C27BF0'} />
        </Moldura>
      ))}
    </div>
  );
}

function Cosmeticos() {
  return (
    <div className="flex flex-col gap-4">
      {TIPOS_DE_COSMETICO.map((tipo) => {
        const itens = ITENS_COSMETICOS.filter((i) => i.tipo === tipo).sort((a, b) => RARIDADES_DA_LOJA.indexOf(a.raridade) - RARIDADES_DA_LOJA.indexOf(b.raridade));
        return (
          <section key={tipo} aria-labelledby={`tipo-${tipo}`} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="shrink-0" style={{ color: OURO }}>{ICONE_DO_TIPO[tipo]}</span>
              <div className="leading-tight">
                <h3 id={`tipo-${tipo}`} className="font-cinzel font-black uppercase tracking-wider text-sm" style={{ color: CREME }}>{DADOS_DO_TIPO[tipo].plural}</h3>
                <p className="text-[10px]" style={{ color: '#C8A25A' }}>{DADOS_DO_TIPO[tipo].descricao}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">{itens.map((i, k) => <CartaoCosmetico key={i.id} item={i} indice={k + TIPOS_DE_COSMETICO.indexOf(tipo)} />)}</div>
          </section>
        );
      })}
    </div>
  );
}

function CartaoConjunto({ c }: { c: Conjunto }) {
  const cor = COR[c.raridade];
  const pct = Math.round((c.economiaCentavos / c.precoAvulsoCentavos) * 100);
  const lendario = c.raridade === 'lendario';
  return (
    <article aria-label={`${c.nome}, ${formatarReais(c.precoCentavos)}`} className={`relative overflow-hidden rounded-sm p-2 flex flex-col gap-2 ${lendario || c.raridade === 'epico' ? 'lp-brilho' : ''}`} style={{ background: `linear-gradient(180deg, ${cor.escuro}, #0e0a07)`, border: `1.5px solid ${cor.principal}`, boxShadow: `0 0 ${lendario ? 26 : 16}px ${cor.principal}77, inset 0 0 26px ${cor.principal}22` }}>
      <span className="absolute top-0 right-0 z-10 text-[10px] font-black uppercase tracking-widest px-2 py-0.5" style={{ backgroundColor: cor.principal, color: '#1A120B', borderBottomLeftRadius: 6 }}>-{pct}%</span>
      <div className="flex items-center gap-2">
        <Medalhao raridade={c.raridade} lado={52}><Pix src={TELAS_UI.bauFechado} l={30} /></Medalhao>
        <div className="leading-tight">
          <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: cor.principal }}>{NOME_DA_RARIDADE[c.raridade]}</p>
          <h3 className="font-cinzel font-black text-sm" style={{ color: CREME }}>{c.nome}</h3>
        </div>
      </div>
      <ul className={`grid gap-1.5 ${c.itens.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`} aria-label="O que o conjunto leva">
        {c.itens.map((i, k) => (
          <li key={i.id} className="flex flex-col items-center gap-0.5 text-center">
            <Vitrine raridade={i.raridade}><PreviaDoCosmetico item={i} indice={k} /></Vitrine>
            <span className="text-[8px] font-bold leading-tight" style={{ color: CREME }}>{DADOS_DO_TIPO[i.tipo].nome.split(' ')[0]}</span>
            <span className="text-[8px] line-through opacity-60" style={{ color: cor.claro }}>{formatarReais(i.precoCentavos)}</span>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-center" style={{ color: '#C8A25A' }}>
        Avulso <span className="line-through">{formatarReais(c.precoAvulsoCentavos)}</span> · você economiza <b style={{ color: '#9fd4a0' }}>{formatarReais(c.economiaCentavos)}</b>
      </p>
      <BotaoEmBreve preco={formatarReais(c.precoCentavos)} cor={cor.principal} />
    </article>
  );
}

function Conjuntos() {
  return (
    <div className="flex flex-col gap-3">
      {[...CONJUNTOS].reverse().map((c) => <CartaoConjunto key={c.id} c={c} />)}
    </div>
  );
}

/** A tela da Loja Premium: o banner, a faixa de seções e as seções. */
export function LojaPagaScreen({ nome, diamantes }: { nome?: string; diamantes?: number }) {
  const [secao, setSecao] = useState<SecaoDaLoja>('diamantes');
  const topo = useRef<HTMLDivElement>(null);
  const irPara = (s: SecaoDaLoja) => {
    setSecao(s);
    document.getElementById(`secao-${s}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const destaque = CONJUNTOS[CONJUNTOS.length - 1];
  const SECAO: Record<SecaoDaLoja, React.ReactNode> = { diamantes: <Diamantes />, pacotes: <Pacotes />, passes: <Passes />, cosmeticos: <Cosmeticos />, conjuntos: <Conjuntos /> };

  return (
    <main className="min-h-dvh w-full flex flex-col items-center px-2.5 sm:px-5 pb-10" style={{ backgroundColor: '#0D0A07', backgroundImage: `radial-gradient(ellipse at top, rgba(194,123,240,.28) 0%, rgba(13,10,7,0) 55%), linear-gradient(rgba(10,7,5,.8), rgba(10,7,5,.93)), url(${TELAS_UI.fundoMercado})`, backgroundSize: 'cover', backgroundPosition: 'center top', backgroundAttachment: 'fixed', color: CREME }}>
      <style>{ESTILOS}</style>
      <div ref={topo} className="w-full max-w-[520px] flex flex-col gap-4">
        <div className="flex items-center gap-2 pt-3">
          <Link href="/loja" aria-label="Voltar à Loja" className="p-1"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="font-cinzel font-black italic uppercase tracking-[0.22em] text-xl" style={{ color: '#FFE2A3', textShadow: '0 2px 0 #1A120B, 0 0 18px rgba(243,177,60,.55)' }}>Loja Premium</h1>
          {diamantes !== undefined && (
            <span className="ml-auto flex items-center gap-1 text-[12px] font-bold px-2 py-0.5 rounded-sm" style={{ border: `1px solid ${OURO}88`, backgroundColor: 'rgba(28,20,12,.9)' }} aria-label={`${diamantes} Diamantes`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ARENA_UI.diamante} alt="" aria-hidden="true" style={{ width: 14, imageRendering: 'pixelated' }} />
              {diamantes.toLocaleString('pt-BR')}
            </span>
          )}
        </div>

        {/* o banner */}
        <section aria-label="Destaque" className="relative overflow-hidden rounded-sm lp-brilho" style={{ background: 'linear-gradient(135deg, #3d2606 0%, #1d1226 55%, #0e0a07 100%)', border: '1.5px solid #F3B13C', boxShadow: '0 0 30px rgba(243,177,60,.45), inset 0 0 40px rgba(194,123,240,.18)' }}>
          {[12, 30, 62, 84, 48].map((x, i) => <span key={x} aria-hidden="true" className="lp-faisca absolute w-1.5 h-1.5 rotate-45" style={{ left: `${x}%`, top: `${[20, 64, 28, 58, 80][i]}%`, backgroundColor: '#FFE2A3', boxShadow: '0 0 8px #FFE2A3', animationDelay: `${i * 0.5}s` }} />)}
          <div className="relative p-4 flex items-center gap-3">
            <Medalhao raridade="lendario" lado={84}><Pix src={TELAS_UI.bauAberto} l={46} /></Medalhao>
            <div className="leading-tight">
              <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: '#F3B13C' }}>Em destaque</p>
              <p className="font-cinzel font-black text-lg" style={{ color: '#FFF1CC' }}>{destaque.nome}</p>
              <p className="text-[11px]" style={{ color: '#E9D9AE' }}>Moldura, avatar, efeito e aura por {formatarReais(destaque.precoCentavos)} (economize {formatarReais(destaque.economiaCentavos)}).</p>
              <button type="button" onClick={() => irPara('conjuntos')} className="mt-1.5 text-[10px] font-cinzel font-bold uppercase tracking-widest px-3 py-1 rounded-sm cursor-pointer" style={{ backgroundColor: '#F3B13C', color: '#1A120B' }}>Ver conjuntos</button>
            </div>
          </div>
        </section>
        {nome && <p className="text-[11px] text-center -mt-2" style={{ color: '#C8A25A' }}>Bem-vindo, {nome}. As compras serão ligadas em breve: por enquanto é só a vitrine.</p>}

        {/* a faixa de seções */}
        <nav aria-label="Seções da loja" className="sticky top-0 z-20 -mx-2.5 px-2.5 py-1.5 flex gap-1.5 overflow-x-auto" style={{ backgroundColor: 'rgba(13,10,7,.94)', backdropFilter: 'blur(4px)', borderBottom: `1px solid ${OURO}44`, scrollbarWidth: 'none' }}>
          {SECOES_DA_LOJA.map((s) => (
            <button key={s.id} type="button" onClick={() => irPara(s.id)} aria-current={secao === s.id ? 'true' : undefined} className="shrink-0 px-3 py-1 rounded-sm text-[11px] font-cinzel font-black uppercase tracking-widest cursor-pointer" style={{ border: `1px solid ${OURO}`, backgroundColor: secao === s.id ? OURO : 'rgba(34,28,22,.95)', color: secao === s.id ? '#1A140E' : CREME, boxShadow: secao === s.id ? `0 0 12px ${OURO}88` : undefined }}>
              {s.nome}
            </button>
          ))}
        </nav>

        {SECOES_DA_LOJA.map((s) => (
          <section key={s.id} id={`secao-${s.id}`} aria-labelledby={`titulo-${s.id}`} className="flex flex-col gap-3 scroll-mt-14">
            <Cabecalho id={`titulo-${s.id}`} nome={s.nome} subtitulo={s.subtitulo} />
            {SECAO[s.id]}
          </section>
        ))}

        <footer className="flex flex-col gap-1 pt-2 text-center">
          <Divisor />
          <p className="text-[10px]" style={{ color: '#C8A25A' }}>
            <Palette className="inline w-3 h-3 mr-1" aria-hidden="true" />
            Cosméticos não mudam o poder de combate. Preços em reais (R$). As compras desta loja ainda não estão abertas; o que já pode ser comprado fica na aba VIP da Loja.
          </p>
        </footer>
      </div>
    </main>
  );
}
