import type { ResultadoValidacao } from '@/rules/mapa';

/**
 * Cena (Campanha, 5.5-4): uma sequência de telas com texto, usada para cutscenes e diálogos. Cada tela é uma NARRAÇÃO
 * (texto, sem falante) ou uma FALA (quem fala, com o retrato dele um pouco acima da caixa de diálogo). O fundo
 * (ilustração) vale até outra tela trocar ou tirar. As imagens ficam no armazenamento de arquivos (R2), enviadas pelo
 * Painel. A cena é conteúdo versionado: rascunho, publicação, histórico e volta atrás, como os mapas.
 */
export const FORMATO_DA_CENA = 1;
export const TITULO_DA_CENA_MAXIMO = 80;
export const TEXTO_DA_TELA_MAXIMO = 600;
export const NOME_DO_PERSONAGEM_MAXIMO = 40;
export const MAXIMO_DE_TELAS = 60;
export const MAXIMO_DE_PERSONAGENS = 12;
/** O falante "jogador" é o personagem de quem está jogando (nome da ficha); não entra na lista de personagens. */
export const ID_DO_JOGADOR = 'jogador';
export const ID_DE_PERSONAGEM = /^[a-z0-9][a-z0-9-]{0,23}$/;
/** O que vale como imagem da cena: o arquivo enviado pelo painel ao armazenamento (nome = SHA-256 do conteúdo). */
export const CHAVE_DA_IMAGEM_DE_CENA = /^cenas\/[0-9a-f]{64}\.(png|jpg|webp)$/;
export const BYTES_MAXIMOS_DA_IMAGEM_DE_CENA = 1_048_576;
export const TEXTO_PROVISORIO = 'Escreva o texto desta tela.';

export interface PersonagemDaCena {
  id: string;
  nome: string;
  /** Endereço do retrato, mostrado acima da caixa de diálogo quando o personagem fala. */
  retrato?: string;
}

export type TelaDaCena =
  | { tipo: 'narracao'; texto: string; fundo?: string | null }
  | { tipo: 'fala'; personagem: string; texto: string; fundo?: string | null };

export interface CenaDados {
  formato: typeof FORMATO_DA_CENA;
  titulo: string;
  personagens: PersonagemDaCena[];
  telas: TelaDaCena[];
}

/** A chave "cenas/<hash>.<ext>" no fim do endereço, ou null se o endereço não é de uma imagem de cena. */
export function chaveDaImagemDeCenaNoEndereco(endereco: string): string | null {
  const m = /^https:\/\/[^\s?#]+?\/(cenas\/[0-9a-f]{64}\.(?:png|jpg|webp))$/.exec(endereco);
  return m ? m[1] : null;
}

/** Todos os endereços de imagem que a cena usa (retratos e fundos), sem repetir. */
export function imagensDaCena(c: Pick<CenaDados, 'personagens' | 'telas'>): string[] {
  const urls = new Set<string>();
  for (const p of c.personagens) if (p.retrato) urls.add(p.retrato);
  for (const t of c.telas) if (t.fundo) urls.add(t.fundo);
  return [...urls];
}

const eObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function imagemValida(v: unknown, rotulo: string, erros: string[]): string | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== 'string' || !chaveDaImagemDeCenaNoEndereco(v)) {
    erros.push(`${rotulo}: a imagem precisa ser uma enviada pelo painel.`);
    return undefined;
  }
  return v;
}

export function validarCena(bruto: unknown): ResultadoValidacao<CenaDados> {
  if (!eObjeto(bruto)) return { ok: false, erros: ['A cena precisa ser um objeto.'] };
  const erros: string[] = [];
  const extras = Object.keys(bruto).filter((k) => !['formato', 'titulo', 'personagens', 'telas'].includes(k));
  if (extras.length) erros.push(`Campos desconhecidos na cena: ${extras.join(', ')}.`);
  if (bruto.formato !== FORMATO_DA_CENA) erros.push(`Formato da cena não suportado (esperado ${FORMATO_DA_CENA}).`);
  const titulo = typeof bruto.titulo === 'string' ? bruto.titulo.trim() : '';
  if (titulo.length < 2 || titulo.length > TITULO_DA_CENA_MAXIMO) erros.push(`Título: de 2 a ${TITULO_DA_CENA_MAXIMO} caracteres.`);

  const personagens: PersonagemDaCena[] = [];
  if (!Array.isArray(bruto.personagens) || bruto.personagens.length > MAXIMO_DE_PERSONAGENS) {
    erros.push(`Os personagens são uma lista de até ${MAXIMO_DE_PERSONAGENS}.`);
  } else {
    const ids = new Set<string>();
    bruto.personagens.forEach((p, i) => {
      const rotulo = `Personagem ${i + 1}`;
      if (!eObjeto(p)) return void erros.push(`${rotulo}: formato inválido.`);
      const extra = Object.keys(p).filter((k) => !['id', 'nome', 'retrato'].includes(k));
      if (extra.length) erros.push(`${rotulo}: campos desconhecidos (${extra.join(', ')}).`);
      const id = typeof p.id === 'string' ? p.id : '';
      if (!ID_DE_PERSONAGEM.test(id) || id === ID_DO_JOGADOR) erros.push(`${rotulo}: identificador inválido (minúsculas, números e hífen; "${ID_DO_JOGADOR}" é reservado).`);
      else if (ids.has(id)) erros.push(`${rotulo}: identificador repetido.`);
      ids.add(id);
      const nome = typeof p.nome === 'string' ? p.nome.trim() : '';
      if (nome.length < 1 || nome.length > NOME_DO_PERSONAGEM_MAXIMO) erros.push(`${rotulo}: o nome vai de 1 a ${NOME_DO_PERSONAGEM_MAXIMO} caracteres.`);
      const retrato = imagemValida(p.retrato, `${rotulo} (retrato)`, erros);
      personagens.push({ id, nome, ...(retrato ? { retrato } : {}) });
    });
  }

  const telas: TelaDaCena[] = [];
  if (!Array.isArray(bruto.telas) || bruto.telas.length < 1 || bruto.telas.length > MAXIMO_DE_TELAS) {
    erros.push(`A cena tem de 1 a ${MAXIMO_DE_TELAS} telas.`);
  } else {
    const idsValidos = new Set([ID_DO_JOGADOR, ...personagens.map((p) => p.id)]);
    bruto.telas.forEach((t, i) => {
      const rotulo = `Tela ${i + 1}`;
      if (!eObjeto(t)) return void erros.push(`${rotulo}: formato inválido.`);
      const extra = Object.keys(t).filter((k) => !['tipo', 'texto', 'fundo', 'personagem'].includes(k));
      if (extra.length) erros.push(`${rotulo}: campos desconhecidos (${extra.join(', ')}).`);
      const texto = typeof t.texto === 'string' ? t.texto.trim() : '';
      if (texto.length < 1 || texto.length > TEXTO_DA_TELA_MAXIMO) erros.push(`${rotulo}: o texto vai de 1 a ${TEXTO_DA_TELA_MAXIMO} caracteres.`);
      let fundo: string | null | undefined;
      if (t.fundo === null) fundo = null;
      else fundo = imagemValida(t.fundo, `${rotulo} (fundo)`, erros);
      if (t.tipo === 'narracao') {
        if (t.personagem !== undefined) erros.push(`${rotulo}: a narração não tem falante.`);
        telas.push({ tipo: 'narracao', texto, ...(fundo !== undefined ? { fundo } : {}) });
      } else if (t.tipo === 'fala') {
        const quem = typeof t.personagem === 'string' ? t.personagem : '';
        if (!idsValidos.has(quem)) erros.push(`${rotulo}: o falante precisa ser o jogador ou um personagem da cena.`);
        telas.push({ tipo: 'fala', personagem: quem, texto, ...(fundo !== undefined ? { fundo } : {}) });
      } else {
        erros.push(`${rotulo}: o tipo é "narracao" ou "fala".`);
      }
    });
  }

  if (erros.length) return { ok: false, erros };
  return { ok: true, dados: { formato: FORMATO_DA_CENA, titulo, personagens, telas } };
}

/** Rascunho novo: uma narração com texto provisório (satisfaz o schema). */
export function cenaEmBranco(titulo = ''): CenaDados {
  return { formato: FORMATO_DA_CENA, titulo, personagens: [], telas: [{ tipo: 'narracao', texto: TEXTO_PROVISORIO }] };
}

/** Quem fala na tela: o nome e o retrato; `null` se a tela é uma narração. O jogador usa o nome dele (e o retrato dele, se houver). */
export function falanteDaTela(cena: Pick<CenaDados, 'personagens'>, tela: TelaDaCena, jogador: { nome: string; retrato?: string }): { nome: string; retrato?: string } | null {
  if (tela.tipo !== 'fala') return null;
  if (tela.personagem === ID_DO_JOGADOR) return jogador;
  const p = cena.personagens.find((x) => x.id === tela.personagem);
  return p ? { nome: p.nome, retrato: p.retrato } : null;
}

/** O fundo que vale na tela `indice`: o último definido até ali (null ou nenhum = sem fundo). */
export function fundoDaTela(cena: Pick<CenaDados, 'telas'>, indice: number): string | null {
  let fundo: string | null = null;
  for (let i = 0; i <= indice && i < cena.telas.length; i++) {
    const f = cena.telas[i].fundo;
    if (f !== undefined) fundo = f;
  }
  return fundo;
}
