'use client';

import React, { useState } from 'react';
import { KIT_DA_FORJA } from '@/assets/forjaUi';
import type { CharacterDocument } from '@/server/characterService';
import { type DetalhePecaTela, type MinhaPecaTela, orbesDaTela, xpDosOrbes } from '@/lib/armaduraTela';
import { BotaoDoKit, PainelDaForja, PlacaDeRaridade, TEXTO_PIXEL } from './KitDaForja';
import { CabecalhoDaSecao, Custo, Info, Material } from './PainelDaArma';
import { IconeDePeca, IconeDoOrbe } from './IconeDoMaterial';

const VERDE = '#7BE08C';
const AZUL = '#9CC4E0';
const pixel: React.CSSProperties = { imageRendering: 'pixelated' };
const estrelas = (n: number) => '★'.repeat(n);

/** A caixa de arte do kit com a peça grande, pintada na cor da raridade. */
function ArteDaPeca({ espaco, cor }: { espaco: DetalhePecaTela['espaco']; cor: string }) {
  return (
    <span className="relative block w-full" style={{ aspectRatio: '228 / 143' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={KIT_DA_FORJA.caixaArte} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full" style={pixel} />
      <span className="absolute inset-0 flex items-center justify-center">
        <IconeDePeca espaco={espaco} cor={cor} className="w-[17cqw] h-[17cqw] drop-shadow-[0_0_6px_rgba(111,227,238,0.35)]" />
      </span>
    </span>
  );
}

/** A barra de XP do nível da peça (a mesma do kit, com o texto do nível por cima). */
function BarraDeXp({ m }: { m: MinhaPecaTela }) {
  const pct = m.xpDoNivel === 0 ? 100 : Math.round((m.xpNoNivel / m.xpDoNivel) * 100);
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`XP do nível ${m.nivel}`} className="barra-pixel h-[3cqw] overflow-hidden">
      <div className="h-full" style={{ width: `${pct}%`, backgroundColor: '#2EE6D6', boxShadow: 'inset 0 -2px 0 #1FA89C' }} />
    </div>
  );
}

/**
 * A coluna da direita (como na referência): em cima o nome da peça, a arte, os materiais com quantos você tem e o custo;
 * embaixo as informações da peça (estilo, atributo fixo, atributo sorteado e habilidades).
 */
export function PainelDaPeca({ d }: { d: DetalhePecaTela }) {
  const receita = [...d.materiais, ...(d.diversos ? [d.diversos] : [])];
  return (
    <div className="flex flex-col gap-[2cqw]">
      <PainelDaForja as="section" aria-label={`Peça: ${d.nome}`} borda="2.6cqw" className="flex flex-col gap-[1.2cqw]">
        <PlacaDeRaridade raridade={d.raridade}>
          <h2 className="font-cinzel font-extrabold text-[3cqw] leading-tight text-[#F5F3E0] [text-shadow:1px_1px_0_#05070D]">{d.nome}</h2>
        </PlacaDeRaridade>
        <ArteDaPeca espaco={d.espaco} cor={d.cor} />
        <p className={`${TEXTO_PIXEL} text-[2.3cqw] text-center text-[#9CC4E0] leading-tight`}>
          <span style={{ color: d.cor }}>{d.raridadeNome}</span> · <span className="text-[#E7C46A]">{estrelas(d.estrela)}</span> {d.conjunto}
        </p>
        <section aria-label="Receita" className="flex flex-col">
          <CabecalhoDaSecao>Materiais necessários</CabecalhoDaSecao>
          {receita.map((m) => <Material key={m.id} m={m} />)}
          <CabecalhoDaSecao>Custo necessário</CabecalhoDaSecao>
          <Custo tem={d.ouro.tem} precisa={d.ouro.precisa} ok={d.ouro.ok} rotulo="" />
        </section>
      </PainelDaForja>

      <PainelDaForja as="section" aria-label="Informações da peça" borda="2.6cqw" className="flex flex-col">
        <CabecalhoDaSecao>Informações da peça</CabecalhoDaSecao>
        <Info rotulo="Peça">{d.espacoNome}</Info>
        <Info rotulo="Estilo">{d.estilo}</Info>
        <Info rotulo={d.fixo} cor="#F5F3E0">{d.fixoNivel0}<span className="text-[2.1cqw] font-normal text-[#9CC4E0]">(Nv. 30: {d.fixoNivel30})</span></Info>
        <Info rotulo="Atributo" cor={VERDE} empilhar>{d.sorteio}</Info>
        {d.minhas.length > 0 && <Info rotulo="Você tem" cor={VERDE}>{d.minhas.length}</Info>}
        {d.habilidades.length > 0 && <CabecalhoDaSecao>Habilidades</CabecalhoDaSecao>}
        {d.habilidades.map((h) => (
          <Info key={h.id} rotulo={`${h.nome} Nv. ${h.nivel}`} cor={AZUL} empilhar>{h.efeito}</Info>
        ))}
      </PainelDaForja>
    </div>
  );
}

/** A coluna da direita da aba Minhas: a peça do personagem, o nível, o XP e os orbes de armadura. */
export function PainelDaMinhaPeca({ m, espaco, estrela, character, ocupado, onUsarOrbes }: {
  m: MinhaPecaTela;
  espaco: DetalhePecaTela['espaco'];
  estrela: number;
  character: CharacterDocument;
  ocupado: boolean;
  onUsarOrbes: (orbes: Record<string, number>) => void;
}) {
  const [escolha, setEscolha] = useState<Record<string, number>>({});
  const orbes = orbesDaTela(character);
  const previa = xpDosOrbes(escolha, m.xp);
  const noMaximo = m.nivel >= 30;
  const mudar = (id: string, delta: number, tenho: number) => setEscolha((e) => ({ ...e, [id]: Math.max(0, Math.min(tenho, (e[id] ?? 0) + delta)) }));
  const usar = Object.fromEntries(Object.entries(escolha).filter(([, q]) => q > 0));
  return (
    <div className="flex flex-col gap-[2cqw]">
      <PainelDaForja as="section" aria-label={`Sua peça: ${m.nome}`} borda="2.6cqw" className="flex flex-col gap-[1.2cqw]">
        <PlacaDeRaridade raridade={m.raridade}>
          <h2 className="font-cinzel font-extrabold text-[3cqw] leading-tight text-[#F5F3E0] [text-shadow:1px_1px_0_#05070D]">{m.nome}</h2>
        </PlacaDeRaridade>
        <ArteDaPeca espaco={espaco} cor={m.cor} />
        <p className={`${TEXTO_PIXEL} text-[2.3cqw] text-center text-[#9CC4E0] leading-tight`}>
          <span className="text-[#E7C46A]">{estrelas(estrela)}</span> {m.espacoNome} · Nível {m.nivel}/30
        </p>
        <BarraDeXp m={m} />
        <p className={`${TEXTO_PIXEL} text-[2.3cqw] text-center text-[#C7D8E8] leading-tight tabular-nums`}>{noMaximo ? 'Nível máximo' : `${m.xpNoNivel}/${m.xpDoNivel} XP`}</p>
      </PainelDaForja>

      <PainelDaForja as="section" aria-label="Informações e orbes" borda="2.6cqw" className="flex flex-col">
        <CabecalhoDaSecao>Informações da peça</CabecalhoDaSecao>
        <Info rotulo="Fixo" cor="#F5F3E0">{m.fixo}</Info>
        <Info rotulo={m.atributo} cor={VERDE}>+{m.pontos}</Info>
        <Info rotulo="Reforjas">{m.reforjas}</Info>
        {!noMaximo && (
          <>
            <CabecalhoDaSecao>Orbes de armadura</CabecalhoDaSecao>
            {orbes.map((o) => (
              <div key={o.id} className="flex flex-col gap-[0.8cqw] py-[1cqw] border-b border-[#1C2D44]">
                <div className="flex items-center gap-[1.2cqw]">
                  <IconeDoOrbe cor={o.cor} className="w-[6cqw] h-[6cqw] shrink-0" />
                  <span className="font-cinzel font-bold text-[2.2cqw] leading-tight min-w-0 flex-1 [text-shadow:1px_1px_0_#05070D]" style={{ color: o.cor }}>
                    {o.nome}
                    <span className="block text-[#9CC4E0]">+{o.xp} XP · tem {o.tenho}</span>
                  </span>
                </div>
                <span className="inline-flex items-center justify-end gap-[1cqw]">
                  <button type="button" aria-label={`Menos ${o.nome}`} disabled={!escolha[o.id]} onClick={() => mudar(o.id, -1, o.tenho)} className={`${TEXTO_PIXEL} w-[5.4cqw] h-[5.4cqw] border border-[#3A5B7A] bg-[#0B0F1A] text-[3cqw] font-bold text-[#DFF3FF] leading-none enabled:cursor-pointer disabled:opacity-40`}>−</button>
                  <span className={`${TEXTO_PIXEL} min-w-[4cqw] text-center text-[2.8cqw] font-bold text-[#F5F3E0] tabular-nums`}>{escolha[o.id] ?? 0}</span>
                  <button type="button" aria-label={`Mais ${o.nome}`} disabled={(escolha[o.id] ?? 0) >= o.tenho} onClick={() => mudar(o.id, 1, o.tenho)} className={`${TEXTO_PIXEL} w-[5.4cqw] h-[5.4cqw] border border-[#3A5B7A] bg-[#0B0F1A] text-[3cqw] font-bold text-[#DFF3FF] leading-none enabled:cursor-pointer disabled:opacity-40`}>+</button>
                </span>
              </div>
            ))}
            {previa.total > 0 && (
              <p className={`${TEXTO_PIXEL} text-[2.3cqw] text-[#9CC4E0] leading-tight py-[1cqw]`}>
                +{previa.aproveitado} XP → nível {previa.nivelDepois}{previa.aproveitado < previa.total ? ` (${previa.total - previa.aproveitado} de XP se perdem no nível 30)` : ''}
              </p>
            )}
            <div className="pt-[1.2cqw]">
              <BotaoDoKit disabled={previa.total === 0 || ocupado} onClick={() => { onUsarOrbes(usar); setEscolha({}); }} className="w-full py-[0.8cqw]">Usar orbes</BotaoDoKit>
            </div>
          </>
        )}
      </PainelDaForja>
    </div>
  );
}
