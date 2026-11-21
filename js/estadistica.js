/* Funciones estadísticas del dashboard CUHDA-FTI (sin dependencias, probadas en tests/estadistica.spec.js). */
(function () {
  'use strict';
  const num = v => (v === '' || v === null || v === undefined || Number.isNaN(+v) ? null : +v);
  const clean = a => a.map(num).filter(v => v !== null);
  const mean = a => { const x = clean(a); return x.length ? x.reduce((s, v) => s + v, 0) / x.length : null; };
  const variance = a => { const x = clean(a); if (x.length < 2) return null; const m = mean(x); return x.reduce((s, v) => s + (v - m) ** 2, 0) / (x.length - 1); };
  const sd = a => { const v = variance(a); return v === null ? null : Math.sqrt(v); };
  const quantile = (a, q) => { const x = clean(a).sort((p, r) => p - r); if (!x.length) return null; const i = (x.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return x[lo] + (x[hi] - x[lo]) * (i - lo); };
  const median = a => quantile(a, 0.5);

  /** Intervalo de confianza del 95 % para la media (t de Student aproximada). */
  function ciMean(a) {
    const x = clean(a), n = x.length; if (n < 2) return null;
    const t = n > 120 ? 1.98 : n > 60 ? 2.0 : n > 30 ? 2.04 : n > 20 ? 2.09 : n > 10 ? 2.23 : 2.78;
    const m = mean(x), e = t * sd(x) / Math.sqrt(n);
    return { mean: m, lo: m - e, hi: m + e, n };
  }

  /** Alfa de Cronbach con casos completos. filas: arreglo de arreglos (una fila por persona, una columna por ítem). */
  function cronbach(filas) {
    const ok = filas.filter(f => f.every(v => num(v) !== null)).map(f => f.map(Number));
    const n = ok.length, k = ok[0]?.length || 0;
    if (n < 3 || k < 2) return { alpha: null, n, k };
    const sumVar = Array.from({ length: k }, (_, j) => variance(ok.map(f => f[j]))).reduce((s, v) => s + v, 0);
    const totVar = variance(ok.map(f => f.reduce((s, v) => s + v, 0)));
    if (!totVar) return { alpha: null, n, k };
    return { alpha: (k / (k - 1)) * (1 - sumVar / totVar), n, k };
  }
  const alphaLabel = a => a === null ? 'sin datos suficientes' : a >= 0.9 ? 'excelente' : a >= 0.8 ? 'buena' : a >= 0.7 ? 'aceptable' : a >= 0.6 ? 'cuestionable' : 'baja';

  /** Correlación de Pearson con IC 95 % (transformación de Fisher). */
  function pearson(x, y) {
    const pares = x.map((v, i) => [num(v), num(y[i])]).filter(p => p[0] !== null && p[1] !== null);
    const n = pares.length; if (n < 4) return { r: null, n };
    const mx = mean(pares.map(p => p[0])), my = mean(pares.map(p => p[1]));
    let sxy = 0, sxx = 0, syy = 0;
    for (const [a, b] of pares) { sxy += (a - mx) * (b - my); sxx += (a - mx) ** 2; syy += (b - my) ** 2; }
    if (!sxx || !syy) return { r: null, n };
    const r = sxy / Math.sqrt(sxx * syy), z = Math.atanh(Math.max(-0.999999, Math.min(0.999999, r))), se = 1 / Math.sqrt(n - 3);
    return { r, n, lo: Math.tanh(z - 1.96 * se), hi: Math.tanh(z + 1.96 * se), pendiente: sxy / sxx, intercepto: my - (sxy / sxx) * mx };
  }

  /** Frecuencias de un valor categórico: devuelve [{codigo, n, pct}] en el orden de `codigos`. */
  function frecuencias(valores, codigos) {
    const x = clean(valores), n = x.length;
    return codigos.map(c => { const k = x.filter(v => v === c).length; return { codigo: c, n: k, pct: n ? k / n : 0 }; });
  }

  /** Puntaje medio de una persona en un conjunto de ítems; ignora los ceros indicados como "no aplica". */
  function puntaje(fila, ids, { ceroEsPerdido = false } = {}) {
    const v = ids.map(id => num(fila[id])).filter(x => x !== null && !(ceroEsPerdido && x === 0));
    return v.length ? v.reduce((s, a) => s + a, 0) / v.length : null;
  }

  /** Matriz de correlaciones de Pearson entre columnas (casos completos). */
  function correlaciones(filas) {
    const ok = filas.filter(f => f.every(v => num(v) !== null)).map(f => f.map(Number));
    const k = ok[0]?.length || 0, R = [];
    for (let i = 0; i < k; i++) { R.push([]); for (let j = 0; j < k; j++) R[i].push(i === j ? 1 : (pearson(ok.map(f => f[i]), ok.map(f => f[j])).r ?? 0)); }
    return { R, n: ok.length };
  }

  /**
   * Omega de McDonald (ω total) para un factor, con cargas estimadas por factorización de ejes principales
   * sobre la matriz de correlaciones: ω = (Σλ)² / ((Σλ)² + Σ(1 − λ²)).
   */
  function omegaDesdeR(R, iter = 200) {
    const k = R.length; if (k < 2) return { omega: null, cargas: [] };
    let h = R.map((fila, i) => Math.max(...fila.filter((_, j) => j !== i).map(Math.abs)));
    let carg = new Array(k).fill(0);
    for (let t = 0; t < iter; t++) {
      const M = R.map((fila, i) => fila.map((v, j) => (i === j ? h[i] : v)));
      let v = new Array(k).fill(1 / Math.sqrt(k)), val = 0;
      for (let p = 0; p < 300; p++) {
        const w = M.map(fila => fila.reduce((s, x, j) => s + x * v[j], 0));
        const nrm = Math.sqrt(w.reduce((s, x) => s + x * x, 0)); if (!nrm) break;
        const nv = w.map(x => x / nrm); val = nrm;
        if (nv.every((x, i) => Math.abs(x - v[i]) < 1e-12)) { v = nv; break; } v = nv;
      }
      const nuevo = v.map(x => x * Math.sqrt(Math.max(val, 0)));
      const sgn = nuevo.reduce((s, x) => s + x, 0) < 0 ? -1 : 1;
      const nh = nuevo.map(x => Math.min(0.995, x * x));
      const cambio = Math.max(...nh.map((x, i) => Math.abs(x - h[i])));
      carg = nuevo.map(x => x * sgn); h = nh;
      if (cambio < 1e-9) break;
    }
    const s = carg.reduce((a, b) => a + b, 0), u = carg.reduce((a, l) => a + (1 - l * l), 0);
    return { omega: s * s / (s * s + u), cargas: carg };
  }
  function omega(filas) {
    const { R, n } = correlaciones(filas);
    if (n < 5 || R.length < 2) return { omega: null, n, cargas: [] };
    return { ...omegaDesdeR(R), n };
  }

  const api = { num, mean, variance, sd, median, quantile, ciMean, cronbach, alphaLabel, pearson, frecuencias, puntaje, correlaciones, omegaDesdeR, omega };
  if (typeof window !== 'undefined') window.CUHDA_ESTADISTICA = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
