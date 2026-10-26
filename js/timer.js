/**
 * Precise Timer Engine with Wake Lock and Background Tab Synchronization
 */

class FocusTimer {
    constructor(soundManager, flipClock) {
        this.soundManager = soundManager;
        this.flipClock = flipClock;

        this.initialDuration = 20 * 60; // 20 minutes default
        this.remainingTime = this.initialDuration;
        this.targetEndTime = 0;
        
        this.state = 'IDLE'; // IDLE, COUNTDOWN, RUNNING, PAUSED, FINISHED
        this.timerInterval = null;
        this.countdownInterval = null;
        this.wakeLock = null;

        // Bind visibility change to resync accurately when tab wakes up
        document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
    }

    /**
     * Set timer duration in seconds
     */
    setDuration(seconds) {
        if (this.state === 'RUNNING' || this.state === 'COUNTDOWN') return;
        this.initialDuration = Math.max(1, Math.min(5999, Math.floor(seconds)));
        this.remainingTime = this.initialDuration;
        this.flipClock.setTime(this.remainingTime, false);
        this.updateDocumentTitle();
        this.notifyState();
    }

    /**
     * Start or Resume the timer
     * @param {boolean} withCountdown Whether to play 3s countdown (default true for fresh starts)
     */
    start(withCountdown = true) {
        if (this.state === 'RUNNING' || this.state === 'COUNTDOWN') return;

        this.soundManager.initAudioContext();

        if (this.remainingTime <= 0) {
            this.remainingTime = this.initialDuration;
        }

        // If resuming from pause, don't force countdown
        if (this.state === 'PAUSED' || !withCountdown) {
            this.runTimer();
            return;
        }

        // Fresh start with 3-second countdown
        this.state = 'COUNTDOWN';
        this.notifyState();

        let count = 3;
        const countdownEl = document.getElementById('countdown-overlay');
        const countdownNum = document.getElementById('countdown-number');
        
        if (countdownEl && countdownNum) {
            countdownEl.classList.add('active');
            countdownNum.innerText = count;
        }

        this.soundManager.playCountdownTick();

        this.countdownInterval = setInterval(() => {
            count--;
            if (count > 0) {
                if (countdownNum) {
                    // Re-trigger animation by resetting text
                    countdownNum.innerText = count;
                    countdownNum.style.animation = 'none';
                    countdownNum.offsetHeight; /* trigger reflow */
                    countdownNum.style.animation = null;
                }
                this.soundManager.playCountdownTick();
            } else {
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
                if (countdownEl) {
                    countdownEl.classList.remove('active');
                }
                this.runTimer();
            }
        }, 1000);
    }

    /**
     * Core run loop using real timestamps
     */
    runTimer() {
        this.state = 'RUNNING';
        this.targetEndTime = Date.now() + (this.remainingTime * 1000);
        this.requestWakeLock();
        this.notifyState();
        this.updateDocumentTitle();

        clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            const now = Date.now();
            const diff = Math.max(0, Math.round((this.targetEndTime - now) / 1000));

            if (diff !== this.remainingTime) {
                this.remainingTime = diff;
                this.flipClock.setTime(this.remainingTime, true);
                this.updateProgressBar();
                this.updateDocumentTitle();

                if (this.remainingTime > 0) {
                    this.soundManager.playTick();
                } else {
                    this.finish();
                }
            }
        }, 120);
    }

    /**
     * Pause the timer
     */
    pause() {
        if (this.state !== 'RUNNING' && this.state !== 'COUNTDOWN') return;

        clearInterval(this.timerInterval);
        this.timerInterval = null;

        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
            const countdownEl = document.getElementById('countdown-overlay');
            if (countdownEl) countdownEl.classList.remove('active');
        }

        this.releaseWakeLock();
        this.state = 'PAUSED';
        this.notifyState();
        this.updateDocumentTitle();
    }

    /**
     * Reset the timer to the set duration
     */
    reset() {
        this.pause();
        this.state = 'IDLE';
        this.remainingTime = this.initialDuration;
        this.flipClock.setTime(this.remainingTime, false);
        this.updateProgressBar();
        this.updateDocumentTitle();
        this.notifyState();
    }

    /**
     * Finished 00:00
     */
    finish() {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.releaseWakeLock();
        this.state = 'FINISHED';

        this.soundManager.playAlarm();
        this.notifyState();
        this.updateDocumentTitle('00:00 - Tempo Scaduto');

        // Optional vibration for mobile devices supporting navigator.vibrate
        if (navigator.vibrate) {
            try {
                navigator.vibrate([200, 100, 200, 100, 300]);
            } catch (e) {}
        }
    }

    /**
     * Update progress bar
     */
    updateProgressBar() {
        const bar = document.getElementById('progress-bar');
        if (!bar || this.initialDuration <= 0) return;

        const fraction = Math.max(0, Math.min(1, this.remainingTime / this.initialDuration));
        bar.style.width = `${(fraction * 100).toFixed(1)}%`;
    }

    /**
     * Update document tab title (only timer numbers, no emojis)
     */
    updateDocumentTitle(customTitle) {
        if (customTitle) {
            document.title = customTitle;
            return;
        }

        const m = Math.floor(this.remainingTime / 60);
        const s = this.remainingTime % 60;
        const mStr = String(m).padStart(2, '0');
        const sStr = String(s).padStart(2, '0');

        if (this.state === 'RUNNING' || this.state === 'PAUSED') {
            document.title = `${mStr}:${sStr}`;
        } else {
            document.title = `${mStr}:${sStr} - Timer`;
        }
    }

    /**
     * Notify UI of state changes
     */
    notifyState() {
        if (typeof this.onStateChange === 'function') {
            this.onStateChange(this.state);
        }
    }

    /**
     * Resync when returning to tab
     */
    handleVisibilityChange() {
        if (document.visibilityState === 'visible' && this.state === 'RUNNING') {
            const now = Date.now();
            const diff = Math.max(0, Math.round((this.targetEndTime - now) / 1000));
            this.remainingTime = diff;
            this.flipClock.setTime(this.remainingTime, false);
            this.updateProgressBar();
            this.requestWakeLock();

            if (this.remainingTime <= 0) {
                this.finish();
            }
        }
    }

    /**
     * Request Screen WakeLock so screen doesn't sleep during timer
     */
    async requestWakeLock() {
        if ('wakeLock' in navigator) {
            try {
                this.wakeLock = await navigator.wakeLock.request('screen');
                this.wakeLock.addEventListener('release', () => {
                    this.wakeLock = null;
                });
            } catch (err) {
                // Wake lock may fail if battery saver is active or low power mode
            }
        }
    }

    /**
     * Release Screen WakeLock
     */
    releaseWakeLock() {
        if (this.wakeLock !== null) {
            try {
                this.wakeLock.release();
            } catch (e) {}
            this.wakeLock = null;
        }
    }
}

// Export singleton
window.focusTimer = new FocusTimer(window.soundManager, window.flipClock);
