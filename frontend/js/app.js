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
    
    // Auto-send SMS for extremely high risk
    if (d.riskScore > 85) {
      sendTwilioSMS(`🚨 CRITICAL RISK ALERT: AI detected ${d.riskScore}% cardiac/stroke risk. Immediate attention required. Vitals: HR=${d.hr}, BP=${d.bpSys}/${d.bpDia}.`);
    }
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
  
  const user = JSON.parse(localStorage.getItem('healthguard_user_profile_data')) || { profileName: 'User', emergencyContactName: 'Emergency Contact' };
  const nearest = findNearestHospital();
  
  showToast(`🚑 Emergency Confirmed! Dispatching nearest ambulance to ${nearest.name}`, 'danger');
  showToast(`📞 Calling emergency contact: ${user.emergencyContactName}`, 'warning');
  showToast(`🏥 Pre-arrival status sharing active with ${nearest.name} ER`, 'info');

  // Start Advanced Simulation
  startMedicalStream();
  startAmbulanceSimulation(nearest);
  updateDispatchPanel(nearest);

  // Send REAL SMS via Twilio
  const msg = `🚨 EMERGENCY ALERT: HealthGuard detected a critical event for ${user.profileName}. Location: 12.9716° N, 77.5946° E. Hospital: ${nearest.name}. Vitals: HR=${HealthData.hr}, SpO2=${HealthData.spo2.toFixed(1)}%.`;
  sendTwilioSMS(msg);
}

// ── Medical Data Stream Simulation ──────────────────────────────
let streamInterval = null;
function startMedicalStream() {
  const feed = document.getElementById('dataStreamFeed');
  const indicator = document.getElementById('streamIndicator');
  if (!feed || !indicator) return;

  indicator.classList.add('active');
  feed.innerHTML = '<div class="stream-line system">> Initializing secure HL7 FHIR link...</div>';
  
  if (streamInterval) clearInterval(streamInterval);
  
  const addLine = (txt, cls) => {
    const line = document.createElement('div');
    line.className = 'stream-line ' + cls;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${txt}`;
    feed.appendChild(line);
    feed.scrollTop = feed.scrollHeight;
  };

  setTimeout(() => addLine('> Connection established: Apollo/Manipal HIE Gateway', 'system'), 1000);
  setTimeout(() => addLine('> Streaming live telemetry (encrypted AES-256)', 'system'), 2000);

  streamInterval = setInterval(() => {
    const d = HealthData; // Global from data.js
    addLine(`DATA: HR=${d.hr} BP=${d.bpSys}/${d.bpDia} SpO2=${d.spo2.toFixed(1)}% Stress=${d.stress}`, 'data');
    
    if (d.hr > 110 || d.spo2 < 92) {
      addLine(`ALERT: Vitals threshold exceeded! ER notified.`, 'alert');
    }
  }, 3000);
}

// ── Nearest Hospital & Ambulance Logic ──────────────────────────
const HOSPITALS = [
  { id: 'apollo', name: 'Apollo Hospital', x: 30, y: 25, dist: 1.2 },
  { id: 'manipal', name: 'Manipal Hospital', x: 60, y: 40, dist: 2.8 },
  { id: 'fortis', name: 'Fortis Hospital', x: 20, y: 65, dist: 3.5 }
];

function findNearestHospital() {
  // Simple distance from patient (at 50,50)
  return HOSPITALS.reduce((prev, curr) => {
    const d1 = Math.sqrt(Math.pow(50 - prev.x, 2) + Math.pow(50 - prev.y, 2));
    const d2 = Math.sqrt(Math.pow(50 - curr.x, 2) + Math.pow(50 - curr.y, 2));
    return d1 < d2 ? prev : curr;
  });
}

function updateDispatchPanel(hosp) {
  setText('nearHospital', hosp.name);
  setText('nearDist', `${hosp.dist} km · ~4 min`);
  const status = document.getElementById('dispatchStatus');
  if (status) {
    status.textContent = 'EN-ROUTE';
    status.classList.add('active');
  }
}

function startAmbulanceSimulation(hosp) {
  const ambMarker = document.getElementById('ambulanceMarker');
  const routePath = document.getElementById('routePath');
  if (!ambMarker || !routePath) return;

  // Create SVG path for route
  const startX = 55, startY = 60; // Ambulance start
  const endX = 50, endY = 50;   // Patient location
  const hospX = hosp.x, hospY = hosp.y;

  // Draw simple path: Amb -> Patient -> Hospital
  routePath.innerHTML = `
    <path class="map-route-line" id="activeRouteLine" d="M ${startX}% ${startY}% L ${endX}% ${endY}% L ${hospX}% ${hospY}%" style="opacity:1"/>
  `;

  // Move ambulance to patient
  setTimeout(() => {
    ambMarker.style.left = '50%';
    ambMarker.style.top = '50%';
    showToast('🚑 Ambulance has arrived at your location', 'success');
    
    // Move to hospital after 5s
    setTimeout(() => {
      ambMarker.style.left = hosp.x + '%';
      ambMarker.style.top = hosp.y + '%';
      showToast(`🚑 En-route to ${hosp.name}`, 'info');
    }, 5000);
  }, 2000);
}

function dispatchAmbulance(hospital) {
  if (hospital === 'Nearest') {
    confirmEmergency();
    return;
  }
  const hosp = HOSPITALS.find(h => h.name.includes(hospital)) || HOSPITALS[0];
  showToast(`🚑 Manual Dispatch: Requesting ambulance for ${hosp.name}`, 'warning');
  startAmbulanceSimulation(hosp);
  updateDispatchPanel(hosp);
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

// ── Twilio SMS Implementation ──────────────────────────────────
async function sendTwilioSMS(message) {
  const to = document.getElementById('twilioTo')?.value || AppConfig.defaultToNumber;
  const statusEl = document.getElementById('smsStatus');
  
  if (statusEl) {
    statusEl.textContent = 'SENDING SMS...';
    statusEl.style.color = 'var(--accent-amber)';
  }

  try {
    const response = await fetch(`${AppConfig.apiBaseUrl}/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: to,
        message: message
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('Backend SMS Success:', data.sid);
      showToast('📲 Emergency SMS Sent via Relay!', 'success');
      if (statusEl) {
        statusEl.textContent = '✓ SMS DELIVERED';
        statusEl.style.color = 'var(--accent-green)';
      }
    } else {
      throw new Error(data.message || 'Relay Error');
    }
  } catch (err) {
    console.error('Relay SMS Failed:', err);
    let msg = err.message;
    if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
      msg = `Backend server not responding at ${AppConfig.apiBaseUrl}. Did you start it with 'npm start'?`;
    }
    showToast('❌ SMS Failed: ' + msg, 'danger');
    if (statusEl) {
      statusEl.textContent = '⚠ CONNECTION FAILED';
      statusEl.style.color = 'var(--danger)';
    }
  }
}

function testTwilioSMS() {
  const to = document.getElementById('twilioTo').value;
  if (!to) {
    showToast('Please enter a phone number first', 'warning');
    return;
  }
  const user = JSON.parse(localStorage.getItem('healthguard_user_profile')) || { profileName: 'User' };
  sendTwilioSMS(`🧪 TEST MESSAGE from HealthGuard AI for ${user.profileName}. SMS System Operational.`);
}

// ── User Profile Management ────────────────────────────────────
function saveUserProfile() {
  const profileFields = [
    'profileName', 'profileAge', 'profileBlood', 'profileWeight', 
    'profileHeight', 'profileConditions', 'profileMeds', 'profileAllergies',
    'emergencyContactName', 'emergencyContactRelation', 'twilioTo'
  ];

  const profileData = {};
  profileFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) profileData[id] = el.value;
  });

  localStorage.setItem('healthguard_user_profile', profileData.twilioTo); // Legacy support
  localStorage.setItem('healthguard_user_profile_data', JSON.stringify(profileData));
  
  updateSidebarProfile(profileData);
  showToast('Profile and Emergency contact updated successfully', 'success');
}

function loadUserProfile() {
  const savedData = localStorage.getItem('healthguard_user_profile_data');
  if (!savedData) return;

  const profileData = JSON.parse(savedData);
  Object.keys(profileData).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = profileData[id];
  });

  updateSidebarProfile(profileData);
}

function updateSidebarProfile(data) {
  const sidebarName = document.getElementById('sidebarName');
  const sidebarAvatar = document.getElementById('sidebarAvatar');
  const sidebarMeta = document.getElementById('sidebarMeta');

  if (sidebarName && data.profileName) {
    // Format name to "First M." for sidebar
    const parts = data.profileName.split(' ');
    const display = parts.length > 1 ? `${parts[0]} ${parts[parts.length-1][0]}.` : parts[0];
    sidebarName.textContent = display;
    
    // Update initials
    const initials = parts.length > 1 ? (parts[0][0] + parts[parts.length-1][0]).toUpperCase() : parts[0].substring(0, 2).toUpperCase();
    if (sidebarAvatar) sidebarAvatar.textContent = initials;
  }

  if (sidebarMeta && data.profileAge) {
    sidebarMeta.textContent = `Age ${data.profileAge} · High Risk Profile`;
  }
}

// ── Backend Connectivity Check ─────────────────────────────────
async function checkBackendStatus() {
  const statusEl = document.getElementById('smsStatus');
  try {
    const res = await fetch(`${AppConfig.apiBaseUrl}/health`);
    const data = await res.json();
    if (data.status === 'ok') {
      console.log('✅ SMS Relay Online');
      if (statusEl) {
        statusEl.textContent = '● SMS RELAY ONLINE';
        statusEl.style.color = 'var(--accent-green)';
      }
    }
  } catch (err) {
    console.warn('❌ SMS Relay Offline');
    if (statusEl) {
      statusEl.textContent = '○ SMS RELAY OFFLINE';
      statusEl.style.color = 'var(--text-muted)';
    }
  }
}

// ── Initialization ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  extendTrendHistory();
  initAllCharts();
  updateClock();
  loadUserProfile();
  checkBackendStatus();

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
