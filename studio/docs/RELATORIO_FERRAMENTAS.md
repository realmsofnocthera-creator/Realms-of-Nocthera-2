# Relatório de ferramentas externas — 12/11/2026

Sessão cloud, Python 3.13.18, Linux. Cada linha abaixo foi **executada** (`python3 -m nocthera_studio diagnostico`); nada de memória.

## 1. Resposta curta
**Nenhuma ferramenta instalada consegue hoje gerar imagem a partir de texto/referência com um modelo neste ambiente.** O que funciona é: desenhar por código (Pixel Art Studio, codeart2d), limpar/conformar imagens (pixelpipe, pixel_reduce) e auditar (estúdio Nocthera). Para gerar com modelo falta uma de: chave de API, Codex/Grok CLI logado, ou o OAuth do fal feito por você.

## 2. Ferramentas e testes
| Ferramenta | Instalada | Funciona aqui | Gera imagem? | Custo | Pendência | Evidência |
|---|---|---|---|---|---|---|
| Nocthera studio (auditor/pós-processo/viewer) | sim | sim | não (processa, não gera) | grátis | nenhuma | auditor reprova imagem vazia: ok |
| Pixel Art Studio (Pillow, desenho por código) | sim | sim | por código | grátis | nenhuma (revisão visual obrigatória: arte desenhada por código não é geração por modelo) | exemplo slime: exit 0, PNG+GIF criados |
| pixelpipe (limpeza/paleta de PNG sujo) | sim | sim | não (limpa, não gera) | grátis | nenhuma | exit 0, clean.png criado |
| Agent Sprite Forge (generate2dmedia/2dsprite/video2dsprite/2dmap) | sim | sim | não | pago por chave / cota de assinatura (exige --autorizo-gasto) | nenhuma chave configurada (OPENAI, GEMINI, XAI, ARK/BytePlus, FAL), Codex CLI e Grok CLI ausentes | route_media resolve → no-route; chaves=0; codex=False; grok=False; ffmpeg=True |
| codeart2d (ASF, arte por código) | sim | sim | por código | grátis | saída 32px/paleta própria: precisa de PixelSpec 96/128 + paleta nocthera-32 | slime.pixelspec → exit 0, qa pass=True |
| fal MCP remoto (mcp.fal.ai/mcp-relay) | sim | sim | não (OAuth pendente) | pago (créditos fal) | usuário autorizar o OAuth no navegador (conector claude.ai ou /mcp) | HTTP 401; OAuth anunciado: True |

Testes extras executados:
| Teste | Resultado |
|---|---|
| `forge_doctor.py` (ASF) | instalação íntegra: 171 arquivos conferem com o manifesto; 7 itens "MISSING" são todos opcionais (5 chaves de API, Codex CLI, Grok CLI) |
| `route_media.py resolve --kind image` | `no-route` (exit 3) — sem chave/CLI |
| `route_media.py` com chave **fictícia** + 1 referência, `--dry-run` | rota `api:fal` (`fal-ai/nano-banana-2/edit`), estimativa 0,08 USD/imagem — **dry-run, sem rede, sem cobrança** |
| `master_still.py prompt` (Rato da Peste, `--finish hibit`) | OK: prompt de "arte lisa sem contorno, ≤3 tons" publicado (grátis) |
| `master_still.py generate` | `no-route` exit 3: publica o prompt e **não gera** |
| `pixel_reduce.py` (ASF) em arte 32px ampliada 4× | período 4, lógico 32×32 — **concorda** com o auditor Nocthera |
| `render_pixelspec.py` (codeart2d) exemplo slime | `qa: pass`, 3 variantes; saída 32×32 com paleta própria → o auditor a reprova (dimensão/paleta), como esperado |
| `pixel-art-studio` exemplo slime | PNG 1x/8x, GIF opaco/transparente, spritesheet+JSON, `.pxproj.json` |
| `pixelpipe.py` no ícone `attr-forca.png` do jogo | grade recuperada 43×43 (3×), 668 → 15 cores, alfa parcial 0 |
| fal MCP | `POST /mcp-relay` → **401**, OAuth anunciado (`authkit.fal.ai`); sem ferramentas fal na sessão |
| Suíte do ASF (`pytest`) | ver nota abaixo |
| Suíte do estúdio Nocthera | **42 testes OK** (inclui provedor `asf_route` com chave fictícia + script simulado: prova que sem autorização o script "pago" **não é executado**) |

Nota — suíte do ASF: 1.138 passaram antes do primeiro erro; o único erro encontrado (`test_e2e_smoke`) é um **falso positivo do teste** quando `HOME=/root` (procura essa substring em qualquer JSON). Com `HOME` longo, `test_e2e_smoke.py` passa 5/5. Resultado final da suíte completa: ver rodapé.

## 3. Pendências de autenticação (suas)
| Pendência | Quem | Como |
|---|---|---|
| **OAuth do fal MCP** | você, no navegador | `docs/FAL_MCP_OAUTH.md` (conector claude.ai → nova sessão; ou `/mcp` → Authenticate no terminal local) |
| Chave de API (opcional) para a rota do ASF | você | segredo do ambiente (nunca no repositório). **Atenção:** o ASF trata chave configurada como consentimento; só configure se aceitar isso — o estúdio mantém seu próprio portão (`--autorizo-gasto`) |
| Codex CLI / Grok CLI logados (opcional) | você | só existem na sua máquina; não há no contêiner |
| Persistir dependências no ambiente | você (aprovar) | pôr `./setup.sh --completo` no *setup script* do ambiente; não alterei |

## 4. Dependências
Instaladas agora: numpy 2.5.3, scipy 1.18.1, Pillow 12.3.0, resvg-py 0.5.0, pytest 9.2.0, PyYAML, jsonschema. Sistema: ffmpeg 6.1.1, node 22.23. **Efêmeras**: reinstale com `./setup.sh --completo` (`requirements-ferramentas.txt`).
Mudança de rede no ambiente "Default" (aprovada): `mcp.fal.ai` adicionado à allowlist. Reversão em `docs/FAL_MCP_OAUTH.md`.

## 5. O que mudou no repositório
- `.claude/skills/`: +`generate2dsprite`, `generate2dmap`, `generate2dmedia`, `video2dsprite`, `codeart2d` (ASF, verbatim), +`pixel-art-studio` (3 patches documentados), +`nocthera-art-direction`. As 5 skills Nocthera: **só linhas acrescentadas** (+46 linhas; as únicas 2 linhas removidas são frases corrigidas sobre os ícones).
- `.mcp.json` (fal, sem segredo) · `studio/requirements-ferramentas.txt` · `setup.sh --completo`.
- Estúdio: provedor `asf_route`; **portão de gasto** em todo provedor ≠ `manual` (`--planejar`, `--autorizo-gasto USD`, exit 4); `origem` obrigatória para aprovar; comando `diagnostico`.

## 6. Limitações (honestas)
1. **Nada foi gerado por modelo**, então o pipeline modelo → hibit/posprocessar → auditor segue **não validado com saída real**. O provedor `asf_route` foi testado só com script simulado; a rota fal real nunca foi chamada.
2. A rota fal do ASF é **edição por referência** (≥1 imagem); texto→imagem exige o MCP do fal (após OAuth) ou outra chave.
3. As ferramentas por código **não atendem o padrão sozinhas**: codeart2d dá ~32–48 px com paleta própria; o `hibit` do ASF mira 80 px; o acabamento `hd` não é pixel art. É preciso `--canvas`/PixelSpec 96/128 + paleta `nocthera-32`, e o auditor decide.
4. Criaturas complexas desenhadas por código ficam ruins (aviso do próprio Codixel/ASF). Pixel Art Studio serve para ícones, retoques e variantes.
5. Vídeo→sprite, mapas e FX (pixelfx) **não foram testados**: sem rota de vídeo; pixelfx é projeto externo (não clonado).
6. O auditor só detecta ampliação **exata**; ícones do jogo ampliados com suavização (~43 px → 128) passam pela detecção de ampliação e reprovam só por cores/alfa. Estimador fracionário testado e **descartado** por baixa confiabilidade.
7. **Correção do relatório anterior**: os ícones do jogo não são "ilustrações suaves" — são pixel art de ~43 px ampliada. Decisão pendente: 43 px nativos ou refazer a 96/128.
8. `pixel-art-studio` carrega 3 patches locais; atualizar o upstream exige reaplicá-los. A `description` dele ganhou um prefixo de roteamento (o gatilho original competia com as skills do Nocthera).
9. Gatilhos das skills (12 no total, várias com descrições longas e sobrepostas) **não foram validados** por execução real de agente.
10. ElevenLabs (`creative_generate_image`) e Pixelwright aparecem como ferramentas MCP **desta sessão**, não fazem parte do pedido, **não foram testadas** e a primeira cobra créditos.

## Rodapé — suíte completa do ASF (`pytest`, 11 min 51 s)
**3.082 passaram, 3 falharam, 11 ignorados.** Os 3 erros são do mesmo arquivo (`test_e2e_smoke.py`) e vêm do falso positivo de `HOME=/root` descrito acima; rodando esse arquivo com `HOME` longo, 5/5 passam. Nenhuma falha de produto encontrada.
