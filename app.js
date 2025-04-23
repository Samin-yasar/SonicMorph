const DEBUG = true;

function enableAudioControls() {
  const sliders = [
    'pitchShift', 'formantShift', 'reverb', 'distortion', 'echo',
    'bitcrusher', 'vocoder', 'chorus', 'phaser', 'autotune',
    'highpass', 'subBass'
  ];
  sliders.forEach(slider => {
    const input = document.getElementById(slider);
    if (input) {
      input.disabled = false;
      if (DEBUG) console.log(`main.js: Enabled slider #${slider}`);
    }
  });
  const buttons = ['startBtn', 'liveBtn'];
  buttons.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.disabled = false;
      if (DEBUG) console.log(`main.js: Enabled control button #${id}`);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (DEBUG) console.log('main.js: DOMContentLoaded');
  try {
    // Disable controls initially
    const sliders = [
      'pitchShift', 'formantShift', 'reverb', 'distortion', 'echo',
      'bitcrusher', 'vocoder', 'chorus', 'phaser', 'autotune',
      'highpass', 'subBass'
    ];
    sliders.forEach(slider => {
      const input = document.getElementById(slider);
      if (input) input.disabled = true;
    });
    const buttons = ['startBtn', 'stopBtn', 'playBtn', 'downloadBtn', 'liveBtn'];
    buttons.forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.disabled = true;
    });

    // Initialize modules
    window.StarAnimation.init();
    window.TabNavigation.init();
    const { init: initAudio, getAudioContext, getNodes, getToneEffects, getImpulseResponse, visualize } = window.AudioManager;
    const { setupSliders, resetEffects, applyPreset, savePreset, loadPreset, deletePreset, updatePresetList, updateAudioEffects } = window.EffectsManager;
    const { startRecording, stopRecording, playRecording, downloadRecording, startLive, stopLive, loadAudioFile, getState } = window.RecorderManager;

    // Setup sliders
    setupSliders(initAudio, () => updateAudioEffects(getAudioContext(), getNodes(), getToneEffects(), getImpulseResponse()));

    // Bind control buttons
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
      startBtn.addEventListener('click', () => startRecording(initAudio, getAudioContext(), getNodes(), visualize));
      if (DEBUG) console.log('main.js: Bound startBtn click');
    }
    const stopBtn = document.getElementById('stopBtn');
    if (stopBtn) {
      stopBtn.addEventListener('click', stopRecording);
      if (DEBUG) console.log('main.js: Bound stopBtn click');
    }
    const playBtn = document.getElementById('playBtn');
    if (playBtn) {
      playBtn.addEventListener('click', playRecording);
      if (DEBUG) console.log('main.js: Bound playBtn click');
    }
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', downloadRecording);
      if (DEBUG) console.log('main.js: Bound downloadBtn click');
    }
    const liveBtn = document.getElementById('liveBtn');
    if (liveBtn) {
      liveBtn.addEventListener('click', () => startLive(initAudio, getAudioContext(), getNodes(), visualize));
      if (DEBUG) console.log('main.js: Bound liveBtn click');
    }
    const uploadAudio = document.getElementById('uploadAudio');
    if (uploadAudio) {
      uploadAudio.addEventListener('change', () => loadAudioFile(initAudio, getAudioContext(), getNodes(), visualize));
      if (DEBUG) console.log('main.js: Bound uploadAudio change');
    }

    // Bind effects button
    const resetEffectsBtn = document.querySelector('button[data-action="resetEffects"]');
    if (resetEffectsBtn) {
      resetEffectsBtn.addEventListener('click', () => {
        resetEffects();
        updateAudioEffects(getAudioContext(), getNodes(), getToneEffects(), getImpulseResponse());
      });
      if (DEBUG) console.log('main.js: Bound resetEffects button');
    }

    // Bind preset buttons
    document.querySelectorAll('.preset-controls button').forEach(button => {
      const preset = button.getAttribute('data-preset');
      const action = button.getAttribute('data-action');
      if (preset) {
        button.addEventListener('click', () => applyPreset(preset, initAudio, () => updateAudioEffects(getAudioContext(), getNodes(), getToneEffects(), getImpulseResponse())));
        if (DEBUG) console.log(`main.js: Bound preset button: ${preset}`);
      } else if (action === 'savePreset') {
        button.addEventListener('click', savePreset);
        if (DEBUG) console.log('main.js: Bound savePreset button');
      }
    });

    // Initialize presets
    updatePresetList(
      (presetName) => loadPreset(presetName, () => updateAudioEffects(getAudioContext(), getNodes(), getToneEffects(), getImpulseResponse())),
      deletePreset
    );

    // Enable controls after initialization
    initAudio().then(success => {
      if (success) enableAudioControls();
    });
  } catch (err) {
    document.getElementById('status').textContent = `Initialization failed: ${err.message}`;
    console.error('main.js: DOMContentLoaded error:', err);
  }
});
