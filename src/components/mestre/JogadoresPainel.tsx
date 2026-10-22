'use client';

import React, { useState } from 'react';
import { Search, ShieldAlert } from 'lucide-react';
import { ACOES_DE_SANCAO, DIAS_MAXIMOS_DE_SUSPENSAO, DIAS_MINIMOS_DE_SUSPENSAO, NOME_DA_ACAO, type AcaoDeSancao } from '@/rules/sancoes';
import { CAMPOS_DE_AJUSTE, NOME_DO_CAMPO, type CampoDeAjuste } from '@/rules/ajustes';
import { NOME_DO_PAPEL } from '@/rules/mestre';
import { dataDoLog } from '@/lib/mestreTela';
import { descreverTransacao, situacaoDaConta } from '@/lib/jogadoresTela';
import type { FichaDoJogador } from '@/server/jogadores';
import { NOCTHERA_THEME } from '@/theme/theme';
import { Cartao, chamar, OURO, VERMELHO } from '@/components/mestre/comum';
import type { SessaoDoPainel } from '@/components/mestre/MestrePainel';
import { CorreioDoMestre } from '@/components/mestre/CorreioDoMestre';

type Token = () => Promise<string>;
const COR_DO_TOM = { ok: '#7BC47F', aviso: '#E6C775', perigo: VERMELHO } as const;

/**
 * Jogadores (3.5.4): busca por nome, e-mail ou uid, ficha completa com as transações e as sanções.
 * Quem lê vê tudo; só Moderador e Dono veem o formulário de sanção. Toda consulta e toda sanção ficam no log.
 */
export function JogadoresPainel({ sessao, tokenFresco }: { sessao: SessaoDoPainel; tokenFresco: Token }) {
  const { colors } = NOCTHERA_THEME;
  const podeSancionar = sessao.permissoes.includes('jogadores.sancionar');
  const podeAjustar = sessao.permissoes.includes('jogadores.ajustar');
  const podeDados = sessao.permissoes.includes('jogadores.dados');
  const [busca, setBusca] = useState('');
  const [ficha, setFicha] = useState<FichaDoJogador | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const campo = 'rounded-sm border px-2 py-1 text-[12px] w-full';
  const estiloCampo = { backgroundColor: colors.background.primary, borderColor: `${OURO}66`, color: colors.text.primary };

  const procurar = async () => {
    setOcupado(true);
    setErro(null);
    setAviso(null);
    const r = await chamar(tokenFresco, `/api/mestre/jogadores?busca=${encodeURIComponent(busca.trim())}`);
    setOcupado(false);
    if (r.ok) setFicha(r.dados.jogador as FichaDoJogador);
    else {
      setFicha(null);
      setErro(String(r.dados.error ?? 'Não foi possível buscar.'));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Cartao titulo="Buscar jogador">
        <form
          className="flex gap-2 items-end"
          onSubmit={(e) => {
            e.preventDefault();
            void procurar();
          }}
        >
          <label className="text-[11px] flex flex-col gap-0.5 flex-1">Nome do personagem (inteiro), e-mail ou identificador (uid)
            <input value={busca} onChange={(e) => setBusca(e.target.value)} className={campo} style={estiloCampo} autoComplete="off" required minLength={2} />
          </label>
          <button type="submit" disabled={ocupado} className="inline-flex items-center gap-1 px-3 py-1.5 rounded font-cinzel font-bold text-xs disabled:opacity-50" style={{ backgroundColor: colors.accent.primary, color: colors.background.secondary }}>
            <Search className="w-3.5 h-3.5" /> Buscar
          </button>
        </form>
        <p className="text-[11px]" style={{ color: colors.text.secondary }}>Cada consulta fica no log administrativo, porque a ficha tem dados pessoais.</p>
        {erro && <p role="alert" className="text-[12px] font-semibold" style={{ color: VERMELHO }}>{erro}</p>}
      </Cartao>

      {ficha && <Ficha ficha={ficha} />}
      {ficha && (
        <Sancoes
          ficha={ficha}
          podeSancionar={podeSancionar}
          aplicar={async (corpo) => {
            setAviso(null);
            const r = await chamar(tokenFresco, `/api/mestre/jogadores/${ficha.uid}/sancoes`, { method: 'POST', body: JSON.stringify(corpo) });
            if (r.ok) {
              setFicha(r.dados.jogador as FichaDoJogador);
              setAviso('Feito. A sanção vale em até 30 segundos em todas as instâncias do servidor.');
              return null;
            }
            return String(r.dados.error ?? 'Não foi possível concluir.');
          }}
          aviso={aviso}
        />
      )}
      {ficha && podeAjustar && (
        <Ajustes
          key={ficha.uid}
          ajustar={async (corpo) => {
            setAviso(null);
            const r = await chamar(tokenFresco, `/api/mestre/jogadores/${ficha.uid}/ajustes`, { method: 'POST', body: JSON.stringify(corpo) });
            if (r.ok) {
              setFicha(r.dados.jogador as FichaDoJogador);
              setAviso('Ajuste feito. Está no extrato de transações e no log.');
              return null;
            }
            return String(r.dados.error ?? 'Não foi possível concluir.');
          }}
        />
      )}
      {ficha && podeDados && !ficha.papelNoPainel && (
        <DadosDoJogador
          key={ficha.uid}
          ficha={ficha}
          exportar={async () => {
            const r = await chamar(tokenFresco, `/api/mestre/jogadores/${ficha.uid}/exportar`);
            if (!r.ok) return String(r.dados.error ?? 'Não foi possível exportar.');
            const blob = new Blob([JSON.stringify(r.dados.exportacao, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `jogador-${ficha.uid}.json`;
            a.click();
            URL.revokeObjectURL(url);
            return null;
          }}
          executar={async (acao, corpo) => {
            setAviso(null);
            const r = await chamar(tokenFresco, `/api/mestre/jogadores/${ficha.uid}/${acao}`, { method: 'POST', body: JSON.stringify(corpo) });
            if (!r.ok) return String(r.dados.error ?? 'Não foi possível concluir.');
            if (acao === 'zerar') {
              setFicha(r.dados.jogador as FichaDoJogador);
              setAviso('Progressão zerada. Está no log.');
            } else {
              setFicha(null);
              const login = (r.dados.resultado as { loginRemovido?: boolean } | undefined)?.loginRemovido;
              setAviso(login === false ? 'Jogador excluído. O login não pôde ser removido agora (a conta pode criar outro personagem).' : 'Jogador excluído por inteiro. Está no log.');
            }
            return null;
          }}
        />
      )}
      {ficha && <Transacoes ficha={ficha} />}
      {podeAjustar && <CorreioDoMestre key={ficha?.uid ?? 'todos'} tokenFresco={tokenFresco} jogador={ficha ? { uid: ficha.uid, nome: ficha.personagem.nome } : null} />}
    </div>
  );
}

function Ficha({ ficha }: { ficha: FichaDoJogador }) {
  const { colors } = NOCTHERA_THEME;
  const p = ficha.personagem;
  const sit = situacaoDaConta(ficha.sancao);
  const linhas: [string, string][] = [
    ['Nível', `${p.nivel} (XP ${p.xpAtual.toLocaleString('pt-BR')})`],
    ['Raça e classe', `${p.racaId} · ${p.classeId}${p.linhagem ? ` · ${p.linhagem}` : ''}`],
    ['Subclasse', p.subclasseAtualId ?? 'nenhuma'],
    ['Ouro', p.ouro.toLocaleString('pt-BR')],
    ['Diamantes', p.diamantes.toLocaleString('pt-BR')],
    ['Fragmentos de alma', String(p.fragmentosAlma)],
    ['Essência e fragmentos de ascensão', `${p.essenciaHabilidade} · ${p.fragmentosAscensao}`],
    ['Torre Celestial', p.torreAndar ? `andar ${p.torreAndar}` : 'não começou'],
    ['Caçada (estrelas vencidas)', p.cacadaChavesVencidas.length ? p.cacadaChavesVencidas.join(', ') : 'nenhuma'],
    ['Armas · armaduras · emblemas', `${p.quantidadeDeArmas} · ${p.quantidadeDeArmaduras} · ${p.quantidadeDeEmblemas}`],
    ['Materiais diferentes na mochila', String(Object.keys(p.inventario).length)],
    ['Criado em', dataDoLog(p.criadoEm)],
  ];
  return (
    <Cartao titulo={p.nome}>
      <p className="text-[11px] break-all" style={{ color: colors.text.secondary }}>uid {ficha.uid} · {ficha.email ?? 'e-mail indisponível'}</p>
      <p className="text-[12px] font-semibold" style={{ color: COR_DO_TOM[sit.tom] }}>{sit.texto}</p>
      {ficha.papelNoPainel && <p className="text-[11px]" style={{ color: colors.text.secondary }}>Tem papel no painel: {NOME_DO_PAPEL[ficha.papelNoPainel]}. Não pode ser sancionado.</p>}
      <dl className="grid gap-x-3 gap-y-1 grid-cols-1 md:grid-cols-2">
        {linhas.map(([r, v]) => (
          <div key={r} className="flex flex-col">
            <dt className="text-[10px] uppercase tracking-wider" style={{ color: colors.text.secondary }}>{r}</dt>
            <dd className="text-[12px]">{v}</dd>
          </div>
        ))}
      </dl>
    </Cartao>
  );
}

function Sancoes({ ficha, podeSancionar, aplicar, aviso }: { ficha: FichaDoJogador; podeSancionar: boolean; aplicar: (corpo: Record<string, unknown>) => Promise<string | null>; aviso: string | null }) {
  const { colors } = NOCTHERA_THEME;
  const [acao, setAcao] = useState<AcaoDeSancao>('advertir');
  const [dias, setDias] = useState(3);
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const campo = 'rounded-sm border px-2 py-1 text-[12px] w-full';
  const estiloCampo = { backgroundColor: colors.background.primary, borderColor: `${OURO}66`, color: colors.text.primary };
  const bloqueado = ficha.papelNoPainel !== null;
  const gravidade = acao === 'banir' || acao === 'suspender';

  return (
    <Cartao titulo="Sanções">
      {ficha.advertencias.length === 0 ? (
        <p className="text-[12px]" style={{ color: colors.text.secondary }}>Nenhuma advertência.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {ficha.advertencias.map((a, i) => (
            <li key={`${a.em}-${i}`} className="text-[12px]">
              <span style={{ color: colors.text.secondary }}>{dataDoLog(a.em)} · {a.por}:</span> {a.motivo}
            </li>
          ))}
        </ul>
      )}
      {ficha.sancao && (
        <p className="text-[12px]" style={{ color: COR_DO_TOM[situacaoDaConta(ficha.sancao).tom] }}>
          Em vigor: {situacaoDaConta(ficha.sancao).texto}. Motivo: {ficha.sancao.motivo}
        </p>
      )}
      {!podeSancionar ? (
        <p className="text-[11px]" style={{ color: colors.text.secondary }}>Seu papel só consulta. Quem sanciona é o Moderador ou o Dono.</p>
      ) : bloqueado ? null : (
        <form
          className="flex flex-col gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setOcupado(true);
            setErro(null);
            const falha = await aplicar({ acao, ...(acao === 'suspender' ? { dias } : {}), motivo });
            setOcupado(false);
            if (falha) setErro(falha);
            else setMotivo('');
          }}
        >
          <div className="grid gap-2 grid-cols-2 md:grid-cols-[1.2fr_0.6fr_2fr_auto] items-end">
            <label className="text-[11px] flex flex-col gap-0.5">Ação
              <select value={acao} onChange={(e) => setAcao(e.target.value as AcaoDeSancao)} className={campo} style={estiloCampo}>
                {ACOES_DE_SANCAO.map((a) => <option key={a} value={a}>{NOME_DA_ACAO[a]}</option>)}
              </select>
            </label>
            {acao === 'suspender' ? (
              <label className="text-[11px] flex flex-col gap-0.5">Dias
                <input type="number" min={DIAS_MINIMOS_DE_SUSPENSAO} max={DIAS_MAXIMOS_DE_SUSPENSAO} value={dias} onChange={(e) => setDias(Number(e.target.value))} className={campo} style={estiloCampo} />
              </label>
            ) : <span />}
            <label className="text-[11px] flex flex-col gap-0.5 col-span-2 md:col-span-1">Motivo (o jogador lê quando tenta entrar)
              <input value={motivo} onChange={(e) => setMotivo(e.target.value)} className={campo} style={estiloCampo} required />
            </label>
            <button type="submit" disabled={ocupado} className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded font-cinzel font-bold text-xs disabled:opacity-50" style={{ backgroundColor: gravidade ? VERMELHO : colors.accent.primary, color: colors.background.secondary }}>
              <ShieldAlert className="w-3.5 h-3.5" /> Aplicar
            </button>
          </div>
          <p className="text-[11px]" style={{ color: colors.text.secondary }}>
            Advertir só registra. Suspender e banir bloqueiam a conta na hora; o banimento não tem prazo e a suspensão termina sozinha. Tudo fica no log.
          </p>
        </form>
      )}
      {aviso && <p role="status" className="text-[12px] font-semibold" style={{ color: COR_DO_TOM.ok }}>{aviso}</p>}
      {erro && <p role="alert" className="text-[12px] font-semibold" style={{ color: VERMELHO }}>{erro}</p>}
    </Cartao>
  );
}

/** Dados do jogador (3.5.4.4, só o Dono): exportar (LGPD), zerar a progressão e excluir por inteiro. */
function DadosDoJogador({
  ficha,
  exportar,
  executar,
}: {
  ficha: FichaDoJogador;
  exportar: () => Promise<string | null>;
  executar: (acao: 'zerar' | 'excluir', corpo: Record<string, unknown>) => Promise<string | null>;
}) {
  const { colors } = NOCTHERA_THEME;
  const [acao, setAcao] = useState<'zerar' | 'excluir'>('zerar');
  const [motivo, setMotivo] = useState('');
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const campo = 'rounded-sm border px-2 py-1 text-[12px] w-full';
  const estiloCampo = { backgroundColor: colors.background.primary, borderColor: `${OURO}66`, color: colors.text.primary };

  return (
    <Cartao titulo="Dados do jogador (só o Dono)">
      <div className="flex flex-col gap-1 items-start">
        <button
          type="button"
          disabled={ocupado}
          onClick={async () => {
            setOcupado(true);
            setErro(await exportar());
            setOcupado(false);
          }}
          className="px-3 py-1.5 rounded border text-[12px] disabled:opacity-50"
          style={{ borderColor: OURO, color: '#E6C775' }}
        >
          Exportar dados (JSON)
        </button>
        <p className="text-[11px]" style={{ color: colors.text.secondary }}>Para atender um pedido do jogador (LGPD). Fica no log.</p>
      </div>
      <form
        className="flex flex-col gap-2 border-t pt-2"
        style={{ borderColor: `${VERMELHO}55` }}
        onSubmit={async (e) => {
          e.preventDefault();
          setOcupado(true);
          setErro(null);
          const falha = await executar(acao, { motivo, confirmarNome: nome });
          setOcupado(false);
          if (falha) setErro(falha);
        }}
      >
        <p className="text-[12px] font-semibold" style={{ color: VERMELHO }}>Ações sem volta</p>
        <label className="text-[11px] flex flex-col gap-0.5">Ação
          <select value={acao} onChange={(e) => setAcao(e.target.value as 'zerar' | 'excluir')} className={campo} style={estiloCampo}>
            <option value="zerar">Zerar progressão (volta ao nível 1; mantém nome, raça e classe)</option>
            <option value="excluir">Excluir o jogador por inteiro (personagem, nome, transações, sanção e login)</option>
          </select>
        </label>
        <p className="text-[11px]" style={{ color: colors.text.secondary }}>
          {acao === 'zerar'
            ? 'Tira nível, XP, moedas, mochila, armas, armaduras, subclasse, reforço e progresso de Caçada, Torre e demais modos. Os atributos voltam aos da criação.'
            : 'O nome do personagem fica livre e o login é removido. O log administrativo e os registros de combate são mantidos para auditoria.'}
        </p>
        <label className="text-[11px] flex flex-col gap-0.5">Motivo (vai para o log)
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} className={campo} style={estiloCampo} required minLength={5} maxLength={300} />
        </label>
        <label className="text-[11px] flex flex-col gap-0.5">Para confirmar, digite o nome do personagem: {ficha.personagem.nome}
          <input value={nome} onChange={(e) => setNome(e.target.value)} className={campo} style={estiloCampo} autoComplete="off" required />
        </label>
        <button type="submit" disabled={ocupado || nome.trim() !== ficha.personagem.nome} className="self-start px-3 py-1.5 rounded font-cinzel font-bold text-xs disabled:opacity-50" style={{ backgroundColor: VERMELHO, color: colors.background.secondary }}>
          {acao === 'zerar' ? 'Zerar progressão' : 'Excluir jogador'}
        </button>
      </form>
      {erro && <p role="alert" className="text-[12px] font-semibold" style={{ color: VERMELHO }}>{erro}</p>}
    </Cartao>
  );
}

/** Ajustes (3.5.4.2, só o Dono): os números são variações (+/−), não o valor final. Motivo obrigatório. */
function Ajustes({ ajustar }: { ajustar: (corpo: Record<string, unknown>) => Promise<string | null> }) {
  const { colors } = NOCTHERA_THEME;
  const [valores, setValores] = useState<Partial<Record<CampoDeAjuste, string>>>({});
  const [material, setMaterial] = useState('');
  const [qtd, setQtd] = useState('');
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const campo = 'rounded-sm border px-2 py-1 text-[12px] w-full';
  const estiloCampo = { backgroundColor: colors.background.primary, borderColor: `${OURO}66`, color: colors.text.primary };

  return (
    <Cartao titulo="Ajustar (só o Dono)">
      <form
        className="flex flex-col gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const campos: Record<string, number> = {};
          for (const c of CAMPOS_DE_AJUSTE) {
            const v = valores[c];
            if (v !== undefined && v !== '') campos[c] = Number(v);
          }
          const materiais = material.trim() && qtd !== '' ? { [material.trim()]: Number(qtd) } : {};
          setOcupado(true);
          setErro(null);
          const falha = await ajustar({ campos, materiais, motivo });
          setOcupado(false);
          if (falha) setErro(falha);
          else {
            setValores({});
            setMaterial('');
            setQtd('');
            setMotivo('');
          }
        }}
      >
        <p className="text-[11px]" style={{ color: colors.text.secondary }}>
          Escreva a variação: 500 soma, −500 retira. XP só pode ser concedido (e sobe de nível sozinho). Deixe em branco o que não muda.
        </p>
        <div className="grid gap-2 grid-cols-2 md:grid-cols-3">
          {CAMPOS_DE_AJUSTE.map((c) => (
            <label key={c} className="text-[11px] flex flex-col gap-0.5">{NOME_DO_CAMPO[c]}
              <input type="number" step={1} value={valores[c] ?? ''} onChange={(e) => setValores({ ...valores, [c]: e.target.value })} className={campo} style={estiloCampo} />
            </label>
          ))}
          <label className="text-[11px] flex flex-col gap-0.5">Material (id)
            <input value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="pelo-de-rato" className={campo} style={estiloCampo} autoComplete="off" />
          </label>
          <label className="text-[11px] flex flex-col gap-0.5">Quantidade do material
            <input type="number" step={1} value={qtd} onChange={(e) => setQtd(e.target.value)} className={campo} style={estiloCampo} />
          </label>
        </div>
        <label className="text-[11px] flex flex-col gap-0.5">Motivo (vai para o extrato e o log)
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} className={campo} style={estiloCampo} required minLength={5} maxLength={300} />
        </label>
        <button type="submit" disabled={ocupado} className="self-start px-3 py-1.5 rounded font-cinzel font-bold text-xs disabled:opacity-50" style={{ backgroundColor: colors.accent.primary, color: colors.background.secondary }}>
          {ocupado ? 'Aplicando...' : 'Aplicar ajuste'}
        </button>
        {erro && <p role="alert" className="text-[12px] font-semibold" style={{ color: VERMELHO }}>{erro}</p>}
      </form>
    </Cartao>
  );
}

function Transacoes({ ficha }: { ficha: FichaDoJogador }) {
  const { colors } = NOCTHERA_THEME;
  return (
    <Cartao titulo={`Transações (as ${ficha.transacoes.length} mais recentes)`}>
      {ficha.transacoes.length === 0 ? (
        <p className="text-[12px]" style={{ color: colors.text.secondary }}>Nenhuma transação de moeda.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {ficha.transacoes.map((t, i) => (
            <li key={t.id ?? i} className="text-[12px] flex flex-col md:flex-row md:gap-2">
              <span className="font-semibold" style={{ color: t.tipo === 'ganho' ? '#7BC47F' : VERMELHO }}>{descreverTransacao(t)}</span>
              <span>{t.motivo}</span>
              <span className="text-[10px] md:ml-auto" style={{ color: colors.text.secondary }}>{dataDoLog(t.timestamp)}</span>
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  );
}
