'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check } from 'lucide-react';
import {
  CATEGORIAS_DE_CONQUISTA,
  DEGRAUS,
  NOME_DA_CATEGORIA,
  NOME_DA_RARIDADE_DE_CONQUISTA,
  RARIDADE_DO_DEGRAU,
  type CategoriaDeConquista,
  type RecompensaDeConquista,
} from '@/rules/conquistas';
import { formatarCompacto, formatarTotal } from '@/rules/numerosCompactos';
import type { ConquistaNaTela, EstadoDasConquistas } from '@/server/conquistas';
import { HUD_ICONS } from '@/assets/hud';
import { AREAS_DA_MESA, ICONES_DAS_CATEGORIAS, MESA_DAS_CONQUISTAS, PROPORCAO_DA_MESA, TROFEUS } from '@/assets/conquistas';
import { NOCTHERA_THEME } from '@/theme/theme';

type Token = () => Promise<string | null>;
const VERMELHO = '#E5484D';
const VERDE = '#7BC47F';
/** O que a tela mostra: a mesa, uma categoria ou os títulos. */
type Vista = 'mesa' | 'titulos' | CategoriaDeConquista;

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

const SOMBRA_DO_TEXTO = '[text-shadow:1px_1px_0_#1A120B]';

function Botao({ children, onClick, disabled, cinza }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; cinza?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`botao-kit ${cinza ? 'botao-kit-cinza text-[#2B2118]' : 'botao-kit-dourado text-[#2B1D0E]'} px-1.5 font-cinzel font-bold uppercase text-[10px] leading-tight`}
    >
      {children}
    </button>
  );
}

/** Estrela em CSS (clip-path): cheia, pronta para resgatar (brilha) ou vazia. */
function Estrela({ estado }: { estado: 'cheia' | 'pronta' | 'vazia' }) {
  const cor = estado === 'cheia' ? '#F2C94C' : estado === 'pronta' ? '#FFE9A0' : '#3A2F22';
  return (
    <span
      aria-hidden="true"
      className={`inline-block w-3.5 h-3.5 ${estado === 'pronta' ? 'animate-pulse motion-reduce:animate-none' : ''}`}
      style={{ background: cor, clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }}
    />
  );
}

/** As recompensas do degrau em ícones: Diamantes com o ícone do jogo e o resto em plaquinhas (os ícones deles virão depois). */
function Recompensas({ r }: { r: RecompensaDeConquista }) {
  const selos = Object.values(r.selos).reduce((t, q) => t + (q ?? 0), 0);
  return (
    <span className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
      {r.diamantes > 0 && (
        <span className="inline-flex items-center gap-0.5 font-[family-name:var(--font-silk)] text-[11px] text-[#F5F3E0]" title="Diamantes">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={HUD_ICONS.diamante} alt="" aria-hidden="true" className="w-4 h-4 object-contain" style={{ imageRendering: 'pixelated' }} />
          {r.diamantes}
        </span>
      )}
      {selos > 0 && <span className="font-[family-name:var(--font-silk)] text-[10px] px-1 border border-[#B2A66C] text-[#E2D6B6]">{selos} {selos === 1 ? 'selo' : 'selos'}</span>}
      {r.avancosDeExpedicao > 0 && <span className="font-[family-name:var(--font-silk)] text-[10px] px-1 border border-[#B2A66C] text-[#E2D6B6]">{r.avancosDeExpedicao} {r.avancosDeExpedicao === 1 ? 'avanço' : 'avanços'}</span>}
      {r.titulo && <span className="font-[family-name:var(--font-silk)] text-[10px] px-1 border border-[#ED8A0C] text-[#ED8A0C]">Título</span>}
    </span>
  );
}

function LinhaDaConquista({ c, ocupado, resgatar }: { c: ConquistaNaTela; ocupado: boolean; resgatar: (id: string) => void }) {
  const completa = c.proximaMeta === null;
  const degrauAtual = Math.min(c.resgatados, DEGRAUS - 1);
  const raridade = RARIDADE_DO_DEGRAU[degrauAtual];
  const largura = completa ? 100 : Math.min(100, (c.progresso / c.proximaMeta!) * 100);
  return (
    <li className={`caixa-pixel relative flex gap-2 p-2 ${c.prontos ? '' : 'opacity-95'}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={TROFEUS[raridade]} alt={`Troféu de ${NOME_DA_RARIDADE_DE_CONQUISTA[raridade]}`} className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 object-contain" style={{ imageRendering: 'pixelated' }} />
      <div className="min-w-0 flex-1 flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <span className={`font-cinzel font-bold text-sm text-[#F5E3B3] ${SOMBRA_DO_TEXTO}`}>{c.nome}</span>
          {!completa && c.recompensa && <Recompensas r={c.recompensa} />}
        </div>
        <div className="flex items-center gap-1" aria-label={`${c.resgatados} de ${DEGRAUS} estrelas resgatadas`}>
          {Array.from({ length: DEGRAUS }, (_, i) => (
            <Estrela key={i} estado={i < c.resgatados ? 'cheia' : i < c.resgatados + c.prontos ? 'pronta' : 'vazia'} />
          ))}
          <span className="ml-1 font-[family-name:var(--font-silk)] text-[10px] text-[#B2A66C]">{NOME_DA_RARIDADE_DE_CONQUISTA[raridade]}</span>
        </div>
        {completa ? (
          <p className="text-xs flex items-center gap-1" style={{ color: VERDE }}>
            <Check className="w-3.5 h-3.5" /> Completa ({formatarCompacto(c.progresso)})
          </p>
        ) : (
          <>
            <p className="text-xs text-[#E2D6B6] leading-snug">{c.textoDaMeta}</p>
            <div className="flex items-center gap-2">
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={c.proximaMeta!}
                aria-valuenow={Math.min(c.progresso, c.proximaMeta!)}
                aria-label={`Progresso de ${c.nome}`}
                title={`${formatarTotal(Math.min(c.progresso, c.proximaMeta!))}/${formatarTotal(c.proximaMeta!)}`}
                className="barra-pixel h-2 flex-1 overflow-hidden"
              >
                <div className="h-full" style={{ width: `${largura}%`, backgroundColor: '#2EE6D6', boxShadow: 'inset 0 -2px 0 #1FA89C' }} />
              </div>
              <span className="font-[family-name:var(--font-silk)] text-[10px] text-[#E2D6B6] shrink-0 tabular-nums">
                {formatarCompacto(Math.min(c.progresso, c.proximaMeta!))}/{formatarCompacto(c.proximaMeta!)}
              </span>
            </div>
          </>
        )}
        {c.titulo && !completa && <p className="text-[10px] text-[#B2A66C]">No 5º degrau: título {c.titulo}.</p>}
        {c.prontos > 0 && (
          <div>
            <Botao disabled={ocupado} onClick={() => resgatar(c.id)}>
              Resgatar{c.prontos > 1 ? ` (${c.prontos} degraus)` : ''}
            </Botao>
          </div>
        )}
      </div>
    </li>
  );
}

/** Conquistas: a mesa com as 7 categorias, a lista de cada uma (5 estrelas por conquista, a raridade muda com o degrau) e os títulos. */
export function ConquistasScreen({ tokenFresco }: { tokenFresco: Token }) {
  const { colors } = NOCTHERA_THEME;
  const [estado, setEstado] = useState<EstadoDasConquistas | null>(null);
  const [erroAoCarregar, setErroAoCarregar] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [vista, setVista] = useState<Vista>('mesa');

  const carregar = useCallback(async () => {
    const r = await chamar(tokenFresco);
    if (r.ok) setEstado(r.dados as unknown as EstadoDasConquistas);
    else setErroAoCarregar(true);
  }, [tokenFresco]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Abrir uma categoria entra no histórico: o voltar do celular volta para a mesa em vez de sair da tela
  useEffect(() => {
    const aoVoltar = () => setVista((window.history.state?.vistaConquistas as Vista | undefined) ?? 'mesa');
    window.addEventListener('popstate', aoVoltar);
    return () => window.removeEventListener('popstate', aoVoltar);
  }, []);
  const abrir = (v: Vista) => {
    window.history.pushState({ vistaConquistas: v }, '');
    setVista(v);
    setAviso(null);
  };
  const voltarParaAMesa = () => {
    if (window.history.state?.vistaConquistas) window.history.back();
    else setVista('mesa');
  };

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

  const daCategoria = (cat: CategoriaDeConquista) => (estado ? estado.conquistas.filter((c) => c.categoria === cat) : []);
  const prontasDe = (cat: CategoriaDeConquista) => daCategoria(cat).reduce((t, c) => t + c.prontos, 0);
  const estrelasDe = (cat: CategoriaDeConquista) => {
    const l = daCategoria(cat);
    return { feitas: l.reduce((t, c) => t + c.resgatados, 0), total: l.length * DEGRAUS };
  };

  return (
    <main className="min-h-dvh w-full flex flex-col items-center px-2.5 sm:px-5 py-3 sm:py-6 select-none" style={{ backgroundColor: colors.background.primary, backgroundImage: 'radial-gradient(ellipse at top, rgba(32, 24, 18, 0.92) 0%, rgba(13, 13, 13, 1) 75%)', color: colors.text.primary }}>
      <div className="w-full max-w-[480px] flex flex-col gap-3">
        <header className="flex items-center gap-2">
          {vista === 'mesa' ? (
            <Link href="/menu" aria-label="Voltar ao Menu" className="caixa-pixel relative inline-flex items-center gap-1.5 pl-2 pr-3 py-1.5">
              <ArrowLeft className="w-4 h-4 text-[#F5E3B3]" aria-hidden="true" />
              <span className={`font-[family-name:var(--font-pixel)] text-[8px] leading-none uppercase text-[#F5E3B3] ${SOMBRA_DO_TEXTO}`}>Menu</span>
            </Link>
          ) : (
            <button type="button" onClick={voltarParaAMesa} aria-label="Voltar para a mesa" className="caixa-pixel relative inline-flex items-center gap-1.5 pl-2 pr-3 py-1.5 cursor-pointer">
              <ArrowLeft className="w-4 h-4 text-[#F5E3B3]" aria-hidden="true" />
              <span className={`font-[family-name:var(--font-pixel)] text-[8px] leading-none uppercase text-[#F5E3B3] ${SOMBRA_DO_TEXTO}`}>Mesa</span>
            </button>
          )}
          <h1 className={`text-xl sm:text-2xl font-cinzel font-extrabold italic tracking-widest uppercase text-[#F5E3B3] ${SOMBRA_DO_TEXTO}`}>
            {vista === 'mesa' ? 'Conquistas' : vista === 'titulos' ? 'Títulos' : NOME_DA_CATEGORIA[vista]}
          </h1>
        </header>
        {aviso && <p role={aviso.erro ? 'alert' : 'status'} className="text-sm font-semibold" style={{ color: aviso.erro ? VERMELHO : VERDE }}>{aviso.texto}</p>}
        {erroAoCarregar ? (
          <p role="alert" className="text-sm" style={{ color: VERMELHO }}>Não foi possível carregar agora. Tente de novo em instantes.</p>
        ) : !estado ? (
          <p className="text-sm" style={{ color: colors.text.secondary }}>Carregando...</p>
        ) : vista === 'mesa' ? (
          <>
            <p className="text-xs" style={{ color: colors.text.secondary }}>Toque num objeto da mesa. Cada conquista tem 5 estrelas, e a raridade sobe com elas: Bronze, Prata, Ouro e Diamante.</p>
            {estado.prontos > 1 && (
              <div>
                <Botao disabled={ocupado} onClick={() => void agir({ acao: 'resgatarTudo' })}>Resgatar tudo ({estado.prontos})</Botao>
              </div>
            )}
            <div className="relative w-full overflow-hidden border-2 border-[#1A120B] shadow-[0_0_0_2px_#B2A66C]" style={{ aspectRatio: PROPORCAO_DA_MESA }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={MESA_DAS_CONQUISTAS} alt="Mesa com um objeto para cada categoria de conquistas" className="absolute inset-0 w-full h-full object-cover pointer-events-none" style={{ imageRendering: 'pixelated' }} />
              {CATEGORIAS_DE_CONQUISTA.map((cat) => {
                const { feitas, total } = estrelasDe(cat);
                const prontas = prontasDe(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => abrir(cat)}
                    aria-label={`${NOME_DA_CATEGORIA[cat]}: ${feitas} de ${total} estrelas${prontas ? `, ${prontas} para resgatar` : ''}`}
                    className="absolute group cursor-pointer focus:outline-none"
                    style={AREAS_DA_MESA[cat]}
                  >
                    <span className="absolute inset-0 border-2 border-transparent group-hover:border-[#F2C94C]/80 group-focus-visible:border-[#F2C94C] group-active:bg-[#F2C94C]/20" />
                    <span className={`caixa-pixel absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 whitespace-nowrap px-1.5 py-1 font-[family-name:var(--font-pixel)] text-[6px] sm:text-[8px] leading-none uppercase text-[#F5E3B3] ${SOMBRA_DO_TEXTO}`}>
                      {NOME_DA_CATEGORIA[cat]}
                    </span>
                    {prontas > 0 && (
                      <span className="absolute -top-2 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-[#ED8A0C] text-[#1A120B] font-[family-name:var(--font-silk)] font-bold text-[10px] shadow-[0_0_0_2px_#1A120B] animate-pulse motion-reduce:animate-none">{prontas}</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div>
              <Botao cinza onClick={() => abrir('titulos')}>Títulos ({estado.titulos.length})</Botao>
            </div>
          </>
        ) : vista === 'titulos' ? (
          <section aria-label="Seus títulos" className="flex flex-col gap-2">
            {estado.titulos.length === 0 ? (
              <p className="text-sm" style={{ color: colors.text.secondary }}>Nenhum título ainda. Eles vêm do último degrau de algumas conquistas, do ranking e dos eventos.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {estado.titulos.map((t) => {
                  const emUso = estado.tituloId === t.id;
                  return (
                    <li key={t.id} className={`caixa-pixel relative p-2 flex items-center justify-between gap-2 ${emUso ? '' : 'opacity-95'}`}>
                      <span className="flex flex-col">
                        <span className={`font-cinzel font-bold text-sm text-[#F5E3B3] ${SOMBRA_DO_TEXTO}`}>{t.nome}</span>
                        <span className="text-[10px] text-[#B2A66C]">{t.origem}</span>
                      </span>
                      {emUso ? (
                        <Botao cinza disabled={ocupado} onClick={() => void agir({ acao: 'titulo', titulo: '' })}>Tirar do perfil</Botao>
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
          <>
            {/* Troca de categoria: as miniaturas dos objetos da mesa */}
            <div role="tablist" aria-label="Categorias" className="grid grid-cols-7 gap-1">
              {CATEGORIAS_DE_CONQUISTA.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={vista === cat}
                  aria-label={NOME_DA_CATEGORIA[cat]}
                  title={NOME_DA_CATEGORIA[cat]}
                  onClick={() => (vista === cat ? undefined : abrir(cat))}
                  className={`relative aspect-square overflow-hidden border-2 cursor-pointer ${vista === cat ? 'border-[#F2C94C]' : 'border-[#1A120B] opacity-70'}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ICONES_DAS_CATEGORIAS[cat]} alt="" aria-hidden="true" className="w-full h-full object-cover" style={{ imageRendering: 'pixelated' }} />
                  {prontasDe(cat) > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#ED8A0C] shadow-[0_0_0_1px_#1A120B]" />}
                </button>
              ))}
            </div>
            <p className="font-[family-name:var(--font-silk)] text-[11px] text-[#B2A66C]">
              {estrelasDe(vista).feitas}/{estrelasDe(vista).total} estrelas
            </p>
            {daCategoria(vista).length === 0 ? (
              <p className="text-sm" style={{ color: colors.text.secondary }}>As conquistas desta categoria chegam nas próximas atualizações.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {daCategoria(vista).map((c) => (
                  <LinhaDaConquista key={c.id} c={c} ocupado={ocupado} resgatar={(id) => void agir({ acao: 'resgatar', id })} />
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </main>
  );
}
