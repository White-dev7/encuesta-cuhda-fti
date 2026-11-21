/* Compartir la encuesta: enlace con seguimiento por canal, código QR, redes sociales y afiche para redes. */
(function () {
  'use strict';
  const CFG = window.CUHDA_CONFIG || {}, IC = window.CUHDA_ICONOS || { icono: () => '', marca: () => '' };
  const I = IC.icono, M = IC.marca;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const INST = Object.assign({ universidad: 'Universidad Dr. Andrés Bello', carrera: 'Licenciatura en Mercadeo Estratégico', facultad: 'Facultad de Ciencias Económicas' }, CFG.institucion || {});
  let dl = null;
  try { window.claude?.use?.('downloads')?.then(d => { dl = d; }).catch(() => {}); } catch (e) { /* fuera de Claude */ }

  /** Dirección base de la encuesta (sin parámetros). */
  function base() {
    if (CFG.urlPublica) return CFG.urlPublica;
    const u = new URL(location.href); u.search = ''; u.hash = '';
    u.pathname = u.pathname.replace(/(dashboard|index)\.html$/, '');
    return u.toString();
  }
  /** Enlace con parámetros de campaña: el canal queda registrado en la columna «canal». */
  function enlace(canal, medio) {
    const u = new URL(base());
    u.searchParams.set('utm_source', canal);
    u.searchParams.set('utm_medium', medio || (canal === 'qr' ? 'qr' : canal === 'correo' ? 'email' : canal === 'enlace' ? 'link' : 'social'));
    u.searchParams.set('utm_campaign', CFG.campana || 'cuhda-fti');
    return u.toString();
  }
  const MENSAJE = '¿Estudias en la Facultad de Tecnología e Innovación de la UNAB y llevas alguna asignatura virtual? Te invitamos a responder esta encuesta anónima de 8 minutos.';
  const REDES = [
    { k: 'whatsapp', n: 'WhatsApp', href: () => `https://wa.me/?text=${encodeURIComponent(MENSAJE + ' ' + enlace('whatsapp'))}` },
    { k: 'facebook', n: 'Facebook', href: () => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(enlace('facebook'))}` },
    { k: 'linkedin', n: 'LinkedIn', href: () => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(enlace('linkedin'))}` },
    { k: 'telegram', n: 'Telegram', href: () => `https://t.me/share/url?url=${encodeURIComponent(enlace('telegram'))}&text=${encodeURIComponent(MENSAJE)}` },
    { k: 'x', n: 'X', href: () => `https://x.com/intent/tweet?text=${encodeURIComponent(MENSAJE)}&url=${encodeURIComponent(enlace('x'))}` },
    { k: 'correo', n: 'Correo', icono: 'mail', href: () => `mailto:?subject=${encodeURIComponent('Encuesta sobre herramientas digitales en clases virtuales (UNAB)')}&body=${encodeURIComponent(MENSAJE + '\n\n' + enlace('correo'))}` }
  ];

  /* ---------- código QR ---------- */
  function matriz(texto) {
    const q = window.qrcode(0, 'H'); q.addData(texto, 'Byte'); q.make();
    const n = q.getModuleCount(), m = [];
    for (let r = 0; r < n; r++) { m.push([]); for (let c = 0; c < n; c++) m[r].push(q.isDark(r, c)); }
    return m;
  }
  function qrSVG(texto) {
    const m = matriz(texto), n = m.length, q = 4, t = n + q * 2;
    let d = '';
    m.forEach((row, r) => row.forEach((on, c) => { if (on) d += `M${c + q} ${r + q}h1v1h-1z`; }));
    const cx = t / 2, lg = n * 0.22;
    const logo = CFG.imagenes?.logo ? `<rect x="${cx - lg / 2 - 0.8}" y="${cx - lg / 2 - 0.8}" width="${lg + 1.6}" height="${lg + 1.6}" rx="1.2" fill="#fff"/><image href="${esc(CFG.imagenes.logo)}" x="${cx - lg / 2}" y="${cx - lg / 2}" width="${lg}" height="${lg}" preserveAspectRatio="xMidYMid meet"/>` : '';
    return `<svg class="qr" viewBox="0 0 ${t} ${t}" role="img" aria-label="Código QR que abre la encuesta" shape-rendering="crispEdges"><rect width="${t}" height="${t}" fill="#fff"/><path d="${d}" fill="#14295a"/>${logo}</svg>`;
  }
  function cargarLogo() {
    return new Promise(res => { if (!CFG.imagenes?.logo) return res(null); const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = CFG.imagenes.logo; });
  }
  function dibujarQR(ctx, texto, x, y, tam, logo) {
    const m = matriz(texto), n = m.length, s = tam / n;
    ctx.fillStyle = '#14295a';
    m.forEach((row, r) => row.forEach((on, c) => { if (on) ctx.fillRect(Math.floor(x + c * s), Math.floor(y + r * s), Math.ceil(s), Math.ceil(s)); }));
    if (logo) { const lg = tam * 0.22, lx = x + (tam - lg) / 2, ly = y + (tam - lg) / 2; ctx.fillStyle = '#fff'; redondeado(ctx, lx - 8, ly - 8, lg + 16, lg + 16, 10); ctx.fill(); dibujarLogo(ctx, logo, lx, ly, lg, lg); }
  }
  function dibujarLogo(ctx, im, x, y, w, h) { const k = Math.min(w / im.width, h / im.height), iw = im.width * k, ih = im.height * k; ctx.drawImage(im, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih); }
  function redondeado(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  async function pngQR() {
    const c = document.createElement('canvas'), T = 1200, P = 80; c.width = c.height = T;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, T, T);
    dibujarQR(ctx, enlace('qr'), P, P, T - P * 2, await cargarLogo());
    return new Promise(r => c.toBlob(r, 'image/png'));
  }

  /* ---------- afiche 1080 × 1350 para redes y estados ---------- */
  function lineas(ctx, texto, ancho) {
    const out = []; let l = '';
    for (const w of texto.split(' ')) { const t = l ? l + ' ' + w : w; if (ctx.measureText(t).width > ancho && l) { out.push(l); l = w; } else l = t; }
    if (l) out.push(l); return out;
  }
  async function pngAfiche() {
    try { await document.fonts?.ready; } catch (e) { /* sin fuentes */ }
    const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d'), F = "'Plus Jakarta Sans','Figtree',system-ui,sans-serif", logo = await cargarLogo();
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#1b3a7a'); g.addColorStop(1, '#0d1f47');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e31b2b'; ctx.beginPath(); ctx.moveTo(W * 0.62, 0); ctx.lineTo(W, 0); ctx.lineTo(W, H * 0.34); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(242,177,54,.9)'; ctx.beginPath(); ctx.arc(W - 120, H * 0.30, 46, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.06)'; for (let i = 0; i < 14; i++) for (let j = 0; j < 6; j++) { ctx.beginPath(); ctx.arc(70 + i * 26, 1180 + j * 26, 3, 0, Math.PI * 2); ctx.fill(); }
    // marca
    ctx.fillStyle = '#fff'; redondeado(ctx, 70, 70, 96, 116, 18); ctx.fill();
    if (logo) dibujarLogo(ctx, logo, 80, 80, 76, 96);
    ctx.fillStyle = '#fff'; ctx.font = `800 30px ${F}`; ctx.fillText(INST.universidad, 192, 116);
    ctx.fillStyle = '#c7d6f5'; ctx.font = `500 26px ${F}`; ctx.fillText(INST.carrera, 192, 156);
    // titular
    ctx.fillStyle = '#f2b136'; ctx.font = `800 30px ${F}`; ctx.fillText('ENCUESTA PARA ESTUDIANTES DE LA FTI', 70, 300);
    ctx.fillStyle = '#fff'; ctx.font = `800 76px ${F}`;
    const tl = lineas(ctx, '¿Cómo usan tus docentes las herramientas digitales?', W - 140);
    tl.forEach((l, i) => ctx.fillText(l, 70, 390 + i * 86));
    let y = 390 + tl.length * 86 + 10;
    // datos
    ctx.font = `700 30px ${F}`;
    let x = 70;
    for (const t of ['8 minutos', 'Anónima', 'Desde el celular']) { const w = ctx.measureText(t).width + 44; ctx.fillStyle = 'rgba(255,255,255,.12)'; redondeado(ctx, x, y, w, 56, 28); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(t, x + 22, y + 38); x += w + 14; }
    y += 100;
    // QR
    const Q = Math.min(400, H - 150 - y - 110 - (CFG.urlCorta ? 50 : 0)), qx = (W - Q - 60) / 2;
    ctx.fillStyle = '#fff'; redondeado(ctx, qx, y, Q + 60, Q + 110, 32); ctx.fill();
    dibujarQR(ctx, enlace('qr'), qx + 30, y + 30, Q, logo);
    ctx.fillStyle = '#14295a'; ctx.font = `800 32px ${F}`; ctx.textAlign = 'center'; ctx.fillText('Escanea y responde', W / 2, y + Q + 80);
    if (CFG.urlCorta) { ctx.fillStyle = '#fff'; ctx.font = `700 28px ${F}`; ctx.textAlign = 'center'; ctx.fillText('o entra a ' + String(CFG.urlCorta).replace(/^https?:\/\//, ''), W / 2, y + Q + 160); }
    ctx.textAlign = 'left';
    // pie
    ctx.fillStyle = '#c7d6f5'; ctx.font = `500 24px ${F}`;
    ctx.fillText(`${INST.facultad} · ${INST.universidad}`, 70, H - 60);
    return new Promise(r => c.toBlob(r, 'image/png'));
  }

  async function guardar(nombre, blob) {
    if (!blob) return false;
    if (dl) { try { await dl.save({ filename: nombre, data: blob }); return true; } catch (e) { return false; } }
    try { const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = nombre; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); return true; } catch (e) { return false; }
  }
  async function copiar(canal, etiqueta) {
    const url = enlace(canal || 'enlace');
    let ok = false;
    try { await navigator.clipboard.writeText(url); ok = true; } catch (e) {
      const t = document.createElement('textarea'); t.value = url; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0'; document.body.append(t); t.select();
      try { ok = document.execCommand('copy'); } catch (e2) { ok = false; } t.remove();
    }
    if (etiqueta) { const o = etiqueta.textContent; etiqueta.textContent = ok ? '¡Enlace copiado!' : 'Copie el enlace manualmente'; setTimeout(() => { etiqueta.textContent = o; }, 2200); }
    return ok;
  }

  /* ---------- ventana ---------- */
  function html() {
    const nativo = navigator.share ? `<button type="button" class="red nat" id="sh-nativo">${I('smartphone')}<span>Más opciones</span></button>` : '';
    return `<div class="share-grid">
<div class="sh-qr"><div class="qr-card">${qrSVG(enlace('qr'))}<p>${I('smartphone')}Escanee con la cámara del celular</p></div>
<button type="button" class="dlg-btn ic" id="sh-qr">${I('download')}<span>Descargar QR (PNG)</span></button></div>
<div class="sh-main">
<label class="sh-l" for="sh-url">Enlace de la encuesta</label>
<div class="sh-url"><input id="sh-url" readonly value="${esc(enlace('enlace'))}"><button type="button" class="dlg-btn pri ic" id="sh-copiar">${I('copy')}<span>Copiar</span></button></div>
${CFG.urlCorta ? `<p class="sh-corto">${I('link')}<span>Enlace corto para dictar en clase: <b>${esc(String(CFG.urlCorta).replace(/^https?:\/\//, ''))}</b></span></p>` : ''}
<p class="sh-l">Compartir en</p>
<div class="redes">${REDES.map(r => `<a class="red r-${r.k}" href="${esc(r.href())}" target="_blank" rel="noopener">${r.icono ? I(r.icono) : M(r.k)}<span>${r.n}</span></a>`).join('')}${nativo}</div>
<div class="afiche"><div class="af-prev" aria-hidden="true"><span class="af-a"></span><span class="af-b"></span><span class="af-q">${I('qr-code')}</span></div>
<div><p class="sh-l">Afiche para redes y estados</p><p class="sh-t">Imagen 1080 × 1350 con el código QR, lista para Instagram, Facebook o estados de WhatsApp.</p>
<button type="button" class="dlg-btn ic" id="sh-afiche">${I('image')}<span>Descargar afiche (PNG)</span></button></div></div>
<p class="sh-nota">${I('trending-up')}Cada enlace lleva una marca de canal (QR, WhatsApp, Facebook…) para que el dashboard muestre de dónde llegan las respuestas.</p>
</div></div>`;
  }
  async function accion(id, b) {
    const lbl = b.querySelector('span'), o = lbl?.textContent;
    const aviso = t => { if (lbl) { lbl.textContent = t; setTimeout(() => { lbl.textContent = o; }, 2200); } };
    if (id === 'sh-copiar') { copiar('enlace', lbl); return; }
    if (id === 'sh-nativo') { try { await navigator.share({ title: 'Encuesta CUHDA-FTI', text: MENSAJE, url: enlace('nativo') }); } catch (e) { /* cancelado */ } return; }
    if (id === 'sh-qr') { if (lbl) lbl.textContent = 'Preparando…'; aviso(await guardar('qr-encuesta-cuhda-fti.png', await pngQR()) ? 'QR listo' : 'No se pudo descargar'); return; }
    if (id === 'sh-afiche') { if (lbl) lbl.textContent = 'Preparando…'; aviso(await guardar('afiche-encuesta-cuhda-fti.png', await pngAfiche()) ? 'Afiche listo' : 'No se pudo descargar'); }
  }
  document.addEventListener('click', e => { const b = e.target.closest('#sh-copiar,#sh-nativo,#sh-qr,#sh-afiche'); if (b) { e.preventDefault(); accion(b.id, b); } });
  document.addEventListener('focusin', e => { if (e.target.id === 'sh-url') e.target.select(); });

  window.CUHDA_COMPARTIR = { enlace, base, copiar, html, qrSVG, pngQR, pngAfiche, MENSAJE, href: k => (REDES.find(r => r.k === k) || REDES[0]).href() };
})();
