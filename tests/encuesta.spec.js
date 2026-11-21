// Pruebas automáticas de la encuesta CUHDA-FTI v2.2
// Ejecutar: npm test   (ver README, sección "Control de calidad")
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const banco = require('../js/preguntas.js');

const ENDPOINT = 'https://pruebas.cuhda.local/exec';
const IDS_MATRIZ = ['FIL1', 'FIL2', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'F1', 'F2', 'F3', 'F4', 'F5', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'CTRL1', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6'];

/** Prepara la página: endpoint de pruebas interceptado y registro de errores. */
async function abrir(page, { url = '/', falla = false } = {}) {
  const envios = [], errores = [];
  page.on('pageerror', e => errores.push(e.message));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort()); // pruebas sin depender de la red
  await page.addInitScript(ep => { window.__CUHDA_ENDPOINT_TEST__ = ep; }, ENDPOINT);
  await page.route(ENDPOINT, route => {
    if (falla) return route.abort('internetdisconnected');
    envios.push(JSON.parse(route.request().postData()));
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  await page.goto(url);
  await expect(page.locator('#qt')).toBeVisible();
  return { envios, errores };
}
const pantalla = page => page.evaluate(() => document.body.dataset.screen);
const titulo = page => page.locator('#qt').textContent();
async function avanzaTras(page, accion) {
  const antes = await titulo(page);
  await accion();
  await expect.poll(() => titulo(page), { intervals: [30, 60, 120] }).not.toBe(antes);
}
/** Responde la encuesta completa. likert: valor 1–5 para todos los ítems Likert; ctrl: respuesta al ítem de control. */
async function completar(page, { likert = 4, ctrl = 4, hasta = 'end' } = {}) {
  for (let paso = 0; paso < 80; paso++) {
    const s = await pantalla(page);
    if (s === hasta) return;
    if (s === 'welcome') await avanzaTras(page, () => page.click('#start'));
    else if (s === 'intro') await avanzaTras(page, () => page.click('#next'));
    else if (s === 'single') await avanzaTras(page, () => page.locator('.opt').first().click());
    else if (s === 'lik') {
      const t = await titulo(page);
      await avanzaTras(page, () => page.click(`.opt[data-v="${t.includes('lectura atenta') ? ctrl : likert}"]`));
    } else if (s === 'multi') {
      await page.click('[data-m="0"]'); await page.click('[data-m="2"]');
      await avanzaTras(page, () => page.click('#next'));
    } else if (s === 'submit') await avanzaTras(page, () => page.click('#next'));
    else if (s === 'end') return;
  }
  throw new Error('La encuesta no terminó');
}

test.describe('Banco de preguntas', () => {
  test('coincide con la matriz CUHDA-FTI v2.2 (32 ítems, mismo orden)', () => {
    expect(banco.ITEMS.map(i => i.id)).toEqual(IDS_MATRIZ);
    const nOpc = Object.fromEntries(banco.ITEMS.filter(i => i.t === 'multi').map(i => [i.id, i.o.length]));
    expect(nOpc).toEqual({ H1: 4, H2: 4, H3: 4, H4: 4, H5: 5, H6: 6 });
    expect(banco.ITEMS.filter(i => i.t === 'lik').length).toBe(18);
    expect(banco.ESCALAS.A[3]).toBe('De acuerdo'); // CTRL1 exige el código 4
  });
});

test.describe('Flujo de respuesta', () => {
  test('una respuesta completa envía una fila con la codificación de la matriz', async ({ page }) => {
    const { envios, errores } = await abrir(page);
    await completar(page);
    await expect(page.locator('#qt')).toHaveText(/Gracias/);
    expect(envios).toHaveLength(1);
    const r = envios[0];
    expect(r).toMatchObject({ completo: 1, motivo_fin: 'completa', piloto: 0, version: 'CUHDA-FTI v2.2', FIL1: 1, FIL2: 1, S1: 1, S3: 1,
      S3_txt: 'Ingeniería en Sistemas y Computación', S6_txt: 'Teórica o conceptual',
      H1_1: 1, H1_2: 0, H1_3: 1, H1_4: 0, H1_ninguna: 0, H1_otra: '', H1_n: 2, H6_n: 2,
      F1: 4, D6: 4, CTRL1: 4, A6: 4, H1_H5_total: 10, H6_total: 2, F_total: 20, D_total: 24, A_total: 24,
      D6_no_aplica: 0, CTRL1_valido: 1, flag_lineal: 1, flag_rapido: 1, canal: 'directo' });
    expect(r.id_respuesta).toMatch(/^[\w-]{12,}$/);
    expect(Object.keys(r).length).toBeGreaterThanOrEqual(90);
    expect(errores).toEqual([]);
  });

  test('sin consentimiento (FIL1 = No) termina y registra solo el filtro', async ({ page }) => {
    const { envios } = await abrir(page);
    await page.click('#start');
    await avanzaTras(page, () => page.click('.opt[data-v="0"]'));
    await expect(page.locator('#qt')).toHaveText('Gracias por su tiempo');
    expect(envios[0]).toMatchObject({ FIL1: 0, FIL2: '', S1: '', completo: 0, motivo_fin: 'sin_consentimiento' });
  });

  test('no elegible (FIL2 = No) termina con mensaje propio', async ({ page }) => {
    const { envios } = await abrir(page);
    await page.click('#start');
    await avanzaTras(page, () => page.click('.opt[data-v="1"]'));
    await avanzaTras(page, () => page.click('.opt[data-v="0"]'));
    await expect(page.locator('#qt')).toHaveText('Gracias por su interés');
    expect(envios[0]).toMatchObject({ FIL1: 1, FIL2: 0, completo: 0, motivo_fin: 'no_elegible' });
  });

  test('no permite avanzar sin responder', async ({ page }) => {
    await abrir(page);
    await completar(page, { hasta: 'single' });
    await page.click('#next');
    await expect(page.locator('#err')).toHaveText('Elija una opción para continuar.');
    await expect(page.locator('.opt[aria-checked="true"]')).toHaveCount(0);
  });

  test('«Ninguna» es excluyente y «Otra» exige especificar', async ({ page }) => {
    const { envios } = await abrir(page);
    await completar(page, { hasta: 'multi' });
    await page.click('[data-m="0"]'); await page.click('[data-m="1"]');
    await page.click('[data-m="none"]');
    await expect(page.locator('.opt[aria-checked="true"]')).toHaveCount(1);
    await page.click('[data-m="otra"]');
    await expect(page.locator('[data-m="none"]')).toHaveAttribute('aria-checked', 'false');
    await page.click('#next');
    await expect(page.locator('#err')).toContainText('Escriba cuál');
    await page.fill('#otra', 'Webex');
    await avanzaTras(page, () => page.click('#next'));
    await completar(page);
    expect(envios[0]).toMatchObject({ H1_1: 0, H1_ninguna: 0, H1_otra: 'Webex', H1_n: 0 });
  });

  test('«Atrás» conserva la respuesta anterior', async ({ page }) => {
    await abrir(page);
    await completar(page, { hasta: 'single' });
    await avanzaTras(page, () => page.click('.opt[data-v="1"]')); // FIL1
    await avanzaTras(page, () => page.click('.opt[data-v="1"]')); // FIL2
    await avanzaTras(page, () => page.click('.opt[data-v="3"]')); // S1
    await avanzaTras(page, () => page.click('#back'));
    await expect(page.locator('.opt[data-v="3"]')).toHaveAttribute('aria-checked', 'true');
  });

  test('retoma donde quedó al recargar la página', async ({ page }) => {
    await abrir(page);
    await page.click('#start');
    await avanzaTras(page, () => page.click('.opt[data-v="1"]'));
    await avanzaTras(page, () => page.click('.opt[data-v="1"]'));
    await page.reload();
    await expect(page.locator('#start')).toHaveText('Continuar donde quedé');
    await avanzaTras(page, () => page.click('#start'));
    await expect(page.locator('#qt')).toHaveText('¿Cuál es su edad?');
  });

  test('se puede responder solo con teclado', async ({ page }) => {
    await abrir(page);
    await page.locator('#start').focus();
    await avanzaTras(page, () => page.keyboard.press('Enter'));
    await avanzaTras(page, () => page.keyboard.press('a')); // FIL1 = Sí
    await avanzaTras(page, () => page.keyboard.press('A')); // FIL2 = Sí
    await avanzaTras(page, () => page.keyboard.press('b')); // S1 = 21 a 23
    expect(await page.evaluate(() => window.CUHDA_DEBUG.state.A.S1)).toBe(2);
    await page.keyboard.press('Tab');
    await expect(page.locator('.opt').first()).toBeFocused();
  });

  test('D6 «No aplica» se guarda como 0 y no suma en D_total', async ({ page }) => {
    const { envios } = await abrir(page);
    await completar(page, { hasta: 'lik' });
    while (!(await titulo(page)).startsWith('Cuando surgen')) {
      const s = await pantalla(page);
      await avanzaTras(page, () => s === 'intro' ? page.click('#next') : page.click('.opt[data-v="4"]'));
    }
    await avanzaTras(page, () => page.click('.opt[data-v="0"]'));
    await completar(page);
    expect(envios[0]).toMatchObject({ D6: 0, D6_no_aplica: 1, D_total: 20 });
  });

  test('control de atención fallido marca CTRL1_valido = 0', async ({ page }) => {
    const { envios } = await abrir(page);
    await completar(page, { ctrl: 5 });
    expect(envios[0]).toMatchObject({ CTRL1: 5, CTRL1_valido: 0 });
  });

  test('modo piloto (?piloto=1) marca las respuestas', async ({ page }) => {
    const { envios } = await abrir(page, { url: '/?piloto=1' });
    await expect(page.locator('.pilot')).toBeVisible();
    await completar(page);
    expect(envios[0].piloto).toBe(1);
  });
});

test.describe('Confiabilidad del envío', () => {
  test('sin conexión guarda la respuesta y la reenvía al volver', async ({ page }) => {
    await abrir(page, { falla: true });
    await completar(page);
    await expect(page.locator('.note.warn')).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('cuhda-fti-v22-pendientes')).length)).toBe(1);
    const envios = [];
    await page.unroute(ENDPOINT);
    await page.route(ENDPOINT, r => { envios.push(JSON.parse(r.request().postData())); r.fulfill({ status: 200, body: '{}' }); });
    await page.click('#retry');
    await expect(page.locator('.note.warn')).toHaveCount(0);
    expect(envios).toHaveLength(1);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('cuhda-fti-v22-pendientes')).length)).toBe(0);
  });

  test('no envía dos veces con doble clic en «Enviar»', async ({ page }) => {
    const { envios } = await abrir(page);
    await completar(page, { hasta: 'submit' });
    await page.locator('#next').dblclick();
    await expect(page.locator('#qt')).toHaveText(/Gracias/);
    expect(envios).toHaveLength(1);
  });

  test('sin endpoint funciona en modo demostración', async ({ page }) => {
    await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await page.goto('/');
    await completar(page);
    await expect(page.locator('.note')).toContainText('Modo demostración');
  });
});

test.describe('Imágenes', () => {
  test('sin foto de portada usa la maqueta; con foto la pone de fondo; el logo aparece en el encabezado', async ({ page }) => {
    await page.route('**/img/portada.jpg', r => r.fulfill({ status: 404, body: '' }));
    await abrir(page);
    await expect(page.locator('.wel')).not.toHaveClass(/con-foto/);
    await expect(page.locator('.mock .phone')).toBeAttached();
    await expect(page.locator('.top img.logo')).toBeVisible();
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    await page.unroute('**/img/portada.jpg');
    await page.route('**/img/portada.jpg', r => r.fulfill({ status: 200, contentType: 'image/png', body: png }));
    await page.reload();
    await expect(page.locator('.wel.con-foto')).toBeAttached();
    expect(await page.locator('.wel').getAttribute('style')).toContain('img/portada.jpg');
  });
});

test.describe('Accesibilidad y diseño adaptable', () => {
  const PANTALLAS = ['welcome', 'single', 'intro', 'multi', 'lik', 'submit', 'end'];

  test('sin infracciones WCAG 2.1 AA (axe) en cada tipo de pantalla', async ({ page }) => {
    await abrir(page);
    for (const s of PANTALLAS) {
      await completar(page, { hasta: s });
      await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running' || a.effect?.getComputedTiming().endTime === Infinity));
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(r.violations.map(v => `${s}: ${v.id} — ${v.help} → ${v.nodes.map(n => n.target.join(" ")).join(", ")}`)).toEqual([]);
    }
  });

  for (const ancho of [360, 768, 1280]) {
    test(`sin desplazamiento horizontal a ${ancho}px`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 800 });
      await abrir(page);
      for (const s of PANTALLAS) {
        await completar(page, { hasta: s });
        const sw = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(sw, `pantalla ${s}`).toBeLessThanOrEqual(ancho);
      }
    });
  }

  test('las opciones tienen área táctil de al menos 44 px', async ({ page }) => {
    await abrir(page);
    await completar(page, { hasta: 'lik' });
    const alturas = await page.locator('.opt').evaluateAll(els => els.map(e => e.getBoundingClientRect().height));
    for (const h of alturas) expect(h).toBeGreaterThanOrEqual(44);
  });
});

test.describe('Créditos y privacidad', () => {
  test('la ventana de créditos muestra a todo el equipo, se cierra con Esc y es accesible', async ({ page }) => {
    await abrir(page);
    await page.click('.wl[data-dialogo="equipo"]');
    const d = page.locator('dialog[open]');
    await expect(d).toBeVisible();
    for (const n of ['Alex Omar Pocasangre Monges', 'Jacqueline Noemy Monge Osorio', 'Josselyn Vanessa Monge', 'Karla Patricia Guevara', 'Jennifer Claribel Rosales', 'Gabriela Michelle Esquivel'])
      await expect(d).toContainText(n);
    await expect(d.locator('.cita')).toContainText('Monge Osorio, J. N., Monge, J. V., Guevara, K. P., Rosales, J. C., & Esquivel, G. M. (2026)');
    await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running' || a.effect?.getComputedTiming().endTime === Infinity));
    const r = await new AxeBuilder({ page }).include('dialog').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(r.violations.map(v => `${v.id} → ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await expect(page.locator('.wl[data-dialogo="equipo"]')).toBeFocused();
  });

  test('el aviso de privacidad se abre desde la bienvenida', async ({ page }) => {
    await abrir(page);
    await page.click('.wl[data-dialogo="privacidad"]');
    await expect(page.locator('dialog[open] h2')).toHaveText('Privacidad y uso de datos');
    await expect(page.locator('dialog[open]')).toContainText('No se pide ni se guarda su nombre');
  });

  test('al enviar, las respuestas no quedan guardadas en el dispositivo', async ({ page }) => {
    await abrir(page);
    await completar(page);
    const guardado = await page.evaluate(() => JSON.parse(localStorage.getItem('cuhda-fti-v22-estado')));
    expect(guardado.A).toEqual({});
  });
});

test.describe('Compartir y canal de difusión', () => {
  test('la ventana Compartir ofrece QR, enlace con campaña y redes', async ({ page }) => {
    await abrir(page);
    await page.click('.wl[data-dialogo="compartir"]');
    const d = page.locator('dialog[open]');
    await expect(d.locator('svg.qr path')).toHaveCount(1);
    const url = await d.locator('#sh-url').inputValue();
    expect(url).toContain('utm_source=enlace'); expect(url).toContain('utm_campaign=cuhda-fti');
    await expect(d.locator('a.r-whatsapp')).toHaveAttribute('href', /^https:\/\/wa\.me\/\?text=.*utm_source%3Dwhatsapp/);
    await expect(d.locator('a.r-facebook')).toHaveAttribute('href', /facebook\.com\/sharer.*utm_source%3Dfacebook/);
    await expect(d.locator('a.r-linkedin')).toHaveAttribute('href', /linkedin\.com.*utm_source%3Dlinkedin/);
    await d.locator('#sh-copiar').click();
    await expect(d.locator('#sh-copiar span')).toHaveText(/copiado|manualmente/);
    await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running' || a.effect?.getComputedTiming().endTime === Infinity));
    const r = await new AxeBuilder({ page }).include('dialog').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(r.violations.map(v => `${v.id} → ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });

  test('genera el QR y el afiche como imágenes PNG', async ({ page }) => {
    await abrir(page);
    const info = await page.evaluate(async () => {
      const q = await window.CUHDA_COMPARTIR.pngQR(), a = await window.CUHDA_COMPARTIR.pngAfiche();
      const dim = b => new Promise(r => { const i = new Image(); i.onload = () => r([i.width, i.height]); i.src = URL.createObjectURL(b); });
      return { qt: q.type, qs: q.size, qd: await dim(q), at: a.type, as: a.size, ad: await dim(a) };
    });
    expect(info.qt).toBe('image/png'); expect(info.qd).toEqual([1200, 1200]); expect(info.qs).toBeGreaterThan(5000);
    expect(info.at).toBe('image/png'); expect(info.ad).toEqual([1080, 1350]); expect(info.as).toBeGreaterThan(30000);
  });

  test('registra el canal de llegada (utm_source) en la respuesta', async ({ page }) => {
    const { envios } = await abrir(page, { url: '/?utm_source=WhatsApp&utm_medium=social' });
    await completar(page);
    expect(envios[0].canal).toBe('whatsapp');
  });

  test('un canal con caracteres no válidos se limpia', async ({ page }) => {
    const { envios } = await abrir(page, { url: '/?utm_source=%3Cscript%3Eqr' });
    await page.click('#start');
    await avanzaTras(page, () => page.click('.opt[data-v="0"]'));
    expect(envios[0].canal).toBe('scriptqr');
  });

  test('la pantalla final invita a compartir por WhatsApp', async ({ page }) => {
    await abrir(page);
    await completar(page);
    await expect(page.locator('.share-card a.wa')).toHaveAttribute('href', /wa\.me/);
  });
});

test.describe('Receptor de Apps Script (validación del servidor)', () => {
  const fs = require('fs'), vm = require('vm');
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(__dirname + '/../apps-script/Codigo.gs', 'utf8') + ';this.validar=validar;this.COLUMNAS=COLUMNAS;', ctx);
  const ok = { version: 'CUHDA-FTI v2.2', id_respuesta: 'abcdef123456', FIL1: 0, completo: 0, canal: 'qr' };
  test('acepta una fila válida y rechaza las inválidas', () => {
    expect(ctx.validar(ok)).toBe('');
    expect(ctx.validar({ ...ok, version: 'otra' })).toContain('versión');
    expect(ctx.validar({ ...ok, canal: 'Qr!' })).toBe('canal inválido');
    expect(ctx.validar({ ...ok, campo_raro: 1 })).toContain('campo desconocido');
    expect(ctx.validar({ ...ok, completo: 1, F1: 9 })).toContain('fuera de rango');
  });
  test('una respuesta real de la encuesta pasa la validación del servidor', async ({ page }) => {
    const { envios } = await abrir(page, { url: '/?utm_source=qr' });
    await completar(page);
    expect(Object.keys(envios[0]).filter(k => !ctx.COLUMNAS.includes(k))).toEqual([]);
    expect(ctx.validar(envios[0])).toBe('');
  });
  test('el diccionario cubre todas las columnas que envía la encuesta', () => {
    for (const c of ['canal', 'H1_otra', 'D6_no_aplica', 'flag_lineal', 'CTRL1_valido', 'S3_txt']) expect(ctx.COLUMNAS).toContain(c);
  });
});

test.describe('Equipo y Compartir en cualquier momento', () => {
  test('se abren desde una pregunta y al cerrar se conserva la pregunta y la respuesta', async ({ page }) => {
    await abrir(page);
    await expect(page.locator('.top [data-dialogo="equipo"]')).toBeVisible();
    await expect(page.locator('.top [data-dialogo="compartir"]')).toBeVisible();
    await completar(page, { hasta: 'lik' });
    await avanzaTras(page, () => page.click('.opt[data-v="3"]'));
    await avanzaTras(page, () => page.click('#back'));
    await expect(page.locator('.opt[data-v="3"]')).toHaveAttribute('aria-checked', 'true');
    const titulo0 = await titulo(page);
    for (const tipo of ['equipo', 'compartir']) {
      await page.click(`.top [data-dialogo="${tipo}"]`);
      await expect(page.locator('dialog[open]')).toBeVisible();
      await page.keyboard.press('3'); // los atajos no actúan con la ventana abierta
      await page.keyboard.press('Escape');
      await expect(page.locator('dialog[open]')).toHaveCount(0);
      expect(await titulo(page)).toBe(titulo0);
      await expect(page.locator('.opt[data-v="3"]')).toHaveAttribute('aria-checked', 'true');
    }
    for (const s of ['intro', 'multi', 'submit', 'end']) {
      await completar(page, { hasta: s });
      await expect(page.locator('.top [data-dialogo="equipo"]')).toBeVisible();
      await expect(page.locator('.top [data-dialogo="compartir"]')).toBeVisible();
    }
  });
});
