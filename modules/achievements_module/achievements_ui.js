// modules/achievements_module/achievements_ui.js (v1)

/**
 * @file achievements_ui.js
 * @description Handles UI rendering for the Achievements module.
 */

import { staticModuleData } from './achievements_data.js';

let coreSystemsRef = null;
let moduleLogicRef = null;
let parentElementCache = null;

export const ui = {
    initialize(coreSystems, stateRef, logicRef) {
        coreSystemsRef = coreSystems;
        moduleLogicRef = logicRef;
        coreSystemsRef.loggingSystem.info("AchievementsUI", "UI initialized (v1).");
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

        this.updateDynamicElements(); // Initial render of achievement cards
        parentElement.appendChild(container);
    },

    updateDynamicElements() {
        if (!parentElementCache || !moduleLogicRef || !coreSystemsRef) return;
        const achievementsGrid = parentElementCache.querySelector('#achievements-grid');
        if (!achievementsGrid) return;

        achievementsGrid.innerHTML = ''; // Clear previous cards

        for (const achievementId in staticModuleData.achievements) {
            const achievementDef = staticModuleData.achievements[achievementId];
            const card = this._createAchievementCard(achievementDef);
            achievementsGrid.appendChild(card);
        }
    },

    _createAchievementCard(achievementDef) {
        const { coreUIManager, decimalUtility } = coreSystemsRef;
        const isCompleted = moduleLogicRef.isAchievementCompleted(achievementDef.id);
        // For locked display, we might need a more complex check if an achievement itself can be "hidden until condition partly met"
        // For now, all defined achievements are shown, styled by completion.
        const isConditionMetCurrently = moduleLogicRef.checkAchievementCondition(achievementDef.id);


        const card = document.createElement('div');
        card.className = `p-4 rounded-lg shadow-md flex flex-col items-center text-center transition-all duration-300 ${
            isCompleted ? 'bg-green-700 border-2 border-green-400' : 'bg-surface-dark'
        }`;
        if (!isCompleted && !isConditionMetCurrently) {
           // card.classList.add('opacity-60'); // Slightly dim if not yet met
        }

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
        if (isCompleted) {
            status.textContent = staticModuleData.ui.completedText;
        } else if (isConditionMetCurrently) {
            // This state means condition is met, but not yet processed by checkAndCompleteAchievements.
            // Or, if checkAndCompleteAchievements runs frequently, this state might be brief.
            status.textContent = "Condition Met (Pending)"; 
        } else {
            // Show condition text if not completed. This might be too verbose for a small card.
            // Consider showing on hover/tooltip instead.
            // For now, just "Locked" or more specific based on your preference.
            status.textContent = staticModuleData.ui.lockedText;
        }
        card.appendChild(status);

        // Tooltip for condition details, especially if locked
        let tooltipContent = `<p class='font-semibold'>${achievementDef.name}</p>`;
        tooltipContent += `<p class='text-xs'>${achievementDef.description}</p><hr class='my-1 border-gray-600'>`;
        tooltipContent += `<p class='text-xs'>Reward: ${achievementDef.reward.description}</p>`;
        if (!isCompleted) {
            tooltipContent += `<p class='text-xs mt-1'>Condition: ${this._getConditionText(achievementDef.condition)}</p>`;
        }
        card.addEventListener('mouseenter', () => coreUIManager.showTooltip(tooltipContent, card));
        card.addEventListener('mouseleave', () => coreUIManager.hideTooltip());


        return card;
    },

    _getConditionText(condition) {
        const { decimalUtility } = coreSystemsRef;
        switch (condition.type) {
            case "producerOwned":
                // Try to get producer name from studies data, fallback to ID
                const studiesData = coreSystemsRef.staticDataAggregator.getData("studies.producers");
                const producerName = studiesData && studiesData[condition.producerId] ? studiesData[condition.producerId].name : condition.producerId;
                return `Own ${condition.count} ${producerName}.`;
            case "resourceAmount":
                 // Try to get resource name
                let resourceName = condition.resourceId;
                const resDefCore = coreSystemsRef.staticDataAggregator.getData(`core_resource_definitions.${condition.resourceId}`);
                const resDefStudies = coreSystemsRef.staticDataAggregator.getData(`studies.resources.${condition.resourceId}`);
                const resDefMarket = coreSystemsRef.staticDataAggregator.getData(`market.resources.${condition.resourceId}`);
                if (resDefCore) resourceName = resDefCore.name;
                else if (resDefStudies) resourceName = resDefStudies.name;
                else if (resDefMarket) resourceName = resDefMarket.name;
                return `Have ${decimalUtility.format(decimalUtility.new(condition.amount),0)} ${resourceName}.`;
            default:
                return "Meet specific criteria.";
        }
    },

    onShow() {
        coreSystemsRef.loggingSystem.debug("AchievementsUI", "Achievements tab shown.");
        moduleLogicRef.checkAndCompleteAchievements(); // Check for newly completed achievements
        this.updateDynamicElements(); // Refresh UI
    },

    onHide() {
        coreSystemsRef.loggingSystem.debug("AchievementsUI", "Achievements tab hidden.");
        coreSystemsRef.coreUIManager.hideTooltip();
    }
};
