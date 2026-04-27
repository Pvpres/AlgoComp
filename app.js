import { generateComposition } from './compose.js';
import { schedulePlayback, initAudio } from './audio.js';

const playBtn = document.getElementById('playBtn');
const thematicToggle = document.getElementById('thematicToggle');
const octaveToggle = document.getElementById('octaveToggle');
const euclideanToggle = document.getElementById('euclideanToggle');
const euclideanControls = document.getElementById('euclideanControls');
const euclideanHits = document.getElementById('euclideanHits');
const euclideanSteps = document.getElementById('euclideanSteps');
const euclideanOffset = document.getElementById('euclideanOffset');
const instrumentSelect = document.getElementById('instrumentSelect');
const durationSlider = document.getElementById('durationSlider');
const durationValue = document.getElementById('durationValue');
const statusDiv = document.getElementById('status');
const startingSet = document.getElementById('startingSet');

// ADSR Inputs
const adsrA = document.getElementById('adsrA');
const adsrD = document.getElementById('adsrD');
const adsrS = document.getElementById('adsrS');
const adsrR = document.getElementById('adsrR');

durationSlider.addEventListener('input', (e) => {
    durationValue.textContent = `${e.target.value}s`;
});

euclideanToggle.addEventListener('change', (e) => {
    euclideanControls.style.display = e.target.checked ? 'flex' : 'none';
});

playBtn.addEventListener('click', () => {
    // 1. Initialize Audio (must be on user interaction)
    initAudio();

    // 2. Read parameters
    const isThematic = thematicToggle.checked;
    const isOctaveDisplacement = octaveToggle.checked;
    const instrument = instrumentSelect.value;
    const noteDuration = parseFloat(durationSlider.value);
    
    const euclidean = {
        enabled: euclideanToggle.checked,
        hits: parseInt(euclideanHits.value, 10),
        steps: parseInt(euclideanSteps.value, 10),
        offset: parseInt(euclideanOffset.value, 10)
    };

    const adsr = {
        attack: parseFloat(adsrA.value),
        decay: parseFloat(adsrD.value),
        sustain: parseFloat(adsrS.value),
        release: parseFloat(adsrR.value)
    };

    // Fix: Read and parse the starting set input
    let startingSetInput = null;
    if (startingSet && startingSet.value) {
        startingSetInput = startingSet.value.split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n));
    }

    // 3. Generate new composition
    statusDiv.textContent = "Generating composition...";
    const composition = generateComposition(isThematic, startingSetInput);
    
    // 4. Play the composition
    playBtn.disabled = true;
    statusDiv.textContent = "Playing...";
    
    schedulePlayback(composition, isOctaveDisplacement, instrument, noteDuration, euclidean, adsr, () => {
        playBtn.disabled = false;
        statusDiv.textContent = "Finished playback.";
    });
});
