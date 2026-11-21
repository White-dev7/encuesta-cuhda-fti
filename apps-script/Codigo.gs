/**
 * Encuesta CUHDA-FTI v2.2 — receptor de respuestas para Google Sheets
 * ---------------------------------------------------------------
 * 1. Abra su hoja de Google > Extensiones > Apps Script y pegue este archivo.
 * 2. Ejecute una vez la función `configurar` (crea las pestañas y pide permisos).
 * 3. Implementar > Nueva implementación > Aplicación web
 *    · Ejecutar como: Yo   · Quién tiene acceso: Cualquier persona
 * 4. Copie la URL /exec en js/config.js (campo endpoint).
 * 5. Para el dashboard: ejecute verClaveDashboard y copie la clave que aparece en el registro.
 *
 * Lectura pública (sin clave): ?accion=resumen devuelve solo promedios y porcentajes agregados,
 * y únicamente cuando hay al menos 10 respuestas válidas.
 *
 * Control de calidad en el servidor:
 *  · valida versión, nombres de campo, tipos y rangos antes de guardar;
 *  · descarta duplicados por id_respuesta;
 *  · usa un bloqueo para que dos envíos simultáneos no se pisen;
 *  · registra los envíos rechazados en la pestaña "Rechazados".
 */
const VERSION = 'CUHDA-FTI v2.2';
const HOJA = 'Respuestas', HOJA_DIC = 'Diccionario', HOJA_RECH = 'Rechazados';

const DICCIONARIO = [
  ["variable","pregunta / descripción","tipo","codificación"],
  ["recibido","Fecha y hora de recepción en el servidor","fecha",""],
  ["id_respuesta","Identificador aleatorio de la respuesta (no identifica a la persona)","texto",""],
  ["version","Versión del instrumento","texto",""],
  ["piloto","Respuesta de prueba piloto (?piloto=1)","dicotómica","1 = piloto; 0 = aplicación real"],
  ["inicio","Inicio (UTC, ISO 8601)","fecha",""],
  ["fin","Fin (UTC, ISO 8601)","fecha",""],
  ["duracion_seg","Duración en segundos","numérica",""],
  ["completo","Cuestionario completo","dicotómica","1 = completo; 0 = terminó en un filtro"],
  ["motivo_fin","Motivo de finalización","nominal","completa / sin_consentimiento / no_elegible"],
  ["dispositivo","Tipo de pantalla","nominal","movil / escritorio"],
  ["canal","Canal de difusión por el que llegó (utm_source del enlace)","nominal","qr / whatsapp / facebook / linkedin / telegram / x / correo / enlace / nativo / directo"],
  ["FIL1","Después de leer la información anterior, ¿acepta participar voluntariamente en esta encuesta?","nominal/ordinal","1 = Sí, acepto participar; 0 = No acepto participar"],
  ["FIL2","¿Cursa actualmente al menos una asignatura en modalidad virtual en la Facultad de Tecnología e Innovación (FTI)?","nominal/ordinal","1 = Sí; 0 = No"],
  ["S1","¿Cuál es su edad?","nominal/ordinal","1 = 18 a 20 años; 2 = 21 a 23 años; 3 = 24 a 26 años; 4 = 27 años o más"],
  ["S2","¿Con qué género se identifica?","nominal/ordinal","1 = Femenino; 2 = Masculino; 3 = Otro; 4 = Prefiero no decirlo"],
  ["S3","¿Qué carrera de la Facultad de Tecnología e Innovación cursa actualmente?","nominal/ordinal","1 = Ingeniería en Sistemas y Computación; 2 = Ingeniería en Innovación Agroindustrial; 3 = Licenciatura en Computación Gerencial; 4 = Licenciatura en Diseño Gráfico Multimedia; 5 = Técnico en Computación; 6 = Técnico en Diseño Gráfico"],
  ["S3_txt","¿Qué carrera de la Facultad de Tecnología e Innovación cursa actualmente? (etiqueta)","texto",""],
  ["S4","¿En qué año de su carrera se encuentra?","nominal/ordinal","1 = Primer año; 2 = Segundo año; 3 = Tercer año; 4 = Cuarto año; 5 = Quinto año o más"],
  ["S5","¿Cuántas asignaturas en modalidad virtual cursa en el ciclo actual?","nominal/ordinal","1 = 1; 2 = 2; 3 = 3; 4 = 4 o más"],
  ["S6","Para responder el resto del cuestionario, elija una sola asignatura virtual de la FTI: la de mayor carga horaria o la última clase a la que asistió. ¿Qué tipo de asignatura seleccionó?","nominal/ordinal","1 = Teórica o conceptual; 2 = Práctica, de laboratorio o taller; 3 = Teórico-práctica"],
  ["S6_txt","Para responder el resto del cuestionario, elija una sola asignatura virtual de la FTI: la de mayor carga horaria o la última clase a la que asistió. ¿Qué tipo de asignatura seleccionó? (etiqueta)","texto",""],
  ["H1_1","¿Qué plataformas ha utilizado su docente para impartir las clases virtuales sincrónicas? — Zoom","dicotómica","1 = marcada; 0 = no marcada"],
  ["H1_2","¿Qué plataformas ha utilizado su docente para impartir las clases virtuales sincrónicas? — Microsoft Teams","dicotómica","1 = marcada; 0 = no marcada"],
  ["H1_3","¿Qué plataformas ha utilizado su docente para impartir las clases virtuales sincrónicas? — Google Meet","dicotómica","1 = marcada; 0 = no marcada"],
  ["H1_4","¿Qué plataformas ha utilizado su docente para impartir las clases virtuales sincrónicas? — Videoconferencia integrada en el aula virtual","dicotómica","1 = marcada; 0 = no marcada"],
  ["H1_ninguna","¿Qué plataformas ha utilizado su docente para impartir las clases virtuales sincrónicas? — Ninguna","dicotómica","1 = marcada (excluyente)"],
  ["H1_otra","¿Qué plataformas ha utilizado su docente para impartir las clases virtuales sincrónicas? — Otra (texto)","texto","vacío si no aplica"],
  ["H1_n","¿Qué plataformas ha utilizado su docente para impartir las clases virtuales sincrónicas? — opciones cerradas marcadas","numérica","0 a 4"],
  ["H2_1","¿Qué canales digitales ha utilizado su docente para comunicarse y dar seguimiento fuera de la sesión sincrónica? — Correo institucional","dicotómica","1 = marcada; 0 = no marcada"],
  ["H2_2","¿Qué canales digitales ha utilizado su docente para comunicarse y dar seguimiento fuera de la sesión sincrónica? — Foros o mensajería del aula virtual","dicotómica","1 = marcada; 0 = no marcada"],
  ["H2_3","¿Qué canales digitales ha utilizado su docente para comunicarse y dar seguimiento fuera de la sesión sincrónica? — WhatsApp o Telegram","dicotómica","1 = marcada; 0 = no marcada"],
  ["H2_4","¿Qué canales digitales ha utilizado su docente para comunicarse y dar seguimiento fuera de la sesión sincrónica? — Discord o Slack","dicotómica","1 = marcada; 0 = no marcada"],
  ["H2_ninguna","¿Qué canales digitales ha utilizado su docente para comunicarse y dar seguimiento fuera de la sesión sincrónica? — Ninguna","dicotómica","1 = marcada (excluyente)"],
  ["H2_otra","¿Qué canales digitales ha utilizado su docente para comunicarse y dar seguimiento fuera de la sesión sincrónica? — Otra (texto)","texto","vacío si no aplica"],
  ["H2_n","¿Qué canales digitales ha utilizado su docente para comunicarse y dar seguimiento fuera de la sesión sincrónica? — opciones cerradas marcadas","numérica","0 a 4"],
  ["H3_1","¿Qué herramientas ha utilizado su docente para almacenar o distribuir los materiales de clase? — Aula virtual","dicotómica","1 = marcada; 0 = no marcada"],
  ["H3_2","¿Qué herramientas ha utilizado su docente para almacenar o distribuir los materiales de clase? — Google Drive","dicotómica","1 = marcada; 0 = no marcada"],
  ["H3_3","¿Qué herramientas ha utilizado su docente para almacenar o distribuir los materiales de clase? — OneDrive o SharePoint","dicotómica","1 = marcada; 0 = no marcada"],
  ["H3_4","¿Qué herramientas ha utilizado su docente para almacenar o distribuir los materiales de clase? — Notion, Confluence o Dropbox","dicotómica","1 = marcada; 0 = no marcada"],
  ["H3_ninguna","¿Qué herramientas ha utilizado su docente para almacenar o distribuir los materiales de clase? — Ninguna","dicotómica","1 = marcada (excluyente)"],
  ["H3_otra","¿Qué herramientas ha utilizado su docente para almacenar o distribuir los materiales de clase? — Otra (texto)","texto","vacío si no aplica"],
  ["H3_n","¿Qué herramientas ha utilizado su docente para almacenar o distribuir los materiales de clase? — opciones cerradas marcadas","numérica","0 a 4"],
  ["H4_1","¿Qué herramientas ha utilizado su docente para crear o presentar contenidos didácticos? — PowerPoint o Google Slides","dicotómica","1 = marcada; 0 = no marcada"],
  ["H4_2","¿Qué herramientas ha utilizado su docente para crear o presentar contenidos didácticos? — Canva o Genially","dicotómica","1 = marcada; 0 = no marcada"],
  ["H4_3","¿Qué herramientas ha utilizado su docente para crear o presentar contenidos didácticos? — Videos grabados o YouTube","dicotómica","1 = marcada; 0 = no marcada"],
  ["H4_4","¿Qué herramientas ha utilizado su docente para crear o presentar contenidos didácticos? — Pizarras digitales (Miro, Whiteboard, pizarra de Zoom o Teams)","dicotómica","1 = marcada; 0 = no marcada"],
  ["H4_ninguna","¿Qué herramientas ha utilizado su docente para crear o presentar contenidos didácticos? — Ninguna","dicotómica","1 = marcada (excluyente)"],
  ["H4_otra","¿Qué herramientas ha utilizado su docente para crear o presentar contenidos didácticos? — Otra (texto)","texto","vacío si no aplica"],
  ["H4_n","¿Qué herramientas ha utilizado su docente para crear o presentar contenidos didácticos? — opciones cerradas marcadas","numérica","0 a 4"],
  ["H5_1","¿Qué herramientas ha utilizado su docente para evaluar o retroalimentar su desempeño? — Cuestionarios o tareas del aula virtual","dicotómica","1 = marcada; 0 = no marcada"],
  ["H5_2","¿Qué herramientas ha utilizado su docente para evaluar o retroalimentar su desempeño? — Google Forms o Microsoft Forms","dicotómica","1 = marcada; 0 = no marcada"],
  ["H5_3","¿Qué herramientas ha utilizado su docente para evaluar o retroalimentar su desempeño? — Kahoot, Quizizz o Socrative","dicotómica","1 = marcada; 0 = no marcada"],
  ["H5_4","¿Qué herramientas ha utilizado su docente para evaluar o retroalimentar su desempeño? — Repositorios o evaluación práctica automatizada","dicotómica","1 = marcada; 0 = no marcada"],
  ["H5_5","¿Qué herramientas ha utilizado su docente para evaluar o retroalimentar su desempeño? — Encuestas en vivo o rúbricas digitales","dicotómica","1 = marcada; 0 = no marcada"],
  ["H5_ninguna","¿Qué herramientas ha utilizado su docente para evaluar o retroalimentar su desempeño? — Ninguna","dicotómica","1 = marcada (excluyente)"],
  ["H5_otra","¿Qué herramientas ha utilizado su docente para evaluar o retroalimentar su desempeño? — Otra (texto)","texto","vacío si no aplica"],
  ["H5_n","¿Qué herramientas ha utilizado su docente para evaluar o retroalimentar su desempeño? — opciones cerradas marcadas","numérica","0 a 5"],
  ["H6_1","¿Qué herramientas tecnológicas especializadas del área de tecnología e innovación ha utilizado su docente durante esta asignatura? — IDEs o editores de código","dicotómica","1 = marcada; 0 = no marcada"],
  ["H6_2","¿Qué herramientas tecnológicas especializadas del área de tecnología e innovación ha utilizado su docente durante esta asignatura? — Git, GitHub, GitLab o Bitbucket","dicotómica","1 = marcada; 0 = no marcada"],
  ["H6_3","¿Qué herramientas tecnológicas especializadas del área de tecnología e innovación ha utilizado su docente durante esta asignatura? — Nube, contenedores o notebooks (AWS, Azure, Docker, Colab, Jupyter)","dicotómica","1 = marcada; 0 = no marcada"],
  ["H6_4","¿Qué herramientas tecnológicas especializadas del área de tecnología e innovación ha utilizado su docente durante esta asignatura? — Simuladores técnicos","dicotómica","1 = marcada; 0 = no marcada"],
  ["H6_5","¿Qué herramientas tecnológicas especializadas del área de tecnología e innovación ha utilizado su docente durante esta asignatura? — Diseño y prototipado (Figma, AutoCAD, Lucidchart, UML)","dicotómica","1 = marcada; 0 = no marcada"],
  ["H6_6","¿Qué herramientas tecnológicas especializadas del área de tecnología e innovación ha utilizado su docente durante esta asignatura? — Gestión ágil o IA generativa (Jira, Trello, asistentes de IA)","dicotómica","1 = marcada; 0 = no marcada"],
  ["H6_ninguna","¿Qué herramientas tecnológicas especializadas del área de tecnología e innovación ha utilizado su docente durante esta asignatura? — Ninguna","dicotómica","1 = marcada (excluyente)"],
  ["H6_otra","¿Qué herramientas tecnológicas especializadas del área de tecnología e innovación ha utilizado su docente durante esta asignatura? — Otra (texto)","texto","vacío si no aplica"],
  ["H6_n","¿Qué herramientas tecnológicas especializadas del área de tecnología e innovación ha utilizado su docente durante esta asignatura? — opciones cerradas marcadas","numérica","0 a 6"],
  ["F1","Además de la plataforma de videoconferencia, mi docente integra recursos digitales de apoyo (presentaciones, videos, pizarras o software especializado) de manera pertinente para explicar los contenidos.","ordinal","1 = Nunca; 2 = Casi nunca; 3 = A veces; 4 = Casi siempre; 5 = Siempre"],
  ["F2","Mi docente utiliza herramientas digitales interactivas (encuestas, foros, cuestionarios en vivo o espacios colaborativos) para dinamizar las sesiones virtuales.","ordinal","1 = Nunca; 2 = Casi nunca; 3 = A veces; 4 = Casi siempre; 5 = Siempre"],
  ["F3","Mi docente aprovecha herramientas digitales distintas de la videoconferencia durante los momentos clave de explicación o práctica de cada clase virtual.","ordinal","1 = Nunca; 2 = Casi nunca; 3 = A veces; 4 = Casi siempre; 5 = Siempre"],
  ["F4","Mi docente articula de forma organizada herramientas digitales complementarias en la asignatura para apoyar los objetivos de la sesión.","ordinal","1 = Nunca; 2 = Casi nunca; 3 = A veces; 4 = Casi siempre; 5 = Siempre"],
  ["F5","Mi docente utiliza herramientas digitales para asignar, dar seguimiento o retroalimentar actividades académicas fuera de la sesión sincrónica.","ordinal","1 = Nunca; 2 = Casi nunca; 3 = A veces; 4 = Casi siempre; 5 = Siempre"],
  ["D1","Mi docente comunica con claridad los temas y objetivos importantes de la asignatura al apoyarse en herramientas digitales.","ordinal","1 = Totalmente en desacuerdo; 2 = En desacuerdo; 3 = Ni de acuerdo ni en desacuerdo; 4 = De acuerdo; 5 = Totalmente de acuerdo"],
  ["D2","Mi docente proporciona instrucciones claras sobre cómo participar en las actividades digitales de la asignatura.","ordinal","1 = Totalmente en desacuerdo; 2 = En desacuerdo; 3 = Ni de acuerdo ni en desacuerdo; 4 = De acuerdo; 5 = Totalmente de acuerdo"],
  ["D3","Mi docente utiliza herramientas digitales para promover mi participación activa en la clase.","ordinal","1 = Totalmente en desacuerdo; 2 = En desacuerdo; 3 = Ni de acuerdo ni en desacuerdo; 4 = De acuerdo; 5 = Totalmente de acuerdo"],
  ["D4","Mi docente utiliza herramientas digitales para guiarme en la comprensión de los contenidos de la asignatura.","ordinal","1 = Totalmente en desacuerdo; 2 = En desacuerdo; 3 = Ni de acuerdo ni en desacuerdo; 4 = De acuerdo; 5 = Totalmente de acuerdo"],
  ["D5","Mi docente utiliza herramientas digitales para brindarme retroalimentación oportuna que me ayuda a identificar mis fortalezas y áreas de mejora.","ordinal","1 = Totalmente en desacuerdo; 2 = En desacuerdo; 3 = Ni de acuerdo ni en desacuerdo; 4 = De acuerdo; 5 = Totalmente de acuerdo"],
  ["D6","Cuando surgen problemas técnicos con las herramientas digitales durante la clase, mi docente logra resolverlos eficazmente.","ordinal","1 = Totalmente en desacuerdo; 2 = En desacuerdo; 3 = Ni de acuerdo ni en desacuerdo; 4 = De acuerdo; 5 = Totalmente de acuerdo; 0 = No aplica / No he tenido experiencia con esta situación (valor perdido)"],
  ["CTRL1","Para verificar la lectura atenta de este cuestionario, seleccione la opción «De acuerdo» en esta fila.","ordinal","1 = Totalmente en desacuerdo; 2 = En desacuerdo; 3 = Ni de acuerdo ni en desacuerdo; 4 = De acuerdo; 5 = Totalmente de acuerdo — CONTROL: válido solo si = 4"],
  ["A1","En esta asignatura virtual, comprendo con claridad los conceptos fundamentales tratados.","ordinal","1 = Totalmente en desacuerdo; 2 = En desacuerdo; 3 = Ni de acuerdo ni en desacuerdo; 4 = De acuerdo; 5 = Totalmente de acuerdo"],
  ["A2","Puedo aplicar en situaciones prácticas los contenidos que aprendo en esta asignatura virtual.","ordinal","1 = Totalmente en desacuerdo; 2 = En desacuerdo; 3 = Ni de acuerdo ni en desacuerdo; 4 = De acuerdo; 5 = Totalmente de acuerdo"],
  ["A3","El desarrollo de esta asignatura virtual despierta mi interés y curiosidad por profundizar en los temas tratados.","ordinal","1 = Totalmente en desacuerdo; 2 = En desacuerdo; 3 = Ni de acuerdo ni en desacuerdo; 4 = De acuerdo; 5 = Totalmente de acuerdo"],
  ["A4","En esta asignatura virtual, logro consultar y contrastar distintas fuentes de información para resolver los problemas planteados.","ordinal","1 = Totalmente en desacuerdo; 2 = En desacuerdo; 3 = Ni de acuerdo ni en desacuerdo; 4 = De acuerdo; 5 = Totalmente de acuerdo"],
  ["A5","Logro integrar los conocimientos adquiridos en esta asignatura virtual para proponer soluciones fundamentadas.","ordinal","1 = Totalmente en desacuerdo; 2 = En desacuerdo; 3 = Ni de acuerdo ni en desacuerdo; 4 = De acuerdo; 5 = Totalmente de acuerdo"],
  ["A6","Siento que mi dominio general de los contenidos de esta asignatura virtual se ha fortalecido de manera efectiva durante el ciclo.","ordinal","1 = Totalmente en desacuerdo; 2 = En desacuerdo; 3 = Ni de acuerdo ni en desacuerdo; 4 = De acuerdo; 5 = Totalmente de acuerdo"],
  ["H1_H5_total","Variedad tecnológica transversal","numérica","0 a 21"],
  ["H6_total","Variedad tecnológica especializada FTI","numérica","0 a 6"],
  ["F_total","Frecuencia de integración pedagógica (F1–F5)","numérica","5 a 25"],
  ["D_total","Presencia docente (D1–D6; D6 = 0 no suma)","numérica","5 a 30"],
  ["D6_no_aplica","D6 respondido como No aplica","dicotómica","1 = sí"],
  ["A_total","Aprendizaje percibido (A1–A6)","numérica","6 a 30"],
  ["CTRL1_valido","Superó el control de atención","dicotómica","1 = CTRL1 = 4; 0 = excluir caso"],
  ["flag_rapido","Respondió en menos del tiempo mínimo configurado (por defecto 120 s)","dicotómica","1 = revisar"],
  ["flag_lineal","Misma respuesta en todos los ítems Likert (respuesta en línea recta)","dicotómica","1 = revisar"]
];

const COLUMNAS = DICCIONARIO.slice(1).map(r => r[0]);

/** Ejecútela una vez desde el editor para preparar la hoja. */
function configurar() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = libro.getSheetByName(HOJA) || libro.insertSheet(HOJA);
  if (hoja.getLastRow() === 0) {
    hoja.getRange(1, 1, 1, COLUMNAS.length).setValues([COLUMNAS]).setFontWeight('bold').setBackground('#0b4ea2').setFontColor('#ffffff');
    hoja.setFrozenRows(1);
  }
  const dic = libro.getSheetByName(HOJA_DIC) || libro.insertSheet(HOJA_DIC);
  dic.clear();
  dic.getRange(1, 1, DICCIONARIO.length, 4).setValues(DICCIONARIO).setWrap(true).setVerticalAlignment('top');
  dic.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#0b4ea2').setFontColor('#ffffff');
  dic.setFrozenRows(1); dic.setColumnWidth(1, 150); dic.setColumnWidth(2, 520); dic.setColumnWidth(3, 120); dic.setColumnWidth(4, 420);
  const rech = libro.getSheetByName(HOJA_RECH) || libro.insertSheet(HOJA_RECH);
  if (rech.getLastRow() === 0) rech.appendRow(['recibido', 'motivo', 'contenido']);
  const clave = verClaveDashboard();
  return 'Listo: pestañas preparadas. Clave del dashboard: ' + clave;
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) return salida({ ok: false, error: 'ocupado' });
  try {
    let datos;
    try { datos = JSON.parse(e.postData.contents); } catch (err) { return rechazar('JSON inválido', e.postData && e.postData.contents); }
    const problema = validar(datos);
    if (problema) return rechazar(problema, JSON.stringify(datos));

    const libro = SpreadsheetApp.getActiveSpreadsheet();
    let hoja = libro.getSheetByName(HOJA);
    if (!hoja || hoja.getLastRow() === 0) { configurar(); hoja = libro.getSheetByName(HOJA); }

    const encabezados = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
    const colId = encabezados.indexOf('id_respuesta') + 1;
    if (colId > 0 && hoja.getLastRow() > 1) {
      const existe = hoja.getRange(2, colId, hoja.getLastRow() - 1, 1).createTextFinder(String(datos.id_respuesta)).matchEntireCell(true).findNext();
      if (existe) return salida({ ok: true, duplicado: true });
    }
    datos.recibido = new Date();
    hoja.appendRow(encabezados.map(h => (h in datos ? datos[h] : '')));
    return salida({ ok: true });
  } catch (err) {
    return salida({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** Devuelve un texto con el problema, o '' si la respuesta es válida. */
function validar(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return 'formato';
  if (d.version !== VERSION) return 'versión distinta: ' + d.version;
  if (!/^[\w-]{12,64}$/.test(String(d.id_respuesta || ''))) return 'id_respuesta inválido';
  if (d.canal !== undefined && !/^[a-z0-9_-]{0,30}$/.test(String(d.canal))) return 'canal inválido';
  const permitidas = new Set(COLUMNAS);
  for (const k of Object.keys(d)) {
    if (!permitidas.has(k)) return 'campo desconocido: ' + k;
    const v = d[k];
    if (typeof v === 'string' && v.length > 300) return 'texto demasiado largo en ' + k;
    if (v !== '' && typeof v !== 'string' && typeof v !== 'number') return 'tipo inválido en ' + k;
  }
  const rango = (k, min, max) => d[k] === '' || d[k] === undefined || (Number.isInteger(d[k]) && d[k] >= min && d[k] <= max);
  if (![0, 1].includes(d.FIL1)) return 'FIL1 fuera de rango';
  if (d.completo === 1) {
    const lik = ['F1','F2','F3','F4','F5','D1','D2','D3','D4','D5','CTRL1','A1','A2','A3','A4','A5','A6'];
    for (const k of lik) if (!rango(k, 1, 5) || d[k] === '') return k + ' fuera de rango';
    if (!rango('D6', 0, 5) || d.D6 === '') return 'D6 fuera de rango';
    const max = { S1: 4, S2: 4, S3: 6, S4: 5, S5: 4, S6: 3 };
    for (const k in max) if (!rango(k, 1, max[k]) || d[k] === '') return k + ' fuera de rango';
  }
  return '';
}

function rechazar(motivo, contenido) {
  try {
    const libro = SpreadsheetApp.getActiveSpreadsheet();
    const h = libro.getSheetByName(HOJA_RECH) || libro.insertSheet(HOJA_RECH);
    h.appendRow([new Date(), motivo, String(contenido || '').slice(0, 5000)]);
  } catch (err) { /* sin registro */ }
  return salida({ ok: false, error: motivo });
}

/**
 * Lectura para el dashboard: GET .../exec?accion=datos&clave=SU_CLAVE
 * Sin la clave correcta no devuelve datos.
 */
const MIN_RESUMEN = 10; // los promedios públicos se muestran solo con al menos 10 respuestas válidas

/**
 * Resumen público para la pantalla final de la encuesta: SOLO agregados (promedios y porcentajes),
 * nunca respuestas individuales. Con menos de MIN_RESUMEN respuestas válidas no devuelve promedios.
 */
function resumir(columnas, filas) {
  const filasObj = filas.map(f => { const o = {}; columnas.forEach((c, i) => { o[c] = f[i]; }); return o; });
  const val = filasObj.filter(r => String(r.id_respuesta || '').trim() !== '' && Number(r.completo) === 1
    && Number(r.CTRL1_valido) === 1 && Number(r.piloto) !== 1);
  const n = val.length;
  if (n < MIN_RESUMEN) return { ok: true, n: n, suficiente: false, minimo: MIN_RESUMEN };
  const media = (r, ids, ceroPerdido) => {
    const v = ids.map(id => (r[id] === '' || r[id] === null || r[id] === undefined ? NaN : Number(r[id])))
      .filter(x => !isNaN(x) && !(ceroPerdido && x === 0));
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const prom = arr => { const v = arr.filter(x => x !== null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 100) / 100 : null; };
  const ids = { F: ['F1', 'F2', 'F3', 'F4', 'F5'], D: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'], A: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'] };
  const dim = {};
  Object.keys(ids).forEach(k => { dim[k] = prom(val.map(r => media(r, ids[k], k === 'D'))); });
  const herr = {};
  columnas.filter(c => /^H[1-6]_\d+$/.test(c)).forEach(c => {
    herr[c] = Math.round(val.filter(r => Number(r[c]) === 1).length / n * 1000) / 1000;
  });
  return { ok: true, n: n, suficiente: true, minimo: MIN_RESUMEN, dim: dim, herr: herr, actualizado: new Date().toISOString() };
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.accion === 'resumen') {
    const cache = CacheService.getScriptCache();
    const guardado = cache.get('resumen');
    if (guardado) return ContentService.createTextOutput(guardado).setMimeType(ContentService.MimeType.JSON);
    const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA);
    let res = { ok: true, n: 0, suficiente: false, minimo: MIN_RESUMEN };
    if (hoja && hoja.getLastRow() > 1) { const v = hoja.getDataRange().getValues(); const cols = v.shift(); res = resumir(cols, v); }
    const txt = JSON.stringify(res);
    cache.put('resumen', txt, 60); // se recalcula como máximo una vez por minuto
    return ContentService.createTextOutput(txt).setMimeType(ContentService.MimeType.JSON);
  }
  if (p.accion !== 'datos') return salida({ ok: true, mensaje: 'Receptor ' + VERSION + ' activo.' });
  const clave = PropertiesService.getScriptProperties().getProperty('CLAVE_DASHBOARD');
  if (!clave || p.clave !== clave) { Utilities.sleep(800); return salida({ ok: false, error: 'clave' }); }
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA);
  if (!hoja || hoja.getLastRow() < 2) return salida({ ok: true, columnas: COLUMNAS, filas: [] });
  const valores = hoja.getDataRange().getValues();
  const columnas = valores.shift();
  const colId = columnas.indexOf('id_respuesta');
  const filas = valores
    .filter(f => colId < 0 || String(f[colId]).trim() !== '') // omite filas vaciadas a mano
    .map(f => f.map(v => (v instanceof Date ? v.toISOString() : v)));
  return salida({ ok: true, columnas: columnas, filas: filas, generado: new Date().toISOString() });
}

/** Muestra (y crea si no existe) la clave del dashboard. Ejecútela desde el editor y copie el resultado. */
function verClaveDashboard() {
  const props = PropertiesService.getScriptProperties();
  let clave = props.getProperty('CLAVE_DASHBOARD');
  if (!clave) { clave = Utilities.getUuid().replace(/-/g, '').slice(0, 16); props.setProperty('CLAVE_DASHBOARD', clave); }
  Logger.log('Clave del dashboard: ' + clave);
  return clave;
}

/** Cambia la clave (por ejemplo, si se compartió por error). */
function cambiarClaveDashboard() {
  PropertiesService.getScriptProperties().deleteProperty('CLAVE_DASHBOARD');
  return verClaveDashboard();
}

function salida(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Prueba local desde el editor: simula un envío y lo deja en la hoja. Bórrelo después. */
function probarEnvio() {
  const r = { id_respuesta: 'prueba-' + Utilities.getUuid(), version: VERSION, piloto: 1, completo: 0, motivo_fin: 'sin_consentimiento', FIL1: 0 };
  return doPost({ postData: { contents: JSON.stringify(r) } }).getContent();
}
