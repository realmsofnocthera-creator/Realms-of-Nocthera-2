'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Home } from 'lucide-react';
import { CharacterDocument } from '@/server/characterService';
import { MENU_PRINCIPAL } from '@/rules/menuPrincipal';
import { MENU_PRINCIPAL_IMAGES } from '@/assets/menuPrincipal';
import { NOCTHERA_THEME } from '@/theme/theme';

export interface MenuScreenProps {
  personagem?: CharacterDocument | null;
}

function OrnateCorners() {
  const borderColor = '#D4AF37';
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

const MENU_BENTO_GRID_AREAS = `
  "conquistas conquistas conquistas conquistas conquistas conquistas"
  "colecao colecao colecao buscar buscar buscar"
  "colecao colecao colecao producao producao producao"
  "mochila mochila mochila resgate resgate resgate"
  "ranking ranking checkin checkin anuncios anuncios"
`;

export function MenuScreen({ personagem }: MenuScreenProps) {
  const { colors } = NOCTHERA_THEME;

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
        {/* Topo: Botão de voltar para /hub + Título */}
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

            {personagem && (
              <span
                className="text-[11px] sm:text-xs font-cinzel tracking-wider"
                style={{ color: colors.text.secondary }}
              >
                {personagem.nome} · Nv. {personagem.nivel}
              </span>
            )}
          </div>

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
              MENU
            </h1>
          </div>
        </header>

        {/* Grid Bento Nomeado com os 9 Cards em Vitrine */}
        <section
          aria-label="Opções do Menu Principal"
          className="w-full grid gap-2.5 sm:gap-3"
          style={{
            gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
            gridTemplateRows: '124px 102px 102px 112px 86px',
            gridTemplateAreas: MENU_BENTO_GRID_AREAS,
          }}
        >
          {MENU_PRINCIPAL.map((item) => {
            const imgSrc = MENU_PRINCIPAL_IMAGES[item.assetKey];

            return (
              <article
                key={item.id}
                aria-label={item.nome}
                onClick={() => {}}
                style={{
                  gridArea: item.id,
                  backgroundColor: colors.background.secondary,
                  borderColor: '#C8A656',
                }}
                className="group relative w-full h-full rounded-sm border-2 overflow-hidden flex flex-col justify-end shadow-xl select-none cursor-pointer"
              >
                <OrnateCorners />

                {/* Imagem de fundo (já contém o título na própria arte) */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imgSrc}
                  alt={item.nome}
                  className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none"
                />
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
