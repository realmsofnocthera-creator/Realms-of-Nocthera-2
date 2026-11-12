import io
import tempfile
import unittest
from pathlib import Path

from nocthera_studio.auditoria import PENDENTE, REPROVADO, auditar_arquivo
from . import fixtures as F


def codigos(rel):
    return {a["codigo"] for v in rel["verificacoes"] for a in v["achados"]}


def codigos_erro(rel):
    return {a["codigo"] for v in rel["verificacoes"] for a in v["achados"] if a["severidade"] == "erro"}


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def audit(self, imagem, nome="x.png", categoria="monstro"):
        p = self.dir / nome
        imagem.save(p)
        return auditar_arquivo(p, categoria)


class TestAuditor(Base):
    def test_valido_fica_pendente_nunca_aprovado(self):
        rel = self.audit(F.sprite_valido())
        self.assertEqual(rel["veredito_tecnico"], PENDENTE, codigos_erro(rel))
        self.assertNotIn("aprovado", rel["veredito_tecnico"])
        self.assertIn("revisão visual", rel["nota"])

    def test_resolucao_correta_nao_basta(self):
        rel = self.audit(F.ampliado())  # 128x128 de aparência, 32x32 de verdade
        self.assertEqual(rel["tamanho"], [128, 128])
        self.assertEqual(rel["veredito_tecnico"], REPROVADO)
        self.assertIn("ampliado_inteiro", codigos_erro(rel))

    def test_96_e_128_aceitos(self):
        for t in (96, 128):
            rel = self.audit(F.sprite_valido(t), f"s{t}.png")
            self.assertNotIn("dimensao_invalida", codigos(rel))

    def test_tamanho_invalido(self):
        self.assertIn("dimensao_invalida", codigos_erro(self.audit(F.tamanho_errado())))

    def test_antialiasing(self):
        rel = self.audit(F.com_antialiasing())
        self.assertEqual(rel["veredito_tecnico"], REPROVADO)
        self.assertTrue({"alfa_parcial", "cores_demais"} <= codigos_erro(rel), codigos_erro(rel))

    def test_blur(self):
        rel = self.audit(F.borrado())
        self.assertTrue({"cores_demais", "alfa_parcial"} & codigos_erro(rel))

    def test_fundo_embutido(self):
        rel = self.audit(F.fundo_opaco())
        self.assertTrue({"fundo_embutido", "sem_transparencia"} & codigos_erro(rel))

    def test_xadrez_falso(self):
        self.assertIn("xadrez_falso", codigos_erro(self.audit(F.xadrez_falso())))

    def test_fora_da_paleta(self):
        rel = self.audit(F.fora_da_paleta())
        self.assertIn("fora_da_paleta", codigos_erro(rel))

    def test_ruido(self):
        rel = self.audit(F.com_ruido())
        self.assertTrue({"ruido", "cores_demais", "fora_da_paleta"} & codigos(rel))
        self.assertTrue(any(c in codigos(rel) for c in ("ruido", "pixels_soltos", "clusters_pequenos")))

    def test_pixels_soltos_viram_erro(self):
        self.assertIn("pixels_soltos", codigos_erro(self.audit(F.com_pixel_solto())))

    def test_alfa_parcial(self):
        self.assertIn("alfa_parcial", codigos_erro(self.audit(F.alfa_parcial())))

    def test_png_sem_alfa(self):
        rel = self.audit(F.sprite_valido().convert("RGB"))
        self.assertIn("sem_canal_alfa", codigos_erro(rel))

    def test_formato_nao_png(self):
        p = self.dir / "x.webp"
        F.sprite_valido().save(p, lossless=True)
        self.assertIn("formato_invalido", codigos_erro(auditar_arquivo(p, "monstro")))

    def test_imagem_grande_nao_trava(self):
        from PIL import Image
        rel = self.audit(Image.new("RGBA", (2000, 300), (0, 0, 0, 0)), "grande.png")
        self.assertIn("dimensao_invalida", codigos_erro(rel))

    def test_cena_retangular_nao_e_sprite(self):
        rel = self.audit(F.retangulo_cena())
        self.assertTrue({"silhueta_retangular", "silhueta_quase_retangular"} & codigos(rel))

    def test_silhueta_organica_nao_dispara_retangular(self):
        self.assertFalse({"silhueta_retangular", "silhueta_quase_retangular"} & codigos(self.audit(F.sprite_valido())))

    def test_rgb_oculto_normalizavel(self):
        im = F.sprite_valido()
        im.putpixel((0, 0), (255, 0, 0, 0))
        self.assertIn("rgb_oculto", codigos(self.audit(im)))


if __name__ == "__main__":
    unittest.main()
