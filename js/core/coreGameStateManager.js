// js/core/coreGameStateManager.js

/**
 * @file coreGameStateManager.js
 * @description Manages the global game state, including global flags and potentially
 * references to the states of different game modules.
 */

import { loggingSystem } from './loggingSystem.js';
import { decimalUtility } from './decimalUtility.js'; // For potential Decimal values in global state

// The main object to hold all game state.
// This will be structured to include:
// - globalFlags: For feature unlocking, etc.
// - moduleStates: An object to hold the state of each loaded module.
// - gameVersion: To track save game compatibility.
// - lastSaveTime: Timestamp of the last save.
let gameState = {
    gameVersion: "0.1.0", // Initial game version
    lastSaveTime: null,
    globalFlags: {
        // Example: 'studiesModuleUnlocked': false
    },
    moduleStates: {
        // Example: 'studies': { ownedProducers: {}, ... }
    },
    // Other global game properties can be added here
    // e.g., totalPlayTime: decimalUtility.new(0),
};

const coreGameStateManager = {
    /**
     * Initializes the game state, potentially loading from a saved state
     * or setting up defaults. For now, it just ensures the structure exists.
     * @param {object} [initialState] - Optional initial state to load.
     */
    initialize(initialState) {
        if (initialState) {
            // Deep merge or selective update might be needed for more complex states
            // For now, a simple overwrite, but ensure Decimal objects are correctly revived.
            this.setFullGameState(initialState);
            loggingSystem.info("CoreGameStateManager", "Initialized with provided state.", initialState);
        } else {
            // Ensure default structure, especially for Decimal numbers if any are top-level
            // gameState.totalPlayTime = decimalUtility.new(0); // Example
            loggingSystem.info("CoreGameStateManager", "Initialized with default state.", JSON.parse(JSON.stringify(gameState))); // Log a copy
        }
    },

    /**
     * Retrieves the entire current game state.
     * Primarily used by the save/load system.
     * @returns {object} A deep copy of the current game state.
     */
    getGameState() {
        // Return a deep copy to prevent direct modification of the internal state.
        // JSON.parse(JSON.stringify(...)) is a common way for simple objects,
        // but it DOES NOT correctly serialize/deserialize Decimal objects or other complex types.
        // The saveLoadSystem will need to handle Decimal serialization specifically.
        // For now, this is a placeholder for how saveLoadSystem gets data.
        // A more robust solution would involve custom cloning or specific serialization here.
        return JSON.parse(JSON.stringify(gameState));
    },

    /**
     * Sets the entire game state.
     * Primarily used by the save/load system when loading a game.
     * This function needs to be careful about reviving complex objects like Decimals.
     * @param {object} newState - The new game state to apply.
     */
    setFullGameState(newState) {
        if (!newState) {
            loggingSystem.error("CoreGameStateManager", "setFullGameState called with null or undefined state.");
            return;
        }

        // Simple assignment for now. A more robust system would validate the newState structure
        // and correctly revive any special object types (like Decimals) from their serialized form.
        // This will be primarily handled by the saveLoadSystem's parsing logic.
        gameState = newState;

        // Example of reviving a Decimal if it were stored at the top level:
        // if (newState.totalPlayTime) {
        //     gameState.totalPlayTime = decimalUtility.new(newState.totalPlayTime);
        // }

        // Ensure sub-objects exist if they might be missing from an older save
        gameState.globalFlags = newState.globalFlags || {};
        gameState.moduleStates = newState.moduleStates || {};
        gameState.gameVersion = newState.gameVersion || "0.0.0"; // Default if missing
        gameState.lastSaveTime = newState.lastSaveTime || null;

        // IMPORTANT: When loading module states, ensure that any Decimal values stored as strings
        // are converted back to Decimal objects. This is critical for the module logic to work correctly.
        // This is a generic approach; individual modules might have more specific revival needs.
        for (const moduleId in gameState.moduleStates) {
            const moduleStateData = gameState.moduleStates[moduleId];
            // Assuming moduleStateData is a plain object and we need to revive nested Decimals.
            // This is a shallow revival; deep revival would require recursive traversal.
            // For the 'studies' module, 'ownedProducers' values are strings.
            if (moduleId === 'studies' && moduleStateData.ownedProducers) {
                for (const producerId in moduleStateData.ownedProducers) {
                    // Ensure the value is converted back to string before passing to module state
                    // (as moduleState itself is exported and expects strings for saving)
                    moduleStateData.ownedProducers[producerId] = decimalUtility.new(moduleStateData.ownedProducers[producerId]).toString();
                }
            }
            // Add similar logic for other modules as they are developed
        }


        loggingSystem.info("CoreGameStateManager", "Full game state has been set.");
        // Potentially trigger events or updates if other systems need to react to a full state load.
    },

    /**
     * Sets a global flag.
     * @param {string} flagName - The name of the flag.
     * @param {any} value - The value to set for the flag.
     */
    setGlobalFlag(flagName, value) {
        if (typeof flagName !== 'string' || flagName.trim() === '') {
            loggingSystem.warn("CoreGameStateManager", "setGlobalFlag: flagName must be a non-empty string.");
            return;
        }
        gameState.globalFlags[flagName] = value;
        loggingSystem.debug("CoreGameStateManager", `Global flag '${flagName}' set to:`, value);
    },

    /**
     * Retrieves the value of a global flag.
     * @param {string} flagName - The name of the flag.
     * @param {any} [defaultValue=undefined] - The value to return if the flag is not set.
     * @returns {any} The value of the flag, or defaultValue if not found.
     */
    getGlobalFlag(flagName, defaultValue = undefined) {
        if (Object.prototype.hasOwnProperty.call(gameState.globalFlags, flagName)) {
            return gameState.globalFlags[flagName];
        }
        return defaultValue;
    },

    /**
     * Retrieves all global flags.
     * @returns {object} A copy of the global flags object.
     */
    getAllGlobalFlags() {
        return { ...gameState.globalFlags };
    },

    /**
     * Registers or updates the state for a specific module.
     * Module states should be plain objects that can be serialized to JSON.
     * Decimal numbers within module states must be handled (e.g., converted to string for saving,
     * and back to Decimal on loading) by the module itself or by the save/load system.
     * @param {string} moduleId - A unique identifier for the module.
     * @param {object} moduleStateData - The state object for the module.
     */
    setModuleState(moduleId, moduleStateData) {
        if (typeof moduleId !== 'string' || moduleId.trim() === '') {
            loggingSystem.warn("CoreGameStateManager", "setModuleState: moduleId must be a non-empty string.");
            return;
        }
        // Ensure moduleStateData is a shallow copy to prevent direct mutation from external refs
        gameState.moduleStates[moduleId] = { ...moduleStateData };
        loggingSystem.debug("CoreGameStateManager", `State for module '${moduleId}' updated.`);
    },

    /**
     * Retrieves the state for a specific module.
     * @param {string} moduleId - The unique identifier for the module.
     * @returns {object | undefined} The state object for the module, or undefined if not found.
     * Returns a deep copy if found.
     */
    getModuleState(moduleId) {
        if (Object.prototype.hasOwnProperty.call(gameState.moduleStates, moduleId)) {
            // Return a deep copy to prevent direct modification
            try {
                // This ensures any nested objects/arrays are also copied, but Decimals will be strings.
                // The module's manifest.initialize or onGameLoad should handle reviving Decimals.
                return JSON.parse(JSON.stringify(gameState.moduleStates[moduleId]));
            } catch (e) {
                loggingSystem.error("CoreGameStateManager", `Error deep copying state for module ${moduleId}`, e);
                return undefined; // Or handle error more gracefully
            }
        }
        return undefined;
    },

    /**
     * Retrieves the complete module states object.
     * @returns {object} A deep copy of all module states.
     */
    getAllModuleStates() {
         try {
            return JSON.parse(JSON.stringify(gameState.moduleStates));
        } catch (e) {
            loggingSystem.error("CoreGameStateManager", `Error deep copying all module states`, e);
            return {};
        }
    },

    /**
     * Gets the current game version.
     * @returns {string}
     */
    getGameVersion() {
        return gameState.gameVersion;
    },

    /**
     * Sets the game version (usually only done internally or during development/migration).
     * @param {string} version
     */
    setGameVersion(version) {
        gameState.gameVersion = version;
        loggingSystem.info("CoreGameStateManager", `Game version set to: ${version}`);
    },

    /**
     * Updates the last save time.
     * @param {number} timestamp - The timestamp of the save.
     */
    updateLastSaveTime(timestamp) {
        gameState.lastSaveTime = timestamp;
    },

    /**
     * Gets the last save time.
     * @returns {number | null}
     */
    getLastSaveTime() {
        return gameState.lastSaveTime;
    },

    /**
     * Update function, called by the game loop.
     * Can be used for any time-dependent global state logic.
     * @param {number} deltaTime - The time elapsed since the last update, in seconds.
     */
    update(deltaTime) {
        // Example: Update total play time
        // if (gameState.totalPlayTime) {
        //     gameState.totalPlayTime = decimalUtility.add(gameState.totalPlayTime, deltaTime);
        // }
        // No specific time-based logic for global state manager itself yet.
    },

    /**
     * Resets the game state to its initial default values.
     * This is a hard reset.
     */
    resetState() {
        const defaultVersion = "0.1.0"; // Keep a constant for the default version
        gameState = {
            gameVersion: defaultVersion,
            lastSaveTime: null,
            globalFlags: {},
            moduleStates: {},
            // totalPlayTime: decimalUtility.new(0), // Resetting example Decimal
        };
        loggingSystem.info("CoreGameStateManager", "Game state has been reset to default.");
        // After resetting, other systems (like resourceManager, modules) should also reset their states.
        // This function might need to trigger a broader game reset event or sequence.
    }
};

// Initialize on load (though main.js might re-initialize if loading data)
coreGameStateManager.initialize();

export { coreGameStateManager };
