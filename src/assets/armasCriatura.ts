import { srcDaImagem } from '@/assets/srcDaImagem';
import { ARMAS_BASE_MAP } from '@/rules/armasCatalogo';
import type { CategoriaArma } from '@/rules/armas';
import img_zyrak_principal_espadaGrande from './images/forja/armas-criatura/zyrak-principal-espadaGrande.webp';
import img_zyrak_principal_katana from './images/forja/armas-criatura/zyrak-principal-katana.webp';
import img_zyrak_principal_lanca from './images/forja/armas-criatura/zyrak-principal-lanca.webp';
import img_zyrak_principal_espadaEscudo from './images/forja/armas-criatura/zyrak-principal-espadaEscudo.webp';
import img_zyrak_principal_grimorio from './images/forja/armas-criatura/zyrak-principal-grimorio.webp';
import img_zyrak_principal_cajado from './images/forja/armas-criatura/zyrak-principal-cajado.webp';
import img_zyrak_carmesim_espadaGrande from './images/forja/armas-criatura/zyrak-carmesim-espadaGrande.webp';
import img_zyrak_carmesim_katana from './images/forja/armas-criatura/zyrak-carmesim-katana.webp';
import img_zyrak_carmesim_lanca from './images/forja/armas-criatura/zyrak-carmesim-lanca.webp';
import img_zyrak_carmesim_espadaEscudo from './images/forja/armas-criatura/zyrak-carmesim-espadaEscudo.webp';
import img_zyrak_carmesim_grimorio from './images/forja/armas-criatura/zyrak-carmesim-grimorio.webp';
import img_zyrak_carmesim_cajado from './images/forja/armas-criatura/zyrak-carmesim-cajado.webp';
import img_dromvark_principal_espadaGrande from './images/forja/armas-criatura/dromvark-principal-espadaGrande.webp';
import img_dromvark_principal_katana from './images/forja/armas-criatura/dromvark-principal-katana.webp';
import img_dromvark_principal_lanca from './images/forja/armas-criatura/dromvark-principal-lanca.webp';
import img_dromvark_principal_espadaEscudo from './images/forja/armas-criatura/dromvark-principal-espadaEscudo.webp';
import img_dromvark_principal_grimorio from './images/forja/armas-criatura/dromvark-principal-grimorio.webp';
import img_dromvark_principal_cajado from './images/forja/armas-criatura/dromvark-principal-cajado.webp';
import img_dromvark_devastador_espadaGrande from './images/forja/armas-criatura/dromvark-devastador-espadaGrande.webp';
import img_dromvark_devastador_katana from './images/forja/armas-criatura/dromvark-devastador-katana.webp';
import img_dromvark_devastador_lanca from './images/forja/armas-criatura/dromvark-devastador-lanca.webp';
import img_dromvark_devastador_espadaEscudo from './images/forja/armas-criatura/dromvark-devastador-espadaEscudo.webp';
import img_dromvark_devastador_grimorio from './images/forja/armas-criatura/dromvark-devastador-grimorio.webp';
import img_dromvark_devastador_cajado from './images/forja/armas-criatura/dromvark-devastador-cajado.webp';
import img_rathmorn_principal_espadaGrande from './images/forja/armas-criatura/rathmorn-principal-espadaGrande.webp';
import img_rathmorn_principal_katana from './images/forja/armas-criatura/rathmorn-principal-katana.webp';
import img_rathmorn_principal_lanca from './images/forja/armas-criatura/rathmorn-principal-lanca.webp';
import img_rathmorn_principal_espadaEscudo from './images/forja/armas-criatura/rathmorn-principal-espadaEscudo.webp';
import img_rathmorn_principal_grimorio from './images/forja/armas-criatura/rathmorn-principal-grimorio.webp';
import img_rathmorn_principal_cajado from './images/forja/armas-criatura/rathmorn-principal-cajado.webp';
import img_rathmorn_abissal_espadaGrande from './images/forja/armas-criatura/rathmorn-abissal-espadaGrande.webp';
import img_rathmorn_abissal_katana from './images/forja/armas-criatura/rathmorn-abissal-katana.webp';
import img_rathmorn_abissal_lanca from './images/forja/armas-criatura/rathmorn-abissal-lanca.webp';
import img_rathmorn_abissal_espadaEscudo from './images/forja/armas-criatura/rathmorn-abissal-espadaEscudo.webp';
import img_rathmorn_abissal_grimorio from './images/forja/armas-criatura/rathmorn-abissal-grimorio.webp';
import img_rathmorn_abissal_cajado from './images/forja/armas-criatura/rathmorn-abissal-cajado.webp';
import img_ghorvazul_principal_espadaGrande from './images/forja/armas-criatura/ghorvazul-principal-espadaGrande.webp';
import img_ghorvazul_principal_katana from './images/forja/armas-criatura/ghorvazul-principal-katana.webp';
import img_ghorvazul_principal_lanca from './images/forja/armas-criatura/ghorvazul-principal-lanca.webp';
import img_ghorvazul_principal_espadaEscudo from './images/forja/armas-criatura/ghorvazul-principal-espadaEscudo.webp';
import img_ghorvazul_principal_grimorio from './images/forja/armas-criatura/ghorvazul-principal-grimorio.webp';
import img_ghorvazul_principal_cajado from './images/forja/armas-criatura/ghorvazul-principal-cajado.webp';
import img_tharvok_principal_espadaGrande from './images/forja/armas-criatura/tharvok-principal-espadaGrande.webp';
import img_tharvok_principal_katana from './images/forja/armas-criatura/tharvok-principal-katana.webp';
import img_tharvok_principal_lanca from './images/forja/armas-criatura/tharvok-principal-lanca.webp';
import img_tharvok_principal_espadaEscudo from './images/forja/armas-criatura/tharvok-principal-espadaEscudo.webp';
import img_tharvok_principal_grimorio from './images/forja/armas-criatura/tharvok-principal-grimorio.webp';
import img_tharvok_principal_cajado from './images/forja/armas-criatura/tharvok-principal-cajado.webp';
import img_vaelgrun_principal_espadaGrande from './images/forja/armas-criatura/vaelgrun-principal-espadaGrande.webp';
import img_vaelgrun_principal_katana from './images/forja/armas-criatura/vaelgrun-principal-katana.webp';
import img_vaelgrun_principal_lanca from './images/forja/armas-criatura/vaelgrun-principal-lanca.webp';
import img_vaelgrun_principal_espadaEscudo from './images/forja/armas-criatura/vaelgrun-principal-espadaEscudo.webp';
import img_vaelgrun_principal_grimorio from './images/forja/armas-criatura/vaelgrun-principal-grimorio.webp';
import img_vaelgrun_principal_cajado from './images/forja/armas-criatura/vaelgrun-principal-cajado.webp';
import img_nershaga_principal_espadaGrande from './images/forja/armas-criatura/nershaga-principal-espadaGrande.webp';
import img_nershaga_principal_katana from './images/forja/armas-criatura/nershaga-principal-katana.webp';
import img_nershaga_principal_lanca from './images/forja/armas-criatura/nershaga-principal-lanca.webp';
import img_nershaga_principal_espadaEscudo from './images/forja/armas-criatura/nershaga-principal-espadaEscudo.webp';
import img_nershaga_principal_grimorio from './images/forja/armas-criatura/nershaga-principal-grimorio.webp';
import img_nershaga_principal_cajado from './images/forja/armas-criatura/nershaga-principal-cajado.webp';
import img_abysskar_principal_espadaGrande from './images/forja/armas-criatura/abysskar-principal-espadaGrande.webp';
import img_abysskar_principal_katana from './images/forja/armas-criatura/abysskar-principal-katana.webp';
import img_abysskar_principal_lanca from './images/forja/armas-criatura/abysskar-principal-lanca.webp';
import img_abysskar_principal_espadaEscudo from './images/forja/armas-criatura/abysskar-principal-espadaEscudo.webp';
import img_abysskar_principal_grimorio from './images/forja/armas-criatura/abysskar-principal-grimorio.webp';
import img_abysskar_principal_cajado from './images/forja/armas-criatura/abysskar-principal-cajado.webp';
import img_abysskar_abissal_espadaGrande from './images/forja/armas-criatura/abysskar-abissal-espadaGrande.webp';
import img_abysskar_abissal_katana from './images/forja/armas-criatura/abysskar-abissal-katana.webp';
import img_abysskar_abissal_lanca from './images/forja/armas-criatura/abysskar-abissal-lanca.webp';
import img_abysskar_abissal_espadaEscudo from './images/forja/armas-criatura/abysskar-abissal-espadaEscudo.webp';
import img_abysskar_abissal_grimorio from './images/forja/armas-criatura/abysskar-abissal-grimorio.webp';
import img_abysskar_abissal_cajado from './images/forja/armas-criatura/abysskar-abissal-cajado.webp';
import img_vorthak_principal_espadaGrande from './images/forja/armas-criatura/vorthak-principal-espadaGrande.webp';
import img_vorthak_principal_katana from './images/forja/armas-criatura/vorthak-principal-katana.webp';
import img_vorthak_principal_lanca from './images/forja/armas-criatura/vorthak-principal-lanca.webp';
import img_vorthak_principal_espadaEscudo from './images/forja/armas-criatura/vorthak-principal-espadaEscudo.webp';
import img_vorthak_principal_grimorio from './images/forja/armas-criatura/vorthak-principal-grimorio.webp';
import img_vorthak_principal_cajado from './images/forja/armas-criatura/vorthak-principal-cajado.webp';
import img_vorthak_carmesim_espadaGrande from './images/forja/armas-criatura/vorthak-carmesim-espadaGrande.webp';
import img_vorthak_carmesim_katana from './images/forja/armas-criatura/vorthak-carmesim-katana.webp';
import img_vorthak_carmesim_lanca from './images/forja/armas-criatura/vorthak-carmesim-lanca.webp';
import img_vorthak_carmesim_espadaEscudo from './images/forja/armas-criatura/vorthak-carmesim-espadaEscudo.webp';
import img_vorthak_carmesim_grimorio from './images/forja/armas-criatura/vorthak-carmesim-grimorio.webp';
import img_vorthak_carmesim_cajado from './images/forja/armas-criatura/vorthak-carmesim-cajado.webp';
import img_matriarca_principal_espadaGrande from './images/forja/armas-criatura/matriarca-principal-espadaGrande.webp';
import img_matriarca_principal_katana from './images/forja/armas-criatura/matriarca-principal-katana.webp';
import img_matriarca_principal_lanca from './images/forja/armas-criatura/matriarca-principal-lanca.webp';
import img_matriarca_principal_espadaEscudo from './images/forja/armas-criatura/matriarca-principal-espadaEscudo.webp';
import img_matriarca_principal_grimorio from './images/forja/armas-criatura/matriarca-principal-grimorio.webp';
import img_matriarca_principal_cajado from './images/forja/armas-criatura/matriarca-principal-cajado.webp';
import img_matriarca_putrefata_espadaGrande from './images/forja/armas-criatura/matriarca-putrefata-espadaGrande.webp';
import img_matriarca_putrefata_katana from './images/forja/armas-criatura/matriarca-putrefata-katana.webp';
import img_matriarca_putrefata_lanca from './images/forja/armas-criatura/matriarca-putrefata-lanca.webp';
import img_matriarca_putrefata_espadaEscudo from './images/forja/armas-criatura/matriarca-putrefata-espadaEscudo.webp';
import img_matriarca_putrefata_grimorio from './images/forja/armas-criatura/matriarca-putrefata-grimorio.webp';
import img_matriarca_putrefata_cajado from './images/forja/armas-criatura/matriarca-putrefata-cajado.webp';
import img_dravoryx_principal_espadaGrande from './images/forja/armas-criatura/dravoryx-principal-espadaGrande.webp';
import img_dravoryx_principal_katana from './images/forja/armas-criatura/dravoryx-principal-katana.webp';
import img_dravoryx_principal_lanca from './images/forja/armas-criatura/dravoryx-principal-lanca.webp';
import img_dravoryx_principal_espadaEscudo from './images/forja/armas-criatura/dravoryx-principal-espadaEscudo.webp';
import img_dravoryx_principal_grimorio from './images/forja/armas-criatura/dravoryx-principal-grimorio.webp';
import img_dravoryx_principal_cajado from './images/forja/armas-criatura/dravoryx-principal-cajado.webp';
import img_dravoryx_tempestuoso_espadaGrande from './images/forja/armas-criatura/dravoryx-tempestuoso-espadaGrande.webp';
import img_dravoryx_tempestuoso_katana from './images/forja/armas-criatura/dravoryx-tempestuoso-katana.webp';
import img_dravoryx_tempestuoso_lanca from './images/forja/armas-criatura/dravoryx-tempestuoso-lanca.webp';
import img_dravoryx_tempestuoso_espadaEscudo from './images/forja/armas-criatura/dravoryx-tempestuoso-espadaEscudo.webp';
import img_dravoryx_tempestuoso_grimorio from './images/forja/armas-criatura/dravoryx-tempestuoso-grimorio.webp';
import img_dravoryx_tempestuoso_cajado from './images/forja/armas-criatura/dravoryx-tempestuoso-cajado.webp';
import img_thalassyr_principal_espadaGrande from './images/forja/armas-criatura/thalassyr-principal-espadaGrande.webp';
import img_thalassyr_principal_katana from './images/forja/armas-criatura/thalassyr-principal-katana.webp';
import img_thalassyr_principal_lanca from './images/forja/armas-criatura/thalassyr-principal-lanca.webp';
import img_thalassyr_principal_espadaEscudo from './images/forja/armas-criatura/thalassyr-principal-espadaEscudo.webp';
import img_thalassyr_principal_grimorio from './images/forja/armas-criatura/thalassyr-principal-grimorio.webp';
import img_thalassyr_principal_cajado from './images/forja/armas-criatura/thalassyr-principal-cajado.webp';
import img_thalassyr_abissal_espadaGrande from './images/forja/armas-criatura/thalassyr-abissal-espadaGrande.webp';
import img_thalassyr_abissal_katana from './images/forja/armas-criatura/thalassyr-abissal-katana.webp';
import img_thalassyr_abissal_lanca from './images/forja/armas-criatura/thalassyr-abissal-lanca.webp';
import img_thalassyr_abissal_espadaEscudo from './images/forja/armas-criatura/thalassyr-abissal-espadaEscudo.webp';
import img_thalassyr_abissal_grimorio from './images/forja/armas-criatura/thalassyr-abissal-grimorio.webp';
import img_thalassyr_abissal_cajado from './images/forja/armas-criatura/thalassyr-abissal-cajado.webp';
import img_gravorn_principal_espadaGrande from './images/forja/armas-criatura/gravorn-principal-espadaGrande.webp';
import img_gravorn_principal_katana from './images/forja/armas-criatura/gravorn-principal-katana.webp';
import img_gravorn_principal_lanca from './images/forja/armas-criatura/gravorn-principal-lanca.webp';
import img_gravorn_principal_espadaEscudo from './images/forja/armas-criatura/gravorn-principal-espadaEscudo.webp';
import img_gravorn_principal_grimorio from './images/forja/armas-criatura/gravorn-principal-grimorio.webp';
import img_gravorn_principal_cajado from './images/forja/armas-criatura/gravorn-principal-cajado.webp';
import img_gravorn_magmatico_espadaGrande from './images/forja/armas-criatura/gravorn-magmatico-espadaGrande.webp';
import img_gravorn_magmatico_katana from './images/forja/armas-criatura/gravorn-magmatico-katana.webp';
import img_gravorn_magmatico_lanca from './images/forja/armas-criatura/gravorn-magmatico-lanca.webp';
import img_gravorn_magmatico_espadaEscudo from './images/forja/armas-criatura/gravorn-magmatico-espadaEscudo.webp';
import img_gravorn_magmatico_grimorio from './images/forja/armas-criatura/gravorn-magmatico-grimorio.webp';
import img_gravorn_magmatico_cajado from './images/forja/armas-criatura/gravorn-magmatico-cajado.webp';
import img_raizark_principal_espadaGrande from './images/forja/armas-criatura/raizark-principal-espadaGrande.webp';
import img_raizark_principal_katana from './images/forja/armas-criatura/raizark-principal-katana.webp';
import img_raizark_principal_lanca from './images/forja/armas-criatura/raizark-principal-lanca.webp';
import img_raizark_principal_espadaEscudo from './images/forja/armas-criatura/raizark-principal-espadaEscudo.webp';
import img_raizark_principal_grimorio from './images/forja/armas-criatura/raizark-principal-grimorio.webp';
import img_raizark_principal_cajado from './images/forja/armas-criatura/raizark-principal-cajado.webp';
import img_raizark_fulminante_espadaGrande from './images/forja/armas-criatura/raizark-fulminante-espadaGrande.webp';
import img_raizark_fulminante_katana from './images/forja/armas-criatura/raizark-fulminante-katana.webp';
import img_raizark_fulminante_lanca from './images/forja/armas-criatura/raizark-fulminante-lanca.webp';
import img_raizark_fulminante_espadaEscudo from './images/forja/armas-criatura/raizark-fulminante-espadaEscudo.webp';
import img_raizark_fulminante_grimorio from './images/forja/armas-criatura/raizark-fulminante-grimorio.webp';
import img_raizark_fulminante_cajado from './images/forja/armas-criatura/raizark-fulminante-cajado.webp';
import img_pesthyr_principal_espadaGrande from './images/forja/armas-criatura/pesthyr-principal-espadaGrande.webp';
import img_pesthyr_principal_katana from './images/forja/armas-criatura/pesthyr-principal-katana.webp';
import img_pesthyr_principal_lanca from './images/forja/armas-criatura/pesthyr-principal-lanca.webp';
import img_pesthyr_principal_espadaEscudo from './images/forja/armas-criatura/pesthyr-principal-espadaEscudo.webp';
import img_pesthyr_principal_grimorio from './images/forja/armas-criatura/pesthyr-principal-grimorio.webp';
import img_pesthyr_principal_cajado from './images/forja/armas-criatura/pesthyr-principal-cajado.webp';
import img_pesthyr_carmesim_espadaGrande from './images/forja/armas-criatura/pesthyr-carmesim-espadaGrande.webp';
import img_pesthyr_carmesim_katana from './images/forja/armas-criatura/pesthyr-carmesim-katana.webp';
import img_pesthyr_carmesim_lanca from './images/forja/armas-criatura/pesthyr-carmesim-lanca.webp';
import img_pesthyr_carmesim_espadaEscudo from './images/forja/armas-criatura/pesthyr-carmesim-espadaEscudo.webp';
import img_pesthyr_carmesim_grimorio from './images/forja/armas-criatura/pesthyr-carmesim-grimorio.webp';
import img_pesthyr_carmesim_cajado from './images/forja/armas-criatura/pesthyr-carmesim-cajado.webp';
import img_pesthyr_glacial_espadaGrande from './images/forja/armas-criatura/pesthyr-glacial-espadaGrande.webp';
import img_pesthyr_glacial_katana from './images/forja/armas-criatura/pesthyr-glacial-katana.webp';
import img_pesthyr_glacial_lanca from './images/forja/armas-criatura/pesthyr-glacial-lanca.webp';
import img_pesthyr_glacial_espadaEscudo from './images/forja/armas-criatura/pesthyr-glacial-espadaEscudo.webp';
import img_pesthyr_glacial_grimorio from './images/forja/armas-criatura/pesthyr-glacial-grimorio.webp';
import img_pesthyr_glacial_cajado from './images/forja/armas-criatura/pesthyr-glacial-cajado.webp';
import img_zaryth_principal_espadaGrande from './images/forja/armas-criatura/zaryth-principal-espadaGrande.webp';
import img_zaryth_principal_katana from './images/forja/armas-criatura/zaryth-principal-katana.webp';
import img_zaryth_principal_lanca from './images/forja/armas-criatura/zaryth-principal-lanca.webp';
import img_zaryth_principal_espadaEscudo from './images/forja/armas-criatura/zaryth-principal-espadaEscudo.webp';
import img_zaryth_principal_grimorio from './images/forja/armas-criatura/zaryth-principal-grimorio.webp';
import img_zaryth_principal_cajado from './images/forja/armas-criatura/zaryth-principal-cajado.webp';
import img_zaryth_vulcanico_espadaGrande from './images/forja/armas-criatura/zaryth-vulcanico-espadaGrande.webp';
import img_zaryth_vulcanico_katana from './images/forja/armas-criatura/zaryth-vulcanico-katana.webp';
import img_zaryth_vulcanico_lanca from './images/forja/armas-criatura/zaryth-vulcanico-lanca.webp';
import img_zaryth_vulcanico_espadaEscudo from './images/forja/armas-criatura/zaryth-vulcanico-espadaEscudo.webp';
import img_zaryth_vulcanico_grimorio from './images/forja/armas-criatura/zaryth-vulcanico-grimorio.webp';
import img_zaryth_vulcanico_cajado from './images/forja/armas-criatura/zaryth-vulcanico-cajado.webp';
import img_zaryth_abissal_espadaGrande from './images/forja/armas-criatura/zaryth-abissal-espadaGrande.webp';
import img_zaryth_abissal_katana from './images/forja/armas-criatura/zaryth-abissal-katana.webp';
import img_zaryth_abissal_lanca from './images/forja/armas-criatura/zaryth-abissal-lanca.webp';
import img_zaryth_abissal_espadaEscudo from './images/forja/armas-criatura/zaryth-abissal-espadaEscudo.webp';
import img_zaryth_abissal_grimorio from './images/forja/armas-criatura/zaryth-abissal-grimorio.webp';
import img_zaryth_abissal_cajado from './images/forja/armas-criatura/zaryth-abissal-cajado.webp';
import img_nythrakka_principal_espadaGrande from './images/forja/armas-criatura/nythrakka-principal-espadaGrande.webp';
import img_nythrakka_principal_katana from './images/forja/armas-criatura/nythrakka-principal-katana.webp';
import img_nythrakka_principal_lanca from './images/forja/armas-criatura/nythrakka-principal-lanca.webp';
import img_nythrakka_principal_espadaEscudo from './images/forja/armas-criatura/nythrakka-principal-espadaEscudo.webp';
import img_nythrakka_principal_grimorio from './images/forja/armas-criatura/nythrakka-principal-grimorio.webp';
import img_nythrakka_principal_cajado from './images/forja/armas-criatura/nythrakka-principal-cajado.webp';
import img_nythrakka_venenosa_espadaGrande from './images/forja/armas-criatura/nythrakka-venenosa-espadaGrande.webp';
import img_nythrakka_venenosa_katana from './images/forja/armas-criatura/nythrakka-venenosa-katana.webp';
import img_nythrakka_venenosa_lanca from './images/forja/armas-criatura/nythrakka-venenosa-lanca.webp';
import img_nythrakka_venenosa_espadaEscudo from './images/forja/armas-criatura/nythrakka-venenosa-espadaEscudo.webp';
import img_nythrakka_venenosa_grimorio from './images/forja/armas-criatura/nythrakka-venenosa-grimorio.webp';
import img_nythrakka_venenosa_cajado from './images/forja/armas-criatura/nythrakka-venenosa-cajado.webp';
import img_nythrakka_fantasma_espadaGrande from './images/forja/armas-criatura/nythrakka-fantasma-espadaGrande.webp';
import img_nythrakka_fantasma_katana from './images/forja/armas-criatura/nythrakka-fantasma-katana.webp';
import img_nythrakka_fantasma_lanca from './images/forja/armas-criatura/nythrakka-fantasma-lanca.webp';
import img_nythrakka_fantasma_espadaEscudo from './images/forja/armas-criatura/nythrakka-fantasma-espadaEscudo.webp';
import img_nythrakka_fantasma_grimorio from './images/forja/armas-criatura/nythrakka-fantasma-grimorio.webp';
import img_nythrakka_fantasma_cajado from './images/forja/armas-criatura/nythrakka-fantasma-cajado.webp';
import img_drazhkar_principal_espadaGrande from './images/forja/armas-criatura/drazhkar-principal-espadaGrande.webp';
import img_drazhkar_principal_katana from './images/forja/armas-criatura/drazhkar-principal-katana.webp';
import img_drazhkar_principal_lanca from './images/forja/armas-criatura/drazhkar-principal-lanca.webp';
import img_drazhkar_principal_espadaEscudo from './images/forja/armas-criatura/drazhkar-principal-espadaEscudo.webp';
import img_drazhkar_principal_grimorio from './images/forja/armas-criatura/drazhkar-principal-grimorio.webp';
import img_drazhkar_principal_cajado from './images/forja/armas-criatura/drazhkar-principal-cajado.webp';
import img_drazhkar_obsidiana_espadaGrande from './images/forja/armas-criatura/drazhkar-obsidiana-espadaGrande.webp';
import img_drazhkar_obsidiana_katana from './images/forja/armas-criatura/drazhkar-obsidiana-katana.webp';
import img_drazhkar_obsidiana_lanca from './images/forja/armas-criatura/drazhkar-obsidiana-lanca.webp';
import img_drazhkar_obsidiana_espadaEscudo from './images/forja/armas-criatura/drazhkar-obsidiana-espadaEscudo.webp';
import img_drazhkar_obsidiana_grimorio from './images/forja/armas-criatura/drazhkar-obsidiana-grimorio.webp';
import img_drazhkar_obsidiana_cajado from './images/forja/armas-criatura/drazhkar-obsidiana-cajado.webp';
import img_drazhkar_sismico_espadaGrande from './images/forja/armas-criatura/drazhkar-sismico-espadaGrande.webp';
import img_drazhkar_sismico_katana from './images/forja/armas-criatura/drazhkar-sismico-katana.webp';
import img_drazhkar_sismico_lanca from './images/forja/armas-criatura/drazhkar-sismico-lanca.webp';
import img_drazhkar_sismico_espadaEscudo from './images/forja/armas-criatura/drazhkar-sismico-espadaEscudo.webp';
import img_drazhkar_sismico_grimorio from './images/forja/armas-criatura/drazhkar-sismico-grimorio.webp';
import img_drazhkar_sismico_cajado from './images/forja/armas-criatura/drazhkar-sismico-cajado.webp';
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
 * usam a mesma arte por enquanto (decisão provisória, a confirmar). Prontas: de 1★ a 6★ e, no 7★ e no 8★, Zyrak, Dromvark, Rathmorn, Ghorvazul, Tharvok, Vaelgrun e Nershaga (falta o Kharvok); as demais armas usam
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
  'pesthyr:principal': { espadaGrande: srcDaImagem(img_pesthyr_principal_espadaGrande), katana: srcDaImagem(img_pesthyr_principal_katana), lanca: srcDaImagem(img_pesthyr_principal_lanca), espadaEscudo: srcDaImagem(img_pesthyr_principal_espadaEscudo), grimorio: srcDaImagem(img_pesthyr_principal_grimorio), cajado: srcDaImagem(img_pesthyr_principal_cajado) },
  'pesthyr:pesthyr-carmesim': { espadaGrande: srcDaImagem(img_pesthyr_carmesim_espadaGrande), katana: srcDaImagem(img_pesthyr_carmesim_katana), lanca: srcDaImagem(img_pesthyr_carmesim_lanca), espadaEscudo: srcDaImagem(img_pesthyr_carmesim_espadaEscudo), grimorio: srcDaImagem(img_pesthyr_carmesim_grimorio), cajado: srcDaImagem(img_pesthyr_carmesim_cajado) },
  'pesthyr:pesthyr-glacial': { espadaGrande: srcDaImagem(img_pesthyr_glacial_espadaGrande), katana: srcDaImagem(img_pesthyr_glacial_katana), lanca: srcDaImagem(img_pesthyr_glacial_lanca), espadaEscudo: srcDaImagem(img_pesthyr_glacial_espadaEscudo), grimorio: srcDaImagem(img_pesthyr_glacial_grimorio), cajado: srcDaImagem(img_pesthyr_glacial_cajado) },
  'zaryth:principal': { espadaGrande: srcDaImagem(img_zaryth_principal_espadaGrande), katana: srcDaImagem(img_zaryth_principal_katana), lanca: srcDaImagem(img_zaryth_principal_lanca), espadaEscudo: srcDaImagem(img_zaryth_principal_espadaEscudo), grimorio: srcDaImagem(img_zaryth_principal_grimorio), cajado: srcDaImagem(img_zaryth_principal_cajado) },
  'zaryth:zaryth-vulcanico': { espadaGrande: srcDaImagem(img_zaryth_vulcanico_espadaGrande), katana: srcDaImagem(img_zaryth_vulcanico_katana), lanca: srcDaImagem(img_zaryth_vulcanico_lanca), espadaEscudo: srcDaImagem(img_zaryth_vulcanico_espadaEscudo), grimorio: srcDaImagem(img_zaryth_vulcanico_grimorio), cajado: srcDaImagem(img_zaryth_vulcanico_cajado) },
  'zaryth:zaryth-abissal': { espadaGrande: srcDaImagem(img_zaryth_abissal_espadaGrande), katana: srcDaImagem(img_zaryth_abissal_katana), lanca: srcDaImagem(img_zaryth_abissal_lanca), espadaEscudo: srcDaImagem(img_zaryth_abissal_espadaEscudo), grimorio: srcDaImagem(img_zaryth_abissal_grimorio), cajado: srcDaImagem(img_zaryth_abissal_cajado) },
  'nythrakka:principal': { espadaGrande: srcDaImagem(img_nythrakka_principal_espadaGrande), katana: srcDaImagem(img_nythrakka_principal_katana), lanca: srcDaImagem(img_nythrakka_principal_lanca), espadaEscudo: srcDaImagem(img_nythrakka_principal_espadaEscudo), grimorio: srcDaImagem(img_nythrakka_principal_grimorio), cajado: srcDaImagem(img_nythrakka_principal_cajado) },
  'nythrakka:nythrakka-venenosa': { espadaGrande: srcDaImagem(img_nythrakka_venenosa_espadaGrande), katana: srcDaImagem(img_nythrakka_venenosa_katana), lanca: srcDaImagem(img_nythrakka_venenosa_lanca), espadaEscudo: srcDaImagem(img_nythrakka_venenosa_espadaEscudo), grimorio: srcDaImagem(img_nythrakka_venenosa_grimorio), cajado: srcDaImagem(img_nythrakka_venenosa_cajado) },
  'nythrakka:nythrakka-fantasma': { espadaGrande: srcDaImagem(img_nythrakka_fantasma_espadaGrande), katana: srcDaImagem(img_nythrakka_fantasma_katana), lanca: srcDaImagem(img_nythrakka_fantasma_lanca), espadaEscudo: srcDaImagem(img_nythrakka_fantasma_espadaEscudo), grimorio: srcDaImagem(img_nythrakka_fantasma_grimorio), cajado: srcDaImagem(img_nythrakka_fantasma_cajado) },
  'drazhkar:principal': { espadaGrande: srcDaImagem(img_drazhkar_principal_espadaGrande), katana: srcDaImagem(img_drazhkar_principal_katana), lanca: srcDaImagem(img_drazhkar_principal_lanca), espadaEscudo: srcDaImagem(img_drazhkar_principal_espadaEscudo), grimorio: srcDaImagem(img_drazhkar_principal_grimorio), cajado: srcDaImagem(img_drazhkar_principal_cajado) },
  'drazhkar:drazhkar-de-obsidiana': { espadaGrande: srcDaImagem(img_drazhkar_obsidiana_espadaGrande), katana: srcDaImagem(img_drazhkar_obsidiana_katana), lanca: srcDaImagem(img_drazhkar_obsidiana_lanca), espadaEscudo: srcDaImagem(img_drazhkar_obsidiana_espadaEscudo), grimorio: srcDaImagem(img_drazhkar_obsidiana_grimorio), cajado: srcDaImagem(img_drazhkar_obsidiana_cajado) },
  'drazhkar:drazhkar-sismico': { espadaGrande: srcDaImagem(img_drazhkar_sismico_espadaGrande), katana: srcDaImagem(img_drazhkar_sismico_katana), lanca: srcDaImagem(img_drazhkar_sismico_lanca), espadaEscudo: srcDaImagem(img_drazhkar_sismico_espadaEscudo), grimorio: srcDaImagem(img_drazhkar_sismico_grimorio), cajado: srcDaImagem(img_drazhkar_sismico_cajado) },
  'abysskar:principal': { espadaGrande: srcDaImagem(img_abysskar_principal_espadaGrande), katana: srcDaImagem(img_abysskar_principal_katana), lanca: srcDaImagem(img_abysskar_principal_lanca), espadaEscudo: srcDaImagem(img_abysskar_principal_espadaEscudo), grimorio: srcDaImagem(img_abysskar_principal_grimorio), cajado: srcDaImagem(img_abysskar_principal_cajado) },
  'abysskar:abysskar-abissal': { espadaGrande: srcDaImagem(img_abysskar_abissal_espadaGrande), katana: srcDaImagem(img_abysskar_abissal_katana), lanca: srcDaImagem(img_abysskar_abissal_lanca), espadaEscudo: srcDaImagem(img_abysskar_abissal_espadaEscudo), grimorio: srcDaImagem(img_abysskar_abissal_grimorio), cajado: srcDaImagem(img_abysskar_abissal_cajado) },
  'vorthak:principal': { espadaGrande: srcDaImagem(img_vorthak_principal_espadaGrande), katana: srcDaImagem(img_vorthak_principal_katana), lanca: srcDaImagem(img_vorthak_principal_lanca), espadaEscudo: srcDaImagem(img_vorthak_principal_espadaEscudo), grimorio: srcDaImagem(img_vorthak_principal_grimorio), cajado: srcDaImagem(img_vorthak_principal_cajado) },
  'vorthak:vorthak-carmesim': { espadaGrande: srcDaImagem(img_vorthak_carmesim_espadaGrande), katana: srcDaImagem(img_vorthak_carmesim_katana), lanca: srcDaImagem(img_vorthak_carmesim_lanca), espadaEscudo: srcDaImagem(img_vorthak_carmesim_espadaEscudo), grimorio: srcDaImagem(img_vorthak_carmesim_grimorio), cajado: srcDaImagem(img_vorthak_carmesim_cajado) },
  'nythrakka-matriarca-do-casulo:principal': { espadaGrande: srcDaImagem(img_matriarca_principal_espadaGrande), katana: srcDaImagem(img_matriarca_principal_katana), lanca: srcDaImagem(img_matriarca_principal_lanca), espadaEscudo: srcDaImagem(img_matriarca_principal_espadaEscudo), grimorio: srcDaImagem(img_matriarca_principal_grimorio), cajado: srcDaImagem(img_matriarca_principal_cajado) },
  'nythrakka-matriarca-do-casulo:matriarca-putrefata': { espadaGrande: srcDaImagem(img_matriarca_putrefata_espadaGrande), katana: srcDaImagem(img_matriarca_putrefata_katana), lanca: srcDaImagem(img_matriarca_putrefata_lanca), espadaEscudo: srcDaImagem(img_matriarca_putrefata_espadaEscudo), grimorio: srcDaImagem(img_matriarca_putrefata_grimorio), cajado: srcDaImagem(img_matriarca_putrefata_cajado) },
  'dravoryx:principal': { espadaGrande: srcDaImagem(img_dravoryx_principal_espadaGrande), katana: srcDaImagem(img_dravoryx_principal_katana), lanca: srcDaImagem(img_dravoryx_principal_lanca), espadaEscudo: srcDaImagem(img_dravoryx_principal_espadaEscudo), grimorio: srcDaImagem(img_dravoryx_principal_grimorio), cajado: srcDaImagem(img_dravoryx_principal_cajado) },
  'dravoryx:dravoryx-tempestuoso': { espadaGrande: srcDaImagem(img_dravoryx_tempestuoso_espadaGrande), katana: srcDaImagem(img_dravoryx_tempestuoso_katana), lanca: srcDaImagem(img_dravoryx_tempestuoso_lanca), espadaEscudo: srcDaImagem(img_dravoryx_tempestuoso_espadaEscudo), grimorio: srcDaImagem(img_dravoryx_tempestuoso_grimorio), cajado: srcDaImagem(img_dravoryx_tempestuoso_cajado) },
  'thalassyr:principal': { espadaGrande: srcDaImagem(img_thalassyr_principal_espadaGrande), katana: srcDaImagem(img_thalassyr_principal_katana), lanca: srcDaImagem(img_thalassyr_principal_lanca), espadaEscudo: srcDaImagem(img_thalassyr_principal_espadaEscudo), grimorio: srcDaImagem(img_thalassyr_principal_grimorio), cajado: srcDaImagem(img_thalassyr_principal_cajado) },
  'thalassyr:thalassyr-abissal': { espadaGrande: srcDaImagem(img_thalassyr_abissal_espadaGrande), katana: srcDaImagem(img_thalassyr_abissal_katana), lanca: srcDaImagem(img_thalassyr_abissal_lanca), espadaEscudo: srcDaImagem(img_thalassyr_abissal_espadaEscudo), grimorio: srcDaImagem(img_thalassyr_abissal_grimorio), cajado: srcDaImagem(img_thalassyr_abissal_cajado) },
  'gravorn:principal': { espadaGrande: srcDaImagem(img_gravorn_principal_espadaGrande), katana: srcDaImagem(img_gravorn_principal_katana), lanca: srcDaImagem(img_gravorn_principal_lanca), espadaEscudo: srcDaImagem(img_gravorn_principal_espadaEscudo), grimorio: srcDaImagem(img_gravorn_principal_grimorio), cajado: srcDaImagem(img_gravorn_principal_cajado) },
  'gravorn:gravorn-magmatico': { espadaGrande: srcDaImagem(img_gravorn_magmatico_espadaGrande), katana: srcDaImagem(img_gravorn_magmatico_katana), lanca: srcDaImagem(img_gravorn_magmatico_lanca), espadaEscudo: srcDaImagem(img_gravorn_magmatico_espadaEscudo), grimorio: srcDaImagem(img_gravorn_magmatico_grimorio), cajado: srcDaImagem(img_gravorn_magmatico_cajado) },
  'raizark:principal': { espadaGrande: srcDaImagem(img_raizark_principal_espadaGrande), katana: srcDaImagem(img_raizark_principal_katana), lanca: srcDaImagem(img_raizark_principal_lanca), espadaEscudo: srcDaImagem(img_raizark_principal_espadaEscudo), grimorio: srcDaImagem(img_raizark_principal_grimorio), cajado: srcDaImagem(img_raizark_principal_cajado) },
  'raizark:raizark-fulminante': { espadaGrande: srcDaImagem(img_raizark_fulminante_espadaGrande), katana: srcDaImagem(img_raizark_fulminante_katana), lanca: srcDaImagem(img_raizark_fulminante_lanca), espadaEscudo: srcDaImagem(img_raizark_fulminante_espadaEscudo), grimorio: srcDaImagem(img_raizark_fulminante_grimorio), cajado: srcDaImagem(img_raizark_fulminante_cajado) },
  'zyrak:principal': { espadaGrande: srcDaImagem(img_zyrak_principal_espadaGrande), katana: srcDaImagem(img_zyrak_principal_katana), lanca: srcDaImagem(img_zyrak_principal_lanca), espadaEscudo: srcDaImagem(img_zyrak_principal_espadaEscudo), grimorio: srcDaImagem(img_zyrak_principal_grimorio), cajado: srcDaImagem(img_zyrak_principal_cajado) },
  'zyrak:zyrak-carmesim': { espadaGrande: srcDaImagem(img_zyrak_carmesim_espadaGrande), katana: srcDaImagem(img_zyrak_carmesim_katana), lanca: srcDaImagem(img_zyrak_carmesim_lanca), espadaEscudo: srcDaImagem(img_zyrak_carmesim_espadaEscudo), grimorio: srcDaImagem(img_zyrak_carmesim_grimorio), cajado: srcDaImagem(img_zyrak_carmesim_cajado) },
  'dromvark:principal': { espadaGrande: srcDaImagem(img_dromvark_principal_espadaGrande), katana: srcDaImagem(img_dromvark_principal_katana), lanca: srcDaImagem(img_dromvark_principal_lanca), espadaEscudo: srcDaImagem(img_dromvark_principal_espadaEscudo), grimorio: srcDaImagem(img_dromvark_principal_grimorio), cajado: srcDaImagem(img_dromvark_principal_cajado) },
  'dromvark:dromvark-devastador': { espadaGrande: srcDaImagem(img_dromvark_devastador_espadaGrande), katana: srcDaImagem(img_dromvark_devastador_katana), lanca: srcDaImagem(img_dromvark_devastador_lanca), espadaEscudo: srcDaImagem(img_dromvark_devastador_espadaEscudo), grimorio: srcDaImagem(img_dromvark_devastador_grimorio), cajado: srcDaImagem(img_dromvark_devastador_cajado) },
  'rathmorn:principal': { espadaGrande: srcDaImagem(img_rathmorn_principal_espadaGrande), katana: srcDaImagem(img_rathmorn_principal_katana), lanca: srcDaImagem(img_rathmorn_principal_lanca), espadaEscudo: srcDaImagem(img_rathmorn_principal_espadaEscudo), grimorio: srcDaImagem(img_rathmorn_principal_grimorio), cajado: srcDaImagem(img_rathmorn_principal_cajado) },
  'rathmorn:rathmorn-abissal': { espadaGrande: srcDaImagem(img_rathmorn_abissal_espadaGrande), katana: srcDaImagem(img_rathmorn_abissal_katana), lanca: srcDaImagem(img_rathmorn_abissal_lanca), espadaEscudo: srcDaImagem(img_rathmorn_abissal_espadaEscudo), grimorio: srcDaImagem(img_rathmorn_abissal_grimorio), cajado: srcDaImagem(img_rathmorn_abissal_cajado) },
  'ghorvazul:principal': { espadaGrande: srcDaImagem(img_ghorvazul_principal_espadaGrande), katana: srcDaImagem(img_ghorvazul_principal_katana), lanca: srcDaImagem(img_ghorvazul_principal_lanca), espadaEscudo: srcDaImagem(img_ghorvazul_principal_espadaEscudo), grimorio: srcDaImagem(img_ghorvazul_principal_grimorio), cajado: srcDaImagem(img_ghorvazul_principal_cajado) },
  'tharvok:principal': { espadaGrande: srcDaImagem(img_tharvok_principal_espadaGrande), katana: srcDaImagem(img_tharvok_principal_katana), lanca: srcDaImagem(img_tharvok_principal_lanca), espadaEscudo: srcDaImagem(img_tharvok_principal_espadaEscudo), grimorio: srcDaImagem(img_tharvok_principal_grimorio), cajado: srcDaImagem(img_tharvok_principal_cajado) },
  'vaelgrun:principal': { espadaGrande: srcDaImagem(img_vaelgrun_principal_espadaGrande), katana: srcDaImagem(img_vaelgrun_principal_katana), lanca: srcDaImagem(img_vaelgrun_principal_lanca), espadaEscudo: srcDaImagem(img_vaelgrun_principal_espadaEscudo), grimorio: srcDaImagem(img_vaelgrun_principal_grimorio), cajado: srcDaImagem(img_vaelgrun_principal_cajado) },
  'nershaga:principal': { espadaGrande: srcDaImagem(img_nershaga_principal_espadaGrande), katana: srcDaImagem(img_nershaga_principal_katana), lanca: srcDaImagem(img_nershaga_principal_lanca), espadaEscudo: srcDaImagem(img_nershaga_principal_espadaEscudo), grimorio: srcDaImagem(img_nershaga_principal_grimorio), cajado: srcDaImagem(img_nershaga_principal_cajado) },
};

export function arteDaArma(baseId: string | undefined, categoria: CategoriaArma): string | null {
  const base = baseId ? ARMAS_BASE_MAP[baseId] : undefined;
  return base ? (ARTE[`${base.monstroId}:${base.parte}`]?.[categoria] ?? null) : null;
}
