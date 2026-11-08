'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ColecaoDaAlma } from '@/components/alma/ColecaoDaAlma';
import { BannerDaLista } from './ArtesDaColecao';
import { HudDaColecao } from './HudDaColecao';
import { ColecionaveisPainel } from '@/components/colecionaveis/ColecionaveisPainel';
import type { EstadoDosColecionaveis, Token } from '@/components/colecionaveis/api';
import { ANCORA_DO_ROTULO, AREAS_DO_HUB_DA_COLECAO, FUNDO_DO_HUB_DA_COLECAO, QUADROS_DA_COLECAO, type QuadroDaColecao } from '@/assets/colecao';
import { TIPOS_DE_CARTA } from '@/rules/almas';
import { COLECIONAVEIS, estaAtivo, NOME_DA_CATEGORIA_DE_COLECIONAVEL, type CategoriaDeColecionavel } from '@/rules/colecionaveis';
import type { CharacterDocument } from '@/server/characterService';
import { NOCTHERA_THEME } from '@/theme/theme';

const SOMBRA_DO_TEXTO = '[text-shadow:1px_1px_0_#1A120B]';
/** O que a tela mostra: o hub ou uma parte da coleção. */
type Vista = 'hub' | QuadroDaColecao;

const NOME_DO_QUADRO: Readonly<Record<QuadroDaColecao, string>> = {
  reliquias: NOME_DA_CATEGORIA_DE_COLECIONAVEL.reliquias,
  sonatas: NOME_DA_CATEGORIA_DE_COLECIONAVEL.sonatas,
  ecos: NOME_DA_CATEGORIA_DE_COLECIONAVEL.ecos,
  memorias: NOME_DA_CATEGORIA_DE_COLECIONAVEL.memorias,
  alma: 'Cartas da Alma',
};

/** Quantos o jogador tem em cada quadro (ativados / total), com os dados do personagem que a tela já tem. */
export function contagemDoQuadro(personagem: Pick<CharacterDocument, 'colecionaveis' | 'cartasDescobertas'>, quadro: QuadroDaColecao): { tenho: number; total: number } {
  if (quadro === 'alma') return { tenho: personagem.cartasDescobertas?.length ?? 0, total: TIPOS_DE_CARTA.length };
  const daCategoria = COLECIONAVEIS.filter((c) => c.categoria === (quadro as CategoriaDeColecionavel));
  return { tenho: daCategoria.filter((c) => estaAtivo(personagem.colecionaveis?.[c.id])).length, total: daCategoria.length };
}

/** O card Coleção do Menu: o hub com um quadro para cada parte e, ao tocar, a lista dela (Colecionáveis por categoria ou cartas da Alma). */
export function ColecaoScreen({ personagem, tokenFresco }: { personagem: CharacterDocument; tokenFresco: Token }) {
  const { colors } = NOCTHERA_THEME;
  const [vista, setVista] = useState<Vista>('hub');
  // Os saldos e os colecionáveis ficam vivos aqui: o que o pop-up faz (ativar, reforçar) chega na HUD e no Hub sem leitura nova
  const [vivo, setVivo] = useState(personagem);
  const atualizar = useCallback(
    (estado: EstadoDosColecionaveis) => setVivo((p) => ({ ...p, colecionaveis: estado.colecionaveis, fragmentosDeMemoria: estado.fragmentosDeMemoria, pedrasDaRecordacao: estado.pedrasDaRecordacao })),
    [],
  );
  const saldos = { fragmentos: vivo.fragmentosDeMemoria ?? 0, pedras: vivo.pedrasDaRecordacao ?? 0, poeira: vivo.poeiraDeAlma ?? 0, cacos: vivo.cacosDeAlma ?? 0 };

  // A tela da Alma abre direto nas cartas (/colecao?aba=alma)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('aba') === 'alma') setVista('alma');
  }, []);

  // Abrir um quadro entra no histórico: o voltar do celular volta para o hub em vez de sair da tela
  useEffect(() => {
    const aoVoltar = () => setVista((window.history.state?.vistaColecao as Vista | undefined) ?? 'hub');
    window.addEventListener('popstate', aoVoltar);
    return () => window.removeEventListener('popstate', aoVoltar);
  }, []);
  const abrir = (v: Vista) => {
    window.history.pushState({ vistaColecao: v }, '');
    setVista(v);
  };
  const voltarAoHub = () => {
    if (window.history.state?.vistaColecao) window.history.back();
    else setVista('hub');
  };

  if (vista === 'hub') {
    return (
      <main className="fixed inset-0 overflow-hidden select-none bg-[#0D0D0D]">
        <div className="hub-colecao">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={FUNDO_DO_HUB_DA_COLECAO} alt="Salão com cinco quadros: Relíquias, Sonatas, Ecos e Entidades, Memórias e Cartas da Alma" className="absolute inset-0 w-full h-full pointer-events-none" style={{ imageRendering: 'pixelated' }} />
          {QUADROS_DA_COLECAO.map((quadro) => {
            const { tenho, total } = contagemDoQuadro(vivo, quadro);
            return (
              <button
                key={quadro}
                type="button"
                onClick={() => abrir(quadro)}
                aria-label={`${NOME_DO_QUADRO[quadro]}: ${tenho} de ${total}`}
                className="absolute group cursor-pointer focus:outline-none"
                style={AREAS_DO_HUB_DA_COLECAO[quadro]}
              >
                <span className="absolute inset-0 border-2 border-transparent group-hover:border-[#F2C94C]/80 group-focus-visible:border-[#F2C94C] group-active:bg-[#F2C94C]/20" />
                <span className="caixa-pixel absolute bottom-0 -translate-x-1/2 translate-y-1/2 flex flex-col items-center gap-1 w-max max-w-[92%] text-center px-1.5 py-1 leading-tight" style={{ left: `${ANCORA_DO_ROTULO[quadro] * 100}%` }}>
                  <span className={`font-[family-name:var(--font-pixel)] text-[6px] sm:text-[8px] uppercase text-[#F5E3B3] ${SOMBRA_DO_TEXTO}`}>{NOME_DO_QUADRO[quadro]}</span>
                  <span className={`font-[family-name:var(--font-silk)] text-[10px] text-[#E2D6B6] tabular-nums ${SOMBRA_DO_TEXTO}`}>
                    {tenho}/{total}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <header className="absolute top-0 inset-x-0 z-10 flex flex-col gap-2.5 px-2.5 pt-3 sm:px-5">
          <div className="flex items-center gap-2">
            <Link href="/menu" aria-label="Voltar ao Menu" className="caixa-pixel relative inline-flex items-center gap-1.5 pl-2 pr-3 py-1.5">
              <ArrowLeft className="w-4 h-4 text-[#F5E3B3]" aria-hidden="true" />
              <span className={`font-[family-name:var(--font-pixel)] text-[8px] leading-none uppercase text-[#F5E3B3] ${SOMBRA_DO_TEXTO}`}>Menu</span>
            </Link>
            <Link href="/buscar" className="caixa-pixel relative ml-auto inline-flex items-center px-3 py-1.5">
              <span className={`font-[family-name:var(--font-pixel)] text-[8px] leading-none uppercase text-[#F5E3B3] ${SOMBRA_DO_TEXTO}`}>Buscar</span>
            </Link>
          </div>
          <HudDaColecao saldos={saldos} />
        </header>
      </main>
    );
  }

  return (
    <main className="min-h-dvh w-full flex flex-col items-center px-2.5 sm:px-5 py-3 sm:py-6" style={{ backgroundColor: colors.background.primary, color: colors.text.primary }}>
      <div className="w-full max-w-[520px] flex flex-col gap-3">
        <header className="flex items-center gap-2">
          <button type="button" onClick={voltarAoHub} aria-label="Voltar à Coleção" className="caixa-pixel relative inline-flex items-center gap-1.5 pl-2 pr-3 py-1.5 cursor-pointer">
            <ArrowLeft className="w-4 h-4 text-[#F5E3B3]" aria-hidden="true" />
            <span className={`font-[family-name:var(--font-pixel)] text-[8px] leading-none uppercase text-[#F5E3B3] ${SOMBRA_DO_TEXTO}`}>Coleção</span>
          </button>
          <Link href="/buscar" className="caixa-pixel relative ml-auto inline-flex items-center px-3 py-1.5">
            <span className={`font-[family-name:var(--font-pixel)] text-[8px] leading-none uppercase text-[#F5E3B3] ${SOMBRA_DO_TEXTO}`}>Buscar</span>
          </Link>
        </header>
        <HudDaColecao saldos={saldos} />
        <BannerDaLista titulo={NOME_DO_QUADRO[vista]} />
        {vista === 'alma' ? <ColecaoDaAlma personagem={vivo} /> : <ColecionaveisPainel tokenFresco={tokenFresco} categoriaInicial={vista} aoAtualizar={atualizar} />}
      </div>
    </main>
  );
}
