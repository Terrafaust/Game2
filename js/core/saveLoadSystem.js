// js/core/saveLoadSystem.js (v4.0 - Final Refactor)
// Fully integrated with new core systems.

import { loggingSystem } from './loggingSystem.js';
import { decimalUtility } from './decimalUtility.js';
import { coreGameStateManager } from './coreGameStateManager.js';
import { coreResourceManager } from './coreResourceManager.js';
import { coreUIManager } from './coreUIManager.js'; 
import { moduleLoader } from './moduleLoader.js';
import { globalSettingsManager } from './globalSettingsManager.js';

const SAVE_KEY = 'incrementalGameSaveData_v3'; // Increment save key to avoid conflicts with old saves

function decimalReplacer(key, value) {
    if (decimalUtility.isDecimal(value)) {
        return value.toString(); 
    }
    return value;
}

export const saveLoadSystem = {
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
            coreUIManager.showNotification('ui.notifications.error_saving', "error", 5000, { replacements: { error: error.message }});
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
            
            // AFTER loading state, notify all modules to update themselves
            moduleLoader.notifyAllModulesOfLoad();
            
            // Then do a full UI refresh
            coreUIManager.fullUIRefresh();

            loggingSystem.info("SaveLoadSystem", "Game loaded successfully.");
            coreUIManager.showNotification('ui.notifications.game_loaded', "success");
            return true;

        } catch (error) {
            loggingSystem.error("SaveLoadSystem", "Error loading game:", error);
            coreUIManager.showNotification("Error loading game. Save may be corrupted.", "error", 7000);
            this.resetGameData(true); // Force a reset on corrupted data
            return false;
        }
    },
    
    resetGameData(isLoadFailure = false) {
        loggingSystem.warn("SaveLoadSystem", "Initiating hard game reset...");
        
        // 1. Stop the game loop to prevent race conditions
        coreSystemsRef.gameLoop.stop();

        // 2. Delete the save file
        localStorage.removeItem(SAVE_KEY);

        // 3. Reset all core systems to their default state
        coreGameStateManager.resetState();
        coreResourceManager.resetState();
        globalSettingsManager.resetToDefaults(); // This will dispatch theme/language events
        
        // 4. THIS IS KEY: Reset all modules to their initial state.
        // This will call `onResetState` for every module.
        moduleLoader.resetAllModules();
        
        // 5. AFTER modules have reset, re-define their initial resources.
        // The manifests will handle this. We just need to reload them. This is complex.
        // A simpler, safer approach is to reload the page.
        
        coreUIManager.showNotification('ui.notifications.game_reset', "warning", 5000);
        loggingSystem.info("SaveLoadSystem", "Game data has been reset. Reloading page for clean state.");

        // Reload the page to ensure a completely clean start from the new default state
        setTimeout(() => window.location.reload(), 1000);
    }
};
