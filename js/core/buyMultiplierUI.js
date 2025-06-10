// js/core/buyMultiplierUI.js (v1.0 - Centralized UI)

/**
 * @file buyMultiplierUI.js
 * @description A dedicated UI helper for rendering the global buy multiplier controls.
 * This ensures consistency across different modules that use it.
 */

let coreSystemsRef = null;

// Private function to update button styles based on the current multiplier
function _updateMultiplierButtonStyles(wrapper) {
    if (!wrapper || !coreSystemsRef) return;
    const { buyMultiplierManager } = coreSystemsRef;
    const currentMultiplier = buyMultiplierManager.getMultiplier();
    const buttons = wrapper.querySelectorAll('button');
    
    buttons.forEach(button => {
        // Extract the multiplier value from the button's ID
        const buttonId = button.id;
        const multiplierValue = parseInt(buttonId.substring(buttonId.lastIndexOf('-') + 1), 10);

        // Apply distinct styles for the active vs. inactive buttons
        if (multiplierValue === currentMultiplier) {
            button.classList.add('bg-accentOne', 'text-white', 'opacity-100', 'shadow-lg');
            button.classList.remove('opacity-60', 'bg-primary', 'hover:bg-primary-dark');
        } else {
            button.classList.remove('bg-accentOne', 'text-white', 'shadow-lg');
            button.classList.add('opacity-60', 'bg-primary', 'hover:bg-primary-dark');
        }
    });
}

export const buyMultiplierUI = {
    /**
     * Initializes the UI helper with a reference to core systems.
     * @param {object} coreSystems - The core systems object.
     */
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("BuyMultiplierUI", "Centralized Buy Multiplier UI helper initialized (v1.0).");
    },

    /**
     * Creates the buy multiplier control element.
     * This function can be called by any module that needs to display these controls.
     * @returns {HTMLElement} The fully constructed div element containing the multiplier buttons.
     */
    createBuyMultiplierControls() {
        if (!coreSystemsRef) {
            console.error("BuyMultiplierUI is not initialized.");
            return document.createElement('div');
        }

        const { coreUIManager, buyMultiplierManager, loggingSystem } = coreSystemsRef;
        const controlWrapper = document.createElement('div');
        controlWrapper.className = 'flex justify-center items-center space-x-2 my-4 p-2 bg-surface-dark rounded-full shadow-inner';
        
        // Fetch available multipliers and create a button for each one
        buyMultiplierManager.getAvailableMultipliers().forEach(multiplier => {
            const button = coreUIManager.createButton(
                buyMultiplierManager.getMultiplierLabel(multiplier),
                () => {
                    buyMultiplierManager.setMultiplier(multiplier);
                    loggingSystem.debug("BuyMultiplierUI", `Multiplier button clicked, new value: ${multiplier}`);
                },
                ['px-4', 'py-1', 'text-sm', 'font-semibold', 'rounded-full', 'transition-all', 'duration-200'],
                `buy-multiplier-btn-${multiplier}` // A unique and descriptive ID
            );
            controlWrapper.appendChild(button);
        });
        
        // Set the initial styles and add an event listener to update them whenever the multiplier changes
        _updateMultiplierButtonStyles(controlWrapper);
        document.addEventListener('buyMultiplierChanged', () => _updateMultiplierButtonStyles(controlWrapper));

        return controlWrapper;
    }
};
