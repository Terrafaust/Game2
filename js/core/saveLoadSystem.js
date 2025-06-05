// js/core/saveLoadSystem.js (v2 - Reset Fix)

/**
 * @file saveLoadSystem.js
 * @description Handles saving and loading game state.
 * v2: Calls coreGameStateManager.clearAllGlobalFlags() on reset.
 */

import { loggingSystem } from './loggingSystem.js';
import { decimalUtility } from './decimalUtility.js';
import { coreGameStateManager } from './coreGameStateManager.js';
import { coreResourceManager } from './coreResourceManager.js';
import { coreUIManager } from './coreUIManager.js'; 
// moduleLoader will be used indirectly via main.js calling moduleLoader.resetAllModules()

const SAVE_KEY = 'incrementalGameSaveData';
// const CURRENT_SAVE_VERSION = "0.5.0"; // Managed by coreGameStateManager now

function decimalReplacer(key, value) {
    if (decimalUtility.isDecimal(value)) {
        return value.toString(); 
    }
    return value;
}

const saveLoadSystem = {
    saveGame() {
        loggingSystem.info("SaveLoadSystem", "Attempting to save game...");
        try {
            const gameStateToSave = coreGameStateManager.getGameState(); 
            const resourceState = coreResourceManager.getSaveData(); 
            const fullSaveData = {
                version: coreGameStateManager.getGameVersion(), // Get current game version
                timestamp: Date.now(),
                gameState: gameStateToSave,
                resourceState: resourceState,
            };
            const serializedData = JSON.stringify(fullSaveData, decimalReplacer);
            localStorage.setItem(SAVE_KEY, serializedData);
            coreGameStateManager.updateLastSaveTime(fullSaveData.timestamp);
            loggingSystem.info("SaveLoadSystem", "Game saved successfully.", { size: serializedData.length });
            coreUIManager.showNotification("Game Saved!", "success");
            return true;
        } catch (error) {
            loggingSystem.error("SaveLoadSystem", "Error saving game:", error);
            coreUIManager.showNotification("Error saving game: " + error.message, "error");
            return false;
        }
    },

    loadGame() {
        loggingSystem.info("SaveLoadSystem", "Attempting to load game...");
        try {
            const serializedData = localStorage.getItem(SAVE_KEY);
            if (!serializedData) {
                loggingSystem.info("SaveLoadSystem", "No save data found.");
                // coreUIManager.showNotification("No save data found.", "info"); // Usually handled by main.js flow
                return false;
            }

            let loadedFullData = JSON.parse(serializedData); 
            const currentGameVersion = coreGameStateManager.getGameVersion(); // Get expected version from running game

            if (!loadedFullData.version) {
                loggingSystem.warn("SaveLoadSystem", "Save data has no version. Attempting to load as is.");
            } else if (loadedFullData.version !== currentGameVersion) {
                loggingSystem.warn("SaveLoadSystem", `Save data version (${loadedFullData.version}) differs from current game version (${currentGameVersion}). Migration may be needed (not implemented).`);
                coreUIManager.showNotification(`Loading save from a different version (${loadedFullData.version}).`, "warning", 5000);
                // loadedFullData = this.migrateSaveData(loadedFullData, loadedFullData.version, currentGameVersion);
            }

            if (loadedFullData.gameState) {
                coreGameStateManager.setFullGameState(loadedFullData.gameState);
            } else {
                loggingSystem.warn("SaveLoadSystem", "Loaded data missing 'gameState'. Resetting game state.");
                coreGameStateManager.resetState(); 
            }

            if (loadedFullData.resourceState) {
                coreResourceManager.loadSaveData(loadedFullData.resourceState); 
            } else {
                loggingSystem.warn("SaveLoadSystem", "Loaded data missing 'resourceState'. Resetting resources.");
                coreResourceManager.resetState(); 
            }
            
            coreGameStateManager.setGameVersion(loadedFullData.version || currentGameVersion); 
            coreGameStateManager.updateLastSaveTime(loadedFullData.timestamp || Date.now());

            loggingSystem.info("SaveLoadSystem", "Game loaded successfully.");
            coreUIManager.showNotification("Game Loaded!", "success");
            coreUIManager.fullUIRefresh(); // Ensure UI reflects loaded state
            return true;

        } catch (error) {
            loggingSystem.error("SaveLoadSystem", "Error loading game:", error);
            coreUIManager.showNotification("Error loading game. Save may be corrupted. " + error.message, "error", 7000);
            // To prevent load loops, don't auto-reset here. Let user decide or main.js handle new game.
            return false;
        }
    },

    deleteSaveData(suppressNotification = false) {
        try {
            localStorage.removeItem(SAVE_KEY);
            loggingSystem.info("SaveLoadSystem", "Save data deleted from localStorage.");
            if (!suppressNotification) {
                coreUIManager.showNotification("Save data deleted.", "info");
            }
        } catch (error) {
            loggingSystem.error("SaveLoadSystem", "Error deleting save data:", error);
             if (!suppressNotification) {
                coreUIManager.showNotification("Error deleting save data: " + error.message, "error");
            }
        }
    },

    migrateSaveData(saveData, oldVersion, newVersion) {
        // Placeholder for future migration logic
        loggingSystem.info("SaveLoadSystem", `Attempting to migrate save data from ${oldVersion} to ${newVersion}...`);
        loggingSystem.warn("SaveLoadSystem", "Migration logic is a placeholder.");
        return saveData;
    },

    resetGameData(isLoadFailure = false) {
        loggingSystem.warn("SaveLoadSystem", "Initiating hard game reset...");
        this.deleteSaveData(isLoadFailure); 

        // Reset core systems
        coreGameStateManager.resetState(); // This now just recreates the gameState object with empty flags
        coreGameStateManager.clearAllGlobalFlags(); // Explicitly clear all flags
        coreResourceManager.resetState();
        // moduleLoader.resetAllModules() will be called by main.js,
        // which will trigger onResetState in each module to clear their specific permanent flags.
        
        // coreGameStateManager.setGameVersion(CURRENT_SAVE_VERSION); // Set by main.js after this

        if (!isLoadFailure) {
            coreUIManager.showNotification("Game Reset to Defaults!", "warning", 3000);
        } else {
            coreUIManager.showNotification("Save data issue. Game reset to defaults.", "error", 5000);
        }
        loggingSystem.info("SaveLoadSystem", "Game data has been reset.");
        coreUIManager.fullUIRefresh(); 
    }
};

export { saveLoadSystem };
