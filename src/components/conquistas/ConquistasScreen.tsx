'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check } from 'lucide-react';
import { DEGRAUS, NOME_DA_CATEGORIA, textoDaRecompensaDeConquista, type CategoriaDeConquista } from '@/rules/conquistas';
import type { ConquistaNaTela, EstadoDasConquistas } from '@/server/conquistas';
import { NOCTHERA_THEME } from '@/theme/theme';

type Token = () => Promise<string | null>;
const OURO = '#C8A656';
const VERMELHO = '#E5484D';
const VERDE = '#7BC47F';
type Aba = CategoriaDeConquista | 'titulos';
const ABAS: readonly Aba[] = ['combate', 'provacoes', 'progresso', 'titulos'];
const NOME_DA_ABA: Readonly<Record<Aba, string>> = { ...NOME_DA_CATEGORIA, titulos: 'Títulos' };

async function chamar(tokenFresco: Token, corpo?: unknown): Promise<{ ok: boolean; dados: Record<string, unknown> }> {
  try {
    const token = await tokenFresco();
    const res = await fetch('/api/conquistas', {
      method: corpo ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token ?? ''}`, ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    return { ok: res.ok, dados: (await res.json().catch(() => ({}))) as Record<string, unknown> };
  } catch {
    return { ok: false, dados: { error: 'Sem conexão. Tente de novo.' } };
  }
}

const numero = (n: number) => n.toLocaleString('pt-BR');

function Botao({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="rounded-sm border px-2 py-1 text-xs font-bold disabled:opacity-50" style={{ borderColor: OURO, backgroundColor: '#3A2F18', color: '#F5E3B3' }}>
      {children}
    </button>
  );
}

function CartaoDaConquista({ c, ocupado, resgatar }: { c: ConquistaNaTela; ocupado: boolean; resgatar: (id: string) => void }) {
  const { colors } = NOCTHERA_THEME;
  const completa = c.proximaMeta === null;
  const largura = completa ? 100 : Math.min(100, (c.progresso / c.proximaMeta!) * 100);
  return (
    <li className="rounded-sm border-2 p-2.5 flex flex-col gap-1" style={{ borderColor: c.prontos ? OURO : '#4A3F2A', backgroundColor: colors.background.secondary }}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-cinzel font-bold text-sm">{c.nome}</span>
        <span className="flex gap-0.5 shrink-0" aria-label={`${c.resgatados} de ${DEGRAUS} degraus resgatados`}>
          {Array.from({ length: DEGRAUS }, (_, i) => (
            <span key={i} className="w-2.5 h-2.5 rotate-45 border" style={{ borderColor: OURO, backgroundColor: i < c.resgatados ? OURO : i < c.resgatados + c.prontos ? `${OURO}66` : 'transparent' }} />
          ))}
        </span>
      </div>
      {completa ? (
        <p className="text-xs flex items-center gap-1" style={{ color: VERDE }}>
          <Check className="w-3.5 h-3.5" /> Completa ({numero(c.progresso)})
        </p>
      ) : (
        <>
          <p className="text-xs">{c.textoDaMeta}</p>
          <div role="progressbar" aria-valuemin={0} aria-valuemax={c.proximaMeta!} aria-valuenow={Math.min(c.progresso, c.proximaMeta!)} aria-label={`Progresso de ${c.nome}`} className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#4A3F2A' }}>
            <div className="h-full rounded-full" style={{ width: `${largura}%`, backgroundColor: OURO }} />
          </div>
          <p className="text-[11px]" style={{ color: colors.text.secondary }}>
            {numero(Math.min(c.progresso, c.proximaMeta!))}/{numero(c.proximaMeta!)} · Recompensa: {textoDaRecompensaDeConquista(c.recompensa!).join(' · ')}
          </p>
        </>
      )}
      {c.titulo && !completa && <p className="text-[10px]" style={{ color: colors.text.secondary }}>No 5º degrau: título {c.titulo}.</p>}
      {c.prontos > 0 && (
        <div>
          <Botao disabled={ocupado} onClick={() => resgatar(c.id)}>
            Resgatar{c.prontos > 1 ? ` (${c.prontos} degraus)` : ''}
          </Botao>
        </div>
      )}
    </li>
  );
}

/** Conquistas: metas com 5 degraus, progresso que sobe jogando e resgate das recompensas; e os títulos do jogador. */
export function ConquistasScreen({ tokenFresco }: { tokenFresco: Token }) {
  const { colors } = NOCTHERA_THEME;
  const [estado, setEstado] = useState<EstadoDasConquistas | null>(null);
  const [erroAoCarregar, setErroAoCarregar] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aba, setAba] = useState<Aba>('combate');

  const carregar = useCallback(async () => {
    const r = await chamar(tokenFresco);
    if (r.ok) setEstado(r.dados as unknown as EstadoDasConquistas);
    else setErroAoCarregar(true);
  }, [tokenFresco]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function agir(corpo: Record<string, unknown>) {
    setOcupado(true);
    setAviso(null);
    const r = await chamar(tokenFresco, corpo);
    setOcupado(false);
    if (!r.ok) {
      setAviso({ texto: String(r.dados.error ?? 'Não foi possível agora.'), erro: true });
      return;
    }
    setAviso({ texto: String(r.dados.mensagem ?? 'Feito.'), erro: false });
    setEstado(r.dados.estado as EstadoDasConquistas);
  }

  const prontasNaAba = (a: Aba) => (a === 'titulos' || !estado ? 0 : estado.conquistas.filter((c) => c.categoria === a).reduce((t, c) => t + c.prontos, 0));

  return (
    <main className="min-h-dvh w-full flex flex-col items-center px-2.5 sm:px-5 py-3 sm:py-6" style={{ backgroundColor: colors.background.primary, color: colors.text.primary }}>
      <div className="w-full max-w-[480px] flex flex-col gap-3">
        <header className="flex items-center gap-2">
          <Link href="/menu" aria-label="Voltar ao Menu" className="p-1"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-2xl font-cinzel font-extrabold italic tracking-widest uppercase" style={{ color: '#F5E3B3' }}>Conquistas</h1>
        </header>
        <p className="text-xs" style={{ color: colors.text.secondary }}>Cada conquista tem 5 degraus. O progresso sobe jogando; quando bater a meta, resgate a recompensa. Algumas dão um título no último degrau.</p>
        {aviso && <p role={aviso.erro ? 'alert' : 'status'} className="text-sm font-semibold" style={{ color: aviso.erro ? VERMELHO : VERDE }}>{aviso.texto}</p>}
        {erroAoCarregar ? (
          <p role="alert" className="text-sm" style={{ color: VERMELHO }}>Não foi possível carregar agora. Tente de novo em instantes.</p>
        ) : !estado ? (
          <p className="text-sm" style={{ color: colors.text.secondary }}>Carregando...</p>
        ) : (
          <>
            {estado.prontos > 1 && (
              <div>
                <Botao disabled={ocupado} onClick={() => void agir({ acao: 'resgatarTudo' })}>Resgatar tudo ({estado.prontos})</Botao>
              </div>
            )}
            <div role="tablist" aria-label="Categorias" className="flex flex-wrap gap-1.5">
              {ABAS.map((a) => (
                <button
                  key={a}
                  type="button"
                  role="tab"
                  aria-selected={aba === a}
                  onClick={() => setAba(a)}
                  className="rounded-sm border px-2 py-1 text-xs font-bold font-cinzel"
                  style={{ borderColor: OURO, backgroundColor: aba === a ? OURO : '#221C16', color: aba === a ? '#1A140E' : '#F5E3B3' }}
                >
                  {NOME_DA_ABA[a]}
                  {prontasNaAba(a) > 0 ? ` (${prontasNaAba(a)})` : ''}
                </button>
              ))}
            </div>
            {aba === 'titulos' ? (
              <section aria-label="Seus títulos" className="flex flex-col gap-2">
                {estado.titulos.length === 0 ? (
                  <p className="text-sm" style={{ color: colors.text.secondary }}>Nenhum título ainda. Eles vêm do último degrau de algumas conquistas, do ranking e dos eventos.</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {estado.titulos.map((t) => {
                      const emUso = estado.tituloId === t.id;
                      return (
                        <li key={t.id} className="rounded-sm border-2 p-2 flex items-center justify-between gap-2" style={{ borderColor: emUso ? OURO : '#4A3F2A', backgroundColor: colors.background.secondary }}>
                          <span className="flex flex-col">
                            <span className="font-cinzel font-bold text-sm">{t.nome}</span>
                            <span className="text-[10px]" style={{ color: colors.text.secondary }}>{t.origem}</span>
                          </span>
                          {emUso ? (
                            <Botao disabled={ocupado} onClick={() => void agir({ acao: 'titulo', titulo: '' })}>Tirar do perfil</Botao>
                          ) : (
                            <Botao disabled={ocupado} onClick={() => void agir({ acao: 'titulo', titulo: t.id })}>Usar</Botao>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            ) : (
              <ul className="flex flex-col gap-2">
                {estado.conquistas
                  .filter((c) => c.categoria === aba)
                  .map((c) => (
                    <CartaoDaConquista key={c.id} c={c} ocupado={ocupado} resgatar={(id) => void agir({ acao: 'resgatar', id })} />
                  ))}
              </ul>
            )}
          </>
        )}
      </div>
    </main>
  );
}
