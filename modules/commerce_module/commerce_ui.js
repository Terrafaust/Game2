// js/modules/commerce_module/commerce_ui.js 

/**
 * @file commerce_ui.js
 * @description Handles the UI rendering and interactions for the Commerce module.
 */

import { staticModuleData } from './commerce_data.js';
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
        coreSystemsRef.loggingSystem.debug("CommerceUI", "UI initialized.");
    },

    /**
     * Renders the main content for the Commerce module.
     * This is called by coreUIManager when the tab is activated.
     * @param {HTMLElement} parentElement - The DOM element to render content into.
     */
    renderMainContent(parentElement) {
        if (!coreSystemsRef || !moduleLogicRef) {
            parentElement.innerHTML = '<p class="text-red-500">Commerce UI not properly initialized.</p>';
            return;
        }
        parentElementCache = parentElement; // Cache for potential re-renders
        parentElement.innerHTML = ''; // Clear previous content

        const { coreUIManager, decimalUtility } = coreSystemsRef;

        const container = document.createElement('div');
        container.className = 'p-4 space-y-6'; // Tailwind classes

        const title = document.createElement('h2');
        title.className = 'text-2xl font-semibold text-primary mb-4';
        title.textContent = 'Commerce Department';
        container.appendChild(title);

        const description = document.createElement('p');
        description.className = 'text-textSecondary mb-6';
        description.textContent = 'Acquire new resources and unlock advanced game features through strategic purchases.';
        container.appendChild(description);

        const purchasablesContainer = document.createElement('div');
        purchasablesContainer.id = 'commerce-purchasables-container';
        purchasablesContainer.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
        container.appendChild(purchasablesContainer);

        // Iterate through all purchasables defined in staticModuleData
        for (const purchasableId in staticModuleData.purchasables) {
            const purchasableDef = staticModuleData.purchasables[purchasableId];
            const isUnlocked = moduleLogicRef.isPurchasableUnlocked(purchasableId);

            const purchasableCard = document.createElement('div');
            purchasableCard.id = `purchasable-card-${purchasableId}`;
            purchasableCard.className = `bg-surface-dark p-4 rounded-lg shadow-md flex flex-col transition-all duration-200 ${isUnlocked ? '' : 'opacity-50 grayscale cursor-not-allowed'}`;

            const purchasableName = document.createElement('h3');
            purchasableName.className = 'text-xl font-semibold text-textPrimary mb-2';
            purchasableName.textContent = purchasableDef.name;
            purchasableCard.appendChild(purchasableName);

            const purchasableDescription = document.createElement('p');
            purchasableDescription.className = 'text-textSecondary text-sm mb-3';
            purchasableDescription.textContent = purchasableDef.description;
            purchasableCard.appendChild(purchasableDescription);

            // Only show owned count for repeatable items (generators)
            if (purchasableDef.costGrowthFactor !== "1") {
                const ownedDisplay = document.createElement('p');
                ownedDisplay.id = `purchasable-${purchasableId}-owned`;
                ownedDisplay.className = 'text-textPrimary text-lg font-bold mb-1';
                purchasableCard.appendChild(ownedDisplay);
            }

            const costDisplay = document.createElement('p');
            costDisplay.id = `purchasable-${purchasableId}-cost`;
            costDisplay.className = 'text-textSecondary text-sm mb-4';
            purchasableCard.appendChild(costDisplay);

            const buyButton = coreUIManager.createButton(
                '', // Text will be set dynamically
                () => {
                    const purchased = moduleLogicRef.purchaseItem(purchasableId);
                    if (purchased) {
                        this.updateDynamicElements(); // Update all UI elements
                        coreUIManager.showNotification(`Purchased ${purchasableDef.name}!`, 'success', 1500);
                        // Add a subtle animation to the button
                        buyButton.classList.add('animate-pulse-once');
                        setTimeout(() => buyButton.classList.remove('animate-pulse-once'), 500);
                    } else {
                        coreUIManager.showNotification(`Not enough ${purchasableDef.costResource} to buy ${purchasableDef.name}.`, 'error', 1500);
                    }
                },
                ['bg-purple-600', 'hover:bg-purple-700', 'text-white', 'py-2', 'px-4', 'text-md', 'w-full'],
                `buy-${purchasableId}-button`
            );
            purchasableCard.appendChild(buyButton);

            purchasablesContainer.appendChild(purchasableCard);

            // Set up tooltip for locked purchasables
            if (!isUnlocked) {
                purchasableCard.classList.add('tooltip-target'); // Add a class to identify tooltip targets
                purchasableCard.dataset.tooltipContent = this._getUnlockTooltipContent(purchasableDef.unlockCondition);
            }
        }

        parentElement.appendChild(container);

        // Add a simple CSS animation for the button pulse (if not already in index.html or studies_ui)
        // Ensure this style is only added once
        if (!document.head.querySelector('#commerce-module-styles')) {
            const style = document.createElement('style');
            style.id = 'commerce-module-styles';
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
        this._setupTooltips(); // Setup tooltips for all purchasable cards
    },

    /**
     * Generates the tooltip content for a locked purchasable.
     * @param {object} condition - The unlock condition object.
     * @returns {string} HTML string for the tooltip.
     * @private
     */
    _getUnlockTooltipContent(condition) {
        const { coreResourceManager, decimalUtility, coreGameStateManager, moduleLoader } = coreSystemsRef;
        let content = '<p class="font-semibold text-primary mb-1">Unlock Condition:</p>';

        switch (condition.type) {
            case "resource":
                const currentAmount = coreResourceManager.getAmount(condition.resourceId);
                const requiredAmount = decimalUtility.new(condition.amount);
                content += `<p>Reach ${decimalUtility.format(requiredAmount, 0)} ${coreResourceManager.getAllResources()[condition.resourceId]?.name || condition.resourceId}.</p>`;
                content += `<p class="text-xs text-textSecondary">(Current: ${decimalUtility.format(currentAmount, 0)})</p>`;
                break;
            case "producerOwned":
                const studiesModule = moduleLoader.getModule('studies');
                if (studiesModule && studiesModule.logic && typeof studiesModule.logic.getOwnedProducerCount === 'function') {
                    const producerDef = studiesModule.staticModuleData.producers[condition.producerId]; // Access static data from studies module
                    const ownedCount = studiesModule.logic.getOwnedProducerCount(condition.producerId);
                    content += `<p>Own ${condition.count} ${producerDef.name}${condition.count > 1 ? 's' : ''}.</p>`;
                    content += `<p class="text-xs text-textSecondary">(Current: ${decimalUtility.format(ownedCount, 0)})</p>`;
                } else {
                    content += `<p>Meet Studies producer requirement (module not fully loaded).</p>`;
                }
                break;
            case "globalFlag":
                content += `<p>Unlock via global game progression (Flag: '${condition.flag}').</p>`;
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
     * Updates dynamic parts of the module's UI, like purchasable counts, costs, and production rates.
     * This should be called by the game loop's UI update phase or after purchases.
     */
    updateDynamicElements() {
        if (!parentElementCache) return; // Not rendered yet or parent cleared

        const { coreResourceManager, decimalUtility, coreGameStateManager } = coreSystemsRef;

        for (const purchasableId in staticModuleData.purchasables) {
            const purchasableDef = staticModuleData.purchasables[purchasableId];
            const purchasableCard = parentElementCache.querySelector(`#purchasable-card-${purchasableId}`);
            const buyButton = parentElementCache.querySelector(`#buy-${purchasableId}-button`);

            if (!purchasableCard || !buyButton) continue; // Skip if element not found

            const isUnlocked = moduleLogicRef.isPurchasableUnlocked(purchasableId);
            const isAlreadyPurchasedOneTime = purchasableDef.setsGlobalFlag && coreGameStateManager.getGlobalFlag(purchasableDef.setsGlobalFlag.flag);

            if (isUnlocked && !isAlreadyPurchasedOneTime) {
                purchasableCard.classList.remove('opacity-50', 'grayscale', 'cursor-not-allowed');
                purchasableCard.classList.add('bg-surface-dark'); // Re-add normal background if removed
                // Ensure tooltips are removed if it was previously locked
                if (purchasableCard.classList.contains('tooltip-target')) {
                    purchasableCard.classList.remove('tooltip-target');
                    delete purchasableCard.dataset.tooltipContent;
                    coreSystemsRef.coreUIManager.hideTooltip(); // Hide any active tooltip for this element
                }

                const currentCost = moduleLogicRef.calculatePurchasableCost(purchasableId);

                // Update owned count for generators
                if (purchasableDef.costGrowthFactor !== "1") {
                    const ownedCount = moduleLogicRef.getOwnedPurchasableCount(purchasableId);
                    const ownedDisplay = purchasableCard.querySelector(`#purchasable-${purchasableId}-owned`);
                    if (ownedDisplay) ownedDisplay.textContent = `Owned: ${decimalUtility.format(ownedCount, 0)}`;
                }

                const costDisplay = purchasableCard.querySelector(`#purchasable-${purchasableId}-cost`);
                if (costDisplay) {
                    costDisplay.textContent = `Cost: ${decimalUtility.format(currentCost, 2)} ${coreResourceManager.getAllResources()[purchasableDef.costResource]?.name || purchasableDef.costResource}`;
                }

                if (buyButton) {
                    buyButton.textContent = purchasableDef.ui.buttonText(decimalUtility.format(currentCost, 2));
                    const canAfford = coreResourceManager.canAfford(purchasableDef.costResource, currentCost);
                    buyButton.disabled = !canAfford;
                    if (canAfford) {
                        buyButton.classList.remove('bg-gray-500', 'cursor-not-allowed');
                        buyButton.classList.add('bg-purple-600', 'hover:bg-purple-700');
                    } else {
                        buyButton.classList.remove('bg-purple-600', 'hover:bg-purple-700');
                        buyButton.classList.add('bg-gray-500', 'cursor-not-allowed');
                    }
                    // Update button tooltip for purchasables
                    buyButton.title = purchasableDef.ui.tooltip(moduleLogicRef.getOwnedPurchasableCount(purchasableId));
                }
            } else {
                // If locked or already purchased (for one-time unlocks)
                purchasableCard.classList.add('opacity-50', 'grayscale', 'cursor-not-allowed');
                if (buyButton) {
                    buyButton.disabled = true;
                    buyButton.classList.remove('bg-purple-600', 'hover:bg-purple-700');
                    buyButton.classList.add('bg-gray-500', 'cursor-not-allowed');
                    if (isAlreadyPurchasedOneTime) {
                        buyButton.textContent = "Purchased";
                    } else {
                        buyButton.textContent = "Locked";
                    }
                }
                // Ensure tooltip is set up for locked items
                if (!isAlreadyPurchasedOneTime && !purchasableCard.classList.contains('tooltip-target')) {
                    purchasableCard.classList.add('tooltip-target');
                    purchasableCard.dataset.tooltipContent = this._getUnlockTooltipContent(purchasableDef.unlockCondition);
                    this._setupTooltips(); // Re-run setup to catch new targets
                }
            }
        }
    },

    /**
     * Called when the module's tab is shown.
     */
    onShow() {
        coreSystemsRef.loggingSystem.debug("CommerceUI", "Commerce tab shown. Updating dynamic elements.");
        this.updateDynamicElements(); // Ensure UI is up-to-date when tab is shown
        this._setupTooltips(); // Re-setup tooltips as content might be re-rendered
    },

    /**
     * Called when the module's tab is hidden.
     */
    onHide() {
        coreSystemsRef.loggingSystem.debug("CommerceUI", "Commerce tab hidden.");
        coreSystemsRef.coreUIManager.hideTooltip(); // Hide any active tooltip
    }
};
