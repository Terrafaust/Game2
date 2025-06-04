// game/js/modules/studies_module/studies_state.js

/**
 * @fileoverview Manages the dynamic state for the Studies module.
 * This includes the counts of owned producers and any other module-specific
 * dynamic data that needs to be saved and loaded.
 */

/**
 * StudiesState object manages the current state of the Studies module.
 * It provides methods to get the current state for saving and to load a saved state.
 */
const StudiesState = (function() {
    // Private state variables for the Studies module.
    // This object will hold the counts of each producer owned by the player.
    // Keys will be producer IDs (e.g., 'student', 'classroom'), values will be numbers.
    let _producerCounts = {};

    /**
     * Initializes the state or resets it to default values.
     * This is called when the game starts or when a new game is initiated.
     */
    function initializeState() {
        _producerCounts = {}; // Reset all producer counts to zero.
        // Optionally, initialize specific producers to 0 if they must always exist in state
        // for easier access, though dynamic access based on data is generally preferred.
        // For example: _producerCounts.student = 0;
    }

    // Initialize state when the script loads.
    initializeState();

    /**
     * Returns the current state of the Studies module for saving.
     * All numerical values (producer counts) are converted to strings to ensure
     * compatibility with Decimal.js serialization if they were Decimal objects.
     * However, since producer counts are typically integers, they can remain numbers
     * unless they are expected to grow beyond Number.MAX_SAFE_INTEGER, which is unlikely
     * for counts of individual buildings. If they were Decimal objects, they'd be stringified here.
     *
     * @returns {Object} A serializable object representing the current state.
     */
    function getState() {
        // Return a deep copy to prevent external modification of the internal state.
        return {
            producerCounts: { ..._producerCounts }
        };
    }

    /**
     * Loads a previously saved state into the Studies module.
     * Parses any stringified numerical values back into their appropriate types (e.g., Decimal objects).
     *
     * @param {Object} savedState The state object loaded from the save file.
     * @param {Object} decimalUtility Reference to the decimalUtility for parsing.
     * @param {Object} loggingSystem Reference to the loggingSystem for debugging.
     */
    function loadState(savedState, decimalUtility, loggingSystem) {
        if (!savedState) {
            loggingSystem.warn('No saved state provided for Studies module. Initializing default state.', 'StudiesState');
            initializeState();
            return;
        }

        // Load producer counts. Ensure they are numbers.
        if (savedState.producerCounts) {
            _producerCounts = {}; // Clear existing counts
            for (const producerId in savedState.producerCounts) {
                if (Object.prototype.hasOwnProperty.call(savedState.producerCounts, producerId)) {
                    // Producer counts are typically integers, not Decimals, so direct assignment is fine.
                    // If they were Decimals, we'd use decimalUtility.new(savedState.producerCounts[producerId]).
                    _producerCounts[producerId] = parseInt(savedState.producerCounts[producerId], 10) || 0;
                }
            }
            loggingSystem.log('Studies producer counts loaded successfully.', 'StudiesState');
        } else {
            loggingSystem.warn('No producerCounts found in saved state for Studies module. Initializing default.', 'StudiesState');
            initializeState();
        }
    }

    /**
     * Increments the count of a specific producer.
     * @param {string} producerId The ID of the producer to increment.
     * @param {number} [amount=1] The amount to increment by. Defaults to 1.
     */
    function incrementProducerCount(producerId, amount = 1) {
        if (!_producerCounts[producerId]) {
            _producerCounts[producerId] = 0;
        }
        _producerCounts[producerId] += amount;
    }

    /**
     * Gets the current count of a specific producer.
     * @param {string} producerId The ID of the producer to get the count for.
     * @returns {number} The current count of the producer, or 0 if not found.
     */
    function getProducerCount(producerId) {
        return _producerCounts[producerId] || 0;
    }

    /**
     * Sets the count of a specific producer.
     * @param {string} producerId The ID of the producer to set the count for.
     * @param {number} count The new count.
     */
    function setProducerCount(producerId, count) {
        _producerCounts[producerId] = count;
    }

    /**
     * Resets the state of the Studies module for an Ascension.
     * This will clear all producer counts.
     */
    function resetStateForAscension() {
        loggingSystem.log('Studies module state resetting for Ascension.', 'StudiesState');
        initializeState();
    }

    // Public API for the StudiesState module.
    return {
        getState: getState,
        loadState: loadState,
        incrementProducerCount: incrementProducerCount,
        getProducerCount: getProducerCount,
        setProducerCount: setProducerCount,
        resetStateForAscension: resetStateForAscension,
        // Expose initializeState for explicit resets if needed (e.g., hard reset).
        initializeState: initializeState
    };
})();

// Make StudiesState globally accessible.
if (typeof window !== 'undefined') {
    window.StudiesState = StudiesState;
}
