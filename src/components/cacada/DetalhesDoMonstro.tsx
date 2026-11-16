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

/** O maior ícone (em cqw) e o espaço entre ícones. */
const ICONE_MAXIMO = 4.8;
const ESPACO = 0.6;

/**
 * O tamanho do ícone para `quantos` ícones caberem numa linha só de `largura` cqw (sem quebrar para outra linha, para a
 * página nunca crescer): até 4,8 cqw, menor quando há muitos.
 */
export function tamanhoDoIcone(quantos: number, largura: number): string {
  const cabem = quantos > 0 ? (largura - ESPACO * (quantos - 1)) / quantos : ICONE_MAXIMO;
  return `${Math.floor(Math.min(ICONE_MAXIMO, cabem) * 100) / 100}cqw`;
}

/** Um ícone pequeno e tocável (fraqueza ou resistência), com moldura da cor do grupo. */
function Icone({ nome, cor, tamanho, aoTocar, children }: { nome: string; cor: string; tamanho: string; aoTocar: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={aoTocar}
      aria-label={textoDaFicha(T.iconeAria, { nome })}
      className="relative flex items-center justify-center border-[0.4cqw] cursor-pointer active:translate-y-px before:absolute before:-inset-[0.6cqw] before:content-[''] focus-visible:outline focus-visible:outline-[0.6cqw] focus-visible:outline-[#6FE3EE]"
      style={{ width: tamanho, height: tamanho, borderColor: cor, background: 'rgba(42,15,10,0.78)' }}
    >
      {children}
    </button>
  );
}

/** Um ícone ainda não descoberto: um "?" que, tocado, diz em que nível do Bestiário ele aparece. */
function IconeBloqueado({ nivel, tamanho, aoTocar, moldura }: { nivel: number; tamanho: string; aoTocar: (i: InfoDoIcone) => void; moldura?: boolean }) {
  const info = { titulo: T.naoDescoberto, texto: textoDaFicha(T.desbloqueiaNoNivel, { n: nivel }) };
  const conteudo = <span className="font-cinzel font-black leading-none text-[#FFE9B0] opacity-80" style={{ fontSize: '2.8cqw' }}>?</span>;
  return (
    <button
      type="button"
      onClick={() => aoTocar(info)}
      aria-label={T.naoDescoberto}
      className="relative flex items-center justify-center cursor-pointer active:translate-y-px before:absolute before:-inset-[0.6cqw] before:content-[''] focus-visible:outline focus-visible:outline-[0.6cqw] focus-visible:outline-[#6FE3EE]"
      style={{ width: tamanho, height: tamanho }}
    >
      {moldura ? <SlotDeArma raridade="comum" apagado tamanho={tamanho}>{conteudo}</SlotDeArma> : <span className="flex items-center justify-center w-full h-full border-[0.4cqw] border-[#6B3A1E]" style={{ background: 'rgba(42,15,10,0.78)' }}>{conteudo}</span>}
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
    <div className="min-w-0 shrink-0">
      <div className="font-cinzel font-black uppercase text-[2cqw] leading-tight opacity-70">{titulo}</div>
      <div className="flex flex-nowrap gap-[0.6cqw] pt-[0.2cqw]">{vazio ? <span className="font-cinzel font-bold text-[2.2cqw] opacity-70">{T.nenhuma}</span> : children}</div>
    </div>
  );
}

/** A largura útil (cqw) da página e de cada coluna ao lado do retrato. */
const LARGURA_DA_PAGINA = 25;
const LARGURA_AO_LADO_DO_RETRATO = 14.2;

/**
 * A página da criatura: nome, retrato e, só em ícones tocáveis, fraquezas, resistências e drops (estes numa moldura da cor
 * da raridade). O que o Bestiário ainda não revelou (`nivelBestiario`, de 0 a 4) aparece como "?" tocável. Cada grupo de
 * ícones cabe numa linha só (o ícone encolhe quando há muitos), e `rodape` (o botão Caçar) fica sempre à vista, no fim da
 * página, qualquer que seja o tamanho do nome ou da lista de drops.
 */
export function DetalhesDoMonstro({ monstro, nivelBestiario, aoInfo, rodape }: { monstro: MonstroTela; nivelBestiario: number; aoInfo: (i: InfoDoIcone) => void; rodape?: React.ReactNode }) {
  const aberto = fichaDesbloqueada(nivelBestiario, monstro.drops.length);
  const metade = Math.ceil(monstro.drops.length / 2);
  const tamFracos = tamanhoDoIcone(aberto.fraquezas ? monstro.tracosFracos.length : 1, LARGURA_AO_LADO_DO_RETRATO);
  const tamResistentes = tamanhoDoIcone(aberto.resistencias ? monstro.tracosResistentes.length : 1, LARGURA_AO_LADO_DO_RETRATO);
  const tamDrops = tamanhoDoIcone(monstro.drops.length, LARGURA_DA_PAGINA);
  return (
    <div className="h-full flex flex-col gap-[1cqw]" style={{ color: TINTA }}>
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-[0.8cqw]">
        <div className="text-center shrink-0">
          <h2 className="font-cinzel font-black text-[2.4cqw] leading-[1.08] line-clamp-2 [overflow-wrap:anywhere]">
            {monstro.nome}
          </h2>
          <div className="font-cinzel font-bold text-[2cqw] leading-tight opacity-80">{textoDaFicha(T.monstroNivel, { n: monstro.nivel })}</div>
        </div>
        <div className="flex items-start gap-[1.2cqw] shrink-0">
          <span className="relative shrink-0">
            <Retrato monstro={monstro} tamanho="8.8cqw" />
            {monstro.chave && <Crown aria-label={T.monstroChave} className="absolute -top-[1.2cqw] -left-[1.2cqw]" style={{ width: '3cqw', height: '3cqw', color: '#B8832E', filter: 'drop-shadow(0 0 0.2cqw #2A0F0A)' }} />}
          </span>
          <div className="flex flex-col gap-[0.8cqw] min-w-0">
            <GrupoDeIcones titulo={T.fraquezas} vazio={aberto.fraquezas && !monstro.tracosFracos.length}>
              {aberto.fraquezas ? (
                monstro.tracosFracos.map((t) => (
                  <Icone key={t.id} nome={t.nome} cor="#5FCB6A" tamanho={tamFracos} aoTocar={() => aoInfo({ titulo: t.nome, texto: textoDaFicha(T.infoFraqueza, { n: t.elemento ? MODIFICADOR_FRAQUEZA : 25, nome: t.nome }) })}>{iconeDoTraco(t)}</Icone>
                ))
              ) : (
                <IconeBloqueado nivel={4} tamanho={tamFracos} aoTocar={aoInfo} />
              )}
            </GrupoDeIcones>
            <GrupoDeIcones titulo={T.resistencias} vazio={aberto.resistencias && !monstro.tracosResistentes.length}>
              {aberto.resistencias ? (
                monstro.tracosResistentes.map((t) => (
                  <Icone key={t.id} nome={t.nome} cor="#5AA7F0" tamanho={tamResistentes} aoTocar={() => aoInfo({ titulo: t.nome, texto: textoDaFicha(T.infoResistencia, { n: t.elemento ? -MODIFICADOR_RESISTENCIA_FORTE : 25, nome: t.nome }) })}>{iconeDoTraco(t)}</Icone>
                ))
              ) : (
                <IconeBloqueado nivel={3} tamanho={tamResistentes} aoTocar={aoInfo} />
              )}
            </GrupoDeIcones>
          </div>
        </div>
        <GrupoDeIcones titulo={T.drops} vazio={!monstro.drops.length}>
          {monstro.drops.map((d, i) =>
            i < aberto.drops ? (
              <button
                key={d.id}
                type="button"
                aria-label={textoDaFicha(T.iconeAria, { nome: d.nome })}
                onClick={() => aoInfo({ titulo: textoDaFicha(T.infoDropTitulo, { nome: d.nome }), texto: textoDaFicha(T.infoDrop, { raridade: d.raridadeNome, chance: d.chance }) })}
                className="relative shrink-0 cursor-pointer active:translate-y-px before:absolute before:-inset-[0.4cqw] before:content-[''] focus-visible:outline focus-visible:outline-[0.6cqw] focus-visible:outline-[#6FE3EE]"
              >
                <SlotDeArma raridade={d.raridade} tamanho={tamDrops}>
                  <IconeDoMaterial id={d.id} nome={d.nome} cor={d.cor} className="w-full h-full" tamanhoDaInicial="2.4cqw" />
                </SlotDeArma>
              </button>
            ) : (
              <IconeBloqueado key={d.id} nivel={i < metade ? 1 : 2} tamanho={tamDrops} aoTocar={aoInfo} moldura />
            )
          )}
        </GrupoDeIcones>
      </div>
      {rodape && <div className="shrink-0 flex justify-center">{rodape}</div>}
    </div>
  );
}
