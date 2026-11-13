'use client';

import React from 'react';
import Link from 'next/link';
import { CharacterDocument } from '@/server/characterService';
import { PROVACOES, ProvacaoDefinition, ProvacaoId } from '@/rules/provacoes';
import { PROVACOES_IMAGES } from '@/assets/provacoes';
import { CENAS_DAS_PROVACOES } from '@/assets/landing';
import { FICHA_UI } from '@/assets/personagemUi';
import { KIT_DA_FORJA } from '@/assets/forjaUi';
import { textoDaFicha } from '@/rules/textosDaFicha';
import { TEXTOS_DAS_PROVACOES as T } from '@/rules/textosDasProvacoes';
import { BarraDeTitulo, PainelDaForja } from '@/components/forja/KitDaForja';
import { CONTORNO_PIXEL } from '@/components/ficha/PlacaPixel';

export interface ProvacoesScreenProps {
  personagem: CharacterDocument;
}

const pixel: React.CSSProperties = { imageRendering: 'pixelated' };

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

/** As provações em ordem de nível (do menor para o maior; no empate, a ordem em que foram definidas). */
export function provacoesPorNivel(): ProvacaoDefinition[] {
  return PROVACOES.map((p, i) => ({ p, i })).sort((a, b) => a.p.nivelRequerido - b.p.nivelRequerido || a.i - b.i).map(({ p }) => p);
}

/** A cena de uma provação: a arte nova (a mais larga) ou, sem ela, a antiga; sem nenhuma, o nome sobre um fundo escuro. */
function CenaDaProvacao({ provacao }: { provacao: ProvacaoDefinition }) {
  const cena = CENAS_DAS_PROVACOES[provacao.id] ?? (provacao.assetKey ? PROVACOES_IMAGES[provacao.assetKey] : null);
  if (!cena) return <div aria-hidden="true" className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, #46341C 0%, #120E0A 80%)' }} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={cena} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full object-cover object-[50%_40%] select-none pointer-events-none" style={pixel} />;
}

/** O cartão de uma provação: a cena, o nome por cima e, se ainda não abriu, o cadeado e o nível que falta. */
function CartaoDaProvacao({ provacao, nivelDoPersonagem, proxima }: { provacao: ProvacaoDefinition; nivelDoPersonagem: number; proxima: boolean }) {
  const aberta = nivelDoPersonagem >= provacao.nivelRequerido;
  const corte = provacao.id === 'expedicao'; // a arte é vertical: corta em cima e embaixo, então a moldura dourada é refeita
  const faltam = provacao.nivelRequerido - nivelDoPersonagem;
  const conteudo = (
    <article
      aria-label={textoDaFicha(aberta ? T.abertaAria : T.bloqueadaAria, { nome: provacao.nome, n: provacao.nivelRequerido })}
      className={`relative w-full overflow-hidden select-none ${aberta ? '' : 'cursor-not-allowed'}`}
      style={{ aspectRatio: '16 / 9', boxShadow: aberta ? '0 0.8cqw 2cqw rgba(0,0,0,0.7)' : undefined }}
    >
      <div className="absolute inset-0" style={{ filter: aberta ? undefined : 'grayscale(0.7) brightness(0.5)' }}>
        <CenaDaProvacao provacao={provacao} />
      </div>
      {corte && <span aria-hidden="true" className="absolute inset-0 pointer-events-none border-y-[0.9cqw] border-x-0 border-[#C8962E]" />}
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black/85 to-transparent pointer-events-none" />
      <span className="absolute left-[4.6cqw] right-[4.6cqw] bottom-[3.2cqw] font-cinzel font-extrabold uppercase tracking-wider leading-[1.25] text-[3.4cqw] text-[#FFE9B0] pointer-events-none" style={{ textShadow: CONTORNO_PIXEL }}>
        {provacao.nome}
      </span>
      {!aberta && (
        <span className="absolute top-[3.2cqw] right-[4.4cqw] z-10 flex items-center gap-[1cqw] px-[1.6cqw] py-[0.6cqw] bg-[#05070D]/90 border border-[#E5484D] font-cinzel font-extrabold uppercase text-[2.1cqw] leading-[1.4] text-[#FFB4B4]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={KIT_DA_FORJA.proibido} alt="" aria-hidden="true" draggable={false} className="w-[3.2cqw] h-[3.2cqw] shrink-0" style={pixel} />
          {textoDaFicha(T.abreNoNivel, { n: provacao.nivelRequerido })}
        </span>
      )}
      {!aberta && proxima && (
        <span className="absolute top-[3.2cqw] left-[4.4cqw] z-10 px-[1.6cqw] py-[0.6cqw] bg-[#05070D]/90 border border-[#EDB44C] font-cinzel font-extrabold uppercase text-[2.1cqw] leading-[1.4] text-[#EDB44C]">
          {T.proxima} · {faltam === 1 ? T.falta : textoDaFicha(T.faltam, { n: faltam })}
        </span>
      )}
    </article>
  );
  return aberta ? (
    <Link href={DESTINOS[provacao.id]} aria-label={textoDaFicha(T.entrar, { nome: provacao.nome })} className="block w-full cursor-pointer active:translate-y-px">
      {conteudo}
    </Link>
  ) : (
    conteudo
  );
}

/**
 * As Provações em pixel: uma lista só, do menor nível para o maior, com a trilha dos níveis ao lado (acesa até onde o
 * personagem já chegou) e o fundo das ruínas. Cada provação aberta é um link para a tela dela; as que ainda não abriram
 * ficam apagadas, com o cadeado e o nível que pedem, e a próxima a abrir ganha a faixa "Próxima".
 */
export function ProvacoesScreen({ personagem }: ProvacoesScreenProps) {
  const lista = provacoesPorNivel();
  const proximaId = lista.find((p) => personagem.nivel < p.nivelRequerido)?.id;

  return (
    <main className="relative h-[100dvh] max-h-[100dvh] w-full overflow-hidden select-none bg-[#05070D] text-[#F5F3E0]">
      {/* o fundo: as ruínas sob a lua, com um véu escuro para o texto ler bem */}
      <div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none bg-cover bg-no-repeat" style={{ backgroundImage: `url(${FICHA_UI.fundo})`, backgroundPosition: '76% center' }}>
        <div className="absolute inset-0 bg-[#05070D]/50" />
      </div>

      <div className="forja-palco !justify-start gap-[1.6cqw] pt-[max(1.4cqw,env(safe-area-inset-top))] pb-[max(1.6cqw,env(safe-area-inset-bottom))]">
        <header className="flex items-center gap-[2cqw] px-[2.4cqw] shrink-0">
          <Link href="/hub" aria-label={T.voltar} className="relative block w-[8cqw] shrink-0 cursor-pointer active:translate-y-px">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={FICHA_UI.voltar} alt="" aria-hidden="true" draggable={false} className="block w-full h-auto pointer-events-none" style={pixel} />
          </Link>
          <BarraDeTitulo titulo={T.titulo} className="w-[56cqw]" />
          <PainelDaForja borda="1.4cqw" className="ml-auto shrink-0 py-[0.2cqw]">
            <span className="font-cinzel font-extrabold text-[2.1cqw] leading-[1.4] text-[#F5F3E0] whitespace-nowrap">{textoDaFicha(T.jogador, { nome: personagem.nome, nivel: personagem.nivel })}</span>
          </PainelDaForja>
        </header>

        <section aria-label={T.lista} className="flex-1 min-h-0 overflow-y-auto forja-rolagem px-[3cqw] pt-[1cqw] pb-[3cqw]">
          <ol className="flex flex-col">
            {lista.map((p, i) => {
              const aberta = personagem.nivel >= p.nivelRequerido;
              const proximaDaLista = lista[i + 1];
              const linhaAcesa = !!proximaDaLista && personagem.nivel >= proximaDaLista.nivelRequerido;
              return (
                <li key={p.id} className="flex gap-[2.4cqw] items-stretch">
                  {/* a trilha dos níveis: a medalha do nível e a linha até a próxima */}
                  <div className="flex flex-col items-center shrink-0 w-[13cqw]">
                    <span
                      role="img"
                      aria-label={textoDaFicha(T.nivelAria, { n: p.nivelRequerido })}
                      className={`flex flex-col items-center justify-center w-[12cqw] h-[12cqw] shrink-0 border-[0.6cqw] font-cinzel font-black leading-none ${aberta ? 'border-[#EDB44C] bg-[#1A2F6A] text-[#FFE9B0] shadow-[0_0_2cqw_rgba(237,180,76,0.55)]' : 'border-[#3A4766] bg-[#0A1230] text-[#7C8AA0]'}`}
                    >
                      <span className="text-[1.7cqw] uppercase tracking-wider">Nv</span>
                      <span className="text-[4.2cqw]">{p.nivelRequerido}</span>
                    </span>
                    {proximaDaLista && <span aria-hidden="true" className={`flex-1 w-[1cqw] min-h-[3cqw] ${linhaAcesa ? 'bg-[#EDB44C]' : 'bg-[#2B3F5C]'}`} />}
                  </div>
                  <div className={`flex-1 min-w-0 ${proximaDaLista ? 'pb-[3.2cqw]' : ''}`}>
                    <CartaoDaProvacao provacao={p} nivelDoPersonagem={personagem.nivel} proxima={p.id === proximaId} />
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </main>
  );
}
