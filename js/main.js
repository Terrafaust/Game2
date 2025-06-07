// js/main.js (v10.0 - Hard Reset Fix)

/**
 * @file main.js
 * @description Main entry point for the incremental game.
 * v10.0: Fixes hard reset modal not closing.
 * v9.9: Corrects theme initialization order and restores full original file content.
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
import { buyMultiplierManager } from './core/buyMultiplierManager.js';

// --- Main Game Initialization Function ---
async function initializeGame() {
    // 1. Initialize Logging System
    loggingSystem.setLogLevel(loggingSystem.levels.DEBUG);
    loggingSystem.info("Main", "Game initialization sequence started (v10.0).");

    // 2. Initialize Core Systems
    globalSettingsManager.initialize();
    buyMultiplierManager.initialize();
    coreResourceManager.initialize();
    coreUpgradeManager.initialize();
    coreUIManager.initialize();

    // 3. Set up event listeners AFTER UI Manager is ready
    document.addEventListener('themeChanged', (event) => {
        loggingSystem.debug("Main_ThemeListener", "themeChanged event received", event.detail);
        if (event.detail && event.detail.name && event.detail.mode) {
            coreUIManager.applyTheme(event.detail.name, event.detail.mode);
        } else {
            loggingSystem.warn("Main_ThemeListener", "themeChanged event received with invalid detail:", event.detail);
        }
    });
    
    // 4. Explicitly apply the initial theme
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

    // 5. Initialize Module Loader
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
        saveLoadSystem,
        buyMultiplierManager
    );

    // 6. Define Core Data
    const coreResourceDefinitions = {
        studyPoints: { id: 'studyPoints', name: "Study Points", initialAmount: "0", isUnlocked: true, showInUI: true, hasProductionRate: true },
        knowledge: { id: 'knowledge', name: "Knowledge", initialAmount: "0", isUnlocked: false, showInUI: false, hasProductionRate: true },
    };
    staticDataAggregator.registerStaticData('core_resource_definitions', coreResourceDefinitions);
    loggingSystem.debug("Main_Init", "Registered core_resource_definitions", coreResourceDefinitions);

    for (const resId in coreResourceDefinitions) {
        const resDef = coreResourceDefinitions[resId];
        coreResourceManager.defineResource(
            resDef.id, resDef.name, decimalUtility.new(resDef.initialAmount),
            resDef.showInUI, resDef.isUnlocked, resDef.hasProductionRate
        );
    }

    // 7. Load Game or Start New
    const gameLoaded = saveLoadSystem.loadGame();
    if (!gameLoaded) {
        loggingSystem.info("Main", "No save game found. Starting a new game.");
        coreGameStateManager.setGameVersion("0.5.8");
    } else {
        loggingSystem.info("Main", "Save game loaded.");
    }

    // 8. Load Modules
    try {
        loggingSystem.info('Main', 'Loading Core Gameplay Module...');
        await moduleLoader.loadModule('../../modules/core_gameplay_module/core_gameplay_manifest.js');
        
        loggingSystem.info('Main', 'Loading Studies Module...');
        await moduleLoader.loadModule('../../modules/studies_module/studies_manifest.js');
        
        loggingSystem.info('Main', 'Loading Market Module...');
        await moduleLoader.loadModule('../../modules/market_module/market_manifest.js');
        
        loggingSystem.info('Main', 'Loading Skills Module...');
        await moduleLoader.loadModule('../../modules/skills_module/skills_manifest.js');
        
        loggingSystem.info('Main', 'Loading Achievements Module...');
        await moduleLoader.loadModule('../../modules/achievements_module/achievements_manifest.js');

        loggingSystem.info('Main', 'Loading Prestige Module...');
        await moduleLoader.loadModule('../../modules/prestige_module/prestige_manifest.js');

        loggingSystem.info('Main', 'Loading Settings UI Module...');
        await moduleLoader.loadModule('../../modules/settings_ui_module/settings_ui_manifest.js');
    } catch (error) {
        loggingSystem.error("Main", "Unhandled error during module loading attempts:", error, error.stack);
        coreUIManager.showNotification("Critical Error: A module failed to load.", "error", 0);
    }
    
    // 9. Final UI Refresh
    coreUIManager.fullUIRefresh();

    // 10. Setup Footer Buttons
    const saveButton = document.getElementById('save-button');
    const loadButton = document.getElementById('load-button');
    const resetButton = document.getElementById('reset-button');
    const devToolsButton = document.getElementById('dev-tools-button');

    if (saveButton) saveButton.addEventListener('click', () => saveLoadSystem.saveGame());
    
    if (loadButton) {
        loadButton.addEventListener('click', () => {
            coreUIManager.showModal( "Load Game?", "Loading will overwrite your current unsaved progress. Are you sure?",
                [
                    { label: "Load Game", className: "bg-blue-600 hover:bg-blue-700", callback: () => {
                        const wasRunning = gameLoop.isRunning();
                        if (wasRunning) gameLoop.stop();
                        
                        if (saveLoadSystem.loadGame()) {
                            // After loading, all modules need to process their new state
                            moduleLoader.notifyAllModulesOfLoad(); 
                            coreUIManager.fullUIRefresh();
                        } else {
                            coreUIManager.showNotification("Failed to load game or no save data found.", "error", 3000);
                        }
                        if (wasRunning || !gameLoop.isRunning()) setTimeout(() => gameLoop.start(), 100);
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
                        // --- FIX: Close the modal BEFORE performing the reset ---
                        coreUIManager.closeModal();
                        
                        const wasRunning = gameLoop.isRunning();
                        if (wasRunning) gameLoop.stop();
                        
                        saveLoadSystem.resetGameData(); 

                        for (const resId in coreResourceDefinitions) {
                            const resDef = coreResourceDefinitions[resId];
                            coreResourceManager.defineResource(resDef.id, resDef.name, decimalUtility.new(resDef.initialAmount), resDef.showInUI, resDef.isUnlocked, resDef.hasProductionRate);
                        }
                        
                        coreGameStateManager.setGameVersion("1.1.0");
                        
                        const defaultTheme = globalSettingsManager.defaultSettings.theme;
                        globalSettingsManager.resetToDefaults();
                        coreUIManager.applyTheme(defaultTheme.name, defaultTheme.mode);

                        coreUIManager.fullUIRefresh();
                        if (wasRunning || !gameLoop.isRunning()) setTimeout(() => gameLoop.start(), 100);
                    }},
                    { label: "Cancel", className:"bg-gray-600 hover:bg-gray-700", callback: () => coreUIManager.closeModal() }
                ]
            );
        });
    }

    if (devToolsButton) {
        devToolsButton.addEventListener('click', () => {
            loggingSystem.info("Main_DevTools", "Dev tools button clicked: Applying production multiplier.");
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

    // 11. Start Game Loop
    if (!gameLoop.isRunning()) gameLoop.start();
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
