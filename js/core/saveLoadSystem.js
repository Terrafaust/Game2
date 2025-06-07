// js/core/saveLoadSystem.js (v3 - True Hard Reset)

/**
 * @file saveLoadSystem.js
 * @description Handles saving and loading game state.
 * v3: Implements a true hard reset by calling moduleLoader.resetAllModules.
 * v2: Calls coreGameStateManager.clearAllGlobalFlags() on reset.
 */

import { loggingSystem } from './loggingSystem.js';
import { decimalUtility } from './decimalUtility.js';
import { coreGameStateManager } from './coreGameStateManager.js';
import { coreResourceManager } from './coreResourceManager.js';
import { coreUIManager } from './coreUIManager.js'; 
import { moduleLoader } from './moduleLoader.js'; // Import moduleLoader to call reset

const SAVE_KEY = 'incrementalGameSaveData';

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
                version: coreGameStateManager.getGameVersion(),
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
                return false;
            }

            let loadedFullData = JSON.parse(serializedData); 
            const currentGameVersion = coreGameStateManager.getGameVersion();

            if (!loadedFullData.version) {
                loggingSystem.warn("SaveLoadSystem", "Save data has no version. Attempting to load as is.");
            } else if (loadedFullData.version !== currentGameVersion) {
                loggingSystem.warn("SaveLoadSystem", `Save data version (${loadedFullData.version}) differs from current game version (${currentGameVersion}).`);
                coreUIManager.showNotification(`Loading save from a different version (${loadedFullData.version}).`, "warning", 5000);
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
            coreUIManager.fullUIRefresh();
            return true;

        } catch (error) {
            loggingSystem.error("SaveLoadSystem", "Error loading game:", error);
            coreUIManager.showNotification("Error loading game. Save may be corrupted. " + error.message, "error", 7000);
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
        loggingSystem.info("SaveLoadSystem", `Attempting to migrate save data from ${oldVersion} to ${newVersion}...`);
        loggingSystem.warn("SaveLoadSystem", "Migration logic is a placeholder.");
        return saveData;
    },

    // --- MODIFICATION: Updated to ensure all modules are fully reset ---
    resetGameData(isLoadFailure = false) {
        loggingSystem.warn("SaveLoadSystem", "Initiating hard game reset...");
        this.deleteSaveData(isLoadFailure); 

        // Reset core systems
        coreGameStateManager.resetState();
        coreGameStateManager.clearAllGlobalFlags();
        coreResourceManager.resetState();
        
        // --- THIS IS THE KEY ---
        // This broadcasts the 'onResetState' event to all modules, including prestige.
        moduleLoader.resetAllModules();
        
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
