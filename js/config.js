/* ==========================================================
   CONFIGURACIÓN DE LA ENCUESTA — es el único archivo que necesita editar.
   ========================================================== */
window.CUHDA_CONFIG = {
  // URL de la aplicación web de Apps Script (termina en /exec).
  // Vacía = modo demostración: la encuesta funciona pero no envía nada.
  endpoint: '',

  version: 'CUHDA-FTI v2.2',
  ciclo: '2025–2026',

  // Quién realiza el estudio y a quién va dirigido.
  institucion: {
    universidad: 'Universidad Dr. Andrés Bello',
    carrera: 'Licenciatura en Mercadeo Estratégico',
    facultad: 'Facultad de Ciencias Económicas',
    poblacion: 'estudiantes de la Facultad de Tecnología e Innovación (FTI)'
  },

  // Enlace definitivo para compartir (QR, WhatsApp, afiche). Ejemplo:
  // 'https://su-usuario.github.io/encuesta-cuhda-fti/'. Vacío = se usa la dirección actual de la página.
  urlPublica: '',
  campana: 'cuhda-fti', // nombre de campaña en los enlaces (utm_campaign)

  // Respuestas completadas en menos segundos se marcan con flag_rapido = 1.
  minSegundos: 120,

  // Correo del equipo de investigación para dudas sobre el estudio (recomendado).
  contacto: '',

  // Código o número de aprobación del comité de ética / cátedra (opcional).
  // Si lo completa, aparece en la bienvenida y en los créditos.
  aprobacionEtica: '',

  // Imágenes propias de la universidad. Si un archivo no existe, la encuesta
  // usa una ilustración en su lugar.
  imagenes: {
    logo: 'img/logo.png',
    portada: 'img/portada.jpg', // foto de la bienvenida (opcional)
    cierre: 'img/cierre.jpg'    // foto de la pantalla final (opcional)
  },

  // Créditos que aparecen en «Equipo de investigación».
  equipo: {
    unidad: 'Universidad Dr. Andrés Bello · Facultad de Ciencias Económicas · Licenciatura en Mercadeo Estratégico',
    asesor: {
      etiqueta: 'Docencia y asesoría metodológica',
      nombre: 'Alex Omar Pocasangre Monges',
      cargo: 'Docente Asesor y Revisor Metodológico · Cátedra de Investigación',
      funciones: 'Supervisión académica, validación ética del instrumento conforme a estándares institucionales y dirección metodológica del proyecto de investigación.'
    },
    principal: {
      etiqueta: 'Investigación principal y desarrollo técnico',
      nombre: 'Jacqueline Noemy Monge Osorio',
      cargo: 'Investigadora Principal · Diseño del instrumento y desarrollo técnico',
      funciones: 'Diseño psicométrico del instrumento, plan de análisis de confiabilidad y validez, y desarrollo de la plataforma de encuesta y del tablero de resultados.'
    },
    coautoria: {
      etiqueta: 'Equipo de coautoría e investigación académica',
      funciones: 'Colaboración integral en el desarrollo del trabajo escrito, construcción del marco teórico, operacionalización de variables, recolección de la muestra en campo, análisis de resultados y redacción de conclusiones.',
      cargo: 'Coautora e Investigadora Académica',
      integrantes: [
        'Josselyn Vanessa Monge',
        'Karla Patricia Guevara',
        'Jennifer Claribel Rosales',
        'Gabriela Michelle Esquivel'
      ]
    }
  }
};
