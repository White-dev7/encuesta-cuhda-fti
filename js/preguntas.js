/* ==========================================================
   BANCO DE PREGUNTAS — CUHDA-FTI v2.2
   Fuente: Matriz de Preguntas por Dimensión e Instrumento (CUHDA-FTI v2.2).
   Codificación: opciones únicas = 1..n (o el código indicado),
   Likert = 1..5, "No aplica" = 0, selección múltiple = 1/0 por opción.
   ========================================================== */
(function () {
  const ESCALAS = {
    F: ['Nunca', 'Casi nunca', 'A veces', 'Casi siempre', 'Siempre'],
    A: ['Totalmente en desacuerdo', 'En desacuerdo', 'Ni de acuerdo ni en desacuerdo', 'De acuerdo', 'Totalmente de acuerdo']
  };

  const SECCIONES = [
    { key: 'inicio', nombre: 'Inicio' },
    { key: 'perfil', nombre: 'Perfil', titulo: 'Datos generales' },
    { key: 'herr', nombre: 'Herramientas', titulo: 'Herramientas digitales utilizadas',
      intro: 'Desde ahora, piense en una sola asignatura virtual',
      texto: 'Responda el resto del cuestionario pensando únicamente en la asignatura que eligió. Primero, marque las herramientas que su docente ha usado en ella.' },
    { key: 'frec', nombre: 'Frecuencia', titulo: 'Frecuencia de integración pedagógica',
      intro: '¿Con qué frecuencia ocurre?',
      texto: 'Ahora leerá cinco afirmaciones sobre cómo su docente integra las herramientas digitales. Indique con qué frecuencia sucede cada una.' },
    { key: 'pres', nombre: 'Presencia docente', titulo: 'Presencia docente',
      intro: '¿Qué tan de acuerdo está?',
      texto: 'Estas afirmaciones tratan sobre cómo su docente le orienta y acompaña usando herramientas digitales. Lea cada una con atención.' },
    { key: 'apr', nombre: 'Aprendizaje', titulo: 'Aprendizaje percibido',
      intro: 'Último bloque: su aprendizaje',
      texto: 'Para terminar, seis afirmaciones sobre lo que siente que ha aprendido en esta asignatura virtual.' }
  ];

  const L = (id, q, extra) => Object.assign({ id, sec: id[0] === 'F' ? 'frec' : id[0] === 'A' ? 'apr' : 'pres', t: 'lik', q,
    s: id[0] === 'F' ? 'F' : 'A' }, extra || {});
  const M = (id, q, o) => ({ id, sec: 'herr', t: 'multi', q, o });
  const S = (id, q, o, extra) => Object.assign({ id, sec: 'perfil', t: 'single', q, o }, extra || {});

  const ITEMS = [
    { id: 'FIL1', sec: 'inicio', t: 'single', stop: 0, q: 'Después de leer la información anterior, ¿acepta participar voluntariamente en esta encuesta?',
      o: [['Sí, acepto participar', 1], ['No acepto participar', 0]] },
    { id: 'FIL2', sec: 'inicio', t: 'single', stop: 0, q: '¿Cursa actualmente al menos una asignatura en modalidad virtual en la Facultad de Tecnología e Innovación (FTI)?',
      o: [['Sí', 1], ['No', 0]] },

    S('S1', '¿Cuál es su edad?', ['18 a 20 años', '21 a 23 años', '24 a 26 años', '27 años o más']),
    S('S2', '¿Con qué género se identifica?', ['Femenino', 'Masculino', 'Otro', 'Prefiero no decirlo']),
    // Catálogo FTI publicado en unab.edu.sv — validar contra Registro Académico antes de aplicar.
    S('S3', '¿Qué carrera de la Facultad de Tecnología e Innovación cursa actualmente?',
      ['Ingeniería en Sistemas y Computación', 'Ingeniería en Innovación Agroindustrial', 'Licenciatura en Computación Gerencial',
       'Licenciatura en Diseño Gráfico Multimedia', 'Técnico en Computación', 'Técnico en Diseño Gráfico'], { txt: true }),
    S('S4', '¿En qué año de su carrera se encuentra?', ['Primer año', 'Segundo año', 'Tercer año', 'Cuarto año', 'Quinto año o más']),
    S('S5', '¿Cuántas asignaturas en modalidad virtual cursa en el ciclo actual?', ['1', '2', '3', '4 o más']),
    S('S6', 'Para responder el resto del cuestionario, elija una sola asignatura virtual de la FTI: la de mayor carga horaria o la última clase a la que asistió. ¿Qué tipo de asignatura seleccionó?',
      ['Teórica o conceptual', 'Práctica, de laboratorio o taller', 'Teórico-práctica'], { txt: true, ancla: true }),

    M('H1', '¿Qué plataformas ha utilizado su docente para impartir las clases virtuales sincrónicas?',
      ['Zoom', 'Microsoft Teams', 'Google Meet', 'Videoconferencia integrada en el aula virtual']),
    M('H2', '¿Qué canales digitales ha utilizado su docente para comunicarse y dar seguimiento fuera de la sesión sincrónica?',
      ['Correo institucional', 'Foros o mensajería del aula virtual', 'WhatsApp o Telegram', 'Discord o Slack']),
    M('H3', '¿Qué herramientas ha utilizado su docente para almacenar o distribuir los materiales de clase?',
      ['Aula virtual', 'Google Drive', 'OneDrive o SharePoint', 'Notion, Confluence o Dropbox']),
    M('H4', '¿Qué herramientas ha utilizado su docente para crear o presentar contenidos didácticos?',
      ['PowerPoint o Google Slides', 'Canva o Genially', 'Videos grabados o YouTube', 'Pizarras digitales (Miro, Whiteboard, pizarra de Zoom o Teams)']),
    M('H5', '¿Qué herramientas ha utilizado su docente para evaluar o retroalimentar su desempeño?',
      ['Cuestionarios o tareas del aula virtual', 'Google Forms o Microsoft Forms', 'Kahoot, Quizizz o Socrative',
       'Repositorios o evaluación práctica automatizada', 'Encuestas en vivo o rúbricas digitales']),
    M('H6', '¿Qué herramientas tecnológicas especializadas del área de tecnología e innovación ha utilizado su docente durante esta asignatura?',
      ['IDEs o editores de código', 'Git, GitHub, GitLab o Bitbucket', 'Nube, contenedores o notebooks (AWS, Azure, Docker, Colab, Jupyter)',
       'Simuladores técnicos', 'Diseño y prototipado (Figma, AutoCAD, Lucidchart, UML)', 'Gestión ágil o IA generativa (Jira, Trello, asistentes de IA)']),

    L('F1', 'Además de la plataforma de videoconferencia, mi docente integra recursos digitales de apoyo (presentaciones, videos, pizarras o software especializado) de manera pertinente para explicar los contenidos.'),
    L('F2', 'Mi docente utiliza herramientas digitales interactivas (encuestas, foros, cuestionarios en vivo o espacios colaborativos) para dinamizar las sesiones virtuales.'),
    L('F3', 'Mi docente aprovecha herramientas digitales distintas de la videoconferencia durante los momentos clave de explicación o práctica de cada clase virtual.'),
    L('F4', 'Mi docente articula de forma organizada herramientas digitales complementarias en la asignatura para apoyar los objetivos de la sesión.'),
    L('F5', 'Mi docente utiliza herramientas digitales para asignar, dar seguimiento o retroalimentar actividades académicas fuera de la sesión sincrónica.'),

    L('D1', 'Mi docente comunica con claridad los temas y objetivos importantes de la asignatura al apoyarse en herramientas digitales.'),
    L('D2', 'Mi docente proporciona instrucciones claras sobre cómo participar en las actividades digitales de la asignatura.'),
    L('D3', 'Mi docente utiliza herramientas digitales para promover mi participación activa en la clase.'),
    L('D4', 'Mi docente utiliza herramientas digitales para guiarme en la comprensión de los contenidos de la asignatura.'),
    L('D5', 'Mi docente utiliza herramientas digitales para brindarme retroalimentación oportuna que me ayuda a identificar mis fortalezas y áreas de mejora.'),
    L('D6', 'Cuando surgen problemas técnicos con las herramientas digitales durante la clase, mi docente logra resolverlos eficazmente.',
      { na: 'No aplica / No he tenido experiencia con esta situación' }),
    L('CTRL1', 'Para verificar la lectura atenta de este cuestionario, seleccione la opción «De acuerdo» en esta fila.', { sec: 'pres', control: 4 }),

    L('A1', 'En esta asignatura virtual, comprendo con claridad los conceptos fundamentales tratados.'),
    L('A2', 'Puedo aplicar en situaciones prácticas los contenidos que aprendo en esta asignatura virtual.'),
    L('A3', 'El desarrollo de esta asignatura virtual despierta mi interés y curiosidad por profundizar en los temas tratados.'),
    L('A4', 'En esta asignatura virtual, logro consultar y contrastar distintas fuentes de información para resolver los problemas planteados.'),
    L('A5', 'Logro integrar los conocimientos adquiridos en esta asignatura virtual para proponer soluciones fundamentadas.'),
    L('A6', 'Siento que mi dominio general de los contenidos de esta asignatura virtual se ha fortalecido de manera efectiva durante el ciclo.')
  ];

  // Indicador de cada ítem, tal como aparece en la matriz (se usa en el dashboard).
  const INDICADORES = {"FIL1": "Consentimiento informado", "FIL2": "Elegibilidad (carga virtual en FTI)", "S1": "Edad", "S2": "Género", "S3": "Carrera", "S4": "Año de estudio", "S5": "Carga virtual", "S6": "Tipo de asignatura de referencia", "H1": "Plataformas de impartición sincrónica", "H2": "Canales de comunicación y seguimiento", "H3": "Almacenamiento y distribución de materiales", "H4": "Creación y presentación de contenidos didácticos", "H5": "Evaluación y retroalimentación digital", "H6": "Herramientas tecnológicas especializadas del área FTI", "F1": "Frecuencia de recursos digitales de apoyo", "F2": "Frecuencia de herramientas interactivas", "F3": "Aprovechamiento digital en momentos clave", "F4": "Articulación de herramientas complementarias", "F5": "Uso asincrónico para seguimiento", "D1": "Claridad al comunicar temas y objetivos", "D2": "Orientación clara de actividades digitales", "D3": "Promoción de la participación activa", "D4": "Guía docente para la comprensión", "D5": "Retroalimentación oportuna mediada por tecnología", "D6": "Resolución eficaz de problemas técnicos", "CTRL1": "Verificación de lectura atenta", "A1": "Comprensión de conceptos fundamentales", "A2": "Aplicación práctica de contenidos", "A3": "Interés y curiosidad académica", "A4": "Exploración y contraste autónomo de fuentes", "A5": "Integración de conocimientos", "A6": "Fortalecimiento del dominio general"};
  ITEMS.forEach(i => { i.ind = INDICADORES[i.id]; });

  const banco = { ESCALAS, SECCIONES, ITEMS };
  if (typeof window !== 'undefined') window.CUHDA_PREGUNTAS = banco;
  if (typeof module !== 'undefined') module.exports = banco;
})();
