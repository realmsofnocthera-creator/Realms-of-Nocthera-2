'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { EstadoDaGuilda, MinhaGuilda } from '@/server/guildas';
import { NIVEIS_DA_GUILDA } from '@/rules/guilda';
import { FICHA_UI } from '@/assets/personagemUi';
import { PRACA_DA_GUILDA, type MolduraDaPraca } from '@/assets/guildaUi';
import { textoDaFicha } from '@/rules/textosDaFicha';
import { TEXTOS_DA_GUILDA as T } from '@/rules/textosDaGuilda';
import { BarraDeTitulo, PainelDaForja } from '@/components/forja/KitDaForja';
import { CONTORNO_PIXEL } from '@/components/ficha/PlacaPixel';
import { PracaDaGuilda, type MolduraComPlaca, type PlacaDaPraca } from './PracaDaGuilda';
import {
  BarraG,
  chamar,
  JanelaDaGuilda,
  SecaoChefe,
  SecaoContratos,
  SecaoConvites,
  SecaoCriar,
  SecaoIncursoes,
  SecaoMembros,
  SecaoNossaGuilda,
  SecaoOpcoes,
  SecaoPedidos,
  SecaoPesquisa,
  SecaoProcurar,
  type Token,
} from './SecoesDaGuilda';
import { administraEntrada } from '@/rules/guilda';

/** As janelas que a praça abre (uma por placa e o quadro do centro). */
type Janela = 'nossa' | 'contratos' | 'incursoes' | 'pesquisa' | 'chefe' | 'membros' | 'opcoes' | 'convites' | 'pedidos' | 'procurar' | 'criar';

const pixel: React.CSSProperties = { imageRendering: 'pixelated' };

/**
 * Guildas (7.3) na praça em pixel (arte e vídeo do Yuri): as molduras de madeira são os botões. Com guilda: as 4 placas da
 * esquerda abrem Contratos, Incursões, Pesquisa e Chefe semanal; o losango abre os Membros, a placa redonda as Opções
 * (entrada de membros, sair e desfazer) e o quadro do centro mostra a guilda (toque para ver o nível e a descrição).
 * Sem guilda: as placas viram Convites, Pedidos, Procurar e Criar. As regras e as rotas são as de antes.
 */
export function GuildaScreen({ tokenFresco }: { tokenFresco: Token }) {
  const [estado, setEstado] = useState<EstadoDaGuilda | null>(null);
  const [erroAoCarregar, setErroAoCarregar] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [janela, setJanela] = useState<Janela | null>(null);

  const carregar = useCallback(async () => {
    const r = await chamar(tokenFresco, '/api/guilda');
    if (r.ok) setEstado(r.dados as unknown as EstadoDaGuilda);
    else setErroAoCarregar(true);
  }, [tokenFresco]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  /** Faz a ação no servidor; devolve true se deu certo. */
  const agir = useCallback(
    async (acao: string, extra: Record<string, unknown> = {}): Promise<boolean> => {
      setOcupado(true);
      setAviso(null);
      const r = await chamar(tokenFresco, '/api/guilda', { acao, ...extra });
      setOcupado(false);
      if (!r.ok) {
        setAviso({ texto: String(r.dados.error ?? T.erroDaAcao), erro: true });
        return false;
      }
      setAviso({ texto: String(r.dados.mensagem ?? T.feito), erro: false });
      setEstado(r.dados.estado as EstadoDaGuilda);
      return true;
    },
    [tokenFresco]
  );

  const minha: MinhaGuilda | null = estado?.minha ?? null;
  const admin = !!minha && administraEntrada(minha.meuCargo);

  // o texto de cada moldura da praça
  const placas: Partial<Record<MolduraComPlaca, PlacaDaPraca | null>> = {};
  if (estado && minha) {
    const prontos = estado.contratos.filter((c) => c.pronto && !c.entregue).length;
    const inc = minha.incursao;
    placas.placa1 = { rotulo: T.placas.contratos, aviso: prontos };
    placas.placa2 = { rotulo: T.placas.incursoes, subrotulo: inc.liberada ? textoDaFicha(T.incursoes.lutasNaPlaca, { restantes: inc.lutasPorDia - inc.minhasLutasHoje, total: inc.lutasPorDia }) : NIVEIS_DA_GUILDA[inc.nivelDaGuildaParaLiberar - 1].nome };
    placas.placa3 = { rotulo: T.placas.pesquisa, subrotulo: minha.pesquisa.liberada ? undefined : NIVEIS_DA_GUILDA[minha.pesquisa.nivelDaGuildaParaLiberar - 1].nome };
    placas.placa4 = { rotulo: T.placas.chefe, aviso: minha.chefeSemanal.liberado ? minha.chefeSemanal.pendentes.length : 0, subrotulo: minha.chefeSemanal.liberado ? undefined : NIVEIS_DA_GUILDA[minha.chefeSemanal.nivelDaGuildaParaLiberar - 1].nome };
    placas.losango = { rotulo: T.placas.membros };
    placas.redonda = { rotulo: T.placas.opcoes, aviso: admin ? minha.pedidos.length : 0 };
  } else if (estado) {
    placas.placa1 = { rotulo: T.placas.convites, aviso: estado.convites.length };
    placas.placa2 = { rotulo: T.placas.pedidos, aviso: estado.pedidos.length };
    placas.placa3 = { rotulo: T.placas.procurar };
    placas.placa4 = { rotulo: T.placas.criar };
  }

  const abrir = (m: MolduraDaPraca) => {
    setAviso(null);
    const mapa: Record<MolduraDaPraca, Janela> = estado?.minha
      ? { placa1: 'contratos', placa2: 'incursoes', placa3: 'pesquisa', placa4: 'chefe', losango: 'membros', redonda: 'opcoes', quadro: 'nossa' }
      : { placa1: 'convites', placa2: 'pedidos', placa3: 'procurar', placa4: 'criar', losango: 'convites', redonda: 'convites', quadro: 'convites' };
    setJanela(mapa[m]);
  };

  // o quadro grande do centro
  const quadro = erroAoCarregar ? (
    <span role="alert" className="font-cinzel font-bold text-[2.3cqw] leading-snug text-[#FFB4B4]" style={{ textShadow: CONTORNO_PIXEL }}>{T.erroAoCarregar}</span>
  ) : !estado ? (
    <span className="font-cinzel font-bold text-[2.8cqw] text-[#FFE9B0]" style={{ textShadow: CONTORNO_PIXEL }}>{T.carregando}</span>
  ) : minha ? (
    <>
      <span className="font-cinzel font-extrabold uppercase text-[3.6cqw] leading-[1.25] text-[#FFE9B0]" style={{ textShadow: CONTORNO_PIXEL }}>{minha.nome}</span>
      <span className="font-cinzel font-bold text-[2.3cqw] leading-[1.3] text-[#F3C98B]" style={{ textShadow: CONTORNO_PIXEL }}>{minha.nivel.nome} · {textoDaFicha(T.quadro.nivel, { n: minha.nivel.nivel })}</span>
      <div className="w-[82%]"><BarraG valor={minha.nivel.xpNoNivel} maximo={minha.nivel.xpDoNivel || 1} rotulo={T.nivel.xpAria} /></div>
      <span className="font-cinzel font-bold text-[2.1cqw] leading-[1.3] text-[#F3C98B]" style={{ textShadow: CONTORNO_PIXEL }}>{textoDaFicha(T.quadro.membros, { n: minha.membros.length, max: minha.maxMembros })}</span>
    </>
  ) : (
    <>
      <span className="font-cinzel font-extrabold uppercase text-[3.4cqw] leading-[1.25] text-[#FFE9B0]" style={{ textShadow: CONTORNO_PIXEL }}>{T.quadro.semGuilda}</span>
      <span className="font-cinzel font-bold text-[2.2cqw] leading-[1.3] text-[#F3C98B]" style={{ textShadow: CONTORNO_PIXEL }}>{T.quadro.escolha}</span>
    </>
  );

  const avisoNaTela = aviso && (
    <PainelDaForja borda="1.8cqw" role={aviso.erro ? 'alert' : 'status'} className="w-full max-w-[86cqw]">
      <p className={`font-cinzel font-bold text-[2.4cqw] leading-snug text-center ${aviso.erro ? 'text-[#FFB4B4]' : 'text-[#9BE3A0]'}`}>{aviso.texto}</p>
    </PainelDaForja>
  );

  const titulosDaJanela: Record<Janela, string> = {
    nossa: T.nivel.titulo,
    contratos: T.contratos.titulo,
    incursoes: T.incursoes.titulo,
    pesquisa: T.pesquisa.titulo,
    chefe: T.chefe.titulo,
    membros: T.membros.titulo,
    opcoes: T.opcoes.titulo,
    convites: T.semGuilda.convitesRecebidos,
    pedidos: T.semGuilda.seusPedidos,
    procurar: T.semGuilda.procurar,
    criar: T.semGuilda.criar,
  };

  const conteudo = (): React.ReactNode => {
    if (!estado || !janela) return null;
    if (minha) {
      switch (janela) {
        case 'nossa': return <SecaoNossaGuilda guilda={minha} agir={agir} ocupado={ocupado} />;
        case 'contratos': return <SecaoContratos contratos={estado.contratos} agir={agir} ocupado={ocupado} />;
        case 'incursoes': return <SecaoIncursoes incursao={minha.incursao} agir={agir} ocupado={ocupado} />;
        case 'pesquisa': return <SecaoPesquisa pesquisa={minha.pesquisa} eu={estado.eu} agir={agir} ocupado={ocupado} />;
        case 'chefe': return <SecaoChefe chefe={minha.chefeSemanal} agir={agir} ocupado={ocupado} />;
        case 'membros': return <SecaoMembros guilda={minha} agir={agir} ocupado={ocupado} />;
        case 'opcoes': return <SecaoOpcoes guilda={minha} agir={agir} ocupado={ocupado} />;
        default: return null;
      }
    }
    switch (janela) {
      case 'convites': return <SecaoConvites estado={estado} agir={agir} ocupado={ocupado} />;
      case 'pedidos': return <SecaoPedidos estado={estado} agir={agir} ocupado={ocupado} />;
      case 'procurar': return <SecaoProcurar estado={estado} agir={agir} ocupado={ocupado} tokenFresco={tokenFresco} />;
      case 'criar': return <SecaoCriar estado={estado} agir={agir} ocupado={ocupado} />;
      default: return null;
    }
  };

  // se entrar numa guilda (ou sair) com uma janela aberta, a janela some junto com o estado que a sustentava
  const janelaValida = !!janela && !!estado && (minha ? ['nossa', 'contratos', 'incursoes', 'pesquisa', 'chefe', 'membros', 'opcoes'].includes(janela) : ['convites', 'pedidos', 'procurar', 'criar'].includes(janela));

  return (
    <main className="relative h-[100dvh] max-h-[100dvh] w-full overflow-hidden select-none bg-[#05070D] text-[#F5F3E0]">
      {/* o fundo atrás da praça (a própria imagem, escurecida e desfocada) para telas mais altas que a arte */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={PRACA_DA_GUILDA.imagem} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full object-cover opacity-45 blur-[10px] scale-110 pointer-events-none" style={pixel} />

      <div className="forja-palco">
        <div className="flex-1 min-h-0 overflow-y-auto forja-rolagem flex">
          <div className="my-auto w-full">
            <PracaDaGuilda
              placas={placas}
              aoAbrir={abrir}
              quadro={quadro}
              quadroAria={minha ? textoDaFicha(T.quadro.abrir, { nome: minha.nome }) : T.praca}
              quadroAtivo={!!minha}
              topo={
                <>
                  <Link href="/hud" aria-label={T.voltar} className="absolute top-[1.4cqw] left-[2cqw] block w-[7.4cqw] cursor-pointer active:translate-y-px">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={FICHA_UI.voltar} alt="" aria-hidden="true" draggable={false} className="block w-full h-auto pointer-events-none" style={pixel} />
                  </Link>
                  <div className="absolute top-[1.2cqw] left-[11cqw] w-[44cqw]"><BarraDeTitulo titulo={T.titulo} /></div>
                </>
              }
              rodape={!janelaValida ? avisoNaTela : null}
            />
          </div>
        </div>
      </div>

      {janelaValida && janela && (
        <JanelaDaGuilda titulo={titulosDaJanela[janela]} aoFechar={() => setJanela(null)}>
          {avisoNaTela}
          {conteudo()}
        </JanelaDaGuilda>
      )}
    </main>
  );
}
