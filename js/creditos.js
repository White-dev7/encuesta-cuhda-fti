/* Créditos del equipo y aviso de privacidad — compartido por la encuesta y el dashboard. */
(function () {
  'use strict';
  const CFG = window.CUHDA_CONFIG || {}, EQ = CFG.equipo || {};
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const anio = (CFG.ciclo || '').match(/\d{4}$/)?.[0] || new Date().getFullYear();
  const INST = Object.assign({ universidad: 'Universidad Dr. Andrés Bello', carrera: 'Licenciatura en Mercadeo Estratégico', facultad: 'Facultad de Ciencias Económicas' }, CFG.institucion || {});
  const IC = window.CUHDA_ICONOS || { icono: () => '' };

  /** Nombre en formato APA: «Monge Osorio, J. N.» (4 palabras = 2 nombres + 2 apellidos; 3 = 2 + 1). */
  function apa(nombre) {
    const p = String(nombre).trim().split(/\s+/);
    const nNombres = p.length >= 4 ? 2 : p.length === 3 ? 2 : 1;
    const nombres = p.slice(0, nNombres), apellidos = p.slice(nNombres);
    return `${apellidos.join(' ')}, ${nombres.map(n => n[0] + '.').join(' ')}`;
  }
  function cita() {
    const autores = [EQ.principal?.nombre, ...(EQ.coautoria?.integrantes || [])].filter(Boolean).map(apa);
    const lista = autores.length > 1 ? autores.slice(0, -1).join(', ') + ', & ' + autores[autores.length - 1] : autores[0] || '';
    return `${lista} (${anio}). <i>Cuestionario sobre uso de herramientas digitales docentes, presencia docente y aprendizaje percibido (${esc(CFG.version || 'CUHDA-FTI v2.2')})</i> [Instrumento de medición]. ${esc(INST.carrera)}, ${esc(INST.facultad)}, ${esc(INST.universidad)}.`;
  }

  const ICON = { asesor: IC.icono('graduation-cap'), principal: IC.icono('laptop'), equipo: IC.icono('users') };
  const logo = () => CFG.imagenes?.logo ? `<img class="dlg-logo" src="${esc(CFG.imagenes.logo)}" alt="" onerror="this.remove()">` : '';

  function equipoHTML() {
    const tarjeta = (k, p, tono) => p ? `<section class="cred ${tono}"><div class="cred-h"><span class="tag">${esc(p.etiqueta)}</span><span class="cred-ic" aria-hidden="true">${ICON[k]}</span></div>
<h3>${esc(p.nombre)}</h3><p class="cargo">${esc(p.cargo)}</p><p>${esc(p.funciones)}</p></section>` : '';
    const co = EQ.coautoria;
    return `${tarjeta('asesor', EQ.asesor, 't-verde')}${tarjeta('principal', EQ.principal, 't-azul')}
${co ? `<section class="cred t-cian"><div class="cred-h"><span class="tag">${esc(co.etiqueta)}</span><span class="cred-ic" aria-hidden="true">${ICON.equipo}</span></div><p>${esc(co.funciones)}</p>
<ol class="miembros">${co.integrantes.map((n, i) => `<li><span class="num" aria-hidden="true">${i + 1}</span><span><b>${esc(n)}</b><small>${esc(co.cargo)}</small></span></li>`).join('')}</ol></section>` : ''}
<section class="cred t-neutro"><h3 class="h-cita">Cómo citar el instrumento</h3><p class="cita">${cita()}</p>
<p class="meta-dlg">${esc(CFG.version || '')} · ${esc(INST.carrera)} · ${esc(INST.facultad)} · ciclo ${esc(CFG.ciclo || '')}${CFG.aprobacionEtica ? ` · Aprobación: ${esc(CFG.aprobacionEtica)}` : ''}</p></section>`;
  }

  function privacidadHTML() {
    const c = CFG.contacto ? `<p>Para cualquier duda sobre el estudio o sobre sus datos, escriba a <a href="mailto:${esc(CFG.contacto)}">${esc(CFG.contacto)}</a>.</p>` : '';
    return `<section class="cred t-neutro priv">
<h3>Qué se registra</h3><p>Sus respuestas al cuestionario, la fecha y hora de inicio y fin, la duración, el tipo de pantalla (móvil o escritorio), el canal por el que llegó a la encuesta (por ejemplo, código QR o WhatsApp) y un código aleatorio que identifica la respuesta, no a usted.</p>
<h3>Qué no se registra</h3><p>No se pide ni se guarda su nombre, carné, correo, teléfono ni dirección IP. La encuesta no usa cookies de seguimiento ni herramientas de analítica.</p>
<h3>Dónde se guarda y quién lo ve</h3><p>Las respuestas se almacenan en una hoja de cálculo administrada por el equipo de investigación. Solo el equipo accede a ellas, y el tablero de resultados está protegido con clave. Mientras responde, su avance se guarda únicamente en este dispositivo y se borra al enviar.</p>
<h3>Para qué se usa</h3><p>Exclusivamente con fines académicos de este estudio. Los resultados se analizan y publican solo de forma agregada, sin posibilidad de identificar a ninguna persona.</p>
<h3>Su participación</h3><p>Es voluntaria. Puede dejar de responder en cualquier momento, sin ninguna consecuencia académica.</p>${c}</section>`;
  }

  let dlg = null, origen = null;
  function abrir(tipo) {
    if (!dlg) {
      dlg = document.createElement('dialog'); dlg.className = 'cuhda-dlg'; document.body.append(dlg);
      dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('[data-cerrar]')) cerrar(); });
      dlg.addEventListener('close', () => { document.documentElement.classList.remove('dlg-open'); origen?.focus?.(); });
    }
    origen = document.activeElement;
    const T = { equipo: ['Créditos y equipo de investigación', equipoHTML, 'users'], privacidad: ['Privacidad y uso de datos', privacidadHTML, 'lock'],
      compartir: ['Compartir la encuesta', () => window.CUHDA_COMPARTIR ? window.CUHDA_COMPARTIR.html() : '', 'share-2'] }[tipo] || null;
    if (!T) return;
    dlg.setAttribute('aria-labelledby', 'dlg-titulo');
    dlg.dataset.tipo = tipo;
    dlg.innerHTML = `<div class="dlg-box"><header class="dlg-top">${logo()}<div><h2 id="dlg-titulo">${IC.icono(T[2], 'tit-ic')}${T[0]}</h2><p>${esc(EQ.unidad || INST.universidad)}</p></div>
<button type="button" class="dlg-x" data-cerrar aria-label="Cerrar">×</button></header><div class="dlg-body" tabindex="0" role="region" aria-label="Contenido">${T[1]()}</div>
<footer class="dlg-pie"><button type="button" class="dlg-btn" data-cerrar>Cerrar</button></footer></div>`;
    document.documentElement.classList.add('dlg-open');
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    dlg.querySelector('.dlg-x').focus();
  }
  function cerrar() { if (dlg?.open) { dlg.close ? dlg.close() : dlg.removeAttribute('open'); } }
  document.addEventListener('click', e => { const b = e.target.closest('[data-dialogo]'); if (b) { e.preventDefault(); abrir(b.dataset.dialogo); } });

  const api = { abrir, cerrar, cita, apa };
  window.CUHDA_CREDITOS = api;
})();
