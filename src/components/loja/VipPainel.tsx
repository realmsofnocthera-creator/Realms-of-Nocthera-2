'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { formatarReais } from '@/rules/vip';
import type { EstadoDaLojaVip } from '@/server/compras';
import { NOCTHERA_THEME } from '@/theme/theme';

type Token = () => Promise<string | null>;
const OURO = '#C8A656';
const VERMELHO = '#E5484D';
const VERDE = '#7BC47F';

async function chamar(tokenFresco: Token, corpo?: unknown): Promise<{ ok: boolean; dados: Record<string, unknown> }> {
  try {
    const token = await tokenFresco();
    const res = await fetch('/api/compras', {
      method: corpo ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token ?? ''}`, ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    return { ok: res.ok, dados: (await res.json().catch(() => ({}))) as Record<string, unknown> };
  } catch {
    return { ok: false, dados: { error: 'Sem conexão. Tente de novo.' } };
  }
}

const ESTADO_DO_PEDIDO: Record<string, string> = { criado: 'aguardando pagamento', pago: 'pago', estornado: 'estornado', cancelado: 'cancelado' };

/**
 * VIP e Loja VIP (8.5): o nível e o progresso do VIP, a tabela de níveis e, quando o Dono abrir a loja, os pacotes de
 * Diamantes. O nível sai do gasto real em dinheiro; os benefícios marcados "em breve" ainda não são entregues.
 */
export function VipPainel({ tokenFresco }: { tokenFresco: Token }) {
  const { colors } = NOCTHERA_THEME;
  const [estado, setEstado] = useState<EstadoDaLojaVip | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    const r = await chamar(tokenFresco);
    if (!r.ok) return setErro(String(r.dados.error ?? 'Não foi possível carregar o VIP agora.'));
    setEstado(r.dados as unknown as EstadoDaLojaVip);
    setErro(null);
  }, [tokenFresco]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function comprar(produto: string) {
    setOcupado(true);
    setAviso(null);
    const r = await chamar(tokenFresco, { produto });
    setOcupado(false);
    setAviso({ texto: String(r.dados.mensagem ?? r.dados.error ?? (r.ok ? 'Compra feita.' : 'Não foi possível agora.')), erro: !r.ok });
    await carregar();
  }

  if (erro) return <p role="alert" className="text-sm" style={{ color: VERMELHO }}>{erro}</p>;
  if (!estado) return <p className="text-sm" style={{ color: colors.text.secondary }}>Carregando...</p>;
  const { vip } = estado;
  return (
    <div className="flex flex-col gap-3">
      {aviso && <p role={aviso.erro ? 'alert' : 'status'} className="text-sm font-semibold" style={{ color: aviso.erro ? VERMELHO : VERDE }}>{aviso.texto}</p>}
      <section className="rounded-sm border px-3 py-2.5 flex flex-col gap-1.5" style={{ borderColor: OURO, backgroundColor: colors.background.secondary }}>
        <h2 className="text-sm font-cinzel font-bold" style={{ color: '#F5E3B3' }}>VIP {vip.nivel} · {vip.nome}</h2>
        <p className="text-[12px]" style={{ color: colors.text.secondary }}>
          Gasto acumulado: {formatarReais(vip.gastoCentavos)} · bônus de {vip.bonus.xp}% de XP e {vip.bonus.ouro}% de ouro nos combates
          {vip.ouroDiario ? ` · ${vip.ouroDiario.toLocaleString('pt-BR')} de ouro por dia no Correio` : ''}
        </p>
        <div role="progressbar" aria-label="Progresso para o próximo nível VIP" aria-valuenow={vip.percentual} aria-valuemin={0} aria-valuemax={100} className="h-2 rounded-sm" style={{ backgroundColor: '#221C16' }}>
          <div className="h-2 rounded-sm" style={{ width: `${vip.percentual}%`, backgroundColor: OURO }} />
        </div>
        <p className="text-[11px]" style={{ color: colors.text.secondary }}>
          {vip.proximo ? `Faltam ${formatarReais(vip.proximo.faltamCentavos)} para o VIP ${vip.proximo.nivel} (${vip.proximo.nome}).` : 'Você chegou ao VIP máximo.'}
        </p>
        <p className="text-[11px]" style={{ color: colors.text.secondary }}>O nível é permanente enquanto o gasto se mantém. Compras estornadas deixam de contar. Os bônus de XP e ouro substituem os do nível anterior (não somam).</p>
      </section>

      <section className="flex flex-col gap-1.5">
        <h2 className="text-sm font-cinzel font-bold" style={{ color: '#F5E3B3' }}>Pacotes de Diamantes</h2>
        {!estado.aberta ? (
          <p role="status" className="text-xs font-semibold" style={{ color: '#E6C775' }}>A Loja VIP ainda não abriu. Em breve!</p>
        ) : (
          <>
            {estado.dividaDeDiamantes > 0 && (
              <p role="alert" className="text-xs font-semibold" style={{ color: VERMELHO }}>Há um estorno de {estado.dividaDeDiamantes.toLocaleString('pt-BR')} Diamantes ainda não coberto. Novas compras ficam bloqueadas até ele ser pago.</p>
            )}
            {estado.primeiraCompra && <p className="text-[11px] font-semibold" style={{ color: '#E6C775' }}>Primeira compra em dobro: o primeiro pacote que você comprar rende {estado.multiplicadorDaPrimeiraCompra}× Diamantes.</p>}
            {!estado.podeComprar && <p role="status" className="text-xs font-semibold" style={{ color: '#E6C775' }}>As compras ainda não estão disponíveis.</p>}
            <ul className="grid grid-cols-2 gap-1.5">
              {estado.pacotes.map((p) => (
                <li key={p.id} className="rounded-sm border px-2.5 py-2 flex flex-col gap-1" style={{ borderColor: '#4A3F2A', backgroundColor: colors.background.secondary }}>
                  <span className="text-xs font-semibold" style={{ color: '#F5E3B3' }}>{p.nome}</span>
                  <span className="text-[12px] font-bold" style={{ color: OURO }}>{p.total.toLocaleString('pt-BR')} Diamantes</span>
                  <span className="text-[10px]" style={{ color: colors.text.secondary }}>
                    {p.base.toLocaleString('pt-BR')}{p.bonus ? ` + ${p.bonus.toLocaleString('pt-BR')} de bônus` : ''}{estado.primeiraCompra ? ' (×2)' : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => void comprar(p.id)}
                    disabled={ocupado || !estado.podeComprar || estado.dividaDeDiamantes > 0}
                    className="rounded-sm border px-2 py-1.5 text-xs font-bold disabled:opacity-50"
                    style={{ borderColor: OURO, backgroundColor: '#3A2F18', color: '#F5E3B3' }}
                  >
                    {formatarReais(p.precoCentavos)}
                  </button>
                </li>
              ))}
            </ul>
            {estado.provedor === 'teste' && <p className="text-[11px]" style={{ color: colors.text.secondary }}>Ambiente de teste: nenhuma cobrança real é feita.</p>}
          </>
        )}
      </section>

      <section className="flex flex-col gap-1.5">
        <h2 className="text-sm font-cinzel font-bold" style={{ color: '#F5E3B3' }}>Níveis VIP</h2>
        <ul className="flex flex-col gap-1">
          {estado.niveis.map((n) => (
            <li key={n.nivel} className="rounded-sm border px-2.5 py-1.5 flex flex-col gap-0.5" style={{ borderColor: n.atual ? OURO : '#4A3F2A', backgroundColor: colors.background.secondary, opacity: n.desbloqueado ? 1 : 0.75 }}>
              <div className="flex justify-between gap-2">
                <span className="text-xs font-semibold" style={{ color: n.atual ? OURO : '#F5E3B3' }}>VIP {n.nivel} · {n.nome}{n.atual ? ' (você)' : ''}</span>
                <span className="text-[11px] shrink-0" style={{ color: colors.text.secondary }}>{formatarReais(n.gastoCentavos)}</span>
              </div>
              {(n.xp > 0 || n.ouro > 0) && <span className="text-[11px]" style={{ color: colors.text.primary }}>+{n.xp}% de XP{n.ouro ? ` · +${n.ouro}% de ouro` : ''}</span>}
              {n.beneficios.map((b) => (
                <span key={b.texto} className="text-[11px]" style={{ color: b.estado === 'ativo' ? colors.text.primary : colors.text.secondary }}>
                  {b.estado === 'ativo' ? '✓' : '·'} {b.texto}{b.estado === 'emBreve' ? ' (em breve)' : ''}
                </span>
              ))}
            </li>
          ))}
        </ul>
      </section>

      {estado.pedidos.length > 0 && (
        <section className="flex flex-col gap-1">
          <h2 className="text-sm font-cinzel font-bold" style={{ color: '#F5E3B3' }}>Seus pedidos</h2>
          <ul className="flex flex-col gap-1">
            {estado.pedidos.map((p) => (
              <li key={p.id} className="text-[11px] flex justify-between gap-2" style={{ color: colors.text.secondary }}>
                <span>{p.nome} · {formatarReais(p.valorCentavos)}</span>
                <span className="shrink-0">{ESTADO_DO_PEDIDO[p.estado] ?? p.estado} · {new Date(p.criadoEm).toLocaleDateString('pt-BR')}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
