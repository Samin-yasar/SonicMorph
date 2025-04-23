const DEBUG = true;

let source, recorder, chunks = [];
let mediaStream = null;
let isRecording = false;
let isLive = false;
let audioData = null;
let uploadedSource = null;

function showLoadingIndicator() {
  const indicator = document.getElementById('loading-indicator');
  if (indicator) {
    indicator.classList.add('show');
    if (DEBUG) console.log('recorder.js: Showing loading indicator');
  }
}

function hideLoadingIndicator() {
  const indicator = document.getElementById('loading-indicator');
  if (indicator) {
    indicator.classList.remove('show');
    if (DEBUG) console.log('recorder.js: Hiding loading indicator');
  }
}

function updateLiveIndicator() {
  const indicator = document.getElementById('live-indicator');
  if (indicator) {
    if (isRecording || isLive) {
      indicator.classList.add('show');
      indicator.textContent = isRecording ? 'Recording' : 'Live';
      if (DEBUG) console.log(`recorder.js: Showing live indicator: ${indicator.textContent}`);
    } else {
      indicator.classList.remove('show');
      if (DEBUG) console.log('recorder.js: Hiding live indicator');
    }
  }
}

async function startRecording(initAudio, audioCtx, audioNodes, visualize) {
  const success = await initAudio();
  if (!success) return;
  showLoadingIndicator();
  try {
    if (isLive) {
      stopLive();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    source = audioCtx.createMediaStreamSource(mediaStream);
    recorder = new MediaRecorder(mediaStream);
    chunks = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      audioData = URL.createObjectURL(blob);
      const audioPlayer = document.getElementById('audio-player');
      if (audioPlayer) {
        audioPlayer.src = audioData;
        audioPlayer.style.display = 'block';
      }
      enableButtons();
      updateLiveIndicator();
    };

    source.connect(audioNodes.gain);
    recorder.start();
    isRecording = true;
    document.getElementById('status').textContent = 'Recording...';
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    if (startBtn) startBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = false;
    updateLiveIndicator();
    visualize(isRecording, isLive, uploadedSource);
  } catch (err) {
    document.getElementById('status').textContent = `Microphone access failed: ${err.message}. Check permissions or use HTTPS/localhost.`;
    console.error('recorder.js: startRecording error:', err);
  } finally {
    hideLoadingIndicator();
  }
}

function stopRecording() {
  if (recorder && isRecording) {
    recorder.stop();
    mediaStream.getTracks().forEach(track => track.stop());
    isRecording = false;
    document.getElementById('status').textContent = 'Recording stopped';
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;
    updateLiveIndicator();
  }
}

function playRecording() {
  const audioPlayer = document.getElementById('audio-player');
  if (audioData && audioPlayer) {
    audioPlayer.play().catch(err => {
      document.getElementById('status').textContent = `Playback failed: ${err.message}`;
      console.error('recorder.js: playRecording error:', err);
    });
  }
}

function downloadRecording() {
  if (audioData) {
    const link = document.createElement('a');
    link.href = audioData;
    link.download = 'recording.webm';
    link.click();
  }
}

async function startLive(initAudio, audioCtx, audioNodes, visualize) {
  const success = await initAudio();
  if (!success) return;
  showLoadingIndicator();
  try {
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
    document.getElementById('status').textContent = 'Live voice changing active.';
    const liveBtn = document.getElementById('liveBtn');
    if (liveBtn) {
      liveBtn.textContent = '🎤 Stop Live';
      liveBtn.classList.add('live-active');
    }
    isLive = true;
    updateLiveIndicator();
    visualize(isRecording, isLive, uploadedSource);
  } catch (err) {
    document.getElementById('status').textContent = `Live mode failed: ${err.message}. Check microphone permissions or use HTTPS/localhost.`;
    console.error('recorder.js: startLive error:', err);
  } finally {
    hideLoadingIndicator();
  }
}

function stopLive() {
  if (isLive) {
    mediaStream.getTracks().forEach(track => track.stop());
    isLive = false;
    document.getElementById('status').textContent = 'Live mode stopped';
    const liveBtn = document.getElementById('liveBtn');
    if (liveBtn) {
      liveBtn.textContent = '🎤 Live Mode';
      liveBtn.classList.remove('live-active');
    }
    updateLiveIndicator();
  }
}

async function loadAudioFile(initAudio, audioCtx, audioNodes, visualize) {
  const success = await initAudio();
  if (!success) return;
  showLoadingIndicator();
  try {
    const fileInput = document.getElementById('uploadAudio');
    if (!fileInput || !fileInput.files[0]) return;
    const file = fileInput.files[0];
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    uploadedSource = audioCtx.createBufferSource();
    uploadedSource.buffer = audioBuffer;
    uploadedSource.connect(audioNodes.gain);
    uploadedSource.start();
    document.getElementById('status').textContent = 'Uploaded audio playing';
    visualize(isRecording, isLive, uploadedSource);
  } catch (err) {
    document.getElementById('status').textContent = `Audio upload failed: ${err.message}`;
    console.error('recorder.js: loadAudioFile error:', err);
  } finally {
    hideLoadingIndicator();
  }
}

function enableButtons() {
  const buttons = ['playBtn', 'downloadBtn', 'startBtn', 'stopBtn', 'liveBtn'];
  buttons.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.disabled = false;
      if (DEBUG) console.log(`recorder.js: Enabled button #${id}`);
    }
  });
}

// Export for main.js
window.RecorderManager = {
  startRecording,
  stopRecording,
  playRecording,
  downloadRecording,
  startLive,
  stopLive,
  loadAudioFile,
  getState: () => ({ isRecording, isLive, uploadedSource })
};
