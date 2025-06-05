// modules/settings_ui_module/settings_ui_logic.js (v1.3 - Finalized Statistics)

/**
 * @file settings_ui_logic.js
 * @description Business logic for the Settings UI module.
 * v1.3: Finalized expanded getGameStatistics to include comprehensive data from Market, Skills, Achievements, and Studies.
 * v1.2: Expanded getGameStatistics to include data from Market, Skills, Achievements, and enhanced Studies stats.
 * v1.1: Ensures 'settingsTabPermanentlyUnlocked' flag is cleared on reset.
 */

let coreSystemsRef = null;

export const moduleLogic = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("SettingsUILogic", "Logic initialized (v1.3).");
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
        loggingSystem.info("SettingsUILogic", `Theme set to: ${themeId}, Mode: ${modeId}`);
        coreUIManager.showNotification(`Theme changed to ${themeId} (${modeId})`, "info");
    },

    applyLanguage(langId) {
        const { globalSettingsManager, loggingSystem } = coreSystemsRef;
        globalSettingsManager.setSetting('language', langId);
        loggingSystem.info("SettingsUILogic", `Language set to: ${langId}`);
    },

    // Helper to safely get module logic
    _getModuleLogic(moduleId) {
        const module = coreSystemsRef.moduleLoader.getModule(moduleId);
        return module && module.logic ? module.logic : null;
    },
    
    // Helper to get effect sources from CoreUpgradeManager for a specific module
    _getEffectsFromSourceModule(targetSystem, targetId, effectType, sourceModuleId) {
        const { coreUpgradeManager, decimalUtility, loggingSystem } = coreSystemsRef;
        if (!coreUpgradeManager || !coreUpgradeManager.registeredEffectSources) { // Check if internal structure exists
            loggingSystem.warn("SettingsUILogic", "CoreUpgradeManager or its registeredEffectSources not available.");
            return effectType.includes("MULTIPLIER") ? decimalUtility.new(1) : decimalUtility.new(0);
        }

        const effectKey = `${targetSystem}_${targetId || 'global'}_${effectType}`;
        const allSourcesForEffectKey = coreUpgradeManager.registeredEffectSources[effectKey];

        let aggregatedValue;
        if (effectType.includes("MULTIPLIER")) {
            aggregatedValue = decimalUtility.new(1);
        } else { // ADDITIVE_BONUS etc.
            aggregatedValue = decimalUtility.new(0);
        }

        if (allSourcesForEffectKey) {
            for (const fullSourceId in allSourcesForEffectKey) {
                const effectDetails = allSourcesForEffectKey[fullSourceId];
                if (effectDetails.moduleId === sourceModuleId) {
                    try {
                        const value = effectDetails.valueProvider(); // This should be a Decimal
                        if (effectType.includes("MULTIPLIER")) {
                            // Assuming valueProvider for skills/achievements returns (1 + bonus_decimal)
                            // e.g., a +20% bonus is returned as Decimal(1.2)
                            aggregatedValue = decimalUtility.multiply(aggregatedValue, value);
                        } else { // ADDITIVE_BONUS
                            aggregatedValue = decimalUtility.add(aggregatedValue, value);
                        }
                    } catch (error) {
                        loggingSystem.error("SettingsUILogic", `Error in valueProvider for ${fullSourceId}`, error);
                    }
                }
            }
        }
        return aggregatedValue;
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
        statsHtml += `<li>Total Play Time: ${coreGameStateManager.getTotalPlayTimeString()}</li>`; // Assuming CGSManager has this
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
        if (studiesLogic && studiesLogic.getProducerData) {
            statsHtml += `<div class="${sectionClass}"><h4 class="${headingClass}">Studies</h4><ul class="${listClass}">`;
            let totalSpFromStudies = decimalUtility.new(0);
            if (allResources.studyPoints && allResources.studyPoints.productionSources) {
                for (const sourceKey in allResources.studyPoints.productionSources) {
                    if (sourceKey.startsWith('studies_module_')) { // Filter for studies module sources
                        totalSpFromStudies = decimalUtility.add(totalSpFromStudies, allResources.studyPoints.productionSources[sourceKey]);
                    }
                }
            }
            statsHtml += `<li>Total Study Points/sec (from Producers): ${decimalUtility.format(totalSpFromStudies, 2)}</li>`;

            const studiesProducerStaticData = staticDataAggregator.getData("studies.producers");
            if(studiesProducerStaticData){
                for (const prodId in studiesProducerStaticData) {
                    const producerDef = studiesProducerStaticData[prodId];
                    // getProducerData likely from studies_logic to get 'owned' count
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
                if (currentLevel > 0 && skillDef.costPerLevel) { // Ensure costPerLevel exists
                    for (let i = 0; i < currentLevel; i++) {
                        if(skillDef.costPerLevel[i]){ // Check specific cost for that level
                             totalSspSpent = decimalUtility.add(totalSspSpent, decimalUtility.new(skillDef.costPerLevel[i]));
                        }
                    }
                }
                if (currentLevel >= skillDef.maxLevel && skillDef.maxLevel > 0) skillsMaxedCount++;
            }
            statsHtml += `<li>Study Skill Points Spent: ${decimalUtility.format(totalSspSpent, 0)}</li>`;
            statsHtml += `<li>Skills Unlocked: ${skillsUnlockedCount} / ${totalSkillsDefined}</li>`;
            statsHtml += `<li>Skills Maxed: ${skillsMaxedCount} / ${totalSkillsDefined}</li>`;

            // Global SP Production Multiplier from Skills
            const spMultiplierFromSkills = this._getEffectsFromSourceModule('global_resource_production', 'studyPoints', 'MULTIPLIER', 'skills');
            if (decimalUtility.gt(spMultiplierFromSkills, 1)) {
                const spPercentageBonus = decimalUtility.format(decimalUtility.multiply(decimalUtility.subtract(spMultiplierFromSkills, 1), 100), 0);
                statsHtml += `<li>Global Study Points Prod. Bonus (Skills): +${spPercentageBonus}%</li>`;
            }
            // Global Knowledge Production Multiplier from Skills
            const knowledgeMultiplierFromSkills = this._getEffectsFromSourceModule('global_resource_production', 'knowledge', 'MULTIPLIER', 'skills');
             if (decimalUtility.gt(knowledgeMultiplierFromSkills, 1)) {
                const knowledgePercentageBonus = decimalUtility.format(decimalUtility.multiply(decimalUtility.subtract(knowledgeMultiplierFromSkills, 1), 100), 0);
                statsHtml += `<li>Global Knowledge Prod. Bonus (Skills): +${knowledgePercentageBonus}%</li>`;
            }
            // Example for a specific producer (student) cost reduction from skills
            const studentCostReduction = this._getEffectsFromSourceModule('studies_producers', 'student', 'COST_REDUCTION_MULTIPLIER', 'skills');
            if (decimalUtility.lt(studentCostReduction, 1) && decimalUtility.neq(studentCostReduction, 0) ) { // Assuming 0 means no effect or error
                 const reductionPercentage = decimalUtility.format(decimalUtility.multiply(decimalUtility.subtract(1, studentCostReduction), 100),0);
                 statsHtml += `<li>Student Cost Reduction (Skills): ${reductionPercentage}%</li>`;
            }

            statsHtml += `</ul></div>`;
        }

        // --- Achievements Statistics ---
        const achievementsLogic = this._getModuleLogic('achievements');
        const achievementsStaticDefs = staticDataAggregator.getData('achievements.achievements');
        if (achievementsLogic && achievementsStaticDefs) {
            statsHtml += `<div class="${sectionClass}"><h4 class="${headingClass}">Achievements</h4><ul class="${listClass}">`;
            let completedCount = 0;
            const achievementsModuleState = coreGameStateManager.getModuleState('achievements'); // Get the raw state
            if (achievementsModuleState && achievementsModuleState.completedAchievements) {
                 completedCount = Object.values(achievementsModuleState.completedAchievements).filter(c => c === true).length;
            }
            statsHtml += `<li>Achievements Completed: ${completedCount} / ${Object.keys(achievementsStaticDefs).length}</li>`;
            
            const spMultiplierFromAchievements = this._getEffectsFromSourceModule('global_resource_production', 'studyPoints', 'MULTIPLIER', 'achievements');
            if (decimalUtility.gt(spMultiplierFromAchievements, 1)) {
                const spPercentageBonusAch = decimalUtility.format(decimalUtility.multiply(decimalUtility.subtract(spMultiplierFromAchievements, 1), 100), 0);
                statsHtml += `<li>Global Study Points Prod. Bonus (Achievements): +${spPercentageBonusAch}%</li>`;
            }
            statsHtml += `</ul></div>`;
        }
        
        statsHtml += "<p class='text-xs mt-4 text-textSecondary text-center'>More statistics and detailed breakdowns may be added in the future.</p>";
        return statsHtml;
    },

    onGameLoad() {
        if (!coreSystemsRef || !coreSystemsRef.loggingSystem) {
            console.error("SettingsUILogic: onGameLoad called before coreSystemsRef initialized.");
            return;
        }
        coreSystemsRef.loggingSystem.info("SettingsUILogic", "onGameLoad triggered for SettingsUI module (v1.3).");
        this.isSettingsTabUnlocked();
    },

    onResetState() {
        if (!coreSystemsRef || !coreSystemsRef.loggingSystem || !coreSystemsRef.coreGameStateManager) {
            console.error("SettingsUILogic: onResetState called before coreSystemsRef or coreGameStateManager initialized.");
            return;
        }
        coreSystemsRef.loggingSystem.info("SettingsUILogic", "onResetState triggered for SettingsUI module (v1.3).");
        if (coreSystemsRef.coreGameStateManager) {
            coreSystemsRef.coreGameStateManager.setGlobalFlag('settingsTabPermanentlyUnlocked', false);
            coreSystemsRef.loggingSystem.info("SettingsUILogic", "'settingsTabPermanentlyUnlocked' flag cleared.");
        }
    }
};
