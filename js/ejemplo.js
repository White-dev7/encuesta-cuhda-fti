/* Datos de EJEMPLO para previsualizar el dashboard sin conexión. Son simulados: no son respuestas reales. */
(function () {
  'use strict';
  function generar(banco, n = 186, semilla = 20251) {
    let s = semilla;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const normal = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
    const pick = pesos => { let r = rnd() * pesos.reduce((a, b) => a + b, 0); for (let i = 0; i < pesos.length; i++) { r -= pesos[i]; if (r <= 0) return i + 1; } return pesos.length; };
    const lik = (base, z) => Math.max(1, Math.min(5, Math.round(base + 0.85 * z + 0.55 * normal())));
    const filas = [], inicio = Date.UTC(2026, 9, 27);
    for (let k = 0; k < n; k++) {
      const dia = Math.floor(Math.pow(rnd(), 1.6) * 24), t0 = inicio + dia * 864e5 + Math.floor(rnd() * 14 * 36e5) + 7 * 36e5;
      const canal = ['qr', 'whatsapp', 'facebook', 'directo', 'correo', 'enlace'][pick([34, 38, 9, 10, 5, 4]) - 1];
      const r = { canal, id_respuesta: 'ejemplo-' + k.toString(36).padStart(6, '0'), version: 'CUHDA-FTI v2.2', piloto: 0, inicio: new Date(t0).toISOString(), dispositivo: rnd() < 0.72 ? 'movil' : 'escritorio' };
      const vacia = () => banco.ITEMS.forEach(q => { if (!(q.id in r)) r[q.id] = ''; });
      if (rnd() < 0.04) { Object.assign(r, { FIL1: 0, completo: 0, motivo_fin: 'sin_consentimiento', duracion_seg: 20 }); vacia(); filas.push(r); continue; }
      r.FIL1 = 1;
      if (rnd() < 0.06) { Object.assign(r, { FIL2: 0, completo: 0, motivo_fin: 'no_elegible', duracion_seg: 30 }); vacia(); filas.push(r); continue; }
      r.FIL2 = 1;
      Object.assign(r, { S1: pick([34, 30, 18, 18]), S2: pick([44, 51, 2, 3]), S3: pick([46, 6, 18, 10, 14, 6]), S4: pick([24, 22, 20, 18, 16]), S5: pick([22, 30, 28, 20]), S6: pick([28, 26, 46]) });
      const pres = normal(), sesgo = r.S6 === 2 ? 0.25 : 0;
      const prob = [[.55, .62, .45, .4], [.92, .48, .81, .15], [.94, .55, .3, .08], [.86, .44, .51, .38], [.83, .5, .36, .2, .22], [.6, .42, .28, .26, .3, .34]];
      ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].forEach((id, h) => {
        const q = banco.ITEMS.find(i => i.id === id); let c = 0;
        q.o.forEach((_, j) => { const v = rnd() < prob[h][j] + 0.08 * pres ? 1 : 0; r[`${id}_${j + 1}`] = v; c += v; });
        r[id + '_ninguna'] = c ? 0 : 1; r[id + '_otra'] = rnd() < 0.04 ? 'Webex' : ''; r[id + '_n'] = c;
      });
      ['F1', 'F2', 'F3', 'F4', 'F5'].forEach((id, i) => { r[id] = lik(3.45 - i * 0.12 + sesgo, 0.8 * pres + 0.2 * normal()); });
      ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'].forEach((id, i) => { r[id] = lik(3.7 - i * 0.1, pres); });
      if (rnd() < 0.22) r.D6 = 0;
      const apr = 0.62 * pres + 0.78 * normal();
      ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'].forEach((id, i) => { r[id] = lik(3.75 - (i === 3 ? 0.3 : 0) + sesgo / 2, apr); });
      r.CTRL1 = rnd() < 0.08 ? pick([10, 10, 20, 0, 60]) : 4;
      if (rnd() < 0.03) { ['F1', 'F2', 'F3', 'F4', 'F5', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6'].forEach(id => { r[id] = 4; }); }
      const sum = ids => ids.reduce((t, id) => t + (+r[id] || 0), 0);
      r.duracion_seg = rnd() < 0.05 ? 70 + Math.floor(rnd() * 40) : 260 + Math.floor(Math.abs(normal()) * 220);
      Object.assign(r, { completo: 1, motivo_fin: 'completa', S3_txt: '', S6_txt: '',
        H1_H5_total: sum(['H1_n', 'H2_n', 'H3_n', 'H4_n', 'H5_n']), H6_total: r.H6_n,
        F_total: sum(['F1', 'F2', 'F3', 'F4', 'F5']), D_total: sum(['D1', 'D2', 'D3', 'D4', 'D5', 'D6']), D6_no_aplica: r.D6 === 0 ? 1 : 0,
        A_total: sum(['A1', 'A2', 'A3', 'A4', 'A5', 'A6']), CTRL1_valido: r.CTRL1 === 4 ? 1 : 0 });
      r.flag_rapido = r.duracion_seg < 120 ? 1 : 0;
      r.flag_lineal = new Set(['F1', 'F2', 'F3', 'F4', 'F5', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6'].map(id => r[id])).size === 1 ? 1 : 0;
      r.fin = new Date(t0 + r.duracion_seg * 1000).toISOString();
      filas.push(r);
    }
    return filas;
  }
  const api = { generar };
  if (typeof window !== 'undefined') window.CUHDA_EJEMPLO = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
