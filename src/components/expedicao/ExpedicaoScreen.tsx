'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { NOME_DO_SELO, SELOS_DE_BUSCA } from '@/rules/colecionaveis';
import { EMBLEMA_RARIDADE_MAP } from '@/rules/emblemas';
import { TURNOS_DE_EXPEDICAO, VAGAS_DE_EXPEDICAO, type TurnoDeExpedicao } from '@/rules/expedicao';
import type { RaridadeMaterial } from '@/rules/raridades';
import type { EstadoDaExpedicao, RecompensaColetada } from '@/server/expedicao';
import { NOCTHERA_THEME } from '@/theme/theme';

type Token = () => Promise<string | null>;
const OURO = '#C8A656';
const VERMELHO = '#E5484D';
const VERDE = '#7BC47F';
const NOME_DA_RARIDADE: Readonly<Record<RaridadeMaterial, readonly [string, string]>> = {
  comum: ['comum', 'comuns'],
  raro: ['raro', 'raros'],
  muitoRaro: ['muito raro', 'muito raros'],
  epico: ['épico', 'épicos'],
  lendario: ['lendário', 'lendários'],
};

async function chamar(tokenFresco: Token, corpo?: unknown): Promise<{ ok: boolean; dados: Record<string, unknown> }> {
  try {
    const token = await tokenFresco();
    const res = await fetch('/api/expedicao', {
      method: corpo ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token ?? ''}`, ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    return { ok: res.ok, dados: (await res.json().catch(() => ({}))) as Record<string, unknown> };
  } catch {
    return { ok: false, dados: { error: 'Sem conexão. Tente de novo.' } };
  }
}

/** "1 h 05 min", "12 min 30 s". */
function tempoRestante(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  if (h) return `${h} h ${String(m).padStart(2, '0')} min`;
  if (m) return `${m} min ${String(seg).padStart(2, '0')} s`;
  return `${seg} s`;
}

/** As recompensas de um turno, em texto curto. */
export function textoDaRecompensa(t: Pick<TurnoDeExpedicao, 'selos' | 'fragmentosDeMemoria' | 'pedrasDaRecordacao' | 'materiais'>): string[] {
  const selos = SELOS_DE_BUSCA.filter((s) => t.selos[s]).map((s) => `${t.selos[s]} ${NOME_DO_SELO[s].replace('Selo ', '')}`);
  const materiais = (Object.entries(t.materiais) as [RaridadeMaterial, number][]).map(([r, q]) => `${q} ${NOME_DA_RARIDADE[r][q > 1 ? 1 : 0]}`);
  return [
    `Selos: ${selos.join(', ')}`,
    `${t.fragmentosDeMemoria} Fragmentos de Memória${t.pedrasDaRecordacao ? ` · ${t.pedrasDaRecordacao} Pedra${t.pedrasDaRecordacao > 1 ? 's' : ''} da Recordação` : ''}`,
    `Materiais de mundo: ${materiais.join(', ')}`,
  ];
}

function Botao({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="rounded-sm border px-2 py-1 text-xs font-bold disabled:opacity-50" style={{ borderColor: OURO, backgroundColor: '#3A2F18', color: '#F5E3B3' }}>
      {children}
    </button>
  );
}

/** Expedição: 3 vagas; o jogador paga ouro, manda uma expedição de 2, 6, 8 ou 12 horas e coleta a recompensa quando ela volta. */
export function ExpedicaoScreen({ tokenFresco }: { tokenFresco: Token }) {
  const { colors } = NOCTHERA_THEME;
  const [estado, setEstado] = useState<EstadoDaExpedicao | null>(null);
  /** Diferença entre o relógio do servidor e o do aparelho, para a contagem usar a hora do servidor. */
  const [diferenca, setDiferenca] = useState(0);
  const [agora, setAgora] = useState(() => Date.now());
  const [erroAoCarregar, setErroAoCarregar] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [coletadas, setColetadas] = useState<RecompensaColetada[]>([]);
  const [turnoEscolhido, setTurnoEscolhido] = useState(TURNOS_DE_EXPEDICAO[0].horas);

  const receber = useCallback((e: EstadoDaExpedicao) => {
    setEstado(e);
    setDiferenca(Date.parse(e.agora) - Date.now());
  }, []);

  const carregar = useCallback(async () => {
    const r = await chamar(tokenFresco);
    if (r.ok) receber(r.dados as unknown as EstadoDaExpedicao);
    else setErroAoCarregar(true);
  }, [tokenFresco, receber]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  async function agir(acao: string, extra: Record<string, unknown> = {}) {
    setOcupado(true);
    setAviso(null);
    const r = await chamar(tokenFresco, { acao, ...extra });
    setOcupado(false);
    if (!r.ok) {
      setAviso({ texto: String(r.dados.error ?? 'Não foi possível agora.'), erro: true });
      return;
    }
    setAviso({ texto: String(r.dados.mensagem ?? 'Feito.'), erro: false });
    setColetadas((r.dados.coletadas as RecompensaColetada[]) ?? []);
    receber(r.dados.estado as EstadoDaExpedicao);
  }

  const horaDoServidor = agora + diferenca;
  const prontas = estado?.expedicoes.filter((e) => Date.parse(e.fim) <= horaDoServidor) ?? [];
  const bloqueado = !!estado && estado.meuNivel < estado.nivelNecessario;
  const turno = TURNOS_DE_EXPEDICAO.find((t) => t.horas === turnoEscolhido)!;

  return (
    <main className="min-h-dvh w-full flex flex-col items-center px-2.5 sm:px-5 py-3 sm:py-6" style={{ backgroundColor: colors.background.primary, color: colors.text.primary }}>
      <div className="w-full max-w-[480px] flex flex-col gap-3">
        <header className="flex items-center gap-2">
          <Link href="/provacoes" aria-label="Voltar às Provações" className="p-1"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-2xl font-cinzel font-extrabold italic tracking-widest uppercase" style={{ color: '#F5E3B3' }}>Expedição</h1>
        </header>
        <p className="text-xs" style={{ color: colors.text.secondary }}>
          Pague o ouro e mande uma expedição de 2, 6, 8 ou 12 horas. Até {VAGAS_DE_EXPEDICAO} ao mesmo tempo. Ela nunca falha: quando voltar, colete selos de busca, Fragmentos de Memória, Pedras da Recordação e materiais de mundo. Cada Avanço de expedição tira 1 hora de uma expedição já enviada.
        </p>
        {aviso && <p role={aviso.erro ? 'alert' : 'status'} className="text-sm font-semibold" style={{ color: aviso.erro ? VERMELHO : VERDE }}>{aviso.texto}</p>}
        {erroAoCarregar ? (
          <p role="alert" className="text-sm" style={{ color: VERMELHO }}>Não foi possível carregar agora. Tente de novo em instantes.</p>
        ) : !estado ? (
          <p className="text-sm" style={{ color: colors.text.secondary }}>Carregando...</p>
        ) : (
          <>
            {bloqueado && <p className="text-sm font-semibold" style={{ color: VERMELHO }}>A Expedição abre no nível {estado.nivelNecessario} (agora: {estado.meuNivel}).</p>}
            <p className="text-sm">Ouro: <strong>{estado.ouro}</strong> · Avanços de expedição: <strong>{estado.avancos}</strong></p>

            <section aria-label="Vagas" className="flex flex-col gap-2">
              {[...Array(VAGAS_DE_EXPEDICAO).keys()].map((vaga) => {
                const e = estado.expedicoes.find((x) => x.vaga === vaga);
                const falta = e ? Date.parse(e.fim) - horaDoServidor : 0;
                return (
                  <div key={vaga} className="rounded-sm border-2 p-2.5 flex flex-col gap-1.5" style={{ borderColor: e && falta <= 0 ? VERDE : OURO, backgroundColor: colors.background.secondary }}>
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="font-cinzel font-bold">Vaga {vaga + 1}</span>
                      <span style={{ color: e ? (falta <= 0 ? VERDE : colors.text.primary) : colors.text.secondary }}>
                        {!e ? 'livre' : falta <= 0 ? 'voltou!' : `${e.horas} h · faltam ${tempoRestante(falta)}`}
                      </span>
                    </div>
                    {e && falta > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <Botao disabled={ocupado || estado.avancos < 1} onClick={() => void agir('avancar', { vaga, quantidade: 1 })}>Usar Avanço (-1 h)</Botao>
                      </div>
                    )}
                    {e && falta <= 0 && (
                      <div>
                        <Botao disabled={ocupado} onClick={() => void agir('coletar', { vaga })}>Coletar</Botao>
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
            {prontas.length > 1 && (
              <div>
                <Botao disabled={ocupado} onClick={() => void agir('coletar')}>Coletar todas ({prontas.length})</Botao>
              </div>
            )}

            <section aria-label="Enviar expedição" className="rounded-sm border-2 p-2.5 flex flex-col gap-2" style={{ borderColor: OURO, backgroundColor: colors.background.secondary }}>
              <h2 className="font-cinzel font-bold text-sm">Enviar expedição</h2>
              <div role="radiogroup" aria-label="Turno" className="grid grid-cols-4 gap-1.5">
                {TURNOS_DE_EXPEDICAO.map((t) => (
                  <button
                    key={t.horas}
                    type="button"
                    role="radio"
                    aria-checked={t.horas === turnoEscolhido}
                    onClick={() => setTurnoEscolhido(t.horas)}
                    className="rounded-sm border px-1 py-1.5 text-xs font-bold flex flex-col items-center"
                    style={{ borderColor: OURO, backgroundColor: t.horas === turnoEscolhido ? '#5A4824' : '#3A2F18', color: '#F5E3B3' }}
                  >
                    <span>{t.horas} h</span>
                    <span className="font-normal text-[10px]">{t.custoOuro} ouro</span>
                  </button>
                ))}
              </div>
              <ul className="text-xs flex flex-col gap-0.5" style={{ color: colors.text.secondary }}>
                {textoDaRecompensa(turno).map((linha) => <li key={linha}>{linha}</li>)}
              </ul>
              <div>
                <Botao
                  disabled={ocupado || bloqueado || estado.expedicoes.length >= VAGAS_DE_EXPEDICAO || estado.ouro < turno.custoOuro}
                  onClick={() => void agir('enviar', { horas: turno.horas })}
                >
                  {estado.expedicoes.length >= VAGAS_DE_EXPEDICAO ? 'Vagas ocupadas' : `Enviar ${turno.horas} h (${turno.custoOuro} ouro)`}
                </Botao>
              </div>
            </section>

            {coletadas.length > 0 && (
              <section aria-label="Recompensas coletadas" className="rounded-sm border-2 p-2.5 flex flex-col gap-1.5" style={{ borderColor: VERDE, backgroundColor: colors.background.secondary }}>
                <h2 className="font-cinzel font-bold text-sm">Recompensas</h2>
                {coletadas.map((c) => (
                  <div key={c.vaga} className="text-xs flex flex-col gap-0.5">
                    <span className="font-semibold">Vaga {c.vaga + 1} · {c.horas} h</span>
                    <span>{textoDaRecompensa({ ...c, materiais: {} })[0]}</span>
                    <span>{textoDaRecompensa({ ...c, materiais: {} })[1]}</span>
                    <span className="flex flex-wrap gap-x-1.5">
                      {c.materiais.map((m) => (
                        <span key={m.id} style={{ color: EMBLEMA_RARIDADE_MAP[m.raridade].cor }}>{m.quantidade}× {m.nome}</span>
                      ))}
                    </span>
                  </div>
                ))}
                <Link href="/buscar" className="text-xs underline" style={{ color: colors.text.secondary }}>Usar os selos no Buscar</Link>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
