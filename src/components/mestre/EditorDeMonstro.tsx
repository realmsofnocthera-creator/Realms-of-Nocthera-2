'use client';

import React, { useState } from 'react';
import { ATTRIBUTES } from '@/rules/attributes';
import { CORPOS, NOMES_TIPO_GOLPE, CATEGORIAS_CORPORAIS, type CategoriaCorporal, type TipoGolpe } from '@/rules/corposMonstros';
import { ELEMENTOS, type Elemento } from '@/rules/elements';
import { EFEITOS_STATUS, type EfeitoStatus } from '@/rules/statusEffects';
import { EFEITOS_DE_STATUS, TIPOS_DE_GOLPE, validarMonstro, type MonstroDados } from '@/rules/monstroConteudo';
import { NOCTHERA_THEME } from '@/theme/theme';
import { Cartao, OURO, VERMELHO } from '@/components/mestre/comum';

const NOME_ELEMENTO: Record<Elemento, string> = {
  fogo: 'Fogo', gelo: 'Gelo', relampago: 'Relâmpago', terra: 'Terra', vento: 'Vento', sagrado: 'Sagrado', sombrio: 'Sombrio',
};

const CAMPO = 'rounded-sm border px-2 py-1 text-[12px] w-full disabled:opacity-60';
const estiloDoCampo = (colors: typeof NOCTHERA_THEME.colors) => ({ backgroundColor: colors.background.primary, borderColor: `${OURO}66`, color: colors.text.primary });
const paraNumero = (v: string) => (v === '' ? 0 : Number(v));

// Fora do componente de propósito: definidos dentro, seriam recriados a cada tecla e o campo perderia o foco.
function Num({ rotulo, valor, aoMudar, min = 0, desabilitado }: { rotulo: string; valor: number; aoMudar: (n: number) => void; min?: number; desabilitado: boolean }) {
  return (
    <label className="text-[11px] flex flex-col gap-0.5">{rotulo}
      <input type="number" step={1} min={min} value={valor} disabled={desabilitado} onChange={(e) => aoMudar(paraNumero(e.target.value))} className={CAMPO} style={estiloDoCampo(NOCTHERA_THEME.colors)} />
    </label>
  );
}

function Marca({ rotulo, marcado, aoMudar, desabilitado }: { rotulo: string; marcado: boolean; aoMudar: () => void; desabilitado: boolean }) {
  return (
    <label className="text-[11px] inline-flex items-center gap-1">
      <input type="checkbox" checked={marcado} disabled={desabilitado} onChange={aoMudar} /> {rotulo}
    </label>
  );
}

function alternar<T>(lista: T[], item: T): T[] {
  return lista.includes(item) ? lista.filter((x) => x !== item) : [...lista, item];
}

/**
 * Edita os números e as características de um monstro do banco (3.5.3.1). Salva só o rascunho; publicar é no painel.
 * Habilidades, passivas e mecânicas dos chefes continuam no código e não aparecem aqui.
 */
export function EditorDeMonstro({
  inicial,
  podeEditar,
  doCodigo,
  salvar,
}: {
  inicial: MonstroDados;
  podeEditar: boolean;
  /** O monstro tem o mesmo id de um monstro do código: os dados abaixo substituem os dele. */
  doCodigo: boolean;
  salvar: (dados: MonstroDados) => Promise<string | null>;
}) {
  const { colors } = NOCTHERA_THEME;
  const [d, setD] = useState<MonstroDados>(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const campo = CAMPO;
  const estiloCampo = estiloDoCampo(colors);
  return (
    <Cartao titulo="Dados do monstro">
      <p className="text-[11px]" style={{ color: colors.text.secondary }}>
        {doCodigo
          ? 'Este monstro existe no código: o que você publicar aqui substitui os números dele. Habilidades, passivas e mecânicas continuam as do código.'
          : 'Monstro novo (só existe no banco). Ainda não tem habilidades próprias.'}
      </p>
      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setErro(null);
          setAviso(null);
          const v = validarMonstro(d);
          if (!v.ok) return setErro(v.erros.join(' '));
          setOcupado(true);
          const falha = await salvar(v.dados);
          setOcupado(false);
          if (falha) setErro(falha);
          else setAviso('Rascunho salvo. Para o jogo ver, publique abaixo.');
        }}
      >
        <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
          <label className="text-[11px] flex flex-col gap-0.5 col-span-2">Nome
            <input value={d.nome} disabled={!podeEditar} onChange={(e) => setD({ ...d, nome: e.target.value })} className={campo} style={estiloCampo} />
          </label>
          <Num desabilitado={!podeEditar} rotulo="Nível" valor={d.nivel} min={1} aoMudar={(n) => setD({ ...d, nivel: n })} />
          <Num desabilitado={!podeEditar} rotulo="Vida (HP)" valor={d.hp} min={1} aoMudar={(n) => setD({ ...d, hp: n })} />
          <Num desabilitado={!podeEditar} rotulo="Defesa (mitigação)" valor={d.mitigacao} aoMudar={(n) => setD({ ...d, mitigacao: n })} />
          <Num desabilitado={!podeEditar} rotulo="XP concedido" valor={d.xpConcedido} aoMudar={(n) => setD({ ...d, xpConcedido: n })} />
          <Num desabilitado={!podeEditar} rotulo="Ouro mínimo" valor={d.ouroConcedido.min} aoMudar={(n) => setD({ ...d, ouroConcedido: { ...d.ouroConcedido, min: n } })} />
          <Num desabilitado={!podeEditar} rotulo="Ouro máximo" valor={d.ouroConcedido.max} aoMudar={(n) => setD({ ...d, ouroConcedido: { ...d.ouroConcedido, max: n } })} />
        </div>

        <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
          <label className="text-[11px] flex flex-col gap-0.5 col-span-2">Categoria corporal
            <select value={d.categoriaCorporal} disabled={!podeEditar} onChange={(e) => setD({ ...d, categoriaCorporal: e.target.value as CategoriaCorporal })} className={campo} style={estiloCampo}>
              {CATEGORIAS_CORPORAIS.map((c) => <option key={c} value={c}>{CORPOS[c].nome}</option>)}
            </select>
          </label>
          <label className="text-[11px] flex flex-col gap-0.5 col-span-2">Elemento do ataque
            <select value={d.elementoAtaque ?? ''} disabled={!podeEditar} onChange={(e) => setD({ ...d, elementoAtaque: (e.target.value || null) as Elemento | null })} className={campo} style={estiloCampo}>
              <option value="">Nenhum</option>
              {ELEMENTOS.map((el) => <option key={el} value={el}>{NOME_ELEMENTO[el]}</option>)}
            </select>
          </label>
        </div>

        <fieldset className="flex flex-col gap-1">
          <legend className="text-[11px] font-bold">Atributos</legend>
          <div className="grid gap-2 grid-cols-3 md:grid-cols-7">
            {ATTRIBUTES.map((a) => <Num desabilitado={!podeEditar} key={a} rotulo={a} valor={d.atributos[a]} aoMudar={(n) => setD({ ...d, atributos: { ...d.atributos, [a]: n } })} />)}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-1">
          <legend className="text-[11px] font-bold">Fraquezas (+) e resistências (−) elementais, em %</legend>
          <div className="grid gap-2 grid-cols-3 md:grid-cols-7">
            {ELEMENTOS.map((el) => (
              <Num desabilitado={!podeEditar} key={el} rotulo={NOME_ELEMENTO[el]} min={-100} valor={d.modificadoresElementais[el] ?? 0} aoMudar={(n) => setD({ ...d, modificadoresElementais: { ...d.modificadoresElementais, [el]: n } })} />
            ))}
          </div>
          <p className="text-[10px]" style={{ color: colors.text.secondary }}>40 = fraqueza, −40 = resistência forte, −90 = quase imune. Zero tira o modificador.</p>
        </fieldset>

        <div className="grid gap-3 md:grid-cols-2">
          <fieldset className="flex flex-col gap-1">
            <legend className="text-[11px] font-bold">Status que o ataque aplica</legend>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {EFEITOS_DE_STATUS.map((s: EfeitoStatus) => <Marca desabilitado={!podeEditar} key={s} rotulo={EFEITOS_STATUS[s].nome} marcado={d.efeitosAplicados.includes(s)} aoMudar={() => setD({ ...d, efeitosAplicados: alternar(d.efeitosAplicados, s) })} />)}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-1">
            <legend className="text-[11px] font-bold">Imune aos status</legend>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {EFEITOS_DE_STATUS.map((s: EfeitoStatus) => <Marca desabilitado={!podeEditar} key={s} rotulo={EFEITOS_STATUS[s].nome} marcado={d.imunidadesStatus.includes(s)} aoMudar={() => setD({ ...d, imunidadesStatus: alternar(d.imunidadesStatus, s) })} />)}
            </div>
          </fieldset>
        </div>

        {d.categoriaCorporal === 'aberrante' && (
          <div className="grid gap-3 md:grid-cols-2">
            <fieldset className="flex flex-col gap-1">
              <legend className="text-[11px] font-bold">Fraco a (Aberrante)</legend>
              <div className="flex flex-wrap gap-x-3">
                {TIPOS_DE_GOLPE.map((t: TipoGolpe) => <Marca desabilitado={!podeEditar} key={t} rotulo={NOMES_TIPO_GOLPE[t]} marcado={d.fraquezasProprias.includes(t)} aoMudar={() => setD({ ...d, fraquezasProprias: alternar(d.fraquezasProprias, t) })} />)}
              </div>
            </fieldset>
            <fieldset className="flex flex-col gap-1">
              <legend className="text-[11px] font-bold">Resistente a (Aberrante)</legend>
              <div className="flex flex-wrap gap-x-3">
                {TIPOS_DE_GOLPE.map((t: TipoGolpe) => <Marca desabilitado={!podeEditar} key={t} rotulo={NOMES_TIPO_GOLPE[t]} marcado={d.resistenciasProprias.includes(t)} aoMudar={() => setD({ ...d, resistenciasProprias: alternar(d.resistenciasProprias, t) })} />)}
              </div>
            </fieldset>
          </div>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <Marca desabilitado={!podeEditar} rotulo="Chefe (imune a Sono, Paralisia e Congelamento)" marcado={d.chefe} aoMudar={() => setD({ ...d, chefe: !d.chefe })} />
          <Marca desabilitado={!podeEditar} rotulo="Enfurecido (+20% de dano abaixo de 50% de HP)" marcado={d.enfurecido} aoMudar={() => setD({ ...d, enfurecido: !d.enfurecido })} />
          <Marca desabilitado={!podeEditar} rotulo="Ativo (desmarcado = fora de uso)" marcado={d.ativo} aoMudar={() => setD({ ...d, ativo: !d.ativo })} />
        </div>

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
