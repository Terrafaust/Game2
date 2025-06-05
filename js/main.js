// js/main.js (v9.3 - Initialize coreResourceManager)

/**
 * @file main.js
 * @description Main entry point for the incremental game.
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
    loggingSystem.info("Main", "Game initialization sequence started (v9.3).");

    // Initialize Core Systems in an order that respects dependencies
    globalSettingsManager.initialize();
    coreResourceManager.initialize(); // <<< Initialize coreResourceManager
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

    // Initialize Module Loader - Ensure all core systems are passed
    // Order of arguments MUST match moduleLoader.js (v2.3.2) initialize method signature
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

    // Define ALL core resources that should exist from the start.
    const coreResourceDefinitions = {
        studyPoints: { id: 'studyPoints', name: "Study Points", initialAmount: "0", isUnlocked: true, showInUI: true, hasProductionRate: true },
        knowledge: { id: 'knowledge', name: "Knowledge", initialAmount: "0", isUnlocked: false, showInUI: true, hasProductionRate: true },
        images: { id: 'images', name: "Images", initialAmount: "0", isUnlocked: false, showInUI: true, hasProductionRate: false },
        studySkillPoints: { id: 'studySkillPoints', name: "Study Skill Points", initialAmount: "0", isUnlocked: false, showInUI: true, hasProductionRate: false }
    };
    staticDataAggregator.registerStaticData('core_resource_definitions', coreResourceDefinitions);


    // Load Game or Start New
    const gameLoaded = saveLoadSystem.loadGame();
    if (!gameLoaded) {
        loggingSystem.info("Main", "No save game found. Starting a new game.");
        coreGameStateManager.setGameVersion("0.5.4"); // Version for Stream 3 (Initialize coreResourceManager fix)

        // Define all core resources for a new game
        for (const resId in coreResourceDefinitions) {
            const resDef = coreResourceDefinitions[resId];
            if (resDef) {
                // Ensure coreResourceManager is ready before calling defineResource
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
        // Ensure resources defined in core_resource_definitions are known to coreResourceManager even on load
        for (const resId in coreResourceDefinitions) {
            // Ensure coreResourceManager and getResource are valid before calling
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

    // Load Game Modules
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

    // Attach Event Listeners for Global Buttons
    const saveButton = document.getElementById('save-button');
    const loadButton = document.getElementById('load-button');
    const resetButton = document.getElementById('reset-button');
    const devToolsButton = document.getElementById('dev-tools-button');

    if (saveButton) saveButton.addEventListener('click', () => {
        saveLoadSystem.saveGame();
        coreUIManager.showNotification("Game Saved!", "success", 2000);
    });

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
                        coreGameStateManager.setGameVersion("0.5.4");
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
            if (!(coreResourceManager && typeof coreResourceManager.addAmount === 'function' && typeof coreResourceManager.getResource === 'function' && typeof coreResourceManager.defineResource === 'function' && typeof coreResourceManager.unlockResource === 'function')) {
                loggingSystem.error("Main_DevTools", "coreResourceManager or its methods are not available.");
                coreUIManager.showNotification("Dev Tools Error: Resource Manager not ready.", "error");
                return;
            }

            coreResourceManager.addAmount('studyPoints', decimalUtility.new(100000));
            
            if (!coreResourceManager.getResource('knowledge')) {
                const resDef = staticDataAggregator.getData('core_resource_definitions.knowledge');
                if(resDef) {
                    coreResourceManager.defineResource(resDef.id, resDef.name, decimalUtility.new("0"), resDef.showInUI, false, resDef.hasProductionRate);
                    loggingSystem.info("Main_DevTools", "Defined 'knowledge' resource before dev interaction.");
                } else {
                    loggingSystem.error("Main_DevTools", "'knowledge' definition not found in staticDataAggregator.");
                    coreUIManager.showNotification("Dev Tools Error: Knowledge resource definition missing.", "error");
                    return;
                }
            }
            coreResourceManager.addAmount('knowledge', decimalUtility.new(1000));
            coreResourceManager.unlockResource('knowledge');
            coreUIManager.showNotification("Dev Tools: Added 100k SP & 1k Knowledge!", "info", 3000);
            coreUIManager.updateResourceDisplay();
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
