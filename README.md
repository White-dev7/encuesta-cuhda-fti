# Encuesta CUHDA-FTI v2.2

Cuestionario sobre uso de herramientas digitales docentes, presencia docente y aprendizaje percibido.
Estudio de la **Licenciatura en Mercadeo Estratégico**, Facultad de Ciencias Económicas, Universidad Dr. Andrés Bello,
dirigido a estudiantes de la Facultad de Tecnología e Innovación (FTI). Ciclo 2025–2026.

Es una página web estática: no necesita servidor propio. Se publica gratis en **GitHub Pages**
y las respuestas llegan a una **hoja de Google Sheets** suya.

```
index.html              página de la encuesta
dashboard.html          dashboard de resultados para el equipo investigador (con clave)
css/                    diseño de la encuesta y del dashboard
js/config.js            ← lo único que necesita editar (URL de Google, imágenes, contacto)
js/preguntas.js         banco de preguntas (32 ítems de la matriz)
js/app.js               funcionamiento de la encuesta
js/dashboard.js         dashboard; js/estadistica.js cálculos; js/ejemplo.js datos simulados
js/compartir.js         ventana Compartir: QR, enlace, redes sociales y afiche
js/creditos.js          créditos del equipo y aviso de privacidad
js/iconos.js            iconos (Lucide, licencia ISC; marcas de Simple Icons, CC0)
js/vendor/qrcode.js     generador de QR (qrcode-generator, licencia MIT)
img/                    logo y fotos de la universidad (ver img/LEAME.txt)
apps-script/Codigo.gs   receptor de respuestas para Google Sheets
tests/                  pruebas automáticas de calidad
docs/QA.md              plan de pruebas, lista de verificación y resultados
```

## 1. Conectar Google Sheets (10 minutos)

1. Cree una hoja nueva en Google Sheets, por ejemplo «CUHDA-FTI respuestas».
2. Vaya a **Extensiones → Apps Script**, borre lo que haya y pegue `apps-script/Codigo.gs`. Guarde.
3. En el menú de funciones elija **configurar** y pulse **Ejecutar**. Acepte los permisos.
   Se crean tres pestañas: **Respuestas**, **Diccionario** (todas las variables con su codificación) y **Rechazados**.
4. **Implementar → Nueva implementación → Aplicación web**.
   «Ejecutar como»: **Yo**. «Quién tiene acceso»: **Cualquier persona**. Copie la URL que termina en `/exec`.
5. Pegue esa URL en `js/config.js`, en `endpoint: ''`.

> Si cambia el código de Apps Script, use **Implementar → Gestionar implementaciones → Editar → Nueva versión**
> para conservar la misma URL.

## 2. Publicar en GitHub Pages (5 minutos)

1. Cree un repositorio en GitHub (por ejemplo `encuesta-cuhda-fti`) y suba todo el contenido de esta carpeta.
2. **Settings → Pages → Deploy from a branch → main / (root) → Save**.
3. En uno o dos minutos la encuesta queda en `https://SU-USUARIO.github.io/encuesta-cuhda-fti/`.

Para que el enlace se vea con foto al compartirlo por WhatsApp, cambie en `index.html` la línea
`og:image` por la dirección completa, por ejemplo `https://SU-USUARIO.github.io/encuesta-cuhda-fti/img/portada.jpg`.

## 3. Dashboard de resultados

Abra `https://SU-USUARIO.github.io/encuesta-cuhda-fti/dashboard.html`.

1. En Apps Script ejecute la función **verClaveDashboard** y copie la clave que aparece en el registro de ejecución.
2. Escríbala en el dashboard. Se recuerda solo mientras la pestaña esté abierta; el botón **Salir** la borra.
3. Sin la clave nadie puede leer los datos, aunque conozca la dirección. Si la clave se filtra, ejecute
   **cambiarClaveDashboard**.

El dashboard se actualiza solo cada 5 minutos y muestra: embudo de participación, puntaje medio de las tres
dimensiones con intervalo de confianza y alfa de Cronbach, relación entre presencia docente y aprendizaje
(correlación de Pearson), distribución de cada ítem Likert, uso de herramientas H1–H6, perfil de la muestra
y alertas de calidad. Se puede filtrar por carrera, tipo de asignatura y año, y exportar a CSV.
Si la hoja no está conectada muestra **datos de ejemplo simulados**, claramente marcados.

## 4. Compartir y medir la difusión

Los botones **Equipo** y **Compartir** están en el encabezado de todas las pantallas de la encuesta y del dashboard, así que se pueden abrir en cualquier momento sin perder el avance. **Compartir** abre una ventana con:

- **Código QR** con el logo, descargable en PNG de 1200 × 1200 para afiches impresos y diapositivas.
- **Enlace** con botón Copiar.
- Botones para **WhatsApp, Facebook, LinkedIn, Telegram, X y correo**, con un mensaje de invitación ya escrito.
- **Afiche para redes** (PNG 1080 × 1350) con el QR, listo para Instagram, Facebook o estados de WhatsApp.

Cada enlace lleva parámetros de campaña (`utm_source`, `utm_medium`, `utm_campaign`). La encuesta guarda el canal
en la columna `canal` y el dashboard muestra **de dónde llegan las respuestas** (QR, WhatsApp, Facebook…).
Para que el QR y los enlaces apunten a la dirección definitiva, complete `urlPublica` en `js/config.js`
**antes** de imprimir afiches.

## 5. Prueba piloto

Comparta el enlace con `?piloto=1` al final (`.../encuesta-cuhda-fti/?piloto=1`).
Esas respuestas llegan con `piloto = 1` y puede filtrarlas o borrarlas antes de la aplicación real.

## 6. Control de calidad

Cada vez que suba cambios a GitHub, la pestaña **Actions** ejecuta las pruebas automáticas
en escritorio y en móvil, y guarda un reporte descargable. Para correrlas en su computadora:

```
npm install
npx playwright install chromium
npm test
npm run reporte
```

El detalle de qué se prueba y los resultados están en `docs/QA.md`.

## Créditos, contacto y aprobación ética

En `js/config.js`, bloque `equipo`, están los nombres, cargos y funciones que aparecen en la ventana
**Créditos y equipo de investigación** (encuesta y dashboard). Ahí mismo complete `contacto` (correo del equipo)
y `aprobacionEtica` (código de aprobación), que aparecen en la bienvenida y en el aviso de privacidad.

## Datos que se guardan

Una fila por persona, con la codificación de la matriz (Likert 1–5, «No aplica» = 0, 1/0 por opción marcada),
los índices H1_H5_total, H6_total, F_total, D_total y A_total, y tres indicadores de calidad de la respuesta:
`CTRL1_valido` (control de atención), `flag_rapido` (respondió en menos de 2 minutos) y `flag_lineal`
(misma respuesta en todos los ítems Likert). La pestaña **Diccionario** describe cada columna.

No se guarda nombre, carné, correo ni dirección IP.
