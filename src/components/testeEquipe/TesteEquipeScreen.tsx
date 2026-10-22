'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { EMBLEMA_RARIDADE_MAP } from '@/rules/emblemas';
import { CARTAS_POR_VITORIA, dificuldadeDoTeste, NOME_DO_TESTE, TAMANHO_MAXIMO_DA_PARTY, TAMANHO_MINIMO_DO_TESTE, type CategoriaDoTeste, type ResultadoDaParty } from '@/rules/testeEquipe';
import type { EstadoDoTeste } from '@/server/testeEquipe';
import { NOCTHERA_THEME } from '@/theme/theme';

type Token = () => Promise<string | null>;
const OURO = '#C8A656';
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
        Última luta: {NOME_DO_TESTE[r.categoria]} ({dificuldadeDoTeste(r.dificuldade).nome}), {r.venceu ? 'vitória' : 'derrota'} em {r.rodadas} rodadas
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

/**
 * Teste de Equipe (7.4): party (até 3, sem precisar de guilda), todos marcam "Pronto", o líder escolhe o teste (Alma,
 * Corpo ou Mente) e a dificuldade e inicia. Cada membro gasta 1 chave da provação (ou 1 selo do abismo no Inferno).
 */
export function TesteEquipeScreen({ tokenFresco }: { tokenFresco: Token }) {
  const { colors } = NOCTHERA_THEME;
  const [estado, setEstado] = useState<EstadoDoTeste | null>(null);
  const [erroAoCarregar, setErroAoCarregar] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [categoria, setCategoria] = useState<CategoriaDoTeste>('alma');
  const [dificuldade, setDificuldade] = useState(1);
  const [convidado, setConvidado] = useState('');

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

  const agir = async (acao: string, extra: Record<string, unknown> = {}): Promise<boolean> => {
    setOcupado(true);
    setAviso(null);
    const r = await chamar(tokenFresco, { acao, ...extra });
    setOcupado(false);
    if (!r.ok) {
      setAviso({ texto: String(r.dados.error ?? 'Não foi possível agora.'), erro: true });
      return false;
    }
    setAviso({ texto: String(r.dados.mensagem ?? 'Feito.'), erro: false });
    setEstado(r.dados.estado as EstadoDoTeste);
    return true;
  };

  const party = estado?.minhaParty ?? null;
  const todosProntos = !!party && party.membros.length >= TAMANHO_MINIMO_DO_TESTE && party.membros.every((m) => m.pronto);
  const teste = estado?.testes.find((t) => t.categoria === categoria);
  const escolhida = teste?.dificuldades.find((d) => d.dificuldade === dificuldade);
  const temEntrada = !!estado && !!escolhida && (escolhida.custo === 'selo' ? estado.selos > 0 : estado.chaves.gratisRestantes + estado.chaves.guardadas > 0);

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
        ) : (
          <>
            <p className="text-xs" style={{ color: colors.text.secondary }}>
              Não precisa de guilda: qualquer jogador nível {estado.nivelNecessario} ou mais pode criar uma party e chamar outros pelo nome. De {TAMANHO_MINIMO_DO_TESTE} a {TAMANHO_MAXIMO_DA_PARTY} jogadores lutam juntos contra o chefe. Todos marcam &quot;Pronto&quot; e o líder escolhe o teste e a dificuldade. Para entrar, cada um gasta 1 chave da provação (no Inferno, 1 selo do abismo), ganhando ou perdendo. Cada dificuldade abre depois de concluir a anterior.
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
                  {party.convites.map((c) => (
                    <li key={c.uid} className="flex justify-between gap-2 text-sm" style={{ color: colors.text.secondary }}>
                      <span>{c.nome}</span>
                      <span>chamado(a)</span>
                    </li>
                  ))}
                </ul>
                {party.souLider && party.membros.length < TAMANHO_MAXIMO_DA_PARTY && (
                  <form
                    className="flex gap-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (await agir('convidar', { nome: convidado })) setConvidado('');
                    }}
                  >
                    <input value={convidado} onChange={(e) => setConvidado(e.target.value)} maxLength={32} placeholder="Nome do jogador" aria-label="Nome do jogador para chamar" className="flex-1 min-w-0 rounded-sm border-2 px-2 py-1.5 text-sm bg-transparent" style={{ borderColor: OURO }} />
                    <button type="submit" disabled={ocupado || convidado.trim().length < 2} className="rounded-sm border-2 px-3 text-sm font-bold disabled:opacity-50" style={{ borderColor: OURO, backgroundColor: '#3A2F18' }}>Chamar</button>
                  </form>
                )}
                <div className="flex flex-wrap gap-2">
                  <Botao disabled={ocupado} onClick={() => void agir('pronto', { pronto: true })}>Estou pronto</Botao>
                  <Botao disabled={ocupado} onClick={() => void agir('pronto', { pronto: false })}>Não estou pronto</Botao>
                  <Botao perigo disabled={ocupado} onClick={() => void agir('sair')}>Sair da party</Botao>
                  <Botao disabled={ocupado} onClick={() => void carregar()}>Atualizar</Botao>
                </div>
                {party.ultimoResultado && <Resultado r={party.ultimoResultado} />}
              </Cartao>
            ) : (
              <>
                {estado.convites.length > 0 && (
                  <Cartao titulo="Convites recebidos">
                    <ul className="flex flex-col gap-1.5">
                      {estado.convites.map((c) => (
                        <li key={c.partyId} className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate">{c.de} chamou você</span>
                          <span className="flex gap-1.5 shrink-0">
                            <Botao disabled={ocupado || estado.meuNivel < estado.nivelNecessario} onClick={() => void agir('aceitar', { partyId: c.partyId })}>Aceitar</Botao>
                            <Botao perigo disabled={ocupado} onClick={() => void agir('recusar', { partyId: c.partyId })}>Recusar</Botao>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Cartao>
                )}
                <Cartao titulo="Party">
                  <p className="text-xs" style={{ color: colors.text.secondary }}>Você não está numa party. Crie uma e chame alguém, ou espere um convite.</p>
                  <div><Botao disabled={ocupado || estado.meuNivel < estado.nivelNecessario} onClick={() => void agir('criar')}>Criar party</Botao></div>
                </Cartao>
              </>
            )}

            <Cartao titulo="Chaves e selos">
              <ul className="text-sm flex flex-col gap-0.5">
                <li className="flex justify-between gap-2"><span>Chaves grátis de hoje</span><span>{estado.chaves.gratisRestantes} de {estado.chaves.gratisPorDia}</span></li>
                <li className="flex justify-between gap-2"><span>Chaves compradas</span><span>{estado.chaves.guardadas}</span></li>
                <li className="flex justify-between gap-2"><span>Selos do abismo</span><span>{estado.selos}</span></li>
                <li className="flex justify-between gap-2" style={{ color: colors.text.secondary }}><span>Cacos / poeira de alma</span><span>{estado.cacos} / {estado.poeira}</span></li>
              </ul>
              <p className="text-[11px]" style={{ color: colors.text.secondary }}>As grátis renovam à meia-noite (Brasília) e não acumulam; as compradas ficam guardadas até usar. Você tem {estado.diamantes} diamantes.</p>
              <div>
                <Botao disabled={ocupado || estado.chaves.comprasRestantes <= 0 || estado.diamantes < estado.chaves.preco} onClick={() => void agir('comprarChave')}>
                  {estado.chaves.comprasRestantes > 0 ? `Comprar chave (${estado.chaves.preco} diamantes · ${estado.chaves.comprasRestantes} hoje)` : 'Compras de hoje esgotadas'}
                </Botao>
              </div>
            </Cartao>

            <Cartao titulo="Testes">
              <div role="tablist" aria-label="Testes" className="flex gap-1.5">
                {estado.testes.map((t) => (
                  <button
                    key={t.categoria}
                    type="button"
                    role="tab"
                    aria-selected={categoria === t.categoria}
                    onClick={() => {
                      setCategoria(t.categoria);
                      setDificuldade(1);
                    }}
                    className="flex-1 rounded-sm border px-1.5 py-1 text-xs font-bold"
                    style={{ borderColor: OURO, backgroundColor: categoria === t.categoria ? '#5A4824' : '#3A2F18', color: '#F5E3B3' }}
                  >
                    {t.nome}
                  </button>
                ))}
              </div>
              {teste && (
                <>
                  <p className="text-xs" style={{ color: colors.text.secondary }}>Chefe: {teste.chefe}. As cartas saem só da categoria {teste.nome.replace('Teste d', 'd')}.</p>
                  <ul className="flex flex-col gap-1.5">
                    {teste.dificuldades.map((d) => (
                      <li key={d.dificuldade}>
                        <label className="flex items-start gap-2 text-sm" style={{ opacity: d.liberada ? 1 : 0.5 }}>
                          <input type="radio" name="dificuldade" className="mt-1" checked={dificuldade === d.dificuldade} disabled={!d.liberada} onChange={() => setDificuldade(d.dificuldade)} />
                          <span className="flex-1 flex flex-col">
                            <span className="flex justify-between gap-2">
                              <span className="font-semibold">{d.nome}</span>
                              <span className="text-[11px]" style={{ color: d.concluida ? VERDE : colors.text.secondary }}>{d.concluida ? 'concluída' : d.liberada ? '' : 'bloqueada'}</span>
                            </span>
                            <span className="text-[11px]" style={{ color: colors.text.secondary }}>
                              Entrada: 1 {d.custo === 'selo' ? 'selo do abismo' : 'chave'} · {d.cacos} cacos{d.poeira ? ` · ${d.poeira} poeira` : ''}
                              {d.chanceDoSelo ? ` · ${Math.round(d.chanceDoSelo * 100)}% de selo do abismo` : ''}
                              {d.diamantes ? ` · ${d.diamantes} diamantes na 1ª vez` : ''}
                            </span>
                            <span className="text-[11px] flex flex-wrap gap-x-1.5">
                              {CARTAS_POR_VITORIA} cartas:
                              {d.raridades.map((r) => (
                                <span key={r.raridade} style={{ color: EMBLEMA_RARIDADE_MAP[r.raridade].cor }}>{EMBLEMA_RARIDADE_MAP[r.raridade].nome} {r.chance}%</span>
                              ))}
                            </span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {party?.souLider ? (
                <Botao disabled={ocupado || !todosProntos || !escolhida?.liberada || !temEntrada} onClick={() => void agir('iniciar', { categoria, dificuldade })}>
                  {!todosProntos
                    ? `Esperando todos marcarem "Pronto" (mínimo ${TAMANHO_MINIMO_DO_TESTE})`
                    : !temEntrada
                      ? `Você não tem ${escolhida?.custo === 'selo' ? 'selo do abismo' : 'chave da provação'}`
                      : `Iniciar ${teste?.nome ?? ''} (${escolhida?.nome ?? ''})`}
                </Botao>
              ) : party ? (
                <p className="text-xs" style={{ color: colors.text.secondary }}>O líder escolhe o teste e a dificuldade e inicia.</p>
              ) : null}
            </Cartao>
          </>
        )}
      </div>
    </main>
  );
}
