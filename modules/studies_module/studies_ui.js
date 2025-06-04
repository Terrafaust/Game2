// modules/studies_module/studies_ui.js

/**
 * @file studies_ui.js
 * @description Handles the UI rendering and interactions for the Studies module.
 */

import { staticModuleData } from './studies_data.js';
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
        coreSystemsRef.loggingSystem.debug("StudiesUI", "UI initialized.");
    },

    /**
     * Renders the main content for the Studies module.
     * This is called by coreUIManager when the tab is activated.
     * @param {HTMLElement} parentElement - The DOM element to render content into.
     */
    renderMainContent(parentElement) {
        if (!coreSystemsRef || !moduleLogicRef) {
            parentElement.innerHTML = '<p class="text-red-500">Studies UI not properly initialized.</p>';
            return;
        }
        parentElementCache = parentElement; // Cache for potential re-renders
        parentElement.innerHTML = ''; // Clear previous content

        const { coreUIManager, decimalUtility } = coreSystemsRef;

        const container = document.createElement('div');
        container.className = 'p-4 space-y-6'; // Tailwind classes

        const title = document.createElement('h2');
        title.className = 'text-2xl font-semibold text-primary mb-4';
        title.textContent = 'Studies Department';
        container.appendChild(title);

        const description = document.createElement('p');
        description.className = 'text-textSecondary mb-6';
        description.textContent = 'Automate your Study Point generation by acquiring and upgrading various academic facilities and personnel.';
        container.appendChild(description);

        const producersContainer = document.createElement('div');
        producersContainer.id = 'studies-producers-container';
        producersContainer.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
        container.appendChild(producersContainer);

        // Iterate through all producers defined in staticModuleData
        for (const producerId in staticModuleData.producers) {
            const producerDef = staticModuleData.producers[producerId];
            const isUnlocked = moduleLogicRef.isProducerUnlocked(producerId);

            const producerCard = document.createElement('div');
            producerCard.id = `producer-card-${producerId}`;
            producerCard.className = `bg-surface-dark p-4 rounded-lg shadow-md flex flex-col transition-all duration-200 ${isUnlocked ? '' : 'opacity-50 grayscale cursor-not-allowed'}`;

            const producerName = document.createElement('h3');
            producerName.className = 'text-xl font-semibold text-textPrimary mb-2';
            producerName.textContent = producerDef.name;
            producerCard.appendChild(producerName);

            const producerDescription = document.createElement('p');
            producerDescription.className = 'text-textSecondary text-sm mb-3';
            producerDescription.textContent = producerDef.description;
            producerCard.appendChild(producerDescription);

            const ownedDisplay = document.createElement('p');
            ownedDisplay.id = `producer-${producerId}-owned`;
            ownedDisplay.className = 'text-textPrimary text-lg font-bold mb-1';
            producerCard.appendChild(ownedDisplay);

            const productionDisplay = document.createElement('p');
            productionDisplay.id = `producer-${producerId}-production`;
            productionDisplay.className = 'text-green-400 text-sm mb-3';
            producerCard.appendChild(productionDisplay);

            const costDisplay = document.createElement('p');
            costDisplay.id = `producer-${producerId}-cost`;
            costDisplay.className = 'text-textSecondary text-sm mb-4';
            producerCard.appendChild(costDisplay);

            const buyButton = coreUIManager.createButton(
                '', // Text will be set dynamically
                () => {
                    const purchased = moduleLogicRef.purchaseProducer(producerId);
                    if (purchased) {
                        this.updateDynamicElements(); // Update all UI elements
                        // Check for global flag unlocks after purchase
                        moduleLogicRef.updateGlobalFlags();
                        coreUIManager.showNotification(`Purchased ${producerDef.name}!`, 'success', 1500);
                        // Add a subtle animation to the button
                        buyButton.classList.add('animate-pulse-once');
                        setTimeout(() => buyButton.classList.remove('animate-pulse-once'), 500);
                    } else {
                        coreUIManager.showNotification(`Not enough ${staticModuleData.producers[producerId].costResource} to buy ${producerDef.name}.`, 'error', 1500);
                    }
                },
                ['bg-blue-600', 'hover:bg-blue-700', 'text-white', 'py-2', 'px-4', 'text-md', 'w-full'],
                `buy-${producerId}-button`
            );
            producerCard.appendChild(buyButton);

            producersContainer.appendChild(producerCard);

            // Set up tooltip for locked producers
            if (!isUnlocked) {
                producerCard.classList.add('tooltip-target'); // Add a class to identify tooltip targets
                producerCard.dataset.tooltipContent = this._getUnlockTooltipContent(producerDef.unlockCondition);
            }
        }

        parentElement.appendChild(container);

        // Add a simple CSS animation for the button pulse (if not already in index.html)
        // Ensure this style is only added once
        if (!document.head.querySelector('#studies-module-styles')) {
            const style = document.createElement('style');
            style.id = 'studies-module-styles';
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
        this._setupTooltips(); // Setup tooltips for all producer cards
    },

    /**
     * Generates the tooltip content for a locked producer.
     * @param {object} condition - The unlock condition object.
     * @returns {string} HTML string for the tooltip.
     * @private
     */
    _getUnlockTooltipContent(condition) {
        const { coreResourceManager, decimalUtility } = coreSystemsRef;
        let content = '<p class="font-semibold text-primary mb-1">Unlock Condition:</p>';

        switch (condition.type) {
            case "resource":
                const currentAmount = coreResourceManager.getAmount(condition.resourceId);
                const requiredAmount = decimalUtility.new(condition.amount);
                content += `<p>Reach ${decimalUtility.format(requiredAmount, 0)} ${coreResourceManager.getAllResources()[condition.resourceId]?.name || condition.resourceId}.</p>`;
                content += `<p class="text-xs text-textSecondary">(Current: ${decimalUtility.format(currentAmount, 0)})</p>`;
                break;
            case "producerOwned":
                const producerDef = staticModuleData.producers[condition.producerId];
                const ownedCount = moduleLogicRef.getOwnedProducerCount(condition.producerId);
                content += `<p>Own ${condition.count} ${producerDef.name}${condition.count > 1 ? 's' : ''}.</p>`;
                content += `<p class="text-xs text-textSecondary">(Current: ${decimalUtility.format(ownedCount, 0)})</p>`;
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
            target.addEventListener('mouseenter', (event) => {
                const content = target.dataset.tooltipContent;
                if (content) {
                    coreSystemsRef.coreUIManager.showTooltip(content, target);
                }
            });
            target.addEventListener('mouseleave', () => {
                coreSystemsRef.coreUIManager.hideTooltip();
            });
        });
    },

    /**
     * Updates dynamic parts of the module's UI, like producer counts, costs, and production rates.
     * This should be called by the game loop's UI update phase or after purchases.
     */
    updateDynamicElements() {
        if (!parentElementCache) return; // Not rendered yet or parent cleared

        const { coreResourceManager, decimalUtility } = coreSystemsRef;

        for (const producerId in staticModuleData.producers) {
            const producerDef = staticModuleData.producers[producerId];
            const producerCard = parentElementCache.querySelector(`#producer-card-${producerId}`);
            const buyButton = parentElementCache.querySelector(`#buy-${producerId}-button`);

            if (!producerCard || !buyButton) continue; // Skip if element not found

            const isUnlocked = moduleLogicRef.isProducerUnlocked(producerId);

            if (isUnlocked) {
                producerCard.classList.remove('opacity-50', 'grayscale', 'cursor-not-allowed');
                producerCard.classList.add('bg-surface-dark'); // Re-add normal background if removed
                producerCard.removeEventListener('mouseenter', this._tooltipEnterHandler);
                producerCard.removeEventListener('mouseleave', this._tooltipLeaveHandler);
                coreSystemsRef.coreUIManager.hideTooltip(); // Hide any active tooltip for this element

                const ownedCount = moduleLogicRef.getOwnedProducerCount(producerId);
                const currentCost = moduleLogicRef.calculateProducerCost(producerId);
                const totalProduction = coreResourceManager.getProductionFromSource(producerDef.resourceId, `studies_module_${producerId}`);

                const ownedDisplay = producerCard.querySelector(`#producer-${producerId}-owned`);
                const productionDisplay = producerCard.querySelector(`#producer-${producerId}-production`);
                const costDisplay = producerCard.querySelector(`#producer-${producerId}-cost`);

                if (ownedDisplay) ownedDisplay.textContent = `Owned: ${decimalUtility.format(ownedCount, 0)}`;
                if (productionDisplay) {
                    productionDisplay.textContent = `Total Production: ${decimalUtility.format(totalProduction, 2)} ${producerDef.resourceId}/s`;
                }
                if (costDisplay) {
                    costDisplay.textContent = `Cost: ${decimalUtility.format(currentCost, 2)} ${producerDef.costResource}`;
                }

                if (buyButton) {
                    buyButton.textContent = producerDef.ui.buttonText(decimalUtility.format(currentCost, 2));
                    const canAfford = coreResourceManager.canAfford(producerDef.costResource, currentCost);
                    buyButton.disabled = !canAfford;
                    if (canAfford) {
                        buyButton.classList.remove('bg-gray-500', 'cursor-not-allowed');
                        buyButton.classList.add('bg-blue-600', 'hover:bg-blue-700');
                    } else {
                        buyButton.classList.remove('bg-blue-600', 'hover:bg-blue-700');
                        buyButton.classList.add('bg-gray-500', 'cursor-not-allowed');
                    }
                    buyButton.title = producerDef.ui.tooltip(decimalUtility.format(producerDef.baseProduction, 2), decimalUtility.format(ownedCount, 0));
                }
            } else {
                // If locked, ensure it's visually disabled and has tooltip setup
                producerCard.classList.add('opacity-50', 'grayscale', 'cursor-not-allowed');
                if (buyButton) {
                    buyButton.disabled = true;
                    buyButton.textContent = "Locked";
                    buyButton.classList.remove('bg-blue-600', 'hover:bg-blue-700');
                    buyButton.classList.add('bg-gray-500', 'cursor-not-allowed');
                }
                // Re-attach tooltip listeners if they were removed
                if (!producerCard.classList.contains('tooltip-target')) {
                    producerCard.classList.add('tooltip-target');
                    producerCard.dataset.tooltipContent = this._getUnlockTooltipContent(producerDef.unlockCondition);
                    this._setupTooltips(); // Re-run setup to catch new targets
                }
            }
        }
    },

    /**
     * Called when the module's tab is shown.
     */
    onShow() {
        coreSystemsRef.loggingSystem.debug("StudiesUI", "Studies tab shown. Updating dynamic elements.");
        this.updateDynamicElements(); // Ensure UI is up-to-date when tab is shown
        this._setupTooltips(); // Re-setup tooltips as content might be re-rendered
    },

    /**
     * Called when the module's tab is hidden.
     */
    onHide() {
        coreSystemsRef.loggingSystem.debug("StudiesUI", "Studies tab hidden.");
        coreSystemsRef.coreUIManager.hideTooltip(); // Hide any active tooltip
    }
};
