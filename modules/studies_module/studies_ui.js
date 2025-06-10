// js/modules/studies_module/studies_ui.js (v3.1 - Centralized UI Call)

/**
 * @file studies_ui.js
 * @description Handles the UI rendering and interactions for the Studies module.
 * v3.1: Modified to call the centralized coreUIManager.createBuyMultiplierControls.
 * v3.0: Moved buy multiplier controls next to title as per roadmap.
 */

import { staticModuleData } from './studies_data.js';

let coreSystemsRef = null;
let moduleLogicRef = null;
let parentElementCache = null;

export const ui = {
    initialize(coreSystems, logicRef) {
        coreSystemsRef = coreSystems;
        moduleLogicRef = logicRef;
        coreSystemsRef.loggingSystem.debug("StudiesUI", "UI initialized (v3.1).");

        // The global listener in coreUIManager now handles this.
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
        
        const header = document.createElement('div');
        header.className = 'flex justify-between items-center gap-4 flex-wrap';

        const title = document.createElement('h2');
        title.className = 'text-2xl font-semibold text-primary';
        title.textContent = 'Studies Department';
        header.appendChild(title);

        const { coreGameStateManager, coreUIManager } = coreSystemsRef;
        if (coreGameStateManager.getGlobalFlag('buyMultiplesUnlocked')) {
             // Call the new centralized function
             const multiplierControls = coreUIManager.createBuyMultiplierControls();
             header.appendChild(multiplierControls);
        }
        
        container.appendChild(header);

        container.innerHTML += `
            <div class="p-3 bg-surface rounded-lg border border-primary/50 text-center">
                <p class="text-sm text-accentOne italic">"Get 10 professors to unlock Market"</p>
            </div>
            <p class="text-textSecondary">Automate your Study Point generation by acquiring and upgrading various academic facilities and personnel.</p>
        `;
        container.insertBefore(header, container.firstChild);

        const producersContainer = document.createElement('div');
        producersContainer.id = 'studies-producers-container';
        producersContainer.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
        container.appendChild(producersContainer);

        for (const producerId in staticModuleData.producers) {
            producersContainer.appendChild(this._createProducerCard(producerId));
        }

        parentElement.appendChild(container);
        this.updateDynamicElements();
    },
    
    _createProducerCard(producerId) {
        const producerDef = staticModuleData.producers[producerId];
        const { coreUIManager } = coreSystemsRef;
        const card = document.createElement('div');
        card.id = `producer-card-${producerId}`;
        card.className = 'bg-surface-dark p-4 rounded-lg shadow-md flex flex-col';
        card.innerHTML = `
            <h3 class="text-xl font-semibold text-textPrimary mb-2">${producerDef.name}</h3>
            <p class="text-textSecondary text-sm mb-3">${producerDef.description}</p>
            <p id="producer-${producerId}-owned" class="text-textPrimary text-lg font-bold mb-1"></p>
            <p id="producer-${producerId}-production" class="text-green-400 text-sm mb-3"></p>
            <p id="producer-${producerId}-cost" class="text-textSecondary text-sm mb-4"></p>`;
        const buyButton = coreUIManager.createButton('', () => {
            if (moduleLogicRef.purchaseProducer(producerId)) {
                this.updateDynamicElements();
                moduleLogicRef.updateGlobalFlags();
            }
        }, ['w-full', 'mt-auto'], `buy-${producerId}-button`);
        card.appendChild(buyButton);
        return card;
    },

    // _createBuyMultiplierControls and _updateMultiplierButtonStyles are now removed,
    // as this functionality is handled by coreUIManager.

    updateDynamicElements() {
        if (!parentElementCache) return;
        const { coreResourceManager, decimalUtility, buyMultiplierManager, coreGameStateManager, coreUIManager } = coreSystemsRef;
        
        const header = parentElementCache.querySelector('.flex.justify-between.items-center');
        if(header) {
            let controls = header.querySelector('.buy-multiplier-controls');
            if (coreGameStateManager.getGlobalFlag('buyMultiplesUnlocked')) {
                if (!controls) {
                    controls = coreUIManager.createBuyMultiplierControls();
                    header.appendChild(controls);
                }
            } else {
                if (controls) controls.remove();
            }
        }

        for (const producerId in staticModuleData.producers) {
            const producerDef = staticModuleData.producers[producerId];
            const card = parentElementCache.querySelector(`#producer-card-${producerId}`);
            if (!card) continue;

            const ownedDisplay = card.querySelector(`#producer-${producerId}-owned`);
            const prodDisplay = card.querySelector(`#producer-${producerId}-production`);
            const costDisplay = card.querySelector(`#producer-${producerId}-cost`);
            const buyButton = card.querySelector(`#buy-${producerId}-button`);
            
            if (moduleLogicRef.isProducerUnlocked(producerId)) {
                card.classList.remove('opacity-50', 'grayscale', 'cursor-not-allowed');
                
                const ownedCount = moduleLogicRef.getOwnedProducerCount(producerId);
                const totalProduction = coreResourceManager.getProductionFromSource(producerDef.resourceId, `studies_module_${producerId}`);
                
                ownedDisplay.textContent = `Owned: ${decimalUtility.format(ownedCount, 0)}`;
                prodDisplay.textContent = `Production: ${decimalUtility.format(totalProduction, 2)} ${producerDef.resourceId}/s`;

                let quantityToBuy = decimalUtility.new(1);
                let buyMode = '1';

                if (coreGameStateManager.getGlobalFlag('buyMultiplesUnlocked')) {
                    const multiplier = buyMultiplierManager.getMultiplier();
                    if (multiplier === -1) {
                        quantityToBuy = moduleLogicRef.calculateMaxBuyable(producerId);
                        buyMode = 'Max';
                    } else {
                        quantityToBuy = decimalUtility.new(multiplier);
                        buyMode = `${multiplier}`;
                    }
                }
                
                const costForBatch = moduleLogicRef.calculateProducerCost(producerId, quantityToBuy);
                
                if (buyMode === 'Max' && decimalUtility.gt(quantityToBuy, 0)) {
                    costDisplay.textContent = `Cost for ${decimalUtility.format(quantityToBuy, 0)}: ${decimalUtility.format(costForBatch, 2)} ${producerDef.costResource}`;
                    buyButton.textContent = `Buy ${decimalUtility.format(quantityToBuy, 0)} (Max)`;
                } else {
                     costDisplay.textContent = `Cost: ${decimalUtility.format(costForBatch, 2)} ${producerDef.costResource}`;
                     buyButton.textContent = `Buy ${buyMode}`;
                }
                
                const canAfford = coreResourceManager.canAfford(producerDef.costResource, costForBatch);
                buyButton.disabled = !canAfford || decimalUtility.eq(quantityToBuy, 0);

            } else {
                card.classList.add('opacity-50', 'grayscale', 'cursor-not-allowed');
                buyButton.disabled = true;
                buyButton.textContent = "Locked";
                ownedDisplay.textContent = "Owned: 0";
                prodDisplay.textContent = `Production: 0/s`;
                costDisplay.textContent = `Cost: ${decimalUtility.format(moduleLogicRef.calculateProducerCost(producerId, 1), 2)} ${producerDef.costResource}`;
            }
        }
    },
    
    onShow() {
        if(parentElementCache) this.renderMainContent(parentElementCache);
    },

    onHide() {
        coreSystemsRef.coreUIManager.hideTooltip();
    }
};
