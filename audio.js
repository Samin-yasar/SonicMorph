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
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive', sampleRate: 44100 });
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
    Tone.setContext(new Tone.Context({ latencyHint: 'interactive', lookAhead: 0 }));
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
      vocoderModulator: audioCtx.createGain(),
      vocoderCarrier: audioCtx.createOscillator(),
      vocoderGain: audioCtx.createGain(),
      bitcrusher: audioCtx.createScriptProcessor(4096, 1, 1),
      noise: audioCtx.createBufferSource(),
      noiseGain: audioCtx.createGain()
    };
    toneEffects = {
      pitch: new Tone.PitchShift({ pitch: 0, windowSize: 0.005, delayTime: 0 }),
      chorus: new Tone.Chorus({ frequency: 1.5, delayTime: 3.5, depth: 0.7 }),
      phaser: new Tone.Phaser({ frequency: 0.5, octaves: 3, baseFrequency: 350 }),
      autotune: new Tone.AutoFilter({ frequency: 0, depth: 0 })
    };

    audioNodes.highpass.type = 'highpass';
    audioNodes.highpass.frequency.setValueAtTime(0, audioCtx.currentTime);
    audioNodes.subBass.type = 'lowshelf';
    audioNodes.subBass.frequency.setValueAtTime(100, audioCtx.currentTime);
    audioNodes.subBass.gain.setValueAtTime(0, audioCtx.currentTime);
    audioNodes.vocoderCarrier.type = 'sawtooth';
    audioNodes.vocoderCarrier.frequency.setValueAtTime(440, audioCtx.currentTime);
    audioNodes.vocoderCarrier.start();
    audioNodes.vocoderGain.gain.setValueAtTime(0, audioCtx.currentTime);
    audioNodes.noiseGain.gain.setValueAtTime(0, audioCtx.currentTime);

    const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 2, audioCtx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    audioNodes.noise.buffer = noiseBuffer;
    audioNodes.noise.loop = true;
    audioNodes.noise.start();

    let lastSample = 0;
    let phase = 0;
    audioNodes.bitcrusher.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const output = e.outputBuffer.getChannelData(0);
      const bitDepth = 1 - parseFloat(document.getElementById('bitcrusher').value);
      const step = Math.pow(0.5, bitDepth * 8);
      const sampleRateReduction = bitDepth * 0.9 + 0.1;
      const phaseIncrement = sampleRateReduction * 44100 / audioCtx.sampleRate;

      for (let i = 0; i < input.length; i++) {
        phase += phaseIncrement;
        if (phase >= 1) {
          lastSample = Math.round(input[i] / step) * step;
          phase -= 1;
        }
        output[i] = lastSample;
      }
    };

    const chain = [
      audioNodes.gain,
      audioNodes.distortion,
      audioNodes.highpass,
      audioNodes.subBass,
      audioNodes.bitcrusher,
      audioNodes.vocoderModulator,
      audioNodes.reverb,
      audioNodes.echo,
      analyser
    ];
    for (let i = 0; i < chain.length - 1; i++) {
      chain[i].connect(chain[i + 1]);
    }
    analyser.connect(audioCtx.destination);
    audioNodes.vocoderModulator.connect(audioNodes.vocoderGain.gain);
    audioNodes.vocoderCarrier.connect(audioNodes.vocoderGain);
    audioNodes.vocoderGain.connect(analyser);
    audioNodes.noise.connect(audioNodes.noiseGain);
    audioNodes.noiseGain.connect(analyser);

    createImpulseResponse();

    const visualizerDiv = document.getElementById('visualizer');
    if (visualizerDiv) {
      visualizerCanvas = document.createElement('canvas');
      visualizerCanvas.width = 800;
      visualizerCanvas.height = 120;
      visualizerDiv.appendChild(visualizerCanvas);
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

window.AudioManager = {
  init: initAudio,
  getAudioContext: () => audioCtx,
  getAnalyser: () => analyser,
  getNodes: () => audioNodes,
  getToneEffects: () => toneEffects,
  getImpulseResponse: () => impulseResponse,
  visualize
};
