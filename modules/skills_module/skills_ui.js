// modules/skills_module/skills_ui.js (v1)

/**
 * @file skills_ui.js
 * @description Handles UI rendering and interactions for the Skills module.
 */

import { staticModuleData } from './skills_data.js';
// moduleLogicRef is passed during initialization

let coreSystemsRef = null;
let moduleLogicRef = null;
let parentElementCache = null;

export const ui = {
    /**
     * Initializes the UI component.
     */
    initialize(coreSystems, stateRef, logicRef) { // stateRef is moduleState from skills_state.js
        coreSystemsRef = coreSystems;
        moduleLogicRef = logicRef; // moduleLogic from skills_logic.js
        coreSystemsRef.loggingSystem.info("SkillsUI", "UI initialized (v1).");
    },

    /**
     * Renders the main content for the Skills module.
     */
    renderMainContent(parentElement) {
        if (!coreSystemsRef || !moduleLogicRef) {
            parentElement.innerHTML = '<p class="text-red-500">Skills UI not properly initialized.</p>';
            return;
        }
        parentElementCache = parentElement;
        parentElement.innerHTML = ''; // Clear previous content

        const container = document.createElement('div');
        container.className = 'p-4 space-y-6';

        const title = document.createElement('h2');
        title.className = 'text-2xl font-semibold text-primary mb-2';
        title.textContent = 'Study Skills';
        container.appendChild(title);

        const skillPointsDisplay = document.createElement('p');
        skillPointsDisplay.id = 'skill-points-display';
        skillPointsDisplay.className = 'text-lg text-accentTwo mb-6'; // Using a different accent color
        container.appendChild(skillPointsDisplay);

        this.updateSkillPointsDisplay(); // Initial update

        // Group skills by tier
        const skillsByTier = {};
        for (const skillId in staticModuleData.skills) {
            const skillDef = staticModuleData.skills[skillId];
            if (!skillsByTier[skillDef.tier]) {
                skillsByTier[skillDef.tier] = [];
            }
            skillsByTier[skillDef.tier].push(skillDef);
        }

        // Render each tier
        Object.keys(skillsByTier).sort((a, b) => a - b).forEach(tierNum => {
            const tierContainer = this._createTierContainer(tierNum, skillsByTier[tierNum]);
            container.appendChild(tierContainer);
        });

        parentElement.appendChild(container);
        this.updateAllSkillCards(); // Update states of all cards initially
    },

    /**
     * Creates a container for a skill tier.
     * @private
     */
    _createTierContainer(tierNum, skillsInTier) {
        const tierContainer = document.createElement('div');
        tierContainer.className = 'mb-8 p-4 border border-gray-700 rounded-lg bg-surface-dark';
        tierContainer.id = `skill-tier-${tierNum}`;

        const tierTitle = document.createElement('h3');
        tierTitle.className = 'text-xl font-medium text-secondary mb-4';
        tierTitle.textContent = `Tier ${tierNum} Skills`;
        tierContainer.appendChild(tierTitle);

        // Check if this tier is unlocked
        const firstSkillInTier = skillsInTier[0];
        let tierLocked = false;
        if (firstSkillInTier && firstSkillInTier.unlockCondition && firstSkillInTier.unlockCondition.type === 'allSkillsInTierLevel') {
            const prevTier = firstSkillInTier.unlockCondition.tier;
            const skillsInPrevTier = Object.values(staticModuleData.skills).filter(s => s.tier === prevTier);
            if (skillsInPrevTier.length > 0 && !skillsInPrevTier.every(s => moduleLogicRef.getSkillLevel(s.id) >= firstSkillInTier.unlockCondition.level)) {
                tierLocked = true;
            }
        }
        
        if (tierLocked) {
            const lockMessage = document.createElement('p');
            lockMessage.className = 'text-textSecondary italic';
            lockMessage.textContent = staticModuleData.tierUnlockMessage(tierNum);
            tierContainer.appendChild(lockMessage);
        } else {
            const skillsGrid = document.createElement('div');
            skillsGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
            skillsInTier.forEach(skillDef => {
                const skillCard = this._createSkillCard(skillDef);
                skillsGrid.appendChild(skillCard);
            });
            tierContainer.appendChild(skillsGrid);
        }
        return tierContainer;
    },

    /**
     * Creates a card for a single skill.
     * @private
     */
    _createSkillCard(skillDef) {
        const { coreUIManager, decimalUtility } = coreSystemsRef;

        const card = document.createElement('div');
        card.id = `skill-card-${skillDef.id}`;
        card.className = 'bg-surface p-4 rounded-lg shadow-md flex flex-col justify-between transition-all duration-200';

        const contentDiv = document.createElement('div');
        const name = document.createElement('h4');
        name.className = 'text-md font-semibold text-textPrimary mb-1';
        name.textContent = skillDef.name;
        contentDiv.appendChild(name);

        const description = document.createElement('p');
        description.className = 'text-textSecondary text-xs mb-2 flex-grow';
        description.textContent = skillDef.description;
        contentDiv.appendChild(description);

        const levelDisplay = document.createElement('p');
        levelDisplay.id = `skill-${skillDef.id}-level`;
        levelDisplay.className = 'text-sm text-blue-400 mb-1';
        contentDiv.appendChild(levelDisplay);
        
        const effectDisplay = document.createElement('p');
        effectDisplay.id = `skill-${skillDef.id}-effect`;
        effectDisplay.className = 'text-sm text-green-400 mb-2';
        contentDiv.appendChild(effectDisplay);

        const costDisplay = document.createElement('p');
costDisplay.id = `skill-${skillDef.id}-cost`;
        costDisplay.className = 'text-xs text-yellow-400 mb-3';
        contentDiv.appendChild(costDisplay);
        
        card.appendChild(contentDiv);

        const purchaseButton = coreUIManager.createButton(
            'Level Up',
            () => {
                if (moduleLogicRef.purchaseSkillLevel(skillDef.id)) {
                    this.updateSkillPointsDisplay();
                    this.updateAllSkillCards(); // Update this card and potentially others (unlocks)
                    // Check if any tier got unlocked
                    this.renderMainContent(parentElementCache); // Re-render all tiers in case one got unlocked
                }
            },
            ['w-full', 'text-sm', 'py-1.5', 'mt-auto'],
            `skill-purchase-${skillDef.id}`
        );
        card.appendChild(purchaseButton);

        this._updateSingleSkillCard(card, skillDef); // Initial state update
        return card;
    },

    /**
     * Updates the display for available Study Skill Points.
     */
    updateSkillPointsDisplay() {
        if (!parentElementCache) return;
        const display = parentElementCache.querySelector('#skill-points-display');
        if (display) {
            const { coreResourceManager, decimalUtility } = coreSystemsRef;
            const skillPoints = coreResourceManager.getAmount(staticModuleData.skillPointResourceId);
            display.textContent = `${staticModuleData.ui.skillPointDisplayLabel} ${decimalUtility.format(skillPoints, 0)}`;
        }
    },

    /**
     * Updates all skill cards based on current game state.
     */
    updateAllSkillCards() {
        if (!parentElementCache) return;
        for (const skillId in staticModuleData.skills) {
            const skillCardElement = parentElementCache.querySelector(`#skill-card-${skillId}`);
            if (skillCardElement) {
                this._updateSingleSkillCard(skillCardElement, staticModuleData.skills[skillId]);
            }
        }
    },
    
    /**
     * Updates a single skill card.
     * @private
     */
    _updateSingleSkillCard(cardElement, skillDef) {
        const { decimalUtility, coreResourceManager } = coreSystemsRef;

        const level = moduleLogicRef.getSkillLevel(skillDef.id);
        const maxLevel = skillDef.maxLevel;
        const isUnlocked = moduleLogicRef.isSkillUnlocked(skillDef.id);

        const levelDisplay = cardElement.querySelector(`#skill-${skillDef.id}-level`);
        const effectDisplay = cardElement.querySelector(`#skill-${skillDef.id}-effect`);
        const costDisplay = cardElement.querySelector(`#skill-${skillDef.id}-cost`);
        const purchaseButton = cardElement.querySelector(`#skill-purchase-${skillDef.id}`);

        if (levelDisplay) levelDisplay.textContent = `Level: ${level} / ${maxLevel}`;
        if (effectDisplay) effectDisplay.textContent = `Effect: ${moduleLogicRef.getFormattedSkillEffect(skillDef.id)}`;

        if (!isUnlocked) {
            cardElement.classList.add('opacity-50', 'grayscale');
            if (costDisplay) costDisplay.textContent = "Locked";
            if (purchaseButton) {
                purchaseButton.disabled = true;
                purchaseButton.textContent = "Locked";
                 purchaseButton.classList.add('bg-gray-600', 'cursor-not-allowed');
                 purchaseButton.classList.remove('bg-primary');
            }
        } else if (level >= maxLevel) {
            cardElement.classList.remove('opacity-50', 'grayscale');
            if (costDisplay) costDisplay.textContent = "Max Level Reached";
            if (purchaseButton) {
                purchaseButton.disabled = true;
                purchaseButton.textContent = "Maxed";
                purchaseButton.classList.add('bg-green-600', 'cursor-default');
                purchaseButton.classList.remove('bg-primary', 'bg-gray-600');

            }
        } else {
            cardElement.classList.remove('opacity-50', 'grayscale');
            const nextCost = moduleLogicRef.getSkillNextLevelCost(skillDef.id);
            if (costDisplay && nextCost) {
                costDisplay.textContent = `Next Lvl Cost: ${decimalUtility.format(nextCost, 0)} SPP`;
            }
            if (purchaseButton && nextCost) {
                purchaseButton.disabled = !coreResourceManager.canAfford(staticModuleData.skillPointResourceId, nextCost);
                purchaseButton.textContent = `Level Up (${decimalUtility.format(nextCost,0)} SPP)`;
                 if (purchaseButton.disabled) {
                    purchaseButton.classList.add('bg-gray-600', 'cursor-not-allowed');
                    purchaseButton.classList.remove('bg-primary');
                } else {
                    purchaseButton.classList.remove('bg-gray-600', 'cursor-not-allowed', 'bg-green-600');
                    purchaseButton.classList.add('bg-primary');
                }
            }
        }
    },

    onShow() {
        coreSystemsRef.loggingSystem.debug("SkillsUI", "Skills tab shown.");
        if (parentElementCache) {
            this.updateSkillPointsDisplay();
            this.updateAllSkillCards();
             // Check for tier unlocks and potentially re-render if a new tier is available
            this.renderMainContent(parentElementCache);
        }
    },

    onHide() {
        coreSystemsRef.loggingSystem.debug("SkillsUI", "Skills tab hidden.");
    }
};
