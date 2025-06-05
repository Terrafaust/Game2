// js/main.js (v9.7 - Initialize CoreGameStateManager)

/**
 * @file main.js
 * @description Main entry point for the incremental game.
 * v9.7: Explicitly initializes coreGameStateManager.
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
    loggingSystem.setLogLevel(loggingSystem.levels.DEBUG);
    loggingSystem.info("Main", "Game initialization sequence started (v9.7).");

    // Initialize Core Systems in an order that respects dependencies
    coreGameStateManager.initialize(); // <<< Initialize CoreGameStateManager first
    globalSettingsManager.initialize();
    coreResourceManager.initialize();
    coreUpgradeManager.initialize();
    coreUIManager.initialize(); // coreUIManager might depend on coreResourceManager

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

    // Initialize Module Loader - Pass initialized core systems
    moduleLoader.initialize(
        staticDataAggregator,
        coreGameStateManager, // Now passing the initialized instance
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

    // Load Game or Start New - saveLoadSystem will use the already initialized coreGameStateManager
    const gameLoaded = saveLoadSystem.loadGame();
    if (!gameLoaded) {
        loggingSystem.info("Main", "No save game found. Starting a new game.");
        // Game version is set within coreGameStateManager.initialize() or setFullGameState()
        // but we can ensure it's the latest here if needed.
        coreGameStateManager.setGameVersion("0.5.8"); // Version for CGSManager init fix

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
        coreGameStateManager.setGameVersion("0.5.8"); // Also update version on load if save is older
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

    // Register gameLoop update for coreGameStateManager play time tracking
    if (gameLoop && typeof gameLoop.registerUpdateCallback === 'function' && coreGameStateManager && typeof coreGameStateManager.updatePlayTime === 'function') {
        gameLoop.registerUpdateCallback('coreGameStateUpdate', (deltaTime) => {
            coreGameStateManager.updatePlayTime(deltaTime);
        });
        loggingSystem.info("Main", "Registered coreGameStateManager.updatePlayTime with gameLoop.");
    } else {
        loggingSystem.error("Main", "Failed to register coreGameStateManager.updatePlayTime with gameLoop. Necessary components missing.");
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

    if (saveButton) { /* ... (save button listener) ... */ }
    if (loadButton) { /* ... (load button listener) ... */ }
    if (resetButton) { /* ... (reset button listener) ... */ }
    if (devToolsButton) { /* ... (dev tools button listener from v9.6) ... */
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
            const allResources = coreResourceManager.getAllResources();

            for (const resourceId in allResources) {
                const resource = allResources[resourceId];
                const liveResourceData = coreResourceManager.getResource(resourceId);

                if (liveResourceData && liveResourceData.productionSources && liveResourceData.hasProductionRate) {
                    loggingSystem.debug("Main_DevTools", `Processing resource: ${resourceId}`);
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
