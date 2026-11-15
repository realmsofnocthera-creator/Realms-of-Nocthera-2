'use client';

import React from 'react';
import { Crown } from 'lucide-react';
import { iconeDeElemento } from '@/assets/elementos';
import { ICONE_DA_CATEGORIA, ICONE_DANO_FISICO, ICONE_DANO_MAGICO } from '@/assets/forjaItens';
import { SPRITE_MONSTRO } from '@/lib/cacadaArte';
import type { MonstroTela, TracoTela } from '@/lib/cacadaTela';
import { fichaDesbloqueada } from '@/rules/bestiario';
import { MODIFICADOR_FRAQUEZA, MODIFICADOR_RESISTENCIA_FORTE } from '@/rules/elements';
import { textoDaFicha } from '@/rules/textosDaFicha';
import { TEXTOS_DA_CACADA as T } from '@/rules/textosDaCacada';
import { IconeDoMaterial } from '../forja/IconeDoMaterial';
import { SlotDeArma } from '../forja/KitDaForja';
import { TINTA } from './JanelaDaCacada';

const pixel: React.CSSProperties = { imageRendering: 'pixelated' };

/** O que um ícone conta quando é tocado. */
export interface InfoDoIcone {
  titulo: string;
  texto: string;
}

/** O retrato do monstro (a arte, ou um quadrado com "?" enquanto não tem arte). */
export function Retrato({ monstro, tamanho }: { monstro: Pick<MonstroTela, 'id'>; tamanho: string }) {
  const arte = SPRITE_MONSTRO[monstro.id];
  return (
    <span
      aria-hidden="true"
      className="relative shrink-0 flex items-center justify-center overflow-hidden border-[0.4cqw]"
      style={{ width: tamanho, height: tamanho, borderColor: '#6B3A1E', background: 'rgba(88,41,20,0.22)' }}
    >
      {arte ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={arte.src} alt="" draggable={false} className="max-w-full max-h-full object-contain" style={pixel} />
      ) : (
        <span className="font-cinzel font-black leading-none opacity-60" style={{ color: TINTA, fontSize: `calc(${tamanho} * 0.55)` }}>?</span>
      )}
    </span>
  );
}

const TAMANHO_DO_ICONE = '5.6cqw';

/** Um ícone pequeno e tocável (fraqueza ou resistência), com moldura da cor do grupo. */
function Icone({ nome, cor, aoTocar, children }: { nome: string; cor: string; aoTocar: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={aoTocar}
      aria-label={textoDaFicha(T.iconeAria, { nome })}
      className="relative flex items-center justify-center border-[0.4cqw] cursor-pointer active:translate-y-px before:absolute before:-inset-[0.6cqw] before:content-[''] focus-visible:outline focus-visible:outline-[0.6cqw] focus-visible:outline-[#6FE3EE]"
      style={{ width: TAMANHO_DO_ICONE, height: TAMANHO_DO_ICONE, borderColor: cor, background: 'rgba(42,15,10,0.78)' }}
    >
      {children}
    </button>
  );
}

/** Um ícone ainda não descoberto: um "?" que, tocado, diz em que nível do Bestiário ele aparece. */
function IconeBloqueado({ nivel, aoTocar, moldura }: { nivel: number; aoTocar: (i: InfoDoIcone) => void; moldura?: boolean }) {
  const info = { titulo: T.naoDescoberto, texto: textoDaFicha(T.desbloqueiaNoNivel, { n: nivel }) };
  const conteudo = <span className="font-cinzel font-black leading-none text-[#FFE9B0] opacity-80" style={{ fontSize: '3cqw' }}>?</span>;
  return (
    <button
      type="button"
      onClick={() => aoTocar(info)}
      aria-label={T.naoDescoberto}
      className="relative flex items-center justify-center cursor-pointer active:translate-y-px before:absolute before:-inset-[0.6cqw] before:content-[''] focus-visible:outline focus-visible:outline-[0.6cqw] focus-visible:outline-[#6FE3EE]"
      style={{ width: TAMANHO_DO_ICONE, height: TAMANHO_DO_ICONE }}
    >
      {moldura ? <SlotDeArma raridade="comum" apagado tamanho={TAMANHO_DO_ICONE}>{conteudo}</SlotDeArma> : <span className="flex items-center justify-center w-full h-full border-[0.4cqw] border-[#6B3A1E]" style={{ background: 'rgba(42,15,10,0.78)' }}>{conteudo}</span>}
    </button>
  );
}

function iconeDoTraco(t: TracoTela): React.ReactNode {
  const src = t.elemento ? iconeDeElemento(t.elemento) : t.golpe === 'magico' ? ICONE_DANO_MAGICO : t.golpe === 'corte' ? ICONE_DA_CATEGORIA.katana : t.golpe === 'perfuracao' ? ICONE_DA_CATEGORIA.lanca : ICONE_DANO_FISICO;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" aria-hidden="true" draggable={false} className="w-[80%] h-[80%] object-contain pointer-events-none" style={pixel} />;
}

function GrupoDeIcones({ titulo, vazio, children }: { titulo: string; vazio: boolean; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="font-cinzel font-black uppercase text-[2cqw] leading-tight opacity-70">{titulo}</div>
      <div className="flex flex-wrap gap-[0.8cqw] pt-[0.4cqw]">{vazio ? <span className="font-cinzel font-bold text-[2.2cqw] opacity-70">{T.nenhuma}</span> : children}</div>
    </div>
  );
}

/**
 * A página da criatura: nome, retrato e, só em ícones tocáveis, fraquezas, resistências e drops (estes numa moldura da cor
 * da raridade). O que o Bestiário ainda não revelou (`nivelBestiario`, de 0 a 4) aparece como "?" tocável.
 */
export function DetalhesDoMonstro({ monstro, nivelBestiario, aoInfo, rodape }: { monstro: MonstroTela; nivelBestiario: number; aoInfo: (i: InfoDoIcone) => void; rodape?: React.ReactNode }) {
  const aberto = fichaDesbloqueada(nivelBestiario, monstro.drops.length);
  const metade = Math.ceil(monstro.drops.length / 2);
  return (
    <div className="h-full flex flex-col gap-[1.2cqw] overflow-hidden" style={{ color: TINTA }}>
      <div className="text-center">
        <h2 className="font-cinzel font-black text-[2.8cqw] leading-[1.1] flex items-center justify-center gap-[0.6cqw]">
          {monstro.chave && <Crown aria-label={T.monstroChave} style={{ width: '3cqw', height: '3cqw', color: '#B8832E' }} />}
          {monstro.nome}
        </h2>
        <div className="font-cinzel font-bold text-[2.2cqw] leading-tight opacity-80">{textoDaFicha(T.monstroNivel, { n: monstro.nivel })}</div>
      </div>
      <div className="flex justify-center"><Retrato monstro={monstro} tamanho="9.4cqw" /></div>
      <div className="grid grid-cols-2 gap-[1.2cqw]">
        <GrupoDeIcones titulo={T.fraquezas} vazio={aberto.fraquezas && !monstro.tracosFracos.length}>
          {aberto.fraquezas ? (
            monstro.tracosFracos.map((t) => (
              <Icone key={t.id} nome={t.nome} cor="#5FCB6A" aoTocar={() => aoInfo({ titulo: t.nome, texto: textoDaFicha(T.infoFraqueza, { n: t.elemento ? MODIFICADOR_FRAQUEZA : 25, nome: t.nome }) })}>{iconeDoTraco(t)}</Icone>
            ))
          ) : (
            <IconeBloqueado nivel={4} aoTocar={aoInfo} />
          )}
        </GrupoDeIcones>
        <GrupoDeIcones titulo={T.resistencias} vazio={aberto.resistencias && !monstro.tracosResistentes.length}>
          {aberto.resistencias ? (
            monstro.tracosResistentes.map((t) => (
              <Icone key={t.id} nome={t.nome} cor="#5AA7F0" aoTocar={() => aoInfo({ titulo: t.nome, texto: textoDaFicha(T.infoResistencia, { n: t.elemento ? -MODIFICADOR_RESISTENCIA_FORTE : 25, nome: t.nome }) })}>{iconeDoTraco(t)}</Icone>
            ))
          ) : (
            <IconeBloqueado nivel={3} aoTocar={aoInfo} />
          )}
        </GrupoDeIcones>
      </div>
      <GrupoDeIcones titulo={T.drops} vazio={!monstro.drops.length}>
        {monstro.drops.map((d, i) =>
          i < aberto.drops ? (
            <button
              key={d.id}
              type="button"
              aria-label={textoDaFicha(T.iconeAria, { nome: d.nome })}
              onClick={() => aoInfo({ titulo: textoDaFicha(T.infoDropTitulo, { nome: d.nome }), texto: textoDaFicha(T.infoDrop, { raridade: d.raridadeNome, chance: d.chance }) })}
              className="relative cursor-pointer active:translate-y-px before:absolute before:-inset-[0.4cqw] before:content-[''] focus-visible:outline focus-visible:outline-[0.6cqw] focus-visible:outline-[#6FE3EE]"
            >
              <SlotDeArma raridade={d.raridade} tamanho={TAMANHO_DO_ICONE}>
                <IconeDoMaterial id={d.id} nome={d.nome} cor={d.cor} className="w-full h-full" tamanhoDaInicial="2.4cqw" />
              </SlotDeArma>
            </button>
          ) : (
            <IconeBloqueado key={d.id} nivel={i < metade ? 1 : 2} aoTocar={aoInfo} moldura />
          )
        )}
      </GrupoDeIcones>
      {rodape && <div className="mt-auto flex justify-center">{rodape}</div>}
    </div>
  );
}
