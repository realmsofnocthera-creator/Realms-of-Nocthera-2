import base64
import http.server
import io
import json
import os
import subprocess
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from unittest import mock

from PIL import Image

from nocthera_studio import manifesto
from nocthera_studio.auditoria import auditar_arquivo
from nocthera_studio.geracao import AguardandoImagem, PedidoGeracao, ProvedorNaoConfigurado, obter_provedor
from nocthera_studio.geracao.http_api import ProvedorHttp
from nocthera_studio.nucleo import RAIZ
from nocthera_studio.paleta import carregar_paleta
from nocthera_studio.posprocessar import posprocessar
from nocthera_studio.prompts import montar_prompt
from . import fixtures as F

PAL = carregar_paleta("nocthera-32")
BRIEFING = {"id": "t-1", "categoria": "monstro", "nome": "Teste", "descricao": "a hollow knight",
            "materiais": ["rusted steel"], "tamanho": 96}


def erros(rel, nome):
    return [a["codigo"] for v in rel["verificacoes"] if v["nome"] == nome for a in v["achados"]
            if a["severidade"] == "erro"]


class TestPosprocessar(unittest.TestCase):
    def test_bruto_vira_candidato_nativo(self):
        tmp = Path(tempfile.mkdtemp())
        for tam in (96, 128):
            out = posprocessar(F.bruto_de_modelo(), tam, PAL, 24, "box", contorno=True)
            self.assertEqual(out.size, (tam, tam))
            p = tmp / f"o{tam}.png"
            out.save(p)
            rel = auditar_arquivo(p, "monstro")
            for grupo in ("dimensoes", "transparencia", "paleta"):
                self.assertEqual(erros(rel, grupo), [], (tam, grupo, erros(rel, grupo)))
            self.assertNotEqual(rel["veredito_tecnico"], "aprovado")

    def test_metodos_de_reducao(self):
        for m in ("box", "nearest", "moda"):
            out = posprocessar(F.bruto_de_modelo(256), 96, PAL, 16, m)
            h = out.getchannel("A").histogram()
            self.assertEqual(sum(h[1:255]), 0, m)

    def test_imagem_so_com_fundo_falha_claramente(self):
        with self.assertRaises(ValueError):
            posprocessar(Image.new("RGBA", (64, 64), (255, 0, 255, 255)), 96, PAL)


class TestManifesto(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.patches = [mock.patch.object(manifesto, "ASSETS", self.tmp),
                        mock.patch.object(manifesto, "ARQUIVO", self.tmp / "manifesto.json")]
        for p in self.patches:
            p.start()
        self.png = self.tmp / "candidatos" / "monstros" / "m1.png"
        self.png.parent.mkdir(parents=True)
        F.sprite_valido().save(self.png)
        self.itens = [k for k in manifesto.CHECKLIST_VISUAL if k != "leitura_fria"]
        self.leitura = "Um blob verde com uma faixa vermelha no centro, silhueta redonda e simples."

    def tearDown(self):
        for p in self.patches:
            p.stop()

    def test_nao_aprova_sem_checklist(self):
        manifesto.registrar(self.png, "monstro", origem={"tipo": "humano"})
        with self.assertRaisesRegex(ValueError, "checklist"):
            manifesto.aprovar("m1", "Ana", self.leitura, self.itens[:3])

    def test_nao_aprova_sem_leitura_fria(self):
        manifesto.registrar(self.png, "monstro", origem={"tipo": "humano"})
        with self.assertRaisesRegex(ValueError, "leitura fria"):
            manifesto.aprovar("m1", "Ana", "ok", self.itens)

    def test_nao_aprova_arquivo_reprovado_mesmo_com_checklist(self):
        F.ampliado().save(self.png)
        manifesto.registrar(self.png, "monstro", origem={"tipo": "humano"})
        self.assertEqual(manifesto.achar(manifesto.carregar_manifesto(), "m1")["status"], "reprovado")
        with self.assertRaisesRegex(ValueError, "reprova"):
            manifesto.aprovar("m1", "Ana", self.leitura, self.itens)

    def test_nao_aprova_sem_origem_declarada(self):
        manifesto.registrar(self.png, "monstro")
        with self.assertRaisesRegex(ValueError, "Origem"):
            manifesto.aprovar("m1", "Ana", self.leitura, self.itens)
        with self.assertRaises(ValueError):
            manifesto.declarar_origem("m1", "inventada")

    def test_aprova_e_invalida_se_arquivo_mudar(self):
        manifesto.registrar(self.png, "monstro", origem={"tipo": "humano"})
        self.assertEqual(manifesto.achar(manifesto.carregar_manifesto(), "m1")["status"], "auditado")
        r = manifesto.aprovar("m1", "Ana", self.leitura, self.itens)
        self.assertEqual(r["status"], "aprovado")
        self.assertTrue((self.tmp / "aprovados" / "monstro" / "m1.png").exists())
        F.fora_da_paleta().save(self.png)  # alteração posterior
        a = manifesto.registrar(self.png, "monstro")
        self.assertNotEqual(a["status"], "aprovado")


class TestProvedores(unittest.TestCase):
    def test_padrao_manual_sem_imagem_aguarda(self):
        with self.assertRaises(AguardandoImagem):
            obter_provedor("manual").gerar(PedidoGeracao("inexistente-xyz", "monstro", "p"))

    def test_http_inativo_nunca_desenha_nada(self):
        with self.assertRaises(ProvedorNaoConfigurado):
            obter_provedor("http_api").gerar(PedidoGeracao("a", "icone", "p"))

    def test_comando_externo_vazio(self):
        with self.assertRaises(ProvedorNaoConfigurado):
            obter_provedor("comando_externo").gerar(PedidoGeracao("a", "icone", "p"))

    def test_http_com_servidor_mock(self):
        png = io.BytesIO()
        F.bruto_de_modelo(128).save(png, "PNG")
        recebido = {}

        class H(http.server.BaseHTTPRequestHandler):
            def do_POST(self):
                recebido["auth"] = self.headers.get("Authorization")
                recebido["corpo"] = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
                resp = json.dumps({"data": [{"b64_json": base64.b64encode(png.getvalue()).decode()}]}).encode()
                self.send_response(200); self.send_header("Content-Length", str(len(resp))); self.end_headers()
                self.wfile.write(resp)

            def log_message(self, *a):
                pass

        srv = http.server.HTTPServer(("127.0.0.1", 0), H)
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        cfg = {"ativo": True, "url": f"http://127.0.0.1:{srv.server_port}/gen", "metodo": "POST",
               "cabecalhos": {"Authorization": "Bearer ${CHAVE_TESTE}"},
               "corpo": {"model": "m", "prompt": "{prompt}", "seed": "{semente}", "size": "{largura}x{altura}"},
               "resposta": {"tipo": "base64", "caminho": "data.0.b64_json"}}
        prov = ProvedorHttp(cfg)
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("CHAVE_TESTE", None)
            with self.assertRaisesRegex(ProvedorNaoConfigurado, "CHAVE_TESTE"):
                prov.gerar(PedidoGeracao("a", "icone", "um prompt", semente=7))
        with mock.patch.dict(os.environ, {"CHAVE_TESTE": "segredo"}):
            res = prov.gerar(PedidoGeracao("a", "icone", "um prompt", semente=7))
        srv.shutdown()
        self.assertEqual(recebido["auth"], "Bearer segredo")
        self.assertEqual(recebido["corpo"]["seed"], 7)
        self.assertEqual(recebido["corpo"]["prompt"], "um prompt")
        self.assertEqual(Image.open(io.BytesIO(res.imagens[0])).size, (128, 128))


class TestPrompts(unittest.TestCase):
    def test_prompt_contem_regras_de_estilo(self):
        p = montar_prompt(BRIEFING)
        self.assertIn("hollow knight", p["prompt"])
        self.assertIn("at most 24 colors", p["prompt"])
        self.assertIn("anti-aliasing", p["negativo"])
        self.assertEqual(p["tamanho"], 96)

    def test_briefing_invalido(self):
        with self.assertRaises(ValueError):
            montar_prompt({"id": "x"})
        with self.assertRaises(ValueError):
            montar_prompt({**BRIEFING, "tamanho": 64})


class TestScripts(unittest.TestCase):
    def rodar(self, script, *args):
        return subprocess.run([sys.executable, str(RAIZ / "scripts" / script), *map(str, args)],
                              capture_output=True, text=True)

    def test_codigos_de_saida(self):
        tmp = Path(tempfile.mkdtemp())
        ok, ruim = tmp / "ok.png", tmp / "ruim.png"
        F.sprite_valido().save(ok)
        F.com_antialiasing().save(ruim)
        for s in ("verificar_dimensoes.py", "verificar_transparencia.py", "verificar_paleta.py",
                  "verificar_pixels.py"):
            self.assertEqual(self.rodar(s, "-c", "monstro", ok).returncode, 0, s)
        self.assertEqual(self.rodar("verificar_transparencia.py", ruim).returncode, 1)
        self.assertEqual(self.rodar("verificar_paleta.py", ruim).returncode, 1)
        amp = tmp / "amp.png"
        F.ampliado().save(amp)
        self.assertEqual(self.rodar("verificar_dimensoes.py", amp).returncode, 1)

    def test_json(self):
        tmp = Path(tempfile.mkdtemp())
        ok = tmp / "ok.png"
        F.sprite_valido().save(ok)
        r = self.rodar("auditar.py", "--json", "-c", "monstro", ok)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(json.loads(r.stdout)[0]["veredito_tecnico"], "pendente_revisao_visual")


if __name__ == "__main__":
    unittest.main()


class TestFluxoCompletoCLI(unittest.TestCase):
    """Roda o CLI de verdade numa pasta de dados isolada (NOCTHERA_ASSETS)."""

    def setUp(self):
        self.raiz = Path(tempfile.mkdtemp())
        (self.raiz / "assets" / "entrada").mkdir(parents=True)
        self.env = {**os.environ, "NOCTHERA_ASSETS": str(self.raiz / "assets")}
        self.briefing = RAIZ / "config" / "briefs" / "exemplo-monstro-rato-da-peste.json"

    def cli(self, *args):
        return subprocess.run([sys.executable, "-m", "nocthera_studio", *map(str, args)], cwd=RAIZ,
                              capture_output=True, text=True, env=self.env)

    def test_sem_imagem_para_e_nao_inventa_arte(self):
        r = self.cli("gerar", self.briefing)
        self.assertEqual(r.returncode, 2, r.stdout + r.stderr)
        self.assertIn("assets/entrada", r.stdout)
        self.assertFalse(list((self.raiz / "assets").rglob("candidatos/**/*.png")))
        self.assertTrue((self.raiz / "assets/bruto/monstro-rato-da-peste/prompt.json").exists())

    def test_com_imagem_bruta_gera_audita_e_so_aprova_com_revisao(self):
        F.bruto_de_modelo().save(self.raiz / "assets/entrada/monstro-rato-da-peste.png")
        r = self.cli("gerar", self.briefing)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        cand = self.raiz / "assets/candidatos/monstros/monstro-rato-da-peste.png"
        self.assertTrue(cand.exists())
        self.assertEqual(Image.open(cand).size, (96, 96))  # tamanho do briefing
        self.assertTrue((self.raiz / "assets/previews/monstro-rato-da-peste.folha.png").exists())
        m = json.loads((self.raiz / "assets/manifesto.json").read_text())
        self.assertNotEqual(m["ativos"][0]["status"], "aprovado")
        itens = [k for k in manifesto.CHECKLIST_VISUAL if k != "leitura_fria"]
        recusa = self.cli("aprovar", "monstro-rato-da-peste", "--revisor", "T", "--leitura-fria", "curta")
        self.assertEqual(recusa.returncode, 1)
        if m["ativos"][0]["auditoria"]["erros"] == 0:
            sem = self.cli("aprovar", "monstro-rato-da-peste", "--revisor", "Teste", "--leitura-fria",
                           "Um bloco verde arredondado com uma faixa vermelha no centro, silhueta simples.",
                           "--confirmo", *itens)
            self.assertEqual(sem.returncode, 1)  # origem não declarada (provedor manual)
            self.assertEqual(self.cli("origem", "monstro-rato-da-peste", "--tipo", "referencia").returncode, 0)
            ok = self.cli("aprovar", "monstro-rato-da-peste", "--revisor", "Teste", "--leitura-fria",
                          "Um bloco verde arredondado com uma faixa vermelha no centro, silhueta simples.",
                          "--confirmo", *itens)
            self.assertEqual(ok.returncode, 0, ok.stdout)
            self.assertTrue((self.raiz / "assets/aprovados/monstro/monstro-rato-da-peste.png").exists())


@unittest.skipUnless((RAIZ.parent / ".claude/skills/generate2dmedia/scripts/route_media.py").exists(),
                     "Agent Sprite Forge não instalado")
class TestPortaoDeGasto(unittest.TestCase):
    """Provedor asf_route: chave FICTÍCIA + script simulado (seam do ASF). Nunca chega à rede nem cobra."""

    def setUp(self):
        self.raiz = Path(tempfile.mkdtemp())
        (self.raiz / "assets").mkdir()
        self.marca = self.raiz / "executou.txt"
        fake = self.raiz / "fake.py"
        fake.write_text(
            "import sys, json, pathlib\n"
            "a = sys.argv[1:]\n"
            "if '--dry-run' in a:\n"
            "    print(json.dumps({'status': 'dry-run', 'route': 'api:fal', 'estimateUsd': 0.08, 'model': 'fake', "
            "'estimate': '1 x 0.08 simulado'})); sys.exit(0)\n"
            f"pathlib.Path({str(self.marca)!r}).write_text('sim')\n"
            "out = pathlib.Path(a[a.index('--out-dir') + 1]); out.mkdir(parents=True, exist_ok=True)\n"
            f"open(out / 'generated.png', 'wb').write(open({str(self.raiz / 'bruto.png')!r}, 'rb').read())\n"
            "print(json.dumps({'status': 'ok', 'route': 'api:fal', 'artifact': str(out / 'generated.png'), "
            "'sha256': 'x', 'estimateUsd': 0.08}))\n")
        F.bruto_de_modelo().save(self.raiz / "bruto.png")
        F.sprite_valido().save(self.raiz / "ref.png")
        b = json.loads((RAIZ / "config/briefs/exemplo-monstro-rato-da-peste.json").read_text())
        b["referencias"] = [str(self.raiz / "ref.png")]
        self.briefing = self.raiz / "b.json"
        self.briefing.write_text(json.dumps(b))
        self.env = {k: v for k, v in os.environ.items() if not k.endswith("_API_KEY")}
        self.env.update(NOCTHERA_ASSETS=str(self.raiz / "assets"), FAL_KEY="fake:fake",
                        FORGE_ROUTE_MEDIA_FAKE=str(fake), HOME=str(self.raiz))

    def cli(self, *args):
        return subprocess.run([sys.executable, "-m", "nocthera_studio", "gerar", str(self.briefing),
                               "--provedor", "asf_route", *map(str, args)], cwd=RAIZ, capture_output=True,
                              text=True, env=self.env)

    def test_planejar_nao_executa_nada(self):
        r = self.cli("--planejar")
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn("api:fal", r.stdout)
        self.assertIn("0.08", r.stdout)
        self.assertFalse(self.marca.exists())

    def test_sem_autorizacao_recusa_e_nao_executa(self):
        r = self.cli()
        self.assertEqual(r.returncode, 4, r.stdout + r.stderr)
        self.assertIn("NÃO autorizada" if "NÃO autorizada" in r.stdout else "--autorizo-gasto", r.stdout)
        self.assertFalse(self.marca.exists())
        self.assertFalse(list((self.raiz / "assets").rglob("candidatos/**/*.png")))

    def test_teto_abaixo_da_estimativa_recusa(self):
        r = self.cli("--autorizo-gasto", "0.01")
        self.assertEqual(r.returncode, 4, r.stdout)
        self.assertFalse(self.marca.exists())

    def test_com_teto_suficiente_gera_e_registra_a_rota(self):
        r = self.cli("--autorizo-gasto", "0.5")
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertTrue(self.marca.exists())
        m = json.loads((self.raiz / "assets/manifesto.json").read_text())
        origem = m["ativos"][0]["origem"]
        self.assertEqual(origem["rota"], "api:fal")
        self.assertEqual(origem["autorizado_usd"], 0.5)
        self.assertNotEqual(m["ativos"][0]["status"], "aprovado")

    def test_sem_rota_nao_inventa_arte(self):
        self.env.pop("FAL_KEY")
        self.env.pop("FORGE_ROUTE_MEDIA_FAKE")  # sem seam: o ASF resolve a rota de verdade (nenhuma)
        r = self.cli("--autorizo-gasto", "1")
        self.assertEqual(r.returncode, 2, r.stdout)
        self.assertFalse(self.marca.exists())

    def test_http_api_tambem_exige_autorizacao(self):
        r = subprocess.run([sys.executable, "-m", "nocthera_studio", "gerar", str(self.briefing), "--provedor", "http_api"],
                           cwd=RAIZ, capture_output=True, text=True, env=self.env)
        self.assertEqual(r.returncode, 4, r.stdout)
