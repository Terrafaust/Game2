// js/core/coreGameStateManager.js (v2.1 - Ref Fix)

/**
 * @file coreGameStateManager.js
 * @description Manages the global game state.
 * v2.1: Removed erroneous coreSystemsRef check from setGlobalFlag.
 */

import { loggingSystem } from './loggingSystem.js';
import { decimalUtility } from './decimalUtility.js'; 

let gameState = {
    gameVersion: "0.1.0", 
    lastSaveTime: null,
    globalFlags: {},
    moduleStates: {},
};

const coreGameStateManager = {
    initialize(initialState) {
        if (initialState) {
            this.setFullGameState(initialState);
            loggingSystem.info("CoreGameStateManager", "Initialized with provided state.", initialState);
        } else {
            // Ensure default structure if no initial state provided
            gameState.gameVersion = gameState.gameVersion || "0.1.0";
            gameState.lastSaveTime = gameState.lastSaveTime || null;
            gameState.globalFlags = gameState.globalFlags || {};
            gameState.moduleStates = gameState.moduleStates || {};
            loggingSystem.info("CoreGameStateManager", "Initialized with default state.", JSON.parse(JSON.stringify(gameState)));
        }
    },

    getGameState() {
        // Ensure a deep copy is returned, especially if gameState might contain nested objects.
        // JSON parse/stringify is okay for POJOs but will lose Decimal instances.
        // The saveLoadSystem handles Decimal serialization separately.
        // For internal use, this might be fine, but be cautious.
        return JSON.parse(JSON.stringify(gameState));
    },

    setFullGameState(newState) {
        if (!newState) {
            loggingSystem.error("CoreGameStateManager", "setFullGameState called with null or undefined state.");
            return;
        }
        // Directly assign. Consider a deep merge if partial updates are possible.
        gameState = newState;
        // Ensure essential properties exist after assignment from potentially older save data
        gameState.globalFlags = newState.globalFlags || {};
        gameState.moduleStates = newState.moduleStates || {};
        gameState.gameVersion = newState.gameVersion || "0.0.0"; // Default if missing from save
        gameState.lastSaveTime = newState.lastSaveTime || null;

        // Revive Decimals in module states if they were stringified
        // This is a generic example; specific modules should handle their own state revival more robustly if needed.
        for (const moduleId in gameState.moduleStates) {
            const moduleStateData = gameState.moduleStates[moduleId];
            if (moduleId === 'studies' && moduleStateData && moduleStateData.ownedProducers) {
                for (const producerId in moduleStateData.ownedProducers) {
                    if (typeof moduleStateData.ownedProducers[producerId] !== 'string') {
                        // This implies it might be a number or an actual Decimal from an older save style
                        // Convert to string to match current practice where logic converts string to Decimal.
                        moduleStateData.ownedProducers[producerId] = decimalUtility.new(moduleStateData.ownedProducers[producerId]).toString();
                    }
                }
            }
            // Add similar logic for other modules if their states contain Decimals
        }
        loggingSystem.info("CoreGameStateManager", "Full game state has been set.");
    },

    setGlobalFlag(flagName, value) {
        if (typeof flagName !== 'string' || flagName.trim() === '') {
            loggingSystem.warn("CoreGameStateManager", "setGlobalFlag: flagName must be a non-empty string.");
            return;
        }
        gameState.globalFlags[flagName] = value;
        loggingSystem.debug("CoreGameStateManager", `Global flag '${flagName}' set to:`, value);
        
        // Responsibility for calling coreUIManager.renderMenu() is now fully on the
        // module logic that sets a flag which should trigger a menu update.
        // Example: market_logic.js, skills_logic.js, etc. already do this.
    },

    getGlobalFlag(flagName, defaultValue = undefined) {
        if (Object.prototype.hasOwnProperty.call(gameState.globalFlags, flagName)) {
            return gameState.globalFlags[flagName];
        }
        return defaultValue;
    },

    getAllGlobalFlags() {
        return { ...gameState.globalFlags }; // Return a shallow copy
    },

    clearAllGlobalFlags() {
        gameState.globalFlags = {};
        loggingSystem.info("CoreGameStateManager", "All global flags cleared.");
    },

    setModuleState(moduleId, moduleStateData) {
        if (typeof moduleId !== 'string' || moduleId.trim() === '') {
            loggingSystem.warn("CoreGameStateManager", "setModuleState: moduleId must be a non-empty string.");
            return;
        }
        // Store a shallow copy. If moduleStateData contains nested objects that modules might mutate,
        // a deep copy or more careful state management within modules would be needed.
        gameState.moduleStates[moduleId] = { ...moduleStateData }; 
        loggingSystem.debug("CoreGameStateManager", `State for module '${moduleId}' updated.`);
    },

    getModuleState(moduleId) {
        if (Object.prototype.hasOwnProperty.call(gameState.moduleStates, moduleId)) {
            try {
                // Return a deep copy to prevent direct modification of internal state.
                return JSON.parse(JSON.stringify(gameState.moduleStates[moduleId]));
            } catch (e) {
                loggingSystem.error("CoreGameStateManager", `Error deep copying state for module ${moduleId}`, e);
                return undefined; 
            }
        }
        return undefined;
    },

    getAllModuleStates() {
         try {
            return JSON.parse(JSON.stringify(gameState.moduleStates));
        } catch (e) {
            loggingSystem.error("CoreGameStateManager", `Error deep copying all module states`, e);
            return {};
        }
    },

    getGameVersion() {
        return gameState.gameVersion;
    },

    setGameVersion(version) {
        gameState.gameVersion = version;
        loggingSystem.info("CoreGameStateManager", `Game version set to: ${version}`);
    },

    updateLastSaveTime(timestamp) {
        gameState.lastSaveTime = timestamp;
    },

    getLastSaveTime() {
        return gameState.lastSaveTime;
    },

    update(deltaTime) {
        // No time-dependent logic here currently
    },

    resetState() {
        const defaultVersion = "0.1.0"; // Base version, main.js will set the correct running version.
        gameState = {
            gameVersion: defaultVersion,
            lastSaveTime: null,
            globalFlags: {}, // All flags are cleared by re-assigning this. clearAllGlobalFlags() is an explicit call too.
            moduleStates: {},
        };
        loggingSystem.info("CoreGameStateManager", "Game state (excluding flags explicitly) has been reset to default structure.");
        // Note: clearAllGlobalFlags() should be called by saveLoadSystem.resetGameData() to ensure flags are truly empty.
    }
};

// Initialize on load - ensure this doesn't conflict with main.js initialization sequence
// If main.js loads a save, it will overwrite this. If not, these defaults are used.
// coreGameStateManager.initialize(); // Typically called by main.js to ensure proper sequence with save/load.
export { coreGameStateManager };
