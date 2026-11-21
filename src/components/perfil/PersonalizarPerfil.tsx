'use client';

import React, { useState } from 'react';
import { ARENA_UI } from '@/assets/arenaUi';
import { AVATAR_IMAGES, getAvatarFaceStyle, resolveAvatarSrc } from '@/assets/avatars';
import { TELAS_UI } from '@/assets/telasSociaisUi';
import { PalcoPixel, Texto } from '@/components/pixel/GradePixel';
import { Abas, AreaQueRola, AvisoDaTela, Cabecalho, CREME, DOURADO, FaixaDeArte, Icone, Rotulo, SUB, SOMBRA_DO_TEXTO, pixel, u } from '@/components/pixel/PecasDeTela';
import { auth } from '@/lib/firebase';
import { avataresLiberados, DEFAULT_AVATAR_ID } from '@/rules/avatars';
import { getClassById } from '@/rules/classes';
import { MOLDURAS_DISPONIVEIS } from '@/rules/molduras';
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

/** O rosto do avatar num círculo, com a moldura do Hub por cima (a moldura padrão de todo personagem). */
function Rosto({ avatarId, classeId, x, y, d }: { avatarId?: string; classeId: string; x: number; y: number; d: number }) {
  return (
    <div className="absolute" style={{ left: u(x), top: u(y), width: u(d), height: u(d) }}>
      <div className="absolute rounded-full overflow-hidden" style={{ left: '7%', top: '7%', width: '86%', height: '86%', backgroundColor: '#16120E' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={resolveAvatarSrc(avatarId, classeId)} alt="" aria-hidden draggable={false} className="w-full h-full select-none pointer-events-none" style={getAvatarFaceStyle(avatarId, classeId)} />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={TELAS_UI.molduraPerfil} alt="" aria-hidden draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" style={pixel} />
    </div>
  );
}

/**
 * Personalizar o perfil (avatar, título e moldura), sobre o altar do Buscar: o rosto com a moldura em cima, as três abas e a lista de cada uma.
 * Os avatares liberados ficam nas molduras da Coleção (a dourada é a escolhida); os títulos, nos cartões do kit da Arena. As molduras do perfil ainda
 * não têm arte: aparece só a Padrão (a do Hub).
 */
export function PersonalizarPerfil({ personagem, abaInicial = 'avatar', aoFechar, aoTrocarAvatar, aoTrocarTitulo }: {
  personagem: CharacterDocument; abaInicial?: AbaDoPerfil; aoFechar: () => void; aoTrocarAvatar: (id: string) => void; aoTrocarTitulo: (id: string) => void;
}) {
  const [aba, setAba] = useState<AbaDoPerfil>(abaInicial);
  const [avatarId, setAvatarId] = useState(personagem.avatarId || DEFAULT_AVATAR_ID);
  const [tituloId, setTituloId] = useState(personagem.tituloId ?? '');
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const meusTitulos = (personagem.titulos ?? []).filter((id) => TITULO_MAP[id]);
  const avatares = avataresLiberados(personagem);

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

  async function escolherTitulo(id: string) {
    if (ocupado || id === tituloId) return;
    setOcupado(true);
    setAviso(null);
    try {
      const t = await token();
      const res = await fetch('/api/conquistas', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t ?? ''}` }, body: JSON.stringify({ acao: 'titulo', titulo: id }) });
      const dados = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(dados.error || T.erroTitulo);
      setTituloId(id);
      aoTrocarTitulo(id);
    } catch (e) {
      setAviso({ texto: e instanceof Error ? e.message : T.erroTitulo, erro: true });
    } finally {
      setOcupado(false);
    }
  }

  const nomeDoAvatar = (a: (typeof avatares)[number]) => getClassById(a.id)?.nome || SUBCLASSES.find((s) => s.id === a.subclasseId)?.nome || a.id;

  return (
    <div className="fixed inset-0 z-[100]">
      <PalcoPixel fundo={TELAS_UI.fundoPerfil}>
        <Cabecalho titulo={T.titulo} voltar={aoFechar} rotuloVoltar={TT.voltar} />
        <AvisoDaTela aviso={aviso} y={66} />
        <Rosto avatarId={avatarId} classeId={personagem.classeId} x={146} y={70} d={68} />
        <Texto x={180} y={148} tamanho={9} largura={300} cor={CREME}>{personagem.nome}</Texto>
        <Texto x={180} y={160} tamanho={6.4} caixaAlta largura={300} cor={DOURADO}>{tituloId ? TITULO_MAP[tituloId]?.nome ?? T.semTitulo : T.semTitulo}</Texto>
        <Abas rotulo={T.titulo} y={170} ativa={aba} aoMudar={setAba} abas={[{ id: 'avatar', nome: T.abas.avatar }, { id: 'titulo', nome: T.abas.titulo }, { id: 'moldura', nome: T.abas.moldura }]} />

        {aba === 'avatar' && (
          <AreaQueRola topo={216} base={532} rotulo={T.abas.avatar}>
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
          <AreaQueRola topo={216} base={532} rotulo={T.abas.titulo}>
            {[{ id: '', nome: T.semTitulo, origem: T.naoMostrar }, ...meusTitulos.map((id) => TITULO_MAP[id])].map((t) => {
              const ativo = tituloId === t.id;
              return (
                <FaixaDeArte key={t.id || 'nenhum'} src={ativo ? ARENA_UI.card.forte : ARENA_UI.card.neutro} a={44} esq={85} dir={22} onClick={() => void escolherTitulo(t.id)} rotulo={t.nome} pressionada={ativo}>
                  <Icone src={ARENA_UI.louros} x={14} y={13} l={22} a={18} style={{ filter: t.id ? undefined : 'grayscale(1) brightness(.6)' }} />
                  <Rotulo x={56} y={19} tamanho={7.4} largura={230} cor={ativo ? DOURADO : CREME}>{t.nome}</Rotulo>
                  <Rotulo x={56} y={30} tamanho={5} largura={240} cor="#D9CBB0" negrito={false}>{t.origem}</Rotulo>
                  {ativo && <Icone src={TELAS_UI.feito} x={308} y={14} l={16} a={16} alt={T.escolhido} />}
                </FaixaDeArte>
              );
            })}
            <p className="font-cinzel text-center shrink-0" style={{ fontSize: u(6), color: SUB, textShadow: SOMBRA_DO_TEXTO, padding: `${u(3)} ${u(8)}` }}>{T.seusTitulos(meusTitulos.length)}</p>
          </AreaQueRola>
        )}

        {aba === 'moldura' && (
          <AreaQueRola topo={216} base={532} rotulo={T.abas.moldura}>
            <FaixaDeArte src={ARENA_UI.card.forte} a={50} esq={85} dir={22} pressionada>
              <Icone src={TELAS_UI.molduraPerfil} x={9} y={7} l={36} a={36} />
              <Rotulo x={56} y={22} tamanho={8} largura={230} cor={DOURADO}>{T.padrao}</Rotulo>
              <Rotulo x={56} y={34} tamanho={5.2} largura={240} cor="#D9CBB0" negrito={false}>{T.molduraPadrao}</Rotulo>
              <Icone src={TELAS_UI.feito} x={308} y={17} l={16} a={16} alt={T.escolhido} />
            </FaixaDeArte>
            {MOLDURAS_DISPONIVEIS.map((m) => (
              <FaixaDeArte key={m.id} src={ARENA_UI.card.neutro} a={50} esq={85} dir={22}>
                <Rotulo x={56} y={25} tamanho={8} largura={230}>{m.nome}</Rotulo>
              </FaixaDeArte>
            ))}
            <p className="font-cinzel text-center shrink-0" style={{ fontSize: u(6.6), lineHeight: 1.45, color: SUB, textShadow: SOMBRA_DO_TEXTO, padding: `${u(6)} ${u(10)}` }}>{T.semMolduras}</p>
          </AreaQueRola>
        )}
      </PalcoPixel>
    </div>
  );
}
