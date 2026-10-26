'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { NOME_DO_CARGO } from '@/rules/guilda';
import type { GuildaDetalhada, GuildaNoPainel, PartyNoPainel } from '@/server/guildasMestre';
import { NOCTHERA_THEME } from '@/theme/theme';
import { Cartao, chamar, OURO, VERMELHO } from '@/components/mestre/comum';
import type { SessaoDoPainel } from '@/components/mestre/MestrePainel';

type Token = () => Promise<string>;
type Acao = 'renomear' | 'apagarDescricao' | 'dissolver';

/**
 * Guildas e parties (7.10): ver as guildas (busca por nome) e as parties do Teste de Equipe. Quem pode sancionar
 * (Moderador e Dono) também renomeia, apaga a descrição e dissolve, sempre com o motivo; tudo fica no log.
 */
export function GuildasPainel({ sessao, tokenFresco }: { sessao: SessaoDoPainel; tokenFresco: Token }) {
  const { colors } = NOCTHERA_THEME;
  const podeMudar = sessao.permissoes.includes('jogadores.sancionar');
  const [busca, setBusca] = useState('');
  const [guildas, setGuildas] = useState<GuildaNoPainel[] | null>(null);
  const [aberta, setAberta] = useState<GuildaDetalhada | null>(null);
  const [partys, setPartys] = useState<PartyNoPainel[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [nome, setNome] = useState('');
  const [motivo, setMotivo] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  const campo = 'rounded-sm border px-2 py-1 text-[12px] w-full';
  const estiloCampo = { backgroundColor: colors.background.primary, borderColor: `${OURO}66`, color: colors.text.primary };

  const listar = useCallback(
    async (termo: string) => {
      setErro(null);
      const r = await chamar(tokenFresco, `/api/mestre/guildas${termo.trim() ? `?busca=${encodeURIComponent(termo.trim())}` : ''}`);
      if (r.ok) setGuildas(r.dados.guildas as GuildaNoPainel[]);
      else setErro(String(r.dados.error ?? 'Não foi possível listar as guildas.'));
    },
    [tokenFresco]
  );

  const carregarPartys = useCallback(async () => {
    const r = await chamar(tokenFresco, '/api/mestre/partys');
    if (r.ok) setPartys(r.dados.partys as PartyNoPainel[]);
  }, [tokenFresco]);

  useEffect(() => {
    void listar('');
    void carregarPartys();
  }, [listar, carregarPartys]);

  async function abrir(id: string) {
    setAviso(null);
    setErro(null);
    setConfirmar(false);
    const r = await chamar(tokenFresco, `/api/mestre/guildas?id=${encodeURIComponent(id)}`);
    if (r.ok) {
      const g = r.dados.guilda as GuildaDetalhada;
      setAberta(g);
      setNome(g.nome);
      setMotivo('');
    } else setErro(String(r.dados.error ?? 'Não foi possível abrir a guilda.'));
  }

  async function mudar(acao: Acao) {
    if (!aberta) return;
    setOcupado(true);
    setAviso(null);
    setErro(null);
    const r = await chamar(tokenFresco, '/api/mestre/guildas', { method: 'POST', body: JSON.stringify({ acao, id: aberta.id, nome, motivo }) });
    setOcupado(false);
    setConfirmar(false);
    if (!r.ok) return setErro(String(r.dados.error ?? 'Não foi possível concluir.'));
    setAviso(String(r.dados.mensagem ?? 'Feito.'));
    if (acao === 'dissolver') setAberta(null);
    else await abrir(aberta.id);
    await listar(busca);
  }

  return (
    <div className="flex flex-col gap-3">
      <Cartao titulo="Guildas">
        <form
          className="flex gap-2 items-end"
          onSubmit={(e) => {
            e.preventDefault();
            void listar(busca);
          }}
        >
          <label className="text-[11px] flex flex-col gap-0.5 flex-1">Começo do nome da guilda (vazio: as com mais membros)
            <input value={busca} onChange={(e) => setBusca(e.target.value)} className={campo} style={estiloCampo} autoComplete="off" />
          </label>
          <button type="submit" className="inline-flex items-center gap-1 px-3 py-1.5 rounded font-cinzel font-bold text-xs" style={{ backgroundColor: colors.accent.primary, color: colors.background.secondary }}>
            <Search className="w-3.5 h-3.5" /> Buscar
          </button>
        </form>
        {erro && <p role="alert" className="text-[12px] font-semibold" style={{ color: VERMELHO }}>{erro}</p>}
        {aviso && <p role="status" className="text-[12px] font-semibold" style={{ color: '#7BC47F' }}>{aviso}</p>}
        {guildas && guildas.length === 0 && <p className="text-[12px]" style={{ color: colors.text.secondary }}>Nenhuma guilda encontrada.</p>}
        <ul className="flex flex-col gap-1">
          {(guildas ?? []).map((g) => (
            <li key={g.id}>
              <button type="button" onClick={() => void abrir(g.id)} className="w-full text-left rounded-sm border px-2 py-1.5 text-[12px] flex justify-between gap-2" style={{ borderColor: aberta?.id === g.id ? OURO : `${OURO}33` }}>
                <span className="min-w-0 truncate"><b>{g.nome}</b> <span style={{ color: colors.text.secondary }}>· Líder {g.lider}</span></span>
                <span className="shrink-0" style={{ color: colors.text.secondary }}>{g.nivel} · {g.membros} membros</span>
              </button>
            </li>
          ))}
        </ul>
      </Cartao>

      {aberta && (
        <Cartao titulo={`Guilda ${aberta.nome}`}>
          <p className="text-[12px]">{aberta.descricao || <i style={{ color: colors.text.secondary }}>Sem descrição.</i>}</p>
          <p className="text-[11px]" style={{ color: colors.text.secondary }}>
            Identificador: <code>{aberta.id}</code> · Nível {aberta.nivel} · {aberta.xp.toLocaleString('pt-BR')} de XP · criada em {new Date(aberta.criadaEm).toLocaleDateString('pt-BR')} · {aberta.convites} convites e {aberta.pedidos} pedidos esperando
          </p>
          <ul className="text-[12px] flex flex-col gap-0.5">
            {aberta.membrosDaGuilda.map((m) => (
              <li key={m.uid} className="flex justify-between gap-2">
                <span>{m.nome} <span style={{ color: colors.text.secondary }}>· {NOME_DO_CARGO[m.cargo]}</span></span>
                <code className="text-[10px]" style={{ color: colors.text.secondary }}>{m.uid}</code>
              </li>
            ))}
          </ul>
          {podeMudar ? (
            <div className="flex flex-col gap-2 border-t pt-2" style={{ borderColor: `${OURO}33` }}>
              <label className="text-[11px] flex flex-col gap-0.5">Novo nome (para renomear)
                <input value={nome} onChange={(e) => setNome(e.target.value)} className={campo} style={estiloCampo} maxLength={24} autoComplete="off" />
              </label>
              <label className="text-[11px] flex flex-col gap-0.5">Motivo (obrigatório; fica no log e, ao dissolver, vai no aviso aos membros)
                <input value={motivo} onChange={(e) => setMotivo(e.target.value)} className={campo} style={estiloCampo} maxLength={300} autoComplete="off" />
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={ocupado || motivo.trim().length < 3 || nome.trim().length < 3 || nome.trim() === aberta.nome} onClick={() => void mudar('renomear')} className="px-3 py-1.5 rounded border text-xs font-bold disabled:opacity-50" style={{ borderColor: OURO }}>Renomear</button>
                <button type="button" disabled={ocupado || motivo.trim().length < 3 || !aberta.descricao} onClick={() => void mudar('apagarDescricao')} className="px-3 py-1.5 rounded border text-xs font-bold disabled:opacity-50" style={{ borderColor: OURO }}>Apagar a descrição</button>
                {confirmar ? (
                  <button type="button" disabled={ocupado || motivo.trim().length < 3} onClick={() => void mudar('dissolver')} className="px-3 py-1.5 rounded text-xs font-bold disabled:opacity-50" style={{ backgroundColor: VERMELHO, color: '#1A0E0E' }}>Confirmar: dissolver e avisar {aberta.membros} membros</button>
                ) : (
                  <button type="button" disabled={ocupado || motivo.trim().length < 3} onClick={() => setConfirmar(true)} className="px-3 py-1.5 rounded border text-xs font-bold disabled:opacity-50" style={{ borderColor: VERMELHO, color: VERMELHO }}>Dissolver</button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-[11px]" style={{ color: colors.text.secondary }}>Só o Moderador e o Dono mudam guildas.</p>
          )}
        </Cartao>
      )}

      <Cartao titulo="Parties do Teste de Equipe">
        {partys && partys.length === 0 && <p className="text-[12px]" style={{ color: colors.text.secondary }}>Nenhuma party agora.</p>}
        <ul className="flex flex-col gap-1">
          {(partys ?? []).map((p) => (
            <li key={p.id} className="text-[12px] flex justify-between gap-2">
              <span className="min-w-0 truncate"><b>{p.lider}</b> <span style={{ color: colors.text.secondary }}>· {p.membros.map((m) => `${m.nome}${m.pronto ? ' (pronto)' : ''}`).join(', ')}</span></span>
              <span className="shrink-0" style={{ color: p.viva ? '#7BC47F' : colors.text.secondary }}>{p.viva ? 'ativa' : 'parada'} · {new Date(p.atualizadaEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => void carregarPartys()} className="self-start text-[11px] underline" style={{ color: OURO }}>Atualizar</button>
      </Cartao>
    </div>
  );
}
