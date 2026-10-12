'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Check, Coins, Lock, Shield, Slice, Sword, WandSparkles, X } from 'lucide-react';
import type { CharacterDocument } from '@/server/characterService';
import type { ArmaPersonagem } from '@/game/forja';
import type { CategoriaArma } from '@/rules/armas';
import {
  ArvoreForja,
  CATEGORIAS_TELA,
  COR_RARIDADE_ARMA,
  DetalheArmaTela,
  EstadoNoForja,
  NoForja,
  arvoresDaForja,
  detalheDaArma,
  listaDeForja,
} from '@/lib/forjaTela';
import { NOCTHERA_THEME } from '@/theme/theme';

const OURO = '#C8A656';
const DESTAQUE = '#F3C769';

interface ForjaScreenProps {
  character: CharacterDocument;
  onCharacterChange: (c: CharacterDocument) => void;
  tokenFresco: () => Promise<string | null>;
}

interface RespostaForjaTela {
  character: CharacterDocument;
  arma: ArmaPersonagem;
}

type Aba = 'arvore' | 'lista';

function Lanca({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      <path d="M4 20 17 7" />
      <path d="M14 4h6v6l-3-1-2-2z" />
    </svg>
  );
}

/** Ícone da categoria (a arte das armas entra depois). */
function IconeCategoria({ categoria, className, style }: { categoria: CategoriaArma; className?: string; style?: React.CSSProperties }) {
  const props = { className, style, 'aria-hidden': true as const };
  switch (categoria) {
    case 'espadaGrande': return <Sword {...props} />;
    case 'katana': return <Slice {...props} />;
    case 'lanca': return <Lanca className={className} style={style} />;
    case 'espadaEscudo': return <Shield {...props} />;
    case 'grimorio': return <BookOpen {...props} />;
    case 'cajado': return <WandSparkles {...props} />;
  }
}

const ROTULO_ESTADO: Readonly<Record<EstadoNoForja, string>> = {
  tenho: 'Você tem esta arma',
  superada: 'Você já evoluiu além desta arma',
  disponivel: 'Pronta para forjar',
  faltaMaterial: 'Falta material ou ouro',
  bloqueada: 'Falta a arma anterior da árvore',
};

const estrelas = (n: number) => '★'.repeat(n);

/**
 * Forja (estilo Smithy do Monster Hunter, na vertical): uma árvore de armas por monstro, com as armas ligadas em
 * linha e o ramo de cada subespécie logo abaixo. Toda regra (receita, ouro, sorteio) é conferida no servidor.
 */
export function ForjaScreen({ character, onCharacterChange, tokenFresco }: ForjaScreenProps) {
  const { colors } = NOCTHERA_THEME;
  const [aba, setAba] = useState<Aba>('arvore');
  const [categoria, setCategoria] = useState<CategoriaArma>('espadaGrande');
  const [estrela, setEstrela] = useState(1);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const arvores = useMemo(() => arvoresDaForja(categoria, character), [categoria, character]);
  const lista = useMemo(() => listaDeForja(categoria, character), [categoria, character]);
  const detalhe = selecionada ? detalheDaArma(selecionada, categoria, character) : null;
  const estrelasComArvore = [...new Set(arvores.map((a) => a.estrela))];

  const abrir = (baseId: string) => {
    setErro(null);
    setSelecionada(baseId);
  };

  const forjar = async (d: DetalheArmaTela) => {
    if (ocupado) return;
    setOcupado(true);
    setErro(null);
    try {
      const token = await tokenFresco();
      if (!token) throw new Error('Sessão expirada. Faça login de novo.');
      const res = await fetch('/api/forja/fabricar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ baseId: d.baseId, categoria, armaAnteriorId: d.armaAnteriorId ?? undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível forjar a arma.');
      const r = data as RespostaForjaTela;
      onCharacterChange(r.character);
      setAviso(`${d.nome} forjada! ${rotuloAtributo(r.arma)}`);
      setSelecionada(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao forjar a arma.');
    } finally {
      setOcupado(false);
    }
  };

  return (
    <main className="min-h-dvh w-full flex flex-col items-center px-2.5 py-3 select-none" style={{ backgroundColor: colors.background.primary, backgroundImage: 'radial-gradient(ellipse at top, rgba(48,28,14,0.92) 0%, rgba(13,13,13,1) 75%)', color: colors.text.primary }}>
      <div className="w-full max-w-[480px] flex flex-col gap-2.5 pb-4">
        <header className="flex items-center justify-between">
          <Link href="/ferreiro" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-cinzel font-bold uppercase" style={{ backgroundColor: colors.background.secondary, borderColor: OURO, color: '#E6C775' }}>
            <ArrowLeft className="w-4 h-4" /> Ferreiro
          </Link>
          <span className="inline-flex items-center gap-1 text-xs font-cinzel font-bold" style={{ color: '#E6C775' }} aria-label={`Ouro: ${character.ouro}`}>
            <Coins className="w-3.5 h-3.5" /> {character.ouro.toLocaleString('pt-BR')}
          </span>
        </header>

        <div className="flex flex-col items-center">
          <span className="text-[10px] font-cinzel tracking-widest uppercase" style={{ color: colors.text.secondary }}>Ferreiro › Fabricar equipamentos</span>
          <h1 className="text-2xl font-cinzel font-extrabold tracking-widest uppercase" style={{ color: '#F5E3B3' }}>Forja</h1>
        </div>

        <nav aria-label="Abas da Forja" className="grid grid-cols-2 rounded-sm border-2 overflow-hidden" style={{ borderColor: OURO }}>
          {([['arvore', 'Árvore de armas'], ['lista', `Lista de forja (${lista.length})`]] as const).map(([id, nome]) => (
            <button key={id} type="button" aria-pressed={aba === id} onClick={() => setAba(id)} className="py-1.5 text-xs font-cinzel font-bold uppercase cursor-pointer" style={{ backgroundColor: aba === id ? OURO : colors.background.secondary, color: aba === id ? colors.background.primary : '#E6C775' }}>
              {nome}
            </button>
          ))}
        </nav>

        <div role="group" aria-label="Categoria da arma" className="flex gap-1.5 overflow-x-auto pb-1 -mx-0.5 px-0.5">
          {CATEGORIAS_TELA.map((c) => (
            <button key={c.id} type="button" aria-pressed={categoria === c.id} onClick={() => { setCategoria(c.id); setSelecionada(null); }} className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-sm border text-[11px] font-semibold cursor-pointer" style={{ backgroundColor: categoria === c.id ? `${OURO}33` : colors.background.secondary, borderColor: categoria === c.id ? DESTAQUE : `${colors.border.default}99`, color: categoria === c.id ? '#F5E3B3' : colors.text.secondary }}>
              <IconeCategoria categoria={c.id} className="w-3.5 h-3.5" />
              {c.nome}
            </button>
          ))}
        </div>

        {aviso && (
          <div role="status" className="flex items-start justify-between gap-2 rounded px-2 py-1.5 text-xs font-semibold" style={{ backgroundColor: '#1E3A24', color: '#BFEFC6' }}>
            <span>{aviso}</span>
            <button type="button" aria-label="Fechar aviso" onClick={() => setAviso(null)} className="cursor-pointer"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {aba === 'arvore' ? (
          <>
            <div role="group" aria-label="Estrela do monstro" className="flex gap-1 overflow-x-auto pb-1">
              {estrelasComArvore.map((e) => (
                <button key={e} type="button" aria-pressed={estrela === e} onClick={() => setEstrela(e)} className="shrink-0 px-2 py-1 rounded-sm border text-[11px] font-cinzel font-bold cursor-pointer" style={{ backgroundColor: estrela === e ? `${OURO}33` : colors.background.secondary, borderColor: estrela === e ? DESTAQUE : `${colors.border.default}99`, color: estrela === e ? '#F5E3B3' : colors.text.secondary }}>
                  {e}★
                </button>
              ))}
            </div>
            <section aria-label="Árvores de armas" className="flex flex-col gap-2">
              {arvores.filter((a) => a.estrela === estrela).map((a) => (
                <ArvoreMonstro key={a.monstroId} arvore={a} categoria={categoria} selecionada={selecionada} onAbrir={abrir} />
              ))}
            </section>
          </>
        ) : (
          <section aria-label="Lista de forja" className="flex flex-col gap-1.5">
            {lista.length === 0 ? (
              <div className="rounded-sm border-2 p-5 text-center text-sm" style={{ backgroundColor: colors.background.secondary, borderColor: `${colors.border.default}99`, color: colors.text.secondary }}>
                Nenhuma arma pronta para forjar agora. Cace monstros para juntar materiais.
              </div>
            ) : (
              lista.map((i) => (
                <button key={i.baseId} type="button" onClick={() => abrir(i.baseId)} className="flex items-center gap-2.5 rounded-sm border-2 px-2.5 py-2 text-left cursor-pointer" style={{ backgroundColor: colors.background.secondary, borderColor: `${COR_RARIDADE_ARMA[i.raridade]}99` }}>
                  <IconeCategoria categoria={categoria} className="w-6 h-6 shrink-0" style={{ color: COR_RARIDADE_ARMA[i.raridade] }} />
                  <span className="flex flex-col">
                    <span className="text-[13px] font-semibold" style={{ color: COR_RARIDADE_ARMA[i.raridade] }}>{i.nome}</span>
                    <span className="text-[10px]" style={{ color: colors.text.secondary }}>{i.raridadeNome} · {estrelas(i.estrela)} {i.monstroNome}</span>
                  </span>
                </button>
              ))
            )}
          </section>
        )}
      </div>

      {detalhe && <FolhaDetalhe detalhe={detalhe} categoria={categoria} ocupado={ocupado} erro={erro} onFechar={() => setSelecionada(null)} onForjar={() => forjar(detalhe)} />}
    </main>
  );
}

function rotuloAtributo(arma: ArmaPersonagem): string {
  const nomes: Record<string, string> = { vigor: 'Vigor', sorte: 'Sorte', forca: 'Força', vitalidade: 'Vitalidade', arcano: 'Arcano', inteligencia: 'Inteligência', agilidade: 'Agilidade' };
  return `${nomes[arma.atributo] ?? arma.atributo} +${arma.pontos}.`;
}

function ArvoreMonstro({ arvore, categoria, selecionada, onAbrir }: { arvore: ArvoreForja; categoria: CategoriaArma; selecionada: string | null; onAbrir: (id: string) => void }) {
  const { colors } = NOCTHERA_THEME;
  return (
    <article aria-label={`Árvore de ${arvore.nome}`} className="rounded-sm border-2 px-2.5 py-2 flex flex-col gap-1.5" style={{ backgroundColor: colors.background.secondary, borderColor: `${OURO}88` }}>
      <h2 className="text-[13px] font-cinzel font-bold" style={{ color: '#F5E3B3' }}>
        <span style={{ color: OURO }}>{estrelas(arvore.estrela)}</span> {arvore.nome}
      </h2>
      {arvore.ramos.map((ramo, i) => (
        <div key={ramo.id} className={i === 0 ? '' : 'ml-3 pl-2 border-l-2'} style={i === 0 ? undefined : { borderColor: `${OURO}66` }}>
          {ramo.nome && <span className="block text-[10px] mb-1" style={{ color: colors.text.secondary }}>{ramo.nome}</span>}
          <div className="flex items-center">
            {ramo.nos.map((no, j) => (
              <React.Fragment key={no.baseId}>
                {j > 0 && <span aria-hidden="true" className="w-3 h-0.5" style={{ backgroundColor: `${OURO}88` }} />}
                <No no={no} categoria={categoria} aberto={selecionada === no.baseId} onAbrir={onAbrir} />
              </React.Fragment>
            ))}
          </div>
        </div>
      ))}
    </article>
  );
}

function No({ no, categoria, aberto, onAbrir }: { no: NoForja; categoria: CategoriaArma; aberto: boolean; onAbrir: (id: string) => void }) {
  const { colors } = NOCTHERA_THEME;
  const cor = COR_RARIDADE_ARMA[no.raridade];
  const apagado = no.estado === 'bloqueada' || no.estado === 'superada';
  return (
    <button
      type="button"
      aria-label={`${no.nome}, ${no.raridadeNome}. ${ROTULO_ESTADO[no.estado]}`}
      onClick={() => onAbrir(no.baseId)}
      className="relative w-[52px] h-[52px] shrink-0 rounded-sm border-2 flex items-center justify-center cursor-pointer"
      style={{
        backgroundColor: colors.background.primary,
        borderColor: aberto || no.estado === 'disponivel' ? DESTAQUE : `${cor}99`,
        boxShadow: no.estado === 'disponivel' || aberto ? `0 0 0 2px ${DESTAQUE}55, 0 0 10px ${DESTAQUE}66` : undefined,
        opacity: apagado ? 0.55 : 1,
      }}
    >
      <IconeCategoria categoria={categoria} className="w-7 h-7" style={{ color: cor }} />
      {no.estado === 'bloqueada' && <Lock className="absolute -top-1.5 -right-1.5 w-4 h-4 p-0.5 rounded-full" style={{ backgroundColor: OURO, color: colors.background.primary }} />}
      {(no.estado === 'tenho' || no.estado === 'superada') && <Check className="absolute -top-1.5 -right-1.5 w-4 h-4 p-0.5 rounded-full" style={{ backgroundColor: no.estado === 'tenho' ? '#5FCB6A' : '#7A7A7A', color: colors.background.primary }} />}
      {no.estado === 'faltaMaterial' && <span aria-hidden="true" className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#C25B4F' }} />}
    </button>
  );
}

function Linha({ rotulo, valor, cor }: { rotulo: string; valor: React.ReactNode; cor?: string }) {
  return (
    <div className="flex justify-between gap-3 text-[12px]">
      <span style={{ color: NOCTHERA_THEME.colors.text.secondary }}>{rotulo}</span>
      <span className="text-right font-semibold" style={{ color: cor }}>{valor}</span>
    </div>
  );
}

function FolhaDetalhe({ detalhe: d, categoria, ocupado, erro, onFechar, onForjar }: { detalhe: DetalheArmaTela; categoria: CategoriaArma; ocupado: boolean; erro: string | null; onFechar: () => void; onForjar: () => void }) {
  const { colors } = NOCTHERA_THEME;
  const podeForjar = d.estado === 'disponivel';
  const receita = [...d.materiais, ...(d.diversos ? [d.diversos] : [])];
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={`Detalhes de ${d.nome}`}>
      <button type="button" aria-label="Fechar detalhes" onClick={onFechar} className="absolute inset-0 cursor-default" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} />
      <div className="relative w-full max-w-[480px] max-h-[85dvh] overflow-y-auto rounded-t-md border-2 border-b-0 px-3.5 pt-3 pb-4 flex flex-col gap-2.5" style={{ backgroundColor: colors.background.secondary, borderColor: d.cor }}>
        <div className="flex items-start gap-3">
          <span className="w-14 h-14 shrink-0 rounded-sm border-2 flex items-center justify-center" style={{ borderColor: d.cor, backgroundColor: colors.background.primary }}>
            <IconeCategoria categoria={categoria} className="w-8 h-8" style={{ color: d.cor }} />
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="text-[16px] font-cinzel font-extrabold leading-tight" style={{ color: d.cor }}>{d.nome}</h2>
            <p className="text-[11px]" style={{ color: colors.text.secondary }}>
              {d.raridadeNome} · {d.categoriaNome} · {estrelas(d.estrela)} {d.monstroNome}{d.ramoNome ? ` › ${d.ramoNome}` : ''}
            </p>
            <p className="text-[11px] font-semibold" style={{ color: d.estado === 'disponivel' ? '#BFEFC6' : colors.text.secondary }}>{ROTULO_ESTADO[d.estado]}</p>
          </div>
          <button type="button" aria-label="Fechar" onClick={onFechar} className="cursor-pointer"><X className="w-5 h-5" style={{ color: colors.text.secondary }} /></button>
        </div>

        <div className="rounded-sm border p-2 flex flex-col gap-1" style={{ borderColor: `${colors.border.default}99` }}>
          <Linha rotulo={d.tipoDano + (d.subtipo ? ` (${d.subtipo})` : '')} valor={d.danoFixo} cor="#F5E3B3" />
          <Linha rotulo="Atributo sorteado" valor={d.atributoSorteado} />
          {d.minha && <Linha rotulo="Sua arma" valor={`${d.minha.atributo} +${d.minha.pontos} · ${d.minha.reforjas} reforja(s)`} cor="#BFEFC6" />}
          {d.elementos.length > 0 && <Linha rotulo="Elemento" valor={d.elementos.join(' + ')} />}
          {d.status.length > 0 && <Linha rotulo="Status" valor={d.status.join(', ')} />}
          <Linha rotulo="Bônus da categoria" valor={d.bonus} cor="#5FCB6A" />
          <Linha rotulo="Penalidade" valor={d.penalidade} cor="#E5736B" />
        </div>

        {d.estado !== 'tenho' && d.estado !== 'superada' && (
          <div className="flex flex-col gap-1">
            <h3 className="text-[11px] font-cinzel font-bold uppercase tracking-wider" style={{ color: OURO }}>Receita</h3>
            {d.consome && <Linha rotulo="Consome a arma" valor={`${d.consome.nome} ${d.consome.tenho ? '✓' : '✗'}`} cor={d.consome.tenho ? '#BFEFC6' : '#E5736B'} />}
            {receita.map((m) => (
              <Linha key={m.id} rotulo={m.nome} cor={m.ok ? '#BFEFC6' : '#E5736B'} valor={`${m.tem}/${m.precisa}`} />
            ))}
            <Linha rotulo="Ouro" cor={d.ouro.ok ? '#BFEFC6' : '#E5736B'} valor={`${d.ouro.tem.toLocaleString('pt-BR')}/${d.ouro.precisa.toLocaleString('pt-BR')}`} />
          </div>
        )}

        {erro && <div role="alert" className="rounded px-2 py-1.5 text-xs font-semibold" style={{ backgroundColor: colors.status.danger, color: colors.text.primary }}>{erro}</div>}

        {d.estado !== 'tenho' && d.estado !== 'superada' && (
          <button type="button" disabled={!podeForjar || ocupado} onClick={onForjar} className="w-full py-2.5 rounded-sm border-2 font-cinzel font-extrabold uppercase tracking-wider text-sm enabled:cursor-pointer disabled:cursor-not-allowed" style={{ backgroundColor: podeForjar ? OURO : colors.background.primary, borderColor: podeForjar ? DESTAQUE : `${colors.border.default}99`, color: podeForjar ? colors.background.primary : colors.text.secondary }}>
            {ocupado ? 'Forjando...' : d.estado === 'bloqueada' ? 'Falta a arma anterior' : d.estado === 'faltaMaterial' ? 'Falta material ou ouro' : d.acao}
          </button>
        )}
      </div>
    </div>
  );
}
