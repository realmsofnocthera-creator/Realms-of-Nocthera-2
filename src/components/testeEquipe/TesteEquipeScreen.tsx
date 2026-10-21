'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TAMANHO_MAXIMO_DA_PARTY, TAMANHO_MINIMO_DO_TESTE, type ResultadoDaParty } from '@/rules/testeEquipe';
import type { EstadoDoTeste } from '@/server/testeEquipe';
import { NOCTHERA_THEME } from '@/theme/theme';

type Token = () => Promise<string | null>;
const OURO = '#C8A656';
const BORDA = '#4A3F2A';
const VERMELHO = '#E5484D';
const VERDE = '#7BC47F';
/** Enquanto está numa party, a tela recarrega sozinha para ver quem entrou e quem marcou "Pronto". */
const ATUALIZAR_A_CADA_MS = 15_000;

async function chamar(tokenFresco: Token, corpo?: unknown): Promise<{ ok: boolean; dados: Record<string, unknown> }> {
  try {
    const token = await tokenFresco();
    const res = await fetch('/api/teste-equipe', {
      method: corpo ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token ?? ''}`, ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    return { ok: res.ok, dados: (await res.json().catch(() => ({}))) as Record<string, unknown> };
  } catch {
    return { ok: false, dados: { error: 'Sem conexão. Tente de novo.' } };
  }
}

function Botao({ children, onClick, disabled, perigo }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; perigo?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="rounded-sm border px-2.5 py-1 text-xs font-bold disabled:opacity-50" style={{ borderColor: perigo ? VERMELHO : OURO, backgroundColor: '#3A2F18', color: perigo ? VERMELHO : '#F5E3B3' }}>
      {children}
    </button>
  );
}

function Cartao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const { colors } = NOCTHERA_THEME;
  return (
    <section aria-label={titulo} className="rounded-sm border-2 p-3 flex flex-col gap-2" style={{ borderColor: OURO, backgroundColor: colors.background.secondary }}>
      <h2 className="font-cinzel font-bold text-base">{titulo}</h2>
      {children}
    </section>
  );
}

function Resultado({ r }: { r: ResultadoDaParty }) {
  const { colors } = NOCTHERA_THEME;
  return (
    <div className="rounded-sm border px-2 py-1.5 flex flex-col gap-1" style={{ borderColor: r.venceu ? VERDE : VERMELHO }}>
      <span className="text-sm font-bold" style={{ color: r.venceu ? VERDE : VERMELHO }}>
        Última luta: dificuldade {r.dificuldade}, {r.venceu ? 'vitória' : 'derrota'} em {r.rodadas} rodadas
      </span>
      <ul className="text-xs flex flex-col gap-0.5">
        {r.aliados.map((a) => (
          <li key={a.nome} className="flex justify-between gap-2">
            <span>{a.nome}</span>
            <span style={{ color: colors.text.secondary }}>{a.dano} de dano{a.caiuNaRodada ? ` · caiu na rodada ${a.caiuNaRodada}` : ''}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Teste de Equipe (7.4): party da guilda (até 3), todos marcam "Pronto", o líder escolhe a dificuldade e inicia. */
export function TesteEquipeScreen({ tokenFresco }: { tokenFresco: Token }) {
  const { colors } = NOCTHERA_THEME;
  const [estado, setEstado] = useState<EstadoDoTeste | null>(null);
  const [erroAoCarregar, setErroAoCarregar] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [dificuldade, setDificuldade] = useState(1);

  const carregar = useCallback(async () => {
    const r = await chamar(tokenFresco);
    if (r.ok) setEstado(r.dados as unknown as EstadoDoTeste);
    else setErroAoCarregar(true);
  }, [tokenFresco]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const naParty = !!estado?.minhaParty;
  useEffect(() => {
    if (!naParty) return;
    const id = setInterval(() => void carregar(), ATUALIZAR_A_CADA_MS);
    return () => clearInterval(id);
  }, [naParty, carregar]);

  const agir = async (acao: string, extra: Record<string, unknown> = {}) => {
    setOcupado(true);
    setAviso(null);
    const r = await chamar(tokenFresco, { acao, ...extra });
    setOcupado(false);
    if (!r.ok) {
      setAviso({ texto: String(r.dados.error ?? 'Não foi possível agora.'), erro: true });
      return;
    }
    setAviso({ texto: String(r.dados.mensagem ?? 'Feito.'), erro: false });
    setEstado(r.dados.estado as EstadoDoTeste);
  };

  const party = estado?.minhaParty ?? null;
  const todosProntos = !!party && party.membros.length >= TAMANHO_MINIMO_DO_TESTE && party.membros.every((m) => m.pronto);
  const escolhida = estado?.dificuldades.find((d) => d.dificuldade === dificuldade);

  return (
    <main className="min-h-dvh w-full flex flex-col items-center px-2.5 sm:px-5 py-3 sm:py-6" style={{ backgroundColor: colors.background.primary, color: colors.text.primary }}>
      <div className="w-full max-w-[480px] flex flex-col gap-3">
        <header className="flex items-center gap-2">
          <Link href="/provacoes" aria-label="Voltar às Provações" className="p-1"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-xl font-cinzel font-extrabold italic tracking-widest uppercase" style={{ color: '#F5E3B3' }}>Teste de Equipe</h1>
        </header>
        {aviso && <p role={aviso.erro ? 'alert' : 'status'} className="text-sm font-semibold" style={{ color: aviso.erro ? VERMELHO : VERDE }}>{aviso.texto}</p>}
        {erroAoCarregar ? (
          <p role="alert" className="text-sm" style={{ color: VERMELHO }}>Não foi possível carregar agora. Tente de novo em instantes.</p>
        ) : !estado ? (
          <p className="text-sm" style={{ color: colors.text.secondary }}>Carregando...</p>
        ) : !estado.naGuilda ? (
          <Cartao titulo="Só com a guilda">
            <p className="text-sm">A party é feita com membros da sua guilda. Entre numa guilda para jogar o Teste de Equipe.</p>
            <Link href="/guilda" className="self-start text-sm underline">Ir para a Guilda</Link>
          </Cartao>
        ) : (
          <>
            <p className="text-xs" style={{ color: colors.text.secondary }}>
              De {TAMANHO_MINIMO_DO_TESTE} a {TAMANHO_MAXIMO_DA_PARTY} membros da guilda, nível {estado.nivelNecessario} ou mais, lutam juntos contra o chefe. Todos marcam &quot;Pronto&quot; e o líder inicia. Uma tentativa por dia em cada dificuldade.
            </p>
            {estado.meuNivel < estado.nivelNecessario && <p className="text-sm font-semibold" style={{ color: VERMELHO }}>Você precisa do nível {estado.nivelNecessario} (agora: {estado.meuNivel}).</p>}

            {party ? (
              <Cartao titulo="Sua party">
                <ul className="flex flex-col gap-1">
                  {party.membros.map((m) => (
                    <li key={m.uid} className="flex justify-between gap-2 text-sm">
                      <span>{m.nome}{m.uid === party.liderUid ? ' (líder)' : ''}</span>
                      <span style={{ color: m.pronto ? VERDE : colors.text.secondary }}>{m.pronto ? 'Pronto' : 'Esperando'}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <Botao disabled={ocupado} onClick={() => void agir('pronto', { pronto: true })}>Estou pronto</Botao>
                  <Botao disabled={ocupado} onClick={() => void agir('pronto', { pronto: false })}>Não estou pronto</Botao>
                  <Botao perigo disabled={ocupado} onClick={() => void agir('sair')}>Sair da party</Botao>
                  <Botao disabled={ocupado} onClick={() => void carregar()}>Atualizar</Botao>
                </div>
                {party.ultimoResultado && <Resultado r={party.ultimoResultado} />}
              </Cartao>
            ) : (
              <Cartao titulo="Party">
                <Botao disabled={ocupado || estado.meuNivel < estado.nivelNecessario} onClick={() => void agir('criar')}>Criar party</Botao>
                {estado.partysAbertas.length === 0 ? (
                  <p className="text-xs" style={{ color: colors.text.secondary }}>Nenhuma party aberta na guilda agora.</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {estado.partysAbertas.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-2 text-sm rounded-sm border px-2 py-1.5" style={{ borderColor: BORDA }}>
                        <span className="truncate">{p.membros.join(', ')} <span className="text-[11px]" style={{ color: colors.text.secondary }}>· líder {p.lider}</span></span>
                        <Botao disabled={ocupado || estado.meuNivel < estado.nivelNecessario} onClick={() => void agir('entrar', { partyId: p.id })}>Entrar</Botao>
                      </li>
                    ))}
                  </ul>
                )}
              </Cartao>
            )}

            <Cartao titulo="Dificuldades">
              <ul className="flex flex-col gap-1">
                {estado.dificuldades.map((d) => (
                  <li key={d.dificuldade}>
                    <label className="flex items-center gap-2 text-sm" style={{ opacity: d.liberada ? 1 : 0.5 }}>
                      <input type="radio" name="dificuldade" checked={dificuldade === d.dificuldade} disabled={!d.liberada} onChange={() => setDificuldade(d.dificuldade)} />
                      <span className="flex-1">{d.dificuldade}. {d.chefe}</span>
                      <span className="text-[11px]" style={{ color: d.vencida ? VERDE : colors.text.secondary }}>{d.vencida ? 'vencida' : d.liberada ? '' : 'bloqueada'}{d.tentouHoje ? ' · tentou hoje' : ''}</span>
                    </label>
                  </li>
                ))}
              </ul>
              {party?.souLider ? (
                <Botao disabled={ocupado || !todosProntos || !escolhida?.liberada || escolhida?.tentouHoje} onClick={() => void agir('iniciar', { dificuldade })}>
                  {todosProntos ? `Iniciar dificuldade ${dificuldade}` : `Esperando todos marcarem "Pronto" (mínimo ${TAMANHO_MINIMO_DO_TESTE})`}
                </Botao>
              ) : party ? (
                <p className="text-xs" style={{ color: colors.text.secondary }}>O líder escolhe a dificuldade e inicia.</p>
              ) : null}
            </Cartao>
          </>
        )}
      </div>
    </main>
  );
}
