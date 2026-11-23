import { ehTitulo } from './titulos';
import { nivelDoVip } from './vip';

/**
 * As recompensas exclusivas do VIP (as de aparência), por nível. Os bônus de XP e de ouro, o ouro diário e as vantagens que mudam limites
 * (mochila, tentativas) valem sozinhos e ficam em `vip.ts`; aqui estão os itens que o jogador RESGATA no baú da tela VIP.
 * Os nomes são provisórios (o Yuri dá os nomes finais com as artes). Uma recompensa só pode ser resgatada quando tem `entrega` e o item já existe
 * no jogo (um título que já está no catálogo; a moldura vem junto, porque as molduras abrem pelo título). Sem isso, aparece como "arte em produção".
 */
export type TipoDeRecompensaVip = 'moldura' | 'titulo' | 'skin' | 'aura' | 'efeito' | 'emblema' | 'decoracao';

export const NOME_DO_TIPO_DE_RECOMPENSA: Readonly<Record<TipoDeRecompensaVip, string>> = {
  moldura: 'Moldura',
  titulo: 'Título',
  skin: 'Skin',
  aura: 'Aura',
  efeito: 'Efeito',
  emblema: 'Emblema',
  decoracao: 'Decoração de chat',
};

export interface RecompensaDoVip {
  id: string;
  nivel: number;
  tipo: TipoDeRecompensaVip;
  /** Nome provisório. */
  nome: string;
  /** O que o resgate entrega quando o item existir: hoje, só títulos (a moldura abre junto pelo título). */
  entrega?: { titulo: string };
}

const r = (nivel: number, tipo: TipoDeRecompensaVip, nome: string): RecompensaDoVip => ({ id: `vip-${nivel}-${tipo}`, nivel, tipo, nome });

export const RECOMPENSAS_DO_VIP: readonly RecompensaDoVip[] = [
  r(1, 'moldura', 'Moldura VIP'),
  r(2, 'titulo', 'Título VIP: Adepto'),
  r(3, 'moldura', 'Moldura VIP exclusiva'),
  r(4, 'skin', 'Skin VIP'),
  r(5, 'moldura', 'Moldura animada VIP'),
  r(6, 'efeito', 'Efeito de entrada em combate VIP'),
  r(7, 'emblema', 'Emblema VIP do chat e da guilda'),
  r(7, 'skin', 'Skin VIP exclusiva'),
  r(8, 'decoracao', 'Decoração VIP do chat'),
  r(8, 'moldura', 'Moldura lendária animada VIP'),
  r(9, 'aura', 'Aura VIP'),
  r(9, 'titulo', 'Título VIP especial'),
  r(10, 'skin', 'Skin mítica VIP'),
  r(10, 'efeito', 'Efeito VIP especial no perfil'),
  r(10, 'moldura', 'Moldura VIP Transcendente'),
  r(10, 'titulo', 'Título VIP Transcendente'),
];

export const recompensasDoNivel = (nivel: number): RecompensaDoVip[] => RECOMPENSAS_DO_VIP.filter((x) => x.nivel === nivel);

/** A recompensa já pode ser entregue (existe o item no jogo)? Senão aparece "arte em produção". */
export const recompensaDisponivel = (x: RecompensaDoVip): boolean => !!x.entrega && ehTitulo(x.entrega.titulo);

interface FichaDoVip {
  gastoReal?: number;
  vipResgatados?: readonly string[];
}

/** As recompensas que o jogador já pode resgatar agora: dos níveis que ele tem, já entregáveis e ainda não resgatadas. */
export function recompensasParaResgatar(ficha: FichaDoVip): RecompensaDoVip[] {
  const nivel = nivelDoVip(ficha.gastoReal);
  const feitas = new Set(ficha.vipResgatados ?? []);
  return RECOMPENSAS_DO_VIP.filter((x) => x.nivel <= nivel && recompensaDisponivel(x) && !feitas.has(x.id));
}

export const FORMATO_DE_RECOMPENSA_RESGATADA = /^vip-\d{1,2}-[a-z]{3,12}$/;

/** Lê os ids resgatados do documento (só ids que existem na tabela). */
export function resgatadosDoDocumento(bruto: unknown): string[] | undefined {
  if (!Array.isArray(bruto)) return undefined;
  const validos = new Set(RECOMPENSAS_DO_VIP.map((x) => x.id));
  const lista = [...new Set(bruto.filter((v): v is string => typeof v === 'string' && FORMATO_DE_RECOMPENSA_RESGATADA.test(v) && validos.has(v)))];
  return lista.length ? lista : undefined;
}
