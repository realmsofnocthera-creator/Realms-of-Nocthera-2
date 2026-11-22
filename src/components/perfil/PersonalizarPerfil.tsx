'use client';

import React, { useState } from 'react';
import { AVATAR_IMAGES, getAvatarFaceStyle, resolveAvatarSrc } from '@/assets/avatars';
import { TELAS_UI } from '@/assets/telasSociaisUi';
import { PalcoPixel, Texto } from '@/components/pixel/GradePixel';
import { Abas, AreaQueRola, AvisoDaTela, Cabecalho, CREME, DOURADO, Icone, Rotulo, SUB, SOMBRA_DO_TEXTO, pixel, u } from '@/components/pixel/PecasDeTela';
import { auth } from '@/lib/firebase';
import { avataresLiberados, DEFAULT_AVATAR_ID } from '@/rules/avatars';
import { getClassById } from '@/rules/classes';
import { MOLDURAS, molduraLiberada, molduraEscolhida } from '@/rules/molduras';
import { FaixaDoTitulo } from '@/components/perfil/FaixaDoTitulo';
import { MolduraDoAvatar } from '@/components/perfil/MolduraDoAvatar';
import { TITULOS } from '@/rules/titulos';
import { SUBCLASSES } from '@/rules/subclasses';
import { TEXTOS_DAS_TELAS as TT } from '@/rules/textosDasTelasSociais';
import { TITULO_MAP } from '@/rules/titulos';
import type { CharacterDocument } from '@/server/characterService';

const T = TT.perfil;
export type AbaDoPerfil = 'avatar' | 'titulo' | 'moldura';

async function token(): Promise<string | null> {
  try {
    return (await auth.currentUser?.getIdToken()) ?? null;
  } catch {
    return null;
  }
}

/** O rosto do avatar num círculo (`d` é o diâmetro da caixa; o disco do rosto tem 86%), com a moldura por cima (a escolhida, ou a Padrão do Hub). */
function Rosto({ avatarId, classeId, molduraId, x, y, d, animada = true }: { avatarId?: string; classeId: string; molduraId?: string | null; x: number; y: number; d: number; animada?: boolean }) {
  return (
    <div className="absolute" style={{ left: u(x), top: u(y), width: u(d), height: u(d) }}>
      <div className="absolute rounded-full overflow-hidden" style={{ left: '7%', top: '7%', width: '86%', height: '86%', backgroundColor: '#16120E' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={resolveAvatarSrc(avatarId, classeId)} alt="" aria-hidden draggable={false} className="w-full h-full select-none pointer-events-none" style={getAvatarFaceStyle(avatarId, classeId)} />
      </div>
      <MolduraDoAvatar molduraId={molduraId} animada={animada} />
    </div>
  );
}

/**
 * Personalizar o perfil (avatar, título e moldura), sobre o altar do Buscar: o rosto com a moldura em cima, as três abas e a lista de cada uma.
 * Os avatares liberados ficam nas molduras da Coleção (a dourada é a escolhida); os títulos aparecem como as faixas do Yuri e as molduras, em volta do
 * seu rosto. O que o jogador ainda não tem aparece apagado, com o jeito de conseguir.
 */
export function PersonalizarPerfil({ personagem, abaInicial = 'avatar', aoFechar, aoTrocarAvatar, aoTrocarTitulo, aoTrocarMoldura }: {
  personagem: CharacterDocument; abaInicial?: AbaDoPerfil; aoFechar: () => void; aoTrocarAvatar: (id: string) => void; aoTrocarTitulo: (id: string) => void; aoTrocarMoldura?: (id: string) => void;
}) {
  const [aba, setAba] = useState<AbaDoPerfil>(abaInicial);
  const [avatarId, setAvatarId] = useState(personagem.avatarId || DEFAULT_AVATAR_ID);
  const [tituloId, setTituloId] = useState(personagem.tituloId ?? '');
  const [molduraId, setMolduraId] = useState(molduraEscolhida(personagem)?.id ?? '');
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const meusTitulos = new Set((personagem.titulos ?? []).filter((id) => TITULO_MAP[id]));
  const avatares = avataresLiberados(personagem);

  /** Troca o título ou a moldura (a mesma rota das Conquistas). */
  async function escolher(acao: 'titulo' | 'moldura', id: string, aoDarCerto: () => void, erroPadrao: string) {
    if (ocupado) return;
    setOcupado(true);
    setAviso(null);
    try {
      const t = await token();
      const res = await fetch('/api/conquistas', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t ?? ''}` }, body: JSON.stringify({ acao, [acao]: id }) });
      const dados = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(dados.error || erroPadrao);
      aoDarCerto();
    } catch (e) {
      setAviso({ texto: e instanceof Error ? e.message : erroPadrao, erro: true });
    } finally {
      setOcupado(false);
    }
  }

  async function escolherAvatar(id: string) {
    if (ocupado || id === avatarId) return;
    setOcupado(true);
    setAviso(null);
    try {
      const t = await token();
      if (!t) throw new Error(T.sessao);
      const res = await fetch('/api/character/avatar', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ avatarId: id }) });
      const dados = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(dados.error || T.erroAvatar);
      setAvatarId(id);
      aoTrocarAvatar(id);
    } catch (e) {
      setAviso({ texto: e instanceof Error ? e.message : T.erroAvatar, erro: true });
    } finally {
      setOcupado(false);
    }
  }

  const nomeDoAvatar = (a: (typeof avatares)[number]) => getClassById(a.id)?.nome || SUBCLASSES.find((s) => s.id === a.subclasseId)?.nome || a.id;
  // os títulos que o jogador tem primeiro, depois os que faltam (apagados)
  const titulos = [...TITULOS.filter((t) => meusTitulos.has(t.id)), ...TITULOS.filter((t) => !meusTitulos.has(t.id))];
  const moldurasDoJogador = MOLDURAS.filter((m) => molduraLiberada(personagem, m));
  const moldurasQueFaltam = MOLDURAS.filter((m) => !molduraLiberada(personagem, m));

  return (
    <div className="fixed inset-0 z-[100]">
      <PalcoPixel fundo={TELAS_UI.fundoPerfil}>
        <Cabecalho titulo={T.titulo} voltar={aoFechar} rotuloVoltar={TT.voltar} />
        <AvisoDaTela aviso={aviso} y={66} />
        <Rosto avatarId={avatarId} classeId={personagem.classeId} molduraId={molduraId || null} x={158} y={86} d={44} />
        <Texto x={180} y={166} tamanho={9} largura={300} cor={CREME}>{personagem.nome}</Texto>
        <Texto x={180} y={178} tamanho={6.4} caixaAlta largura={300} cor={DOURADO}>{tituloId ? TITULO_MAP[tituloId]?.nome ?? T.semTitulo : T.semTitulo}</Texto>
        <Abas rotulo={T.titulo} y={186} ativa={aba} aoMudar={setAba} abas={[{ id: 'avatar', nome: T.abas.avatar }, { id: 'titulo', nome: T.abas.titulo }, { id: 'moldura', nome: T.abas.moldura }]} />

        {aba === 'avatar' && (
          <AreaQueRola topo={232} base={532} rotulo={T.abas.avatar}>
            <div role="radiogroup" aria-label={T.abas.avatar} className="grid grid-cols-3 shrink-0" style={{ gap: u(8), padding: `0 ${u(8)}` }}>
              {avatares.map((a) => {
                const escolhido = a.id === avatarId;
                return (
                  <button key={a.id} type="button" role="radio" aria-checked={escolhido} aria-label={T.avatarDe(nomeDoAvatar(a))} disabled={ocupado} onClick={() => void escolherAvatar(a.id)} className="relative cursor-pointer disabled:cursor-wait active:translate-y-px" style={{ height: u(112) }}>
                    <span className="absolute overflow-hidden" style={{ left: u(9), top: u(9), width: u(82), height: u(82), backgroundColor: '#120d14' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={AVATAR_IMAGES[a.assetKey]} alt="" aria-hidden draggable={false} className="w-full h-full object-cover object-top" />
                    </span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={escolhido ? TELAS_UI.molduraDourada : TELAS_UI.molduraCinza} alt="" aria-hidden draggable={false} className="absolute pointer-events-none" style={{ left: 0, top: 0, width: u(100), height: u(100), ...pixel }} />
                    {escolhido && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={TELAS_UI.feito} alt="" aria-hidden draggable={false} className="absolute pointer-events-none" style={{ right: u(2), top: u(2), width: u(20), height: u(20), ...pixel }} />
                    )}
                    <span className="absolute left-0 right-0 text-center font-cinzel font-black truncate" style={{ top: u(101), fontSize: u(6.4), color: escolhido ? DOURADO : CREME, textShadow: SOMBRA_DO_TEXTO }}>{nomeDoAvatar(a)}</span>
                  </button>
                );
              })}
            </div>
          </AreaQueRola>
        )}

        {aba === 'titulo' && (
          <AreaQueRola topo={232} base={532} rotulo={T.abas.titulo}>
            <p className="font-cinzel text-center shrink-0" style={{ fontSize: u(6), color: SUB, textShadow: SOMBRA_DO_TEXTO }}>{T.seusTitulos(meusTitulos.size, TITULOS.length)}</p>
            {/* sem título */}
            <button type="button" disabled={ocupado} aria-pressed={!tituloId} onClick={() => tituloId && void escolher('titulo', '', () => { setTituloId(''); aoTrocarTitulo(''); }, T.erroTitulo)} className="relative shrink-0 cursor-pointer text-left font-cinzel font-black uppercase" style={{ height: u(24), fontSize: u(7), color: !tituloId ? DOURADO : CREME, textShadow: SOMBRA_DO_TEXTO, border: `${u(0.8)} solid ${!tituloId ? '#F3C769' : '#6a5a38'}`, backgroundColor: 'rgba(14,10,18,.88)', padding: `0 ${u(8)}` }}>
              {T.semTitulo} <span style={{ fontSize: u(5.4), color: SUB, fontWeight: 500, textTransform: 'none' }}>· {T.naoMostrar}</span>
            </button>
            {titulos.map((t) => {
              const tem = meusTitulos.has(t.id);
              const ativo = tituloId === t.id;
              return (
                <button key={t.id} type="button" disabled={ocupado || !tem} aria-pressed={ativo} aria-label={tem ? t.nome : `${t.nome}, ${T.bloqueado}`} onClick={() => void escolher('titulo', t.id, () => { setTituloId(t.id); aoTrocarTitulo(t.id); }, T.erroTitulo)}
                  className="relative shrink-0 cursor-pointer disabled:cursor-default text-left" style={{ height: u(84) }}>
                  <FaixaDoTitulo id={t.id} apagada={!tem} className="absolute pointer-events-none" style={{ left: u(10), top: u(2), width: u(264), outline: ativo ? `${u(1)} solid #F3C769` : undefined, outlineOffset: u(1) }} />
                  {ativo && <Icone src={TELAS_UI.feito} x={284} y={26} l={22} a={22} alt={T.escolhido} />}
                  {!tem && <Icone src={TELAS_UI.cadeado} x={286} y={26} l={20} a={20} alt={T.bloqueado} />}
                  <Rotulo x={12} y={79} tamanho={5.4} largura={300} cor={tem ? '#D9CBB0' : SUB} negrito={false}>{t.origem}</Rotulo>
                </button>
              );
            })}
          </AreaQueRola>
        )}

        {aba === 'moldura' && (
          <AreaQueRola topo={232} base={532} rotulo={T.abas.moldura}>
            <p className="font-cinzel text-center shrink-0" style={{ fontSize: u(6), color: SUB, textShadow: SOMBRA_DO_TEXTO }}>{T.suasMolduras(moldurasDoJogador.length, MOLDURAS.length)}</p>
            <div className="grid grid-cols-3 shrink-0" style={{ gap: u(2), padding: `0 ${u(6)}` }}>
              {[{ id: '', nome: T.padrao, origem: T.molduraPadrao, tem: true }, ...moldurasDoJogador.map((m) => ({ id: m.id, nome: m.nome, origem: m.origem, tem: true })), ...moldurasQueFaltam.map((m) => ({ id: m.id, nome: m.nome, origem: m.origem, tem: false }))].map((m) => {
                const ativo = molduraId === m.id;
                return (
                  <button key={m.id || 'padrao'} type="button" disabled={ocupado || !m.tem} aria-pressed={ativo} aria-label={m.tem ? m.nome : `${m.nome}, ${T.bloqueado}: ${m.origem}`} onClick={() => void escolher('moldura', m.id, () => { setMolduraId(m.id); aoTrocarMoldura?.(m.id); }, T.erroMoldura)}
                    className="relative cursor-pointer disabled:cursor-default" style={{ height: u(124) }}>
                    <span className="absolute" style={{ left: u(53 - 23.6), top: u(32), width: u(47.2), height: u(47.2), filter: m.tem ? undefined : 'grayscale(1) brightness(.5)' }}>
                      <span className="absolute rounded-full overflow-hidden" style={{ left: '7%', top: '7%', width: '86%', height: '86%', backgroundColor: '#16120E' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={resolveAvatarSrc(avatarId, personagem.classeId)} alt="" aria-hidden draggable={false} className="w-full h-full" style={getAvatarFaceStyle(avatarId, personagem.classeId)} />
                      </span>
                      <MolduraDoAvatar molduraId={m.id || null} />
                    </span>
                    {ativo && <Icone src={TELAS_UI.feito} x={78} y={4} l={18} a={18} alt={T.escolhido} />}
                    {!m.tem && <Icone src={TELAS_UI.cadeado} x={77} y={4} l={18} a={18} alt={T.bloqueado} />}
                    <span className="absolute left-0 right-0 text-center font-cinzel font-black" style={{ top: u(104), fontSize: u(5.6), lineHeight: 1.15, color: ativo ? DOURADO : m.tem ? CREME : SUB, textShadow: SOMBRA_DO_TEXTO, padding: `0 ${u(2)}` }}>{m.nome}</span>
                  </button>
                );
              })}
            </div>
            <p className="font-cinzel text-center shrink-0" style={{ fontSize: u(6), lineHeight: 1.45, color: SUB, textShadow: SOMBRA_DO_TEXTO, padding: `${u(2)} ${u(10)}` }}>{T.comoGanhar}</p>
          </AreaQueRola>
        )}
      </PalcoPixel>
    </div>
  );
}
