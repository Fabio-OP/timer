/**
 * Audio Manager for Aesthetic Flip Clock Timer
 * Provides flip tick sounds, gentle chimes, and fallback synthesized sound effects.
 */

class SoundManager {
    constructor() {
        this.enabled = true;
        this.audioCtx = null;
        this.flipAudio = null;
        this.audioBuffer = null;
        this.isLoaded = false;
        
        // Load preference from localStorage if available
        const savedPref = localStorage.getItem('aesthetic_timer_sound');
        if (savedPref !== null) {
            this.enabled = savedPref === 'true';
        }

        this.initAudioElement();
    }

    /**
     * Initializes the flip audio element with fallback paths
     */
    initAudioElement() {
        try {
            // Support both root flip.mp3 and assets/audio/flip.mp3
            this.flipAudio = new Audio('flip.mp3');
            this.flipAudio.preload = 'auto';
            
            this.flipAudio.addEventListener('canplaythrough', () => {
                this.isLoaded = true;
            }, { once: true });

            this.flipAudio.addEventListener('error', () => {
                // Try fallback to assets folder if root failed
                if (this.flipAudio.src && !this.flipAudio.src.includes('assets/')) {
                    this.flipAudio.src = 'assets/flip.mp3';
                }
            }, { once: true });
        } catch (e) {
            console.warn('Audio element initialization failed, using Web Audio fallback:', e);
        }
    }

    /**
     * Unlocks and initializes the Web Audio Context after user interaction
     */
    initAudioContext() {
        if (!this.audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                this.audioCtx = new AudioContextClass();
            }
        }
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    /**
     * Set sound enabled / disabled
     */
    setEnabled(value) {
        this.enabled = Boolean(value);
        localStorage.setItem('aesthetic_timer_sound', String(this.enabled));
    }

    /**
     * Play the mechanical flip tick
     */
    playTick() {
        if (!this.enabled) return;

        // Try playing the MP3 first
        if (this.flipAudio) {
            this.flipAudio.currentTime = 0;
            const playPromise = this.flipAudio.play();
            if (playPromise !== undefined) {
                playPromise.catch(() => {
                    // Fallback to Web Audio synthesis if HTML5 audio fails
                    this.playSyntheticTick();
                });
                return;
            }
        }

        // Web Audio fallback
        this.playSyntheticTick();
    }

    /**
     * Plays a realistic gentle mechanical click using Web Audio API synthesis
     */
    playSyntheticTick() {
        this.initAudioContext();
        if (!this.audioCtx) return;

        try {
            const now = this.audioCtx.currentTime;

            // Short percussive pop (simulating physical mechanical flap hitting the stop)
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            const filter = this.audioCtx.createBiquadFilter();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(45, now + 0.04);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(350, now);

            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc.start(now);
            osc.stop(now + 0.05);
        } catch (e) {
            // Audio error silently handled
        }
    }

    /**
     * Plays a pleasant multi-tone chime sequence when timer finishes
     */
    playAlarm() {
        this.initAudioContext();
        if (!this.audioCtx) return;

        try {
            const now = this.audioCtx.currentTime;
            // Pentatonic soothing sequence (C5, E5, G5, C6)
            const notes = [523.25, 659.25, 783.99, 1046.50];

            notes.forEach((freq, index) => {
                const startTime = now + index * 0.28;
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, startTime);

                // Gentle bell-like envelope
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.35, startTime + 0.04);
                gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.2);

                osc.connect(gain);
                gain.connect(this.audioCtx.destination);

                osc.start(startTime);
                osc.stop(startTime + 1.3);
            });
        } catch (e) {
            console.warn('Alarm audio playback failed:', e);
        }
    }
}

// Export singleton
window.soundManager = new SoundManager();
