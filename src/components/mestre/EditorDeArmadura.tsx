'use client';

import React, { useState } from 'react';
import { RARIDADES_ARMA, type RaridadeArma } from '@/rules/armas';
import { validarArmadura, type ArmaduraDados } from '@/rules/armaduraConteudo';
import { NOCTHERA_THEME } from '@/theme/theme';
import { Cartao, OURO, VERMELHO } from '@/components/mestre/comum';
import { EditorDeReceita } from '@/components/mestre/EditorDeArma';

const CAMPO = 'rounded-sm border px-2 py-1 text-[12px] w-full disabled:opacity-60';

/** Edita nome, raridade, receita e "ativo" de uma peça de armadura (3.5.3.2). Salva só o rascunho; publicar é no painel. */
export function EditorDeArmadura({ inicial, podeEditar, salvar }: { inicial: ArmaduraDados; podeEditar: boolean; salvar: (dados: ArmaduraDados) => Promise<string | null> }) {
  const { colors } = NOCTHERA_THEME;
  const estilo = { backgroundColor: colors.background.primary, borderColor: `${OURO}66`, color: colors.text.primary };
  const [d, setD] = useState<ArmaduraDados>(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  return (
    <Cartao titulo="Dados da peça">
      <p className="text-[11px]" style={{ color: colors.text.secondary }}>
        O que você publicar aqui substitui nome, raridade e receita desta peça. Conjunto, espaço, estrela e habilidades continuam no código.
      </p>
      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setErro(null);
          setAviso(null);
          const v = validarArmadura(d);
          if (!v.ok) return setErro(v.erros.join(' '));
          setOcupado(true);
          const falha = await salvar(v.dados);
          setOcupado(false);
          if (falha) setErro(falha);
          else setAviso('Rascunho salvo. Para o jogo ver, publique abaixo.');
        }}
      >
        <div className="grid gap-2 grid-cols-1 md:grid-cols-2">
          <label className="text-[11px] flex flex-col gap-0.5">Nome
            <input value={d.nome} disabled={!podeEditar} onChange={(e) => setD({ ...d, nome: e.target.value })} className={CAMPO} style={estilo} />
          </label>
          <label className="text-[11px] flex flex-col gap-0.5">Raridade
            <select value={d.raridade} disabled={!podeEditar} onChange={(e) => setD({ ...d, raridade: e.target.value as RaridadeArma })} className={CAMPO} style={estilo}>
              {RARIDADES_ARMA.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
            </select>
          </label>
        </div>
        <EditorDeReceita receita={d.receita} podeEditar={podeEditar} aoMudar={(receita) => setD({ ...d, receita })} />
        <label className="text-[11px] inline-flex items-center gap-1">
          <input type="checkbox" checked={d.ativo} disabled={!podeEditar} onChange={() => setD({ ...d, ativo: !d.ativo })} /> Ativo (desmarcado = não dá mais para fabricar; quem já tem continua com a peça)
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
