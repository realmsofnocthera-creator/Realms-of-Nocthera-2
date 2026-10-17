'use client';

import React, { useState } from 'react';
import { ATTRIBUTES, type AttributeName } from '@/rules/attributes';
import { validarEmblema, type EmblemaDados } from '@/rules/emblemaConteudo';
import { NOCTHERA_THEME } from '@/theme/theme';
import { Cartao, OURO, VERMELHO } from '@/components/mestre/comum';

const CAMPO = 'rounded-sm border px-2 py-1 text-[12px] w-full disabled:opacity-60';

/**
 * Edita nome, lore, os 3 atributos e os textos das habilidades de um emblema (3.5.3.2). Salva só o rascunho.
 * Raridade, estrelas e os efeitos no combate continuam no código: mudar o texto não muda o que a habilidade faz.
 */
export function EditorDeEmblema({ inicial, podeEditar, salvar }: { inicial: EmblemaDados; podeEditar: boolean; salvar: (dados: EmblemaDados) => Promise<string | null> }) {
  const { colors } = NOCTHERA_THEME;
  const estilo = { backgroundColor: colors.background.primary, borderColor: `${OURO}66`, color: colors.text.primary };
  const [d, setD] = useState<EmblemaDados>(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  return (
    <Cartao titulo="Dados do emblema">
      <p className="text-[11px]" style={{ color: colors.text.secondary }}>
        Atenção: o efeito de cada habilidade no combate continua o do código. Mudar o texto aqui muda o que o jogador lê, não o que a habilidade faz.
      </p>
      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setErro(null);
          setAviso(null);
          const v = validarEmblema(d);
          if (!v.ok) return setErro(v.erros.join(' '));
          setOcupado(true);
          const falha = await salvar(v.dados);
          setOcupado(false);
          if (falha) setErro(falha);
          else setAviso('Rascunho salvo. Para o jogo ver, publique abaixo.');
        }}
      >
        <label className="text-[11px] flex flex-col gap-0.5">Nome
          <input value={d.nome} disabled={!podeEditar} onChange={(e) => setD({ ...d, nome: e.target.value })} className={CAMPO} style={estilo} />
        </label>
        <label className="text-[11px] flex flex-col gap-0.5">Lore
          <textarea value={d.lore} disabled={!podeEditar} rows={3} onChange={(e) => setD({ ...d, lore: e.target.value })} className={CAMPO} style={estilo} />
        </label>
        <fieldset className="grid gap-2 grid-cols-3">
          <legend className="text-[11px] font-bold">Atributos que o emblema soma</legend>
          {[0, 1, 2].map((i) => (
            <select
              key={i}
              aria-label={`Atributo ${i + 1}`}
              value={d.atributos[i]}
              disabled={!podeEditar}
              onChange={(e) => {
                const atributos = [...d.atributos] as EmblemaDados['atributos'];
                atributos[i] = e.target.value as AttributeName;
                setD({ ...d, atributos });
              }}
              className={CAMPO}
              style={estilo}
            >
              {ATTRIBUTES.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          ))}
        </fieldset>
        {d.habilidades.map((h, i) => (
          <fieldset key={i} className="flex flex-col gap-1 rounded-sm border p-2" style={{ borderColor: `${OURO}33` }}>
            <legend className="text-[11px] font-bold px-1">Habilidade da {i + 1}ª estrela</legend>
            <input aria-label={`Nome da habilidade ${i + 1}`} value={h.nome} disabled={!podeEditar} onChange={(e) => setD({ ...d, habilidades: d.habilidades.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)) })} className={CAMPO} style={estilo} />
            <textarea aria-label={`Descrição da habilidade ${i + 1}`} value={h.descricao} disabled={!podeEditar} rows={3} onChange={(e) => setD({ ...d, habilidades: d.habilidades.map((x, j) => (j === i ? { ...x, descricao: e.target.value } : x)) })} className={CAMPO} style={estilo} />
          </fieldset>
        ))}
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
