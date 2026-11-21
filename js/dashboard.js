/* Dashboard de resultados CUHDA-FTI v2.2 — lee la hoja de Google mediante Apps Script (con clave). */
(function () {
  'use strict';
  const CFG = window.CUHDA_CONFIG || {}, B = window.CUHDA_PREGUNTAS, E = window.CUHDA_ESTADISTICA;
  const ENDPOINT = String(window.__CUHDA_ENDPOINT_TEST__ || CFG.endpoint || '').trim();
  const KEY_CLAVE = 'cuhda-dashboard-clave';
  const Q = Object.fromEntries(B.ITEMS.map(q => [q.id, q]));
  const IDS = { F: ['F1', 'F2', 'F3', 'F4', 'F5'], D: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'], A: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'] };
  const DIM = [
    { k: 'F', nombre: 'Frecuencia de integración pedagógica', corto: 'Frecuencia', escala: 'Nunca → Siempre', color: 'var(--c-f)' },
    { k: 'D', nombre: 'Presencia docente mediada por herramientas', corto: 'Presencia docente', escala: 'Desacuerdo → Acuerdo', color: 'var(--c-d)' },
    { k: 'A', nombre: 'Aprendizaje percibido', corto: 'Aprendizaje', escala: 'Desacuerdo → Acuerdo', color: 'var(--c-a)' }
  ];
  const nf = new Intl.NumberFormat('es-SV', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  const n1 = new Intl.NumberFormat('es-SV', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const n0 = new Intl.NumberFormat('es-SV');
  const pc = v => (v === null || v === undefined || Number.isNaN(v)) ? '—' : Math.round(v * 100) + '%';
  const f2 = v => v === null || v === undefined ? '—' : nf.format(v).replace('-', '−');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = s => document.querySelector(s);
  const codes = q => q.o.map((o, i) => Array.isArray(o) ? o : [o, i + 1]);

  let RAW = [], fuente = 'ejemplo', actualizado = null, cargando = false;
  const F = { carrera: '', tipo: '', anio: '', validas: true, flags: false, piloto: false };
  let obs = [];
  let dl = null;

  /* ---------- carga de datos ---------- */
  const store = { get: k => { try { return sessionStorage.getItem(k) || ''; } catch (e) { return ''; } }, set: (k, v) => { try { v ? sessionStorage.setItem(k, v) : sessionStorage.removeItem(k); } catch (e) { /* sin almacenamiento */ } } };
  async function cargar(clave) {
    cargando = true; renderHero();
    try {
      const res = await fetch(`${ENDPOINT}?accion=datos&clave=${encodeURIComponent(clave)}`, { cache: 'no-store' });
      const j = await res.json();
      if (!j.ok) { cargando = false; if (j.error === 'clave') { store.set(KEY_CLAVE, ''); login('La clave no es correcta.'); } else login('El servidor respondió con un error: ' + esc(j.error)); return; }
      RAW = j.filas.map(f => Object.fromEntries(j.columnas.map((c, i) => [c, f[i]])));
      fuente = 'hoja'; actualizado = j.generado ? new Date(j.generado) : new Date(); store.set(KEY_CLAVE, clave);
    } catch (e) {
      cargando = false; login('No se pudo conectar con la hoja. Revise la URL en js/config.js y su conexión a internet.'); return;
    }
    cargando = false; render();
  }
  function ejemplo() { RAW = window.CUHDA_EJEMPLO.generar(B); fuente = 'ejemplo'; actualizado = new Date(); render(); }

  function login(msg) {
    $('#filtros').hidden = true;
    $('#hero').innerHTML = heroHTML(false);
    $('#contenido').innerHTML = `<section class="login"><form id="f-login" class="card">
<h2>Acceso al dashboard</h2><p class="mut">Escriba la clave que obtuvo al ejecutar <code>verClaveDashboard</code> en Apps Script. Se recuerda solo mientras esta pestaña esté abierta.</p>
<label for="clave">Clave</label><input id="clave" type="password" autocomplete="current-password" required minlength="6">
<p class="err" role="alert">${msg || ''}</p>
<div class="row"><button class="btn pri" type="submit">Ver resultados</button><button class="btn" type="button" id="b-ejemplo">Ver con datos de ejemplo</button></div></form></section>`;
    $('#clave').focus();
  }

  /* ---------- filtrado ---------- */
  function base() { return RAW.filter(r => F.piloto || +r.piloto !== 1); }
  function analisis() {
    return base().filter(r => +r.completo === 1
      && (!F.carrera || +r.S3 === +F.carrera) && (!F.tipo || +r.S6 === +F.tipo) && (!F.anio || +r.S4 === +F.anio)
      && (!F.validas || +r.CTRL1_valido === 1) && (!F.flags || (+r.flag_rapido !== 1 && +r.flag_lineal !== 1)));
  }
  const score = (r, k) => E.puntaje(r, IDS[k], { ceroEsPerdido: k === 'D' });

  /* ---------- encabezado ---------- */
  function heroHTML(conDatos, t) {
    const INST = Object.assign({ universidad: 'Universidad Dr. Andrés Bello', carrera: 'Licenciatura en Mercadeo Estratégico', facultad: 'Facultad de Ciencias Económicas' }, CFG.institucion || {});
    const logo = `<span class="word">${CFG.imagenes?.logo ? `<span class="hlogo"><img src="${esc(CFG.imagenes.logo)}" alt="" onerror="this.parentNode.remove()"></span>` : ''}<span><b>${esc(INST.universidad)}</b><span>${esc(INST.carrera)} · ${esc(INST.facultad)}</span></span></span>`;
    const I = (window.CUHDA_ICONOS || { icono: () => '' }).icono;
    const eq = `<button class="btn ghost" data-dialogo="equipo" aria-label="Equipo">${I('users')}<span>Equipo</span></button><button class="btn ghost" data-dialogo="compartir" aria-label="Compartir">${I('qr-code')}<span>Compartir</span></button>`;
    const acciones = !conDatos ? `<div class="acts">${eq}</div>` : `<div class="acts">${eq}<button class="btn light" id="b-act" aria-label="Actualizar"${fuente !== 'hoja' ? ' hidden' : ''}>${I('refresh-cw')}<span>${cargando ? 'Actualizando…' : 'Actualizar'}</span></button><button class="btn light" id="b-csv" aria-label="Exportar CSV">${I('file-spreadsheet')}<span>Exportar CSV</span></button>${fuente === 'hoja' ? `<button class="btn ghost" id="b-salir" aria-label="Salir">${I('log-out')}<span>Salir</span></button>` : ''}</div>`;
    return `<div class="wrap"><div class="hbar">${logo}${acciones}</div>${t || '<h1>Resultados de la encuesta CUHDA-FTI v2.2</h1>'}</div>`;
  }
  function renderHero(a) {
    if (!a) { const b = $('#b-act span'); if (b) b.textContent = cargando ? 'Actualizando…' : 'Actualizar'; return; }
    const sA = E.ciMean(a.map(r => score(r, 'A'))), cor = E.pearson(a.map(r => score(r, 'D')), a.map(r => score(r, 'A')));
    const fuerza = r => Math.abs(r) >= 0.5 ? 'fuerte' : Math.abs(r) >= 0.3 ? 'moderada' : Math.abs(r) >= 0.1 ? 'débil' : 'casi nula';
    const h1 = a.length < 5 ? '<h1>Aún no hay suficientes respuestas válidas para analizar</h1>'
      : `<h1>Aprendizaje percibido de ${n1.format(sA.mean)} sobre 5, con una relación ${fuerza(cor.r)} con la presencia docente (r = ${f2(cor.r)})</h1>`;
    const fecha = actualizado ? actualizado.toLocaleString('es-SV', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    $('#hero').innerHTML = heroHTML(true, `${h1}<p class="sub">${n0.format(a.length)} respuestas analizadas de ${n0.format(base().length)} recibidas · ${fuente === 'hoja' ? 'actualizado ' + fecha : 'datos de ejemplo simulados'}</p>`);
  }

  /* ---------- filtros ---------- */
  function renderFiltros() {
    const sel = (id, lbl, q, v) => `<label class="fsel"><span>${lbl}</span><select id="${id}"><option value="">Todas</option>${codes(Q[q]).map(([l, c]) => `<option value="${c}"${+v === c ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
    const chk = (id, lbl, v, tip) => `<label class="fchk" title="${tip}"><input type="checkbox" id="${id}"${v ? ' checked' : ''}><span>${lbl}</span></label>`;
    const el = $('#filtros'); el.hidden = false;
    el.innerHTML = `<div class="wrap frow">${sel('f-carrera', 'Carrera', 'S3', F.carrera)}${sel('f-tipo', 'Tipo de asignatura', 'S6', F.tipo)}${sel('f-anio', 'Año', 'S4', F.anio)}
<div class="fchks">${chk('f-validas', 'Solo control de atención aprobado', F.validas, 'Excluye a quien no marcó «De acuerdo» en CTRL1')}${chk('f-flags', 'Excluir respuestas rápidas o en línea recta', F.flags, 'flag_rapido = 1 o flag_lineal = 1')}${chk('f-piloto', 'Incluir piloto', F.piloto, 'Respuestas con piloto = 1')}</div></div>`;
  }

  /* ---------- componentes ---------- */
  const barRows = (items, color) => `<div class="bars">${items.map(it => `<div class="brow"><span class="bl">${esc(it.l)}</span><span class="btrack"><i style="width:${Math.max(0, it.p * 100)}%;background:${it.c || color}"></i></span><b class="bv">${pc(it.p)}</b><span class="bn">${n0.format(it.n)}</span></div>`).join('')}</div>`;

  function kpis(a) {
    const b = base(), cons = b.filter(r => +r.FIL1 === 1), eleg = cons.filter(r => +r.FIL2 === 1), comp = b.filter(r => +r.completo === 1);
    const dur = E.median(comp.map(r => r.duracion_seg)), marc = comp.filter(r => +r.CTRL1_valido !== 1 || +r.flag_rapido === 1 || +r.flag_lineal === 1).length;
    const k = [
      ['Respuestas recibidas', n0.format(b.length), `${pc(b.length ? cons.length / b.length : null)} aceptó participar`],
      ['Elegibles', n0.format(eleg.length), `${pc(cons.length ? eleg.length / cons.length : null)} de quienes aceptaron`],
      ['Completas', n0.format(comp.length), `${pc(eleg.length ? comp.length / eleg.length : null)} de las elegibles`],
      ['Analizadas', n0.format(a.length), 'con los filtros actuales'],
      ['Duración mediana', dur ? `${Math.floor(dur / 60)} min ${String(Math.round(dur % 60)).padStart(2, '0')} s` : '—', 'en respuestas completas'],
      ['Casos a revisar', n0.format(marc), `${pc(comp.length ? marc / comp.length : null)} con alguna alerta de calidad`]
    ];
    return `<section class="kpis" aria-label="Indicadores principales">${k.map(([l, v, s]) => `<div class="kpi"><span class="kl">${l}</span><b class="kv">${v}</b><span class="ks">${s}</span></div>`).join('')}</section>`;
  }

  function dimensiones(a) {
    return `<section class="sec"><div class="sh"><h2>Las tres dimensiones, en promedio</h2><p>Puntaje medio por persona (1 a 5) con su intervalo de confianza del 95 % y la confiabilidad interna de cada escala (alfa de Cronbach).</p></div>
<div class="dims">${DIM.map(d => {
      const ci = E.ciMean(a.map(r => score(r, d.k)));
      const filas = (d.k === 'D' ? a.filter(r => +r.D6 > 0) : a).map(r => IDS[d.k].map(id => r[id]));
      const al = E.cronbach(filas);
      const x = v => ((v - 1) / 4 * 100);
      return `<article class="card dim" style="--dc:${d.color}"><h3>${d.nombre}</h3>
<p class="big">${ci ? n1.format(ci.mean) : '—'}<span> / 5</span></p>
<div class="scale" role="img" aria-label="Media ${ci ? n1.format(ci.mean) : '—'} en escala de 1 a 5">${ci ? `<i class="ci" style="left:${x(ci.lo)}%;width:${x(ci.hi) - x(ci.lo)}%"></i><i class="pt" style="left:${x(ci.mean)}%"></i>` : ''}</div>
<div class="ticks"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>
<p class="mut small">IC 95 %: ${ci ? `${f2(ci.lo)} a ${f2(ci.hi)}` : '—'} · ${d.escala}</p>
<p class="alpha"><b>α = ${f2(al.alpha)}</b> · ${E.alphaLabel(al.alpha)} <span class="mut">(${IDS[d.k].length} ítems, n = ${al.n}${d.k === 'D' ? ', sin «No aplica»' : ''})</span></p></article>`;
    }).join('')}</div></section>`;
  }

  function relacion(a) {
    const xs = a.map(r => score(r, 'D')), ys = a.map(r => score(r, 'A')), c = E.pearson(xs, ys);
    const por = codes(Q.S6).map(([l, code]) => {
      const g = a.filter(r => +r.S6 === code);
      return { l, n: g.length, D: E.mean(g.map(r => score(r, 'D'))), A: E.mean(g.map(r => score(r, 'A'))), F: E.mean(g.map(r => score(r, 'F'))) };
    });
    const lect = c.r === null ? 'Faltan datos para estimar la relación.' :
      `Por cada punto más en presencia docente, el aprendizaje percibido sube en promedio ${f2(c.pendiente)} puntos. La correlación es ${c.r >= 0 ? 'positiva' : 'negativa'} (IC 95 %: ${f2(c.lo)} a ${f2(c.hi)}; n = ${c.n}) y describe asociación, no causalidad.`;
    const x = v => v === null ? 0 : ((v - 1) / 4 * 100);
    return `<section class="sec"><div class="sh"><h2>Presencia docente y aprendizaje percibido</h2><p>${lect}</p></div>
<div class="g-rel"><div class="card"><div class="fig" id="scatter" role="img" aria-label="Dispersión: presencia docente frente a aprendizaje percibido, r = ${f2(c.r)}"><svg></svg></div></div>
<div class="card"><h3>Por tipo de asignatura</h3><p class="mut small">Media de cada dimensión (1 a 5)</p>
<div class="dots-legend">${DIM.map(d => `<span><i style="background:${d.color}"></i>${d.corto}</span>`).join('')}</div>
${por.map(p => `<div class="drow"><span class="dl">${esc(p.l)} <span class="mut">n = ${p.n}</span></span><span class="dtrack">${DIM.map(d => p[d.k] === null ? '' : `<i style="left:${x(p[d.k])}%;background:${d.color}" title="${d.corto}: ${f2(p[d.k])}"></i>`).join('')}</span><span class="dv">${DIM.map(d => `<b style="color:${d.color}">${p[d.k] === null ? '—' : n1.format(p[d.k])}</b>`).join(' ')}</span></div>`).join('')}
<div class="ticks pad"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div></div></div></section>`;
  }
  function drawScatter(a) {
    const box = $('#scatter'); if (!box) return;
    const svg = box.querySelector('svg');
    const pts = a.map(r => [score(r, 'D'), score(r, 'A')]).filter(p => p[0] !== null && p[1] !== null);
    const c = E.pearson(pts.map(p => p[0]), pts.map(p => p[1]));
    let s = 7; const jit = () => ((s = s * 16807 % 2147483647) / 2147483647 - 0.5) * 0.12;
    const J = pts.map(p => [p[0] + jit(), p[1] + jit()]);
    const draw = () => {
      const W = svg.clientWidth, H = svg.clientHeight; if (!W || !H) return;
      const m = { l: 48, r: 16, t: 16, b: 48 }, X = v => m.l + (v - 0.8) / 4.4 * (W - m.l - m.r), Y = v => H - m.b - (v - 0.8) / 4.4 * (H - m.t - m.b);
      const ticks = [1, 2, 3, 4, 5];
      let g = ticks.map(t => `<line x1="${X(t)}" x2="${X(t)}" y1="${m.t}" y2="${H - m.b}" class="grid"/><line y1="${Y(t)}" y2="${Y(t)}" x1="${m.l}" x2="${W - m.r}" class="grid"/><text x="${X(t)}" y="${H - m.b + 18}" text-anchor="middle">${t}</text><text x="${m.l - 10}" y="${Y(t) + 4}" text-anchor="end">${t}</text>`).join('');
      g += `<text x="${(m.l + W - m.r) / 2}" y="${H - 8}" text-anchor="middle" class="ax">Presencia docente (media D1–D6)</text><text transform="translate(14 ${(m.t + H - m.b) / 2}) rotate(-90)" text-anchor="middle" class="ax">Aprendizaje (media A1–A6)</text>`;
      g += J.map(p => `<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="${W < 520 ? 3.2 : 4}" class="pt"/>`).join('');
      if (c.r !== null) { const x1 = 1, x2 = 5; g += `<line x1="${X(x1)}" y1="${Y(c.intercepto + c.pendiente * x1)}" x2="${X(x2)}" y2="${Y(c.intercepto + c.pendiente * x2)}" class="fit"/><text x="${W - m.r - 6}" y="${m.t + 18}" text-anchor="end" class="ann">r = ${f2(c.r)} · n = ${c.n}</text>`; }
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.innerHTML = g;
    };
    const ro = new ResizeObserver(draw); ro.observe(svg); obs.push(ro);
  }

  function likert(a) {
    const bloque = (k, titulo, etiquetas) => {
      const filas = IDS[k].concat(k === 'D' ? [] : []).map(id => {
        const v = a.map(r => E.num(r[id])).filter(x => x !== null);
        const na = v.filter(x => x === 0).length, val = v.filter(x => x >= 1);
        const fr = [1, 2, 3, 4, 5].map(c => val.length ? val.filter(x => x === c).length / val.length : 0);
        const neg = fr[0] + fr[1] + fr[2] / 2;
        return { id, ind: Q[id].ind, q: Q[id].q, fr, neg, mean: E.mean(val), n: val.length, na: v.length ? na / v.length : 0 };
      });
      const S = 50 / Math.max(0.5, ...filas.map(f => Math.max(f.neg, 1 - f.neg)));
      return `<div class="card lk"><h3>${titulo}</h3><div class="lk-legend" aria-hidden="true">${etiquetas.map((l, i) => `<span><i class="c${i + 1}"></i>${l}</span>`).join('')}</div>
${filas.map(f => `<div class="lrow"><span class="ll" title="${esc(f.q)}"><b>${f.id}</b> ${esc(f.ind)}${f.na ? ` <span class="mut">(${pc(f.na)} no aplica)</span>` : ''}</span>
<span class="lneg">${pc(f.fr[0] + f.fr[1])}</span><span class="ltrack" role="img" aria-label="${f.id}: ${pc(f.fr[0] + f.fr[1])} en contra, ${pc(f.fr[2])} neutral, ${pc(f.fr[3] + f.fr[4])} a favor"><span class="lbar" style="margin-left:${50 - f.neg * S}%">${f.fr.map((p, i) => `<i class="c${i + 1}" style="width:${p * S}%"></i>`).join('')}</span></span>
<span class="lpos">${pc(f.fr[3] + f.fr[4])}</span><b class="lm">${f.mean === null ? '—' : n1.format(f.mean)}</b></div>`).join('')}</div>`;
    };
    return `<section class="sec"><div class="sh"><h2>Respuestas por ítem</h2><p>Las barras se centran en la opción neutral: a la izquierda el desacuerdo (o «nunca»), a la derecha el acuerdo (o «siempre»). A la derecha, la media del ítem.</p></div>
<div class="lk-head" aria-hidden="true"><span></span><span>En contra</span><span></span><span>A favor</span><span>Media</span></div>
${bloque('F', 'Frecuencia de integración pedagógica', B.ESCALAS.F)}${bloque('D', 'Presencia docente', B.ESCALAS.A)}${bloque('A', 'Aprendizaje percibido', B.ESCALAS.A)}</section>`;
  }

  function herramientas(a) {
    const panel = id => {
      const q = Q[id], n = a.length;
      const items = q.o.map((l, j) => ({ l, n: a.filter(r => +r[`${id}_${j + 1}`] === 1).length })).map(it => ({ ...it, p: n ? it.n / n : 0 })).sort((x, y) => y.p - x.p);
      const ning = a.filter(r => +r[id + '_ninguna'] === 1).length, otra = a.filter(r => String(r[id + '_otra'] || '').trim()).length;
      return `<div class="card"><h3>${esc(q.ind)}</h3>${barRows(items, 'var(--blue)')}<p class="mut small">Ninguna: ${pc(n ? ning / n : null)} · Otra: ${pc(n ? otra / n : null)}</p></div>`;
    };
    const v = a.map(r => E.num(r.H1_H5_total)).filter(x => x !== null), mx = 21;
    const hist = Array.from({ length: mx + 1 }, (_, i) => v.filter(x => x === i).length), top = Math.max(1, ...hist);
    const mv = E.mean(v);
    return `<section class="sec"><div class="sh"><h2>Herramientas digitales que usan sus docentes</h2><p>Porcentaje de estudiantes que marcó cada herramienta. En promedio se marcan ${mv === null ? '—' : n1.format(mv)} de 21 herramientas transversales (H1–H5) y ${n1.format(E.mean(a.map(r => r.H6_total)) ?? 0)} de 6 especializadas (H6).</p></div>
<div class="g-herr">${['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].map(panel).join('')}</div>
<div class="card"><h3>Variedad tecnológica transversal (H1–H5)</h3><p class="mut small">Cuántas de las 21 opciones marcó cada estudiante</p>
<div class="hist" role="img" aria-label="Distribución de la variedad tecnológica, media ${mv === null ? '—' : n1.format(mv)}">${hist.map((h, i) => `<span title="${i} herramientas: ${h} estudiantes"><i style="height:${h / top * 100}%"></i></span>`).join('')}</div>
<div class="hx"><span>0</span><span>5</span><span>10</span><span>15</span><span>21</span></div></div></section>`;
  }

  function perfil(a) {
    const panel = id => {
      const fr = E.frecuencias(a.map(r => r[id]), codes(Q[id]).map(c => c[1]));
      return `<div class="card"><h3>${esc(Q[id].ind)}</h3>${barRows(codes(Q[id]).map(([l], i) => ({ l, p: fr[i].pct, n: fr[i].n })), 'var(--gold-bar)')}</div>`;
    };
    return `<section class="sec"><div class="sh"><h2>Perfil de quienes respondieron</h2><p>Distribución de la muestra analizada (n = ${n0.format(a.length)}).</p></div><div class="g-perfil">${['S3', 'S6', 'S4', 'S1', 'S2', 'S5'].map(panel).join('')}</div></section>`;
  }

  function calidad(a) {
    const b = base(), comp = b.filter(r => +r.completo === 1);
    const dias = {};
    b.forEach(r => { const d = String(r.inicio || r.recibido || '').slice(0, 10); if (d) dias[d] = (dias[d] || 0) + 1; });
    const keys = Object.keys(dias).sort();
    let serie = [];
    if (keys.length) { for (let t = Date.parse(keys[0]); t <= Date.parse(keys[keys.length - 1]); t += 864e5) { const k = new Date(t).toISOString().slice(0, 10); serie.push([k, dias[k] || 0]); } }
    const top = Math.max(1, ...serie.map(s => s[1]));
    const fmtD = k => new Date(k + 'T12:00:00Z').toLocaleDateString('es-SV', { day: 'numeric', month: 'short' });
    const q = [['No aprobó el control de atención (CTRL1 ≠ 4)', comp.filter(r => +r.CTRL1_valido !== 1).length],
      ['Respondió en menos de ' + (CFG.minSegundos || 120) + ' segundos', comp.filter(r => +r.flag_rapido === 1).length],
      ['Misma respuesta en todos los ítems Likert', comp.filter(r => +r.flag_lineal === 1).length],
      ['Marcó «No aplica» en D6', comp.filter(r => +r.D6 === 0 && r.D6 !== '').length]];
    const CAN = { qr: 'Código QR', whatsapp: 'WhatsApp', facebook: 'Facebook', linkedin: 'LinkedIn', telegram: 'Telegram', x: 'X', correo: 'Correo', enlace: 'Enlace copiado', nativo: 'Compartir del celular', directo: 'Directo / sin marca' };
    const cnt = {}; b.forEach(r => { const k = String(r.canal || 'directo'); cnt[k] = (cnt[k] || 0) + 1; });
    const canales = Object.entries(cnt).sort((x, y) => y[1] - x[1]).map(([k, v]) => ({ l: CAN[k] || k, n: v, p: b.length ? v / b.length : 0 }));
    const emb = [['Recibidas', b.length], ['Aceptaron participar', b.filter(r => +r.FIL1 === 1).length], ['Elegibles', b.filter(r => +r.FIL2 === 1).length], ['Completas', comp.length], ['Analizadas', a.length]];
    return `<section class="sec"><div class="sh"><h2>Participación y calidad de los datos</h2><p>Todas las respuestas recibidas${F.piloto ? ', incluido el piloto' : ''}, antes de aplicar filtros de carrera, tipo o año.</p></div>
<div class="g-cal"><div class="card"><h3>Respuestas por día</h3>${serie.length ? `<div class="days" role="img" aria-label="Respuestas por día">${serie.map(([k, v]) => `<span title="${fmtD(k)}: ${v}"><i style="height:${v / top * 100}%"></i></span>`).join('')}</div><div class="hx"><span>${fmtD(serie[0][0])}</span><span>${fmtD(serie[serie.length - 1][0])}</span></div>` : '<p class="mut">Sin datos.</p>'}</div>
<div class="card"><h3>Canal de difusión</h3><p class="mut small">De dónde llegaron las respuestas (enlaces de «Compartir»)</p>${barRows(canales, 'var(--red)')}</div>
<div class="card"><h3>Embudo de participación</h3>${barRows(emb.map(([l, v]) => ({ l, n: v, p: emb[0][1] ? v / emb[0][1] : 0 })), 'var(--blue)')}</div>
<div class="card"><h3>Alertas de calidad</h3><table class="qt"><tbody>${q.map(([l, v]) => `<tr><td>${l}</td><td class="num">${n0.format(v)}</td><td class="num mut">${pc(comp.length ? v / comp.length : null)}</td></tr>`).join('')}</tbody></table><p class="mut small">Porcentajes sobre ${n0.format(comp.length)} respuestas completas.</p></div></div></section>`;
  }

  /* ---------- render ---------- */
  function render() {
    obs.forEach(o => o.disconnect()); obs = [];
    const a = analisis();
    renderHero(a); renderFiltros();
    const aviso = fuente === 'ejemplo' ? `<p class="banner">Está viendo <b>datos de ejemplo simulados</b>. ${ENDPOINT ? '<button class="link" id="b-login">Entrar con la clave</button> para ver las respuestas reales.' : 'Conecte la hoja de Google en js/config.js para ver las respuestas reales.'}</p>` : '';
    const vacio = a.length < 5 ? `<div class="card empty"><h2>Pocas respuestas con estos filtros</h2><p>Hay ${a.length} respuestas que cumplen los filtros. Amplíe la selección para ver los análisis.</p></div>` : '';
    $('#contenido').innerHTML = `<div class="wrap">${aviso}${kpis(a)}${vacio || dimensiones(a) + relacion(a) + likert(a) + herramientas(a) + perfil(a)}${calidad(a)}</div>`;
    const C = window.CUHDA_CREDITOS;
    $('#pie').innerHTML = `<div class="wrap pie-g"><div><h2>Cómo citar el instrumento</h2><p class="cita-pie">${C ? C.cita() : ''}</p>
<p><button class="link" data-dialogo="equipo">Ver créditos y equipo de investigación</button> · <button class="link" data-dialogo="privacidad">Privacidad y uso de datos</button></p></div>
<div><h2>Notas metodológicas</h2><p>Puntaje por dimensión: media de los ítems de cada persona (en D6, «No aplica» no se cuenta). Alfa de Cronbach y correlación de Pearson con casos completos; intervalos de confianza del 95 %. Por defecto se excluyen las respuestas que no aprobaron el ítem de control CTRL1.</p></div></div>`;
    if (a.length >= 5) drawScatter(a);
  }

  function csv() {
    const a = analisis(); if (!a.length) return;
    const cols = Object.keys(a[0]);
    const cell = v => { const s = String(v ?? ''); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const txt = '﻿' + [cols.join(','), ...a.map(r => cols.map(c => cell(r[c])).join(','))].join('\n');
    const name = `cuhda-fti-${fuente}-${new Date().toISOString().slice(0, 10)}.csv`;
    if (dl) { dl.save({ filename: name, data: txt }).catch(() => {}); return; }
    try { const u = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' })), l = document.createElement('a'); l.href = u; l.download = name; document.body.append(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 3000); } catch (e) { /* sin descarga */ }
  }

  /* ---------- eventos ---------- */
  document.addEventListener('change', e => {
    const t = e.target, m = { 'f-carrera': 'carrera', 'f-tipo': 'tipo', 'f-anio': 'anio', 'f-validas': 'validas', 'f-flags': 'flags', 'f-piloto': 'piloto' }[t.id];
    if (!m) return; F[m] = t.type === 'checkbox' ? t.checked : t.value; render(); document.getElementById(t.id)?.focus();
  });
  document.addEventListener('submit', e => { if (e.target.id === 'f-login') { e.preventDefault(); const c = $('#clave').value.trim(); if (c) cargar(c); } });
  document.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'b-ejemplo') ejemplo();
    else if (b.id === 'b-login') login('');
    else if (b.id === 'b-act') { const c = store.get(KEY_CLAVE); if (c) cargar(c); }
    else if (b.id === 'b-salir') { store.set(KEY_CLAVE, ''); RAW = []; login(''); }
    else if (b.id === 'b-csv') csv();
  });
  setInterval(() => { if (fuente === 'hoja' && !document.hidden && !cargando) { const c = store.get(KEY_CLAVE); if (c) cargar(c); } }, 5 * 60 * 1000);

  /* ---------- arranque ---------- */
  try { window.claude?.use?.('downloads')?.then(d => { dl = d; }).catch(() => {}); } catch (e) { /* fuera de Claude */ }
  window.CUHDA_DASH = { analisis, get RAW() { return RAW; }, F };
  if (!ENDPOINT) ejemplo();
  else { const c = store.get(KEY_CLAVE); if (c) cargar(c); else login(''); }
})();
