// js/main.js (v9.6 - DevTools Production Multiplier)

/**
 * @file main.js
 * @description Main entry point for the incremental game.
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


// --- Main Game Initialization Function ---
async function initializeGame() {
    // 1. Initialize Logging System
    loggingSystem.setLogLevel(loggingSystem.levels.DEBUG);
    loggingSystem.info("Main", "Game initialization sequence started (v9.6).");

    // Initialize Core Systems in an order that respects dependencies
    globalSettingsManager.initialize();
    coreResourceManager.initialize();
    coreUpgradeManager.initialize();
    coreUIManager.initialize();

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
        knowledge: { id: 'knowledge', name: "Knowledge", initialAmount: "0", isUnlocked: false, showInUI: true, hasProductionRate: true },
        images: { id: 'images', name: "Images", initialAmount: "0", isUnlocked: false, showInUI: true, hasProductionRate: false },
        studySkillPoints: { id: 'studySkillPoints', name: "Study Skill Points", initialAmount: "0", isUnlocked: false, showInUI: true, hasProductionRate: false }
    };
    staticDataAggregator.registerStaticData('core_resource_definitions', coreResourceDefinitions);

    const gameLoaded = saveLoadSystem.loadGame();
    if (!gameLoaded) {
        loggingSystem.info("Main", "No save game found. Starting a new game.");
        coreGameStateManager.setGameVersion("0.5.7"); // Version for DevTools multiplier

        for (const resId in coreResourceDefinitions) {
            const resDef = coreResourceDefinitions[resId];
            if (resDef) {
                if (coreResourceManager && typeof coreResourceManager.defineResource === 'function') {
                    coreResourceManager.defineResource(
                        resDef.id,
                        resDef.name,
                        decimalUtility.new(resDef.initialAmount),
                        resDef.showInUI,
                        resDef.isUnlocked,
                        resDef.hasProductionRate !== undefined ? resDef.hasProductionRate : true
                    );
                } else {
                    loggingSystem.error("Main_NewGame", `coreResourceManager or defineResource is not available for ${resDef.id}.`);
                }
            }
        }
    } else {
        loggingSystem.info("Main", "Save game loaded.");
        for (const resId in coreResourceDefinitions) {
            if (coreResourceManager && typeof coreResourceManager.getResource === 'function') {
                if (!coreResourceManager.getResource(resId)) {
                    const resDef = coreResourceDefinitions[resId];
                    if (coreResourceManager && typeof coreResourceManager.defineResource === 'function') {
                        coreResourceManager.defineResource(
                            resDef.id,
                            resDef.name,
                            decimalUtility.new(resDef.initialAmount),
                            resDef.showInUI,
                            false,
                            resDef.hasProductionRate !== undefined ? resDef.hasProductionRate : true
                        );
                    }
                }
            }
        }
    }

    coreUIManager.updateResourceDisplay();

    try {
        await moduleLoader.loadModule('../../modules/core_gameplay_module/core_gameplay_manifest.js');
        await moduleLoader.loadModule('../../modules/studies_module/studies_manifest.js');
        await moduleLoader.loadModule('../../modules/market_module/market_manifest.js');
        await moduleLoader.loadModule('../../modules/skills_module/skills_manifest.js');
        await moduleLoader.loadModule('../../modules/achievements_module/achievements_manifest.js');
        await moduleLoader.loadModule('../../modules/settings_ui_module/settings_ui_manifest.js');
    } catch (error) {
        loggingSystem.error("Main", "Unhandled error during module loading attempts:", error, error.stack);
        coreUIManager.showNotification("Critical Error: A module failed to load.", "error", 0);
    }

    coreUIManager.fullUIRefresh();

    const saveButton = document.getElementById('save-button');
    const loadButton = document.getElementById('load-button');
    const resetButton = document.getElementById('reset-button');
    const devToolsButton = document.getElementById('dev-tools-button');

    if (saveButton) {
        saveButton.addEventListener('click', () => {
            saveLoadSystem.saveGame();
            coreUIManager.showNotification("Game Saved!", "success", 2000);
        });
    }
    if (loadButton) {
        loadButton.addEventListener('click', () => {
            coreUIManager.showModal( "Load Game?", "Loading will overwrite your current unsaved progress. Are you sure?",
                [
                    { label: "Load Game", className: "bg-blue-600 hover:bg-blue-700", callback: () => {
                        const wasRunning = gameLoop.isRunning();
                        if (wasRunning) gameLoop.stop();
                        if (saveLoadSystem.loadGame()) {
                            for (const resId in coreResourceDefinitions) {
                                if (coreResourceManager && typeof coreResourceManager.getResource === 'function' && !coreResourceManager.getResource(resId)) {
                                    const resDef = coreResourceDefinitions[resId];
                                     if (coreResourceManager && typeof coreResourceManager.defineResource === 'function') {
                                        coreResourceManager.defineResource(resDef.id, resDef.name, decimalUtility.new("0"), resDef.showInUI, false, resDef.hasProductionRate);
                                     }
                                }
                            }
                            moduleLoader.notifyAllModulesOfLoad();
                            coreUIManager.fullUIRefresh();
                            coreUIManager.showNotification("Game Loaded!", "success", 2000);
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
            coreUIManager.showModal("Reset Game?", "All progress will be lost permanently. This cannot be undone. Are you sure?",
                [
                    { label: "Reset Game", className: "bg-red-600 hover:bg-red-700", callback: () => {
                        const wasRunning = gameLoop.isRunning();
                        if (wasRunning) gameLoop.stop();
                        saveLoadSystem.resetGameData();
                        coreGameStateManager.setGameVersion("0.5.7");
                        for (const resId in coreResourceDefinitions) {
                            const resDef = coreResourceDefinitions[resId];
                            if (coreResourceManager && typeof coreResourceManager.defineResource === 'function') {
                                coreResourceManager.defineResource(resDef.id, resDef.name, decimalUtility.new(resDef.initialAmount), resDef.showInUI, resDef.isUnlocked, resDef.hasProductionRate);
                            }
                        }
                        moduleLoader.resetAllModules();
                        moduleLoader.notifyAllModulesOfLoad();
                        coreUIManager.fullUIRefresh();
                        coreUIManager.showNotification("Game Reset to Defaults.", "warning", 3000);
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

            const crmReady = coreResourceManager &&
                             typeof coreResourceManager.getAllResources === 'function' &&
                             typeof coreResourceManager.getProductionFromSource === 'function' &&
                             typeof coreResourceManager.setProductionPerSecond === 'function';

            if (!crmReady) {
                loggingSystem.error("Main_DevTools", "coreResourceManager or its necessary methods (getAllResources, getProductionFromSource, setProductionPerSecond) are not available.");
                coreUIManager.showNotification("Dev Tools Error: Resource Manager methods missing for multiplier. Check console.", "error");
                return;
            }

            const boostFactor = decimalUtility.new(100000);
            let changesMade = false;
            const allResources = coreResourceManager.getAllResources(); // Gets a copy

            for (const resourceId in allResources) {
                const resource = allResources[resourceId]; // This is a copy from getAllResources
                // We need to interact with the live resource manager using resourceId for actual resource object.
                const liveResourceData = coreResourceManager.getResource(resourceId); // Get live data to check productionSources

                if (liveResourceData && liveResourceData.productionSources && liveResourceData.hasProductionRate) {
                    loggingSystem.debug("Main_DevTools", `Processing resource: ${resourceId}`);
                    for (const sourceKey in liveResourceData.productionSources) {
                        const currentProd = coreResourceManager.getProductionFromSource(resourceId, sourceKey);
                        if (decimalUtility.neq(currentProd, 0)) {
                            const boostedProd = decimalUtility.multiply(currentProd, boostFactor);
                            coreResourceManager.setProductionPerSecond(resourceId, sourceKey, boostedProd);
                            loggingSystem.info("Main_DevTools", `Resource '${resourceId}', source '${sourceKey}': production boosted from ${currentProd.toString()} to ${boostedProd.toString()}`);
                            changesMade = true;
                        }
                    }
                }
            }

            if (changesMade) {
                coreUIManager.showNotification(`Developer Boost: All active productions x${boostFactor.toString()}!`, "warning", 5000);
                coreUIManager.updateResourceDisplay(); // Crucial to see the new rates
                // Consider fullUIRefresh if module UIs also display these rates and need updating
                // coreUIManager.fullUIRefresh();
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
