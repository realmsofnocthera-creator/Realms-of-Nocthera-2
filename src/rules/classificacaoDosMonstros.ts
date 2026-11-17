import type { ClassificacaoDeMonstro } from '@/rules/maestrias';

/**
 * A classificação de cada criatura da Caçada nas 13 classificações do bestiário (as do Yuri, 23/10/2026; os ícones já existem
 * em `maestriasUi`). (proposta, a confirmar: o Yuri ainda não tinha dito quais criaturas ficam em cada uma.)
 * As subespécies seguem a criatura base. Espectros e Amaldiçoados ainda não têm criatura na Caçada.
 */
const POR_CLASSIFICACAO: Readonly<Record<ClassificacaoDeMonstro, readonly string[]>> = {
  necrofagos: ['esqueleto', 'esqueleto-flamejante', 'esqueleto-amaldicoado', 'pesthyr', 'pesthyr-carmesim', 'pesthyr-glacial'],
  espectros: [],
  feras: [
    'rato-da-floresta', 'rato-das-cinzas', 'rato-pestilento',
    'lobo-cinzento', 'lobo-gelido', 'lobo-carmesim',
    'urso-gigante', 'urso-glacial', 'urso-colerico',
    'vargheist', 'vargheist-vulcanico', 'vargheist-albino',
    'grizzharn', 'grizzharn-glacial', 'grizzharn-ancestral',
  ],
  amaldicoados: [],
  hibridos: ['vargheist-alfa', 'vargheist-alfa-carmesim', 'vargheist-alfa-vulcanico'],
  insectoides: ['rhazkida', 'rhazkida-escarlate', 'rhazkida-cristalina', 'nythrakka', 'nythrakka-venenosa', 'nythrakka-fantasma', 'nythrakka-matriarca-do-casulo', 'matriarca-putrefata'],
  elementais: ['drazhkar', 'drazhkar-de-obsidiana', 'drazhkar-sismico', 'kharvok', 'kharvok-de-obsidiana'],
  relictos: ['floragoth', 'floragoth-carmesim', 'floragoth-abissal'],
  ogroides: ['cryovarn', 'cryovarn-abissal', 'cryovarn-furioso'],
  draconideos: [
    'zaryth', 'zaryth-vulcanico', 'zaryth-abissal',
    'vorthak', 'vorthak-carmesim',
    'dravoryx', 'dravoryx-tempestuoso',
    'gravorn', 'gravorn-magmatico',
    'raizark', 'raizark-fulminante',
    'rathmorn', 'rathmorn-abissal',
    'zyrak', 'zyrak-carmesim',
    'dromvark', 'dromvark-devastador',
  ],
  vampiros: ['noctyrr', 'noctyrr-tempestuoso', 'noctyrr-abissal'],
  leviatas: ['murdrax', 'murdrax-corrosivo', 'murdrax-de-basalto', 'abysskar', 'abysskar-abissal', 'thalassyr', 'thalassyr-abissal', 'urdumor'],
  primordiais: ['vaelgrun', 'nershaga', 'ghorvazul', 'tharvok', 'dravakhar', 'oryndrak', 'reydras'],
};

export const CLASSIFICACAO_DO_MONSTRO: Readonly<Record<string, ClassificacaoDeMonstro>> = Object.fromEntries(
  (Object.entries(POR_CLASSIFICACAO) as [ClassificacaoDeMonstro, readonly string[]][]).flatMap(([classificacao, ids]) => ids.map((id) => [id, classificacao]))
);
