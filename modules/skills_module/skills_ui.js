// modules/skills_module/skills_ui.js (v2.3 - Prestige Skill Points UI Display)

/**
 * @file skills_ui.js
 * @description Handles UI rendering and interactions for both regular and prestige skills.
 * v2.3: Updated currency display for prestige skills to use 'PSP'.
 * v2.2: Fixed error 'isPrestigeTierUnlocked is not a function'.
 * v2.1: Rebuilt to handle two distinct skill trees and currencies.
 */

import { staticModuleData } from './skills_data.js';

let coreSystemsRef = null;
let moduleLogicRef = null;
let parentElementCache = null;

export const ui = {
    initialize(coreSystems, stateRef, logicRef) {
        coreSystemsRef = coreSystems;
        moduleLogicRef = logicRef;
        coreSystemsRef.loggingSystem.info("SkillsUI", "UI initialized (v2.3).");
    },

    renderMainContent(parentElement) {
        parentElementCache = parentElement;
        parentElement.innerHTML = '';
        const { coreGameStateManager } = coreSystemsRef;

        const container = document.createElement('div');
        container.className = 'p-4 space-y-6';

        // --- Render the Regular Skills Section ---
        this._renderSkillTree(container, false); // isPrestige = false

        // --- Conditionally render the Prestige Skills Section ---
        if (coreGameStateManager.getGlobalFlag('hasPrestigedOnce', false)) {
            const separator = document.createElement('hr');
            separator.className = 'my-8 border-gray-600';
            container.appendChild(separator);
            
            this._renderSkillTree(container, true); // isPrestige = true
        }

        parentElement.appendChild(container);
    },

    _renderSkillTree(container, isPrestige) {
        const skillsToRender = isPrestige ? staticModuleData.prestigeSkills : staticModuleData.skills;
        const uiData = staticModuleData.ui;

        const title = document.createElement('h2');
        title.className = 'text-2xl font-semibold text-primary mb-2';
        title.textContent = isPrestige ? uiData.prestigeSkillsTitle : 'Study Skills';
        container.appendChild(title);

        const pointsDisplay = document.createElement('p');
        pointsDisplay.id = isPrestige ? 'prestige-skill-points-display' : 'skill-points-display';
        pointsDisplay.className = 'text-lg text-accentTwo mb-6';
        container.appendChild(pointsDisplay);
        this.updateSkillPointsDisplay(isPrestige);

        const skillsByTier = {};
        for (const skillId in skillsToRender) {
            const skillDef = skillsToRender[skillId];
            if (!skillsByTier[skillDef.tier]) skillsByTier[skillDef.tier] = [];
            skillsByTier[skillDef.tier].push(skillDef);
        }

        Object.keys(skillsByTier).sort((a, b) => a - b).forEach(tierNum => {
            const tierContainer = this._createTierContainer(tierNum, skillsByTier[tierNum], isPrestige);
            container.appendChild(tierContainer);
        });
    },

    _createTierContainer(tierNum, skillsInTier, isPrestige) {
        const tierContainer = document.createElement('div');
        tierContainer.className = 'mb-8 p-4 border border-gray-700 rounded-lg bg-surface-dark';
        tierContainer.id = `skill-tier-${isPrestige ? 'p' : ''}${tierNum}`;

        const tierTitle = document.createElement('h3');
        tierTitle.className = 'text-xl font-medium text-secondary mb-4';
        tierTitle.textContent = `Tier ${tierNum} ${isPrestige ? 'Prestige' : ''} Skills`; // Corrected 'Ascension'
        tierContainer.appendChild(tierTitle);

        // --- FIX: Corrected function call from isPrestigeTierUnlocked to isTierUnlocked ---
        const isTierLocked = !moduleLogicRef.isTierUnlocked(tierNum, isPrestige);

        if (isTierLocked) {
            const lockMessage = document.createElement('p');
            lockMessage.className = 'text-textSecondary italic';
            lockMessage.textContent = isPrestige ? staticModuleData.ui.prestigeTierUnlockMessage(tierNum) : staticModuleData.ui.tierUnlockMessage(tierNum);
            tierContainer.appendChild(lockMessage);
        } else {
            const skillsGrid = document.createElement('div');
            skillsGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
            skillsInTier.forEach(skillDef => {
                const skillCard = this._createSkillCard(skillDef, isPrestige);
                skillsGrid.appendChild(skillCard);
            });
            tierContainer.appendChild(skillsGrid);
        }
        return tierContainer;
    },
    
    _createSkillCard(skillDef, isPrestige) {
        const { coreUIManager } = coreSystemsRef;
        const card = document.createElement('div');
        card.id = `skill-card-${skillDef.id}`;
        card.className = 'bg-surface p-4 rounded-lg shadow-md flex flex-col justify-between transition-all duration-200';

        const contentDiv = document.createElement('div');
        const name = document.createElement('h4'); name.className = 'text-md font-semibold text-textPrimary mb-1'; name.textContent = skillDef.name; contentDiv.appendChild(name);
        const description = document.createElement('p'); description.className = 'text-textSecondary text-xs mb-2 flex-grow'; description.textContent = skillDef.description; contentDiv.appendChild(description);
        const levelDisplay = document.createElement('p'); levelDisplay.id = `skill-${skillDef.id}-level`; levelDisplay.className = 'text-sm text-blue-400 mb-1'; contentDiv.appendChild(levelDisplay);
        const effectDisplay = document.createElement('p'); effectDisplay.id = `skill-${skillDef.id}-effect`; effectDisplay.className = 'text-sm text-green-400 mb-2'; contentDiv.appendChild(effectDisplay);
        const costDisplay = document.createElement('p'); costDisplay.id = `skill-${skillDef.id}-cost`; costDisplay.className = 'text-xs text-yellow-400 mb-3'; contentDiv.appendChild(costDisplay);
        card.appendChild(contentDiv);
        
        const purchaseButton = coreUIManager.createButton(
            'Level Up', () => {
                if (moduleLogicRef.purchaseSkillLevel(skillDef.id, isPrestige)) {
                    this.renderMainContent(parentElementCache);
                }
            },
            ['w-full', 'text-sm', 'py-1.5', 'mt-auto'],
            `skill-purchase-${skillDef.id}`
        );
        card.appendChild(purchaseButton);

        this._updateSingleSkillCard(card, skillDef, isPrestige);
        return card;
    },

    updateSkillPointsDisplay(isPrestige) {
        if (!parentElementCache) return;
        const id = isPrestige ? 'prestige-skill-points-display' : 'skill-points-display';
        const display = parentElementCache.querySelector(`#${id}`);
        if (display) {
            const { coreResourceManager, decimalUtility } = coreSystemsRef;
            const resourceId = isPrestige ? staticModuleData.prestigeSkillPointResourceId : staticModuleData.skillPointResourceId;
            const points = coreResourceManager.getAmount(resourceId);
            const label = isPrestige ? staticModuleData.ui.prestigeSkillPointDisplayLabel : staticModuleData.ui.skillPointDisplayLabel;
            display.textContent = `${label} ${decimalUtility.format(points, 2, 0)}`;
        }
    },
    
    updateAllSkillCards() {
        if (!parentElementCache) return;
        this.updateSkillPointsDisplay(false);
        this.updateSkillPointsDisplay(true);

        const allSkills = { ...staticModuleData.skills, ...staticModuleData.prestigeSkills };
        for (const skillId in allSkills) {
            const skillCardElement = parentElementCache.querySelector(`#skill-card-${skillId}`);
            if (skillCardElement) {
                const isPrestige = !!staticModuleData.prestigeSkills[skillId];
                this._updateSingleSkillCard(skillCardElement, allSkills[skillId], isPrestige);
            }
        }
    },

    _updateSingleSkillCard(cardElement, skillDef, isPrestige) {
        const { decimalUtility, coreResourceManager } = coreSystemsRef;
        const level = moduleLogicRef.getSkillLevel(skillDef.id, isPrestige);
        const maxLevel = skillDef.maxLevel;
        const isUnlocked = moduleLogicRef.isSkillUnlocked(skillDef.id, isPrestige);
        
        cardElement.querySelector(`#skill-${skillDef.id}-level`).textContent = `Level: ${level} / ${maxLevel}`;
        cardElement.querySelector(`#skill-${skillDef.id}-effect`).textContent = `Effect: ${moduleLogicRef.getFormattedSkillEffect(skillDef.id, isPrestige)}`;
        
        const costDisplay = cardElement.querySelector(`#skill-${skillDef.id}-cost`);
        const purchaseButton = cardElement.querySelector(`#skill-purchase-${skillDef.id}`);
        const resourceId = isPrestige ? staticModuleData.prestigeSkillPointResourceId : staticModuleData.skillPointResourceId;
        const currency = isPrestige ? 'PSP' : 'SPP'; // Changed from 'PP' to 'PSP'
        
        if (!isUnlocked) {
            cardElement.classList.add('opacity-50', 'grayscale');
            costDisplay.textContent = "Locked";
            purchaseButton.disabled = true;
            purchaseButton.textContent = "Locked";
        } else if (level >= maxLevel) {
            cardElement.classList.remove('opacity-50', 'grayscale');
            costDisplay.textContent = "Max Level Reached";
            purchaseButton.disabled = true;
            purchaseButton.textContent = "Maxed";
            purchaseButton.classList.add('bg-green-600');
        } else {
            cardElement.classList.remove('opacity-50', 'grayscale');
            const nextCost = moduleLogicRef.getSkillNextLevelCost(skillDef.id, isPrestige);
            costDisplay.textContent = `Cost: ${decimalUtility.format(nextCost, 2, 0)} ${currency}`;
            purchaseButton.disabled = !coreResourceManager.canAfford(resourceId, nextCost);
            purchaseButton.textContent = `Level Up`;
        }
    },

    onShow() {
        if(parentElementCache) this.renderMainContent(parentElementCache);
    },

    onHide() { /* No action needed */ }
};

