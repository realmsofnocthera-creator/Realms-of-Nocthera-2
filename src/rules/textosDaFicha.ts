/**
 * Os textos da ficha do personagem num lugar só, para a tradução futura (a arte da ficha não leva mais texto escrito).
 * Hoje só português do Brasil. Texto com `{nivel}` troca o valor na hora de mostrar.
 */
export const TEXTOS_DA_FICHA = {
  voltarAoHub: 'Voltar ao Hub',
  navegacao: 'Navegação da ficha',
  abas: {
    personagem: 'Personagem',
    equipamentos: 'Equipamentos',
    emblemas: 'Emblemas',
    alma: 'Alma',
    almaBloqueada: 'Alma (abre no nível {nivel})',
  },
  identidade: { nivelMaximo: 'Nível máximo', xp: 'XP', nivel: 'Nv. {nivel}/30' },
  atributos: {
    titulo: 'Atributos',
    explicacoes: 'Explicações',
    hp: 'HP',
    sobreescudo: 'Sobreescudo',
    critico: 'Crítico',
    vigor: 'Vigor',
    sorte: 'Sorte',
    forca: 'Força',
    vitalidade: 'Vitalidade',
    arcano: 'Arcano',
    inteligencia: 'Inteligência',
    agilidade: 'Agilidade',
  },
  habilidades: { titulo: 'Habilidades' },
  desenvolvimento: { titulo: 'Desenvolvimento de personagem', descricao: 'Aprimore e evolua as habilidades do seu personagem.' },
  poderTotal: 'Poder Total',
  conta: { menu: 'Menu da conta', titulo: 'Conta', desconectar: 'Desconectar da conta', fechar: 'Fechar' },
} as const;

/** Troca `{nivel}` e afins pelo valor. */
export function textoDaFicha(modelo: string, valores: Record<string, string | number> = {}): string {
  return modelo.replace(/\{(\w+)\}/g, (_, k: string) => String(valores[k] ?? ''));
}
