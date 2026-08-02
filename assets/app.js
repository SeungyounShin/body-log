/* Body Log — 인바디 기록 & 운동 프로그램 대시보드 (의존성 없음) */
(() => {
  'use strict';

  // ── 지표 정의 ───────────────────────────────────────────
  // goodDir: +1 = 오를수록 좋음, -1 = 내릴수록 좋음, 0 = 중립
  const METRICS = [
    { key: 'weight', label: '체중',       unit: 'kg',   dec: 1, goodDir: 0 },
    { key: 'smm',    label: '골격근량',   unit: 'kg',   dec: 1, goodDir: 1 },
    { key: 'bfm',    label: '체지방량',   unit: 'kg',   dec: 1, goodDir: -1 },
    { key: 'pbf',    label: '체지방률',   unit: '%',    dec: 1, goodDir: -1 },
    { key: 'bmi',    label: 'BMI',        unit: '',     dec: 1, goodDir: 0 },
    { key: 'score',  label: '인바디 점수', unit: '점',   dec: 0, goodDir: 1 },
    { key: 'bmr',    label: '기초대사량', unit: 'kcal', dec: 0, goodDir: 1 },
    { key: 'visceralFat', label: '내장지방 레벨', unit: '', dec: 0, goodDir: -1 },
  ];
  const METRIC = Object.fromEntries(METRICS.map((m) => [m.key, m]));
  const TILE_KEYS = ['weight', 'smm', 'pbf', 'score'];

  // ── 유틸 ────────────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const has = (v) => v !== null && v !== undefined && v !== '' && !Number.isNaN(v);
  const fmt = (v, dec) => (has(v) ? Number(v).toFixed(dec) : '—');
  const parseDate = (s) => new Date(`${s}T00:00:00`);
  const fmtDate = (s) => {
    const d = parseDate(s);
    return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
  };
  const fmtDateShort = (s) => {
    const d = parseDate(s);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };

  function deltaHTML(cur, prev, m) {
    if (!has(cur) || !has(prev)) return '';
    const d = cur - prev;
    if (Math.abs(d) < 10 ** -(m.dec + 1)) return '<span>변화 없음</span>';
    const sign = d > 0 ? '+' : '−';
    const cls = m.goodDir === 0 ? '' : (d > 0) === (m.goodDir > 0) ? 'up-good' : 'up-bad';
    const arrow = d > 0 ? '↑' : '↓';
    return `<span class="${cls}">${arrow} ${sign}${Math.abs(d).toFixed(m.dec)}${m.unit}</span>`;
  }

  // ── 축 눈금 ─────────────────────────────────────────────
  function niceNum(range, round) {
    const exp = Math.floor(Math.log10(range || 1));
    const f = range / 10 ** exp;
    const nf = round ? (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10)
                     : (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10);
    return nf * 10 ** exp;
  }
  function niceScale(min, max, count = 5) {
    if (min === max) { min -= Math.max(1, Math.abs(min) * 0.05); max += Math.max(1, Math.abs(max) * 0.05); }
    const step = niceNum(niceNum(max - min, false) / (count - 1), true);
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = lo; v <= hi + step * 0.5; v += step) ticks.push(Number(v.toPrecision(12)));
    return { ticks, min: lo, max: hi };
  }

  // ── 라인 차트 ───────────────────────────────────────────
  // series: [{ key, label, color }]  ·  records: 날짜 오름차순
  function renderLineChart(host, records, series, decDefault, opts = {}) {
    host.textContent = '';
    const W = Math.max(260, host.clientWidth);
    const H = opts.height || (W < 520 ? 240 : 300);
    const PAD = { t: 14, r: 52, b: 28, l: 42 };
    const iw = W - PAD.l - PAD.r;
    const ih = H - PAD.t - PAD.b;
    const showEndLabels = true;

    const vals = [];
    series.forEach((s) => records.forEach((r) => { if (has(r[s.key])) vals.push(Number(r[s.key])); }));
    if (!vals.length) { host.appendChild(el('p', 'card-sub', '표시할 값이 없습니다.')); return; }

    const pad = (Math.max(...vals) - Math.min(...vals)) * 0.12 || Math.abs(vals[0]) * 0.03 || 1;
    const sc = niceScale(Math.min(...vals) - pad, Math.max(...vals) + pad, opts.tickCount || 4);
    const y = (v) => PAD.t + ih - ((v - sc.min) / (sc.max - sc.min)) * ih;

    const times = records.map((r) => parseDate(r.date).getTime());
    const t0 = times[0];
    const t1 = times[times.length - 1];
    const x = (t) => (t1 === t0 ? PAD.l + iw / 2 : PAD.l + ((t - t0) / (t1 - t0)) * iw);

    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `${series.map((s) => s.label).join(', ')} 추이 차트`);
    const add = (tag, attrs, style) => {
      const n = document.createElementNS(NS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      if (style) n.setAttribute('style', style);
      svg.appendChild(n);
      return n;
    };

    // 그리드 + y축 눈금 (hairline, solid, recessive)
    sc.ticks.forEach((t) => {
      add('line', { x1: PAD.l, x2: PAD.l + iw, y1: y(t), y2: y(t), 'stroke-width': 1 },
          'stroke: var(--grid)');
      const lb = add('text', { x: PAD.l - 8, y: y(t) + 4, 'text-anchor': 'end' });
      lb.setAttribute('class', 'tick-text');
      lb.textContent = t.toFixed(decDefault);
    });
    // 베이스라인
    add('line', { x1: PAD.l, x2: PAD.l + iw, y1: PAD.t + ih, y2: PAD.t + ih, 'stroke-width': 1 },
        'stroke: var(--axis)');

    // x축 라벨 (촘촘하면 솎아냄)
    const maxLabels = Math.max(2, Math.floor(iw / 58));
    const stride = Math.ceil(records.length / maxLabels);
    records.forEach((r, i) => {
      if (i % stride !== 0 && i !== records.length - 1) return;
      const lb = add('text', { x: x(times[i]), y: H - 10, 'text-anchor': 'middle' });
      lb.setAttribute('class', 'tick-text');
      lb.textContent = fmtDateShort(r.date);
    });

    // 시리즈: 결측은 선을 끊는다
    const endPts = [];
    series.forEach((s) => {
      const segs = [];
      let cur = [];
      records.forEach((r, i) => {
        if (has(r[s.key])) cur.push([x(times[i]), y(Number(r[s.key]))]);
        else if (cur.length) { segs.push(cur); cur = []; }
      });
      if (cur.length) segs.push(cur);

      segs.forEach((seg) => {
        if (seg.length > 1) {
          add('path', {
            d: seg.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' '),
            fill: 'none', 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
          }, `stroke: ${s.color}`);
        }
        seg.forEach((p) => {
          // 마커: r=4 (8px) + 2px 서피스 링
          add('circle', { cx: p[0], cy: p[1], r: 4, 'stroke-width': 2 },
              `fill: ${s.color}; stroke: var(--surface-1)`);
        });
      });

      const last = segs.length ? segs[segs.length - 1][segs[segs.length - 1].length - 1] : null;
      const lastRec = [...records].reverse().find((r) => has(r[s.key]));
      if (last && lastRec) endPts.push({ s, x: last[0], y: last[1], v: Number(lastRec[s.key]) });
    });

    // 엔드 라벨: 겹치면 전부 생략하고 범례/툴팁에 맡긴다
    if (showEndLabels && endPts.length) {
      const sorted = [...endPts].sort((a, b) => a.y - b.y);
      const collide = sorted.some((p, i) => i > 0 && Math.abs(p.y - sorted[i - 1].y) < 15);
      if (!collide) {
        endPts.forEach((p) => {
          const lb = add('text', { x: p.x + 9, y: p.y + 4 });
          lb.setAttribute('class', 'point-label');
          lb.textContent = p.v.toFixed(METRIC[p.s.key] ? METRIC[p.s.key].dec : decDefault);
        });
      }
    }

    // 호버 레이어: 크로스헤어 + 툴팁
    const cross = add('line', { x1: 0, x2: 0, y1: PAD.t, y2: PAD.t + ih, 'stroke-width': 1, opacity: 0 },
                      'stroke: var(--axis)');
    const hit = add('rect', { x: 0, y: 0, width: W, height: H, fill: 'transparent' });

    host.appendChild(svg);
    const tip = el('div', 'tooltip');
    host.appendChild(tip);

    const nearest = (px) => {
      let bi = 0;
      let bd = Infinity;
      times.forEach((t, i) => { const d = Math.abs(x(t) - px); if (d < bd) { bd = d; bi = i; } });
      return bi;
    };
    const show = (evt) => {
      const rect = svg.getBoundingClientRect();
      const px = ((evt.touches ? evt.touches[0].clientX : evt.clientX) - rect.left) * (W / rect.width);
      const i = nearest(px);
      const r = records[i];
      const cx = x(times[i]);
      cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.setAttribute('opacity', 1);
      const rows = series
        .filter((s) => has(r[s.key]))
        .map((s) => {
          const m = METRIC[s.key] || { dec: decDefault, unit: '' };
          return `<div class="tooltip-row"><span class="tooltip-dot" style="background:${s.color}"></span>` +
                 `<span class="tooltip-name">${s.label}</span>` +
                 `<span class="tooltip-val">${fmt(r[s.key], m.dec)}${m.unit}</span></div>`;
        }).join('');
      tip.innerHTML = `<div class="tooltip-date">${fmtDate(r.date)}</div>${rows}`;
      tip.style.opacity = 1;
      const scale = rect.width / W;
      tip.style.left = `${Math.min(Math.max(cx * scale, 60), rect.width - 60)}px`;
      tip.style.top = `${PAD.t * scale - 8}px`;
    };
    const hide = () => { tip.style.opacity = 0; cross.setAttribute('opacity', 0); };
    hit.addEventListener('mousemove', show);
    hit.addEventListener('mouseleave', hide);
    hit.addEventListener('touchstart', show, { passive: true });
    hit.addEventListener('touchmove', show, { passive: true });
    hit.addEventListener('touchend', hide);
  }

  // ── 인바디 렌더 ─────────────────────────────────────────
  let inbodyRecords = [];

  function renderInbody(data) {
    const recs = (data.records || [])
      .filter((r) => r && r.date)
      .sort((a, b) => a.date.localeCompare(b.date));
    inbodyRecords = recs;

    if (!recs.length) { $('#inbody-empty').hidden = false; return; }
    $('#inbody-content').hidden = false;

    const last = recs[recs.length - 1];
    const prev = recs.length > 1 ? recs[recs.length - 2] : null;

    // 히어로 (뷰당 하나)
    $('#hero-date').textContent = fmtDate(last.date);
    $('#hero-weight').textContent = fmt(last.weight, 1);
    $('#hero-delta').innerHTML = prev
      ? `${deltaHTML(last.weight, prev.weight, METRIC.weight)} <span>· 직전 측정(${fmtDate(prev.date)}) 대비</span>`
      : '<span>첫 기록</span>';

    // 스탯 타일
    const tiles = $('#tiles');
    tiles.textContent = '';
    TILE_KEYS.forEach((k) => {
      const m = METRIC[k];
      if (!has(last[k])) return;
      const t = el('div', 'tile');
      t.appendChild(el('p', 'tile-label', m.label));
      const v = el('p', 'tile-value');
      v.textContent = fmt(last[k], m.dec);
      if (m.unit) v.appendChild(el('span', 'tile-unit', m.unit));
      t.appendChild(v);
      const d = el('p', 'tile-delta');
      d.innerHTML = prev ? deltaHTML(last[k], prev[k], m) || '<span>—</span>' : '<span>첫 기록</span>';
      t.appendChild(d);
      tiles.appendChild(t);
    });

    // 표 (색 외의 접근 경로)
    const cols = METRICS.filter((m) => recs.some((r) => has(r[m.key])));
    const table = $('#inbody-table');
    table.textContent = '';
    const thead = el('thead');
    const hr = el('tr');
    hr.appendChild(el('th', null, '날짜'));
    cols.forEach((m) => hr.appendChild(el('th', null, m.unit ? `${m.label} (${m.unit})` : m.label)));
    if (recs.some((r) => r.note)) hr.appendChild(el('th', 'note-cell', '메모'));
    thead.appendChild(hr);
    table.appendChild(thead);
    const tb = el('tbody');
    [...recs].reverse().forEach((r) => {
      const tr = el('tr');
      tr.appendChild(el('td', null, fmtDate(r.date)));
      cols.forEach((m) => tr.appendChild(el('td', null, fmt(r[m.key], m.dec))));
      if (recs.some((x) => x.note)) tr.appendChild(el('td', 'note-cell', r.note || ''));
      tb.appendChild(tr);
    });
    table.appendChild(tb);

    drawCharts();
  }

  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  // 스케일이 제각각인 지표는 한 축에 겹치지 않고 소형 다중 차트로 — 각자 자기 스케일을 갖는다
  const CHART_SPECS = [
    { key: 'weight', sub: '단위 kg',   color: '--series-1' },
    { key: 'smm',    sub: '단위 kg',   color: '--series-3' },
    { key: 'bfm',    sub: '단위 kg',   color: '--series-2' },
    { key: 'pbf',    sub: '단위 %',    color: '--series-2' },
    { key: 'score',  sub: '단위 점',   color: '--series-1' },
    { key: 'bmr',    sub: '단위 kcal', color: '--series-3' },
  ];

  function drawCharts() {
    const grid = $('#charts-grid');
    if (!grid || !inbodyRecords.length) return;
    grid.textContent = '';
    // 1단계: 카드를 전부 붙여 그리드 열 수를 확정한다.
    // (한 장만 붙인 상태에서 폭을 재면 auto-fit이 전체 폭을 주기 때문에 첫 차트가 넘친다)
    const pending = [];
    CHART_SPECS.forEach((spec) => {
      if (!inbodyRecords.some((r) => has(r[spec.key]))) return;
      const m = METRIC[spec.key];
      const card = el('section', 'card');
      card.appendChild(el('h2', 'card-title', `${m.label} 추이`));
      card.appendChild(el('p', 'card-sub', spec.sub));
      const chart = el('div', 'chart');
      card.appendChild(chart);
      grid.appendChild(card);
      pending.push({ spec, m, chart });
    });
    // 2단계: 레이아웃이 확정된 뒤 실제 폭으로 그린다
    pending.forEach(({ spec, m, chart }) => {
      renderLineChart(chart, inbodyRecords,
        [{ key: spec.key, label: m.label, color: cssVar(spec.color) }], m.dec, { height: 190 });
    });
  }

  // ── 운동 렌더 ───────────────────────────────────────────
  function renderWorkout(data) {
    const p = data.current || {};
    $('#program-goal').textContent = data.goal || '';
    $('#program-name').textContent = p.name || '프로그램';
    const meta = [];
    if (p.startDate) meta.push(`시작 ${fmtDate(p.startDate)}`);
    if (p.weeks) meta.push(`${p.weeks}주`);
    if (p.schedule) meta.push(p.schedule);
    $('#program-meta').textContent = meta.join(' · ');
    $('#program-note').textContent = p.note || '';

    const exerciseTable = (exercises) => {
      const scroll = el('div', 'table-scroll');
      const table = el('table', 'day-table');
      const thead = el('thead');
      const hr = el('tr');
      ['운동', '세트', '횟수', '중량', '메모'].forEach((h, i) => hr.appendChild(el('th', i === 4 ? 'note-cell' : null, h)));
      thead.appendChild(hr);
      table.appendChild(thead);
      const tb = el('tbody');
      (exercises || []).forEach((ex) => {
        const tr = el('tr');
        tr.appendChild(el('td', null, ex.name || ''));
        tr.appendChild(el('td', null, ex.sets ?? ''));
        tr.appendChild(el('td', null, ex.reps ?? ''));
        tr.appendChild(el('td', null, ex.load ?? ''));
        tr.appendChild(el('td', 'note-cell', ex.note || ''));
        tb.appendChild(tr);
      });
      table.appendChild(tb);
      scroll.appendChild(table);
      return scroll;
    };

    const host = $('#program-days');
    host.textContent = '';
    (p.days || []).forEach((day) => {
      const card = el('section', 'card');
      const head = el('div', 'day-head');
      head.appendChild(el('h2', 'card-title', day.name || ''));
      if (day.focus) head.appendChild(el('span', 'day-focus', day.focus));
      card.appendChild(head);

      // 하루 2세션 구조를 그대로 표시 — 없으면 예전처럼 단일 목록
      if (day.sessions) {
        day.sessions.forEach((s) => {
          const sh = el('div', 'session-head');
          sh.appendChild(el('span', 'session-time', s.time || ''));
          sh.appendChild(el('span', 'session-name', s.name || ''));
          card.appendChild(sh);
          card.appendChild(exerciseTable(s.exercises));
        });
      } else {
        card.appendChild(exerciseTable(day.exercises));
      }
      host.appendChild(card);
    });

    const nut = data.nutrition;
    if (nut) {
      $('#nutrition-card').hidden = false;
      $('#nutrition-note').textContent = nut.note || '';
      const ul = $('#nutrition-points');
      ul.textContent = '';
      (nut.points || []).forEach((t) => ul.appendChild(el('li', null, t)));
    }

    const phases = data.phases || [];
    if (phases.length) {
      $('#roadmap-card').hidden = false;
      const ol = $('#roadmap');
      ol.textContent = '';
      phases.forEach((ph) => {
        const li = el('li');
        li.appendChild(el('div', 'roadmap-name', `${ph.name}${ph.weeks ? ` · ${ph.weeks}주` : ''}`));
        li.appendChild(el('div', 'roadmap-focus', ph.focus || ''));
        ol.appendChild(li);
      });
    }

    const log = data.changelog || [];
    if (log.length) {
      $('#changelog-card').hidden = false;
      const ul = $('#changelog');
      ul.textContent = '';
      [...log].reverse().forEach((c) => {
        ul.appendChild(el('li', null, `${c.date ? `${fmtDate(c.date)} — ` : ''}${c.change || ''}`));
      });
    }
  }

  // ── 목표 렌더 ───────────────────────────────────────────
  let goalsData = null;
  let perfRecords = [];

  // 같은 종목의 가장 최근 기록. 벤치처럼 반복수가 붙는 종목은 목표 반복수와 같은 세트만 인정
  const latestPerf = (key) => [...perfRecords]
    .filter((r) => r.key === key && has(r.value))
    .sort((a, b) => a.date.localeCompare(b.date))
    .pop() || null;

  function renderGoals() {
    if (!goalsData) return;
    $('#goal-date').textContent = goalsData.targetDate ? fmtDate(goalsData.targetDate) : '—';
    $('#goal-vision').textContent = goalsData.vision || '';
    $('#goal-note').textContent = goalsData.note || '';

    // 체성분: 시작값 → 최신 인바디 → 목표
    const last = inbodyRecords.length ? inbodyRecords[inbodyRecords.length - 1] : null;
    const host = $('#goal-body');
    host.textContent = '';
    (goalsData.body || []).forEach((g) => {
      const cur = last && has(last[g.key]) ? Number(last[g.key]) : g.from;
      const span = g.target - g.from;
      const pct = span === 0 ? 100 : Math.max(0, Math.min(100, ((cur - g.from) / span) * 100));
      const dec = METRIC[g.key] ? METRIC[g.key].dec : 1;

      const row = el('div', 'goal-row');
      const head = el('div', 'goal-head');
      head.appendChild(el('span', 'goal-name', g.label));
      head.appendChild(el('span', 'goal-nums',
        `${g.from.toFixed(dec)} → ${cur.toFixed(dec)} → 12개월 ${g.target.toFixed(dec)}${g.unit}`));
      row.appendChild(head);

      const meter = el('div', 'meter');
      const fill = el('div', 'meter-fill');
      fill.style.width = `${pct}%`;
      meter.appendChild(fill);
      meter.setAttribute('role', 'img');
      meter.setAttribute('aria-label', `${g.label} 진행률 ${Math.round(pct)}%`);
      row.appendChild(meter);

      const remain = Math.abs(g.target - cur).toFixed(dec);
      const foot = pct >= 100 ? '목표 달성' : `진행 ${Math.round(pct)}% · 남은 거리 ${remain}${g.unit}`;
      const ult = has(g.ultimate) ? ` · 최종 ${Number(g.ultimate).toFixed(dec)}${g.unit}` : '';
      row.appendChild(el('p', 'goal-foot', foot + ult));
      host.appendChild(row);
    });

    // 퍼포먼스: 기록이 없으면 '미측정'으로 남긴다
    const table = $('#goal-perf');
    table.textContent = '';
    const thead = el('thead');
    const hr = el('tr');
    ['종목', '현재', '12개월 마일스톤', '최종 목표', '메모']
      .forEach((h, i) => hr.appendChild(el('th', i === 4 ? 'note-cell' : null, h)));
    thead.appendChild(hr);
    table.appendChild(thead);
    const tb = el('tbody');
    (goalsData.performance || []).forEach((g) => {
      const rec = latestPerf(g.key);
      const tr = el('tr');
      tr.appendChild(el('td', null, g.label));
      tr.appendChild(el('td', null, rec ? `${rec.value}${g.unit}` : '미측정'));
      tr.appendChild(el('td', null, `${g.milestone}${g.unit}`));
      tr.appendChild(el('td', null, `${g.target}${g.unit}`));
      tr.appendChild(el('td', 'note-cell', g.note || ''));
      tb.appendChild(tr);
    });
    table.appendChild(tb);

    drawPerfChart();
  }

  function drawPerfChart() {
    const card = $('#perf-chart-card');
    const bench = perfRecords
      .filter((r) => r.key === 'bench' && has(r.value))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((r) => ({ date: r.date, bench: Number(r.value) }));
    if (bench.length < 2) { card.hidden = true; return; }
    card.hidden = false;
    $('#perf-chart-title').textContent = '벤치프레스 10회 중량 추이';
    $('#perf-chart-sub').textContent = '단위 kg';
    renderLineChart($('#perf-chart'), bench,
      [{ key: 'bench', label: '벤치프레스', color: cssVar('--series-1') }], 1, { height: 220 });
  }

  // ── 탭 / 테마 / 리사이즈 ────────────────────────────────
  document.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
      document.querySelectorAll('.panel').forEach((p) => { p.hidden = p.id !== `panel-${btn.dataset.tab}`; });
      // 숨은 패널은 폭이 0이라 차트를 그릴 수 없다 — 보이는 순간 다시 그린다
      if (btn.dataset.tab === 'inbody') drawCharts();
      if (btn.dataset.tab === 'goal') drawPerfChart();
    });
  });

  const applyTheme = (t) => {
    if (t) document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
    drawCharts();
    drawPerfChart();
  };
  applyTheme(localStorage.getItem('bodylog-theme'));
  $('#theme-toggle').addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
      || (!document.documentElement.hasAttribute('data-theme')
          && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const next = isDark ? 'light' : 'dark';
    localStorage.setItem('bodylog-theme', next);
    applyTheme(next);
  });

  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { drawCharts(); drawPerfChart(); }, 120);
  });

  // ── 부트 ────────────────────────────────────────────────
  const load = (path) => fetch(`${path}?v=${Date.now()}`).then((r) => {
    if (!r.ok) throw new Error(`${path}: ${r.status}`);
    return r.json();
  });
  const loadOrNull = (path) => load(path).catch((e) => { console.error(e); return null; });

  Promise.all([
    loadOrNull('./data/inbody.json'),
    loadOrNull('./data/workout.json'),
    loadOrNull('./data/goals.json'),
    loadOrNull('./data/performance.json'),
  ]).then(([inbody, workout, goals, perf]) => {
    if (inbody) renderInbody(inbody); else $('#inbody-empty').hidden = false;
    if (workout) renderWorkout(workout);
    goalsData = goals;
    perfRecords = (perf && perf.records) || [];
    renderGoals();
  });
})();
