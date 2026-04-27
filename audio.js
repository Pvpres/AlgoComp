let audioCtx;
let player = null;

//used to prevent clipping (shoutout Hw1 where i didnt do it correctly)
let masterGain = null;
let compressor = null;

export function pitchClassToMidi(pitchClass, octave = 5) {
    return pitchClass + (12 * octave);
}
export function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
}
export function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        player = new WebAudioFontPlayer();

        // Create a Compressor to dynamically squash the volume if it gets too loud
        compressor = audioCtx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-12, audioCtx.currentTime);
        compressor.knee.setValueAtTime(30, audioCtx.currentTime);
        compressor.ratio.setValueAtTime(12, audioCtx.currentTime);
        compressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
        compressor.release.setValueAtTime(0.25, audioCtx.currentTime);

        // Create a Master Gain to give us some headroom
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.5; // Lower overall volume to 50%

        // Route: Master Gain -> Compressor -> Speakers
        masterGain.connect(compressor);
        compressor.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playTone(frequency, startTime, duration, adsr) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.value = frequency;

    // Default ADSR
    const env = adsr || { attack: 0.05, decay: 0.1, sustain: 0.5, release: 0.2 };

    // Dynamic Randomization: slight variation to attack for organic feel
    const randomAttack = Math.max(0.005, env.attack * (1 + (Math.random() * 0.2 - 0.1)));

    const maxAttackDecay = duration;
    const actualAttack = Math.min(randomAttack, maxAttackDecay);

    let valueAtRelease = env.sustain;

    gain.gain.setValueAtTime(0, startTime);

    if (actualAttack < maxAttackDecay) {
        // Attack finishes before note ends
        gain.gain.linearRampToValueAtTime(1, startTime + actualAttack);

        const actualDecay = Math.min(env.decay, maxAttackDecay - actualAttack);
        if (actualDecay < env.decay && env.decay > 0) {
            const decayProgress = actualDecay / env.decay;
            valueAtRelease = 1.0 - (1.0 - env.sustain) * decayProgress;
            gain.gain.linearRampToValueAtTime(valueAtRelease, startTime + actualAttack + actualDecay);
        } else if (actualDecay > 0) {
            gain.gain.linearRampToValueAtTime(env.sustain, startTime + actualAttack + actualDecay);
        }
    } else {
        const attackProgress = actualAttack / randomAttack;
        valueAtRelease = attackProgress;
        gain.gain.linearRampToValueAtTime(valueAtRelease, startTime + actualAttack);
    }

    const releaseStart = startTime + duration;

    gain.gain.setValueAtTime(valueAtRelease, releaseStart);
    gain.gain.linearRampToValueAtTime(0.0001, releaseStart + env.release);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(startTime);
    osc.stop(releaseStart + env.release);
}

function generateEuclideanRhythm(hits, steps, offset = 0) {
    if (hits <= 0) return Array(steps).fill(0);
    if (hits >= steps) return Array(steps).fill(1);

    let pattern = [];
    for (let i = 0; i < steps; i++) {
        pattern.push((i * hits) % steps < hits ? 1 : 0);
    }

    if (offset > 0) {
        const shift = offset % steps;
        pattern = pattern.slice(-shift).concat(pattern.slice(0, -shift));
    }

    return pattern;
}

export function schedulePlayback(composition, isOctaveDisplacement, instrument, noteDuration, euclidean, adsr, onComplete) {
    initAudio();

    const playLoop = () => {
        let time = audioCtx.currentTime + 0.1; // Start slightly in the future
        const gapBetweenSets = noteDuration * 1.5; // Gap scales with note duration

        let rhythmPattern = [];
        let rhythmIndex = 0;
        if (euclidean.enabled) {
            rhythmPattern = generateEuclideanRhythm(euclidean.hits, euclidean.steps, euclidean.offset);
        }

        composition.forEach((set, setIndex) => {
            let noteIndex = 0;

            // Loop until we have played all notes in the set
            while (noteIndex < set.length) {
                const pitchClass = set[noteIndex];
                let playNote = true;

                if (euclidean.enabled) {
                    playNote = rhythmPattern[rhythmIndex % rhythmPattern.length] === 1;
                    rhythmIndex++;
                }

                if (playNote) {
                    // Determine the octave
                    let octave = 5; // We use octave 5 (C5 = 60) for our base
                    if (isOctaveDisplacement) {
                        // Randomly choose between -1, 0, or +1 octave shifts
                        octave += Math.floor(Math.random() * 3) - 1;
                    }

                    // Convert to MIDI
                    const midi = pitchClassToMidi(pitchClass, octave);

                    // Schedule the note
                    if (instrument === 'sine') {
                        const freq = midiToFreq(midi);
                        playTone(freq, time, noteDuration, adsr);
                    } else if (window[instrument]) {
                        // Route WebAudioFont through our master gain as well
                        player.queueWaveTable(audioCtx, masterGain, window[instrument], time, midi, noteDuration);
                    }

                    // Advance to the next note in the set only if we played it
                    noteIndex++;
                }

                // Advance time on the grid (even for rests)
                time += noteDuration;
            }

            // Add a gap after each set finishes playing
            time += gapBetweenSets;
        });

        // Calculate total duration in milliseconds
        const totalDurationMs = (time - audioCtx.currentTime) * 1000;

        // Call the completion callback when done
        if (onComplete) {
            setTimeout(onComplete, totalDurationMs);
        }
    };

    // Use startLoad to dynamically fetch AND decode the instrument, properly awaiting the result
    if (instrument !== 'sine') {
        const instrumentUrls = {
            '_tone_0000_JCLive_sf2_file': 'https://surikov.github.io/webaudiofontdata/sound/0000_JCLive_sf2_file.js',
            '_tone_0240_JCLive_sf2_file': 'https://surikov.github.io/webaudiofontdata/sound/0240_JCLive_sf2_file.js',
            '_tone_0270_JCLive_sf2_file': 'https://surikov.github.io/webaudiofontdata/sound/0270_JCLive_sf2_file.js',
            '_tone_0560_JCLive_sf2_file': 'https://surikov.github.io/webaudiofontdata/sound/0560_JCLive_sf2_file.js',
            '_tone_0570_JCLive_sf2_file': 'https://surikov.github.io/webaudiofontdata/sound/0570_JCLive_sf2_file.js',
            '_tone_0580_JCLive_sf2_file': 'https://surikov.github.io/webaudiofontdata/sound/0580_JCLive_sf2_file.js',
            '_tone_0650_JCLive_sf2_file': 'https://surikov.github.io/webaudiofontdata/sound/0650_JCLive_sf2_file.js'
        };

        player.loader.startLoad(audioCtx, instrumentUrls[instrument], instrument);
        // waitLoad perfectly tracks startLoad
        player.loader.waitLoad(playLoop);
    } else {
        // Run immediately if using sine wave
        playLoop();
    }
}
