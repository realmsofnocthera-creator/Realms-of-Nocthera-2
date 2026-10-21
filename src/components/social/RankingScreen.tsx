'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CRITERIOS_DE_RANKING, EXPLICACAO_DO_RANKING, NOME_DO_RANKING, UNIDADE_DO_RANKING, type CriterioDeRanking, type EntradaDoRanking } from '@/rules/social';
import { CLASSES_MAP } from '@/rules/classes';
import { NOCTHERA_THEME } from '@/theme/theme';
import { AvatarRedondo } from './Avatar';
import { PrivacidadeSocial } from './PrivacidadeSocial';

interface Resposta {
  criterio: CriterioDeRanking;
  atualizadoEm: string;
  entradas: EntradaDoRanking[];
  minhaPosicao: number | null;
  estouEscondido: boolean;
}

/** Ranking (7.1): uma aba por provação; o retrato é renovado a cada 30 min. */
export function RankingScreen({ tokenFresco }: { tokenFresco: () => Promise<string | null> }) {
  const { colors } = NOCTHERA_THEME;
  const [criterio, setCriterio] = useState<CriterioDeRanking>('nivel');
  const [dados, setDados] = useState<Resposta | null>(null);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    setErro(false);
    try {
      const token = await tokenFresco();
      const res = await fetch(`/api/ranking?tipo=${criterio}`, { headers: { Authorization: `Bearer ${token ?? ''}` } });
      if (!res.ok) throw new Error('falhou');
      setDados((await res.json()) as Resposta);
    } catch {
      setErro(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criterio]);

  useEffect(() => {
    setDados(null);
    void carregar();
  }, [carregar]);

  const [singular, plural] = UNIDADE_DO_RANKING[criterio];
  return (
    <main className="min-h-dvh w-full flex flex-col items-center px-2.5 sm:px-5 py-3 sm:py-6" style={{ backgroundColor: colors.background.primary, color: colors.text.primary }}>
      <div className="w-full max-w-[480px] flex flex-col gap-3">
        <header className="flex items-center gap-2">
          <Link href="/menu" aria-label="Voltar ao Menu" className="p-1"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-2xl font-cinzel font-extrabold italic tracking-widest uppercase" style={{ color: '#F5E3B3' }}>Ranking</h1>
        </header>
        <div role="tablist" className="grid grid-cols-2 gap-1.5">
          {CRITERIOS_DE_RANKING.map((c) => (
            <button key={c} role="tab" aria-selected={c === criterio} onClick={() => setCriterio(c)} className="rounded-sm border-2 px-2 py-1.5 text-xs font-cinzel font-bold uppercase tracking-wide" style={{ borderColor: c === criterio ? '#C8A656' : '#4A3F2A', backgroundColor: c === criterio ? '#3A2F18' : colors.background.secondary, color: c === criterio ? '#F5E3B3' : colors.text.secondary }}>
              {NOME_DO_RANKING[c]}
            </button>
          ))}
        </div>
        <p className="text-xs" style={{ color: colors.text.secondary }}>{EXPLICACAO_DO_RANKING[criterio]}</p>
        {erro ? (
          <p role="alert" className="text-sm" style={{ color: '#E5484D' }}>Não foi possível carregar o ranking agora. Tente de novo em instantes.</p>
        ) : !dados ? (
          <p className="text-sm" style={{ color: colors.text.secondary }}>Carregando...</p>
        ) : (
          <>
            <p className="text-sm font-bold">
              {dados.estouEscondido ? 'Você está escondido deste ranking.' : dados.minhaPosicao ? `Sua posição: ${dados.minhaPosicao}º` : 'Você ainda não está neste ranking.'}
            </p>
            {dados.entradas.length === 0 ? (
              <p className="text-sm" style={{ color: colors.text.secondary }}>Ninguém no ranking ainda.</p>
            ) : (
              <ol className="flex flex-col gap-1.5">
                {dados.entradas.map((e) => (
                  <li key={`${e.posicao}-${e.nome}`} className="rounded-sm border flex items-center gap-2 px-2 py-1.5" style={{ borderColor: '#4A3F2A', backgroundColor: colors.background.secondary }}>
                    <span className="w-8 text-center font-cinzel font-bold" style={{ color: e.posicao <= 3 ? '#F5E3B3' : colors.text.secondary }}>{e.posicao}º</span>
                    <AvatarRedondo avatarId={e.avatarId} classeId={e.classeId} nome={e.nome} />
                    <span className="flex-1 min-w-0 flex flex-col leading-tight">
                      <span className="font-bold truncate">{e.nome}</span>
                      <span className="text-[11px]" style={{ color: colors.text.secondary }}>{CLASSES_MAP[e.classeId]?.nome ?? e.classeId} · nível {e.nivel}</span>
                    </span>
                    <span className="text-sm font-bold whitespace-nowrap">{e.valor} {e.valor === 1 ? singular : plural}</span>
                  </li>
                ))}
              </ol>
            )}
            <p className="text-[11px]" style={{ color: colors.text.secondary }}>Atualizado em {new Date(dados.atualizadoEm).toLocaleString('pt-BR')}. O ranking é renovado a cada 30 minutos.</p>
          </>
        )}
        <PrivacidadeSocial tokenFresco={tokenFresco} campo="escondidoNoRanking" aoMudar={() => void carregar()} />
      </div>
    </main>
  );
}
