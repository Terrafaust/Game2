// js/modules/studies_module/studies_ui.js (v3.0 - Roadmap UI Tweaks)

/**
 * @file studies_ui.js
 * @description Handles the UI rendering and interactions for the Studies module.
 * v3.0: Moved buy multiplier controls next to title as per roadmap.
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
        coreSystemsRef.loggingSystem.debug("StudiesUI", "UI initialized (v3.0).");

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
        
        // --- ROADMAP 4.2: Header with inline controls ---
        const header = document.createElement('div');
        header.className = 'flex justify-between items-center gap-4 flex-wrap';

        const title = document.createElement('h2');
        title.className = 'text-2xl font-semibold text-primary';
        title.textContent = 'Studies Department';
        header.appendChild(title);

        // Conditionally add buy multiplier controls if unlocked
        const { coreGameStateManager } = coreSystemsRef;
        if (coreGameStateManager.getGlobalFlag('buyMultiplesUnlocked')) {
             const multiplierControls = this._createBuyMultiplierControls();
             multiplierControls.classList.remove('mb-6'); // Remove bottom margin for inline display
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
        // --- END ROADMAP MODIFICATION ---


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

    _createBuyMultiplierControls() {
        const { coreUIManager, buyMultiplierManager } = coreSystemsRef;
        const controlWrapper = document.createElement('div');
        controlWrapper.className = 'flex justify-center items-center space-x-2 bg-surface-dark rounded-full p-1';
        
        buyMultiplierManager.getAvailableMultipliers().forEach(multiplier => {
            const button = coreUIManager.createButton(
                buyMultiplierManager.getMultiplierLabel(multiplier),
                () => buyMultiplierManager.setMultiplier(multiplier),
                ['px-3', 'py-1', 'text-xs', 'rounded-full'], // Adjusted padding and size
                `buy-multiplier-${multiplier}`
            );
            controlWrapper.appendChild(button);
        });
        
        this._updateMultiplierButtonStyles(controlWrapper);
        document.addEventListener('buyMultiplierChanged', () => this._updateMultiplierButtonStyles(controlWrapper));
        return controlWrapper;
    },

    _updateMultiplierButtonStyles(wrapper) {
        if (!wrapper) {
            // Try to find it if not passed
            wrapper = parentElementCache?.querySelector('.flex.space-x-2.bg-surface-dark');
            if (!wrapper) return;
        }
        const { buyMultiplierManager } = coreSystemsRef;
        const currentMultiplier = buyMultiplierManager.getMultiplier();
        const buttons = wrapper.querySelectorAll('button');
        
        buttons.forEach(button => {
            // Extract multiplier value from the ID, assuming format 'buy-multiplier-X'
            const buttonMultiplier = parseInt(button.id.split('-').pop(), 10);

            if (buttonMultiplier === currentMultiplier) {
                button.classList.add('bg-accentOne', 'text-white', 'opacity-100');
                button.classList.remove('opacity-60', 'hover:bg-primary-dark');
            } else {
                button.classList.remove('bg-accentOne', 'text-white', 'opacity-100');
                button.classList.add('opacity-60', 'hover:bg-primary-dark');
            }
        });
    },

    updateDynamicElements() {
        if (!parentElementCache) return;
        const { coreResourceManager, decimalUtility, buyMultiplierManager, coreGameStateManager } = coreSystemsRef;
        
        // Update visibility of multiplier controls
        const header = parentElementCache.querySelector('.flex.justify-between.items-center');
        if(header) {
            let controls = header.querySelector('.flex.space-x-2.bg-surface-dark');
            if (coreGameStateManager.getGlobalFlag('buyMultiplesUnlocked')) {
                if (!controls) {
                    controls = this._createBuyMultiplierControls();
                    controls.classList.remove('mb-6');
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

                let quantityToBuy = 1;
                let buyMode = '1';

                if (coreGameStateManager.getGlobalFlag('buyMultiplesUnlocked')) {
                    const multiplier = buyMultiplierManager.getMultiplier();
                    if (multiplier === -1) {
                        quantityToBuy = moduleLogicRef.calculateMaxBuyable(producerId);
                        buyMode = 'Max';
                    } else {
                        quantityToBuy = quantityToBuy = decimalUtility.new(multiplier);
                        buyMode = multiplier;
                    }
                }
                
                const costForBatch = moduleLogicRef.calculateProducerCost(producerId, quantityToBuy);
                
                if (buyMode === 'Max') {
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
