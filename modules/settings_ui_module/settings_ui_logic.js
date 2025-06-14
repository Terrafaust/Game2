// modules/settings_ui_module/settings_ui_logic.js (v2.2 - Conditional Unlock Checks)

/**
 * @file settings_ui_logic.js
 * @description Business logic for the Settings UI module.
 * v2.2: Added functions to check if Themes and Statistics are unlocked.
 * v2.1: Restored original statistics sections and merged with new ones for a complete view.
 */

let coreSystemsRef = null;

export const moduleLogic = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("SettingsUILogic", "Logic initialized (v2.2).");
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
    
    // --- NEW: Function to check if themes are unlocked ---
    areThemesUnlocked() {
        if (!coreSystemsRef || !coreSystemsRef.coreGameStateManager) return false;
        return coreSystemsRef.coreGameStateManager.getGlobalFlag('themesUnlocked', false);
    },

    // --- NEW: Function to check if stats are unlocked ---
    areStatsUnlocked() {
        if (!coreSystemsRef || !coreSystemsRef.coreGameStateManager) return false;
        return coreSystemsRef.coreGameStateManager.getGlobalFlag('gameStatsUnlocked', false);
    },

    applyTheme(themeId, modeId) {
        const { globalSettingsManager, loggingSystem, coreUIManager } = coreSystemsRef;
        globalSettingsManager.setSetting('theme.name', themeId);
        globalSettingsManager.setSetting('theme.mode', modeId);
        
        coreUIManager.applyTheme(themeId, modeId);

        loggingSystem.info("SettingsUILogic", `Theme set to: ${themeId}, Mode: ${modeId}`);
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
    
    isNotificationLogUnlocked() {
        return coreSystemsRef.coreGameStateManager.getGlobalFlag('notificationLogUnlocked', false);
    },

    purchaseNotificationLogUnlock() {
        const { coreResourceManager, coreGameStateManager, coreUIManager, decimalUtility } = coreSystemsRef;
        const cost = decimalUtility.new('1e8');
        
        if (coreResourceManager.canAfford('studyPoints', cost)) {
            coreResourceManager.spendAmount('studyPoints', cost);
            coreGameStateManager.setGlobalFlag('notificationLogUnlocked', true);
            coreUIManager.showNotification("Notification Logs Unlocked!", 'success');
            
            const mainContentDiv = document.getElementById('main-content');
            if (mainContentDiv && coreUIManager.isActiveTab('settings_ui')) {
                const settingsUI = coreSystemsRef.moduleLoader.getModule('settings_ui').ui;
                settingsUI.renderMainContent(mainContentDiv);
            }
        } else {
            coreUIManager.showNotification("Not enough Study Points to unlock.", 'error');
        }
    },
    
    getGameStatistics() {
        if (!coreSystemsRef) return "<p>Core systems not available for statistics.</p>";
        const { coreResourceManager, coreGameStateManager, moduleLoader, decimalUtility, staticDataAggregator, loggingSystem } = coreSystemsRef;
        let statsHtml = "";

        const sectionClass = "mb-4 p-3 bg-surface-dark rounded-md shadow";
        const headingClass = "text-lg font-semibold text-secondary mb-2";
        const listClass = "list-disc list-inside space-y-1 pl-2 text-sm";
        const subHeadingClass = "text-md font-medium text-primary mt-3 mb-1";

        // --- General Game Info ---
        statsHtml += `<div class="${sectionClass}"><h4 class="${headingClass}">General</h4><ul class="${listClass}">`;
        statsHtml += `<li>Game Version: ${coreGameStateManager.getGameVersion()}</li>`;
        const lastSave = coreGameStateManager.getLastSaveTime();
        statsHtml += `<li>Last Save: ${lastSave ? new Date(lastSave).toLocaleString() : 'Never'}</li>`;
        statsHtml += `<li>Total Play Time: ${coreGameStateManager.getTotalPlayTimeString()}</li>`;
        statsHtml += `</ul></div>`;

        // --- Prestige Stats ---
        const prestigeLogic = this._getModuleLogic('prestige');
        const prestigeState = coreGameStateManager.getModuleState('prestige');
        if (prestigeLogic && prestigeState) {
            statsHtml += `<div class="${sectionClass}"><h4 class="${headingClass}">Prestige</h4><ul class="${listClass}">`;
            const runTime = this._formatDuration(prestigeState.currentPrestigeRunTime || 0);
            statsHtml += `<li>Time in this Prestige: ${runTime}</li>`;
            const totalPP = coreResourceManager.getAmount('prestigePoints');
            statsHtml += `<li>Prestige Points: ${decimalUtility.format(totalPP, 2)}</li>`;
            const totalPrestiges = decimalUtility.new(prestigeState.totalPrestigeCount || '0');
            statsHtml += `<li>Total Prestiges: ${decimalUtility.format(totalPrestiges, 0)}</li>`;
            statsHtml += `</ul></div>`;
        }
        
        // --- Production Stats (This Prestige vs. All Time) ---
        statsHtml += `<div class="${sectionClass}"><h4 class="${headingClass}">Production Stats</h4>`;
        const totalSP = coreResourceManager.getTotalEarned('studyPoints') || decimalUtility.new(0);
        const spThisPrestige = decimalUtility.subtract(totalSP, prestigeState?.statsSnapshotAtPrestige?.totalStudyPointsProduced || '0');
        statsHtml += `<h5 class="${subHeadingClass}">Study Points</h5><ul class="${listClass}">`;
        statsHtml += `<li>Produced this Prestige: ${decimalUtility.format(spThisPrestige, 2)}</li>`;
        statsHtml += `<li>Produced all time: ${decimalUtility.format(totalSP, 2)}</li>`;
        statsHtml += `</ul>`;

        const totalK = coreResourceManager.getTotalEarned('knowledge') || decimalUtility.new(0);
        const kThisPrestige = decimalUtility.subtract(totalK, prestigeState?.statsSnapshotAtPrestige?.totalKnowledgeProduced || '0');
        statsHtml += `<h5 class="${subHeadingClass}">Knowledge</h5><ul class="${listClass}">`;
        statsHtml += `<li>Produced this Prestige: ${decimalUtility.format(kThisPrestige, 2)}</li>`;
        statsHtml += `<li>Produced all time: ${decimalUtility.format(totalK, 2)}</li>`;
        statsHtml += `</ul>`;
        statsHtml += `</div>`;
        
        // --- Resource Statistics ---
        statsHtml += `<div class="${sectionClass}"><h4 class="${headingClass}">Current Resources & Production</h4><ul class="${listClass}">`;
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
        
        return statsHtml;
    },

    _formatDuration(totalSeconds) {
        totalSeconds = Math.floor(totalSeconds);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return [
            hours.toString().padStart(2, '0'),
            minutes.toString().padStart(2, '0'),
            seconds.toString().padStart(2, '0')
        ].join(':');
    },

    getPrestigeHistoryHTML() {
        const { decimalUtility } = coreSystemsRef;
        const prestigeState = coreSystemsRef.coreGameStateManager.getModuleState('prestige');
        const history = prestigeState?.lastTenPrestiges || [];

        if (history.length === 0) {
            return '<p class="text-sm text-textSecondary italic">You have not prestiged yet.</p>';
        }

        let tableHtml = `
            <div class="overflow-x-auto">
                <table class="w-full text-sm text-left">
                    <thead class="text-xs text-textSecondary uppercase bg-surface">
                        <tr>
                            <th scope="col" class="px-4 py-2">#</th>
                            <th scope="col" class="px-4 py-2">Time</th>
                            <th scope="col" class="px-4 py-2">PP Gained</th>
                        </tr>
                    </thead>
                    <tbody>`;

        history.forEach(p => {
            tableHtml += `
                <tr class="bg-surface-dark border-b border-gray-700">
                    <td class="px-4 py-2 font-medium">${p.count}</td>
                    <td class="px-4 py-2">${this._formatDuration(p.time)}</td>
                    <td class="px-4 py-2 text-yellow-300">${decimalUtility.format(p.ppGained, 2)}</td>
                </tr>`;
        });

        tableHtml += '</tbody></table></div>';
        return tableHtml;
    },
    
    onGameLoad() {
        if (!coreSystemsRef || !coreSystemsRef.loggingSystem) {
            return;
        }
        coreSystemsRef.loggingSystem.info("SettingsUILogic", "onGameLoad triggered for SettingsUI module.");
        this.isSettingsTabUnlocked();
    },

    onResetState() {
        if (!coreSystemsRef || !coreSystemsRef.loggingSystem || !coreSystemsRef.coreGameStateManager) {
            return;
        }
        coreSystemsRef.loggingSystem.info("SettingsUILogic", "onResetState triggered for SettingsUI module.");
        if (coreSystemsRef.coreGameStateManager) {
            coreSystemsRef.coreGameStateManager.setGlobalFlag('settingsTabPermanentlyUnlocked', false);
            coreSystemsRef.coreGameStateManager.setGlobalFlag('notificationLogUnlocked', false);
            // --- NEW: Reset new flags on hard reset ---
            coreSystemsRef.coreGameStateManager.setGlobalFlag('themesUnlocked', false);
            coreSystemsRef.coreGameStateManager.setGlobalFlag('gameStatsUnlocked', false);
            // --- END NEW ---
            coreSystemsRef.loggingSystem.info("SettingsUILogic", "Relevant flags cleared.");
        }
    }
};
