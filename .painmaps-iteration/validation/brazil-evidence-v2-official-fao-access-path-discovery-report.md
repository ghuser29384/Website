# Brazil evidence v2 official FAO access-path discovery report

## Purpose
Find official FAO/FAOSTAT/FAODATA Explorer access paths for QCL/RP after DBnomics observations were unavailable. No numeric parsing, no country promotion.

## Decision carried forward
DBnomics remains blocked for observations.

## Inputs
- DBnomics observation-shape diagnostics.
- Official FAO seed URLs.

## URLs/pages/API roots inspected
- `seed-001` `https://www.fao.org/contact-us/terms/db-terms-of-use/en/` status `200` content type `text/html; charset=utf-8`
- `seed-002` `https://www.fao.org/faostat/en/#data/QCL` status `200` content type `text/html`
- `seed-003` `https://www.fao.org/faostat/en/#data/RP` status `200` content type `text/html`
- `seed-004` `https://www.fao.org/faostat/en/#data` status `200` content type `text/html`
- `seed-005` `https://dataexplorer.fao.org/` status `200` content type `text/html; charset=utf-8`
- `seed-006` `https://fenixservices.fao.org/faostat/api/v1/` status `521` content type `text/plain; charset=UTF-8`
- `seed-007` `https://fenixservices.fao.org/faostat/api/v1/Definitions/DomainCodes/DomainCodes` status `521` content type `text/plain; charset=UTF-8`
- `js-001` `https://www.fao.org/ResourcePackages/FAO/assets/dist/js/responsive-patch.js` status `200` content type `application/x-javascript`
- `js-002` `https://www.fao.org/faostat/en/src/js/lib/repo/require.min.js` status `200` content type `application/javascript`

## Discovery summary
- total rows: `207`
- rows by recommended_status: `{'official_page_only': 5, 'manual_review_required': 118, 'official_metadata_endpoint_candidate': 76, 'official_download_endpoint_candidate_unfetched': 6, 'blocked_unreachable': 2}`
- endpoint_type counts: `{'fetched_seed_resource': 9, 'reference': 118, 'page_or_app_reference': 62, 'javascript_reference': 2, 'download_candidate_unfetched': 6, 'api_or_metadata_candidate': 10}`
- supports_qcl heuristic counts: `{'false': 206, 'true': 1}`
- supports_rp heuristic counts: `{'true': 24, 'false': 183}`
- official metadata endpoint candidates: `76`
- official download endpoint candidates left unfetched: `6`
- blocked/unreachable rows: `2`

Important caveat: `supports_qcl` and `supports_rp` are raw token heuristics from URL/text snippets, not source approval. Several rows are noisy UI or terms-page fragments and remain unapproved until ChatGPT reviews them.

Generated candidate-only diagnostic artifacts:
- `data/candidates/brazil_evidence_pack_v2_for_codex/scripts/discover_official_fao_access_paths.py`
- `data/candidates/brazil_evidence_pack_v2_for_codex/official-fao-access-path-discovery.csv`
- `data/candidates/brazil_evidence_pack_v2_for_codex/official-fao-access-path-discovery.json`
- `data/candidates/brazil_evidence_pack_v2_for_codex/official-fao-access-path-discovery.md`
- `data/candidates/brazil_evidence_pack_v2_for_codex/official-fao-access-path-discovery-snippets.txt`
- `data/candidates/brazil_evidence_pack_v2_for_codex/official-fao-access-path-discovery.log`
- `data/candidates/brazil_evidence_pack_v2_for_codex/official-fao-access-path-discovery-guard.log`

## Candidate endpoints for ChatGPT review

### Priority candidate classes

| candidate_id | endpoint/reference | endpoint_type | supports_qcl | supports_rp | why it might be useful | why it remains unapproved |
|---|---|---|---|---|---|---|
| `seed-001` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/` | `fetched_seed_resource` | `false` | `true` | Official FAO reference captured by endpoint discovery; relevance is not yet established. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-011` | `https://dataexplorer.fao.org/` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-030` | `https://www.fao.org/ResourcePackages/FAO/assets/dist/js/responsive-patch.js` | `javascript_reference` | `false` | `false` | Official app JS asset that may reveal supported FAOSTAT/Data Explorer routes or API names. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-056` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/><p>As stated in Article 1 of its Constitution, the Food and Agriculture Organization of the United Nations (“FAO”) “shal...` | `reference` | `false` | `true` | Official FAO reference captured by endpoint discovery; relevance is not yet established. | Heuristic reference only; relevance unclear and not approved. |
| `ref-057` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/><strong>Terms and Conditions regarding the Reuse of Web content</strong></a> are incorporated verbatim herein. When you ...` | `download_candidate_unfetched` | `false` | `true` | Possible official FAO download/source-snapshot reference; deliberately left unfetched. | Not fetched; ChatGPT must approve before any source snapshot or data download. |
| `ref-059` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/>Creative Commons Attribution-4.0 International licence</a></strong> (CC BY 4.0) available here as complemented by the Te...` | `download_candidate_unfetched` | `false` | `true` | Possible official FAO download/source-snapshot reference; deliberately left unfetched. | Not fetched; ChatGPT must approve before any source snapshot or data download. |
| `ref-068` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/>Terms and Conditions regarding the Reuse of Web content</a></strong>, which are incorporated herein by reference.</p><h2...` | `download_candidate_unfetched` | `false` | `true` | Possible official FAO download/source-snapshot reference; deliberately left unfetched. | Not fetched; ChatGPT must approve before any source snapshot or data download. |
| `ref-085` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/footer-download col-md-5` | `download_candidate_unfetched` | `false` | `false` | Possible official FAO download/source-snapshot reference; deliberately left unfetched. | Not fetched; ChatGPT must approve before any source snapshot or data download. |
| `ref-095` | `https://www.fao.org/docs/corporatelibraries/default-document-library/favicon/favicon.ico` | `reference` | `false` | `true` | Official FAO reference captured by endpoint discovery; relevance is not yet established. | Heuristic reference only; relevance unclear and not approved. |
| `ref-098` | `https://www.fao.org/faostat/en/#home` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-104` | `https://www.fao.org/images/corporatelibraries/logos/fao-logo-en.svg?sfvrsn=f64522b4_36` | `reference` | `false` | `true` | Official FAO reference captured by endpoint discovery; relevance is not yet established. | Heuristic reference only; relevance unclear and not approved. |
| `ref-105` | `https://www.fao.org/images/corporatelibraries/social-icons/bluesky.svg?sfvrsn=91618a92_1` | `reference` | `false` | `true` | Official FAO reference captured by endpoint discovery; relevance is not yet established. | Heuristic reference only; relevance unclear and not approved. |
| `ref-106` | `https://www.fao.org/images/corporatelibraries/social-icons/social-icon-facebook.svg?sfvrsn=b87ff153_3` | `reference` | `false` | `true` | Official FAO reference captured by endpoint discovery; relevance is not yet established. | Heuristic reference only; relevance unclear and not approved. |
| `ref-107` | `https://www.fao.org/images/corporatelibraries/social-icons/social-icon-instagram.svg?sfvrsn=a778452f_3` | `reference` | `false` | `true` | Official FAO reference captured by endpoint discovery; relevance is not yet established. | Heuristic reference only; relevance unclear and not approved. |
| `ref-108` | `https://www.fao.org/images/corporatelibraries/social-icons/social-icon-linkedin.svg?sfvrsn=1025492c_3` | `reference` | `false` | `true` | Official FAO reference captured by endpoint discovery; relevance is not yet established. | Heuristic reference only; relevance unclear and not approved. |
| `ref-109` | `https://www.fao.org/images/corporatelibraries/social-icons/social-icon-soundcloud.svg?sfvrsn=26e63892_3` | `reference` | `false` | `true` | Official FAO reference captured by endpoint discovery; relevance is not yet established. | Heuristic reference only; relevance unclear and not approved. |
| `ref-110` | `https://www.fao.org/images/corporatelibraries/social-icons/social-icon-tiktok.svg?sfvrsn=b2228fd0_3` | `reference` | `false` | `true` | Official FAO reference captured by endpoint discovery; relevance is not yet established. | Heuristic reference only; relevance unclear and not approved. |
| `ref-111` | `https://www.fao.org/images/corporatelibraries/social-icons/social-icon-tuotiao.svg?sfvrsn=1883ae3_3` | `reference` | `false` | `true` | Official FAO reference captured by endpoint discovery; relevance is not yet established. | Heuristic reference only; relevance unclear and not approved. |
| `ref-112` | `https://www.fao.org/images/corporatelibraries/social-icons/social-icon-twitter.svg?sfvrsn=c68bb7c2_4` | `reference` | `false` | `true` | Official FAO reference captured by endpoint discovery; relevance is not yet established. | Heuristic reference only; relevance unclear and not approved. |
| `ref-113` | `https://www.fao.org/images/corporatelibraries/social-icons/social-icon-wechat.svg` | `reference` | `false` | `true` | Official FAO reference captured by endpoint discovery; relevance is not yet established. | Heuristic reference only; relevance unclear and not approved. |
| `ref-114` | `https://www.fao.org/images/corporatelibraries/social-icons/social-icon-wechat.svg?sfvrsn=cd28c1ee_3` | `reference` | `false` | `true` | Official FAO reference captured by endpoint discovery; relevance is not yet established. | Heuristic reference only; relevance unclear and not approved. |
| `ref-115` | `https://www.fao.org/images/corporatelibraries/social-icons/social-icon-weibo.svg?sfvrsn=7b5b0403_3` | `reference` | `false` | `true` | Official FAO reference captured by endpoint discovery; relevance is not yet established. | Heuristic reference only; relevance unclear and not approved. |
| `ref-116` | `https://www.fao.org/images/corporatelibraries/social-icons/social-icon-youtube.svg?sfvrsn=94de1814_3` | `reference` | `false` | `true` | Official FAO reference captured by endpoint discovery; relevance is not yet established. | Heuristic reference only; relevance unclear and not approved. |
| `ref-117` | `https://www.fao.org/images/corporatelibraries/social-icons/wechat_qr.jpg` | `reference` | `false` | `true` | Official FAO reference captured by endpoint discovery; relevance is not yet established. | Heuristic reference only; relevance unclear and not approved. |
| `ref-118` | `https://www.fao.org/images/corporatelibraries/social-icons/whatsapp-icon.svg?sfvrsn=6cfc5647_1` | `reference` | `false` | `true` | Official FAO reference captured by endpoint discovery; relevance is not yet established. | Heuristic reference only; relevance unclear and not approved. |
| `ref-120` | `https://www.fao.org/media/images/corporatenavigationlibraries/default-album/uf21gr5-fao80-1_blue.svg?sfvrsn=c6153fd4_3` | `reference` | `false` | `true` | Official FAO reference captured by endpoint discovery; relevance is not yet established. | Heuristic reference only; relevance unclear and not approved. |
| `seed-002` | `https://www.fao.org/faostat/en/#data/QCL` | `fetched_seed_resource` | `true` | `false` | Official FAO reference captured by endpoint discovery; relevance is not yet established. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-127` | `https://www.fao.org/faostat/en/>        window.dataLayer = window.dataLayer \|\| [];        window.dataLayer.push({        ` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-128` | `https://www.fao.org/faostat/en/>    <script data-main=` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-129` | `https://www.fao.org/faostat/en/></script><!-- FAOSTAT -->    <!-- Google Tag Manager -->    <script>(function(w,d,s,l,i){w[l]=w[l]\|\|[];w[l].push({` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-130` | `https://www.fao.org/faostat/en/FAOSTAT provides free access to food and agriculture data for over 245 countries and territories and covers all FAO regional groupings from 1961 t...` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-131` | `https://www.fao.org/faostat/en/dataLayer` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-132` | `https://www.fao.org/faostat/en/dist/css/index.css` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-133` | `https://www.fao.org/faostat/en/faostat.appcache` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-134` | `https://www.fao.org/faostat/en/humans.txt` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-135` | `https://www.fao.org/faostat/en/src/css/repo/bootstrap-table.min.css` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-136` | `https://www.fao.org/faostat/en/src/css/repo/bootstrap.min.css` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-137` | `https://www.fao.org/faostat/en/src/css/repo/dataTables.bootstrap.min.css` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-138` | `https://www.fao.org/faostat/en/src/css/repo/fixedColumns.bootstrap.min.css` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-139` | `https://www.fao.org/faostat/en/src/css/repo/introjs.min.css` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-140` | `https://www.fao.org/faostat/en/src/css/repo/ion.rangeSlider.css` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-141` | `https://www.fao.org/faostat/en/src/css/repo/ion.rangeSlider.skinHTML5.css` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-142` | `https://www.fao.org/faostat/en/src/css/repo/jbPivot.css` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-143` | `https://www.fao.org/faostat/en/src/css/repo/jquery-ui.custom.min.css` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-144` | `https://www.fao.org/faostat/en/src/css/repo/jstree.style.min.css` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-145` | `https://www.fao.org/faostat/en/src/css/repo/leaflet.css` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-146` | `https://www.fao.org/faostat/en/src/css/repo/normalize.css` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-147` | `https://www.fao.org/faostat/en/src/css/repo/nprogress.css` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-148` | `https://www.fao.org/faostat/en/src/css/repo/outdatedbrowser.min.css` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-149` | `https://www.fao.org/faostat/en/src/css/repo/select2.css` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-150` | `https://www.fao.org/faostat/en/src/css/repo/swiper.min.css` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-151` | `https://www.fao.org/faostat/en/src/css/repo/toastr.min.css` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-152` | `https://www.fao.org/faostat/en/src/css/repo/waves.min.css` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-153` | `https://www.fao.org/faostat/en/src/images/logo/FAO-logo.svg` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-154` | `https://www.fao.org/faostat/en/src/js/lib/repo/require.min.js` | `javascript_reference` | `false` | `false` | Official app JS asset that may reveal supported FAOSTAT/Data Explorer routes or API names. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-155` | `https://www.fao.org/faostat/en/submodules/fenix-ui-map/dist/fenix-ui-map.min.css` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `seed-003` | `https://www.fao.org/faostat/en/#data/RP` | `fetched_seed_resource` | `false` | `true` | Official FAO reference captured by endpoint discovery; relevance is not yet established. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `seed-005` | `https://dataexplorer.fao.org/` | `fetched_seed_resource` | `false` | `true` | Official FAO reference captured by endpoint discovery; relevance is not yet established. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-159` | `https://dataexplorer.fao.org/(Re)inicialización exitosa de dataflows relacionados en el espacio {label}:` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-160` | `https://dataexplorer.fao.org/(Re-)index dataflow` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-161` | `https://dataexplorer.fao.org/(Ré)initialisation réussie des dataflows associés dans l` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-162` | `https://dataexplorer.fao.org/(Ré-)indexer le dataflow` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-163` | `https://dataexplorer.fao.org/. Los segmentos de fila representarán todas las combinaciones posibles de los otros elementos de dimensión seleccionados (con una limitación de 5 se...` | `api_or_metadata_candidate` | `false` | `false` | Possible official FAO API or metadata reference for later narrow inspection. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-164` | `https://dataexplorer.fao.org/. {Br} {br} \u003cb\u003e ¿Quería un gráfico de filas apiladas porcentuales? \u003c/b\u003e {br} Utilice la opción de personalización ` | `api_or_metadata_candidate` | `false` | `false` | Possible official FAO API or metadata reference for later narrow inspection. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-165` | `https://dataexplorer.fao.org/.Stat Data Explorer` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-166` | `https://dataexplorer.fao.org/.Stat Data Explorer • {dataflowName}` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-167` | `https://dataexplorer.fao.org/.Stat Data Viewer` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-168` | `https://dataexplorer.fao.org/.Stat 数据资源管理器 • {dataflowName}` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-169` | `https://dataexplorer.fao.org/? \u003c/b\u003e {br} Los gráficos de filas apiladas necesitan datos que cubran al menos 2 puntos de datos. Verifique y aumente los elementos de dim...` | `api_or_metadata_candidate` | `false` | `false` | Possible official FAO API or metadata reference for later narrow inspection. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-170` | `https://dataexplorer.fao.org/?\u003c/b\u003e{br}Make sure to have a selection that includes at least 1 data point. You can check data availability using the ` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-171` | `https://dataexplorer.fao.org/A timeline chart cannot be shown because the data has no time dimension.` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-172` | `https://dataexplorer.fao.org/API SDMX. Réduisez la sélection de filtres pour générer une requête de données SDMX valide.` | `api_or_metadata_candidate` | `false` | `false` | Possible official FAO API or metadata reference for later narrow inspection. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-173` | `https://dataexplorer.fao.org/API documentation` | `api_or_metadata_candidate` | `false` | `false` | Possible official FAO API or metadata reference for later narrow inspection. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-174` | `https://dataexplorer.fao.org/API pour développeur` | `api_or_metadata_candidate` | `false` | `false` | Possible official FAO API or metadata reference for later narrow inspection. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-175` | `https://dataexplorer.fao.org/API разработчика` | `api_or_metadata_candidate` | `false` | `false` | Possible official FAO API or metadata reference for later narrow inspection. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-176` | `https://dataexplorer.fao.org/API 文档` | `api_or_metadata_candidate` | `false` | `false` | Possible official FAO API or metadata reference for later narrow inspection. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-177` | `https://dataexplorer.fao.org/Accueil – .Stat Data Explorer - Logo` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-178` | `https://dataexplorer.fao.org/Activar dataflow` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-179` | `https://dataexplorer.fao.org/Activate dataflow` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-180` | `https://dataexplorer.fao.org/Activer le dataflow` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-181` | `https://dataexplorer.fao.org/Add ref. metadata link` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-182` | `https://dataexplorer.fao.org/Advertencia(s) para la (re)inicialización de dataflows relacionados en el espacio {label}:` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-183` | `https://dataexplorer.fao.org/Allow for a later emergency restoration of the current live data` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-184` | `https://dataexplorer.fao.org/Allows adding new embargoed and non-embargoed data (Note: In .Stat Suite this permission currently also allows updating existing embargoed and non-e...` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-185` | `https://dataexplorer.fao.org/Allows deleting embargoed and non-embargoed data` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-186` | `https://dataexplorer.fao.org/Allows retrieving embargoed data` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-187` | `https://dataexplorer.fao.org/Allows retrieving non-embargoed data` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-188` | `https://dataexplorer.fao.org/Allows technically plugging the dataflow to the underlying data and/or ref. metadata, e.g. when already uploaded data or metadata is not accessible.` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-189` | `https://dataexplorer.fao.org/Allows updating existing embargoed and non-embargoed data (Note: In .Stat Suite this permission is currently ineffective.)` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-190` | `https://dataexplorer.fao.org/As well as in these data...` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-191` | `https://dataexplorer.fao.org/Avertissement(s) pour la (ré)initialisation des dataflows associés dans l` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-192` | `https://dataexplorer.fao.org/Barras apiladas` | `api_or_metadata_candidate` | `false` | `false` | Possible official FAO API or metadata reference for later narrow inspection. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-193` | `https://dataexplorer.fao.org/Both data and referential metadata` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-194` | `https://dataexplorer.fao.org/Both data and referential metadata (CSV)` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-195` | `https://dataexplorer.fao.org/Bulk selection` | `download_candidate_unfetched` | `false` | `false` | Possible official FAO download/source-snapshot reference; deliberately left unfetched. | Not fetched; ChatGPT must approve before any source snapshot or data download. |
| `ref-196` | `https://dataexplorer.fao.org/Cher utilisateur de Data Explorer, avant de récupérer votre(vos) visualisation(s), veuillez confirmer votre email en cliquant sur le bouton ci-dessous.` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-197` | `https://dataexplorer.fao.org/Cher utilisateur de Data-Explorer, merci d` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-198` | `https://dataexplorer.fao.org/Consider checking your browser settings regarding multiple files download and destination folder, in order to avoid multiple validation popup windows` | `download_candidate_unfetched` | `false` | `false` | Possible official FAO download/source-snapshot reference; deliberately left unfetched. | Not fetched; ChatGPT must approve before any source snapshot or data download. |
| `ref-199` | `https://dataexplorer.fao.org/Consultas API` | `api_or_metadata_candidate` | `false` | `false` | Possible official FAO API or metadata reference for later narrow inspection. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-200` | `https://dataexplorer.fao.org/Data Characteristics` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-201` | `https://dataexplorer.fao.org/Data Lifecycle Manager` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `seed-006` | `https://fenixservices.fao.org/faostat/api/v1/` | `fetched_seed_resource` | `false` | `false` | Official FAO reference captured by endpoint discovery; relevance is not yet established. | Unreachable in this run. |
| `seed-007` | `https://fenixservices.fao.org/faostat/api/v1/Definitions/DomainCodes/DomainCodes` | `fetched_seed_resource` | `false` | `false` | Official FAO reference captured by endpoint discovery; relevance is not yet established. | Unreachable in this run. |
| `js-001` | `https://www.fao.org/ResourcePackages/FAO/assets/dist/js/responsive-patch.js` | `fetched_seed_resource` | `false` | `false` | Official FAO reference captured by endpoint discovery; relevance is not yet established. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `js-002` | `https://www.fao.org/faostat/en/src/js/lib/repo/require.min.js` | `fetched_seed_resource` | `false` | `false` | Official FAO reference captured by endpoint discovery; relevance is not yet established. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |
| `ref-207` | `https://www.fao.org/faostat/en/src/js/lib/repo/);d+=b\|\|(/^data\:\|\?/.test(d)\|\|c?` | `page_or_app_reference` | `false` | `false` | Official FAO app/page reference that may help locate the supported access path. | Metadata/page/JS only; no numeric values inspected and ChatGPT must approve the next fetch. |

### Full candidate_endpoint_or_reference rows

The complete untruncated row inventory is in `official-fao-access-path-discovery.csv/json`. This appendix lists every non-empty `candidate_endpoint_or_reference` row with endpoints truncated for review.

| candidate_id | status | endpoint_type | supports_qcl | supports_rp | endpoint/reference |
|---|---|---|---|---|---|
| `ref-002` | `manual_review_required` | `reference` | `false` | `false` | `http://www.fao.org/about/en/` |
| `ref-003` | `manual_review_required` | `reference` | `false` | `false` | `http://www.fao.org/countryprofiles/en/` |
| `ref-004` | `manual_review_required` | `reference` | `false` | `false` | `http://www.fao.org/in-action/en/` |
| `ref-005` | `manual_review_required` | `reference` | `false` | `false` | `http://www.fao.org/news/en/` |
| `ref-006` | `manual_review_required` | `reference` | `false` | `false` | `http://www.fao.org/partnerships/en/` |
| `ref-007` | `manual_review_required` | `reference` | `false` | `false` | `http://www.fao.org/statistics/en/` |
| `ref-008` | `manual_review_required` | `reference` | `false` | `false` | `http://www.fao.org/themes/en/` |
| `ref-009` | `manual_review_required` | `reference` | `false` | `false` | `https://data-in-emergencies.fao.org/` |
| `ref-010` | `manual_review_required` | `reference` | `false` | `false` | `https://data.apps.fao.org/wapor/?lang=en` |
| `ref-011` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://dataexplorer.fao.org/` |
| `ref-012` | `manual_review_required` | `reference` | `false` | `false` | `https://empres-i.apps.fao.org/` |
| `ref-013` | `manual_review_required` | `reference` | `false` | `false` | `https://fao.org/contact-us/data-protection-and-privacy/en/` |
| `ref-014` | `manual_review_required` | `reference` | `false` | `false` | `https://fao.org/contact-us/en/` |
| `ref-015` | `manual_review_required` | `reference` | `false` | `false` | `https://fao.org/contact-us/scam-alert/en/` |
| `ref-016` | `manual_review_required` | `reference` | `false` | `false` | `https://fao.org/contact-us/terms/en/` |
| `ref-017` | `manual_review_required` | `reference` | `false` | `false` | `https://fra-data.fao.org/assessments/fra/2020/` |
| `ref-018` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org` |
| `ref-019` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/Frontend-Assembly/SitefinityWebApp/Mvc/Scripts/FaoLanguageSelector/language-selector.js?package=FAO&amp;v=Mjc1MTEwNjkz` |
| `ref-020` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/ResourcePackages/Bootstrap5/assets/dist/css/main.min.css?v=5.3.3&amp;package=FAO` |
| `ref-021` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/ResourcePackages/Bootstrap5/assets/dist/js/bootstrap.min.js?v=5.3.3` |
| `ref-022` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/ResourcePackages/Bootstrap5/assets/dist/js/popper.min.js?v=2.11.8` |
| `ref-023` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/ResourcePackages/FAO/assets/dist/css/fao-theme.min.css?v=3.6.8&amp;package=FAO` |
| `ref-024` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/ResourcePackages/FAO/assets/dist/img/FAO-logo.JPG` |
| `ref-025` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/ResourcePackages/FAO/assets/dist/img/social-icons/social-icon-facebook.svg` |
| `ref-026` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/ResourcePackages/FAO/assets/dist/img/social-icons/social-icon-linkedin.svg` |
| `ref-027` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/ResourcePackages/FAO/assets/dist/img/social-icons/social-icon-pinterest.svg` |
| `ref-028` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/ResourcePackages/FAO/assets/dist/img/social-icons/social-icon-twitter-x.svg` |
| `ref-029` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/ResourcePackages/FAO/assets/dist/img/social-icons/social-icon-weibo.svg` |
| `ref-030` | `official_metadata_endpoint_candidate` | `javascript_reference` | `false` | `false` | `https://www.fao.org/ResourcePackages/FAO/assets/dist/js/responsive-patch.js` |
| `ref-031` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/ResourcePackages/FAO/assets/dist/js/utility.min.js?v=1.4` |
| `ref-032` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/ScriptResource.axd?d=6DQe8ARl7A9TiuWej5ttCsl0UxczkFZDbeL5SW9kKwZezKThjMd6CKk80af9FalSKa-iav7TTDncR2lY8pDjm3GfAJE4PtQDLQKTHvlXubFpiBl5L2i8chWLcfOXJghIDWVmV7HDcMgBha1sHF1HkvsG2gh96v6WMgcTICorlXSyCWKJ...` |
| `ref-033` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/ScriptResource.axd?d=74FHISOx3fOPKwLxL0RMYh70ezZ-ORxFxHKxtz0UOPg9EUQxTPN8-UKE4lkI6c_x7Y5_KWlWwAWxLFKVT-LYvCs8ogtaZX_8Ldu_Ha6fqNvKUYz-iwsAD98noLncrVt8xXRvxvQvI8C6OeG6ayptPlJ8Jhe1U-cIG8z7urOA6SjD5WDd...` |
| `ref-034` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/WebResource.axd?d=NjxTqR2bqTw1rewxxlkHPoBB5CDatGYzZ3CWgf1FPNEBuDUZPbAL6EI4dDKbkSdIDdnRDsMyEI1n0bYSuQyPjOMXCNtK20UMe0VarzrEJK3kSl-dB6u-nSg0V62BML_GKgsoVZeWfO-Bb3BI27iNMkTOw9HcDWBzxMNlHZ9B2lK0g7tyFX7...` |
| `ref-035` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/about/org-chart/en/` |
| `ref-036` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/about/who-we-are/worldwide-offices/en` |
| `ref-037` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/africa/en/` |
| `ref-038` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/aid-monitor/en/` |
| `ref-039` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/americas/en/` |
| `ref-040` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/asiapacific/en/` |
| `ref-041` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/audit-and-investigations/reporting-misconduct/en` |
| `ref-042` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/ar` |
| `ref-043` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/en` |
| `ref-044` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/es` |
| `ref-045` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/fr` |
| `ref-046` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/ru` |
| `ref-047` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/ar` |
| `ref-048` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en` |
| `ref-049` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/` |
| `ref-050` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/#` |
| `ref-051` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/#collapseSearchBox` |
| `ref-052` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/, initializeEventListeners);</script><input data-sf-role=` |
| `ref-053` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/></em></a> <a data-bs-toggle=` |
| `ref-054` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/><a data-sf-ec-immutable=` |
| `ref-055` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/><input data-sf-role=` |
| `ref-056` | `manual_review_required` | `reference` | `false` | `true` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/><p>As stated in Article 1 of its Constitution, the Food and Agriculture Organization of the United Nations (“FAO”) “shall collect, analyse, interpret, and disse...` |
| `ref-057` | `official_download_endpoint_candidate_unfetched` | `download_candidate_unfetched` | `false` | `true` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/><strong>Terms and Conditions regarding the Reuse of Web content</strong></a> are incorporated verbatim herein. When you access, download, extract, adapt, or oth...` |
| `ref-058` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/>AIDmonitor</a><strong>&nbsp;</strong>–&nbsp;Overseas development assistance (ODA) and climate-related development finance databases</li><li><a data-sf-ec-immuta...` |
| `ref-059` | `official_download_endpoint_candidate_unfetched` | `download_candidate_unfetched` | `false` | `true` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/>Creative Commons Attribution-4.0 International licence</a></strong> (CC BY 4.0) available here as complemented by the Terms of Use outlined below. In other word...` |
| `ref-060` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/>Data protection and privacy</a>        </li>        <li class=` |
| `ref-061` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/>FAO Statistical Database Terms of Use</h2></div></div><div >    <div class=` |
| `ref-062` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/>Fisheries and Aquaculture (FishStat)</a></li><li><a data-sf-ec-immutable=` |
| `ref-063` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/>Food Price Monitoring and Analysis (FPMA) Tool </a></li><li><a data-sf-ec-immutable=` |
| `ref-064` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/>Global Animal Disease Information System (EMPRES-i +)</a></li><li><a data-sf-ec-immutable=` |
| `ref-065` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/>Global Individual Food Consumption&nbsp;(FAO/WHO GIFT)</a><strong>&nbsp;</strong>–&nbsp;Aggregated data and indicators only, not microdata</li><li><a data-sf-ec...` |
| `ref-066` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/>Hand-in-Hand (HiH) Geospatial Platform</a></li><li><a data-sf-ec-immutable=` |
| `ref-067` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/>Statistical Database Terms of Use</li>    </ol></nav><div class=` |
| `ref-068` | `official_download_endpoint_candidate_unfetched` | `download_candidate_unfetched` | `false` | `true` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/>Terms and Conditions regarding the Reuse of Web content</a></strong>, which are incorporated herein by reference.</p><h2>LICENCES</h2><p>FAO encourages you to u...` |
| `ref-069` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/>window.dataLayer = window.dataLayer \|\| [];window.dataLayer.push({ ` |
| `ref-070` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/Statistical Database Terms of Use` |
| `ref-071` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/Statistical Database Terms of Use  \| FAO \| Food and Agriculture Organization of the United Nations` |
| `ref-072` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/data-bs-dismiss=` |
| `ref-073` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/data-bs-target=` |
| `ref-074` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/data-bs-theme` |
| `ref-075` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/data-bs-toggle=` |
| `ref-076` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/data-displaymode=` |
| `ref-077` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/data-keyboard=` |
| `ref-078` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/data-page-edit-prevent=` |
| `ref-079` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/data-placeholder-label=` |
| `ref-080` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/data-resultsUrl=` |
| `ref-081` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/data-sf-culture=` |
| `ref-082` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/data-sf-ec-immutable=` |
| `ref-083` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/data-sf-element=` |
| `ref-084` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/dataLayer` |
| `ref-085` | `official_download_endpoint_candidate_unfetched` | `download_candidate_unfetched` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/footer-download col-md-5` |
| `ref-086` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/en/}        </script> <title>Statistical Database Terms of Use  \| FAO \| Food and Agriculture Organization of the United Nations</title> <script src=` |
| `ref-087` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/es` |
| `ref-088` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/fr` |
| `ref-089` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/ru` |
| `ref-090` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/db-terms-of-use/zh` |
| `ref-091` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/en` |
| `ref-092` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/terms/en/` |
| `ref-093` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/contact-us/zh` |
| `ref-094` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/dad-is/data/en/` |
| `ref-095` | `manual_review_required` | `reference` | `false` | `true` | `https://www.fao.org/docs/corporatelibraries/default-document-library/favicon/favicon.ico` |
| `ref-096` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/employment/home/en/` |
| `ref-097` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/europe/en/` |
| `ref-098` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://www.fao.org/faostat/en/#home` |
| `ref-099` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/fishery/en/fishstat` |
| `ref-100` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/giews/food-prices/tool/public/` |
| `ref-101` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/gift-individual-food-consumption/en` |
| `ref-102` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/hih-geospatial-platform/en` |
| `ref-103` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/home/search/en/` |
| `ref-104` | `manual_review_required` | `reference` | `false` | `true` | `https://www.fao.org/images/corporatelibraries/logos/fao-logo-en.svg?sfvrsn=f64522b4_36` |
| `ref-105` | `manual_review_required` | `reference` | `false` | `true` | `https://www.fao.org/images/corporatelibraries/social-icons/bluesky.svg?sfvrsn=91618a92_1` |
| `ref-106` | `manual_review_required` | `reference` | `false` | `true` | `https://www.fao.org/images/corporatelibraries/social-icons/social-icon-facebook.svg?sfvrsn=b87ff153_3` |
| `ref-107` | `manual_review_required` | `reference` | `false` | `true` | `https://www.fao.org/images/corporatelibraries/social-icons/social-icon-instagram.svg?sfvrsn=a778452f_3` |
| `ref-108` | `manual_review_required` | `reference` | `false` | `true` | `https://www.fao.org/images/corporatelibraries/social-icons/social-icon-linkedin.svg?sfvrsn=1025492c_3` |
| `ref-109` | `manual_review_required` | `reference` | `false` | `true` | `https://www.fao.org/images/corporatelibraries/social-icons/social-icon-soundcloud.svg?sfvrsn=26e63892_3` |
| `ref-110` | `manual_review_required` | `reference` | `false` | `true` | `https://www.fao.org/images/corporatelibraries/social-icons/social-icon-tiktok.svg?sfvrsn=b2228fd0_3` |
| `ref-111` | `manual_review_required` | `reference` | `false` | `true` | `https://www.fao.org/images/corporatelibraries/social-icons/social-icon-tuotiao.svg?sfvrsn=1883ae3_3` |
| `ref-112` | `manual_review_required` | `reference` | `false` | `true` | `https://www.fao.org/images/corporatelibraries/social-icons/social-icon-twitter.svg?sfvrsn=c68bb7c2_4` |
| `ref-113` | `manual_review_required` | `reference` | `false` | `true` | `https://www.fao.org/images/corporatelibraries/social-icons/social-icon-wechat.svg` |
| `ref-114` | `manual_review_required` | `reference` | `false` | `true` | `https://www.fao.org/images/corporatelibraries/social-icons/social-icon-wechat.svg?sfvrsn=cd28c1ee_3` |
| `ref-115` | `manual_review_required` | `reference` | `false` | `true` | `https://www.fao.org/images/corporatelibraries/social-icons/social-icon-weibo.svg?sfvrsn=7b5b0403_3` |
| `ref-116` | `manual_review_required` | `reference` | `false` | `true` | `https://www.fao.org/images/corporatelibraries/social-icons/social-icon-youtube.svg?sfvrsn=94de1814_3` |
| `ref-117` | `manual_review_required` | `reference` | `false` | `true` | `https://www.fao.org/images/corporatelibraries/social-icons/wechat_qr.jpg` |
| `ref-118` | `manual_review_required` | `reference` | `false` | `true` | `https://www.fao.org/images/corporatelibraries/social-icons/whatsapp-icon.svg?sfvrsn=6cfc5647_1` |
| `ref-119` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/infoods/infoods/tables-and-databases/faoinfoods-databases/en/` |
| `ref-120` | `manual_review_required` | `reference` | `false` | `true` | `https://www.fao.org/media/images/corporatenavigationlibraries/default-album/uf21gr5-fao80-1_blue.svg?sfvrsn=c6153fd4_3` |
| `ref-121` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/neareast/en/` |
| `ref-122` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/nr/water/aquastat/data/query/index.html?lang=en` |
| `ref-123` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/transparency/en` |
| `ref-124` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/unfao/procurement/en` |
| `ref-125` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/wiews/data/domains/monitoring-framework/en/` |
| `ref-127` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://www.fao.org/faostat/en/>        window.dataLayer = window.dataLayer \|\| [];        window.dataLayer.push({        ` |
| `ref-128` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://www.fao.org/faostat/en/>    <script data-main=` |
| `ref-129` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://www.fao.org/faostat/en/></script><!-- FAOSTAT -->    <!-- Google Tag Manager -->    <script>(function(w,d,s,l,i){w[l]=w[l]\|\|[];w[l].push({` |
| `ref-130` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://www.fao.org/faostat/en/FAOSTAT provides free access to food and agriculture data for over 245 countries and territories and covers all FAO regional groupings from 1961 to the most recent year available.` |
| `ref-131` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://www.fao.org/faostat/en/dataLayer` |
| `ref-132` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://www.fao.org/faostat/en/dist/css/index.css` |
| `ref-133` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://www.fao.org/faostat/en/faostat.appcache` |
| `ref-134` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://www.fao.org/faostat/en/humans.txt` |
| `ref-135` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://www.fao.org/faostat/en/src/css/repo/bootstrap-table.min.css` |
| `ref-136` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://www.fao.org/faostat/en/src/css/repo/bootstrap.min.css` |
| `ref-137` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://www.fao.org/faostat/en/src/css/repo/dataTables.bootstrap.min.css` |
| `ref-138` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://www.fao.org/faostat/en/src/css/repo/fixedColumns.bootstrap.min.css` |
| `ref-139` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://www.fao.org/faostat/en/src/css/repo/introjs.min.css` |
| `ref-140` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://www.fao.org/faostat/en/src/css/repo/ion.rangeSlider.css` |
| `ref-141` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://www.fao.org/faostat/en/src/css/repo/ion.rangeSlider.skinHTML5.css` |
| `ref-142` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://www.fao.org/faostat/en/src/css/repo/jbPivot.css` |
| `ref-143` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://www.fao.org/faostat/en/src/css/repo/jquery-ui.custom.min.css` |
| `ref-144` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://www.fao.org/faostat/en/src/css/repo/jstree.style.min.css` |
| `ref-145` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://www.fao.org/faostat/en/src/css/repo/leaflet.css` |
| `ref-146` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://www.fao.org/faostat/en/src/css/repo/normalize.css` |
| `ref-147` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://www.fao.org/faostat/en/src/css/repo/nprogress.css` |
| `ref-148` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://www.fao.org/faostat/en/src/css/repo/outdatedbrowser.min.css` |
| `ref-149` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://www.fao.org/faostat/en/src/css/repo/select2.css` |
| `ref-150` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://www.fao.org/faostat/en/src/css/repo/swiper.min.css` |
| `ref-151` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://www.fao.org/faostat/en/src/css/repo/toastr.min.css` |
| `ref-152` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://www.fao.org/faostat/en/src/css/repo/waves.min.css` |
| `ref-153` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://www.fao.org/faostat/en/src/images/logo/FAO-logo.svg` |
| `ref-154` | `official_metadata_endpoint_candidate` | `javascript_reference` | `false` | `false` | `https://www.fao.org/faostat/en/src/js/lib/repo/require.min.js` |
| `ref-155` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://www.fao.org/faostat/en/submodules/fenix-ui-map/dist/fenix-ui-map.min.css` |
| `ref-159` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://dataexplorer.fao.org/(Re)inicialización exitosa de dataflows relacionados en el espacio {label}:` |
| `ref-160` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://dataexplorer.fao.org/(Re-)index dataflow` |
| `ref-161` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://dataexplorer.fao.org/(Ré)initialisation réussie des dataflows associés dans l` |
| `ref-162` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://dataexplorer.fao.org/(Ré-)indexer le dataflow` |
| `ref-163` | `official_metadata_endpoint_candidate` | `api_or_metadata_candidate` | `false` | `false` | `https://dataexplorer.fao.org/. Los segmentos de fila representarán todas las combinaciones posibles de los otros elementos de dimensión seleccionados (con una limitación de 5 segmentos como máximo). Reduzca la selecci...` |
| `ref-164` | `official_metadata_endpoint_candidate` | `api_or_metadata_candidate` | `false` | `false` | `https://dataexplorer.fao.org/. {Br} {br} \u003cb\u003e ¿Quería un gráfico de filas apiladas porcentuales? \u003c/b\u003e {br} Utilice la opción de personalización ` |
| `ref-165` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://dataexplorer.fao.org/.Stat Data Explorer` |
| `ref-166` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://dataexplorer.fao.org/.Stat Data Explorer • {dataflowName}` |
| `ref-167` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://dataexplorer.fao.org/.Stat Data Viewer` |
| `ref-168` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://dataexplorer.fao.org/.Stat 数据资源管理器 • {dataflowName}` |
| `ref-169` | `official_metadata_endpoint_candidate` | `api_or_metadata_candidate` | `false` | `false` | `https://dataexplorer.fao.org/? \u003c/b\u003e {br} Los gráficos de filas apiladas necesitan datos que cubran al menos 2 puntos de datos. Verifique y aumente los elementos de dimensión seleccionados actualmente. {Br} {...` |
| `ref-170` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://dataexplorer.fao.org/?\u003c/b\u003e{br}Make sure to have a selection that includes at least 1 data point. You can check data availability using the ` |
| `ref-171` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://dataexplorer.fao.org/A timeline chart cannot be shown because the data has no time dimension.` |
| `ref-172` | `official_metadata_endpoint_candidate` | `api_or_metadata_candidate` | `false` | `false` | `https://dataexplorer.fao.org/API SDMX. Réduisez la sélection de filtres pour générer une requête de données SDMX valide.` |
| `ref-173` | `official_metadata_endpoint_candidate` | `api_or_metadata_candidate` | `false` | `false` | `https://dataexplorer.fao.org/API documentation` |
| `ref-174` | `official_metadata_endpoint_candidate` | `api_or_metadata_candidate` | `false` | `false` | `https://dataexplorer.fao.org/API pour développeur` |
| `ref-175` | `official_metadata_endpoint_candidate` | `api_or_metadata_candidate` | `false` | `false` | `https://dataexplorer.fao.org/API разработчика` |
| `ref-176` | `official_metadata_endpoint_candidate` | `api_or_metadata_candidate` | `false` | `false` | `https://dataexplorer.fao.org/API 文档` |
| `ref-177` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://dataexplorer.fao.org/Accueil – .Stat Data Explorer - Logo` |
| `ref-178` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://dataexplorer.fao.org/Activar dataflow` |
| `ref-179` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://dataexplorer.fao.org/Activate dataflow` |
| `ref-180` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://dataexplorer.fao.org/Activer le dataflow` |
| `ref-181` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://dataexplorer.fao.org/Add ref. metadata link` |
| `ref-182` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://dataexplorer.fao.org/Advertencia(s) para la (re)inicialización de dataflows relacionados en el espacio {label}:` |
| `ref-183` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://dataexplorer.fao.org/Allow for a later emergency restoration of the current live data` |
| `ref-184` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://dataexplorer.fao.org/Allows adding new embargoed and non-embargoed data (Note: In .Stat Suite this permission currently also allows updating existing embargoed and non-embargoed data.)` |
| `ref-185` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://dataexplorer.fao.org/Allows deleting embargoed and non-embargoed data` |
| `ref-186` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://dataexplorer.fao.org/Allows retrieving embargoed data` |
| `ref-187` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://dataexplorer.fao.org/Allows retrieving non-embargoed data` |
| `ref-188` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://dataexplorer.fao.org/Allows technically plugging the dataflow to the underlying data and/or ref. metadata, e.g. when already uploaded data or metadata is not accessible.` |
| `ref-189` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://dataexplorer.fao.org/Allows updating existing embargoed and non-embargoed data (Note: In .Stat Suite this permission is currently ineffective.)` |
| `ref-190` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://dataexplorer.fao.org/As well as in these data...` |
| `ref-191` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://dataexplorer.fao.org/Avertissement(s) pour la (ré)initialisation des dataflows associés dans l` |
| `ref-192` | `official_metadata_endpoint_candidate` | `api_or_metadata_candidate` | `false` | `false` | `https://dataexplorer.fao.org/Barras apiladas` |
| `ref-193` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://dataexplorer.fao.org/Both data and referential metadata` |
| `ref-194` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://dataexplorer.fao.org/Both data and referential metadata (CSV)` |
| `ref-195` | `official_download_endpoint_candidate_unfetched` | `download_candidate_unfetched` | `false` | `false` | `https://dataexplorer.fao.org/Bulk selection` |
| `ref-196` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://dataexplorer.fao.org/Cher utilisateur de Data Explorer, avant de récupérer votre(vos) visualisation(s), veuillez confirmer votre email en cliquant sur le bouton ci-dessous.` |
| `ref-197` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://dataexplorer.fao.org/Cher utilisateur de Data-Explorer, merci d` |
| `ref-198` | `official_download_endpoint_candidate_unfetched` | `download_candidate_unfetched` | `false` | `false` | `https://dataexplorer.fao.org/Consider checking your browser settings regarding multiple files download and destination folder, in order to avoid multiple validation popup windows` |
| `ref-199` | `official_metadata_endpoint_candidate` | `api_or_metadata_candidate` | `false` | `false` | `https://dataexplorer.fao.org/Consultas API` |
| `ref-200` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://dataexplorer.fao.org/Data Characteristics` |
| `ref-201` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://dataexplorer.fao.org/Data Lifecycle Manager` |
| `ref-205` | `manual_review_required` | `reference` | `false` | `false` | `https://www.fao.org/ResourcePackages/FAO/assets/dist/js/,        /**         * GLOBAL scope for iframes.         * Iframes can originate from:         *   - Content Block > Embed Media  (inside data-sf-ec-immutable)  ...` |
| `ref-207` | `official_metadata_endpoint_candidate` | `page_or_app_reference` | `false` | `false` | `https://www.fao.org/faostat/en/src/js/lib/repo/);d+=b\|\|(/^data\:\|\?/.test(d)\|\|c?` |

## Data status
- no values parsed
- no final evidence card
- no production rows
- no promotion
- no release regeneration
- candidate-only diagnostics
- no OWID/Fishcount use
- no inferred missing values
- no move to India

## Validation

Commands run:

```bash
python3 -m py_compile scripts/discover_official_fao_access_paths.py
python3 scripts/discover_official_fao_access_paths.py 2>&1 | tee official-fao-access-path-discovery.log
python3 -m json.tool official-fao-access-path-discovery.json > /tmp/official-fao-access-path-discovery.pretty.json
python3 - <<'PY' | tee official-fao-access-path-discovery-guard.log
# guard from ChatGPT instruction
PY
```

Discovery script output:

```text
wrote official-fao-access-path-discovery.csv
wrote official-fao-access-path-discovery.json
wrote official-fao-access-path-discovery.md
wrote official-fao-access-path-discovery-snippets.txt
rows: 207
recommended_status: {'official_page_only': 5, 'manual_review_required': 118, 'official_metadata_endpoint_candidate': 76, 'official_download_endpoint_candidate_unfetched': 6, 'blocked_unreachable': 2}
```

Guard output:

```text
rows: 207
recommended_status: {'official_page_only': 5, 'manual_review_required': 118, 'official_metadata_endpoint_candidate': 76, 'official_download_endpoint_candidate_unfetched': 6, 'blocked_unreachable': 2}
endpoint_type: {'fetched_seed_resource': 9, 'reference': 118, 'page_or_app_reference': 62, 'javascript_reference': 2, 'download_candidate_unfetched': 6, 'api_or_metadata_candidate': 10}
supports_qcl: {'false': 206, 'true': 1}
supports_rp: {'true': 24, 'false': 183}
Official FAO access-path discovery guard passed
```

Implementation note: the exact script failed once under local Python 3.14 when `urllib.parse.urljoin` rejected an invalid URL-like string extracted from official JS/text. Codex applied a minimal `extract_refs` guard that skips invalid URL-like fragments. The source scope and fetch rules were unchanged.

## Next question for ChatGPT
Given these official FAO access-path candidates, should Codex next:
1. fetch one small official metadata endpoint,
2. fetch one official download candidate as a source snapshot,
3. keep FAO blocked pending manual URL discovery,
4. stop with Brazil candidate-only WDI + metadata evidence,
5. or request a user/manual browser download from FAOSTAT?
