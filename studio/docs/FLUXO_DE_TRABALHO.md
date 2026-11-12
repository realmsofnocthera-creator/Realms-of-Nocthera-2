# Fluxo de trabalho

```
briefing.json ─► prompt ─► provedor de imagem ─► bruto ─► pós-processamento ─► candidato.png
                                                                                    │
                             manifesto ◄── aprovar ◄── REVISÃO VISUAL ◄── auditoria + folha
```

1. **Briefing** — copie um de `config/briefs/` e preencha `id`, `categoria` (`monstro|arma|icone`), `descricao` (inglês, para o modelo), `materiais`, `raridade`, `tamanho` (96|128), `semente`. Ancore no jogo (`src/rules/…`).
2. **Gerar** — `python3 -m nocthera_studio gerar config/briefs/x.json [--provedor http_api]`.
   - O prompt e a negativa ficam em `assets/bruto/<id>/prompt.json`.
   - Sem provedor ativo (padrão `manual`) o comando responde `⏸` e espera `assets/entrada/<id>.png` — gere com a ferramenta que quiser e rode de novo.
3. **Pós-processamento** (embutido) — remove fundo liso, enquadra, reduz com `box` (padrão), mapeia à `nocthera-32` respeitando o limite de cores, alfa binário, limpa pixels soltos, contorno opcional. Isso **corrige formato**, não qualidade artística.
4. **Auditoria técnica** — `auditar … --folha`. Erro ⇒ `reprovado`; 0 erros ⇒ `pendente_revisao_visual`.
5. **Revisão visual** — abra `assets/previews/<id>.folha.png`; escreva a leitura fria; percorra `checklist`.
6. **Aprovar** —
   ```bash
   python3 -m nocthera_studio aprovar monstro-rato-da-peste --revisor "Nome" \
     --leitura-fria "Um rato corcunda de pelo ralo e olhos amarelos, cauda enrolada à direita." \
     --confirmo silhueta clusters contorno paleta leitura_1x direcao_de_arte originalidade
   ```
   Recusa se: faltar item, leitura curta, auditoria atual com erro, ou arquivo mudou (hash).
7. **Mostrar** — `manifesto` + `servir`; abra `/viewer/` no celular.

## Estados de um ativo (`assets/manifesto.json`)

`rascunho → auditado | reprovado → aprovado`. Alterar o PNG depois de aprovado volta o status para `rascunho` (`revisao_invalidada`).

## Pastas

| Pasta | Conteúdo | Versionada |
|---|---|---|
| `assets/entrada/` | imagens trazidas de fora (provedor manual) | não |
| `assets/bruto/<id>/` | prompt + saídas brutas do modelo | não (reproduzível) |
| `assets/candidatos/<monstros\|armas\|icones>/` | PNG nativo pós-processado | sim |
| `assets/aprovados/<categoria>/` | cópia do que passou na revisão | sim |
| `assets/relatorios/` | `<id>.audit.json` | sim |
| `assets/previews/` | folhas de revisão | não |

## Levando a arte para o jogo

A arte final fica neste repositório. Só `assets/aprovados/` deve ser consumido por `src/assets/…`/`public/…` (futuro `exportar`). Os ícones atuais do jogo não são pixel art nativa (ver `RELATORIO_INICIAL.md`).
