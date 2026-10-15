'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, History, PencilRuler, Plus, Upload } from 'lucide-react';
import { LADO_MAXIMO_DO_MAPA, LADO_MINIMO_DO_MAPA, mapaVazio, TAMANHOS_DE_TILE, TILE_PADRAO, type MapaDados } from '@/rules/mapa';
import type { TilesetDados } from '@/rules/tileset';
import { NOME_DO_TIPO, type TipoDeConteudo } from '@/rules/conteudo';
import { situacaoDoConteudo, descreverVersao, sugerirIdentificador } from '@/lib/conteudoTela';
import { dataDoLog } from '@/lib/mestreTela';
import type { ConteudoDocumento, ResumoConteudo, ResumoVersao } from '@/server/persistencia/tipos';
import { NOCTHERA_THEME } from '@/theme/theme';
import { Cartao, chamar, OURO, VERMELHO } from '@/components/mestre/comum';
import type { SessaoDoPainel } from '@/components/mestre/MestrePainel';
import { ImportarTileset } from '@/components/mestre/ImportarTileset';

type Token = () => Promise<string>;

const COR_DA_SITUACAO = { rascunho: '#9AA0A6', 'no-ar': '#7BC47F', mudancas: '#E6C775' } as const;

function resumoDosDados(tipo: TipoDeConteudo, dados: unknown): string {
  if (tipo === 'mapa') {
    const m = dados as MapaDados;
    return `${m.largura} × ${m.altura} tiles de ${m.tamanhoDoTile} px · ${m.tilesets.length} tileset(s)`;
  }
  const t = dados as TilesetDados;
  return `${t.larguraImagem} × ${t.alturaImagem} px · ${t.colunas * t.linhas} tiles de ${t.tamanhoDoTile} px`;
}

function useEstilos() {
  const { colors } = NOCTHERA_THEME;
  return {
    colors,
    campo: 'rounded-sm border px-2 py-1 text-[12px] w-full',
    estiloCampo: { backgroundColor: colors.background.primary, borderColor: `${OURO}66`, color: colors.text.primary },
    botao: 'px-3 py-1.5 rounded font-cinzel font-bold text-xs disabled:opacity-50',
    estiloBotao: { backgroundColor: colors.accent.primary, color: colors.background.secondary },
  };
}

const PLURAL: Record<TipoDeConteudo, string> = { mapa: 'Mapas', tileset: 'Tilesets' };
const EXPLICACAO: Record<TipoDeConteudo, string> = {
  mapa: 'Cada mapa tem um rascunho e versões publicadas. O jogo só vê a versão publicada; voltar atrás republica uma versão antiga.',
  tileset: 'Os tilesets são as imagens cortadas em tiles que os mapas usam. Publique o tileset antes do mapa que o usa.',
};

/**
 * Mapas e tilesets no Painel do Mestre (3.5.2.2 e 3.5.6): listas, criar, publicar, histórico e voltar atrás.
 * O desenho do mapa é no editor (/mestre/mapas/[id]); aqui fica o ciclo de rascunho e publicação.
 */
export function ConteudoPainel({ sessao, tokenFresco }: { sessao: SessaoDoPainel; tokenFresco: Token }) {
  const { colors } = useEstilos();
  const [tipo, setTipo] = useState<TipoDeConteudo>('mapa');
  const [aberto, setAberto] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label="Tipo de conteúdo" className="flex gap-1">
        {(['mapa', 'tileset'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tipo === t}
            onClick={() => {
              setTipo(t);
              setAberto(null);
            }}
            className="rounded-sm border px-3 py-1 text-[12px] font-bold"
            style={{ backgroundColor: tipo === t ? colors.accent.primary : colors.background.secondary, color: tipo === t ? colors.background.secondary : colors.text.primary, borderColor: tipo === t ? colors.accent.primary : `${OURO}66` }}
          >
            {PLURAL[t]}
          </button>
        ))}
      </div>
      {aberto ? (
        <Detalhe key={`${tipo}:${aberto}`} tipo={tipo} id={aberto} sessao={sessao} tokenFresco={tokenFresco} voltar={() => setAberto(null)} />
      ) : (
        <Lista key={tipo} tipo={tipo} sessao={sessao} tokenFresco={tokenFresco} abrir={setAberto} />
      )}
    </div>
  );
}

function Lista({ tipo, sessao, tokenFresco, abrir }: { tipo: TipoDeConteudo; sessao: SessaoDoPainel; tokenFresco: Token; abrir: (id: string) => void }) {
  const { colors } = useEstilos();
  const podeEditar = sessao.permissoes.includes('mapas.editar');
  const [itens, setItens] = useState<ResumoConteudo[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    const r = await chamar(tokenFresco, `/api/mestre/conteudo?tipo=${tipo}`);
    if (r.ok) setItens(r.dados.itens as ResumoConteudo[]);
    else setErro(String(r.dados.error ?? 'Não foi possível carregar a lista.'));
  }, [tokenFresco, tipo]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <div className="flex flex-col gap-3">
      {podeEditar && tipo === 'mapa' && <NovoMapa tokenFresco={tokenFresco} criado={(id) => abrir(id)} />}
      {podeEditar && tipo === 'tileset' && <ImportarTileset tokenFresco={tokenFresco} criado={(id) => abrir(id)} />}
      <Cartao titulo={PLURAL[tipo]}>
        <p className="text-[11px]" style={{ color: colors.text.secondary }}>{EXPLICACAO[tipo]}</p>
        {erro && <p role="alert" className="text-[12px] font-semibold" style={{ color: VERMELHO }}>{erro}</p>}
        {itens === null ? (
          <p className="text-[12px]" style={{ color: colors.text.secondary }}>Carregando...</p>
        ) : itens.length === 0 ? (
          <p className="text-[12px]" style={{ color: colors.text.secondary }}>Nada criado ainda.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {itens.map((m) => {
              const s = situacaoDoConteudo(m);
              return (
                <li key={m.chave}>
                  <button type="button" onClick={() => abrir(m.id)} className="w-full text-left rounded-sm border px-2 py-1.5 flex flex-col" style={{ borderColor: `${OURO}33` }}>
                    <span className="text-[12px] font-semibold">{m.nome} <span className="font-normal" style={{ color: colors.text.secondary }}>· {m.id}</span></span>
                    <span className="text-[11px]" style={{ color: COR_DA_SITUACAO[s.situacao] }}>{s.texto}</span>
                    <span className="text-[10px]" style={{ color: colors.text.secondary }}>Editado em {dataDoLog(m.editadoEm)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Cartao>
    </div>
  );
}

function NovoMapa({ tokenFresco, criado }: { tokenFresco: Token; criado: (id: string) => void }) {
  const { colors, campo, estiloCampo, botao, estiloBotao } = useEstilos();
  const [nome, setNome] = useState('');
  const [id, setId] = useState('');
  const [idEditado, setIdEditado] = useState(false);
  const [largura, setLargura] = useState(32);
  const [altura, setAltura] = useState(32);
  const [tile, setTile] = useState<number>(TILE_PADRAO);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  return (
    <Cartao titulo="Novo mapa">
      <form
        className="grid gap-2 grid-cols-2 md:grid-cols-[1.4fr_1.2fr_0.6fr_0.6fr_0.7fr_auto] items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          setOcupado(true);
          setErro(null);
          const r = await chamar(tokenFresco, '/api/mestre/conteudo', {
            method: 'POST',
            body: JSON.stringify({ tipo: 'mapa', id, nome, dados: mapaVazio(largura, altura, tile) }),
          });
          setOcupado(false);
          if (r.ok) criado(id);
          else setErro(String(r.dados.error ?? 'Não foi possível criar o mapa.'));
        }}
      >
        <label className="text-[11px] flex flex-col gap-0.5 col-span-2 md:col-span-1">Nome
          <input value={nome} onChange={(e) => { setNome(e.target.value); if (!idEditado) setId(sugerirIdentificador(e.target.value)); }} className={campo} style={estiloCampo} required />
        </label>
        <label className="text-[11px] flex flex-col gap-0.5 col-span-2 md:col-span-1">Identificador (fixo)
          <input value={id} onChange={(e) => { setId(e.target.value); setIdEditado(true); }} className={campo} style={estiloCampo} autoComplete="off" required />
        </label>
        <label className="text-[11px] flex flex-col gap-0.5">Largura
          <input type="number" min={LADO_MINIMO_DO_MAPA} max={LADO_MAXIMO_DO_MAPA} value={largura} onChange={(e) => setLargura(Number(e.target.value))} className={campo} style={estiloCampo} />
        </label>
        <label className="text-[11px] flex flex-col gap-0.5">Altura
          <input type="number" min={LADO_MINIMO_DO_MAPA} max={LADO_MAXIMO_DO_MAPA} value={altura} onChange={(e) => setAltura(Number(e.target.value))} className={campo} style={estiloCampo} />
        </label>
        <label className="text-[11px] flex flex-col gap-0.5">Tile (px)
          <select value={tile} onChange={(e) => setTile(Number(e.target.value))} className={campo} style={estiloCampo}>
            {TAMANHOS_DE_TILE.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <button type="submit" disabled={ocupado} className={`${botao} inline-flex items-center gap-1 justify-center`} style={estiloBotao}>
          <Plus className="w-3.5 h-3.5" /> Criar
        </button>
      </form>
      <p className="text-[11px]" style={{ color: colors.text.secondary }}>
        De {LADO_MINIMO_DO_MAPA} a {LADO_MAXIMO_DO_MAPA} tiles por lado. O mapa nasce vazio, só como rascunho.
      </p>
      {erro && <p role="alert" className="text-[12px] font-semibold" style={{ color: VERMELHO }}>{erro}</p>}
    </Cartao>
  );
}

function Detalhe({ tipo, id, sessao, tokenFresco, voltar }: { tipo: TipoDeConteudo; id: string; sessao: SessaoDoPainel; tokenFresco: Token; voltar: () => void }) {
  const { colors, campo, estiloCampo, botao, estiloBotao } = useEstilos();
  const podeEditar = sessao.permissoes.includes('mapas.editar');
  const podePublicar = sessao.permissoes.includes('conteudo.publicar');
  const [conteudo, setConteudo] = useState<ConteudoDocumento | null>(null);
  const [versoes, setVersoes] = useState<ResumoVersao[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  const [revertendo, setRevertendo] = useState<number | null>(null);
  const [motivoReversao, setMotivoReversao] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const base = `/api/mestre/conteudo/${tipo}/${id}`;

  const carregar = useCallback(async () => {
    const r = await chamar(tokenFresco, base);
    if (r.ok) {
      setConteudo(r.dados.conteudo as ConteudoDocumento);
      setVersoes(r.dados.versoes as ResumoVersao[]);
    } else setErro(String(r.dados.error ?? 'Não foi possível abrir.'));
  }, [tokenFresco, base]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const executar = async (fazer: () => Promise<{ ok: boolean; status: number; dados: Record<string, unknown> }>, sucesso: string) => {
    setOcupado(true);
    setErro(null);
    setAviso(null);
    const r = await fazer();
    setOcupado(false);
    if (!r.ok) {
      setErro(String(r.dados.error ?? 'Não foi possível concluir.'));
      if (r.status === 409) void carregar();
      return false;
    }
    setAviso(sucesso);
    await carregar();
    return true;
  };

  if (!conteudo) {
    return (
      <Cartao titulo={NOME_DO_TIPO[tipo]}>
        <button type="button" onClick={voltar} className="self-start inline-flex items-center gap-1 text-[11px]"><ArrowLeft className="w-3.5 h-3.5" /> Voltar</button>
        <p className="text-[12px]" style={{ color: erro ? VERMELHO : colors.text.secondary }}>{erro ?? 'Carregando...'}</p>
      </Cartao>
    );
  }

  const s = situacaoDoConteudo(conteudo);
  const temMudancas = conteudo.hashPublicado !== conteudo.hashRascunho;

  return (
    <div className="flex flex-col gap-3">
      <Cartao titulo={conteudo.nome}>
        <button type="button" onClick={voltar} className="self-start inline-flex items-center gap-1 text-[11px]" style={{ color: colors.text.secondary }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar à lista
        </button>
        <p className="text-[12px]">
          {conteudo.id} · {resumoDosDados(tipo, conteudo.rascunho)} · revisão {conteudo.revisao} do rascunho
        </p>
        <p className="text-[12px] font-semibold" style={{ color: COR_DA_SITUACAO[s.situacao] }}>{s.texto}</p>
        <p className="text-[11px]" style={{ color: colors.text.secondary }}>Rascunho editado em {dataDoLog(conteudo.editadoEm)}.</p>
        {tipo === 'mapa' && (
          <Link href={`/mestre/mapas/${id}`} className="self-start inline-flex items-center gap-1 px-3 py-1.5 rounded font-cinzel font-bold text-xs" style={estiloBotao}>
            <PencilRuler className="w-3.5 h-3.5" /> {podeEditar ? 'Abrir no editor' : 'Ver no editor'}
          </Link>
        )}
        {tipo === 'tileset' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={(conteudo.rascunho as TilesetDados).imagem} alt={`Tileset ${conteudo.nome}`} className="max-h-64 self-start rounded-sm border object-contain" style={{ imageRendering: 'pixelated', borderColor: `${OURO}33` }} />
        )}
        {aviso && <p role="status" className="text-[12px] font-semibold" style={{ color: COR_DA_SITUACAO['no-ar'] }}>{aviso}</p>}
        {erro && <p role="alert" className="text-[12px] font-semibold" style={{ color: VERMELHO }}>{erro}</p>}
      </Cartao>

      {podePublicar && (
        <Cartao titulo="Publicar o rascunho">
          {temMudancas ? (
            <form
              className="flex flex-col md:flex-row gap-2 md:items-end"
              onSubmit={async (e) => {
                e.preventDefault();
                const ok = await executar(
                  () => chamar(tokenFresco, `${base}/publicar`, { method: 'POST', body: JSON.stringify({ revisao: conteudo.revisao, motivo }) }),
                  'Publicado: o jogo passa a ver esta versão em até 30 segundos.'
                );
                if (ok) setMotivo('');
              }}
            >
              <label className="text-[11px] flex flex-col gap-0.5 flex-1">Motivo (obrigatório)
                <input value={motivo} onChange={(e) => setMotivo(e.target.value)} className={campo} style={estiloCampo} required />
              </label>
              <button type="submit" disabled={ocupado} className={`${botao} inline-flex items-center gap-1 justify-center`} style={estiloBotao}>
                <Upload className="w-3.5 h-3.5" /> Publicar
              </button>
            </form>
          ) : (
            <p className="text-[12px]" style={{ color: colors.text.secondary }}>O rascunho é igual ao que está no jogo.</p>
          )}
        </Cartao>
      )}

      <Cartao titulo="Histórico de versões">
        {versoes.length === 0 ? (
          <p className="text-[12px]" style={{ color: colors.text.secondary }}>Nenhuma versão publicada ainda.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {versoes.map((v) => {
              const noAr = v.versao === conteudo.versaoPublicada;
              return (
                <li key={v.versao} className="rounded-sm border px-2 py-1.5 flex flex-col gap-1" style={{ borderColor: noAr ? COR_DA_SITUACAO['no-ar'] : `${OURO}33` }}>
                  <span className="text-[12px] inline-flex items-center gap-1"><History className="w-3.5 h-3.5 shrink-0" /> {descreverVersao(v, conteudo.versaoPublicada)}</span>
                  <span className="text-[10px]" style={{ color: colors.text.secondary }}>{dataDoLog(v.publicadoEm)} · {v.publicadoPor} · Motivo: {v.motivo}</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {podePublicar && !noAr && (
                      <button type="button" onClick={() => { setRevertendo(v.versao); setMotivoReversao(''); }} className="px-2 py-1 rounded border text-[11px]" style={{ borderColor: '#E6C775', color: '#E6C775' }}>
                        Voltar o jogo para esta versão
                      </button>
                    )}
                    {podeEditar && (
                      <button
                        type="button"
                        disabled={ocupado}
                        onClick={() =>
                          void executar(async () => {
                            const r = await chamar(tokenFresco, `${base}/versoes/${v.versao}`);
                            if (!r.ok) return r;
                            const dados = (r.dados.versao as { dados: unknown }).dados;
                            return chamar(tokenFresco, base, { method: 'PUT', body: JSON.stringify({ dados, revisao: conteudo.revisao }) });
                          }, `O rascunho agora é uma cópia da versão ${v.versao} (o jogo não mudou).`)
                        }
                        className="px-2 py-1 rounded border text-[11px] disabled:opacity-50"
                        style={{ borderColor: `${OURO}66` }}
                      >
                        Copiar para o rascunho
                      </button>
                    )}
                  </div>
                  {revertendo === v.versao && (
                    <form
                      className="flex gap-1.5 items-center"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const ok = await executar(
                          () =>
                            chamar(tokenFresco, `${base}/reverter`, {
                              method: 'POST',
                              body: JSON.stringify({ versao: v.versao, ultimaVersao: conteudo.ultimaVersao, motivo: motivoReversao }),
                            }),
                          `O jogo voltou para o conteúdo da versão ${v.versao}.`
                        );
                        if (ok) setRevertendo(null);
                      }}
                    >
                      <input value={motivoReversao} onChange={(e) => setMotivoReversao(e.target.value)} placeholder="Motivo da volta atrás" className={campo} style={estiloCampo} required />
                      <button type="submit" disabled={ocupado} className="px-2 py-1 rounded text-[11px] font-bold disabled:opacity-50" style={{ backgroundColor: '#E6C775', color: colors.background.secondary }}>Confirmar</button>
                      <button type="button" onClick={() => setRevertendo(null)} className="px-2 py-1 rounded border text-[11px]" style={{ borderColor: `${OURO}66` }}>Cancelar</button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Cartao>
    </div>
  );
}
