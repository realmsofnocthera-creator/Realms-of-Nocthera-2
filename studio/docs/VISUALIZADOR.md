# Visualizador (`viewer/index.html`)

Página estática, sem dependências, pensada para o celular.

```bash
python3 -m nocthera_studio manifesto     # atualiza a lista e as auditorias
python3 -m nocthera_studio servir        # http://localhost:8000/viewer/
```
No cloud, exponha a porta (Claude Code → pré-visualização de porta) e abra no celular. Sem servidor também funciona: **☰ Imagens → + Abrir PNG(s)** ou arraste/cole arquivos (a biblioteca/auditoria do manifesto exige o servidor).

## Controles
| Ação | Como |
|---|---|
| Zoom | **−/+**, slider, pinça (2 dedos), roda do mouse. **50% a 800%**; acima de 100% sempre múltiplos inteiros, pixels nítidos |
| Mover | arrastar com 1 dedo |
| Ajustar / 1× | botões **Ajustar** e **1×** |
| Fundo | **Fundo**: xadrez → escuro → claro → magenta → verde (testa halos e fundo embutido) |
| Grade | **Grade** (a partir de 400%): linha por pixel e linha clara a cada 8 px |
| Inspetor | tocar um pixel → coordenadas, `#RRGGBB`, alfa (avisa semitransparência) |
| Problemas | **Problemas** desenha os `locais` do relatório (vermelho = erro, amarelo = aviso) |
| Info (ⓘ) | triagem rápida em JS (tamanho, alfa, nº de cores, paleta) + achados do auditor Python |

## Comparação (A × B)
Escolha A e B nos seletores (⇄ troca):
- **Lado a lado** — mesmo zoom/pan nas duas.
- **Cortina** — arraste a alça dourada; B à direita.
- **Alternar** — pisca A/B a cada 0,7 s (bom para ver mudanças sutis).
- **Diferença** — pixels iguais escurecidos, diferentes em cor viva; mostra quantos pixels e %.

URL: `viewer/?a=<id>&b=<id>&modo=cortina&zoom=400`.

## Limites
A triagem do navegador não substitui o auditor. A leitura de pixels exige imagem do mesmo servidor ou aberta por arquivo.
