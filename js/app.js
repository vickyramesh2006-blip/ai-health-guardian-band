/**
 * APP.JS — Main application orchestrator
 * Navigation, real-time UI updates, emergency system, toasts
 */

// ── Tab Navigation ─────────────────────────────────────────────
const tabTitles = {
  dashboard: 'Live Dashboard',
  ai: 'AI Health Insights',
  emergency: 'Emergency Response',
  smartcity: 'Smart City Integration',
  analytics: 'Health Analytics',
  settings: 'Settings & Configuration'
};

function switchTab(tab) {
  // Deactivate all pages and nav items
  document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Activate selected
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('nav-' + tab).classList.add('active');
  document.getElementById('pageTitle').textContent = tabTitles[tab] || tab;
}

// ── Sidebar Toggle (mobile) ────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ── Clock ──────────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const el = document.getElementById('timeDisplay');
  if (el) el.textContent = `${h}:${m}:${s}`;
}
setInterval(updateClock, 1000);
updateClock();

// ── DOM Update Helper ──────────────────────────────────────────
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setStatus(id, label, cls) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = label;
  el.className = 'vital-status ' + cls;
}

// ── Real-time vitals update ────────────────────────────────────
window.addEventListener('healthUpdate', (e) => {
  const d = e.detail;

  // Heart Rate
  setText('hrValue', d.hr);
  const hrStatus = getHRStatus(d.hr);
  setStatus('hrStatus', hrStatus.label, hrStatus.cls);
  const hrCard = document.getElementById('hrCard');
  if (d.hr > 100 || d.hr < 50) hrCard.style.borderColor = 'rgba(239,68,68,0.4)';
  else hrCard.style.borderColor = 'rgba(99,102,241,0.15)';
  updateSparkChart(Charts.hr, d.hrHistory);

  // Blood Pressure
  setText('bpValue', d.bpSys + '/' + d.bpDia);
  const bpStatus = getBPStatus(d.bpSys, d.bpDia);
  setStatus('bpStatus', bpStatus.label, bpStatus.cls);
  updateSparkChart(Charts.bp, d.bpHistory);

  // SpO2
  setText('spo2Value', d.spo2.toFixed(1));
  const spo2Status = getSpo2Status(d.spo2);
  setStatus('spo2Status', spo2Status.label, spo2Status.cls);
  updateSpo2Gauge(d.spo2);

  // Stress
  setText('stressValue', d.stress);
  const stressStatus = getStressStatus(d.stress);
  setStatus('stressStatus', stressStatus.label, stressStatus.cls);
  const fill = document.getElementById('stressBarFill');
  if (fill) fill.style.width = d.stress + '%';

  // Temperature
  setText('tempValue', d.temp.toFixed(1));
  const tempNormal = d.temp >= 36.1 && d.temp <= 37.2;
  setStatus('tempStatus', tempNormal ? 'Normal' : 'Elevated', tempNormal ? 'status-normal' : 'status-warn');
  updateSparkChart(Charts.temp, d.tempHistory);

  // HRV
  setText('hrvValue', d.hrv);
  setStatus('hrvStatus', d.hrv >= 30 ? 'Good' : 'Low', d.hrv >= 30 ? 'status-good' : 'status-warn');
  updateSparkChart(Charts.hrv, d.hrvHistory);

  // AI Risk Score
  setText('riskScore', d.riskScore);
  const riskLabel = d.riskScore >= 70 ? 'HIGH RISK' : d.riskScore >= 40 ? 'MODERATE' : d.riskScore >= 20 ? 'LOW-MOD' : 'LOW RISK';
  const riskLabelEl = document.querySelector('.risk-label');
  if (riskLabelEl) {
    riskLabelEl.textContent = riskLabel;
    riskLabelEl.style.color = getRiskColor(d.riskScore);
  }
  const riskNumEl = document.querySelector('.risk-num');
  if (riskNumEl) {
    const c = getRiskColor(d.riskScore);
    riskNumEl.style.background = `linear-gradient(135deg, ${c}, ${c}aa)`;
    riskNumEl.style.webkitBackgroundClip = 'text';
    riskNumEl.style.backgroundClip = 'text';
  }
  updateRiskGauge(d.riskScore);

  // Risk breakdown
  const setRiskBar = (barId, pctId, val, max) => {
    const barEl = document.getElementById(barId);
    const pctEl = document.getElementById(pctId);
    if (barEl) { barEl.style.width = Math.min(100, val) + '%'; barEl.style.background = val > 60 ? '#ef4444' : val > 35 ? '#f59e0b' : '#22c55e'; }
    if (pctEl) pctEl.textContent = val + '%';
  };
  setRiskBar('cardiacBar', 'cardiacPct', d.cardiacRisk);
  setRiskBar('strokeBar', 'strokePct', d.strokeRisk);
  setRiskBar('hypertBar', 'hypertPct', d.hypertRisk);
  setRiskBar('fallRiskBar', 'fallRiskPct', d.fallRisk);

  // Steps
  setText('stepsCount', d.steps.toLocaleString());
  const stepsBar = document.getElementById('stepsBar');
  if (stepsBar) stepsBar.style.width = Math.min(100, (d.steps / 10000) * 100) + '%';

  // Battery
  const battPct = document.getElementById('battPct');
  if (battPct) battPct.textContent = d.battery + '%';
  const battFill = document.getElementById('battFill');
  if (battFill) {
    battFill.style.width = (d.battery / 100) * 7 + 'px';
    battFill.style.fill = d.battery < 20 ? '#ef4444' : d.battery < 40 ? '#f59e0b' : '#22c55e';
  }

  // Critical emergency auto-check
  if (d.spo2 < 90 || d.hr < 40 || d.hr > 120) {
    triggerAutoAlert(d);
  }
});

// ── Trend Tab Controls ─────────────────────────────────────────
function setTrendView(view, btn) {
  document.querySelectorAll('.trend-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  updateTrendsChart(view);
}

// ── Emergency System ───────────────────────────────────────────
let emergencyTimer = null;
let countdownTimer = null;
let emergencyLevel = 0;

function triggerPanic() {
  showEmergencyModal('PANIC ALERT ACTIVATED', 'Emergency contacts notified. Ambulance dispatch in countdown below.', 2);
}

function triggerAutoAlert(d) {
  if (!emergencyTimer) {
    const reason = d.spo2 < 90 ? `SpO₂ critically low: ${d.spo2}%`
      : d.hr > 120 ? `Heart rate dangerously high: ${d.hr} bpm`
      : `Heart rate critically low: ${d.hr} bpm`;
    showToast('⚠ Auto-alert triggered: ' + reason, 'danger');
  }
}

function showEmergencyModal(title, desc, level) {
  emergencyLevel = level;
  document.getElementById('emTitle').textContent = title;
  document.getElementById('emDesc').textContent = desc;
  document.getElementById('emergencyOverlay').style.display = 'flex';

  // Countdown
  let count = 10;
  const countEl = document.getElementById('emCountdown');
  countEl.textContent = count;
  emergencyTimer = true;
  countdownTimer = setInterval(() => {
    count--;
    countEl.textContent = count;
    if (count <= 0) {
      clearInterval(countdownTimer);
      confirmEmergency();
    }
  }, 1000);

  showToast('Emergency alert activated — Level ' + level, 'danger');
  HealthData.alertCount++;
  updateAlertBadge();
}

function cancelEmergency() {
  clearInterval(countdownTimer);
  emergencyTimer = null;
  document.getElementById('emergencyOverlay').style.display = 'none';
  showToast('Emergency cancelled — marked as false alarm', 'info');
}

function confirmEmergency() {
  clearInterval(countdownTimer);
  emergencyTimer = null;
  document.getElementById('emergencyOverlay').style.display = 'none';
  showToast('🚑 Ambulance dispatched! ETA: 4 minutes to Apollo Hospital', 'danger');
  showToast('📞 Calling emergency contact: Sanjay R.', 'warning');
  showToast('🏥 Pre-arrival report sent to Apollo ER', 'info');
}

function testAlert(contactNum) {
  showToast(`Test alert sent to Contact #${contactNum} — SMS & push notification delivered`, 'success');
}

function addContact() {
  showToast('Opening emergency contacts editor...', 'info');
}

function dispatchAmbulance(hospital) {
  showToast(`🚑 Requesting ALS ambulance to ${hospital} Hospital — dispatching now`, 'warning');
  setTimeout(() => showToast(`✓ AMB-04 assigned · ETA: 6 min · Route optimized via BBMP`, 'success'), 2000);
}

// ── Toast Notifications ────────────────────────────────────────
function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toast-out 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ── Trend history extension for 7d/30d views ──────────────────
function extendTrendHistory() {
  // Add synthetic older data for 7d/30d views
  const base = HealthData.trendHistory[0].t;
  for (let i = 1; i <= 720; i++) {
    const t = base - i * 600000;
    HealthData.trendHistory.unshift({
      t, hr: 65 + Math.sin(i * 0.08) * 10 + Math.random() * 6,
      bpSys: 115 + Math.sin(i * 0.05) * 15 + Math.random() * 8,
      bpDia: 75 + Math.sin(i * 0.05) * 8 + Math.random() * 5,
      stress: Math.max(5, 35 + Math.sin(i * 0.2) * 25 + Math.random() * 10)
    });
  }
}

// ── Initialization ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  extendTrendHistory();
  initAllCharts();
  updateClock();

  // Animate step bar in on load
  setTimeout(() => {
    const stepsBar = document.getElementById('stepsBar');
    if (stepsBar) stepsBar.style.width = '62.84%';
  }, 500);

  // Initial data push
  simulateData();

  // Welcome toast
  setTimeout(() => showToast('✓ HealthGuard AI connected to ESP32-S3 Band #HGB-2847', 'success'), 800);
  setTimeout(() => showToast('Edge AI models loaded — TFLite Micro running on device', 'info'), 2500);
});
