'use client';

import React from 'react';
import { KIT_DA_FORJA } from '@/assets/forjaUi';
import { ATTRIBUTE_ICONS } from '@/assets/icons';
import { HUD_ICONS } from '@/assets/hud';
import { IconesDeElementos } from '@/components/IconeDeElemento';
import type { OpcaoCustomizacao } from '@/rules/armas';
import { formatarCompacto } from '@/rules/numerosCompactos';
import type { CategoriaArma } from '@/rules/armas';
import { COR_RARIDADE_ARMA, type DetalheMinhaArmaTela, type EstadoNoForja, type LinhaReceitaTela } from '@/lib/forjaTela';
import { IconeCategoria } from './IconeDeCategoria';
import { IconeDoMaterial, EtiquetaDeStatus } from './IconeDoMaterial';
import { ICONE_BILHETE, ICONE_DANO_FISICO, ICONE_DANO_MAGICO } from '@/assets/forjaItens';
import { AZUL_CLARO, BotaoDoKit, BotaoRedondo, DivisorDaForja, PainelDaForja, PlacaDeRaridade, SlotDeArma, TEXTO_PIXEL } from './KitDaForja';

const VERDE = '#7BE08C';
const VERMELHO = '#FF7A7A';
export const estrelas = (n: number) => '★'.repeat(n);

export const ROTULO_ESTADO: Readonly<Record<EstadoNoForja, string>> = {
  tenho: 'Você tem esta arma',
  superada: 'Você já evoluiu além desta arma',
  disponivel: 'Pronta para forjar',
  faltaMaterial: 'Falta material ou ouro',
  bloqueada: 'Falta a arma anterior da árvore',
};

const NOME_OPCAO: Readonly<Record<OpcaoCustomizacao, string>> = { dano: 'Dano', atributo: 'Atributo secundário', status: 'Mais status' };
export const nomeDaOpcao = (o: OpcaoCustomizacao) => NOME_OPCAO[o];

/** A janela por cima da tela: o painel do kit com o botão de fechar. */
function JanelaDaForja({ rotulo, aoFechar, children }: { rotulo: string; aoFechar: () => void; children: React.ReactNode }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={rotulo} onClick={aoFechar} className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 px-2.5 py-3">
      <PainelDaForja borda="16px" onClick={(e) => e.stopPropagation()} className="relative w-full max-w-[380px] max-h-[93dvh] overflow-y-auto">
        <div className="relative flex flex-col gap-2 px-0.5 pt-0.5 pb-1">
          <BotaoRedondo tipo="x" rotulo="Fechar" onClick={aoFechar} className="absolute -top-3 -right-3 z-10 w-9 h-9" />
          {children}
        </div>
      </PainelDaForja>
    </div>
  );
}

/** A caixa de arte do kit com o ícone grande da arma (a arte de cada arma entra depois). */
export function CaixaDeArteDaArma({ categoria, cor }: { categoria: CategoriaArma; cor: string }) {
  return (
    <span className="relative block w-[62%] mx-auto" style={{ aspectRatio: '228 / 143' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={KIT_DA_FORJA.caixaArte} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full" style={{ imageRendering: 'pixelated' }} />
      <span className="absolute inset-0 flex items-center justify-center">
        <IconeCategoria categoria={categoria} className="w-14 h-14" style={{ color: cor, filter: `drop-shadow(0 0 7px ${cor})` }} />
      </span>
    </span>
  );
}

/** Uma linha de informação: ícone, rótulo curto e valor. */
export function LinhaDoKit({ icone, rotulo, children, cor }: { icone?: React.ReactNode; rotulo: string; children: React.ReactNode; cor?: string }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-[#080C16]/85 border border-[#243B55]">
      {icone && <span className="w-6 h-6 shrink-0 flex items-center justify-center">{icone}</span>}
      <span className={`${TEXTO_PIXEL} text-[11px] text-[#8FB3D1] shrink-0`}>{rotulo}</span>
      <span className={`${TEXTO_PIXEL} text-[12px] font-bold ml-auto text-right min-w-0 flex items-center justify-end gap-1 flex-wrap`} style={{ color: cor ?? '#F5F3E0' }}>{children}</span>
    </div>
  );
}

const iconeDoAtributo = (src: string) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt="" aria-hidden="true" className="w-6 h-6 object-contain" style={{ imageRendering: 'pixelated' }} />
);

/** O material da receita: o slot com a inicial (os materiais de monstro entram depois), o nome e `tem/precisa`. */
function LinhaDeMaterial({ m }: { m: LinhaReceitaTela }) {
  return (
    <div className="flex items-center gap-2 px-1.5 py-1 bg-[#080C16]/85 border border-[#243B55]">
      <span className="relative w-7 h-7 shrink-0 flex items-center justify-center border border-[#3A5B7A] bg-[#0B0F1A]" aria-hidden="true">
        <IconeDoMaterial id={m.id} nome={m.nome} cor={m.cor} className="w-5 h-5" tamanhoDaInicial="13px" />
      </span>
      <span className="font-cinzel font-bold text-[12px] leading-tight min-w-0 flex-1" style={{ color: m.cor }}>{m.nome}</span>
      <span className={`${TEXTO_PIXEL} text-[12px] font-bold tabular-nums shrink-0`} style={{ color: m.ok ? VERDE : VERMELHO }}>{m.tem}/{m.precisa}</span>
    </div>
  );
}

function LinhaDeOuro({ tem, precisa, ok, rotulo = 'Custo' }: { tem: number; precisa: number; ok: boolean; rotulo?: string }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-[#080C16]/85 border border-[#E7C46A]/40">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={HUD_ICONS.ouro} alt="" aria-hidden="true" className="w-6 h-6 object-contain" style={{ imageRendering: 'pixelated' }} />
      <span className={`${TEXTO_PIXEL} text-[11px] text-[#8FB3D1]`}>{rotulo}</span>
      <span className={`${TEXTO_PIXEL} text-[12px] font-bold ml-auto tabular-nums`} style={{ color: ok ? VERDE : VERMELHO }} title={`${tem.toLocaleString('pt-BR')}/${precisa.toLocaleString('pt-BR')}`}>
        {formatarCompacto(tem)}/{formatarCompacto(precisa)}
      </span>
    </div>
  );
}

function Erro({ texto }: { texto: string | null }) {
  if (!texto) return null;
  return <div role="alert" className={`px-2 py-1.5 bg-[#4A1620] border border-[#E5484D] ${TEXTO_PIXEL} text-[12px] font-bold text-[#FFD2D2]`}>{texto}</div>;
}

const Chip = ({ children }: { children: React.ReactNode }) => (
  <span className="px-1.5 py-0.5 bg-[#0B0F1A] border border-[#3A5B7A] text-[10px] leading-none text-[#BFE3FF]">{children}</span>
);

/** O que a arma faz: dano, elementos e status (as linhas comuns aos dois pop-ups). */
export function LinhasDaArma({ tipoDano, subtipo, dano, danoBase, elementos, status }: { tipoDano: 'Dano físico' | 'Dano mágico'; subtipo?: string | null; dano: number; danoBase?: number; elementos: string[]; status: string[] }) {
  return (
    <>
      <LinhaDoKit icone={iconeDoAtributo(tipoDano === 'Dano físico' ? ICONE_DANO_FISICO : ICONE_DANO_MAGICO)} rotulo={tipoDano + (subtipo ? ` (${subtipo})` : '')}>
        {dano}
        {danoBase !== undefined && danoBase !== dano && <span className="text-[10px] text-[#8FB3D1]">(base {danoBase})</span>}
      </LinhaDoKit>
      {elementos.length > 0 && (
        <LinhaDoKit rotulo="Elemento">
          <IconesDeElementos elementos={elementos} tamanho={20} />
        </LinhaDoKit>
      )}
      {status.length > 0 && (
        <LinhaDoKit rotulo="Status">
          {status.map((s) => <Chip key={s}><EtiquetaDeStatus nome={s} tamanho="14px" /></Chip>)}
        </LinhaDoKit>
      )}
    </>
  );
}

/** O pop-up de uma arma que o personagem tem: reforjar (sorteia os pontos de novo) e, nas Míticas, customizar. */
export function FolhaMinhaArma({ detalhe: d, ocupado, erro, onFechar, onReforjar, onCustomizar }: {
  detalhe: DetalheMinhaArmaTela;
  ocupado: boolean;
  erro: string | null;
  onFechar: () => void;
  onReforjar: () => void;
  onCustomizar: (opcao: OpcaoCustomizacao) => void;
}) {
  const receita = [...d.reforja.materiais, ...(d.reforja.diversos ? [d.reforja.diversos] : [])];
  const cust = d.customizacao;
  return (
    <JanelaDaForja rotulo={`Sua arma: ${d.nome}`} aoFechar={onFechar}>
      <PlacaDeRaridade raridade={d.raridade}>
        <h2 className="font-cinzel font-extrabold text-[15px] leading-tight text-[#F5F3E0] [text-shadow:1px_1px_0_#05070D]">{d.nome}</h2>
      </PlacaDeRaridade>
      <p className={`${TEXTO_PIXEL} text-[11px] text-center text-[#8FB3D1] -mt-1`}>
        <span style={{ color: d.cor }}>{d.raridadeNome}</span> · {d.categoriaNome} · <span className="text-[#E7C46A]">{estrelas(d.estrela)}</span> {d.monstroNome}
      </p>
      <CaixaDeArteDaArma categoria={d.categoria} cor={d.cor} />

      <div className="flex flex-col gap-1">
        <LinhasDaArma tipoDano={d.tipoDano} dano={d.danoFixo} danoBase={d.danoFixoBase} elementos={d.elementos} status={d.status} />
        <LinhaDoKit rotulo="Atributo" cor={VERDE}>{d.atributo} +{d.pontos}</LinhaDoKit>
        <LinhaDoKit rotulo="Reforjas feitas">{d.reforjas}</LinhaDoKit>
      </div>

      <DivisorDaForja />
      <section aria-label="Reforjar" className="flex flex-col gap-1">
        <h3 className="font-cinzel font-extrabold uppercase text-[11px] tracking-wider text-[#E7C46A]">Reforjar ({d.reforja.percentual}% da receita)</h3>
        {receita.map((m) => <LinhaDeMaterial key={m.id} m={m} />)}
        <LinhaDeOuro tem={d.reforja.ouro.tem} precisa={d.reforja.ouro.precisa} ok={d.reforja.ouro.ok} />
        <BotaoDoKit disabled={!d.reforja.pode || ocupado} onClick={onReforjar} className="w-full py-1 mt-0.5">
          {ocupado ? 'Forjando...' : d.reforja.pode ? 'Reforjar' : 'Falta material ou ouro'}
        </BotaoDoKit>
      </section>

      <DivisorDaForja />
      {cust ? (
        <section aria-label="Customização" className="flex flex-col gap-1">
          <h3 className="font-cinzel font-extrabold uppercase text-[11px] tracking-wider text-[#E7C46A]">Customização ({d.pontosCustomizacao}/{cust.maximo} pontos)</h3>
          <div role="progressbar" aria-valuemin={0} aria-valuemax={cust.maximo} aria-valuenow={d.pontosCustomizacao} aria-label="Pontos de Customização" className="barra-pixel h-2.5 overflow-hidden">
            <div className="h-full" style={{ width: `${(d.pontosCustomizacao / cust.maximo) * 100}%`, backgroundColor: '#2EE6D6', boxShadow: 'inset 0 -2px 0 #1FA89C' }} />
          </div>
          <LinhaDeOuro tem={cust.ouroPorPonto.tem} precisa={cust.ouroPorPonto.precisa} ok={cust.ouroPorPonto.ok} rotulo="Por ponto" />
          <div className="flex items-center gap-2 px-2 py-1 bg-[#080C16]/85 border border-[#243B55]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ICONE_BILHETE} alt="" aria-hidden="true" draggable={false} className="w-6 h-6 object-contain" style={{ imageRendering: 'pixelated' }} />
            <span className="font-cinzel font-bold text-[12px]" style={{ color: '#D6B0FF' }}>{cust.bilhete.nome}</span>
            <span className={`${TEXTO_PIXEL} text-[12px] font-bold ml-auto tabular-nums`} style={{ color: cust.bilhete.ok ? VERDE : VERMELHO }}>{cust.bilhete.tem}/{cust.bilhete.precisa}</span>
          </div>
          {cust.opcoes.map((o) => (
            <div key={o.id} className="flex items-center gap-2 px-2 py-1 bg-[#080C16]/85 border border-[#243B55]">
              <span className="min-w-0 flex-1 flex flex-col leading-tight">
                <span className={`${TEXTO_PIXEL} text-[12px] font-bold text-[#F5F3E0]`}>{o.nome} <span className="text-[#8FB3D1] font-normal">({o.pontos} pt · {o.atual})</span></span>
                <span className="text-[10px] text-[#8FB3D1]">{o.disponivel ? `Cada ponto: ${o.porPonto}` : 'Esta arma não tem status'}</span>
              </span>
              <BotaoDoKit disabled={!cust.pode || !o.disponivel || ocupado} onClick={() => onCustomizar(o.id)} className="shrink-0 !px-1 min-w-[52px]">
                <span aria-label={`Adicionar ponto em ${o.nome}`}>+ 1</span>
              </BotaoDoKit>
            </div>
          ))}
          {cust.noMaximo && <p className={`${TEXTO_PIXEL} text-[12px] font-bold text-center`} style={{ color: VERDE }}>Customização no máximo</p>}
        </section>
      ) : (
        <p className={`${TEXTO_PIXEL} text-[10px] text-center text-[#8FB3D1]`}>Só as armas Míticas podem ser customizadas.</p>
      )}

      <Erro texto={erro} />
    </JanelaDaForja>
  );
}

/** O slot de uma arma com o ícone da categoria (usado na árvore, na lista e em Minhas armas). */
export function SlotComIcone({ categoria, raridade, destaque, apagado, tamanho, selo }: { categoria: CategoriaArma; raridade: keyof typeof COR_RARIDADE_ARMA; destaque?: boolean; apagado?: boolean; tamanho?: number | string; selo?: 'tenho' | 'bloqueada' | 'faltaMaterial' | null }) {
  return (
    <SlotDeArma raridade={raridade} destaque={destaque} apagado={apagado} tamanho={tamanho} selo={selo}>
      <IconeCategoria categoria={categoria} className="w-full h-full" style={{ color: COR_RARIDADE_ARMA[raridade] }} />
    </SlotDeArma>
  );
}
