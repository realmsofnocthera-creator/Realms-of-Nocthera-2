# Padrões técnicos e como ler o relatório

Limiares em `config/padroes.json`. Cada achado tem `verificacao/codigo`, severidade (`erro`, `aviso`, `info`) e, quando possível, `locais` (coordenadas [x,y]) mostradas na folha e no visualizador (botão **Problemas**).

## Dimensões
| Código | Sev. | Significado |
|---|---|---|
| `formato_invalido` | erro | não é PNG |
| `dimensao_invalida` | erro | não é 96×96 nem 128×128 |
| `ampliado_inteiro` | erro | todas as transições de cor caem em múltiplos de *f* (MDC > 1): é arte (W/f)×(H/f) ampliada *f*× |
| `provavel_ampliacao` | aviso | ≥97% das transições em múltiplos de *f* (ampliação com ruído) |

## Transparência
`sem_canal_alfa`, `alfa_parcial` (0<α<255), `sem_transparencia`, `fundo_embutido`, `xadrez_falso`, `imagem_vazia` → **erro**. `rgb_oculto` (cor em α=0), `encosta_na_borda`, `extensao_fora_do_padrao` → aviso.

## Paleta
`cores_demais` (acima do limite da categoria) e `fora_da_paleta` → erro (a mensagem lista as cores mais próximas da paleta). `cores_quase_iguais` (distância RGB ≤ 6) e `cores_raras` (≤2 px) → aviso. A análise de pares é limitada a 200 cores (acima disso já é reprovado).

## Pixels
| Código | Sev. | Critério |
|---|---|---|
| `antialiasing` / `antialiasing_suspeito` | erro ≥10% / aviso ≥4% | pixel = média (±14) de dois vizinhos opostos distintos com contraste ≥40 |
| `pixels_soltos` | erro >6 / aviso ≥1 | opaco sem nenhum vizinho opaco (8-conexo) |
| `ruido` | erro ≥25% / aviso ≥10% | pixels em clusters de cor de 1 px |
| `clusters_pequenos` | aviso | cluster médio <3 px |
| `dither_excessivo` | aviso | ≥6% em xadrez |
| `sem_contorno` / `contorno_irregular` | erro <40% / aviso <70% | borda mais escura que o interior |
| `silhueta_retangular` / `silhueta_quase_retangular` | erro ≥97% / aviso ≥90% | área ÷ caixa: é cena/moldura, não silhueta |
| `fragmentos`, `silhueta_fragmentada`, `buracos_minusculos`, `borda_serrilhada` | aviso | ilhas <4 px, corpo principal <90%, buracos 1–2 px, perímetro/√área >14 |

Imagens com lado >512 px só passam pela checagem de dimensões (não são sprites de produção).

## Calibração
Os limiares foram ajustados medindo: os ícones atuais do jogo (ilustrações suaves → devem reprovar), artes pixel art reais das referências (16×16 ampliadas → `ampliado_inteiro`; cena 130×160 → `silhueta_retangular`) e fixtures sintéticas de defeito nos testes. **Não foram calibrados com sprites 96/128 nativos de qualidade de produção, porque ainda não existe nenhum** — recalibre quando houver (`docs/RELATORIO_INICIAL.md`, "Lacunas").

## Limites do auditor
Detecta defeitos **mecânicos**. Não julga anatomia, estilo, gosto, coerência de série nem plágio. Por isso existe o `aprovar` com revisão visual.
