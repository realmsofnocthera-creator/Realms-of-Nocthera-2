'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Gift } from 'lucide-react';
import type { BauNaTela, EstadoDoDiario, MissaoNaTela } from '@/server/diario';
import { NOCTHERA_THEME } from '@/theme/theme';

type Token = () => Promise<string | null>;
const OURO = '#C8A656';
const VERMELHO = '#E5484D';
const VERDE = '#7BC47F';
type Aba = 'diarias' | 'semanais' | 'checkin';
const ABAS: readonly { id: Aba; nome: string }[] = [
  { id: 'diarias', nome: 'Diárias' },
  { id: 'semanais', nome: 'Semanais' },
  { id: 'checkin', nome: 'Check-in' },
];

async function chamar(tokenFresco: Token, corpo?: unknown): Promise<{ ok: boolean; dados: Record<string, unknown> }> {
  try {
    const token = await tokenFresco();
    const res = await fetch('/api/diario', {
      method: corpo ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token ?? ''}`, ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    return { ok: res.ok, dados: (await res.json().catch(() => ({}))) as Record<string, unknown> };
  } catch {
    return { ok: false, dados: { error: 'Sem conexão. Tente de novo.' } };
  }
}

function abaInicial(): Aba {
  if (typeof window === 'undefined') return 'diarias';
  const aba = new URLSearchParams(window.location.search).get('aba');
  return aba === 'semanais' || aba === 'checkin' ? aba : 'diarias';
}

function tempoAte(iso: string, agora: number): string {
  const s = Math.max(0, Math.floor((Date.parse(iso) - agora) / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d} d ${h} h` : h ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`;
}

function Botao({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="rounded-sm border px-3 py-1.5 text-xs font-bold disabled:opacity-50" style={{ borderColor: OURO, backgroundColor: '#3A2F18', color: '#F5E3B3' }}>
      {children}
    </button>
  );
}

function ListaDeMissoes({ missoes }: { missoes: MissaoNaTela[] }) {
  const { colors } = NOCTHERA_THEME;
  return (
    <ul className="flex flex-col gap-1.5">
      {missoes.map((m) => (
        <li key={m.id} className="rounded-sm border px-2.5 py-1.5 flex flex-col gap-1" style={{ borderColor: m.completa ? VERDE : '#4A3F2A', backgroundColor: colors.background.secondary }}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold">{m.nome}</span>
            {m.completa ? <Check className="w-4 h-4 shrink-0" style={{ color: VERDE }} aria-label="Concluída" /> : <span className="text-[11px] shrink-0" style={{ color: colors.text.secondary }}>{m.progresso.toLocaleString('pt-BR')}/{m.meta.toLocaleString('pt-BR')}</span>}
          </div>
          <div role="progressbar" aria-valuemin={0} aria-valuemax={m.meta} aria-valuenow={m.progresso} aria-label={m.nome} className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#4A3F2A' }}>
            <div className="h-full rounded-full" style={{ width: `${(m.progresso / m.meta) * 100}%`, backgroundColor: m.completa ? VERDE : OURO }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Bau({ titulo, degraus, completas, ocupado, onResgatar }: { titulo: string; degraus: BauNaTela[]; completas: number; ocupado: boolean; onResgatar: () => void }) {
  const { colors } = NOCTHERA_THEME;
  const prontos = degraus.filter((d) => d.aberto && !d.resgatado).length;
  return (
    <section aria-label={titulo} className="rounded-sm border-2 p-2.5 flex flex-col gap-2" style={{ borderColor: prontos ? OURO : '#4A3F2A', backgroundColor: colors.background.secondary }}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-cinzel font-bold text-sm flex items-center gap-1.5"><Gift className="w-4 h-4" style={{ color: OURO }} /> {titulo}</h2>
        <span className="text-[11px]" style={{ color: colors.text.secondary }}>{completas} concluídas</span>
      </div>
      <ul className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${degraus.length}, minmax(0, 1fr))` }}>
        {degraus.map((d) => (
          <li key={d.missoes} className="rounded-sm border px-1 py-1.5 text-center flex flex-col" style={{ borderColor: d.resgatado ? '#4A3F2A' : d.aberto ? OURO : '#4A3F2A', opacity: d.resgatado ? 0.55 : 1 }}>
            <span className="text-[10px]" style={{ color: colors.text.secondary }}>{d.missoes} missões</span>
            <span className="text-sm font-bold">{d.diamantes} 💎</span>
            <span className="text-[10px]" style={{ color: d.resgatado ? colors.text.secondary : d.aberto ? VERDE : colors.text.secondary }}>{d.resgatado ? 'Resgatado' : d.aberto ? 'Pronto' : 'Bloqueado'}</span>
          </li>
        ))}
      </ul>
      {prontos > 0 && (
        <div>
          <Botao disabled={ocupado} onClick={onResgatar}>Resgatar baú{prontos > 1 ? ` (${prontos} degraus)` : ''}</Botao>
        </div>
      )}
    </section>
  );
}

/** Missões diárias e semanais, os baús de progresso e o Check-in de 30 dias. */
export function MissoesScreen({ tokenFresco }: { tokenFresco: Token }) {
  const { colors } = NOCTHERA_THEME;
  const [estado, setEstado] = useState<EstadoDoDiario | null>(null);
  const [erroAoCarregar, setErroAoCarregar] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aba, setAba] = useState<Aba>(abaInicial);
  const [agora] = useState(() => Date.now());

  const carregar = useCallback(async () => {
    const r = await chamar(tokenFresco);
    if (r.ok) setEstado(r.dados as unknown as EstadoDoDiario);
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
    setEstado(r.dados.estado as EstadoDoDiario);
  }

  const pontoDaAba = (a: Aba) =>
    !estado ? false : a === 'checkin' ? !estado.checkin.feitoHoje : (a === 'diarias' ? estado.bauDiario : estado.bauSemanal).some((d) => d.aberto && !d.resgatado);

  return (
    <main className="min-h-dvh w-full flex flex-col items-center px-2.5 sm:px-5 py-3 sm:py-6" style={{ backgroundColor: colors.background.primary, color: colors.text.primary }}>
      <div className="w-full max-w-[480px] flex flex-col gap-3">
        <header className="flex items-center gap-2">
          <Link href="/hub" aria-label="Voltar ao Hub" className="p-1"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-2xl font-cinzel font-extrabold italic tracking-widest uppercase" style={{ color: '#F5E3B3' }}>Missões</h1>
        </header>
        {aviso && <p role={aviso.erro ? 'alert' : 'status'} className="text-sm font-semibold" style={{ color: aviso.erro ? VERMELHO : VERDE }}>{aviso.texto}</p>}
        {erroAoCarregar ? (
          <p role="alert" className="text-sm" style={{ color: VERMELHO }}>Não foi possível carregar agora. Tente de novo em instantes.</p>
        ) : !estado ? (
          <p className="text-sm" style={{ color: colors.text.secondary }}>Carregando...</p>
        ) : (
          <>
            <div role="tablist" aria-label="Missões" className="flex gap-1.5">
              {ABAS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  role="tab"
                  aria-selected={aba === a.id}
                  onClick={() => setAba(a.id)}
                  className="rounded-sm border px-2.5 py-1 text-xs font-bold font-cinzel"
                  style={{ borderColor: OURO, backgroundColor: aba === a.id ? OURO : '#221C16', color: aba === a.id ? '#1A140E' : '#F5E3B3' }}
                >
                  {a.nome}{pontoDaAba(a.id) ? ' •' : ''}
                </button>
              ))}
            </div>

            {aba === 'diarias' && (
              <>
                <p className="text-[11px]" style={{ color: colors.text.secondary }}>Reiniciam à meia-noite (Brasília), em {tempoAte(estado.fechaDiaEm, agora)}.</p>
                <Bau titulo="Baú diário" degraus={estado.bauDiario} completas={estado.diarias.filter((m) => m.completa).length} ocupado={ocupado} onResgatar={() => void agir({ acao: 'bau', tipo: 'diario' })} />
                <ListaDeMissoes missoes={estado.diarias} />
              </>
            )}

            {aba === 'semanais' && (
              <>
                <p className="text-[11px]" style={{ color: colors.text.secondary }}>Reiniciam na segunda-feira, em {tempoAte(estado.fechaSemanaEm, agora)}.</p>
                <Bau titulo="Baú semanal" degraus={estado.bauSemanal} completas={estado.semanais.filter((m) => m.completa).length} ocupado={ocupado} onResgatar={() => void agir({ acao: 'bau', tipo: 'semanal' })} />
                <ListaDeMissoes missoes={estado.semanais} />
              </>
            )}

            {aba === 'checkin' && (
              <>
                <p className="text-xs" style={{ color: colors.text.secondary }}>Entre todo dia para ganhar a recompensa do calendário. Se faltar um dia, o calendário continua de onde parou.</p>
                <div>
                  <Botao disabled={ocupado || estado.checkin.feitoHoje} onClick={() => void agir({ acao: 'checkin' })}>
                    {estado.checkin.feitoHoje ? 'Check-in de hoje feito' : `Fazer o Check-in (dia ${estado.checkin.proximoDia})`}
                  </Botao>
                </div>
                <ul className="grid grid-cols-5 gap-1.5" aria-label="Calendário do Check-in">
                  {estado.checkin.calendario.map((d) => (
                    <li key={d.dia} className="rounded-sm border px-1 py-1 flex flex-col items-center gap-0.5 text-center" style={{ borderColor: d.hoje ? OURO : d.especial ? '#8E6BBF' : '#4A3F2A', backgroundColor: d.hoje ? '#3A2F18' : colors.background.secondary, opacity: d.feito ? 0.55 : 1 }}>
                      <span className="text-[10px]" style={{ color: colors.text.secondary }}>Dia {d.dia}</span>
                      {d.feito ? <Check className="w-4 h-4" style={{ color: VERDE }} aria-label="Feito" /> : <span className="text-[9px] leading-tight">{d.recompensa.join(' + ')}</span>}
                    </li>
                  ))}
                </ul>
                <p className="text-[10px]" style={{ color: colors.text.secondary }}>Os dias com borda roxa (7, 14, 21 e 30) dão Diamantes.</p>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
