import { AttributeName, ATTRIBUTES } from './attributes';
import { GAME_CONFIG } from './config';

export const ATTRIBUTE_DISPLAY_NAMES: Record<AttributeName, string> = {
  vigor: 'Vigor',
  sorte: 'Sorte',
  forca: 'Força',
  vitalidade: 'Vitalidade',
  arcano: 'Arcano',
  inteligencia: 'Inteligência',
  agilidade: 'Agilidade',
};

// Constantes base por ponto (1 quando não existe constante nomeada específica no GAME_CONFIG)
const DANO_FISICO_POR_PONTO_FORCA = 1;
const MITIGACAO_FISICA_POR_PONTO_VITALIDADE = 1;
const MITIGACAO_MAGICA_POR_PONTO_ARCANO = 1;
const DANO_MAGICO_POR_PONTO_INTELIGENCIA = 1;

function formatarPercentual(valor: number): string {
  return `${String(valor).replace('.', ',')}%`;
}

export function getAttributeExplanation(attr: AttributeName): string {
  switch (attr) {
    case 'vigor':
      return `Cada ponto de Vigor aumenta seu HP máximo em ${GAME_CONFIG.HP_POR_PONTO_VIGOR}.`;
    case 'sorte':
      return `Cada ponto de Sorte aumenta a chance de acerto crítico em ${formatarPercentual(GAME_CONFIG.CHANCE_CRITICO_POR_PONTO_SORTE)} (base de ${GAME_CONFIG.CHANCE_CRITICO_BASE_PERCENTUAL}%; o crítico causa ${GAME_CONFIG.MULTIPLICADOR_CRITICO}x de dano) e a chance de drops em ${formatarPercentual(GAME_CONFIG.CHANCE_DROP_POR_PONTO_SORTE)}.`;
    case 'forca':
      return `Cada ponto de Força aumenta seu dano físico em ${DANO_FISICO_POR_PONTO_FORCA}.`;
    case 'vitalidade':
      return `Cada ponto de Vitalidade aumenta sua mitigação física em ${MITIGACAO_FISICA_POR_PONTO_VITALIDADE} e seu Sobreescudo máximo em ${GAME_CONFIG.SOBREESCUDO_POR_PONTO_VITALIDADE}.`;
    case 'arcano':
      return `Cada ponto de Arcano aumenta sua mitigação mágica em ${MITIGACAO_MAGICA_POR_PONTO_ARCANO}.`;
    case 'inteligencia':
      return `Cada ponto de Inteligência aumenta seu dano mágico em ${DANO_MAGICO_POR_PONTO_INTELIGENCIA}.`;
    case 'agilidade':
      return `Quem tem mais Agilidade começa o combate (em caso de empate, é sorteio). Com o dobro da Agilidade do oponente, você ataca ${GAME_CONFIG.MAXIMO_ATAQUES_POR_TURNO} vezes por turno (máximo de ${GAME_CONFIG.MAXIMO_ATAQUES_POR_TURNO}).`;
    default:
      return '';
  }
}

export { ATTRIBUTES };
