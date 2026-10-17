'use client';

import React, { useState } from 'react';
import { NOME_DO_TIPO_DE_ANUNCIO, TEXTO_MAXIMO, TIPOS_DE_ANUNCIO, TITULO_MAXIMO, validarAnuncio, type AnuncioDados, type TipoDeAnuncio } from '@/rules/anuncio';
import { deCampoDeData, paraCampoDeData } from '@/lib/anunciosTela';
import { NOCTHERA_THEME } from '@/theme/theme';
import { Cartao, OURO, VERMELHO } from '@/components/mestre/comum';

const CAMPO = 'rounded-sm border px-2 py-1 text-[12px] w-full disabled:opacity-60';

/**
 * Edita um anúncio do Menu (3.5.3.4): título, texto, tipo e a janela de exibição (início e fim, no horário do seu
 * aparelho). Salva só o rascunho; publicar é no painel. Um anúncio do tipo Evento só avisa, não muda regras do jogo.
 */
export function EditorDeAnuncio({ inicial, podeEditar, salvar }: { inicial: AnuncioDados; podeEditar: boolean; salvar: (dados: AnuncioDados) => Promise<string | null> }) {
  const { colors } = NOCTHERA_THEME;
  const estilo = { backgroundColor: colors.background.primary, borderColor: `${OURO}66`, color: colors.text.primary };
  const [d, setD] = useState<AnuncioDados>(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  return (
    <Cartao titulo="Dados do anúncio">
      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setErro(null);
          setAviso(null);
          const v = validarAnuncio(d);
          if (!v.ok) return setErro(v.erros.join(' '));
          setOcupado(true);
          const falha = await salvar(v.dados);
          setOcupado(false);
          if (falha) setErro(falha);
          else setAviso('Rascunho salvo. Para o jogo ver, publique abaixo.');
        }}
      >
        <div className="grid gap-2 grid-cols-1 md:grid-cols-[1fr_12rem]">
          <label className="text-[11px] flex flex-col gap-0.5">Título ({d.titulo.length}/{TITULO_MAXIMO})
            <input value={d.titulo} maxLength={TITULO_MAXIMO} disabled={!podeEditar} onChange={(e) => setD({ ...d, titulo: e.target.value })} className={CAMPO} style={estilo} />
          </label>
          <label className="text-[11px] flex flex-col gap-0.5">Tipo
            <select value={d.tipo} disabled={!podeEditar} onChange={(e) => setD({ ...d, tipo: e.target.value as TipoDeAnuncio })} className={CAMPO} style={estilo}>
              {TIPOS_DE_ANUNCIO.map((t) => <option key={t} value={t}>{NOME_DO_TIPO_DE_ANUNCIO[t]}</option>)}
            </select>
          </label>
        </div>
        <label className="text-[11px] flex flex-col gap-0.5">Texto ({d.texto.length}/{TEXTO_MAXIMO})
          <textarea value={d.texto} rows={6} maxLength={TEXTO_MAXIMO} disabled={!podeEditar} onChange={(e) => setD({ ...d, texto: e.target.value })} className={CAMPO} style={estilo} />
        </label>
        <div className="grid gap-2 grid-cols-1 md:grid-cols-2">
          <label className="text-[11px] flex flex-col gap-0.5">Aparece a partir de (vazio = já)
            <input type="datetime-local" value={paraCampoDeData(d.inicio)} disabled={!podeEditar} onChange={(e) => setD({ ...d, inicio: deCampoDeData(e.target.value) })} className={CAMPO} style={estilo} />
          </label>
          <label className="text-[11px] flex flex-col gap-0.5">Some em (vazio = sem fim)
            <input type="datetime-local" value={paraCampoDeData(d.fim)} disabled={!podeEditar} onChange={(e) => setD({ ...d, fim: deCampoDeData(e.target.value) })} className={CAMPO} style={estilo} />
          </label>
        </div>
        <p className="text-[10px]" style={{ color: colors.text.secondary }}>As datas valem no horário do seu aparelho e são mostradas ao jogador no horário de Brasília. O anúncio só aparece depois de publicado, dentro dessa janela.</p>
        <label className="text-[11px] inline-flex items-center gap-1">
          <input type="checkbox" checked={d.ativo} disabled={!podeEditar} onChange={() => setD({ ...d, ativo: !d.ativo })} /> Ativo (desmarcado e publicado = tira o anúncio do ar)
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
