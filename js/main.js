// js/main.js (v12.8 - Correct Lifecycle Order)
// Fixes the module loading lifecycle by notifying modules of a game load
// *after* all modules have been loaded, not before. This ensures they can
// correctly initialize their state from the save data before the UI is drawn.

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
import { buyMultiplierManager } from './core/buyMultiplierManager.js';
import { buyMultiplierUI } from './core/buyMultiplierUI.js';
import { productionManager } from './core/productionManager.js';
import { translationManager } from './core/translationManager.js';
import { MODULES, RESOURCES } from './core/constants.js';

// --- Main Game Initialization Function ---
async function initializeGame() {
    // 1. Initialize core systems that don't depend on others.
    loggingSystem.setLogLevel(loggingSystem.levels.DEBUG);
    globalSettingsManager.initialize();
    coreGameStateManager.initialize();
    coreResourceManager.initialize();
    coreUpgradeManager.initialize();
    buyMultiplierManager.initialize();

    // 2. Create the `coreSystems` object to pass to all dependent systems.
    const coreSystems = {
        loggingSystem, decimalUtility, globalSettingsManager, translationManager,
        coreGameStateManager, staticDataAggregator, coreResourceManager,
        coreUIManager, saveLoadSystem, gameLoop, moduleLoader,
        coreUpgradeManager, buyMultiplierManager, buyMultiplierUI, productionManager
    };

    // 3. Initialize the remaining systems.
    productionManager.initialize(coreSystems);
    coreUIManager.initialize(coreSystems);
    buyMultiplierUI.initialize(coreSystems);
    moduleLoader.initialize(coreSystems);
    saveLoadSystem.initialize(coreSystems);

    // 4. Load save data into the state managers.
    const gameLoaded = saveLoadSystem.loadGame();
    if (gameLoaded) {
        loggingSystem.info("Main", "Save data loaded into managers.");
    } else {
        loggingSystem.info("Main", "No save data found. Starting a new game.");
        coreGameStateManager.setGameVersion("3.0.0");
    }

    // 5. Initialize translation manager, using the language from the just-loaded settings.
    await translationManager.initialize();

    // 6. Set up and apply the visual theme.
    document.addEventListener('themeChanged', (event) => {
        if (event.detail?.name && event.detail?.mode) {
            coreUIManager.applyTheme(event.detail.name, event.detail.mode);
        }
    });
    const initialTheme = globalSettingsManager.getSetting('theme');
    if (initialTheme?.name && initialTheme?.mode) {
        coreUIManager.applyTheme(initialTheme.name, initialTheme.mode);
    }
    
    // 7. Load all feature modules.
    try {
        await moduleLoader.loadModule(`../../modules/${MODULES.CORE_GAMEPLAY}_module/core_gameplay_manifest.js`);
        await moduleLoader.loadModule(`../../modules/${MODULES.STUDIES}_module/studies_manifest.js`);
        await moduleLoader.loadModule(`../../modules/${MODULES.MARKET}_module/market_manifest.js`);
        await moduleLoader.loadModule(`../../modules/${MODULES.SKILLS}_module/skills_manifest.js`);
        await moduleLoader.loadModule(`../../modules/${MODULES.ACHIEVEMENTS}_module/achievements_manifest.js`);
        await moduleLoader.loadModule(`../../modules/${MODULES.PRESTIGE}_module/prestige_manifest.js`);
        await moduleLoader.loadModule(`../../modules/${MODULES.SETTINGS}_module/settings_ui_manifest.js`);
    } catch (error) {
        loggingSystem.error("Main", "Critical error during module loading:", error);
        coreUIManager.showNotification("A module failed to load. The game cannot start.", "error", 0);
        return;
    }

    // 8. MODIFICATION: Notify all loaded modules about the game load.
    // This is the correct place, as all modules are guaranteed to exist now.
    if (gameLoaded) {
        moduleLoader.notifyAllModulesOfLoad();
    }

    // 9. Perform a final UI refresh.
    coreUIManager.fullUIRefresh();

    // 10. Attach footer button listeners.
    const saveButton = document.getElementById('save-button');
    const loadButton = document.getElementById('load-button');
    const resetButton = document.getElementById('reset-button');
    const devToolsButton = document.getElementById('dev-tools-button');

    if (saveButton) saveButton.addEventListener('click', () => saveLoadSystem.saveGame());
    if (loadButton) loadButton.addEventListener('click', () => saveLoadSystem.loadGame());
    if (resetButton) resetButton.addEventListener('click', () => saveLoadSystem.resetGameData());
    if (devToolsButton) {
        devToolsButton.addEventListener('click', () => {
            loggingSystem.info("Main_DevTools", "Dev tools button clicked.");
            const boostFactor = decimalUtility.new('1e9');
            coreResourceManager.addAmount(RESOURCES.STUDY_POINTS, boostFactor);
            coreResourceManager.addAmount(RESOURCES.KNOWLEDGE, boostFactor.div(100));
            coreUIManager.showNotification('Developer Boost: Added resources!', "warning", 5000);
        });
    }

    // 11. Add a global listener for language changes DURING gameplay.
    document.addEventListener('languagePackChanged', () => {
        loggingSystem.info("Main", "Language pack changed event detected. Triggering full UI refresh.");
        coreUIManager.fullUIRefresh();
    });
    
    // 12. Start the game loop.
    if (!gameLoop.isRunning()) {
        gameLoop.start();
    }
    loggingSystem.info("Main", "Game initialization sequence complete. Game is running.");

    // 13. FINAL STEP: Reveal the game content.
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        loadingScreen.addEventListener('transitionend', () => loadingScreen.remove());
    }
    document.body.classList.remove('content-hidden');
    loggingSystem.info("Main", "Game content revealed to user.");
}

document.addEventListener('DOMContentLoaded', () => {
    initializeGame().catch(error => {
        loggingSystem.error("Main_DOMContentLoaded", "Unhandled error during game initialization:", error, error.stack);
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.innerHTML = `<div class="text-center"><h1 class="text-2xl text-red-400 font-bold">Critical Error</h1><p class="text-white">Game failed to start. Please check the console (F12) and refresh.</p></div>`;
        }
    });
});
