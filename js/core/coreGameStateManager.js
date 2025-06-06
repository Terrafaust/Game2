// js/core/coreGameStateManager.js (v2.3 - Play Time Fix)

/**
 * @file coreGameStateManager.js
 * @description Manages the global game state.
 * v2.3: Corrected deltaTime unit in updatePlayTime to expect milliseconds.
 * v2.2: Added total play time tracking and formatting.
 * v2.1: Removed erroneous coreSystemsRef check from setGlobalFlag.
 */

import { loggingSystem } from './loggingSystem.js';
import { decimalUtility } from './decimalUtility.js'; 

let gameState = {
    gameVersion: "1.1.0", // Incremented for Ascension System update
    lastSaveTime: null,
    totalPlayTimeSeconds: 0, 
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
            gameState.gameVersion = gameState.gameVersion || "1.1.0";
            gameState.lastSaveTime = gameState.lastSaveTime || null;
            gameState.totalPlayTimeSeconds = gameState.totalPlayTimeSeconds || 0; 
            gameState.globalFlags = gameState.globalFlags || {};
            gameState.moduleStates = gameState.moduleStates || {};
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
        gameState.totalPlayTimeSeconds = newState.totalPlayTimeSeconds || 0; 

        for (const moduleId in gameState.moduleStates) {
            const moduleStateData = gameState.moduleStates[moduleId];
            if (moduleId === 'studies' && moduleStateData && moduleStateData.ownedProducers) {
                for (const producerId in moduleStateData.ownedProducers) {
                    if (typeof moduleStateData.ownedProducers[producerId] !== 'string') {
                        moduleStateData.ownedProducers[producerId] = decimalUtility.new(moduleStateData.ownedProducers[producerId]).toString();
                    }
                }
            }
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

    /**
     * Increments the total play time by the given delta time.
     * This method should be called from the main game loop.
     * @param {number} deltaTimeInMilliseconds The time elapsed since the last frame in milliseconds.
     */
    updatePlayTime(deltaTimeInMilliseconds) { // Renamed parameter for clarity
        if (typeof deltaTimeInMilliseconds !== 'number' || isNaN(deltaTimeInMilliseconds) || deltaTimeInMilliseconds < 0) {
            loggingSystem.warn("CoreGameStateManager_UpdatePlayTime", "deltaTimeInMilliseconds must be a non-negative number.", deltaTimeInMilliseconds);
            return;
        }
        // Convert deltaTime from milliseconds to seconds for totalPlayTimeSeconds
        gameState.totalPlayTimeSeconds += (deltaTimeInMilliseconds / 1000);
        // loggingSystem.debug("CoreGameStateManager", `Total play time updated to: ${gameState.totalPlayTimeSeconds.toFixed(2)} seconds.`);
    },

    getTotalPlayTimeSeconds() {
        return gameState.totalPlayTimeSeconds;
    },

    getTotalPlayTimeString() {
        let totalSeconds = Math.floor(gameState.totalPlayTimeSeconds);
        if (totalSeconds < 0) totalSeconds = 0; // Ensure non-negative

        let days = Math.floor(totalSeconds / (3600 * 24));
        totalSeconds %= (3600 * 24);
        let hours = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600;
        let minutes = Math.floor(totalSeconds / 60);
        let seconds = totalSeconds % 60;

        let parts = [];
        if (days > 0) {
            parts.push(`${days} day${days !== 1 ? 's' : ''}`);
        }
        if (hours > 0 || parts.length > 0) { 
            parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
        }
        if (minutes > 0 || parts.length > 0) { 
            parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
        }
        // Always include seconds if other parts are zero or it's the only part.
        if (parts.length === 0 || seconds > 0 || (days === 0 && hours === 0 && minutes === 0)) {
             parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
        }


        return parts.length > 0 ? parts.join(', ') : "0 seconds";
    },

    update(deltaTime) {
        // No specific update logic here for now, play time is handled by updatePlayTime
    },

    resetState() {
        const defaultVersion = "1.1.0"; 
        gameState = {
            gameVersion: defaultVersion,
            lastSaveTime: null,
            totalPlayTimeSeconds: 0, 
            globalFlags: {}, 
            moduleStates: {},
        };
        loggingSystem.info("CoreGameStateManager", "Game state has been reset to default structure.");
    }
};

export { coreGameStateManager };
