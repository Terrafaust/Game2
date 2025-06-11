// modules/skills_module/skills_ui.js (v3.0 - Final Refactor)
// Fully integrated with translationManager.

import { staticModuleData } from './skills_data.js';
import { MODULES } from '../../js/core/constants.js';

let coreSystemsRef = null;
let moduleLogicRef = null;
let parentElementCache = null;

export const ui = {
    initialize(coreSystems, stateRef, logicRef) {
        coreSystemsRef = coreSystems;
        moduleLogicRef = logicRef;
        coreSystemsRef.loggingSystem.info("SkillsUI", "UI initialized (v3.0).");
        document.addEventListener('languagePackChanged', () => {
             if (coreSystemsRef.coreUIManager.isActiveTab(MODULES.SKILLS)) this.renderMainContent(parentElementCache);
        });
    },

    renderMainContent(parentElement) {
        if (!parentElement || !coreSystemsRef || !moduleLogicRef) return;
        parentElementCache = parentElement;
        parentElement.innerHTML = '';
        const { coreGameStateManager } = coreSystemsRef;

        const container = document.createElement('div');
        container.className = 'p-4 space-y-6';

        this._renderSkillTree(container, false); // Regular skills

        if (coreGameStateManager.getGlobalFlag('hasPrestigedOnce', false)) {
            container.appendChild(document.createElement('hr')).className = 'my-8 border-gray-700';
            this._renderSkillTree(container, true); // Prestige skills
        }

        parentElement.appendChild(container);
    },

    _renderSkillTree(container, isPrestige) {
        const { translationManager } = coreSystemsRef;
        const skillsToRender = isPrestige ? staticModuleData.prestigeSkills : staticModuleData.skills;
        const uiData = staticModuleData.ui;

        const titleKey = isPrestige ? 'skills.ui.prestige_skills_title' : 'skills.ui.study_skills_title';
        const pointsDisplayId = isPrestige ? 'prestige-skill-points-display' : 'skill-points-display';

        const title = document.createElement('h2');
        title.className = 'text-2xl font-semibold text-primary mb-2';
        title.textContent = translationManager.get(titleKey);
        container.appendChild(title);

        const pointsDisplay = document.createElement('p');
        pointsDisplay.id = pointsDisplayId;
        pointsDisplay.className = 'text-lg text-accentTwo mb-6';
        container.appendChild(pointsDisplay);
        this.updateSkillPointsDisplay(isPrestige);

        const skillsByTier = {};
        for (const skillId in skillsToRender) {
            const skillDef = skillsToRender[skillId];
            skillsByTier[skillDef.tier] = skillsByTier[skillDef.tier] || [];
            skillsByTier[skillDef.tier].push(skillDef);
        }

        Object.keys(skillsByTier).sort((a, b) => a - b).forEach(tierNum => {
            container.appendChild(this._createTierContainer(tierNum, skillsByTier[tierNum], isPrestige));
        });
    },

    _createTierContainer(tierNum, skillsInTier, isPrestige) {
        const tierContainer = document.createElement('div');
        tierContainer.className = 'mb-8 p-4 border border-gray-700 rounded-lg bg-surface-dark';
        
        tierContainer.innerHTML = `<h3 class="text-xl font-medium text-secondary mb-4">Tier ${tierNum} ${isPrestige ? 'Prestige' : ''} Skills</h3>`;

        if (!moduleLogicRef.isTierUnlocked(tierNum, isPrestige)) {
            const unlockMsgKey = isPrestige ? 'skills.ui.prestige_tier_unlock_message' : 'skills.ui.tier_unlock_message';
            const lockMessage = document.createElement('p');
            lockMessage.className = 'text-textSecondary italic';
            lockMessage.textContent = coreSystemsRef.translationManager.get(unlockMsgKey, { tier: tierNum, tier_minus_1: tierNum - 1});
            tierContainer.appendChild(lockMessage);
        } else {
            const skillsGrid = document.createElement('div');
            skillsGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
            skillsInTier.forEach(skillDef => skillsGrid.appendChild(this._createSkillCard(skillDef, isPrestige)));
            tierContainer.appendChild(skillsGrid);
        }
        return tierContainer;
    },
    
    _createSkillCard(skillDef, isPrestige) {
        const { coreUIManager } = coreSystemsRef;
        const card = document.createElement('div');
        card.id = `skill-card-${skillDef.id}`;
        card.className = 'bg-surface p-4 rounded-lg shadow-md flex flex-col justify-between transition-all duration-200';

        card.innerHTML = `
            <div>
                <h4 class="text-md font-semibold text-textPrimary mb-1">${skillDef.name}</h4>
                <p class="text-textSecondary text-xs mb-2 flex-grow">${skillDef.description}</p>
                <p id="skill-${skillDef.id}-level" class="text-sm text-blue-400 mb-1"></p>
                <p id="skill-${skillDef.id}-effect" class="text-sm text-green-400 mb-2"></p>
                <p id="skill-${skillDef.id}-cost" class="text-xs text-yellow-400 mb-3"></p>
            </div>
        `;
        
        const purchaseButton = coreUIManager.createButton('', () => {
            if (moduleLogicRef.purchaseSkillLevel(skillDef.id, isPrestige)) {
                this.renderMainContent(parentElementCache); // Re-render on success
            }
        }, ['w-full', 'text-sm', 'py-1.5', 'mt-auto'], `skill-purchase-${skillDef.id}`);
        card.appendChild(purchaseButton);

        this._updateSingleSkillCard(card, skillDef, isPrestige);
        return card;
    },

    updateSkillPointsDisplay(isPrestige) {
        if (!parentElementCache || !coreSystemsRef) return;
        const { coreResourceManager, decimalUtility, translationManager } = coreSystemsRef;
        
        const id = isPrestige ? 'prestige-skill-points-display' : 'skill-points-display';
        const display = parentElementCache.querySelector(`#${id}`);
        if (!display) return;
        
        const resourceId = isPrestige ? staticModuleData.prestigeSkillPointResourceId : staticModuleData.skillPointResourceId;
        const labelKey = isPrestige ? staticModuleData.ui.prestigeSkillPointDisplayLabel : staticModuleData.ui.skillPointDisplayLabel;
        
        const points = coreResourceManager.getAmount(resourceId);
        display.textContent = `${translationManager.get(labelKey)} ${decimalUtility.format(points, 2, 0)}`;
    },
    
    _updateSingleSkillCard(cardElement, skillDef, isPrestige) {
        const { decimalUtility, coreResourceManager, translationManager } = coreSystemsRef;
        const level = moduleLogicRef.getSkillLevel(skillDef.id, isPrestige);
        const maxLevel = skillDef.maxLevel;
        const isUnlocked = moduleLogicRef.isSkillUnlocked(skillDef.id, isPrestige);
        
        cardElement.querySelector(`#skill-${skillDef.id}-level`).textContent = translationManager.get('ui.generic.level', { current: level, max: maxLevel });
        cardElement.querySelector(`#skill-${skillDef.id}-effect`).textContent = translationManager.get('ui.generic.effect', { value: moduleLogicRef.getFormattedSkillEffect(skillDef.id, isPrestige) });
        
        const costDisplay = cardElement.querySelector(`#skill-${skillDef.id}-cost`);
        const purchaseButton = cardElement.querySelector(`#skill-purchase-${skillDef.id}`);
        const resourceId = isPrestige ? staticModuleData.prestigeSkillPointResourceId : staticModuleData.skillPointResourceId;
        const currency = isPrestige ? 'PSP' : 'SPP';
        
        if (!isUnlocked) {
            cardElement.classList.add('opacity-50', 'grayscale');
            costDisplay.textContent = translationManager.get('ui.status.locked');
            purchaseButton.disabled = true;
            purchaseButton.textContent = translationManager.get('ui.status.locked');
        } else if (level >= maxLevel) {
            cardElement.classList.remove('opacity-50', 'grayscale');
            costDisplay.textContent = translationManager.get('ui.status.max_level_reached');
            purchaseButton.disabled = true;
            purchaseButton.textContent = translationManager.get('ui.status.maxed');
            purchaseButton.classList.add('bg-green-600');
        } else {
            cardElement.classList.remove('opacity-50', 'grayscale');
            const nextCost = moduleLogicRef.getSkillNextLevelCost(skillDef.id, isPrestige);
            costDisplay.textContent = `${translationManager.get('ui.generic.cost')}: ${decimalUtility.format(nextCost, 2, 0)} ${currency}`;
            purchaseButton.disabled = !coreResourceManager.canAfford(resourceId, nextCost);
            purchaseButton.textContent = translationManager.get('ui.buttons.level_up');
        }
    },

    onShow() {
        if(parentElementCache) this.renderMainContent(parentElementCache);
    },

    onHide() { }
};
