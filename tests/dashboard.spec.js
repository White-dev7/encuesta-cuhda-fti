// Pruebas del dashboard y de las funciones estadísticas — CUHDA-FTI v2.2
const { test, expect } = require('./base');
const AxeBuilder = require('@axe-core/playwright').default;
const E = require('../js/estadistica.js');
const banco = require('../js/preguntas.js');
const ejemplo = require('../js/ejemplo.js');

const ENDPOINT = 'https://pruebas.cuhda.local/exec';
const sinFuentes = page => page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());

test.describe('Estadística (valores verificados a mano)', () => {
  test('alfa de Cronbach', () => {
    const r = E.cronbach([[1, 2, 3], [2, 3, 4], [3, 4, 5], [4, 5, 5], [2, 2, 3]]);
    expect(r.alpha).toBeCloseTo(0.96903, 4);
    expect(r.n).toBe(5);
    expect(E.cronbach([[1, 2], [2, ''], [3, 3]]).n).toBe(2); // solo casos completos
    expect(E.alphaLabel(0.85)).toBe('buena');
  });
  test('correlación de Pearson e intervalo', () => {
    const p = E.pearson([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]);
    expect(p.r).toBeCloseTo(1, 6); expect(p.pendiente).toBeCloseTo(2, 6);
    const q = E.pearson([1, 2, 3, 4, 5, 6], [2, 1, 4, 3, 6, 5]);
    expect(q.r).toBeCloseTo(0.82857, 4); expect(q.lo).toBeLessThan(q.r); expect(q.hi).toBeGreaterThan(q.r);
  });
  test('omega de McDonald (verificado con modelos conocidos)', () => {
    const R = [0, 1, 2, 3].map(i => [0, 1, 2, 3].map(j => (i === j ? 1 : 0.49)));
    expect(E.omegaDesdeR(R).omega).toBeCloseTo(0.79352, 4); // cargas iguales de 0,7
    const l = [0.8, 0.7, 0.6, 0.5], R2 = l.map((a, i) => l.map((b, j) => (i === j ? 1 : a * b)));
    const o = E.omegaDesdeR(R2);
    expect(o.omega).toBeCloseTo(0.74945, 4);
    o.cargas.forEach((c, i) => expect(c).toBeCloseTo(l[i], 4));
  });
  test('medias, mediana, frecuencias y puntaje con «No aplica»', () => {
    expect(E.mean([1, 2, '', 3])).toBe(2);
    expect(E.median([5, 1, 3, 2])).toBe(2.5);
    expect(E.frecuencias([1, 1, 2, ''], [1, 2, 3]).map(f => f.n)).toEqual([2, 1, 0]);
    expect(E.puntaje({ D1: 4, D2: 2, D6: 0 }, ['D1', 'D2', 'D6'], { ceroEsPerdido: true })).toBe(3);
    const ci = E.ciMean([3, 4, 5, 4, 3, 4]); expect(ci.lo).toBeLessThan(ci.mean); expect(ci.hi).toBeGreaterThan(ci.mean);
  });
});

test.describe('Dashboard', () => {
  test('sin conexión muestra datos de ejemplo con todas las secciones', async ({ page }) => {
    const errores = []; page.on('pageerror', e => errores.push(e.message));
    await sinFuentes(page);
    await page.goto('/dashboard.html');
    await expect(page.locator('.banner')).toContainText('datos de ejemplo');
    for (const t of ['Las tres dimensiones', 'Presencia docente y aprendizaje', 'Respuestas por ítem', 'Herramientas digitales', 'Perfil de quienes', 'Participación y calidad'])
      await expect(page.getByRole('heading', { name: new RegExp(t) })).toBeVisible();
    await expect(page.locator('.lrow')).toHaveCount(17);
    await expect(page.locator('#scatter circle')).not.toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Canal de difusión' })).toBeVisible();
    expect(errores).toEqual([]);
  });

  test('los filtros cambian la muestra analizada', async ({ page }) => {
    await sinFuentes(page);
    await page.goto('/dashboard.html');
    const n = () => page.evaluate(() => window.CUHDA_DASH.analisis().length);
    const total = await n();
    await page.selectOption('#f-tipo', '3');
    expect(await n()).toBeLessThan(total);
    expect(await page.evaluate(() => window.CUHDA_DASH.analisis().every(r => +r.S6 === 3))).toBe(true);
    await page.selectOption('#f-tipo', '');
    await page.uncheck('#f-validas');
    expect(await n()).toBeGreaterThan(total);
  });

  test('con la hoja conectada pide clave, rechaza una incorrecta y carga con la correcta', async ({ page }) => {
    const filas = ejemplo.generar(banco, 40, 99), cols = Object.keys(filas.find(f => f.completo === 1));
    await sinFuentes(page);
    await page.addInitScript(ep => { window.__CUHDA_ENDPOINT_TEST__ = ep; }, ENDPOINT);
    await page.route(u => u.href.startsWith(ENDPOINT), r => {
      const clave = new URL(r.request().url()).searchParams.get('clave');
      const body = clave === 'secreta123' ? { ok: true, columnas: cols, filas: filas.map(f => cols.map(c => f[c] ?? '')), generado: '2026-11-20T22:00:00Z' } : { ok: false, error: 'clave' };
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.goto('/dashboard.html');
    await page.fill('#clave', 'incorrecta');
    await page.click('button[type=submit]');
    await expect(page.locator('.err')).toHaveText('La clave no es correcta.');
    await page.fill('#clave', 'secreta123');
    await page.click('button[type=submit]');
    await expect(page.locator('.kpi').first()).toContainText('40');
    await expect(page.locator('.banner')).toHaveCount(0);
    await expect(page.locator('.sub')).toContainText('actualizado');
  });

  test('ignora filas vacías de la hoja (contenido borrado sin eliminar la fila)', async ({ page }) => {
    const filas = ejemplo.generar(banco, 12, 7), cols = Object.keys(filas.find(f => f.completo === 1));
    const vacias = Array.from({ length: 5 }, () => cols.map(() => ''));
    await sinFuentes(page);
    await page.addInitScript(ep => { window.__CUHDA_ENDPOINT_TEST__ = ep; }, ENDPOINT);
    await page.route(u => u.href.startsWith(ENDPOINT), r => r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, columnas: cols, filas: [...filas.map(f => cols.map(c => f[c] ?? '')), ...vacias], generado: '2026-11-21T05:00:00Z' }) }));
    await page.goto('/dashboard.html');
    await page.fill('#clave', 'cualquiera');
    await page.click('button[type=submit]');
    await expect(page.locator('.kpi').first()).toContainText('12');
    expect(await page.evaluate(() => window.CUHDA_DASH.RAW.length)).toBe(12);
  });

  test('sin infracciones WCAG 2.1 AA (axe)', async ({ page }) => {
    await sinFuentes(page);
    await page.goto('/dashboard.html');
    await expect(page.locator('#scatter circle').first()).toBeAttached();
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(r.violations.map(v => `${v.id} — ${v.help} → ${v.nodes.slice(0, 4).map(n => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });

  for (const ancho of [360, 768, 1280]) {
    test(`sin desplazamiento horizontal a ${ancho}px`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 900 });
      await sinFuentes(page);
      await page.goto('/dashboard.html');
      await expect(page.locator('.kpi').first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(ancho);
    });
  }
});

test.describe('Exportación y reporte', () => {
  test('el dashboard muestra omega y genera la sintaxis SPSS con etiquetas', async ({ page }) => {
    await sinFuentes(page);
    await page.goto('/dashboard.html');
    await expect(page.locator('.alpha').first()).toContainText('ω =');
    await expect(page.locator('#b-spss')).toBeVisible();
    const sps = await page.evaluate(() => window.CUHDA_DASH.spss(Object.keys(window.CUHDA_DASH.analisis()[0])));
    expect(sps).toContain('VARIABLE LABELS');
    expect(sps).toContain("S1 1 '18 a 20 años' 2 '21 a 23 años'");
    expect(sps).toContain("F1 1 'Nunca'");
    expect(sps).toContain("D6 1 'Totalmente en desacuerdo'");
    expect(sps).toContain('MISSING VALUES D6 (0).');
    expect(sps).toMatch(/VARIABLE LEVEL .*A6 \(ORDINAL\)/s);
    expect(sps.trim().endsWith('EXECUTE.')).toBe(true);
  });

  test('el reporte ejecutivo se genera con todas sus secciones y es accesible', async ({ page }) => {
    await sinFuentes(page);
    await page.goto('/reporte.html');
    await expect(page.locator('.hoja')).toHaveCount(7);
    await expect(page.locator('.portada')).toContainText('Jacqueline Noemy Monge Osorio');
    expect(await page.locator('.hall li').count()).toBeGreaterThanOrEqual(5);
    await expect(page.locator('#b-print')).toBeVisible();
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(r.violations.map(v => `${v.id} → ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });

  test('el reporte con la hoja conectada pide entrar primero al dashboard', async ({ page }) => {
    await sinFuentes(page);
    await page.addInitScript(ep => { window.__CUHDA_ENDPOINT_TEST__ = ep; }, ENDPOINT);
    await page.goto('/reporte.html');
    await expect(page.locator('.aviso')).toContainText('abra primero el dashboard');
    await expect(page.locator('.aviso a[href="dashboard.html"]')).toBeVisible();
  });

  test('el reporte usa la clave de la sesión y los datos reales', async ({ page }) => {
    const filas = ejemplo.generar(banco, 30, 5), cols = Object.keys(filas.find(f => f.completo === 1));
    await sinFuentes(page);
    await page.addInitScript(ep => { window.__CUHDA_ENDPOINT_TEST__ = ep; sessionStorage.setItem('cuhda-dashboard-clave', 'secreta123'); }, ENDPOINT);
    await page.route(u => u.href.startsWith(ENDPOINT), r => r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, columnas: cols, filas: filas.map(f => cols.map(c => f[c] ?? '')), generado: '2026-11-21T12:00:00Z' }) }));
    await page.goto('/reporte.html');
    await expect(page.locator('.ficha')).toContainText('Hoja de respuestas');
    await expect(page.locator('.ejemplo')).toHaveCount(0);
  });

  for (const ancho of [360, 1280]) {
    test(`el reporte no tiene desplazamiento horizontal a ${ancho}px`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 900 });
      await sinFuentes(page);
      await page.goto('/reporte.html');
      await expect(page.locator('.hoja').first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(ancho);
    });
  }
});
