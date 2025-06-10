// modules/market_module/market_ui.js (v3.0 - Roadmap UI Overhaul)

/**
 * @file market_ui.js
 * @description Handles the UI rendering and interactions for the Market module.
 * v3.0: Complete UI overhaul based on game roadmap Phase 3.
 * - Renders new categories: Consumables, Skill Points, Feature Unlocks.
 * - Adds "Already unlocked" section for purchased feature unlocks.
 * - Moves buy multiplier controls next to the title.
 * - Adds tooltip to "Acquire Image" button.
 */

import { staticModuleData } from './market_data.js';

let coreSystemsRef = null;
let moduleLogicRef = null;
let parentElementCache = null;

export const ui = {
    initialize(coreSystems, stateRef, logicRef) {
        coreSystemsRef = coreSystems;
        moduleLogicRef = logicRef;
        coreSystemsRef.loggingSystem.info("MarketUI", "UI initialized (v3.0).");
        
        document.addEventListener('buyMultiplierChanged', () => {
            if (coreSystemsRef.coreUIManager.isActiveTab('market')) {
                this.updateDynamicElements();
            }
        });
    },

    renderMainContent(parentElement) {
        if (!coreSystemsRef || !moduleLogicRef) {
            parentElement.innerHTML = '<p class="text-red-500">Market UI not properly initialized.</p>';
            return;
        }
        parentElementCache = parentElement;
        parentElement.innerHTML = ''; 

        const container = document.createElement('div');
        container.className = 'p-4 space-y-8'; 

        const header = document.createElement('div');
        header.className = 'flex justify-between items-center gap-4';

        const title = document.createElement('h2');
        title.className = 'text-2xl font-semibold text-primary';
        title.textContent = 'Trade & Unlocks Market';
        header.appendChild(title);

        // Roadmap 3.1 & 4.2: Move buy multiplier controls and make them conditional
        const { coreGameStateManager } = coreSystemsRef;
        if (coreGameStateManager.getGlobalFlag('buyMultiplesUnlocked')) {
             const studiesUI = coreSystemsRef.moduleLoader.getModule('studies')?.ui;
             if (studiesUI && typeof studiesUI._createBuyMultiplierControls === 'function') {
                const multiplierControls = studiesUI._createBuyMultiplierControls();
                multiplierControls.classList.remove('mb-6');
                header.appendChild(multiplierControls);
            }
        }
       
        container.appendChild(header);

        // Create containers for each new section
        container.appendChild(this._createCategorizedSection('Consumables', staticModuleData.consumables, this._createScalableItemCard.bind(this)));
        container.appendChild(this._createCategorizedSection('Skill Points', staticModuleData.skillPoints, this._createScalableItemCard.bind(this)));
        container.appendChild(this._createCategorizedSection('Feature Unlocks', staticModuleData.featureUnlocks, this._createUnlockCard.bind(this)));
        container.appendChild(this._createAlreadyUnlockedSection());

        parentElement.appendChild(container);
        this.updateDynamicElements();
        this._setupTooltips();
    },
    
    _createCategorizedSection(title, items, cardCreator) {
        const section = document.createElement('section');
        section.className = 'space-y-4';
        section.innerHTML = `<h3 class="text-xl font-medium text-secondary border-b border-gray-700 pb-2">${title}</h3>`;
        
        const itemsGrid = document.createElement('div');
        itemsGrid.id = `market-section-${title.toLowerCase().replace(' ', '-')}`;
        itemsGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
        
        if (Object.keys(items).length > 0) {
             for (const itemId in items) {
                const itemDef = items[itemId];
                // The card creator function will handle adding the card to the grid if it's visible
                cardCreator(itemsGrid, itemId, itemDef);
            }
        } else {
            itemsGrid.innerHTML = `<p class="text-textSecondary italic">Nothing here yet.</p>`;
        }

        section.appendChild(itemsGrid);
        return section;
    },

    _createAlreadyUnlockedSection() {
        const section = document.createElement('section');
        section.className = 'space-y-4';
        section.innerHTML = `<h3 class="text-xl font-medium text-secondary border-b border-gray-700 pb-2">Already Unlocked</h3>`;
        
        const itemsGrid = document.createElement('div');
        itemsGrid.id = `market-section-already-unlocked`;
        // Roadmap 3.1: Use grid-cols-4 for the unlocked section
        itemsGrid.className = 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-center';
        section.appendChild(itemsGrid);
        
        return section;
    },

    _createScalableItemCard(parentGrid, itemId, itemDef) {
        // Roadmap 3.1: Check for custom unlock conditions (e.g., prestige skill points)
        if (itemDef.unlockCondition) {
            const prestigeModule = coreSystemsRef.moduleLoader.getModule('prestige');
            if (!prestigeModule) return; // Don't render if the required module is missing
            const prestigeCount = prestigeModule.logic.getTotalPrestigeCount();
            if (coreSystemsRef.decimalUtility.lt(prestigeCount, itemDef.unlockCondition.count)) {
                return; // Do not render the card if condition is not met
            }
        }
        
        const { coreUIManager } = coreSystemsRef;
        const card = document.createElement('div');
        card.id = `market-item-${itemId}`;
        card.className = 'bg-surface-dark p-4 rounded-lg shadow-lg flex flex-col justify-between';

        const name = document.createElement('h4');
        name.className = 'text-lg font-semibold text-textPrimary mb-2';
        name.textContent = itemDef.name;
        
        // Roadmap 3.2: Add tooltip for 'Acquire Image'
        if (itemId === 'acquireImage') {
            name.classList.add('tooltip-target');
            name.dataset.tooltipContent = 'Get 1000 images to unlock prestige';
        }
        
        card.innerHTML = `<div></div><p class="text-textSecondary text-sm mb-3">${itemDef.description}</p><p id="${card.id}-cost" class="text-sm text-yellow-400 mb-4"></p>`;
        card.insertBefore(name, card.firstChild);
        
        const button = coreUIManager.createButton('', () => {
                moduleLogicRef.purchaseScalableItem(itemId);
            }, ['w-full', 'mt-auto'], `${card.id}-button`);
        card.appendChild(button);
        parentGrid.appendChild(card);
    },

    _createUnlockCard(parentGrid, unlockId, unlockDef) {
        // If the unlock is already purchased, we don't create a card here.
        // It will be handled by the updateDynamicElements function which adds it to the "Already Unlocked" grid.
        if (moduleLogicRef.isUnlockPurchased(unlockId)) {
            return;
        }

        // Roadmap 3.1: Check for prestige-gated unlocks
        if (unlockDef.unlockCondition) {
             const prestigeModule = coreSystemsRef.moduleLoader.getModule('prestige');
             if (!prestigeModule) return; 
             const prestigeCount = prestigeModule.logic.getTotalPrestigeCount();
             if (coreSystemsRef.decimalUtility.lt(prestigeCount, unlockDef.unlockCondition.count)) {
                return; // Do not render the card if condition is not met
            }
        }

        const { coreUIManager } = coreSystemsRef;
        const card = document.createElement('div');
        card.id = `market-unlock-${unlockId}`;
        card.className = 'bg-surface-dark p-4 rounded-lg shadow-lg flex flex-col justify-between';
        card.innerHTML = `<div><h4 class="text-lg font-semibold text-textPrimary mb-2">${unlockDef.name}</h4><p class="text-textSecondary text-sm mb-3">${unlockDef.description}</p><p id="${card.id}-cost" class="text-sm text-yellow-400 mb-4"></p></div>`;
        const button = coreUIManager.createButton('', () => {
                moduleLogicRef.purchaseUnlock(unlockId);
            }, ['w-full', 'mt-auto'], `${card.id}-button`);
        card.appendChild(button);
        parentGrid.appendChild(card);
    },

    _updateScalableItemCard(itemDef) {
        const cardElement = parentElementCache.querySelector(`#market-item-${itemDef.id}`);
        if (!cardElement) return;
        
        const { decimalUtility, coreResourceManager, buyMultiplierManager, coreGameStateManager } = coreSystemsRef;
        const costDisplay = cardElement.querySelector(`#market-item-${itemDef.id}-cost`);
        const button = cardElement.querySelector(`#market-item-${itemDef.id}-button`);

        let quantityToBuy = 1;
        let buyMode = '1';

        if (coreGameStateManager.getGlobalFlag('buyMultiplesUnlocked')) {
             const multiplier = buyMultiplierManager.getMultiplier();
             if (multiplier === -1) {
                quantityToBuy = moduleLogicRef.calculateMaxBuyable(itemDef.id);
                buyMode = 'Max';
             } else {
                quantityToBuy = decimalUtility.new(multiplier);
                buyMode = multiplier;
             }
        }
        
        const currentCost = moduleLogicRef.calculateScalableItemCost(itemDef.id, quantityToBuy);
        
        if (buyMode === 'Max') {
            costDisplay.textContent = `Cost for ${decimalUtility.format(quantityToBuy, 0)}: ${decimalUtility.format(currentCost, 0)} ${itemDef.costResource}`;
            button.textContent = `Acquire ${decimalUtility.format(quantityToBuy, 0)} (Max)`;
        } else {
            costDisplay.textContent = `Cost for ${decimalUtility.format(quantityToBuy, 0)}: ${decimalUtility.format(currentCost, 0)} ${itemDef.costResource}`;
            button.textContent = `Acquire ${decimalUtility.format(quantityToBuy, 0)}`;
        }

        const canAfford = coreResourceManager.canAfford(itemDef.costResource, currentCost);
        button.disabled = !canAfford || decimalUtility.eq(quantityToBuy, 0);
    },
    
    _updateUnlockItemCard(unlockId, unlockDef) {
        const cardElement = parentElementCache.querySelector(`#market-unlock-${unlockId}`);
        const { decimalUtility, coreResourceManager } = coreSystemsRef;
        
        // This handles moving the item to the unlocked grid
        const unlockedGrid = parentElementCache.querySelector('#market-section-already-unlocked');
        if (moduleLogicRef.isUnlockPurchased(unlockId)) {
            if (cardElement) cardElement.remove(); // Remove from purchase grid if it exists
            
            // Add to "already unlocked" grid if it's not there already
            if (unlockedGrid && !unlockedGrid.querySelector(`#unlocked-item-${unlockId}`)) {
                const unlockedItem = document.createElement('div');
                unlockedItem.id = `unlocked-item-${unlockId}`;
                unlockedItem.className = 'p-2 bg-surface-dark rounded text-textSecondary text-sm';
                unlockedItem.textContent = unlockDef.name;
                unlockedGrid.appendChild(unlockedItem);
            }
            return;
        }

        if (!cardElement) return; // If card isn't in the purchase grid, do nothing
        
        const costDisplay = cardElement.querySelector(`#market-unlock-${unlockId}-cost`);
        const button = cardElement.querySelector(`#market-unlock-${unlockId}-button`);
        
        const costAmount = decimalUtility.new(unlockDef.costAmount);
        costDisplay.textContent = `Cost: ${decimalUtility.format(costAmount, 0)} ${unlockDef.costResource}`;
        button.textContent = `Unlock`;
        button.disabled = !coreResourceManager.canAfford(unlockDef.costResource, costAmount);
    },


    updateDynamicElements() {
        if (!parentElementCache || !moduleLogicRef || !coreSystemsRef) return;
        
        const allScalableItems = { ...(staticModuleData.consumables || {}), ...(staticModuleData.skillPoints || {}) };
        for (const itemId in allScalableItems) {
            const itemDef = allScalableItems[itemId];
            this._updateScalableItemCard(itemDef);
        }

        for (const unlockId in staticModuleData.featureUnlocks) { 
            const unlockDef = staticModuleData.featureUnlocks[unlockId];
             this._updateUnlockItemCard(unlockId, unlockDef);
        }
    },
    
    _setupTooltips() {
        if (!parentElementCache) return;
        // Use event delegation on the container for efficiency
        parentElementCache.addEventListener('mouseover', (event) => {
            const target = event.target.closest('.tooltip-target');
            if (target && target.dataset.tooltipContent) {
                coreSystemsRef.coreUIManager.showTooltip(target.dataset.tooltipContent, target);
            }
        });
        parentElementCache.addEventListener('mouseout', (event) => {
            const target = event.target.closest('.tooltip-target');
             if (target) {
                coreSystemsRef.coreUIManager.hideTooltip();
            }
        });
    },

    onShow() {
        // Re-render fully on show to handle newly unlocked categories/items correctly
        if (parentElementCache) this.renderMainContent(parentElementCache); 
    },

    onHide() {
        coreSystemsRef.coreUIManager.hideTooltip();
    }
};
