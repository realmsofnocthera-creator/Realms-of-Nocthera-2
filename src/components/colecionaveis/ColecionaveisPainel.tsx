'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { atributosDosColecionaveis } from '@/game/colecionaveis';
import { ATTRIBUTE_ICONS } from '@/assets/icons';
import { IconeDeRaridade } from '@/components/colecao/ArtesDaColecao';
import { ATTRIBUTES } from '@/rules/attributes';
import { ATTRIBUTE_DISPLAY_NAMES } from '@/rules/attributeInfo';
import {
  CATEGORIAS_DE_COLECIONAVEL,
  COLECIONAVEIS,
  ESTRELAS_MAXIMAS,
  estaAtivo,
  FRAGMENTOS_PARA_ATIVAR,
  NOME_DA_CATEGORIA_DE_COLECIONAVEL,
  NOME_DA_RARIDADE_DE_COLECIONAVEL,
  nivelMaximoDoReforco,
  RARIDADES_DE_COLECIONAVEL,
  type CategoriaDeColecionavel,
} from '@/rules/colecionaveis';
import { EMBLEMA_RARIDADE_MAP } from '@/rules/emblemas';
import { chamarColecionaveis, type EstadoDosColecionaveis, type Token } from './api';
import { MolduraDoColecionavel } from './MolduraDoColecionavel';
import { PopupDoColecionavel } from './PopupDoColecionavel';

const VERMELHO = '#E5484D';

/**
 * A aba Colecionáveis em pixel: o resumo, as categorias e, em cada raridade, uma grade de quadrinhos com a moldura.
 * Tocar num quadrinho abre o pop-up, onde se ativa pela primeira vez, reforça e sobe estrelas. `aoAtualizar` leva os
 * saldos e os colecionáveis para a HUD e para o Hub, sem leitura nova.
 */
export function ColecionaveisPainel({
  tokenFresco,
  categoriaInicial = 'reliquias',
  aoAtualizar,
}: {
  tokenFresco: Token;
  categoriaInicial?: CategoriaDeColecionavel;
  aoAtualizar?: (estado: EstadoDosColecionaveis) => void;
}) {
  const [estado, setEstado] = useState<EstadoDosColecionaveis | null>(null);
  const [erroAoCarregar, setErroAoCarregar] = useState(false);
  const [categoria, setCategoria] = useState<CategoriaDeColecionavel>(categoriaInicial);
  const [aberto, setAberto] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);

  const carregar = useCallback(async () => {
    const r = await chamarColecionaveis(tokenFresco);
    if (r.ok) {
      const novo = r.dados as unknown as EstadoDosColecionaveis;
      setEstado(novo);
      aoAtualizar?.(novo);
    } else setErroAoCarregar(true);
  }, [tokenFresco, aoAtualizar]);

  useEffect(() => {
    void carregar();
    // só ao abrir: o callback muda de identidade a cada desenho da tela e não deve disparar leitura nova
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenFresco]);

  async function agir(acao: string, extra: Record<string, unknown>) {
    setOcupado(true);
    setAviso(null);
    const r = await chamarColecionaveis(tokenFresco, { acao, ...extra });
    setOcupado(false);
    if (!r.ok) {
      setAviso({ texto: String(r.dados.error ?? 'Não foi possível agora.'), erro: true });
      return;
    }
    setAviso({ texto: String(r.dados.mensagem ?? 'Feito.'), erro: false });
    const novo = r.dados.estado as EstadoDosColecionaveis;
    setEstado(novo);
    aoAtualizar?.(novo);
  }

  if (erroAoCarregar) return <p role="alert" className="text-sm" style={{ color: VERMELHO }}>Não foi possível carregar agora. Tente de novo em instantes.</p>;
  if (!estado) return <p role="status" className="text-center font-[family-name:var(--font-silk)] text-sm text-[#E2D6B6]">Carregando...</p>;

  const ativos = COLECIONAVEIS.filter((c) => estaAtivo(estado.colecionaveis[c.id])).length;
  const totais = atributosDosColecionaveis(estado.colecionaveis);
  const comBonus = ATTRIBUTES.filter((a) => totais[a] > 0);
  const aberta = aberto ? COLECIONAVEIS.find((c) => c.id === aberto) : undefined;

  return (
    <div className="flex flex-col gap-3">
      {/* Resumo: quantos ativos e o bônus de cada atributo, em ícones */}
      <section aria-label="Resumo dos colecionáveis" className="caixa-pixel relative flex items-center justify-between gap-2 px-3 py-2.5">
        <p className="font-[family-name:var(--font-pixel)] text-[8px] leading-tight text-[#F5E3B3] [text-shadow:1px_1px_0_#1A120B]">
          ATIVOS
          <span className="block mt-1.5 text-[12px] text-[#ED8A0C] tabular-nums">{ativos}/{COLECIONAVEIS.length}</span>
        </p>
        <ul aria-label="Bônus nos atributos" className="flex flex-wrap items-center justify-end gap-x-2.5 gap-y-1">
          {comBonus.length ? (
            comBonus.map((a) => (
              <li key={a} title={ATTRIBUTE_DISPLAY_NAMES[a]} aria-label={`${ATTRIBUTE_DISPLAY_NAMES[a]} +${totais[a]}`} className="flex items-center gap-0.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ATTRIBUTE_ICONS[a]} alt="" aria-hidden="true" className="w-6 h-6 object-contain" style={{ imageRendering: 'pixelated' }} />
                <span className="font-[family-name:var(--font-silk)] text-[12px] font-bold text-[#7BC47F] tabular-nums">+{totais[a]}</span>
              </li>
            ))
          ) : (
            <li className="font-[family-name:var(--font-silk)] text-[11px] text-[#B2A66C]">sem bônus</li>
          )}
        </ul>
      </section>

      <div role="tablist" aria-label="Categorias" className="grid grid-cols-2 gap-x-1 gap-y-0.5">
        {CATEGORIAS_DE_COLECIONAVEL.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={c === categoria}
            onClick={() => setCategoria(c)}
            className={`botao-kit ${c === categoria ? 'botao-kit-dourado text-[#2B1D0E]' : 'botao-kit-cinza text-[#2B2118]'} px-1 font-cinzel font-bold uppercase text-[10px] leading-tight`}
          >
            {NOME_DA_CATEGORIA_DE_COLECIONAVEL[c]}
          </button>
        ))}
      </div>

      {RARIDADES_DE_COLECIONAVEL.map((raridade) => {
        const def = EMBLEMA_RARIDADE_MAP[raridade];
        const lista = COLECIONAVEIS.filter((c) => c.categoria === categoria && c.raridade === raridade);
        const tenho = lista.filter((c) => estaAtivo(estado.colecionaveis[c.id])).length;
        return (
          <section key={raridade} aria-label={`${NOME_DA_RARIDADE_DE_COLECIONAVEL[raridade]} de ${NOME_DA_CATEGORIA_DE_COLECIONAVEL[categoria]}`} className="flex flex-col gap-2">
            <h2 className="pilula-pixel self-start flex items-center gap-1.5 pl-1 pr-2.5 py-0.5">
              <IconeDeRaridade raridade={raridade} className="w-6 h-6" />
              <span className="font-[family-name:var(--font-pixel)] text-[8px] leading-none uppercase [text-shadow:1px_1px_0_#1A120B]" style={{ color: def.cor }}>{NOME_DA_RARIDADE_DE_COLECIONAVEL[raridade]}</span>
              <span className="font-[family-name:var(--font-silk)] text-[11px] text-[#E2D6B6] tabular-nums">{tenho}/{lista.length}</span>
            </h2>
            <ul className="grid grid-cols-4 gap-2">
              {lista.map((c) => {
                const e = estado.colecionaveis[c.id];
                const ativo = estaAtivo(e);
                const nivel = e?.nivel ?? 0;
                const estrelas = e?.estrelas ?? 0;
                const custo = FRAGMENTOS_PARA_ATIVAR[c.raridade];
                const fragmentos = e?.fragmentos ?? 0;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setAviso(null);
                        setAberto(c.id);
                      }}
                      aria-label={ativo ? `${c.nome}: nível ${nivel} de ${nivelMaximoDoReforco(estrelas)}, ${estrelas} de ${ESTRELAS_MAXIMAS} estrelas` : `${c.nome}: ${fragmentos} de ${custo} fragmentos`}
                      className="w-full flex flex-col items-center gap-1 cursor-pointer active:translate-y-px"
                    >
                      <MolduraDoColecionavel c={c} ativo={ativo} className="w-full aspect-square" />
                      {ativo ? (
                        <span className="font-[family-name:var(--font-silk)] text-[10px] font-bold text-[#7BC47F] tabular-nums leading-none">
                          NV {nivel}
                          {estrelas > 0 && <span className="text-[#F2C94C]"> ★{estrelas}</span>}
                        </span>
                      ) : (
                        <span className="barra-pixel block h-1.5 w-[80%] overflow-hidden" aria-hidden="true">
                          <span className="block h-full" style={{ width: `${Math.min(100, (fragmentos / custo) * 100)}%`, backgroundColor: def.cor }} />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {aberta && (
        <PopupDoColecionavel
          c={aberta}
          e={estado.colecionaveis[aberta.id]}
          memoria={estado.fragmentosDeMemoria}
          pedras={estado.pedrasDaRecordacao}
          ocupado={ocupado}
          aviso={aviso}
          aoAgir={(acao, extra) => void agir(acao, extra)}
          aoFechar={() => setAberto(null)}
        />
      )}
    </div>
  );
}
