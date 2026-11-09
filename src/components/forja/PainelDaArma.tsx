'use client';

import React from 'react';
import { KIT_DA_FORJA } from '@/assets/forjaUi';
import { ATTRIBUTE_ICONS } from '@/assets/icons';
import { HUD_ICONS } from '@/assets/hud';
import { IconesDeElementos } from '@/components/IconeDeElemento';
import { formatarCompacto } from '@/rules/numerosCompactos';
import type { CategoriaArma } from '@/rules/armas';
import type { DetalheArmaTela, DetalheMinhaArmaTela, LinhaReceitaTela } from '@/lib/forjaTela';
import { IconeCategoria } from './IconeDeCategoria';
import { IconeDoMaterial, EtiquetaDeStatus } from './IconeDoMaterial';
import { ICONE_DANO_FISICO, ICONE_DANO_MAGICO } from '@/assets/forjaItens';
import { AZUL_CLARO, PainelDaForja, PlacaDeRaridade, TEXTO_PIXEL } from './KitDaForja';
import { ROTULO_ESTADO, estrelas } from './PopupsDaForja';

const VERDE = '#7BE08C';
const VERMELHO = '#FF7A7A';
const pixel: React.CSSProperties = { imageRendering: 'pixelated' };

/** O ícone de um modificador de categoria (crítico usa a Sorte, como na ficha), pelo texto do modificador. */
export function iconeDoModificador(texto: string): string {
  const t = texto.toLowerCase();
  if (t.includes('crítico')) return ATTRIBUTE_ICONS.sorte;
  if (t.includes('dano físico')) return ICONE_DANO_FISICO;
  if (t.includes('dano mágico')) return ICONE_DANO_MAGICO;
  if (t.includes('agilidade')) return ATTRIBUTE_ICONS.agilidade;
  if (t.includes('defesa')) return ATTRIBUTE_ICONS.vitalidade;
  return ATTRIBUTE_ICONS.arcano;
}

const Ico = ({ src }: { src: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt="" aria-hidden="true" className="w-[4.6cqw] h-[4.6cqw] object-contain shrink-0" style={pixel} />
);

/** A faixa azul de título de uma seção, como "Required Materials" da referência. */
function CabecalhoDaSecao({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-cinzel font-extrabold uppercase text-[2.7cqw] leading-none text-center text-[#7FD3F2] py-[1.2cqw] border-y border-[#2B5C80] bg-[#0A1B2E]/80 [text-shadow:1px_1px_0_#05070D]">{children}</h3>
  );
}

/** Uma linha de informação com ícone à esquerda e valor à direita, como "Attack ... 180"; `empilhar` põe o valor numa segunda linha (textos longos). */
function Info({ icone, rotulo, children, cor, empilhar = false }: { icone?: string; rotulo: string; children: React.ReactNode; cor?: string; empilhar?: boolean }) {
  return (
    <div className={`flex ${empilhar ? 'flex-col items-stretch gap-[0.4cqw]' : 'items-center gap-[1.2cqw]'} py-[0.9cqw] border-b border-[#1C2D44]`}>
      <span className="flex items-center gap-[1.2cqw] min-w-0">
        {icone ? <Ico src={icone} /> : <span className="w-[4.6cqw] shrink-0" />}
        <span className={`${TEXTO_PIXEL} text-[2.5cqw] text-[#C7D8E8] leading-tight min-w-0`}>{rotulo}</span>
      </span>
      <span className={`${TEXTO_PIXEL} text-[2.6cqw] font-bold min-w-0 flex items-center gap-[0.8cqw] flex-wrap leading-tight ${empilhar ? 'justify-start pl-[5.8cqw]' : 'justify-end ml-auto text-right shrink-0'}`} style={{ color: cor ?? '#F5F3E0' }}>{children}</span>
    </div>
  );
}

/** O material da receita: o ícone (a inicial por enquanto), "Nome x3" e, à direita, quantos você tem. */
function Material({ m }: { m: LinhaReceitaTela }) {
  return (
    <div className="flex items-center gap-[1.4cqw] py-[0.9cqw] border-b border-[#1C2D44]">
      <span className="w-[6.4cqw] h-[6.4cqw] shrink-0 flex items-center justify-center border border-[#3A5B7A] bg-[#0B0F1A]" aria-hidden="true">
        <IconeDoMaterial id={m.id} nome={m.nome} cor={m.cor} className="w-[4.6cqw] h-[4.6cqw]" tamanhoDaInicial="3cqw" />
      </span>
      <span className="font-cinzel font-bold text-[2.5cqw] leading-tight min-w-0 flex-1 [text-shadow:1px_1px_0_#05070D]" style={{ color: m.cor }}>
        {m.nome}
        <span className="block text-[#DFF3FF]">× {m.precisa}</span>
      </span>
      <span className="flex items-center gap-[0.8cqw] shrink-0" aria-label={`Você tem ${m.tem}`}>
        <span className={`${TEXTO_PIXEL} text-[2.8cqw] font-bold tabular-nums`} style={{ color: m.ok ? VERDE : VERMELHO }}>{m.tem}</span>
      </span>
    </div>
  );
}

function Custo({ tem, precisa, ok, rotulo = 'Custo' }: { tem: number; precisa: number; ok: boolean; rotulo?: string }) {
  return (
    <div className="flex items-center gap-[1.4cqw] py-[1.2cqw]">
      <span className="font-cinzel font-extrabold uppercase text-[2.6cqw] text-[#7FD3F2]">{rotulo}</span>
      <span className="ml-auto flex items-center gap-[1cqw]" title={`${tem.toLocaleString('pt-BR')}/${precisa.toLocaleString('pt-BR')}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={HUD_ICONS.ouro} alt="" aria-hidden="true" className="w-[4.8cqw] h-[4.8cqw] object-contain" style={pixel} />
        <span className={`${TEXTO_PIXEL} text-[3.2cqw] font-bold tabular-nums`} style={{ color: ok ? '#F5F3E0' : VERMELHO }}>{formatarCompacto(precisa)}</span>
      </span>
    </div>
  );
}

/** A arte da arma na caixa do kit (o ícone da categoria por enquanto). */
function ArteDaArma({ categoria, cor }: { categoria: CategoriaArma; cor: string }) {
  return (
    <span className="relative block w-full" style={{ aspectRatio: '228 / 143' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={KIT_DA_FORJA.caixaArte} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full" style={pixel} />
      <span className="absolute inset-0 flex items-center justify-center">
        <IconeCategoria categoria={categoria} className="w-[15cqw] h-[15cqw]" style={{ color: cor, filter: `drop-shadow(0 0 7px ${cor})` }} />
      </span>
    </span>
  );
}

/**
 * A coluna da direita (como na referência): em cima o nome da arma, a arte, os materiais com quantos você tem e o
 * custo; embaixo as informações da arma (dano, elemento, status, atributo, bônus e penalidade).
 */
export function PainelDaArma({ d, categoria }: { d: DetalheArmaTela; categoria: CategoriaArma }) {
  const receita = [...d.materiais, ...(d.diversos ? [d.diversos] : [])];
  const mostraReceita = d.estado !== 'tenho' && d.estado !== 'superada';
  return (
    <div className="flex flex-col gap-[2cqw]">
      <PainelDaForja as="section" aria-label={`Arma: ${d.nome}`} borda="2.6cqw" className="flex flex-col gap-[1.2cqw]">
        <PlacaDeRaridade raridade={d.raridade}>
          <h2 className="font-cinzel font-extrabold text-[3cqw] leading-tight text-[#F5F3E0] [text-shadow:1px_1px_0_#05070D]">{d.nome}</h2>
        </PlacaDeRaridade>
        <ArteDaArma categoria={categoria} cor={d.cor} />
        <p className={`${TEXTO_PIXEL} text-[2.3cqw] text-center text-[#9CC4E0] leading-tight`}>
          <span style={{ color: d.cor }}>{d.raridadeNome}</span> · <span className="text-[#E7C46A]">{estrelas(d.estrela)}</span> {d.monstroNome}{d.ramoNome ? ` › ${d.ramoNome}` : ''}
        </p>
        {mostraReceita ? (
          <section aria-label="Receita" className="flex flex-col">
            <CabecalhoDaSecao>Materiais necessários</CabecalhoDaSecao>
            {d.consome && (
              <div className="flex items-center gap-[1.4cqw] py-[0.9cqw] border-b border-[#1C2D44]">
                <span className={`${TEXTO_PIXEL} text-[2.5cqw] text-[#C7D8E8]`}>Consome</span>
                <span className="font-cinzel font-bold text-[2.5cqw] ml-auto text-right leading-tight" style={{ color: d.consome.tenho ? VERDE : VERMELHO }}>{d.consome.nome} {d.consome.tenho ? '✓' : '✗'}</span>
              </div>
            )}
            {receita.map((m) => <Material key={m.id} m={m} />)}
            <CabecalhoDaSecao>Custo necessário</CabecalhoDaSecao>
            <Custo tem={d.ouro.tem} precisa={d.ouro.precisa} ok={d.ouro.ok} rotulo="" />
          </section>
        ) : (
          <p className={`${TEXTO_PIXEL} text-[2.7cqw] font-bold text-center py-[2cqw]`} style={{ color: AZUL_CLARO }}>{ROTULO_ESTADO[d.estado]}</p>
        )}
      </PainelDaForja>

      <PainelDaForja as="section" aria-label="Informações da arma" borda="2.6cqw" className="flex flex-col">
        <CabecalhoDaSecao>Informações da arma</CabecalhoDaSecao>
        <Info icone={iconeDoModificador(d.tipoDano)} rotulo={d.tipoDano}>{d.danoFixo}{d.subtipo && <span className="text-[2.1cqw] font-normal text-[#9CC4E0]">({d.subtipo})</span>}</Info>
        {d.elementos.length > 0 && (
          <Info rotulo="Elemento"><IconesDeElementos elementos={d.elementos} tamanho={18} /></Info>
        )}
        {d.status.length > 0 && (
          <Info rotulo="Status">
            {d.status.map((s) => <EtiquetaDeStatus key={s} nome={s} tamanho="3.4cqw" className="px-[1cqw] py-[0.4cqw] bg-[#0B0F1A] border border-[#3A5B7A] text-[2.2cqw] leading-none text-[#BFE3FF]" />)}
          </Info>
        )}
        <Info icone={ATTRIBUTE_ICONS.sorte} rotulo="Atributo" empilhar>
          <span className="text-[2.2cqw] font-normal text-[#BFE3FF] leading-tight">{d.atributoSorteado}</span>
        </Info>
        {d.minha && <Info rotulo="Sua arma" cor={VERDE}>{d.minha.atributo} +{d.minha.pontos}</Info>}
        <Info icone={iconeDoModificador(d.bonus)} rotulo="Bônus" cor="#9BF0B2" empilhar>{d.bonus}</Info>
        <Info icone={iconeDoModificador(d.penalidade)} rotulo="Penalidade" cor="#FFB4B4" empilhar>{d.penalidade}</Info>
      </PainelDaForja>
    </div>
  );
}

/** O resumo de uma arma que o personagem tem (aba Minhas): arte, atributo sorteado, dano, elemento e status. */
export function PainelDaMinhaArma({ d }: { d: DetalheMinhaArmaTela }) {
  return (
    <div className="flex flex-col gap-[2cqw]">
      <PainelDaForja as="section" aria-label={`Sua arma: ${d.nome}`} borda="2.6cqw" className="flex flex-col gap-[1.2cqw]">
        <PlacaDeRaridade raridade={d.raridade}>
          <h2 className="font-cinzel font-extrabold text-[3cqw] leading-tight text-[#F5F3E0] [text-shadow:1px_1px_0_#05070D]">{d.nome}</h2>
        </PlacaDeRaridade>
        <ArteDaArma categoria={d.categoria} cor={d.cor} />
        <p className={`${TEXTO_PIXEL} text-[2.3cqw] text-center text-[#9CC4E0] leading-tight`}>
          <span style={{ color: d.cor }}>{d.raridadeNome}</span> · <span className="text-[#E7C46A]">{estrelas(d.estrela)}</span> {d.monstroNome}
        </p>
      </PainelDaForja>
      <PainelDaForja as="section" aria-label="Informações da arma" borda="2.6cqw" className="flex flex-col">
        <CabecalhoDaSecao>Informações da arma</CabecalhoDaSecao>
        <Info icone={iconeDoModificador(d.tipoDano)} rotulo={d.tipoDano}>
          {d.danoFixo}
          {d.danoFixo !== d.danoFixoBase && <span className="text-[2.1cqw] font-normal text-[#9CC4E0]">(base {d.danoFixoBase})</span>}
        </Info>
        {d.elementos.length > 0 && <Info rotulo="Elemento"><IconesDeElementos elementos={d.elementos} tamanho={18} /></Info>}
        {d.status.length > 0 && (
          <Info rotulo="Status">
            {d.status.map((s) => <EtiquetaDeStatus key={s} nome={s} tamanho="3.4cqw" className="px-[1cqw] py-[0.4cqw] bg-[#0B0F1A] border border-[#3A5B7A] text-[2.2cqw] leading-none text-[#BFE3FF]" />)}
          </Info>
        )}
        <Info icone={ATTRIBUTE_ICONS.sorte} rotulo="Atributo" cor={VERDE} empilhar>{d.atributo} +{d.pontos}</Info>
        <Info rotulo="Reforjas">{d.reforjas}</Info>
        {d.mitica && <Info rotulo="Customização" empilhar>{d.pontosCustomizacao}/20 pontos</Info>}
      </PainelDaForja>
    </div>
  );
}
