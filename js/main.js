// js/main.js

/**
 * @file main.js
 * @description Main entry point for the incremental game.
 * Initializes all core systems, loads game data, sets up initial game state,
 * loads modules, and starts the game loop.
 */

// --- Core System Imports ---
import { loggingSystem } from './core/loggingSystem.js';
import { decimalUtility } from './core/decimalUtility.js'; // Though not directly used here, good to acknowledge
import { globalSettingsManager } from './core/globalSettingsManager.js';
import { coreGameStateManager } from './core/coreGameStateManager.js';
import { staticDataAggregator } from './core/staticDataAggregator.js';
import { coreResourceManager } from './core/coreResourceManager.js';
import { coreUIManager } from './core/coreUIManager.js';
import { saveLoadSystem } from './core/saveLoadSystem.js';
import { gameLoop } from './core/gameLoop.js';
import { moduleLoader } from './core/moduleLoader.js'; // Will be created later

// --- Module Imports (Example for Stream 1) ---
// These will be loaded by moduleLoader eventually, but for Stream 1, we might load core_gameplay directly.
// For now, let moduleLoader handle this.
// import { initialize as initializeCoreGameplayModule } from './modules/core_gameplay_module/core_gameplay_main.js';


// --- Main Game Initialization Function ---
async function initializeGame() {
    // 1. Initialize Logging System (as early as possible)
    // loggingSystem is already initialized at definition, but we can set specific levels here if needed.
    loggingSystem.setLogLevel(loggingSystem.levels.DEBUG); // Or higher for production
    loggingSystem.info("Main", "Game initialization sequence started.");

    // 2. Initialize Global Settings Manager
    globalSettingsManager.initialize(); // Loads settings from localStorage

    // 3. Initialize Core Game State Manager
    // coreGameStateManager is initialized at definition.
    // saveLoadSystem will populate it if a save is found.

    // 4. Initialize Static Data Aggregator
    // staticDataAggregator is initialized at definition. Modules will register data later.

    // 5. Initialize Core Resource Manager
    // coreResourceManager is initialized at definition.
    // saveLoadSystem will populate it or initial resources will be defined.

    // 6. Initialize Core UI Manager (requires DOM to be ready)
    coreUIManager.initialize();

    // 7. Apply initial theme from settings
    // Listen for theme changes from globalSettingsManager
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
        // Placeholder for language application logic
        loggingSystem.info("Main", `Language changed to ${lang} via event. Localization not yet implemented.`);
        coreUIManager.showNotification(`Language set to ${lang} (Localization TBD)`, 'info');
    });


    // 8. Initialize Save/Load System & Attempt to Load Game
    // saveLoadSystem is initialized at definition.
    const gameLoaded = saveLoadSystem.loadGame();

    if (!gameLoaded) {
        loggingSystem.info("Main", "No save game found or loading failed. Starting a new game.");
        // If starting a new game, define initial resources as per Stream 1
        // This resource definition should ideally come from a module's static data.
        // For Stream 1, "Study Points" is the first resource.
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
        coreGameStateManager.setGameVersion("0.1.0"); // Set initial version for new game
    }
    
    // Ensure UI reflects loaded or new state
    coreUIManager.updateResourceDisplay(); // Crucial after load or new game setup
    coreUIManager.renderMenu(); // Render menu based on (potentially) loaded module states/flags


    // 9. Initialize Module Loader
    // This will eventually load all game modules based on their manifests and dependencies.
    moduleLoader.initialize(staticDataAggregator, coreGameStateManager, coreResourceManager, coreUIManager, decimalUtility, loggingSystem);
    
    // 10. Load Game Modules
    // For Stream 1, we need the 'CoreGameplay' module.
    // The module loader will handle the actual loading process.
    // We just need to tell it which modules to load initially or based on game state.
    try {
        // In a full system, moduleLoader.loadInitialModules() or similar would be called.
        // For Stream 1, we'll explicitly load the core gameplay module.
        // This path will need to be correct.
        await moduleLoader.loadModule('./modules/core_gameplay_module/core_gameplay_manifest.js');
        loggingSystem.info("Main", "Core gameplay module loading initiated by moduleLoader.");
    } catch (error) {
        loggingSystem.error("Main", "Failed to load core_gameplay_module:", error);
        coreUIManager.showNotification("Critical Error: Core gameplay module failed to load. Game may not function.", "error", 10000);
    }

    // 11. Attach Event Listeners for Global Buttons (Save, Load, Reset)
    const saveButton = document.getElementById('save-button');
    const loadButton = document.getElementById('load-button');
    const resetButton = document.getElementById('reset-button');

    if (saveButton) {
        saveButton.addEventListener('click', () => {
            saveLoadSystem.saveGame();
        });
    } else {
        loggingSystem.warn("Main", "Save button not found in DOM.");
    }

    if (loadButton) {
        loadButton.addEventListener('click', () => {
            // Optional: Add a confirmation modal before loading if game is in progress
            // coreUIManager.showModal("Load Game?", "Unsaved progress will be lost. Are you sure you want to load?", [
            //     { label: "Load", callback: () => { saveLoadSystem.loadGame(); gameLoop.stop(); setTimeout(initializeGame, 100); /* Reload game */ }, className: "bg-blue-500" },
            //     { label: "Cancel", callback: () => coreUIManager.closeModal(), className: "bg-gray-500" }
            // ]);
            // For now, direct load:
            if (saveLoadSystem.loadGame()) {
                // A full reload/re-initialization might be needed to correctly apply loaded state to all systems
                // and especially to re-render UI from scratch based on the new state.
                loggingSystem.info("Main", "Game loaded. Restarting game systems to apply changes...");
                gameLoop.stop(); // Stop current loop
                // A more robust solution might involve re-running parts of initializeGame or having systems
                // explicitly re-initialize from the newly loaded state.
                // For now, let's assume dependent systems (UI, modules) refresh correctly.
                // coreUIManager.fullUIRefresh(); // Make sure UI updates
                // moduleLoader.reloadAllModulesFromState(); // Hypothetical: tell modules to re-init with new state
                
                // Simplest for now: full page reload after load. User might prefer no reload.
                // window.location.reload(); 
                // Or, try to re-initialize more gracefully:
                // This is tricky. For now, loadGame handles applying state, and UI should update.
                // If modules need to re-run their init logic based on new state, that's more complex.
                // Let's assume coreUIManager.fullUIRefresh() and module-specific updates handle it.
                 coreUIManager.fullUIRefresh();
                 moduleLoader.notifyAllModulesOfLoad(); // A function for modules to react to a game load
                 gameLoop.start(); // Restart game loop if it was stopped
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
                            saveLoadSystem.resetGameData(); // This also calls coreUIManager.fullUIRefresh()
                            // Re-initialize essential parts for a new game state
                            // Define initial resources again as resetGameData clears them
                            const spDef = staticDataAggregator.getData('core_resource_definitions.studyPoints');
                            if (spDef) {
                                coreResourceManager.defineResource(spDef.id, spDef.name, spDef.initialAmount, spDef.showInUI, spDef.isUnlocked);
                            }
                            coreGameStateManager.setGameVersion("0.1.0");
                            coreUIManager.closeModal();
                            coreUIManager.fullUIRefresh(); // Ensure UI is clean
                            moduleLoader.resetAllModules(); // Tell modules to reset their state
                            moduleLoader.notifyAllModulesOfLoad(); // Effectively a "new game" load
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

    // 12. Start the Game Loop
    gameLoop.start();

    loggingSystem.info("Main", "Game initialization sequence complete. Game is running.");
    coreUIManager.showNotification("Game Loaded Successfully!", "success", 2000);
}

// --- DOMContentLoaded Listener ---
// Ensures the DOM is fully loaded before trying to access/manipulate elements.
document.addEventListener('DOMContentLoaded', () => {
    initializeGame().catch(error => {
        loggingSystem.error("Main", "Unhandled error during game initialization:", error);
        // Display a critical error message to the user if UI is available
        if (coreUIManager && coreUIManager.showNotification) {
             coreUIManager.showNotification("A critical error occurred during game startup. Please try refreshing. If the problem persists, a reset might be needed.", "error", 0); // 0 duration = persistent
        } else {
            const body = document.querySelector('body');
            if (body) {
                body.innerHTML = '<div style="color: red; padding: 20px; font-family: sans-serif; text-align: center;"><h1>Critical Error</h1><p>Game failed to start. Please try refreshing. If the problem persists, data might be corrupted.</p></div>';
            }
        }
    });
});
