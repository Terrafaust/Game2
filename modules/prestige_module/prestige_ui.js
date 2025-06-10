// /game/modules/prestige_module/prestige_ui.js (v3.1 - Centralized Multiplier UI)
import * as logic from './prestige_logic.js';
import { prestigeData } from './prestige_data.js';

let coreSystemsRef = null;
let parentElementCache = null;

export const ui = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        document.addEventListener('buyMultiplierChanged', () => {
            if (coreSystemsRef && coreSystemsRef.coreUIManager.isActiveTab('prestige')) {
                this.updateDynamicElements();
            }
        });
        coreSystemsRef.loggingSystem.info("PrestigeUI", "UI initialized (v3.1).");
    },

    renderMainContent(parentElement) {
        parentElementCache = parentElement;
        parentElement.innerHTML = '';

        const container = document.createElement('div');
        container.className = 'p-4 space-y-6';
        
        const tipBox = document.createElement('div');
        tipBox.className = 'mb-6 p-3 bg-surface rounded-lg border border-red-500/50 text-center';
        const tipText = document.createElement('p');
        tipText.className = 'text-sm text-red-300 italic';
        tipText.textContent = '"The end already ?"';
        tipBox.appendChild(tipText);
        container.appendChild(tipBox);

        const header = document.createElement('div');
        header.className = 'flex justify-between items-center bg-surface-dark p-4 rounded-lg';
        
        const statsContainer = document.createElement('div');
        statsContainer.className = 'text-lg space-y-1';

        const ppDisplay = document.createElement('div');
        ppDisplay.id = 'pp-display';
        ppDisplay.className = 'text-yellow-300 font-semibold';
        statsContainer.appendChild(ppDisplay);

        const prestigeCountDisplay = document.createElement('div');
        prestigeCountDisplay.id = 'prestige-count-display';
        prestigeCountDisplay.className = 'text-sm text-gray-400';
        statsContainer.appendChild(prestigeCountDisplay);
        
        header.appendChild(statsContainer);

        const prestigeButtonContainer = document.createElement('div');
        const prestigeButton = coreSystemsRef.coreUIManager.createButton('', () => logic.performPrestige(), ['font-bold', 'py-2', 'px-4']);
        prestigeButton.id = 'prestige-button';
        prestigeButtonContainer.appendChild(prestigeButton);
        header.appendChild(prestigeButtonContainer);
        
        container.appendChild(header);

        // --- MODIFICATION: Use the centralized UI helper ---
        if (coreSystemsRef.buyMultiplierUI) {
            container.appendChild(coreSystemsRef.buyMultiplierUI.createBuyMultiplierControls());
        } else {
            coreSystemsRef.loggingSystem.error("PrestigeUI", "buyMultiplierUI helper not found in core systems!");
        }
        // --- END MODIFICATION ---

        const producersTitle = document.createElement('h3');
        producersTitle.className = 'text-xl font-semibold text-primary mt-6';
        producersTitle.textContent = 'Prestige Upgrades';
        container.appendChild(producersTitle);

        const producersGrid = document.createElement('div');
        producersGrid.id = 'prestige-producers-grid';
        producersGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
        
        for (const producerId in prestigeData.producers) {
            const producerDef = prestigeData.producers[producerId];
            producersGrid.appendChild(this._createProducerCard(producerDef));
        }

        container.appendChild(producersGrid);
        parentElement.appendChild(container);
        
        this.updateDynamicElements();
    },

    // --- MODIFICATION: Removed _createBuyMultiplierControls ---
    // The logic is now handled by the centralized js/core/buyMultiplierUI.js helper.

    _createProducerCard(producerDef) {
        const { coreUIManager } = coreSystemsRef;
        const card = document.createElement('div');
        card.id = `prestige-card-${producerDef.id}`;
        card.className = 'bg-surface p-4 rounded-lg shadow-md flex flex-col';

        const name = document.createElement('h4');
        name.className = 'text-md font-semibold text-textPrimary mb-1';
        name.textContent = producerDef.name;
        card.appendChild(name);

        const description = document.createElement('p');
        description.className = 'text-textSecondary text-xs mb-2 flex-grow';
        description.textContent = producerDef.description;
        card.appendChild(description);

        const ownedDisplay = document.createElement('p');
        ownedDisplay.id = `prestige-owned-${producerDef.id}`;
        ownedDisplay.className = 'text-sm text-blue-400 mb-2';
        card.appendChild(ownedDisplay);
        
        if (producerDef.passiveProduction) {
            const productionDisplay = document.createElement('div');
            productionDisplay.id = `prestige-production-${producerDef.id}`;
            productionDisplay.className = 'text-xs text-green-400 mb-2 space-y-1';
            card.appendChild(productionDisplay);
        }

        const costDisplay = document.createElement('p');
        costDisplay.id = `prestige-cost-${producerDef.id}`;
        costDisplay.className = 'text-xs text-yellow-400 mb-3';
        card.appendChild(costDisplay);
        
        const purchaseButton = coreUIManager.createButton(
            'Buy', 
            () => logic.purchasePrestigeProducer(producerDef.id), 
            ['w-full', 'text-sm', 'py-1.5', 'mt-auto'], 
            `prestige-purchase-${producerDef.id}`
        );
        card.appendChild(purchaseButton);

        return card;
    },

    updateDynamicElements() {
        if (!parentElementCache || !coreSystemsRef) return;
        const { decimalUtility, coreResourceManager, buyMultiplierManager, staticDataAggregator } = coreSystemsRef;

        const ppDisplay = parentElementCache.querySelector('#pp-display');
        if (ppDisplay) {
            const pp = coreResourceManager.getAmount('prestigePoints');
            ppDisplay.textContent = `Prestige Points: ${decimalUtility.format(pp, 2, 0)}`;
        }
        
        const prestigeCountDisplay = parentElementCache.querySelector('#prestige-count-display');
        if(prestigeCountDisplay) {
            const count = logic.getTotalPrestigeCount();
            prestigeCountDisplay.textContent = `Times Prestiged: ${decimalUtility.format(count, 0)}`;
        }

        const prestigeButton = parentElementCache.querySelector('#prestige-button');
        if (prestigeButton) {
            const gain = logic.calculatePrestigeGain();
            const canPrestige = logic.canPrestige();
            prestigeButton.disabled = !canPrestige || decimalUtility.eq(gain, 0);
            if (canPrestige) {
                prestigeButton.textContent = `Prestige for ${decimalUtility.format(gain, 2, 0)} PP`;
            } else {
                prestigeButton.textContent = 'Prestige Unlocked at 1k Images';
            }
        }
        
        const currentMultiplier = buyMultiplierManager.getMultiplier();
        
        const postDocMultiplier = logic.getPostDocMultiplier();

        for (const producerId in prestigeData.producers) {
            const card = parentElementCache.querySelector(`#prestige-card-${producerId}`);
            if (card) {
                const producerDef = prestigeData.producers[producerId];
                const owned = logic.getOwnedPrestigeProducerCount(producerId);
                card.querySelector(`#prestige-owned-${producerId}`).textContent = `Owned: ${decimalUtility.format(owned, 0)}`;

                const productionDisplay = card.querySelector(`#prestige-production-${producerId}`);
                if (productionDisplay) {
                    if (producerDef.passiveProduction && decimalUtility.gt(owned, 0)) {
                        let productionHtml = '';
                        producerDef.passiveProduction.forEach(p => {
                            const baseRate = decimalUtility.new(p.baseRate);
                            let finalRate = decimalUtility.multiply(baseRate, owned);
                            if(producerId !== 'postDoc') {
                                finalRate = decimalUtility.multiply(finalRate, postDocMultiplier);
                            }

                            if (decimalUtility.gt(finalRate, 0)) {
                                const studiesProducerData = staticDataAggregator.getData(`studies.producers.${p.producerId}`);
                                const producerName = studiesProducerData ? studiesProducerData.name : p.producerId;
                                productionHtml += `<div>Production: ${decimalUtility.format(finalRate, 2)} ${producerName}/s</div>`;
                            }
                        });
                        productionDisplay.innerHTML = productionHtml;
                    } else {
                        productionDisplay.innerHTML = '';
                    }
                }

                let quantityToBuy;
                if (currentMultiplier === -1) {
                    quantityToBuy = logic.calculateMaxBuyablePrestigeProducer(producerId);
                } else {
                    quantityToBuy = decimalUtility.new(currentMultiplier);
                }

                const cost = logic.calculatePrestigeProducerCost(producerId, quantityToBuy);
                
                card.querySelector(`#prestige-cost-${producerId}`).textContent = `Cost: ${decimalUtility.format(cost, 2, 0)} PP`;
                
                const button = card.querySelector(`#prestige-purchase-${producerId}`);
                button.disabled = !coreResourceManager.canAfford('prestigePoints', cost) || quantityToBuy.lte(0);

                let buttonText = "Buy";
                if(quantityToBuy.gt(0)) {
                    buttonText += ` ${decimalUtility.format(quantityToBuy, 0)}`;
                }
                button.textContent = buttonText;
            }
        }
    },
    
    onShow() {
        if(parentElementCache) this.updateDynamicElements();
    }
};
