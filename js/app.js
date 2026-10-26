/**
 * Main Application Controller
 * Handles UI interactions, inputs, click-outside toggling, and timer binding.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const inM = document.getElementById('in-m');
    const inS = document.getElementById('in-s');
    const btnStart = document.getElementById('btn-start');
    const btnPause = document.getElementById('btn-pause');
    const btnResume = document.getElementById('btn-resume');
    const btnReset = document.getElementById('btn-reset');
    const soundToggle = document.getElementById('sound-tick');
    const btnFullscreen = document.getElementById('btn-fullscreen');

    const topBar = document.getElementById('top-bar');
    const controlsWrapper = document.getElementById('controls-wrapper');
    const controlsCard = document.getElementById('controls-card');
    const clockStage = document.getElementById('clock-stage');
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const presetChips = document.querySelectorAll('.preset-chip');

    let isUiHidden = false;

    // --- Audio Init ---
    if (soundToggle) {
        soundToggle.checked = window.soundManager.enabled;
        soundToggle.addEventListener('change', (e) => {
            window.soundManager.setEnabled(e.target.checked);
        });
    }

    // --- Inputs Handling (Centered, text-based numeric inputs) ---
    function sanitizeValue(input, max) {
        let raw = input.value.replace(/\D/g, ''); // Digits only
        let num = parseInt(raw, 10);
        if (isNaN(num) || num < 0) num = 0;
        if (num > max) num = max;
        return num;
    }

    function clampInputs(formatDisplay = true) {
        let m = sanitizeValue(inM, 99);
        let s = sanitizeValue(inS, 59);

        if (formatDisplay) {
            inM.value = String(m).padStart(2, '0');
            inS.value = String(s).padStart(2, '0');
        }

        return { minutes: m, seconds: s, total: (m * 60) + s };
    }

    function syncTimerFromInputs(formatDisplay = false) {
        const { total } = clampInputs(formatDisplay);
        window.focusTimer.setDuration(total);
        highlightMatchingPreset(total);
    }

    [inM, inS].forEach(input => {
        if (!input) return;

        // Filter keys
        input.addEventListener('keydown', (e) => {
            if (['e', 'E', '+', '-', '.'].includes(e.key)) {
                e.preventDefault();
            }
            if (e.key === 'Enter') {
                input.blur();
            }
        });

        input.addEventListener('input', () => {
            // Remove any non-digits immediately
            input.value = input.value.replace(/\D/g, '').slice(0, 2);
            if (window.focusTimer.state === 'IDLE' || window.focusTimer.state === 'FINISHED') {
                syncTimerFromInputs(false);
            }
        });

        input.addEventListener('blur', () => {
            clampInputs(true);
            syncTimerFromInputs(true);
        });

        // Select all on focus for quick edit
        input.addEventListener('focus', () => {
            input.select();
        });
    });

    // Stepper buttons (+/-)
    document.querySelectorAll('.step-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.focusTimer.state === 'RUNNING' || window.focusTimer.state === 'COUNTDOWN') return;

            const targetInputId = btn.dataset.target;
            const delta = parseInt(btn.dataset.step, 10) || 1;
            const targetInput = document.getElementById(targetInputId);

            if (targetInput) {
                let current = parseInt(targetInput.value, 10) || 0;
                let max = targetInputId === 'in-m' ? 99 : 59;
                let next = Math.max(0, Math.min(max, current + delta));
                targetInput.value = String(next).padStart(2, '0');
                syncTimerFromInputs(true);
            }
        });
    });

    // --- Presets ---
    function highlightMatchingPreset(totalSeconds) {
        presetChips.forEach(chip => {
            const presetSeconds = parseInt(chip.dataset.seconds, 10);
            if (presetSeconds === totalSeconds) {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        });
    }

    presetChips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.focusTimer.state === 'RUNNING' || window.focusTimer.state === 'COUNTDOWN') return;

            const seconds = parseInt(chip.dataset.seconds, 10);
            const m = Math.floor(seconds / 60);
            const s = seconds % 60;

            inM.value = String(m).padStart(2, '0');
            inS.value = String(s).padStart(2, '0');

            syncTimerFromInputs(true);
        });
    });

    // --- Timer Button Actions ---
    if (btnStart) {
        btnStart.addEventListener('click', (e) => {
            e.stopPropagation();
            window.soundManager.initAudioContext();
            const { total } = clampInputs(true);
            if (total <= 0) return;
            window.focusTimer.start(true);
        });
    }

    if (btnResume) {
        btnResume.addEventListener('click', (e) => {
            e.stopPropagation();
            window.soundManager.initAudioContext();
            window.focusTimer.start(false);
        });
    }

    if (btnPause) {
        btnPause.addEventListener('click', (e) => {
            e.stopPropagation();
            window.focusTimer.pause();
        });
    }

    if (btnReset) {
        btnReset.addEventListener('click', (e) => {
            e.stopPropagation();
            window.focusTimer.reset();
        });
    }

    // --- Timer State Listener ---
    window.focusTimer.onStateChange = (state) => {
        const isInteractive = (state === 'IDLE' || state === 'FINISHED');
        inM.disabled = !isInteractive;
        inS.disabled = !isInteractive;

        btnStart.classList.add('hidden');
        btnResume.classList.add('hidden');
        btnPause.classList.add('hidden');

        if (state === 'IDLE') {
            btnStart.classList.remove('hidden');
            btnStart.textContent = 'Avvia';
            statusDot.className = 'status-dot';
            statusText.textContent = 'Pronto';
            showUI();
        } else if (state === 'COUNTDOWN') {
            statusDot.className = 'status-dot running';
            statusText.textContent = 'Inizio in arrivo...';
            hideUI();
        } else if (state === 'RUNNING') {
            btnPause.classList.remove('hidden');
            statusDot.className = 'status-dot running';
            statusText.textContent = 'Focus in corso';
            hideUI();
        } else if (state === 'PAUSED') {
            btnResume.classList.remove('hidden');
            statusDot.className = 'status-dot paused';
            statusText.textContent = 'In pausa';
            showUI();
        } else if (state === 'FINISHED') {
            btnStart.classList.remove('hidden');
            btnStart.textContent = 'Ricomincia';
            statusDot.className = 'status-dot';
            statusText.textContent = 'Finito! 🎉';
            showUI();
        }
    };

    // --- UI Show / Hide (Click Outside to Hide / Click to Show with Clock Scaling) ---
    function showUI() {
        isUiHidden = false;
        if (controlsWrapper) controlsWrapper.classList.remove('ui-faded');
        if (topBar) topBar.classList.remove('ui-faded');
        if (clockStage) clockStage.classList.remove('clock-expanded');
    }

    function hideUI() {
        isUiHidden = true;
        if (controlsWrapper) controlsWrapper.classList.add('ui-faded');
        if (topBar) topBar.classList.add('ui-faded');
        if (clockStage) clockStage.classList.add('clock-expanded');
    }

    // Click anywhere outside the controls card to toggle hide/show
    document.addEventListener('pointerdown', (e) => {
        window.soundManager.initAudioContext();

        // If clicking inside controls-card or directly on fullscreen button, let it work normally
        if (e.target.closest('#controls-card, #btn-fullscreen')) {
            return;
        }

        // Clicked outside / on screen: toggle hide or show
        if (!isUiHidden) {
            hideUI();
        } else {
            showUI();
        }
    });

    // --- Fullscreen Manager (Desktop only, hidden on mobile) ---
    const isFullscreenSupported = () => {
        return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
    };

    const isMobileDevice = window.matchMedia('(max-width: 768px)').matches || ('ontouchstart' in window && !document.fullscreenEnabled);

    if (btnFullscreen) {
        if (!isFullscreenSupported() || isMobileDevice) {
            btnFullscreen.style.display = 'none';
        } else {
            btnFullscreen.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFullscreen();
            });
        }
    }

    function isFullscreenActive() {
        return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement);
    }

    function toggleFullscreen() {
        if (!isFullscreenActive()) {
            const docEl = document.documentElement;
            if (docEl.requestFullscreen) {
                docEl.requestFullscreen().catch(() => {});
            } else if (docEl.webkitRequestFullscreen) {
                docEl.webkitRequestFullscreen();
            } else if (docEl.mozRequestFullScreen) {
                docEl.mozRequestFullScreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            }
        }
    }

    // --- Initial Setup ---
    syncTimerFromInputs(true);
});
