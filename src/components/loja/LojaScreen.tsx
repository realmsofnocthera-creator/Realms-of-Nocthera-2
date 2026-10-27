'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ABAS_DA_LOJA, NOME_DA_ABA, type AbaDaLoja, type MoedaDaLoja } from '@/rules/loja';
import { EMBLEMA_RARIDADE_MAP } from '@/rules/emblemas';
import type { EstadoDaLoja, ProdutoNaTela } from '@/server/loja';
import { NOCTHERA_THEME } from '@/theme/theme';
import { VipPainel } from '@/components/loja/VipPainel';

type Token = () => Promise<string | null>;
const OURO = '#C8A656';
const VERMELHO = '#E5484D';
const VERDE = '#7BC47F';

async function chamar(tokenFresco: Token, corpo?: unknown): Promise<{ ok: boolean; dados: Record<string, unknown> }> {
  try {
    const token = await tokenFresco();
    const res = await fetch('/api/loja', {
      method: corpo ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token ?? ''}`, ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    return { ok: res.ok, dados: (await res.json().catch(() => ({}))) as Record<string, unknown> };
  } catch {
    return { ok: false, dados: { error: 'Sem conexão. Tente de novo.' } };
  }
}

const valor = (m: MoedaDaLoja, n: number) => `${n.toLocaleString('pt-BR')} ${m === 'ouro' ? 'de ouro' : m === 'diamantes' ? (n === 1 ? 'Diamante' : 'Diamantes') : 'de Essência'}`;
const corDaRaridade = (r: string) => EMBLEMA_RARIDADE_MAP[r as keyof typeof EMBLEMA_RARIDADE_MAP]?.cor ?? '#F5E3B3';
/** Materiais e recursos podem ser comprados em quantidade; o resto, um por vez. */
const emQuantidade = (p: ProdutoNaTela) => p.tipo === 'material' || p.tipo === 'recurso';

function Produto({ p, estado, ocupado, comprar }: { p: ProdutoNaTela; estado: EstadoDaLoja; ocupado: boolean; comprar: (p: ProdutoNaTela, q: number, escolha?: string) => void }) {
  const { colors } = NOCTHERA_THEME;
  const [quantidade, setQuantidade] = useState(1);
  const [escolha, setEscolha] = useState('');
  const q = Math.min(Math.max(1, quantidade), Math.max(1, p.restantes));
  const opcoes = p.tipo === 'escolhaCarta' ? estado.escolhas.cartas : p.tipo === 'escolhaEmblema' ? estado.escolhas.emblemas : null;
  const semSaldo = estado.saldos[p.moeda] < p.preco * q;
  const esgotado = p.restantes === 0;
  return (
    <li className="rounded-sm border px-2.5 py-2 flex flex-col gap-1.5" style={{ borderColor: '#4A3F2A', backgroundColor: colors.background.secondary, opacity: esgotado ? 0.6 : 1 }}>
      <div className="flex justify-between gap-2">
        <span className="text-xs font-semibold" style={{ color: corDaRaridade(p.raridade) }}>{p.nome}</span>
        <span className="text-[11px] shrink-0 font-bold" style={{ color: OURO }}>{valor(p.moeda, p.preco)}</span>
      </div>
      <span className="text-[11px]" style={{ color: colors.text.secondary }}>
        {p.nomeDaRaridade} · {esgotado ? 'limite do mês atingido' : `pode comprar mais ${p.restantes} neste mês`}
      </span>
      {opcoes && !esgotado && (
        <select value={escolha} onChange={(e) => setEscolha(e.target.value)} aria-label={`Escolha do ${p.nome}`} className="rounded-sm border px-2 py-1 text-xs" style={{ backgroundColor: '#221C16', borderColor: '#4A3F2A', color: colors.text.primary }}>
          <option value="">Escolha…</option>
          {opcoes.map((o) => (
            <option key={o.id} value={o.id}>{o.nome}</option>
          ))}
        </select>
      )}
      {!esgotado && (
        <div className="flex items-center justify-end gap-1.5">
          {emQuantidade(p) && p.restantes > 1 && (
            <>
              <button type="button" aria-label="Menos" onClick={() => setQuantidade(Math.max(1, q - 1))} className="rounded-sm border w-7 h-7 text-sm font-bold" style={{ borderColor: '#4A3F2A', color: '#F5E3B3' }}>−</button>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={p.restantes}
                value={q}
                onChange={(e) => setQuantidade(Number(e.target.value) || 1)}
                aria-label={`Quantidade de ${p.nome}`}
                className="w-12 rounded-sm border px-1 py-1 text-xs text-center"
                style={{ backgroundColor: '#221C16', borderColor: '#4A3F2A', color: colors.text.primary }}
              />
              <button type="button" aria-label="Mais" onClick={() => setQuantidade(Math.min(p.restantes, q + 1))} className="rounded-sm border w-7 h-7 text-sm font-bold" style={{ borderColor: '#4A3F2A', color: '#F5E3B3' }}>+</button>
            </>
          )}
          <button
            type="button"
            onClick={() => comprar(p, q, escolha || undefined)}
            disabled={ocupado || !estado.podeComprar || semSaldo || (!!opcoes && !escolha)}
            className="rounded-sm border px-3 py-1.5 text-xs font-bold disabled:opacity-50 shrink-0"
            style={{ borderColor: OURO, backgroundColor: '#3A2F18', color: '#F5E3B3' }}
          >
            {semSaldo ? 'Saldo insuficiente' : `Comprar${q > 1 ? ` ${q}` : ''} · ${valor(p.moeda, p.preco * q)}`}
          </button>
        </div>
      )}
    </li>
  );
}

/**
 * Loja (7.2): abas por tipo de item, nada acima do Épico. Materiais, cartas e emblemas giram toda segunda à meia-noite;
 * o limite de cada item zera no dia 1 de cada mês. O jogador só compra.
 */
export function LojaScreen({ tokenFresco }: { tokenFresco: Token }) {
  const { colors } = NOCTHERA_THEME;
  const [estado, setEstado] = useState<EstadoDaLoja | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aba, setAba] = useState<AbaDaLoja | 'vip'>('materiais');

  const carregar = useCallback(async () => {
    const r = await chamar(tokenFresco);
    if (!r.ok) {
      setErro(String(r.dados.error ?? 'Não foi possível carregar a Loja agora.'));
      return;
    }
    setEstado(r.dados as unknown as EstadoDaLoja);
    setErro(null);
  }, [tokenFresco]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function comprar(p: ProdutoNaTela, quantidade: number, escolha?: string) {
    setOcupado(true);
    setAviso(null);
    const r = await chamar(tokenFresco, { chave: p.chave, quantidade, escolha });
    setOcupado(false);
    setAviso({ texto: String(r.dados.mensagem ?? r.dados.error ?? (r.ok ? 'Compra feita.' : 'Não foi possível agora.')), erro: !r.ok });
    await carregar();
  }

  const produtos = estado?.produtos.filter((p) => p.aba === aba) ?? [];
  const naAbaVip = aba === 'vip';
  const gira = estado ? new Date(estado.giraEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: '2-digit' }) : '';

  return (
    <main className="min-h-dvh w-full flex flex-col items-center px-2.5 sm:px-5 py-3 sm:py-6" style={{ backgroundColor: colors.background.primary, color: colors.text.primary }}>
      <div className="w-full max-w-[520px] flex flex-col gap-3">
        <header className="flex items-center gap-2">
          <Link href="/hub" aria-label="Voltar" className="p-1"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-2xl font-cinzel font-extrabold italic tracking-widest uppercase" style={{ color: '#F5E3B3' }}>Loja</h1>
        </header>
        {aviso && <p role={aviso.erro ? 'alert' : 'status'} className="text-sm font-semibold" style={{ color: aviso.erro ? VERMELHO : VERDE }}>{aviso.texto}</p>}
        {erro ? (
          <p role="alert" className="text-sm" style={{ color: VERMELHO }}>{erro}</p>
        ) : !estado ? (
          <p className="text-sm" style={{ color: colors.text.secondary }}>Carregando...</p>
        ) : (
          <>
            <p className="text-[11px]" style={{ color: colors.text.secondary }}>
              Seu saldo: {valor('ouro', estado.saldos.ouro)} · {valor('diamantes', estado.saldos.diamantes)} · {valor('essenciaDeSoberano', estado.saldos.essenciaDeSoberano)}
            </p>
            {estado.descontoDoPasse > 0 && <p className="text-[11px] font-semibold" style={{ color: VERDE }}>Desconto do seu Passe: -{estado.descontoDoPasse}% (os preços abaixo já vêm com ele).</p>}
            {!estado.podeComprar && <p role="status" className="text-xs font-semibold" style={{ color: '#E6C775' }}>A loja abre no nível {estado.nivelNecessario}.</p>}
            <div role="tablist" aria-label="Loja" className="flex flex-wrap gap-1.5">
              {ABAS_DA_LOJA.map((a) => (
                <button
                  key={a}
                  type="button"
                  role="tab"
                  aria-selected={aba === a}
                  onClick={() => setAba(a)}
                  className="rounded-sm border px-2.5 py-1 text-xs font-bold font-cinzel"
                  style={{ borderColor: OURO, backgroundColor: aba === a ? OURO : '#221C16', color: aba === a ? '#1A140E' : '#F5E3B3' }}
                >
                  {NOME_DA_ABA[a]}
                </button>
              ))}
              <button
                type="button"
                role="tab"
                aria-selected={naAbaVip}
                onClick={() => setAba('vip')}
                className="rounded-sm border px-2.5 py-1 text-xs font-bold font-cinzel"
                style={{ borderColor: OURO, backgroundColor: naAbaVip ? OURO : '#221C16', color: naAbaVip ? '#1A140E' : '#F5E3B3' }}
              >
                VIP
              </button>
            </div>
            {naAbaVip ? (
              <VipPainel tokenFresco={tokenFresco} />
            ) : (
              <>
            <p className="text-[11px]" style={{ color: colors.text.secondary }}>
              {produtos.some((p) => p.daSemana) ? `Os itens desta aba mudam ${gira} à meia-noite. ` : ''}O limite de cada item zera no dia 1 de cada mês.
            </p>
            <ul className="flex flex-col gap-1.5">
              {produtos.map((p) => (
                <Produto key={p.chave} p={p} estado={estado} ocupado={ocupado} comprar={(x, q, e) => void comprar(x, q, e)} />
              ))}
            </ul>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
