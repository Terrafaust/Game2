// game/js/main.js

/**
 * @fileoverview Main entry point for the Incremental Game.
 * This file orchestrates the initialization of the CoreEngine services
 * and the loading of various game modules.
 */

// Import core engine services.
// Assuming these are defined in separate files and made globally accessible,
// or imported via a build system. For this setup, we'll assume global access
// after their respective scripts are loaded in index.html.
// In a real module system, you'd use:
// import { DecimalUtility } from './core/decimalUtility.js';
// import { GameLoop } from './core/gameLoop.js';
// etc.

// Global references for core services (initialized in initGame).
let decimalUtility;
let loggingSystem;
let coreGameStateManager;
let coreResourceManager;
let coreUIManager;
let moduleLoader;
let saveLoadSystem;
let staticDataAggregator;
let gameLoop;

/**
 * Initializes the core game engine services.
 * This function sets up the foundational components of the game.
 */
function initializeCoreEngine() {
    // Initialize LoggingSystem first, as other components might use it.
    if (typeof LoggingSystem !== 'undefined') {
        loggingSystem = LoggingSystem;
        loggingSystem.log('LoggingSystem initialized.', 'main.js');
    } else {
        console.error('LoggingSystem not found!');
        // Provide a fallback if LoggingSystem is missing.
        loggingSystem = {
            log: console.log,
            warn: console.warn,
            error: console.error
        };
    }

    // Initialize DecimalUtility. Ensure break_infinity.min.js is loaded.
    if (typeof Decimal !== 'undefined' && typeof DecimalUtility !== 'undefined') {
        decimalUtility = DecimalUtility;
        decimalUtility.init(Decimal); // Pass the Decimal constructor to the utility.
        loggingSystem.log('DecimalUtility initialized.', 'main.js');
    } else {
        loggingSystem.error('Decimal.js or DecimalUtility not found! Large number calculations will fail.', 'main.js');
        // Fallback or error handling for missing Decimal.js
        decimalUtility = {
            new: (value) => new Number(value), // Fallback to native Number
            add: (a, b) => a + b,
            subtract: (a, b) => a - b,
            multiply: (a, b) => a * b,
            divide: (a, b) => a / b,
            pow: (base, exp) => Math.pow(base, exp),
            greaterThanOrEqualTo: (a, b) => a >= b,
            lessThanOrEqualTo: (a, b) => a <= b,
            format: (value) => value.toString()
        };
    }

    // Initialize other core services.
    // Pass dependencies during initialization.
    if (typeof CoreGameStateManager !== 'undefined') {
        coreGameStateManager = CoreGameStateManager;
        coreGameStateManager.init(loggingSystem);
        loggingSystem.log('CoreGameStateManager initialized.', 'main.js');
    } else {
        loggingSystem.error('CoreGameStateManager not found!', 'main.js');
    }

    if (typeof CoreResourceManager !== 'undefined') {
        coreResourceManager = CoreResourceManager;
        coreResourceManager.init(decimalUtility, loggingSystem);
        loggingSystem.log('CoreResourceManager initialized.', 'main.js');
    } else {
        loggingSystem.error('CoreResourceManager not found!', 'main.js');
    }

    if (typeof CoreUIManager !== 'undefined') {
        coreUIManager = CoreUIManager;
        coreUIManager.init(coreResourceManager, coreGameStateManager, loggingSystem, decimalUtility);
        loggingSystem.log('CoreUIManager initialized.', 'main.js');
    } else {
        loggingSystem.error('CoreUIManager not found!', 'main.js');
    }

    if (typeof ModuleLoader !== 'undefined') {
        moduleLoader = ModuleLoader;
        moduleLoader.init(loggingSystem);
        loggingSystem.log('ModuleLoader initialized.', 'main.js');
    } else {
        loggingSystem.error('ModuleLoader not found!', 'main.js');
    }

    if (typeof SaveLoadSystem !== 'undefined') {
        saveLoadSystem = SaveLoadSystem;
        saveLoadSystem.init(coreGameStateManager, coreResourceManager, loggingSystem, decimalUtility);
        loggingSystem.log('SaveLoadSystem initialized.', 'main.js');
    } else {
        loggingSystem.error('SaveLoadSystem not found!', 'main.js');
    }

    if (typeof StaticDataAggregator !== 'undefined') {
        staticDataAggregator = StaticDataAggregator;
        staticDataAggregator.init(loggingSystem);
        loggingSystem.log('StaticDataAggregator initialized.', 'main.js');
    } else {
        loggingSystem.error('StaticDataAggregator not found!', 'main.js');
    }

    // GameLoop needs references to other services for its update cycle.
    if (typeof GameLoop !== 'undefined') {
        gameLoop = GameLoop;
        gameLoop.init(coreUIManager, coreResourceManager, loggingSystem); // Pass coreUIManager and coreResourceManager for updates
        loggingSystem.log('GameLoop initialized.', 'main.js');
    } else {
        loggingSystem.error('GameLoop not found!', 'main.js');
    }

    // Attach global save/load/reset buttons.
    document.getElementById('save-button').addEventListener('click', () => {
        saveLoadSystem.saveGame();
        coreUIManager.showMessage('Game Saved!', 'success');
    });
    document.getElementById('load-button').addEventListener('click', () => {
        saveLoadSystem.loadGame();
        coreUIManager.showMessage('Game Loaded!', 'success');
    });
    document.getElementById('reset-button').addEventListener('click', () => {
        // In a real game, you'd want a confirmation modal here.
        if (confirm('Are you sure you want to hard reset your game? This cannot be undone!')) {
            saveLoadSystem.resetGame();
            coreUIManager.showMessage('Game Reset!', 'info');
        }
    });

}

/**
 * Loads all necessary game modules.
 * Modules are loaded in a specific order if dependencies exist.
 */
async function loadGameModules() {
    loggingSystem.log('Loading game modules...', 'main.js');

    // Define the paths to your module files.
    // The order here is important for dependencies.
    // CoreGameplay should be loaded before Studies as Studies depends on it.
    const modulePaths = [
        'js/modules/core_gameplay_module/core_gameplay_manifest.js',
        'js/modules/core_gameplay_module/core_gameplay_data.js',
        'js/modules/core_gameplay_module/core_gameplay_logic.js',
        'js/modules/core_gameplay_module/core_gameplay_ui.js',
        'js/modules/core_gameplay_module/core_gameplay_state.js',
        // Studies Module files - NEW
        'js/modules/studies_module/studies_manifest.js',
        'js/modules/studies_module/studies_data.js',
        'js/modules/studies_module/studies_logic.js',
        'js/modules/studies_module/studies_ui.js',
        'js/modules/studies_module/studies_state.js'
    ];

    // Load all module script files.
    await moduleLoader.loadModuleScripts(modulePaths);

    // After scripts are loaded, the manifests should be available globally.
    // Now, register and initialize modules via their manifests.
    // The ModuleLoader will handle dependencies and call init functions.
    await moduleLoader.registerAndInitializeModule(CoreGameplayManifest, {
        coreResourceManager,
        coreUIManager,
        coreGameStateManager,
        decimalUtility,
        gameLoop,
        saveLoadSystem,
        staticDataAggregator,
        loggingSystem
    });

    // Register and initialize the Studies module.
    // Ensure all core services are passed to its init function.
    await moduleLoader.registerAndInitializeModule(StudiesManifest, {
        coreResourceManager,
        coreUIManager,
        coreGameStateManager,
        decimalUtility,
        gameLoop,
        saveLoadSystem,
        staticDataAggregator,
        loggingSystem
    });

    loggingSystem.log('All game modules loaded and initialized.', 'main.js');
}

/**
 * The main game initialization function.
 * This is called when the DOM is fully loaded.
 */
async function initGame() {
    // 1. Initialize Core Engine services
    initializeCoreEngine();

    // Now loggingSystem is guaranteed to be initialized, so we can use it.
    loggingSystem.log('Initializing game...', 'main.js');

    // 2. Load game modules
    await loadGameModules();

    // 3. Load saved game state, or start a new one.
    // This needs to happen after all modules have registered their states.
    saveLoadSystem.loadGame();

    // 4. Initial UI render and update.
    // This will render the default active tab and resource bar.
    coreUIManager.renderInitialUI();

    // After loading, ensure all production rates are correctly applied.
    // This calls the logic functions of each module to update their production
    // with the CoreResourceManager based on loaded state.
    if (typeof CoreGameplayLogic !== 'undefined') {
        CoreGameplayLogic.updateAllProduction(); // For manual click production (if any)
    }
    if (typeof StudiesLogic !== 'undefined') {
        StudiesLogic.updateAllProducerProductions(); // Update production for Studies producers
        StudiesLogic.checkForGlobalUnlocks(); // Check global unlocks on load
    }


    // 5. Start the game loop.
    gameLoop.start();

    loggingSystem.log('Game initialized and started!', 'main.js');
}

// Ensure the DOM is fully loaded before initializing the game.
// This prevents issues with script trying to access elements that don't exist yet.
window.onload = initGame;
