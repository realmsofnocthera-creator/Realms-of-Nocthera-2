'use client';

import React, { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { CATEGORIAS_ARMA, RARIDADES_ARMA, type ItemReceita, type RaridadeArma, type ReceitaArma } from '@/rules/armas';
import { RARIDADES_MATERIAL, type RaridadeMaterial } from '@/rules/raridades';
import { ITENS_MAXIMOS_NA_RECEITA, validarArma, type ArmaDados } from '@/rules/armaConteudo';
import { NOCTHERA_THEME } from '@/theme/theme';
import { Cartao, OURO, VERMELHO } from '@/components/mestre/comum';

const CAMPO = 'rounded-sm border px-2 py-1 text-[12px] w-full disabled:opacity-60';
const estiloDoCampo = (colors: typeof NOCTHERA_THEME.colors) => ({ backgroundColor: colors.background.primary, borderColor: `${OURO}66`, color: colors.text.primary });

/** Fora do componente de propósito: definida dentro, seria recriada a cada tecla e o campo perderia o foco. */
function ListaDeMateriais({
  rotulo,
  itens,
  listaId,
  desabilitado,
  aoMudar,
}: {
  rotulo: string;
  itens: readonly ItemReceita[];
  listaId: string;
  desabilitado: boolean;
  aoMudar: (itens: ItemReceita[]) => void;
}) {
  const { colors } = NOCTHERA_THEME;
  const estilo = estiloDoCampo(colors);
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="text-[11px] font-bold">{rotulo}</legend>
      {itens.map((item, i) => (
        <div key={i} className="grid grid-cols-[1fr_5rem_auto] gap-1.5 items-center">
          <input list={listaId} value={item.id} disabled={desabilitado} onChange={(e) => aoMudar(itens.map((x, j) => (j === i ? { ...x, id: e.target.value } : x)))} className={CAMPO} style={estilo} aria-label={`${rotulo}: material ${i + 1}`} />
          <input type="number" min={1} step={1} value={item.qtd} disabled={desabilitado} onChange={(e) => aoMudar(itens.map((x, j) => (j === i ? { ...x, qtd: Number(e.target.value) || 0 } : x)))} className={CAMPO} style={estilo} aria-label={`${rotulo}: quantidade ${i + 1}`} />
          {!desabilitado && (
            <button type="button" onClick={() => aoMudar(itens.filter((_, j) => j !== i))} aria-label="Tirar material" className="p-1"><X className="w-3.5 h-3.5" /></button>
          )}
        </div>
      ))}
      {!desabilitado && itens.length < ITENS_MAXIMOS_NA_RECEITA && (
        <button type="button" onClick={() => aoMudar([...itens, { id: '', qtd: 1 }])} className="self-start inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px]" style={{ borderColor: `${OURO}66` }}>
          <Plus className="w-3 h-3" /> Material
        </button>
      )}
    </fieldset>
  );
}

/** Receita de uma arma ou peça: ouro, diversos e as duas listas de materiais (com a lista de ids para autocompletar). */
export function EditorDeReceita({ receita, podeEditar, aoMudar }: { receita: ReceitaArma; podeEditar: boolean; aoMudar: (r: ReceitaArma) => void }) {
  const { colors } = NOCTHERA_THEME;
  const estilo = estiloDoCampo(colors);
  const [materiais, setMateriais] = useState<{ monstro: { id: string; nome: string }[]; mundo: { id: string; nome: string }[] }>({ monstro: [], mundo: [] });

  useEffect(() => {
    void Promise.all([import('@/rules/materiais'), import('@/rules/materiaisArmas')]).then(([m, w]) =>
      setMateriais({ monstro: m.MATERIAIS.map((x) => ({ id: x.id, nome: x.nome })), mundo: w.MATERIAIS_MUNDO.map((x) => ({ id: x.id, nome: x.nome })) })
    );
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <datalist id="materiais-monstro">{materiais.monstro.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}</datalist>
      <datalist id="materiais-mundo">{materiais.mundo.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}</datalist>
      <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
        <label className="text-[11px] flex flex-col gap-0.5">Ouro da receita
          <input type="number" min={0} step={1} value={receita.ouro} disabled={!podeEditar} onChange={(e) => aoMudar({ ...receita, ouro: Number(e.target.value) || 0 })} className={CAMPO} style={estilo} />
        </label>
        <label className="text-[11px] flex flex-col gap-0.5">Diversos (raridade)
          <select
            value={receita.diversos?.raridade ?? ''}
            disabled={!podeEditar}
            onChange={(e) => aoMudar({ ...receita, diversos: e.target.value ? { raridade: e.target.value as RaridadeMaterial, qtd: receita.diversos?.qtd ?? 1 } : null })}
            className={CAMPO}
            style={estilo}
          >
            <option value="">Nenhum</option>
            {RARIDADES_MATERIAL.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
          </select>
        </label>
        {receita.diversos && (
          <label className="text-[11px] flex flex-col gap-0.5">Diversos (quantidade)
            <input type="number" min={1} step={1} value={receita.diversos.qtd} disabled={!podeEditar} onChange={(e) => aoMudar({ ...receita, diversos: { raridade: receita.diversos!.raridade, qtd: Number(e.target.value) || 0 } })} className={CAMPO} style={estilo} />
          </label>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <ListaDeMateriais rotulo="Materiais do monstro" itens={receita.materiaisMonstro} listaId="materiais-monstro" desabilitado={!podeEditar} aoMudar={(itens) => aoMudar({ ...receita, materiaisMonstro: itens })} />
        <ListaDeMateriais rotulo="Materiais do mundo" itens={receita.materiaisMundo} listaId="materiais-mundo" desabilitado={!podeEditar} aoMudar={(itens) => aoMudar({ ...receita, materiaisMundo: itens })} />
      </div>
    </div>
  );
}

/**
 * Edita nomes, raridade, receita e o estado "ativo" de uma arma do catálogo (3.5.3.2). Salva só o rascunho;
 * publicar é no painel. Elemento, status, estrela e a árvore continuam no código.
 */
export function EditorDeArma({ inicial, podeEditar, salvar }: { inicial: ArmaDados; podeEditar: boolean; salvar: (dados: ArmaDados) => Promise<string | null> }) {
  const { colors } = NOCTHERA_THEME;
  const estilo = estiloDoCampo(colors);
  const [d, setD] = useState<ArmaDados>(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  return (
    <Cartao titulo="Dados da arma">
      <p className="text-[11px]" style={{ color: colors.text.secondary }}>
        O que você publicar aqui substitui nomes, raridade e receita desta arma. Elemento, status, estrela e a árvore de evolução continuam no código.
      </p>
      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setErro(null);
          setAviso(null);
          const v = validarArma(d);
          if (!v.ok) return setErro(v.erros.join(' '));
          setOcupado(true);
          const falha = await salvar(v.dados);
          setOcupado(false);
          if (falha) setErro(falha);
          else setAviso('Rascunho salvo. Para o jogo ver, publique abaixo.');
        }}
      >
        <div className="grid gap-2 grid-cols-1 md:grid-cols-3">
          {CATEGORIAS_ARMA.map((c) => (
            <label key={c.id} className="text-[11px] flex flex-col gap-0.5">Nome ({c.nome})
              <input value={d.nomes[c.id]} disabled={!podeEditar} onChange={(e) => setD({ ...d, nomes: { ...d.nomes, [c.id]: e.target.value } })} className={CAMPO} style={estilo} />
            </label>
          ))}
        </div>

        <label className="text-[11px] flex flex-col gap-0.5 max-w-xs">Raridade
          <select value={d.raridade} disabled={!podeEditar} onChange={(e) => setD({ ...d, raridade: e.target.value as RaridadeArma })} className={CAMPO} style={estilo}>
            {RARIDADES_ARMA.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
          </select>
        </label>

        <EditorDeReceita receita={d.receita} podeEditar={podeEditar} aoMudar={(receita) => setD({ ...d, receita })} />

        <label className="text-[11px] inline-flex items-center gap-1">
          <input type="checkbox" checked={d.ativo} disabled={!podeEditar} onChange={() => setD({ ...d, ativo: !d.ativo })} /> Ativo (desmarcado = não dá mais para fabricar; quem já tem continua com a arma)
        </label>

        {podeEditar && (
          <button type="submit" disabled={ocupado} className="self-start px-3 py-1.5 rounded font-cinzel font-bold text-xs disabled:opacity-50" style={{ backgroundColor: colors.accent.primary, color: colors.background.secondary }}>
            {ocupado ? 'Salvando...' : 'Salvar rascunho'}
          </button>
        )}
        {aviso && <p role="status" className="text-[12px] font-semibold" style={{ color: '#7BC47F' }}>{aviso}</p>}
        {erro && <p role="alert" className="text-[12px] font-semibold" style={{ color: VERMELHO }}>{erro}</p>}
      </form>
    </Cartao>
  );
}
