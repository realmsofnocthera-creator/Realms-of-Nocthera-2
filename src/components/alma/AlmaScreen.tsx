'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { bonusDasCartas } from '@/game/almas';
import {
  BONUS_DO_DESPERTAR_PERCENTUAL,
  CACOS_AO_DESTRUIR,
  CACOS_PARA_REFINAR,
  CATEGORIAS_DE_CARTA,
  CUSTO_DO_DESPERTAR,
  ESPACOS_POR_CATEGORIA,
  NIVEL_DA_ALMA,
  NIVEL_MAXIMO_DO_DESPERTAR,
  NOME_DA_CATEGORIA,
  podeDespertar,
  RARIDADES_DE_CARTA,
  textoDoEfeito,
  TIPO_DE_CARTA_MAP,
  type CartaItem,
  type CategoriaDeCarta,
} from '@/rules/almas';
import type { CharacterDocument } from '@/server/characterService';
import { NOCTHERA_THEME } from '@/theme/theme';
import { CartaDaAlma } from './CartaDaAlma';

type Token = () => Promise<string | null>;
const OURO = '#C8A656';
const VERMELHO = '#E5484D';
const VERDE = '#7BC47F';

function Botao({ children, onClick, disabled, perigo }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; perigo?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="rounded-sm border px-2 py-1 text-[11px] font-bold disabled:opacity-50" style={{ borderColor: perigo ? VERMELHO : OURO, backgroundColor: '#3A2F18', color: perigo ? VERMELHO : '#F5E3B3' }}>
      {children}
    </button>
  );
}

/** Aba Alma da ficha (7.8): 9 espaços (3 de Alma, 3 de Corpo, 3 de Mente), o inventário de cartas, despertar, refinamento e destruição. */
export function AlmaScreen({ personagem, tokenFresco }: { personagem: CharacterDocument; tokenFresco: Token }) {
  const { colors } = NOCTHERA_THEME;
  const [char, setChar] = useState(personagem);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [filtro, setFiltro] = useState<CategoriaDeCarta | 'todas'>('todas');
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const [refinando, setRefinando] = useState<string | null>(null);

  const itens = char.cartasItens ?? [];
  const equipadas = char.cartasEquipadas ?? [];
  const poeira = char.poeiraDeAlma ?? 0;
  const cacos = char.cacosDeAlma ?? 0;
  const bonus = useMemo(() => bonusDasCartas(itens, equipadas, char.cartasDescobertas ?? [], char.nivel), [itens, equipadas, char.cartasDescobertas, char.nivel]);

  const agir = async (acao: string, extra: Record<string, unknown> = {}) => {
    setOcupado(true);
    setAviso(null);
    try {
      const token = await tokenFresco();
      const res = await fetch('/api/almas', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` }, body: JSON.stringify({ acao, ...extra }) });
      const dados = (await res.json().catch(() => ({}))) as { character?: CharacterDocument; mensagem?: string; error?: string };
      if (!res.ok || !dados.character) {
        setAviso({ texto: dados.error ?? 'Não foi possível agora. Tente de novo.', erro: true });
        return;
      }
      setChar(dados.character);
      setMarcadas([]);
      setRefinando(null);
      setAviso({ texto: dados.mensagem ?? 'Feito.', erro: false });
    } catch {
      setAviso({ texto: 'Sem conexão. Tente de novo.', erro: true });
    } finally {
      setOcupado(false);
    }
  };

  const bloqueada = char.nivel < NIVEL_DA_ALMA;
  const ordem = (c: CartaItem) => RARIDADES_DE_CARTA.indexOf(TIPO_DE_CARTA_MAP[c.tipo].raridade);
  const guardadas = itens.filter((c) => !equipadas.includes(c.id) && (filtro === 'todas' || TIPO_DE_CARTA_MAP[c.tipo].categoria === filtro)).sort((a, b) => ordem(b) - ordem(a) || a.tipo.localeCompare(b.tipo));

  const copiasDe = (c: CartaItem) => itens.filter((i) => i.tipo === c.tipo && i.id !== c.id && !equipadas.includes(i.id)).length;

  return (
    <main className="min-h-dvh w-full flex flex-col items-center px-2.5 sm:px-5 py-3 sm:py-6" style={{ backgroundColor: colors.background.primary, color: colors.text.primary }}>
      <div className="w-full max-w-[520px] flex flex-col gap-3">
        <header className="flex items-center gap-2">
          <Link href="/personagem" aria-label="Voltar à Ficha" className="p-1"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-2xl font-cinzel font-extrabold italic tracking-widest uppercase" style={{ color: '#F5E3B3' }}>Alma</h1>
          <Link href="/colecao" className="ml-auto text-xs underline" style={{ color: colors.text.secondary }}>Coleção</Link>
        </header>
        {aviso && <p role={aviso.erro ? 'alert' : 'status'} className="text-sm font-semibold" style={{ color: aviso.erro ? VERMELHO : VERDE }}>{aviso.texto}</p>}

        {bloqueada ? (
          <section className="rounded-sm border-2 p-3" style={{ borderColor: OURO, backgroundColor: colors.background.secondary }}>
            <p className="text-sm">A Alma abre no nível {NIVEL_DA_ALMA}. Você está no nível {char.nivel}.</p>
          </section>
        ) : (
          <>
            <p className="text-xs flex gap-4" style={{ color: colors.text.secondary }}>
              <span>Poeira de alma: <strong style={{ color: '#F5E3B3' }}>{poeira}</strong></span>
              <span>Cacos de alma: <strong style={{ color: '#F5E3B3' }}>{cacos}</strong></span>
            </p>

            {CATEGORIAS_DE_CARTA.map((categoria) => {
              const nelas = equipadas.flatMap((id) => itens.find((i) => i.id === id) ?? []).filter((c) => TIPO_DE_CARTA_MAP[c.tipo].categoria === categoria);
              return (
                <section key={categoria} aria-label={`Espaços de ${NOME_DA_CATEGORIA[categoria]}`} className="rounded-sm border-2 p-2.5 flex flex-col gap-1.5" style={{ borderColor: OURO, backgroundColor: colors.background.secondary }}>
                  <h2 className="font-cinzel font-bold text-base">{NOME_DA_CATEGORIA[categoria]}</h2>
                  {Array.from({ length: ESPACOS_POR_CATEGORIA }, (_, i) => {
                    const carta = nelas[i];
                    return carta ? (
                      <CartaDaAlma key={carta.id} carta={carta} destaque>
                        <span><Botao disabled={ocupado} onClick={() => void agir('desequipar', { id: carta.id })}>Desequipar</Botao></span>
                      </CartaDaAlma>
                    ) : (
                      <div key={`vazio-${i}`} className="rounded-sm border-2 border-dashed px-2 py-3 text-xs" style={{ borderColor: '#4A3F2A', color: '#8d8574' }}>Espaço {i + 1} vazio</div>
                    );
                  })}
                </section>
              );
            })}

            <section aria-label="Bônus das cartas" className="rounded-sm border px-2.5 py-2 text-xs flex flex-col gap-0.5" style={{ borderColor: '#4A3F2A' }}>
              <strong>Bônus das cartas e da coleção</strong>
              {[
                ['atqFisico', bonus.atqFisico],
                ['atqMagico', bonus.atqMagico],
                ['defesa', bonus.defesa],
                ['hp', bonus.hp],
                ['agilidade', bonus.agilidade],
                ['chanceCritico', bonus.chanceCritico],
                ['chanceEfeitos', bonus.chanceEfeitos],
              ]
                .filter(([, v]) => (v as number) > 0)
                .map(([k, v]) => <span key={k as string}>{textoDoEfeito(k as never, v as number)}</span>)}
              {Object.entries(bonus.atributos).filter(([, v]) => v > 0).map(([k, v]) => <span key={k}>{textoDoEfeito(k as never, v)}</span>)}
              {equipadas.length === 0 && bonus.atqFisico === 0 && <span style={{ color: colors.text.secondary }}>Nenhum ainda.</span>}
            </section>

            <section aria-label="Suas cartas" className="flex flex-col gap-2">
              <h2 className="font-cinzel font-bold text-base">Suas cartas ({itens.length})</h2>
              <div className="flex flex-wrap gap-1.5">
                {(['todas', ...CATEGORIAS_DE_CARTA] as const).map((f) => (
                  <button key={f} type="button" onClick={() => setFiltro(f)} aria-pressed={filtro === f} className="rounded-sm border px-2 py-0.5 text-[11px] font-bold" style={{ borderColor: filtro === f ? OURO : '#4A3F2A', backgroundColor: filtro === f ? '#3A2F18' : 'transparent' }}>
                    {f === 'todas' ? 'Todas' : NOME_DA_CATEGORIA[f]}
                  </button>
                ))}
              </div>
              {marcadas.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <Botao perigo disabled={ocupado} onClick={() => window.confirm(`Destruir ${marcadas.length} carta(s)? Você ganha cacos de alma e não dá para desfazer.`) && void agir('destruir', { ids: marcadas })}>
                    Destruir {marcadas.length} selecionada(s)
                  </Botao>
                  <span style={{ color: colors.text.secondary }}>+{marcadas.reduce((s, id) => s + CACOS_AO_DESTRUIR[TIPO_DE_CARTA_MAP[itens.find((i) => i.id === id)!.tipo].raridade], 0)} cacos</span>
                </div>
              )}
              {guardadas.length === 0 ? (
                <p className="text-xs" style={{ color: colors.text.secondary }}>Nenhuma carta guardada. As cartas vêm do Teste de Equipe, das Incursões e do Chefe de guildas.</p>
              ) : (
                guardadas.map((c) => {
                  const tipo = TIPO_DE_CARTA_MAP[c.tipo];
                  const custo = CUSTO_DO_DESPERTAR[c.despertar];
                  return (
                    <CartaDaAlma key={c.id} carta={c}>
                      <span className="flex flex-wrap items-center gap-1.5 mt-1">
                        <label className="flex items-center gap-1 text-[11px]"><input type="checkbox" checked={marcadas.includes(c.id)} onChange={(e) => setMarcadas(e.target.checked ? [...marcadas, c.id] : marcadas.filter((x) => x !== c.id))} aria-label={`Marcar ${tipo.nome} para destruir`} /> destruir</label>
                        <Botao disabled={ocupado} onClick={() => void agir('equipar', { id: c.id })}>Equipar</Botao>
                        <Botao disabled={ocupado} onClick={() => setRefinando(refinando === c.id ? null : c.id)}>Refinar</Botao>
                        {podeDespertar(tipo.raridade) && c.despertar < NIVEL_MAXIMO_DO_DESPERTAR && (
                          <Botao disabled={ocupado} onClick={() => void agir('despertar', { id: c.id })}>Despertar ({custo.copias} cópias, {custo.poeira} poeira · +{BONUS_DO_DESPERTAR_PERCENTUAL[c.despertar + 1]}%)</Botao>
                        )}
                      </span>
                      {podeDespertar(tipo.raridade) && c.despertar < NIVEL_MAXIMO_DO_DESPERTAR && <span className="text-[10px]" style={{ color: '#8d8574' }}>Cópias disponíveis: {copiasDe(c)}</span>}
                      {refinando === c.id && (
                        <span className="flex flex-col gap-1 mt-1">
                          <span className="text-[11px]" style={{ color: colors.text.secondary }}>Escolha qual efeito sortear de novo ({CACOS_PARA_REFINAR[tipo.raridade]} cacos):</span>
                          {c.efeitos.map((e, i) => (
                            <Botao key={i} disabled={ocupado || cacos < CACOS_PARA_REFINAR[tipo.raridade]} onClick={() => void agir('refinar', { id: c.id, indice: i })}>{textoDoEfeito(e.efeito, e.valor)}</Botao>
                          ))}
                        </span>
                      )}
                    </CartaDaAlma>
                  );
                })
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
