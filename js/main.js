// js/main.js (v5)

/**
 * @file main.js
 * @description Main entry point for the incremental game.
 * Initializes all core systems, loads game data, sets up initial game state,
 * loads modules, and starts the game loop.
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
    // 1. Initialize Logging System (as early as possible)
    loggingSystem.setLogLevel(loggingSystem.levels.DEBUG);
    loggingSystem.info("Main", "Game initialization sequence started (v5).");

    // 2. Initialize Global Settings Manager
    globalSettingsManager.initialize();

    // 3. Initialize Core Game State Manager
    // coreGameStateManager.initialize(); // Already initialized at definition

    // 4. Initialize Static Data Aggregator
    // staticDataAggregator is an object, no specific init function needed other than its definition

    // 5. Initialize Core Resource Manager
    // coreResourceManager.initialize(); // Already initialized at end of its file

    // 6. Initialize Core Upgrade Manager
    coreUpgradeManager.initialize();

    // 7. Initialize Core UI Manager (requires DOM to be ready)
    // Removed: coreUIManager.coreSystems = { staticDataAggregator };
    // coreUIManager now imports staticDataAggregator directly.
    coreUIManager.initialize();


    // 8. Apply initial theme from settings and set up listeners
    const initialTheme = globalSettingsManager.getSetting('theme');
    if (initialTheme && initialTheme.name && initialTheme.mode) {
        coreUIManager.applyTheme(initialTheme.name, initialTheme.mode);
    }
    document.addEventListener('themeChanged', (event) => {
        const { name, mode } = event.detail;
        coreUIManager.applyTheme(name, mode);
        loggingSystem.info("Main", `Theme changed to ${name} (${mode}) via event.`);
    });
    document.addEventListener('languageChanged', (event) => {
        const lang = event.detail;
        loggingSystem.info("Main", `Language changed to ${lang} via event. Localization not yet implemented.`);
        coreUIManager.showNotification(`Language set to ${lang} (Localization TBD)`, 'info');
    });


    // 9. Initialize Save/Load System & Attempt to Load Game
    const gameLoaded = saveLoadSystem.loadGame(); // This might call coreUIManager.updateResourceDisplay

    if (!gameLoaded) {
        loggingSystem.info("Main", "No save game found or loading failed. Starting a new game.");
        staticDataAggregator.registerStaticData('core_resource_definitions', {
            studyPoints: {
                id: 'studyPoints',
                name: "Study Points",
                initialAmount: "0",
                isUnlocked: true,
                showInUI: true,
                hasProductionRate: true
            }
        });
        const spDef = staticDataAggregator.getData('core_resource_definitions.studyPoints');
        if (spDef) {
             coreResourceManager.defineResource(spDef.id, spDef.name, decimalUtility.new(spDef.initialAmount), spDef.showInUI, spDef.isUnlocked);
        } else {
            loggingSystem.error("Main", "Failed to define initial Study Points resource from static data.");
        }
        coreGameStateManager.setGameVersion("0.3.0");
    }
    
    // Ensure resource display and menu are up-to-date after potential load or new game setup.
    // UIManager.initialize() already calls these, but a call here ensures it happens *after* save/load.
    coreUIManager.updateResourceDisplay();
    coreUIManager.renderMenu();


    // 10. Initialize Module Loader
    moduleLoader.initialize(
        staticDataAggregator,
        coreGameStateManager,
        coreResourceManager,
        coreUIManager,
        decimalUtility,
        loggingSystem,
        gameLoop,
        coreUpgradeManager
    );
    
    // 11. Load Game Modules
    try {
        await moduleLoader.loadModule('../../modules/core_gameplay_module/core_gameplay_manifest.js');
        await moduleLoader.loadModule('../../modules/studies_module/studies_manifest.js');
        await moduleLoader.loadModule('../../modules/market_module/market_manifest.js');
        await moduleLoader.loadModule('../../modules/skills_module/skills_manifest.js');

        // TODO: Add loading for Achievements, SettingsUI modules

    } catch (error) {
        loggingSystem.error("Main", "Unhandled error during module loading attempts:", error);
        coreUIManager.showNotification("Critical Error: A module failed to load. Game may not function.", "error", 0);
    }

    // 12. Attach Event Listeners for Global Buttons (Save, Load, Reset)
    const saveButton = document.getElementById('save-button');
    const loadButton = document.getElementById('load-button');
    const resetButton = document.getElementById('reset-button');

    if (saveButton) saveButton.addEventListener('click', () => saveLoadSystem.saveGame());
    else loggingSystem.warn("Main", "Save button not found in DOM.");

    if (loadButton) {
        loadButton.addEventListener('click', () => {
            const wasRunning = gameLoop.isRunning();
            if (wasRunning) gameLoop.stop();
            if (saveLoadSystem.loadGame()) { // This calls fullUIRefresh internally
                loggingSystem.info("Main", "Game loaded. Refreshing UI and notifying modules.");
                moduleLoader.notifyAllModulesOfLoad(); 
                // coreUIManager.fullUIRefresh(); // Already called by saveLoadSystem on successful load
            }
            if (wasRunning || !gameLoop.isRunning()) {
                 setTimeout(() => gameLoop.start(), 100); 
            }
        });
    } else {
        loggingSystem.warn("Main", "Load button not found in DOM.");
    }

    if (resetButton) {
        resetButton.addEventListener('click', () => {
            coreUIManager.showModal(
                "Reset Game?",
                "All progress will be lost permanently. This cannot be undone. Are you sure you want to reset the game to its initial state?",
                [
                    {
                        label: "Reset Game",
                        className: "bg-red-600 hover:bg-red-700",
                        callback: () => {
                            gameLoop.stop();
                            saveLoadSystem.resetGameData(); // This calls fullUIRefresh internally
                            const spDef = staticDataAggregator.getData('core_resource_definitions.studyPoints');
                            if (spDef) {
                                coreResourceManager.defineResource(spDef.id, spDef.name, decimalUtility.new(spDef.initialAmount), spDef.showInUI, spDef.isUnlocked);
                            }
                            coreGameStateManager.setGameVersion("0.3.0"); 
                            coreUIManager.closeModal();
                            // coreUIManager.fullUIRefresh(); // Already called by saveLoadSystem.resetGameData
                            moduleLoader.resetAllModules(); 
                            moduleLoader.notifyAllModulesOfLoad();
                            setTimeout(() => gameLoop.start(), 100);
                            loggingSystem.info("Main", "Game reset and restarted.");
                        }
                    },
                    {
                        label: "Cancel",
                        className: "bg-gray-500 hover:bg-gray-600",
                        callback: () => coreUIManager.closeModal()
                    }
                ]
            );
        });
    } else {
        loggingSystem.warn("Main", "Reset button not found in DOM.");
    }

    // 13. Start the Game Loop
    if (!gameLoop.isRunning()) {
        gameLoop.start();
    }

    loggingSystem.info("Main", "Game initialization sequence complete. Game is running.");
}

// --- DOMContentLoaded Listener ---
document.addEventListener('DOMContentLoaded', () => {
    initializeGame().catch(error => {
        loggingSystem.error("Main", "Unhandled error during game initialization:", error);
        if (typeof coreUIManager !== 'undefined' && coreUIManager.showNotification) {
             coreUIManager.showNotification("A critical error occurred during game startup. Please try refreshing. If the problem persists, a reset might be needed.", "error", 0);
        } else {
            const body = document.querySelector('body');
            if (body) {
                body.innerHTML = '<div style="color: red; padding: 20px; font-family: sans-serif; text-align: center;"><h1>Critical Error</h1><p>Game failed to start. Please try refreshing. If the problem persists, data might be corrupted.</p></div>';
            }
        }
    });
});
