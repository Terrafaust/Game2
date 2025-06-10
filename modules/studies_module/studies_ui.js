// js/modules/studies_module/studies_ui.js (v2.5 - Final Multiplier Placement)

/**
 * @file studies_ui.js
 * @description Handles the UI rendering and interactions for the Studies module.
 * v2.5: Placed multiplier controls on the same line as the section title for a cleaner layout.
 * v2.4: Adjusted placement of the buy multiplier controls to be directly above the producers list.
 * v2.3: Refactored to use the centralized buyMultiplierUI helper.
 */

import { staticModuleData } from './studies_data.js';

let coreSystemsRef = null;
let moduleLogicRef = null;
let parentElementCache = null;

export const ui = {
    initialize(coreSystems, logicRef) {
        coreSystemsRef = coreSystems;
        moduleLogicRef = logicRef;
        coreSystemsRef.loggingSystem.debug("StudiesUI", "UI initialized (v2.5).");

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
        container.className = 'p-4 space-y-4';
        
        // This part remains, containing the main page title and tip
        container.innerHTML = `
            <div class="p-3 bg-surface rounded-lg border border-primary/50 text-center">
                <p class="text-sm text-accentOne italic">"Get 10 professors to unlock Market"</p>
            </div>
            <p class="text-textSecondary">Automate your Study Point generation by acquiring and upgrading various academic facilities and personnel.</p>
        `;

        const producersSection = document.createElement('div');
        
        // --- MODIFICATION: Create a header with flex layout for the title and controls ---
        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'flex justify-between items-center mb-4';

        const sectionTitle = document.createElement('h2');
        sectionTitle.className = 'text-2xl font-semibold text-primary';
        sectionTitle.textContent = 'Studies Department';
        sectionHeader.appendChild(sectionTitle);

        if (coreSystemsRef.buyMultiplierUI) {
            const multiplierControls = coreSystemsRef.buyMultiplierUI.createBuyMultiplierControls();
            multiplierControls.classList.remove('my-4'); // Remove default vertical margin for inline placement
            sectionHeader.appendChild(multiplierControls);
        } else {
            coreSystemsRef.loggingSystem.error("StudiesUI", "buyMultiplierUI helper not found in core systems!");
        }
        
        producersSection.appendChild(sectionHeader);
        // --- END MODIFICATION ---

        const producersContainer = document.createElement('div');
        producersContainer.id = 'studies-producers-container';
        producersContainer.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
        producersSection.appendChild(producersContainer);

        container.appendChild(producersSection);

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

    updateDynamicElements() {
        if (!parentElementCache) return;
        const { coreResourceManager, decimalUtility, buyMultiplierManager } = coreSystemsRef;

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
                
                ownedDisplay.textContent = `Possédés : ${decimalUtility.format(ownedCount, 0)}`;
                prodDisplay.textContent = `Production : ${decimalUtility.format(totalProduction, 2)} ${producerDef.resourceId}/s`;

                let quantity = buyMultiplierManager.getMultiplier();
                let quantityToBuy = (quantity === -1) ? moduleLogicRef.calculateMaxBuyable(producerId) : quantity;
                
                const costForBatch = moduleLogicRef.calculateProducerCost(producerId, quantityToBuy);
                
                const quantityToDisplay = (quantity === -1) ? quantityToBuy : quantity;

                if (decimalUtility.gt(quantityToDisplay, 0)) {
                    costDisplay.textContent = `Coût pour ${decimalUtility.format(quantityToDisplay, 0)}: ${decimalUtility.format(costForBatch, 2)} ${producerDef.costResource}`;
                    buyButton.textContent = `Acheter ${decimalUtility.format(quantityToDisplay, 0)} ${producerDef.name}${decimalUtility.gt(quantityToDisplay, 1) ? 's' : ''}`;
                } else {
                    costDisplay.textContent = `Coût : ${decimalUtility.format(moduleLogicRef.calculateProducerCost(producerId, 1), 2)} ${producerDef.costResource}`;
                    buyButton.textContent = `Acheter 1 ${producerDef.name}`;
                }
                
                const canAfford = coreResourceManager.canAfford(producerDef.costResource, costForBatch);
                buyButton.disabled = !canAfford || decimalUtility.eq(quantityToBuy, 0);

            } else {
                card.classList.add('opacity-50', 'grayscale', 'cursor-not-allowed');
                buyButton.disabled = true;
                buyButton.textContent = "Verrouillé";
                ownedDisplay.textContent = "Possédés : 0";
                prodDisplay.textContent = `Production : 0/s`;
                costDisplay.textContent = `Coût : ${decimalUtility.format(moduleLogicRef.calculateProducerCost(producerId, 1), 2)} ${producerDef.costResource}`;
            }
        }
    },
    
    _getUnlockTooltipContent(condition) {
        const { coreResourceManager, decimalUtility } = coreSystemsRef;
        let content = '<p class="font-semibold text-primary mb-1">Condition de déverrouillage:</p>';
        switch (condition.type) {
            case "resource":
                content += `<p>Atteindre ${decimalUtility.format(condition.amount, 0)} ${coreResourceManager.getResource(condition.resourceId)?.name || condition.resourceId}.</p>`;
                break;
            case "producerOwned":
                content += `<p>Posséder ${condition.count} ${staticModuleData.producers[condition.producerId].name}.</p>`;
                break;
        }
        return content;
    },
    _setupTooltips() {
        parentElementCache.querySelectorAll('.tooltip-target').forEach(target => {
            target.addEventListener('mouseenter', () => coreSystemsRef.coreUIManager.showTooltip(target.dataset.tooltipContent, target));
            target.addEventListener('mouseleave', () => coreSystemsRef.coreUIManager.hideTooltip());
        });
    },
    onShow() {
        if(parentElementCache) this.renderMainContent(parentElementCache);
    },
    onHide() {
        coreSystemsRef.coreUIManager.hideTooltip();
    }
};
