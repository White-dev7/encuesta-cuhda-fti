/* Reporte ejecutivo imprimible (Guardar como PDF) — CUHDA-FTI v2.2. Usa la misma clave y filtros del dashboard. */
(function () {
  'use strict';
  const CFG = window.CUHDA_CONFIG || {}, B = window.CUHDA_PREGUNTAS, E = window.CUHDA_ESTADISTICA;
  const IC = window.CUHDA_ICONOS || { icono: () => '' }, I = IC.icono;
  const ENDPOINT = String(window.__CUHDA_ENDPOINT_TEST__ !== undefined ? window.__CUHDA_ENDPOINT_TEST__ : (CFG.endpoint || '')).trim();
  const EJEMPLO = /[?&]ejemplo=1(&|$)/.test(location.search);
  const INST = Object.assign({ universidad: 'Universidad Dr. Andrés Bello', carrera: 'Licenciatura en Mercadeo Estratégico', facultad: 'Facultad de Ciencias Económicas', poblacion: 'estudiantes de la Facultad de Tecnología e Innovación (FTI)' }, CFG.institucion || {});
  const EQ = CFG.equipo || {};
  const Q = Object.fromEntries(B.ITEMS.map(q => [q.id, q]));
  const IDS = { F: ['F1', 'F2', 'F3', 'F4', 'F5'], D: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'], A: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'] };
  const DIM = { F: 'Frecuencia de integración pedagógica', D: 'Presencia docente mediada por herramientas', A: 'Aprendizaje percibido' };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const codes = q => q.o.map((o, i) => Array.isArray(o) ? o : [o, i + 1]);
  const f2 = v => v === null || v === undefined || isNaN(v) ? '—' : v.toFixed(2).replace('-', '−');
  const f1 = v => v === null || v === undefined || isNaN(v) ? '—' : v.toFixed(1);
  const pc = v => v === null || v === undefined || isNaN(v) ? '—' : Math.round(v * 100) + ' %';
  const ses = { get: k => { try { return sessionStorage.getItem(k) || ''; } catch (e) { return ''; } } };
  const $ = s => document.querySelector(s);
  const F = Object.assign({ carrera: '', tipo: '', anio: '', validas: true, flags: false, piloto: false }, (() => { try { return JSON.parse(ses.get('cuhda-dashboard-filtros') || '{}'); } catch (e) { return {}; } })());

  let RAW = [], fuente = 'ejemplo', corte = new Date();

  async function cargar() {
    const clave = ses.get('cuhda-dashboard-clave');
    if (!ENDPOINT || EJEMPLO) { RAW = window.CUHDA_EJEMPLO.generar(B); fuente = 'ejemplo'; return render(); }
    if (!clave) return mensaje('Para generar el reporte con los datos reales, abra primero el dashboard e ingrese la clave.', true);
    try {
      const j = await (await fetch(`${ENDPOINT}?accion=datos&clave=${encodeURIComponent(clave)}`, { cache: 'no-store' })).json();
      if (!j.ok) return mensaje(j.error === 'clave' ? 'La clave guardada ya no es válida. Vuelva a ingresar al dashboard.' : 'El servidor respondió con un error.', true);
      RAW = j.filas.map(f => Object.fromEntries(j.columnas.map((c, i) => [c, f[i]]))).filter(r => String(r.id_respuesta ?? '').trim() !== '');
      fuente = 'hoja'; corte = j.generado ? new Date(j.generado) : new Date();
    } catch (e) { return mensaje('No se pudo conectar con la hoja de Google. Revise su conexión.', true); }
    render();
  }
  function mensaje(t, volver) {
    $('#toolbar').innerHTML = barra(false);
    $('#reporte').innerHTML = `<section class="hoja aviso"><h1>Reporte ejecutivo</h1><p>${esc(t)}</p>${volver ? '<p><a class="btn pri" href="dashboard.html">Ir al dashboard</a> <a class="btn" href="reporte.html?ejemplo=1">Ver con datos de ejemplo</a></p>' : ''}</section>`;
  }
  const barra = imp => `<div class="tb-in"><a class="btn" href="dashboard.html">${I('arrow-left')}<span>Volver al dashboard</span></a>${imp ? `<button class="btn pri" id="b-print">${I('printer')}<span>Imprimir o guardar PDF</span></button>` : ''}</div>
${imp ? '<p class="tb-tip">En la ventana de impresión elija <b>Guardar como PDF</b>, tamaño Carta, y active <b>Gráficos de fondo</b>.</p>' : ''}`;

  /* ---------- cálculo ---------- */
  const base = () => RAW.filter(r => F.piloto || +r.piloto !== 1);
  const analisis = () => base().filter(r => +r.completo === 1 && (!F.carrera || +r.S3 === +F.carrera) && (!F.tipo || +r.S6 === +F.tipo) && (!F.anio || +r.S4 === +F.anio)
    && (!F.validas || +r.CTRL1_valido === 1) && (!F.flags || (+r.flag_rapido !== 1 && +r.flag_lineal !== 1)));
  const score = (r, k) => E.puntaje(r, IDS[k], { ceroEsPerdido: k === 'D' });
  const fecha = d => d.toLocaleDateString('es-SV', { day: 'numeric', month: 'long', year: 'numeric' });

  function dims(a) {
    return Object.keys(IDS).map(k => {
      const v = a.map(r => score(r, k)), ci = E.ciMean(v);
      const filas = (k === 'D' ? a.filter(r => +r.D6 > 0) : a).map(r => IDS[k].map(id => r[id]));
      return { k, nombre: DIM[k], mean: ci?.mean ?? null, sd: E.sd(v), lo: ci?.lo, hi: ci?.hi, alpha: E.cronbach(filas).alpha, omega: E.omega(filas).omega, n: ci?.n || 0 };
    });
  }
  function items(a) {
    return [...IDS.F, ...IDS.D, ...IDS.A].map(id => {
      const v = a.map(r => E.num(r[id])).filter(x => x !== null && x >= 1), n = v.length;
      const fr = c => n ? v.filter(x => x === c).length / n : 0;
      return { id, ind: Q[id].ind, contra: fr(1) + fr(2), neutro: fr(3), favor: fr(4) + fr(5), mean: E.mean(v), sd: E.sd(v), n };
    });
  }
  function herramientas(a) {
    const n = a.length, out = [];
    for (const id of ['H1', 'H2', 'H3', 'H4', 'H5', 'H6']) Q[id].o.forEach((o, j) => out.push({ id, q: Q[id].ind, o, p: n ? a.filter(r => +r[`${id}_${j + 1}`] === 1).length / n : 0 }));
    return out;
  }

  function hallazgos(a, d, cor, top) {
    const b = base(), comp = b.filter(r => +r.completo === 1);
    const orden = [...d].sort((x, y) => (y.mean ?? 0) - (x.mean ?? 0));
    const fuerza = r => Math.abs(r) >= 0.5 ? 'fuerte' : Math.abs(r) >= 0.3 ? 'moderada' : Math.abs(r) >= 0.1 ? 'débil' : 'prácticamente nula';
    const confiables = d.filter(x => (x.omega ?? x.alpha ?? 0) >= 0.7).length;
    const it = items(a), mejor = [...it].sort((x, y) => (y.mean ?? 0) - (x.mean ?? 0))[0], peor = [...it].sort((x, y) => (x.mean ?? 9) - (y.mean ?? 9))[0];
    return [
      `Se analizaron <b>${a.length}</b> respuestas válidas de ${b.length} recibidas (${pc(b.length ? comp.length / b.length : null)} completaron el cuestionario).`,
      `La dimensión mejor valorada es <b>${esc(orden[0].nombre.toLowerCase())}</b> (media ${f2(orden[0].mean)} sobre 5) y la más baja, <b>${esc(orden[orden.length - 1].nombre.toLowerCase())}</b> (${f2(orden[orden.length - 1].mean)}).`,
      cor.r !== null ? `La presencia docente y el aprendizaje percibido muestran una relación <b>${fuerza(cor.r)}</b> y ${cor.r >= 0 ? 'positiva' : 'negativa'} (r = ${f2(cor.r)}; IC 95 %: ${f2(cor.lo)} a ${f2(cor.hi)}). Es una asociación, no prueba causalidad.` : '',
      top.length ? `Las herramientas más reportadas son ${top.slice(0, 3).map(t => `<b>${esc(t.o)}</b> (${pc(t.p)})`).join(', ')}.` : '',
      mejor && peor ? `El ítem con mayor acuerdo es ${mejor.id} «${esc(mejor.ind.toLowerCase())}» (${f2(mejor.mean)}) y el de menor, ${peor.id} «${esc(peor.ind.toLowerCase())}» (${f2(peor.mean)}).` : '',
      `${confiables} de 3 escalas alcanzan una confiabilidad aceptable o mejor (ω ≥ 0,70).`
    ].filter(Boolean);
  }

  /* ---------- vista ---------- */
  const bar = (p, c) => `<span class="mb"><i style="width:${Math.max(0, Math.min(1, p)) * 100}%;background:${c}"></i></span>`;
  function render() {
    const a = analisis(), b = base();
    $('#toolbar').innerHTML = barra(true);
    if (a.length < 5) { $('#reporte').innerHTML = `<section class="hoja aviso"><h1>Reporte ejecutivo</h1><p>Hay ${a.length} respuestas válidas con los filtros actuales. Se necesitan al menos 5 para generar el reporte.</p></section>`; return; }
    const d = dims(a), it = items(a), he = herramientas(a), top = [...he].sort((x, y) => y.p - x.p);
    const cor = E.pearson(a.map(r => score(r, 'D')), a.map(r => score(r, 'A')));
    const fechas = b.map(r => String(r.inicio || '').slice(0, 10)).filter(Boolean).sort();
    const periodo = fechas.length ? `${fecha(new Date(fechas[0] + 'T12:00:00Z'))} al ${fecha(new Date(fechas[fechas.length - 1] + 'T12:00:00Z'))}` : '—';
    const filtros = [F.carrera && `carrera: ${codes(Q.S3).find(c => c[1] === +F.carrera)?.[0]}`, F.tipo && `tipo de asignatura: ${codes(Q.S6).find(c => c[1] === +F.tipo)?.[0]}`, F.anio && `año: ${codes(Q.S4).find(c => c[1] === +F.anio)?.[0]}`].filter(Boolean);
    const excl = ['respuestas incompletas o que terminaron en los filtros de consentimiento y elegibilidad', F.validas && 'casos que no aprobaron el ítem de control de atención (CTRL1)', F.flags && 'respuestas muy rápidas o en línea recta', !F.piloto && 'respuestas de la prueba piloto'].filter(Boolean);
    const logo = CFG.imagenes?.logo ? `<img class="logo" src="${esc(CFG.imagenes.logo)}" alt="Logo de la Universidad Dr. Andrés Bello">` : '';
    const por = codes(Q.S6).map(([l, c]) => { const g = a.filter(r => +r.S6 === c); return { l, n: g.length, F: E.mean(g.map(r => score(r, 'F'))), D: E.mean(g.map(r => score(r, 'D'))), A: E.mean(g.map(r => score(r, 'A'))) }; });
    const perfilT = id => { const fr = E.frecuencias(a.map(r => r[id]), codes(Q[id]).map(c => c[1])); return `<table class="t"><caption>${esc(Q[id].ind)}</caption><thead><tr><th>Categoría</th><th class="n">n</th><th class="n">%</th></tr></thead><tbody>${codes(Q[id]).map(([l], i) => `<tr><td>${esc(l)}</td><td class="n">${fr[i].n}</td><td class="n">${pc(fr[i].pct)}</td></tr>`).join('')}</tbody></table>`; };
    const comp = b.filter(r => +r.completo === 1);
    const C = window.CUHDA_CREDITOS;
    const nota = fuente === 'ejemplo' ? '<p class="ejemplo">Reporte generado con <b>datos de ejemplo simulados</b>. No corresponde a respuestas reales.</p>' : '';

    $('#reporte').innerHTML = `
<section class="hoja portada">
  <div class="p-top">${logo}<div><b>${esc(INST.universidad)}</b><span>${esc(INST.facultad)} · ${esc(INST.carrera)}</span></div></div>
  <div class="p-centro"><p class="p-tipo">Reporte ejecutivo de resultados</p>
  <h1>Herramientas digitales, presencia docente y aprendizaje percibido en clases virtuales</h1>
  <p class="p-inst">Instrumento ${esc(CFG.version || 'CUHDA-FTI v2.2')} · ${esc(INST.poblacion)}</p>${nota}
  <div class="p-datos"><span><b>${a.length}</b>respuestas analizadas</span><span><b>${f2(d.find(x => x.k === 'A').mean)}</b>aprendizaje percibido (1–5)</span><span><b>${f2(cor.r)}</b>r presencia–aprendizaje</span></div></div>
  <div class="p-equipo"><p><b>Investigadora principal:</b> ${esc(EQ.principal?.nombre || '')}</p><p><b>Coautoría:</b> ${esc((EQ.coautoria?.integrantes || []).join(', '))}</p><p><b>Asesoría metodológica:</b> ${esc(EQ.asesor?.nombre || '')}</p><p class="p-fecha">Fecha de corte: ${fecha(corte)}</p></div>
</section>

<section class="hoja"><h2><span>1</span>Resumen ejecutivo</h2><ul class="hall">${hallazgos(a, d, cor, top).map(h => `<li>${h}</li>`).join('')}</ul>
<h2><span>2</span>Ficha técnica</h2><table class="t ficha"><tbody>
<tr><th>Población</th><td>${esc(INST.poblacion)} que cursan al menos una asignatura virtual</td></tr>
<tr><th>Instrumento</th><td>${esc(CFG.version || 'CUHDA-FTI v2.2')}: 32 ítems (filtros, datos generales, herramientas H1–H6, escalas Likert de 5 puntos F, D y A, e ítem de control)</td></tr>
<tr><th>Modalidad</th><td>Cuestionario en línea autoadministrado, anónimo y voluntario</td></tr>
<tr><th>Periodo de recolección</th><td>${periodo}</td></tr>
<tr><th>Respuestas</th><td>${b.length} recibidas · ${comp.length} completas · <b>${a.length} analizadas</b></td></tr>
<tr><th>Exclusiones</th><td>${excl.map(esc).join('; ')}</td></tr>
<tr><th>Filtros aplicados</th><td>${filtros.length ? filtros.map(esc).join('; ') : 'ninguno (toda la muestra válida)'}</td></tr>
<tr><th>Fuente</th><td>${fuente === 'hoja' ? 'Hoja de respuestas del equipo de investigación (Google Sheets)' : 'Datos de ejemplo simulados'}</td></tr></tbody></table></section>

<section class="hoja"><h2><span>3</span>Resultados por dimensión</h2>
<p class="intro">Puntaje medio por persona en escala de 1 a 5. Confiabilidad interna estimada con alfa de Cronbach (α) y omega de McDonald (ω).</p>
<table class="t"><thead><tr><th>Dimensión</th><th class="n">Media</th><th class="n">DE</th><th class="n">IC 95 %</th><th class="n">α</th><th class="n">ω</th><th class="n">n</th></tr></thead><tbody>
${d.map(x => `<tr><td><b>${esc(x.nombre)}</b>${bar((x.mean - 1) / 4, 'var(--navy)')}</td><td class="n"><b>${f2(x.mean)}</b></td><td class="n">${f2(x.sd)}</td><td class="n">${f2(x.lo)}–${f2(x.hi)}</td><td class="n">${f2(x.alpha)}</td><td class="n">${f2(x.omega)}</td><td class="n">${x.n}</td></tr>`).join('')}</tbody></table>
<h3>Relación entre presencia docente y aprendizaje percibido</h3>
<p>Correlación de Pearson r = <b>${f2(cor.r)}</b> (IC 95 %: ${f2(cor.lo)} a ${f2(cor.hi)}; n = ${cor.n}). Por cada punto adicional en presencia docente, el aprendizaje percibido aumenta en promedio ${f2(cor.pendiente)} puntos.</p>
<table class="t"><thead><tr><th>Tipo de asignatura</th><th class="n">n</th><th class="n">Frecuencia</th><th class="n">Presencia</th><th class="n">Aprendizaje</th></tr></thead><tbody>
${por.map(p => `<tr><td>${esc(p.l)}</td><td class="n">${p.n}</td><td class="n">${f2(p.F)}</td><td class="n">${f2(p.D)}</td><td class="n">${f2(p.A)}</td></tr>`).join('')}</tbody></table></section>

<section class="hoja"><h2><span>4</span>Resultados por ítem</h2>
<p class="intro">Porcentaje de respuestas en contra (1–2), neutrales (3) y a favor (4–5). En D6 no se cuenta «No aplica».</p>
<table class="t items"><thead><tr><th>Ítem</th><th>Indicador</th><th class="n">En contra</th><th class="n">Neutral</th><th class="n">A favor</th><th class="n">Media</th><th class="n">DE</th></tr></thead><tbody>
${it.map(x => `<tr${x.id === 'D1' || x.id === 'A1' ? ' class="grupo"' : ''}><td><b>${x.id}</b></td><td>${esc(x.ind)}<span class="stk"><i class="c1" style="width:${x.contra * 100}%"></i><i class="c3" style="width:${x.neutro * 100}%"></i><i class="c5" style="width:${x.favor * 100}%"></i></span></td><td class="n">${pc(x.contra)}</td><td class="n">${pc(x.neutro)}</td><td class="n"><b>${pc(x.favor)}</b></td><td class="n">${f2(x.mean)}</td><td class="n">${f2(x.sd)}</td></tr>`).join('')}</tbody></table></section>

<section class="hoja"><h2><span>5</span>Herramientas digitales utilizadas por los docentes</h2>
<p class="intro">Porcentaje de estudiantes que reportó cada herramienta (selección múltiple).</p>
<div class="g2">${['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].map(id => `<table class="t"><caption>${id}. ${esc(Q[id].ind)}</caption><tbody>${he.filter(h => h.id === id).sort((x, y) => y.p - x.p).map(h => `<tr><td>${esc(h.o)}${bar(h.p, 'var(--red)')}</td><td class="n"><b>${pc(h.p)}</b></td></tr>`).join('')}</tbody></table>`).join('')}</div>
<p>Variedad tecnológica media: <b>${f1(E.mean(a.map(r => r.H1_H5_total)))}</b> de 21 herramientas transversales y <b>${f1(E.mean(a.map(r => r.H6_total)))}</b> de 6 especializadas.</p></section>

<section class="hoja"><h2><span>6</span>Perfil de la muestra</h2><div class="g2">${['S3', 'S6', 'S4', 'S1', 'S2', 'S5'].map(perfilT).join('')}</div></section>

<section class="hoja"><h2><span>7</span>Calidad de los datos y notas metodológicas</h2>
<table class="t"><tbody>
<tr><td>No aprobaron el control de atención (CTRL1 ≠ 4)</td><td class="n">${comp.filter(r => +r.CTRL1_valido !== 1).length}</td><td class="n">${pc(comp.length ? comp.filter(r => +r.CTRL1_valido !== 1).length / comp.length : null)}</td></tr>
<tr><td>Respondieron en menos de ${CFG.minSegundos || 120} segundos</td><td class="n">${comp.filter(r => +r.flag_rapido === 1).length}</td><td class="n">${pc(comp.length ? comp.filter(r => +r.flag_rapido === 1).length / comp.length : null)}</td></tr>
<tr><td>Misma respuesta en todos los ítems Likert</td><td class="n">${comp.filter(r => +r.flag_lineal === 1).length}</td><td class="n">${pc(comp.length ? comp.filter(r => +r.flag_lineal === 1).length / comp.length : null)}</td></tr></tbody></table>
<ul class="notas"><li>Puntaje por dimensión: media de los ítems de cada persona; en D6, «No aplica» se trata como valor perdido.</li>
<li>Intervalos de confianza del 95 % para la media con distribución t; correlación con transformación de Fisher.</li>
<li>Omega de McDonald calculado con un modelo de un factor (factorización de ejes principales sobre la matriz de correlaciones de Pearson). Para el informe final se recomienda confirmarlo con análisis factorial confirmatorio en software especializado.</li>
<li>Los resultados describen a quienes respondieron; la generalización a toda la FTI depende del muestreo y la tasa de respuesta.</li></ul>
<h3>Cómo citar el instrumento</h3><p class="cita">${C ? C.cita() : ''}</p>
<p class="pie">Reporte generado automáticamente el ${fecha(new Date())} desde el dashboard del proyecto.</p></section>`;
  }

  // En pantallas angostas las hojas con tablas anchas se desplazan: se hacen accesibles por teclado.
  function enfocables() {
    document.querySelectorAll('.hoja').forEach(h => {
      const scroll = h.scrollWidth > h.clientWidth + 1;
      if (scroll) { h.tabIndex = 0; h.setAttribute('role', 'region'); h.setAttribute('aria-label', h.querySelector('h1,h2')?.textContent || 'Sección del reporte'); }
      else { h.removeAttribute('tabindex'); h.removeAttribute('role'); h.removeAttribute('aria-label'); }
    });
  }
  window.addEventListener('resize', enfocables);
  new MutationObserver(enfocables).observe(document.getElementById('reporte'), { childList: true });
  document.addEventListener('click', e => { if (e.target.closest('#b-print')) { try { window.print(); } catch (err) { /* vista previa sin impresión */ } } });
  window.CUHDA_REPORTE = { analisis, items, dims };
  cargar();
})();
