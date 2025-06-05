// js/main.js (v9.5 - Granular Debug for DevTools)

/**
 * @file main.js
 * @description Main entry point for the incremental game.
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
    loggingSystem.info("Main", "Game initialization sequence started (v9.5).");

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
        coreGameStateManager.setGameVersion("0.5.6"); // Version for Granular DevTools debug

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
                    loggingSystem.debug("Main_NewGame", `Defined core resource: ${resDef.id}`);
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
                        loggingSystem.debug("Main_GameLoad", `Ensured core resource definition for: ${resDef.id}`);
                    } else {
                         loggingSystem.error("Main_GameLoad", `coreResourceManager or defineResource not available for ensuring ${resDef.id}.`);
                    }
                }
            } else {
                 loggingSystem.error("Main_GameLoad", `coreResourceManager or getResource is not available for checking ${resId}.`);
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

    if (saveButton) { /* Event listener as in v9.3 */
        saveButton.addEventListener('click', () => {
            saveLoadSystem.saveGame();
            coreUIManager.showNotification("Game Saved!", "success", 2000);
        });
    }
    if (loadButton) { /* Event listener as in v9.3 */
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
    if (resetButton) { /* Event listener as in v9.3 */
        resetButton.addEventListener('click', () => {
            coreUIManager.showModal("Reset Game?", "All progress will be lost permanently. This cannot be undone. Are you sure?",
                [
                    { label: "Reset Game", className: "bg-red-600 hover:bg-red-700", callback: () => {
                        const wasRunning = gameLoop.isRunning();
                        if (wasRunning) gameLoop.stop();
                        saveLoadSystem.resetGameData();
                        coreGameStateManager.setGameVersion("0.5.6");
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

    // Enhanced logging and checking for devToolsButton
    if (devToolsButton) {
        loggingSystem.debug("Main_DevTools_Setup", "Setting up devToolsButton listener.");
        loggingSystem.debug("Main_DevTools_Setup", "coreResourceManager at listener setup (should be the imported object):", coreResourceManager);
        if(coreResourceManager){
            loggingSystem.debug("Main_DevTools_Setup", "typeof coreResourceManager.addAmount:", typeof coreResourceManager.addAmount);
            loggingSystem.debug("Main_DevTools_Setup", "typeof coreResourceManager.getResource:", typeof coreResourceManager.getResource);
            loggingSystem.debug("Main_DevTools_Setup", "typeof coreResourceManager.defineResource:", typeof coreResourceManager.defineResource);
            loggingSystem.debug("Main_DevTools_Setup", "typeof coreResourceManager.unlockResource:", typeof coreResourceManager.unlockResource);
        }

        devToolsButton.addEventListener('click', () => {
            loggingSystem.info("Main_DevTools", "Dev tools button clicked.");
            loggingSystem.debug("Main_DevTools_Click", "Accessing coreResourceManager (from module import scope) inside click handler:", coreResourceManager);

            if (!coreResourceManager) {
                loggingSystem.error("Main_DevTools_Click", "CRITICAL: coreResourceManager object itself is null or undefined at click time.");
                coreUIManager.showNotification("Dev Tools Error: CRITICAL - Resource Manager object not found. Check console.", "error");
                return;
            }

            const methodsState = {
                addAmount: { exists: 'addAmount' in coreResourceManager, type: typeof coreResourceManager.addAmount },
                getResource: { exists: 'getResource' in coreResourceManager, type: typeof coreResourceManager.getResource },
                defineResource: { exists: 'defineResource' in coreResourceManager, type: typeof coreResourceManager.defineResource },
                unlockResource: { exists: 'unlockResource' in coreResourceManager, type: typeof coreResourceManager.unlockResource }
            };

            loggingSystem.debug("Main_DevTools_Click", "State of coreResourceManager methods:", methodsState);

            let allMethodsFunctional = true;
            if (methodsState.addAmount.type !== 'function') {
                loggingSystem.error("Main_DevTools_Click", `coreResourceManager.addAmount is not a function. Type: ${methodsState.addAmount.type}, Exists: ${methodsState.addAmount.exists}`);
                allMethodsFunctional = false;
            }
            if (methodsState.getResource.type !== 'function') {
                loggingSystem.error("Main_DevTools_Click", `coreResourceManager.getResource is not a function. Type: ${methodsState.getResource.type}, Exists: ${methodsState.getResource.exists}`);
                allMethodsFunctional = false;
            }
            if (methodsState.defineResource.type !== 'function') {
                loggingSystem.error("Main_DevTools_Click", `coreResourceManager.defineResource is not a function. Type: ${methodsState.defineResource.type}, Exists: ${methodsState.defineResource.exists}`);
                allMethodsFunctional = false;
            }
            if (methodsState.unlockResource.type !== 'function') {
                loggingSystem.error("Main_DevTools_Click", `coreResourceManager.unlockResource is not a function. Type: ${methodsState.unlockResource.type}, Exists: ${methodsState.unlockResource.exists}`);
                allMethodsFunctional = false;
            }

            if (!allMethodsFunctional) {
                loggingSystem.error("Main_DevTools_Click", "One or more coreResourceManager methods are not functions. Dev tools cannot proceed.");
                coreUIManager.showNotification("Dev Tools Error: Resource Manager methods invalid. Check console.", "error");
                return;
            }

            loggingSystem.info("Main_DevTools_Click", "coreResourceManager and its methods appear to be available and functional.");

            coreResourceManager.addAmount('studyPoints', decimalUtility.new(100000));

            if (!coreResourceManager.getResource('knowledge')) {
                const resDef = staticDataAggregator.getData('core_resource_definitions.knowledge');
                if(resDef) {
                    coreResourceManager.defineResource(resDef.id, resDef.name, decimalUtility.new("0"), resDef.showInUI, false, resDef.hasProductionRate);
                    loggingSystem.info("Main_DevTools_Click", "Defined 'knowledge' resource before dev interaction.");
                } else {
                    loggingSystem.error("Main_DevTools_Click", "'knowledge' definition not found in staticDataAggregator.");
                    coreUIManager.showNotification("Dev Tools Error: Knowledge resource definition missing.", "error");
                    return;
                }
            }
            coreResourceManager.addAmount('knowledge', decimalUtility.new(1000));
            coreResourceManager.unlockResource('knowledge');
            coreUIManager.showNotification("Dev Tools: Added 100k SP & 1k Knowledge!", "info", 3000);
            coreUIManager.updateResourceDisplay();
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
