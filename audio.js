const DEBUG = true;

let audioCtx, analyser, visualizerCanvas, visualizerCtx;
let audioNodes = {};
let toneEffects = {};
let impulseResponse = null;
let isAudioInitialized = false;
const isLowEndDevice = window.innerWidth * window.innerHeight > 1000000;

function showLoadingIndicator() {
  const indicator = document.getElementById('loading-indicator');
  if (indicator) {
    indicator.classList.add('show');
    if (DEBUG) console.log('audio.js: Showing loading indicator');
  }
}

function hideLoadingIndicator() {
  const indicator = document.getElementById('loading-indicator');
  if (indicator) {
    indicator.classList.remove('show');
    if (DEBUG) console.log('audio.js: Hiding loading indicator');
  }
}

async function initAudio() {
  if (isAudioInitialized) {
    if (DEBUG) console.log('audio.js: Audio already initialized');
    return true;
  }
  showLoadingIndicator();
  try {
    if (typeof Tone === 'undefined') {
      throw new Error('Tone.js not loaded. Check CDN or local script.');
    }
    audioCtx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive', sampleRate: 44100 });
    Tone.setContext(new Tone.Context({ latencyHint: 'interactive', lookAhead: 0 }));
    await audioCtx.resume();
    await Tone.start();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = isLowEndDevice ? 256 : 512;

    audioNodes = {
      gain: audioCtx.createGain(),
      distortion: audioCtx.createWaveShaper(),
      reverb: audioCtx.createConvolver(),
      echo: audioCtx.createDelay(2.0),
      highpass: audioCtx.createBiquadFilter(),
      subBass: audioCtx.createBiquadFilter(),
      vocoderCarrier: audioCtx.createOscillator(),
      vocoderGain: audioCtx.createGain(),
      ringMod: audioCtx.createOscillator(),
      ringModGain: audioCtx.createGain()
    };
    toneEffects = {
      pitch: new Tone.PitchShift({ pitch: 0, windowSize: 0.005, delayTime: 0 }),
      chorus: new Tone.Chorus({ frequency: 1.5, delayTime: 3.5, depth: 0.7 }),
      phaser: new Tone.Phaser({ frequency: 0.5, octaves: 3, baseFrequency: 350 }),
      autotune: new Tone.AutoFilter({ frequency: 0, depth: 0 }) // Placeholder for autotune
    };

    audioNodes.highpass.type = 'highpass';
    audioNodes.highpass.frequency.setValueAtTime(0, audioCtx.currentTime);
    audioNodes.subBass.type = 'lowshelf';
    audioNodes.subBass.frequency.setValueAtTime(100, audioCtx.currentTime);
    audioNodes.subBass.gain.setValueAtTime(0, audioCtx.currentTime);
    audioNodes.vocoderCarrier.type = 'sine';
    audioNodes.vocoderCarrier.frequency.setValueAtTime(440, audioCtx.currentTime);
    audioNodes.vocoderCarrier.start();
    audioNodes.vocoderGain.gain.setValueAtTime(0, audioCtx.currentTime);
    audioNodes.ringMod.type = 'sine';
    audioNodes.ringMod.frequency.setValueAtTime(30, audioCtx.currentTime);
    audioNodes.ringMod.start();
    audioNodes.ringModGain.gain.setValueAtTime(0, audioCtx.currentTime);

    const chain = [
      audioNodes.gain,
      audioNodes.distortion,
      audioNodes.highpass,
      audioNodes.subBass,
      audioNodes.reverb,
      audioNodes.echo,
      analyser
    ];
    for (let i = 0; i < chain.length - 1; i++) {
      chain[i].connect(chain[i + 1]);
    }
    analyser.connect(audioCtx.destination);
    audioNodes.vocoderCarrier.connect(audioNodes.vocoderGain);
    audioNodes.ringMod.connect(audioNodes.ringModGain);

    createImpulseResponse();

    visualizerCanvas = document.getElementById('visualizer');
    if (visualizerCanvas) {
      visualizerCanvas.width = 800;
      visualizerCanvas.height = 120;
      visualizerCtx = visualizerCanvas.getContext('2d');
    } else {
      console.error('audio.js: #visualizer not found');
    }

    isAudioInitialized = true;
    document.getElementById('status').textContent = 'Audio initialized successfully';
    if (DEBUG) console.log('audio.js: Audio initialized');
    return true;
  } catch (err) {
    const status = document.getElementById('status');
    status.textContent = `Error: ${err.message}. Ensure HTTPS/localhost, grant microphone permissions, and use a supported browser (e.g., Chrome, Firefox).`;
    console.error('audio.js: initAudio error:', err);
    alert(status.textContent);
    return false;
  } finally {
    hideLoadingIndicator();
  }
}

function createImpulseResponse() {
  const length = audioCtx.sampleRate * 1;
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

function visualize(isRecording, isLive, uploadedSource) {
  if (!isAudioInitialized || !visualizerCtx || !visualizerCanvas) {
    if (DEBUG) console.log('audio.js: visualize skipped: audio or visualizer not initialized');
    return;
  }
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  let frameCount = 0;

  function draw() {
    if (!isRecording && !isLive && !uploadedSource) return;
    if (isLowEndDevice && frameCount++ % 2 !== 0) {
      requestAnimationFrame(draw);
      return;
    }
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

// Export for other modules
window.AudioManager = {
  init: initAudio,
  getAudioContext: () => audioCtx,
  getAnalyser: () => analyser,
  getNodes: () => audioNodes,
  getToneEffects: () => toneEffects,
  getImpulseResponse: () => impulseResponse,
  visualize
};
