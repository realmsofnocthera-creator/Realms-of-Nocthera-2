'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Gamepad2, History, PencilRuler, Plus, Upload } from 'lucide-react';
import { LADO_MAXIMO_DO_MAPA, LADO_MINIMO_DO_MAPA, mapaVazio, TAMANHOS_DE_TILE, TILE_PADRAO, type MapaDados } from '@/rules/mapa';
import type { TilesetDados } from '@/rules/tileset';
import { NOME_DO_TIPO, PERMISSAO_DE_EDICAO, type TipoDeConteudo } from '@/rules/conteudo';
import { monstroDadosDeDefinicao, type MonstroDados } from '@/rules/monstroConteudo';
import { EditorDeMonstro } from '@/components/mestre/EditorDeMonstro';
import { EditorDeArma } from '@/components/mestre/EditorDeArma';
import { EditorDeArmadura } from '@/components/mestre/EditorDeArmadura';
import { EditorDeEmblema } from '@/components/mestre/EditorDeEmblema';
import { EditorDeAnuncio } from '@/components/mestre/EditorDeAnuncio';
import { anuncioEmBranco, NOME_DO_TIPO_DE_ANUNCIO, type AnuncioDados } from '@/rules/anuncio';
import { descreverJanela } from '@/lib/anunciosTela';
import type { ProblemaDoMapa } from '@/rules/verificarMapa';
import { armaduraDadosDePeca, type ArmaduraDados } from '@/rules/armaduraConteudo';
import { emblemaDadosDeTipo, type EmblemaDados } from '@/rules/emblemaConteudo';
import { armaDadosDeBase, type ArmaDados } from '@/rules/armaConteudo';
import { armaOriginal, emblemaOriginal, pecaOriginal } from '@/rules/catalogoAoVivo';
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
  if (tipo === 'anuncio') {
    const a = dados as AnuncioDados;
    return `${NOME_DO_TIPO_DE_ANUNCIO[a.tipo]} · ${descreverJanela(a)}${a.ativo ? '' : ' · FORA DO AR'}`;
  }
  if (tipo === 'armadura') {
    const a = dados as ArmaduraDados;
    return `${a.raridade} · ${a.receita.ouro.toLocaleString('pt-BR')} de ouro${a.ativo ? '' : ' · FORA DE USO'}`;
  }
  if (tipo === 'emblema') return (dados as EmblemaDados).nome;
  if (tipo === 'arma') {
    const a = dados as ArmaDados;
    return `${a.raridade} · ${a.receita.ouro.toLocaleString('pt-BR')} de ouro${a.ativo ? '' : ' · FORA DE USO'}`;
  }
  if (tipo === 'monstro') {
    const m = dados as MonstroDados;
    return `nível ${m.nivel} · HP ${m.hp}${m.ativo ? '' : ' · FORA DE USO'}`;
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

const PLURAL: Record<TipoDeConteudo, string> = { mapa: 'Mapas', tileset: 'Tilesets', monstro: 'Monstros', arma: 'Armas', armadura: 'Armaduras', emblema: 'Emblemas', anuncio: 'Anúncios' };
const EXPLICACAO: Record<TipoDeConteudo, string> = {
  mapa: 'Cada mapa tem um rascunho e versões publicadas. O jogo só vê a versão publicada; voltar atrás republica uma versão antiga.',
  tileset: 'Os tilesets são as imagens cortadas em tiles que os mapas usam. Publique o tileset antes do mapa que o usa.',
  monstro: 'Monstros do banco. Com o mesmo identificador de um monstro do código, o publicado substitui os números dele; com identificador novo, é um monstro novo. Desmarcar "Ativo" tira o monstro de uso.',
  anuncio: 'Avisos que aparecem no card Anúncios do Menu, com janela de datas. Um evento agendado é um anúncio do tipo Evento: só avisa, não muda regras do jogo.',
  armadura: 'Peças de armadura do catálogo. O publicado substitui nome, raridade e receita da peça do código; desmarcar "Ativo" impede fabricar.',
  emblema: 'Emblemas da Provação do Guerreiro. O publicado substitui nome, lore, atributos e textos das habilidades; o efeito no combate continua o do código.',
  arma: 'Armas do catálogo da Forja. O publicado substitui nomes, raridade e receita da arma do código; desmarcar "Ativo" impede fabricar.',
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
        {(['mapa', 'tileset', 'monstro', 'arma', 'armadura', 'emblema', 'anuncio'] as const).map((t) => (
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
  const podeEditar = sessao.permissoes.includes(PERMISSAO_DE_EDICAO[tipo]);
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
      {podeEditar && tipo === 'anuncio' && <NovoAnuncio tokenFresco={tokenFresco} criado={(id) => abrir(id)} />}
      {podeEditar && tipo === 'armadura' && <NovoItemDoCatalogo tipo="armadura" tokenFresco={tokenFresco} criado={(id) => abrir(id)} />}
      {podeEditar && tipo === 'emblema' && <NovoItemDoCatalogo tipo="emblema" tokenFresco={tokenFresco} criado={(id) => abrir(id)} />}
      {podeEditar && tipo === 'arma' && <NovaArma tokenFresco={tokenFresco} criado={(id) => abrir(id)} />}
      {podeEditar && tipo === 'monstro' && <NovoMonstro tokenFresco={tokenFresco} criado={(id) => abrir(id)} />}
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

/** Os monstros que existem no código (carregados só quando a aba de monstros é usada, para não pesar o painel). */
async function monstrosDoCodigo() {
  const [{ MONSTERS }, { MONSTROS_CACADA }, { CHEFES_ESPECIAIS_MAP }] = await Promise.all([
    import('@/rules/monsters'),
    import('@/rules/cacada'),
    import('@/rules/chefesEspeciais'),
  ]);
  return [...MONSTERS, ...MONSTROS_CACADA, ...Object.values(CHEFES_ESPECIAIS_MAP)];
}
async function monstroDoCodigo(id: string) {
  return (await monstrosDoCodigo()).find((m) => m.id === id) ?? null;
}

function monstroEmBranco(): MonstroDados {
  return {
    formato: 1, nome: '', nivel: 1, hp: 10, mitigacao: 0, chefe: false, categoriaCorporal: 'feral', fraquezasProprias: [], resistenciasProprias: [],
    atributos: { vigor: 1, sorte: 0, forca: 1, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 1 },
    xpConcedido: 10, ouroConcedido: { min: 1, max: 5 }, modificadoresElementais: {}, elementoAtaque: null, efeitosAplicados: [], imunidadesStatus: [], enfurecido: false, ativo: true,
  };
}

/** Problemas do mapa antes de publicar (3.5.6.6): erros impedem a publicação; avisos só informam. */
export function VerificacaoDoMapa({ base, tokenFresco }: { base: string; tokenFresco: Token }) {
  const { colors } = useEstilos();
  const [problemas, setProblemas] = useState<ProblemaDoMapa[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const verificar = useCallback(async () => {
    setOcupado(true);
    setErro(null);
    const r = await chamar(tokenFresco, `${base}/verificar`);
    setOcupado(false);
    if (r.ok) setProblemas(r.dados.problemas as ProblemaDoMapa[]);
    else setErro(String(r.dados.error ?? 'Não foi possível verificar o mapa.'));
  }, [base, tokenFresco]);

  useEffect(() => {
    void verificar();
  }, [verificar]);

  const erros = (problemas ?? []).filter((p) => p.nivel === 'erro');
  const avisos = (problemas ?? []).filter((p) => p.nivel === 'aviso');
  return (
    <Cartao titulo="Verificar o mapa antes de publicar">
      <p className="text-[11px]" style={{ color: colors.text.secondary }}>
        Confere o rascunho salvo: início, portas e destinos, o que o jogador alcança e se o mapa está isolado. <strong>Erros</strong> impedem a publicação; <strong>avisos</strong> só informam.
      </p>
      {erro && <p role="alert" className="text-[12px] font-semibold" style={{ color: VERMELHO }}>{erro}</p>}
      {problemas && problemas.length === 0 && <p role="status" className="text-[12px] font-semibold" style={{ color: COR_DA_SITUACAO['no-ar'] }}>Nenhum problema encontrado.</p>}
      {erros.length > 0 && (
        <ul aria-label="Erros do mapa" className="list-disc pl-4 text-[12px]" style={{ color: VERMELHO }}>
          {erros.map((p) => <li key={p.texto}>{p.texto}</li>)}
        </ul>
      )}
      {avisos.length > 0 && (
        <ul aria-label="Avisos do mapa" className="list-disc pl-4 text-[12px]" style={{ color: '#E6C775' }}>
          {avisos.map((p) => <li key={p.texto}>{p.texto}</li>)}
        </ul>
      )}
      <button type="button" disabled={ocupado} onClick={() => void verificar()} className="self-start px-3 py-1.5 rounded border text-[11px] font-bold disabled:opacity-50" style={{ borderColor: `${OURO}88` }}>
        {ocupado ? 'Verificando...' : 'Verificar de novo'}
      </button>
    </Cartao>
  );
}

function NovoAnuncio({ tokenFresco, criado }: { tokenFresco: Token; criado: (id: string) => void }) {
  const { colors, campo, estiloCampo, botao, estiloBotao } = useEstilos();
  const [titulo, setTitulo] = useState('');
  const [id, setId] = useState('');
  const [idEditado, setIdEditado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  return (
    <Cartao titulo="Novo anúncio">
      <form
        className="grid gap-2 grid-cols-1 md:grid-cols-[1.4fr_1.2fr_auto] items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          setOcupado(true);
          setErro(null);
          const r = await chamar(tokenFresco, '/api/mestre/conteudo', { method: 'POST', body: JSON.stringify({ tipo: 'anuncio', id, nome: titulo, dados: anuncioEmBranco(titulo) }) });
          setOcupado(false);
          if (r.ok) criado(id);
          else setErro(String(r.dados.error ?? 'Não foi possível criar o anúncio.'));
        }}
      >
        <label className="text-[11px] flex flex-col gap-0.5">Título
          <input value={titulo} onChange={(e) => { setTitulo(e.target.value); if (!idEditado) setId(sugerirIdentificador(e.target.value)); }} className={campo} style={estiloCampo} required />
        </label>
        <label className="text-[11px] flex flex-col gap-0.5">Identificador (fixo)
          <input value={id} onChange={(e) => { setId(e.target.value); setIdEditado(true); }} className={campo} style={estiloCampo} autoComplete="off" required />
        </label>
        <button type="submit" disabled={ocupado} className={`${botao} inline-flex items-center gap-1 justify-center`} style={estiloBotao}>
          <Plus className="w-3.5 h-3.5" /> Criar
        </button>
      </form>
      <p className="text-[11px]" style={{ color: colors.text.secondary }}>O anúncio nasce como rascunho, com texto provisório e desativado. Escreva o texto, marque "Ativo", salve e publique.</p>
      {erro && <p role="alert" className="text-[12px] font-semibold" style={{ color: VERMELHO }}>{erro}</p>}
    </Cartao>
  );
}

/** Cria o rascunho de uma peça de armadura ou de um emblema a partir do que está no código. */
function NovoItemDoCatalogo({ tipo, tokenFresco, criado }: { tipo: 'armadura' | 'emblema'; tokenFresco: Token; criado: (id: string) => void }) {
  const { colors, campo, estiloCampo, botao, estiloBotao } = useEstilos();
  const [lista, setLista] = useState<{ id: string; rotulo: string }[]>([]);
  const [escolhido, setEscolhido] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (tipo === 'armadura') {
      void import('@/rules/armadurasCatalogo').then(({ PECAS_ARMADURA }) => setLista(PECAS_ARMADURA.map((p) => ({ id: p.id, rotulo: `${p.estrela}★ · ${p.nome} (${p.id})` }))));
    } else {
      void import('@/rules/emblemasCatalogo').then(({ TIPOS_EMBLEMA }) => setLista(TIPOS_EMBLEMA.map((t) => ({ id: t.id, rotulo: `${t.nome} (${t.id})` }))));
    }
  }, [tipo]);

  return (
    <Cartao titulo={tipo === 'armadura' ? 'Editar uma peça de armadura do catálogo' : 'Editar um emblema do catálogo'}>
      <form
        className="grid gap-2 grid-cols-1 md:grid-cols-[1fr_auto] items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          const peca = tipo === 'armadura' ? pecaOriginal(escolhido) : undefined;
          const emblema = tipo === 'emblema' ? emblemaOriginal(escolhido) : undefined;
          if (!peca && !emblema) return setErro('Escolha um item.');
          setOcupado(true);
          setErro(null);
          const corpo = peca
            ? { tipo, id: peca.id, nome: peca.nome, dados: armaduraDadosDePeca(peca) }
            : { tipo, id: emblema!.id, nome: emblema!.nome, dados: emblemaDadosDeTipo(emblema!) };
          const r = await chamar(tokenFresco, '/api/mestre/conteudo', { method: 'POST', body: JSON.stringify(corpo) });
          setOcupado(false);
          if (r.ok) criado(corpo.id);
          else setErro(String(r.dados.error ?? 'Não foi possível criar o rascunho.'));
        }}
      >
        <label className="text-[11px] flex flex-col gap-0.5">{tipo === 'armadura' ? 'Peça' : 'Emblema'}
          <select value={escolhido} onChange={(e) => setEscolhido(e.target.value)} className={campo} style={estiloCampo} required>
            <option value="">Escolha...</option>
            {lista.map((i) => <option key={i.id} value={i.id}>{i.rotulo}</option>)}
          </select>
        </label>
        <button type="submit" disabled={ocupado} className={`${botao} inline-flex items-center gap-1 justify-center`} style={estiloBotao}>
          <Plus className="w-3.5 h-3.5" /> Criar rascunho
        </button>
      </form>
      <p className="text-[11px]" style={{ color: colors.text.secondary }}>O rascunho nasce com os valores atuais e o mesmo identificador; ao publicar, substitui os do código.</p>
      {erro && <p role="alert" className="text-[12px] font-semibold" style={{ color: VERMELHO }}>{erro}</p>}
    </Cartao>
  );
}

function NovaArma({ tokenFresco, criado }: { tokenFresco: Token; criado: (id: string) => void }) {
  const { colors, campo, estiloCampo, botao, estiloBotao } = useEstilos();
  const [lista, setLista] = useState<{ id: string; nome: string; estrela: number }[]>([]);
  const [escolhida, setEscolhida] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    void import('@/rules/armasCatalogo').then(({ ARMAS_BASE }) =>
      setLista(ARMAS_BASE.map((a) => ({ id: a.id, nome: a.nomes.espadaGrande, estrela: a.estrela })))
    );
  }, []);

  return (
    <Cartao titulo="Editar uma arma do catálogo">
      <form
        className="grid gap-2 grid-cols-1 md:grid-cols-[1fr_auto] items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          const base = armaOriginal(escolhida);
          if (!base) return setErro('Escolha uma arma.');
          setOcupado(true);
          setErro(null);
          const r = await chamar(tokenFresco, '/api/mestre/conteudo', { method: 'POST', body: JSON.stringify({ tipo: 'arma', id: base.id, nome: base.nomes.espadaGrande, dados: armaDadosDeBase(base) }) });
          setOcupado(false);
          if (r.ok) criado(base.id);
          else setErro(String(r.dados.error ?? 'Não foi possível criar o rascunho.'));
        }}
      >
        <label className="text-[11px] flex flex-col gap-0.5">Arma (mostrada pelo nome da Espada grande)
          <select value={escolhida} onChange={(e) => setEscolhida(e.target.value)} className={campo} style={estiloCampo} required>
            <option value="">Escolha...</option>
            {lista.map((a) => <option key={a.id} value={a.id}>{a.estrela}★ · {a.nome} ({a.id})</option>)}
          </select>
        </label>
        <button type="submit" disabled={ocupado} className={`${botao} inline-flex items-center gap-1 justify-center`} style={estiloBotao}>
          <Plus className="w-3.5 h-3.5" /> Criar rascunho
        </button>
      </form>
      <p className="text-[11px]" style={{ color: colors.text.secondary }}>O rascunho nasce com os valores atuais da arma e o mesmo identificador; ao publicar, substitui os do código.</p>
      {erro && <p role="alert" className="text-[12px] font-semibold" style={{ color: VERMELHO }}>{erro}</p>}
    </Cartao>
  );
}

function NovoMonstro({ tokenFresco, criado }: { tokenFresco: Token; criado: (id: string) => void }) {
  const { colors, campo, estiloCampo, botao, estiloBotao } = useEstilos();
  const [codigo, setCodigo] = useState<{ id: string; nome: string }[]>([]);
  const [partida, setPartida] = useState('');
  const [nome, setNome] = useState('');
  const [id, setId] = useState('');
  const [idEditado, setIdEditado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    void monstrosDoCodigo().then((l) => setCodigo(l.map((m) => ({ id: m.id, nome: m.nome })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))));
  }, []);

  return (
    <Cartao titulo="Novo monstro">
      <form
        className="grid gap-2 grid-cols-2 md:grid-cols-[1.6fr_1.2fr_1.2fr_auto] items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          setOcupado(true);
          setErro(null);
          const base = partida ? await monstroDoCodigo(partida) : null;
          const dados = base ? monstroDadosDeDefinicao(base) : { ...monstroEmBranco(), nome };
          const r = await chamar(tokenFresco, '/api/mestre/conteudo', { method: 'POST', body: JSON.stringify({ tipo: 'monstro', id: base ? base.id : id, nome: base ? base.nome : nome, dados }) });
          setOcupado(false);
          if (r.ok) criado(base ? base.id : id);
          else setErro(String(r.dados.error ?? 'Não foi possível criar o monstro.'));
        }}
      >
        <label className="text-[11px] flex flex-col gap-0.5 col-span-2 md:col-span-1">Partir de um monstro do código
          <select value={partida} onChange={(e) => setPartida(e.target.value)} className={campo} style={estiloCampo}>
            <option value="">Monstro novo, em branco</option>
            {codigo.map((m) => <option key={m.id} value={m.id}>{m.nome} ({m.id})</option>)}
          </select>
        </label>
        {partida ? (
          <p className="text-[11px] col-span-2" style={{ color: colors.text.secondary }}>O rascunho nasce com os números atuais do monstro e o mesmo identificador: ao publicar, substitui o do código.</p>
        ) : (
          <>
            <label className="text-[11px] flex flex-col gap-0.5">Nome
              <input value={nome} onChange={(e) => { setNome(e.target.value); if (!idEditado) setId(sugerirIdentificador(e.target.value)); }} className={campo} style={estiloCampo} required />
            </label>
            <label className="text-[11px] flex flex-col gap-0.5">Identificador (fixo)
              <input value={id} onChange={(e) => { setId(e.target.value); setIdEditado(true); }} className={campo} style={estiloCampo} autoComplete="off" required />
            </label>
          </>
        )}
        <button type="submit" disabled={ocupado} className={`${botao} inline-flex items-center gap-1 justify-center`} style={estiloBotao}>
          <Plus className="w-3.5 h-3.5" /> Criar
        </button>
      </form>
      {erro && <p role="alert" className="text-[12px] font-semibold" style={{ color: VERMELHO }}>{erro}</p>}
    </Cartao>
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
  const podeEditar = sessao.permissoes.includes(PERMISSAO_DE_EDICAO[tipo]);
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
  const [doCodigo, setDoCodigo] = useState(false);
  useEffect(() => {
    if (tipo !== 'monstro') return;
    void monstroDoCodigo(id).then((m) => setDoCodigo(m !== null));
  }, [tipo, id]);

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
        {tipo === 'mapa' && (
          <Link href={`/mestre/mapas/${id}/jogar`} className="self-start inline-flex items-center gap-1 px-3 py-1.5 rounded border font-cinzel font-bold text-xs" style={{ borderColor: '#7BC47F', color: '#7BC47F' }}>
            <Gamepad2 className="w-3.5 h-3.5" /> Jogar o mapa (teste)
          </Link>
        )}
        {tipo === 'monstro' && (
          <p className="text-[11px]" style={{ color: colors.text.secondary }}>Para o jogo ver as mudanças, publique o rascunho. Desmarcar "Ativo" e publicar tira o monstro de uso.</p>
        )}
        {tipo === 'tileset' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={(conteudo.rascunho as TilesetDados).imagem} alt={`Tileset ${conteudo.nome}`} className="max-h-64 self-start rounded-sm border object-contain" style={{ imageRendering: 'pixelated', borderColor: `${OURO}33` }} />
        )}
        {aviso && <p role="status" className="text-[12px] font-semibold" style={{ color: COR_DA_SITUACAO['no-ar'] }}>{aviso}</p>}
        {erro && <p role="alert" className="text-[12px] font-semibold" style={{ color: VERMELHO }}>{erro}</p>}
      </Cartao>

      {tipo === 'mapa' && <VerificacaoDoMapa key={conteudo.revisao} base={base} tokenFresco={tokenFresco} />}

      {tipo === 'anuncio' && (
        <EditorDeAnuncio
          key={conteudo.revisao}
          inicial={conteudo.rascunho as AnuncioDados}
          podeEditar={podeEditar}
          salvar={async (dados) => {
            const r = await chamar(tokenFresco, base, { method: 'PUT', body: JSON.stringify({ dados, revisao: conteudo.revisao, nome: dados.titulo }) });
            if (!r.ok) {
              if (r.status === 409) void carregar();
              return String(r.dados.error ?? 'Não foi possível salvar.');
            }
            await carregar();
            return null;
          }}
        />
      )}

      {tipo === 'armadura' && (
        <EditorDeArmadura
          key={conteudo.revisao}
          inicial={conteudo.rascunho as ArmaduraDados}
          podeEditar={podeEditar}
          salvar={async (dados) => {
            const r = await chamar(tokenFresco, base, { method: 'PUT', body: JSON.stringify({ dados, revisao: conteudo.revisao, nome: dados.nome }) });
            if (!r.ok) {
              if (r.status === 409) void carregar();
              return String(r.dados.error ?? 'Não foi possível salvar.');
            }
            await carregar();
            return null;
          }}
        />
      )}

      {tipo === 'emblema' && (
        <EditorDeEmblema
          key={conteudo.revisao}
          inicial={conteudo.rascunho as EmblemaDados}
          podeEditar={podeEditar}
          salvar={async (dados) => {
            const r = await chamar(tokenFresco, base, { method: 'PUT', body: JSON.stringify({ dados, revisao: conteudo.revisao, nome: dados.nome }) });
            if (!r.ok) {
              if (r.status === 409) void carregar();
              return String(r.dados.error ?? 'Não foi possível salvar.');
            }
            await carregar();
            return null;
          }}
        />
      )}

      {tipo === 'arma' && (
        <EditorDeArma
          key={conteudo.revisao}
          inicial={conteudo.rascunho as ArmaDados}
          podeEditar={podeEditar}
          salvar={async (dados) => {
            const r = await chamar(tokenFresco, base, { method: 'PUT', body: JSON.stringify({ dados, revisao: conteudo.revisao }) });
            if (!r.ok) {
              if (r.status === 409) void carregar();
              return String(r.dados.error ?? 'Não foi possível salvar.');
            }
            await carregar();
            return null;
          }}
        />
      )}

      {tipo === 'monstro' && (
        <EditorDeMonstro
          key={conteudo.revisao}
          inicial={conteudo.rascunho as MonstroDados}
          podeEditar={podeEditar}
          doCodigo={doCodigo}
          salvar={async (dados) => {
            const r = await chamar(tokenFresco, base, { method: 'PUT', body: JSON.stringify({ dados, revisao: conteudo.revisao, nome: dados.nome }) });
            if (!r.ok) {
              if (r.status === 409) void carregar();
              return String(r.dados.error ?? 'Não foi possível salvar.');
            }
            await carregar();
            return null;
          }}
        />
      )}

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
