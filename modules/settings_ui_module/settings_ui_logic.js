// modules/settings_ui_module/settings_ui_logic.js (v1.2 - Expanded Statistics)

/**
 * @file settings_ui_logic.js
 * @description Business logic for the Settings UI module.
 * v1.2: Expanded getGameStatistics to include data from Market, Skills, Achievements, and enhanced Studies stats.
 * v1.1: Ensures 'settingsTabPermanentlyUnlocked' flag is cleared on reset.
 */

// import { staticModuleData } from './settings_ui_data.js'; // Not strictly needed if only using ui strings from it
// import { moduleState } from './settings_ui_state.js';

let coreSystemsRef = null;

export const moduleLogic = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("SettingsUILogic", "Logic initialized (v1.2).");
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

    // Helper function to calculate total effect from a specific module via CoreUpgradeManager
    _getModuleSpecificMultiplier(targetSystem, targetId, effectType, sourceModuleId) {
        const { coreUpgradeManager, decimalUtility, loggingSystem } = coreSystemsRef;
        if (!coreUpgradeManager) return decimalUtility.new(1);

        const effectKey = `${targetSystem}_${targetId || 'global'}_${effectType}`;
        const sources = coreUpgradeManager.registeredEffectSources ? coreUpgradeManager.registeredEffectSources[effectKey] : null; // Access internal directly (ideally CUM exposes this better)

        if (!sources || Object.keys(sources).length === 0) {
            return decimalUtility.new(1);
        }

        let aggregatedValue = decimalUtility.new(1); // Multipliers start at 1

        for (const sourceFullId in sources) {
            const effectSource = sources[sourceFullId];
            if (effectSource.moduleId === sourceModuleId) {
                try {
                    const value = effectSource.valueProvider();
                     if (effectType.includes("MULTIPLIER")) {
                        // Assuming valueProvider for multipliers that stack additively (e.g. +10% is 1.1)
                        // If valueProvider returns the raw percentage (e.g. 0.1 for 10%), adjust logic
                        // The current skills_logic and achievements_logic seem to return 1 + bonus (e.g. 1.1 for +10%)
                        aggregatedValue = decimalUtility.multiply(aggregatedValue, value);
                    } else if (effectType.includes("ADDITIVE_BONUS")) {
                         // This part of the function is for multipliers, additive would need a different base (0)
                    }

                } catch (error) {
                    loggingSystem.error("SettingsUILogic", `Error in valueProvider for ${sourceFullId} from module ${sourceModuleId}`, error);
                }
            }
        }
        return aggregatedValue;
    },
    
    getGameStatistics() {
        const { coreResourceManager, coreGameStateManager, moduleLoader, decimalUtility, staticDataAggregator, coreUpgradeManager, loggingSystem } = coreSystemsRef;
        let statsHtml = "";

        // --- General Game Info ---
        statsHtml += `<div class="mb-4 p-3 bg-surface-dark rounded-md shadow">`;
        statsHtml += `<h4 class="text-lg font-semibold text-secondary mb-2">General</h4><ul>`;
        statsHtml += `<li>Game Version: ${coreGameStateManager.getGameVersion()}</li>`;
        const lastSave = coreGameStateManager.getLastSaveTime();
        statsHtml += `<li>Last Save: ${lastSave ? new Date(lastSave).toLocaleString() : 'Never'}</li>`;
        statsHtml += `</ul></div>`;

        // --- Resource Statistics ---
        statsHtml += `<div class="mb-4 p-3 bg-surface-dark rounded-md shadow">`;
        statsHtml += `<h4 class="text-lg font-semibold text-secondary mb-2">Resources</h4><ul>`;
        const allResources = coreResourceManager.getAllResources();
        for (const resId in allResources) {
            const res = allResources[resId];
            if(res.isUnlocked && res.showInUI) {
                 statsHtml += `<li>${res.name}: ${decimalUtility.format(res.amount, 2)} (${decimalUtility.format(res.totalProductionRate, 2)}/s)</li>`;
            }
        }
        statsHtml += `</ul></div>`;

        // --- Market Statistics ---
        const marketModule = moduleLoader.getModule('market');
        if (marketModule && marketModule.logic) {
            statsHtml += `<div class="mb-4 p-3 bg-surface-dark rounded-md shadow">`;
            statsHtml += `<h4 class="text-lg font-semibold text-secondary mb-2">Market</h4><ul>`;
            const imagesOwned = coreResourceManager.getAmount('images');
            const sspOwned = coreResourceManager.getAmount('studySkillPoints'); // Assuming 'studySkillPoints' is the ID
            statsHtml += `<li>Images Owned: ${decimalUtility.format(imagesOwned, 0)}</li>`;
            statsHtml += `<li>Study Skill Points Owned: ${decimalUtility.format(sspOwned, 0)}</li>`;
            
            const settingsUnlockPurchased = coreGameStateManager.getGlobalFlag('marketUnlock_settingsTabUnlocked_purchased', false);
            statsHtml += `<li>Settings Tab Unlock (from Market): ${settingsUnlockPurchased ? 'Purchased' : 'Not Purchased'}</li>`;
            const achievementsUnlockPurchased = coreGameStateManager.getGlobalFlag('marketUnlock_achievementsTabUnlocked_purchased', false);
            statsHtml += `<li>Achievements Tab Unlock (from Market): ${achievementsUnlockPurchased ? 'Purchased' : 'Not Purchased'}</li>`;
            statsHtml += `</ul></div>`;
        }

        // --- Studies Statistics ---
        const studiesModule = moduleLoader.getModule('studies');
        if (studiesModule && studiesModule.logic && studiesModule.getProducerData) { // getProducerData implies logic is there
            statsHtml += `<div class="mb-4 p-3 bg-surface-dark rounded-md shadow">`;
            statsHtml += `<h4 class="text-lg font-semibold text-secondary mb-2">Studies</h4><ul>`;
            let totalSpFromStudies = decimalUtility.new(0);
            if (allResources.studyPoints && allResources.studyPoints.productionSources) {
                for (const sourceKey in allResources.studyPoints.productionSources) {
                    if (sourceKey.startsWith('studies_module_')) {
                        totalSpFromStudies = decimalUtility.add(totalSpFromStudies, allResources.studyPoints.productionSources[sourceKey]);
                    }
                }
            }
            statsHtml += `<li>Total Study Points/sec (from Studies Producers): ${decimalUtility.format(totalSpFromStudies, 2)}</li>`;

            const studiesProducerData = staticDataAggregator.getData("studies.producers");
            if(studiesProducerData){
                for (const prodId in studiesProducerData) {
                    const producerDef = studiesProducerData[prodId];
                    const producerInfo = studiesModule.getProducerData(prodId); // From studies_logic
                    if (producerInfo && decimalUtility.gt(producerInfo.owned,0)) {
                         statsHtml += `<li>${producerDef.name}: Owned ${decimalUtility.format(producerInfo.owned,0)}</li>`;
                    }
                }
            }
            statsHtml += `</ul></div>`;
        }

        // --- Skills Statistics ---
        const skillsModule = moduleLoader.getModule('skills');
        const skillsStaticData = staticDataAggregator.getData('skills.skills'); // Assuming skills_data is registered with id 'skills'
        if (skillsModule && skillsModule.logic && skillsStaticData) {
            statsHtml += `<div class="mb-4 p-3 bg-surface-dark rounded-md shadow">`;
            statsHtml += `<h4 class="text-lg font-semibold text-secondary mb-2">Skills</h4><ul>`;
            let totalSspSpent = decimalUtility.new(0);
            let skillsUnlockedCount = 0;
            let skillsMaxedCount = 0;
            const totalSkills = Object.keys(skillsStaticData).length;

            for (const skillId in skillsStaticData) {
                const skillDef = skillsStaticData[skillId];
                const currentLevel = skillsModule.logic.getSkillLevel(skillId);
                if (skillsModule.logic.isSkillUnlocked(skillId)) skillsUnlockedCount++;
                if (currentLevel > 0) {
                    for (let i = 0; i < currentLevel; i++) {
                        if(skillDef.costPerLevel && skillDef.costPerLevel[i]){
                             totalSspSpent = decimalUtility.add(totalSspSpent, decimalUtility.new(skillDef.costPerLevel[i]));
                        }
                    }
                }
                if (currentLevel >= skillDef.maxLevel && skillDef.maxLevel > 0) skillsMaxedCount++;
            }
            statsHtml += `<li>Study Skill Points Spent: ${decimalUtility.format(totalSspSpent, 0)}</li>`;
            statsHtml += `<li>Skills Unlocked: ${skillsUnlockedCount} / ${totalSkills}</li>`;
            statsHtml += `<li>Skills Maxed: ${skillsMaxedCount} / ${totalSkills}</li>`;

            // Global SP Multiplier from Skills
            const spMultiplierFromSkills = this._getModuleSpecificMultiplier('global_resource_production', 'studyPoints', 'MULTIPLIER', 'skills');
            if (decimalUtility.gt(spMultiplierFromSkills, 1)) {
                const spPercentageBonus = decimalUtility.format(decimalUtility.multiply(decimalUtility.subtract(spMultiplierFromSkills, 1), 100), 0);
                statsHtml += `<li>Global Study Point Production Bonus (from Skills): +${spPercentageBonus}%</li>`;
            }
             // Global Knowledge Multiplier from Skills
            const knowledgeMultiplierFromSkills = this._getModuleSpecificMultiplier('global_resource_production', 'knowledge', 'MULTIPLIER', 'skills');
            if (decimalUtility.gt(knowledgeMultiplierFromSkills, 1)) {
                const knowledgePercentageBonus = decimalUtility.format(decimalUtility.multiply(decimalUtility.subtract(knowledgeMultiplierFromSkills, 1), 100), 0);
                statsHtml += `<li>Global Knowledge Production Bonus (from Skills): +${knowledgePercentageBonus}%</li>`;
            }
            statsHtml += `</ul></div>`;
        }

        // --- Achievements Statistics ---
        const achievementsModule = moduleLoader.getModule('achievements');
        const achievementsStaticData = staticDataAggregator.getData('achievements.achievements');
        if (achievementsModule && achievementsModule.logic && achievementsStaticData) {
            statsHtml += `<div class="mb-4 p-3 bg-surface-dark rounded-md shadow">`;
            statsHtml += `<h4 class="text-lg font-semibold text-secondary mb-2">Achievements</h4><ul>`;
            let completedCount = 0;
            if (achievementsModule.moduleState && achievementsModule.moduleState.completedAchievements) { // Assuming module exposes its state if needed
                 completedCount = Object.values(achievementsModule.moduleState.completedAchievements).filter(c => c === true).length;
            } else { // Fallback to checking via logic if state not directly exposed (less ideal)
                for (const achId in achievementsStaticData) {
                    if (achievementsModule.logic.isAchievementCompleted(achId)) completedCount++;
                }
            }
            statsHtml += `<li>Achievements Completed: ${completedCount} / ${Object.keys(achievementsStaticData).length}</li>`;
            
            const spMultiplierFromAchievements = this._getModuleSpecificMultiplier('global_resource_production', 'studyPoints', 'MULTIPLIER', 'achievements');
            if (decimalUtility.gt(spMultiplierFromAchievements, 1)) {
                const spPercentageBonusAch = decimalUtility.format(decimalUtility.multiply(decimalUtility.subtract(spMultiplierFromAchievements, 1), 100), 0);
                statsHtml += `<li>Global Study Point Production Bonus (from Achievements): +${spPercentageBonusAch}%</li>`;
            }
            statsHtml += `</ul></div>`;
        }
        
        statsHtml += "<p class='text-xs mt-4 text-textSecondary text-center'>More statistics and detailed breakdowns may be added in the future.</p>";
        return statsHtml;
    },

    onGameLoad() {
        coreSystemsRef.loggingSystem.info("SettingsUILogic", "onGameLoad triggered for SettingsUI module (v1.2).");
        this.isSettingsTabUnlocked();
    },

    onResetState() {
        coreSystemsRef.loggingSystem.info("SettingsUILogic", "onResetState triggered for SettingsUI module (v1.2).");
        if (coreSystemsRef.coreGameStateManager) {
            coreSystemsRef.coreGameStateManager.setGlobalFlag('settingsTabPermanentlyUnlocked', false);
            coreSystemsRef.loggingSystem.info("SettingsUILogic", "'settingsTabPermanentlyUnlocked' flag cleared.");
        }
    }
};
