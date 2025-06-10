// /game/modules/prestige_module/prestige_ui.js (v4.0 - Roadmap UI Tweaks)
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
        coreSystemsRef.loggingSystem.info("PrestigeUI", "UI initialized (v4.0).");
    },

    renderMainContent(parentElement) {
        parentElementCache = parentElement;
        parentElement.innerHTML = '';

        const container = document.createElement('div');
        container.className = 'p-4 space-y-6';
        
        container.innerHTML = `
            <div class="mb-6 p-3 bg-surface rounded-lg border border-red-500/50 text-center">
                 <p class="text-sm text-red-300 italic">"The end already ?"</p>
            </div>
        `;

        const header = document.createElement('div');
        header.className = 'text-center space-y-4 bg-surface-dark p-4 rounded-lg';
        
        const statsContainer = document.createElement('div');
        statsContainer.className = 'text-lg space-y-1';
        statsContainer.innerHTML = `
            <div id="pp-display" class="text-yellow-300 font-semibold text-2xl"></div>
            <div id="prestige-count-display" class="text-sm text-gray-400"></div>
        `;
        header.appendChild(statsContainer);
        
        // --- ROADMAP 4.2: Move buy multiplier controls between stats and button ---
        const { coreGameStateManager } = coreSystemsRef;
        if (coreGameStateManager.getGlobalFlag('buyMultiplesUnlocked')) {
             const studiesUI = coreSystemsRef.moduleLoader.getModule('studies')?.ui;
             if (studiesUI && typeof studiesUI._createBuyMultiplierControls === 'function') {
                const multiplierContainer = document.createElement('div');
                multiplierContainer.className = 'flex justify-center items-center py-2';
                const multiplierControls = studiesUI._createBuyMultiplierControls();
                multiplierControls.classList.remove('mb-6');
                multiplierContainer.appendChild(multiplierControls);
                header.appendChild(multiplierContainer);
            }
        }
        
        const prestigeButton = coreSystemsRef.coreUIManager.createButton('', () => logic.performPrestige(), ['font-bold', 'py-3', 'px-6', 'text-lg', 'w-full', 'md:w-auto']);
        prestigeButton.id = 'prestige-button';
        header.appendChild(prestigeButton);
        container.appendChild(header);

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
    
    _createProducerCard(producerDef) {
        const { coreUIManager } = coreSystemsRef;
        const card = document.createElement('div');
        card.id = `prestige-card-${producerDef.id}`;
        card.className = 'bg-surface p-4 rounded-lg shadow-md flex flex-col';

        card.innerHTML = `
            <h4 class="text-md font-semibold text-textPrimary mb-1">${producerDef.name}</h4>
            <p class="text-textSecondary text-xs mb-2 flex-grow">${producerDef.description}</p>
            <p id="prestige-owned-${producerDef.id}" class="text-sm text-blue-400 mb-2"></p>
            <div id="prestige-production-${producerDef.id}" class="text-xs text-green-400 mb-2 space-y-1"></div>
            <p id="prestige-cost-${producerDef.id}" class="text-xs text-yellow-400 mb-3"></p>
        `;
        
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
        const { decimalUtility, coreResourceManager, buyMultiplierManager, staticDataAggregator, coreGameStateManager } = coreSystemsRef;

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
            if (canPrestige && decimalUtility.gt(gain, 0)) {
                prestigeButton.textContent = `Prestige for ${decimalUtility.format(gain, 2, 0)} PP`;
            } else if (canPrestige) {
                 prestigeButton.textContent = 'Not enough gain to Prestige';
            } else {
                prestigeButton.textContent = 'Prestige Unlocked at 1k Images';
            }
        }
        
        // This is now handled by the generic `_updateMultiplierButtonStyles` in studies_ui
        const studiesUI = coreSystemsRef.moduleLoader.getModule('studies')?.ui;
        const multiplierControls = parentElementCache.querySelector('.flex.space-x-2');
        if (multiplierControls && studiesUI && typeof studiesUI._updateMultiplierButtonStyles === 'function') {
            studiesUI._updateMultiplierButtonStyles(multiplierControls);
        }

        const postDocMultiplier = logic.getPostDocMultiplier();

        for (const producerId in prestigeData.producers) {
            const card = parentElementCache.querySelector(`#prestige-card-${producerId}`);
            if (card) {
                const producerDef = prestigeData.producers[producerId];
                const owned = logic.getOwnedPrestigeProducerCount(producerId);
                card.querySelector(`#prestige-owned-${producerId}`).textContent = `Owned: ${decimalUtility.format(owned, 0)}`;
                
                const productionDisplay = card.querySelector(`#prestige-production-${producerId}`);
                if (productionDisplay) {
                    let productionHtml = '';
                    if (producerDef.passiveProduction && decimalUtility.gt(owned, 0)) {
                        producerDef.passiveProduction.forEach(p => {
                            const baseRate = decimalUtility.new(p.baseRate);
                            let finalRate = decimalUtility.multiply(baseRate, owned);
                            if(producerId !== 'postDoc') {
                                finalRate = decimalUtility.multiply(finalRate, postDocMultiplier);
                            }
                            if (decimalUtility.gt(finalRate, 0)) {
                                const studiesProducerData = staticDataAggregator.getData(`studies.producers.${p.producerId}`);
                                const producerName = studiesProducerData ? studiesProducerData.name : p.producerId;
                                productionHtml += `<div>+${decimalUtility.format(finalRate, 2)} ${producerName}/s</div>`;
                            }
                        });
                    }
                     productionDisplay.innerHTML = productionHtml;
                }
                
                let quantityToBuy = 1;
                let buyMode = '1';
                
                if (coreGameStateManager.getGlobalFlag('buyMultiplesUnlocked')) {
                    const multiplier = buyMultiplierManager.getMultiplier();
                    if (multiplier === -1) {
                        quantityToBuy = logic.calculateMaxBuyablePrestigeProducer(producerId);
                        buyMode = 'Max';
                    } else {
                        quantityToBuy = decimalUtility.new(multiplier);
                        buyMode = multiplier;
                    }
                }

                const cost = logic.calculatePrestigeProducerCost(producerId, quantityToBuy);
                card.querySelector(`#prestige-cost-${producerId}`).textContent = `Cost: ${decimalUtility.format(cost, 2, 0)} PP`;
                
                const button = card.querySelector(`#prestige-purchase-${producerId}`);
                button.disabled = !coreResourceManager.canAfford('prestigePoints', cost) || decimalUtility.lte(quantityToBuy, 0);

                if (buyMode === 'Max') {
                    button.textContent = `Buy ${decimalUtility.format(quantityToBuy, 0)} (Max)`;
                } else {
                     button.textContent = `Buy ${buyMode}`;
                }
            }
        }
    },
    
    onShow() {
        if(parentElementCache) this.renderMainContent(parentElementCache);
    }
};
