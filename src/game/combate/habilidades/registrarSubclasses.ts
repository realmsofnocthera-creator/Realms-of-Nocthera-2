import { carregarKitsPadrao } from './registro';

/**
 * Registra todas as habilidades e passivas de subclasses conhecidas no registro central.
 * Função idempotente: o que já estiver registrado é mantido. Normalmente não é preciso
 * chamá-la, porque o registro carrega os kits na primeira consulta; ela serve para
 * recolocar os kits depois de limparRegistroParaTestes().
 */
export function registrarHabilidadesDeSubclasse(): void {
  carregarKitsPadrao();
}
