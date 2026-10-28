import React from 'react';
import { ATTRIBUTE_DISPLAY_NAMES, getAttributeExplanation } from '@/rules/attributeInfo';
import type { AttributeName } from '@/rules/attributes';
import { GAME_CONFIG } from '@/rules/config';
import { MODIFICADOR_FRAQUEZA, MODIFICADOR_IMUNIDADE, MODIFICADOR_RESISTENCIA_FORTE } from '@/rules/elements';
import {
  CONGELAMENTO_LENTIDAO_PERCENTUAL,
  CONGELAMENTO_LENTIDAO_RODADAS,
  CONGELAMENTO_PERCENTUAL_HP_MAX,
  LOUCURA_ACOES_PERDIDAS,
  LOUCURA_PERCENTUAL_HP_MAX,
  MALDICAO_PERCENTUAL_HP_MAX,
  PARALISIA_LENTIDAO_PERCENTUAL,
  PARALISIA_LENTIDAO_RODADAS,
  PODRIDAO_ESCARLATE_DURACAO_RODADAS,
  PODRIDAO_ESCARLATE_PERCENTUAL_HP_MAX,
  QUEIMADURA_DURACAO_RODADAS,
  QUEIMADURA_PERCENTUAL_HP_MAX,
  SANGRAMENTO_PERCENTUAL_HP_MAX,
  SONO_ACOES_PERDIDAS,
  VENENO_DURACAO_RODADAS,
  VENENO_PERCENTUAL_HP_MAX,
} from '@/rules/statusEffects';
import { Revelar } from './Revelar';

/**
 * Explicação do combate para a página inicial. Os números vêm das mesmas constantes que o motor de combate usa
 * (`GAME_CONFIG`, `statusEffects`, `elements`), então o texto não sai de sincronia quando uma regra muda.
 */

const PASSOS = [
  {
    titulo: 'Quem começa',
    texto: `Quem tem mais Agilidade ataca primeiro (empate é sorteio). Com o dobro da Agilidade do oponente, você ataca ${GAME_CONFIG.MAXIMO_ATAQUES_POR_TURNO} vezes por turno.`,
  },
  {
    titulo: 'Seu golpe',
    texto: 'A luta é automática: seu personagem usa o ataque da vocação sozinho. O dano é físico (Força) ou mágico (Inteligência), e os bônus de dano são somados num grupo só.',
  },
  {
    titulo: 'Crítico',
    texto: `Todo golpe tem ${GAME_CONFIG.CHANCE_CRITICO_BASE_PERCENTUAL}% de chance de crítico, mais ${String(GAME_CONFIG.CHANCE_CRITICO_POR_PONTO_SORTE).replace('.', ',')}% por ponto de Sorte. O crítico causa ${GAME_CONFIG.MULTIPLICADOR_CRITICO}x de dano, depois da defesa.`,
  },
  {
    titulo: 'A defesa do alvo',
    texto: `O dano perde a mitigação do alvo (física ou mágica, sempre com pelo menos ${GAME_CONFIG.DANO_MINIMO} de dano). O que sobra gasta primeiro o Sobreescudo e só depois o HP.`,
  },
  {
    titulo: 'Teto de defesa',
    texto: `Todas as reduções de dano recebido somadas nunca passam de ${GAME_CONFIG.TETO_REDUCAO_DANO_PERCENTUAL}%. Só a Imortalidade Breve zera o dano.`,
  },
  {
    titulo: 'Fim da luta',
    texto: `Vence quem zerar o HP do outro. Todo monstro começa a luta com Sobreescudo igual a ${GAME_CONFIG.SOBREESCUDO_MONSTRO_PERCENTUAL_HP}% do HP dele.`,
  },
] as const;

const ORDEM_ATRIBUTOS: readonly AttributeName[] = ['vigor', 'forca', 'inteligencia', 'vitalidade', 'arcano', 'agilidade', 'sorte'];

const MARCOS = [
  { nivel: 1, nome: 'Ataque básico', texto: 'O golpe da vocação, usado em toda rodada.' },
  { nivel: 5, nome: 'Habilidade especial', texto: 'Dispara sozinha em momentos próprios de cada vocação (por exemplo, a cada N golpes seguidos).' },
  { nivel: 12, nome: 'Passiva I', texto: 'Um bônus permanente que muda o jeito de lutar da vocação.' },
  { nivel: 20, nome: 'Passiva II e subclasse', texto: 'Mais um bônus permanente, e a escolha de uma das 12 subclasses.' },
  { nivel: 30, nome: 'Ultimate', texto: 'O golpe mais forte da vocação, acionado automaticamente.' },
] as const;

const ELEMENTOS = ['Fogo', 'Gelo', 'Relâmpago', 'Terra', 'Vento', 'Sagrado', 'Sombrio'] as const;

const STATUS = [
  { nome: 'Sangramento', texto: `Dano imediato de ${SANGRAMENTO_PERCENTUAL_HP_MAX}% do HP máximo de quem sofre.` },
  { nome: 'Veneno', texto: `${VENENO_PERCENTUAL_HP_MAX}% do HP máximo por rodada, durante ${VENENO_DURACAO_RODADAS} rodadas.` },
  { nome: 'Queimadura', texto: `${QUEIMADURA_PERCENTUAL_HP_MAX}% do HP máximo por rodada, durante ${QUEIMADURA_DURACAO_RODADAS} rodadas.` },
  { nome: 'Podridão Escarlate', texto: `${PODRIDAO_ESCARLATE_PERCENTUAL_HP_MAX}% do HP máximo por rodada, durante ${PODRIDAO_ESCARLATE_DURACAO_RODADAS} rodadas.` },
  { nome: 'Congelamento', texto: `Dano de ${CONGELAMENTO_PERCENTUAL_HP_MAX}% do HP máximo e ${CONGELAMENTO_LENTIDAO_PERCENTUAL}% de lentidão por ${CONGELAMENTO_LENTIDAO_RODADAS} rodadas. Um golpe de fogo encerra a lentidão.` },
  { nome: 'Sono', texto: `Quem sofre perde ${SONO_ACOES_PERDIDAS} ações.` },
  { nome: 'Loucura', texto: `Dano de ${LOUCURA_PERCENTUAL_HP_MAX}% do HP máximo e perda de ${LOUCURA_ACOES_PERDIDAS} ação.` },
  { nome: 'Paralisia', texto: `Não age até ser atingido; depois fica ${PARALISIA_LENTIDAO_PERCENTUAL}% mais lento por ${PARALISIA_LENTIDAO_RODADAS} rodadas.` },
  { nome: 'Maldição', texto: `Muito rara: dano de ${MALDICAO_PERCENTUAL_HP_MAX}% do HP máximo.` },
] as const;

function Cartao({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`border-4 border-[#1A120B] shadow-[0_0_0_2px_#B2A66C] bg-[#1C1B18]/85 p-4 ${className}`}>{children}</div>;
}

function Subtitulo({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-12 mb-5 text-center font-[family-name:var(--font-pixel)] uppercase text-[#ED8A0C] text-xs sm:text-sm leading-relaxed [text-shadow:0_2px_0_#7a4506]">
      {children}
    </h3>
  );
}

export function ExplicacaoDoCombate() {
  return (
    <div>
      <Revelar>
        <Subtitulo>Uma luta, passo a passo</Subtitulo>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PASSOS.map((p, i) => (
            <li key={p.titulo}>
              <Cartao className="h-full">
                <p className="font-[family-name:var(--font-pixel)] text-[10px] uppercase leading-relaxed text-[#F5F3E0]">
                  <span className="text-[#ED8A0C] mr-2">{i + 1}.</span>
                  {p.titulo}
                </p>
                <p className="mt-3 text-xs sm:text-sm text-[#E2D6B6] leading-relaxed">{p.texto}</p>
              </Cartao>
            </li>
          ))}
        </ol>
      </Revelar>

      <Revelar>
        <Subtitulo>Os 7 atributos</Subtitulo>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ORDEM_ATRIBUTOS.map((a) => (
            <li key={a}>
              <Cartao className="h-full">
                <p className="font-[family-name:var(--font-pixel)] text-[10px] uppercase leading-relaxed text-[#F5F3E0]">{ATTRIBUTE_DISPLAY_NAMES[a]}</p>
                <p className="mt-3 text-xs sm:text-sm text-[#E2D6B6] leading-relaxed">{getAttributeExplanation(a)}</p>
              </Cartao>
            </li>
          ))}
        </ul>
      </Revelar>

      <Revelar>
        <Subtitulo>As habilidades da vocação</Subtitulo>
        <p className="text-center max-w-2xl mx-auto mb-5 text-xs sm:text-sm text-[#E2D6B6] leading-relaxed">
          Cada uma das 6 vocações ganha 5 marcos ao subir de nível, todos no combate automático. Os golpes e passivas mudam de vocação para vocação.
        </p>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {MARCOS.map((m) => (
            <li key={m.nome}>
              <Cartao className="h-full text-center">
                <p className="font-[family-name:var(--font-pixel)] text-[10px] uppercase text-[#ED8A0C]">Nível {m.nivel}</p>
                <p className="mt-3 font-[family-name:var(--font-silk)] text-sm uppercase tracking-wider text-[#F5F3E0]">{m.nome}</p>
                <p className="mt-2 text-xs text-[#E2D6B6] leading-relaxed">{m.texto}</p>
              </Cartao>
            </li>
          ))}
        </ol>
      </Revelar>

      <Revelar>
        <Subtitulo>Elementos e tipos de golpe</Subtitulo>
        <div className="grid gap-4 md:grid-cols-2">
          <Cartao>
            <p className="font-[family-name:var(--font-pixel)] text-[10px] uppercase leading-relaxed text-[#F5F3E0]">7 elementos</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {ELEMENTOS.map((e) => (
                <li key={e} className="border-2 border-[#B2A66C]/70 bg-[#120F0C] px-3 py-1 font-[family-name:var(--font-silk)] text-xs uppercase tracking-wider text-[#F5F3E0]">
                  {e}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs sm:text-sm text-[#E2D6B6] leading-relaxed">
              Quem é fraco a um elemento leva +{MODIFICADOR_FRAQUEZA}% de dano dele. Quem resiste leva {MODIFICADOR_RESISTENCIA_FORTE}%, e quem é imune leva {MODIFICADOR_IMUNIDADE}%.
            </p>
          </Cartao>
          <Cartao>
            <p className="font-[family-name:var(--font-pixel)] text-[10px] uppercase leading-relaxed text-[#F5F3E0]">Tipo de golpe × corpo</p>
            <p className="mt-3 text-xs sm:text-sm text-[#E2D6B6] leading-relaxed">
              A arma define o tipo do golpe físico: Contusão, Corte ou Perfuração. O dano mágico é um tipo à parte. Cada criatura tem um corpo (rochoso, escamoso, etéreo e outros) que é fraco a alguns tipos e resistente a outros: +{GAME_CONFIG.MODIFICADOR_TIPO_DANO_PERCENTUAL}% de dano na fraqueza e −{GAME_CONFIG.MODIFICADOR_TIPO_DANO_PERCENTUAL}% na resistência.
            </p>
          </Cartao>
        </div>
      </Revelar>

      <Revelar>
        <Subtitulo>Efeitos de status</Subtitulo>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STATUS.map((s) => (
            <li key={s.nome}>
              <Cartao className="h-full">
                <p className="font-[family-name:var(--font-pixel)] text-[10px] uppercase leading-relaxed text-[#F5F3E0]">{s.nome}</p>
                <p className="mt-3 text-xs sm:text-sm text-[#E2D6B6] leading-relaxed">{s.texto}</p>
              </Cartao>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-center text-xs sm:text-sm text-[#E2D6B6] leading-relaxed">Os chefes são imunes a Sono, Paralisia e Congelamento, mas ainda sofrem dano contínuo e debuffs.</p>
      </Revelar>

      <Revelar>
        <Subtitulo>Povo, equipamento e chefes</Subtitulo>
        <div className="grid gap-4 md:grid-cols-3">
          <Cartao>
            <p className="font-[family-name:var(--font-pixel)] text-[10px] uppercase leading-relaxed text-[#F5F3E0]">Habilidade do povo</p>
            <p className="mt-3 text-xs sm:text-sm text-[#E2D6B6] leading-relaxed">
              Cada povo tem uma passiva e uma habilidade ativa própria, sem custo, só recarga de {GAME_CONFIG.RECARGA_HABILIDADE_RACIAL_RODADAS} rodadas. Ela dispara sozinha quando o HP fica abaixo de {GAME_CONFIG.LIMITE_HP_RACIAL_PERCENTUAL}%.
            </p>
          </Cartao>
          <Cartao>
            <p className="font-[family-name:var(--font-pixel)] text-[10px] uppercase leading-relaxed text-[#F5F3E0]">Equipamento</p>
            <p className="mt-3 text-xs sm:text-sm text-[#E2D6B6] leading-relaxed">
              Armas dão o tipo do golpe e podem trazer elemento. Armaduras, emblemas e a forja acrescentam efeitos que entram no combate automático.
            </p>
          </Cartao>
          <Cartao>
            <p className="font-[family-name:var(--font-pixel)] text-[10px] uppercase leading-relaxed text-[#F5F3E0]">Monstros e chefes</p>
            <p className="mt-3 text-xs sm:text-sm text-[#E2D6B6] leading-relaxed">
              Abaixo de {GAME_CONFIG.ENFURECIDO_LIMIAR_HP_PERCENTUAL}% de HP, o monstro da Caçada fica Enfurecido e ganha +{GAME_CONFIG.ENFURECIDO_BONUS_DANO_PERCENTUAL}% de dano. Os chefes têm mecânicas próprias.
            </p>
          </Cartao>
        </div>
      </Revelar>
    </div>
  );
}
