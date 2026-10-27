'use client';

import React, { useState } from 'react';
import { formatarReais } from '@/rules/vip';
import type { ComprasDoJogador } from '@/server/comprasMestre';
import { NOCTHERA_THEME } from '@/theme/theme';
import { Cartao, chamar, OURO, VERMELHO } from '@/components/mestre/comum';
import type { SessaoDoPainel } from '@/components/mestre/MestrePainel';

type Token = () => Promise<string>;

/**
 * Compras e VIP (8.5): o VIP, o saldo de Diamantes e os pedidos de um jogador (pelo identificador, o mesmo da aba
 * Jogadores). Só o Dono estorna um pedido pago, sempre com o motivo; fica no log.
 */
export function ComprasPainel({ sessao, tokenFresco }: { sessao: SessaoDoPainel; tokenFresco: Token }) {
  const { colors } = NOCTHERA_THEME;
  const podeEstornar = sessao.permissoes.includes('jogadores.ajustar');
  const [uid, setUid] = useState('');
  const [dados, setDados] = useState<ComprasDoJogador | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const campo = 'rounded-sm border px-2 py-1 text-[12px] w-full';
  const estiloCampo = { backgroundColor: colors.background.primary, borderColor: `${OURO}66`, color: colors.text.primary };

  async function buscar(id: string) {
    setErro(null);
    const r = await chamar(tokenFresco, `/api/mestre/compras?uid=${encodeURIComponent(id.trim())}`);
    if (r.ok) setDados(r.dados as unknown as ComprasDoJogador);
    else {
      setDados(null);
      setErro(String(r.dados.error ?? 'Não foi possível buscar.'));
    }
  }

  async function estornar(pedido: string) {
    if (!dados) return;
    setOcupado(true);
    setAviso(null);
    setErro(null);
    const r = await chamar(tokenFresco, '/api/mestre/compras', { method: 'POST', body: JSON.stringify({ uid: dados.uid, pedido, motivo }) });
    setOcupado(false);
    if (!r.ok) return setErro(String(r.dados.error ?? 'Não foi possível estornar.'));
    setAviso(String(r.dados.mensagem ?? 'Feito.'));
    setMotivo('');
    await buscar(dados.uid);
  }

  return (
    <div className="flex flex-col gap-3">
      <Cartao titulo="Compras e VIP de um jogador">
        <form
          className="flex gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (uid.trim()) void buscar(uid);
          }}
        >
          <input value={uid} onChange={(e) => setUid(e.target.value)} placeholder="Identificador (uid) do jogador" aria-label="Identificador do jogador" className={campo} style={estiloCampo} />
          <button type="submit" className="rounded-sm border px-3 py-1 text-xs font-bold shrink-0" style={{ borderColor: OURO, backgroundColor: '#3A2F18', color: '#F5E3B3' }}>Buscar</button>
        </form>
        {erro && <p role="alert" className="text-xs font-semibold" style={{ color: VERMELHO }}>{erro}</p>}
        {aviso && <p role="status" className="text-xs font-semibold" style={{ color: '#7BC47F' }}>{aviso}</p>}
      </Cartao>
      {dados && (
        <Cartao titulo={`${dados.nome} · VIP ${dados.vip.nivel} (${dados.vip.nome})`}>
          <p className="text-[12px]" style={{ color: colors.text.secondary }}>
            Gasto: {formatarReais(dados.vip.gastoCentavos)} · Diamantes: {dados.diamantes.toLocaleString('pt-BR')}
            {dados.dividaDeDiamantes ? ` · dívida de estorno: ${dados.dividaDeDiamantes.toLocaleString('pt-BR')}` : ''}
          </p>
          {podeEstornar && <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo do estorno (obrigatório)" aria-label="Motivo do estorno" className={campo} style={estiloCampo} />}
          {dados.pedidos.length === 0 && <p className="text-[12px]" style={{ color: colors.text.secondary }}>Nenhum pedido.</p>}
          <ul className="flex flex-col gap-1">
            {dados.pedidos.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 text-[12px]">
                <span>
                  {p.nome} · {formatarReais(p.valorCentavos)} · <strong>{p.estado}</strong> · {new Date(p.criadoEm).toLocaleString('pt-BR')}
                </span>
                {podeEstornar && p.estado === 'pago' && (
                  <button type="button" disabled={ocupado || motivo.trim().length < 3} onClick={() => void estornar(p.id)} className="rounded-sm border px-2 py-1 text-[11px] font-bold disabled:opacity-50 shrink-0" style={{ borderColor: VERMELHO, color: VERMELHO }}>
                    Estornar
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Cartao>
      )}
    </div>
  );
}
