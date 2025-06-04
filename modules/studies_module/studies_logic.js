// game/js/modules/studies_module/studies_logic.js

/**
 * @fileoverview Business logic for the Studies module.
 * This file handles calculations for producer costs, production rates,
 * purchase validation, and global unlock conditions.
 */

/**
 * StudiesLogic object encapsulates the core game logic for the Studies module.
 */
const StudiesLogic = (function() {
    // Private references to core engine services and module components.
    let _coreResourceManager;
    let _coreGameStateManager;
    let _decimalUtility;
    let _studiesData;
    let _studiesState;
    let _loggingSystem;

    // Internal cache for producer metadata for quick lookups.
    const _producersMeta = {};

    /**
     * Initializes the StudiesLogic module with necessary dependencies.
     * This method is called once during game startup.
     *
     * @param {Object} coreResourceManager The CoreResourceManager instance.
     * @param {Object} coreGameStateManager The CoreGameStateManager instance.
     * @param {Object} decimalUtility The DecimalUtility instance.
     * @param {Object} studiesData The static data for the Studies module.
     * @param {Object} studiesState The dynamic state for the Studies module.
     * @param {Object} loggingSystem The LoggingSystem instance.
     */
    function init(coreResourceManager, coreGameStateManager, decimalUtility, studiesData, studiesState, loggingSystem) {
        _coreResourceManager = coreResourceManager;
        _coreGameStateManager = coreGameStateManager;
        _decimalUtility = decimalUtility;
        _studiesData = studiesData;
        _studiesState = studiesState;
        _loggingSystem = loggingSystem;

        _loggingSystem.log('StudiesLogic initialized.', 'StudiesLogic');

        // Initialize resources defined in StudiesData with CoreResourceManager.
        // This ensures 'Knowledge' is registered and can be managed globally.
        for (const resourceId in _studiesData.resources) {
            if (Object.prototype.hasOwnProperty.call(_studiesData.resources, resourceId)) {
                const resourceDef = _studiesData.resources[resourceId];
                _coreResourceManager.defineResource(resourceDef.id, resourceDef.name, _decimalUtility.new(resourceDef.initialAmount), resourceDef.displayInResourceBar);
            }
        }

        // Pre-process producer data for easier access.
        for (const producerKey in _studiesData.producers) {
            if (Object.prototype.hasOwnProperty.call(_studiesData.producers, producerKey)) {
                const producerDef = _studiesData.producers[producerKey];
                _producersMeta[producerDef.id] = {
                    key: producerKey, // Store the original key for easy lookup
                    definition: producerDef
                };
            }
        }
    }

    /**
     * Calculates the current cost of purchasing a producer.
     * Cost increases exponentially based on the base cost, cost increase factor, and owned count.
     *
     * Formula: currentCost = baseCost * (costIncreaseFactor ^ ownedCount)
     *
     * @param {string} producerId The ID of the producer.
     * @returns {Decimal} The current cost of the producer.
     */
    function calculateProducerCost(producerId) {
        const producerMeta = _producersMeta[producerId];
        if (!producerMeta) {
            _loggingSystem.error(`Producer with ID '${producerId}' not found in StudiesData.`, 'StudiesLogic');
            return _decimalUtility.new(Infinity); // Return a very large number to prevent purchase
        }

        const producerDef = producerMeta.definition;
        const ownedCount = _studiesState.getProducerCount(producerId);

        const baseCost = _decimalUtility.new(producerDef.baseCost);
        const costIncreaseFactor = _decimalUtility.new(producerDef.costIncreaseFactor);
        const currentCost = baseCost.times(costIncreaseFactor.pow(ownedCount));

        return currentCost;
    }

    /**
     * Checks if a producer is unlocked based on its definition and current game state.
     *
     * @param {string} producerId The ID of the producer to check.
     * @returns {boolean} True if the producer is unlocked, false otherwise.
     */
    function isProducerUnlocked(producerId) {
        const producerMeta = _producersMeta[producerId];
        if (!producerMeta) {
            return false;
        }

        const unlockCondition = producerMeta.definition.unlockCondition;

        // If unlockCondition is 'always', it's always unlocked.
        if (unlockCondition === 'always') {
            return true;
        }

        // Handle 'producerOwned' type unlock conditions.
        if (unlockCondition.type === 'producerOwned') {
            const requiredProducerId = unlockCondition.producerId;
            const requiredAmount = unlockCondition.amount;
            const ownedCount = _studiesState.getProducerCount(requiredProducerId);
            return ownedCount >= requiredAmount;
        }

        // Add other unlock condition types here as needed (e.g., 'resourceAmount', 'globalFlag').
        return false;
    }

    /**
     * Attempts to purchase a producer.
     * Validates cost, subtracts resources, increments producer count, and updates production.
     *
     * @param {string} producerId The ID of the producer to purchase.
     * @returns {boolean} True if the purchase was successful, false otherwise.
     */
    function purchaseProducer(producerId) {
        const producerMeta = _producersMeta[producerId];
        if (!producerMeta) {
            _loggingSystem.error(`Attempted to purchase unknown producer: ${producerId}`, 'StudiesLogic');
            return false;
        }

        const producerDef = producerMeta.definition;
        const currentCost = calculateProducerCost(producerId);
        const costResource = producerDef.costResource;

        // 1. Check if unlocked
        if (!isProducerUnlocked(producerId)) {
            _loggingSystem.warn(`Cannot purchase ${producerDef.name}: Not yet unlocked.`, 'StudiesLogic');
            return false;
        }

        // 2. Check for sufficient resources
        if (!_coreResourceManager.canAfford(costResource, currentCost)) {
            _loggingSystem.warn(`Cannot purchase ${producerDef.name}: Not enough ${costResource}. Needed: ${_decimalUtility.format(currentCost)}`, 'StudiesLogic');
            return false;
        }

        // 3. Perform purchase: subtract cost, increment count
        _coreResourceManager.subtractAmount(costResource, currentCost);
        _studiesState.incrementProducerCount(producerId);

        _loggingSystem.log(`Purchased 1 ${producerDef.name}. New count: ${_studiesState.getProducerCount(producerId)}.`, 'StudiesLogic');

        // 4. Recalculate and update total production for this producer type.
        // This is important because the production rate might be affected by upgrades/skills later.
        // For now, it's simply ownedCount * baseProduction.
        updateProducerProduction(producerId);

        // 5. Check for global unlocks after purchase.
        checkForGlobalUnlocks();

        return true;
    }

    /**
     * Calculates the total production per second for a given producer type.
     * This function should be called whenever a producer is purchased or an upgrade
     * affecting production is applied.
     *
     * @param {string} producerId The ID of the producer.
     * @returns {Decimal} The total production per second from all owned units of this producer.
     */
    function calculateTotalProducerProduction(producerId) {
        const producerMeta = _producersMeta[producerId];
        if (!producerMeta) {
            _loggingSystem.error(`Producer with ID '${producerId}' not found for production calculation.`, 'StudiesLogic');
            return _decimalUtility.new(0);
        }

        const producerDef = producerMeta.definition;
        const ownedCount = _studiesState.getProducerCount(producerId);
        const baseProductionAmount = _decimalUtility.new(producerDef.production.amount);

        // Total production = ownedCount * baseProductionAmount
        // In future streams, this will also incorporate multipliers from upgrades/skills.
        const totalProduction = baseProductionAmount.times(ownedCount);

        return totalProduction;
    }

    /**
     * Updates the CoreResourceManager with the current total production rate for a specific producer.
     * This should be called after any change in owned producer count or production multipliers.
     *
     * @param {string} producerId The ID of the producer whose production needs updating.
     */
    function updateProducerProduction(producerId) {
        const producerMeta = _producersMeta[producerId];
        if (!producerMeta) {
            return; // Should not happen if called correctly
        }

        const producerDef = producerMeta.definition;
        const totalProduction = calculateTotalProducerProduction(producerId);

        // Set the production rate for the resource produced by this producer.
        // The 'producerKey' argument allows CoreResourceManager to sum contributions from different sources.
        _coreResourceManager.setProductionPerSecond(
            producerDef.production.resourceId,
            `studies_${producerId}`, // Unique key for this module's producer
            totalProduction
        );
    }

    /**
     * Recalculates and updates production for all producers in the Studies module.
     * This is useful for initial setup or after loading a game.
     */
    function updateAllProducerProductions() {
        for (const producerId in _producersMeta) {
            if (Object.prototype.hasOwnProperty.call(_producersMeta, producerId)) {
                updateProducerProduction(producerId);
            }
        }
    }

    /**
     * Checks if any global unlock conditions defined in StudiesData are met.
     * If met, it sets the corresponding global flag in CoreGameStateManager.
     */
    function checkForGlobalUnlocks() {
        for (const flagKey in _studiesData.globalUnlockFlags) {
            if (Object.prototype.hasOwnProperty.call(_studiesData.globalUnlockFlags, flagKey)) {
                const flagDef = _studiesData.globalUnlockFlags[flagKey];
                const unlockCondition = flagDef.unlockCondition;

                // Only check if the flag isn't already set to avoid redundant operations.
                if (!_coreGameStateManager.getGlobalFlag(flagDef.flagName)) {
                    if (unlockCondition.type === 'producerOwned') {
                        const requiredProducerId = unlockCondition.producerId;
                        const requiredAmount = unlockCondition.amount;
                        const ownedCount = _studiesState.getProducerCount(requiredProducerId);

                        if (ownedCount >= requiredAmount) {
                            _coreGameStateManager.setGlobalFlag(flagDef.flagName, true);
                            _loggingSystem.log(`Global flag '${flagDef.flagName}' unlocked!`, 'StudiesLogic');
                        }
                    }
                    // Add other global unlock condition types here if needed.
                }
            }
        }
    }

    /**
     * The main update function for the Studies module, called every game tick.
     * This is where continuous logic (like checking unlocks, if not event-driven) would go.
     * For now, it primarily ensures all production rates are up-to-date.
     *
     * @param {number} deltaTime The time elapsed since the last update, in milliseconds.
     */
    function update(deltaTime) {
        // No per-tick logic for production needed here as CoreResourceManager
        // handles adding resources based on registered production rates.
        // This function can be used for other continuous checks or logic.
        // For example, if there were time-based events or decay.

        // Ensure all production rates are correctly registered/updated, especially after load.
        // This might be redundant if updateProducerProduction is called on every purchase,
        // but useful for initial setup or if external factors change production.
        // updateAllProducerProductions(); // Only call this if truly needed every tick, otherwise it's inefficient.
    }

    // Public API for the StudiesLogic module.
    return {
        init: init,
        purchaseProducer: purchaseProducer,
        calculateProducerCost: calculateProducerCost,
        isProducerUnlocked: isProducerUnlocked,
        getProducerCount: _studiesState.getProducerCount, // Expose state getter through logic
        update: update,
        updateAllProducerProductions: updateAllProducerProductions, // Expose for external calls (e.g., after loading game)
        checkForGlobalUnlocks: checkForGlobalUnlocks // Expose for external calls (e.g., after loading game)
    };
})();

// Make StudiesLogic globally accessible.
if (typeof window !== 'undefined') {
    window.StudiesLogic = StudiesLogic;
}
