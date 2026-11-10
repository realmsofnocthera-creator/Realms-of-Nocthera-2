'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FUNDO_DA_MOCHILA, ICONES_DE_ABA, ICONES_DE_SALDO } from '@/assets/mochilaUi';
import { KIT_DA_FORJA } from '@/assets/forjaUi';
import { ICONE_BILHETE } from '@/assets/forjaItens';
import { HUD_ICONS } from '@/assets/hud';
import type { CharacterDocument } from '@/server/characterService';
import {
  ABAS_DA_MOCHILA,
  detalheDoItem,
  itensDaAba,
  itensDaMochila,
  resumoDosEmblemas,
  saldosDaMochila,
  type AbaMochila,
  type ItemMochila,
  type SaldoMochila,
} from '@/lib/mochilaTela';
import { formatarCompacto } from '@/rules/numerosCompactos';
import { Abas, BarraDeTitulo, BotaoRedondo, FundoDaForja, PainelDaForja, PalcoDaForja, PlacaDeRaridade, SlotDeArma, TEXTO_PIXEL } from '@/components/forja/KitDaForja';
import { IconeDoMaterial, IconeDoOrbe } from '@/components/forja/IconeDoMaterial';
import { Info } from '@/components/forja/PainelDaArma';

const pixel: React.CSSProperties = { imageRendering: 'pixelated' };
const COLUNAS = 6;
const LINHAS_MINIMAS = 6;

/** O ícone de saldo de cada moeda (o ouro e o diamante vêm do HUD; os outros quatro são da folha da Mochila). */
const ICONE_DO_SALDO: Readonly<Record<SaldoMochila['id'], string>> = {
  ouro: HUD_ICONS.ouro,
  diamantes: HUD_ICONS.diamante,
  ...ICONES_DE_SALDO,
};

const ROTULO_CURTO: Readonly<Record<SaldoMochila['id'], string>> = {
  ouro: 'Ouro',
  diamantes: 'Diamantes',
  fragmentosAlma: 'Frag. de alma',
  essenciaHabilidade: 'Ess. de habilidade',
  fragmentosAscensao: 'Frag. de ascensão',
  essenciaDeSoberano: 'Ess. de Soberano',
};

/** O ícone de um item: o glifo do material pintado pela raridade, o orbe, ou o Bilhete de melhoria. */
function IconeDoItem({ item, className }: { item: ItemMochila; className: string }) {
  if (item.categoria === 'orbes') return <IconeDoOrbe cor={item.cor} className={className} />;
  if (item.categoria === 'especiais') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={ICONE_BILHETE} alt="" aria-hidden="true" draggable={false} className={`${className} object-contain`} style={pixel} />;
  }
  return <IconeDoMaterial id={item.id} nome={item.nome} cor={item.cor} className={className} tamanhoDaInicial="3.6cqw" />;
}

/** A raridade do slot do item (os especiais, que não têm raridade, usam a moldura roxa). */
const raridadeDoSlot = (i: ItemMochila) => i.raridade ?? 'epico';

/**
 * Mochila em pixel (kit azul e dourado): os saldos no topo, as abas com ícone, a grade de slots como no baú de itens e,
 * um pop-up com o detalhe do item tocado. Só lê o que o personagem já carrega (nenhuma leitura ou gravação nova).
 */
export function MochilaScreen({ character, abaInicial = 'todos', abertoInicial = null }: { character: CharacterDocument; abaInicial?: AbaMochila; abertoInicial?: string | null }) {
  const abas = useMemo(() => itensDaMochila(character.inventario), [character.inventario]);
  const [aba, setAba] = useState<AbaMochila>(abaInicial);
  const [aberto, setAberto] = useState<string | null>(abertoInicial);
  const itens = useMemo(() => itensDaAba(abas, aba), [abas, aba]);
  const contagem = (id: AbaMochila) => (id === 'todos' ? Object.values(abas).reduce((s, l) => s + l.length, 0) : abas[id].length);
  const abaAtual = ABAS_DA_MOCHILA.find((a) => a.id === aba)!;
  const vazia = contagem('todos') === 0;
  const item = itens.find((i) => i.id === aberto) ?? null;
  const detalhe = item ? detalheDoItem(item.id) : null;
  const emblemas = resumoDosEmblemas(character);
  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(null);
    };
    window.addEventListener('keydown', fechar);
    return () => window.removeEventListener('keydown', fechar);
  }, [aberto]);
  const celulas = Math.max(COLUNAS * LINHAS_MINIMAS, Math.ceil(itens.length / COLUNAS) * COLUNAS);

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
          <BarraDeTitulo titulo="Mochila" className="w-[58cqw]" />
        </header>

        <section aria-label="Saldos" className="grid grid-cols-3 gap-[1.2cqw] px-[3.4cqw] pt-[2.4cqw]">
          {saldosDaMochila(character).map((s) => (
            <div key={s.id} aria-label={`${s.rotulo}: ${s.valor}`} title={`${s.rotulo}: ${s.valor}`} className="pilula-pixel flex items-center gap-[1.2cqw] pl-[1cqw] pr-[1.6cqw] py-[0.8cqw] min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ICONE_DO_SALDO[s.id]} alt="" aria-hidden="true" draggable={false} className="w-[6.4cqw] h-[6.4cqw] object-contain shrink-0" style={pixel} />
              <span className="flex flex-col min-w-0 leading-none">
                <span className={`${TEXTO_PIXEL} text-[3cqw] font-bold text-[#F5F3E0] tabular-nums truncate`}>{formatarCompacto(s.numero)}</span>
                <span className="font-cinzel font-bold text-[1.9cqw] text-[#C9B27A] truncate mt-[0.5cqw]">{ROTULO_CURTO[s.id]}</span>
              </span>
            </div>
          ))}
        </section>

        <div className="px-[3.4cqw] pt-[2cqw]">
          <Abas<AbaMochila>
            rotulo="Categorias da mochila"
            ativa={aba}
            aoMudar={(a) => { setAba(a); setAberto(null); }}
            abas={ABAS_DA_MOCHILA.map((a) => ({ id: a.id, nome: a.nome, contagem: contagem(a.id), rotuloAcessivel: `${a.nome} (${contagem(a.id)})`, icone: ICONES_DE_ABA[a.id] }))}
          />
        </div>

        <div className="flex-1 min-h-0 px-[3.4cqw] pt-[1.4cqw]">
          <PainelDaForja as="section" aria-label={abaAtual.nome} className="h-full overflow-y-auto forja-rolagem">
            <ul className="grid gap-[1cqw]" style={{ gridTemplateColumns: `repeat(${COLUNAS}, 1fr)`, justifyItems: 'center' }}>
              {Array.from({ length: celulas }, (_, n) => {
                const i = itens[n];
                if (!i) {
                  return <li key={`v${n}`} aria-hidden="true" className="w-[13cqw] h-[13cqw] border border-[#1F3550] bg-[#080C16]/70" />;
                }
                return (
                  <li key={i.id} className="relative">
                    <button type="button" onClick={() => setAberto(i.id)} aria-pressed={item?.id === i.id} aria-label={`${i.nome}, ${i.quantidade} unidades. Ver detalhes`} className="block cursor-pointer active:translate-y-px">
                      <SlotDeArma raridade={raridadeDoSlot(i)} destaque={item?.id === i.id} tamanho="13cqw">
                        <IconeDoItem item={i} className="w-full h-full" />
                      </SlotDeArma>
                    </button>
                    <span aria-hidden="true" className={`${TEXTO_PIXEL} absolute bottom-[0.6cqw] right-[0.8cqw] px-[0.6cqw] py-[0.2cqw] bg-[#05070D]/85 text-[2.3cqw] font-bold text-[#F5F3E0] leading-none tabular-nums pointer-events-none`}>×{formatarCompacto(i.quantidade)}</span>
                  </li>
                );
              })}
            </ul>
            {itens.length === 0 && (
              <div role="status" className="flex flex-col items-center gap-[2cqw] pt-[3cqw] pb-[2cqw] text-center">
                <p className={`${TEXTO_PIXEL} text-[2.8cqw] text-[#8FB3D1] leading-snug px-[3cqw]`}>
                  {vazia ? 'Sua mochila está vazia. Os materiais e os orbes caem dos monstros da Caçada.' : abaAtual.vazio}
                </p>
                {vazia && (
                  <Link href="/cacada" className="font-cinzel font-extrabold uppercase text-[3cqw] text-[#DFF3FF] px-[4cqw] py-[1.4cqw] border border-[#3A8FB0] bg-[#0A1B2E]">Ir caçar</Link>
                )}
              </div>
            )}
          </PainelDaForja>
        </div>

        <div className="px-[3.4cqw] pt-[1.4cqw] pb-[3cqw]">
          <section aria-label="Emblemas" className="pilula-pixel flex items-center justify-between gap-[2cqw] px-[2.4cqw] py-[1cqw]">
            <span className="flex flex-col min-w-0 leading-tight">
              <span className="font-cinzel font-extrabold uppercase text-[2.4cqw] text-[#E7C46A]">Emblemas</span>
              <span className={`${TEXTO_PIXEL} text-[2.1cqw] text-[#C7D8E8]`}>{emblemas.texto}</span>
            </span>
            {emblemas.total > 0 && (
              <Link href="/personagem?aba=emblemas" className="shrink-0 font-cinzel font-extrabold uppercase text-[2.4cqw] text-[#DFF3FF] px-[2.4cqw] py-[1cqw] border border-[#3A8FB0] bg-[#0A1B2E]">Abrir emblemas</Link>
            )}
          </section>
        </div>
      </PalcoDaForja>

      {item && detalhe && (
        <div role="dialog" aria-modal="true" aria-label={item.nome} onClick={() => setAberto(null)} className="forja-palco !fixed inset-0 !z-50 !items-center !justify-center px-[6cqw]" style={{ backgroundColor: 'rgba(3,6,14,0.55)', left: 0, right: 0 }}>
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-[84cqw]">
            <BotaoRedondo tipo="x" rotulo="Fechar" onClick={() => setAberto(null)} className="absolute -top-[3.4cqw] -right-[2.4cqw] z-10 w-[9cqw] h-[9cqw]" />
            <PainelDaForja aria-label={`Detalhe: ${item.nome}`} borda="3cqw" className="max-h-[88dvh] overflow-y-auto forja-rolagem">
              <div className="flex flex-col gap-[2cqw]">
                <PlacaDeRaridade raridade={raridadeDoSlot(item)}>
                  <h2 className="font-cinzel font-extrabold text-[3.4cqw] leading-tight text-[#F5F3E0] [text-shadow:1px_1px_0_#05070D]">{detalhe.nome}</h2>
                </PlacaDeRaridade>
                <span className="relative block w-[62%] mx-auto" style={{ aspectRatio: '228 / 143' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={KIT_DA_FORJA.caixaArte} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full" style={pixel} />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <IconeDoItem item={item} className="w-[16cqw] h-[16cqw]" />
                  </span>
                </span>
                <p className={`${TEXTO_PIXEL} text-[3.2cqw] font-bold text-center text-[#7BE08C] tabular-nums`}>Você tem ×{item.quantidade.toLocaleString('pt-BR')}</p>
                <div className="flex flex-col">
                  {detalhe.linhas.map((l) => (
                    <Info key={l.rotulo} rotulo={l.rotulo} empilhar>{l.valor}</Info>
                  ))}
                </div>
              </div>
            </PainelDaForja>
          </div>
        </div>
      )}
    </main>
  );
}
