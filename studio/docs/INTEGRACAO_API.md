# Integrando um modelo de geração de imagens por API

A arquitetura já separa **geração** (provedor) de **conformidade** (pós-processo + auditoria). Trocar de modelo não muda o resto do estúdio.

```
PedidoGeracao ─► ProvedorImagem.gerar() ─► ResultadoGeracao(imagens=[bytes], metadados)
```
Interface em `nocthera_studio/geracao/base.py`. Nenhum provedor cai para "desenho de mentira": sem configuração, levanta `ProvedorNaoConfigurado` (ou `AguardandoImagem` no manual) e o `gerar` sai com código 2.

## Provedores incluídos
| Nome | Uso |
|---|---|
| `manual` (padrão) | você coloca `assets/entrada/<id>.png`; ideal para gerar fora (outro agente, Aseprite, pxl) |
| `comando_externo` | roda um comando local sem shell (`{prompt_file}`, `{saida}`, `{semente}`, `{tamanho}`) |
| `http_api` | POST JSON genérico configurável em `config/provedores.json` |

## Ligando uma API HTTP
1. Edite `config/provedores.json → http_api`:
   ```json
   { "ativo": true, "url": "https://API-DO-FORNECEDOR/endpoint",
     "cabecalhos": { "Authorization": "Bearer ${NOCTHERA_IMAGE_API_KEY}", "Content-Type": "application/json" },
     "corpo": { "model": "NOME-DO-MODELO", "prompt": "{prompt}", "negative_prompt": "{negativo}",
                "size": "{largura}x{altura}", "seed": "{semente}", "n": 1 },
     "resposta": { "tipo": "base64", "caminho": "data.0.b64_json" } }
   ```
   `resposta.tipo` = `base64` ou `url`; `caminho` navega o JSON (`data.0.url`). Placeholders: `{prompt} {negativo} {largura} {altura} {semente} {id}` (`{semente}` vira número).
2. A chave **nunca** vai no arquivo: `export NOCTHERA_IMAGE_API_KEY=…` (no cloud, use o segredo do ambiente — `request_credential`/Configurações → Segredos). `${VAR}` ausente ⇒ erro explícito.
3. `python3 -m nocthera_studio gerar config/briefs/x.json --provedor http_api`.
4. Os campos `url`, `corpo` e `resposta` dependem do fornecedor: **nenhum fornecedor foi escolhido nem testado contra um serviço real** (só contra um servidor HTTP local nos testes). Ajuste ao contrato real e rode um briefing de teste.

## Outro formato de API (SDK, multipart, polling)?
Crie `geracao/<nome>.py` com uma subclasse de `ProvedorImagem`, registre em `geracao/registro.py` e adicione o nome em `cli.py (--provedor)`. Mantenha: sem rede quando não configurado; erros claros; devolver bytes de imagem.

## Boas práticas de geração
- Gere em **alta** (1024²) com fundo magenta liso; o estúdio reduz para 96/128. Pedir 96×96 direto a um modelo costuma dar arte borrada.
- Fixe `semente` e paleta para séries; mude 1 variável por iteração.
- Use `referencias` (imagens reais com licença) quando o modelo aceitar *image-to-image*; é o método do Codixel.
- Escolha o método de redução: `box` (suaviza e mapeia, bom para ilustração), `moda` (preserva cores quando a fonte já é pixel art), `nearest` (fonte já na grade correta).
- Revise **sempre**: a saída reduzida de um modelo costuma passar na checagem mecânica e ainda assim ser mole/lamacenta.
