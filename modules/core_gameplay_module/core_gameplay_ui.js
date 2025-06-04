// modules/core_gameplay_module/core_gameplay_ui.js

/**
 * @file core_gameplay_ui.js
 * @description Handles the UI rendering and interactions for the Core Gameplay module.
 */

import { staticModuleData } from './core_gameplay_data.js';
// moduleState will be populated by the manifest's initialize function
import { moduleState } from './core_gameplay_state.js';
// moduleLogic is passed during initialization

let coreSystemsRef = null;
let moduleLogicRef = null;
let parentElementCache = null; // Cache the parent element for rendering

export const ui = {
    /**
     * Initializes the UI component with core system references and module logic.
     * @param {object} coreSystems - References to core game systems.
     * @param {object} initialStateRef - Reference to the module's reactive state object.
     * @param {object} logicRef - Reference to the module's logic component.
     */
    initialize(coreSystems, initialStateRef, logicRef) {
        coreSystemsRef = coreSystems;
        moduleLogicRef = logicRef;
        // moduleState is already imported.
        coreSystemsRef.loggingSystem.debug("CoreGameplayUI", "UI initialized.");
    },

    /**
     * Renders the main content for the Core Gameplay module.
     * This is called by coreUIManager when the tab is activated.
     * @param {HTMLElement} parentElement - The DOM element to render content into.
     */
    renderMainContent(parentElement) {
        if (!coreSystemsRef || !moduleLogicRef) {
            parentElement.innerHTML = '<p class="text-red-500">Core Gameplay UI not properly initialized.</p>';
            return;
        }
        parentElementCache = parentElement; // Cache for potential re-renders
        parentElement.innerHTML = ''; // Clear previous content

        const { coreUIManager, decimalUtility } = coreSystemsRef;

        const container = document.createElement('div');
        container.className = 'p-4 space-y-6'; // Tailwind classes

        const title = document.createElement('h2');
        title.className = 'text-2xl font-semibold text-primary mb-4';
        title.textContent = 'Manual Study Area';
        container.appendChild(title);

        const description = document.createElement('p');
        description.className = 'text-textSecondary';
        description.textContent = 'Click the button below to gain Study Points. This is the beginning of your academic journey!';
        container.appendChild(description);

        // Study Button
        const studyButton = coreUIManager.createButton(
            staticModuleData.ui.mainButtonText,
            () => {
                const result = moduleLogicRef.performManualStudy();
                if (result) {
                    // coreUIManager.updateResourceDisplay(); // This is handled globally by gameLoop/resourceManager
                    // Update any module-specific displays if needed
                    this.updateDynamicElements(); // e.g., update click count display
                    
                    // Visual feedback for button click
                    studyButton.classList.add('animate-pulse-once'); // Needs a CSS animation
                    setTimeout(() => studyButton.classList.remove('animate-pulse-once'), 500);

                    coreUIManager.showNotification(`+${decimalUtility.format(result.amountGained, 0)} Study Points!`, 'success', 1500);
                }
            },
            ['bg-secondary', 'hover:bg-pink-700', 'text-white', 'py-3', 'px-6', 'text-lg', 'w-full', 'md:w-auto'], // Additional classes
            'manual-study-button'
        );
        studyButton.title = staticModuleData.ui.mainButtonTooltip(staticModuleData.clickAmount); // Set tooltip via title attribute for now
        container.appendChild(studyButton);
        
        // Add a simple CSS animation for the button pulse
        const style = document.createElement('style');
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


        // Display for total manual clicks (example of module-specific UI element)
        const clicksDisplay = document.createElement('p');
        clicksDisplay.id = 'core-gameplay-clicks-display';
        clicksDisplay.className = 'text-sm text-textSecondary mt-4';
        container.appendChild(clicksDisplay);

        parentElement.appendChild(container);
        this.updateDynamicElements(); // Initial update for dynamic elements like click count
    },

    /**
     * Updates dynamic parts of the module's UI, like statistics.
     */
    updateDynamicElements() {
        if (!parentElementCache) return; // Not rendered yet or parent cleared

        const clicksDisplay = parentElementCache.querySelector('#core-gameplay-clicks-display');
        if (clicksDisplay) {
            clicksDisplay.textContent = `Total manual study sessions: ${moduleLogicRef.getTotalClicks()}`;
        }
    },
    
    /**
     * Called when the module's tab is shown.
     */
    onShow() {
        coreSystemsRef.loggingSystem.debug("CoreGameplayUI", "Core Gameplay tab shown.");
        // If there's complex UI that needs refreshing or event listeners re-attached:
        if (parentElementCache) { // Re-render or update if already rendered once
            this.renderMainContent(parentElementCache);
        }
    },

    /**
     * Called when the module's tab is hidden.
     */
    onHide() {
        coreSystemsRef.loggingSystem.debug("CoreGameplayUI", "Core Gameplay tab hidden.");
        // Clean up event listeners or timers specific to this module's UI if necessary
    }
};
