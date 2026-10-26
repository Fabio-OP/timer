/**
 * FlipClock Component
 * Handles realistic 3D split-flap cards for minutes and seconds digits.
 */

class FlipClock {
    constructor() {
        this.unitIds = {
            mTens: 'm-tens',
            mUnits: 'm-units',
            sTens: 's-tens',
            sUnits: 's-units'
        };

        this.currentValues = {
            mTens: null,
            mUnits: null,
            sTens: null,
            sUnits: null
        };
    }

    /**
     * Resolves DOM element for a key safely
     */
    getUnitEl(key) {
        return document.getElementById(this.unitIds[key]);
    }

    /**
     * Updates a single flip unit
     * @param {HTMLElement} el The DOM container for the unit
     * @param {string} key Unit key in currentValues
     * @param {string} newValue New digit string
     * @param {boolean} animate Whether to trigger 3D flip animation
     */
    updateDigit(el, key, newValue, animate = true) {
        if (!el) return;

        const oldValue = this.currentValues[key];

        // If value has not changed, do nothing
        if (oldValue === newValue) {
            return;
        }

        this.currentValues[key] = newValue;

        // If animation is disabled (e.g., initial load or reset) or first render
        if (!animate || oldValue === null) {
            el.innerHTML = `
                <div class="flip-half top"><span>${newValue}</span></div>
                <div class="flip-half bottom"><span>${newValue}</span></div>
            `;
            return;
        }

        // Animated 3D flip:
        // 1. Static Top (shows new digit behind the falling flap)
        // 2. Static Bottom (shows old digit until bottom flap lands)
        // 3. Falling Top Flap (shows old digit as it rotates from 0deg to -90deg)
        // 4. Falling Bottom Flap (shows new digit as it rotates from 90deg to 0deg)
        el.innerHTML = `
            <div class="flip-half top"><span>${newValue}</span></div>
            <div class="flip-half bottom"><span>${oldValue}</span></div>
            <div class="flip-half top flip-top-anim"><span>${oldValue}</span></div>
            <div class="flip-half bottom flip-bot-anim"><span>${newValue}</span></div>
        `;

        // Clean up animation elements after completion to keep DOM light and prevent z-index clipping
        setTimeout(() => {
            if (this.currentValues[key] === newValue && el.children.length > 2) {
                el.innerHTML = `
                    <div class="flip-half top"><span>${newValue}</span></div>
                    <div class="flip-half bottom"><span>${newValue}</span></div>
                `;
            }
        }, 580);
    }

    /**
     * Sets the clock display
     * @param {number} totalSeconds 
     * @param {boolean} animate 
     */
    setTime(totalSeconds, animate = true) {
        const clampedSeconds = Math.max(0, Math.floor(totalSeconds));
        let minutes = Math.floor(clampedSeconds / 60);
        let seconds = clampedSeconds % 60;

        if (minutes > 99) minutes = 99;

        const mStr = String(minutes).padStart(2, '0');
        const sStr = String(seconds).padStart(2, '0');

        this.updateDigit(this.getUnitEl('mTens'), 'mTens', mStr[0], animate);
        this.updateDigit(this.getUnitEl('mUnits'), 'mUnits', mStr[1], animate);
        this.updateDigit(this.getUnitEl('sTens'), 'sTens', sStr[0], animate);
        this.updateDigit(this.getUnitEl('sUnits'), 'sUnits', sStr[1], animate);
    }

    /**
     * Resets internal values so next render can be forced
     */
    reset() {
        this.currentValues = {
            mTens: null,
            mUnits: null,
            sTens: null,
            sUnits: null
        };
    }
}

// Export singleton
window.flipClock = new FlipClock();
