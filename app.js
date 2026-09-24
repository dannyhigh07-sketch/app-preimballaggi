// ===== Logica di calcolo (replica dei fogli Excel: 3a, 4a, 4c, 0b) =====
const roundUp1 = x => Math.ceil(x * 10 - 1e-9) / 10;
function tne(q) {
  if (q <= 50) return roundUp1(q * 0.09);
  if (q <= 100) return 4.5;
  if (q <= 200) return roundUp1(q * 0.045);
  if (q <= 300) return 9;
  if (q <= 500) return roundUp1(q * 0.03);
  if (q <= 1000) return 15;
  if (q <= 10000) return roundUp1(q * 0.015);
  if (q <= 15000) return 150;
  return roundUp1(q * 0.01);
}
const nums = t => (t || '').split(/[\s;]+/).map(s => s.replace(',', '.')).filter(s => s !== '' && !isNaN(s)).map(Number);
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const sd = a => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
const qnGrammi = l => (+l.qn || 0) * (['kg', 'L'].includes(l.unit) ? 1000 : 1);

function calcTara(l) {
  const Q = qnGrammi(l), T = tne(Q), t = nums(l.tara), a10 = t.slice(0, 10);
  const r = { Q, T, n: t.length, atm10: mean(a10), s10: sd(a10), thr1: Q * 0.1, thr2: 0.25 * T };
  if (t.length < 10) { r.caso = 0; r.tara = null; return r; }
  r.atm25 = mean(t.slice(0, 25));
  r.caso = r.atm10 <= r.thr1 ? 1 : (r.s10 <= r.thr2 ? 2 : 3);
  r.tara = r.caso === 1 ? r.atm10 : r.caso === 2 ? r.atm25 : null;
  return r;
}
const cls = (x, T1, T2) => x <= T2 ? 'T2' : x < T1 ? 'T1' : 'OK';

function calcLotto(l, ta) {
  const N = +l.N || 0, Q = ta.Q, T = ta.T, T1 = Q - T, T2 = Q - 2 * T;
  const small = N < 100, base = N <= 500 ? 30 : N <= 3200 ? 50 : 80;
  const n1 = small ? N : base, n2 = small ? 0 : base, nM = small ? N : (N <= 500 ? 30 : 50);
  const k = small ? 0 : (N <= 500 ? 0.503 : 0.379);
  const acc1 = small ? (N <= 39 ? 1 : N <= 79 ? 2 : 3) : (N <= 500 ? 1 : N <= 3200 ? 2 : 3);
  const rif1 = small ? (N <= 39 ? 2 : N <= 79 ? 3 : 4) : (N <= 500 ? 3 : N <= 3200 ? 5 : 7);
  const acc2 = small ? null : (N <= 500 ? 4 : N <= 3200 ? 6 : 8);
  const r = { N, n1, n2, nM, k, acc1, rif1, acc2, T1, T2, T };
  if (ta.tara === null) { r.stato = 'nodata'; return r; }
  const rho = +l.rho || 1;
  const net = nums(l.lordi).map(g => l.stato === 'Liquido' ? (g - ta.tara) / rho : g - ta.tara);
  const c = net.map(x => cls(x, T1, T2));
  r.have = net.length;
  const h13 = c.slice(0, n1).filter(x => x === 'T1').length;
  const second = h13 > acc1 && h13 < rif1;
  const nEx = second ? n1 + n2 : n1;
  r.second = second; r.nEx = nEx;
  r.h13 = h13;
  r.h20 = second ? c.slice(0, n1 + n2).filter(x => x === 'T1').length : h13;
  r.h14 = c.slice(0, nEx).filter(x => x === 'T2').length;
  const sample = net.slice(0, nM);
  r.mean = mean(sample); r.s = sd(sample); r.lim = Q - k * r.s;
  r.reg1 = r.mean >= r.lim;
  r.reg2 = h13 <= acc1 ? true : h13 >= rif1 ? false : r.h20 <= acc2;
  r.reg3 = r.h14 === 0;
  r.stato = net.length < Math.max(nEx, nM) ? 'incompleto' : 'ok';
  r.ok = r.reg1 && r.reg2 && r.reg3;
  return r;
}
function calcDistr(l, ta) {
  const Q = ta.Q, T1 = Q - ta.T, T2 = Q - 2 * ta.T, d = nums(l.destr).slice(0, 20);
  const c = d.map(x => cls(x, T1, T2));
  const r = { n: d.length, mean: mean(d), s: sd(d), k: 0.64, acc: 1 };
  r.lim = Q - r.k * r.s;
  r.h13 = c.filter(x => x === 'T1').length; r.h14 = c.filter(x => x === 'T2').length;
  r.reg1 = r.mean >= r.lim; r.reg2 = r.h13 <= r.acc; r.reg3 = r.h14 === 0;
  r.ok = r.reg1 && r.reg2 && r.reg3;
  return r;
}
const saggio = (q, g) => (q === '' || g === '' || isNaN(q) || isNaN(g)) ? '' : (+g >= +q - tne(+q) ? 'CONFORME' : 'NON CONFORME');
if (typeof module !== 'undefined') { module.exports = { tne, nums, calcTara, calcLotto, calcDistr, saggio }; }

// ===== Interfaccia =====
if (typeof document !== 'undefined') {
  const KEY = 'preimballaggi-v1';
  const blank = () => ({ nome: '', qn: '', unit: 'g', stato: 'Solido Secco', rho: 1, N: '', tara: '', lordi: '', destr: '' });
  let S = { lots: { 1: blank(), 2: blank() }, dist: [{ n: '', q: '', g: '' }], tab: '1' };
  try { const x = JSON.parse(localStorage.getItem(KEY)); if (x) S = x; } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
  const f = (x, d = 3) => (typeof x === 'number' && isFinite(x)) ? x.toFixed(d).replace(/\.?0+$/, '') : '–';
  const badge = (ok, t1, t2) => `<span class="b ${ok ? 'ok' : 'ko'}">${ok ? t1 : t2}</span>`;
  const row = (a, b) => `<div class="r"><span>${a}</span><b>${b}</b></div>`;

  const lotHtml = i => `<section data-lot="${i}">
   <div class="c"><h2>Prodotto e lotto ${i}${i == 2 ? ' (opzionale)' : ''}</h2>
    <label>Prodotto<input data-l="${i}" data-f="nome"></label>
    <div class="g2"><label>Qn<input inputmode="decimal" data-l="${i}" data-f="qn"></label>
    <label>Unità<select data-l="${i}" data-f="unit"><option>g</option><option>ml</option><option>kg</option><option>L</option></select></label></div>
    <div class="g2"><label>Stato fisico<select data-l="${i}" data-f="stato"><option>Solido Secco</option><option>Liquido</option><option>Polvere</option><option>Sgocciolato/Surgelato</option></select></label>
    <label>Densità ρ (g/ml)<input inputmode="decimal" data-l="${i}" data-f="rho"></label></div>
    <label>Dimensione lotto N (pezzi)<input inputmode="numeric" data-l="${i}" data-f="N"></label></div>
   <div class="c"><h2>Tara</h2><p class="h">Una tara per riga (min. 10, max. 25). Virgola o punto.</p>
    <textarea rows="5" data-l="${i}" data-f="tara"></textarea><div id="tara-${i}"></div></div>
   <div class="c"><h2>Pesate lorde (non distruttivo)</h2><p class="h">Un valore per riga, in g.</p>
    <textarea rows="8" data-l="${i}" data-f="lordi"></textarea><div id="lot-${i}"></div></div>
   <div class="c"><h2>Controllo distruttivo (solo Caso 3)</h2><p class="h">20 valori di contenuto effettivo diretto, uno per riga.</p>
    <textarea rows="6" data-l="${i}" data-f="destr"></textarea><div id="dis-${i}"></div></div></section>`;

  function distHtml() {
    return S.dist.map((d, j) => `<div class="c dr"><label>Prodotto<input data-d="${j}" data-f="n" value="${(d.n || '').replace(/"/g, '&quot;')}"></label>
      <div class="g2"><label>Qn (g/ml)<input inputmode="decimal" data-d="${j}" data-f="q" value="${d.q}"></label>
      <label>Pesata (g/ml)<input inputmode="decimal" data-d="${j}" data-f="g" value="${d.g}"></label></div>
      <div class="rr"><span id="dr-${j}"></span><button data-del="${j}">Elimina</button></div></div>`).join('');
  }
  function calcDistRows() { S.dist.forEach((d, j) => { const v = saggio(String(d.q).replace(',', '.'), String(d.g).replace(',', '.')); const e = document.getElementById('dr-' + j); if (e) e.innerHTML = v ? badge(v === 'CONFORME', v, v) : ''; }); }

  function update() {
    [1, 2].forEach(i => {
      const l = S.lots[i], ta = calcTara(l);
      const tEl = document.getElementById('tara-' + i), lEl = document.getElementById('lot-' + i), dEl = document.getElementById('dis-' + i);
      if (!l.qn) { tEl.innerHTML = lEl.innerHTML = dEl.innerHTML = ''; return; }
      let h = row('TNE', f(ta.T) + ' g') + row('Tare inserite', ta.n) + row('ATM (10 camp.)', f(ta.atm10) + ' g') + row('Scarto tipo (10)', f(ta.s10) + ' g') + row('Soglie 10% Qn / 0,25·TNE', f(ta.thr1) + ' / ' + f(ta.thr2));
      h += ta.caso === 0 ? '<p class="w">Inserire almeno 10 tare.</p>' :
        ta.caso === 3 ? '<span class="b ko">Caso 3: CONTROLLO DISTRUTTIVO NECESSARIO</span>' :
        `<span class="b ok">Caso ${ta.caso}: controllo non distruttivo</span>` + row('Tara usata', f(ta.tara) + ' g');
      tEl.innerHTML = h;
      const r = calcLotto(l, ta);
      if (r.stato === 'nodata') { lEl.innerHTML = '<p class="h">Non disponibile: tara non utilizzabile.</p>'; }
      else {
        let x = row('Piano', r.N < 100 ? 'Controllo 100% (N<100)' : 'Doppio campionamento') + row('n1 / n2 / n media', `${r.n1} / ${r.n2} / ${r.nM}`) + row('Soglia T1 / T2', `${f(r.T1)} / ${f(r.T2)}`) +
          row('Pesate inserite', r.have) + row('Media x̄', f(r.mean)) + row('Scarto s', f(r.s)) + row('Limite Qn − k·s', f(r.lim)) +
          row('Difettosi T1 (n1)', `${r.h13} (Ac ${r.acc1} / Re ${r.rif1})`) + row('Scarti T2', r.h14);
        if (r.second) x += `<p class="w">Serve il 2° campione (n1+n2 = ${r.n1 + r.n2} pesate). T1 cumulati: ${r.h20} (Ac ${r.acc2}).</p>`;
        x += row('Regola 1 (media)', badge(r.reg1, 'CONFORME', 'NON CONFORME')) + row('Regola 2 (T1)', badge(r.reg2, 'CONFORME', 'NON CONFORME')) + row('Regola 3 (T2 = 0)', badge(r.reg3, 'CONFORME', 'NON CONFORME'));
        x += r.stato === 'incompleto' ? `<p class="w">Dati incompleti: servono ${Math.max(r.nEx, r.nM)} pesate.</p>` : `<div class="v ${r.ok ? 'ok' : 'ko'}">${r.ok ? 'LOTTO ACCETTATO' : 'LOTTO RESPINTO'}</div>`;
        lEl.innerHTML = x;
      }
      if (ta.caso !== 3) { dEl.innerHTML = '<p class="h">Non necessario (tara Caso 1 o 2).</p>'; return; }
      const d = calcDistr(l, ta);
      let y = row('Campioni', d.n + ' / 20') + row('Media x̄', f(d.mean)) + row('Scarto s', f(d.s)) + row('Limite Qn − 0,64·s', f(d.lim)) + row('Difettosi T1 (Ac 1)', d.h13) + row('Scarti T2', d.h14);
      y += d.n < 20 ? '<p class="w">Inserire tutti i 20 campioni.</p>' : `<div class="v ${d.ok ? 'ok' : 'ko'}">${d.ok ? 'LOTTO ACCETTATO (distruttivo)' : 'LOTTO RESPINTO (distruttivo)'}</div>`;
      dEl.innerHTML = y;
    });
    calcDistRows();
  }
  function showTab() {
    document.querySelectorAll('section').forEach(s => s.hidden = (s.dataset.lot || 'd') !== S.tab);
    document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.t === S.tab));
  }
  function init() {
    document.getElementById('lot1').innerHTML = lotHtml(1);
    document.getElementById('lot2').innerHTML = lotHtml(2);
    document.querySelectorAll('[data-l]').forEach(e => { e.value = S.lots[e.dataset.l][e.dataset.f] ?? ''; });
    const dd = document.getElementById('dlist'); dd.innerHTML = distHtml();
    showTab(); update();
  }
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.l) S.lots[t.dataset.l][t.dataset.f] = t.value;
    else if (t.dataset.d !== undefined) S.dist[t.dataset.d][t.dataset.f] = t.value;
    else return;
    save(); update();
  });
  document.addEventListener('click', e => {
    const t = e.target;
    if (t.dataset.t) { S.tab = t.dataset.t; save(); showTab(); }
    if (t.id === 'add') { S.dist.push({ n: '', q: '', g: '' }); save(); document.getElementById('dlist').innerHTML = distHtml(); update(); }
    if (t.dataset.del !== undefined) { S.dist.splice(+t.dataset.del, 1); if (!S.dist.length) S.dist.push({ n: '', q: '', g: '' }); save(); document.getElementById('dlist').innerHTML = distHtml(); update(); }
    if (t.id === 'reset' && confirm('Cancellare tutti i dati inseriti?')) { S = { lots: { 1: blank(), 2: blank() }, dist: [{ n: '', q: '', g: '' }], tab: '1' }; save(); init(); }
  });
  init();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
}
