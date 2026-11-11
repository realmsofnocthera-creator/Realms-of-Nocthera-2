'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import type { CharacterDocument } from '@/server/characterService';
import { ALMA_UI, COLUNAS_DA_ALMA, ESPACOS_DA_PRATELEIRA, PROPORCAO_DA_ALMA } from '@/assets/almaUi';
import { arteDaCarta } from '@/assets/cartasDaAlma';
import { bonusDasCartas } from '@/game/almas';
import {
  BONUS_DO_DESPERTAR_PERCENTUAL,
  CACOS_AO_DESTRUIR,
  CACOS_PARA_REFINAR,
  CATEGORIAS_DE_CARTA,
  CUSTO_DO_DESPERTAR,
  ESPACOS_POR_CATEGORIA,
  NIVEL_DA_ALMA,
  NIVEL_MAXIMO_DO_DESPERTAR,
  NOME_DA_CATEGORIA,
  podeDespertar,
  RARIDADES_DE_CARTA,
  textoDoEfeito,
  TIPO_DE_CARTA_MAP,
  type CartaItem,
  type CategoriaDeCarta,
} from '@/rules/almas';
import { EMBLEMA_RARIDADE_MAP } from '@/rules/emblemas';
import { textoDaFicha, TEXTOS_DA_FICHA } from '@/rules/textosDaFicha';
import { IconeDeMoeda } from '@/components/colecao/ArtesDaColecao';
import { ArteDaCarta } from '@/components/alma/ArteDaCarta';
import { CartaDaAlma } from '@/components/alma/CartaDaAlma';
import { BotaoRedondo, PainelDaForja } from '@/components/forja/KitDaForja';

/** Faz uma ação da Alma na rota do jogo e devolve a mensagem de erro (ou null) e o aviso de sucesso. */
export type AcaoDaAlma = (acao: string, extra?: Record<string, unknown>) => Promise<{ erro: string | null; mensagem?: string }>;

interface FichaAlmaPixelProps {
  character: CharacterDocument;
  onAlmaAcao?: AcaoDaAlma;
  className?: string;
}

type Janela = { tipo: 'carta'; id: string } | { tipo: 'cartas'; filtro: CategoriaDeCarta | 'todas' } | { tipo: 'bonus' } | null;

const pixel: React.CSSProperties = { imageRendering: 'pixelated' };
const CONTORNO = '0.2cqw 0 0 #05070D, -0.2cqw 0 0 #05070D, 0 0.2cqw 0 #05070D, 0 -0.2cqw 0 #05070D';
const botao = 'font-cinzel font-extrabold uppercase text-[2.1cqw] leading-[1.4] px-[2cqw] py-[1cqw] border cursor-pointer active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed';

/** A janela sobre a tela (com o fundo escurecido): o título, o X e o conteúdo rolável. */
function JanelaDaAlma({ titulo, aoFechar, children }: { titulo: string; aoFechar: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const fechar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar();
    };
    window.addEventListener('keydown', fechar);
    return () => window.removeEventListener('keydown', fechar);
  }, [aoFechar]);
  return (
    <div role="dialog" aria-modal="true" aria-label={titulo} onClick={aoFechar} className="forja-palco !fixed inset-0 !z-[80] !items-center !justify-center px-[4cqw]" style={{ backgroundColor: 'rgba(3,6,14,0.62)', left: 0, right: 0 }}>
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-[92cqw]">
        <BotaoRedondo tipo="x" rotulo={TEXTOS_DA_FICHA.conta.fechar} onClick={aoFechar} className="absolute -top-[3.4cqw] -right-[2cqw] z-10 w-[9cqw] h-[9cqw]" />
        <PainelDaForja borda="3cqw" className="max-h-[86dvh] overflow-y-auto forja-rolagem">
          <div className="flex flex-col gap-[2cqw]">
            <h2 className="font-cinzel font-extrabold uppercase text-[3.2cqw] leading-[1.35] text-[#DFF3FF]" style={{ textShadow: CONTORNO }}>{titulo}</h2>
            {children}
          </div>
        </PainelDaForja>
      </div>
    </div>
  );
}

/**
 * A arte da carta (ou, sem arte, o nome curto) com o brilho da cor da raridade. A carta tem a proporção da arte (216 x 300);
 * as míticas têm duas camadas e precisam de largura e altura definidas, por isso o tamanho vem da caixa e não da imagem.
 */
function FaceDaCarta({ carta, porLargura = false }: { carta: CartaItem; porLargura?: boolean }) {
  const tipo = TIPO_DE_CARTA_MAP[carta.tipo];
  const cor = EMBLEMA_RARIDADE_MAP[tipo.raridade].cor;
  if (!arteDaCarta(carta.tipo)) return <span className="font-cinzel font-bold text-[2cqw] text-center leading-tight px-[1cqw]" style={{ color: cor }}>{tipo.nome}</span>;
  return (
    <span className="block shrink-0" style={{ aspectRatio: '216 / 300', ...(porLargura ? { width: '92%' } : { height: '100%' }) }}>
      <ArteDaCarta tipoId={carta.tipo} className="block w-full h-full object-contain" style={{ filter: `drop-shadow(0 0 1.2cqw ${cor})` }} />
    </span>
  );
}

/**
 * A aba Alma da ficha em pixel (molduras do Yuri), na mesma página das outras abas: três colunas (Corpo, Alma e Mente)
 * com os 3 espaços de cada uma e, embaixo, a prateleira com as cartas guardadas. Tocar num espaço vazio abre as cartas
 * daquela categoria; tocar numa carta equipada abre os detalhes. As regras são as da tela antiga.
 */
export function FichaAlmaPixel({ character, onAlmaAcao, className = '' }: FichaAlmaPixelProps) {
  const t = TEXTOS_DA_FICHA.alma;
  const [janela, setJanela] = useState<Janela>(null);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const [refinando, setRefinando] = useState<string | null>(null);

  const itens = character.cartasItens ?? [];
  const equipadas = character.cartasEquipadas ?? [];
  const poeira = character.poeiraDeAlma ?? 0;
  const cacos = character.cacosDeAlma ?? 0;
  const bonus = useMemo(() => bonusDasCartas(itens, equipadas, character.cartasDescobertas ?? [], character.nivel), [itens, equipadas, character.cartasDescobertas, character.nivel]);
  const bloqueada = character.nivel < NIVEL_DA_ALMA;

  const categoriaDe = (c: CartaItem) => TIPO_DE_CARTA_MAP[c.tipo].categoria;
  const ordem = (c: CartaItem) => RARIDADES_DE_CARTA.indexOf(TIPO_DE_CARTA_MAP[c.tipo].raridade);
  const guardadas = itens.filter((c) => !equipadas.includes(c.id)).sort((a, b) => ordem(b) - ordem(a) || a.tipo.localeCompare(b.tipo));
  const copiasDe = (c: CartaItem) => guardadas.filter((i) => i.tipo === c.tipo && i.id !== c.id).length;

  const agir = async (acao: string, extra: Record<string, unknown> = {}, fecharDepois = false) => {
    if (!onAlmaAcao) return;
    setOcupado(true);
    setAviso(null);
    const r = await onAlmaAcao(acao, extra);
    setOcupado(false);
    if (r.erro) {
      setAviso({ texto: r.erro, erro: true });
      return;
    }
    setMarcadas([]);
    setRefinando(null);
    setAviso({ texto: r.mensagem ?? t.feito, erro: false });
    if (fecharDepois) setJanela(null);
  };

  const abrir = (j: Janela) => {
    setAviso(null);
    setMarcadas([]);
    setRefinando(null);
    setJanela(j);
  };

  const Aviso = () => (aviso ? <p role={aviso.erro ? 'alert' : 'status'} className={`font-cinzel font-bold text-[2.4cqw] ${aviso.erro ? 'text-[#FFB4B4]' : 'text-[#9BE3A0]'}`}>{aviso.texto}</p> : null);

  if (bloqueada) {
    return (
      <div className={`flex-1 min-h-0 px-[3cqw] flex flex-col items-center justify-center ${className}`}>
        <PainelDaForja borda="3cqw" className="w-full max-w-[86cqw]">
          <p role="status" className="font-cinzel font-bold text-[2.9cqw] text-center leading-snug text-[#DFF3FF] py-[3cqw]">{textoDaFicha(t.bloqueada, { nivel: NIVEL_DA_ALMA, atual: character.nivel })}</p>
        </PainelDaForja>
      </div>
    );
  }

  const cartaAberta = janela?.tipo === 'carta' ? itens.find((c) => c.id === janela.id) : undefined;
  const filtro = janela?.tipo === 'cartas' ? janela.filtro : 'todas';
  const lista = guardadas.filter((c) => filtro === 'todas' || categoriaDe(c) === filtro);
  const cacosDaSelecao = marcadas.reduce((s, id) => s + CACOS_AO_DESTRUIR[TIPO_DE_CARTA_MAP[itens.find((i) => i.id === id)!.tipo].raridade], 0);

  return (
    <div className={`flex-1 min-h-0 overflow-y-auto forja-rolagem px-[3cqw] flex flex-col items-center gap-[2.2cqw] ${className}`}>
      {/* poeira, cacos e o botão dos bônus */}
      <div className="flex items-center justify-center gap-[3cqw] w-full shrink-0 font-cinzel font-bold text-[2.5cqw] text-[#C9D6EA]">
        <span className="flex items-center gap-[1cqw]"><IconeDeMoeda moeda="poeira" className="w-[5cqw] h-[5cqw]" />{t.poeira}: <strong className="text-[#F5E3B3]">{poeira}</strong></span>
        <span className="flex items-center gap-[1cqw]"><IconeDeMoeda moeda="cacos" className="w-[5cqw] h-[5cqw]" />{t.cacos}: <strong className="text-[#F5E3B3]">{cacos}</strong></span>
        <button type="button" onClick={() => abrir({ tipo: 'bonus' })} className={`${botao} border-[#B8862B] text-[#E9DDC0] bg-[#0B1220]`}>{t.verBonus}</button>
        <Link href="/colecao?aba=alma" className={`${botao} border-[#B8862B] text-[#E9DDC0] bg-[#0B1220]`}>{t.colecao}</Link>
      </div>
      <Aviso />

      {/* as três colunas: título e 3 espaços em cada */}
      <div className="grid grid-cols-3 gap-[1.6cqw] w-full shrink-0">
        {COLUNAS_DA_ALMA.map((categoria) => {
          const nelas = equipadas.flatMap((id) => itens.find((i) => i.id === id) ?? []).filter((c) => categoriaDe(c) === categoria);
          const nome = NOME_DA_CATEGORIA[categoria];
          return (
            <section key={categoria} aria-label={`Espaços de ${nome}`} className="flex flex-col items-stretch gap-[1.2cqw]">
              <div className="relative w-full flex items-end" style={{ aspectRatio: PROPORCAO_DA_ALMA.placa.alma }}>
                <div className="relative w-full" style={{ aspectRatio: PROPORCAO_DA_ALMA.placa[categoria] }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ALMA_UI.placa[categoria]} alt="" aria-hidden="true" draggable={false} className="absolute inset-x-0 bottom-0 w-full pointer-events-none" style={pixel} />
                  <h2 className="absolute inset-x-[18%] top-0 bottom-0 flex items-center justify-center font-cinzel font-extrabold uppercase tracking-wide leading-[1.4] text-[#F5F3E0] text-[2.6cqw]" style={{ textShadow: CONTORNO }}>
                    <span className="truncate">{nome}</span>
                  </h2>
                </div>
              </div>
              {Array.from({ length: ESPACOS_POR_CATEGORIA }, (_, i) => {
                const carta = nelas[i];
                const rotulo = textoDaFicha(t.espaco, { n: i + 1, categoria: nome });
                return (
                  <button key={carta?.id ?? `vazio-${i}`} type="button" onClick={() => abrir(carta ? { tipo: 'carta', id: carta.id } : { tipo: 'cartas', filtro: categoria })} aria-label={carta ? `${rotulo}: ${TIPO_DE_CARTA_MAP[carta.tipo].nome}` : `${rotulo}: ${t.vazio}`} className="relative block w-full cursor-pointer active:translate-y-px" style={{ aspectRatio: PROPORCAO_DA_ALMA.moldura }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ALMA_UI.moldura[categoria]} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" style={pixel} />
                    <span className="absolute flex items-center justify-center" style={{ inset: '13% 14%' }}>
                      {carta ? <FaceDaCarta carta={carta} /> : <span className="font-cinzel font-black text-[5cqw] leading-none text-[#3A4A66]">+</span>}
                    </span>
                  </button>
                );
              })}
            </section>
          );
        })}
      </div>

      {/* a prateleira: as primeiras cartas guardadas; tocar abre todas */}
      <h2 className="font-cinzel font-extrabold uppercase text-[2.6cqw] leading-[1.4] text-[#DFF3FF] shrink-0" style={{ textShadow: CONTORNO }}>{textoDaFicha(t.cartas, { n: itens.length })}</h2>
      <section aria-label={textoDaFicha(t.cartas, { n: itens.length })} className="relative shrink-0 w-[92cqw]" style={{ aspectRatio: PROPORCAO_DA_ALMA.prateleira }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ALMA_UI.prateleira} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" style={pixel} />
        {ESPACOS_DA_PRATELEIRA.centros.map((x, i) => {
          const carta = guardadas[i];
          return (
            <button key={i} type="button" onClick={() => abrir({ tipo: 'cartas', filtro: 'todas' })} aria-label={carta ? `${TIPO_DE_CARTA_MAP[carta.tipo].nome}` : t.vazio} className="absolute flex items-center justify-center cursor-pointer active:translate-y-px" style={{ left: `${x - ESPACOS_DA_PRATELEIRA.largura / 2}%`, width: `${ESPACOS_DA_PRATELEIRA.largura}%`, top: `${ESPACOS_DA_PRATELEIRA.topo}%`, height: `${ESPACOS_DA_PRATELEIRA.altura}%` }}>
              {carta && <FaceDaCarta carta={carta} porLargura />}
            </button>
          );
        })}
      </section>

      {/* os detalhes de uma carta equipada */}
      {janela?.tipo === 'carta' && cartaAberta && (
        <JanelaDaAlma titulo={TIPO_DE_CARTA_MAP[cartaAberta.tipo].nome} aoFechar={() => setJanela(null)}>
          <Aviso />
          <CartaDaAlma carta={cartaAberta} destaque>
            <span className="mt-1"><button type="button" disabled={ocupado} onClick={() => void agir('desequipar', { id: cartaAberta.id }, true)} className={`${botao} border-[#B8862B] text-[#E9DDC0] bg-[#0B1220]`}>{t.desequipar}</button></span>
          </CartaDaAlma>
        </JanelaDaAlma>
      )}

      {/* as cartas guardadas: equipar, refinar, despertar e destruir */}
      {janela?.tipo === 'cartas' && (
        <JanelaDaAlma titulo={textoDaFicha(t.cartas, { n: itens.length })} aoFechar={() => setJanela(null)}>
          <div className="flex flex-wrap gap-[1.2cqw]">
            {(['todas', ...CATEGORIAS_DE_CARTA] as const).map((f) => (
              <button key={f} type="button" onClick={() => setJanela({ tipo: 'cartas', filtro: f })} aria-pressed={filtro === f} className={`${botao} ${filtro === f ? 'border-[#6FE3EE] text-[#DFF3FF] bg-[#0F5A6E]' : 'border-[#2B3F5C] text-[#9CC4E0] bg-[#0B1220]'}`}>
                {f === 'todas' ? t.todas : NOME_DA_CATEGORIA[f]}
              </button>
            ))}
          </div>
          <Aviso />
          {marcadas.length > 0 && (
            <div className="flex items-center gap-[2cqw] flex-wrap">
              <button type="button" disabled={ocupado} onClick={() => window.confirm(textoDaFicha(t.confirmarDestruir, { n: marcadas.length })) && void agir('destruir', { ids: marcadas })} className={`${botao} border-[#E5484D] text-[#FFB4B4] bg-[#0B1220]`}>{textoDaFicha(t.destruirSelecionadas, { n: marcadas.length })}</button>
              <span className="font-cinzel text-[2.2cqw] text-[#9CC4E0]">{textoDaFicha(t.cacosGanhos, { n: cacosDaSelecao })}</span>
            </div>
          )}
          {lista.length === 0 ? (
            <p role="status" className="font-cinzel font-bold text-[2.7cqw] text-center leading-snug text-[#9CC4E0] py-[5cqw]">{t.semCartas}</p>
          ) : (
            lista.map((c) => {
              const tipo = TIPO_DE_CARTA_MAP[c.tipo];
              const custo = CUSTO_DO_DESPERTAR[c.despertar];
              const despertavel = podeDespertar(tipo.raridade) && c.despertar < NIVEL_MAXIMO_DO_DESPERTAR;
              return (
                <CartaDaAlma key={c.id} carta={c}>
                  <span className="flex flex-wrap items-center gap-[1.4cqw] mt-1">
                    <label className="flex items-center gap-[0.8cqw] text-[11px]"><input type="checkbox" checked={marcadas.includes(c.id)} onChange={(e) => setMarcadas(e.target.checked ? [...marcadas, c.id] : marcadas.filter((x) => x !== c.id))} aria-label={textoDaFicha(t.marcar, { nome: tipo.nome })} /> {t.destruir}</label>
                    <button type="button" disabled={ocupado} onClick={() => void agir('equipar', { id: c.id })} className={`${botao} border-[#6FE3EE] text-[#DFF3FF] bg-[#0F5A6E]`}>{t.equipar}</button>
                    <button type="button" disabled={ocupado} onClick={() => setRefinando(refinando === c.id ? null : c.id)} className={`${botao} border-[#B8862B] text-[#E9DDC0] bg-[#0B1220]`}>{t.refinar}</button>
                    {despertavel && (
                      <button type="button" disabled={ocupado} onClick={() => void agir('despertar', { id: c.id })} className={`${botao} border-[#B8862B] text-[#E9DDC0] bg-[#0B1220]`}>
                        {textoDaFicha(t.despertar, { copias: custo.copias, poeira: custo.poeira, bonus: BONUS_DO_DESPERTAR_PERCENTUAL[c.despertar + 1] })}
                      </button>
                    )}
                  </span>
                  {despertavel && <span className="text-[10px] text-[#8d8574]">{textoDaFicha(t.copias, { n: copiasDe(c) })}</span>}
                  {refinando === c.id && (
                    <span className="flex flex-col gap-1 mt-1">
                      <span className="text-[11px] text-[#9CC4E0]">{textoDaFicha(t.escolhaEfeito, { custo: CACOS_PARA_REFINAR[tipo.raridade] })}</span>
                      {c.efeitos.map((e, i) => (
                        <button key={i} type="button" disabled={ocupado || cacos < CACOS_PARA_REFINAR[tipo.raridade]} onClick={() => void agir('refinar', { id: c.id, indice: i })} className={`${botao} border-[#B8862B] text-[#E9DDC0] bg-[#0B1220] text-left normal-case`}>{textoDoEfeito(e.efeito, e.valor)}</button>
                      ))}
                    </span>
                  )}
                </CartaDaAlma>
              );
            })
          )}
        </JanelaDaAlma>
      )}

      {/* os bônus de todas as cartas equipadas e da coleção */}
      {janela?.tipo === 'bonus' && (
        <JanelaDaAlma titulo={t.bonus} aoFechar={() => setJanela(null)}>
          <div className="flex flex-col gap-[0.8cqw] font-cinzel text-[2.5cqw] text-[#E9DDC0]">
            {[
              ['atqFisico', bonus.atqFisico],
              ['atqMagico', bonus.atqMagico],
              ['defesa', bonus.defesa],
              ['hp', bonus.hp],
              ['agilidade', bonus.agilidade],
              ['chanceCritico', bonus.chanceCritico],
              ['chanceEfeitos', bonus.chanceEfeitos],
            ]
              .filter(([, v]) => (v as number) > 0)
              .map(([k, v]) => <span key={k as string}>{textoDoEfeito(k as never, v as number)}</span>)}
            {Object.entries(bonus.atributos).filter(([, v]) => v > 0).map(([k, v]) => <span key={k}>{textoDoEfeito(k as never, v)}</span>)}
            {equipadas.length === 0 && bonus.atqFisico === 0 && <span className="text-[#9CC4E0]">{t.semBonus}</span>}
          </div>
        </JanelaDaAlma>
      )}
    </div>
  );
}
