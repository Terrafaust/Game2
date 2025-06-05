// js/main.js (v9.1 - Pass globalSettingsManager to ModuleLoader v2.3)

/**
 * @file main.js
 * @description Main entry point for the incremental game.
 * v9.1: Passes globalSettingsManager to moduleLoader.initialize (compatible with moduleLoader v2.3).
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
    loggingSystem.info("Main", "Game initialization sequence started (v9.1 for moduleLoader v2.3).");

    // Initialize Core Systems that don't depend on others first
    // globalSettingsManager needs to be initialized before coreUIManager if UIManager applies theme on init.
    globalSettingsManager.initialize(); // Initializes and loads settings
    coreUpgradeManager.initialize();
    coreUIManager.initialize(); // Sets up UI elements

    // Apply initial theme settings after both managers are initialized
    const initialTheme = globalSettingsManager.getSetting('theme');
    if (initialTheme && initialTheme.name && initialTheme.mode) {
        coreUIManager.applyTheme(initialTheme.name, initialTheme.mode);
    }

    // Listen for theme changes from globalSettingsManager
    document.addEventListener('themeChanged', (event) => {
        const { name, mode } = event.detail;
        coreUIManager.applyTheme(name, mode);
        loggingSystem.debug("Main", `Theme changed event received: ${name}, ${mode}. Applied by CoreUIManager.`);
    });

    document.addEventListener('languageChanged', (event) => {
        // Placeholder for actual language application logic
        coreUIManager.showNotification(`Language setting changed to: ${event.detail}. (Localization TBD)`, 'info');
        loggingSystem.debug("Main", `Language changed event received: ${event.detail}.`);
    });

    // Initialize Module Loader
    // Order of arguments MUST match moduleLoader.js (v2.3) initialize method signature
    moduleLoader.initialize(
        staticDataAggregator,
        coreGameStateManager,
        coreResourceManager,
        coreUIManager,
        decimalUtility,
        loggingSystem, // Pass the imported loggingSystem instance itself
        gameLoop,
        coreUpgradeManager,
        globalSettingsManager // <<< Added globalSettingsManager here
    );

    // Load Game or Start New
    const gameLoaded = saveLoadSystem.loadGame(); // This loads state into managers
    if (!gameLoaded) {
        loggingSystem.info("Main", "No save game found. Starting a new game.");
        // Define core resources if it's a new game
        staticDataAggregator.registerStaticData('core_resource_definitions', {
            studyPoints: { id: 'studyPoints', name: "Study Points", initialAmount: "0", isUnlocked: true, showInUI: true, hasProductionRate: true },
            knowledge: { id: 'knowledge', name: "Knowledge", initialAmount: "0", isUnlocked: false, showInUI: true, hasProductionRate: true },
            images: { id: 'images', name: "Images", initialAmount: "0", isUnlocked: false, showInUI: true, hasProductionRate: false },
            studySkillPoints: { id: 'studySkillPoints', name: "Study Skill Points", initialAmount: "0", isUnlocked: false, showInUI: true, hasProductionRate: false },
        });

        const spDef = staticDataAggregator.getData('core_resource_definitions.studyPoints');
        if (spDef) {
             coreResourceManager.defineResource(spDef.id, spDef.name, decimalUtility.new(spDef.initialAmount), spDef.showInUI, spDef.isUnlocked, spDef.hasProductionRate);
        }
        coreGameStateManager.setGameVersion("0.5.2"); // Version for Stream 3 (SettingsUI fix with moduleLoader v2.3)
    } else {
        loggingSystem.info("Main", "Save game loaded.");
    }
    
    coreUIManager.updateResourceDisplay();

    // Load Game Modules
    try {
        loggingSystem.info("Main", "Loading CoreGameplay module...");
        await moduleLoader.loadModule('../../modules/core_gameplay_module/core_gameplay_manifest.js');
        loggingSystem.info("Main", "Loading Studies module...");
        await moduleLoader.loadModule('../../modules/studies_module/studies_manifest.js');
        loggingSystem.info("Main", "Loading Market module...");
        await moduleLoader.loadModule('../../modules/market_module/market_manifest.js');
        loggingSystem.info("Main", "Loading Skills module...");
        await moduleLoader.loadModule('../../modules/skills_module/skills_manifest.js');
        loggingSystem.info("Main", "Loading Achievements module...");
        await moduleLoader.loadModule('../../modules/achievements_module/achievements_manifest.js');
        loggingSystem.info("Main", "Loading SettingsUI module...");
        await moduleLoader.loadModule('../../modules/settings_ui_module/settings_ui_manifest.js');
        loggingSystem.info("Main", "All specified modules have been processed by moduleLoader.");
    } catch (error) {
        loggingSystem.error("Main", "Unhandled error during module loading attempts:", error, error.stack);
        coreUIManager.showNotification("Critical Error: A module failed to load. Game may not function as expected.", "error", 0);
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
            coreUIManager.showModal(
                "Load Game?",
                "Loading will overwrite your current unsaved progress. Are you sure?",
                [
                    {
                        label: "Load Game", className: "bg-blue-600 hover:bg-blue-700",
                        callback: () => {
                            const wasRunning = gameLoop.isRunning();
                            if (wasRunning) gameLoop.stop();
                            if (saveLoadSystem.loadGame()) {
                                moduleLoader.notifyAllModulesOfLoad();
                                coreUIManager.fullUIRefresh();
                                coreUIManager.showNotification("Game Loaded!", "success", 2000);
                            } else {
                                coreUIManager.showNotification("Failed to load game or no save data found.", "error", 3000);
                            }
                            if (wasRunning || !gameLoop.isRunning()) {
                                 setTimeout(() => gameLoop.start(), 100);
                            }
                            coreUIManager.closeModal();
                        }
                    },
                    { label: "Cancel", callback: () => coreUIManager.closeModal() }
                ]
            );
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
                            const wasRunning = gameLoop.isRunning();
                            if (wasRunning) gameLoop.stop();
                            saveLoadSystem.resetGameData();
                            const spDef = staticDataAggregator.getData('core_resource_definitions.studyPoints');
                            if (spDef) {
                                coreResourceManager.defineResource(spDef.id, spDef.name, decimalUtility.new(spDef.initialAmount), spDef.showInUI, spDef.isUnlocked, spDef.hasProductionRate);
                            }
                            coreGameStateManager.setGameVersion("0.5.2");
                            moduleLoader.resetAllModules();
                            moduleLoader.notifyAllModulesOfLoad();
                            coreUIManager.fullUIRefresh();
                            coreUIManager.showNotification("Game Reset to Defaults.", "warning", 3000);
                            if (wasRunning || !gameLoop.isRunning()) {
                                 setTimeout(() => gameLoop.start(), 100);
                            }
                            coreUIManager.closeModal();
                        }
                    },
                    { label: "Cancel", callback: () => coreUIManager.closeModal() }
                ]
            );
        });
    }

    if (devToolsButton) {
        devToolsButton.addEventListener('click', () => {
            coreResourceManager.addAmount('studyPoints', decimalUtility.new(100000));
            if(coreResourceManager.getResource('knowledge')){
                 coreResourceManager.addAmount('knowledge', decimalUtility.new(1000));
                 coreResourceManager.unlockResource('knowledge');
            }
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
                 coreUIManager.showNotification("A critical error occurred during game startup. Please check console & try refreshing.", "error", 0);
            } else {
                document.body.innerHTML = '<div style="color: white; background-color: #333; padding: 20px; font-family: sans-serif; text-align: center; border: 2px solid red;"><h1>Critical Error</h1><p>Game failed to start. Please check the browser console (F12) for details and try refreshing the page.</p></div>';
            }
        } catch (e) {
            console.error("CRITICAL FALLBACK: Error displaying startup error message.", e);
        }
    });
});
