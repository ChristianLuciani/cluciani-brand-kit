# Composición del Espirángulo por superficie y estado

> **Estado: propuesta** (issue #6). Ninguna fila con `estado: deriva` está
> decidida todavía. La ratificación es un acto explícito del operador en el PR
> —no la produce el merge por sí solo— y tiene superficie declarada en §6.
>
> **Fuente única:** `tools/logo/composition.json`; la guarda es
> `tools/logo/composition.test.mjs`. Este documento y el JSON se actualizan en
> el mismo PR — el test falla si divergen.
>
> **Cubre:** la composición declarada de los SVG áurea publicados y de los tres
> estados no derivables (loader final, loader reduced, mark de 42 px).
> **No cubre:** los SVG v10 (`base`), que son referencia comparativa; el render
> del sitio, que se mide en `cv-cluciani`; ni el tag/release, que sigue siendo
> decisión aparte. `as_of: 2026-11-02` · `sha: 622d958`.

## 1. La regla

**Un solo Espirángulo**: misma geometría, mismo acabado de la C (`cFinish`),
misma supernova. Lo que cambia entre superficies es el **tamaño** y el
**estado**, nunca la identidad del mark. Una transición que cambia de mark
(el salto full → mini) es la deriva que este documento cierra.

La deriva **no** es el acabado de la C: animación y assets comparten `cFinish`;
la diferencia visible es el halo, que en la animación respira entre 0.5 y 0.75.
El eje es la composición.

## 2. Artefactos publicados (composición derivada del SVG)

| id | artefacto | espiral | C | supernova | cielo | vértices | estado |
|---|---|---|---|---|---|---|---|
| `master-layers` | `assets/logo/logo-aurea-layers.svg` | sí | sí | sí | sí | 21 | coincide |
| `master-settled` | `assets/logo/logo-aurea-settled.svg` | sí | sí | sí | sí | 0 | coincide |
| `light-layers` | `assets/logo/logo-aurea-layers-light.svg` | sí | sí | sí | no | 21 | coincide |
| `light-settled` | `assets/logo/logo-aurea-settled-light.svg` | sí | sí | sí | no | 0 | coincide |
| `lockup-night` | `assets/logo/logo-aurea-lockup.svg` | sí | sí | sí | sí | 21 | coincide |
| `lockup-light` | `assets/logo/logo-aurea-lockup-light.svg` | sí | sí | sí | no | 21 | coincide |
| `favicon-transparent` | `assets/logo/favicon-aurea.svg` | no | sí | sí | no | 0 | excepción declarada |
| `favicon-teal` | `assets/logo/favicon-aurea-teal.svg` | no | sí | sí | no | 0 | excepción declarada |
| `favicon-teal-gold` | `assets/logo/favicon-aurea-teal-gold.svg` | no | sí | sí | no | 0 | excepción declarada |

**Vértices** = grupos `logo-star-*` menos la supernova (`logo-star-0`).
**Cielo** = grupo `logo-background` (ambiente + galaxia).

Los tres favicons son la **excepción declarada**: el icono es la C + supernova
×4 y se usa a **16/32 px y en SVG** — la variante `-teal` es la única publicada
a 16, la transparente y `-teal-gold` quedan en 32/SVG. No es una reducción del
mark: es un icono, y **no se usa a 42 px** (ahí corresponde el mark completo).

En light nada reemplaza al cielo: se omite el fondo y los halos de la
constelación, y los núcleos de B/C/A se omiten en ambas superficies (en night
los cubre la barra; en light se leían como manchas). La composición light es la
misma del par night, menos el cielo.

## 3. Estados no derivables de un SVG

| id | fuente | hoy | objetivo | estado |
|---|---|---|---|---|
| `loader-final` | `proposals/logo-triangulo-espiral/aurea7.html` | espiral + C + supernova + cielo; 22 grupos de estrella en el DOM, 21 disueltos al ser tocados | idéntico al `master-settled` | coincide |
| `loader-reduced` | mismo archivo, `prefers-reduced-motion` | espiral + C; **sin supernova y sin cielo** (0 `star`, 0 `ambient` en el DOM) | el settled estático: espiral + C + supernova + cielo, sin animación | **deriva** |
| `mark-42` | sitio (`cv-cluciani`), `.brand-mini` | C + supernova: sin espiral, sin cielo; el C ocupa ~91 % de la caja | reducción del settled, no un mark distinto (42 px > el mínimo declarado de 24 px) | **deriva** |

El `mark-42` no se mide en este repo: `cv-cluciani` no está disponible en esta
máquina. Se usa `favicon-aurea.svg` como artefacto canónico del mini (mismos
conteos que `.brand-mini` según el issue #6) y se declara la premisa.

## 4. Las cinco preguntas abiertas, con recomendación

1. **¿Vértices disueltos o visibles en el loader?** Disueltos. El loader
   *termina* en el estado final; si los vértices sobrevivieran, el estado final
   del loader no sería el mark persistente. Consecuencia: `loader-final` queda
   igual al settled (hoy ya lo es).
2. **¿El mark de 42 px es el mini o una reducción del settled?** Una reducción
   del settled. A 42 px el mark completo se lee (el mínimo declarado es 24 px) y
   el mini es otro mark: medido localmente, difiere en 22.9 % de los píxeles a
   42 px y 30.9 % a 16 px (§7). Consecuencia: el sitio reemplaza `.brand-mini`
   por el settled escalado; el mini sobrevive como favicon de 16/32 px.
3. **¿El master lleva constelación completa o settled?** Completa. `layers` es
   el master de hero, og-image y print; `settled` es el **estado final** de la
   animación, no el master. Consecuencia: se conservan ambos, con roles
   distintos y declarados.
4. **¿Qué reemplaza al cielo en las variantes light?** Nada: el cielo se omite
   y el fondo lo da la superficie. La constelación light conserva los núcleos
   (salvo B/C/A, omitidos en ambas superficies) y pierde halos. Consecuencia:
   light es una reducción declarada, no una composición nueva.
5. **¿El estado reduced conserva la supernova?** Sí — y también el cielo. Pedir
   menos movimiento no es pedir otro mark. Consecuencia: el estado reducido pasa
   a ser el settled estático (ver §5).

## 5. Deltas que habilita la ratificación

- **`loader-reduced`** — la causa está en el código, no en el render:
  `proposals/logo-triangulo-espiral/aurea7.html:501` envuelve la constelación
  **y el cielo** en `if (!reduced)`. El arreglo es mover la construcción fuera
  del guard y dejar dentro sólo las animaciones. Medición del centro de la
  supernova (400, 414) con Chrome headless: reducido `(9, 29, 43)` vs vivo
  `(195, 142, 131)` (§7). Es la misma medición que reportó el issue #6; se
  reprodujo el 2026-11-02 sobre `622d958`.
- **`mark-42`** — vive en `cv-cluciani` (transición `.brand-mini` ↔ settled).
  Este PR **no** lo toca: fija la matriz y la guarda. El cambio del sitio es un
  PR aparte, con la comparación a 42 px y 16 px que el issue pide.
- **Favicon** — sin cambio: la excepción 16/32 px queda declarada, acotada y
  justificada por tamaño, no por comodidad.

## 6. Ratificación y guarda

**Ratificar no es mergear.** La matriz nace `estado: "propuesta"` y todas las
filas `ratificado: false`. El operador ratifica declarándolo en el PR; recién
entonces un commit del mismo PR flipea `estado` a `"ratificada"` y cada fila a
`ratificado: true`. Hasta ese acto, ninguna fila cerrada se lee como decidida.

La guarda exige coherencia en ambos sentidos: con `estado: "propuesta"` toda
fila debe estar en `false`; con `"ratificada"`, toda fila en `true`. No hay
tercera vía ni ratificación implícita.

```bash
./node_modules/.bin/vitest run tools/logo/composition.test.mjs   # guarda de la matriz
npm test                                                          # suite completa (incluye #7)
```

El test deriva la composición de cada SVG (no la cree del JSON), compara
**valor por valor** contra la tabla de §2, exige que ningún SVG áurea quede sin
fila (sólo los `-base` pueden quedar fuera), compara la tabla de §3 contra el
JSON y valida el vocabulario cerrado (`coincide` · `deriva` ·
`excepcion-declarada`). La prosa `hoy`/`objetivo` de §3 vive **sólo** en este
documento: el JSON declara el estado, no la duplica, para que no exista una
segunda fuente que derive en silencio. Cambiar la composición de un asset sin
actualizar la matriz y este documento pone CI en rojo, a propósito.

## 7. Medición local (no corre en CI)

Los números de este documento que no salen de leer un SVG se midieron el
2026-11-02 sobre `622d958` con Chrome 156 headless:

- **DOM del loader**: `--dump-dom --virtual-time-budget=9000`, con y sin
  `--force-prefers-reduced-motion`. Conteo de `class="star"` / `class="ambient"`.
- **Supernova reduced**: render 800×800 del `aurea7.html` (stage de 620 px
  centrado en (90,90)); el centro del mark cae en (400, 414) del PNG. Píxel
  leído en ambos renders.
- **42/16 px**: cada SVG renderizado a tamaño exacto sobre fondo `#050810`,
  `--force-device-scale-factor=1`; comparación de píxeles con umbral
  `max(|ΔR|,|ΔG|,|ΔB|) > 8/255`. `settled` vs `favicon`: 22.9 % (42 px) y
  30.9 % (16 px).

No es una medición de CI (requiere Chrome): es reproducible a mano con esos
flags, y por eso se declara el procedimiento en vez de publicar el número solo.

## 8. Lo que este documento no decide

- No cambia geometría, assets ni la animación: la matriz se ratifica primero.
- No fija el release (tag/bump v1.0.2), que sigue pendiente del operador.
- No reemplaza la comparación visual a 42/16 px del sitio: la declara como
  criterio de aceptación del PR de `cv-cluciani`.

## 9. Fuentes

- Issue #6 y sus dos reconciliaciones (2026-10-27/28).
- PR #88 de `cv-cluciani` (`e9000f1`), composición del `.brand-mini`.
- `docs/logo.md` §6 (capas del SVG) y §7 (tamaños mínimos y favicon).
- Medición local del 2026-11-02 sobre `622d958` (§7).
