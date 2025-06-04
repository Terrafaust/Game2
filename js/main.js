// js/main.js (v12)

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
import { coreResourceManager } = from './core/coreResourceManager.js';
import { coreUIManager } from './core/coreUIManager.js';
import { saveLoadSystem } from './core/saveLoadSystem.js';
import { gameLoop } from './core/gameLoop.js';
import { moduleLoader } from './core/moduleLoader.js';
import { coreUpgradeManager } from './core/coreUpgradeManager.js';


// --- Main Game Initialization Function ---
async function initializeGame() {
    // 1. Initialize Logging System (as early as possible)
    loggingSystem.setLogLevel(loggingSystem.levels.DEBUG);
    loggingSystem.info("Main", "Game initialization sequence started.");

    // 2. Initialize Global Settings Manager
    globalSettingsManager.initialize();

    // 3. Initialize Core Game State Manager (already initialized at definition)

    // 4. Initialize Static Data Aggregator (already initialized at definition)

    // 5. Initialize Core Resource Manager (already initialized at definition)

    // 6. Initialize Core UI Manager (requires DOM to be ready and is critical for notifications)
    // This MUST be initialized before any system attempts to use coreUIManager for notifications or UI updates.
    coreUIManager.initialize();

    // 7. Initialize Core Upgrade Manager
    coreUpgradeManager.initialize();

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
    // Now that coreUIManager and coreUpgradeManager are initialized, saveLoadSystem can safely use their methods.
    const gameLoaded = saveLoadSystem.loadGame();

    if (!gameLoaded) {
        loggingSystem.info("Main", "No save game found or loading failed. Starting a new game.");
        // Define initial resources for a new game
        staticDataAggregator.registerStaticData('core_resource_definitions', {
            studyPoints: {
                id: 'studyPoints',
                name: "Study Points",
                initialAmount: 0,
                isUnlocked: true,
                showInUI: true
            }
        });
        const spDef = staticDataAggregator.getData('core_resource_definitions.studyPoints');
        if (spDef) {
             coreResourceManager.defineResource(spDef.id, spDef.name, spDef.initialAmount, spDef.showInUI, spDef.isUnlocked);
        } else {
            loggingSystem.error("Main", "Failed to define initial Study Points resource from static data.");
        }
        coreGameStateManager.setGameVersion("0.1.0");
    }
    
    coreUIManager.updateResourceDisplay();
    coreUIManager.renderMenu();


    // 10. Initialize Module Loader
    // Pass ALL core systems to the moduleLoader so modules can access them.
    moduleLoader.initialize(staticDataAggregator, coreGameStateManager, coreResourceManager, coreUIManager, decimalUtility, loggingSystem, gameLoop, coreUpgradeManager);
    
    // 11. Load Game Modules
    try {
        // Using the path that was previously confirmed to work
        const coreGameplayModuleLoaded = await moduleLoader.loadModule('../../modules/core_gameplay_module/core_gameplay_manifest.js');
        
        if (coreGameplayModuleLoaded) {
            loggingSystem.info("Main", "Core gameplay module loading initiated and reported success by moduleLoader.");
        } else {
            loggingSystem.error("Main", "ModuleLoader reported failure to load core_gameplay_module. Game may not function correctly.");
            coreUIManager.showNotification("Critical Error: Core gameplay module failed to load. Game may not function correctly.", "error", 10000);
        }

        // Using the path that was previously confirmed to work
        const studiesModuleLoaded = await moduleLoader.loadModule('../../modules/studies_module/studies_manifest.js');

        if (studiesModuleLoaded) {
            loggingSystem.info("Main", "Studies module loading initiated and reported success by moduleLoader.");
        } else {
            loggingSystem.error("Main", "ModuleLoader reported failure to load studies_module. Game may not function correctly.");
            coreUIManager.showNotification("Critical Error: Studies module failed to load. Game may not function correctly.", "error", 10000);
        }

        // Using the path that was previously confirmed to work
        const commerceModuleLoaded = await moduleLoader.loadModule('../../modules/commerce_module/commerce_manifest.js');
        if (commerceModuleLoaded) {
            loggingSystem.info("Main", "Commerce module loading initiated and reported success by moduleLoader.");
        } else {
            loggingSystem.error("Main", "ModuleLoader reported failure to load commerce_module. Game may not function correctly.");
            coreUIManager.showNotification("Critical Error: Commerce module failed to load.", "error", 10000);
        }

        // Using the path that was previously confirmed to work
        const skillsModuleLoaded = await moduleLoader.loadModule('../../modules/skills_module/skills_manifest.js');
        if (skillsModuleLoaded) {
            loggingSystem.info("Main", "Skills module loading initiated and reported success by moduleLoader.");
        } else {
            loggingSystem.error("Main", "ModuleLoader reported failure to load skills_module. Game may not function correctly.");
            coreUIManager.showNotification("Critical Error: Skills module failed to load.", "error", 10000);
        }

        // Using the path that was previously confirmed to work
        const achievementsModuleLoaded = await moduleLoader.loadModule('../../modules/achievements_module/achievements_manifest.js');
        if (achievementsModuleLoaded) {
            loggingSystem.info("Main", "Achievements module loading initiated and reported success by moduleLoader.");
        } else {
            loggingSystem.error("Main", "ModuleLoader reported failure to load achievements_module. Game may not function correctly.");
            coreUIManager.showNotification("Critical Error: Achievements module failed to load.", "error", 10000);
        }

        // Using the path that was previously confirmed to work
        const settingsUIModuleLoaded = await moduleLoader.loadModule('../../modules/settings_ui_module/settings_ui_manifest.js');
        if (settingsUIModuleLoaded) {
            loggingSystem.info("Main", "Settings UI module loading initiated and reported success by moduleLoader.");
        } else {
            loggingSystem.error("Main", "ModuleLoader reported failure to load settings_ui_module. Game may not function correctly.");
            coreUIManager.showNotification("Critical Error: Settings UI module failed to load.", "error", 10000);
        }

        // Ensure studyPoints is unlocked after all modules have had a chance to initialize/load state
        coreResourceManager.unlockResource('studyPoints'); // Ensure studyPoints is always unlocked


    } catch (error) { // This catch is for unexpected errors from the await operation itself or if loadModule re-throws
        loggingSystem.error("Main", "Unhandled error during module loading attempt:", error);
        coreUIManager.showNotification("Critical Error: A module failed to load (unexpected error). Game may not function.", "error", 10000);
    }

    // 12. Attach Event Listeners for Global Buttons (Save, Load, Reset)
    const saveButton = document.getElementById('save-button');
    const loadButton = document.getElementById('load-button');
    const resetButton = document.getElementById('reset-button');
    const giveSpButton = document.getElementById('give-sp-button'); // Get the new button

    if (saveButton) saveButton.addEventListener('click', () => saveLoadSystem.saveGame());
    else loggingSystem.warn("Main", "Save button not found in DOM.");

    if (loadButton) {
        loadButton.addEventListener('click', () => {
            if (saveLoadSystem.loadGame()) {
                loggingSystem.info("Main", "Game loaded. Refreshing UI and notifying modules.");
                coreUIManager.fullUIRefresh();
                moduleLoader.notifyAllModulesOfLoad(); 
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
                            saveLoadSystem.resetGameData(); 
                            
                            // Re-define initial Study Points resource after reset
                            const spDef = staticDataAggregator.getData('core_resource_definitions.studyPoints');
                            if (spDef) {
                                coreResourceManager.defineResource(spDef.id, spDef.name, spDef.initialAmount, spDef.showInUI, spDef.isUnlocked);
                            }
                            coreGameStateManager.setGameVersion("0.1.0");
                            coreUIManager.closeModal();
                            coreUIManager.fullUIRefresh(); 
                            moduleLoader.resetAllModules(); 
                            moduleLoader.notifyAllModulesOfLoad(); // Treat as a new game load for modules
                            gameLoop.start();
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

    // Add event listener for the test button
    if (giveSpButton) {
        giveSpButton.addEventListener('click', () => {
            const amount = decimalUtility.new('1e11'); // 100,000,000,000 Study Points
            coreResourceManager.addAmount('studyPoints', amount);
            coreUIManager.showNotification(`+${decimalUtility.format(amount, 0)} Study Points (Test)!`, 'info', 2000);
            loggingSystem.info("Main", `Test: Added ${amount.toString()} Study Points.`);
        });
    } else {
        loggingSystem.warn("Main", "Give SP button not found in DOM.");
    }

    // 13. Start the Game Loop
    // Ensure it's started, especially if a load operation might have stopped it.
    if (!gameLoop.isRunning()) {
        gameLoop.start();
    }

    loggingSystem.info("Main", "Game initialization sequence complete. Game is running.");
}

// --- DOMContentLoaded Listener ---
document.addEventListener('DOMContentLoaded', () => {
    initializeGame().catch(error => {
        loggingSystem.error("Main", "Unhandled error during game initialization:", error);
        // Ensure coreUIManager is available even in a catastrophic error scenario
        // by making a direct check and fallback
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
