'use client';

import React, { useState } from 'react';
import {
  ID_DO_JOGADOR,
  MAXIMO_DE_PERSONAGENS,
  MAXIMO_DE_TELAS,
  NOME_DO_PERSONAGEM_MAXIMO,
  TEXTO_DA_TELA_MAXIMO,
  TEXTO_PROVISORIO,
  TITULO_DA_CENA_MAXIMO,
  validarCena,
  type CenaDados,
  type TelaDaCena,
} from '@/rules/cena';
import { prepararImagemDeCena, type PapelDaImagem } from '@/lib/imagemDeCena';
import { sugerirIdentificador } from '@/lib/conteudoTela';
import { CenaPlayer } from '@/components/cena/CenaPlayer';
import { NOCTHERA_THEME } from '@/theme/theme';
import { Cartao, OURO, VERMELHO } from '@/components/mestre/comum';

const CAMPO = 'rounded-sm border px-2 py-1 text-[12px] w-full disabled:opacity-60';

/**
 * Edita uma cena (cutscene ou diálogo): personagens (nome + retrato) e telas (narração ou fala, com fundo opcional).
 * Salva só o rascunho; publicar é no painel. "Ver a cena" toca o rascunho como o jogador verá, antes de salvar.
 */
export function EditorDeCena({
  inicial,
  podeEditar,
  salvar,
  enviarImagem,
}: {
  inicial: CenaDados;
  podeEditar: boolean;
  salvar: (dados: CenaDados) => Promise<string | null>;
  /** Envia a imagem já preparada e devolve o endereço dela, ou lança um Error com a mensagem para mostrar. */
  enviarImagem: (imagem: Blob) => Promise<string>;
}) {
  const { colors } = NOCTHERA_THEME;
  const estilo = { backgroundColor: colors.background.primary, borderColor: `${OURO}66`, color: colors.text.primary };
  const [d, setD] = useState<CenaDados>(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [vendo, setVendo] = useState(false);

  const trocarTela = (i: number, nova: TelaDaCena) => setD({ ...d, telas: d.telas.map((t, j) => (j === i ? nova : t)) });
  const mover = (i: number, passo: -1 | 1) => {
    const j = i + passo;
    if (j < 0 || j >= d.telas.length) return;
    const telas = [...d.telas];
    [telas[i], telas[j]] = [telas[j], telas[i]];
    setD({ ...d, telas });
  };

  async function enviar(arquivo: File | undefined, papel: PapelDaImagem, chave: string, aplicar: (url: string) => void) {
    if (!arquivo) return;
    setErro(null);
    setEnviando(chave);
    try {
      const blob = await prepararImagemDeCena(arquivo, papel);
      aplicar(await enviarImagem(blob));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar a imagem.');
    } finally {
      setEnviando(null);
    }
  }

  const nomeDoFalante = (id: string) => (id === ID_DO_JOGADOR ? 'Jogador' : (d.personagens.find((p) => p.id === id)?.nome ?? id));

  return (
    <>
      <Cartao titulo="Cena">
        <form
          className="flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setErro(null);
            setAviso(null);
            const v = validarCena(d);
            if (!v.ok) return setErro(v.erros.join(' '));
            setOcupado(true);
            const falha = await salvar(v.dados);
            setOcupado(false);
            if (falha) setErro(falha);
            else setAviso('Rascunho salvo. Para o jogo ver, publique abaixo.');
          }}
        >
          <label className="text-[11px] flex flex-col gap-0.5">Título ({d.titulo.length}/{TITULO_DA_CENA_MAXIMO})
            <input value={d.titulo} maxLength={TITULO_DA_CENA_MAXIMO} disabled={!podeEditar} onChange={(e) => setD({ ...d, titulo: e.target.value })} className={CAMPO} style={estilo} />
          </label>

          <fieldset className="flex flex-col gap-2 rounded-sm border p-2" style={{ borderColor: `${OURO}33` }}>
            <legend className="px-1 text-[11px] font-bold">Personagens que falam ({d.personagens.length}/{MAXIMO_DE_PERSONAGENS})</legend>
            <p className="text-[11px]" style={{ color: colors.text.secondary }}>O retrato aparece um pouco acima da caixa de diálogo quando o personagem fala. Fale como "Jogador" para usar o nome de quem está jogando.</p>
            {d.personagens.map((p, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                {p.retrato ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.retrato} alt={`Retrato de ${p.nome}`} className="h-14 w-14 rounded-sm border object-contain" style={{ borderColor: `${OURO}33` }} />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-sm border text-[10px]" style={{ borderColor: `${OURO}33`, color: colors.text.secondary }}>sem foto</div>
                )}
                <input
                  aria-label={`Nome do personagem ${i + 1}`}
                  value={p.nome}
                  maxLength={NOME_DO_PERSONAGEM_MAXIMO}
                  disabled={!podeEditar}
                  placeholder="Nome"
                  onChange={(e) => setD({ ...d, personagens: d.personagens.map((q, j) => (j === i ? { ...q, nome: e.target.value } : q)) })}
                  className={`${CAMPO} max-w-[12rem]`}
                  style={estilo}
                />
                <label className="text-[11px]">
                  <span className="rounded border px-2 py-1" style={{ borderColor: `${OURO}66`, cursor: podeEditar ? 'pointer' : 'default' }}>
                    {enviando === `p${i}` ? 'Enviando…' : p.retrato ? 'Trocar foto' : 'Colocar foto'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    disabled={!podeEditar}
                    onChange={(e) => {
                      const arquivo = e.target.files?.[0];
                      e.target.value = '';
                      void enviar(arquivo, 'retrato', `p${i}`, (url) => setD((atual) => ({ ...atual, personagens: atual.personagens.map((q, j) => (j === i ? { ...q, retrato: url } : q)) })));
                    }}
                  />
                </label>
                {podeEditar && (
                  <button
                    type="button"
                    className="text-[11px] underline"
                    style={{ color: VERMELHO }}
                    onClick={() => {
                      const usado = d.telas.some((t) => t.tipo === 'fala' && t.personagem === p.id);
                      if (usado) return setErro(`"${p.nome}" ainda fala em alguma tela: troque o falante antes de remover.`);
                      setD({ ...d, personagens: d.personagens.filter((_, j) => j !== i) });
                    }}
                  >
                    Remover
                  </button>
                )}
              </div>
            ))}
            {podeEditar && d.personagens.length < MAXIMO_DE_PERSONAGENS && (
              <button
                type="button"
                className="self-start rounded border px-2 py-1 text-[11px] font-bold"
                style={{ borderColor: `${OURO}66` }}
                onClick={() => {
                  let id = sugerirIdentificador(`personagem ${d.personagens.length + 1}`).slice(0, 24);
                  while (d.personagens.some((p) => p.id === id)) id = `${id.slice(0, 20)}-${Math.floor(Math.random() * 90 + 10)}`;
                  setD({ ...d, personagens: [...d.personagens, { id, nome: `Personagem ${d.personagens.length + 1}` }] });
                }}
              >
                + Personagem
              </button>
            )}
          </fieldset>

          <fieldset className="flex flex-col gap-2 rounded-sm border p-2" style={{ borderColor: `${OURO}33` }}>
            <legend className="px-1 text-[11px] font-bold">Telas ({d.telas.length}/{MAXIMO_DE_TELAS})</legend>
            {d.telas.map((t, i) => (
              <div key={i} className="flex flex-col gap-1.5 rounded-sm border p-2" style={{ borderColor: `${OURO}22` }}>
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <b>Tela {i + 1}</b>
                  <select
                    aria-label={`Tipo da tela ${i + 1}`}
                    value={t.tipo === 'fala' ? `fala:${t.personagem}` : 'narracao'}
                    disabled={!podeEditar}
                    onChange={(e) => {
                      const v = e.target.value;
                      const base = t.fundo !== undefined ? { fundo: t.fundo } : {};
                      trocarTela(i, v === 'narracao' ? { tipo: 'narracao', texto: t.texto, ...base } : { tipo: 'fala', personagem: v.slice(5), texto: t.texto, ...base });
                    }}
                    className={`${CAMPO} max-w-[14rem]`}
                    style={estilo}
                  >
                    <option value="narracao">Narração</option>
                    <option value={`fala:${ID_DO_JOGADOR}`}>Fala: Jogador</option>
                    {d.personagens.map((p) => <option key={p.id} value={`fala:${p.id}`}>Fala: {nomeDoFalante(p.id)}</option>)}
                  </select>
                  {podeEditar && (
                    <>
                      <button type="button" aria-label={`Subir tela ${i + 1}`} onClick={() => mover(i, -1)} disabled={i === 0}>↑</button>
                      <button type="button" aria-label={`Descer tela ${i + 1}`} onClick={() => mover(i, 1)} disabled={i === d.telas.length - 1}>↓</button>
                      <button
                        type="button"
                        className="underline"
                        style={{ color: VERMELHO }}
                        onClick={() => d.telas.length > 1 && setD({ ...d, telas: d.telas.filter((_, j) => j !== i) })}
                        disabled={d.telas.length <= 1}
                      >
                        Remover
                      </button>
                    </>
                  )}
                </div>
                <textarea
                  aria-label={`Texto da tela ${i + 1}`}
                  value={t.texto}
                  rows={3}
                  maxLength={TEXTO_DA_TELA_MAXIMO}
                  disabled={!podeEditar}
                  onChange={(e) => trocarTela(i, { ...t, texto: e.target.value })}
                  className={CAMPO}
                  style={estilo}
                />
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  {t.fundo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.fundo} alt={`Fundo da tela ${i + 1}`} className="h-12 w-20 rounded-sm border object-cover" style={{ borderColor: `${OURO}33` }} />
                  ) : (
                    <span style={{ color: colors.text.secondary }}>{t.fundo === null ? 'Tira o fundo aqui' : 'Mantém o fundo anterior'}</span>
                  )}
                  {podeEditar && (
                    <>
                      <label>
                        <span className="rounded border px-2 py-1" style={{ borderColor: `${OURO}66`, cursor: 'pointer' }}>{enviando === `t${i}` ? 'Enviando…' : 'Novo fundo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(e) => {
                            const arquivo = e.target.files?.[0];
                            e.target.value = '';
                            void enviar(arquivo, 'fundo', `t${i}`, (url) => setD((atual) => ({ ...atual, telas: atual.telas.map((q, j) => (j === i ? { ...q, fundo: url } : q)) })));
                          }}
                        />
                      </label>
                      <button type="button" className="underline" onClick={() => trocarTela(i, { ...t, fundo: null })}>Tirar o fundo</button>
                      {t.fundo !== undefined && <button type="button" className="underline" onClick={() => setD({ ...d, telas: d.telas.map((q, j) => { if (j !== i) return q; const { fundo: _f, ...resto } = q; return resto as TelaDaCena; }) })}>Manter o anterior</button>}
                    </>
                  )}
                </div>
              </div>
            ))}
            {podeEditar && d.telas.length < MAXIMO_DE_TELAS && (
              <button type="button" className="self-start rounded border px-2 py-1 text-[11px] font-bold" style={{ borderColor: `${OURO}66` }} onClick={() => setD({ ...d, telas: [...d.telas, { tipo: 'narracao', texto: TEXTO_PROVISORIO }] })}>
                + Tela
              </button>
            )}
          </fieldset>

          <div className="flex flex-wrap gap-2">
            {podeEditar && (
              <button type="submit" disabled={ocupado} className="px-3 py-1.5 rounded font-cinzel font-bold text-xs disabled:opacity-50" style={{ backgroundColor: colors.accent.primary, color: colors.background.secondary }}>
                {ocupado ? 'Salvando…' : 'Salvar rascunho'}
              </button>
            )}
            <button type="button" className="px-3 py-1.5 rounded border font-cinzel font-bold text-xs" style={{ borderColor: `${OURO}66` }} onClick={() => setVendo(true)}>
              Ver a cena
            </button>
          </div>
          {aviso && <p role="status" className="text-[12px] font-semibold" style={{ color: '#7BC47F' }}>{aviso}</p>}
          {erro && <p role="alert" className="text-[12px] font-semibold" style={{ color: VERMELHO }}>{erro}</p>}
        </form>
      </Cartao>
      {vendo && <CenaPlayer cena={d} jogador={{ nome: 'Seu personagem' }} aoTerminar={() => setVendo(false)} />}
    </>
  );
}
