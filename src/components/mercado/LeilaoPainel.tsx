'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EMBLEMA_RARIDADE_MAP } from '@/rules/emblemas';
import { NOME_DA_CATEGORIA, type MoedaDoMercado } from '@/rules/mercado';
import type { EstadoDoLeilao, ItemDoLeilaoNaTela } from '@/server/leilao';
import { NOCTHERA_THEME } from '@/theme/theme';

type Token = () => Promise<string | null>;
const OURO = '#C8A656';
const VERMELHO = '#E5484D';
const VERDE = '#7BC47F';
/** Com item aberto, a tela atualiza a cada 3 segundos (só com a aba visível); fora disso, a cada 30 segundos. */
const ATUALIZAR_ABERTO_MS = 3_000;
const ATUALIZAR_FECHADO_MS = 30_000;

const valor = (moeda: MoedaDoMercado, n: number) => `${n.toLocaleString('pt-BR')} ${moeda === 'ouro' ? 'de ouro' : n === 1 ? 'Diamante' : 'Diamantes'}`;
const corDaRaridade = (r: string) => EMBLEMA_RARIDADE_MAP[r as keyof typeof EMBLEMA_RARIDADE_MAP]?.cor ?? '#F5E3B3';

function relogio(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  return h ? `${h} h ${String(m).padStart(2, '0')} min` : `${m}:${String(seg).padStart(2, '0')}`;
}

async function chamar(tokenFresco: Token, corpo?: unknown): Promise<{ ok: boolean; dados: Record<string, unknown> }> {
  try {
    const token = await tokenFresco();
    const res = await fetch('/api/leilao', {
      method: corpo ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token ?? ''}`, ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    return { ok: res.ok, dados: (await res.json().catch(() => ({}))) as Record<string, unknown> };
  } catch {
    return { ok: false, dados: { error: 'Sem conexão. Tente de novo.' } };
  }
}

/**
 * Leilão (7.2): segunda, quarta, sexta, sábado e domingo, das 19h às 20h. 10 itens de 5 minutos cada; o botão dá o
 * próximo lance (o mínimo ou 10% acima do atual). O valor fica reservado e volta se alguém cobrir; o item ganho chega
 * pelo Correio.
 */
export function LeilaoPainel({ tokenFresco }: { tokenFresco: Token }) {
  const { colors } = NOCTHERA_THEME;
  const [estado, setEstado] = useState<EstadoDoLeilao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  // diferença entre o relógio do servidor e o do aparelho, para a contagem regressiva
  const diferenca = useRef(0);
  const [agora, setAgora] = useState(() => Date.now());

  const carregar = useCallback(async () => {
    const r = await chamar(tokenFresco);
    if (!r.ok) {
      setErro(String(r.dados.error ?? 'Não foi possível carregar o leilão.'));
      return;
    }
    const e = r.dados as unknown as EstadoDoLeilao;
    diferenca.current = Date.parse(e.agora) - Date.now();
    setEstado(e);
    setErro(null);
  }, [tokenFresco]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const temAberto = !!estado?.itens.some((i) => i.situacao === 'aberto');
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void carregar();
    }, temAberto ? ATUALIZAR_ABERTO_MS : ATUALIZAR_FECHADO_MS);
    return () => window.clearInterval(id);
  }, [carregar, temAberto]);

  useEffect(() => {
    const id = window.setInterval(() => setAgora(Date.now() + diferenca.current), 1000);
    return () => window.clearInterval(id);
  }, []);

  async function lance(i: ItemDoLeilaoNaTela) {
    setOcupado(true);
    setAviso(null);
    const r = await chamar(tokenFresco, { indice: i.indice, valor: i.proximo });
    setOcupado(false);
    setAviso({ texto: String(r.dados.mensagem ?? r.dados.error ?? (r.ok ? 'Lance dado.' : 'Não foi possível agora.')), erro: !r.ok });
    await carregar();
  }

  if (erro) return <p role="alert" className="text-sm" style={{ color: VERMELHO }}>{erro}</p>;
  if (!estado) return <p className="text-sm" style={{ color: colors.text.secondary }}>Carregando...</p>;
  const dataDoProximo = new Date(estado.comecaEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <section className="flex flex-col gap-2" aria-label="Leilão">
      {aviso && <p role={aviso.erro ? 'alert' : 'status'} className="text-sm font-semibold" style={{ color: aviso.erro ? VERMELHO : VERDE }}>{aviso.texto}</p>}
      <p className="text-[11px]" style={{ color: colors.text.secondary }}>
        Segunda, quarta, sexta, sábado e domingo, das 19h às 20h. Cada item fica 5 minutos; lance nos últimos 15 segundos estende o tempo. O valor do lance fica reservado e volta se alguém cobrir. O item ganho chega pelo Correio.
      </p>
      {!estado.podeDarLance && <p className="text-xs font-semibold" style={{ color: '#E6C775' }}>O leilão abre no nível {estado.nivelNecessario}.</p>}
      {!estado.hoje ? (
        <p className="text-sm">Hoje não tem leilão. O próximo é {dataDoProximo}.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {estado.itens.map((i) => {
            const restante = Date.parse(i.fim) - agora;
            const paraAbrir = Date.parse(i.inicio) - agora;
            return (
              <li key={i.indice} className="rounded-sm border px-2.5 py-2 flex flex-col gap-1" style={{ borderColor: i.situacao === 'aberto' ? OURO : '#4A3F2A', backgroundColor: colors.background.secondary, opacity: i.situacao === 'encerrado' ? 0.75 : 1 }}>
                <div className="flex justify-between gap-2">
                  <span className="text-xs font-semibold truncate" style={{ color: corDaRaridade(i.raridade) }}>
                    {i.quantidade > 1 ? `${i.quantidade}× ` : ''}
                    {i.nome}
                  </span>
                  <span className="text-[11px] shrink-0 font-bold" style={{ color: i.situacao === 'aberto' ? OURO : colors.text.secondary }}>
                    {i.situacao === 'aberto' ? relogio(restante) : i.situacao === 'aguardando' ? `abre em ${relogio(paraAbrir)}` : 'encerrado'}
                  </span>
                </div>
                <span className="text-[11px]" style={{ color: colors.text.secondary }}>{[NOME_DA_CATEGORIA[i.categoria], i.nomeDaRaridade, i.detalhe].filter(Boolean).join(' · ')}</span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px]">
                    {i.lance
                      ? `${i.situacao === 'encerrado' ? 'Vencedor' : 'Maior lance'}: ${i.meu ? 'você' : i.lance.nome} · ${valor(i.moeda, i.lance.valor)}`
                      : i.situacao === 'encerrado'
                        ? 'Sem lances'
                        : `Lance mínimo: ${valor(i.moeda, i.proximo)}`}
                  </span>
                  {i.situacao === 'aberto' && !i.meu && (
                    <button
                      type="button"
                      onClick={() => void lance(i)}
                      disabled={ocupado || !estado.podeDarLance}
                      className="rounded-sm border px-3 py-1.5 text-xs font-bold disabled:opacity-50 shrink-0"
                      style={{ borderColor: OURO, backgroundColor: '#3A2F18', color: '#F5E3B3' }}
                    >
                      Lance de {valor(i.moeda, i.proximo)}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
