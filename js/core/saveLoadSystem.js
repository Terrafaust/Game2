// js/core/saveLoadSystem.js (v4.3 - Decoupled Lifecycle)
// Removes lifecycle and UI calls from loadGame. The main.js initialization
// sequence is now the single source of truth for these events.

import { loggingSystem } from './loggingSystem.js';
import { decimalUtility } from './decimalUtility.js';
import { coreGameStateManager } from './coreGameStateManager.js';
import { coreResourceManager } from './coreResourceManager.js';
import { coreUIManager } from './coreUIManager.js';
import { moduleLoader } from './moduleLoader.js';
import { globalSettingsManager } from './globalSettingsManager.js';

const SAVE_KEY = 'incrementalGameSaveData_v3';
let coreSystemsRef = null;

function decimalReplacer(key, value) {
    if (decimalUtility.isDecimal(value)) {
        return value.toString();
    }
    return value;
}

export const saveLoadSystem = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        loggingSystem.info("SaveLoadSystem", "Save/Load System initialized.");
    },

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
            coreUIManager.showNotification('ui.notifications.game_saved', "success");
            return true;
        } catch (error) {
            loggingSystem.error("SaveLoadSystem", "Error saving game:", error);
            coreUIManager.showNotification('ui.notifications.error_saving', "error", 5000, { replacements: { error: error.message } });
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

            const loadedFullData = JSON.parse(serializedData);

            if (loadedFullData.gameState) {
                coreGameStateManager.setFullGameState(loadedFullData.gameState);
            }
            if (loadedFullData.resourceState) {
                coreResourceManager.loadSaveData(loadedFullData.resourceState);
            }

            coreGameStateManager.updateLastSaveTime(loadedFullData.timestamp || Date.now());

            // MODIFICATION: Removed module notification and UI refresh from here.
            // This is now controlled by the main initialization sequence.
            // moduleLoader.notifyAllModulesOfLoad();
            // coreUIManager.fullUIRefresh();

            loggingSystem.info("SaveLoadSystem", "Game data loaded into managers.");
            coreUIManager.showNotification('ui.notifications.game_loaded', "success");
            return true;

        } catch (error) {
            loggingSystem.error("SaveLoadSystem", "Error loading game:", error);
            coreUIManager.showNotification("Error loading game. Save may be corrupted.", "error", 7000);
            this.resetGameData(true);
            return false;
        }
    },

    resetGameData(isLoadFailure = false) {
        loggingSystem.warn("SaveLoadSystem", "Initiating hard game reset...");

        if (coreSystemsRef && coreSystemsRef.gameLoop) {
            coreSystemsRef.gameLoop.stop();
        } else {
            loggingSystem.error("SaveLoadSystem", "Cannot stop game loop: coreSystemsRef not initialized.");
        }

        localStorage.removeItem(SAVE_KEY);

        coreGameStateManager.resetState();
        coreResourceManager.resetState();
        globalSettingsManager.resetToDefaults();
        
        moduleLoader.resetAllModules();
        
        coreUIManager.showNotification('ui.notifications.game_reset', "warning", 5000);
        loggingSystem.info("SaveLoadSystem", "Game data has been reset. Reloading page for clean state.");

        setTimeout(() => window.location.reload(), 1000);
    }
};
