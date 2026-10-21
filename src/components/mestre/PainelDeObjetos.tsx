'use client';

import React from 'react';
import { Move, Trash2 } from 'lucide-react';
import {
  GATILHOS_DO_OBJETO,
  LADO_MAXIMO_DA_AREA,
  LETRA_DO_OBJETO,
  NOME_DA_ACAO,
  NOME_DO_GATILHO,
  NOME_DO_OBJETO,
  TEXTO_MAXIMO_DO_OBJETO,
  TIPOS_DE_OBJETO,
  type Gatilho,
  type ObjetoDoMapa,
  type TipoDeObjeto,
} from '@/rules/objetosDoMapa';
import { NOCTHERA_THEME } from '@/theme/theme';
import { OURO, VERMELHO } from '@/components/mestre/comum';

export const COR_DO_OBJETO: Readonly<Record<TipoDeObjeto, string>> = { inicio: '#7BC47F', npc: '#5AA7F0', placa: '#E6C775', bau: '#C27BF0', porta: '#F3873C', cacada: '#E5736B', cena: '#4FC3C3' };

const CAMPO = 'rounded-sm border px-1.5 py-1 text-[11px] w-full disabled:opacity-60';

interface Opcao {
  id: string;
  nome: string;
}

/**
 * Painel dos objetos interativos do mapa (3.5.6.3): escolher o tipo a colocar, ver e editar o objeto selecionado.
 * Os componentes de campo ficam fora do render de propósito (senão cada tecla recria o campo e ele perde o foco).
 */
export function PainelDeObjetos({
  tipo,
  setTipo,
  objetos,
  selecionado,
  selecionar,
  podeEditar,
  movendo,
  setMovendo,
  mudar,
  remover,
  erros,
  mapas,
  monstros,
  cenas,
  missoes,
  materiais,
}: {
  tipo: TipoDeObjeto;
  setTipo: (t: TipoDeObjeto) => void;
  objetos: readonly ObjetoDoMapa[];
  selecionado: string | null;
  selecionar: (id: string | null) => void;
  podeEditar: boolean;
  movendo: boolean;
  setMovendo: (v: boolean) => void;
  /** Muda um campo do selecionado; `campo` agrupa as teclas seguidas num só passo do desfazer. */
  mudar: (campo: string, fn: (o: ObjetoDoMapa) => void) => void;
  remover: () => void;
  erros: string[];
  mapas: Opcao[];
  monstros: Opcao[];
  cenas: Opcao[];
  missoes: Opcao[];
  materiais: Opcao[];
}) {
  const { colors } = NOCTHERA_THEME;
  const o = objetos.find((x) => x.id === selecionado);
  const estilo = { backgroundColor: colors.background.primary, borderColor: `${OURO}66`, color: colors.text.primary };
  const num = (v: string) => (v === '' ? 0 : Number(v));

  return (
    <aside className="h-56 md:h-auto md:w-72 shrink-0 border-t md:border-t-0 md:border-l flex flex-col min-h-0 overflow-auto p-2 gap-2" style={{ borderColor: `${OURO}44`, backgroundColor: colors.background.secondary }}>
      {podeEditar && (
        <div>
          <p className="text-[11px] font-bold mb-1">Tocar no mapa coloca:</p>
          <div role="radiogroup" aria-label="Tipo de objeto" className="flex flex-wrap gap-1">
            {TIPOS_DE_OBJETO.map((t) => (
              <button key={t} type="button" role="radio" aria-checked={tipo === t} onClick={() => setTipo(t)} className="px-1.5 py-1 rounded border text-[11px] font-bold" style={{ borderColor: tipo === t ? COR_DO_OBJETO[t] : `${OURO}44`, backgroundColor: tipo === t ? COR_DO_OBJETO[t] : 'transparent', color: tipo === t ? '#0D0D0D' : colors.text.primary }}>
                {LETRA_DO_OBJETO[t]} · {NOME_DO_OBJETO[t]}
              </button>
            ))}
          </div>
          <p className="text-[10px] mt-1" style={{ color: colors.text.secondary }}>Tocar num objeto existente o seleciona. A ferramenta Mover (mão) arrasta o mapa.</p>
        </div>
      )}

      {o ? (
        <section className="flex flex-col gap-1.5 rounded-sm border p-2" style={{ borderColor: COR_DO_OBJETO[o.tipo] }} aria-label="Objeto selecionado">
          <h2 className="text-[12px] font-cinzel font-bold">{NOME_DO_OBJETO[o.tipo]} <span className="font-normal" style={{ color: colors.text.secondary }}>· {o.id} · ({o.x}, {o.y})</span></h2>
          <p className="text-[10px]" style={{ color: colors.text.secondary }}>{NOME_DA_ACAO[o.tipo]} · gatilho: {NOME_DO_GATILHO[o.gatilho]}</p>

          {o.tipo === 'npc' && (
            <>
              <Campo rotulo="Nome do NPC"><input aria-label="Nome do NPC" value={o.nome ?? ''} disabled={!podeEditar} maxLength={60} onChange={(e) => mudar('nome', (x) => void (x.nome = e.target.value))} className={CAMPO} style={estilo} /></Campo>
              <Campo rotulo="Cena de diálogo (opcional; no lugar da fala)">
                <select aria-label="Cena do diálogo" value={o.cenaId ?? ''} disabled={!podeEditar} onChange={(e) => mudar('cenaId', (x) => { if (e.target.value) x.cenaId = e.target.value; else delete x.cenaId; })} className={CAMPO} style={estilo}>
                  <option value="">Sem cena (usa a fala)</option>
                  {o.cenaId && !cenas.some((c) => c.id === o.cenaId) && <option value={o.cenaId}>{o.cenaId}</option>}
                  {cenas.map((c) => <option key={c.id} value={c.id}>{c.nome} ({c.id})</option>)}
                </select>
              </Campo>
              <Campo rotulo="Missão que começa aqui (opcional)">
                <select aria-label="Missão do NPC" value={o.missaoId ?? ''} disabled={!podeEditar} onChange={(e) => mudar('missaoId', (x) => { if (e.target.value) x.missaoId = e.target.value; else delete x.missaoId; })} className={CAMPO} style={estilo}>
                  <option value="">Nenhuma</option>
                  {o.missaoId && !missoes.some((m) => m.id === o.missaoId) && <option value={o.missaoId}>{o.missaoId}</option>}
                  {missoes.map((m) => <option key={m.id} value={m.id}>{m.nome} ({m.id})</option>)}
                </select>
              </Campo>
              <Campo rotulo="Fala"><textarea aria-label="Fala" value={o.texto ?? ''} rows={4} disabled={!podeEditar} maxLength={TEXTO_MAXIMO_DO_OBJETO} onChange={(e) => mudar('texto', (x) => void (x.texto = e.target.value))} className={CAMPO} style={estilo} /></Campo>
            </>
          )}
          {o.tipo === 'placa' && (
            <Campo rotulo="Texto da placa"><textarea aria-label="Texto da placa" value={o.texto ?? ''} rows={4} disabled={!podeEditar} maxLength={TEXTO_MAXIMO_DO_OBJETO} onChange={(e) => mudar('texto', (x) => void (x.texto = e.target.value))} className={CAMPO} style={estilo} /></Campo>
          )}
          {o.tipo === 'bau' && (
            <>
              <datalist id="itens-do-bau">{materiais.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}</datalist>
              <Campo rotulo="Item (id do material)"><input aria-label="Item do baú" list="itens-do-bau" value={o.item?.id ?? ''} disabled={!podeEditar} onChange={(e) => mudar('item', (x) => void (x.item = { id: e.target.value, qtd: x.item?.qtd ?? 1 }))} className={CAMPO} style={estilo} /></Campo>
              <Campo rotulo="Quantidade"><input aria-label="Quantidade" type="number" min={1} value={o.item?.qtd ?? 1} disabled={!podeEditar} onChange={(e) => mudar('qtd', (x) => void (x.item = { id: x.item?.id ?? '', qtd: num(e.target.value) }))} className={CAMPO} style={estilo} /></Campo>
            </>
          )}
          {o.tipo === 'porta' && (
            <>
              <Campo rotulo="Mapa de destino">
                <select aria-label="Mapa de destino" value={o.destino?.mapa ?? ''} disabled={!podeEditar} onChange={(e) => mudar('destino-mapa', (x) => void (x.destino = { mapa: e.target.value, x: x.destino?.x ?? 0, y: x.destino?.y ?? 0 }))} className={CAMPO} style={estilo}>
                  <option value="">Escolha...</option>
                  {mapas.map((m) => <option key={m.id} value={m.id}>{m.nome} ({m.id})</option>)}
                </select>
              </Campo>
              <div className="grid grid-cols-2 gap-1.5">
                <Campo rotulo="Destino x"><input aria-label="Destino x" type="number" min={0} value={o.destino?.x ?? 0} disabled={!podeEditar} onChange={(e) => mudar('destino-x', (x) => void (x.destino = { mapa: x.destino?.mapa ?? '', x: num(e.target.value), y: x.destino?.y ?? 0 }))} className={CAMPO} style={estilo} /></Campo>
                <Campo rotulo="Destino y"><input aria-label="Destino y" type="number" min={0} value={o.destino?.y ?? 0} disabled={!podeEditar} onChange={(e) => mudar('destino-y', (x) => void (x.destino = { mapa: x.destino?.mapa ?? '', x: x.destino?.x ?? 0, y: num(e.target.value) }))} className={CAMPO} style={estilo} /></Campo>
              </div>
              <Campo rotulo="Gatilho">
                <select aria-label="Gatilho" value={o.gatilho} disabled={!podeEditar} onChange={(e) => mudar('gatilho', (x) => void (x.gatilho = e.target.value as Gatilho))} className={CAMPO} style={estilo}>
                  {GATILHOS_DO_OBJETO.porta.map((g) => <option key={g} value={g}>{NOME_DO_GATILHO[g]}</option>)}
                </select>
              </Campo>
            </>
          )}
          {o.tipo === 'cena' && (
            <>
              <Campo rotulo="Cena">
                <select aria-label="Cena" value={o.cenaId ?? ''} disabled={!podeEditar} onChange={(e) => mudar('cenaId', (x) => void (x.cenaId = e.target.value))} className={CAMPO} style={estilo}>
                  <option value="">Escolha...</option>
                  {o.cenaId && !cenas.some((c) => c.id === o.cenaId) && <option value={o.cenaId}>{o.cenaId}</option>}
                  {cenas.map((c) => <option key={c.id} value={c.id}>{c.nome} ({c.id})</option>)}
                </select>
              </Campo>
              <Campo rotulo="Missão que começa ao entrar (opcional)">
                <select aria-label="Missão do ativador" value={o.missaoId ?? ''} disabled={!podeEditar} onChange={(e) => mudar('missaoId', (x) => { if (e.target.value) x.missaoId = e.target.value; else delete x.missaoId; })} className={CAMPO} style={estilo}>
                  <option value="">Nenhuma</option>
                  {o.missaoId && !missoes.some((m) => m.id === o.missaoId) && <option value={o.missaoId}>{o.missaoId}</option>}
                  {missoes.map((m) => <option key={m.id} value={m.id}>{m.nome} ({m.id})</option>)}
                </select>
              </Campo>
              <label className="text-[11px] flex items-center gap-1.5">
                <input type="checkbox" aria-label="Toca uma vez só" checked={o.unica !== false} disabled={!podeEditar} onChange={(e) => mudar('unica', (x) => void (x.unica = e.target.checked))} />
                Toca uma vez só por personagem
              </label>
            </>
          )}
          {(o.tipo === 'cacada' || o.tipo === 'cena') && (
            <>
              {o.tipo === 'cacada' && (
              <Campo rotulo="Monstro">
                <select aria-label="Monstro" value={o.monstroId ?? ''} disabled={!podeEditar} onChange={(e) => mudar('monstroId', (x) => void (x.monstroId = e.target.value))} className={CAMPO} style={estilo}>
                  {!monstros.some((m) => m.id === o.monstroId) && <option value={o.monstroId ?? ''}>{o.monstroId || 'Escolha...'}</option>}
                  {monstros.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </Campo>
              )}
              <div className="grid grid-cols-2 gap-1.5">
                <Campo rotulo="Largura (tiles)"><input aria-label="Largura da área" type="number" min={1} max={LADO_MAXIMO_DA_AREA} value={o.largura ?? 1} disabled={!podeEditar} onChange={(e) => mudar('largura', (x) => void (x.largura = num(e.target.value)))} className={CAMPO} style={estilo} /></Campo>
                <Campo rotulo="Altura (tiles)"><input aria-label="Altura da área" type="number" min={1} max={LADO_MAXIMO_DA_AREA} value={o.altura ?? 1} disabled={!podeEditar} onChange={(e) => mudar('altura', (x) => void (x.altura = num(e.target.value)))} className={CAMPO} style={estilo} /></Campo>
              </div>
            </>
          )}

          {(o.tipo === 'porta' || o.tipo === 'bau' || o.tipo === 'cena' || o.tipo === 'cacada') && (
            <CamposDeCondicao o={o} podeEditar={podeEditar} mudar={mudar} estilo={estilo} missoes={missoes} cenas={cenas} materiais={materiais} />
          )}

          {podeEditar && (
            <div className="flex gap-1.5">
              <button type="button" aria-pressed={movendo} onClick={() => setMovendo(!movendo)} className="inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px]" style={{ borderColor: movendo ? '#E6C775' : `${OURO}66`, color: movendo ? '#E6C775' : colors.text.primary }}>
                <Move className="w-3.5 h-3.5" /> {movendo ? 'Toque no novo lugar' : 'Mover'}
              </button>
              <button type="button" onClick={remover} className="inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px]" style={{ borderColor: VERMELHO, color: VERMELHO }}>
                <Trash2 className="w-3.5 h-3.5" /> Remover
              </button>
            </div>
          )}
        </section>
      ) : (
        <p className="text-[11px]" style={{ color: colors.text.secondary }}>Nenhum objeto selecionado.</p>
      )}

      <section aria-label="Lista de objetos">
        <h2 className="text-[11px] font-bold mb-1">Objetos do mapa ({objetos.length})</h2>
        {objetos.length === 0 ? (
          <p className="text-[10px]" style={{ color: colors.text.secondary }}>Ainda não há objetos.</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {objetos.map((x) => (
              <li key={x.id}>
                <button type="button" onClick={() => selecionar(x.id)} className="w-full text-left text-[11px] px-1.5 py-0.5 rounded-sm border" style={{ borderColor: x.id === selecionado ? COR_DO_OBJETO[x.tipo] : 'transparent' }}>
                  <span className="font-bold" style={{ color: COR_DO_OBJETO[x.tipo] }}>{LETRA_DO_OBJETO[x.tipo]}</span> {x.tipo === 'npc' ? x.nome : NOME_DO_OBJETO[x.tipo]} · ({x.x}, {x.y})
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {erros.length > 0 && (
        <ul role="alert" className="text-[11px] list-disc pl-4" style={{ color: VERMELHO }}>
          {erros.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
    </aside>
  );
}

/** A condição para o objeto valer (porta, baú, ativador de cena, área de monstros): todas as exigências juntas. */
function CamposDeCondicao({
  o,
  podeEditar,
  mudar,
  estilo,
  missoes,
  cenas,
  materiais,
}: {
  o: ObjetoDoMapa;
  podeEditar: boolean;
  mudar: (campo: string, fn: (o: ObjetoDoMapa) => void) => void;
  estilo: React.CSSProperties;
  missoes: Opcao[];
  cenas: Opcao[];
  materiais: Opcao[];
}) {
  const c = o.condicao ?? {};
  const atualizar = (campo: string, fn: (cond: NonNullable<ObjetoDoMapa['condicao']>) => void) =>
    mudar(`condicao-${campo}`, (x) => {
      const cond = { ...(x.condicao ?? {}) };
      fn(cond);
      if (Object.keys(cond).length) x.condicao = cond;
      else delete x.condicao;
    });
  const seletor = (rotulo: string, chave: 'missaoAtiva' | 'missaoConcluida' | 'cenaVista', lista: Opcao[]) => (
    <Campo rotulo={rotulo}>
      <select aria-label={rotulo} value={c[chave] ?? ''} disabled={!podeEditar} onChange={(e) => atualizar(chave, (cond) => { if (e.target.value) cond[chave] = e.target.value; else delete cond[chave]; })} className={CAMPO} style={estilo}>
        <option value="">Sem exigência</option>
        {c[chave] && !lista.some((m) => m.id === c[chave]) && <option value={c[chave]}>{c[chave]}</option>}
        {lista.map((m) => <option key={m.id} value={m.id}>{m.nome} ({m.id})</option>)}
      </select>
    </Campo>
  );
  return (
    <details className="rounded-sm border p-1.5" style={{ borderColor: `${OURO}33` }} open={Boolean(o.condicao)}>
      <summary className="text-[11px] font-bold cursor-pointer">Condição para valer {o.condicao ? '(ligada)' : '(nenhuma)'}</summary>
      <div className="flex flex-col gap-1.5 mt-1.5">
        {seletor('Missão em andamento', 'missaoAtiva', missoes)}
        {seletor('Missão concluída', 'missaoConcluida', missoes)}
        {seletor('Cena já vista', 'cenaVista', cenas)}
        <div className="grid grid-cols-[1fr_4.5rem] gap-1.5">
          <Campo rotulo="Item na mochila (chave)">
            <select aria-label="Item da condição" value={c.item?.id ?? ''} disabled={!podeEditar} onChange={(e) => atualizar('item', (cond) => { if (e.target.value) cond.item = { id: e.target.value, qtd: cond.item?.qtd ?? 1 }; else delete cond.item; })} className={CAMPO} style={estilo}>
              <option value="">Sem exigência</option>
              {c.item && !materiais.some((m) => m.id === c.item?.id) && <option value={c.item.id}>{c.item.id}</option>}
              {materiais.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Qtd">
            <input aria-label="Quantidade do item da condição" type="number" min={1} value={c.item?.qtd ?? 1} disabled={!podeEditar || !c.item} onChange={(e) => atualizar('item', (cond) => { if (cond.item) cond.item = { ...cond.item, qtd: Number(e.target.value) }; })} className={CAMPO} style={estilo} />
          </Campo>
        </div>
        <Campo rotulo="Nível mínimo (0 = sem exigência)">
          <input aria-label="Nível mínimo da condição" type="number" min={0} max={30} value={c.nivelMinimo ?? 0} disabled={!podeEditar} onChange={(e) => atualizar('nivelMinimo', (cond) => { const n = Number(e.target.value); if (n > 0) cond.nivelMinimo = n; else delete cond.nivelMinimo; })} className={CAMPO} style={estilo} />
        </Campo>
        <Campo rotulo="Mensagem quando bloqueado (vazio = padrão)">
          <input aria-label="Mensagem do bloqueio" value={c.mensagem ?? ''} maxLength={200} disabled={!podeEditar} onChange={(e) => atualizar('mensagem', (cond) => { if (e.target.value) cond.mensagem = e.target.value; else delete cond.mensagem; })} className={CAMPO} style={estilo} />
        </Campo>
      </div>
    </details>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return <label className="text-[10px] flex flex-col gap-0.5">{rotulo}{children}</label>;
}
