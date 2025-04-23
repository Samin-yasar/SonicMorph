const DEBUG = true;

const sliders = [
  'pitchShift', 'formantShift', 'reverb', 'distortion', 'echo',
  'bitcrusher', 'vocoder', 'chorus', 'phaser', 'autotune',
  'highpass', 'subBass'
];

function setupSliders(initAudio, updateAudioEffects) {
  if (DEBUG) console.log('effects.js: Setting up sliders');
  sliders.forEach(slider => {
    const input = document.getElementById(slider);
    const valueDisplay = document.getElementById(`${slider}-value`);
    if (input && valueDisplay) {
      input.disabled = true;
      valueDisplay.textContent = parseFloat(input.value).toFixed(2);
      input.addEventListener('input', async () => {
        const success = await initAudio();
        if (!success) return;
        valueDisplay.textContent = parseFloat(input.value).toFixed(2);
        updateAudioEffects();
      });
    } else {
      console.warn(`effects.js: Slider #${slider} or #${slider}-value not found`);
    }
  });
}

function resetEffects() {
  if (DEBUG) console.log('effects.js: Resetting effects');
  sliders.forEach(slider => {
    const input = document.getElementById(slider);
    const valueDisplay = document.getElementById(`${slider}-value`);
    if (input && valueDisplay) {
      input.value = input.getAttribute('value') || 0;
      valueDisplay.textContent = parseFloat(input.value).toFixed(2);
    }
  });
}

async function applyPreset(preset, initAudio, updateAudioEffects) {
  const success = await initAudio();
  if (!success) return;
  if (DEBUG) console.log(`effects.js: Applying preset: ${preset}`);
  const presets = {
    robot: {
      pitchShift: -2, formantShift: -1, bitcrusher: 0.5, vocoder: 0.7, chorus: 0.4,
      reverb: 0, distortion: 0, echo: 0, phaser: 0, autotune: 0, highpass: 0, subBass: 0
    },
    alien: {
      pitchShift: 6, formantShift: 2, echo: 0.4, reverb: 0.5, phaser: 0.6,
      distortion: 0, bitcrusher: 0, vocoder: 0, chorus: 0, autotune: 0, highpass: 0, subBass: 0
    },
    cyberbot: {
      pitchShift: -3, formantShift: -0.5, autotune: 0.8, phaser: 0.5, vocoder: 0.6,
      reverb: 0, distortion: 0, echo: 0, bitcrusher: 0, chorus: 0, highpass: 0, subBass: 0
    },
    ghost: {
      pitchShift: 4, formantShift: 1.5, highpass: 500, reverb: 0.7, chorus: 0.3,
      distortion: 0, echo: 0, bitcrusher: 0, vocoder: 0, phaser: 0, autotune: 0, subBass: 0
    },
    chipmunk: {
      pitchShift: 10, formantShift: 3, reverb: 0, distortion: 0, echo: 0,
      bitcrusher: 0, vocoder: 0, chorus: 0, phaser: 0, autotune: 0, highpass: 0, subBass: 0
    },
    demon: {
      pitchShift: -10, formantShift: -2, reverb: 0.6, distortion: 0.5, subBass: 0.7,
      echo: 0, bitcrusher: 0, vocoder: 0, chorus: 0, phaser: 0, autotune: 0, highpass: 0
    },
    radio: {
      pitchShift: 0, highpass: 300, reverb: 0.2, echo: 0.1, distortion: 0.3,
      formantShift: 0, bitcrusher: 0, vocoder: 0, chorus: 0, phaser: 0, autotune: 0, subBass: 0
    },
    normal: {
      pitchShift: 0, formantShift: 0, reverb: 0, distortion: 0, echo: 0,
      bitcrusher: 0, vocoder: 0, chorus: 0, phaser: 0, autotune: 0, highpass: 0, subBass: 0
    }
  };

  resetEffects();
  const settings = presets[preset] || {};
  Object.keys(settings).forEach(slider => {
    const input = document.getElementById(slider);
    const valueDisplay = document.getElementById(`${slider}-value`);
    if (input && valueDisplay) {
      input.value = settings[slider];
      valueDisplay.textContent = parseFloat(input.value).toFixed(2);
    }
  });
  updateAudioEffects();
}

function savePreset() {
  if (DEBUG) console.log('effects.js: Saving preset');
  const presetName = prompt('Enter preset name:');
  if (presetName) {
    const settings = {};
    sliders.forEach(slider => {
      const input = document.getElementById(slider);
      if (input) {
        settings[slider] = input.value;
      }
    });
    localStorage.setItem(`preset_${presetName}`, JSON.stringify(settings));
    updatePresetList();
    document.getElementById('status').textContent = `Preset "${presetName}" saved`;
  }
}

function loadPreset(presetName, updateAudioEffects) {
  if (DEBUG) console.log(`effects.js: Loading preset: ${presetName}`);
  const settings = JSON.parse(localStorage.getItem(`preset_${presetName}`));
  if (settings) {
    Object.keys(settings).forEach(key => {
      const input = document.getElementById(key);
      const valueDisplay = document.getElementById(`${key}-value`);
      if (input && valueDisplay) {
        input.value = settings[key];
        valueDisplay.textContent = parseFloat(input.value).toFixed(2);
      }
    });
    updateAudioEffects();
    document.getElementById('status').textContent = `Preset "${presetName}" loaded`;
  }
}

function deletePreset(presetName) {
  if (DEBUG) console.log(`effects.js: Deleting preset: ${presetName}`);
  localStorage.removeItem(`preset_${presetName}`);
  updatePresetList();
  document.getElementById('status').textContent = `Preset "${presetName}" deleted`;
}

function updatePresetList(loadPresetFn, deletePresetFn) {
  const presetList = document.getElementById('preset-list');
  if (presetList) {
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
        applyBtn.addEventListener('click', () => loadPresetFn(presetName));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.setAttribute('aria-label', `Delete ${presetName} preset`);
        deleteBtn.addEventListener('click', () => deletePresetFn(presetName));
        
        presetItem.appendChild(applyBtn);
        presetItem.appendChild(deleteBtn);
        presetList.appendChild(presetItem);
      }
    });
  }
}

function updateAudioEffects(audioCtx, audioNodes, toneEffects, impulseResponse) {
  if (!audioCtx) {
    if (DEBUG) console.log('effects.js: updateAudioEffects skipped: audio not initialized');
    return;
  }
  try {
    audioNodes.gain.gain.setValueAtTime(1.0, audioCtx.currentTime);
    audioNodes.distortion.curve = makeDistortionCurve(parseFloat(document.getElementById('distortion').value) * 100);
    audioNodes.reverb.buffer = impulseResponse;
    audioNodes.echo.delayTime.setValueAtTime(parseFloat(document.getElementById('echo').value), audioCtx.currentTime);
    audioNodes.highpass.frequency.setValueAtTime(parseFloat(document.getElementById('highpass').value), audioCtx.currentTime);
    audioNodes.subBass.gain.setValueAtTime(parseFloat(document.getElementById('subBass').value) * 20, audioCtx.currentTime);
    audioNodes.vocoderGain.gain.setValueAtTime(parseFloat(document.getElementById('vocoder').value), audioCtx.currentTime);
    audioNodes.ringModGain.gain.setValueAtTime(parseFloat(document.getElementById('bitcrusher').value) * 0.5, audioCtx.currentTime);

    if (toneEffects.pitch) {
      toneEffects.pitch.pitch = parseFloat(document.getElementById('pitchShift').value) + parseFloat(document.getElementById('formantShift').value);
      toneEffects.pitch.wet.setValueAtTime(parseFloat(document.getElementById('reverb').value), Tone.immediate());
    }
    if (toneEffects.chorus) {
      toneEffects.chorus.wet.setValueAtTime(parseFloat(document.getElementById('chorus').value), Tone.immediate());
    }
    if (toneEffects.phaser) {
      toneEffects.phaser.wet.setValueAtTime(parseFloat(document.getElementById('phaser').value), Tone.immediate());
    }
    if (toneEffects.autotune) {
      toneEffects.autotune.wet.setValueAtTime(parseFloat(document.getElementById('autotune').value), Tone.immediate());
    }
  } catch (err) {
    document.getElementById('status').textContent = `Effect update failed: ${err.message}`;
    console.error('effects.js: updateAudioEffects error:', err);
  }
}

function makeDistortionCurve(amount) {
  const k = amount;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

// Export for main.js
window.EffectsManager = {
  setupSliders,
  resetEffects,
  applyPreset,
  savePreset,
  loadPreset,
  deletePreset,
  updatePresetList,
  updateAudioEffects
};
