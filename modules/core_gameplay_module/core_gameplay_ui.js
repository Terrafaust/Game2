// js/modules/core_gameplay_module/core_gameplay_ui.js (v2.1 - Click Gain Display)

/**
 * @file core_gameplay_ui.js
 * @description Handles the UI rendering and interactions for the Core Gameplay module.
 * v2.1: Adds display for SP gained per click.
 */

import { staticModuleData } from './core_gameplay_data.js';
import { moduleState } from './core_gameplay_state.js';

let coreSystemsRef = null;
let moduleLogicRef = null;
let parentElementCache = null;

export const ui = {
    initialize(coreSystems, initialStateRef, logicRef) {
        coreSystemsRef = coreSystems;
        moduleLogicRef = logicRef;
        coreSystemsRef.loggingSystem.debug("CoreGameplayUI", "UI initialized (v2.1).");
    },

    renderMainContent(parentElement) {
        if (!coreSystemsRef || !moduleLogicRef) {
            parentElement.innerHTML = '<p class="text-red-500">Core Gameplay UI not properly initialized.</p>';
            return;
        }
        parentElementCache = parentElement;
        parentElement.innerHTML = '';

        const { coreUIManager, decimalUtility } = coreSystemsRef;

        const container = document.createElement('div');
        container.className = 'p-4 space-y-6 flex flex-col items-center'; // Centered content

        const title = document.createElement('h2');
        title.className = 'text-2xl font-semibold text-primary mb-4';
        title.textContent = 'Manual Study Area';
        container.appendChild(title);

        const description = document.createElement('p');
        description.className = 'text-textSecondary';
        description.textContent = 'Click the button below to gain Study Points. This is the beginning of your academic journey!';
        container.appendChild(description);
        
        // --- MODIFICATION: Added Tip ---
        const tipBox = document.createElement('div');
        tipBox.className = 'mt-4 p-3 bg-surface rounded-lg border border-primary/50';
        const tipText = document.createElement('p');
        tipText.className = 'text-sm text-accentOne italic text-center';
        tipText.textContent = '"Get 10 study points to unlock Studies"';
        tipBox.appendChild(tipText);
        container.appendChild(tipBox);
        // --- END MODIFICATION ---

        // --- NEW: Wrapper for button and gain display ---
        const buttonWrapper = document.createElement('div');
        buttonWrapper.className = 'flex flex-col items-center w-full max-w-xs space-y-2 mt-4';

        const studyButton = coreUIManager.createButton(
            staticModuleData.ui.mainButtonText,
            () => {
                const result = moduleLogicRef.performManualStudy();
                if (result) {
                    this.updateDynamicElements();
                    studyButton.classList.add('animate-pulse-once');
                    setTimeout(() => studyButton.classList.remove('animate-pulse-once'), 500);
                    coreUIManager.showNotification(`+${decimalUtility.format(result.amountGained, 2)} Study Points!`, 'success', 1500);
                }
            },
            ['bg-secondary', 'hover:bg-pink-700', 'text-white', 'py-3', 'px-6', 'text-lg', 'w-full'],
            'manual-study-button'
        );
        buttonWrapper.appendChild(studyButton);
        
        // --- NEW: Click Gain Display Element ---
        const clickGainDisplay = document.createElement('p');
        clickGainDisplay.id = 'core-gameplay-gain-display';
        clickGainDisplay.className = 'text-sm text-textSecondary h-5'; // Set height to prevent layout shift
        buttonWrapper.appendChild(clickGainDisplay);
        
        container.appendChild(buttonWrapper);

        if (!document.head.querySelector('#core-gameplay-styles')) {
            const style = document.createElement('style');
            style.id = 'core-gameplay-styles';
            style.textContent = `
                @keyframes pulse-once { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
                .animate-pulse-once { animation: pulse-once 0.5s ease-out; }`;
            document.head.appendChild(style);
        }

        const clicksDisplay = document.createElement('p');
        clicksDisplay.id = 'core-gameplay-clicks-display';
        clicksDisplay.className = 'text-sm text-textSecondary mt-4';
        container.appendChild(clicksDisplay);

        parentElement.appendChild(container);
        this.updateDynamicElements();
    },

    updateDynamicElements() {
        if (!parentElementCache) return;
        const { decimalUtility } = coreSystemsRef;

        const clicksDisplay = parentElementCache.querySelector('#core-gameplay-clicks-display');
        if (clicksDisplay) {
            clicksDisplay.textContent = `Total manual study sessions: ${moduleLogicRef.getTotalClicks()}`;
        }
        
        // --- NEW: Update the click gain display ---
        const clickGainDisplay = parentElementCache.querySelector('#core-gameplay-gain-display');
        if(clickGainDisplay) {
            const gainAmount = moduleLogicRef.calculateManualStudyGain();
            clickGainDisplay.textContent = `(Gain ${decimalUtility.format(gainAmount, 2)} SP)`;
        }
    },
    
    onShow() {
        coreSystemsRef.loggingSystem.debug("CoreGameplayUI", "Core Gameplay tab shown.");
        if (parentElementCache) {
            this.renderMainContent(parentElementCache);
        }
    },

    onHide() {
        coreSystemsRef.loggingSystem.debug("CoreGameplayUI", "Core Gameplay tab hidden.");
    }
};
