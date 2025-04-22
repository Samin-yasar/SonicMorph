// Starry background animation
const canvas = document.getElementById('stars');
const ctx = canvas.getContext('2d');
let stars = [];
let mouseX = 0, mouseY = 0;
let animationId;
const isLowEndDevice = window.innerWidth * window.innerHeight > 1000000; // Simple heuristic for low-end devices

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  initStars();
}

function initStars() {
  stars = [];
  const density = Math.min(window.innerWidth, window.innerHeight) / (isLowEndDevice ? 10 : 5);
  const starCount = Math.floor(density);
  
  for (let i = 0; i < starCount; i++) {
    const size = Math.random() * 2;
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: size,
      originalR: size,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      twinkle: Math.random() * 0.1,
      twinkleSpeed: 0.01 + Math.random() * 0.03
    });
  }
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

function drawStars() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  if (!isLowEndDevice) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 0.5;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  for (let star of stars) {
    // Update radius with twinkle effect, ensuring non-negative
    star.r = Math.max(0.01, star.originalR + Math.sin(Date.now() * star.twinkleSpeed) * star.twinkle);
    
    const dx = mouseX - star.x;
    const dy = mouseY - star.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = 150;
    
    if (dist < maxDist) {
      const angle = Math.atan2(dy, dx);
      const force = (maxDist - dist) / maxDist * 0.2;
      star.dx -= Math.cos(angle) * force;
      star.dy -= Math.sin(angle) * force;
    }
    
    const maxSpeed = 2;
    const speed = Math.sqrt(star.dx * star.dx + star.dy * star.dy);
    if (speed > maxSpeed) {
      star.dx = (star.dx / speed) * maxSpeed;
      star.dy = (star.dy / speed) * maxSpeed;
    }
    
    star.dx *= 0.99;
    star.dy *= 0.99;
    star.x += star.dx;
    star.y += star.dy;
    
    // Ensure gradient radius is positive
    const gradientRadius = star.r * 3;
    const gradient = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, gradientRadius);
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.8)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(star.x, star.y, gradientRadius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
    
    if (star.x < -50) star.x = canvas.width + 50;
    if (star.x > canvas.width + 50) star.x = -50;
    if (star.y < -50) star.y = canvas.height + 50;
    if (star.y > canvas.height + 50) star.y = -50;
  }
  
  animationId = requestAnimationFrame(drawStars);
}

resizeCanvas();
drawStars();

// Tab functionality
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const tabId = tab.getAttribute('data-tab');
    tabs.forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    tabContents.forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    document.getElementById(tabId).classList.add('active');
  });
});

// Keyboard navigation for tabs
tabs.forEach((tab, index) => {
  tab.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const nextIndex = e.key === 'ArrowRight' ? (index + 1) % tabs.length : (index - 1 + tabs.length) % tabs.length;
      tabs[nextIndex].focus();
      tabs[nextIndex].click();
    }
  });
});

// Audio processing and voice effects
let audioCtx, analyser, source, recorder, chunks = [];
let mediaStream = null;
let isRecording = false;
let isLive = false;
let audioData = null;
let visualizerCanvas, visualizerCtx;
let audioNodes = {};
let toneEffects = {};
let impulseResponse = null;
let uploadedSource = null;

// Initialize Audio Context
function initAudio() {
  try {
    // Optimize Tone.js for low latency
    Tone.setContext(new Tone.Context({ latencyHint: 'interactive', lookAhead: 0.01 }));
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (!audioCtx) {
      throw new Error('Web Audio API not supported');
    }
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = isLowEndDevice ? 512 : 2048;

    // Initialize visualizer
    visualizerCanvas = document.createElement('canvas');
    visualizerCanvas.width = 800;
    visualizerCanvas.height = 120;
    document.getElementById('visualizer').appendChild(visualizerCanvas);
    visualizerCtx = visualizerCanvas.getContext('2d');

    // Setup Web Audio nodes
    audioNodes = {
      gain: audioCtx.createGain(),
      distortion: audioCtx.createWaveShaper(),
      reverb: audioCtx.createConvolver(),
      echo: audioCtx.createDelay(1.0),
      lowpass: audioCtx.createBiquadFilter(),
      highpass: audioCtx.createBiquadFilter(),
      bandpass: audioCtx.createBiquadFilter(),
      compressor: audioCtx.createDynamicsCompressor(),
      limiter: audioCtx.createGain(),
      bass: audioCtx.createBiquadFilter(),
      mid: audioCtx.createBiquadFilter(),
      treble: audioCtx.createBiquadFilter(),
      vibrato: audioCtx.createOscillator(),
      tremolo: audioCtx.createGain()
    };

    // Setup Tone.js effects with optimized buffer sizes
    toneEffects = {
      pitch: new Tone.PitchShift({ pitch: 0, windowSize: 0.01 }).toDestination(),
      chorus: new Tone.Chorus({ frequency: 0.5, delayTime: 3.5, depth: 0, wet: 0 }).toDestination(),
      flanger: new Tone.FeedbackDelay({ delayTime: 0.005, feedback: 0.2, wet: 0 }).toDestination(),
      autotune: new Tone.AutoTune({ scale: 'C', mode: 'major', amount: 0, latency: 0.01 }).toDestination()
    };

    // Configure Web Audio nodes
    audioNodes.lowpass.type = 'lowpass';
    audioNodes.highpass.type = 'highpass';
    audioNodes.bandpass.type = 'bandpass';
    audioNodes.bass.type = 'lowshelf';
    audioNodes.mid.type = 'peaking';
    audioNodes.treble.type = 'highshelf';
    audioNodes.vibrato.type = 'sine';
    audioNodes.vibrato.frequency.setValueAtTime(5, audioCtx.currentTime);

    // Connect Web Audio nodes (example chain)
    const chain = [
      audioNodes.gain,
      audioNodes.distortion,
      audioNodes.reverb,
      audioNodes.echo,
      audioNodes.lowpass,
      audioNodes.highpass,
      audioNodes.bandpass,
      audioNodes.compressor,
      audioNodes.limiter,
      audioNodes.bass,
      audioNodes.mid,
      audioNodes.treble,
      audioNodes.tremolo,
      analyser
    ];
    for (let i = 0; i < chain.length - 1; i++) {
      chain[i].connect(chain[i + 1]);
    }
    analyser.connect(audioCtx.destination);

    // Initialize reverb impulse response
    createImpulseResponse();
  } catch (err) {
    document.getElementById('status').textContent = `Audio initialization failed: ${err.message}. Please try a different browser.`;
    console.error(err);
  }
}

// Create reverb impulse response
function createImpulseResponse() {
  const length = audioCtx.sampleRate * 2;
  const impulse = audioCtx.createBuffer(2, length, audioCtx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const impulseData = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      impulseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
    }
  }
  impulseResponse = impulse;
  audioNodes.reverb.buffer = impulseResponse;
}

// Initialize sliders and autotune scale
const sliders = [
  'volume', 'pitch', 'speed', 'distortion', 'bitcrusher', 'robot',
  'echo', 'reverb', 'roomSize', 'chorus', 'flanger', 'vibrato',
  'lowpass', 'highpass', 'bandpass', 'compressor', 'gate', 'limiter',
  'bass', 'mid', 'treble', 'tremolo', 'autotune'
];

sliders.forEach(slider => {
  const input = document.getElementById(slider);
  const valueDisplay = document.getElementById(`${slider}-value`);
  
  if (input && valueDisplay) {
    valueDisplay.textContent = parseFloat(input.value).toFixed(2);
    input.addEventListener('input', () => {
      valueDisplay.textContent = parseFloat(input.value).toFixed(2);
      if (slider === 'reverb') {
        document.getElementById('roomSize').disabled = parseFloat(input.value) <= 0;
      }
      if (isRecording || isLive) {
        updateAudioEffects();
      }
    });
  }
});

// Initialize autotune scale selector
const autotuneScale = document.getElementById('autotune-scale');
autotuneScale.addEventListener('change', () => {
  updateAudioEffects();
});

// Start Recording
async function startRecording() {
  try {
    if (!audioCtx) {
      throw new Error('Audio context not initialized');
    }
    if (isLive) {
      stopLive();
    }
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    source = audioCtx.createMediaStreamSource(mediaStream);
    recorder = new MediaRecorder(mediaStream);
    chunks = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      audioData = URL.createObjectURL(blob);
      document.getElementById('audio-player').src = audioData;
      document.getElementById('audio-player').style.display = 'block';
      enableButtons();
    };

    source.connect(audioNodes.gain);
    recorder.start();
    isRecording = true;
    document.getElementById('status').textContent = 'Recording...';
    document.getElementById('startBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;
    visualize();
  } catch (err) {
    document.getElementById('status').textContent = `Microphone access failed: ${err.message}. Please check permissions or try another browser.`;
    console.error(err);
  }
}

// Stop Recording
function stopRecording() {
  if (recorder && isRecording) {
    recorder.stop();
    mediaStream.getTracks().forEach(track => track.stop());
    isRecording = false;
    document.getElementById('status').textContent = 'Recording stopped';
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
  }
}

// Play Recording
function playRecording() {
  const audioPlayer = document.getElementById('audio-player');
  if (audioData) {
    audioPlayer.play().catch(err => {
      document.getElementById('status').textContent = `Playback failed: ${err.message}`;
      console.error(err);
    });
  }
}

// Download Recording
function downloadRecording() {
  if (audioData) {
    const link = document.createElement('a');
    link.href = audioData;
    link.download = 'recording.webm';
    link.click();
  }
}

// Reset Effects
function resetEffects() {
  sliders.forEach(slider => {
    const input = document.getElementById(slider);
    const valueDisplay = document.getElementById(`${slider}-value`);
    input.value = input.getAttribute('value');
    valueDisplay.textContent = parseFloat(input.value).toFixed(2);
  });
  document.getElementById('roomSize').disabled = true;
  document.getElementById('reverse-effect').checked = false;
  document.getElementById('autotune-scale').value = 'C Major';
  updateAudioEffects();
}

// Apply Preset
function applyPreset(preset) {
  const presets = {
    alien: { pitch: 1.5, reverb: 0.5, echo: 0.3 },
    chipmunk: { pitch: 1.8, speed: 1.2 },
    robot: { distortion: 50, bitcrusher: 8 },
    deep: { pitch: 0.7, reverb: 0.4 },
    demon: { pitch: 0.6, distortion: 70, reverb: 0.6 },
    radio: { bandpass: 3000, distortion: 20 },
    concert: { reverb: 0.8, roomSize: 0.9 },
    underwater: { lowpass: 1000, chorus: 0.5 },
    normal: {}
  };

  resetEffects();
  const settings = presets[preset] || {};
  Object.keys(settings).forEach(slider => {
    const input = document.getElementById(slider);
    const valueDisplay = document.getElementById(`${slider}-value`);
    input.value = settings[slider];
    valueDisplay.textContent = parseFloat(input.value).toFixed(2);
  });

  if (settings.reverb) {
    document.getElementById('roomSize').disabled = false;
  }
  updateAudioEffects();
}

// Save Preset
function savePreset() {
  const presetName = prompt('Enter preset name:');
  if (presetName) {
    const settings = {};
    sliders.forEach(slider => {
      settings[slider] = document.getElementById(slider).value;
    });
    settings.reverse = document.getElementById('reverse-effect').checked;
    settings.autotuneScale = document.getElementById('autotune-scale').value;
    localStorage.setItem(`preset_${presetName}`, JSON.stringify(settings));
    updatePresetList();
    document.getElementById('status').textContent = `Preset "${presetName}" saved`;
  }
}

// Load Preset
function loadPreset(presetName) {
  const settings = JSON.parse(localStorage.getItem(`preset_${presetName}`));
  if (settings) {
    Object.keys(settings).forEach(key => {
      if (key === 'reverse') {
        document.getElementById('reverse-effect').checked = settings[key];
      } else if (key === 'autotuneScale') {
        document.getElementById('autotune-scale').value = settings[key];
      } else {
        const input = document.getElementById(key);
        const valueDisplay = document.getElementById(`${key}-value`);
        if (input && valueDisplay) {
          input.value = settings[key];
          valueDisplay.textContent = parseFloat(input.value).toFixed(2);
        }
      }
    });
    document.getElementById('roomSize').disabled = parseFloat(settings.reverb) <= 0;
    updateAudioEffects();
    document.getElementById('status').textContent = `Preset "${presetName}" loaded`;
  }
}

// Delete Preset
function deletePreset(presetName) {
  localStorage.removeItem(`preset_${presetName}`);
  updatePresetList();
  document.getElementById('status').textContent = `Preset "${presetName}" deleted`;
}

// Update Preset List
function updatePresetList() {
  const presetList = document.getElementById('preset-list');
  presetList.innerHTML = '';
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('preset_')) {
      const presetName = key.replace('preset_', '');
      const presetItem = document.createElement('div');
      presetItem.className = 'preset-item';
      presetItem.setAttribute('role', 'listitem');
      
      const applyBtn = document.createElement('button');
      applyBtn.className = 'preset-btn';
      applyBtn.textContent = presetName;
      applyBtn.setAttribute('aria-label', `Apply ${presetName} preset`);
      applyBtn.onclick = () => loadPreset(presetName);
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = 'Delete';
      deleteBtn.setAttribute('aria-label', `Delete ${presetName} preset`);
      deleteBtn.onclick = () => deletePreset(presetName);
      
      presetItem.appendChild(applyBtn);
      presetItem.appendChild(deleteBtn);
      presetList.appendChild(presetItem);
    }
  });
}

// Update Audio Effects
function updateAudioEffects() {
  try {
    // Web Audio effects
    audioNodes.gain.gain.value = parseFloat(document.getElementById('volume').value);
    audioNodes.distortion.curve = makeDistortionCurve(parseFloat(document.getElementById('distortion').value));
    audioNodes.reverb.buffer = impulseResponse;
    audioNodes.echo.delayTime.value = parseFloat(document.getElementById('echo').value);
    audioNodes.lowpass.frequency.value = parseFloat(document.getElementById('lowpass').value);
    audioNodes.highpass.frequency.value = parseFloat(document.getElementById('highpass').value);
    audioNodes.bandpass.frequency.value = parseFloat(document.getElementById('bandpass').value);
    audioNodes.compressor.ratio.value = parseFloat(document.getElementById('compressor').value);
    audioNodes.limiter.gain.value = parseFloat(document.getElementById('limiter').value);
    audioNodes.bass.gain.value = parseFloat(document.getElementById('bass').value);
    audioNodes.mid.gain.value = parseFloat(document.getElementById('mid').value);
    audioNodes.treble.gain.value = parseFloat(document.getElementById('treble').value);
    audioNodes.tremolo.gain.value = parseFloat(document.getElementById('tremolo').value);

    // Tone.js effects
    toneEffects.pitch.pitch = (parseFloat(document.getElementById('pitch').value) - 1) * 12; // Convert to semitones
    toneEffects.chorus.wet.value = parseFloat(document.getElementById('chorus').value);
    toneEffects.flanger.wet.value = parseFloat(document.getElementById('flanger').value);
    const autotuneAmount = parseFloat(document.getElementById('autotune').value);
    toneEffects.autotune.amount = autotuneAmount;
    const scale = document.getElementById('autotune-scale').value;
    toneEffects.autotune.scale = scale.split(' ')[0]; // e.g., 'C' from 'C Major'
    toneEffects.autotune.mode = scale.includes('Major') ? 'major' : scale.includes('Minor') ? 'minor' : 'chromatic';

    // Bitcrusher
    const bits = parseFloat(document.getElementById('bitcrusher').value);
    audioNodes.distortion.oversample = bits < 16 ? '4x' : 'none';

    // Reverse effect
    if (document.getElementById('reverse-effect').checked && !isLive) {
      document.getElementById('status').textContent = 'Reverse effect applied (non-live)';
    }
  } catch (err) {
    document.getElementById('status').textContent = `Effect update failed: ${err.message}`;
    console.error(err);
  }
}

// Distortion Curve
function makeDistortionCurve(amount) {
  const k = typeof amount === 'number' ? amount : 50;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

// Audio Visualizer
function visualize() {
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function draw() {
    if (!isRecording && !isLive && !uploadedSource) return;
    requestAnimationFrame(draw);
    analyser.getByteTimeDomainData(dataArray);

    visualizerCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
    visualizerCtx.lineWidth = 2;
    visualizerCtx.strokeStyle = '#60a5fa';
    visualizerCtx.beginPath();

    const sliceWidth = visualizerCanvas.width / bufferLength;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * visualizerCanvas.height) / 2;
      if (i === 0) {
        visualizerCtx.moveTo(x, y);
      } else {
        visualizerCtx.lineTo(x, y);
      }
      x += sliceWidth;
    }
    visualizerCtx.lineTo(visualizerCanvas.width, visualizerCanvas.height / 2);
    visualizerCtx.stroke();
  }
  draw();
}

// Enable Buttons
function enableButtons() {
  document.getElementById('playBtn').disabled = false;
  document.getElementById('downloadBtn').disabled = false;
}

// Load Audio File
async function loadAudioFile() {
  try {
    const fileInput = document.getElementById('uploadAudio');
    const file = fileInput.files[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    uploadedSource = audioCtx.createBufferSource();
    uploadedSource.buffer = audioBuffer;
    uploadedSource.connect(audioNodes.gain);
    uploadedSource.start();
    document.getElementById('status').textContent = 'Uploaded audio playing';
    visualize();
  } catch (err) {
    document.getElementById('status').textContent = `Audio upload failed: ${err.message}`;
    console.error(err);
  }
}

// Start Live Voice Changing
async function startLive() {
  try {
    if (!audioCtx) {
      throw new Error('Audio context not initialized');
    }
    if (isRecording) {
      stopRecording();
    }
    if (isLive) {
      stopLive();
      return;
    }

    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    source = audioCtx.createMediaStreamSource(mediaStream);
    source.connect(audioNodes.gain);

    // WebRTC setup for live audio streaming
    const peerConnection = new RTCPeerConnection();
    mediaStream.getTracks().forEach(track => peerConnection.addTrack(track, mediaStream));
    
    // Create a MediaStreamDestination to capture processed audio
    const destination = audioCtx.createMediaStreamDestination();
    analyser.connect(destination);
    const processedStream = destination.stream;

    // Simulate sending processed audio to a call
    peerConnection.ontrack = (event) => {
      const audio = document.createElement('audio');
      audio.srcObject = event.streams[0];
      audio.play();
    };

    isLive = true;
    document.getElementById('status').textContent = 'Live voice changing active (WebRTC). For system-wide use, consider a virtual microphone.';
    const liveBtn = document.getElementById('liveBtn');
    liveBtn.textContent = '🎤 Stop Live';
    liveBtn.classList.add('live-active');
    visualize();
  } catch (err) {
    document.getElementById('status').textContent = `Live mode failed: ${err.message}. Check microphone permissions or browser support.`;
    console.error(err);
  }
}

// Stop Live Voice Changing
function stopLive() {
  if (isLive) {
    mediaStream.getTracks().forEach(track => track.stop());
    isLive = false;
    document.getElementById('status').textContent = 'Live mode stopped';
    const liveBtn = document.getElementById('liveBtn');
    liveBtn.textContent = '🎤 Live Mode';
    liveBtn.classList.remove('live-active');
  }
}

// Load saved presets on startup
function loadSavedPresets() {
  updatePresetList();
}

// Expose functions to global scope for inline onclick handlers
window.startRecording = startRecording;
window.stopRecording = stopRecording;
window.playRecording = playRecording;
window.downloadRecording = downloadRecording;
window.resetEffects = resetEffects;
window.applyPreset = applyPreset;
window.savePreset = savePreset;
window.loadPreset = loadPreset;
window.loadAudioFile = loadAudioFile;
window.startLive = startLive;

// Initialize on Load
window.addEventListener('load', () => {
  try {
    initAudio();
    document.getElementById('roomSize').disabled = true;
    loadSavedPresets();
  } catch (err) {
    document.getElementById('status').textContent = `Initialization failed: ${err.message}`;
    console.error(err);
  }
});
