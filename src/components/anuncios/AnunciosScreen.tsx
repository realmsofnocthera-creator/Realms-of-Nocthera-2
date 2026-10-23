'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { NOME_DO_TIPO_DE_ANUNCIO, validarAnuncio, type AnuncioDados, type TipoDeAnuncio } from '@/rules/anuncio';
import { descreverJanela } from '@/lib/anunciosTela';
import { marcarAnunciosComoVistos } from '@/lib/useAnunciosNovos';
import { NOCTHERA_THEME } from '@/theme/theme';

const COR_DO_TIPO: Readonly<Record<TipoDeAnuncio, string>> = { novidade: '#7BC47F', aviso: '#E6C775', manutencao: '#E5484D', evento: '#5AA7F0' };

interface Item {
  id: string;
  dados: AnuncioDados;
}

/** Anúncios do Menu (3.5.3.4): o que o painel publicou e está valendo agora. */
export function AnunciosScreen({ tokenFresco }: { tokenFresco: () => Promise<string | null> }) {
  const { colors } = NOCTHERA_THEME;
  const [itens, setItens] = useState<Item[] | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let cancelado = false;
    void (async () => {
      try {
        const token = await tokenFresco();
        const res = await fetch('/api/conteudo/anuncio', { headers: { Authorization: `Bearer ${token ?? ''}` } });
        if (!res.ok) throw new Error('falhou');
        const { itens: lista } = (await res.json()) as { itens: { id: string; dados: unknown }[] };
        const validos = lista.flatMap((i) => {
          const v = validarAnuncio(i.dados);
          return v.ok ? [{ id: i.id, dados: v.dados }] : [];
        });
        if (!cancelado) {
          setItens(validos);
          marcarAnunciosComoVistos(validos.map((v) => v.id));
        }
      } catch {
        if (!cancelado) setErro(true);
      }
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-dvh w-full flex flex-col items-center px-2.5 sm:px-5 py-3 sm:py-6" style={{ backgroundColor: colors.background.primary, color: colors.text.primary }}>
      <div className="w-full max-w-[480px] flex flex-col gap-3">
        <header className="flex items-center gap-2">
          <Link href="/menu" aria-label="Voltar ao Menu" className="p-1"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-2xl font-cinzel font-extrabold italic tracking-widest uppercase" style={{ color: '#F5E3B3' }}>Anúncios</h1>
        </header>
        {erro ? (
          <p role="alert" className="text-sm" style={{ color: '#E5484D' }}>Não foi possível carregar os anúncios agora. Tente de novo em instantes.</p>
        ) : itens === null ? (
          <p className="text-sm" style={{ color: colors.text.secondary }}>Carregando...</p>
        ) : itens.length === 0 ? (
          <p className="text-sm" style={{ color: colors.text.secondary }}>Nenhum anúncio por enquanto.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {itens.map(({ id, dados }) => (
              <li key={id} className="rounded-sm border-2 p-3 flex flex-col gap-1.5" style={{ borderColor: '#C8A656', backgroundColor: colors.background.secondary }}>
                <span className="self-start text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm" style={{ color: '#0D0D0D', backgroundColor: COR_DO_TIPO[dados.tipo] }}>{NOME_DO_TIPO_DE_ANUNCIO[dados.tipo]}</span>
                <h2 className="font-cinzel font-bold text-base">{dados.titulo}</h2>
                <p className="text-sm whitespace-pre-wrap">{dados.texto}</p>
                {(dados.inicio || dados.fim) && <p className="text-[11px]" style={{ color: colors.text.secondary }}>{descreverJanela(dados)}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
