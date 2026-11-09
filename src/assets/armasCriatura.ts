import { srcDaImagem } from '@/assets/srcDaImagem';
import { ARMAS_BASE_MAP } from '@/rules/armasCatalogo';
import type { CategoriaArma } from '@/rules/armas';
import img_floragoth_principal_espadaGrande from './images/forja/armas-criatura/floragoth-principal-espadaGrande.webp';
import img_floragoth_principal_katana from './images/forja/armas-criatura/floragoth-principal-katana.webp';
import img_floragoth_principal_lanca from './images/forja/armas-criatura/floragoth-principal-lanca.webp';
import img_floragoth_principal_espadaEscudo from './images/forja/armas-criatura/floragoth-principal-espadaEscudo.webp';
import img_floragoth_principal_grimorio from './images/forja/armas-criatura/floragoth-principal-grimorio.webp';
import img_floragoth_principal_cajado from './images/forja/armas-criatura/floragoth-principal-cajado.webp';
import img_floragoth_carmesim_espadaGrande from './images/forja/armas-criatura/floragoth-carmesim-espadaGrande.webp';
import img_floragoth_carmesim_katana from './images/forja/armas-criatura/floragoth-carmesim-katana.webp';
import img_floragoth_carmesim_lanca from './images/forja/armas-criatura/floragoth-carmesim-lanca.webp';
import img_floragoth_carmesim_espadaEscudo from './images/forja/armas-criatura/floragoth-carmesim-espadaEscudo.webp';
import img_floragoth_carmesim_grimorio from './images/forja/armas-criatura/floragoth-carmesim-grimorio.webp';
import img_floragoth_carmesim_cajado from './images/forja/armas-criatura/floragoth-carmesim-cajado.webp';
import img_floragoth_abissal_espadaGrande from './images/forja/armas-criatura/floragoth-abissal-espadaGrande.webp';
import img_floragoth_abissal_katana from './images/forja/armas-criatura/floragoth-abissal-katana.webp';
import img_floragoth_abissal_lanca from './images/forja/armas-criatura/floragoth-abissal-lanca.webp';
import img_floragoth_abissal_espadaEscudo from './images/forja/armas-criatura/floragoth-abissal-espadaEscudo.webp';
import img_floragoth_abissal_grimorio from './images/forja/armas-criatura/floragoth-abissal-grimorio.webp';
import img_floragoth_abissal_cajado from './images/forja/armas-criatura/floragoth-abissal-cajado.webp';
import img_rhazkida_principal_espadaGrande from './images/forja/armas-criatura/rhazkida-principal-espadaGrande.webp';
import img_rhazkida_principal_katana from './images/forja/armas-criatura/rhazkida-principal-katana.webp';
import img_rhazkida_principal_lanca from './images/forja/armas-criatura/rhazkida-principal-lanca.webp';
import img_rhazkida_principal_espadaEscudo from './images/forja/armas-criatura/rhazkida-principal-espadaEscudo.webp';
import img_rhazkida_principal_grimorio from './images/forja/armas-criatura/rhazkida-principal-grimorio.webp';
import img_rhazkida_principal_cajado from './images/forja/armas-criatura/rhazkida-principal-cajado.webp';
import img_rhazkida_escarlate_espadaGrande from './images/forja/armas-criatura/rhazkida-escarlate-espadaGrande.webp';
import img_rhazkida_escarlate_katana from './images/forja/armas-criatura/rhazkida-escarlate-katana.webp';
import img_rhazkida_escarlate_lanca from './images/forja/armas-criatura/rhazkida-escarlate-lanca.webp';
import img_rhazkida_escarlate_espadaEscudo from './images/forja/armas-criatura/rhazkida-escarlate-espadaEscudo.webp';
import img_rhazkida_escarlate_grimorio from './images/forja/armas-criatura/rhazkida-escarlate-grimorio.webp';
import img_rhazkida_escarlate_cajado from './images/forja/armas-criatura/rhazkida-escarlate-cajado.webp';
import img_rhazkida_cristalina_espadaGrande from './images/forja/armas-criatura/rhazkida-cristalina-espadaGrande.webp';
import img_rhazkida_cristalina_katana from './images/forja/armas-criatura/rhazkida-cristalina-katana.webp';
import img_rhazkida_cristalina_lanca from './images/forja/armas-criatura/rhazkida-cristalina-lanca.webp';
import img_rhazkida_cristalina_espadaEscudo from './images/forja/armas-criatura/rhazkida-cristalina-espadaEscudo.webp';
import img_rhazkida_cristalina_grimorio from './images/forja/armas-criatura/rhazkida-cristalina-grimorio.webp';
import img_rhazkida_cristalina_cajado from './images/forja/armas-criatura/rhazkida-cristalina-cajado.webp';
import img_cryovarn_principal_espadaGrande from './images/forja/armas-criatura/cryovarn-principal-espadaGrande.webp';
import img_cryovarn_principal_katana from './images/forja/armas-criatura/cryovarn-principal-katana.webp';
import img_cryovarn_principal_lanca from './images/forja/armas-criatura/cryovarn-principal-lanca.webp';
import img_cryovarn_principal_espadaEscudo from './images/forja/armas-criatura/cryovarn-principal-espadaEscudo.webp';
import img_cryovarn_principal_grimorio from './images/forja/armas-criatura/cryovarn-principal-grimorio.webp';
import img_cryovarn_principal_cajado from './images/forja/armas-criatura/cryovarn-principal-cajado.webp';
import img_cryovarn_abissal_espadaGrande from './images/forja/armas-criatura/cryovarn-abissal-espadaGrande.webp';
import img_cryovarn_abissal_katana from './images/forja/armas-criatura/cryovarn-abissal-katana.webp';
import img_cryovarn_abissal_lanca from './images/forja/armas-criatura/cryovarn-abissal-lanca.webp';
import img_cryovarn_abissal_espadaEscudo from './images/forja/armas-criatura/cryovarn-abissal-espadaEscudo.webp';
import img_cryovarn_abissal_grimorio from './images/forja/armas-criatura/cryovarn-abissal-grimorio.webp';
import img_cryovarn_abissal_cajado from './images/forja/armas-criatura/cryovarn-abissal-cajado.webp';
import img_cryovarn_furioso_espadaGrande from './images/forja/armas-criatura/cryovarn-furioso-espadaGrande.webp';
import img_cryovarn_furioso_katana from './images/forja/armas-criatura/cryovarn-furioso-katana.webp';
import img_cryovarn_furioso_lanca from './images/forja/armas-criatura/cryovarn-furioso-lanca.webp';
import img_cryovarn_furioso_espadaEscudo from './images/forja/armas-criatura/cryovarn-furioso-espadaEscudo.webp';
import img_cryovarn_furioso_grimorio from './images/forja/armas-criatura/cryovarn-furioso-grimorio.webp';
import img_cryovarn_furioso_cajado from './images/forja/armas-criatura/cryovarn-furioso-cajado.webp';
import img_urso_principal_espadaGrande from './images/forja/armas-criatura/urso-principal-espadaGrande.webp';
import img_urso_principal_katana from './images/forja/armas-criatura/urso-principal-katana.webp';
import img_urso_principal_lanca from './images/forja/armas-criatura/urso-principal-lanca.webp';
import img_urso_principal_espadaEscudo from './images/forja/armas-criatura/urso-principal-espadaEscudo.webp';
import img_urso_principal_grimorio from './images/forja/armas-criatura/urso-principal-grimorio.webp';
import img_urso_principal_cajado from './images/forja/armas-criatura/urso-principal-cajado.webp';
import img_urso_glacial_espadaGrande from './images/forja/armas-criatura/urso-glacial-espadaGrande.webp';
import img_urso_glacial_katana from './images/forja/armas-criatura/urso-glacial-katana.webp';
import img_urso_glacial_lanca from './images/forja/armas-criatura/urso-glacial-lanca.webp';
import img_urso_glacial_espadaEscudo from './images/forja/armas-criatura/urso-glacial-espadaEscudo.webp';
import img_urso_glacial_grimorio from './images/forja/armas-criatura/urso-glacial-grimorio.webp';
import img_urso_glacial_cajado from './images/forja/armas-criatura/urso-glacial-cajado.webp';
import img_urso_colerico_espadaGrande from './images/forja/armas-criatura/urso-colerico-espadaGrande.webp';
import img_urso_colerico_katana from './images/forja/armas-criatura/urso-colerico-katana.webp';
import img_urso_colerico_lanca from './images/forja/armas-criatura/urso-colerico-lanca.webp';
import img_urso_colerico_espadaEscudo from './images/forja/armas-criatura/urso-colerico-espadaEscudo.webp';
import img_urso_colerico_grimorio from './images/forja/armas-criatura/urso-colerico-grimorio.webp';
import img_urso_colerico_cajado from './images/forja/armas-criatura/urso-colerico-cajado.webp';
import img_esq_principal_espadaGrande from './images/forja/armas-criatura/esq-principal-espadaGrande.webp';
import img_esq_principal_katana from './images/forja/armas-criatura/esq-principal-katana.webp';
import img_esq_principal_lanca from './images/forja/armas-criatura/esq-principal-lanca.webp';
import img_esq_principal_espadaEscudo from './images/forja/armas-criatura/esq-principal-espadaEscudo.webp';
import img_esq_principal_grimorio from './images/forja/armas-criatura/esq-principal-grimorio.webp';
import img_esq_principal_cajado from './images/forja/armas-criatura/esq-principal-cajado.webp';
import img_esq_flamejante_espadaGrande from './images/forja/armas-criatura/esq-flamejante-espadaGrande.webp';
import img_esq_flamejante_katana from './images/forja/armas-criatura/esq-flamejante-katana.webp';
import img_esq_flamejante_lanca from './images/forja/armas-criatura/esq-flamejante-lanca.webp';
import img_esq_flamejante_espadaEscudo from './images/forja/armas-criatura/esq-flamejante-espadaEscudo.webp';
import img_esq_flamejante_grimorio from './images/forja/armas-criatura/esq-flamejante-grimorio.webp';
import img_esq_flamejante_cajado from './images/forja/armas-criatura/esq-flamejante-cajado.webp';
import img_esq_amaldicoado_espadaGrande from './images/forja/armas-criatura/esq-amaldicoado-espadaGrande.webp';
import img_esq_amaldicoado_katana from './images/forja/armas-criatura/esq-amaldicoado-katana.webp';
import img_esq_amaldicoado_lanca from './images/forja/armas-criatura/esq-amaldicoado-lanca.webp';
import img_esq_amaldicoado_espadaEscudo from './images/forja/armas-criatura/esq-amaldicoado-espadaEscudo.webp';
import img_esq_amaldicoado_grimorio from './images/forja/armas-criatura/esq-amaldicoado-grimorio.webp';
import img_esq_amaldicoado_cajado from './images/forja/armas-criatura/esq-amaldicoado-cajado.webp';
import img_lobo_principal_espadaGrande from './images/forja/armas-criatura/lobo-principal-espadaGrande.webp';
import img_lobo_principal_katana from './images/forja/armas-criatura/lobo-principal-katana.webp';
import img_lobo_principal_lanca from './images/forja/armas-criatura/lobo-principal-lanca.webp';
import img_lobo_principal_espadaEscudo from './images/forja/armas-criatura/lobo-principal-espadaEscudo.webp';
import img_lobo_principal_grimorio from './images/forja/armas-criatura/lobo-principal-grimorio.webp';
import img_lobo_principal_cajado from './images/forja/armas-criatura/lobo-principal-cajado.webp';
import img_lobo_gelido_espadaGrande from './images/forja/armas-criatura/lobo-gelido-espadaGrande.webp';
import img_lobo_gelido_katana from './images/forja/armas-criatura/lobo-gelido-katana.webp';
import img_lobo_gelido_lanca from './images/forja/armas-criatura/lobo-gelido-lanca.webp';
import img_lobo_gelido_espadaEscudo from './images/forja/armas-criatura/lobo-gelido-espadaEscudo.webp';
import img_lobo_gelido_grimorio from './images/forja/armas-criatura/lobo-gelido-grimorio.webp';
import img_lobo_gelido_cajado from './images/forja/armas-criatura/lobo-gelido-cajado.webp';
import img_lobo_carmesim_espadaGrande from './images/forja/armas-criatura/lobo-carmesim-espadaGrande.webp';
import img_lobo_carmesim_katana from './images/forja/armas-criatura/lobo-carmesim-katana.webp';
import img_lobo_carmesim_lanca from './images/forja/armas-criatura/lobo-carmesim-lanca.webp';
import img_lobo_carmesim_espadaEscudo from './images/forja/armas-criatura/lobo-carmesim-espadaEscudo.webp';
import img_lobo_carmesim_grimorio from './images/forja/armas-criatura/lobo-carmesim-grimorio.webp';
import img_lobo_carmesim_cajado from './images/forja/armas-criatura/lobo-carmesim-cajado.webp';
import img_rato_principal_espadaGrande from './images/forja/armas-criatura/rato-principal-espadaGrande.webp';
import img_rato_principal_katana from './images/forja/armas-criatura/rato-principal-katana.webp';
import img_rato_principal_lanca from './images/forja/armas-criatura/rato-principal-lanca.webp';
import img_rato_principal_espadaEscudo from './images/forja/armas-criatura/rato-principal-espadaEscudo.webp';
import img_rato_principal_grimorio from './images/forja/armas-criatura/rato-principal-grimorio.webp';
import img_rato_principal_cajado from './images/forja/armas-criatura/rato-principal-cajado.webp';
import img_rato_cinzas_espadaGrande from './images/forja/armas-criatura/rato-cinzas-espadaGrande.webp';
import img_rato_cinzas_katana from './images/forja/armas-criatura/rato-cinzas-katana.webp';
import img_rato_cinzas_lanca from './images/forja/armas-criatura/rato-cinzas-lanca.webp';
import img_rato_cinzas_espadaEscudo from './images/forja/armas-criatura/rato-cinzas-espadaEscudo.webp';
import img_rato_cinzas_grimorio from './images/forja/armas-criatura/rato-cinzas-grimorio.webp';
import img_rato_cinzas_cajado from './images/forja/armas-criatura/rato-cinzas-cajado.webp';
import img_rato_pestilento_espadaGrande from './images/forja/armas-criatura/rato-pestilento-espadaGrande.webp';
import img_rato_pestilento_katana from './images/forja/armas-criatura/rato-pestilento-katana.webp';
import img_rato_pestilento_lanca from './images/forja/armas-criatura/rato-pestilento-lanca.webp';
import img_rato_pestilento_espadaEscudo from './images/forja/armas-criatura/rato-pestilento-espadaEscudo.webp';
import img_rato_pestilento_grimorio from './images/forja/armas-criatura/rato-pestilento-grimorio.webp';
import img_rato_pestilento_cajado from './images/forja/armas-criatura/rato-pestilento-cajado.webp';
import img_vargheist_principal_espadaGrande from './images/forja/armas-criatura/vargheist-principal-espadaGrande.webp';
import img_vargheist_principal_katana from './images/forja/armas-criatura/vargheist-principal-katana.webp';
import img_vargheist_principal_lanca from './images/forja/armas-criatura/vargheist-principal-lanca.webp';
import img_vargheist_principal_espadaEscudo from './images/forja/armas-criatura/vargheist-principal-espadaEscudo.webp';
import img_vargheist_principal_grimorio from './images/forja/armas-criatura/vargheist-principal-grimorio.webp';
import img_vargheist_principal_cajado from './images/forja/armas-criatura/vargheist-principal-cajado.webp';
import img_vargheist_vulcanico_espadaGrande from './images/forja/armas-criatura/vargheist-vulcanico-espadaGrande.webp';
import img_vargheist_vulcanico_katana from './images/forja/armas-criatura/vargheist-vulcanico-katana.webp';
import img_vargheist_vulcanico_lanca from './images/forja/armas-criatura/vargheist-vulcanico-lanca.webp';
import img_vargheist_vulcanico_espadaEscudo from './images/forja/armas-criatura/vargheist-vulcanico-espadaEscudo.webp';
import img_vargheist_vulcanico_grimorio from './images/forja/armas-criatura/vargheist-vulcanico-grimorio.webp';
import img_vargheist_vulcanico_cajado from './images/forja/armas-criatura/vargheist-vulcanico-cajado.webp';
import img_vargheist_albino_espadaGrande from './images/forja/armas-criatura/vargheist-albino-espadaGrande.webp';
import img_vargheist_albino_katana from './images/forja/armas-criatura/vargheist-albino-katana.webp';
import img_vargheist_albino_lanca from './images/forja/armas-criatura/vargheist-albino-lanca.webp';
import img_vargheist_albino_espadaEscudo from './images/forja/armas-criatura/vargheist-albino-espadaEscudo.webp';
import img_vargheist_albino_grimorio from './images/forja/armas-criatura/vargheist-albino-grimorio.webp';
import img_vargheist_albino_cajado from './images/forja/armas-criatura/vargheist-albino-cajado.webp';
import img_noctyrr_principal_espadaGrande from './images/forja/armas-criatura/noctyrr-principal-espadaGrande.webp';
import img_noctyrr_principal_katana from './images/forja/armas-criatura/noctyrr-principal-katana.webp';
import img_noctyrr_principal_lanca from './images/forja/armas-criatura/noctyrr-principal-lanca.webp';
import img_noctyrr_principal_espadaEscudo from './images/forja/armas-criatura/noctyrr-principal-espadaEscudo.webp';
import img_noctyrr_principal_grimorio from './images/forja/armas-criatura/noctyrr-principal-grimorio.webp';
import img_noctyrr_principal_cajado from './images/forja/armas-criatura/noctyrr-principal-cajado.webp';
import img_noctyrr_tempestuoso_espadaGrande from './images/forja/armas-criatura/noctyrr-tempestuoso-espadaGrande.webp';
import img_noctyrr_tempestuoso_katana from './images/forja/armas-criatura/noctyrr-tempestuoso-katana.webp';
import img_noctyrr_tempestuoso_lanca from './images/forja/armas-criatura/noctyrr-tempestuoso-lanca.webp';
import img_noctyrr_tempestuoso_espadaEscudo from './images/forja/armas-criatura/noctyrr-tempestuoso-espadaEscudo.webp';
import img_noctyrr_tempestuoso_grimorio from './images/forja/armas-criatura/noctyrr-tempestuoso-grimorio.webp';
import img_noctyrr_tempestuoso_cajado from './images/forja/armas-criatura/noctyrr-tempestuoso-cajado.webp';
import img_noctyrr_abissal_espadaGrande from './images/forja/armas-criatura/noctyrr-abissal-espadaGrande.webp';
import img_noctyrr_abissal_katana from './images/forja/armas-criatura/noctyrr-abissal-katana.webp';
import img_noctyrr_abissal_lanca from './images/forja/armas-criatura/noctyrr-abissal-lanca.webp';
import img_noctyrr_abissal_espadaEscudo from './images/forja/armas-criatura/noctyrr-abissal-espadaEscudo.webp';
import img_noctyrr_abissal_grimorio from './images/forja/armas-criatura/noctyrr-abissal-grimorio.webp';
import img_noctyrr_abissal_cajado from './images/forja/armas-criatura/noctyrr-abissal-cajado.webp';
import img_murdrax_principal_espadaGrande from './images/forja/armas-criatura/murdrax-principal-espadaGrande.webp';
import img_murdrax_principal_katana from './images/forja/armas-criatura/murdrax-principal-katana.webp';
import img_murdrax_principal_lanca from './images/forja/armas-criatura/murdrax-principal-lanca.webp';
import img_murdrax_principal_espadaEscudo from './images/forja/armas-criatura/murdrax-principal-espadaEscudo.webp';
import img_murdrax_principal_grimorio from './images/forja/armas-criatura/murdrax-principal-grimorio.webp';
import img_murdrax_principal_cajado from './images/forja/armas-criatura/murdrax-principal-cajado.webp';
import img_murdrax_corrosivo_espadaGrande from './images/forja/armas-criatura/murdrax-corrosivo-espadaGrande.webp';
import img_murdrax_corrosivo_katana from './images/forja/armas-criatura/murdrax-corrosivo-katana.webp';
import img_murdrax_corrosivo_lanca from './images/forja/armas-criatura/murdrax-corrosivo-lanca.webp';
import img_murdrax_corrosivo_espadaEscudo from './images/forja/armas-criatura/murdrax-corrosivo-espadaEscudo.webp';
import img_murdrax_corrosivo_grimorio from './images/forja/armas-criatura/murdrax-corrosivo-grimorio.webp';
import img_murdrax_corrosivo_cajado from './images/forja/armas-criatura/murdrax-corrosivo-cajado.webp';
import img_murdrax_basalto_espadaGrande from './images/forja/armas-criatura/murdrax-basalto-espadaGrande.webp';
import img_murdrax_basalto_katana from './images/forja/armas-criatura/murdrax-basalto-katana.webp';
import img_murdrax_basalto_lanca from './images/forja/armas-criatura/murdrax-basalto-lanca.webp';
import img_murdrax_basalto_espadaEscudo from './images/forja/armas-criatura/murdrax-basalto-espadaEscudo.webp';
import img_murdrax_basalto_grimorio from './images/forja/armas-criatura/murdrax-basalto-grimorio.webp';
import img_murdrax_basalto_cajado from './images/forja/armas-criatura/murdrax-basalto-cajado.webp';
import img_alfa_principal_espadaGrande from './images/forja/armas-criatura/alfa-principal-espadaGrande.webp';
import img_alfa_principal_katana from './images/forja/armas-criatura/alfa-principal-katana.webp';
import img_alfa_principal_lanca from './images/forja/armas-criatura/alfa-principal-lanca.webp';
import img_alfa_principal_espadaEscudo from './images/forja/armas-criatura/alfa-principal-espadaEscudo.webp';
import img_alfa_principal_grimorio from './images/forja/armas-criatura/alfa-principal-grimorio.webp';
import img_alfa_principal_cajado from './images/forja/armas-criatura/alfa-principal-cajado.webp';
import img_alfa_carmesim_espadaGrande from './images/forja/armas-criatura/alfa-carmesim-espadaGrande.webp';
import img_alfa_carmesim_katana from './images/forja/armas-criatura/alfa-carmesim-katana.webp';
import img_alfa_carmesim_lanca from './images/forja/armas-criatura/alfa-carmesim-lanca.webp';
import img_alfa_carmesim_espadaEscudo from './images/forja/armas-criatura/alfa-carmesim-espadaEscudo.webp';
import img_alfa_carmesim_grimorio from './images/forja/armas-criatura/alfa-carmesim-grimorio.webp';
import img_alfa_carmesim_cajado from './images/forja/armas-criatura/alfa-carmesim-cajado.webp';
import img_alfa_vulcanico_espadaGrande from './images/forja/armas-criatura/alfa-vulcanico-espadaGrande.webp';
import img_alfa_vulcanico_katana from './images/forja/armas-criatura/alfa-vulcanico-katana.webp';
import img_alfa_vulcanico_lanca from './images/forja/armas-criatura/alfa-vulcanico-lanca.webp';
import img_alfa_vulcanico_espadaEscudo from './images/forja/armas-criatura/alfa-vulcanico-espadaEscudo.webp';
import img_alfa_vulcanico_grimorio from './images/forja/armas-criatura/alfa-vulcanico-grimorio.webp';
import img_alfa_vulcanico_cajado from './images/forja/armas-criatura/alfa-vulcanico-cajado.webp';
import img_grizzharn_principal_espadaGrande from './images/forja/armas-criatura/grizzharn-principal-espadaGrande.webp';
import img_grizzharn_principal_katana from './images/forja/armas-criatura/grizzharn-principal-katana.webp';
import img_grizzharn_principal_lanca from './images/forja/armas-criatura/grizzharn-principal-lanca.webp';
import img_grizzharn_principal_espadaEscudo from './images/forja/armas-criatura/grizzharn-principal-espadaEscudo.webp';
import img_grizzharn_principal_grimorio from './images/forja/armas-criatura/grizzharn-principal-grimorio.webp';
import img_grizzharn_principal_cajado from './images/forja/armas-criatura/grizzharn-principal-cajado.webp';
import img_grizzharn_glacial_espadaGrande from './images/forja/armas-criatura/grizzharn-glacial-espadaGrande.webp';
import img_grizzharn_glacial_katana from './images/forja/armas-criatura/grizzharn-glacial-katana.webp';
import img_grizzharn_glacial_lanca from './images/forja/armas-criatura/grizzharn-glacial-lanca.webp';
import img_grizzharn_glacial_espadaEscudo from './images/forja/armas-criatura/grizzharn-glacial-espadaEscudo.webp';
import img_grizzharn_glacial_grimorio from './images/forja/armas-criatura/grizzharn-glacial-grimorio.webp';
import img_grizzharn_glacial_cajado from './images/forja/armas-criatura/grizzharn-glacial-cajado.webp';
import img_grizzharn_ancestral_espadaGrande from './images/forja/armas-criatura/grizzharn-ancestral-espadaGrande.webp';
import img_grizzharn_ancestral_katana from './images/forja/armas-criatura/grizzharn-ancestral-katana.webp';
import img_grizzharn_ancestral_lanca from './images/forja/armas-criatura/grizzharn-ancestral-lanca.webp';
import img_grizzharn_ancestral_espadaEscudo from './images/forja/armas-criatura/grizzharn-ancestral-espadaEscudo.webp';
import img_grizzharn_ancestral_grimorio from './images/forja/armas-criatura/grizzharn-ancestral-grimorio.webp';
import img_grizzharn_ancestral_cajado from './images/forja/armas-criatura/grizzharn-ancestral-cajado.webp';

/**
 * A arte de cada arma, por criatura e parte (o principal ou a subespécie) e por categoria. As duas armas da mesma parte
 * usam a mesma arte por enquanto (decisão provisória, a confirmar). Prontas: 1★, 2★ e 3★; as demais armas usam
 * o ícone da categoria.
 */
const ARTE: Readonly<Record<string, Readonly<Record<CategoriaArma, string>>>> = {
  'urso-gigante:principal': { espadaGrande: srcDaImagem(img_urso_principal_espadaGrande), katana: srcDaImagem(img_urso_principal_katana), lanca: srcDaImagem(img_urso_principal_lanca), espadaEscudo: srcDaImagem(img_urso_principal_espadaEscudo), grimorio: srcDaImagem(img_urso_principal_grimorio), cajado: srcDaImagem(img_urso_principal_cajado) },
  'urso-gigante:urso-glacial': { espadaGrande: srcDaImagem(img_urso_glacial_espadaGrande), katana: srcDaImagem(img_urso_glacial_katana), lanca: srcDaImagem(img_urso_glacial_lanca), espadaEscudo: srcDaImagem(img_urso_glacial_espadaEscudo), grimorio: srcDaImagem(img_urso_glacial_grimorio), cajado: srcDaImagem(img_urso_glacial_cajado) },
  'urso-gigante:urso-colerico': { espadaGrande: srcDaImagem(img_urso_colerico_espadaGrande), katana: srcDaImagem(img_urso_colerico_katana), lanca: srcDaImagem(img_urso_colerico_lanca), espadaEscudo: srcDaImagem(img_urso_colerico_espadaEscudo), grimorio: srcDaImagem(img_urso_colerico_grimorio), cajado: srcDaImagem(img_urso_colerico_cajado) },
  'esqueleto:principal': { espadaGrande: srcDaImagem(img_esq_principal_espadaGrande), katana: srcDaImagem(img_esq_principal_katana), lanca: srcDaImagem(img_esq_principal_lanca), espadaEscudo: srcDaImagem(img_esq_principal_espadaEscudo), grimorio: srcDaImagem(img_esq_principal_grimorio), cajado: srcDaImagem(img_esq_principal_cajado) },
  'esqueleto:esqueleto-flamejante': { espadaGrande: srcDaImagem(img_esq_flamejante_espadaGrande), katana: srcDaImagem(img_esq_flamejante_katana), lanca: srcDaImagem(img_esq_flamejante_lanca), espadaEscudo: srcDaImagem(img_esq_flamejante_espadaEscudo), grimorio: srcDaImagem(img_esq_flamejante_grimorio), cajado: srcDaImagem(img_esq_flamejante_cajado) },
  'esqueleto:esqueleto-amaldicoado': { espadaGrande: srcDaImagem(img_esq_amaldicoado_espadaGrande), katana: srcDaImagem(img_esq_amaldicoado_katana), lanca: srcDaImagem(img_esq_amaldicoado_lanca), espadaEscudo: srcDaImagem(img_esq_amaldicoado_espadaEscudo), grimorio: srcDaImagem(img_esq_amaldicoado_grimorio), cajado: srcDaImagem(img_esq_amaldicoado_cajado) },
  'lobo-cinzento:principal': { espadaGrande: srcDaImagem(img_lobo_principal_espadaGrande), katana: srcDaImagem(img_lobo_principal_katana), lanca: srcDaImagem(img_lobo_principal_lanca), espadaEscudo: srcDaImagem(img_lobo_principal_espadaEscudo), grimorio: srcDaImagem(img_lobo_principal_grimorio), cajado: srcDaImagem(img_lobo_principal_cajado) },
  'lobo-cinzento:lobo-gelido': { espadaGrande: srcDaImagem(img_lobo_gelido_espadaGrande), katana: srcDaImagem(img_lobo_gelido_katana), lanca: srcDaImagem(img_lobo_gelido_lanca), espadaEscudo: srcDaImagem(img_lobo_gelido_espadaEscudo), grimorio: srcDaImagem(img_lobo_gelido_grimorio), cajado: srcDaImagem(img_lobo_gelido_cajado) },
  'lobo-cinzento:lobo-carmesim': { espadaGrande: srcDaImagem(img_lobo_carmesim_espadaGrande), katana: srcDaImagem(img_lobo_carmesim_katana), lanca: srcDaImagem(img_lobo_carmesim_lanca), espadaEscudo: srcDaImagem(img_lobo_carmesim_espadaEscudo), grimorio: srcDaImagem(img_lobo_carmesim_grimorio), cajado: srcDaImagem(img_lobo_carmesim_cajado) },
  'rato-da-floresta:principal': { espadaGrande: srcDaImagem(img_rato_principal_espadaGrande), katana: srcDaImagem(img_rato_principal_katana), lanca: srcDaImagem(img_rato_principal_lanca), espadaEscudo: srcDaImagem(img_rato_principal_espadaEscudo), grimorio: srcDaImagem(img_rato_principal_grimorio), cajado: srcDaImagem(img_rato_principal_cajado) },
  'rato-da-floresta:rato-das-cinzas': { espadaGrande: srcDaImagem(img_rato_cinzas_espadaGrande), katana: srcDaImagem(img_rato_cinzas_katana), lanca: srcDaImagem(img_rato_cinzas_lanca), espadaEscudo: srcDaImagem(img_rato_cinzas_espadaEscudo), grimorio: srcDaImagem(img_rato_cinzas_grimorio), cajado: srcDaImagem(img_rato_cinzas_cajado) },
  'rato-da-floresta:rato-pestilento': { espadaGrande: srcDaImagem(img_rato_pestilento_espadaGrande), katana: srcDaImagem(img_rato_pestilento_katana), lanca: srcDaImagem(img_rato_pestilento_lanca), espadaEscudo: srcDaImagem(img_rato_pestilento_espadaEscudo), grimorio: srcDaImagem(img_rato_pestilento_grimorio), cajado: srcDaImagem(img_rato_pestilento_cajado) },
  'vargheist:principal': { espadaGrande: srcDaImagem(img_vargheist_principal_espadaGrande), katana: srcDaImagem(img_vargheist_principal_katana), lanca: srcDaImagem(img_vargheist_principal_lanca), espadaEscudo: srcDaImagem(img_vargheist_principal_espadaEscudo), grimorio: srcDaImagem(img_vargheist_principal_grimorio), cajado: srcDaImagem(img_vargheist_principal_cajado) },
  'vargheist:vargheist-vulcanico': { espadaGrande: srcDaImagem(img_vargheist_vulcanico_espadaGrande), katana: srcDaImagem(img_vargheist_vulcanico_katana), lanca: srcDaImagem(img_vargheist_vulcanico_lanca), espadaEscudo: srcDaImagem(img_vargheist_vulcanico_espadaEscudo), grimorio: srcDaImagem(img_vargheist_vulcanico_grimorio), cajado: srcDaImagem(img_vargheist_vulcanico_cajado) },
  'vargheist:vargheist-albino': { espadaGrande: srcDaImagem(img_vargheist_albino_espadaGrande), katana: srcDaImagem(img_vargheist_albino_katana), lanca: srcDaImagem(img_vargheist_albino_lanca), espadaEscudo: srcDaImagem(img_vargheist_albino_espadaEscudo), grimorio: srcDaImagem(img_vargheist_albino_grimorio), cajado: srcDaImagem(img_vargheist_albino_cajado) },
  'noctyrr:principal': { espadaGrande: srcDaImagem(img_noctyrr_principal_espadaGrande), katana: srcDaImagem(img_noctyrr_principal_katana), lanca: srcDaImagem(img_noctyrr_principal_lanca), espadaEscudo: srcDaImagem(img_noctyrr_principal_espadaEscudo), grimorio: srcDaImagem(img_noctyrr_principal_grimorio), cajado: srcDaImagem(img_noctyrr_principal_cajado) },
  'noctyrr:noctyrr-tempestuoso': { espadaGrande: srcDaImagem(img_noctyrr_tempestuoso_espadaGrande), katana: srcDaImagem(img_noctyrr_tempestuoso_katana), lanca: srcDaImagem(img_noctyrr_tempestuoso_lanca), espadaEscudo: srcDaImagem(img_noctyrr_tempestuoso_espadaEscudo), grimorio: srcDaImagem(img_noctyrr_tempestuoso_grimorio), cajado: srcDaImagem(img_noctyrr_tempestuoso_cajado) },
  'noctyrr:noctyrr-abissal': { espadaGrande: srcDaImagem(img_noctyrr_abissal_espadaGrande), katana: srcDaImagem(img_noctyrr_abissal_katana), lanca: srcDaImagem(img_noctyrr_abissal_lanca), espadaEscudo: srcDaImagem(img_noctyrr_abissal_espadaEscudo), grimorio: srcDaImagem(img_noctyrr_abissal_grimorio), cajado: srcDaImagem(img_noctyrr_abissal_cajado) },
  'murdrax:principal': { espadaGrande: srcDaImagem(img_murdrax_principal_espadaGrande), katana: srcDaImagem(img_murdrax_principal_katana), lanca: srcDaImagem(img_murdrax_principal_lanca), espadaEscudo: srcDaImagem(img_murdrax_principal_espadaEscudo), grimorio: srcDaImagem(img_murdrax_principal_grimorio), cajado: srcDaImagem(img_murdrax_principal_cajado) },
  'murdrax:murdrax-corrosivo': { espadaGrande: srcDaImagem(img_murdrax_corrosivo_espadaGrande), katana: srcDaImagem(img_murdrax_corrosivo_katana), lanca: srcDaImagem(img_murdrax_corrosivo_lanca), espadaEscudo: srcDaImagem(img_murdrax_corrosivo_espadaEscudo), grimorio: srcDaImagem(img_murdrax_corrosivo_grimorio), cajado: srcDaImagem(img_murdrax_corrosivo_cajado) },
  'murdrax:murdrax-de-basalto': { espadaGrande: srcDaImagem(img_murdrax_basalto_espadaGrande), katana: srcDaImagem(img_murdrax_basalto_katana), lanca: srcDaImagem(img_murdrax_basalto_lanca), espadaEscudo: srcDaImagem(img_murdrax_basalto_espadaEscudo), grimorio: srcDaImagem(img_murdrax_basalto_grimorio), cajado: srcDaImagem(img_murdrax_basalto_cajado) },
  'vargheist-alfa:principal': { espadaGrande: srcDaImagem(img_alfa_principal_espadaGrande), katana: srcDaImagem(img_alfa_principal_katana), lanca: srcDaImagem(img_alfa_principal_lanca), espadaEscudo: srcDaImagem(img_alfa_principal_espadaEscudo), grimorio: srcDaImagem(img_alfa_principal_grimorio), cajado: srcDaImagem(img_alfa_principal_cajado) },
  'vargheist-alfa:vargheist-alfa-carmesim': { espadaGrande: srcDaImagem(img_alfa_carmesim_espadaGrande), katana: srcDaImagem(img_alfa_carmesim_katana), lanca: srcDaImagem(img_alfa_carmesim_lanca), espadaEscudo: srcDaImagem(img_alfa_carmesim_espadaEscudo), grimorio: srcDaImagem(img_alfa_carmesim_grimorio), cajado: srcDaImagem(img_alfa_carmesim_cajado) },
  'vargheist-alfa:vargheist-alfa-vulcanico': { espadaGrande: srcDaImagem(img_alfa_vulcanico_espadaGrande), katana: srcDaImagem(img_alfa_vulcanico_katana), lanca: srcDaImagem(img_alfa_vulcanico_lanca), espadaEscudo: srcDaImagem(img_alfa_vulcanico_espadaEscudo), grimorio: srcDaImagem(img_alfa_vulcanico_grimorio), cajado: srcDaImagem(img_alfa_vulcanico_cajado) },
  'grizzharn:principal': { espadaGrande: srcDaImagem(img_grizzharn_principal_espadaGrande), katana: srcDaImagem(img_grizzharn_principal_katana), lanca: srcDaImagem(img_grizzharn_principal_lanca), espadaEscudo: srcDaImagem(img_grizzharn_principal_espadaEscudo), grimorio: srcDaImagem(img_grizzharn_principal_grimorio), cajado: srcDaImagem(img_grizzharn_principal_cajado) },
  'grizzharn:grizzharn-glacial': { espadaGrande: srcDaImagem(img_grizzharn_glacial_espadaGrande), katana: srcDaImagem(img_grizzharn_glacial_katana), lanca: srcDaImagem(img_grizzharn_glacial_lanca), espadaEscudo: srcDaImagem(img_grizzharn_glacial_espadaEscudo), grimorio: srcDaImagem(img_grizzharn_glacial_grimorio), cajado: srcDaImagem(img_grizzharn_glacial_cajado) },
  'grizzharn:grizzharn-ancestral': { espadaGrande: srcDaImagem(img_grizzharn_ancestral_espadaGrande), katana: srcDaImagem(img_grizzharn_ancestral_katana), lanca: srcDaImagem(img_grizzharn_ancestral_lanca), espadaEscudo: srcDaImagem(img_grizzharn_ancestral_espadaEscudo), grimorio: srcDaImagem(img_grizzharn_ancestral_grimorio), cajado: srcDaImagem(img_grizzharn_ancestral_cajado) },
  'floragoth:principal': { espadaGrande: srcDaImagem(img_floragoth_principal_espadaGrande), katana: srcDaImagem(img_floragoth_principal_katana), lanca: srcDaImagem(img_floragoth_principal_lanca), espadaEscudo: srcDaImagem(img_floragoth_principal_espadaEscudo), grimorio: srcDaImagem(img_floragoth_principal_grimorio), cajado: srcDaImagem(img_floragoth_principal_cajado) },
  'floragoth:floragoth-carmesim': { espadaGrande: srcDaImagem(img_floragoth_carmesim_espadaGrande), katana: srcDaImagem(img_floragoth_carmesim_katana), lanca: srcDaImagem(img_floragoth_carmesim_lanca), espadaEscudo: srcDaImagem(img_floragoth_carmesim_espadaEscudo), grimorio: srcDaImagem(img_floragoth_carmesim_grimorio), cajado: srcDaImagem(img_floragoth_carmesim_cajado) },
  'floragoth:floragoth-abissal': { espadaGrande: srcDaImagem(img_floragoth_abissal_espadaGrande), katana: srcDaImagem(img_floragoth_abissal_katana), lanca: srcDaImagem(img_floragoth_abissal_lanca), espadaEscudo: srcDaImagem(img_floragoth_abissal_espadaEscudo), grimorio: srcDaImagem(img_floragoth_abissal_grimorio), cajado: srcDaImagem(img_floragoth_abissal_cajado) },
  'rhazkida:principal': { espadaGrande: srcDaImagem(img_rhazkida_principal_espadaGrande), katana: srcDaImagem(img_rhazkida_principal_katana), lanca: srcDaImagem(img_rhazkida_principal_lanca), espadaEscudo: srcDaImagem(img_rhazkida_principal_espadaEscudo), grimorio: srcDaImagem(img_rhazkida_principal_grimorio), cajado: srcDaImagem(img_rhazkida_principal_cajado) },
  'rhazkida:rhazkida-escarlate': { espadaGrande: srcDaImagem(img_rhazkida_escarlate_espadaGrande), katana: srcDaImagem(img_rhazkida_escarlate_katana), lanca: srcDaImagem(img_rhazkida_escarlate_lanca), espadaEscudo: srcDaImagem(img_rhazkida_escarlate_espadaEscudo), grimorio: srcDaImagem(img_rhazkida_escarlate_grimorio), cajado: srcDaImagem(img_rhazkida_escarlate_cajado) },
  'rhazkida:rhazkida-cristalina': { espadaGrande: srcDaImagem(img_rhazkida_cristalina_espadaGrande), katana: srcDaImagem(img_rhazkida_cristalina_katana), lanca: srcDaImagem(img_rhazkida_cristalina_lanca), espadaEscudo: srcDaImagem(img_rhazkida_cristalina_espadaEscudo), grimorio: srcDaImagem(img_rhazkida_cristalina_grimorio), cajado: srcDaImagem(img_rhazkida_cristalina_cajado) },
  'cryovarn:principal': { espadaGrande: srcDaImagem(img_cryovarn_principal_espadaGrande), katana: srcDaImagem(img_cryovarn_principal_katana), lanca: srcDaImagem(img_cryovarn_principal_lanca), espadaEscudo: srcDaImagem(img_cryovarn_principal_espadaEscudo), grimorio: srcDaImagem(img_cryovarn_principal_grimorio), cajado: srcDaImagem(img_cryovarn_principal_cajado) },
  'cryovarn:cryovarn-abissal': { espadaGrande: srcDaImagem(img_cryovarn_abissal_espadaGrande), katana: srcDaImagem(img_cryovarn_abissal_katana), lanca: srcDaImagem(img_cryovarn_abissal_lanca), espadaEscudo: srcDaImagem(img_cryovarn_abissal_espadaEscudo), grimorio: srcDaImagem(img_cryovarn_abissal_grimorio), cajado: srcDaImagem(img_cryovarn_abissal_cajado) },
  'cryovarn:cryovarn-furioso': { espadaGrande: srcDaImagem(img_cryovarn_furioso_espadaGrande), katana: srcDaImagem(img_cryovarn_furioso_katana), lanca: srcDaImagem(img_cryovarn_furioso_lanca), espadaEscudo: srcDaImagem(img_cryovarn_furioso_espadaEscudo), grimorio: srcDaImagem(img_cryovarn_furioso_grimorio), cajado: srcDaImagem(img_cryovarn_furioso_cajado) },
};

export function arteDaArma(baseId: string | undefined, categoria: CategoriaArma): string | null {
  const base = baseId ? ARMAS_BASE_MAP[baseId] : undefined;
  return base ? (ARTE[`${base.monstroId}:${base.parte}`]?.[categoria] ?? null) : null;
}
