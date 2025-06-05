// modules/settings_ui_module/settings_ui_logic.js (v1.1 - Reset Fix)

/**
 * @file settings_ui_logic.js
 * @description Business logic for the Settings UI module.
 * v1.1: Ensures 'settingsTabPermanentlyUnlocked' flag is cleared on reset.
 */

// import { staticModuleData } from './settings_ui_data.js'; // Not strictly needed if only using ui strings from it
// import { moduleState } from './settings_ui_state.js';

let coreSystemsRef = null;

export const moduleLogic = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("SettingsUILogic", "Logic initialized (v1.1).");
    },

    isSettingsTabUnlocked() {
        if (!coreSystemsRef || !coreSystemsRef.coreGameStateManager) {
            console.error("SettingsUILogic_isTabUnlocked_CRITICAL: coreGameStateManager missing!");
            return true; // Default true to avoid hiding content
        }
        const { coreGameStateManager, coreUIManager, loggingSystem } = coreSystemsRef;

        if (coreGameStateManager.getGlobalFlag('settingsTabPermanentlyUnlocked', false)) {
            return true;
        }
        // Original condition for settings tab is being purchased from market, which sets 'settingsTabUnlocked'
        const conditionMet = coreGameStateManager.getGlobalFlag('settingsTabUnlocked', false); 
        if (conditionMet) {
            coreGameStateManager.setGlobalFlag('settingsTabPermanentlyUnlocked', true);
            if(coreUIManager) coreUIManager.renderMenu();
            loggingSystem.info("SettingsUILogic", "Settings tab permanently unlocked.");
            return true;
        }
        return false;
    },

    applyTheme(themeId, modeId) {
        const { globalSettingsManager, loggingSystem, coreUIManager } = coreSystemsRef;
        globalSettingsManager.setSetting('theme.name', themeId);
        globalSettingsManager.setSetting('theme.mode', modeId);
        loggingSystem.info("SettingsUILogic", `Theme set to: ${themeId}, Mode: ${modeId}`);
        coreUIManager.showNotification(`Theme changed to ${themeId} (${modeId})`, "info");
    },

    applyLanguage(langId) {
        const { globalSettingsManager, loggingSystem } = coreSystemsRef;
        globalSettingsManager.setSetting('language', langId);
        loggingSystem.info("SettingsUILogic", `Language set to: ${langId}`);
    },
    
    getGameStatistics() {
        const { coreResourceManager, coreGameStateManager, moduleLoader, decimalUtility, staticDataAggregator } = coreSystemsRef;
        let stats = "<h3>Basic Game Statistics:</h3><ul>";
        
        stats += "<li><strong>Resources:</strong><ul>";
        const allResources = coreResourceManager.getAllResources();
        for (const resId in allResources) {
            const res = allResources[resId];
            if(res.isUnlocked && res.showInUI) {
                 stats += `<li>${res.name}: ${decimalUtility.format(res.amount, 2)} (${decimalUtility.format(res.totalProductionRate, 2)}/s)</li>`;
            }
        }
        stats += "</ul></li>";

        const studiesModule = moduleLoader.getModule('studies');
        if (studiesModule && studiesModule.getProducerData) {
            stats += "<li><strong>Study Producers:</strong><ul>";
            const studiesProducerData = staticDataAggregator.getData("studies.producers");
            if(studiesProducerData){
                for (const prodId in studiesProducerData) {
                    const producerInfo = studiesModule.getProducerData(prodId);
                    if (producerInfo && decimalUtility.gt(producerInfo.owned,0)) {
                         stats += `<li>${studiesProducerData[prodId].name}: ${decimalUtility.format(producerInfo.owned,0)}</li>`;
                    }
                }
            }
            stats += "</ul></li>";
        }
        
        stats += `<li>Game Version: ${coreGameStateManager.getGameVersion()}</li>`;
        const lastSave = coreGameStateManager.getLastSaveTime();
        stats += `<li>Last Save: ${lastSave ? new Date(lastSave).toLocaleString() : 'Never'}</li>`;

        stats += "</ul><p class='text-xs mt-2'>More detailed statistics planned for the future.</p>";
        return stats;
    },

    onGameLoad() {
        coreSystemsRef.loggingSystem.info("SettingsUILogic", "onGameLoad triggered for SettingsUI module (v1.1).");
        this.isSettingsTabUnlocked(); // Check and potentially set permanent flag
    },

    onResetState() {
        coreSystemsRef.loggingSystem.info("SettingsUILogic", "onResetState triggered for SettingsUI module (v1.1).");
        if (coreSystemsRef.coreGameStateManager) {
            coreSystemsRef.coreGameStateManager.setGlobalFlag('settingsTabPermanentlyUnlocked', false);
            coreSystemsRef.loggingSystem.info("SettingsUILogic", "'settingsTabPermanentlyUnlocked' flag cleared.");
        }
    }
};
