// modules/achievements_module/achievements_ui.js (v1.1 - Modal Popups)

/**
 * @file achievements_ui.js
 * @description Handles UI rendering for the Achievements module.
 * v1.1: Switched tooltips to use the new themed modal system.
 */

import { staticModuleData } from './achievements_data.js';

let coreSystemsRef = null;
let moduleLogicRef = null;
let parentElementCache = null;

export const ui = {
    initialize(coreSystems, stateRef, logicRef) {
        coreSystemsRef = coreSystems;
        moduleLogicRef = logicRef;
        coreSystemsRef.loggingSystem.info("AchievementsUI", "UI initialized (v1.1).");
    },

    renderMainContent(parentElement) {
        if (!coreSystemsRef || !moduleLogicRef) {
            parentElement.innerHTML = '<p class="text-red-500">Achievements UI not properly initialized.</p>';
            return;
        }
        parentElementCache = parentElement;
        parentElement.innerHTML = ''; 

        const container = document.createElement('div');
        container.className = 'p-4 space-y-6';

        const title = document.createElement('h2');
        title.className = 'text-2xl font-semibold text-primary mb-4';
        title.textContent = 'Achievements';
        container.appendChild(title);

        const achievementsGrid = document.createElement('div');
        achievementsGrid.id = 'achievements-grid';
        achievementsGrid.className = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4';
        container.appendChild(achievementsGrid);

        this.updateDynamicElements();
        parentElement.appendChild(container);
    },

    updateDynamicElements() {
        if (!parentElementCache || !moduleLogicRef || !coreSystemsRef) return;
        const achievementsGrid = parentElementCache.querySelector('#achievements-grid');
        if (!achievementsGrid) return;

        achievementsGrid.innerHTML = '';

        for (const achievementId in staticModuleData.achievements) {
            const achievementDef = staticModuleData.achievements[achievementId];
            const card = this._createAchievementCard(achievementDef);
            achievementsGrid.appendChild(card);
        }
    },

    _createAchievementCard(achievementDef) {
        const { coreUIManager, decimalUtility } = coreSystemsRef;
        const isCompleted = moduleLogicRef.isAchievementCompleted(achievementDef.id);
        const isConditionMetCurrently = moduleLogicRef.checkAchievementCondition(achievementDef.id);

        const card = document.createElement('div');
        card.className = `p-4 rounded-lg shadow-md flex flex-col items-center text-center transition-all duration-300 cursor-pointer ${
            isCompleted ? 'bg-green-700 border-2 border-green-400' : 'bg-surface-dark'
        }`;
        
        const icon = document.createElement('div');
        icon.className = 'text-4xl mb-2';
        icon.textContent = achievementDef.icon || '🏆';
        card.appendChild(icon);

        const name = document.createElement('h4');
        name.className = 'text-md font-semibold text-textPrimary mb-1';
        name.textContent = achievementDef.name;
        card.appendChild(name);

        const description = document.createElement('p');
        description.className = 'text-xs text-textSecondary mb-2 flex-grow';
        description.textContent = achievementDef.description;
        card.appendChild(description);
        
        const rewardDescription = document.createElement('p');
        rewardDescription.className = 'text-xs font-medium text-yellow-400 mb-2';
        rewardDescription.textContent = `Reward: ${achievementDef.reward.description}`;
        card.appendChild(rewardDescription);

        const status = document.createElement('p');
        status.className = `text-sm font-bold ${isCompleted ? 'text-green-300' : 'text-gray-400'}`;
        status.textContent = isCompleted ? staticModuleData.ui.completedText : staticModuleData.ui.lockedText;
        card.appendChild(status);

        // --- FIX: Change tooltip to use the new modal system ---
        card.addEventListener('click', () => {
            let modalContent = `<div class="space-y-2">`;
            modalContent += `<p class='text-base text-textPrimary'>${achievementDef.description}</p><hr class='my-2 border-gray-600'>`;
            modalContent += `<p class='text-sm'><span class="font-semibold text-yellow-400">Reward:</span> ${achievementDef.reward.description}</p>`;
            if (!isCompleted) {
                modalContent += `<p class='text-sm mt-1'><span class="font-semibold text-accentOne">Condition:</span> ${this._getConditionText(achievementDef.condition)}</p>`;
            }
             modalContent += `</div>`;
            coreUIManager.showModal(`${achievementDef.icon} ${achievementDef.name}`, modalContent, [{label: "Close", callback: () => coreUIManager.closeModal()}]);
        });
        
        return card;
    },

    _getConditionText(condition) {
        const { decimalUtility, staticDataAggregator } = coreSystemsRef;
        switch (condition.type) {
            case "producerOwned":
                const studiesData = staticDataAggregator.getData("studies.producers");
                const producerName = studiesData?.[condition.producerId]?.name || condition.producerId;
                return `Own ${condition.count} ${producerName}.`;
            case "resourceAmount":
                const resDef = staticDataAggregator.getData(`core_resource_definitions.${condition.resourceId}`) || staticDataAggregator.getData(`studies.resources.${condition.resourceId}`) || { name: condition.resourceId };
                return `Have ${decimalUtility.format(decimalUtility.new(condition.amount),0)} ${resDef.name}.`;
            default:
                // Provide a more descriptive fallback for unhandled types
                return `Meet a specific in-game criteria. (Type: ${condition.type})`;
        }
    },

    onShow() {
        coreSystemsRef.loggingSystem.debug("AchievementsUI", "Achievements tab shown.");
        moduleLogicRef.checkAndCompleteAchievements();
        this.updateDynamicElements();
    },

    onHide() {
        coreSystemsRef.loggingSystem.debug("AchievementsUI", "Achievements tab hidden.");
        coreSystemsRef.coreUIManager.hideTooltip(); // Keep this to clear any old tooltips that might be stuck
    }
};

