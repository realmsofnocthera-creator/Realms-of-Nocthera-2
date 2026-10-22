'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { atributosDosColecionaveis } from '@/game/colecionaveis';
import { ATTRIBUTES } from '@/rules/attributes';
import { ATTRIBUTE_DISPLAY_NAMES } from '@/rules/attributeInfo';
import {
  CATEGORIAS_DE_COLECIONAVEL,
  COLECIONAVEIS,
  custoDaEstrela,
  custoDoReforco,
  DESCRICAO_DA_CATEGORIA_DE_COLECIONAVEL,
  ESTRELAS_MAXIMAS,
  estaAtivo,
  FRAGMENTOS_PARA_ATIVAR,
  NOME_DA_CATEGORIA_DE_COLECIONAVEL,
  NOME_DA_RARIDADE_DE_COLECIONAVEL,
  nivelMaximoDoReforco,
  RARIDADES_DE_COLECIONAVEL,
  proximaEstrelaQueSobe,
  proximoNivelQueSobe,
  valorDoColecionavel,
  type CategoriaDeColecionavel,
  type Colecionavel,
} from '@/rules/colecionaveis';
import { EMBLEMA_RARIDADE_MAP } from '@/rules/emblemas';
import { NOCTHERA_THEME } from '@/theme/theme';
import { chamarColecionaveis, type EstadoDosColecionaveis, type Token } from './api';

const OURO = '#C8A656';
const VERMELHO = '#E5484D';
const VERDE = '#7BC47F';

function Botao({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="rounded-sm border px-2 py-1 text-xs font-bold disabled:opacity-50" style={{ borderColor: OURO, backgroundColor: '#3A2F18', color: '#F5E3B3' }}>
      {children}
    </button>
  );
}

const estrelasEmTexto = (n: number) => '★'.repeat(n) + '☆'.repeat(ESTRELAS_MAXIMAS - n);

/** Custo de reforçar `niveis` níveis a partir do nível atual. */
function custoDeVariosNiveis(c: Colecionavel, nivel: number, niveis: number) {
  let total = 0;
  for (let n = nivel; n < nivel + niveis; n++) total += custoDoReforco(c.raridade, n);
  return total;
}

/** A aba Colecionáveis: os 120 colecionáveis, os ativados, os fragmentos e o reforço e as estrelas. */
export function ColecionaveisPainel({ tokenFresco }: { tokenFresco: Token }) {
  const { colors } = NOCTHERA_THEME;
  const [estado, setEstado] = useState<EstadoDosColecionaveis | null>(null);
  const [erroAoCarregar, setErroAoCarregar] = useState(false);
  const [categoria, setCategoria] = useState<CategoriaDeColecionavel>('reliquias');
  const [aberto, setAberto] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);

  const carregar = useCallback(async () => {
    const r = await chamarColecionaveis(tokenFresco);
    if (r.ok) setEstado(r.dados as unknown as EstadoDosColecionaveis);
    else setErroAoCarregar(true);
  }, [tokenFresco]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function agir(acao: string, extra: Record<string, unknown>) {
    setOcupado(true);
    setAviso(null);
    const r = await chamarColecionaveis(tokenFresco, { acao, ...extra });
    setOcupado(false);
    if (!r.ok) {
      setAviso({ texto: String(r.dados.error ?? 'Não foi possível agora.'), erro: true });
      return;
    }
    setAviso({ texto: String(r.dados.mensagem ?? 'Feito.'), erro: false });
    setEstado(r.dados.estado as EstadoDosColecionaveis);
  }

  if (erroAoCarregar) return <p role="alert" className="text-sm" style={{ color: VERMELHO }}>Não foi possível carregar agora. Tente de novo em instantes.</p>;
  if (!estado) return <p className="text-sm" style={{ color: colors.text.secondary }}>Carregando...</p>;

  const ativos = COLECIONAVEIS.filter((c) => estaAtivo(estado.colecionaveis[c.id])).length;
  const totais = atributosDosColecionaveis(estado.colecionaveis);
  const comBonus = ATTRIBUTES.filter((a) => totais[a] > 0);

  return (
    <div className="flex flex-col gap-3">
      {aviso && <p role={aviso.erro ? 'alert' : 'status'} className="text-sm font-semibold" style={{ color: aviso.erro ? VERMELHO : VERDE }}>{aviso.texto}</p>}
      <section aria-label="Resumo dos colecionáveis" className="rounded-sm border-2 p-2.5 flex flex-col gap-1 text-sm" style={{ borderColor: OURO, backgroundColor: colors.background.secondary }}>
        <p>Ativados: <strong>{ativos}</strong> de {COLECIONAVEIS.length}</p>
        <p className="text-xs" style={{ color: colors.text.secondary }}>Fragmentos de Memória: {estado.fragmentosDeMemoria} · Pedras da Recordação: {estado.pedrasDaRecordacao}</p>
        <p className="text-xs">
          Bônus nos atributos:{' '}
          {comBonus.length ? comBonus.map((a) => `${ATTRIBUTE_DISPLAY_NAMES[a]} +${totais[a]}`).join(' · ') : 'nenhum ainda'}
        </p>
      </section>

      <div role="tablist" aria-label="Categorias" className="grid grid-cols-2 gap-1.5">
        {CATEGORIAS_DE_COLECIONAVEL.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={c === categoria}
            onClick={() => setCategoria(c)}
            className="rounded-sm border px-1.5 py-1 text-xs font-bold"
            style={{ borderColor: OURO, backgroundColor: c === categoria ? '#5A4824' : '#3A2F18', color: '#F5E3B3' }}
          >
            {NOME_DA_CATEGORIA_DE_COLECIONAVEL[c]}
          </button>
        ))}
      </div>
      <p className="text-xs" style={{ color: colors.text.secondary }}>{DESCRICAO_DA_CATEGORIA_DE_COLECIONAVEL[categoria]}</p>

      {RARIDADES_DE_COLECIONAVEL.map((raridade) => {
        const def = EMBLEMA_RARIDADE_MAP[raridade];
        const lista = COLECIONAVEIS.filter((c) => c.categoria === categoria && c.raridade === raridade);
        return (
          <section key={raridade} aria-label={`${NOME_DA_RARIDADE_DE_COLECIONAVEL[raridade]} de ${NOME_DA_CATEGORIA_DE_COLECIONAVEL[categoria]}`} className="flex flex-col gap-1">
            <h2 className="font-cinzel font-bold text-sm" style={{ color: def.cor }}>{NOME_DA_RARIDADE_DE_COLECIONAVEL[raridade]}</h2>
            <ul className="flex flex-col gap-1">
              {lista.map((c) => {
                const e = estado.colecionaveis[c.id] ?? { fragmentos: 0 };
                const ativo = estaAtivo(e);
                const nivel = e.nivel ?? 0;
                const estrelas = e.estrelas ?? 0;
                const maximo = nivelMaximoDoReforco(estrelas);
                const custoAtivar = FRAGMENTOS_PARA_ATIVAR[c.raridade];
                const expandido = aberto === c.id;
                return (
                  <li key={c.id} className="rounded-sm border text-xs" style={{ borderColor: ativo ? def.cor : '#4A3F2A', backgroundColor: colors.background.secondary }}>
                    <button type="button" onClick={() => setAberto(expandido ? null : c.id)} aria-expanded={expandido} className="w-full px-2 py-1.5 flex justify-between gap-2 text-left">
                      <span>
                        <span className="font-semibold" style={{ color: ativo ? def.cor : colors.text.primary }}>{c.nome}</span>
                        <span style={{ color: colors.text.secondary }}> · {ATTRIBUTE_DISPLAY_NAMES[c.atributo]}</span>
                      </span>
                      <span className="shrink-0" style={{ color: ativo ? VERDE : colors.text.secondary }}>
                        {ativo ? `Nv ${nivel}/${maximo} · ${estrelasEmTexto(estrelas)}` : `${e.fragmentos}/${custoAtivar} frag.`}
                      </span>
                    </button>
                    {expandido && (
                      <div className="px-2 pb-2 flex flex-col gap-1.5">
                        <p style={{ color: colors.text.secondary }}>
                          {c.id} · {ativo ? `Dá +${valorDoColecionavel(c.raridade, nivel, estrelas)} de ${ATTRIBUTE_DISPLAY_NAMES[c.atributo]}.` : `Ativado, dá +${valorDoColecionavel(c.raridade, 1, 0)} de ${ATTRIBUTE_DISPLAY_NAMES[c.atributo]}.`}
                          {ativo && proximoNivelQueSobe(c.raridade, nivel) ? ` Sobe +1 no nível ${proximoNivelQueSobe(c.raridade, nivel)}.` : ''}
                          {ativo && proximaEstrelaQueSobe(c.raridade, estrelas) ? ` Sobe +1 com ${proximaEstrelaQueSobe(c.raridade, estrelas)}★.` : ''}
                          {ativo ? ` Fragmentos guardados: ${e.fragmentos}.` : ''}
                        </p>
                        {!ativo ? (
                          <div>
                            <Botao disabled={ocupado || e.fragmentos < custoAtivar} onClick={() => void agir('ativar', { id: c.id })}>
                              Ativar ({custoAtivar} fragmentos)
                            </Botao>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {nivel < maximo ? (
                              <>
                                <Botao disabled={ocupado || estado.fragmentosDeMemoria < custoDoReforco(c.raridade, nivel)} onClick={() => void agir('reforcar', { id: c.id, niveis: 1 })}>
                                  Reforçar +1 ({custoDoReforco(c.raridade, nivel)} Memória)
                                </Botao>
                                {maximo - nivel >= 5 && (
                                  <Botao disabled={ocupado || estado.fragmentosDeMemoria < custoDeVariosNiveis(c, nivel, 5)} onClick={() => void agir('reforcar', { id: c.id, niveis: 5 })}>
                                    +5 ({custoDeVariosNiveis(c, nivel, 5)} Memória)
                                  </Botao>
                                )}
                              </>
                            ) : (
                              <span style={{ color: colors.text.secondary }}>{estrelas < ESTRELAS_MAXIMAS ? 'Reforço no limite: suba uma estrela.' : 'Reforço máximo.'}</span>
                            )}
                            {estrelas < ESTRELAS_MAXIMAS && (() => {
                              const custo = custoDaEstrela(c.raridade, estrelas + 1);
                              return (
                                <Botao disabled={ocupado || e.fragmentos < custo.fragmentos || estado.pedrasDaRecordacao < custo.pedras} onClick={() => void agir('estrela', { id: c.id })}>
                                  Subir para {estrelas + 1}★ ({custo.fragmentos} frag. e {custo.pedras} Pedras)
                                </Botao>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
