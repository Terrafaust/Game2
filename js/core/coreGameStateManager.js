// js/core/coreGameStateManager.js (v2 - Clear All Flags)

/**
 * @file coreGameStateManager.js
 * @description Manages the global game state.
 * v2: Adds clearAllGlobalFlags method.
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
            loggingSystem.info("CoreGameStateManager", "Initialized with default state.", JSON.parse(JSON.stringify(gameState)));
        }
    },

    getGameState() {
        return JSON.parse(JSON.stringify(gameState));
    },

    setFullGameState(newState) {
        if (!newState) {
            loggingSystem.error("CoreGameStateManager", "setFullGameState called with null or undefined state.");
            return;
        }
        gameState = newState;
        gameState.globalFlags = newState.globalFlags || {};
        gameState.moduleStates = newState.moduleStates || {};
        gameState.gameVersion = newState.gameVersion || "0.0.0"; 
        gameState.lastSaveTime = newState.lastSaveTime || null;

        for (const moduleId in gameState.moduleStates) {
            const moduleStateData = gameState.moduleStates[moduleId];
            if (moduleId === 'studies' && moduleStateData.ownedProducers) {
                for (const producerId in moduleStateData.ownedProducers) {
                    // Ensure ownedProducers values are strings after potential Decimal revival issues in older saves
                    if (typeof moduleStateData.ownedProducers[producerId] !== 'string') {
                         moduleStateData.ownedProducers[producerId] = decimalUtility.new(moduleStateData.ownedProducers[producerId]).toString();
                    }
                }
            }
            // Add similar revival/validation for other modules if needed
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

        // If a flag change might affect menu visibility, re-render the menu
        // This is a broad check; more specific checks could be done if performance is an issue.
        if (flagName.includes("Unlocked") && coreSystemsRef && coreSystemsRef.coreUIManager) { // coreSystemsRef would need to be set globally or passed
            // To avoid direct dependency or global ref, modules that set flags affecting menu
            // should call coreUIManager.renderMenu() themselves.
            // This was handled in market_logic.js and skills_logic.js.
        }
    },

    getGlobalFlag(flagName, defaultValue = undefined) {
        if (Object.prototype.hasOwnProperty.call(gameState.globalFlags, flagName)) {
            return gameState.globalFlags[flagName];
        }
        return defaultValue;
    },

    getAllGlobalFlags() {
        return { ...gameState.globalFlags };
    },

    /**
     * Clears all global flags. Called during a hard reset.
     */
    clearAllGlobalFlags() {
        gameState.globalFlags = {};
        loggingSystem.info("CoreGameStateManager", "All global flags cleared.");
    },

    setModuleState(moduleId, moduleStateData) {
        if (typeof moduleId !== 'string' || moduleId.trim() === '') {
            loggingSystem.warn("CoreGameStateManager", "setModuleState: moduleId must be a non-empty string.");
            return;
        }
        gameState.moduleStates[moduleId] = { ...moduleStateData };
        loggingSystem.debug("CoreGameStateManager", `State for module '${moduleId}' updated.`);
    },

    getModuleState(moduleId) {
        if (Object.prototype.hasOwnProperty.call(gameState.moduleStates, moduleId)) {
            try {
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
        // No specific time-based logic for global state manager itself yet.
    },

    resetState() {
        const defaultVersion = "0.1.0"; // Base version, main.js will set current game version
        gameState = {
            gameVersion: defaultVersion,
            lastSaveTime: null,
            globalFlags: {}, // Flags are cleared, individual modules handle their permanent flags in onResetState
            moduleStates: {},
        };
        loggingSystem.info("CoreGameStateManager", "Game state has been reset to default (global flags object recreated).");
    }
};

// coreGameStateManager.initialize(); // Initialize on load (or let main.js handle)
export { coreGameStateManager };
