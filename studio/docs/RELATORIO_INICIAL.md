# Relatório inicial do estúdio

Data: 12/11/2026 · Ambiente: cloud do Claude Code, Python 3.13.18, Pillow 12.3.0 (sem NumPy, sem Node para o núcleo).

## O que foi construído
- **5 skills** em `.claude/skills/`: `pixel-art-master`, `monster-generator`, `weapon-generator`, `icon-generator`, `pixel-art-auditor`.
- **Núcleo Python** (`studio/nocthera_studio/`): 4 verificações (dimensões, transparência, paleta, pixels), auditoria, folha de revisão, pós-processamento, manifesto com portão de aprovação, prompts, camada de provedores (`manual`, `comando_externo`, `http_api`).
- **Scripts**: `verificar_dimensoes|transparencia|paleta|pixels.py` e `auditar.py` (saída 1 = reprovado, `--json`).
- **Visualizador** `viewer/index.html`: celular, zoom 50–800%, xadrez/fundos, grade, inspetor de pixel, marcação de problemas, comparação (lado a lado, cortina, alternar, diferença).
- **Documentação** em português (`README.md` + 5 documentos) e CI (`.github/workflows/estudio.yml`).

## O que foi testado (e resultado)
| Item | Como | Resultado |
|---|---|---|
| Suíte automática | `python3 -m unittest` | **35 testes OK em ~6 s** (sem warnings de depreciação) |
| Verificações | fixtures sintéticas de cada defeito (ampliação, antialiasing, blur, fundo, xadrez falso, fora da paleta, ruído, soltos, alfa parcial, tamanho, PNG sem alfa, não-PNG, retângulo) | cada defeito gera o código de erro esperado; sprite válido vira `pendente_revisao_visual`, **nunca** "aprovado" |
| "Resolução correta não basta" | 128×128 que é 32×32 ampliado | reprovado por `ampliado_inteiro` |
| Pós-processamento | saída "bruta" sintética (640², suave, fundo magenta) → 96 e 128, métodos `box/nearest/moda` | 0 erros em dimensões/transparência/paleta; alfa binário |
| Portão de aprovação | recusa sem checklist, sem leitura fria, com auditoria reprovada; invalida se o PNG mudar | OK |
| Provedores | `manual` sem imagem para com `⏸` (exit 2) e **não cria arte**; `http_api` inativo/sem chave falha explícito; `http_api` contra **servidor HTTP local mock** (auth, semente, base64) | OK |
| CLI ponta a ponta | `gerar` → candidato 96×96 → folha → manifesto → `aprovar` em pasta isolada | OK |
| Visualizador | Chromium, emulação iPhone 13 (DPR 2), pinça via toque (CDP) | zoom trava em 50% e 800% (botões e pinça), inspetor devolve `#5B9A38 · α 255`, 5 modos funcionam, sem erros de console, sem rolagem horizontal (390=390) |

## Calibração com arte real (achados)
- **Ícones atuais do jogo** (`src/assets/icons/attr-*.png`, `resource-hp.png`): 4.100–6.100 cores, 1.000–1.900 pixels semitransparentes, 17–20% de pixels de mistura, ~95% de clusters de 1 px → **reprovados** (são ilustrações suaves, não pixel art nativa). `race-*.png` (196×196) também fogem do padrão de resolução.
- **Galeria do aseprite-ai-artist** (`pebbly-*.png` 128×128) e favicon 96×96: na verdade 16×16 ampliados 8× e 6× → `ampliado_inteiro`. A resolução "bonita" escondia a resolução nativa real.
- **`eldritch_130x160.png` (pxl)** é uma cena com moldura. Depois do pós-processamento o auditor deu **0 erros e 0 avisos** — só a folha de revisão (silhueta preta = retângulo) mostrou o problema. Isso gerou a checagem `silhueta_retangular`. É a prova prática de que métricas não bastam e de por que a revisão visual é obrigatória.

## Lacunas e riscos (honestos)
1. **Nenhuma API de imagem foi ligada nem testada contra um serviço real.** Só a arquitetura (interface + cliente JSON genérico validado com mock). Falta escolher o fornecedor, a chave e ajustar `config/provedores.json`.
2. **Não existe ainda nenhum sprite 96/128 de qualidade de produção** para calibrar os limiares (ruído, antialiasing, clusters). Os atuais foram ajustados com os casos acima; esperam-se falsos positivos/negativos até haver arte real.
3. **Qualidade do pós-processamento sobre saídas reais de modelos é desconhecida.** A redução `box` + paleta pode produzir sprites moles que passam nas métricas; a revisão visual decide.
4. **O portão de aprovação é de processo**: impede aprovação sem registro, mas não impede um revisor de mentir. A disciplina vem das skills (abrir a folha, leitura fria).
5. **As skills não foram exercitadas por uma execução real de agente** (gatilhos/descrições não validados).
6. **Visualizador** testado só em Chromium emulado; não em iOS/Safari ou celular físico, nem com biblioteca grande.
7. **Escopo ainda fora**: animação/spritesheets, `exportar` para `src/assets|public`, rig, tilesets, séries (coerência automática), integração operacional com `pxl`/Aseprite (apenas documentada via `comando_externo`).
8. Detecção de antialiasing é heurística (pode marcar rampa legítima de 1 px); sempre conferir `locais` na folha.
9. Tests usam imagens sintéticas apenas como fixtures de validador; não são arte do jogo e não ficam em `assets/`.

## Próximos passos sugeridos
1. Escolher o fornecedor de imagem e ligar `http_api` (ou um provedor próprio) com chave no segredo do ambiente.
2. Gerar 3 sprites-piloto (Rato da Peste 96, Espada Longa 128, Dente Afiado 96 — briefings prontos), passar pelo fluxo completo e **recalibrar** `config/padroes.json`.
3. Definir com o time se os ícones atuais serão refeitos em pixel art nativa.
4. Adicionar `exportar` (somente `aprovados/`) e, se necessário, spritesheets/animação.
5. (Opcional) hook de SessionStart para garantir Pillow em toda sessão cloud.
