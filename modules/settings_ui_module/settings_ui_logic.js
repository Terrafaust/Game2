// modules/settings_ui_module/settings_ui_logic.js (v1)

/**
 * @file settings_ui_logic.js
 * @description Business logic for the Settings UI module.
 */

// import { staticModuleData } from './settings_ui_data.js';
// import { moduleState } from './settings_ui_state.js';

let coreSystemsRef = null;

export const moduleLogic = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("SettingsUILogic", "Logic initialized (v1).");
    },

    isSettingsTabUnlocked() {
        if (!coreSystemsRef) return false;
        // Check for the permanent unlock flag set by market module
        return coreSystemsRef.coreGameStateManager.getGlobalFlag('settingsTabPermanentlyUnlocked', false);
    },

    applyTheme(themeId, modeId) {
        const { globalSettingsManager, loggingSystem, coreUIManager } = coreSystemsRef;
        globalSettingsManager.setSetting('theme.name', themeId);
        globalSettingsManager.setSetting('theme.mode', modeId);
        // The event dispatched by globalSettingsManager will be caught by main.js or coreUIManager
        // to actually apply the theme classes to the body/game container.
        loggingSystem.info("SettingsUILogic", `Theme set to: ${themeId}, Mode: ${modeId}`);
        coreUIManager.showNotification(`Theme changed to ${themeId} (${modeId})`, "info");
    },

    applyLanguage(langId) {
        const { globalSettingsManager, loggingSystem, coreUIManager } = coreSystemsRef;
        globalSettingsManager.setSetting('language', langId);
        loggingSystem.info("SettingsUILogic", `Language set to: ${langId}`);
        // coreUIManager.showNotification(`Language set to ${langId} (Localization TBD)`, "info");
        // Event for language change is dispatched by globalSettingsManager.
    },
    
    getGameStatistics() {
        const { coreResourceManager, coreGameStateManager, moduleLoader, decimalUtility } = coreSystemsRef;
        let stats = "<h3>Basic Game Statistics:</h3><ul>";
        
        // Resources
        stats += "<li><strong>Resources:</strong><ul>";
        const allResources = coreResourceManager.getAllResources();
        for (const resId in allResources) {
            const res = allResources[resId];
            if(res.isUnlocked && res.showInUI) {
                 stats += `<li>${res.name}: ${decimalUtility.format(res.amount, 2)} (${decimalUtility.format(res.totalProductionRate, 2)}/s)</li>`;
            }
        }
        stats += "</ul></li>";

        // Study Producers (Example - requires studies module to be loaded and expose data)
        const studiesModule = moduleLoader.getModule('studies');
        if (studiesModule && studiesModule.getProducerData) {
            stats += "<li><strong>Study Producers:</strong><ul>";
            const studiesData = coreSystemsRef.staticDataAggregator.getData("studies.producers");
            if(studiesData){
                for (const prodId in studiesData) {
                    const producerInfo = studiesModule.getProducerData(prodId);
                    if (producerInfo && decimalUtility.gt(producerInfo.owned,0)) {
                         stats += `<li>${studiesData[prodId].name}: ${decimalUtility.format(producerInfo.owned,0)}</li>`;
                    }
                }
            }
            stats += "</ul></li>";
        }
        
        // Game Version
        stats += `<li>Game Version: ${coreGameStateManager.getGameVersion()}</li>`;
        // Last Save Time
        const lastSave = coreGameStateManager.getLastSaveTime();
        stats += `<li>Last Save: ${lastSave ? new Date(lastSave).toLocaleString() : 'Never'}</li>`;

        stats += "</ul><p class='text-xs mt-2'>More detailed statistics planned for the future.</p>";
        return stats;
    },


    onGameLoad() {
        coreSystemsRef.loggingSystem.info("SettingsUILogic", "onGameLoad triggered for SettingsUI module.");
         // Check and potentially set permanent flag on load for settings tab itself
        this.isSettingsTabUnlocked();
    },

    onResetState() {
        coreSystemsRef.loggingSystem.info("SettingsUILogic", "onResetState triggered for SettingsUI module.");
        // Clear the permanent unlock flag for the settings tab on reset
        if (coreSystemsRef.coreGameStateManager) {
            coreSystemsRef.coreGameStateManager.setGlobalFlag('settingsTabPermanentlyUnlocked', false);
        }
    }
};
