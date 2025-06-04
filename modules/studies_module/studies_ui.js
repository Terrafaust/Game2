// game/js/modules/studies_module/studies_ui.js

/**
 * @fileoverview User Interface (UI) logic for the Studies module.
 * This file is responsible for rendering the Studies tab content,
 * displaying producers, their costs, owned counts, and handling purchase button clicks.
 */

/**
 * StudiesUI object handles the rendering and interaction of the Studies module's UI.
 */
const StudiesUI = (function() {
    // Private references to core engine services and module components.
    let _coreUIManager;
    let _studiesLogic;
    let _studiesData;
    let _studiesState; // Although logic exposes it, direct access for UI is fine.
    let _decimalUtility;
    let _loggingSystem;

    // Element references for performance.
    let _mainContentElement;

    /**
     * Initializes the StudiesUI module with necessary dependencies.
     * This method is called once during game startup.
     *
     * @param {Object} coreUIManager The CoreUIManager instance.
     * @param {Object} studiesLogic The StudiesLogic instance.
     * @param {Object} studiesData The static data for the Studies module.
     * @param {Object} studiesState The dynamic state for the Studies module.
     * @param {Object} decimalUtility The DecimalUtility instance.
     * @param {Object} loggingSystem The LoggingSystem instance.
     */
    function init(coreUIManager, studiesLogic, studiesData, studiesState, decimalUtility, loggingSystem) {
        _coreUIManager = coreUIManager;
        _studiesLogic = studiesLogic;
        _studiesData = studiesData;
        _studiesState = studiesState;
        _decimalUtility = decimalUtility;
        _loggingSystem = loggingSystem;

        _loggingSystem.log('StudiesUI initialized.', 'StudiesUI');

        // Get reference to the main content area where this module's UI will be rendered.
        _mainContentElement = document.getElementById('main-content');
        if (!_mainContentElement) {
            _loggingSystem.error('Main content element #main-content not found!', 'StudiesUI');
        }
    }

    /**
     * Renders the main content for the Studies module.
     * This function is called by CoreUIManager when the Studies tab is active.
     */
    function render() {
        if (!_mainContentElement) {
            return;
        }

        // Clear previous content.
        _mainContentElement.innerHTML = '';

        // Create a container for the Studies module content.
        const studiesContainer = document.createElement('div');
        studiesContainer.id = 'studies-module-content';
        studiesContainer.className = 'space-y-6'; // Tailwind for spacing

        // Add a title for the Studies section.
        const title = document.createElement('h2');
        title.className = 'text-2xl font-bold text-primary mb-4';
        title.textContent = 'Studies';
        studiesContainer.appendChild(title);

        // Create a section for producers.
        const producersSection = document.createElement('div');
        producersSection.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'; // Responsive grid for producers
        studiesContainer.appendChild(producersSection);

        // Iterate through all producers defined in StudiesData and render them.
        for (const producerKey in _studiesData.producers) {
            if (Object.prototype.hasOwnProperty.call(_studiesData.producers, producerKey)) {
                const producerDef = _studiesData.producers[producerKey];
                const producerId = producerDef.id;

                // Check if the producer is unlocked.
                const isUnlocked = _studiesLogic.isProducerUnlocked(producerId);

                // Create a card for each producer.
                const producerCard = document.createElement('div');
                producerCard.id = `producer-card-${producerId}`;
                producerCard.className = 'bg-surface p-4 rounded-xl shadow-md flex flex-col justify-between'; // Card styling

                if (!isUnlocked) {
                    // If locked, apply a grayscale effect and display unlock info.
                    producerCard.classList.add('opacity-50', 'cursor-not-allowed');
                    producerCard.setAttribute('data-tooltip-id', `tooltip-locked-${producerId}`);
                    producerCard.setAttribute('data-tooltip-content', producerDef.lockedTooltip);
                }

                const producerName = document.createElement('h3');
                producerName.className = 'text-xl font-semibold text-secondary mb-2';
                producerName.textContent = producerDef.name;
                producerCard.appendChild(producerName);

                const producerDescription = document.createElement('p');
                producerDescription.className = 'text-textSecondary text-sm mb-3';
                producerDescription.textContent = producerDef.description;
                producerCard.appendChild(producerDescription);

                const ownedCount = _studiesState.getProducerCount(producerId);
                const ownedText = document.createElement('p');
                ownedText.id = `producer-${producerId}-owned`;
                ownedText.className = 'text-textPrimary text-lg font-medium mb-2';
                ownedText.textContent = `Owned: ${ownedCount}`;
                producerCard.appendChild(ownedText);

                // Only show cost and purchase button if unlocked.
                if (isUnlocked) {
                    const currentCost = _studiesLogic.calculateProducerCost(producerId);
                    const costText = document.createElement('p');
                    costText.id = `producer-${producerId}-cost`;
                    costText.className = 'text-textPrimary text-sm mb-3';
                    costText.textContent = `Cost: ${_decimalUtility.format(currentCost)} ${producerDef.costResource === 'studyPoints' ? 'SP' : producerDef.costResource}`;
                    producerCard.appendChild(costText);

                    // Display production information.
                    const productionInfo = document.createElement('p');
                    productionInfo.className = 'text-textPrimary text-sm mb-3';
                    const baseProductionAmount = _decimalUtility.new(producerDef.production.amount);
                    const totalProductionAmount = baseProductionAmount.times(ownedCount); // This will be updated by logic
                    productionInfo.innerHTML = `Unit Prod: ${_decimalUtility.format(baseProductionAmount)} ${producerDef.production.resourceId}/s<br>Total Prod: <span id="producer-${producerId}-total-production">${_decimalUtility.format(totalProductionAmount)}</span> ${producerDef.production.resourceId}/s`;
                    producerCard.appendChild(productionInfo);


                    const buyButton = document.createElement('button');
                    buyButton.id = `buy-${producerId}-button`;
                    buyButton.className = 'game-button w-full mt-auto'; // Tailwind for full width and margin-top
                    buyButton.textContent = `Buy 1 ${producerDef.name}`;
                    buyButton.onclick = () => handleBuyProducer(producerId);
                    producerCard.appendChild(buyButton);

                    // Update button state based on affordability.
                    updateProducerButtonState(producerId);
                } else {
                    // Display locked message instead of purchase button
                    const lockedMessage = document.createElement('p');
                    lockedMessage.className = 'text-red-400 text-center italic mt-auto';
                    lockedMessage.textContent = 'Locked';
                    producerCard.appendChild(lockedMessage);
                }

                producersSection.appendChild(producerCard);
            }
        }

        _mainContentElement.appendChild(studiesContainer);

        // After rendering, ensure tooltips are initialized for new elements.
        _coreUIManager.initializeTooltips();
    }

    /**
     * Handles the click event for buying a producer.
     * @param {string} producerId The ID of the producer to buy.
     */
    function handleBuyProducer(producerId) {
        const success = _studiesLogic.purchaseProducer(producerId);
        if (success) {
            _loggingSystem.log(`Successfully bought ${producerId}.`, 'StudiesUI');
            // Re-render the Studies content to update all values.
            // This is a simple approach; for performance, a more granular update
            // would target specific elements. For now, full re-render is acceptable.
            render();
            // Also force an update of the resource bar, as SP amounts change.
            _coreUIManager.updateResourceBar();
        } else {
            _loggingSystem.warn(`Failed to buy ${producerId}.`, 'StudiesUI');
            // The logic already logs specific reasons (not enough resources, locked).
            // No need for a separate user-facing message here unless desired.
        }
    }

    /**
     * Updates the UI elements for a specific producer, including cost, owned count,
     * total production, and button enablement.
     * This function is called frequently (e.g., by CoreUIManager's update loop)
     * to keep the UI in sync with game state changes.
     *
     * @param {string} producerId The ID of the producer to update.
     */
    function updateProducerUI(producerId) {
        const producerDef = _studiesData.producers[producerId];
        if (!producerDef) return;

        const isUnlocked = _studiesLogic.isProducerUnlocked(producerId);
        const producerCard = document.getElementById(`producer-card-${producerId}`);

        if (!producerCard) {
            // Producer card might not be rendered yet if the tab isn't active.
            // Or if it was just unlocked and needs a full re-render.
            // If it's a newly unlocked producer, a full render() will create its card.
            // For now, we'll just return.
            return;
        }

        // If the producer was just unlocked, we need to re-render the entire section
        // to show its full UI (cost, button, etc.).
        if (isUnlocked && producerCard.classList.contains('opacity-50')) {
            render(); // Full re-render to transition from locked to unlocked view
            return;
        }

        // If it's unlocked, update its dynamic elements.
        if (isUnlocked) {
            const ownedCount = _studiesState.getProducerCount(producerId);
            const currentCost = _studiesLogic.calculateProducerCost(producerId);
            const totalProduction = _studiesLogic.calculateTotalProducerProduction(producerId);

            const ownedText = document.getElementById(`producer-${producerId}-owned`);
            if (ownedText) {
                ownedText.textContent = `Owned: ${ownedCount}`;
            }

            const costText = document.getElementById(`producer-${producerId}-cost`);
            if (costText) {
                costText.textContent = `Cost: ${_decimalUtility.format(currentCost)} ${producerDef.costResource === 'studyPoints' ? 'SP' : producerDef.costResource}`;
            }

            const totalProductionSpan = document.getElementById(`producer-${producerId}-total-production`);
            if (totalProductionSpan) {
                totalProductionSpan.textContent = _decimalUtility.format(totalProduction);
            }

            updateProducerButtonState(producerId);
        }
    }

    /**
     * Updates the enabled/disabled state of a producer's buy button.
     * @param {string} producerId The ID of the producer.
     */
    function updateProducerButtonState(producerId) {
        const buyButton = document.getElementById(`buy-${producerId}-button`);
        if (buyButton) {
            const producerDef = _studiesData.producers[producerId];
            const currentCost = _studiesLogic.calculateProducerCost(producerId);
            const costResource = producerDef.costResource;

            if (_coreResourceManager.canAfford(costResource, currentCost)) {
                buyButton.disabled = false;
                buyButton.classList.remove('bg-textSecondary', 'cursor-not-allowed');
                buyButton.classList.add('bg-primary', 'hover:bg-primary-lighter');
            } else {
                buyButton.disabled = true;
                buyButton.classList.remove('bg-primary', 'hover:bg-primary-lighter');
                buyButton.classList.add('bg-textSecondary', 'cursor-not-allowed');
            }
        }
    }

    /**
     * The main update function for the Studies UI, called by CoreUIManager's update loop.
     * This function iterates through all producers and updates their UI elements.
     */
    function update() {
        // Only update UI if the Studies tab is currently active.
        if (!_coreUIManager.isTabActive('studies-tab')) {
            return;
        }

        for (const producerKey in _studiesData.producers) {
            if (Object.prototype.hasOwnProperty.call(_studiesData.producers, producerKey)) {
                updateProducerUI(_studiesData.producers[producerKey].id);
            }
        }
    }

    // Public API for the StudiesUI module.
    return {
        init: init,
        render: render,
        update: update // Expose the update function for CoreUIManager
    };
})();

// Make StudiesUI globally accessible.
if (typeof window !== 'undefined') {
    window.StudiesUI = StudiesUI;
}
