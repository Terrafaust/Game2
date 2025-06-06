// js/modules/studies_module/studies_ui.js (v2.0 - Buy Multiplier UI)

/**
 * @file studies_ui.js
 * @description Handles the UI rendering and interactions for the Studies module.
 * v2.0: Adds buy multiplier controls.
 */

import { staticModuleData } from './studies_data.js';

let coreSystemsRef = null;
let moduleLogicRef = null;
let parentElementCache = null;

export const ui = {
    initialize(coreSystems, logicRef) {
        coreSystemsRef = coreSystems;
        moduleLogicRef = logicRef;
        coreSystemsRef.loggingSystem.debug("StudiesUI", "UI initialized (v2.0).");

        // Listen for multiplier changes to re-render this tab if it's active
        document.addEventListener('buyMultiplierChanged', () => {
            if (coreSystemsRef.coreUIManager.isActiveTab('studies')) {
                this.updateDynamicElements();
            }
        });
    },

    renderMainContent(parentElement) {
        if (!coreSystemsRef || !moduleLogicRef) {
            parentElement.innerHTML = '<p class="text-red-500">Studies UI not properly initialized.</p>';
            return;
        }
        parentElementCache = parentElement;
        parentElement.innerHTML = '';

        const container = document.createElement('div');
        container.className = 'p-4 space-y-6';

        const title = document.createElement('h2');
        title.className = 'text-2xl font-semibold text-primary mb-4';
        title.textContent = 'Studies Department';
        container.appendChild(title);

        const description = document.createElement('p');
        description.className = 'text-textSecondary mb-6';
        description.textContent = 'Automate your Study Point generation by acquiring and upgrading various academic facilities and personnel.';
        container.appendChild(description);

        // --- NEW: Buy Multiplier Controls ---
        container.appendChild(this._createBuyMultiplierControls());

        const producersContainer = document.createElement('div');
        producersContainer.id = 'studies-producers-container';
        producersContainer.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
        container.appendChild(producersContainer);

        // Create the card structure for each producer
        for (const producerId in staticModuleData.producers) {
            producersContainer.appendChild(this._createProducerCard(producerId));
        }

        parentElement.appendChild(container);
        this.updateDynamicElements();
        this._setupTooltips();
    },
    
    _createProducerCard(producerId) {
        const producerDef = staticModuleData.producers[producerId];
        const { coreUIManager } = coreSystemsRef;

        const producerCard = document.createElement('div');
        producerCard.id = `producer-card-${producerId}`;
        producerCard.className = `bg-surface-dark p-4 rounded-lg shadow-md flex flex-col transition-all duration-200`;

        producerCard.innerHTML = `
            <h3 class="text-xl font-semibold text-textPrimary mb-2">${producerDef.name}</h3>
            <p class="text-textSecondary text-sm mb-3">${producerDef.description}</p>
            <p id="producer-${producerId}-owned" class="text-textPrimary text-lg font-bold mb-1"></p>
            <p id="producer-${producerId}-production" class="text-green-400 text-sm mb-3"></p>
            <p id="producer-${producerId}-cost" class="text-textSecondary text-sm mb-4"></p>
        `;

        const buyButton = coreUIManager.createButton('', () => {
            const purchased = moduleLogicRef.purchaseProducer(producerId);
            if (purchased) {
                this.updateDynamicElements();
                moduleLogicRef.updateGlobalFlags();
                coreUIManager.showNotification(`Purchased ${producerDef.name}!`, 'success', 1500);
            }
        }, ['bg-blue-600', 'hover:bg-blue-700', 'text-white', 'py-2', 'px-4', 'text-md', 'w-full', 'mt-auto'], `buy-${producerId}-button`);
        
        producerCard.appendChild(buyButton);
        return producerCard;
    },

    _createBuyMultiplierControls() {
        const { coreUIManager, buyMultiplierManager } = coreSystemsRef;
        const controlWrapper = document.createElement('div');
        controlWrapper.className = 'flex justify-center items-center space-x-2 mb-6 p-2 bg-surface-dark rounded-full';
        
        buyMultiplierManager.getAvailableMultipliers().forEach(multiplier => {
            const button = coreUIManager.createButton(
                `x${multiplier}`,
                () => buyMultiplierManager.setMultiplier(multiplier),
                ['px-4', 'py-1', 'text-sm'],
                `buy-multiplier-${multiplier}`
            );
            controlWrapper.appendChild(button);
        });
        
        this._updateMultiplierButtonStyles(controlWrapper);
        
        document.addEventListener('buyMultiplierChanged', () => this._updateMultiplierButtonStyles(controlWrapper));

        return controlWrapper;
    },

    _updateMultiplierButtonStyles(wrapper) {
        if (!wrapper) return;
        const { buyMultiplierManager } = coreSystemsRef;
        const currentMultiplier = buyMultiplierManager.getMultiplier();
        const buttons = wrapper.querySelectorAll('button');
        
        buttons.forEach(button => {
            const multiplierValue = parseInt(button.textContent.replace('x', ''), 10);
            if (multiplierValue === currentMultiplier) {
                button.classList.remove('bg-primary', 'opacity-60');
                button.classList.add('bg-accentOne', 'text-white');
            } else {
                button.classList.remove('bg-accentOne', 'text-white');
                button.classList.add('bg-primary', 'opacity-60');
            }
        });
    },

    updateDynamicElements() {
        if (!parentElementCache) return;
        const { coreResourceManager, decimalUtility, buyMultiplierManager } = coreSystemsRef;
        const currentMultiplier = buyMultiplierManager.getMultiplier();

        for (const producerId in staticModuleData.producers) {
            const producerDef = staticModuleData.producers[producerId];
            const producerCard = parentElementCache.querySelector(`#producer-card-${producerId}`);
            if (!producerCard) continue;

            const buyButton = producerCard.querySelector(`#buy-${producerId}-button`);
            const ownedDisplay = producerCard.querySelector(`#producer-${producerId}-owned`);
            const productionDisplay = producerCard.querySelector(`#producer-${producerId}-production`);
            const costDisplay = producerCard.querySelector(`#producer-${producerId}-cost`);
            
            const isUnlocked = moduleLogicRef.isProducerUnlocked(producerId);

            if (isUnlocked) {
                producerCard.classList.remove('opacity-50', 'grayscale', 'cursor-not-allowed');
                producerCard.classList.add('bg-surface-dark');

                const ownedCount = moduleLogicRef.getOwnedProducerCount(producerId);
                const costForBatch = moduleLogicRef.calculateProducerCost(producerId, currentMultiplier);
                const totalProduction = coreResourceManager.getProductionFromSource(producerDef.resourceId, `studies_module_${producerId}`);
                
                ownedDisplay.textContent = `Owned: ${decimalUtility.format(ownedCount, 0)}`;
                productionDisplay.textContent = `Total Production: ${decimalUtility.format(totalProduction, 2)} ${producerDef.resourceId}/s`;
                costDisplay.textContent = `Cost for ${currentMultiplier}: ${decimalUtility.format(costForBatch, 2)} ${producerDef.costResource}`;
                buyButton.textContent = `Buy ${currentMultiplier} ${producerDef.name}${currentMultiplier > 1 ? 's' : ''}`;
                
                const canAfford = coreResourceManager.canAfford(producerDef.costResource, costForBatch);
                buyButton.disabled = !canAfford;
                if (canAfford) {
                    buyButton.classList.remove('bg-gray-500', 'cursor-not-allowed');
                    buyButton.classList.add('bg-blue-600', 'hover:bg-blue-700');
                } else {
                    buyButton.classList.remove('bg-blue-600', 'hover:bg-blue-700');
                    buyButton.classList.add('bg-gray-500', 'cursor-not-allowed');
                }
            } else {
                producerCard.classList.add('opacity-50', 'grayscale', 'cursor-not-allowed');
                buyButton.disabled = true;
                buyButton.textContent = "Locked";
            }
        }
    },

    _getUnlockTooltipContent(condition) {
        // ... (This function remains unchanged)
        return "Unlock condition...";
    },

    _setupTooltips() {
        // ... (This function remains unchanged)
    },

    onShow() {
        coreSystemsRef.loggingSystem.debug("StudiesUI", "Studies tab shown.");
        this.updateDynamicElements();
        this._setupTooltips();
    },

    onHide() {
        coreSystemsRef.loggingSystem.debug("StudiesUI", "Studies tab hidden.");
        coreSystemsRef.coreUIManager.hideTooltip();
    }
};
