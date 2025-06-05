// js/main.js (v9.7 - Theme Listener & Init Order)

/**
 * @file main.js
 * @description Main entry point for the incremental game.
 * v9.7: Ensures globalSettingsManager dispatches initial theme correctly and listener is robust.
 * v9.6: Changed DevTools button to apply a x100,000 production multiplier.
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


// --- Main Game Initialization Function ---
async function initializeGame() {
    // 1. Initialize Logging System
    loggingSystem.setLogLevel(loggingSystem.levels.DEBUG); // Set to DEBUG for thorough logs
    loggingSystem.info("Main", "Game initialization sequence started (v9.7).");

    // Initialize Core Systems in an order that respects dependencies
    // GlobalSettingsManager needs to be early for others to potentially read settings
    globalSettingsManager.initialize(); // This now dispatches initial 'themeChanged'
    
    coreResourceManager.initialize();
    coreUpgradeManager.initialize();
    coreUIManager.initialize(); // UIManager needs to be initialized to listen for theme changes

    // Event listener for theme changes from globalSettingsManager
    // This should be set up *after* coreUIManager is initialized.
    document.addEventListener('themeChanged', (event) => {
        loggingSystem.debug("Main_ThemeListener", "themeChanged event received", event.detail);
        if (event.detail && event.detail.name && event.detail.mode) {
            const { name, mode } = event.detail;
            coreUIManager.applyTheme(name, mode);
        } else {
            loggingSystem.warn("Main_ThemeListener", "themeChanged event received with invalid detail:", event.detail);
        }
    });
    
    // Apply initial theme that might have been loaded by globalSettingsManager
    // This is technically redundant if globalSettingsManager.initialize() dispatches effectively
    // and the listener above picks it up. But, as a fallback or explicit first application:
    const initialTheme = globalSettingsManager.getSetting('theme');
    if (initialTheme && initialTheme.name && initialTheme.mode) {
        loggingSystem.debug("Main_InitTheme", `Applying initial theme directly: ${initialTheme.name}, ${initialTheme.mode}`);
        coreUIManager.applyTheme(initialTheme.name, initialTheme.mode);
    } else {
        loggingSystem.warn("Main_InitTheme", "No initial theme found in settings to apply directly.");
    }


    document.addEventListener('languageChanged', (event) => {
        coreUIManager.showNotification(`Language setting changed to: ${event.detail}. (Localization TBD)`, 'info');
    });

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

    const coreResourceDefinitions = {
        studyPoints: { id: 'studyPoints', name: "Study Points", initialAmount: "0", isUnlocked: true, showInUI: true, hasProductionRate: true },
        knowledge: { id: 'knowledge', name: "Knowledge", initialAmount: "0", isUnlocked: false, showInUI: false, hasProductionRate: true }, // Initially hidden and locked
        // 'images' and 'studySkillPoints' are defined by the Market module
    };
    staticDataAggregator.registerStaticData('core_resource_definitions', coreResourceDefinitions);
    loggingSystem.debug("Main_Init", "Registered core_resource_definitions", coreResourceDefinitions);

    // Define initial core resources AFTER staticDataAggregator has them.
    for (const resId in coreResourceDefinitions) {
        const resDef = coreResourceDefinitions[resId];
        coreResourceManager.defineResource(
            resDef.id, resDef.name, decimalUtility.new(resDef.initialAmount),
            resDef.showInUI, resDef.isUnlocked, resDef.hasProductionRate
        );
    }


    const gameLoaded = saveLoadSystem.loadGame(); // This will call setFullGameState, loadSaveData for CRM etc.
    if (!gameLoaded) {
        loggingSystem.info("Main", "No save game found. Starting a new game.");
        coreGameStateManager.setGameVersion("0.5.8"); // Update to a new version string
        // Core resources are already defined above with their initial new game states.
        // Modules will define their own resources upon loading if it's a new game.
    } else {
        loggingSystem.info("Main", "Save game loaded.");
        // On successful load, coreGameStateManager and coreResourceManager states are updated.
        // We still need to ensure that all potentially defined resources (from core or modules that might exist in save)
        // are correctly processed. CRM's loadSaveData tries to handle this.
        // If a resource from an old save is for a module not present, it might be ignored or re-defined by a newly loaded module.
    }

    // Load all modules
    try {
        await moduleLoader.loadModule('../../modules/core_gameplay_module/core_gameplay_manifest.js');
        await moduleLoader.loadModule('../../modules/studies_module/studies_manifest.js');
        await moduleLoader.loadModule('../../modules/market_module/market_manifest.js'); // Market defines 'images' & 'studySkillPoints'
        await moduleLoader.loadModule('../../modules/skills_module/skills_manifest.js');
        await moduleLoader.loadModule('../../modules/achievements_module/achievements_manifest.js');
        await moduleLoader.loadModule('../../modules/settings_ui_module/settings_ui_manifest.js');
    } catch (error) {
        loggingSystem.error("Main", "Unhandled error during module loading attempts:", error, error.stack);
        coreUIManager.showNotification("Critical Error: A module failed to load.", "error", 0);
    }
    
    // After modules are loaded, they might have registered their own resources.
    // If a game was loaded, their onGameLoad handlers (called by saveLoadSystem.loadGame -> moduleLoader.notifyAllModulesOfLoad)
    // should have processed their states.
    // A full UI refresh here ensures everything is up-to-date after all initializations and potential loads.
    coreUIManager.fullUIRefresh();


    const saveButton = document.getElementById('save-button');
    const loadButton = document.getElementById('load-button');
    const resetButton = document.getElementById('reset-button');
    const devToolsButton = document.getElementById('dev-tools-button');

    if (saveButton) {
        saveButton.addEventListener('click', () => {
            saveLoadSystem.saveGame();
            // coreUIManager.showNotification("Game Saved!", "success", 2000); // saveLoadSystem does this
        });
    }
    if (loadButton) {
        loadButton.addEventListener('click', () => {
            coreUIManager.showModal( "Load Game?", "Loading will overwrite your current unsaved progress. Are you sure?",
                [
                    { label: "Load Game", className: "bg-blue-600 hover:bg-blue-700", callback: () => {
                        const wasRunning = gameLoop.isRunning();
                        if (wasRunning) gameLoop.stop();
                        
                        // Clear existing resource definitions slightly differently for a load
                        // coreResourceManager.resetState(); // Resets to initial definitions, might not be desired for load
                        // Instead, loadGame will overwrite. If a resource is in save but not defined by any module, CRM's load handles it.

                        if (saveLoadSystem.loadGame()) { // This internally calls moduleLoader.notifyAllModulesOfLoad()
                            // If loadGame is successful, it sets game state and resource states.
                            // Modules' onGameLoad handlers will be called.
                            // coreUIManager.showNotification("Game Loaded!", "success", 2000); // saveLoadSystem does this
                            coreUIManager.fullUIRefresh(); // Refresh UI to reflect newly loaded state and module UIs.
                        } else {
                            coreUIManager.showNotification("Failed to load game or no save data found.", "error", 3000);
                        }
                        if (wasRunning || !gameLoop.isRunning()) { setTimeout(() => gameLoop.start(), 100); }
                        coreUIManager.closeModal();
                    }},
                    { label: "Cancel", callback: () => coreUIManager.closeModal() }
                ]
            );
        });
    }
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            coreUIManager.showModal("Hard Reset Game?", "All progress will be lost permanently. This cannot be undone. Are you sure?",
                [
                    { label: "Reset Game", className: "bg-red-600 hover:bg-red-700", callback: () => {
                        const wasRunning = gameLoop.isRunning();
                        if (wasRunning) gameLoop.stop();
                        
                        saveLoadSystem.resetGameData(); // This deletes save and resets core system states (CRM, CGS)

                        // Re-define core resources to their initial new game state
                        for (const resId in coreResourceDefinitions) {
                            const resDef = coreResourceDefinitions[resId];
                            coreResourceManager.defineResource(
                                resDef.id, resDef.name, decimalUtility.new(resDef.initialAmount),
                                resDef.showInUI, resDef.isUnlocked, resDef.hasProductionRate
                            );
                        }
                        
                        moduleLoader.resetAllModules(); // Calls onResetState for all modules
                        
                        // After modules have reset their states, they might need to re-initialize some aspects
                        // or re-define their resources with initial properties.
                        // For example, market module on reset should make 'images' hidden/locked again.
                        // This can be handled in each module's onResetState or their manifest's onResetState.
                        // The current market_manifest.js onResetState redefines its resources.

                        coreGameStateManager.setGameVersion("0.5.8"); // Set current version for new game
                        
                        // Apply default theme after reset
                        const defaultTheme = globalSettingsManager.defaultSettings.theme;
                        globalSettingsManager.resetToDefaults(); // This will dispatch themeChanged
                        coreUIManager.applyTheme(defaultTheme.name, defaultTheme.mode);


                        coreUIManager.fullUIRefresh(); // Refresh all UI to reflect clean state
                        // coreUIManager.showNotification("Game Reset to Defaults.", "warning", 3000); // saveLoadSystem does this
                        if (wasRunning || !gameLoop.isRunning()) { setTimeout(() => gameLoop.start(), 100); }
                        coreUIManager.closeModal();
                    }},
                    { label: "Cancel", callback: () => coreUIManager.closeModal() }
                ]
            );
        });
    }

    if (devToolsButton) {
        devToolsButton.addEventListener('click', () => {
            loggingSystem.info("Main_DevTools", "Dev tools button clicked: Applying production multiplier.");
            const crmReady = coreResourceManager && typeof coreResourceManager.getAllResources === 'function' &&
                             typeof coreResourceManager.getProductionFromSource === 'function' &&
                             typeof coreResourceManager.setProductionPerSecond === 'function';

            if (!crmReady) {
                loggingSystem.error("Main_DevTools", "coreResourceManager or its methods are not available.");
                coreUIManager.showNotification("Dev Tools Error: Resource Manager methods missing. Check console.", "error");
                return;
            }
            const boostFactor = decimalUtility.new(100000);
            let changesMade = false;
            const allResources = coreResourceManager.getAllResources(); 
            for (const resourceId in allResources) {
                const liveResourceData = coreResourceManager.getResource(resourceId); 
                if (liveResourceData && liveResourceData.productionSources && liveResourceData.hasProductionRate) {
                    for (const sourceKey in liveResourceData.productionSources) {
                        const currentProd = coreResourceManager.getProductionFromSource(resourceId, sourceKey);
                        if (decimalUtility.neq(currentProd, 0)) {
                            const boostedProd = decimalUtility.multiply(currentProd, boostFactor);
                            coreResourceManager.setProductionPerSecond(resourceId, sourceKey, boostedProd);
                            changesMade = true;
                        }
                    }
                }
            }
            if (changesMade) {
                coreUIManager.showNotification(`Developer Boost: All active productions x${boostFactor.toString()}!`, "warning", 5000);
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
