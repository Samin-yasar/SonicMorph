// DEBUG is now declared in stars.js

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
      if (DEBUG) console.log(`app.js: Enabled slider #${slider}`);
    }
  });
  const consentCheckbox = document.getElementById('consentCheckbox');
  const hasConsent = !!(consentCheckbox && consentCheckbox.checked);
  const buttons = ['startBtn', 'liveBtn'];
  buttons.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.disabled = !hasConsent;
      if (DEBUG) console.log(`app.js: Enabled control button #${id}`);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (DEBUG) console.log('app.js: DOMContentLoaded');
  try {
    const consentCheckbox = document.getElementById('consentCheckbox');
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
    if (consentCheckbox) {
      consentCheckbox.addEventListener('change', () => {
        const startBtn = document.getElementById('startBtn');
        const liveBtn = document.getElementById('liveBtn');
        const enabled = consentCheckbox.checked;
        if (startBtn) startBtn.disabled = !enabled;
        if (liveBtn) liveBtn.disabled = !enabled;
        document.getElementById('status').textContent = enabled
          ? 'Consent acknowledged. You can start voice modification.'
          : 'Consent required before using voice modification.';
      });
    }

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
      startBtn.addEventListener('click', async () => {
        if (consentCheckbox && !consentCheckbox.checked) {
          document.getElementById('status').textContent = 'Consent required before starting recording.';
          return;
        }
        const success = await initAudio();
        if (success) {
          enableAudioControls();
          startRecording(initAudio, getAudioContext(), getNodes(), visualize);
        }
      });
      if (DEBUG) console.log('app.js: Bound startBtn click');
    }
    const stopBtn = document.getElementById('stopBtn');
    if (stopBtn) {
      stopBtn.addEventListener('click', stopRecording);
      if (DEBUG) console.log('app.js: Bound stopBtn click');
    }
    const playBtn = document.getElementById('playBtn');
    if (playBtn) {
      playBtn.addEventListener('click', playRecording);
      if (DEBUG) console.log('app.js: Bound playBtn click');
    }
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', downloadRecording);
      if (DEBUG) console.log('app.js: Bound downloadBtn click');
    }
    const liveBtn = document.getElementById('liveBtn');
    if (liveBtn) {
      liveBtn.addEventListener('click', async () => {
        if (consentCheckbox && !consentCheckbox.checked) {
          document.getElementById('status').textContent = 'Consent required before starting live mode.';
          return;
        }
        const success = await initAudio();
        if (success) {
          enableAudioControls();
          startLive(initAudio, getAudioContext(), getNodes(), visualize);
        }
      });
      if (DEBUG) console.log('app.js: Bound liveBtn click');
    }
    const uploadAudio = document.getElementById('uploadAudio');
    if (uploadAudio) {
      uploadAudio.addEventListener('change', async () => {
        if (consentCheckbox && !consentCheckbox.checked) {
          document.getElementById('status').textContent = 'Consent required before processing uploaded audio.';
          return;
        }
        const success = await initAudio();
        if (success) {
          enableAudioControls();
          loadAudioFile(initAudio, getAudioContext(), getNodes(), visualize);
        }
      });
      if (DEBUG) console.log('app.js: Bound uploadAudio change');
    }

    // Bind effects button
    const resetEffectsBtn = document.querySelector('button[data-action="resetEffects"]');
    if (resetEffectsBtn) {
      resetEffectsBtn.addEventListener('click', () => {
        resetEffects();
        updateAudioEffects(getAudioContext(), getNodes(), getToneEffects(), getImpulseResponse());
      });
      if (DEBUG) console.log('app.js: Bound resetEffects button');
    }

    // Bind preset buttons
    document.querySelectorAll('.preset-controls button').forEach(button => {
      const preset = button.getAttribute('data-preset');
      const action = button.getAttribute('data-action');
      if (preset) {
        button.addEventListener('click', async () => {
          const success = await initAudio();
          if (success) {
            enableAudioControls();
            applyPreset(preset, initAudio, () => updateAudioEffects(getAudioContext(), getNodes(), getToneEffects(), getImpulseResponse()));
          }
        });
        if (DEBUG) console.log(`app.js: Bound preset button: ${preset}`);
      } else if (action === 'savePreset') {
        button.addEventListener('click', savePreset);
        if (DEBUG) console.log('app.js: Bound savePreset button');
      }
    });

    // Initialize presets
    updatePresetList(
      (presetName) => loadPreset(presetName, () => updateAudioEffects(getAudioContext(), getNodes(), getToneEffects(), getImpulseResponse())),
      deletePreset
    );
  } catch (err) {
    document.getElementById('status').textContent = `Initialization failed: ${err.message}`;
    console.error('app.js: DOMContentLoaded error:', err);
  }
});
