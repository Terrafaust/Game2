// modules/achievements_module/achievements_ui.js (v2.1 - Full Translation)
// Now uses translationManager for all UI text, including dynamic condition text.

import { staticModuleData } from './achievements_data.js';
import { MODULES } from '../../js/core/constants.js';

let coreSystemsRef = null;
let moduleLogicRef = null;
let parentElementCache = null;

export const ui = {
    initialize(coreSystems, stateRef, logicRef) {
        coreSystemsRef = coreSystems;
        moduleLogicRef = logicRef;
        coreSystemsRef.loggingSystem.info("AchievementsUI", "UI initialized (v2.1).");
        document.addEventListener('languagePackChanged', () => {
             if (coreSystemsRef.coreUIManager.isActiveTab(MODULES.ACHIEVEMENTS)) {
                this.renderMainContent(parentElementCache);
            }
        });
    },

    renderMainContent(parentElement) {
        if (!parentElement || !coreSystemsRef || !moduleLogicRef) return;
        parentElementCache = parentElement;
        parentElement.innerHTML = ''; 

        const { translationManager } = coreSystemsRef;
        const container = document.createElement('div');
        container.className = 'p-4 space-y-6';

        const title = document.createElement('h2');
        title.className = 'text-2xl font-semibold text-primary mb-2';
        title.textContent = translationManager.get('achievements.ui.title');
        container.appendChild(title);
        
        const summaryBox = document.createElement('div');
        summaryBox.id = 'achievements-summary-box';
        summaryBox.className = 'bg-surface-dark p-4 rounded-lg text-center space-y-2';
        
        const tipText = document.createElement('p');
        tipText.className = 'text-sm text-textSecondary italic';
        tipText.textContent = translationManager.get('achievements.ui.bonus_tip');
        summaryBox.appendChild(tipText);
        
        const statsText = document.createElement('p');
        statsText.id = 'achievements-stats-display';
        statsText.className = 'text-md font-semibold text-accentOne';
        summaryBox.appendChild(statsText);
        container.appendChild(summaryBox);

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
        
        const { translationManager } = coreSystemsRef;
        const statsDisplay = parentElementCache.querySelector('#achievements-stats-display');
        if (statsDisplay) {
            const completedCount = moduleLogicRef.getCompletedAchievementCount();
            const totalAchievements = Object.keys(staticModuleData.achievements).length;
            statsDisplay.textContent = translationManager.get('achievements.ui.summary', {
                completed: completedCount,
                total: totalAchievements,
                bonus: completedCount // 1% per achievement
            });
        }

        achievementsGrid.innerHTML = '';
        for (const achievementId in staticModuleData.achievements) {
            const achievementDef = staticModuleData.achievements[achievementId];
            const card = this._createAchievementCard(achievementDef);
            achievementsGrid.appendChild(card);
        }
    },

    _createAchievementCard(achievementDef) {
        const { translationManager } = coreSystemsRef;
        const isCompleted = moduleLogicRef.isAchievementCompleted(achievementDef.id);
        
        const card = document.createElement('div');
        card.id = `achievement-card-${achievementDef.id}`; 
        card.className = `achievement-card p-4 rounded-lg shadow-md flex flex-col items-center text-center transition-all duration-300 cursor-pointer ${isCompleted ? 'achievement-completed' : 'bg-surface-dark'}`;
        
        card.innerHTML = `
            <div class="text-4xl mb-2">${achievementDef.icon || '🏆'}</div>
            <h4 class="text-md font-semibold text-textPrimary mb-1">${achievementDef.name}</h4>
            <p class="text-xs text-textSecondary mb-2 flex-grow">${achievementDef.description}</p>
            <p class="text-xs font-medium text-yellow-400 mb-2">${translationManager.get('ui.generic.reward', { description: achievementDef.reward.description })}</p>
            <p class="text-sm font-bold ${isCompleted ? 'text-green-300' : 'text-gray-400'}">${isCompleted ? translationManager.get('ui.status.completed') : translationManager.get('ui.status.locked')}</p>
        `;

        card.addEventListener('click', () => this.showAchievementModal(achievementDef));
        return card;
    },

    showAchievementModal(achievementDef) {
        const { coreUIManager, translationManager } = coreSystemsRef;
        const isCompleted = moduleLogicRef.isAchievementCompleted(achievementDef.id);
        let modalContent = `<div class="space-y-2">
            <p class='text-base text-textPrimary'>${achievementDef.description}</p>
            <hr class='my-2 border-gray-600'>
            <p class='text-sm'><span class="font-semibold text-yellow-400">${translationManager.get('ui.generic.reward', {description: ''})}</span> ${achievementDef.reward.description}</p>
            ${!isCompleted ? `<p class='text-sm mt-1'><span class="font-semibold text-accentOne">${translationManager.get('ui.generic.condition', {text: ''})}</span> ${this._getConditionText(achievementDef.condition)}</p>` : ''}
        </div>`;
        coreUIManager.showModal(`${achievementDef.icon} ${achievementDef.name}`, modalContent, [{label: "ui.buttons.close", callback: () => coreUIManager.closeModal()}]);
    },

    _getConditionText(condition) {
        const { decimalUtility, staticDataAggregator, translationManager } = coreSystemsRef;
        switch (condition.type) {
            case "producerOwned":
                const producerData = staticDataAggregator.getData(`studies.producers.${condition.producerId}`);
                const isPlural = condition.count > 1;
                const nameKey = `studies.producers.${condition.producerId}.${isPlural ? 'name_plural' : 'name'}`;
                let producerName = translationManager.get(nameKey);
                if (producerName.startsWith('{')) { // Fallback
                    producerName = producerData?.name || condition.producerId;
                    if (isPlural) producerName += 's';
                }
                return translationManager.get('achievements.ui.condition.own_producers', { count: condition.count, name: producerName });
            case "resourceAmount":
                const resName = translationManager.get(`resources.${condition.resourceId}`) || coreSystemsRef.coreResourceManager.getResource(condition.resourceId)?.name || condition.resourceId;
                return translationManager.get('achievements.ui.condition.have_resource', { amount: decimalUtility.format(condition.amount,0), name: resName });
            default:
                return translationManager.get('achievements.ui.condition.default');
        }
    },

    onShow() {
        moduleLogicRef.checkAndCompleteAchievements();
        this.updateDynamicElements();
    },

    onHide() {
        coreSystemsRef.coreUIManager.hideTooltip();
    }
};
