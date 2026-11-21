/* Encuesta CUHDA-FTI — motor de la encuesta. No necesita editar este archivo. */
(function () {
  'use strict';
  const CFG = window.CUHDA_CONFIG || {};
  const B = window.CUHDA_PREGUNTAS;
  // En las pruebas automáticas se fija un endpoint falso (o vacío = demostración) para no tocar la hoja real.
  const ENDPOINT = String(window.__CUHDA_ENDPOINT_TEST__ !== undefined ? window.__CUHDA_ENDPOINT_TEST__ : (CFG.endpoint || '')).trim();
  const VERSION = CFG.version || 'CUHDA-FTI v2.2';
  const MIN_SEG = +CFG.minSegundos || 120;
  const STORE = 'cuhda-fti-v22-estado', PEND = 'cuhda-fti-v22-pendientes', SCHEMA = 2;
  const PILOTO = /[?&]piloto=1(&|$)/.test(location.search) ? 1 : 0;
  const QS = new URLSearchParams(location.search);
  const CANAL_URL = (QS.get('utm_source') || QS.get('canal') || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 30);
  const ITEMS = B.ITEMS;
  const SEC = Object.fromEntries(B.SECCIONES.map(s => [s.key, s]));
  const SEGS = B.SECCIONES.filter(s => s.key !== 'inicio').map(s => ({ ...s, n: ITEMS.filter(i => i.sec === s.key).length }));
  const LIKERT = ITEMS.filter(i => i.t === 'lik' && !i.control).map(i => i.id);

  const SCREENS = ['welcome'];
  { let prev = null; for (const it of ITEMS) { if (it.sec !== prev && SEC[it.sec].intro) SCREENS.push({ t: 'intro', sec: it.sec }); SCREENS.push(it); prev = it.sec; } }
  SCREENS.push('submit');
  const END = SCREENS.length;

  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const codes = q => q.o.map((o, i) => Array.isArray(o) ? o : [o, i + 1]);
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fresh = () => ({ v: SCHEMA, i: 0, A: {}, rid: uid(), start: null, end: null, resume: 0, canal: CANAL_URL || 'directo' });

  let st = fresh(), timer = null, sending = false;
  const IMG = { logo: false, portada: false, cierre: false };

  /* ---------- almacenamiento ---------- */
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v ?? d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* modo privado: la encuesta sigue sin guardar */ } }
  };
  const save = () => { store.set(STORE, st); window.claude?.hot?.snapshot?.(() => st); };

  /* ---------- identidad e iconos ---------- */
  const IC = window.CUHDA_ICONOS || { icono: () => '', marca: () => '' };
  const I = (n, c) => IC.icono(n, c);
  const INST = Object.assign({ universidad: 'Universidad Dr. Andrés Bello', carrera: 'Licenciatura en Mercadeo Estratégico', facultad: 'Facultad de Ciencias Económicas' }, CFG.institucion || {});
  const SEC_ICON = { inicio: 'shield-check', perfil: 'user-round', herr: 'laptop', frec: 'calendar-check', pres: 'school', apr: 'lightbulb' };
  const ITEM_ICON = { H1: 'video', H2: 'messages-square', H3: 'folder-open', H4: 'presentation', H5: 'clipboard-check', H6: 'code-xml' };
  const CHECK = I('check');
  const brandBlock = () => `<span class="brand">${IMG.logo ? `<span class="logo-badge"><img class="logo" src="${esc(CFG.imagenes.logo)}" alt=""></span>` : '<b class="mono">UNAB</b>'}<span class="bt"><b>${esc(INST.universidad)}</b><span>${esc(INST.carrera)}</span></span></span>`;

  /* ---------- utilidades de estado ---------- */
  const answered = q => {
    const a = st.A[q.id];
    if (q.t === 'multi') return !!a && (a.none || a.sel.length > 0 || a.oc) && (!a.oc || a.otra.trim().length > 0);
    return a !== undefined && a !== null;
  };
  const anchor = () => { const a = st.A.S6, q = ITEMS.find(i => i.ancla); return a ? (codes(q).find(c => c[1] === a) || [])[0] : ''; };
  const itemIndex = i => { for (let k = i; k >= 0; k--) { const s = SCREENS[k]; if (typeof s === 'object' && s.t !== 'intro') return ITEMS.indexOf(s); } return -1; };

  /* ---------- vistas ---------- */
  function header() {
    const s = st.i >= END ? 'end' : SCREENS[st.i];
    const inSurvey = typeof s === 'object' || s === 'submit';
    let segs = '';
    if (inSurvey) {
      const ii = s === 'submit' ? ITEMS.length : itemIndex(st.i);
      const cur = typeof s === 'object' ? s.sec : null;
      segs = `<div class="segs" aria-hidden="true">${SEGS.map(g => {
        const first = ITEMS.findIndex(x => x.sec === g.key);
        const done = Math.max(0, Math.min(g.n, s === 'submit' ? g.n : ii - first));
        return `<div class="seg${cur === g.key ? ' on' : ''}${done === g.n ? ' ok' : ''}" style="flex-grow:${g.n}"><i style="width:${done / g.n * 100}%"></i><span>${I(SEC_ICON[g.key])}${g.nombre}</span></div>`;
      }).join('')}</div>`;
    }
    const q = typeof s === 'object' && s.t !== 'intro' ? ITEMS.indexOf(s) + 1 : 0;
    const left = q ? ITEMS.length - q + 1 : 0;
    const count = q ? `<span class="count"><b>${q}</b>/${ITEMS.length}<span class="eta"> · ${left <= 3 ? 'casi termina' : `≈ ${Math.max(1, Math.round(left * 14 / 60))} min`}</span></span>` : '';
    // Equipo y Compartir están disponibles en todas las pantallas.
    const right = `<div class="hacts">${count}<button type="button" class="hbtn" data-dialogo="equipo" aria-label="Equipo de investigación">${I('users')}<span>Equipo</span></button><button type="button" class="hbtn" data-dialogo="compartir" aria-label="Compartir la encuesta">${I('share-2')}<span>Compartir</span></button></div>`;
    $('#top').innerHTML = `<div class="bar">${brandBlock()}${right}</div>${segs}`;
  }

  function phone() {
    return `<div class="mock" aria-hidden="true">
<div class="phone"><div class="notch"></div><div class="scr">
<div class="m-top"><span class="m-logo">${IMG.logo ? `<img src="${esc(CFG.imagenes.logo)}" alt="">` : ''}</span><span class="m-n">23/32</span></div>
<div class="m-bar"><i></i></div>
<span class="m-chip">${I('school')}Presencia docente</span>
<p class="m-q">Mi docente utiliza herramientas digitales para promover mi participación activa en la clase.</p>
<span class="m-o"><b>2</b>En desacuerdo</span><span class="m-o"><b>3</b>Ni de acuerdo ni en desacuerdo</span><span class="m-o on"><b>4</b>De acuerdo</span><span class="m-o"><b>5</b>Totalmente de acuerdo</span>
<span class="m-btn">Continuar</span></div></div>
<span class="float f1">${I('clock')}<b>8 min</b></span><span class="float f2">${I('shield-check')}<b>100 % anónima</b></span><span class="float f3">${I('list-checks')}<b>${ITEMS.length} preguntas</b></span>
</div>`;
  }

  function welcome() {
    const resume = Object.keys(st.A).length > 0;
    const photo = IMG.portada ? ` style="--foto:url('${esc(CFG.imagenes.portada)}')"` : '';
    const contact = CFG.contacto ? `<p class="contact">${I('mail')}¿Dudas sobre el estudio? <a href="mailto:${esc(CFG.contacto)}">${esc(CFG.contacto)}</a></p>` : '';
    return `<section class="wel${IMG.portada ? ' con-foto' : ''}"${photo}><div class="wel-in">
<div class="wel-txt in">
<p class="kicker">${I('megaphone')}<span>Estudio de la ${esc(INST.carrera)} · UNAB</span></p>
<h1 id="qt" tabindex="-1">¿Cómo usan sus docentes las <em>herramientas digitales</em> en clases virtuales?</h1>
<p class="lead">Encuesta dirigida a ${esc(INST.poblacion || 'estudiantes de la FTI')}. Su opinión nos ayuda a entender qué funciona en el aprendizaje virtual. Ciclo ${esc(CFG.ciclo || '2025–2026')}.</p>
<ul class="facts">
<li><span class="fi">${I('target')}</span><span><b>Objetivo</b>Conocer cómo se integran las herramientas digitales y cómo percibe su aprendizaje.</span></li>
<li><span class="fi">${I('clock')}</span><span><b>8 minutos</b>${ITEMS.length} preguntas breves; su avance se guarda solo.</span></li>
<li><span class="fi">${I('shield-check')}</span><span><b>Anónima</b>Sin nombre, carné ni correo. Resultados solo en conjunto.</span></li>
<li><span class="fi">${I('hand-heart')}</span><span><b>Voluntaria</b>Puede dejarla cuando quiera, sin consecuencias.</span></li>
</ul>${contact}
<div class="cta"><button class="go" id="start">${resume ? 'Continuar donde quedé' : 'Comenzar encuesta'}${I('arrow-right')}</button>${resume ? '<button class="ghost" id="restart">Empezar de nuevo</button>' : ''}</div>
<p class="wlinks"><button type="button" class="wl" data-dialogo="compartir">${I('share-2')}Compartir</button><button type="button" class="wl" data-dialogo="equipo">${I('users')}Equipo de investigación</button><button type="button" class="wl" data-dialogo="privacidad">${I('lock')}Privacidad</button>${CFG.aprobacionEtica ? `<span class="wl-t">${I('shield-check')}Aprobación ${esc(CFG.aprobacionEtica)}</span>` : ''}</p>
${PILOTO ? `<p class="pilot">${I('info')}Modo piloto: las respuestas se marcarán como prueba.</p>` : ''}
</div>${phone()}</div></section>`;
  }

  function intro(s) {
    const g = SEC[s.sec], n = ITEMS.filter(i => i.sec === s.sec).length, k = SEGS.findIndex(x => x.key === s.sec) + 1;
    const a = s.sec === 'herr' && anchor() ? `<p class="anchor-big">${I('graduation-cap')}<span>Su asignatura de referencia: <b>${esc(anchor().toLowerCase())}</b></span></p>` : '';
    return `<div class="stage intro in"><div class="ic">${I(SEC_ICON[s.sec])}</div><p class="chip">Bloque ${k} de ${SEGS.length} · ${esc(g.nombre)}</p>
<h1 class="q" id="qt" tabindex="-1">${esc(g.intro)}</h1><p class="help">${esc(g.texto)}</p>${a}
<p class="meta"><span>${I('list-checks')}${n} preguntas</span><span>${I('clock')}≈ ${Math.max(1, Math.round(n * 14 / 60))} min</span></p></div>`;
  }

  function opt(label, on, key, attr, extra) {
    const multi = attr.includes('data-m');
    return `<button type="button" data-key="${key}" class="opt${extra || ''}" role="${multi ? 'checkbox' : 'radio'}" aria-checked="${on}" ${attr}><span class="k" aria-hidden="true">${on && multi ? CHECK : key}</span><span class="lbl">${esc(label)}</span></button>`;
  }

  function question(q) {
    const a = st.A[q.id], L = 'ABCDEFGHI';
    const ancla = (q.t === 'multi' || q.t === 'lik') && anchor() ? `<span class="anchor">${I('graduation-cap')}${esc(anchor().toLowerCase())}</span>` : '';
    let body = '', help = 'Elija una opción.';
    if (q.t === 'single') {
      body = `<div class="opts" role="radiogroup" aria-labelledby="qt">${codes(q).map(([l, c], i) => opt(l, a === c, L[i], `data-v="${c}"`)).join('')}</div>`;
    } else if (q.t === 'lik') {
      help = q.s === 'F' ? 'Indique con qué frecuencia ocurre en la asignatura que eligió.' : 'Indique su grado de acuerdo, pensando en la asignatura que eligió.';
      body = `<div class="opts lik" role="radiogroup" aria-labelledby="qt">${B.ESCALAS[q.s].map((l, i) =>
        opt(l, a === i + 1, i + 1, `data-v="${i + 1}"`).replace('</button>', `<span class="pips" aria-hidden="true">${[1, 2, 3, 4, 5].map(p => `<i class="${p <= i + 1 ? 'f' : ''}"></i>`).join('')}</span></button>`)).join('')}
${q.na ? opt(q.na, a === 0, 0, 'data-v="0"', ' na') : ''}</div>`;
    } else if (q.t === 'multi') {
      const m = a || { sel: [], none: false, oc: false, otra: '' };
      help = 'Puede marcar varias opciones.';
      body = `<div class="opts multi" role="group" aria-labelledby="qt">${q.o.map((l, i) => opt(l, m.sel.includes(i), L[i], `data-m="${i}"`)).join('')}
${opt('Otra', m.oc, L[q.o.length], 'data-m="otra"')}
${m.oc ? `<div class="otra"><label for="otra" class="sr">Otra, especifique</label><input id="otra" maxlength="160" autocomplete="off" placeholder="¿Cuál? Escríbala aquí" value="${esc(m.otra)}"></div>` : ''}
<div class="sep" role="presentation"></div>${opt('Ninguna', m.none, L[q.o.length + 1], 'data-m="none"')}</div>`;
    }
    const ic = ITEM_ICON[q.id] || SEC_ICON[q.sec];
    return `<div class="stage in"><div class="qhead"><span class="chip">${I(ic)}${esc(SEC[q.sec].titulo || 'Consentimiento')}</span>${ancla}</div>
<h1 class="q" id="qt" tabindex="-1">${esc(q.q)}</h1><p class="help" id="qh">${help}</p>${body}<p class="err" id="err" role="alert"></p></div>`;
  }

  function submit() {
    const rows = SEGS.map(g => {
      const its = ITEMS.filter(i => i.sec === g.key), ok = its.filter(answered).length;
      return `<li><span class="dot${ok === its.length ? ' ok' : ''}">${I(ok === its.length ? 'check' : SEC_ICON[g.key])}</span><span>${g.titulo}</span><span class="n">${ok}/${its.length}</span><button type="button" class="link" data-jump="${g.key}">Revisar</button></li>`;
    }).join('');
    return `<div class="stage in"><span class="chip">${I('sparkles')}Último paso</span><h1 class="q" id="qt" tabindex="-1">Todo listo para enviar</h1>
<p class="help">Puede revisar cualquier bloque antes de enviar. Una vez enviada, la respuesta no se puede modificar.</p><ul class="review">${rows}</ul><p class="err" id="err" role="alert"></p></div>`;
  }

  function end() {
    const e = st.end || {};
    const t = e.reason === 'FIL1' ? ['Gracias por su tiempo', 'Respetamos su decisión. No se registró ninguna respuesta del cuestionario.']
      : e.reason === 'FIL2' ? ['Gracias por su interés', 'Esta encuesta está dirigida a estudiantes que cursan al menos una asignatura virtual en la Facultad de Tecnología e Innovación.']
      : ['¡Gracias! Su respuesta quedó registrada', 'Su opinión ayudará a mejorar el uso de herramientas digitales en las clases virtuales de la FTI.'];
    const note = e.status === 'demo' ? `<div class="note">${I('info')}<span><b>Modo demostración.</b> Esta copia todavía no está conectada a Google Sheets, así que la respuesta no se envió.</span></div>`
      : e.status === 'error' ? `<div class="note warn">${I('refresh-cw')}<span><b>Aún no se pudo enviar.</b> Su respuesta quedó guardada en este dispositivo y se enviará sola la próxima vez que abra la encuesta con internet. <button type="button" class="link" id="retry">Reintentar ahora</button></span></div>` : '';
    const photo = IMG.cierre && !e.reason ? `<img class="cierre" src="${esc(CFG.imagenes.cierre)}" alt="Campus de la Universidad Dr. Andrés Bello">` : '';
    const share = window.CUHDA_COMPARTIR ? `<section class="share-card"><div><h2>${I('megaphone')}Ayúdenos a llegar a más estudiantes</h2><p>Comparta la encuesta con sus compañeros de la FTI. Cada respuesta cuenta.</p></div>
<div class="share-row"><a class="sbtn wa" href="${esc(window.CUHDA_COMPARTIR.href('whatsapp'))}" target="_blank" rel="noopener">${IC.marca('whatsapp')}WhatsApp</a><button type="button" class="sbtn" data-dialogo="compartir">${I('qr-code')}QR y redes</button><button type="button" class="sbtn" id="copiar-fin">${I('link')}<span>Copiar enlace</span></button></div></section>` : '';
    const resultados = !e.reason ? `<section class="res" id="resultados" aria-live="polite">${resultadosHTML()}</section>` : '';
    return `<div class="stage end in">${photo}<div class="burst" aria-hidden="true">${I('party-popper')}</div>
<h1 class="q" id="qt" tabindex="-1">${t[0]}</h1><p class="help">${t[1]}</p>${note}${resultados}${share}
<p class="endlinks"><button type="button" class="link" data-dialogo="equipo">${I('users')}Conozca al equipo de investigación</button><button type="button" class="link" id="again">${I('refresh-cw')}Nueva respuesta en este dispositivo</button></p></div>`;
  }

  /* ---------- resultados al final (solo agregados) ---------- */
  let RES = null, resEstado = 'cargando';
  const DEMO_RES = { ok: true, n: 128, suficiente: true, minimo: 10, dim: { F: 3.42, D: 3.71, A: 3.86 },
    herr: { H1_2: 0.71, H3_1: 0.93, H4_1: 0.88, H2_1: 0.84, H5_1: 0.8, H2_3: 0.77, H1_1: 0.52, H6_1: 0.58 } };
  const DIMS = [['F', 'Frecuencia de integración', 'cuánto se usan las herramientas en clase'], ['D', 'Presencia docente', 'cómo le guía su docente con ellas'], ['A', 'Aprendizaje percibido', 'cuánto siente que aprende']];
  const f1 = v => (v === null || v === undefined || isNaN(v)) ? '—' : (Math.round(v * 10) / 10).toFixed(1);
  async function cargarResumen() {
    if (!st.end || st.end.reason) return;
    if (!ENDPOINT) { RES = DEMO_RES; resEstado = 'demo'; pintarResumen(); return; }
    resEstado = 'cargando'; pintarResumen();
    try {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 15000);
      const j = await (await fetch(`${ENDPOINT}?accion=resumen`, { cache: 'no-store', signal: ctl.signal })).json(); clearTimeout(t);
      if (!j || !j.ok) throw new Error('resumen');
      RES = j; resEstado = 'ok';
    } catch (err) { resEstado = 'error'; }
    pintarResumen();
  }
  function pintarResumen() { const el = document.getElementById('resultados'); if (el) el.innerHTML = resultadosHTML(); }
  function herrLabel(k) {
    const [id, j] = k.split('_'), q = ITEMS.find(i => i.id === id); return q ? q.o[+j - 1] : k;
  }
  function resultadosHTML() {
    const mio = st.end?.mio;
    const cab = `<h2>${I('chart-column')}Así van los resultados</h2>`;
    if (resEstado === 'cargando') return `${cab}<p class="res-sub">${I('refresh-cw')}Cargando los resultados del grupo…</p>`;
    if (resEstado === 'error' && !mio) return '';
    const hay = (resEstado === 'ok' || resEstado === 'demo') && RES && RES.suficiente;
    const x = v => ((Math.max(1, Math.min(5, v)) - 1) / 4 * 100).toFixed(1);
    const filas = DIMS.map(([k, n, d]) => {
      const p = hay ? RES.dim[k] : null, m = mio ? mio[k] : null;
      const dif = p !== null && m !== null && !isNaN(m) ? m - p : null;
      const frase = dif === null ? '' : Math.abs(dif) < 0.15 ? 'Muy similar al promedio' : `${f1(Math.abs(dif))} ${dif > 0 ? 'por encima' : 'por debajo'} del promedio`;
      return `<div class="rdim"><div class="rtop"><b>${n}</b><span class="rv">${m !== null && !isNaN(m) ? `<span class="tu">Usted ${f1(m)}</span>` : ''}${p !== null ? `<span class="pr">Promedio ${f1(p)}</span>` : ''}</span></div>
<div class="rtrack" role="img" aria-label="${n}: usted ${f1(m)}${p !== null ? `, promedio ${f1(p)}` : ''} en escala de 1 a 5">${p !== null ? `<i class="mk pr" style="left:${x(p)}%"></i>` : ''}${m !== null && !isNaN(m) ? `<i class="mk tu" style="left:${x(m)}%"></i>` : ''}</div>
<p class="rnote">${esc(d)}${frase ? ` · <b>${frase}</b>` : ''}</p></div>`;
    }).join('');
    const top = hay && RES.herr ? Object.entries(RES.herr).sort((a, b) => b[1] - a[1]).slice(0, 5) : [];
    const herr = top.length ? `<h3>${I('laptop')}Herramientas más usadas por los docentes</h3><div class="rbars">${top.map(([k, v]) => `<div class="rbar"><span>${esc(herrLabel(k))}</span><span class="rbt"><i style="width:${Math.round(v * 100)}%"></i></span><b>${Math.round(v * 100)}%</b></div>`).join('')}</div>` : '';
    const sub = hay ? `${I('users')}Basado en ${RES.n} respuestas válidas${resEstado === 'demo' ? ' · <b>vista de ejemplo</b>' : ' · se actualiza con cada respuesta'}`
      : resEstado === 'error' ? `${I('info')}No se pudieron cargar los promedios del grupo; abajo ve solo sus resultados.`
      : `${I('clock')}Los promedios del grupo aparecerán cuando haya al menos ${RES?.minimo || 10} respuestas válidas (van ${RES?.n ?? 0}). Vuelva a esta página más tarde.`;
    return `${cab}<p class="res-sub">${sub}</p><div class="rleg" aria-hidden="true"><span><i class="mk tu"></i>Usted</span>${hay ? '<span><i class="mk pr"></i>Promedio del grupo</span>' : ''}<span class="esc">Escala de 1 a 5</span></div>${filas}${herr}
<p class="rfoot">${I('shield-check')}Resultados anónimos y agregados: nadie puede ver respuestas individuales.</p>`;
  }

  function render(focus = true) {
    const s = st.i >= END ? 'end' : SCREENS[st.i];
    document.body.dataset.screen = typeof s === 'object' ? s.t : s;
    header();
    const m = $('#main');
    m.innerHTML = s === 'welcome' ? welcome() : s === 'submit' ? submit() : s === 'end' ? end() : s.t === 'intro' ? intro(s) : question(s);
    window.scrollTo(0, 0);
    const showFoot = typeof s === 'object' || s === 'submit';
    $('#foot').hidden = !showFoot;
    $('#back').hidden = st.i <= 1;
    $('#next').textContent = s === 'submit' ? 'Enviar respuestas' : s.t === 'intro' ? 'Empezar bloque' : 'Continuar';
    $('#next').disabled = false;
    const h = $('#qt');
    $('#sr').textContent = s === 'end' ? h?.textContent || '' : typeof s === 'object' && s.t !== 'intro' ? `Pregunta ${ITEMS.indexOf(s) + 1} de ${ITEMS.length}` : '';
    if (focus && h && s !== 'welcome') h.focus({ preventScroll: true });
  }

  /* ---------- navegación ---------- */
  const setErr = msg => { const e = $('#err'); if (e) e.textContent = msg; };
  function goTo(i) { clearTimeout(timer); st.i = i; save(); render(); }
  function next() {
    const s = SCREENS[st.i];
    if (s === 'submit') { finish(null); return; }
    if (typeof s !== 'object') { goTo(st.i + 1); return; }
    if (s.t !== 'intro' && !answered(s)) {
      const a = st.A[s.id];
      setErr(s.t === 'multi' && a?.oc && !a.otra.trim() ? 'Escriba cuál es la otra opción o desmárquela.' : s.t === 'multi' ? 'Marque al menos una opción, o «Ninguna».' : 'Elija una opción para continuar.');
      return;
    }
    if ('stop' in s && st.A[s.id] === s.stop) { finish(s.id); return; }
    goTo(st.i + 1);
  }
  const back = () => { if (st.i > 1) goTo(st.i - 1); };

  /* ---------- datos ---------- */
  function buildRow(reason) {
    const now = new Date();
    const dur = st.start ? Math.round((now - new Date(st.start)) / 1000) : '';
    const r = { id_respuesta: st.rid, version: VERSION, piloto: PILOTO, inicio: st.start || '', fin: now.toISOString(), duracion_seg: dur,
      completo: reason ? 0 : 1, motivo_fin: reason ? (reason === 'FIL1' ? 'sin_consentimiento' : 'no_elegible') : 'completa',
      dispositivo: matchMedia('(max-width: 760px)').matches ? 'movil' : 'escritorio', canal: st.canal || 'directo' };
    for (const q of ITEMS) {
      const a = st.A[q.id];
      if (q.t === 'multi') {
        q.o.forEach((o, j) => { r[`${q.id}_${j + 1}`] = a ? (a.sel.includes(j) ? 1 : 0) : ''; });
        r[q.id + '_ninguna'] = a ? (a.none ? 1 : 0) : '';
        r[q.id + '_otra'] = a && a.oc ? a.otra.trim().slice(0, 160) : '';
        r[q.id + '_n'] = a ? a.sel.length : '';
      } else {
        r[q.id] = a ?? '';
        if (q.txt) r[q.id + '_txt'] = a ? (codes(q).find(c => c[1] === a) || [''])[0] : '';
      }
    }
    if (!reason) {
      const v = id => +st.A[id] || 0, sum = ids => ids.reduce((t, id) => t + v(id), 0);
      r.H1_H5_total = ['H1', 'H2', 'H3', 'H4', 'H5'].reduce((t, id) => t + r[id + '_n'], 0);
      r.H6_total = r.H6_n;
      r.F_total = sum(['F1', 'F2', 'F3', 'F4', 'F5']);
      r.D_total = sum(['D1', 'D2', 'D3', 'D4', 'D5', 'D6']);
      r.D6_no_aplica = st.A.D6 === 0 ? 1 : 0;
      r.A_total = sum(['A1', 'A2', 'A3', 'A4', 'A5', 'A6']);
      r.CTRL1_valido = st.A.CTRL1 === 4 ? 1 : 0;
      r.flag_rapido = dur !== '' && dur < MIN_SEG ? 1 : 0;
      r.flag_lineal = new Set(LIKERT.map(id => st.A[id])).size === 1 ? 1 : 0;
    }
    return r;
  }
  async function post(r) {
    if (!ENDPOINT) return 'demo';
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 15000);
    try {
      await fetch(ENDPOINT, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(r), signal: ctl.signal, keepalive: true });
      return 'ok';
    } finally { clearTimeout(t); }
  }
  async function flush() {
    if (!ENDPOINT) return true;
    const p = store.get(PEND, []); if (!p.length) return true;
    const left = [];
    for (const r of p) { try { await post(r); } catch (e) { left.push(r); } }
    store.set(PEND, left);
    if (!left.length && st.end?.status === 'error') { st.end.status = 'ok'; save(); if (st.i >= END) render(false); }
    return !left.length;
  }
  async function finish(reason) {
    if (sending) return; sending = true;
    const b = $('#next'); b.disabled = true; b.textContent = 'Enviando…';
    const r = buildRow(reason); let status;
    try { status = await post(r); } catch (e) { status = 'error'; store.set(PEND, [...store.get(PEND, []), r]); }
    // Solo se conservan tres promedios personales para compararlos con el grupo; las respuestas se borran del dispositivo.
    const mio = reason ? null : { F: r.F_total / 5, D: (() => { const v = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'].map(id => +st.A[id]).filter(x => x > 0); return v.reduce((a, x) => a + x, 0) / v.length; })(), A: r.A_total / 6 };
    st.end = { reason, status, mio }; st.i = END; st.A = {}; sending = false; save(); render(); cargarResumen();
  }

  /* ---------- eventos ---------- */
  document.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'start') { if (!st.start) st.start = new Date().toISOString(); goTo(Math.min(Math.max(1, st.resume || 1), END - 1)); return; }
    if (b.id === 'restart') { st = fresh(); st.start = new Date().toISOString(); goTo(1); return; }
    if (b.id === 'next') { next(); return; }
    if (b.id === 'back') { back(); return; }
    if (b.id === 'again') { st = fresh(); save(); render(); return; }
    if (b.id === 'copiar-fin') { window.CUHDA_COMPARTIR?.copiar('enlace', b.querySelector('span')); return; }
    if (b.id === 'retry') { b.textContent = 'Enviando…'; flush().then(() => render(false)); return; }
    if (b.dataset.jump) { const k = SCREENS.findIndex(x => typeof x === 'object' && x.t !== 'intro' && x.sec === b.dataset.jump); if (k > 0) goTo(k); return; }
    const s = SCREENS[st.i]; if (typeof s !== 'object' || s.t === 'intro') return;
    if (b.dataset.v !== undefined) {
      st.A[s.id] = +b.dataset.v; save(); setErr('');
      document.querySelectorAll('.opt').forEach(o => o.setAttribute('aria-checked', String(o === b)));
      clearTimeout(timer); timer = setTimeout(next, reduced() ? 0 : 320);
      return;
    }
    if (b.dataset.m !== undefined) {
      const m = st.A[s.id] || { sel: [], none: false, oc: false, otra: '' }, k = b.dataset.m;
      if (k === 'none') { m.none = !m.none; if (m.none) { m.sel = []; m.oc = false; m.otra = ''; } }
      else if (k === 'otra') { m.oc = !m.oc; if (m.oc) m.none = false; else m.otra = ''; }
      else { const j = +k; m.sel = m.sel.includes(j) ? m.sel.filter(x => x !== j) : [...m.sel, j].sort((x, y) => x - y); m.none = false; }
      st.A[s.id] = m; save(); render(false);
      (k === 'otra' && m.oc ? $('#otra') : document.querySelector(`[data-m="${k}"]`))?.focus({ preventScroll: true });
    }
  });
  document.addEventListener('input', e => {
    if (e.target.id !== 'otra') return;
    const s = SCREENS[st.i]; st.A[s.id].otra = e.target.value; save(); setErr('');
  });
  document.addEventListener('keydown', e => {
    if (document.querySelector('dialog[open]')) return;
    if (e.target.id === 'otra') { if (e.key === 'Enter') { e.preventDefault(); next(); } return; }
    const s = SCREENS[st.i];
    if (e.key === 'Enter' && !e.target.closest('button') && (typeof s === 'object' || s === 'submit')) { e.preventDefault(); next(); return; }
    if (typeof s !== 'object' || s.t === 'intro' || e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key.toUpperCase(); let btn = null;
    if (s.t === 'lik' && /^[0-5]$/.test(k)) btn = document.querySelector(`.opt[data-v="${k}"]`);
    else if (s.t !== 'lik' && /^[A-I]$/.test(k)) btn = [...document.querySelectorAll('.opt')].find(o => o.querySelector('.k')?.textContent === k || o.dataset.key === k);
    if (btn) { e.preventDefault(); btn.click(); }
  });
  window.addEventListener('online', flush);

  /* ---------- arranque ---------- */
  function loadImages() {
    const im = CFG.imagenes || {};
    for (const k of Object.keys(IMG)) {
      if (!im[k]) continue;
      const i = new Image();
      i.onload = () => { IMG[k] = true; const s = st.i >= END ? 'end' : SCREENS[st.i]; if (k === 'logo') { header(); if (s === 'welcome') render(false); } else if ((k === 'portada' && s === 'welcome') || (k === 'cierre' && s === 'end')) render(false); };
      i.src = im[k];
    }
  }
  function start(d) {
    const saved = store.get(STORE, null);
    if (saved && saved.v === SCHEMA && saved.A) { st = { ...fresh(), ...saved }; if (CANAL_URL && !Object.keys(st.A).length) st.canal = CANAL_URL; }
    else if (d && d.v === SCHEMA && d.A) st = { ...fresh(), ...d };
    if (st.end) st.i = END; else { st.resume = st.i; st.i = 0; }
    render(false); loadImages(); flush(); if (st.end && !st.end.reason) cargarResumen();
  }
  window.CUHDA_DEBUG = { buildRow, SCREENS, ITEMS, get state() { return st; } };
  window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
})();
