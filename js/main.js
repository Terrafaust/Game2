// js/main.js (v12.7 - The "Reveal" Pattern)
// The most robust fix for the translation race condition.
// The game content is hidden by default via CSS. This script removes the "hidden"
// class at the very end of initialization, after all data, modules, and translations
// are guaranteed to be loaded and rendered.

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
    // 1. Initialize systems that have NO dependency on other systems yet.
    loggingSystem.setLogLevel(loggingSystem.levels.DEBUG);
    globalSettingsManager.initialize();
    coreGameStateManager.initialize();
    coreResourceManager.initialize();
    coreUpgradeManager.initialize();
    buyMultiplierManager.initialize();

    // 2. Create the single `coreSystems` object to pass to all dependent systems.
    const coreSystems = {
        loggingSystem, decimalUtility, globalSettingsManager, translationManager,
        coreGameStateManager, staticDataAggregator, coreResourceManager,
        coreUIManager, saveLoadSystem, gameLoop, moduleLoader,
        coreUpgradeManager, buyMultiplierManager, buyMultiplierUI, productionManager
    };

    // 3. Initialize the remaining systems that depend on the `coreSystems` object.
    productionManager.initialize(coreSystems);
    coreUIManager.initialize(coreSystems);
    buyMultiplierUI.initialize(coreSystems);
    moduleLoader.initialize(coreSystems);
    saveLoadSystem.initialize(coreSystems);

    // 4. Load save data.
    const gameLoaded = saveLoadSystem.loadGame();
    if (gameLoaded) {
        loggingSystem.info("Main", "Save game loaded successfully.");
    } else {
        loggingSystem.info("Main", "No save data found. Starting a new game.");
        coreGameStateManager.setGameVersion("3.0.0");
    }

    // 5. Initialize translation manager AFTER loading save data.
    await translationManager.initialize();

    // 6. Set up theme and apply it.
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

    // 8. Perform a final UI refresh. At this point, all data is loaded and ready.
    coreUIManager.fullUIRefresh();

    // 9. Attach footer button listeners.
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

    // 10. Add a global listener for language changes DURING gameplay.
    document.addEventListener('languagePackChanged', () => {
        loggingSystem.info("Main", "Language pack changed event detected. Triggering full UI refresh.");
        coreUIManager.fullUIRefresh();
    });
    
    // 11. Start the game loop.
    if (!gameLoop.isRunning()) {
        gameLoop.start();
    }
    loggingSystem.info("Main", "Game initialization sequence complete. Game is running.");

    // 12. FINAL STEP: Reveal the game content.
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
