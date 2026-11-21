// Base común de las pruebas: impide que cualquier prueba llegue a la hoja real de Google.
// 1) Fija por defecto el modo demostración (endpoint vacío) antes de cargar la página.
// 2) Bloquea toda conexión a script.google.com / googleusercontent.com y hace fallar la prueba si alguien lo intenta.
const base = require('@playwright/test');

const test = base.test.extend({
  page: async ({ page }, use, testInfo) => {
    const intentos = [];
    await page.addInitScript(() => { if (window.__CUHDA_ENDPOINT_TEST__ === undefined) window.__CUHDA_ENDPOINT_TEST__ = ''; });
    await page.route(/script\.google\.com|googleusercontent\.com/, route => { intentos.push(route.request().url()); return route.abort(); });
    await use(page);
    if (intentos.length) throw new Error(`Una prueba intentó conectarse a Google (${intentos.length} vez/veces). Las pruebas nunca deben tocar la hoja real.`);
  }
});

module.exports = { test, expect: base.expect };
