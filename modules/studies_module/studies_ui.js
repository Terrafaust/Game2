// js/modules/studies_module/studies_ui.js (v4.0 - Final Refactor)
// Fully integrated with translationManager and new core systems.

import { staticModuleData } from './studies_data.js';
import { MODULES } from '../../core/constants.js';

let coreSystemsRef = null;
let moduleLogicRef = null;
let parentElementCache = null;

export const ui = {
    initialize(coreSystems, logicRef) {
        coreSystemsRef = coreSystems;
        moduleLogicRef = logicRef;
        coreSystemsRef.loggingSystem.debug("StudiesUI", "UI initialized (v4.0).");

        document.addEventListener('buyMultiplierChanged', () => {
            if (coreSystemsRef.coreUIManager.isActiveTab(MODULES.STUDIES)) this.updateDynamicElements();
        });
        document.addEventListener('languagePackChanged', () => {
             if (coreSystemsRef.coreUIManager.isActiveTab(MODULES.STUDIES)) this.renderMainContent(parentElementCache);
        });
    },

    renderMainContent(parentElement) {
        if (!parentElement || !coreSystemsRef || !moduleLogicRef) return;
        parentElementCache = parentElement;
        parentElement.innerHTML = '';

        const { translationManager } = coreSystemsRef;
        const container = document.createElement('div');
        container.className = 'p-4 space-y-4';
        
        container.innerHTML = `
            <div class="p-3 bg-surface rounded-lg border border-primary/50 text-center">
                <p class="text-sm text-accentOne italic">${translationManager.get('studies.ui.tip')}</p>
            </div>
            <p class="text-textSecondary">${translationManager.get('studies.ui.description')}</p>
        `;

        const producersSection = document.createElement('div');
        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'flex justify-between items-center mb-4';

        const sectionTitle = document.createElement('h2');
        sectionTitle.className = 'text-2xl font-semibold text-primary';
        sectionTitle.textContent = translationManager.get('studies.ui.title');
        sectionHeader.appendChild(sectionTitle);

        if (coreSystemsRef.buyMultiplierUI) {
            const multiplierControls = coreSystemsRef.buyMultiplierUI.createBuyMultiplierControls();
            multiplierControls.classList.remove('my-4');
            sectionHeader.appendChild(multiplierControls);
        }
        
        producersSection.appendChild(sectionHeader);

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
        const { coreResourceManager, decimalUtility, buyMultiplierManager, translationManager } = coreSystemsRef;

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
                const totalProduction = coreResourceManager.getTotalProductionRate(producerDef.resourceId);
                
                ownedDisplay.textContent = `${translationManager.get('studies.ui.owned')}: ${decimalUtility.format(ownedCount, 0)}`;
                prodDisplay.textContent = `${translationManager.get('studies.ui.production')}: ${decimalUtility.format(totalProduction, 2)} ${producerDef.resourceId}/s`;

                const multiplier = buyMultiplierManager.getMultiplier();
                const quantityToBuy = (multiplier === -1) ? moduleLogicRef.calculateMaxBuyable(producerId) : decimalUtility.new(multiplier);
                const costForBatch = moduleLogicRef.calculateProducerCost(producerId, quantityToBuy);
                
                if (decimalUtility.gt(quantityToBuy, 0)) {
                    costDisplay.textContent = `${translationManager.get('studies.ui.cost_for', { quantity: decimalUtility.format(quantityToBuy, 0) })}: ${decimalUtility.format(costForBatch, 2)} ${producerDef.costResource}`;
                    buyButton.textContent = translationManager.get('studies.ui.buy_X', { quantity: decimalUtility.format(quantityToBuy, 0), name: producerDef.name + (decimalUtility.gt(quantityToBuy, 1) ? 's' : '') });
                } else {
                    costDisplay.textContent = `${translationManager.get('ui.generic.cost')}: ${decimalUtility.format(moduleLogicRef.calculateProducerCost(producerId, 1), 2)} ${producerDef.costResource}`;
                    buyButton.textContent = translationManager.get('studies.ui.buy_X', { quantity: 1, name: producerDef.name });
                }
                
                buyButton.disabled = !coreResourceManager.canAfford(producerDef.costResource, costForBatch) || decimalUtility.eq(quantityToBuy, 0);

            } else {
                card.classList.add('opacity-50', 'grayscale', 'cursor-not-allowed');
                buyButton.disabled = true;
                buyButton.textContent = translationManager.get('ui.status.locked');
                ownedDisplay.textContent = `${translationManager.get('studies.ui.owned')}: 0`;
                prodDisplay.textContent = `${translationManager.get('studies.ui.production')}: 0/s`;
                costDisplay.textContent = `${translationManager.get('ui.generic.cost')}: ${decimalUtility.format(moduleLogicRef.calculateProducerCost(producerId, 1), 2)} ${producerDef.costResource}`;
            }
        }
    },
    
    onShow() {
        if(parentElementCache) this.renderMainContent(parentElementCache);
    },

    onHide() { }
};
