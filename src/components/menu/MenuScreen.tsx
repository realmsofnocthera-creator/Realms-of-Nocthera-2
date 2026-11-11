'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Home, X } from 'lucide-react';
import { CharacterDocument } from '@/server/characterService';
import { MENU_PRINCIPAL, MenuPrincipalId } from '@/rules/menuPrincipal';
import { MENU_PRINCIPAL_IMAGES } from '@/assets/menuPrincipal';
import { NOCTHERA_THEME } from '@/theme/theme';
import { AtalhoMestre } from '@/components/mestre/AtalhoMestre';
import { NotificationBadge } from '@/components/hud/NotificationBadge';
import { degrausProntos } from '@/rules/conquistas';
import { useAvisos } from '@/lib/useAvisos';
import { useAnunciosNovos } from '@/lib/useAnunciosNovos';
import { CheckinPopup } from '@/components/checkin/CheckinPopup';

export interface MenuScreenProps {
  personagem?: CharacterDocument | null;
  /** Com ele, o Menu aparece como painel sobre o Hub (o livro) e o botão Voltar vira Fechar. */
  onFechar?: () => void;
}

const MENU_GRID_AREAS = `
  "conquistas conquistas conquistas"
  "colecao buscar mochila"
  "colecao producao resgate"
  "ranking checkin anuncios"
`;

// Onde o nome entra em cada arte (altura em % do cartão) e a cor: as artes deixam o espaço do nome vazio; o Conquistas já traz o nome
const NOME_NA_ARTE: Partial<Record<MenuPrincipalId, { y: number; claro: boolean }>> = {
  colecao: { y: 66, claro: true },
  buscar: { y: 79, claro: false },
  producao: { y: 79, claro: false },
  mochila: { y: 80, claro: true },
  resgate: { y: 79, claro: true },
  ranking: { y: 77, claro: true },
  checkin: { y: 79, claro: true },
  anuncios: { y: 79, claro: true },
};

const CONTORNO_DO_NOME =
  '2px 0 #1A120B, -2px 0 #1A120B, 0 2px #1A120B, 0 -2px #1A120B, 2px 2px #1A120B, -2px -2px #1A120B, 2px -2px #1A120B, -2px 2px #1A120B';

export function MenuScreen({ personagem, onFechar }: MenuScreenProps) {
  // Pontos de aviso do Menu: check-in por fazer e anúncio novo
  const avisos = useAvisos();
  const anuncioNovo = useAnunciosNovos();
  const { colors } = NOCTHERA_THEME;
  const router = useRouter();
  // O Check-in abre sobre o Menu (saiu das Missões)
  const [checkinAberto, setCheckinAberto] = React.useState(false);

  return (
    <main
      className={`w-full flex flex-col items-center px-2.5 sm:px-5 py-3 sm:py-6 select-none ${
        onFechar ? 'h-full overflow-y-auto overscroll-contain' : 'min-h-dvh'
      }`}
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
              {onFechar ? (
                <button
                  type="button"
                  onClick={onFechar}
                  aria-label="Fechar o Menu"
                  className="caixa-pixel relative inline-flex items-center gap-1.5 pl-2 pr-3 py-1.5 cursor-pointer"
                >
                  <X className="w-4 h-4 text-[#F5E3B3]" aria-hidden="true" />
                  <span className="font-[family-name:var(--font-pixel)] text-[8px] leading-none uppercase text-[#F5E3B3] [text-shadow:1px_1px_0_#1A120B]">
                    Fechar
                  </span>
                </button>
              ) : (
                <>
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
                </>
              )}
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
          className="w-full grid gap-2 sm:gap-2.5"
          style={{
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gridTemplateAreas: MENU_GRID_AREAS,
          }}
        >
          {MENU_PRINCIPAL.map((item) => {
            const imgSrc = MENU_PRINCIPAL_IMAGES[item.assetKey];
            const nome = NOME_NA_ARTE[item.id];
            // Conquistas: o ponto aparece quando há degrau batido para resgatar
            const comPonto =
              (item.id === 'conquistas' && !!personagem && degrausProntos(personagem, personagem.conquistas) > 0) ||
              (item.id === 'checkin' && avisos.checkin) ||
              (item.id === 'anuncios' && anuncioNovo);

            return (
              <article
                key={item.id}
                aria-label={item.nome}
                onClick={() => {
                  // Telas que já existem: a Mochila mostra os materiais da Caçada; Produção leva ao Ferreiro; Anúncios mostra o que o painel publicou
                  if (item.id === 'mochila') router.push('/mochila');
                  if (item.id === 'producao') router.push('/ferreiro');
                  if (item.id === 'anuncios') router.push('/anuncios');
                  if (item.id === 'buscar') router.push('/buscar');
                  if (item.id === 'colecao') router.push('/colecao');
                  if (item.id === 'conquistas') router.push('/conquistas');
                  if (item.id === 'checkin') setCheckinAberto(true);
                  if (item.id === 'ranking') router.push('/ranking');
                  // O card Resgate abre a loja de ouro (o Mercado ganha um card próprio depois; a rota /mercado continua existindo)
                  if (item.id === 'resgate') router.push('/resgate');
                }}
                style={{ gridArea: item.id }}
                className={`group relative w-full select-none cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-[0.98] ${
                  item.id === 'conquistas' ? 'aspect-[960/274]' : item.id === 'colecao' ? 'h-full min-h-0' : 'aspect-square'
                }`}
              >
                {/* A arte já traz a moldura; o nome entra no espaço deixado nela (o Conquistas já traz o nome) */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imgSrc}
                  alt={item.nome}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-contain object-center select-none pointer-events-none"
                  style={{ imageRendering: 'pixelated' }}
                />
                {nome && (
                  <span
                    className="absolute inset-x-[9%] text-center font-[family-name:var(--font-pixel)] text-[8px] sm:text-[10px] leading-none uppercase tracking-tight pointer-events-none"
                    style={{
                      top: `${nome.y}%`,
                      transform: 'translateY(-50%)',
                      color: nome.claro ? '#F5E3B3' : '#3B2410',
                      textShadow: nome.claro ? CONTORNO_DO_NOME : 'none',
                    }}
                  >
                    {item.nome}
                  </span>
                )}
                {comPonto && <NotificationBadge className="!top-2 !right-2 z-30" />}
              </article>
            );
          })}
        </section>

        <div className="w-full flex justify-center">
          <AtalhoMestre />
        </div>
      </div>
      {checkinAberto && <CheckinPopup aoFechar={() => setCheckinAberto(false)} />}
    </main>
  );
}
