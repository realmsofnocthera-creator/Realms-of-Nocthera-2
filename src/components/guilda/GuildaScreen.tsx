'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CLASSES_MAP } from '@/rules/classes';
import { DESCRICAO_MAXIMA_DA_GUILDA, NIVEIS_DA_GUILDA, nivelDaGuilda, NOME_DO_CARGO, NOME_MAXIMO_DA_GUILDA, podeExpulsar, administraEntrada, type CargoDaGuilda, type ResumoDaGuilda } from '@/rules/guilda';
import type { ChefeSemanalNaTela, ContratoNaTela, EstadoDaGuilda, GuildaPublica, IncursaoNaTela, MinhaGuilda, PesquisaNaTela } from '@/server/guildas';
import { EMBLEMA_RARIDADE_MAP } from '@/rules/emblemas';
import { PONTOS_POR_RARIDADE } from '@/rules/pesquisa';
import type { RaridadeMaterial } from '@/rules/raridades';
import { NOCTHERA_THEME } from '@/theme/theme';

type Token = () => Promise<string | null>;
const OURO = '#C8A656';
const BORDA = '#4A3F2A';
const VERMELHO = '#E5484D';
const VERDE = '#7BC47F';

async function chamar(tokenFresco: Token, url: string, corpo?: unknown): Promise<{ ok: boolean; dados: Record<string, unknown> }> {
  try {
    const token = await tokenFresco();
    const res = await fetch(url, {
      method: corpo ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token ?? ''}`, ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    const dados = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, dados };
  } catch {
    return { ok: false, dados: { error: 'Sem conexão. Tente de novo.' } };
  }
}

/** Guildas (7.3): a guilda do jogador, ou criar, procurar e responder convites quando ele não tem uma. */
export function GuildaScreen({ tokenFresco }: { tokenFresco: Token }) {
  const { colors } = NOCTHERA_THEME;
  const [estado, setEstado] = useState<EstadoDaGuilda | null>(null);
  const [erroAoCarregar, setErroAoCarregar] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    const r = await chamar(tokenFresco, '/api/guilda');
    if (r.ok) setEstado(r.dados as unknown as EstadoDaGuilda);
    else setErroAoCarregar(true);
  }, [tokenFresco]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  /** Faz a ação no servidor; devolve true se deu certo. */
  const agir = useCallback(
    async (acao: string, extra: Record<string, unknown> = {}): Promise<boolean> => {
      setOcupado(true);
      setAviso(null);
      const r = await chamar(tokenFresco, '/api/guilda', { acao, ...extra });
      setOcupado(false);
      if (!r.ok) {
        setAviso({ texto: String(r.dados.error ?? 'Não foi possível agora. Tente de novo.'), erro: true });
        return false;
      }
      setAviso({ texto: String(r.dados.mensagem ?? 'Feito.'), erro: false });
      setEstado(r.dados.estado as EstadoDaGuilda);
      return true;
    },
    [tokenFresco]
  );

  return (
    <main className="min-h-dvh w-full flex flex-col items-center px-2.5 sm:px-5 py-3 sm:py-6" style={{ backgroundColor: colors.background.primary, color: colors.text.primary }}>
      <div className="w-full max-w-[480px] flex flex-col gap-3">
        <header className="flex items-center gap-2">
          <Link href="/hud" aria-label="Voltar ao Hub" className="p-1"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-2xl font-cinzel font-extrabold italic tracking-widest uppercase" style={{ color: '#F5E3B3' }}>Guilda</h1>
        </header>
        {aviso && <p role={aviso.erro ? 'alert' : 'status'} className="text-sm font-semibold" style={{ color: aviso.erro ? VERMELHO : VERDE }}>{aviso.texto}</p>}
        {erroAoCarregar ? (
          <p role="alert" className="text-sm" style={{ color: VERMELHO }}>Não foi possível carregar a guilda agora. Tente de novo em instantes.</p>
        ) : !estado ? (
          <p className="text-sm" style={{ color: colors.text.secondary }}>Carregando...</p>
        ) : estado.minha ? (
          <>
            <NivelDaGuildaCartao guilda={estado.minha} />
            <QuadroDeContratos contratos={estado.contratos} agir={agir} ocupado={ocupado} />
            <IncursaoCartao incursao={estado.minha.incursao} agir={agir} ocupado={ocupado} />
            <PesquisaCartao pesquisa={estado.minha.pesquisa} eu={estado.eu} agir={agir} ocupado={ocupado} />
            <ChefeSemanalCartao chefe={estado.minha.chefeSemanal} agir={agir} ocupado={ocupado} />
            <MinhaGuildaPainel guilda={estado.minha} agir={agir} ocupado={ocupado} />
          </>
        ) : (
          <SemGuilda estado={estado} agir={agir} ocupado={ocupado} tokenFresco={tokenFresco} />
        )}
      </div>
    </main>
  );
}

type Agir = (acao: string, extra?: Record<string, unknown>) => Promise<boolean>;

function Cartao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const { colors } = NOCTHERA_THEME;
  return (
    <section aria-label={titulo} className="rounded-sm border-2 p-3 flex flex-col gap-2" style={{ borderColor: OURO, backgroundColor: colors.background.secondary }}>
      <h2 className="font-cinzel font-bold text-base">{titulo}</h2>
      {children}
    </section>
  );
}

function Botao({ children, onClick, disabled, perigo }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; perigo?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="rounded-sm border px-2 py-1 text-xs font-bold disabled:opacity-50" style={{ borderColor: perigo ? VERMELHO : OURO, backgroundColor: '#3A2F18', color: perigo ? VERMELHO : '#F5E3B3' }}>
      {children}
    </button>
  );
}

/** O nível da guilda, a barra de XP e o que o próximo nível desbloqueia. */
function NivelDaGuildaCartao({ guilda }: { guilda: MinhaGuilda }) {
  const { colors } = NOCTHERA_THEME;
  const { nivel } = guilda;
  const proximo = NIVEIS_DA_GUILDA[nivel.nivel];
  const pct = nivel.xpDoNivel ? Math.min(100, Math.round((nivel.xpNoNivel / nivel.xpDoNivel) * 100)) : 100;
  return (
    <section aria-label="Nível da guilda" className="rounded-sm border-2 p-3 flex flex-col gap-1.5" style={{ borderColor: OURO, backgroundColor: colors.background.secondary }}>
      <p className="text-sm">
        <span className="font-cinzel font-bold text-base" style={{ color: '#F5E3B3' }}>{nivel.nome}</span> · nível {nivel.nivel} de {NIVEIS_DA_GUILDA.length}
      </p>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: '#2A2214' }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="XP da guilda">
        <div className="h-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #D97706, #F5E3B3)' }} />
      </div>
      <p className="text-xs" style={{ color: colors.text.secondary }}>
        {nivel.xpDoNivel ? `${nivel.xpNoNivel} / ${nivel.xpDoNivel} XP para ${proximo.nome}${proximo.desbloqueia ? ` (desbloqueia: ${proximo.desbloqueia})` : ''}` : 'Nível máximo alcançado.'}
      </p>
    </section>
  );
}

const NOME_DO_TIPO_DE_CONTRATO = { derrotar: 'Derrote', entregar: 'Entregue' } as const;

/** Quadro de contratos: os 3 contratos do dia do jogador. As vitórias contam em qualquer luta contra monstros. */
function QuadroDeContratos({ contratos, agir, ocupado }: { contratos: ContratoNaTela[]; agir: Agir; ocupado: boolean }) {
  const { colors } = NOCTHERA_THEME;
  return (
    <Cartao titulo="Quadro de contratos">
      <p className="text-xs" style={{ color: colors.text.secondary }}>Três contratos por dia (renovam à meia-noite de Brasília). As vitórias contam em qualquer luta contra monstros.</p>
      <ul className="flex flex-col gap-1.5">
        {contratos.map((c) => (
          <li key={c.id} className="rounded-sm border px-2 py-1.5 flex flex-col gap-1" style={{ borderColor: c.pronto ? VERDE : BORDA, opacity: c.entregue ? 0.6 : 1 }}>
            <span className="text-sm font-bold">{c.tipo === 'vencer' ? `Vença ${c.quantidade} lutas contra monstros` : `${NOME_DO_TIPO_DE_CONTRATO[c.tipo]} ${c.quantidade}× ${c.nomeAlvo}`}</span>
            <span className="text-[11px]" style={{ color: colors.text.secondary }}>
              {c.feito}/{c.quantidade} · Recompensa: {c.recompensa.ouro} de ouro, {c.recompensa.xpGuilda} XP de guilda{c.recompensa.materiais.length ? ', material raro' : ''}
            </span>
            {c.entregue ? (
              <span className="text-xs font-semibold" style={{ color: VERDE }}>Entregue</span>
            ) : (
              <span><Botao disabled={ocupado || !c.pronto} onClick={() => void agir('entregarContrato', { contratoId: c.id })}>{c.pronto ? 'Entregar' : 'Em andamento'}</Botao></span>
            )}
          </li>
        ))}
      </ul>
    </Cartao>
  );
}

function Barra({ valor, maximo, rotulo, cor = 'linear-gradient(90deg, #D97706, #F5E3B3)' }: { valor: number; maximo: number; rotulo: string; cor?: string }) {
  const pct = maximo > 0 ? Math.min(100, Math.round((valor / maximo) * 100)) : 100;
  return (
    <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: '#2A2214' }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={rotulo}>
      <div className="h-full" style={{ width: `${pct}%`, background: cor }} />
    </div>
  );
}

/** Incursão: o chefe atual, a vida global, quem lutou e o botão de lutar (3 por dia). */
function IncursaoCartao({ incursao: inc, agir, ocupado }: { incursao: IncursaoNaTela; agir: Agir; ocupado: boolean }) {
  const { colors } = NOCTHERA_THEME;
  if (!inc.liberada) {
    return (
      <Cartao titulo="Incursões">
        <p className="text-xs" style={{ color: colors.text.secondary }}>Abrem quando a guilda chega ao nível {NIVEIS_DA_GUILDA[inc.nivelDaGuildaParaLiberar - 1].nome}.</p>
      </Cartao>
    );
  }
  const restantes = inc.lutasPorDia - inc.minhasLutasHoje;
  return (
    <Cartao titulo="Incursões">
      <p className="text-sm"><strong>{inc.chefe}</strong></p>
      <p className="text-xs" style={{ color: colors.text.secondary }}>Nível {inc.nivel} de 100 · {inc.dificuldade}</p>
      <Barra valor={inc.hp} maximo={inc.hpMax} rotulo="Vida do chefe" cor="linear-gradient(90deg, #7F1D1D, #E5484D)" />
      <p className="text-xs" style={{ color: colors.text.secondary }}>Vida: {inc.hp} / {inc.hpMax}. Todo dano soma; o chefe não se cura entre as lutas.</p>
      {inc.ultima && <p className="text-xs" style={{ color: VERDE }}>Última vitória: {inc.ultima.chefe} ({inc.ultima.dificuldade}).</p>}
      <div className="flex items-center gap-2">
        <Botao disabled={ocupado || restantes <= 0} onClick={() => void agir('lutarIncursao')}>{restantes > 0 ? 'Lutar' : 'Sem lutas hoje'}</Botao>
        <span className="text-xs" style={{ color: colors.text.secondary }}>Lutas de hoje: {restantes} de {inc.lutasPorDia}</span>
      </div>
      {inc.participantes.length > 0 && (
        <>
          <h3 className="text-sm font-bold mt-1">Dano causado</h3>
          <ol className="text-xs flex flex-col gap-0.5">
            {inc.participantes.map((p, i) => (
              <li key={p.nome} className="flex justify-between gap-2"><span>{i + 1}º {p.nome}</span><span style={{ color: colors.text.secondary }}>{p.dano} ({p.lutas} {p.lutas === 1 ? 'luta' : 'lutas'})</span></li>
            ))}
          </ol>
        </>
      )}
      <p className="text-[11px]" style={{ color: colors.text.secondary }}>Quando o chefe cai, quem lutou recebe ouro, XP, diamantes e um material raro (mais para quem causou mais dano), e a guilda ganha XP.</p>
    </Cartao>
  );
}

/** Pesquisa: os ramos com o nível, o bônus e as duas barras (ouro e materiais); cada membro doa no ramo que quiser. */
function PesquisaCartao({ pesquisa, eu, agir, ocupado }: { pesquisa: PesquisaNaTela; eu: EstadoDaGuilda['eu']; agir: Agir; ocupado: boolean }) {
  const { colors } = NOCTHERA_THEME;
  const [aberto, setAberto] = useState<string | null>(null);
  const [ouro, setOuro] = useState('');
  const [material, setMaterial] = useState('');
  const [qtd, setQtd] = useState('');
  if (!pesquisa.liberada) {
    return (
      <Cartao titulo="Pesquisa da guilda">
        <p className="text-xs" style={{ color: colors.text.secondary }}>Abre quando a guilda chega ao nível {NIVEIS_DA_GUILDA[pesquisa.nivelDaGuildaParaLiberar - 1].nome}.</p>
      </Cartao>
    );
  }
  return (
    <Cartao titulo="Pesquisa da guilda">
      <p className="text-xs" style={{ color: colors.text.secondary }}>Doe ouro e materiais. Quando as duas barras de um ramo enchem, ele sobe de nível e o bônus vale para todos os membros. Materiais valem pontos pela raridade (comum 1, raro 3, muito raro 8, épico 20, lendário 50).</p>
      <ul className="flex flex-col gap-1.5">
        {pesquisa.ramos.map((r) => (
          <li key={r.id} className="rounded-sm border px-2 py-1.5 flex flex-col gap-1" style={{ borderColor: BORDA }}>
            <button type="button" onClick={() => setAberto(aberto === r.id ? null : r.id)} className="text-left flex justify-between gap-2">
              <span className="text-sm font-bold">{r.nome} <span className="text-[11px] font-normal" style={{ color: colors.text.secondary }}>· nível {r.nivel}/{r.nivelMaximo}</span></span>
              <span className="text-xs" style={{ color: r.bonus ? VERDE : colors.text.secondary }}>+{r.bonus}{r.unidade}</span>
            </button>
            <span className="text-[11px]" style={{ color: colors.text.secondary }}>{r.descricao}</span>
            {r.custo ? (
              <>
                <Barra valor={r.ouro} maximo={r.custo.ouro} rotulo={`Ouro de ${r.nome}`} />
                <span className="text-[11px]" style={{ color: colors.text.secondary }}>Ouro: {r.ouro} / {r.custo.ouro}</span>
                <Barra valor={r.materiais} maximo={r.custo.materiais} rotulo={`Materiais de ${r.nome}`} cor="linear-gradient(90deg, #1D4ED8, #5AA7F0)" />
                <span className="text-[11px]" style={{ color: colors.text.secondary }}>Materiais: {r.materiais} / {r.custo.materiais} pontos</span>
              </>
            ) : (
              <span className="text-xs font-semibold" style={{ color: VERDE }}>Nível máximo</span>
            )}
            {aberto === r.id && r.custo && (
              <div className="flex flex-col gap-1.5 mt-1">
                <div className="flex gap-2">
                  <input type="number" min={1} value={ouro} onChange={(e) => setOuro(e.target.value)} placeholder={`Ouro (você tem ${eu.ouro})`} aria-label={`Ouro para ${r.nome}`} className={campo} style={{ borderColor: OURO }} />
                  <Botao disabled={ocupado || !(Number(ouro) > 0)} onClick={async () => { if (await agir('doarPesquisa', { ramo: r.id, ouro: Number(ouro) })) setOuro(''); }}>Doar ouro</Botao>
                </div>
                <div className="flex gap-2">
                  <select value={material} onChange={(e) => setMaterial(e.target.value)} aria-label={`Material para ${r.nome}`} className={campo} style={{ borderColor: OURO, backgroundColor: colors.background.secondary }}>
                    <option value="">Material</option>
                    {eu.materiais.map((m) => <option key={m.id} value={m.id}>{m.nome} ×{m.qtd} ({PONTOS_POR_RARIDADE[m.raridade as RaridadeMaterial] ?? 0} pt)</option>)}
                  </select>
                  <input type="number" min={1} value={qtd} onChange={(e) => setQtd(e.target.value)} placeholder="Qtd" aria-label="Quantidade do material" className="w-16 rounded-sm border-2 px-2 py-1.5 text-sm bg-transparent" style={{ borderColor: OURO }} />
                  <Botao disabled={ocupado || !material || !(Number(qtd) > 0)} onClick={async () => { if (await agir('doarPesquisa', { ramo: r.id, materiais: { [material]: Number(qtd) } })) setQtd(''); }}>Doar</Botao>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Cartao>
  );
}

const dataCurta = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;

/** Chefe de guildas: o chefe da semana, o melhor do jogador, a posição da guilda, o top 10, as faixas e os resgates. */
function ChefeSemanalCartao({ chefe: c, agir, ocupado }: { chefe: ChefeSemanalNaTela; agir: Agir; ocupado: boolean }) {
  const { colors } = NOCTHERA_THEME;
  const [verFaixas, setVerFaixas] = useState(false);
  if (!c.liberado) {
    return (
      <Cartao titulo="Chefe de guildas">
        <p className="text-xs" style={{ color: colors.text.secondary }}>Abre quando a guilda chega ao nível {NIVEIS_DA_GUILDA[c.nivelDaGuildaParaLiberar - 1].nome}.</p>
      </Cartao>
    );
  }
  return (
    <Cartao titulo="Chefe de guildas">
      {c.pendentes.map((semana) => (
        <div key={semana} className="rounded-sm border px-2 py-1.5 flex items-center justify-between gap-2" style={{ borderColor: VERDE }}>
          <span className="text-xs font-semibold" style={{ color: VERDE }}>Recompensa da semana de {dataCurta(semana)}</span>
          <Botao disabled={ocupado} onClick={() => void agir('resgatarChefeSemanal', { semana })}>Resgatar</Botao>
        </div>
      ))}
      <p className="text-sm"><strong>{c.chefe}</strong></p>
      <p className="text-xs" style={{ color: colors.text.secondary }}>Semana até {dataCurta(c.termina)} (segunda, 0h de Brasília). Lute quantas vezes quiser: vale o seu maior dano, e a guilda soma o maior de cada membro.</p>
      <p className="text-sm">Seu melhor: <strong>{c.meuMelhor}</strong> · Guilda: <strong>{c.totalDaGuilda}</strong>{c.posicao ? ` · ${c.posicao}º lugar` : ''}</p>
      <div><Botao disabled={ocupado} onClick={() => void agir('lutarChefeSemanal')}>Lutar</Botao></div>
      {c.top.length > 0 && (
        <>
          <h3 className="text-sm font-bold mt-1">Ranking das guildas</h3>
          <ol className="text-xs flex flex-col gap-0.5">
            {c.top.map((t) => (
              <li key={`${t.posicao}-${t.nome}`} className="flex justify-between gap-2" style={{ color: t.minha ? '#F5E3B3' : undefined, fontWeight: t.minha ? 700 : 400 }}>
                <span>{t.posicao}º {t.nome}</span>
                <span>{t.total}</span>
              </li>
            ))}
          </ol>
        </>
      )}
      <button type="button" onClick={() => setVerFaixas(!verFaixas)} className="self-start text-xs underline" style={{ color: colors.text.secondary }}>{verFaixas ? 'Esconder recompensas' : 'Ver recompensas por posição'}</button>
      {verFaixas && (
        <ul className="text-[11px] flex flex-col gap-0.5" style={{ color: colors.text.secondary }}>
          {c.faixas.map((f) => (
            <li key={f.nome}>
              <strong>{f.nome}:</strong> {f.ouro} de ouro para cada um que lutou, {f.xpGuilda} de XP para a guilda
              {f.baus.map((b) => `, ${b.quantidade} baú(s) ${EMBLEMA_RARIDADE_MAP[b.raridade].nome.toLowerCase()}(s)`).join('')}
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  );
}

const campo = 'flex-1 min-w-0 rounded-sm border-2 px-2 py-1.5 text-sm bg-transparent';

function MinhaGuildaPainel({ guilda, agir, ocupado }: { guilda: MinhaGuilda; agir: Agir; ocupado: boolean }) {
  const { colors } = NOCTHERA_THEME;
  const lider = guilda.meuCargo === 'lider';
  const admin = administraEntrada(guilda.meuCargo);
  const [convidado, setConvidado] = useState('');
  const [descricao, setDescricao] = useState(guilda.descricao);
  const [confirmacao, setConfirmacao] = useState('');

  const acoesDoMembro = (uid: string, nome: string, cargo: CargoDaGuilda) => {
    const botoes: React.ReactNode[] = [];
    if (lider && cargo === 'membro') botoes.push(<Botao key="p" disabled={ocupado} onClick={() => void agir('promover', { uid })}>Promover</Botao>);
    if (lider && cargo === 'oficial') botoes.push(<Botao key="r" disabled={ocupado} onClick={() => void agir('rebaixar', { uid })}>Rebaixar</Botao>);
    if (lider && cargo !== 'lider')
      botoes.push(
        <Botao key="t" disabled={ocupado} onClick={() => window.confirm(`Passar a liderança para ${nome}? Você vira Oficial.`) && void agir('transferir', { uid })}>
          Tornar Líder
        </Botao>
      );
    if (podeExpulsar(guilda.meuCargo, cargo))
      botoes.push(
        <Botao key="e" perigo disabled={ocupado} onClick={() => window.confirm(`Expulsar ${nome} da guilda?`) && void agir('expulsar', { uid })}>
          Expulsar
        </Botao>
      );
    return botoes;
  };

  return (
    <>
      <Cartao titulo={guilda.nome}>
        <p className="text-sm">Seu cargo: <strong>{NOME_DO_CARGO[guilda.meuCargo]}</strong> · {guilda.membros.length}/{guilda.maxMembros} membros</p>
        {lider ? (
          <form
            className="flex flex-col gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              void agir('editarDescricao', { descricao });
            }}
          >
            <label className="text-xs flex flex-col gap-1" style={{ color: colors.text.secondary }}>Descrição
              <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={DESCRICAO_MAXIMA_DA_GUILDA} rows={2} className="rounded-sm border-2 px-2 py-1 text-sm bg-transparent" style={{ borderColor: BORDA, color: colors.text.primary }} />
            </label>
            {descricao !== guilda.descricao && <button type="submit" disabled={ocupado} className="self-start rounded-sm border px-2 py-1 text-xs font-bold" style={{ borderColor: OURO, backgroundColor: '#3A2F18' }}>Salvar descrição</button>}
          </form>
        ) : (
          guilda.descricao && <p className="text-sm whitespace-pre-wrap" style={{ color: colors.text.secondary }}>{guilda.descricao}</p>
        )}
      </Cartao>

      <Cartao titulo="Membros">
        <ul className="flex flex-col gap-1.5">
          {guilda.membros.map((m) => (
            <li key={m.uid} className="rounded-sm border px-2 py-1.5 flex flex-col gap-1" style={{ borderColor: BORDA }}>
              <span className="flex items-center justify-between gap-2">
                <span className="font-bold truncate">{m.nome}</span>
                <span className="text-[11px] uppercase tracking-wide" style={{ color: m.cargo === 'lider' ? '#F5E3B3' : colors.text.secondary }}>{NOME_DO_CARGO[m.cargo]}</span>
              </span>
              <span className="text-[11px]" style={{ color: colors.text.secondary }}>
                Contribuiu com {m.xpContribuido ?? 0} XP
              </span>
              {acoesDoMembro(m.uid, m.nome, m.cargo).length > 0 && <span className="flex flex-wrap gap-1.5">{acoesDoMembro(m.uid, m.nome, m.cargo)}</span>}
            </li>
          ))}
        </ul>
      </Cartao>

      {admin && (
        <Cartao titulo="Entrada de membros">
          <form
            className="flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await agir('convidar', { nome: convidado })) setConvidado('');
            }}
          >
            <input value={convidado} onChange={(e) => setConvidado(e.target.value)} maxLength={32} placeholder="Nome do personagem" aria-label="Nome do personagem para convidar" className={campo} style={{ borderColor: OURO }} />
            <button type="submit" disabled={ocupado || convidado.trim().length < 2} className="rounded-sm border-2 px-3 text-sm font-bold disabled:opacity-50" style={{ borderColor: OURO, backgroundColor: '#3A2F18' }}>Convidar</button>
          </form>
          <h3 className="text-sm font-bold mt-1">Pedidos para entrar</h3>
          {guilda.pedidos.length === 0 ? (
            <p className="text-xs" style={{ color: colors.text.secondary }}>Nenhum pedido.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {guilda.pedidos.map((p) => (
                <li key={p.uid} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{p.nome} <span className="text-[11px]" style={{ color: colors.text.secondary }}>· {CLASSES_MAP[p.classeId]?.nome ?? p.classeId} · nível {p.nivel}</span></span>
                  <span className="flex gap-1.5 shrink-0">
                    <Botao disabled={ocupado} onClick={() => void agir('aceitarPedido', { uid: p.uid })}>Aceitar</Botao>
                    <Botao perigo disabled={ocupado} onClick={() => void agir('recusarPedido', { uid: p.uid })}>Recusar</Botao>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <h3 className="text-sm font-bold mt-1">Convites enviados</h3>
          {guilda.convites.length === 0 ? (
            <p className="text-xs" style={{ color: colors.text.secondary }}>Nenhum convite esperando resposta.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {guilda.convites.map((c) => (
                <li key={c.uid} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{c.nome} <span className="text-[11px]" style={{ color: colors.text.secondary }}>· por {c.por}</span></span>
                  <Botao perigo disabled={ocupado} onClick={() => void agir('cancelarConvite', { uid: c.uid })}>Cancelar</Botao>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      )}

      {lider && guilda.membros.length > 1 ? (
        <p className="text-xs" style={{ color: colors.text.secondary }}>Para sair, passe a liderança para outro membro (ou desfaça a guilda).</p>
      ) : (
        <div>
          <Botao perigo disabled={ocupado} onClick={() => window.confirm(lider ? 'Você é o único membro: sair desfaz a guilda. Continuar?' : `Sair da guilda ${guilda.nome}?`) && void agir('sair')}>
            Sair da guilda
          </Botao>
        </div>
      )}
      {lider && (
        <Cartao titulo="Desfazer a guilda">
          <p className="text-xs" style={{ color: colors.text.secondary }}>Todos os membros saem e o nome fica livre. Não dá para desfazer. Para confirmar, digite o nome da guilda.</p>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void agir('desfazer', { nome: confirmacao });
            }}
          >
            <input value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} maxLength={NOME_MAXIMO_DA_GUILDA} placeholder={guilda.nome} aria-label="Nome da guilda para confirmar" className={campo} style={{ borderColor: VERMELHO }} />
            <button type="submit" disabled={ocupado || !confirmacao.trim()} className="rounded-sm border-2 px-3 text-sm font-bold disabled:opacity-50" style={{ borderColor: VERMELHO, color: VERMELHO }}>Desfazer</button>
          </form>
        </Cartao>
      )}
    </>
  );
}

function SemGuilda({ estado, agir, ocupado, tokenFresco }: { estado: EstadoDaGuilda; agir: Agir; ocupado: boolean; tokenFresco: Token }) {
  const { colors } = NOCTHERA_THEME;
  const { regras, eu } = estado;
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [busca, setBusca] = useState('');
  const [lista, setLista] = useState<ResumoDaGuilda[] | null>(null);
  const [erroDaLista, setErroDaLista] = useState<string | null>(null);
  const [aberta, setAberta] = useState<GuildaPublica | null>(null);

  const procurar = useCallback(
    async (texto: string) => {
      setErroDaLista(null);
      const r = await chamar(tokenFresco, `/api/guildas?q=${encodeURIComponent(texto)}`);
      if (r.ok) setLista(r.dados.guildas as ResumoDaGuilda[]);
      else setErroDaLista(String(r.dados.error ?? 'Não foi possível procurar agora.'));
    },
    [tokenFresco]
  );

  useEffect(() => {
    void procurar('');
  }, [procurar]);

  async function abrir(id: string) {
    const r = await chamar(tokenFresco, `/api/guildas/${encodeURIComponent(id)}`);
    if (r.ok) setAberta(r.dados.guilda as GuildaPublica);
    else setErroDaLista(String(r.dados.error ?? 'Não foi possível abrir a guilda.'));
  }

  const pedidoFeito = (id: string) => estado.pedidos.some((p) => p.id === id);
  const convidado = (id: string) => estado.convites.some((c) => c.id === id);
  const faltaNivel = eu.nivel < regras.nivelMinimo;
  const faltaOuro = eu.ouro < regras.custoOuro;

  return (
    <>
      <p className="text-sm" style={{ color: colors.text.secondary }}>Você ainda não está numa guilda. Aceite um convite, peça para entrar numa guilda ou crie a sua.</p>

      {estado.convites.length > 0 && (
        <Cartao titulo="Convites recebidos">
          <ul className="flex flex-col gap-1.5">
            {estado.convites.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{g.nome} <span className="text-[11px]" style={{ color: colors.text.secondary }}>· {nivelDaGuilda(g.xp, regras).nome} · {g.quantidadeMembros} membros</span></span>
                <span className="flex gap-1.5 shrink-0">
                  <Botao disabled={ocupado} onClick={() => void agir('aceitarConvite', { guildaId: g.id })}>Aceitar</Botao>
                  <Botao perigo disabled={ocupado} onClick={() => void agir('recusarConvite', { guildaId: g.id })}>Recusar</Botao>
                </span>
              </li>
            ))}
          </ul>
        </Cartao>
      )}

      {estado.pedidos.length > 0 && (
        <Cartao titulo="Seus pedidos">
          <ul className="flex flex-col gap-1.5">
            {estado.pedidos.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{g.nome} <span className="text-[11px]" style={{ color: colors.text.secondary }}>· esperando resposta</span></span>
                <Botao perigo disabled={ocupado} onClick={() => void agir('cancelarPedido', { guildaId: g.id })}>Cancelar</Botao>
              </li>
            ))}
          </ul>
        </Cartao>
      )}

      <Cartao titulo="Procurar guildas">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setAberta(null);
            void procurar(busca);
          }}
        >
          <input value={busca} onChange={(e) => setBusca(e.target.value)} maxLength={24} placeholder="Começo do nome (vazio = as maiores)" aria-label="Nome da guilda" className={campo} style={{ borderColor: OURO }} />
          <button type="submit" className="rounded-sm border-2 px-3 text-sm font-bold" style={{ borderColor: OURO, backgroundColor: '#3A2F18' }}>Buscar</button>
        </form>
        {erroDaLista && <p role="alert" className="text-sm" style={{ color: VERMELHO }}>{erroDaLista}</p>}
        {lista && lista.length === 0 && <p className="text-sm" style={{ color: colors.text.secondary }}>Nenhuma guilda encontrada.</p>}
        {lista && lista.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {lista.map((g) => (
              <li key={g.id}>
                <button type="button" onClick={() => void abrir(g.id)} className="w-full text-left rounded-sm border px-2 py-1.5 flex flex-col" style={{ borderColor: BORDA }}>
                  <span className="font-bold">{g.nome}</span>
                  <span className="text-[11px]" style={{ color: colors.text.secondary }}>{nivelDaGuilda(g.xp, regras).nome} · Líder: {g.lider} · {g.quantidadeMembros}/{nivelDaGuilda(g.xp, regras).maxMembros} membros</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {aberta && (
          <section aria-label={`Guilda ${aberta.nome}`} className="rounded-sm border-2 p-2.5 flex flex-col gap-1.5" style={{ borderColor: OURO }}>
            <h3 className="font-cinzel font-bold">{aberta.nome}</h3>
            {aberta.descricao && <p className="text-sm whitespace-pre-wrap" style={{ color: colors.text.secondary }}>{aberta.descricao}</p>}
            <p className="text-xs">{aberta.nivel.nome} · {aberta.quantidadeMembros}/{aberta.maxMembros} membros</p>
            <ul className="text-xs flex flex-col gap-0.5">
              {aberta.membros.map((m) => <li key={m.nome}>{m.nome} <span style={{ color: colors.text.secondary }}>· {NOME_DO_CARGO[m.cargo]}</span></li>)}
            </ul>
            {convidado(aberta.id) ? (
              <p className="text-xs font-semibold" style={{ color: VERDE }}>Essa guilda convidou você: aceite o convite acima.</p>
            ) : pedidoFeito(aberta.id) ? (
              <p className="text-xs font-semibold" style={{ color: colors.text.secondary }}>Pedido enviado, esperando resposta.</p>
            ) : (
              <div><Botao disabled={ocupado || aberta.quantidadeMembros >= aberta.maxMembros} onClick={() => void agir('pedir', { guildaId: aberta.id })}>{aberta.quantidadeMembros >= aberta.maxMembros ? 'Guilda cheia' : 'Pedir para entrar'}</Botao></div>
            )}
          </section>
        )}
      </Cartao>

      <Cartao titulo="Criar uma guilda">
        <p className="text-xs" style={{ color: colors.text.secondary }}>Precisa do nível {regras.nivelMinimo}{regras.custoOuro > 0 ? ` e custa ${regras.custoOuro} de ouro` : ''}. Você tem nível {eu.nivel} e {eu.ouro} de ouro.</p>
        <form
          className="flex flex-col gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await agir('criar', { nome, descricao })) {
              setNome('');
              setDescricao('');
            }
          }}
        >
          <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={NOME_MAXIMO_DA_GUILDA} placeholder="Nome da guilda" aria-label="Nome da nova guilda" className={campo} style={{ borderColor: OURO }} />
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={DESCRICAO_MAXIMA_DA_GUILDA} rows={2} placeholder="Descrição (opcional)" aria-label="Descrição da nova guilda" className="rounded-sm border-2 px-2 py-1 text-sm bg-transparent" style={{ borderColor: BORDA }} />
          <button type="submit" disabled={ocupado || faltaNivel || faltaOuro || nome.trim().length < 3} className="self-start rounded-sm border-2 px-3 py-1.5 text-sm font-bold disabled:opacity-50" style={{ borderColor: OURO, backgroundColor: '#3A2F18' }}>
            {faltaNivel ? `Precisa do nível ${regras.nivelMinimo}` : faltaOuro ? 'Ouro insuficiente' : 'Criar guilda'}
          </button>
        </form>
      </Cartao>
    </>
  );
}
