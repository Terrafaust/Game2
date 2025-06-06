// modules/settings_ui_module/settings_ui_logic.js (v1.6 - Added live theme application)

/**
 * @file settings_ui_logic.js
 * @description Business logic for the Settings UI module.
 * v1.6: Fixed bug where themes were not applied visually in real-time.
 * v1.5: Implemented source-specific effect filtering in _getEffectsFromSourceModule.
 * v1.4: Refined check for coreUpgradeManager and its registeredEffectSources.
 * v1.3: Finalized expanded getGameStatistics to include comprehensive data.
 */

let coreSystemsRef = null;

export const moduleLogic = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("SettingsUILogic", "Logic initialized (v1.6).");
        if (!coreSystems.coreUpgradeManager) {
            coreSystemsRef.loggingSystem.error("SettingsUILogic_Init_CRITICAL", "coreUpgradeManager is MISSING in coreSystems passed to SettingsUILogic!");
        } else {
            coreSystemsRef.loggingSystem.debug("SettingsUILogic_Init", "coreUpgradeManager is PRESENT.");
        }
    },

    isSettingsTabUnlocked() {
        if (!coreSystemsRef || !coreSystemsRef.coreGameStateManager) {
            console.error("SettingsUILogic_isTabUnlocked_CRITICAL: coreGameStateManager missing!");
            return true;
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
        
        // --- FIX: This line was missing. It tells the UI manager to visually apply the theme change immediately. ---
        coreUIManager.applyTheme(themeId, modeId);

        loggingSystem.info("SettingsUILogic", `Theme set to: ${themeId}, Mode: ${modeId}`);
        // The notification is now redundant because coreUIManager.applyTheme handles it, but we can keep it for logging.
        coreUIManager.showNotification(`Theme changed to ${themeId} (${modeId})`, "info");
    },

    applyLanguage(langId) {
        const { globalSettingsManager, loggingSystem } = coreSystemsRef;
        globalSettingsManager.setSetting('language', langId);
        loggingSystem.info("SettingsUILogic", `Language set to: ${langId}`);
    },

    _getModuleLogic(moduleId) {
        const module = coreSystemsRef.moduleLoader.getModule(moduleId);
        return module && module.logic ? module.logic : null;
    },
    
    _getEffectsFromSourceModule(targetSystem, targetId, effectType, sourceModuleId) {
        const { coreUpgradeManager, decimalUtility, loggingSystem } = coreSystemsRef;

        if (!coreUpgradeManager || typeof coreUpgradeManager.getAllRegisteredEffects !== 'function') {
            loggingSystem.warn("SettingsUILogic_GetEffects", "coreUpgradeManager or getAllRegisteredEffects method is not available.");
            return effectType.includes("MULTIPLIER") ? decimalUtility.new(1) : decimalUtility.new(0);
        }
        
        const allEffectsTree = coreUpgradeManager.getAllRegisteredEffects(); 
        const effectKey = `${targetSystem}_${targetId || 'global'}_${effectType}`;
        const sourcesForThisEffectKey = allEffectsTree[effectKey];

        let filteredAggregatedValue = effectType.includes("MULTIPLIER") ? decimalUtility.new(1) : decimalUtility.new(0);
        
        if (sourcesForThisEffectKey) {
            for (const fullSourceIdKey in sourcesForThisEffectKey) {
                const effectDetails = sourcesForThisEffectKey[fullSourceIdKey]; 
                if (effectDetails.moduleId === sourceModuleId) {
                    const value = decimalUtility.new(effectDetails.currentValue || (effectType.includes("MULTIPLIER") ? "1" : "0") );
                    
                    if (effectType.includes("MULTIPLIER")) {
                        filteredAggregatedValue = decimalUtility.multiply(filteredAggregatedValue, value);
                    } else { 
                        filteredAggregatedValue = decimalUtility.add(filteredAggregatedValue, value);
                    }
                }
            }
        }
        
        return filteredAggregatedValue;
    },

    getGameStatistics() {
        if (!coreSystemsRef) return "<p>Core systems not available for statistics.</p>";
        const { coreResourceManager, coreGameStateManager, moduleLoader, decimalUtility, staticDataAggregator, loggingSystem } = coreSystemsRef;
        let statsHtml = "";

        const sectionClass = "mb-4 p-3 bg-surface-dark rounded-md shadow";
        const headingClass = "text-lg font-semibold text-secondary mb-2";
        const listClass = "list-disc list-inside space-y-1 pl-2 text-sm";

        // --- General Game Info ---
        statsHtml += `<div class="${sectionClass}"><h4 class="${headingClass}">General</h4><ul class="${listClass}">`;
        statsHtml += `<li>Game Version: ${coreGameStateManager.getGameVersion()}</li>`;
        const lastSave = coreGameStateManager.getLastSaveTime();
        statsHtml += `<li>Last Save: ${lastSave ? new Date(lastSave).toLocaleString() : 'Never'}</li>`;
        statsHtml += `<li>Total Play Time: ${coreGameStateManager.getTotalPlayTimeString()}</li>`;
        statsHtml += `</ul></div>`;

        // --- Resource Statistics ---
        statsHtml += `<div class="${sectionClass}"><h4 class="${headingClass}">Resources</h4><ul class="${listClass}">`;
        const allResources = coreResourceManager.getAllResources();
        for (const resId in allResources) {
            const res = allResources[resId];
            if(res.isUnlocked && res.showInUI) {
                 statsHtml += `<li>${res.name}: ${decimalUtility.format(res.amount, 2)} (${decimalUtility.format(res.totalProductionRate, 2)}/s)</li>`;
            }
        }
        statsHtml += `</ul></div>`;

        // --- Market Statistics ---
        const marketLogic = this._getModuleLogic('market');
        if (marketLogic) {
            statsHtml += `<div class="${sectionClass}"><h4 class="${headingClass}">Market</h4><ul class="${listClass}">`;
            const imagesOwned = coreResourceManager.getAmount('images');
            const sspOwned = coreResourceManager.getAmount('studySkillPoints');
            statsHtml += `<li>Images Owned: ${decimalUtility.format(imagesOwned, 0)}</li>`;
            statsHtml += `<li>Study Skill Points (SSP) Owned: ${decimalUtility.format(sspOwned, 0)}</li>`;
            
            const settingsUnlockPurchased = coreGameStateManager.getGlobalFlag('marketUnlock_settingsTabUnlocked_purchased', false);
            statsHtml += `<li>Settings Tab Unlock (Market): ${settingsUnlockPurchased ? '<span class="text-green-400">Purchased</span>' : '<span class="text-yellow-400">Not Purchased</span>'}</li>`;
            const achievementsUnlockPurchased = coreGameStateManager.getGlobalFlag('marketUnlock_achievementsTabUnlocked_purchased', false);
            statsHtml += `<li>Achievements Tab Unlock (Market): ${achievementsUnlockPurchased ? '<span class="text-green-400">Purchased</span>' : '<span class="text-yellow-400">Not Purchased</span>'}</li>`;
            statsHtml += `</ul></div>`;
        }

        // --- Studies Statistics ---
        const studiesLogic = this._getModuleLogic('studies');
        if (studiesLogic && studiesLogic.getOwnedProducerCount) { 
            statsHtml += `<div class="${sectionClass}"><h4 class="${headingClass}">Studies</h4><ul class="${listClass}">`;
            let totalSpFromStudies = decimalUtility.new(0);
            if (allResources.studyPoints && allResources.studyPoints.productionSources) {
                for (const sourceKey in allResources.studyPoints.productionSources) {
                    if (sourceKey.startsWith('studies_module_')) { 
                        totalSpFromStudies = decimalUtility.add(totalSpFromStudies, allResources.studyPoints.productionSources[sourceKey]);
                    }
                }
            }
            statsHtml += `<li>Total Study Points/sec (from Producers): ${decimalUtility.format(totalSpFromStudies, 2)}</li>`;

            const studiesProducerStaticData = staticDataAggregator.getData("studies.producers");
            if(studiesProducerStaticData){
                for (const prodId in studiesProducerStaticData) {
                    const producerDef = studiesProducerStaticData[prodId];
                    const producerOwned = studiesLogic.getOwnedProducerCount(prodId) || decimalUtility.new(0);
                    if (decimalUtility.gt(producerOwned,0)) {
                         statsHtml += `<li>${producerDef.name}: Owned ${decimalUtility.format(producerOwned,0)}</li>`;
                    }
                }
            }
            statsHtml += `</ul></div>`;
        }

        // --- Skills Statistics ---
        const skillsLogic = this._getModuleLogic('skills');
        const skillsStaticDefs = staticDataAggregator.getData('skills.skills');
        if (skillsLogic && skillsStaticDefs) {
            statsHtml += `<div class="${sectionClass}"><h4 class="${headingClass}">Skills</h4><ul class="${listClass}">`;
            let totalSspSpent = decimalUtility.new(0);
            let skillsUnlockedCount = 0;
            let skillsMaxedCount = 0;
            const totalSkillsDefined = Object.keys(skillsStaticDefs).length;

            for (const skillId in skillsStaticDefs) {
                const skillDef = skillsStaticDefs[skillId];
                const currentLevel = skillsLogic.getSkillLevel(skillId);
                if (skillsLogic.isSkillUnlocked(skillId)) skillsUnlockedCount++;
                if (currentLevel > 0 && skillDef.costPerLevel) { 
                    for (let i = 0; i < currentLevel; i++) {
                        if(skillDef.costPerLevel[i]){ 
                             totalSspSpent = decimalUtility.add(totalSspSpent, decimalUtility.new(skillDef.costPerLevel[i]));
                        }
                    }
                }
                if (currentLevel >= skillDef.maxLevel && skillDef.maxLevel > 0) skillsMaxedCount++;
            }
            statsHtml += `<li>Study Skill Points Spent: ${decimalUtility.format(totalSspSpent, 0)}</li>`;
            statsHtml += `<li>Skills Unlocked: ${skillsUnlockedCount} / ${totalSkillsDefined}</li>`;
            statsHtml += `<li>Skills Maxed: ${skillsMaxedCount} / ${totalSkillsDefined}</li>`;
            
            const spMultiplierFromSkills = this._getEffectsFromSourceModule('global_resource_production', 'studyPoints', 'MULTIPLIER', 'skills');
            if (decimalUtility.gt(spMultiplierFromSkills, 1)) { 
                const spPercentageBonus = decimalUtility.format(decimalUtility.multiply(decimalUtility.subtract(spMultiplierFromSkills, 1), 100), 0);
                statsHtml += `<li>Global Study Points Prod. Bonus (from Skills): +${spPercentageBonus}%</li>`;
            } else if (decimalUtility.eq(spMultiplierFromSkills, 1) && skillsUnlockedCount > 0) {
                 statsHtml += `<li>Global Study Points Prod. Bonus (from Skills): None active</li>`;
            }

            statsHtml += `</ul></div>`;
        }

        // --- Achievements Statistics ---
        const achievementsLogic = this._getModuleLogic('achievements');
        const achievementsStaticDefs = staticDataAggregator.getData('achievements.achievements');
        if (achievementsLogic && achievementsStaticDefs) {
            statsHtml += `<div class="${sectionClass}"><h4 class="${headingClass}">Achievements</h4><ul class="${listClass}">`;
            let completedCount = 0;
            const achievementsModuleState = coreGameStateManager.getModuleState('achievements'); 
            if (achievementsModuleState && achievementsModuleState.completedAchievements) {
                 completedCount = Object.values(achievementsModuleState.completedAchievements).filter(c => c === true).length;
            }
            statsHtml += `<li>Achievements Completed: ${completedCount} / ${Object.keys(achievementsStaticDefs).length}</li>`;
            
            const spMultiplierFromAchievements = this._getEffectsFromSourceModule('global_resource_production', 'studyPoints', 'MULTIPLIER', 'achievements');
            if (decimalUtility.gt(spMultiplierFromAchievements, 1)) { 
                const spPercentageBonusAch = decimalUtility.format(decimalUtility.multiply(decimalUtility.subtract(spMultiplierFromAchievements, 1), 100), 0);
                statsHtml += `<li>Global Study Points Prod. Bonus (from Achievements): +${spPercentageBonusAch}%</li>`;
            } else if (decimalUtility.eq(spMultiplierFromAchievements, 1) && completedCount > 0) {
                 statsHtml += `<li>Global Study Points Prod. Bonus (from Achievements): None active</li>`;
            }
            statsHtml += `</ul></div>`;
        }
        
        statsHtml += "<p class='text-xs mt-4 text-textSecondary text-center'>More statistics and detailed breakdowns may be added in the future.</p>";
        return statsHtml;
    },

    onGameLoad() {
        if (!coreSystemsRef || !coreSystemsRef.loggingSystem) {
            return;
        }
        coreSystemsRef.loggingSystem.info("SettingsUILogic", "onGameLoad triggered for SettingsUI module (v1.6).");
        this.isSettingsTabUnlocked();
        if (coreSystemsRef.coreUIManager && coreSystemsRef.coreUIManager.isActiveTab('settings_ui')) {
            if (!coreSystemsRef.coreUpgradeManager || typeof coreSystemsRef.coreUpgradeManager.getAllRegisteredEffects !== 'function') {
                coreSystemsRef.loggingSystem.error("SettingsUILogic_onGameLoad", "coreUpgradeManager or getAllRegisteredEffects is MISSING/invalid when settings tab is active on game load!");
            } else {
                coreSystemsRef.loggingSystem.debug("SettingsUILogic_onGameLoad", "coreUpgradeManager is PRESENT on game load. Current effects tree snapshot:", coreSystemsRef.coreUpgradeManager.getAllRegisteredEffects());
            }
        }
    },

    onResetState() {
        if (!coreSystemsRef || !coreSystemsRef.loggingSystem || !coreSystemsRef.coreGameStateManager) {
            return;
        }
        coreSystemsRef.loggingSystem.info("SettingsUILogic", "onResetState triggered for SettingsUI module (v1.6).");
        if (coreSystemsRef.coreGameStateManager) {
            coreSystemsRef.coreGameStateManager.setGlobalFlag('settingsTabPermanentlyUnlocked', false);
            coreSystemsRef.loggingSystem.info("SettingsUILogic", "'settingsTabPermanentlyUnlocked' flag cleared.");
        }
    }
};
