# Plan y reporte de control de calidad — CUHDA-FTI v2.2

## 1. Alcance

| Componente | Qué se verifica |
|---|---|
| Banco de preguntas (`js/preguntas.js`) | Que coincida con la matriz: 32 ítems, mismo orden, mismas opciones y escalas |
| Encuesta (`index.html`, `js/app.js`) | Flujo, filtros de elegibilidad, validaciones, codificación de datos, envío, accesibilidad, diseño adaptable |
| Receptor (`apps-script/Codigo.gs`) | Validación del lado del servidor, duplicados, clave del dashboard |
| Dashboard (`dashboard.html`, `js/dashboard.js`, `js/estadistica.js`) | Cálculos estadísticos, filtros, acceso con clave, accesibilidad, diseño adaptable |

## 2. Pruebas automáticas

Se ejecutan con Playwright en dos dispositivos (Chrome de escritorio 1280 px y Pixel 7 móvil) en cada
`push` a GitHub (`.github/workflows/qa.yml`). Localmente: `npm test`.

### Encuesta (`tests/encuesta.spec.js`)

| # | Caso | Resultado esperado |
|---|---|---|
| E1 | Banco de preguntas vs. matriz | 32 IDs en el orden FIL1…A6; H1–H6 con 4/4/4/4/5/6 opciones; 18 ítems Likert |
| E2 | Respuesta completa | Se envía 1 fila con ≥ 90 columnas y la codificación correcta (Likert 1–5, 1/0 por opción, totales e indicadores) |
| E3 | FIL1 = No | Termina; fila con `completo = 0`, `motivo_fin = sin_consentimiento`, resto vacío |
| E4 | FIL2 = No | Termina con mensaje de no elegible; `motivo_fin = no_elegible` |
| E5 | Continuar sin responder | Muestra error y no avanza |
| E6 | Selección múltiple | «Ninguna» desmarca las demás; «Otra» exige texto; el texto se guarda en `H1_otra` |
| E7 | Botón Atrás | Conserva la respuesta anterior |
| E8 | Recargar la página | Ofrece «Continuar donde quedé» y retoma en la misma pregunta |
| E9 | Solo teclado | Letras/números eligen, Intro avanza, Tab recorre las opciones |
| E10 | D6 «No aplica» | Se guarda 0, `D6_no_aplica = 1` y no suma en `D_total` |
| E11 | Control de atención fallido | `CTRL1_valido = 0` |
| E12 | Modo piloto `?piloto=1` | Aviso visible y `piloto = 1` |
| E13 | Sin conexión al enviar | Respuesta guardada en el dispositivo y reenviada con «Reintentar» |
| E14 | Doble clic en Enviar | Una sola fila |
| E15 | Sin URL configurada | Modo demostración claramente indicado |
| E16 | Imágenes | Sin foto muestra la ilustración; con foto la muestra con texto alternativo |
| E17 | Accesibilidad | 0 infracciones WCAG 2.1 A/AA (axe-core) en las 7 pantallas tipo |
| E18 | Diseño adaptable | Sin desplazamiento horizontal a 360, 768 y 1280 px |
| E19 | Área táctil | Todas las opciones miden ≥ 44 px de alto |

### Créditos y privacidad (`tests/encuesta.spec.js`)

| # | Caso | Resultado esperado |
|---|---|---|
| C1 | Ventana de créditos | Muestra asesor, investigadora principal y las 4 coautoras; cita APA correcta; 0 infracciones de accesibilidad; se cierra con Esc y devuelve el foco |
| C2 | Aviso de privacidad | Se abre desde la bienvenida con el texto completo |
| C3 | Datos en el dispositivo | Al enviar, las respuestas se borran del navegador |
| C4 | Equipo y Compartir en cualquier momento | Los botones están en el encabezado de todas las pantallas; al cerrar la ventana se vuelve a la misma pregunta con su respuesta y los atajos de teclado no actúan mientras está abierta |

### Compartir, canal y servidor (`tests/encuesta.spec.js`)

| # | Caso | Resultado esperado |
|---|---|---|
| S1 | Ventana Compartir | QR dibujado; enlace con `utm_source=enlace` y `utm_campaign`; WhatsApp, Facebook y LinkedIn con su canal; Copiar confirma; 0 infracciones de accesibilidad |
| S2 | Imágenes descargables | QR PNG 1200 × 1200 y afiche PNG 1080 × 1350 |
| S3 | Canal de llegada | `?utm_source=WhatsApp` se guarda como `canal = whatsapp` |
| S4 | Canal malicioso | Caracteres no permitidos se eliminan antes de guardar |
| S5 | Pantalla final | Invita a compartir por WhatsApp |
| V1 | Validación del servidor | Acepta filas válidas; rechaza versión distinta, canal inválido, columnas desconocidas y valores fuera de rango |
| V2 | Contrato encuesta ↔ servidor | Una respuesta real de la encuesta usa solo columnas del diccionario y pasa la validación |

### Resultados al final, reporte y exportación

| # | Caso | Resultado esperado |
|---|---|---|
| R1 | Resultados con ≥ 10 respuestas | Compara «Usted» con el promedio en las 3 dimensiones, calcula la diferencia y muestra las 5 herramientas más usadas; accesible |
| R2 | Resultados con < 10 respuestas | No muestra promedios del grupo; indica cuántas respuestas faltan |
| R3 | Resumen no disponible | Muestra solo los puntajes personales, sin errores |
| R4 | Modo demostración | Vista de ejemplo marcada como tal |
| R5 | Sin consentimiento | No se muestran resultados |
| R6 | Resumen en Apps Script | Con < 10 no devuelve promedios; excluye piloto, control fallido y filas vacías; nunca incluye identificadores; D6 = 0 no cuenta |
| R7 | Omega de McDonald | 0,79352 con cargas iguales de 0,7; 0,74945 y cargas exactas en un modelo congenérico |
| R8 | Sintaxis SPSS | Etiquetas de variables y de valores, D6 = 0 como perdido, niveles de medida, termina en EXECUTE |
| R9 | Reporte ejecutivo | 7 hojas, hallazgos automáticos, créditos; accesible; sin desplazamiento horizontal a 360 y 1280 px |
| R10 | Reporte con hoja conectada | Sin clave pide entrar al dashboard; con clave usa los datos reales |
| R11 | Enlace corto | Aparece en Compartir cuando se configura |

### Dashboard (`tests/dashboard.spec.js`)

| # | Caso | Resultado esperado |
|---|---|---|
| D1 | Alfa de Cronbach | 0,96903 en un conjunto verificado a mano; usa solo casos completos |
| D2 | Correlación de Pearson | r = 1 y pendiente 2 en datos lineales; r = 0,82857 en datos de control; IC contiene r |
| D3 | Media, mediana, frecuencias, «No aplica» | Valores exactos |
| D4 | Datos de ejemplo | Aviso visible y las 6 secciones presentes, 17 filas Likert, nube de puntos dibujada |
| D5 | Filtros | Tipo de asignatura reduce la muestra; quitar el control de atención la amplía |
| D6 | Acceso con clave | Rechaza clave incorrecta; carga los datos con la correcta |
| D7 | Accesibilidad | 0 infracciones WCAG 2.1 A/AA |
| D8 | Diseño adaptable | Sin desplazamiento horizontal a 360, 768 y 1280 px |

## 3. Controles de calidad de los datos

En la encuesta:
- respuestas obligatorias, «Ninguna» excluyente, «Otra» con texto (máx. 160 caracteres);
- identificador aleatorio por respuesta (`id_respuesta`), sin datos personales ni IP;
- guardado automático del avance y cola de reenvío si falla la conexión;
- indicadores: `CTRL1_valido`, `flag_rapido` (menos de 120 s, configurable) y `flag_lineal`.

En Apps Script (servidor):
- valida versión del instrumento, nombres de columna permitidos, tipos y rangos (Likert 1–5, D6 0–5, S1–S6);
- rechaza lo inválido y lo registra en la pestaña **Rechazados**;
- descarta duplicados por `id_respuesta` y usa un bloqueo para envíos simultáneos;
- crea la pestaña **Diccionario** con cada variable, su pregunta y su codificación.

## 4. Lista de verificación manual antes de lanzar

- [ ] El equipo de investigación aprobó el texto de bienvenida (objetivo, anonimato, voluntariedad).
- [ ] Registro Académico confirmó el catálogo de carreras de S3.
- [ ] `endpoint` configurado en `js/config.js` y respuesta de prueba visible en la hoja.
- [ ] Clave del dashboard generada y guardada solo por el equipo.
- [ ] Logo y fotos autorizados por la universidad colocados en `img/`.
- [ ] Prueba piloto con 5–10 estudiantes usando `?piloto=1`; revisar tiempos y comentarios.
- [ ] Probado en al menos un Android y un iPhone reales, con datos móviles.
- [ ] Respuestas piloto filtradas o borradas antes de la aplicación real.
- [ ] `urlPublica` completada en `js/config.js` antes de descargar QR y afiches.
- [ ] QR impreso escaneado con un Android y un iPhone.
- [ ] Pestaña **Actions** de GitHub en verde.

## 5. Resultados de la última ejecución

Fecha: 21 de noviembre de 2026 · Playwright 1.49 · Chrome · axe-core 4.10

| Proyecto | Pruebas | Aprobadas | Fallidas |
|---|---|---|---|
| Escritorio (1280 px) | 60 | 60 | 0 |
| Móvil (Pixel 7) | 60 | 60 | 0 |
| **Total** | **120** | **120** | **0** |

Verificación adicional: el código QR del afiche (con el logo al centro) se decodificó correctamente con OpenCV
y abre el enlace con `utm_source=qr`.

Hallazgos corregidos durante el ciclo de QA:
- **Reporte (móvil):** las tablas anchas desbordaban la pantalla y la zona desplazable no era accesible por teclado;
  ahora cada hoja con tablas anchas se desplaza dentro de sí misma y recibe foco.
0. **Crítico (detectado en producción):** una prueba usaba la URL real de `config.js`, así que cada ejecución en GitHub Actions
   enviaba respuestas falsas a la hoja. Ahora todas las pruebas parten en modo demostración, las conexiones a Google están
   bloqueadas y cualquier intento hace fallar la prueba (`tests/base.js`). La suite se ejecutó con la URL real configurada
   y no hubo ningún intento de conexión.
1. **Función:** en la pantalla final, el botón de WhatsApp abría la encuesta en lugar de WhatsApp (detectado por la prueba S5).
2. **Accesibilidad:** en el celular, los botones del dashboard y el botón Compartir quedaban solo con icono y sin nombre
   accesible; se añadió `aria-label`.
3. **Diseño:** en el afiche, el pie de página se superponía al código QR; se recalculó el tamaño del QR.
4. **Diseño:** una clase de la ventana Compartir alteraba los títulos de sección del dashboard; se renombró.
5. **Accesibilidad:** zonas con desplazamiento sin acceso por teclado (encuesta y ventanas) y contrastes insuficientes
   del verde y de una etiqueta; corregidos.
6. **Privacidad:** las respuestas quedaban guardadas en el navegador después de enviar; ahora se borran.
7. **Pruebas:** las esperas por animaciones ignoran ahora las animaciones decorativas infinitas.

Pendiente de verificación manual: envío real a Google Sheets con su URL, escaneo del QR impreso con varios
celulares, lectores de pantalla (NVDA / VoiceOver) y dispositivos físicos (ver la lista de la sección 4).
