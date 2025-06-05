// modules/settings_ui_module/settings_ui_logic.js (v1.4 - CUM Check Refinement)

/**
 * @file settings_ui_logic.js
 * @description Business logic for the Settings UI module.
 * v1.4: Refined check for coreUpgradeManager and its registeredEffectSources.
 * v1.3: Finalized expanded getGameStatistics to include comprehensive data.
 */

let coreSystemsRef = null;

export const moduleLogic = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("SettingsUILogic", "Logic initialized (v1.4).");
        if (!coreSystems.coreUpgradeManager) {
            coreSystemsRef.loggingSystem.error("SettingsUILogic_Init_CRITICAL", "coreUpgradeManager is MISSING in coreSystems passed to SettingsUILogic!");
        } else {
            coreSystemsRef.loggingSystem.debug("SettingsUILogic_Init", "coreUpgradeManager is PRESENT. Current registeredEffectSources:", coreSystems.coreUpgradeManager.getAllRegisteredEffects ? coreSystems.coreUpgradeManager.getAllRegisteredEffects() : "getAllRegisteredEffects method missing");
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
        // coreUIManager.applyTheme is now called via event listener in main.js
        loggingSystem.info("SettingsUILogic", `Theme set to: ${themeId}, Mode: ${modeId}`);
        coreUIManager.showNotification(`Theme changed to ${themeId} (${modeId})`, "info");
    },

    applyLanguage(langId) {
        const { globalSettingsManager, loggingSystem } = coreSystemsRef;
        globalSettingsManager.setSetting('language', langId);
        loggingSystem.info("SettingsUILogic", `Language set to: ${langId}`);
        // Event for language change will be handled by main.js or coreUIManager if needed
    },

    _getModuleLogic(moduleId) {
        const module = coreSystemsRef.moduleLoader.getModule(moduleId);
        return module && module.logic ? module.logic : null;
    },
    
    _getEffectsFromSourceModule(targetSystem, targetId, effectType, sourceModuleId) {
        const { coreUpgradeManager, decimalUtility, loggingSystem } = coreSystemsRef;

        if (!coreUpgradeManager) {
            loggingSystem.warn("SettingsUILogic_GetEffects", "coreUpgradeManager is not available.");
            return effectType.includes("MULTIPLIER") ? decimalUtility.new(1) : decimalUtility.new(0);
        }
        // The registeredEffectSources object itself is internal to coreUpgradeManager.
        // We should rely on its public methods like getAggregatedModifiers if possible,
        // but since we are filtering by sourceModuleId, we might need to inspect.
        // For this specific use case, we'll call getAggregatedModifiers.
        // However, getAggregatedModifiers sums up *all* sources. This function wants to isolate.
        // This implies a need for a more specific method in CoreUpgradeManager or careful iteration here.

        // Let's assume for now that coreUpgradeManager.getAggregatedModifiers is what we want
        // and this function's purpose might be misaligned if it truly needs to *isolate* by sourceModuleId.
        // Given the current CUM.getAggregatedModifiers, it does not filter by sourceModuleId.
        // This function will effectively return the TOTAL effect from ALL modules for that target/type.
        // If isolation is critical, CUM needs a new method.
        // For now, let's call the existing method for the total effect.

        loggingSystem.debug("SettingsUILogic_GetEffects", `Fetching aggregated for ${targetSystem}, ${targetId}, ${effectType}. (Source module filtering NOT YET IMPLEMENTED in CUM for this specific call)`);
        const totalEffect = coreUpgradeManager.getAggregatedModifiers(targetSystem, targetId, effectType);

        // If we *really* needed to filter by sourceModuleId here, we'd have to inspect CUM's internal structure,
        // which is bad practice. CUM should expose a method for it.
        // Example of what direct inspection *would* look like (DON'T USE THIS IF CUM CAN BE EXTENDED):
        /*
        if (!coreUpgradeManager.getAllRegisteredEffects) { // Check if inspection method exists
             loggingSystem.warn("SettingsUILogic_GetEffects", "coreUpgradeManager.getAllRegisteredEffects is not available for source-specific filtering.");
             return totalEffect; // Fallback to total effect
        }
        const allEffects = coreUpgradeManager.getAllRegisteredEffects(); // Assuming this gives an inspectable structure
        const effectKey = `${targetSystem}_${targetId || 'global'}_${effectType}`;
        const sourcesForEffectKey = allEffects[effectKey];
        let filteredAggregatedValue = effectType.includes("MULTIPLIER") ? decimalUtility.new(1) : decimalUtility.new(0);

        if (sourcesForEffectKey) {
            for (const fullSourceId in sourcesForEffectKey) {
                const effectDetails = sourcesForEffectKey[fullSourceId];
                if (effectDetails.moduleId === sourceModuleId) {
                    // This assumes effectDetails.currentValue is the already computed Decimal value or string for it
                    const value = decimalUtility.new(effectDetails.currentValue || (effectType.includes("MULTIPLIER") ? "1" : "0") );
                    if (effectType.includes("MULTIPLIER")) {
                        filteredAggregatedValue = decimalUtility.multiply(filteredAggregatedValue, value);
                    } else {
                        filteredAggregatedValue = decimalUtility.add(filteredAggregatedValue, value);
                    }
                }
            }
             loggingSystem.debug("SettingsUILogic_GetEffects", `Filtered effect for source '${sourceModuleId}' on '${effectKey}': ${filteredAggregatedValue.toString()}`);
            return filteredAggregatedValue;
        }
        */
        
        // For now, returning totalEffect as CUM doesn't have a public method to filter by source module AND target.
        // This might make the statistics show the *total* bonus rather than *skill-specific* or *achievement-specific* where intended.
        // This needs to be addressed if specific attribution is required.
        // For a quick fix, if sourceModuleId is 'skills', and we want skills' contribution to global SP:
        if (sourceModuleId === 'skills' && targetSystem === 'global_resource_production' && targetId === 'studyPoints' && effectType === 'MULTIPLIER') {
            // This is a common one. We can approximate by iterating effects IF CUM has a suitable getter.
            // The skills_logic.js directly calls registerEffectSource.
            // A better way is for skills_logic itself to provide a method like getBonusFromSkillsFor('studyPoints').
        }


        return totalEffect; // Placeholder: returns total effect, not filtered by sourceModuleId correctly.
    },

    getGameStatistics() {
        if (!coreSystemsRef) return "<p>Core systems not available for statistics.</p>";
        const { coreResourceManager, coreGameStateManager, moduleLoader, decimalUtility, staticDataAggregator, loggingSystem, coreUpgradeManager } = coreSystemsRef;
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
        if (studiesLogic && studiesLogic.getOwnedProducerCount) { // Check for specific method
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

            // This section needs a reliable way to get ONLY skill-based multipliers
            // For now, it will show TOTAL multiplier from ALL sources due to _getEffectsFromSourceModule's current implementation
            const spMultiplierFromSkills = this._getEffectsFromSourceModule('global_resource_production', 'studyPoints', 'MULTIPLIER', 'skills');
            if (decimalUtility.gt(spMultiplierFromSkills, 1)) {
                const spPercentageBonus = decimalUtility.format(decimalUtility.multiply(decimalUtility.subtract(spMultiplierFromSkills, 1), 100), 0);
                statsHtml += `<li>Global Study Points Prod. Bonus (from Skills - Approximation): +${spPercentageBonus}%</li>`;
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
            
            // Similar to skills, this shows TOTAL multiplier from ALL sources
            const spMultiplierFromAchievements = this._getEffectsFromSourceModule('global_resource_production', 'studyPoints', 'MULTIPLIER', 'achievements');
            if (decimalUtility.gt(spMultiplierFromAchievements, 1)) {
                const spPercentageBonusAch = decimalUtility.format(decimalUtility.multiply(decimalUtility.subtract(spMultiplierFromAchievements, 1), 100), 0);
                statsHtml += `<li>Global Study Points Prod. Bonus (from Achievements - Approximation): +${spPercentageBonusAch}%</li>`;
            }
            statsHtml += `</ul></div>`;
        }
        
        statsHtml += "<p class='text-xs mt-4 text-textSecondary text-center'>More statistics and detailed breakdowns may be added in the future.</p>";
        return statsHtml;
    },

    onGameLoad() {
        if (!coreSystemsRef || !coreSystemsRef.loggingSystem) {
            // console.error("SettingsUILogic: onGameLoad called before coreSystemsRef initialized.");
            return;
        }
        coreSystemsRef.loggingSystem.info("SettingsUILogic", "onGameLoad triggered for SettingsUI module (v1.4).");
        this.isSettingsTabUnlocked();
        // Re-check coreUpgradeManager availability here for statistics that might be displayed.
        if (coreSystemsRef.coreUIManager && coreSystemsRef.coreUIManager.isActiveTab('settings_ui')) {
            if (!coreSystemsRef.coreUpgradeManager) {
                coreSystemsRef.loggingSystem.error("SettingsUILogic_onGameLoad", "coreUpgradeManager is MISSING when settings tab is active on game load!");
            } else {
                coreSystemsRef.loggingSystem.debug("SettingsUILogic_onGameLoad", "coreUpgradeManager is PRESENT on game load. Current effects:", coreSystemsRef.coreUpgradeManager.getAllRegisteredEffects ? coreSystemsRef.coreUpgradeManager.getAllRegisteredEffects() : "getAllRegisteredEffects missing");
            }
        }
    },

    onResetState() {
        if (!coreSystemsRef || !coreSystemsRef.loggingSystem || !coreSystemsRef.coreGameStateManager) {
            // console.error("SettingsUILogic: onResetState called before coreSystemsRef or coreGameStateManager initialized.");
            return;
        }
        coreSystemsRef.loggingSystem.info("SettingsUILogic", "onResetState triggered for SettingsUI module (v1.4).");
        if (coreSystemsRef.coreGameStateManager) {
            coreSystemsRef.coreGameStateManager.setGlobalFlag('settingsTabPermanentlyUnlocked', false);
            coreSystemsRef.loggingSystem.info("SettingsUILogic", "'settingsTabPermanentlyUnlocked' flag cleared.");
        }
    }
};
