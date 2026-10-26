/**
 * Main Application Controller
 * Handles UI interactions, inputs, keyboard shortcuts, mobile gestures, and state binding.
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
    const btnHelp = document.getElementById('btn-help');
    const helpModal = document.getElementById('help-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnRestoreUi = document.getElementById('btn-restore-ui');

    const topBar = document.getElementById('top-bar');
    const controlsWrapper = document.getElementById('controls-wrapper');
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const presetChips = document.querySelectorAll('.preset-chip');

    let mouseInactivityTimeout = null;
    let isUiHidden = false;

    // --- Audio Init ---
    if (soundToggle) {
        soundToggle.checked = window.soundManager.enabled;
        soundToggle.addEventListener('change', (e) => {
            window.soundManager.setEnabled(e.target.checked);
        });
    }

    // --- Inputs Handling ---
    function clampInputs() {
        let m = parseInt(inM.value, 10);
        let s = parseInt(inS.value, 10);

        if (isNaN(m) || m < 0) m = 0;
        if (m > 99) m = 99;

        if (isNaN(s) || s < 0) s = 0;
        if (s > 59) s = 59;

        inM.value = String(m).padStart(2, '0');
        inS.value = String(s).padStart(2, '0');

        return { minutes: m, seconds: s, total: (m * 60) + s };
    }

    function syncTimerFromInputs() {
        const { total } = clampInputs();
        window.focusTimer.setDuration(total);
        highlightMatchingPreset(total);
    }

    [inM, inS].forEach(input => {
        if (!input) return;

        // Prevent typing non-numeric characters ('e', '+', '-', '.')
        input.addEventListener('keydown', (e) => {
            if (['e', 'E', '+', '-', '.'].includes(e.key)) {
                e.preventDefault();
            }
        });

        input.addEventListener('input', () => {
            if (window.focusTimer.state === 'IDLE' || window.focusTimer.state === 'FINISHED') {
                syncTimerFromInputs();
            }
        });

        input.addEventListener('blur', () => {
            clampInputs();
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
                syncTimerFromInputs();
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

            syncTimerFromInputs();
        });
    });

    // --- Timer Button Actions ---
    if (btnStart) {
        btnStart.addEventListener('click', (e) => {
            e.stopPropagation();
            window.soundManager.initAudioContext();
            const { total } = clampInputs();
            if (total <= 0) return;
            window.focusTimer.start(true); // with 3-second countdown
        });
    }

    if (btnResume) {
        btnResume.addEventListener('click', (e) => {
            e.stopPropagation();
            window.soundManager.initAudioContext();
            window.focusTimer.start(false); // resume immediately without countdown
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
        // Toggle input enabled/disabled
        const isInteractive = (state === 'IDLE' || state === 'FINISHED');
        inM.disabled = !isInteractive;
        inS.disabled = !isInteractive;

        // Button visibility
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
            scheduleAutoHide();
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

    // --- UI Auto-Hide / Show (Desktop & Mobile Touch Safe) ---
    function showUI() {
        isUiHidden = false;
        if (topBar) topBar.classList.remove('ui-faded');
        if (controlsWrapper) controlsWrapper.classList.remove('ui-faded');
        if (btnRestoreUi) btnRestoreUi.classList.remove('visible');
        clearTimeout(mouseInactivityTimeout);
    }

    function hideUI() {
        if (window.focusTimer.state !== 'RUNNING' && window.focusTimer.state !== 'COUNTDOWN') return;
        isUiHidden = true;
        if (topBar) topBar.classList.add('ui-faded');
        if (controlsWrapper) controlsWrapper.classList.add('ui-faded');
        if (btnRestoreUi) btnRestoreUi.classList.add('visible');
    }

    function scheduleAutoHide() {
        clearTimeout(mouseInactivityTimeout);
        if (window.focusTimer.state === 'RUNNING') {
            mouseInactivityTimeout = setTimeout(() => {
                hideUI();
            }, 3500);
        }
    }

    // Interaction handler for both mouse and touch
    function handleUserActivity(e) {
        // Unlock audio context on first user interaction
        window.soundManager.initAudioContext();

        // If clicking on an interactive control inside controlsWrapper, don't auto hide immediately
        showUI();
        scheduleAutoHide();
    }

    // Tap/Click anywhere on background to toggle UI visibility
    document.addEventListener('pointerdown', (e) => {
        // If clicking interactive elements, let them handle it
        if (e.target.closest('button, input, label, a, .modal-content, .preset-chip')) {
            return;
        }

        if (window.focusTimer.state === 'RUNNING') {
            if (isUiHidden) {
                showUI();
                scheduleAutoHide();
            } else {
                hideUI();
            }
        }
    });

    document.addEventListener('mousemove', handleUserActivity);
    document.addEventListener('keydown', handleUserActivity);

    if (btnRestoreUi) {
        btnRestoreUi.addEventListener('click', (e) => {
            e.stopPropagation();
            showUI();
            scheduleAutoHide();
        });
    }

    // --- Fullscreen Manager (with iOS and Cross-Browser Graceful Handling) ---
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

    if (btnFullscreen) {
        btnFullscreen.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFullscreen();
        });
    }

    // Update fullscreen icon on change
    function updateFullscreenIcon() {
        const active = isFullscreenActive();
        if (btnFullscreen) {
            btnFullscreen.setAttribute('title', active ? 'Esci da Schermo Intero (F)' : 'Schermo Intero (F)');
        }
    }

    document.addEventListener('fullscreenchange', updateFullscreenIcon);
    document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);

    // --- Shortcuts Help Modal ---
    function openHelp() {
        if (helpModal) helpModal.classList.add('open');
    }

    function closeHelp() {
        if (helpModal) helpModal.classList.remove('open');
    }

    if (btnHelp) {
        btnHelp.addEventListener('click', (e) => {
            e.stopPropagation();
            openHelp();
        });
    }

    if (btnCloseModal) {
        btnCloseModal.addEventListener('click', (e) => {
            e.stopPropagation();
            closeHelp();
        });
    }

    if (helpModal) {
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                closeHelp();
            }
        });
    }

    // --- Global Keyboard Shortcuts ---
    document.addEventListener('keydown', (e) => {
        // If focusing inside an input field, only respond to Escape or Enter
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
            if (e.key === 'Escape' || e.key === 'Enter') {
                document.activeElement.blur();
            }
            return;
        }

        switch (e.code) {
            case 'Space':
                e.preventDefault();
                if (window.focusTimer.state === 'RUNNING') {
                    window.focusTimer.pause();
                } else if (window.focusTimer.state === 'PAUSED') {
                    window.focusTimer.start(false);
                } else {
                    window.focusTimer.start(true);
                }
                break;
            case 'KeyR':
                e.preventDefault();
                window.focusTimer.reset();
                break;
            case 'KeyF':
                e.preventDefault();
                toggleFullscreen();
                break;
            case 'KeyM':
                e.preventDefault();
                if (soundToggle) {
                    soundToggle.checked = !soundToggle.checked;
                    window.soundManager.setEnabled(soundToggle.checked);
                }
                break;
            case 'Escape':
                closeHelp();
                break;
            case 'Slash':
                if (e.shiftKey) { // '?' key
                    e.preventDefault();
                    openHelp();
                }
                break;
        }
    });

    // --- Initial Setup ---
    syncTimerFromInputs();
});
