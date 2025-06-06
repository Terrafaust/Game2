// js/modules/studies_module/studies_ui.js (v2.2 - Bug Fix for toNumber)

/**
 * @file studies_ui.js
 * @description Handles the UI rendering and interactions for the Studies module.
 * v2.2: Fixes a crash related to an incorrect .toNumber() call.
 * v2.1: Adds 'Buy Max' button and logic to multiplier controls.
 */

import { staticModuleData } from './studies_data.js';

let coreSystemsRef = null;
let moduleLogicRef = null;
let parentElementCache = null;

export const ui = {
    initialize(coreSystems, logicRef) {
        coreSystemsRef = coreSystems;
        moduleLogicRef = logicRef;
        coreSystemsRef.loggingSystem.debug("StudiesUI", "UI initialized (v2.2).");

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
        
        container.innerHTML = `
            <h2 class="text-2xl font-semibold text-primary mb-4">Studies Department</h2>
            <p class="text-textSecondary mb-6">Automate your Study Point generation by acquiring and upgrading various academic facilities and personnel.</p>
        `;

        container.appendChild(this._createBuyMultiplierControls());

        const producersContainer = document.createElement('div');
        producersContainer.id = 'studies-producers-container';
        producersContainer.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
        container.appendChild(producersContainer);

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

    _createBuyMultiplierControls() {
        const { coreUIManager, buyMultiplierManager } = coreSystemsRef;
        const controlWrapper = document.createElement('div');
        controlWrapper.className = 'flex justify-center items-center space-x-2 mb-6 p-2 bg-surface-dark rounded-full';
        
        buyMultiplierManager.getAvailableMultipliers().forEach(multiplier => {
            const button = coreUIManager.createButton(
                buyMultiplierManager.getMultiplierLabel(multiplier),
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
            const buttonId = button.id;
            const multiplierValue = parseInt(buttonId.substring(buttonId.lastIndexOf('-') + 1), 10);

            if (multiplierValue === currentMultiplier) {
                button.classList.add('bg-accentOne', 'text-white', 'opacity-100');
                button.classList.remove('opacity-60', 'bg-primary');
            } else {
                button.classList.remove('bg-accentOne', 'text-white');
                button.classList.add('opacity-60', 'bg-primary');
            }
        });
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
                
                // *** THIS IS THE FIX: Pass quantityToBuy directly, without .toNumber() ***
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
