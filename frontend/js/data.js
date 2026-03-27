/**
 * DATA.JS — Real-time health data simulation
 * Simulates sensor data from ESP32-S3 wearable band
 */

// ── Simulation State ──────────────────────────────────────────
const HealthData = {
  hr: 72,
  bpSys: 118, bpDia: 76,
  spo2: 98,
  stress: 24,
  temp: 36.8,
  hrv: 42,
  riskScore: 18,
  cardiacRisk: 12, strokeRisk: 8, hypertRisk: 22, fallRisk: 5,
  steps: 6284,
  battery: 78,

  hrHistory: [],
  bpHistory: [],
  tempHistory: [],
  hrvHistory: [],
  fallHistory: [],
  trendHistory: [],

  alertCount: 0,
  activeEmergency: null
};

// Pre-fill history (last 60 points)
function initHistory() {
  const now = Date.now();
  for (let i = 59; i >= 0; i--) {
    const t = now - i * 3000;
    HealthData.hrHistory.push({ t, v: 68 + Math.random() * 8 });
    HealthData.bpHistory.push({ t, v: 116 + Math.random() * 6 });
    HealthData.tempHistory.push({ t, v: 36.6 + Math.random() * 0.4 });
    HealthData.hrvHistory.push({ t, v: 38 + Math.random() * 8 });
    HealthData.fallHistory.push({ t, v: Math.random() < 0.05 ? 1 : 0 });
  }

  // 24h trend data (144 points × 10-min intervals)
  for (let i = 143; i >= 0; i--) {
    const hour = (i / 6);
    const sleepBonus = hour > 22 || hour < 6 ? -10 : 0;
    HealthData.trendHistory.push({
      t: Date.now() - i * 600000,
      hr: 65 + Math.sin(i * 0.3) * 8 + Math.random() * 5 + sleepBonus,
      bpSys: 115 + Math.sin(i * 0.2) * 12 + Math.random() * 6,
      bpDia: 75 + Math.sin(i * 0.2) * 8 + Math.random() * 4,
      stress: Math.max(5, 30 + Math.sin(i * 0.5) * 20 + Math.random() * 10)
    });
  }
}

initHistory();

// ── Simulation Engine (runs every 2s) ──────────────────────────
function simulateData() {
  const rand = (a, b) => a + Math.random() * (b - a);
  const jitter = (v, delta) => v + (Math.random() - 0.5) * 2 * delta;

  // Update vitals with smooth random walk
  HealthData.hr = Math.round(Math.max(55, Math.min(115, jitter(HealthData.hr, 1.5))));
  HealthData.bpSys = Math.round(Math.max(100, Math.min(165, jitter(HealthData.bpSys, 0.8))));
  HealthData.bpDia = Math.round(Math.max(65, Math.min(105, jitter(HealthData.bpDia, 0.5))));
  HealthData.spo2 = Math.max(94, Math.min(100, parseFloat((jitter(HealthData.spo2, 0.3)).toFixed(1))));
  HealthData.stress = Math.round(Math.max(5, Math.min(80, jitter(HealthData.stress, 2))));
  HealthData.temp = parseFloat(Math.max(36.0, Math.min(37.8, jitter(HealthData.temp, 0.05))).toFixed(1));
  HealthData.hrv = Math.round(Math.max(15, Math.min(70, jitter(HealthData.hrv, 1.5))));
  HealthData.steps = Math.min(12000, HealthData.steps + Math.floor(rand(0, 4)));

  // Risk score based on vitals
  let baseRisk = 0;
  if (HealthData.hr > 100 || HealthData.hr < 55) baseRisk += 20;
  if (HealthData.bpSys > 140) baseRisk += 15;
  if (HealthData.spo2 < 95) baseRisk += 25;
  if (HealthData.stress > 65) baseRisk += 10;
  HealthData.riskScore = Math.min(95, Math.max(5, Math.round(baseRisk + rand(-3, 3))));

  // Sub risks
  HealthData.cardiacRisk = Math.max(2, Math.round(HealthData.riskScore * 0.65 + rand(-3, 3)));
  HealthData.strokeRisk = Math.max(1, Math.round(HealthData.riskScore * 0.45 + rand(-2, 2)));
  HealthData.hypertRisk = Math.max(5, Math.round(HealthData.riskScore * 1.2 + rand(-5, 5)));
  HealthData.fallRisk = Math.max(1, Math.round(rand(2, 8)));

  // Append to histories (keep last 60)
  const now = Date.now();
  const push = (arr, val) => { arr.push({ t: now, v: val }); if (arr.length > 60) arr.shift(); };
  push(HealthData.hrHistory, HealthData.hr);
  push(HealthData.bpHistory, HealthData.bpSys);
  push(HealthData.tempHistory, HealthData.temp);
  push(HealthData.hrvHistory, HealthData.hrv);
  push(HealthData.fallHistory, 0);

  // Battery slow drain
  if (Math.random() < 0.005) HealthData.battery = Math.max(1, HealthData.battery - 1);

  // Dispatch update event
  window.dispatchEvent(new CustomEvent('healthUpdate', { detail: { ...HealthData } }));
}

// Occasional anomaly injection for realism
function injectAnomaly() {
  const roll = Math.random();
  if (roll < 0.1) {
    // Elevated HR episode
    HealthData.hr = 104 + Math.random() * 10;
    showToast('Elevated heart rate detected: ' + Math.round(HealthData.hr) + ' bpm', 'warning');
    HealthData.alertCount++;
    updateAlertBadge();
  } else if (roll < 0.13) {
    // Low SpO2 dip
    HealthData.spo2 = 93 + Math.random() * 1.5;
    showToast('SpO₂ dip detected: ' + HealthData.spo2.toFixed(1) + '% — monitoring', 'warning');
  }
}

setInterval(simulateData, 2000);
setInterval(injectAnomaly, 30000);

// ── Helpers ────────────────────────────────────────────────────
function getHRStatus(hr) {
  if (hr < 50 || hr > 100) return { label: 'Alert', cls: 'status-warn' };
  if (hr < 55 || hr > 95) return { label: 'Watch', cls: 'status-warn' };
  return { label: 'Normal', cls: 'status-normal' };
}

function getBPStatus(sys, dia) {
  if (sys > 160 || dia > 100) return { label: 'High', cls: 'status-critical' };
  if (sys > 130 || dia > 85) return { label: 'Elevated', cls: 'status-warn' };
  return { label: 'Normal', cls: 'status-normal' };
}

function getSpo2Status(spo2) {
  if (spo2 < 90) return { label: 'Critical', cls: 'status-critical' };
  if (spo2 < 95) return { label: 'Low', cls: 'status-warn' };
  return { label: 'Normal', cls: 'status-normal' };
}

function getStressStatus(s) {
  if (s > 70) return { label: 'High', cls: 'status-critical' };
  if (s > 45) return { label: 'Moderate', cls: 'status-warn' };
  return { label: 'Low', cls: 'status-normal' };
}

function getRiskColor(score) {
  if (score >= 70) return '#ef4444';
  if (score >= 40) return '#f59e0b';
  if (score >= 20) return '#06b6d4';
  return '#22c55e';
}

function updateAlertBadge() {
  const badge = document.getElementById('alertCount');
  if (HealthData.alertCount > 0) {
    badge.textContent = HealthData.alertCount;
    badge.style.display = 'flex';
  }
}

// Example 34-point 7-day data for weekly chart
function getWeeklyData() {
  const labels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  return {
    labels,
    hr: [68, 72, 71, 78, 74, 65, 69],
    bpSys: [116, 122, 119, 128, 124, 118, 120],
    hrv: [44, 40, 42, 35, 38, 48, 45]
  };
}

function getSleepData() {
  return {
    labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    deep: [1.5, 1.2, 1.8, 0.9, 1.4, 2.0, 1.7],
    light: [3.5, 4.0, 3.2, 3.8, 3.6, 3.0, 3.8],
    rem: [1.5, 1.3, 1.9, 1.2, 1.6, 1.8, 1.5]
  };
}
