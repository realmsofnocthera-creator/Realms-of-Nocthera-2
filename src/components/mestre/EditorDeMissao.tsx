'use client';

import React, { useEffect, useRef, useState } from 'react';
import { GAME_CONFIG } from '@/rules/config';
import {
  DESCRICAO_DA_MISSAO_MAXIMA,
  MAXIMO_DE_ITENS_NA_RECOMPENSA,
  MAXIMO_DE_OBJETIVOS,
  MAXIMO_DE_REQUISITOS,
  NOME_DO_OBJETIVO,
  RECOMPENSA_MAXIMA,
  TEXTO_DO_OBJETIVO_MAXIMO,
  TIPOS_DE_OBJETIVO,
  TITULO_DA_MISSAO_MAXIMO,
  validarMissao,
  type MissaoDados,
  type ObjetivoDaMissao,
  type TipoDeObjetivo,
} from '@/rules/missao';
import type { MapaDados } from '@/rules/mapa';
import type { ConteudoDocumento, ResumoConteudo } from '@/server/persistencia/tipos';
import { NOCTHERA_THEME } from '@/theme/theme';
import { Cartao, chamar, OURO, VERMELHO } from '@/components/mestre/comum';

const CAMPO = 'rounded-sm border px-2 py-1 text-[12px] w-full disabled:opacity-60';
type Token = () => Promise<string>;
interface Opcao {
  id: string;
  nome: string;
}
interface Opcoes {
  mapas: Opcao[];
  cenas: Opcao[];
  missoes: Opcao[];
  monstros: Opcao[];
  materiais: Opcao[];
}
const SEM_OPCOES: Opcoes = { mapas: [], cenas: [], missoes: [], monstros: [], materiais: [] };

const objetivoNovo = (tipo: TipoDeObjetivo, id: string): ObjetivoDaMissao => {
  switch (tipo) {
    case 'falar':
    case 'bau':
      return { id, tipo, mapa: '', objeto: '' };
    case 'cena':
      return { id, tipo, cenaId: '' };
    case 'derrotar':
      return { id, tipo, monstroId: 'rato-da-floresta', quantidade: 1 };
    case 'chegar':
      return { id, tipo, mapa: '' };
    case 'item':
      return { id, tipo, itemId: 'pelo-de-rato', quantidade: 1 };
  }
};

/**
 * Edita uma missão (5.5-5): título, descrição, requisitos, objetivos e recompensa. Salva só o rascunho; publicar é no
 * painel. A missão começa por um NPC ou ativador de cena que aponte para ela (campo "missão" do objeto no mapa).
 */
export function EditorDeMissao({
  id,
  inicial,
  podeEditar,
  tokenFresco,
  salvar,
}: {
  id: string;
  inicial: MissaoDados;
  podeEditar: boolean;
  tokenFresco: Token;
  salvar: (dados: MissaoDados) => Promise<string | null>;
}) {
  const { colors } = NOCTHERA_THEME;
  const estilo = { backgroundColor: colors.background.primary, borderColor: `${OURO}66`, color: colors.text.primary };
  const [d, setD] = useState<MissaoDados>(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [opcoes, setOpcoes] = useState<Opcoes>(SEM_OPCOES);
  const [objetosDoMapa, setObjetosDoMapa] = useState<Record<string, { npcs: Opcao[]; baus: Opcao[] }>>({});
  const pedidos = useRef(new Set<string>());

  useEffect(() => {
    let vivo = true;
    void (async () => {
      const [mapas, cenas, missoes, monstros, cacada, codigo, chefes, materiais, mundo] = await Promise.all([
        chamar(tokenFresco, '/api/mestre/conteudo?tipo=mapa'),
        chamar(tokenFresco, '/api/mestre/conteudo?tipo=cena'),
        chamar(tokenFresco, '/api/mestre/conteudo?tipo=missao'),
        chamar(tokenFresco, '/api/mestre/conteudo?tipo=monstro'),
        import('@/rules/cacada'),
        import('@/rules/monsters'),
        import('@/rules/chefesEspeciais'),
        import('@/rules/materiais'),
        import('@/rules/materiaisArmas'),
      ]);
      if (!vivo) return;
      const lista = (r: { ok: boolean; dados: Record<string, unknown> }, filtro: (x: ResumoConteudo) => boolean = () => true): Opcao[] =>
        r.ok ? (r.dados.itens as ResumoConteudo[]).filter(filtro).map((x) => ({ id: x.id, nome: x.nome })) : [];
      const doCodigo = [...codigo.MONSTERS, ...cacada.MONSTROS_CACADA, ...Object.values(chefes.CHEFES_ESPECIAIS_MAP)].map((m) => ({ id: m.id, nome: m.nome }));
      const ids = new Set(doCodigo.map((m) => m.id));
      setOpcoes({
        mapas: lista(mapas),
        cenas: lista(cenas),
        missoes: lista(missoes, (m) => m.id !== id),
        monstros: [...doCodigo, ...lista(monstros).filter((m) => !ids.has(m.id)).map((m) => ({ ...m, nome: `${m.nome} (banco)` }))].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
        materiais: [...materiais.MATERIAIS, ...mundo.MATERIAIS_MUNDO].map((m) => ({ id: m.id, nome: m.nome })),
      });
    })();
    return () => {
      vivo = false;
    };
  }, [tokenFresco, id]);

  // os NPCs e baús do mapa de cada objetivo "falar" ou "bau"
  const mapasUsados = [...new Set(d.objetivos.filter((o) => (o.tipo === 'falar' || o.tipo === 'bau') && o.mapa).map((o) => o.mapa as string))];
  useEffect(() => {
    for (const mapaId of mapasUsados) {
      if (pedidos.current.has(mapaId)) continue;
      pedidos.current.add(mapaId);
      void chamar(tokenFresco, `/api/mestre/conteudo/mapa/${mapaId}`).then((r) => {
        if (!r.ok) return;
        const mapa = (r.dados.conteudo as ConteudoDocumento).rascunho as MapaDados;
        const objetos = mapa.objetos ?? [];
        setObjetosDoMapa((atual) => ({
          ...atual,
          [mapaId]: {
            npcs: objetos.filter((o) => o.tipo === 'npc').map((o) => ({ id: o.id, nome: `${o.nome || 'NPC'} (${o.id})` })),
            baus: objetos.filter((o) => o.tipo === 'bau').map((o) => ({ id: o.id, nome: `Baú ${o.id} em (${o.x}, ${o.y})` })),
          },
        }));
      });
    }
  }, [mapasUsados.join(','), tokenFresco]); // eslint-disable-line react-hooks/exhaustive-deps

  const mudarObjetivo = (i: number, fn: (o: ObjetivoDaMissao) => ObjetivoDaMissao) => setD((m) => ({ ...m, objetivos: m.objetivos.map((o, j) => (j === i ? fn(o) : o)) }));
  const mover = (i: number, passo: -1 | 1) => {
    const j = i + passo;
    if (j < 0 || j >= d.objetivos.length) return;
    const lista = [...d.objetivos];
    [lista[i], lista[j]] = [lista[j], lista[i]];
    setD({ ...d, objetivos: lista });
  };
  const seletor = (rotulo: string, valor: string | undefined, lista: Opcao[], mudar: (v: string) => void, vazio = 'Escolha...') => (
    <label className="text-[11px] flex flex-col gap-0.5">{rotulo}
      <select aria-label={rotulo} value={valor ?? ''} disabled={!podeEditar} onChange={(e) => mudar(e.target.value)} className={CAMPO} style={estilo}>
        <option value="">{vazio}</option>
        {valor && !lista.some((x) => x.id === valor) && <option value={valor}>{valor}</option>}
        {lista.map((x) => <option key={x.id} value={x.id}>{x.nome} ({x.id})</option>)}
      </select>
    </label>
  );

  return (
    <Cartao titulo="Missão">
      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setErro(null);
          setAviso(null);
          const v = validarMissao(d);
          if (!v.ok) return setErro(v.erros.join(' '));
          setOcupado(true);
          const falha = await salvar(v.dados);
          setOcupado(false);
          if (falha) setErro(falha);
          else setAviso('Rascunho salvo. Para o jogo ver, publique abaixo.');
        }}
      >
        <label className="text-[11px] flex flex-col gap-0.5">Título ({d.titulo.length}/{TITULO_DA_MISSAO_MAXIMO})
          <input value={d.titulo} maxLength={TITULO_DA_MISSAO_MAXIMO} disabled={!podeEditar} onChange={(e) => setD({ ...d, titulo: e.target.value })} className={CAMPO} style={estilo} />
        </label>
        <label className="text-[11px] flex flex-col gap-0.5">Descrição que o jogador lê ({d.descricao.length}/{DESCRICAO_DA_MISSAO_MAXIMA})
          <textarea value={d.descricao} rows={4} maxLength={DESCRICAO_DA_MISSAO_MAXIMA} disabled={!podeEditar} onChange={(e) => setD({ ...d, descricao: e.target.value })} className={CAMPO} style={estilo} />
        </label>

        <fieldset className="flex flex-col gap-2 rounded-sm border p-2" style={{ borderColor: `${OURO}33` }}>
          <legend className="px-1 text-[11px] font-bold">Requisitos para começar</legend>
          <label className="text-[11px] flex flex-col gap-0.5 max-w-[12rem]">Nível mínimo (0 = sem exigência)
            <input aria-label="Nível mínimo da missão" type="number" min={0} max={GAME_CONFIG.NIVEL_MAXIMO_GRAU_1} value={d.requisitos.nivelMinimo} disabled={!podeEditar} onChange={(e) => setD({ ...d, requisitos: { ...d.requisitos, nivelMinimo: Number(e.target.value) } })} className={CAMPO} style={estilo} />
          </label>
          <p className="text-[11px]">Missões que precisam estar concluídas ({d.requisitos.missoes.length}/{MAXIMO_DE_REQUISITOS}):</p>
          <div className="flex flex-wrap gap-1.5">
            {d.requisitos.missoes.map((m) => (
              <span key={m} className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px]" style={{ borderColor: `${OURO}66` }}>
                {opcoes.missoes.find((x) => x.id === m)?.nome ?? m}
                {podeEditar && <button type="button" aria-label={`Tirar o requisito ${m}`} onClick={() => setD({ ...d, requisitos: { ...d.requisitos, missoes: d.requisitos.missoes.filter((x) => x !== m) } })}>×</button>}
              </span>
            ))}
          </div>
          {podeEditar && d.requisitos.missoes.length < MAXIMO_DE_REQUISITOS && (
            <select aria-label="Adicionar requisito de missão" value="" onChange={(e) => e.target.value && setD({ ...d, requisitos: { ...d.requisitos, missoes: [...d.requisitos.missoes, e.target.value] } })} className={`${CAMPO} max-w-[16rem]`} style={estilo}>
              <option value="">+ Missão que precisa estar concluída</option>
              {opcoes.missoes.filter((m) => !d.requisitos.missoes.includes(m.id)).map((m) => <option key={m.id} value={m.id}>{m.nome} ({m.id})</option>)}
            </select>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-2 rounded-sm border p-2" style={{ borderColor: `${OURO}33` }}>
          <legend className="px-1 text-[11px] font-bold">Objetivos ({d.objetivos.length}/{MAXIMO_DE_OBJETIVOS}): todos precisam ser cumpridos</legend>
          {d.objetivos.map((o, i) => (
            <div key={o.id} className="flex flex-col gap-1.5 rounded-sm border p-2" style={{ borderColor: `${OURO}22` }}>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <b>Objetivo {i + 1}</b>
                <select
                  aria-label={`Tipo do objetivo ${i + 1}`}
                  value={o.tipo}
                  disabled={!podeEditar}
                  onChange={(e) => mudarObjetivo(i, (x) => ({ ...objetivoNovo(e.target.value as TipoDeObjetivo, x.id), ...(x.texto ? { texto: x.texto } : {}) }))}
                  className={`${CAMPO} max-w-[14rem]`}
                  style={estilo}
                >
                  {TIPOS_DE_OBJETIVO.map((t) => <option key={t} value={t}>{NOME_DO_OBJETIVO[t]}</option>)}
                </select>
                {podeEditar && (
                  <>
                    <button type="button" aria-label={`Subir objetivo ${i + 1}`} onClick={() => mover(i, -1)} disabled={i === 0}>↑</button>
                    <button type="button" aria-label={`Descer objetivo ${i + 1}`} onClick={() => mover(i, 1)} disabled={i === d.objetivos.length - 1}>↓</button>
                    <button type="button" className="underline" style={{ color: VERMELHO }} disabled={d.objetivos.length <= 1} onClick={() => setD({ ...d, objetivos: d.objetivos.filter((_, j) => j !== i) })}>Remover</button>
                  </>
                )}
              </div>
              <div className="grid gap-2 grid-cols-1 md:grid-cols-2">
                {(o.tipo === 'falar' || o.tipo === 'bau' || o.tipo === 'chegar') && seletor(`Mapa do objetivo ${i + 1}`, o.mapa, opcoes.mapas, (v) => mudarObjetivo(i, (x) => ({ ...x, mapa: v, ...(x.tipo === 'chegar' ? {} : { objeto: '' }) })))}
                {o.tipo === 'falar' && seletor(`NPC do objetivo ${i + 1}`, o.objeto, objetosDoMapa[o.mapa ?? '']?.npcs ?? [], (v) => mudarObjetivo(i, (x) => ({ ...x, objeto: v })), o.mapa ? 'Escolha o NPC...' : 'Escolha o mapa antes')}
                {o.tipo === 'bau' && seletor(`Baú do objetivo ${i + 1}`, o.objeto, objetosDoMapa[o.mapa ?? '']?.baus ?? [], (v) => mudarObjetivo(i, (x) => ({ ...x, objeto: v })), o.mapa ? 'Escolha o baú...' : 'Escolha o mapa antes')}
                {o.tipo === 'cena' && seletor(`Cena do objetivo ${i + 1}`, o.cenaId, opcoes.cenas, (v) => mudarObjetivo(i, (x) => ({ ...x, cenaId: v })))}
                {o.tipo === 'derrotar' && seletor(`Monstro do objetivo ${i + 1}`, o.monstroId, opcoes.monstros, (v) => mudarObjetivo(i, (x) => ({ ...x, monstroId: v })))}
                {o.tipo === 'item' && seletor(`Item do objetivo ${i + 1}`, o.itemId, opcoes.materiais, (v) => mudarObjetivo(i, (x) => ({ ...x, itemId: v })))}
                {(o.tipo === 'derrotar' || o.tipo === 'item') && (
                  <label className="text-[11px] flex flex-col gap-0.5">Quantidade
                    <input aria-label={`Quantidade do objetivo ${i + 1}`} type="number" min={1} value={o.quantidade ?? 1} disabled={!podeEditar} onChange={(e) => mudarObjetivo(i, (x) => ({ ...x, quantidade: Number(e.target.value) }))} className={CAMPO} style={estilo} />
                  </label>
                )}
              </div>
              <label className="text-[11px] flex flex-col gap-0.5">Texto que o jogador lê (vazio = automático)
                <input aria-label={`Texto do objetivo ${i + 1}`} value={o.texto ?? ''} maxLength={TEXTO_DO_OBJETIVO_MAXIMO} disabled={!podeEditar} onChange={(e) => mudarObjetivo(i, (x) => { const { texto: _t, ...resto } = x; return e.target.value ? { ...resto, texto: e.target.value } : resto; })} className={CAMPO} style={estilo} />
              </label>
            </div>
          ))}
          {podeEditar && d.objetivos.length < MAXIMO_DE_OBJETIVOS && (
            <button
              type="button"
              className="self-start rounded border px-2 py-1 text-[11px] font-bold"
              style={{ borderColor: `${OURO}66` }}
              onClick={() => {
                let n = d.objetivos.length + 1;
                while (d.objetivos.some((o) => o.id === `objetivo-${n}`)) n++;
                setD({ ...d, objetivos: [...d.objetivos, objetivoNovo('derrotar', `objetivo-${n}`)] });
              }}
            >
              + Objetivo
            </button>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-2 rounded-sm border p-2" style={{ borderColor: `${OURO}33` }}>
          <legend className="px-1 text-[11px] font-bold">Recompensa (ao concluir)</legend>
          <div className="grid gap-2 grid-cols-2 max-w-md">
            <label className="text-[11px] flex flex-col gap-0.5">XP
              <input aria-label="XP da recompensa" type="number" min={0} max={RECOMPENSA_MAXIMA} value={d.recompensa.xp} disabled={!podeEditar} onChange={(e) => setD({ ...d, recompensa: { ...d.recompensa, xp: Number(e.target.value) } })} className={CAMPO} style={estilo} />
            </label>
            <label className="text-[11px] flex flex-col gap-0.5">Ouro
              <input aria-label="Ouro da recompensa" type="number" min={0} max={RECOMPENSA_MAXIMA} value={d.recompensa.ouro} disabled={!podeEditar} onChange={(e) => setD({ ...d, recompensa: { ...d.recompensa, ouro: Number(e.target.value) } })} className={CAMPO} style={estilo} />
            </label>
          </div>
          {d.recompensa.itens.map((it, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              {seletor(`Item da recompensa ${i + 1}`, it.id, opcoes.materiais, (v) => setD({ ...d, recompensa: { ...d.recompensa, itens: d.recompensa.itens.map((x, j) => (j === i ? { ...x, id: v } : x)) } }))}
              <label className="text-[11px] flex flex-col gap-0.5 w-24">Quantidade
                <input aria-label={`Quantidade do item ${i + 1}`} type="number" min={1} value={it.qtd} disabled={!podeEditar} onChange={(e) => setD({ ...d, recompensa: { ...d.recompensa, itens: d.recompensa.itens.map((x, j) => (j === i ? { ...x, qtd: Number(e.target.value) } : x)) } })} className={CAMPO} style={estilo} />
              </label>
              {podeEditar && <button type="button" className="text-[11px] underline" style={{ color: VERMELHO }} onClick={() => setD({ ...d, recompensa: { ...d.recompensa, itens: d.recompensa.itens.filter((_, j) => j !== i) } })}>Remover</button>}
            </div>
          ))}
          {podeEditar && d.recompensa.itens.length < MAXIMO_DE_ITENS_NA_RECOMPENSA && (
            <button type="button" className="self-start rounded border px-2 py-1 text-[11px] font-bold" style={{ borderColor: `${OURO}66` }} onClick={() => setD({ ...d, recompensa: { ...d.recompensa, itens: [...d.recompensa.itens, { id: 'pelo-de-rato', qtd: 1 }] } })}>
              + Item
            </button>
          )}
        </fieldset>

        {podeEditar && (
          <button type="submit" disabled={ocupado} className="self-start px-3 py-1.5 rounded font-cinzel font-bold text-xs disabled:opacity-50" style={{ backgroundColor: colors.accent.primary, color: colors.background.secondary }}>
            {ocupado ? 'Salvando…' : 'Salvar rascunho'}
          </button>
        )}
        {aviso && <p role="status" className="text-[12px] font-semibold" style={{ color: '#7BC47F' }}>{aviso}</p>}
        {erro && <p role="alert" className="text-[12px] font-semibold" style={{ color: VERMELHO }}>{erro}</p>}
      </form>
    </Cartao>
  );
}
