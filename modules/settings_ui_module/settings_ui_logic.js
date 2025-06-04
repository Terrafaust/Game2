// modules/settings_ui_module/settings_ui_logic.js 

/**
 * @file settings_ui_logic.js
 * @description Contains the business logic for the Settings UI module,
 * primarily handling the unlocking of settings sections and interacting with
 * global settings and core systems.
 */

import { staticModuleData } from './settings_ui_data.js';
import { moduleState } from './settings_ui_state.js';

let coreSystemsRef = null; // To store references to core game systems

export const moduleLogic = {
    /**
     * Initializes the logic component with core system references.
     * @param {object} coreSystems - References to core game systems.
     */
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.debug("SettingsUILogic", "Logic initialized.");
    },

    /**
     * Checks if a specific settings section is unlocked.
     * For sections with a purchase cost, this checks if the purchase has been made.
     * @param {string} sectionId - The ID of the section (e.g., 'themes', 'statistics').
     * @returns {boolean} True if the section is unlocked, false otherwise.
     */
    isSectionUnlocked(sectionId) {
        const { coreResourceManager, decimalUtility, loggingSystem } = coreSystemsRef;
        const sectionDef = staticModuleData.sections[sectionId];

        if (!sectionDef || !sectionDef.unlockCondition) {
            loggingSystem.warn("SettingsUILogic", `Section definition or unlock condition not found for ID: ${sectionId}`);
            return false;
        }

        const condition = sectionDef.unlockCondition;

        switch (condition.type) {
            case "alwaysUnlocked":
                return true;
            case "resource":
                // Check if the section has been "purchased" (unlocked)
                return moduleState.unlockedSections[sectionId] === true;
            case "globalFlag":
                // This is for the main Settings tab unlock, not individual sections within it.
                // Individual sections are unlocked by resource purchase, not global flags.
                return coreSystemsRef.coreGameStateManager.getGlobalFlag(condition.flag) === condition.value;
            default:
                loggingSystem.warn("SettingsUILogic", `Unknown unlock condition type for section ${sectionId}: ${condition.type}`);
                return false;
        }
    },

    /**
     * Calculates the cost to unlock a settings section (if it has a resource-based unlock).
     * @param {string} sectionId - The ID of the section.
     * @returns {Decimal} The cost, or Decimal(0) if no cost or already unlocked.
     */
    calculateUnlockCost(sectionId) {
        const { decimalUtility, loggingSystem } = coreSystemsRef;
        const sectionDef = staticModuleData.sections[sectionId];

        if (!sectionDef || sectionDef.unlockCondition.type !== "resource") {
            return decimalUtility.ZERO; // No cost for non-resource unlocks
        }

        if (this.isSectionUnlocked(sectionId)) {
            return decimalUtility.ZERO; // Already unlocked, no cost
        }

        return decimalUtility.new(sectionDef.unlockCondition.amount);
    },

    /**
     * Handles the purchase/unlock of a settings section.
     * @param {string} sectionId - The ID of the section to unlock.
     * @returns {boolean} True if unlock was successful, false otherwise.
     */
    purchaseSectionUnlock(sectionId) {
        if (!coreSystemsRef) {
            console.error("SettingsUILogic: Core systems not initialized.");
            return false;
        }

        const { coreResourceManager, decimalUtility, loggingSystem, coreGameStateManager, coreUIManager } = coreSystemsRef;
        const sectionDef = staticModuleData.sections[sectionId];

        if (!sectionDef || sectionDef.unlockCondition.type !== "resource") {
            loggingSystem.warn("SettingsUILogic", `Section ${sectionId} does not have a purchasable unlock.`);
            return false;
        }

        if (this.isSectionUnlocked(sectionId)) {
            loggingSystem.warn("SettingsUILogic", `Section ${sectionId} is already unlocked.`);
            coreUIManager.showNotification(`${sectionDef.name} is already unlocked!`, 'info', 2000);
            return false;
        }

        const cost = this.calculateUnlockCost(sectionId);
        const costResource = sectionDef.unlockCondition.resourceId;

        if (coreResourceManager.canAfford(costResource, cost)) {
            coreResourceManager.spendAmount(costResource, cost);
            moduleState.unlockedSections[sectionId] = true; // Mark as unlocked
            coreGameStateManager.setModuleState('settings_ui', { ...moduleState }); // Persist state

            loggingSystem.info("SettingsUILogic", `Unlocked settings section: ${sectionDef.name}. Cost: ${decimalUtility.format(cost)} ${costResource}.`);
            coreUIManager.showNotification(`Unlocked: ${sectionDef.name}!`, 'success', 3000);
            return true;
        } else {
            loggingSystem.debug("SettingsUILogic", `Cannot afford to unlock ${sectionDef.name}. Need ${decimalUtility.format(cost)} ${costResource}. Have ${decimalUtility.format(coreResourceManager.getAmount(costResource))}`);
            return false;
        }
    },

    /**
     * Applies a new theme via globalSettingsManager.
     * @param {string} themeName
     * @param {string} mode
     */
    applyThemeSetting(themeName, mode) {
        const { globalSettingsManager, loggingSystem } = coreSystemsRef;
        globalSettingsManager.setSetting('theme.name', themeName);
        globalSettingsManager.setSetting('theme.mode', mode);
        loggingSystem.info("SettingsUILogic", `Theme setting changed to ${themeName} (${mode}).`);
        // coreUIManager will react to the 'themeChanged' event dispatched by globalSettingsManager
    },

    /**
     * Changes the game language via globalSettingsManager.
     * @param {string} langCode
     */
    changeLanguageSetting(langCode) {
        const { globalSettingsManager, loggingSystem } = coreSystemsRef;
        globalSettingsManager.setSetting('language', langCode);
        loggingSystem.info("SettingsUILogic", `Language setting changed to ${langCode}.`);
        // coreUIManager will react to the 'languageChanged' event dispatched by globalSettingsManager
    },

    /**
     * Resets all global settings to defaults.
     */
    resetAllSettings() {
        const { globalSettingsManager, coreUIManager, loggingSystem } = coreSystemsRef;
        coreUIManager.showModal(
            "Reset All Settings?",
            "This will reset all your game settings (theme, language, etc.) to their default values. This does NOT reset game progress. Are you sure?",
            [
                {
                    label: "Reset Settings",
                    className: "bg-red-600 hover:bg-red-700",
                    callback: () => {
                        globalSettingsManager.resetToDefaults();
                        coreUIManager.closeModal();
                        coreUIManager.showNotification("All settings reset to defaults.", "info", 3000);
                        // UI will auto-update via event listeners
                    }
                },
                {
                    label: "Cancel",
                    className: "bg-gray-500 hover:bg-gray-600",
                    callback: () => coreUIManager.closeModal()
                }
            ]
        );
    },

    /**
     * Checks if the Settings tab itself should be unlocked.
     * @returns {boolean}
     */
    isSettingsTabUnlocked() {
        const { coreGameStateManager } = coreSystemsRef;
        const condition = staticModuleData.ui.settingsTabUnlockCondition;

        if (!condition) {
            return false; // Must have a condition
        }

        if (condition.type === "globalFlag") {
            return coreGameStateManager.getGlobalFlag(condition.flag) === condition.value;
        }
        return false;
    },

    /**
     * Lifecycle method called when the game loads.
     * Ensures internal state for unlocked sections is consistent with saved data.
     */
    onGameLoad() {
        coreSystemsRef.loggingSystem.info("SettingsUILogic", "onGameLoad: Checking unlocked sections.");
        // Ensure that if a section was unlocked, its state is true.
        // This is handled by moduleState being loaded in manifest.
    },

    /**
     * Lifecycle method called when the game resets.
     * Resets module-specific state.
     */
    onResetState() {
        coreSystemsRef.loggingSystem.info("SettingsUILogic", "onResetState: Resetting Settings UI module logic state.");
        // The moduleState will be re-initialized by the manifest, clearing unlockedSections.
    }
};
