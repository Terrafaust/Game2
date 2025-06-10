// modules/market_module/market_ui.js (v3.1 - Event Listener Fix)

/**
 * @file market_ui.js
 * @description Handles the UI rendering and interactions for the Market module.
 * v3.1: Replaced inline onmouseover/out events with addEventListener to prevent load-time errors.
 * v3.0: Complete UI restructure into Consumables, Skill Points, and Feature Unlocks sections.
 */

import { staticModuleData } from './market_data.js';

let coreSystemsRef = null;
let moduleLogicRef = null;
let parentElementCache = null;

function getCleanUnlockButtonText(unlockDefName) {
    let text = unlockDefName;
    if (typeof text === 'string') {
        text = text.replace(/^unlock\s+/i, '').replace(/\s+menu$/i, '');
    } else {
        text = "Feature";
    }
    return `Unlock ${text}`;
}

export const ui = {
    initialize(coreSystems, stateRef, logicRef) {
        coreSystemsRef = coreSystems;
        moduleLogicRef = logicRef;
        coreSystemsRef.loggingSystem.info("MarketUI", "UI initialized (v3.1).");
        
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

        container.innerHTML = `<h2 class="text-2xl font-semibold text-primary mb-4">Trade & Unlocks Market</h2>`;
        
        container.appendChild(this._createSection('Consumables', staticModuleData.consumables, true));
        container.appendChild(this._createSection('Skill Points', staticModuleData.skillPoints, true));
        container.appendChild(this._createSection('Feature Unlocks', staticModuleData.featureUnlocks, false));
        container.appendChild(this._createAlreadyUnlockedSection());

        parentElement.appendChild(container);
        this.updateDynamicElements();
    },

    _createSection(title, items, hasMultiplier) {
        const section = document.createElement('section');
        section.className = 'space-y-4';
        
        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'flex justify-between items-center border-b border-gray-700 pb-2 mb-4';
        
        const sectionTitle = document.createElement('h3');
        sectionTitle.className = 'text-xl font-medium text-secondary';
        sectionTitle.textContent = title;
        sectionHeader.appendChild(sectionTitle);

        if (hasMultiplier && coreSystemsRef.buyMultiplierUI && coreSystemsRef.coreGameStateManager.getGlobalFlag('buyMultiplesUnlocked', false)) {
            const multiplierControls = coreSystemsRef.buyMultiplierUI.createBuyMultiplierControls();
            multiplierControls.classList.remove('my-4');
            sectionHeader.appendChild(multiplierControls);
        }
        section.appendChild(sectionHeader);

        const itemsGrid = document.createElement('div');
        itemsGrid.id = `market-section-${title.toLowerCase().replace(' ', '-')}`;
        itemsGrid.className = 'grid grid-cols-1 md:grid-cols-2 gap-6';
        
        for (const itemId in items) {
            const itemDef = items[itemId];
            if (itemDef.unlockCondition && !itemDef.unlockCondition(coreSystemsRef)) continue;

            itemsGrid.appendChild(this._createMarketItemCard(itemDef, hasMultiplier));
        }
        section.appendChild(itemsGrid);

        return section;
    },
    
    _createAlreadyUnlockedSection() {
        const section = document.createElement('section');
        section.id = 'market-already-unlocked-section';
        section.className = 'space-y-4 hidden'; // Hide if empty
        
        section.innerHTML = `<h3 class="text-xl font-medium text-secondary border-b border-gray-700 pb-2 mb-4">Already Unlocked</h3>`;
        
        const grid = document.createElement('div');
        grid.id = 'market-already-unlocked-grid';
        grid.className = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-center';
        section.appendChild(grid);
        
        return section;
    },

    _createMarketItemCard(itemDef, isScalable) {
        const { coreUIManager } = coreSystemsRef;
        const card = document.createElement('div');
        card.id = `market-item-${itemDef.id}`;
        card.className = 'bg-surface-dark p-5 rounded-lg shadow-lg flex flex-col justify-between market-card';
        card.dataset.itemId = itemDef.id;
        card.dataset.itemType = isScalable ? 'scalable' : 'unlock';

        const contentDiv = document.createElement('div');
        
        const title = document.createElement('h4');
        title.className = 'text-lg font-semibold text-textPrimary mb-2';
        title.textContent = itemDef.name;
        contentDiv.appendChild(title);
        
        // --- MODIFICATION: Create description elements programmatically ---
        const descriptionP = document.createElement('p');
        descriptionP.className = 'text-textSecondary text-sm mb-3';
        descriptionP.textContent = itemDef.description;
        contentDiv.appendChild(descriptionP);

        if (itemDef.id === 'buyImages') {
            const prestigeInfo = document.createElement('p');
            prestigeInfo.className = 'text-xs text-accentOne italic cursor-pointer';
            prestigeInfo.textContent = '(Important for game progression)';
            const prestigeUnlockText = 'Get 1000 images to unlock Prestige';
            
            prestigeInfo.addEventListener('mouseover', (e) => coreUIManager.showTooltip(prestigeUnlockText, e.target));
            prestigeInfo.addEventListener('mouseout', () => coreUIManager.hideTooltip());
            
            contentDiv.appendChild(prestigeInfo);
        }
        
        const costP = document.createElement('p');
        costP.id = `${card.id}-cost`;
        costP.className = 'text-sm text-yellow-400 mb-4 mt-2';
        contentDiv.appendChild(costP);

        card.appendChild(contentDiv);
        // --- END MODIFICATION ---

        const button = coreUIManager.createButton('', () => {
                if (isScalable) {
                    moduleLogicRef.purchaseScalableItem(itemDef.id);
                } else {
                    moduleLogicRef.purchaseUnlock(itemDef.id);
                }
                this.renderMainContent(parentElementCache);
            }, ['w-full', 'mt-auto'], `${card.id}-button`);
        card.appendChild(button);
        
        return card;
    },
    
    updateDynamicElements() {
        if (!parentElementCache || !moduleLogicRef || !coreSystemsRef) return;
        
        const allItems = { ...staticModuleData.consumables, ...staticModuleData.skillPoints };
        const allUnlocks = { ...staticModuleData.featureUnlocks };
        
        for (const itemId in allItems) {
            const itemDef = allItems[itemId];
            const card = parentElementCache.querySelector(`[data-item-id="${itemId}"]`);
            if (card) this._updateScalableItemCard(card, itemDef);
        }
        
        const unlockedGrid = parentElementCache.querySelector('#market-already-unlocked-grid');
        const unlockedSection = parentElementCache.querySelector('#market-already-unlocked-section');
        if (!unlockedGrid || !unlockedSection) return;
        
        unlockedGrid.innerHTML = '';
        let unlockedCount = 0;

        for (const unlockId in allUnlocks) {
            const unlockDef = allUnlocks[unlockId];
            const card = parentElementCache.querySelector(`[data-item-id="${unlockId}"]`);
            
            if (moduleLogicRef.isUnlockPurchased(unlockId)) {
                unlockedCount++;
                const unlockedPill = document.createElement('div');
                unlockedPill.className = 'bg-green-800 text-green-200 text-sm font-semibold py-2 px-3 rounded-full shadow-md';
                unlockedPill.textContent = getCleanUnlockButtonText(unlockDef.name);
                unlockedGrid.appendChild(unlockedPill);
                
                if (card) card.style.display = 'none';

            } else {
                if (card) {
                    this._updateUnlockItemCard(card, unlockDef);
                    card.style.display = 'flex';
                }
            }
        }
        
        if (unlockedCount > 0) {
            unlockedSection.classList.remove('hidden');
        } else {
            unlockedSection.classList.add('hidden');
        }
    },

    _updateScalableItemCard(cardElement, itemDef) {
        if (!cardElement || !itemDef) return;
        const { decimalUtility, coreResourceManager, buyMultiplierManager } = coreSystemsRef;
        
        const costDisplay = cardElement.querySelector(`#market-item-${itemDef.id}-cost`);
        const button = cardElement.querySelector(`#market-item-${itemDef.id}-button`);

        let quantity = buyMultiplierManager.getMultiplier();
        let quantityToBuy = (quantity === -1) ? moduleLogicRef.calculateMaxBuyable(itemDef.id) : decimalUtility.new(quantity);
        
        const currentCost = moduleLogicRef.calculateScalableItemCost(itemDef.id, quantityToBuy);
        const quantityToDisplay = (quantity === -1) ? quantityToBuy : decimalUtility.new(quantity);

        if (decimalUtility.gt(quantityToDisplay, 0)) {
            costDisplay.textContent = `Cost for ${decimalUtility.format(quantityToDisplay,0)}: ${decimalUtility.format(currentCost, 0)} ${itemDef.costResource}`;
            button.textContent = `Acquire ${decimalUtility.format(quantityToDisplay,0)} ${itemDef.name.replace('Acquire ', '')}${decimalUtility.gt(quantityToDisplay, 1) ? 's' : ''}`;
        } else {
            const singleCost = moduleLogicRef.calculateScalableItemCost(itemDef.id, 1);
            costDisplay.textContent = `Cost: ${decimalUtility.format(singleCost, 0)} ${itemDef.costResource}`;
            button.textContent = `Acquire 1 ${itemDef.name.replace('Acquire ', '')}`;
        }

        const canAfford = coreResourceManager.canAfford(itemDef.costResource, currentCost);
        button.disabled = !canAfford || decimalUtility.eq(quantityToBuy, 0);
    },

    _updateUnlockItemCard(cardElement, unlockDef) {
        if (!cardElement || !unlockDef) return;
        const { decimalUtility, coreResourceManager } = coreSystemsRef;
        const costDisplay = cardElement.querySelector(`#market-item-${unlockDef.id}-cost`);
        const button = cardElement.querySelector(`#market-item-${unlockDef.id}-button`);
        
        const costAmount = decimalUtility.new(unlockDef.costAmount);
        costDisplay.textContent = `Cost: ${decimalUtility.format(costAmount, 0)} ${unlockDef.costResource}`;
        button.textContent = getCleanUnlockButtonText(unlockDef.name);
        button.disabled = !coreResourceManager.canAfford(unlockDef.costResource, costAmount);
    },

    onShow() {
        if (parentElementCache) this.renderMainContent(parentElementCache); 
    },

    onHide() {
        coreSystemsRef.coreUIManager.hideTooltip();
    }
};
