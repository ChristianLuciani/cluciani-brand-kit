# Composición del Espirángulo por superficie y estado

> **Estado: ratificada** por el operador el **2026-11-02** (sesión `59252d8f`;
> traza: [issue #6](https://github.com/ChristianLuciani/cluciani-brand-kit/issues/6#issuecomment-6589283153)).
> La decisión se tomó por pares A/B sobre render a tamaño real; cada fila
> `deriva` de §4 es trabajo de implementación pendiente, no una decisión abierta.
>
> **Fuente única:** `tools/logo/composition.json`; la guarda es
> `tools/logo/composition.test.mjs`. Este documento y el JSON se actualizan en
> el mismo PR — el test falla si divergen.
>
> **Cubre:** la composición de los SVG áurea publicados y de los tres estados no
> derivables (loader final, loader reduced, mark de 42 px).
> **No cubre:** los SVG v10 (`base`), que son referencia comparativa; el render
> del sitio, que se mide en `cv-cluciani`; ni el tag/release.
> `as_of: 2026-11-02` · `sha: 622d958` (base de la ratificación).

## 1. La regla

**Un solo Espirángulo**: misma geometría, mismo acabado de la C (`cFinish`),
misma supernova. Lo que cambia entre superficies es el **tamaño** y el
**estado**, nunca la identidad del mark.

La composición canónica es el **settled**: espiral + C + supernova + cielo,
sin constelación de vértices.

- **> 42 px** (master, lockups, hero, og-image, print): settled.
- **≤ 42 px** (mark persistente, favicon 16/32): **mini** — C + supernova.
  La transición settled → mini al minimizar es un **cambio declarado y
  aceptado**: no es una reducción del mismo mark, y no se "arregla".
- La **constelación de vértices** deja de publicarse en assets: vive sólo
  dentro de la animación, en su apertura, y se disuelve al ser tocada.

La deriva **no** es el acabado de la C: animación y assets comparten `cFinish`;
la diferencia visible es el halo, que en la animación respira entre 0.5 y 0.75.
El eje es la composición.

## 2. Artefactos publicados (composición derivada del SVG)

| id | artefacto | espiral | C | supernova | cielo | vértices | estado |
|---|---|---|---|---|---|---|---|
| `master-layers` | `assets/logo/logo-aurea-layers.svg` | sí | sí | sí | sí | 21 | deriva |
| `master-settled` | `assets/logo/logo-aurea-settled.svg` | sí | sí | sí | sí | 0 | coincide |
| `light-layers` | `assets/logo/logo-aurea-layers-light.svg` | sí | sí | sí | no | 21 | deriva |
| `light-settled` | `assets/logo/logo-aurea-settled-light.svg` | sí | sí | sí | no | 0 | coincide |
| `lockup-night` | `assets/logo/logo-aurea-lockup.svg` | sí | sí | sí | sí | 21 | deriva |
| `lockup-light` | `assets/logo/logo-aurea-lockup-light.svg` | sí | sí | sí | no | 21 | deriva |
| `favicon-transparent` | `assets/logo/favicon-aurea.svg` | no | sí | sí | no | 0 | excepción declarada |
| `favicon-teal` | `assets/logo/favicon-aurea-teal.svg` | no | sí | sí | no | 0 | excepción declarada |
| `favicon-teal-gold` | `assets/logo/favicon-aurea-teal-gold.svg` | no | sí | sí | no | 0 | excepción declarada |

La tabla muestra la composición **publicada hoy**; `estado` dice si coincide con
la matriz ratificada. **Vértices** = grupos `logo-star-*` menos la supernova
(`logo-star-0`). **Cielo** = grupo `logo-background` (ambiente + galaxia).

Los tres favicons son la **excepción declarada**: el icono es la C + supernova
×4, se usa a **16/32 px y en SVG** (la variante `-teal` es la única publicada a
16; la transparente y `-teal-gold` quedan en 32/SVG) y no se usa a 42 px.

En light nada reemplaza al cielo: se omite el fondo y los halos de la
constelación, y los núcleos de B/C/A se omiten en ambas superficies. La
composición light es la misma del par night, menos el cielo.

## 3. Estados no derivables de un SVG

| id | fuente | hoy | objetivo | estado |
|---|---|---|---|---|
| `loader-final` | `proposals/logo-triangulo-espiral/aurea7.html` | espiral + C + supernova + cielo; 22 grupos de estrella en el DOM, 21 disueltos al ser tocados | idéntico al `master-settled` | coincide |
| `loader-reduced` | mismo archivo, `prefers-reduced-motion` | espiral + C; **sin supernova y sin cielo** (0 `star`, 0 `ambient` en el DOM) | el settled estático: espiral + C + supernova + cielo, sin animación | **deriva** |
| `mark-42` | sitio (`cv-cluciani`), `.brand-mini` | C + supernova: sin espiral, sin cielo; el C ocupa ~91 % de la caja. Hoy el sitio lo dibuja a **36 px**; 42 era el tamaño cuando se abrió #6 | **el mini, tal como está**: el salto settled → mini es declarado y aceptado | coincide |

El `mark-42` no se mide en este repo: `cv-cluciani` no está disponible en esta
máquina. Se usa `favicon-aurea.svg` como artefacto canónico del mini (mismos
conteos que `.brand-mini` según el issue #6) y se declara la premisa.

## 4. Lo que queda por implementar

Las cinco decisiones están tomadas; lo que sigue es hacer que los assets las
cumplan. Nada de esto cambia la decisión.

- **`master-layers`, `lockup-night` y `lockup-light`** — hoy llevan 21 vértices;
  el master ratificado es el settled. Hay que regenerarlos sin constelación y
  **retirar `logo-aurea-layers.svg` como master** (retiro declarado; el borrado
  físico lo aprueba el operador aparte).
- **`light-layers`** — hoy lleva 21 vértices; la variante ratificada es
  `light-settled`.
- **`loader-reduced`** — la causa está en `aurea7.html:501`: la constelación y
  el cielo están dentro de `if (!reduced)`. El arreglo es mover la construcción
  fuera del guard y dejar dentro sólo las animaciones. Medición del centro de la
  supernova (400, 414) con Chrome headless: reducido `(9, 29, 43)` vs vivo
  `(195, 142, 131)` (§7).
- **`mark-42`** — sin cambio: el sitio ya usa el mini y así queda ratificado. El
  salto al minimizar es la transición declarada.

## 5. Por qué (el registro de la decisión)

Los cinco pares, con la opción elegida por el operador:

1. Mark de 42 px: **mini** (C + supernova), no el settled escalado.
2. Último cuadro de la animación: **settled** (queda el salto, declarado).
3. Master (hero, og-image, print): **settled**, sin constelación.
4. Light: **light settled**, sin cielo ni vértices.
5. `prefers-reduced-motion`: **settled estático**, conserva supernova y cielo.

La consecuencia de 2 + 3 + 4 es que la constelación deja de publicarse: era la
pieza que distinguía al master, y el operador eligió que viva sólo en la
animación. La consecuencia de 1 + 2 es que el mark persistente es otro mark que
el estado final: se acepta como transición declarada en vez de forzar una
reducción.

## 6. Ratificación y guarda

**Ratificar no es mergear.** La matriz ya está ratificada: el operador la
declaró el 2026-11-02 y la traza vive en el issue #6 (hogar durable de la
decisión). El JSON quedó en `estado: "ratificada"` y todas las filas en
`ratificado: true`.

La guarda exige coherencia: con `propuesta` toda fila debe estar en `false`;
con `ratificada`, toda fila en `true`. No hay ratificación implícita ni
término medio.

```bash
./node_modules/.bin/vitest run tools/logo/composition.test.mjs   # guarda de la matriz
npm test                                                          # suite completa (incluye #7)
```

El test deriva la composición de cada SVG (no la cree del JSON), compara
**valor por valor** contra la tabla de §2, exige que ningún SVG áurea quede sin
fila (sólo los `-base` pueden quedar fuera), compara la tabla de §3 contra el
JSON y valida el vocabulario cerrado (`coincide` · `deriva` ·
`excepcion-declarada`). La prosa `hoy`/`objetivo` de §3 vive **sólo** en este
documento: el JSON declara el estado, no la duplica.

## 7. Medición local (no corre en CI)

Los números que no salen de leer un SVG se midieron el 2026-11-02 sobre
`622d958` con Chrome 156 headless:

- **DOM del loader**: `--dump-dom --virtual-time-budget=9000`, con y sin
  `--force-prefers-reduced-motion`. Conteo de `class="star"` / `class="ambient"`.
- **Supernova reduced**: render 800×800 del `aurea7.html` (stage de 620 px
  centrado en (90,90)); el centro del mark cae en (400, 414) del PNG. Píxel
  leído en ambos renders.
- **42/16 px**: cada SVG renderizado a tamaño exacto sobre fondo `#050810`,
  `--force-device-scale-factor=1`; comparación de píxeles con umbral
  `max(|ΔR|,|ΔG|,|ΔB|) > 8/255`. `settled` vs `mini`: 22.9 % (42 px) y
  30.9 % (16 px).

No es una medición de CI (requiere Chrome): es reproducible a mano con esos
flags, y por eso se declara el procedimiento en vez de publicar el número solo.

## 8. Lo que este documento no decide

- No regenera assets ni toca la animación: declara la matriz y deja el trabajo
  de §4 como implementación pendiente.
- No fija el release (tag/bump v1.0.2).
- No borra `logo-aurea-layers.svg`: el retiro se declara, el borrado físico lo
  aprueba el operador.

## 9. Historia de la deriva (dónde se produjo)

Tres piezas legítimas, cada una con su fecha, y ninguna regla que dijera cuál
manda en cada superficie. No hay un commit que "rompa" el mark.

| fecha | pieza | dónde | qué dejó |
|---|---|---|---|
| 2026-09-09 | animación v16 (`ad38853`, sitio) | `aurea7.html` | `reduced` renderiza sólo espiral + C: el guard `if (!reduced)` ya deja afuera constelación y cielo. **Origen del estado reduced**, desde el primer día. |
| 2026-09-25 | logo oficial (`055f5c5`, PR #54, sitio) | `assets/brand/logo/` | nacen `layers` (21 vértices) y `settled` (0) como variantes del mismo mark, **sin regla de qué superficie usa cuál**. |
| 2026-09-28 | favicon (`d16cc4c`, sitio) | `favicon-aurea.svg` | el icono simplificado: C + supernova. Es un **icono**, no una reducción del mark. |
| 2026-10-23 | logo animado del sitio (`b0a50c2`, #56) | `index.html` + `logoAnim.js` | al minimizar, el mismo `#brand-logo` cambia `.brand-full` por `.brand-mini` (la composición del favicon) a **42 px**. **Acá el salto se vuelve visible**: un icono pasa a ocupar el lugar del mark. Hoy ese tamaño es 36 px. |
| 2026-10-22 | brand kit v1.0.0 (`6ccd725`) | este repo | importa los assets como espejo: hereda las tres composiciones y no hereda ninguna matriz. |
| 2026-10-27 | sync y guardas (#1, #4, #7) | este repo | se sincroniza el acabado de la C, entran los favicons teal y un gate que fija **conteos** de archivos — no composición. |
| 2026-10-28 | issue #6 | tracker | se nombra la deriva; queda frenada como decisión, no como tarea. |
| 2026-11-02 | decisión por pares | este PR | matriz ratificada; `layers`/`lockups`/`layers-light`/`reduced` quedan en deuda declarada. |

Lectura: la deriva tiene **dos orígenes distintos**. El estado `reduced` nació
incompleto en el diseño de la animación (2026-09-09). El salto settled → mini
nació cuando el sitio reutilizó el **icono** como mark persistente (2026-10-23).
El resto —`layers` vs `settled`— es una convivencia sin regla desde 2026-09-25.

## 10. Fuentes

- Issue #6 y su traza de decisión (2026-11-02).
- PR #88 de `cv-cluciani` (`e9000f1`), composición del `.brand-mini`.
- `docs/logo.md` §6 (capas del SVG) y §7 (tamaños mínimos y favicon).
- Medición local del 2026-11-02 sobre `622d958` (§7).
