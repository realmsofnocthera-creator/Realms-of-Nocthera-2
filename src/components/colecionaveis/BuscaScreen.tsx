'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { ResultadoDaBusca } from '@/game/colecionaveis';
import { ATTRIBUTE_DISPLAY_NAMES } from '@/rules/attributeInfo';
import {
  BUSCAS_PARA_GARANTIA,
  CHANCES_DO_SELO,
  COLECIONAVEL_MAP,
  NOME_DA_RARIDADE_DE_COLECIONAVEL,
  NOME_DO_SELO,
  RARIDADE_DO_SELO,
  SELOS_DE_BUSCA,
  SELOS_POR_BUSCA,
  type SeloDeBusca,
} from '@/rules/colecionaveis';
import { EMBLEMA_RARIDADE_MAP } from '@/rules/emblemas';
import { NOCTHERA_THEME } from '@/theme/theme';
import { chamarColecionaveis, type EstadoDosColecionaveis, type Token } from './api';

const OURO = '#C8A656';
const VERMELHO = '#E5484D';
const VERDE = '#7BC47F';
const cor = (r: keyof typeof NOME_DA_RARIDADE_DE_COLECIONAVEL) => EMBLEMA_RARIDADE_MAP[r].cor;
const porcento = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

/** Buscar: a roleta de colecionáveis. Cada busca gasta 10 selos; a 10ª busca com o mesmo selo dá um inteiro da raridade do selo. */
export function BuscaScreen({ tokenFresco }: { tokenFresco: Token }) {
  const { colors } = NOCTHERA_THEME;
  const [estado, setEstado] = useState<EstadoDosColecionaveis | null>(null);
  const [erroAoCarregar, setErroAoCarregar] = useState(false);
  const [selo, setSelo] = useState<SeloDeBusca>('desgastado');
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const [resultados, setResultados] = useState<ResultadoDaBusca[]>([]);

  const carregar = useCallback(async () => {
    const r = await chamarColecionaveis(tokenFresco);
    if (r.ok) setEstado(r.dados as unknown as EstadoDosColecionaveis);
    else setErroAoCarregar(true);
  }, [tokenFresco]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function buscar(vezes: number) {
    setOcupado(true);
    setAviso(null);
    const r = await chamarColecionaveis(tokenFresco, { acao: 'buscar', selo, vezes });
    setOcupado(false);
    if (!r.ok) {
      setAviso({ texto: String(r.dados.error ?? 'Não foi possível buscar agora.'), erro: true });
      return;
    }
    setAviso({ texto: String(r.dados.mensagem ?? 'Feito.'), erro: false });
    setResultados((r.dados.resultados as ResultadoDaBusca[]) ?? []);
    setEstado(r.dados.estado as EstadoDosColecionaveis);
  }

  const tenho = estado?.selos[selo] ?? 0;
  const feitas = estado?.garantia[selo] ?? 0;
  const raridadeGarantida = RARIDADE_DO_SELO[selo];

  return (
    <main className="min-h-dvh w-full flex flex-col items-center px-2.5 sm:px-5 py-3 sm:py-6" style={{ backgroundColor: colors.background.primary, color: colors.text.primary }}>
      <div className="w-full max-w-[480px] flex flex-col gap-3">
        <header className="flex items-center gap-2">
          <Link href="/menu" aria-label="Voltar ao Menu" className="p-1"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-2xl font-cinzel font-extrabold italic tracking-widest uppercase" style={{ color: '#F5E3B3' }}>Buscar</h1>
          <Link href="/colecao" className="ml-auto text-xs underline" style={{ color: colors.text.secondary }}>Colecionáveis</Link>
        </header>
        <p className="text-xs" style={{ color: colors.text.secondary }}>
          Cada busca gasta {SELOS_POR_BUSCA} selos e dá um colecionável inteiro ou fragmentos dele. Quanto melhor o selo, mais raro o resultado. A cada {BUSCAS_PARA_GARANTIA} buscas com o mesmo selo, a {BUSCAS_PARA_GARANTIA}ª dá um colecionável inteiro da raridade do selo. Os selos vêm das expedições e dos eventos.
        </p>
        {aviso && <p role={aviso.erro ? 'alert' : 'status'} className="text-sm font-semibold" style={{ color: aviso.erro ? VERMELHO : VERDE }}>{aviso.texto}</p>}
        {erroAoCarregar ? (
          <p role="alert" className="text-sm" style={{ color: VERMELHO }}>Não foi possível carregar agora. Tente de novo em instantes.</p>
        ) : !estado ? (
          <p className="text-sm" style={{ color: colors.text.secondary }}>Carregando...</p>
        ) : (
          <>
            <div role="radiogroup" aria-label="Selo da busca" className="grid grid-cols-2 gap-2">
              {SELOS_DE_BUSCA.map((s) => {
                const r = RARIDADE_DO_SELO[s];
                const ativo = s === selo;
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={ativo}
                    onClick={() => setSelo(s)}
                    className="rounded-sm border-2 px-2 py-1.5 flex flex-col items-start text-left"
                    style={{ borderColor: ativo ? cor(r) : '#4A3F2A', backgroundColor: ativo ? '#2E2616' : colors.background.secondary }}
                  >
                    <span className="text-sm font-bold" style={{ color: cor(r) }}>{NOME_DO_SELO[s]}</span>
                    <span className="text-[11px]" style={{ color: colors.text.secondary }}>Você tem {estado.selos[s] ?? 0} · garantia {estado.garantia[s] ?? 0}/{BUSCAS_PARA_GARANTIA}</span>
                  </button>
                );
              })}
            </div>

            <section aria-label="Chances" className="rounded-sm border-2 p-2.5 flex flex-col gap-1" style={{ borderColor: OURO, backgroundColor: colors.background.secondary }}>
              <h2 className="font-cinzel font-bold text-sm">Chances com o {NOME_DO_SELO[selo]}</h2>
              <ul className="text-xs flex flex-col gap-0.5">
                {CHANCES_DO_SELO[selo].map((l) => (
                  <li key={`${l.raridade}-${l.inteiro}`} className="flex justify-between gap-2">
                    <span style={{ color: cor(l.raridade) }}>{NOME_DA_RARIDADE_DE_COLECIONAVEL[l.raridade]} · {l.inteiro ? 'inteiro' : 'fragmentos'}</span>
                    <span>{porcento(l.chance)}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[11px]" style={{ color: colors.text.secondary }}>
                Garantia: faltam {BUSCAS_PARA_GARANTIA - feitas} buscas para um {NOME_DA_RARIDADE_DE_COLECIONAVEL[raridadeGarantida]} inteiro.
              </p>
            </section>

            <div className="flex gap-2">
              <button type="button" disabled={ocupado || tenho < SELOS_POR_BUSCA} onClick={() => void buscar(1)} className="flex-1 rounded-sm border-2 px-2 py-2 text-sm font-bold disabled:opacity-50" style={{ borderColor: OURO, backgroundColor: '#3A2F18', color: '#F5E3B3' }}>
                Buscar 1x ({SELOS_POR_BUSCA} selos)
              </button>
              <button type="button" disabled={ocupado || tenho < SELOS_POR_BUSCA * 10} onClick={() => void buscar(10)} className="flex-1 rounded-sm border-2 px-2 py-2 text-sm font-bold disabled:opacity-50" style={{ borderColor: OURO, backgroundColor: '#3A2F18', color: '#F5E3B3' }}>
                Buscar 10x ({SELOS_POR_BUSCA * 10} selos)
              </button>
            </div>

            {resultados.length > 0 && (
              <section aria-label="Resultado da busca" className="rounded-sm border-2 p-2.5 flex flex-col gap-1" style={{ borderColor: OURO, backgroundColor: colors.background.secondary }}>
                <h2 className="font-cinzel font-bold text-sm">Resultado</h2>
                <ul className="flex flex-col gap-1">
                  {resultados.map((r, i) => (
                    <li key={i} className="rounded-sm border px-2 py-1 text-xs flex justify-between gap-2" style={{ borderColor: cor(r.raridade) }}>
                      <span>
                        <span className="font-semibold" style={{ color: cor(r.raridade) }}>{r.nome}</span>
                        <span style={{ color: colors.text.secondary }}> · {ATTRIBUTE_DISPLAY_NAMES[COLECIONAVEL_MAP[r.id].atributo]}</span>
                      </span>
                      <span className="shrink-0" style={{ color: r.ativou ? VERDE : colors.text.secondary }}>
                        {r.ativou ? 'Novo! Ativado' : r.inteiro ? `repetido: +${r.fragmentos} frag.` : `+${r.fragmentos} frag.`}
                        {r.garantido ? ' · garantia' : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
