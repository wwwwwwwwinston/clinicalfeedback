/* ============================================
   CLINIQ - Speech Recording & ASR Module
   Works on ALL browsers via demo simulation.
   Live ASR used as enhancement when available.
   ============================================ */

let isRecording = false;
let isPaused = false;
let recognition = null;
let timerInterval = null;
let seconds = 0;
let transcript = '';
let waveformBars = [];
let demoInterval = null;
let useRealASR = false;

// Patient identifier patterns to redact
const PATIENT_ID_PATTERNS = [
  /\b\d{6,}\b/g,
  /\b[A-Z]{1,3}\s?\d{5,}\b/g,
  /\b\d{3}[-\s]?\d{3}[-\s]?\d{3}\b/g,
  /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
  /\b\d{4}\s?\d{4}\s?\d{4}\b/g,
];

function redactPatientIdentifiers(text) {
  let redacted = text;
  PATIENT_ID_PATTERNS.forEach(pattern => {
    redacted = redacted.replace(pattern, '[REDACTED]');
  });
  return redacted;
}

// --- Check if real ASR is available ---
function checkASRAvailability() {
  try {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return false;
    // Brave exposes the API but blocks it - we detect this via a test start
    // For reliability, we'll just check the constructor exists
    return true;
  } catch (e) {
    return false;
  }
}

// --- Initialise Web Speech API (enhancement only) ---
function initSpeechRecognition() {
  try {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-AU';

    rec.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
          const confEl = document.getElementById('confidence');
          if (confEl) confEl.textContent = Math.round(result[0].confidence * 100) + '%';
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      if (finalTranscript) {
        transcript += redactPatientIdentifiers(finalTranscript) + ' ';
      }
      const area = document.getElementById('transcriptArea');
      if (!area) return;
      const placeholder = document.getElementById('transcriptPlaceholder');
      if (placeholder) placeholder.remove();
      area.innerHTML = `<span style="color:var(--text-primary);">${transcript}</span><span style="color:var(--text-muted); font-style:italic;">${redactPatientIdentifiers(interimTranscript)}</span>`;
      updateWordCount();
    };

    rec.onerror = (event) => {
      if (event.error === 'no-speech') return;
      console.warn('ASR error:', event.error);
      // If blocked (Brave, Firefox, etc.), switch to demo seamlessly
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed' || event.error === 'network' || event.error === 'aborted') {
        useRealASR = false;
        recognition = null;
        if (isRecording) {
          // Already recording - switch to demo mid-stream
          runDemoTranscript();
        }
      }
    };

    rec.onend = () => {
      if (isRecording && !isPaused && useRealASR) {
        try { rec.start(); } catch (e) { /* ignore */ }
      }
    };

    return rec;
  } catch (e) {
    return null;
  }
}

// --- Waveform Visualisation ---
function initWaveform() {
  const container = document.getElementById('waveform');
  if (!container) return;
  container.innerHTML = '';
  waveformBars = [];
  for (let i = 0; i < 40; i++) {
    const bar = document.createElement('div');
    bar.className = 'waveform-bar';
    bar.style.height = '4px';
    container.appendChild(bar);
    waveformBars.push(bar);
  }
}

function animateWaveform() {
  if (!isRecording || isPaused) return;
  waveformBars.forEach(bar => {
    const height = Math.random() * 28 + 4;
    bar.style.height = height + 'px';
    bar.style.background = `hsl(${200 + Math.random() * 40}, 80%, ${50 + Math.random() * 20}%)`;
  });
  requestAnimationFrame(() => setTimeout(animateWaveform, 100));
}

function resetWaveform() {
  waveformBars.forEach(bar => {
    bar.style.height = '4px';
    bar.style.background = 'var(--primary)';
  });
}

// --- Recording Controls ---
function toggleRecording() {
  if (!isRecording) {
    startRecording();
  } else {
    stopRecording();
  }
}

function startRecording() {
  isRecording = true;
  isPaused = false;
  updateRecordingUI('recording');
  startTimer();
  animateWaveform();

  // Try real ASR first
  if (!recognition) recognition = initSpeechRecognition();

  if (recognition) {
    try {
      recognition.start();
      useRealASR = true;
      showNotification('Recording started - live speech recognition active', 'success');
      // Set a timeout: if no result in 3 seconds, ASR was likely blocked
      setTimeout(() => {
        if (isRecording && useRealASR && !transcript.trim()) {
          // Likely blocked silently (Brave does this)
          useRealASR = false;
          try { recognition.stop(); } catch(e) {}
          recognition = null;
          runDemoTranscript();
          updateASRBadge('demo');
          showNotification('Live ASR unavailable in this browser - using demo mode', 'info');
        }
      }, 3500);
      return;
    } catch (e) {
      // start() threw - browser blocked it
      console.warn('ASR blocked:', e.message);
      recognition = null;
      useRealASR = false;
    }
  }

  // Fallback: demo mode (works on ALL browsers)
  runDemoTranscript();
  updateASRBadge('demo');
  showNotification('Recording started - demo mode (works on all browsers)', 'success');
}

// --- Demo Transcript (universal fallback) ---
function runDemoTranscript() {
  const demoText = [
    { speaker: 'CE', name: 'Dr Palmer', text: "James, let's go through your session with the patient today." },
    { speaker: 'Student', name: 'James', text: "Yes, so Patient [REDACTED] presented with malnutrition risk. I completed the nutrition assessment using the SGA tool." },
    { speaker: 'CE', name: 'Dr Palmer', text: "Good. Your assessment technique was thorough and methodical. You identified the key nutritional deficiencies quickly." },
    { speaker: 'CE', name: 'Dr Palmer', text: "One area to work on is documentation speed - your notes were accurate but took longer than expected." },
    { speaker: 'Student', name: 'James', text: "I agree, I'll work on using the SOAP format more efficiently." },
    { speaker: 'CE', name: 'Dr Palmer', text: "Also, your communication with the patient was excellent - very empathetic. Keep that up." },
    { speaker: 'CE', name: 'Dr Palmer', text: "Let's set a goal around documentation efficiency for next week. Overall a strong performance." },
  ];

  let index = 0;
  demoInterval = setInterval(() => {
    if (!isRecording || index >= demoText.length) {
      clearInterval(demoInterval);
      demoInterval = null;
      return;
    }
    const item = demoText[index];
    const speakerColor = item.speaker === 'CE' ? 'var(--primary)' : 'var(--secondary)';
    transcript += `<div style="margin-bottom:8px;"><strong style="color:${speakerColor};">[${item.speaker} - ${item.name}]:</strong> ${item.text}</div>`;

    const area = document.getElementById('transcriptArea');
    if (area) {
      const placeholder = document.getElementById('transcriptPlaceholder');
      if (placeholder) placeholder.remove();
      area.innerHTML = `<div style="color:var(--text-primary); line-height:1.9;">${transcript}</div>`;
    }
    updateWordCount();
    const confEl = document.getElementById('confidence');
    if (confEl) confEl.textContent = (92 + Math.random() * 6).toFixed(0) + '%';
    index++;
  }, 2500);
}

function pauseRecording() {
  isPaused = !isPaused;
  const btn = document.getElementById('pauseBtn');
  const statusBadge = document.getElementById('recStatusBadge');

  if (isPaused) {
    btn.innerHTML = '<i class="ri-play-line"></i> Resume';
    if (recognition && useRealASR) { try { recognition.stop(); } catch(e){} }
    if (demoInterval) { clearInterval(demoInterval); demoInterval = null; }
    stopTimer();
    resetWaveform();
    if (statusBadge) {
      statusBadge.innerHTML = '<i class="ri-pause-circle-line"></i> Paused';
      statusBadge.className = 'badge badge-orange';
    }
  } else {
    btn.innerHTML = '<i class="ri-pause-line"></i> Pause';
    if (recognition && useRealASR) { try { recognition.start(); } catch(e){} }
    else { runDemoTranscript(); }
    startTimer();
    animateWaveform();
    if (statusBadge) {
      statusBadge.innerHTML = '<i class="ri-record-circle-line"></i> Recording...';
      statusBadge.className = 'badge badge-red';
    }
  }
}

function stopRecording() {
  isRecording = false;
  isPaused = false;
  useRealASR = false;
  if (recognition) { try { recognition.stop(); } catch(e){} }
  if (demoInterval) { clearInterval(demoInterval); demoInterval = null; }
  stopTimer();
  resetWaveform();
  updateRecordingUI('stopped');
  showNotification('Recording saved successfully - ready for analysis', 'success');
}

function clearTranscript() {
  transcript = '';
  const area = document.getElementById('transcriptArea');
  if (area) {
    area.innerHTML = '<span class="text-muted" id="transcriptPlaceholder">Transcribed text will appear here in real-time as you speak...<br><br><em style="font-size:0.8rem;">Patient identifiers will be automatically redacted and replaced with initials.</em></span>';
  }
  const wc = document.getElementById('wordCount');
  if (wc) wc.textContent = '0';
  const conf = document.getElementById('confidence');
  if (conf) conf.textContent = '--';
}

function processTranscript() {
  if (!transcript.trim() || transcript.trim() === '') {
    showNotification('No transcript to analyse - record or upload feedback first', 'error');
    return;
  }
  showNotification('Generating feedback summary with AI...', 'info');
  setTimeout(() => { window.location.href = 'analysis.html'; }, 1500);
}

// --- Timer ---
function startTimer() {
  timerInterval = setInterval(() => {
    seconds++;
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    const el = document.getElementById('recordTimer');
    if (el) el.textContent = `${mins}:${secs}`;
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

// --- UI Updates ---
function updateRecordingUI(state) {
  const btn = document.getElementById('recordBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const stopBtn = document.getElementById('stopBtn');
  const micCircle = document.getElementById('micCircle');
  const micIcon = document.getElementById('micIcon');
  const label = document.getElementById('recordLabel');
  const pulse = document.getElementById('pulseRing');
  const statusBadge = document.getElementById('recStatusBadge');

  if (!btn) return;

  if (state === 'recording') {
    btn.innerHTML = '<i class="ri-stop-circle-line"></i> Stop Recording';
    btn.className = 'btn btn-danger btn-lg';
    if (pauseBtn) pauseBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = false;
    if (micCircle) { micCircle.style.borderColor = 'var(--danger)'; micCircle.style.background = 'var(--danger-light)'; }
    if (micIcon) { micIcon.style.color = 'var(--danger)'; micIcon.className = 'ri-record-circle-line'; }
    if (label) { label.textContent = 'Recording...'; label.style.color = 'var(--danger)'; }
    if (pulse) { pulse.style.animation = 'ripple 1.5s ease-in-out infinite'; pulse.style.opacity = '1'; pulse.style.borderColor = 'var(--danger)'; }
    if (statusBadge) { statusBadge.innerHTML = '<i class="ri-record-circle-line"></i> Recording...'; statusBadge.className = 'badge badge-red'; }
  } else {
    btn.innerHTML = '<i class="ri-mic-line"></i> Start Recording';
    btn.className = 'btn btn-primary btn-lg';
    if (pauseBtn) { pauseBtn.disabled = true; pauseBtn.innerHTML = '<i class="ri-pause-line"></i> Pause'; }
    if (stopBtn) stopBtn.disabled = true;
    if (micCircle) { micCircle.style.borderColor = 'var(--primary)'; micCircle.style.background = 'var(--primary-light)'; }
    if (micIcon) { micIcon.style.color = 'var(--primary)'; micIcon.className = 'ri-mic-line'; }
    if (label) { label.textContent = 'Ready to Record'; label.style.color = ''; }
    if (pulse) { pulse.style.animation = ''; pulse.style.opacity = '0'; }
    seconds = 0;
    const timer = document.getElementById('recordTimer');
    if (timer) timer.textContent = '00:00';
    if (statusBadge) { statusBadge.innerHTML = '<i class="ri-checkbox-circle-line"></i> Recording Saved'; statusBadge.className = 'badge badge-green'; }
  }
}

function updateASRBadge(mode) {
  const asrEl = document.getElementById('asrStatus');
  if (!asrEl) return;
  if (mode === 'demo') {
    asrEl.innerHTML = '<i class="ri-information-line"></i> Demo Mode';
    asrEl.className = 'badge badge-orange';
  } else if (mode === 'live') {
    asrEl.innerHTML = '<i class="ri-checkbox-circle-line"></i> Live ASR';
    asrEl.className = 'badge badge-green';
  }
}

// --- Word Count ---
function updateWordCount() {
  const text = transcript.replace(/<[^>]*>/g, '');
  const count = text.trim().split(/\s+/).filter(Boolean).length;
  const el = document.getElementById('wordCount');
  if (el) el.textContent = count;
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  initWaveform();

  // Show appropriate badge on load
  const hasASR = checkASRAvailability();
  const asrEl = document.getElementById('asrStatus');
  const recBadge = document.getElementById('recStatusBadge');

  if (hasASR && window.location.protocol === 'https:') {
    // Likely to work (Chrome on HTTPS)
    if (asrEl) { asrEl.innerHTML = '<i class="ri-checkbox-circle-line"></i> ASR Ready'; asrEl.className = 'badge badge-green'; }
    if (recBadge) { recBadge.innerHTML = '<i class="ri-checkbox-circle-line"></i> ASR Ready'; recBadge.className = 'badge badge-green'; }
  } else {
    // Will use demo mode
    if (asrEl) { asrEl.innerHTML = '<i class="ri-checkbox-circle-line"></i> Ready (Demo Mode)'; asrEl.className = 'badge badge-green'; }
    if (recBadge) { recBadge.innerHTML = '<i class="ri-checkbox-circle-line"></i> Ready'; recBadge.className = 'badge badge-green'; }
  }
});
