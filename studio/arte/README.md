# Peças desenhadas por código (origem: `codigo`)

Fonte da verdade da arte autoral de exemplo. Cada pasta tem um `build.py` determinístico; a saída vai para `assets/candidatos/`.
Motor: Pixel Art Studio (Pillow), paleta `nocthera-32`. **Não são saída de modelo de imagem** e devem ser divulgadas como arte por código.

| Peça | Fonte | Tamanho |
|---|---|---|
| Inquisidor Encapuzado | `inquisidor/build.py` | 128×128 |
| Arquimago das Vestes Negras | `arquimago/build.py` | 128×128 |
| Cavaleiro das Cinzas (autoral) | `guerreiro/build.py` | 128×128 |
| 8 ícones (série Água / série Sangue) | `icones/azuis.py`, `icones/vermelhos.py` | 96×96 |

Regenerar: `cd arte/<peça> && python3 build.py` (ícones: `cd arte/icones && python3 azuis.py && python3 vermelhos.py`). Galeria: `GALERIA.png`.
Status no manifesto: `auditado` (0 erros) — **não aprovadas**: falta a revisão visual do dono (`aprovar`).
