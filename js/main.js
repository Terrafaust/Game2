// js/main.js (v9.11 - Diagnostic Log for coreUpgradeManager)

/**
 * @file main.js
 * @description Main entry point for the incremental game.
 * v9.11: Added diagnostic log for coreUpgradeManager before initialization.
 * v9.10: Added diagnostic log for coreUIManager before initialization.
 * v9.9: Added diagnostic log for coreResourceManager before initialization.
 * v9.8: Fixed TypeError by correcting coreResourceManager import.
 * v9.7: Ensures moduleLoader.resetAllModules() is called on hard reset.
 * Also fixes initial resource definition to use staticDataAggregator correctly.
 * v9.6: Changed DevTools button to apply a x100,000 production multiplier.
 * v9.5: Added more granular logging for debugging coreResourceManager methods in devToolsButton.
 * v9.4: Added detailed logging for debugging coreResourceManager in devToolsButton.
 * v9.3: Initializes coreResourceManager.
 * v9.2: Passes saveLoadSystem to moduleLoader.initialize, defines all core_resource_definitions on new game.
 * v9.1: Passes globalSettingsManager to moduleLoader.initialize.
 */

// --- Core System Imports ---
import { loggingSystem } from './core/loggingSystem.js';
import { decimalUtility } from './core/decimalUtility.js';
import { globalSettingsManager } from './core/globalSettingsManager.js';
import { coreGameStateManager } from './core/coreGameStateManager.js';
import { staticDataAggregator } from './core/staticDataAggregator.js';
import { coreResourceManager } from './core/coreResourceManager.js';
import { coreUIManager } from './core/coreUIManager.js';
import { saveLoadSystem } from './core/saveLoadSystem.js';
import { gameLoop } from './core/gameLoop.js';
import { moduleLoader } from './core/moduleLoader.js';
import { coreUpgradeManager } from './core/coreUpgradeManager.js';


// --- Main Game Initialization ---
const CURRENT_GAME_VERSION = "0.5.0"; // Define the current game version

async function initializeGame() {
    // Core system initializations
    loggingSystem.initialize(); // Ensure logging is ready first
    decimalUtility.initialize(); // Initialize Decimal.js
    globalSettingsManager.initialize();
    coreGameStateManager.initialize();
    staticDataAggregator.initialize();

    // --- DIAGNOSTIC LOGS for core systems ---
    console.log('[DEBUG Main] coreResourceManager before initialize:', coreResourceManager);
    coreResourceManager.initialize(); // Initialize resource manager

    console.log('[DEBUG Main] coreUIManager before initialize:', coreUIManager);
    coreUIManager.initialize(); // Initialize UI manager

    console.log('[DEBUG Main] coreUpgradeManager before initialize:', coreUpgradeManager); // Line 38 (or near it)
    coreUpgradeManager.initialize(); // Initialize upgrade manager (This is the potential error line)


    const initialTheme = globalSettingsManager.getSetting('theme');
    if (initialTheme && initialTheme.name && initialTheme.mode) {
        coreUIManager.applyTheme(initialTheme.name, initialTheme.mode);
    }

    document.addEventListener('themeChanged', (event) => {
        const { name, mode } = event.detail;
        coreUIManager.applyTheme(name, mode);
    });
    document.addEventListener('languageChanged', (event) => {
        coreUIManager.showNotification(`Language setting changed to: ${event.detail}. (Localization TBD)`, 'info');
    });

    // Pass core systems to module loader
    moduleLoader.initialize(
        staticDataAggregator,
        coreGameStateManager,
        coreResourceManager,
        coreUIManager,
        decimalUtility,
        loggingSystem,
        gameLoop,
        coreUpgradeManager,
        globalSettingsManager,
        saveLoadSystem
    );

    loggingSystem.info("Main", "Core systems initialized and module loader ready.");

    // --- Define Core Resources ---
    // Instead of hardcoding, use staticDataAggregator to get definitions
    const coreResourceDefinitions = staticDataAggregator.getData('core_resource_definitions');
    if (coreResourceDefinitions) {
        for (const resId in coreResourceDefinitions) {
            const resDef = coreResourceDefinitions[resId];
            if (!coreResourceManager.isResourceDefined(resDef.id)) {
                coreResourceManager.defineResource(
                    resDef.id,
                    resDef.name,
                    decimalUtility.new(resDef.initialAmount),
                    resDef.showInUI,
                    resDef.isUnlocked,
                    resDef.hasProductionRate
                );
                loggingSystem.info("Main", `Core resource '${resDef.name}' (${resId}) defined.`);
            }
        }
    } else {
        loggingSystem.warn("Main", "No core resource definitions found in staticDataAggregator. This might be an issue.");
    }


    // --- Load Modules ---
    // List of module manifests to load dynamically
    const moduleManifests = [
        './modules/core_gameplay_module/core_gameplay_manifest.js',
        './modules/studies_module/studies_manifest.js',
        './modules/market_module/market_manifest.js',
        './modules/skills_module/skills_manifest.js',
        './modules/achievements_module/achievements_manifest.js',
        './modules/settings_ui_module/settings_ui_manifest.js',
    ];

    for (const manifestPath of moduleManifests) {
        await moduleLoader.loadModule(manifestPath);
    }

    // --- Game Version Management ---
    const loadedGameVersion = coreGameStateManager.getGameVersion();
    if (loadedGameVersion !== CURRENT_GAME_VERSION) {
        loggingSystem.warn("Main", `Game version mismatch! Loaded: ${loadedGameVersion}, Current: ${CURRENT_GAME_VERSION}. Attempting save migration...`);
        // This is where you would call a migration function if you had one
        // For now, saveLoadSystem.loadGame() will handle basic version check.
        // It's good practice to set the game version AFTER potential migration on load
        coreGameStateManager.setGameVersion(CURRENT_GAME_VERSION);
    }
    loggingSystem.info("Main", `Game running on version: ${coreGameStateManager.getGameVersion()}`);

    // --- Attempt to load game data ---
    const loaded = saveLoadSystem.loadGame();
    if (!loaded) {
        loggingSystem.info("Main", "No save data found or error loading. Starting new game.");
        // If load fails or no save exists, ensure a clean initial state
        coreGameStateManager.resetState();
        coreGameStateManager.clearAllGlobalFlags(); // Ensure flags are truly clear on new game
        coreResourceManager.resetState();
        moduleLoader.resetAllModules(); // Reset all modules if starting a new game (crucial for flags)
        coreGameStateManager.setGameVersion(CURRENT_GAME_VERSION); // Set current version for new game
        coreUIManager.showNotification("New Game Started!", "info", 3000);
        coreUIManager.fullUIRefresh(); // Refresh UI after new game start
    } else {
        loggingSystem.info("Main", "Game data loaded.");
    }

    moduleLoader.notifyAllModulesOfLoad(); // Notify modules after full game state is loaded/set.


    // --- DevTools Button Setup ---
    const devToolsButton = document.getElementById('devToolsButton');
    if (devToolsButton) {
        devToolsButton.addEventListener('click', () => {
            loggingSystem.info("Main_DevTools", "DevTools button clicked.");
            const allResources = coreResourceManager.getAllResources();
            let hasProduction = false;
            for (const resId in allResources) {
                const resource = allResources[resId];
                if (resource.hasProductionRate) { // Only apply to resources that have a production rate
                    coreResourceManager.setProductionPerSecond(resId, 'devToolsBoost', decimalUtility.multiply(coreResourceManager.getTotalProductionRate(resId), 99999)); // +100,000%
                    hasProduction = true;
                }
            }
            if (hasProduction) {
                coreUIManager.showNotification(`Developer Boost: All active productions x${decimalUtility.new(100000).toString()}!`, "warning", 5000); // Changed to use Decimal utility for consistency
                coreUIManager.updateResourceDisplay();
            } else {
                coreUIManager.showNotification("Developer Boost: No active productions found to multiply.", "info", 3000);
            }
        });
    } else {
        loggingSystem.warn("Main_DevTools_Setup", "devToolsButton not found in the DOM.");
    }

    if (!gameLoop.isRunning()) {
        gameLoop.start();
    }
    loggingSystem.info("Main", "Game initialization sequence complete. Game is running.");
}

document.addEventListener('DOMContentLoaded', () => {
    initializeGame().catch(error => {
        loggingSystem.error("Main_DOMContentLoaded", "Unhandled error during game initialization:", error, error.stack);
        try {
            if (typeof coreUIManager !== 'undefined' && coreUIManager.showNotification) {
                 coreUIManager.showNotification("A critical error occurred during game startup. Check console & try refreshing.", "error", 0);
            } else {
                document.body.innerHTML = '<div style="color: white; background-color: #333; padding: 20px; font-family: sans-serif; text-align: center; border: 2px solid red;"><h1>Critical Error</h1><p>Game failed to start. Please check the browser console (F12) for details and try refreshing the page.</p></div>';
            }
        } catch (e) {
            console.error("CRITICAL FALLBACK: Error displaying startup error message.", e);
        }
    });
});
