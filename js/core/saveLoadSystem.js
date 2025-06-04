// js/core/saveLoadSystem.js

/**
 * @file saveLoadSystem.js
 * @description Handles saving and loading the complete game state to/from localStorage.
 * It ensures that Decimal.js objects are correctly serialized and deserialized.
 * Also includes basic save data versioning.
 */

import { loggingSystem } from './loggingSystem.js';
import { decimalUtility } from './decimalUtility.js';
import { coreGameStateManager } from './coreGameStateManager.js';
import { coreResourceManager } from './coreResourceManager.js';
import { coreUIManager } from './coreUIManager.js'; // Ensure coreUIManager is imported

const SAVE_KEY = 'incrementalGameSaveData';
const CURRENT_SAVE_VERSION = coreGameStateManager.getGameVersion(); // Align with game state version initially

/**
 * Custom replacer function for JSON.stringify to handle Decimal objects.
 * It converts Decimal instances to a specific string representation.
 */
function decimalReplacer(key, value) {
    if (decimalUtility.isDecimal(value)) {
        // Serialize Decimal objects into a structure that we can identify and parse later.
        // Storing as a string is the most common approach.
        // break_infinity.js's .toString() is usually sufficient if it produces a parseable format.
        // Or, use a custom object structure if more metadata is needed:
        // return { __isDecimal__: true, value: value.toString() };
        return value.toString(); // Relies on Decimal's toString being parseable by its constructor
    }
    return value;
}

/**
 * Custom reviver function for JSON.parse to reconstruct Decimal objects.
 * It looks for values that were serialized Decimals and converts them back.
 */
function decimalReviver(key, value) {
    // If we used a custom object structure like { __isDecimal__: true, value: "..." }
    // if (typeof value === 'object' && value !== null && value.__isDecimal__ === true) {
    //     return decimalUtility.new(value.value);
    // }

    // If Decimal.toString() was used, we need a more heuristic approach or ensure
    // that only specific known fields are Decimals. This is harder to generalize safely.
    // For now, we'll assume that coreResourceManager and module states will handle
    // their own Decimal revival when their state is set.
    // This reviver is a general placeholder; specific revival might happen in gameStateManager.setFullGameState
    // or when modules receive their state.

    // A common pattern is to make sure numbers that look like they *could* be
    // from a Decimal (e.g., strings that are valid numbers) in specific known locations
    // are converted. This is fragile.
    // The most robust way is for each system (resourceManager, modules) to know which
    // of its properties are Decimals and revive them when its state is loaded.

    // For this top-level reviver, we won't do anything specific yet,
    // relying on downstream systems to handle their Decimal properties.
    // If a string value is encountered that is known to be a Decimal,
    // the part of the code that receives it should convert it.
    // Example: coreResourceManager.loadState would convert its stringified Decimals.
    return value;
}


const saveLoadSystem = {
    /**
     * Saves the current game state to localStorage.
     * Gathers state from coreGameStateManager, coreResourceManager, and (eventually) modules.
     * @returns {boolean} True if saving was successful, false otherwise.
     */
    saveGame() {
        loggingSystem.info("SaveLoadSystem", "Attempting to save game...");
        try {
            // 1. Gather all parts of the game state
            const gameStateToSave = coreGameStateManager.getGameState(); // Gets global flags, module states container
            const resourceState = coreResourceManager.getSaveData(); // Get resource amounts and production rates

            // Combine into a single save object
            const fullSaveData = {
                version: CURRENT_SAVE_VERSION,
                timestamp: Date.now(),
                gameState: gameStateToSave, // This already contains moduleStates from coreGameStateManager
                resourceState: resourceState,
                // Eventually, module-specific save data might be gathered here too if not part of coreGameStateManager
            };

            // 2. Serialize the game state with custom Decimal handling
            // The decimalReplacer will handle converting Decimal instances to strings.
            const serializedData = JSON.stringify(fullSaveData, decimalReplacer);

            // 3. Store in localStorage
            localStorage.setItem(SAVE_KEY, serializedData);

            // 4. Update last save time in game state
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

    /**
     * Loads the game state from localStorage.
     * Applies the loaded state to coreGameStateManager, coreResourceManager, etc.
     * Handles version migration if necessary (placeholder for now).
     * @returns {boolean} True if loading was successful and state was applied, false otherwise.
     */
    loadGame() {
        loggingSystem.info("SaveLoadSystem", "Attempting to load game...");
        try {
            const serializedData = localStorage.getItem(SAVE_KEY);
            if (!serializedData) {
                loggingSystem.info("SaveLoadSystem", "No save data found.");
                coreUIManager.showNotification("No save data found.", "info");
                return false;
            }

            // 1. Parse the data (initially without the reviver, as systems will handle their Decimals)
            // The decimalReviver could be used if we had a universal way to tag Decimals.
            let loadedFullData = JSON.parse(serializedData /*, decimalReviver */); // Reviver might be added later

            // 2. Version Check & Migration (Basic Placeholder)
            if (!loadedFullData.version) {
                loggingSystem.warn("SaveLoadSystem", "Save data has no version. Attempting to load as is, but might be incompatible.");
                // Potentially try to infer version or apply a default migration.
            } else if (loadedFullData.version !== CURRENT_SAVE_VERSION) {
                loggingSystem.warn("SaveLoadSystem", `Save data version (${loadedFullData.version}) differs from current game version (${CURRENT_SAVE_VERSION}). Migration needed (not implemented).`);
                // Here, you would implement migration logic based on versions.
                // For now, we'll attempt to load it but warn the user.
                // loadedFullData = this.migrateSaveData(loadedFullData, loadedFullData.version, CURRENT_SAVE_VERSION);
                coreUIManager.showNotification(`Loading save from older version (${loadedFullData.version}). Some features may not work as expected.`, "warning", 5000);
            }

            // 3. Apply the loaded state
            // Order can be important. Game state manager might hold structures modules rely on.
            if (loadedFullData.gameState) {
                // coreGameStateManager.setFullGameState needs to be smart about reviving its own Decimals if any
                // or ensure that its structure is just plain data and modules handle their own.
                coreGameStateManager.setFullGameState(loadedFullData.gameState);
            } else {
                loggingSystem.warn("SaveLoadSystem", "Loaded data missing 'gameState' block. Global flags and module states might not be restored correctly.");
                coreGameStateManager.resetState(); // Or initialize to default
            }

            if (loadedFullData.resourceState) {
                coreResourceManager.loadSaveData(loadedFullData.resourceState); // This method MUST handle reviving Decimals
            } else {
                loggingSystem.warn("SaveLoadSystem", "Loaded data missing 'resourceState' block. Resources might not be restored correctly.");
                coreResourceManager.resetState(); // Or initialize to default
            }
            
            // After loading module states into coreGameStateManager, modules themselves might need an explicit
            // signal to re-initialize their internal logic based on this loaded state.
            // Example: moduleLoader.notifyModulesOfLoad();

            coreGameStateManager.setGameVersion(loadedFullData.version || CURRENT_SAVE_VERSION); // Update game's current idea of its version from save
            coreGameStateManager.updateLastSaveTime(loadedFullData.timestamp || Date.now());


            loggingSystem.info("SaveLoadSystem", "Game loaded successfully.");
            coreUIManager.showNotification("Game Loaded!", "success");
            // Potentially trigger a UI refresh for all components
            coreUIManager.fullUIRefresh(); // A hypothetical function to redraw everything based on new state
            return true;

        } catch (error) {
            loggingSystem.error("SaveLoadSystem", "Error loading game:", error);
            coreUIManager.showNotification("Error loading game: " + error.message, "error");
            // Attempt to reset to a clean state if loading fails catastrophically
            // this.resetGameData(true); // Pass a flag to indicate it's due to load failure
            return false;
        }
    },

    /**
     * Deletes the saved game data from localStorage.
     * @param {boolean} [suppressNotification=false] - If true, don't show a UI notification.
     */
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

    /**
     * Placeholder for save data migration logic.
     * @param {object} saveData - The save data to migrate.
     * @param {string} oldVersion - The version of the save data.
     * @param {string} newVersion - The target version to migrate to.
     * @returns {object} The migrated save data.
     */
    migrateSaveData(saveData, oldVersion, newVersion) {
        loggingSystem.info("SaveLoadSystem", `Attempting to migrate save data from ${oldVersion} to ${newVersion}...`);
        // Implement migration steps here.
        // Example:
        // if (oldVersion === "0.1.0" && newVersion === "0.2.0") {
        //     saveData.gameState.newProperty = defaultValue;
        //     delete saveData.gameState.oldObsoleteProperty;
        // }
        // This needs to be carefully designed based on actual version changes.
        loggingSystem.warn("SaveLoadSystem", "Migration logic is a placeholder and not fully implemented.");
        return saveData; // Return modified or original data
    },

    /**
     * Performs a hard reset of the game: deletes save data and resets game state.
     * @param {boolean} [isLoadFailure=false] - Indicates if reset is due to a failed load attempt.
     */
    resetGameData(isLoadFailure = false) {
        // Ask for confirmation unless it's a reset due to catastrophic load failure
        // The roadmap says no window.confirm, so coreUIManager should handle this.
        // For now, we'll proceed directly for simplicity in this core system.
        // A UI layer should gate this call.

        loggingSystem.warn("SaveLoadSystem", "Initiating hard game reset...");
        this.deleteSaveData(isLoadFailure); // Suppress notification if it's part of a failed load sequence

        // Reset all core systems
        coreGameStateManager.resetState();
        coreResourceManager.resetState();
        // moduleLoader.resetAllModules(); // When modules exist

        // Set current game version after reset
        coreGameStateManager.setGameVersion(CURRENT_SAVE_VERSION);


        if (!isLoadFailure) {
            coreUIManager.showNotification("Game Reset to Defaults!", "warning", 3000);
        } else {
            coreUIManager.showNotification("Save data corrupted or incompatible. Game reset to defaults.", "error", 5000);
        }
        loggingSystem.info("SaveLoadSystem", "Game has been reset to default state.");
        coreUIManager.fullUIRefresh(); // A hypothetical function to redraw everything
    }
};

export { saveLoadSystem };
