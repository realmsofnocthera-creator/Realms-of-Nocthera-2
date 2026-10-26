'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { SILENCIOS } from '@/rules/chat';
import type { CanalParaOMestre } from '@/server/chatMestre';
import { NOCTHERA_THEME } from '@/theme/theme';
import { Cartao, chamar, OURO, VERMELHO } from '@/components/mestre/comum';
import type { SessaoDoPainel } from '@/components/mestre/MestrePainel';

type Token = () => Promise<string>;
const hora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/**
 * Moderação do chat (7.7): ver os canais (Global ou o de uma guilda), apagar mensagens e silenciar jogadores por 1
 * hora, 24 horas ou 7 dias. Ver é de quem lê jogadores; apagar e silenciar é do Moderador e do Dono, sempre com o motivo;
 * tudo fica no log. As denúncias dos jogadores chegam na fila de revisão da aba Jogadores.
 */
export function ChatPainel({ sessao, tokenFresco }: { sessao: SessaoDoPainel; tokenFresco: Token }) {
  const { colors } = NOCTHERA_THEME;
  const podeMudar = sessao.permissoes.includes('jogadores.sancionar');
  const [guilda, setGuilda] = useState('');
  const [canal, setCanal] = useState<CanalParaOMestre | null>(null);
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [uid, setUid] = useState('');
  const [duracao, setDuracao] = useState<string>(SILENCIOS[0].id);
  const campo = 'rounded-sm border px-2 py-1 text-[12px] w-full';
  const estiloCampo = { backgroundColor: colors.background.primary, borderColor: `${OURO}66`, color: colors.text.primary };
  const id = guilda.trim() ? `guilda_${guilda.trim()}` : 'global';

  const carregar = useCallback(async () => {
    setErro(null);
    const r = await chamar(tokenFresco, `/api/mestre/chat?canal=${encodeURIComponent(id)}`);
    if (r.ok) setCanal(r.dados as unknown as CanalParaOMestre);
    else setErro(String(r.dados.error ?? 'Não foi possível abrir o canal.'));
  }, [tokenFresco, id]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function fazer(corpo: Record<string, unknown>) {
    setOcupado(true);
    setErro(null);
    setAviso(null);
    const r = await chamar(tokenFresco, '/api/mestre/chat', { method: 'POST', body: JSON.stringify({ ...corpo, motivo }) });
    setOcupado(false);
    if (!r.ok) return setErro(String(r.dados.error ?? 'Não foi possível concluir.'));
    setAviso(String(r.dados.mensagem ?? 'Feito.'));
    await carregar();
  }

  const semMotivo = motivo.trim().length < 5;
  return (
    <div className="flex flex-col gap-3">
      <Cartao titulo="Chat">
        <div className="flex gap-2 items-end">
          <label className="text-[11px] flex flex-col gap-0.5 flex-1">Canal: vazio = Global; ou o identificador da guilda (g_…), que aparece na aba Guildas
            <input value={guilda} onChange={(e) => setGuilda(e.target.value)} placeholder="Global" className={campo} style={estiloCampo} autoComplete="off" />
          </label>
          <button type="button" onClick={() => void carregar()} className="inline-flex items-center gap-1 px-3 py-1.5 rounded border text-xs font-bold" style={{ borderColor: OURO }}>
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </button>
        </div>
        {podeMudar && (
          <label className="text-[11px] flex flex-col gap-0.5">Motivo (obrigatório para apagar ou silenciar; fica no log)
            <input value={motivo} onChange={(e) => setMotivo(e.target.value)} className={campo} style={estiloCampo} maxLength={300} autoComplete="off" />
          </label>
        )}
        {erro && <p role="alert" className="text-[12px] font-semibold" style={{ color: VERMELHO }}>{erro}</p>}
        {aviso && <p role="status" className="text-[12px] font-semibold" style={{ color: '#7BC47F' }}>{aviso}</p>}
        {canal && canal.mensagens.length === 0 && <p className="text-[12px]" style={{ color: colors.text.secondary }}>Nenhuma mensagem neste canal.</p>}
        <ul className="flex flex-col gap-1.5">
          {(canal?.mensagens ?? []).map((m) => (
            <li key={m.id} className="rounded-sm border px-2 py-1.5 text-[12px] flex flex-col gap-1" style={{ borderColor: `${OURO}33` }}>
              <div>
                <span style={{ color: colors.text.secondary }}>{hora(m.em)} </span>
                <b>{m.nome}</b> <code className="text-[10px]" style={{ color: colors.text.secondary }}>{m.uid}</code>
                {m.silenciado && <span className="ml-1 text-[10px] font-bold" style={{ color: '#E6C775' }}>silenciado</span>}
                <div>{m.texto}</div>
              </div>
              {podeMudar && (
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" disabled={ocupado || semMotivo} onClick={() => void fazer({ acao: 'apagar', canal: id, mensagem: m.id })} className="px-2 py-0.5 rounded border text-[11px] font-bold disabled:opacity-50" style={{ borderColor: VERMELHO, color: VERMELHO }}>Apagar</button>
                  {SILENCIOS.map((s) => (
                    <button key={s.id} type="button" disabled={ocupado || semMotivo} onClick={() => void fazer({ acao: 'silenciar', uid: m.uid, duracao: s.id })} className="px-2 py-0.5 rounded border text-[11px] disabled:opacity-50" style={{ borderColor: OURO }}>Silenciar {s.nome}</button>
                  ))}
                  {m.silenciado && (
                    <button type="button" disabled={ocupado || semMotivo} onClick={() => void fazer({ acao: 'tirarSilencio', uid: m.uid })} className="px-2 py-0.5 rounded border text-[11px] disabled:opacity-50" style={{ borderColor: '#7BC47F', color: '#7BC47F' }}>Levantar silêncio</button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </Cartao>

      {podeMudar && (
        <Cartao titulo="Silenciar por identificador (uid)">
          <p className="text-[11px]" style={{ color: colors.text.secondary }}>Para quando a mensagem já saiu do canal: o uid vem na denúncia, na fila de revisão. Usa o motivo de cima.</p>
          <div className="flex flex-wrap gap-2 items-end">
            <label className="text-[11px] flex flex-col gap-0.5 flex-1 min-w-[160px]">uid do jogador
              <input value={uid} onChange={(e) => setUid(e.target.value)} className={campo} style={estiloCampo} autoComplete="off" />
            </label>
            <label className="text-[11px] flex flex-col gap-0.5">Duração
              <select value={duracao} onChange={(e) => setDuracao(e.target.value)} className={campo} style={estiloCampo}>
                {SILENCIOS.map((s) => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </label>
            <button type="button" disabled={ocupado || semMotivo || uid.trim().length < 3} onClick={() => void fazer({ acao: 'silenciar', uid: uid.trim(), duracao })} className="px-3 py-1.5 rounded border text-xs font-bold disabled:opacity-50" style={{ borderColor: OURO }}>Silenciar</button>
            <button type="button" disabled={ocupado || semMotivo || uid.trim().length < 3} onClick={() => void fazer({ acao: 'tirarSilencio', uid: uid.trim() })} className="px-3 py-1.5 rounded border text-xs font-bold disabled:opacity-50" style={{ borderColor: '#7BC47F', color: '#7BC47F' }}>Levantar silêncio</button>
          </div>
        </Cartao>
      )}
    </div>
  );
}
