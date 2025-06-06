// js/modules/core_gameplay_module/core_gameplay_ui.js

/**
 * @file core_gameplay_ui.js
 * @description Handles the UI rendering and interactions for the Core Gameplay module.
 * v2.0: Added conditional rendering for title/stats and enlarged the main study button.
 */

import { staticModuleData } from './core_gameplay_data.js';
// moduleState is populated by the manifest
import { moduleState } from './core_gameplay_state.js';

let coreSystemsRef = null;
let moduleLogicRef = null;
let parentElementCache = null; // Cache the parent element for rendering

export const ui = {
    initialize(coreSystems, initialStateRef, logicRef) {
        coreSystemsRef = coreSystems;
        moduleLogicRef = logicRef;
        coreSystemsRef.loggingSystem.debug("CoreGameplayUI", "UI initialized (v2.0).");
    },

    renderMainContent(parentElement) {
        if (!coreSystemsRef || !moduleLogicRef) {
            parentElement.innerHTML = '<p class="text-red-500">Core Gameplay UI not properly initialized.</p>';
            return;
        }
        parentElementCache = parentElement;
        parentElement.innerHTML = ''; // Clear previous content

        const { coreUIManager, decimalUtility, coreGameStateManager } = coreSystemsRef;

        const container = document.createElement('div');
        // Center content vertically and horizontally
        container.className = 'p-4 space-y-6 flex flex-col items-center justify-center h-full text-center'; 

        // --- NEW: Conditional Title ---
        // The title "Manual Study Area" will only show if the 'studies' tab is also unlocked.
        const studiesTabUnlocked = coreGameStateManager.getGlobalFlag('studiesTabPermanentlyUnlocked', false);
        if (studiesTabUnlocked) {
            const title = document.createElement('h2');
            title.id = 'core-gameplay-title';
            title.className = 'text-2xl font-semibold text-primary mb-4';
            title.textContent = 'Manual Study Area';
            container.appendChild(title);
        }

        const description = document.createElement('p');
        description.className = 'text-textSecondary max-w-md'; // Limit width for better readability
        description.textContent = 'Click the button below to gain Study Points. This is the beginning of your academic journey!';
        container.appendChild(description);

        // --- NEW: Bigger Study Button ---
        const studyButton = coreUIManager.createButton(
            staticModuleData.ui.mainButtonText,
            () => {
                const result = moduleLogicRef.performManualStudy();
                if (result) {
                    this.updateDynamicElements(); // Update click count display
                    
                    // Visual feedback for button click
                    studyButton.classList.add('animate-pulse-once');
                    setTimeout(() => studyButton.classList.remove('animate-pulse-once'), 500);

                    coreUIManager.showNotification(`+${decimalUtility.format(result.amountGained, 2)} Study Points!`, 'success', 1500);
                }
            },
            // NEW classes for a bigger, more prominent button
            ['bg-secondary', 'hover:bg-pink-700', 'text-white', 'py-4', 'px-8', 'text-xl', 'font-bold', 'w-full', 'max-w-xs', 'mt-4', 'mb-4'], 
            'manual-study-button'
        );
        studyButton.title = staticModuleData.ui.mainButtonTooltip(staticModuleData.clickAmount);
        container.appendChild(studyButton);
        
        // Ensure the pulse animation style is present
        if (!document.head.querySelector('#core-gameplay-styles')) {
            const style = document.createElement('style');
            style.id = 'core-gameplay-styles';
            style.textContent = `
                @keyframes pulse-once {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }
                .animate-pulse-once {
                    animation: pulse-once 0.5s ease-out;
                }
            `;
            document.head.appendChild(style);
        }

        // --- NEW: Conditional Click Counter ---
        // The counter element is created but will be hidden by default via CSS in updateDynamicElements
        const clicksDisplay = document.createElement('p');
        clicksDisplay.id = 'core-gameplay-clicks-display';
        clicksDisplay.className = 'text-sm text-textSecondary mt-4';
        container.appendChild(clicksDisplay);

        parentElement.appendChild(container);
        this.updateDynamicElements(); // Initial update for dynamic elements
    },

    updateDynamicElements() {
        if (!parentElementCache) return;

        const clicksDisplay = parentElementCache.querySelector('#core-gameplay-clicks-display');
        if (clicksDisplay) {
            const totalClicks = moduleLogicRef.getTotalClicks();
            // --- NEW: Hide counter until 10 clicks ---
            if (totalClicks >= 10) {
                clicksDisplay.textContent = `Total manual study sessions: ${totalClicks}`;
                clicksDisplay.classList.remove('hidden');
            } else {
                clicksDisplay.classList.add('hidden');
            }
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