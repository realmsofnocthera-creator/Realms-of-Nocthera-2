'use client';

import React, { useEffect, useState } from 'react';
import { ARENA_UI } from '@/assets/arenaUi';
import { TELAS_UI } from '@/assets/telasSociaisUi';
import { PalcoPixel } from '@/components/pixel/GradePixel';
import { AreaQueRola, Cabecalho, FaixaDeArte, Icone, PergaminhoAberto, Recado, Rotulo, u } from '@/components/pixel/PecasDeTela';
import { NOME_DO_TIPO_DE_ANUNCIO, validarAnuncio, type AnuncioDados, type TipoDeAnuncio } from '@/rules/anuncio';
import { TEXTOS_DAS_TELAS as TT } from '@/rules/textosDasTelasSociais';
import { descreverJanela } from '@/lib/anunciosTela';
import { marcarAnunciosComoVistos } from '@/lib/useAnunciosNovos';

const T = TT.anuncios;
const COR_DO_TIPO: Readonly<Record<TipoDeAnuncio, string>> = { novidade: '#7BC47F', aviso: '#E6C775', manutencao: '#E5484D', evento: '#5AA7F0' };
/** Manutenção e avisos ficam no cartão dourado; novidades e eventos, no prateado. */
const CARTAO_DO_TIPO: Readonly<Record<TipoDeAnuncio, string>> = { novidade: ARENA_UI.card.neutro, aviso: ARENA_UI.card.forte, manutencao: ARENA_UI.card.forte, evento: ARENA_UI.card.neutro };

interface Item {
  id: string;
  dados: AnuncioDados;
}

/** A etiqueta colorida do tipo do anúncio (Novidade, Aviso, Manutenção, Evento). */
function Etiqueta({ tipo, x, y }: { tipo: TipoDeAnuncio; x: number; y: number }) {
  return (
    <span className="absolute font-cinzel font-black uppercase" style={{ left: u(x), top: u(y), fontSize: u(4.8), lineHeight: 1, padding: `${u(1.4)} ${u(3)}`, color: '#0D0D0D', backgroundColor: COR_DO_TIPO[tipo], border: `${u(0.6)} solid rgba(0,0,0,.6)` }}>{NOME_DO_TIPO_DE_ANUNCIO[tipo]}</span>
  );
}

/** Anúncios do Menu (3.5.3.4), sobre a Torre: o que o painel publicou e está valendo agora; tocar num anúncio abre o pergaminho com o texto inteiro. */
export function AnunciosScreen({ tokenFresco }: { tokenFresco: () => Promise<string | null> }) {
  const [itens, setItens] = useState<Item[] | null>(null);
  const [erro, setErro] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    void (async () => {
      try {
        const token = await tokenFresco();
        const res = await fetch('/api/conteudo/anuncio', { headers: { Authorization: `Bearer ${token ?? ''}` } });
        if (!res.ok) throw new Error('falhou');
        const { itens: lista } = (await res.json()) as { itens: { id: string; dados: unknown }[] };
        const validos = lista.flatMap((i) => {
          const v = validarAnuncio(i.dados);
          return v.ok ? [{ id: i.id, dados: v.dados }] : [];
        });
        if (!cancelado) {
          setItens(validos);
          marcarAnunciosComoVistos(validos.map((v) => v.id));
        }
      } catch {
        if (!cancelado) setErro(true);
      }
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const item = itens?.find((i) => i.id === aberto);

  return (
    <PalcoPixel fundo={TELAS_UI.fundoAnuncios}>
      <Cabecalho titulo={T.titulo} voltar="/menu" rotuloVoltar={TT.voltarAoMenu} />
      {erro ? <Recado erro>{T.erro}</Recado>
        : itens === null ? <Recado>{TT.carregando}</Recado>
        : itens.length === 0 ? <Recado>{T.nenhum}</Recado>
        : (
          <AreaQueRola topo={80} base={532}>
            {itens.map(({ id, dados }) => (
              <FaixaDeArte key={id} src={CARTAO_DO_TIPO[dados.tipo]} a={50} esq={85} dir={22} onClick={() => setAberto(id)} rotulo={T.abrir(dados.titulo)}>
                <Icone src={TELAS_UI.sigilo} x={10} y={10} l={30} a={30} />
                <Etiqueta tipo={dados.tipo} x={60} y={13} />
                <Rotulo x={60} y={28} tamanho={7.6} largura={230}>{dados.titulo}</Rotulo>
                <Rotulo x={60} y={37.5} tamanho={5} largura={230} cor="#D9CBB0" negrito={false}>{dados.inicio || dados.fim ? descreverJanela(dados) : dados.texto.split('\n')[0]}</Rotulo>
              </FaixaDeArte>
            ))}
          </AreaQueRola>
        )}
      {item && (
        <PergaminhoAberto src={TELAS_UI.pergaminho} titulo={item.dados.titulo} aoFechar={() => setAberto(null)} rotuloFechar={TT.fechar}>
          <p style={{ fontWeight: 800, color: '#7a3a10', marginBottom: '0.5em' }}>{NOME_DO_TIPO_DE_ANUNCIO[item.dados.tipo]}</p>
          <p className="whitespace-pre-wrap">{item.dados.texto}</p>
          {(item.dados.inicio || item.dados.fim) && <p style={{ marginTop: '0.8em', fontSize: '0.85em', opacity: 0.85 }}>{descreverJanela(item.dados)}</p>}
        </PergaminhoAberto>
      )}
    </PalcoPixel>
  );
}
