# Composición del Espirángulo por superficie y estado

> **Estado: propuesta** (issue #6). La ratifica el operador con el merge de este
> PR; hasta entonces ninguna fila con `estado: deriva` está decidida.
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

La deriva **no** es el acabado de la C: animación y assets comparten
`cFinish`; medido el 2026-10-27, el núcleo de la banda difiere 1.19 % entre el
render vivo y `logo-aurea-layers.svg` (0.60 % descontando bloom). El eje es la
composición.

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
**Cielo** = grupo `logo-background` (ambiente + galaxia). Los tres favicons
llevan la **excepción por tamaño**: por debajo de 24 px el mark completo no se
lee, y el icono es la C + supernova ×4 (el tile es el marco). No es una
reducción del mark: es un icono, y sólo aplica **< 24 px**.

En light nada reemplaza al cielo: se omite el fondo y los halos de la
constelación (los núcleos quedan), porque el fondo lo da la superficie. La
composición light es la misma del par night, menos el cielo.

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
   el mini es otro mark: medido, difiere en 22.9 % de los píxeles a 42 px y
   30.9 % a 16 px. Consecuencia: el sitio reemplaza `.brand-mini` por el settled
   escalado; el mini sobrevive sólo como favicon < 24 px.
3. **¿El master lleva constelación completa o settled?** Completa. `layers` es
   el master de hero, og-image y print; `settled` es el **estado final** de la
   animación, no el master. Consecuencia: se conservan ambos, con roles
   distintos y declarados.
4. **¿Qué reemplaza al cielo en las variantes light?** Nada: el cielo se omite
   y el fondo lo da la superficie. La constelación light conserva los núcleos y
   pierde halos (se leían como manchas). Consecuencia: light es una reducción
   declarada, no una composición nueva.
5. **¿El estado reduced conserva la supernova?** Sí — y también el cielo. Pedir
   menos movimiento no es pedir otro mark. Consecuencia: el estado reducido pasa
   a ser el settled estático (ver §5).

## 5. Deltas que habilita la ratificación

- **`loader-reduced`** — la causa está en el código, no en el render:
  `proposals/logo-triangulo-espiral/aurea7.html:501` envuelve la constelación
  **y el cielo** en `if (!reduced)`. El arreglo es mover la construcción fuera
  del guard y dejar dentro sólo las animaciones. Medición del centro de la
  supernova (400, 414) con Chrome headless: reducido `(9, 29, 43)` vs vivo
  `(195, 142, 131)`. Es la misma medición que reportó el issue #6; se reprodujo
  el 2026-11-02 sobre `622d958`.
- **`mark-42`** — vive en `cv-cluciani` (transición `.brand-mini` ↔ settled).
  Este PR **no** lo toca: fija la matriz y la guarda. El cambio del sitio es un
  PR aparte, con la comparación a 42 px y 16 px que el issue pide.
- **Favicon** — sin cambio: la excepción < 24 px queda declarada, acotada y
  justificada por tamaño, no por comodidad.

## 6. Cómo se guarda

```bash
./node_modules/.bin/vitest run tools/logo/composition.test.mjs   # guarda de la matriz
npm test                                                          # suite completa (incluye #7)
```

El test deriva la composición de cada SVG (no la cree del JSON), exige que
ningún SVG áurea quede sin fila, que cada artefacto aparezca en esta tabla y
que todo objetivo esté declarado con el vocabulario cerrado
(`coincide` · `deriva` · `excepcion-declarada`). Cambiar la composición de un
asset sin actualizar la matriz y este documento pone CI en rojo, a propósito.

## 7. Lo que este documento no decide

- No cambia geometría, assets ni la animación: la matriz se ratifica primero.
- No fija el release (tag/bump v1.0.2), que sigue pendiente del operador.
- No reemplaza la comparación visual a 42/16 px del sitio: la declara como
  criterio de aceptación del PR de `cv-cluciani`.

## 8. Fuentes

- Issue #6 y sus dos reconciliaciones (2026-10-27/28).
- PR #88 de `cv-cluciani` (`e9000f1`), composición del `.brand-mini`.
- `docs/logo.md` §6 (capas del SVG) y §7 (tamaños mínimos y favicon).
- Medición propia del 2026-11-02 sobre `622d958` (DOM + render headless).
