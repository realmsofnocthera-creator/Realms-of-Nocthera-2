'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { Ban, Flag, MessageCircle, Send, X } from 'lucide-react';
import { auth } from '@/lib/firebase';
import type { CanalDoChat } from '@/rules/chat';
import type { EstadoDoChat, MensagemNaTela } from '@/server/chat';
import { NOCTHERA_THEME } from '@/theme/theme';

const OURO = '#C8A656';
const VERMELHO = '#E5484D';
const VERDE = '#7BC47F';
/** Com o painel aberto e a aba visível, o chat pergunta de 5 em 5 segundos (e só traz o que é novo). */
const ATUALIZAR_MS = 5_000;
/** Telas em que o botão do chat não aparece (login, painel do Mestre, mapa da Campanha e outras de tela cheia). */
const SEM_CHAT = ['/', '/login', '/mestre', '/conta-sancionada', '/manutencao', '/campanha', '/desenvolvimento'];

const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });

type Token = () => Promise<string | null>;

async function chamar(tokenFresco: Token, corpo?: Record<string, unknown>, consulta = ''): Promise<{ ok: boolean; status: number; dados: Record<string, unknown> }> {
  try {
    const token = await tokenFresco();
    const res = await fetch(corpo ? '/api/chat' : `/api/chat${consulta}`, {
      method: corpo ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token ?? ''}`, ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    return { ok: res.ok, status: res.status, dados: (await res.json().catch(() => ({}))) as Record<string, unknown> };
  } catch {
    return { ok: false, status: 0, dados: { error: 'Sem conexão. Tente de novo.' } };
  }
}

/**
 * O botão flutuante do chat em todas as telas do jogo (menos login, Painel do Mestre e outras de tela cheia). Só
 * aparece para quem está logado.
 */
export function ChatFlutuante() {
  const caminho = usePathname();
  const [logado, setLogado] = useState(false);
  useEffect(() => onAuthStateChanged(auth, (u) => setLogado(!!u)), []);
  const tokenFresco = useCallback(async () => (await auth.currentUser?.getIdToken()) ?? null, []);
  if (!logado || SEM_CHAT.includes(caminho ?? '/')) return null;
  return <ChatDoJogo tokenFresco={tokenFresco} />;
}

/**
 * Chat (7.7): o botão que abre um painel por cima da tela, com os canais Global e Guilda. Só pergunta ao servidor com
 * o painel aberto (de 5 em 5 segundos). Toda regra (nível, silêncio, filtro, velocidade) é do servidor; a tela só
 * mostra o motivo quando algo é recusado.
 */
export function ChatDoJogo({ tokenFresco }: { tokenFresco: Token }) {
  const { colors } = NOCTHERA_THEME;
  const [aberto, setAberto] = useState(false);
  const [canal, setCanal] = useState<CanalDoChat>('global');
  const [estado, setEstado] = useState<EstadoDoChat | null>(null);
  const [mensagens, setMensagens] = useState<MensagemNaTela[]>([]);
  const [texto, setTexto] = useState('');
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [verBloqueados, setVerBloqueados] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const fim = useRef<HTMLDivElement>(null);
  const ultimo = useRef<string | undefined>(undefined);
  const perto = useRef(true);
  const lista = useRef<HTMLDivElement>(null);

  const carregar = useCallback(
    async (zerar = false) => {
      const depois = zerar ? undefined : ultimo.current;
      const r = await chamar(tokenFresco, undefined, `?canal=${canal}${depois ? `&depois=${encodeURIComponent(depois)}` : ''}`);
      if (!r.ok) {
        setErro(String(r.dados.error ?? 'Não foi possível carregar o chat.'));
        return;
      }
      const e = r.dados as unknown as EstadoDoChat;
      setErro(null);
      setEstado(e);
      // junta as novas, tira as que o servidor não tem mais (apagadas pela equipe ou bloqueadas) e guarda a última
      setMensagens((atuais) => {
        const base = zerar ? [] : atuais;
        const vistas = new Set(base.map((m) => m.id));
        const todas = [...base, ...e.mensagens.filter((m) => !vistas.has(m.id))].filter((m) => e.ids.includes(m.id));
        ultimo.current = todas.at(-1)?.id;
        return todas;
      });
    },
    [canal, tokenFresco]
  );

  // ao abrir ou trocar de canal: recomeça; com o painel aberto e a aba visível, atualiza de 5 em 5 segundos
  useEffect(() => {
    if (!aberto) return;
    ultimo.current = undefined;
    setMensagens([]);
    void carregar(true);
  }, [aberto, canal, carregar]);
  useEffect(() => {
    if (!aberto) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void carregar();
    }, ATUALIZAR_MS);
    return () => window.clearInterval(id);
  }, [aberto, carregar]);

  // rola para a mensagem mais nova, se a pessoa já estava no fim
  useEffect(() => {
    if (perto.current) fim.current?.scrollIntoView({ block: 'end' });
  }, [mensagens]);

  async function enviar() {
    if (!texto.trim() || ocupado) return;
    setOcupado(true);
    setAviso(null);
    const r = await chamar(tokenFresco, { acao: 'enviar', canal, texto });
    setOcupado(false);
    if (!r.ok) return setAviso({ texto: String(r.dados.error ?? 'Não foi possível enviar.'), erro: true });
    setTexto('');
    perto.current = true;
    if (r.dados.filtrada) setAviso({ texto: 'Parte da mensagem foi trocada por *** (ofensas e links não passam).', erro: false });
    await carregar();
  }

  async function acao(corpo: Record<string, unknown>, depoisDe?: () => void) {
    setOcupado(true);
    setAviso(null);
    setMenu(null);
    const r = await chamar(tokenFresco, { ...corpo, canal });
    setOcupado(false);
    setAviso({ texto: String(r.dados.mensagem ?? r.dados.error ?? (r.ok ? 'Feito.' : 'Não foi possível agora.')), erro: !r.ok });
    if (r.ok) {
      depoisDe?.();
      await carregar(true);
    }
  }

  return (
    <>
      {!aberto && (
        <button
          type="button"
          onClick={() => setAberto(true)}
          aria-label="Abrir o chat"
          className="fixed right-2 top-[42%] z-40 w-10 h-10 rounded-full border-2 flex items-center justify-center shadow-lg opacity-90"
          style={{ backgroundColor: colors.background.secondary, borderColor: OURO, color: '#F5E3B3' }}
        >
          <MessageCircle className="w-5 h-5" />
        </button>
      )}
      {aberto && (
        <section role="dialog" aria-label="Chat" className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[520px] h-[72dvh] flex flex-col rounded-t-md border-t-2 border-x-2 shadow-2xl" style={{ backgroundColor: colors.background.primary, borderColor: OURO, color: colors.text.primary }}>
          <header className="flex items-center justify-between gap-2 px-2.5 py-2 border-b" style={{ borderColor: `${OURO}55` }}>
            <div role="tablist" aria-label="Canais" className="flex gap-1.5">
              {(estado?.canais ?? [{ id: 'global' as const, nome: 'Global', disponivel: true }, { id: 'guilda' as const, nome: 'Guilda', disponivel: false }]).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={canal === c.id}
                  disabled={!c.disponivel}
                  onClick={() => setCanal(c.id)}
                  title={c.disponivel ? undefined : 'Você não está numa guilda'}
                  className="rounded-sm border px-2.5 py-1 text-xs font-bold font-cinzel disabled:opacity-40"
                  style={{ borderColor: OURO, backgroundColor: canal === c.id ? OURO : '#221C16', color: canal === c.id ? '#1A140E' : '#F5E3B3' }}
                >
                  {c.nome}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setVerBloqueados((v) => !v)} className="text-[11px] underline" style={{ color: OURO }}>
                Bloqueados{estado?.bloqueados.length ? ` (${estado.bloqueados.length})` : ''}
              </button>
              <button type="button" onClick={() => setAberto(false)} aria-label="Fechar o chat" className="p-1"><X className="w-5 h-5" /></button>
            </div>
          </header>

          {verBloqueados && (
            <div className="px-2.5 py-2 border-b text-xs flex flex-col gap-1" style={{ borderColor: `${OURO}33`, backgroundColor: '#17120D' }}>
              {estado?.bloqueados.length ? (
                estado.bloqueados.map((n) => (
                  <div key={n} className="flex items-center justify-between gap-2">
                    <span>{n}</span>
                    <button type="button" disabled={ocupado} onClick={() => void acao({ acao: 'desbloquear', nome: n })} className="underline" style={{ color: OURO }}>Desbloquear</button>
                  </div>
                ))
              ) : (
                <span style={{ color: colors.text.secondary }}>Você não bloqueou ninguém. Para bloquear, toque numa mensagem.</span>
              )}
            </div>
          )}

          <div
            ref={lista}
            onScroll={(e) => {
              const el = e.currentTarget;
              perto.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
            }}
            className="flex-1 overflow-y-auto px-2.5 py-2 flex flex-col gap-1.5"
          >
            {erro && <p role="alert" className="text-xs" style={{ color: VERMELHO }}>{erro}</p>}
            {!erro && estado && mensagens.length === 0 && <p className="text-xs" style={{ color: colors.text.secondary }}>Ninguém falou ainda. Seja o primeiro!</p>}
            {mensagens.map((m) => (
              <div key={m.id} className="text-[13px] leading-snug">
                <button type="button" onClick={() => !m.minha && setMenu(menu === m.id ? null : m.id)} className="text-left w-full">
                  <span className="text-[10px]" style={{ color: colors.text.secondary }}>{hora(m.em)} </span>
                  <b style={{ color: m.minha ? OURO : '#F5E3B3' }}>{m.nome}</b>
                  <span>: {m.texto}</span>
                </button>
                {menu === m.id && (
                  <div className="flex gap-3 mt-0.5 text-[11px]">
                    <button type="button" disabled={ocupado} onClick={() => void acao({ acao: 'denunciar', mensagem: m.id })} className="inline-flex items-center gap-1 underline" style={{ color: OURO }}><Flag className="w-3 h-3" /> Denunciar</button>
                    <button type="button" disabled={ocupado} onClick={() => void acao({ acao: 'bloquear', mensagem: m.id })} className="inline-flex items-center gap-1 underline" style={{ color: VERMELHO }}><Ban className="w-3 h-3" /> Bloquear</button>
                  </div>
                )}
              </div>
            ))}
            <div ref={fim} />
          </div>

          {aviso && <p role={aviso.erro ? 'alert' : 'status'} className="px-2.5 py-1 text-[11px] font-semibold" style={{ color: aviso.erro ? VERMELHO : VERDE }}>{aviso.texto}</p>}
          {estado && !estado.podeEnviar ? (
            <p className="px-2.5 py-2 text-[11px] border-t" style={{ borderColor: `${OURO}33`, color: '#E6C775' }}>{estado.motivoSemEnvio}</p>
          ) : (
            <form
              className="flex gap-1.5 px-2.5 py-2 border-t"
              style={{ borderColor: `${OURO}33` }}
              onSubmit={(e) => {
                e.preventDefault();
                void enviar();
              }}
            >
              <input
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                maxLength={estado?.textoMaximo ?? 200}
                placeholder={canal === 'guilda' ? 'Mensagem para a guilda' : 'Mensagem para todos'}
                aria-label="Mensagem"
                autoComplete="off"
                className="flex-1 min-w-0 rounded-sm border px-2 py-1.5 text-[13px]"
                style={{ backgroundColor: '#221C16', borderColor: '#4A3F2A', color: colors.text.primary }}
              />
              <button type="submit" disabled={ocupado || !texto.trim()} aria-label="Enviar" className="rounded-sm border px-3 disabled:opacity-50" style={{ borderColor: OURO, backgroundColor: '#3A2F18', color: '#F5E3B3' }}>
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
          <p className="px-2.5 pb-1.5 text-[10px]" style={{ color: colors.text.secondary }}>Toque numa mensagem para denunciar ou bloquear. A equipe responde às denúncias em até {estado?.prazoDaDenunciaHoras ?? 48} horas.</p>
        </section>
      )}
    </>
  );
}
