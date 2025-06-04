// js/modules/skills_module/skills_ui.js 

/**
 * @file skills_ui.js
 * @description Handles the UI rendering and interactions for the Skills module.
 */

import { staticModuleData } from './skills_data.js';
// moduleState and moduleLogic are passed during initialization

let coreSystemsRef = null;
let moduleLogicRef = null;
let parentElementCache = null; // Cache the parent element for rendering

export const ui = {
    /**
     * Initializes the UI component with core system references and module logic.
     * @param {object} coreSystems - References to core game systems.
     * @param {object} logicRef - Reference to the module's logic component.
     */
    initialize(coreSystems, logicRef) {
        coreSystemsRef = coreSystems;
        moduleLogicRef = logicRef;
        coreSystemsRef.loggingSystem.debug("SkillsUI", "UI initialized.");
    },

    /**
     * Renders the main content for the Skills module.
     * This is called by coreUIManager when the tab is activated.
     * @param {HTMLElement} parentElement - The DOM element to render content into.
     */
    renderMainContent(parentElement) {
        if (!coreSystemsRef || !moduleLogicRef) {
            parentElement.innerHTML = '<p class="text-red-500">Skills UI not properly initialized.</p>';
            return;
        }
        parentElementCache = parentElement; // Cache for potential re-renders
        parentElement.innerHTML = ''; // Clear previous content

        const { coreUIManager, decimalUtility } = coreSystemsRef;

        const container = document.createElement('div');
        container.className = 'p-4 space-y-6'; // Tailwind classes

        const title = document.createElement('h2');
        title.className = 'text-2xl font-semibold text-primary mb-4';
        title.textContent = 'Study Skills';
        container.appendChild(title);

        const description = document.createElement('p');
        description.className = 'text-textSecondary mb-6';
        description.textContent = 'Invest Study Skill Points into various academic disciplines to gain powerful permanent bonuses.';
        container.appendChild(description);

        const sspDisplay = document.createElement('p');
        sspDisplay.id = 'current-ssp-display';
        sspDisplay.className = 'text-lg font-bold text-textPrimary mb-4';
        container.appendChild(sspDisplay);

        const skillsContainer = document.createElement('div');
        skillsContainer.id = 'skills-grid-container';
        skillsContainer.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
        container.appendChild(skillsContainer);

        // Group skills by tier and sort them
        const skillsByTier = {};
        for (const skillId in staticModuleData.skills) {
            const skillDef = staticModuleData.skills[skillId];
            if (!skillsByTier[skillDef.tier]) {
                skillsByTier[skillDef.tier] = [];
            }
            skillsByTier[skillDef.tier].push(skillDef);
        }

        const sortedTiers = Object.keys(skillsByTier).sort((a, b) => parseInt(a) - parseInt(b));

        sortedTiers.forEach(tier => {
            const tierHeader = document.createElement('h3');
            tierHeader.className = 'text-xl font-semibold text-secondary mt-6 mb-3 col-span-full';
            tierHeader.textContent = `Tier ${tier} Skills`;
            skillsContainer.appendChild(tierHeader);

            // Check if tier is unlocked
            const isTierUnlocked = moduleLogicRef.isSkillUnlocked(skillsByTier[tier][0].id); // Check first skill in tier

            skillsByTier[tier].forEach(skillDef => {
                const skillCard = document.createElement('div');
                skillCard.id = `skill-card-${skillDef.id}`;
                skillCard.className = `bg-surface-dark p-4 rounded-lg shadow-md flex flex-col transition-all duration-200 ${isTierUnlocked ? '' : 'opacity-50 grayscale cursor-not-allowed'}`;

                const skillName = document.createElement('h4');
                skillName.className = 'text-lg font-semibold text-textPrimary mb-1';
                skillName.textContent = skillDef.name;
                skillCard.appendChild(skillName);

                const skillDescription = document.createElement('p');
                skillDescription.className = 'text-textSecondary text-sm mb-2';
                skillDescription.textContent = skillDef.description;
                skillCard.appendChild(skillDescription);

                const currentLevelDisplay = document.createElement('p');
                currentLevelDisplay.id = `skill-${skillDef.id}-level`;
                currentLevelDisplay.className = 'text-textPrimary text-md font-bold mb-1';
                skillCard.appendChild(currentLevelDisplay);

                const currentEffectDisplay = document.createElement('p');
                currentEffectDisplay.id = `skill-${skillDef.id}-effect`;
                currentEffectDisplay.className = 'text-green-400 text-sm mb-2';
                skillCard.appendChild(currentEffectDisplay);

                const nextLevelInfo = document.createElement('p');
                nextLevelInfo.id = `skill-${skillDef.id}-next-level`;
                nextLevelInfo.className = 'text-textSecondary text-xs mb-3';
                skillCard.appendChild(nextLevelInfo);

                const costDisplay = document.createElement('p');
                costDisplay.id = `skill-${skillDef.id}-cost`;
                costDisplay.className = 'text-textSecondary text-sm mb-4';
                skillCard.appendChild(costDisplay);

                const buyButton = coreUIManager.createButton(
                    '', // Text will be set dynamically
                    () => {
                        const purchased = moduleLogicRef.purchaseSkillLevel(skillDef.id);
                        if (purchased) {
                            this.updateDynamicElements(); // Update all UI elements
                            coreUIManager.showNotification(`Leveled up ${skillDef.name}!`, 'success', 1500);
                            buyButton.classList.add('animate-pulse-once');
                            setTimeout(() => buyButton.classList.remove('animate-pulse-once'), 500);
                        } else {
                            coreUIManager.showNotification(`Not enough ${staticModuleData.resourceId} to level up ${skillDef.name}.`, 'error', 1500);
                        }
                    },
                    ['bg-indigo-600', 'hover:bg-indigo-700', 'text-white', 'py-2', 'px-4', 'text-md', 'w-full'],
                    `buy-skill-${skillDef.id}-button`
                );
                skillCard.appendChild(buyButton);

                skillsContainer.appendChild(skillCard);

                // Set up tooltip for locked skills (if tier is not unlocked)
                if (!isTierUnlocked) {
                    skillCard.classList.add('tooltip-target');
                    skillCard.dataset.tooltipContent = this._getSkillUnlockTooltipContent(skillDef.unlockCondition);
                }
            });
        });

        parentElement.appendChild(container);

        // Add a simple CSS animation for the button pulse (if not already in index.html or other modules)
        if (!document.head.querySelector('#skills-module-styles')) {
            const style = document.createElement('style');
            style.id = 'skills-module-styles';
            style.textContent = `
                @keyframes pulse-once {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.02); }
                    100% { transform: scale(1); }
                }
                .animate-pulse-once {
                    animation: pulse-once 0.5s ease-out;
                }
            `;
            document.head.appendChild(style);
        }

        this.updateDynamicElements(); // Initial update for all dynamic elements
        this._setupTooltips(); // Setup tooltips for all skill cards
    },

    /**
     * Generates the tooltip content for a locked skill.
     * @param {object} condition - The unlock condition object.
     * @returns {string} HTML string for the tooltip.
     * @private
     */
    _getSkillUnlockTooltipContent(condition) {
        let content = '<p class="font-semibold text-primary mb-1">Unlock Condition:</p>';

        switch (condition.type) {
            case "allSkillsAtLevel":
                content += `<p>All Tier ${condition.tier} skills must be at least level ${condition.level}.</p>`;
                break;
            default:
                content += `<p>Meet unknown condition.</p>`;
                break;
        }
        return content;
    },

    /**
     * Sets up mouseover/mouseout listeners for tooltip targets.
     * @private
     */
    _setupTooltips() {
        const tooltipTargets = parentElementCache.querySelectorAll('.tooltip-target');
        tooltipTargets.forEach(target => {
            // Remove existing listeners to prevent duplicates
            const oldEnterHandler = target._tooltipEnterHandler;
            const oldLeaveHandler = target._tooltipLeaveHandler;
            if (oldEnterHandler) target.removeEventListener('mouseenter', oldEnterHandler);
            if (oldLeaveHandler) target.removeEventListener('mouseleave', oldLeaveHandler);

            const enterHandler = (event) => {
                const content = target.dataset.tooltipContent;
                if (content) {
                    coreSystemsRef.coreUIManager.showTooltip(content, target);
                }
            };
            const leaveHandler = () => {
                coreSystemsRef.coreUIManager.hideTooltip();
            };

            target.addEventListener('mouseenter', enterHandler);
            target.addEventListener('mouseleave', leaveHandler);
            // Store handlers to remove them later if needed
            target._tooltipEnterHandler = enterHandler;
            target._tooltipLeaveHandler = leaveHandler;
        });
    },

    /**
     * Updates dynamic parts of the module's UI, like skill levels, costs, and effects.
     * This should be called by the game loop's UI update phase or after purchases.
     */
    updateDynamicElements() {
        if (!parentElementCache) return; // Not rendered yet or parent cleared

        const { coreResourceManager, decimalUtility } = coreSystemsRef;

        // Update SSP display
        const currentSSP = coreResourceManager.getAmount(staticModuleData.resourceId);
        const sspDisplay = parentElementCache.querySelector('#current-ssp-display');
        if (sspDisplay) {
            sspDisplay.textContent = `Study Skill Points: ${decimalUtility.format(currentSSP, 0)}`;
        }

        for (const skillId in staticModuleData.skills) {
            const skillDef = staticModuleData.skills[skillId];
            const skillCard = parentElementCache.querySelector(`#skill-card-${skillId}`);
            const buyButton = parentElementCache.querySelector(`#buy-skill-${skillId}-button`);

            if (!skillCard || !buyButton) continue; // Skip if element not found

            const isUnlocked = moduleLogicRef.isSkillUnlocked(skillId);
            const currentLevel = moduleLogicRef.getSkillLevel(skillId);
            const isMaxLevel = currentLevel >= skillDef.maxLevel;

            if (isUnlocked) {
                skillCard.classList.remove('opacity-50', 'grayscale', 'cursor-not-allowed');
                skillCard.classList.add('bg-surface-dark'); // Re-add normal background if removed
                // Ensure tooltips are removed if it was previously locked
                if (skillCard.classList.contains('tooltip-target')) {
                    skillCard.classList.remove('tooltip-target');
                    delete skillCard.dataset.tooltipContent;
                    coreSystemsRef.coreUIManager.hideTooltip(); // Hide any active tooltip for this element
                }

                const currentCost = moduleLogicRef.calculateSkillCost(skillId);

                const currentLevelDisplay = skillCard.querySelector(`#skill-${skillDef.id}-level`);
                const currentEffectDisplay = skillCard.querySelector(`#skill-${skillDef.id}-effect`);
                const nextLevelInfo = skillCard.querySelector(`#skill-${skillDef.id}-next-level`);
                const costDisplay = skillCard.querySelector(`#skill-${skillDef.id}-cost`);

                if (currentLevelDisplay) currentLevelDisplay.textContent = `Level: ${currentLevel} / ${skillDef.maxLevel}`;

                // Current Effect
                if (currentEffectDisplay) {
                    let currentEffectValue = decimalUtility.multiply(decimalUtility.new(skillDef.effect.baseValue), currentLevel);
                    if (skillDef.effect.type === 'productionMultiplier') {
                        currentEffectDisplay.textContent = skillDef.ui.effectText(currentLevel, currentEffectValue);
                    } else if (skillDef.effect.type === 'costReduction') {
                        currentEffectDisplay.textContent = skillDef.ui.effectText(currentLevel, currentEffectValue);
                    } else {
                        currentEffectDisplay.textContent = `Effect: ${decimalUtility.format(currentEffectValue, 2)}`;
                    }
                }

                // Next Level Info
                if (nextLevelInfo) {
                    if (!isMaxLevel) {
                        let nextEffectValue = decimalUtility.multiply(decimalUtility.new(skillDef.effect.baseValue), currentLevel + 1);
                        nextLevelInfo.textContent = skillDef.ui.nextLevelText(nextEffectValue);
                    } else {
                        nextLevelInfo.textContent = "Max Level Reached!";
                    }
                }

                // Cost Display
                if (costDisplay) {
                    if (!isMaxLevel) {
                        costDisplay.textContent = skillDef.ui.costText(decimalUtility.format(currentCost, 2));
                    } else {
                        costDisplay.textContent = "No further cost.";
                    }
                }

                // Buy Button
                if (buyButton) {
                    if (isMaxLevel) {
                        buyButton.textContent = "Max Level";
                        buyButton.disabled = true;
                        buyButton.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
                        buyButton.classList.add('bg-gray-500', 'cursor-not-allowed');
                    } else {
                        buyButton.textContent = `Level Up ${skillDef.name}`;
                        const canAfford = coreResourceManager.canAfford(skillDef.costResource, currentCost);
                        buyButton.disabled = !canAfford;
                        if (canAfford) {
                            buyButton.classList.remove('bg-gray-500', 'cursor-not-allowed');
                            buyButton.classList.add('bg-indigo-600', 'hover:bg-indigo-700');
                        } else {
                            buyButton.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
                            buyButton.classList.add('bg-gray-500', 'cursor-not-allowed');
                        }
                    }
                }
            } else {
                // If locked, ensure it's visually disabled and has tooltip setup
                skillCard.classList.add('opacity-50', 'grayscale', 'cursor-not-allowed');
                if (buyButton) {
                    buyButton.disabled = true;
                    buyButton.textContent = "Locked";
                    buyButton.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
                    buyButton.classList.add('bg-gray-500', 'cursor-not-allowed');
                }
                // Ensure tooltip is set up for locked items
                if (!skillCard.classList.contains('tooltip-target')) {
                    skillCard.classList.add('tooltip-target');
                    skillCard.dataset.tooltipContent = this._getSkillUnlockTooltipContent(skillDef.unlockCondition);
                    this._setupTooltips(); // Re-run setup to catch new targets
                }
            }
        }
    },

    /**
     * Called when the module's tab is shown.
     */
    onShow() {
        coreSystemsRef.loggingSystem.debug("SkillsUI", "Skills tab shown. Updating dynamic elements.");
        this.updateDynamicElements(); // Ensure UI is up-to-date when tab is shown
        this._setupTooltips(); // Re-setup tooltips as content might be re-rendered
    },

    /**
     * Called when the module's tab is hidden.
     */
    onHide() {
        coreSystemsRef.loggingSystem.debug("SkillsUI", "Skills tab hidden.");
        coreSystemsRef.coreUIManager.hideTooltip(); // Hide any active tooltip
    }
};
