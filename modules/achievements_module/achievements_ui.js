// modules/achievements_module/achievements_ui.js 

/**
 * @file achievements_ui.js
 * @description Handles the UI rendering and interactions for the Achievements module.
 */

import { staticModuleData } from './achievements_data.js';
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
        coreSystemsRef.loggingSystem.debug("AchievementsUI", "UI initialized.");
    },

    /**
     * Renders the main content for the Achievements module.
     * This is called by coreUIManager when the tab is activated.
     * @param {HTMLElement} parentElement - The DOM element to render content into.
     */
    renderMainContent(parentElement) {
        if (!coreSystemsRef || !moduleLogicRef) {
            parentElement.innerHTML = '<p class="text-red-500">Achievements UI not properly initialized.</p>';
            return;
        }
        parentElementCache = parentElement; // Cache for potential re-renders
        parentElement.innerHTML = ''; // Clear previous content

        const { coreUIManager, decimalUtility } = coreSystemsRef;

        const container = document.createElement('div');
        container.className = 'p-4 space-y-6'; // Tailwind classes

        const title = document.createElement('h2');
        title.className = 'text-2xl font-semibold text-primary mb-4';
        title.textContent = 'Achievements';
        container.appendChild(title);

        const description = document.createElement('p');
        description.className = 'text-textSecondary mb-6';
        description.textContent = 'Complete various challenges to earn permanent rewards and show off your progress!';
        container.appendChild(description);

        const achievementsContainer = document.createElement('div');
        achievementsContainer.id = 'achievements-grid-container';
        achievementsContainer.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
        container.appendChild(achievementsContainer);

        // Group achievements by category and sort them (optional, but good for organization)
        const achievementsByCategory = {};
        for (const achId in staticModuleData.achievements) {
            const achDef = staticModuleData.achievements[achId];
            const categoryId = achDef.category || 'uncategorized';
            if (!achievementsByCategory[categoryId]) {
                achievementsByCategory[categoryId] = [];
            }
            achievementsByCategory[categoryId].push(achDef);
        }

        const sortedCategories = Object.keys(achievementsByCategory).sort(); // Alphabetical sort for categories

        sortedCategories.forEach(categoryId => {
            const categoryDef = staticModuleData.categories[categoryId] || { name: categoryId.replace(/([A-Z])/g, ' $1').trim() }; // Fallback name

            const categoryHeader = document.createElement('h3');
            categoryHeader.className = 'text-xl font-semibold text-secondary mt-6 mb-3 col-span-full';
            categoryHeader.textContent = categoryDef.name;
            achievementsContainer.appendChild(categoryHeader);

            achievementsByCategory[categoryId].forEach(achievementDef => {
                const isUnlocked = moduleLogicRef.isAchievementUnlocked(achievementDef.id);
                const achievementCard = document.createElement('div');
                achievementCard.id = `achievement-card-${achievementDef.id}`;
                achievementCard.className = `bg-surface-dark p-4 rounded-lg shadow-md flex flex-col transition-all duration-200 ${isUnlocked ? 'border-2 border-green-500' : 'opacity-70 grayscale cursor-help'}`;

                const achievementName = document.createElement('h4');
                achievementName.className = 'text-lg font-semibold text-textPrimary mb-1';
                achievementName.textContent = achievementDef.name;
                achievementCard.appendChild(achievementName);

                const achievementDescription = document.createElement('p');
                achievementDescription.className = 'text-textSecondary text-sm mb-2';
                achievementDescription.textContent = achievementDef.description;
                achievementCard.appendChild(achievementDescription);

                const progressDisplay = document.createElement('p');
                progressDisplay.id = `achievement-${achievementDef.id}-progress`;
                progressDisplay.className = `text-sm mb-2 ${isUnlocked ? 'text-green-400' : 'text-yellow-400'}`;
                achievementCard.appendChild(progressDisplay);

                const rewardDisplay = document.createElement('p');
                rewardDisplay.id = `achievement-${achievementDef.id}-reward`;
                rewardDisplay.className = 'text-sm text-blue-400 mb-3';
                achievementCard.appendChild(rewardDisplay);

                // If not unlocked, add tooltip for condition
                if (!isUnlocked) {
                    achievementCard.classList.add('tooltip-target');
                    achievementCard.dataset.tooltipContent = this._getAchievementTooltipContent(achievementDef);
                }

                achievementsContainer.appendChild(achievementCard);
            });
        });

        parentElement.appendChild(container);

        this.updateDynamicElements(); // Initial update for all dynamic elements
        this._setupTooltips(); // Setup tooltips for all achievement cards
    },

    /**
     * Generates the tooltip content for a locked achievement.
     * @param {object} achievementDef - The achievement definition.
     * @returns {string} HTML string for the tooltip.
     * @private
     */
    _getAchievementTooltipContent(achievementDef) {
        const { decimalUtility } = coreSystemsRef;
        const progress = moduleLogicRef.getAchievementProgress(achievementDef.id);
        const condition = achievementDef.condition;
        const reward = achievementDef.reward;

        let content = `<p class="font-semibold text-primary mb-1">Condition:</p>`;
        switch (condition.type) {
            case "producerOwned":
                content += `<p>Own ${decimalUtility.format(condition.count, 0)} ${condition.producerId.replace(/([A-Z])/g, ' $1').trim()}s.</p>`;
                break;
            case "resourceAmount":
                content += `<p>Have ${decimalUtility.format(condition.amount, 0)} ${condition.resourceId.replace(/([A-Z])/g, ' $1').trim()}.</p>`;
                break;
            case "totalClicks":
                content += `<p>Perform ${decimalUtility.format(condition.count, 0)} manual clicks.</p>`;
                break;
            case "skillLevel":
                content += `<p>Reach level ${condition.level} in ${condition.skillId.replace(/([A-Z])/g, ' $1').trim()} skill.</p>`;
                break;
            default:
                content += `<p>Meet unknown condition.</p>`;
                break;
        }
        content += `<p class="text-xs text-textSecondary">(Progress: ${decimalUtility.format(progress.current, 0)} / ${decimalUtility.format(progress.required, 0)})</p>`;

        content += `<p class="font-semibold text-primary mt-3 mb-1">Reward:</p>`;
        content += `<p>${achievementDef.ui.rewardText(reward.value)}</p>`;

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
     * Updates dynamic parts of the module's UI, like achievement progress and visual states.
     * This should be called by the game loop's UI update phase.
     */
    updateDynamicElements() {
        if (!parentElementCache) return; // Not rendered yet or parent cleared

        const { decimalUtility } = coreSystemsRef;

        for (const achievementId in staticModuleData.achievements) {
            const achievementDef = staticModuleData.achievements[achievementId];
            const achievementCard = parentElementCache.querySelector(`#achievement-card-${achievementId}`);
            const progressDisplay = achievementCard?.querySelector(`#achievement-${achievementDef.id}-progress`);
            const rewardDisplay = achievementCard?.querySelector(`#achievement-${achievementDef.id}-reward`);

            if (!achievementCard) continue; // Skip if element not found

            const isUnlocked = moduleLogicRef.isAchievementUnlocked(achievementId);

            if (isUnlocked) {
                achievementCard.classList.remove('opacity-70', 'grayscale', 'cursor-help');
                achievementCard.classList.add('border-2', 'border-green-500'); // Highlight unlocked
                // Remove tooltip if it was previously locked
                if (achievementCard.classList.contains('tooltip-target')) {
                    achievementCard.classList.remove('tooltip-target');
                    delete achievementCard.dataset.tooltipContent;
                    coreSystemsRef.coreUIManager.hideTooltip(); // Hide any active tooltip for this element
                }

                if (progressDisplay) {
                    progressDisplay.textContent = "Unlocked!";
                    progressDisplay.classList.remove('text-yellow-400');
                    progressDisplay.classList.add('text-green-400');
                }
                if (rewardDisplay) {
                    rewardDisplay.textContent = achievementDef.ui.rewardText(achievementDef.reward.value);
                }
            } else {
                // If locked, ensure it's visually disabled and has tooltip setup
                achievementCard.classList.add('opacity-70', 'grayscale', 'cursor-help');
                achievementCard.classList.remove('border-2', 'border-green-500'); // Remove unlocked highlight

                const progress = moduleLogicRef.getAchievementProgress(achievementDef.id);
                if (progressDisplay) {
                    progressDisplay.textContent = achievementDef.ui.progressText(decimalUtility.format(progress.current, 0), decimalUtility.format(progress.required, 0));
                    progressDisplay.classList.remove('text-green-400');
                    progressDisplay.classList.add('text-yellow-400');
                }
                if (rewardDisplay) {
                    rewardDisplay.textContent = achievementDef.ui.rewardText(achievementDef.reward.value);
                }

                // Ensure tooltip is set up for locked items
                if (!achievementCard.classList.contains('tooltip-target')) {
                    achievementCard.classList.add('tooltip-target');
                    achievementCard.dataset.tooltipContent = this._getAchievementTooltipContent(achievementDef);
                    this._setupTooltips(); // Re-run setup to catch new targets
                }
            }
        }
    },

    /**
     * Called when the module's tab is shown.
     */
    onShow() {
        coreSystemsRef.loggingSystem.debug("AchievementsUI", "Achievements tab shown. Updating dynamic elements.");
        this.updateDynamicElements(); // Ensure UI is up-to-date when tab is shown
        this._setupTooltips(); // Re-setup tooltips as content might be re-rendered
    },

    /**
     * Called when the module's tab is hidden.
     */
    onHide() {
        coreSystemsRef.loggingSystem.debug("AchievementsUI", "Achievements tab hidden.");
        coreSystemsRef.coreUIManager.hideTooltip(); // Hide any active tooltip
    }
};
