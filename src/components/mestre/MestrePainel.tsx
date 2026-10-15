'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Layers, Lock, ScrollText, ShieldCheck, Users } from 'lucide-react';
import { NOME_DA_PERMISSAO, NOME_DO_PAPEL, PAPEIS_MESTRE, type PapelMestre, type PermissaoMestre } from '@/rules/mestre';
import { dataDoLog, descreverAcao } from '@/lib/mestreTela';
import type { EntradaLogAdmin } from '@/server/persistencia';
import type { PapelListado } from '@/server/mestre';
import { NOCTHERA_THEME } from '@/theme/theme';
import { Cartao, chamar, OURO, VERMELHO } from '@/components/mestre/comum';
import { ConteudoPainel } from '@/components/mestre/ConteudoPainel';

export interface SessaoDoPainel {
  uid: string;
  email: string;
  papel: PapelMestre;
  nomeDoPapel: string;
  descricao: string;
  origem: 'ambiente' | 'painel';
  permissoes: PermissaoMestre[];
}

type Aba = 'geral' | 'conteudo' | 'papeis' | 'log';

const MODULOS_EM_BREVE = [
  'Salas, conexões, objetos e gatilhos dos mapas; jogar o mapa',
  'Monstros, itens e tabelas de drop',
  'Jogadores: busca, ajustes e sanções',
  'Feature flags e modo manutenção',
];

/** Casca do Painel do Mestre: visão geral, papéis e log administrativo. Tudo o que muda passa pelo servidor. */
export function MestrePainel({ sessao, tokenFresco }: { sessao: SessaoDoPainel; tokenFresco: () => Promise<string> }) {
  const { colors } = NOCTHERA_THEME;
  const podePapeis = sessao.permissoes.includes('papeis.gerir');
  const podeLog = sessao.permissoes.includes('log.ler');
  const podeConteudo = sessao.permissoes.includes('conteudo.ler');
  const [aba, setAba] = useState<Aba>('geral');
  const abas: { id: Aba; nome: string; icone: React.ReactNode }[] = [
    { id: 'geral', nome: 'Visão geral', icone: <ShieldCheck className="w-3.5 h-3.5" /> },
    ...(podeConteudo ? [{ id: 'conteudo' as const, nome: 'Mapas', icone: <Layers className="w-3.5 h-3.5" /> }] : []),
    ...(podePapeis ? [{ id: 'papeis' as const, nome: 'Papéis', icone: <Users className="w-3.5 h-3.5" /> }] : []),
    ...(podeLog ? [{ id: 'log' as const, nome: 'Log', icone: <ScrollText className="w-3.5 h-3.5" /> }] : []),
  ];

  return (
    <main className="min-h-dvh w-full flex flex-col items-center px-2.5 py-3" style={{ backgroundColor: colors.background.primary, color: colors.text.primary }}>
      <div className="w-full max-w-[960px] flex flex-col gap-3">
        <header className="flex items-center justify-between gap-2">
          <Link href="/hub" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-cinzel font-bold uppercase" style={{ backgroundColor: colors.background.secondary, borderColor: OURO, color: '#E6C775' }}>
            <ArrowLeft className="w-4 h-4" /> Jogo
          </Link>
          <span className="text-xs font-cinzel" style={{ color: colors.text.secondary }}>{sessao.email}</span>
        </header>
        <h1 className="text-center text-2xl font-cinzel font-extrabold tracking-widest uppercase" style={{ color: '#F5E3B3' }}>Painel do Mestre</h1>
        <p className="text-center text-xs" style={{ color: colors.text.secondary }}>
          Seu papel: <strong style={{ color: '#F5E3B3' }}>{sessao.nomeDoPapel}</strong>
        </p>

        <div role="tablist" aria-label="Seções do painel" className="flex gap-1 flex-wrap">
          {abas.map((a) => {
            const ativa = a.id === aba;
            return (
              <button
                key={a.id}
                type="button"
                role="tab"
                aria-selected={ativa}
                onClick={() => setAba(a.id)}
                className="inline-flex items-center gap-1 rounded-sm border px-3 py-1.5 text-[12px] font-cinzel font-bold"
                style={{ backgroundColor: ativa ? colors.accent.primary : colors.background.secondary, color: ativa ? colors.background.secondary : colors.text.primary, borderColor: ativa ? colors.accent.primary : `${OURO}66` }}
              >
                {a.icone} {a.nome}
              </button>
            );
          })}
        </div>

        {aba === 'geral' && <VisaoGeral sessao={sessao} />}
        {aba === 'conteudo' && podeConteudo && <ConteudoPainel sessao={sessao} tokenFresco={tokenFresco} />}
        {aba === 'papeis' && podePapeis && <Papeis sessao={sessao} tokenFresco={tokenFresco} />}
        {aba === 'log' && podeLog && <Log tokenFresco={tokenFresco} />}
      </div>
    </main>
  );
}

function VisaoGeral({ sessao }: { sessao: SessaoDoPainel }) {
  const { colors } = NOCTHERA_THEME;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Cartao titulo={`O que o papel ${sessao.nomeDoPapel} pode`}>
        <p className="text-[12px]" style={{ color: colors.text.secondary }}>{sessao.descricao}</p>
        <ul className="text-[12px] flex flex-col gap-0.5">
          {sessao.permissoes.map((p) => (
            <li key={p}>✓ {NOME_DA_PERMISSAO[p]}</li>
          ))}
        </ul>
        {sessao.origem === 'ambiente' && (
          <p className="text-[11px]" style={{ color: colors.text.secondary }}>O Dono vem do ambiente do servidor e não se altera por aqui.</p>
        )}
      </Cartao>
      <Cartao titulo="Em breve">
        <ul className="text-[12px] flex flex-col gap-1" style={{ color: colors.text.secondary }}>
          {MODULOS_EM_BREVE.map((m) => (
            <li key={m} className="inline-flex items-center gap-1.5"><Lock className="w-3 h-3 shrink-0" /> {m}</li>
          ))}
        </ul>
      </Cartao>
    </div>
  );
}

function Papeis({ sessao, tokenFresco }: { sessao: SessaoDoPainel; tokenFresco: () => Promise<string> }) {
  const { colors } = NOCTHERA_THEME;
  const [papeis, setPapeis] = useState<PapelListado[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [uidAlvo, setUidAlvo] = useState('');
  const [papel, setPapel] = useState<PapelMestre>('mestre');
  const [motivo, setMotivo] = useState('');
  const [removendo, setRemovendo] = useState<string | null>(null);
  const [motivoRemocao, setMotivoRemocao] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    const r = await chamar(tokenFresco, '/api/mestre/papeis');
    if (r.ok) setPapeis(r.dados.papeis as PapelListado[]);
    else setErro(String(r.dados.error ?? 'Não foi possível carregar os papéis.'));
  }, [tokenFresco]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const enviar = async (metodo: 'POST' | 'DELETE', corpo: Record<string, unknown>) => {
    setOcupado(true);
    setErro(null);
    const r = await chamar(tokenFresco, '/api/mestre/papeis', { method: metodo, body: JSON.stringify(corpo) });
    setOcupado(false);
    if (r.ok) {
      setPapeis(r.dados.papeis as PapelListado[]);
      return true;
    }
    setErro(String(r.dados.error ?? 'Não foi possível concluir.'));
    return false;
  };

  const campo = 'rounded-sm border px-2 py-1 text-[12px] w-full';
  const estiloCampo = { backgroundColor: colors.background.primary, borderColor: `${OURO}66`, color: colors.text.primary };

  return (
    <div className="flex flex-col gap-3">
      <Cartao titulo="Dar ou trocar um papel">
        <form
          className="grid gap-2 md:grid-cols-[1.4fr_1fr_1.6fr_auto] items-end"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await enviar('POST', { uidAlvo: uidAlvo.trim(), papel, motivo })) {
              setUidAlvo('');
              setMotivo('');
            }
          }}
        >
          <label className="text-[11px] flex flex-col gap-0.5">Identificador (uid) do jogador
            <input value={uidAlvo} onChange={(e) => setUidAlvo(e.target.value)} className={campo} style={estiloCampo} autoComplete="off" required />
          </label>
          <label className="text-[11px] flex flex-col gap-0.5">Papel
            <select value={papel} onChange={(e) => setPapel(e.target.value as PapelMestre)} className={campo} style={estiloCampo}>
              {PAPEIS_MESTRE.filter((p) => p !== 'dono').map((p) => (
                <option key={p} value={p}>{NOME_DO_PAPEL[p]}</option>
              ))}
            </select>
          </label>
          <label className="text-[11px] flex flex-col gap-0.5">Motivo (obrigatório)
            <input value={motivo} onChange={(e) => setMotivo(e.target.value)} className={campo} style={estiloCampo} required />
          </label>
          <button type="submit" disabled={ocupado} className="px-3 py-1.5 rounded font-cinzel font-bold text-xs disabled:opacity-50" style={{ backgroundColor: colors.accent.primary, color: colors.background.secondary }}>
            Salvar
          </button>
        </form>
        <p className="text-[11px]" style={{ color: colors.text.secondary }}>
          Cada mudança fica no log. O papel de Dono não se concede aqui: ele vem do ambiente do servidor.
        </p>
        {erro && <p role="alert" className="text-[12px] font-semibold" style={{ color: VERMELHO }}>{erro}</p>}
      </Cartao>

      <Cartao titulo="Quem tem papel">
        {papeis === null ? (
          <p className="text-[12px]" style={{ color: colors.text.secondary }}>Carregando...</p>
        ) : papeis.length === 0 ? (
          <p className="text-[12px]" style={{ color: colors.text.secondary }}>Ninguém ainda.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {papeis.map((p) => (
              <li key={p.uid} className="rounded-sm border px-2 py-1.5 flex flex-col gap-1" style={{ borderColor: `${OURO}33` }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px]">
                    <strong>{p.nome ?? 'Sem personagem'}</strong> · {NOME_DO_PAPEL[p.papel]}
                    <span className="block text-[10px] break-all" style={{ color: colors.text.secondary }}>{p.uid}{p.uid === sessao.uid ? ' (você)' : ''}</span>
                    {p.motivo && <span className="block text-[10px]" style={{ color: colors.text.secondary }}>Motivo: {p.motivo}</span>}
                  </span>
                  {p.origem === 'ambiente' ? (
                    <span className="text-[10px]" style={{ color: colors.text.secondary }}>ambiente</span>
                  ) : (
                    <button type="button" onClick={() => { setRemovendo(p.uid); setMotivoRemocao(''); }} className="px-2 py-1 rounded border text-[11px]" style={{ borderColor: VERMELHO, color: VERMELHO }}>
                      Remover
                    </button>
                  )}
                </div>
                {removendo === p.uid && (
                  <form
                    className="flex gap-1.5 items-center"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (await enviar('DELETE', { uidAlvo: p.uid, motivo: motivoRemocao })) setRemovendo(null);
                    }}
                  >
                    <input value={motivoRemocao} onChange={(e) => setMotivoRemocao(e.target.value)} placeholder="Motivo da remoção" className={campo} style={estiloCampo} required />
                    <button type="submit" disabled={ocupado} className="px-2 py-1 rounded text-[11px] font-bold disabled:opacity-50" style={{ backgroundColor: VERMELHO, color: colors.background.secondary }}>Confirmar</button>
                    <button type="button" onClick={() => setRemovendo(null)} className="px-2 py-1 rounded border text-[11px]" style={{ borderColor: `${OURO}66` }}>Cancelar</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  );
}

function Log({ tokenFresco }: { tokenFresco: () => Promise<string> }) {
  const { colors } = NOCTHERA_THEME;
  const [log, setLog] = useState<EntradaLogAdmin[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    const r = await chamar(tokenFresco, '/api/mestre/log?limite=100');
    if (r.ok) setLog(r.dados.log as EntradaLogAdmin[]);
    else setErro(String(r.dados.error ?? 'Não foi possível carregar o log.'));
  }, [tokenFresco]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <Cartao titulo="Log administrativo">
      <div className="flex items-center justify-between">
        <p className="text-[11px]" style={{ color: colors.text.secondary }}>Cada ação do painel fica aqui e não pode ser alterada.</p>
        <button type="button" onClick={() => void carregar()} className="px-2 py-1 rounded border text-[11px]" style={{ borderColor: `${OURO}66` }}>Atualizar</button>
      </div>
      {erro && <p role="alert" className="text-[12px] font-semibold" style={{ color: VERMELHO }}>{erro}</p>}
      {log === null ? (
        <p className="text-[12px]" style={{ color: colors.text.secondary }}>Carregando...</p>
      ) : log.length === 0 ? (
        <p className="text-[12px]" style={{ color: colors.text.secondary }}>Nenhuma ação registrada ainda.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {log.map((e) => (
            <li key={e.id} className="rounded-sm border px-2 py-1.5 text-[12px] flex flex-col" style={{ borderColor: `${OURO}33` }}>
              <span>{descreverAcao(e)}</span>
              <span className="text-[10px]" style={{ color: colors.text.secondary }}>
                {dataDoLog(e.criadoEm)} · {e.email} ({NOME_DO_PAPEL[e.papel]}){e.ip ? ` · ${e.ip}` : ''}
              </span>
              {e.motivo && <span className="text-[10px]" style={{ color: colors.text.secondary }}>Motivo: {e.motivo}</span>}
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  );
}
