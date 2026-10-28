'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Home, Lock } from 'lucide-react';
import { CharacterDocument } from '@/server/characterService';
import { PROVACOES, ProvacaoDefinition, ProvacaoId } from '@/rules/provacoes';
import { PROVACOES_IMAGES } from '@/assets/provacoes';
import { CENAS_DAS_PROVACOES } from '@/assets/landing';
import { NOCTHERA_THEME } from '@/theme/theme';

export interface ProvacoesScreenProps {
  personagem: CharacterDocument;
}

function obterProvacao(id: ProvacaoId): ProvacaoDefinition {
  const encontrada = PROVACOES.find((p) => p.id === id);
  if (!encontrada) {
    throw new Error(`Provação não encontrada: ${id}`);
  }
  return encontrada;
}

interface ProvacaoCardProps {
  provacao: ProvacaoDefinition;
  nivelPersonagem: number;
  variant?: 'horizontal' | 'vertical' | 'stacked';
}

function OrnateCorners({ locked }: { locked: boolean }) {
  const borderColor = locked ? 'rgba(178, 166, 108, 0.45)' : '#D4AF37';
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 z-20"
        style={{ borderColor }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 z-20"
        style={{ borderColor }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 z-20"
        style={{ borderColor }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 z-20"
        style={{ borderColor }}
      />
    </>
  );
}

/** A cena da provação com o nome escrito por cima; sem cena nova, a arte antiga (que já traz o título) ou o nome sobre um fundo escuro. */
function ArteDaProvacao({ provacao, bloqueada = false }: { provacao: ProvacaoDefinition; bloqueada?: boolean }) {
  const cena = CENAS_DAS_PROVACOES[provacao.id];
  if (cena) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cena}
          alt={provacao.nome}
          className={`absolute inset-0 w-full h-full object-cover object-[50%_35%] select-none pointer-events-none${bloqueada ? ' grayscale-[45%]' : ''}`}
        />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/85 to-transparent pointer-events-none" />
        <span
          className="absolute bottom-2 left-3 right-3 z-10 font-cinzel font-extrabold uppercase tracking-widest text-sm sm:text-base drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] pointer-events-none"
          style={{ color: '#F5E3B3' }}
        >
          {provacao.nome}
        </span>
      </>
    );
  }
  if (!provacao.assetKey) {
    return (
      <div
        className="absolute inset-0 flex items-center justify-center px-3 text-center select-none pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, rgba(70, 52, 28, 0.95) 0%, rgba(18, 14, 10, 1) 80%)', filter: bloqueada ? 'grayscale(45%)' : undefined }}
      >
        <span className="font-cinzel font-extrabold italic uppercase tracking-widest text-lg sm:text-xl drop-shadow-[0_3px_6px_rgba(0,0,0,0.95)]" style={{ color: '#F5E3B3' }}>
          {provacao.nome}
        </span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={PROVACOES_IMAGES[provacao.assetKey]}
      alt={provacao.nome}
      className={`absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none${bloqueada ? ' grayscale-[45%]' : ''}`}
    />
  );
}

function ProvacaoCard({
  provacao,
  nivelPersonagem,
  variant = 'horizontal',
}: ProvacaoCardProps) {
  const { colors } = NOCTHERA_THEME;
  const desbloqueada = nivelPersonagem >= provacao.nivelRequerido;

  const heightClasses =
    variant === 'vertical'
      ? 'h-full min-h-[220px] sm:min-h-[268px]'
      : variant === 'stacked'
        ? 'h-[105px] sm:h-[128px]'
        : 'h-[112px] sm:h-[136px]';

  if (!desbloqueada) {
    return (
      <article
        aria-label={`${provacao.nome} - Requer Nível ${provacao.nivelRequerido}`}
        className={`relative w-full ${heightClasses} rounded-sm border-2 overflow-hidden flex flex-col justify-end opacity-60 cursor-not-allowed shadow-lg select-none`}
        style={{
          backgroundColor: colors.background.secondary,
          borderColor: `${colors.border.default}75`,
        }}
      >
        <OrnateCorners locked />

        <ArteDaProvacao provacao={provacao} bloqueada />

        {/* Topo direito: Cadeado + Requisito "Nível X" em destaque */}
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] sm:text-xs font-cinzel font-bold tracking-wider uppercase shadow-md"
            style={{
              backgroundColor: 'rgba(18, 12, 14, 0.92)',
              borderColor: colors.status.danger,
              color: '#FF8A80',
            }}
          >
            <Lock className="w-3 h-3 shrink-0" aria-label="Provação bloqueada" />
            Nível {provacao.nivelRequerido}
          </span>
        </div>
      </article>
    );
  }

  // Todas as provações têm tela própria e viram link
  const destino = provacao.id === 'cacada' ? '/cacada' : provacao.id === 'batalha-sangrenta' ? '/batalha-sangrenta' : provacao.id === 'torre-celestial' ? '/torre-celestial' : provacao.id === 'guerreiro' ? '/guerreiro' : provacao.id === 'teste-equipe' ? '/teste-equipe' : provacao.id === 'expedicao' ? '/expedicao' : provacao.id === 'chefe-mundial' ? '/chefe-mundial' : null;
  const card = (
    <article
      aria-label={`${provacao.nome} - Nível ${provacao.nivelRequerido}`}
      className={`group relative w-full ${heightClasses} rounded-sm border-2 overflow-hidden flex flex-col justify-end shadow-xl select-none`}
      style={{
        backgroundColor: colors.background.secondary,
        borderColor: '#C8A656',
      }}
    >
      <OrnateCorners locked={false} />

      <ArteDaProvacao provacao={provacao} />

      {/* Topo direito: Badge discreto de Nível da provação */}
      <div className="absolute top-2 right-2 z-20 flex items-center">
        <span
          className="inline-flex items-center px-2 py-0.5 rounded border text-[10px] sm:text-xs font-cinzel font-bold tracking-wider uppercase shadow-md"
          style={{
            backgroundColor: 'rgba(18, 15, 12, 0.88)',
            borderColor: `${colors.border.default}AA`,
            color: colors.text.primary,
          }}
        >
          Nível {provacao.nivelRequerido}
        </span>
      </div>
    </article>
  );
  return destino ? (
    <Link href={destino} className="block w-full h-full cursor-pointer" aria-label={`Entrar na ${provacao.nome}`}>
      {card}
    </Link>
  ) : (
    card
  );
}

export function ProvacoesScreen({ personagem }: ProvacoesScreenProps) {
  const { colors } = NOCTHERA_THEME;

  // Disposição exata conforme o layout de referência:
  // Linha 1 (Topo - 2 colunas): Batalha Sangrenta (esq) | Guerreiro (dir)
  // Linha 2 (Meio - Assimétrica): Expedição vertical (esq, no lugar da Dungeon) | Chefe Mundial + Caçada empilhados (dir)
  // Linha 3 (Base - 2 colunas): Torre Celestial (esq) | Teste de Equipe (dir)
  const cardTopoEsq = obterProvacao('batalha-sangrenta');
  const cardTopoDir = obterProvacao('guerreiro');
  const cardMeioVerticalEsq = obterProvacao('expedicao');
  const cardMeioDirTopo = obterProvacao('chefe-mundial');
  const cardMeioDirBase = obterProvacao('cacada');
  const cardBaseEsq = obterProvacao('torre-celestial');
  const cardBaseDir = obterProvacao('teste-equipe');

  return (
    <main
      className="min-h-dvh w-full flex flex-col items-center px-2.5 sm:px-5 py-3 sm:py-6 select-none"
      style={{
        backgroundColor: colors.background.primary,
        backgroundImage:
          'radial-gradient(ellipse at top, rgba(32, 24, 18, 0.92) 0%, rgba(13, 13, 13, 1) 75%)',
        color: colors.text.primary,
      }}
    >
      <div className="w-full max-w-[480px] flex flex-col gap-2.5 sm:gap-3.5">
        {/* Barra Superior de Navegação (Voltar + Ícone Home/Hub) */}
        <header className="w-full flex flex-col gap-1.5">
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link
                href="/hub"
                aria-label="Voltar ao Hub"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-cinzel font-bold uppercase tracking-wider transition-colors"
                style={{
                  backgroundColor: colors.background.secondary,
                  borderColor: '#C8A656',
                  color: '#E6C775',
                }}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar</span>
              </Link>

              <Link
                href="/hub"
                aria-label="Ir para o Hub"
                title="Hub Principal"
                className="w-7 h-7 rotate-45 rounded-xs border flex items-center justify-center transition-colors"
                style={{
                  backgroundColor: colors.background.card,
                  borderColor: `${colors.border.default}99`,
                  color: colors.text.secondary,
                }}
              >
                <Home className="w-3.5 h-3.5 -rotate-45" />
              </Link>
            </div>

            <span
              className="text-[11px] sm:text-xs font-cinzel tracking-wider"
              style={{ color: colors.text.secondary }}
            >
              {personagem.nome} · Nv. {personagem.nivel}
            </span>
          </div>

          {/* Banner Central "PROVAÇÕES" com faixa rubro-escura ao fundo */}
          <div className="relative w-full flex items-center justify-center py-1.5 sm:py-2">
            <div
              aria-hidden="true"
              className="absolute inset-x-8 h-7 sm:h-9 rounded-full blur-xs pointer-events-none"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(122, 18, 28, 0.78) 25%, rgba(148, 22, 34, 0.88) 50%, rgba(122, 18, 28, 0.78) 75%, transparent 100%)',
              }}
            />
            <h1
              className="relative z-10 text-2xl sm:text-3xl font-cinzel font-extrabold italic tracking-widest uppercase drop-shadow-[0_3px_6px_rgba(0,0,0,0.95)]"
              style={{ color: '#F5E3B3' }}
            >
              PROVAÇÕES
            </h1>
          </div>
        </header>

        {/* MOSAICO DAS 7 PROVAÇÕES (Disposição idêntica à imagem de referência) */}
        <section aria-label="Lista de Provações" className="w-full flex flex-col gap-2.5 sm:gap-3">
          {/* LINHA 1: 2 Cards Horizontais Lado a Lado */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            <ProvacaoCard
              provacao={cardTopoEsq}
              nivelPersonagem={personagem.nivel}
              variant="horizontal"
            />
            <ProvacaoCard
              provacao={cardTopoDir}
              nivelPersonagem={personagem.nivel}
              variant="horizontal"
            />
          </div>

          {/* LINHA 2: Card Vertical Alto à Esquerda + 2 Cards Horizontais Empilhados à Direita */}
          <div className="grid grid-cols-12 gap-2.5 sm:gap-3 items-stretch">
            <div className="col-span-5 flex">
              <ProvacaoCard
                provacao={cardMeioVerticalEsq}
                nivelPersonagem={personagem.nivel}
                variant="vertical"
              />
            </div>

            <div className="col-span-7 flex flex-col justify-between gap-2.5 sm:gap-3">
              <ProvacaoCard
                provacao={cardMeioDirTopo}
                nivelPersonagem={personagem.nivel}
                variant="stacked"
              />
              <ProvacaoCard
                provacao={cardMeioDirBase}
                nivelPersonagem={personagem.nivel}
                variant="stacked"
              />
            </div>
          </div>

          {/* LINHA 3: 2 Cards Horizontais Lado a Lado na Base */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            <ProvacaoCard
              provacao={cardBaseEsq}
              nivelPersonagem={personagem.nivel}
              variant="horizontal"
            />
            <ProvacaoCard
              provacao={cardBaseDir}
              nivelPersonagem={personagem.nivel}
              variant="horizontal"
            />
          </div>
        </section>
      </div>
    </main>
  );
}
