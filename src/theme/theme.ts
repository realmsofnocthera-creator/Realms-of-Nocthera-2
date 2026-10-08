/**
 * Realms of Nocthera — Tema Central (Dark Fantasy)
 * Tokens de cor nomeados semanticamente para reutilização em todo o projeto.
 */

export const NOCTHERA_PALETTE = {
  // Dourado / Âmbar (destaques, botões, títulos)
  goldPrimary: '#ED8A0C',
  goldBright: '#F58C0C',

  // Ouro pálido (bordas, ícones secundários, divisores)
  paleGold: '#B2A66C',
  paleGoldLight: '#D5C7A4',

  // Fundo principal (escuro)
  bgAbyss: '#0D0D0D',
  bgObsidian: '#120F0C',

  // Fundo de seções / cards
  surfaceCard: '#1C1B18',
  surfaceElevated: '#2B2824',

  // Texto principal (bege palha, não branco puro)
  textParchment: '#F5F3E0',
  textSand: '#E2D6B6',

  // Vermelho carmim (avisos, dano, HP)
  crimson: '#6B1212',

  // Verde esmeralda (sucesso, confirmação)
  emerald: '#1B4D2E',
  emeraldLight: '#A5D6A7',

  // Azul espectral (magia, arcano, Mana)
  spectralBlue: '#4A6274',

  // Roxo escuro místico (identidade da ficha)
  purpleDeep: '#23122B',
  purpleDark: '#170B1C',

  // Alerta / Indicador de notificação (ponto pulsante)
  notificationDot: '#E53E3E',
} as const;

export const NOCTHERA_THEME = {
  colors: {
    notificationDot: NOCTHERA_PALETTE.notificationDot, // #E53E3E
    accent: {
      primary: NOCTHERA_PALETTE.goldPrimary, // #ED8A0C
      hover: NOCTHERA_PALETTE.goldBright, // #F58C0C
    },
    border: {
      default: NOCTHERA_PALETTE.paleGold, // #B2A66C
      highlight: NOCTHERA_PALETTE.paleGoldLight, // #D5C7A4
      active: NOCTHERA_PALETTE.goldPrimary, // #ED8A0C
    },
    background: {
      primary: NOCTHERA_PALETTE.bgAbyss, // #0D0D0D
      secondary: NOCTHERA_PALETTE.bgObsidian, // #120F0C
      card: NOCTHERA_PALETTE.surfaceCard, // #1C1B18
      cardElevated: NOCTHERA_PALETTE.surfaceElevated, // #2B2824
      purpleDeep: NOCTHERA_PALETTE.purpleDeep, // #23122B
      purpleDark: NOCTHERA_PALETTE.purpleDark, // #170B1C
    },
    text: {
      primary: NOCTHERA_PALETTE.textParchment, // #F5F3E0
      secondary: NOCTHERA_PALETTE.textSand, // #E2D6B6
      muted: NOCTHERA_PALETTE.paleGoldLight, // #D5C7A4
      accent: NOCTHERA_PALETTE.goldPrimary, // #ED8A0C
    },
    status: {
      danger: NOCTHERA_PALETTE.crimson, // #6B1212
      success: NOCTHERA_PALETTE.emerald, // #1B4D2E
      successText: NOCTHERA_PALETTE.emeraldLight, // #A5D6A7
      arcane: NOCTHERA_PALETTE.spectralBlue, // #4A6274
    },
  },
} as const;

export type NoctheraTheme = typeof NOCTHERA_THEME;
