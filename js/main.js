// js/main.js (v9 - SettingsUI Load)

/**
 * @file main.js
 * @description Main entry point for the incremental game.
 * v9: Loads SettingsUI module.
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
    loggingSystem.info("Main", "Game initialization sequence started (v9).");

    // Initialize Core Systems
    globalSettingsManager.initialize();
    coreUpgradeManager.initialize();
    coreUIManager.initialize(); 

    // Apply initial theme
    const initialTheme = globalSettingsManager.getSetting('theme');
    if (initialTheme && initialTheme.name && initialTheme.mode) {
        coreUIManager.applyTheme(initialTheme.name, initialTheme.mode);
    }
    document.addEventListener('themeChanged', (event) => {
        const { name, mode } = event.detail;
        coreUIManager.applyTheme(name, mode);
    });
    document.addEventListener('languageChanged', (event) => {
        coreUIManager.showNotification(`Language set to ${event.detail} (Localization TBD)`, 'info');
    });

    // Load Game or Start New
    const gameLoaded = saveLoadSystem.loadGame();
    if (!gameLoaded) {
        loggingSystem.info("Main", "No save game found. Starting a new game.");
        staticDataAggregator.registerStaticData('core_resource_definitions', {
            studyPoints: { id: 'studyPoints', name: "Study Points", initialAmount: "0", isUnlocked: true, showInUI: true, hasProductionRate: true }
        });
        const spDef = staticDataAggregator.getData('core_resource_definitions.studyPoints');
        if (spDef) {
             coreResourceManager.defineResource(spDef.id, spDef.name, decimalUtility.new(spDef.initialAmount), spDef.showInUI, spDef.isUnlocked);
        }
        coreGameStateManager.setGameVersion("0.5.0"); // Version for Stream 3 Complete (SettingsUI)
    }
    
    coreUIManager.updateResourceDisplay();
    coreUIManager.renderMenu();

    // Initialize Module Loader
    moduleLoader.initialize(
        staticDataAggregator, coreGameStateManager, coreResourceManager, coreUIManager,
        decimalUtility, loggingSystem, gameLoop, coreUpgradeManager
    );
    
    // Load Game Modules
    try {
        await moduleLoader.loadModule('../../modules/core_gameplay_module/core_gameplay_manifest.js');
        await moduleLoader.loadModule('../../modules/studies_module/studies_manifest.js');
        await moduleLoader.loadModule('../../modules/market_module/market_manifest.js');
        await moduleLoader.loadModule('../../modules/skills_module/skills_manifest.js');
        await moduleLoader.loadModule('../../modules/achievements_module/achievements_manifest.js');
        await moduleLoader.loadModule('../../modules/settings_ui_module/settings_ui_manifest.js'); // Load SettingsUI

    } catch (error) {
        loggingSystem.error("Main", "Unhandled error during module loading attempts:", error);
        coreUIManager.showNotification("Critical Error: A module failed to load. Game may not function.", "error", 0);
    }

    // Attach Event Listeners for Global Buttons
    const saveButton = document.getElementById('save-button');
    const loadButton = document.getElementById('load-button');
    const resetButton = document.getElementById('reset-button');
    const devToolsButton = document.getElementById('dev-tools-button');

    if (saveButton) saveButton.addEventListener('click', () => saveLoadSystem.saveGame());
    if (loadButton) {
        loadButton.addEventListener('click', () => {
            const wasRunning = gameLoop.isRunning();
            if (wasRunning) gameLoop.stop();
            if (saveLoadSystem.loadGame()) {
                moduleLoader.notifyAllModulesOfLoad(); 
            }
            if (wasRunning || !gameLoop.isRunning()) {
                 setTimeout(() => gameLoop.start(), 100); 
            }
        });
    }
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            coreUIManager.showModal(
                "Reset Game?",
                "All progress will be lost permanently. This cannot be undone. Are you sure you want to reset the game to its initial state?",
                [
                    {
                        label: "Reset Game", className: "bg-red-600 hover:bg-red-700",
                        callback: () => {
                            gameLoop.stop();
                            saveLoadSystem.resetGameData(); 
                            const spDef = staticDataAggregator.getData('core_resource_definitions.studyPoints');
                            if (spDef) {
                                coreResourceManager.defineResource(spDef.id, spDef.name, decimalUtility.new(spDef.initialAmount), spDef.showInUI, spDef.isUnlocked);
                            }
                            coreGameStateManager.setGameVersion("0.5.0"); 
                            coreUIManager.closeModal();
                            moduleLoader.resetAllModules(); 
                            moduleLoader.notifyAllModulesOfLoad();
                            setTimeout(() => gameLoop.start(), 100);
                        }
                    },
                    { label: "Cancel", className: "bg-gray-500 hover:bg-gray-600", callback: () => coreUIManager.closeModal() }
                ]
            );
        });
    }
    if (devToolsButton) {
        devToolsButton.addEventListener('click', () => {
            const boostFactor = 100000; 
            loggingSystem.info("Main_DevTools", `Applying x${boostFactor} production boost.`);
            const allResourceIds = Object.keys(coreResourceManager.getAllResources());
            for (const resourceId of allResourceIds) {
                const resourceDetails = coreResourceManager.getAllResources()[resourceId];
                if (resourceDetails && resourceDetails.productionSources) {
                    Object.keys(resourceDetails.productionSources).forEach(sourceKey => {
                        const currentProd = coreResourceManager.getProductionFromSource(resourceId, sourceKey);
                        if (decimalUtility.neq(currentProd, 0)) {
                            const boostedProd = decimalUtility.multiply(currentProd, boostFactor);
                            coreResourceManager.setProductionPerSecond(resourceId, sourceKey, boostedProd);
                        }
                    });
                }
            }
            coreUIManager.showNotification(`Developer Boost: All active production x${boostFactor}!`, "warning", 5000);
        });
    }

    if (!gameLoop.isRunning()) {
        gameLoop.start();
    }
    loggingSystem.info("Main", "Game initialization sequence complete. Game is running.");
}

document.addEventListener('DOMContentLoaded', () => {
    initializeGame().catch(error => {
        loggingSystem.error("Main", "Unhandled error during game initialization:", error);
        if (typeof coreUIManager !== 'undefined' && coreUIManager.showNotification) {
             coreUIManager.showNotification("A critical error occurred during game startup. Try refreshing.", "error", 0);
        } else {
            document.body.innerHTML = '<div style="color: red; padding: 20px; font-family: sans-serif; text-align: center;"><h1>Critical Error</h1><p>Game failed to start. Please try refreshing.</p></div>';
        }
    });
});
