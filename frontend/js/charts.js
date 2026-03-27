/**
 * CHARTS.JS — Chart.js rendering for health dashboard
 * All chart instances are stored for live updates
 */

const Charts = {};

// ── Common Chart Defaults ──────────────────────────────────────
Chart.defaults.color = '#8892b0';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.font.size = 11;

const sparkOpts = (color) => ({
  type: 'line',
  data: { labels: [], datasets: [{ data: [], borderColor: color, borderWidth: 2, pointRadius: 0, tension: 0.4, fill: true, backgroundColor: hexToRgba(color, 0.08) }] },
  options: {
    responsive: true, maintainAspectRatio: false, animation: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: { x: { display: false }, y: { display: false } }
  }
});

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Sparkline Charts ───────────────────────────────────────────
function initSparkCharts() {
  Charts.hr = new Chart(document.getElementById('hrChart'), sparkOpts('#ef4444'));
  Charts.bp = new Chart(document.getElementById('bpChart'), sparkOpts('#fb923c'));
  Charts.temp = new Chart(document.getElementById('tempChart'), sparkOpts('#f87171'));
  Charts.hrv = new Chart(document.getElementById('hrvChart'), sparkOpts('#22c55e'));
}

function updateSparkChart(chart, history) {
  chart.data.labels = history.map((_,i) => i);
  chart.data.datasets[0].data = history.map(p => p.v);
  chart.update('none');
}

// ── SpO2 Gauge ─────────────────────────────────────────────────
function initSpo2Gauge() {
  Charts.spo2 = new Chart(document.getElementById('spo2Gauge'), {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [98, 2],
        backgroundColor: ['#06b6d4', 'rgba(255,255,255,0.05)'],
        borderWidth: 0,
        circumference: 270,
        rotation: 225
      }]
    },
    options: {
      responsive: false, maintainAspectRatio: false,
      cutout: '75%',
      plugins: { legend: { display: false }, tooltip: { enabled: false } }
    }
  });
}

function updateSpo2Gauge(value) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct < 90 ? '#ef4444' : pct < 95 ? '#f59e0b' : '#06b6d4';
  Charts.spo2.data.datasets[0].data = [pct, 100 - pct];
  Charts.spo2.data.datasets[0].backgroundColor[0] = color;
  Charts.spo2.update('none');
}

// ── AI Risk Gauge ──────────────────────────────────────────────
function initRiskGauge() {
  Charts.risk = new Chart(document.getElementById('riskGauge'), {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [18, 82],
        backgroundColor: ['#22c55e', 'rgba(255,255,255,0.04)'],
        borderWidth: 0,
        circumference: 240,
        rotation: 240
      }]
    },
    options: {
      responsive: false, maintainAspectRatio: false,
      cutout: '70%',
      plugins: { legend: { display: false }, tooltip: { enabled: false } }
    }
  });
}

function updateRiskGauge(score) {
  const color = score >= 70 ? '#ef4444' : score >= 40 ? '#f59e0b' : score >= 20 ? '#06b6d4' : '#22c55e';
  Charts.risk.data.datasets[0].data = [score, 100 - score];
  Charts.risk.data.datasets[0].backgroundColor[0] = color;
  Charts.risk.update('none');
}

// ── Activity Donut ─────────────────────────────────────────────
function initActivityChart() {
  Charts.activity = new Chart(document.getElementById('activityChart'), {
    type: 'doughnut',
    data: {
      datasets: [
        { data: [62, 38], backgroundColor: ['#6366f1', 'rgba(255,255,255,0.04)'], borderWidth: 0, circumference: 360, cutout: '82%' },
        { data: [75, 25], backgroundColor: ['#ec4899', 'rgba(255,255,255,0.04)'], borderWidth: 0, circumference: 360, cutout: '68%' },
        { data: [45, 55], backgroundColor: ['#06b6d4', 'rgba(255,255,255,0.04)'], borderWidth: 0, circumference: 360, cutout: '54%' }
      ]
    },
    options: {
      responsive: false, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } }
    }
  });
}

// ── 24h Trends Chart ──────────────────────────────────────────
function initTrendsChart() {
  const ctx = document.getElementById('trendsChart');
  const history = HealthData.trendHistory;
  const labels = history.map(p => {
    const d = new Date(p.t);
    return d.getHours() + ':' + String(d.getMinutes()).padStart(2,'0');
  });

  Charts.trends = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Heart Rate', data: history.map(p => p.hr), borderColor: '#ef4444', borderWidth: 2, pointRadius: 0, tension: 0.4, fill: false },
        { label: 'BP Systolic', data: history.map(p => p.bpSys), borderColor: '#fb923c', borderWidth: 2, pointRadius: 0, tension: 0.4, fill: false },
        { label: 'BP Diastolic', data: history.map(p => p.bpDia), borderColor: '#f59e0b', borderWidth: 2, pointRadius: 0, tension: 0.4, fill: false, borderDash: [4,4] },
        { label: 'Stress', data: history.map(p => p.stress), borderColor: '#6366f1', borderWidth: 2, pointRadius: 0, tension: 0.4, fill: false }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 500 },
      plugins: {
        legend: { display: true, position: 'top', labels: { usePointStyle: true, boxWidth: 8, padding: 16, font: { size: 10 } } },
        tooltip: { mode: 'index', intersect: false, backgroundColor: 'rgba(10,15,30,0.9)', borderColor: 'rgba(99,102,241,0.3)', borderWidth: 1 }
      },
      scales: {
        x: { display: true, ticks: { maxTicksLimit: 12, maxRotation: 0 }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { display: true, grid: { color: 'rgba(255,255,255,0.04)' }, min: 40, max: 180 }
      }
    }
  });
}

function updateTrendsChart(view) {
  const history = HealthData.trendHistory;
  const n = view === '7d' ? history.length : view === '30d' ? history.length : Math.min(144, history.length);
  const slice = history.slice(-n);
  Charts.trends.data.labels = slice.map(p => {
    const d = new Date(p.t);
    return d.getHours() + ':' + String(d.getMinutes()).padStart(2,'0');
  });
  Charts.trends.data.datasets[0].data = slice.map(p => p.hr);
  Charts.trends.data.datasets[1].data = slice.map(p => p.bpSys);
  Charts.trends.data.datasets[2].data = slice.map(p => p.bpDia);
  Charts.trends.data.datasets[3].data = slice.map(p => p.stress);
  Charts.trends.update();
}

// ── Fall Detection Chart ───────────────────────────────────────
function initFallChart() {
  Charts.fall = new Chart(document.getElementById('fallChart'), {
    type: 'bar',
    data: {
      labels: HealthData.fallHistory.map((_,i) => i),
      datasets: [{
        data: HealthData.fallHistory.map(p => p.v),
        backgroundColor: HealthData.fallHistory.map(p => p.v > 0 ? '#ef4444' : 'rgba(99,102,241,0.2)'),
        borderRadius: 2,
        barPercentage: 0.6
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: { x: { display: false }, y: { display: false, min: 0, max: 1.5 } }
    }
  });
}

// ── Weekly Analytics Chart ─────────────────────────────────────
function initWeeklyChart() {
  const weekly = getWeeklyData();
  Charts.weekly = new Chart(document.getElementById('weeklyChart'), {
    type: 'bar',
    data: {
      labels: weekly.labels,
      datasets: [
        { label: 'Avg HR (bpm)', data: weekly.hr, backgroundColor: 'rgba(239,68,68,0.6)', borderRadius: 4, yAxisID: 'y' },
        { label: 'Systolic BP', data: weekly.bpSys, backgroundColor: 'rgba(251,146,60,0.6)', borderRadius: 4, yAxisID: 'y' },
        { label: 'HRV (ms)', data: weekly.hrv, backgroundColor: 'rgba(34,197,94,0.6)', borderRadius: 4, yAxisID: 'y2' }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true, position: 'top', labels: { usePointStyle: true, boxWidth: 8, padding: 16, font: { size: 10 } } }, tooltip: { backgroundColor: 'rgba(10,15,30,0.9)', borderColor: 'rgba(99,102,241,0.3)', borderWidth: 1 } },
      scales: {
        y: { display: true, grid: { color: 'rgba(255,255,255,0.04)' }, position: 'left', min: 0 },
        y2: { display: true, grid: { display: false }, position: 'right', min: 0, max: 80 },
        x: { grid: { color: 'rgba(255,255,255,0.04)' } }
      }
    }
  });
}

// ── HRV Distribution Chart ─────────────────────────────────────
function initHRVDistChart() {
  const data = Array.from({ length: 20 }, (_, i) => {
    const hrv = 20 + i * 2.5;
    const count = Math.round(Math.exp(-0.5 * Math.pow((hrv - 42) / 12, 2)) * 40 + Math.random() * 5);
    return { hrv: hrv.toFixed(0), count };
  });
  Charts.hrvDist = new Chart(document.getElementById('hrvDistChart'), {
    type: 'bar',
    data: {
      labels: data.map(d => d.hrv),
      datasets: [{
        label: 'Frequency',
        data: data.map(d => d.count),
        backgroundColor: data.map(d => d.hrv >= 38 && d.hrv <= 46 ? 'rgba(99,102,241,0.8)' : 'rgba(99,102,241,0.25)'),
        borderRadius: 3
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(10,15,30,0.9)', borderColor: 'rgba(99,102,241,0.3)', borderWidth: 1 } },
      scales: { x: { display: true, ticks: { maxTicksLimit: 8 }, grid: { color: 'rgba(255,255,255,0.04)' } }, y: { display: true, grid: { color: 'rgba(255,255,255,0.04)' } } }
    }
  });
}

// ── Sleep Chart ────────────────────────────────────────────────
function initSleepChart() {
  const sleep = getSleepData();
  Charts.sleep = new Chart(document.getElementById('sleepChart'), {
    type: 'bar',
    data: {
      labels: sleep.labels,
      datasets: [
        { label: 'Deep (h)', data: sleep.deep, backgroundColor: 'rgba(99,102,241,0.8)', borderRadius: 3, stack: 'sleep' },
        { label: 'REM (h)', data: sleep.rem, backgroundColor: 'rgba(236,72,153,0.7)', borderRadius: 3, stack: 'sleep' },
        { label: 'Light (h)', data: sleep.light, backgroundColor: 'rgba(99,102,241,0.25)', borderRadius: 3, stack: 'sleep' }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true, position: 'top', labels: { usePointStyle: true, boxWidth: 8, padding: 12, font: { size: 10 } } }, tooltip: { backgroundColor: 'rgba(10,15,30,0.9)', borderColor: 'rgba(99,102,241,0.3)', borderWidth: 1 } },
      scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, stacked: true, max: 10 } }
    }
  });
}

// ── Initialize all charts ──────────────────────────────────────
function initAllCharts() {
  initSparkCharts();
  initSpo2Gauge();
  initRiskGauge();
  initActivityChart();
  initTrendsChart();
  initFallChart();
  initWeeklyChart();
  initHRVDistChart();
  initSleepChart();
}
