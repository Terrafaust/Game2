// modules/market_module/market_ui.js (v1.7 - Buy Multiplier UI)

/**
 * @file market_ui.js
 * @description Handles the UI rendering and interactions for the Market module.
 * v1.7: Adds buy multiplier controls.
 * v1.6: Implemented helper for consistent unlock button text.
 */

import { staticModuleData } from './market_data.js';

let coreSystemsRef = null;
let moduleLogicRef = null;
let parentElementCache = null;

function getCleanUnlockButtonText(unlockDefName, loggingSystem) {
    let text = unlockDefName;
    if (typeof text === 'string') {
        text = text.replace(/^unlock\s+/i, '');
        text = text.replace(/\s+menu$/i, '');
    } else {
        loggingSystem.warn("MarketUI_GetCleanText", `unlockDefName is not a string: ${unlockDefName}`);
        text = "Feature";
    }
    return `Unlock ${text}`;
}

export const ui = {
    initialize(coreSystems, stateRef, logicRef) {
        coreSystemsRef = coreSystems;
        moduleLogicRef = logicRef;
        coreSystemsRef.loggingSystem.info("MarketUI", "UI initialized (v1.7).");
        
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

        const title = document.createElement('h2');
        title.className = 'text-2xl font-semibold text-primary mb-6';
        title.textContent = 'Trade & Unlocks Market';
        container.appendChild(title);

        // --- ADDED: Reuse buy multiplier controls from studies UI ---
        const studiesUI = coreSystemsRef.moduleLoader.getModule('studies')?.ui;
        if (studiesUI && typeof studiesUI._createBuyMultiplierControls === 'function') {
            container.appendChild(studiesUI._createBuyMultiplierControls());
        } else {
            coreSystemsRef.loggingSystem.warn("MarketUI", "Could not find _createBuyMultiplierControls from Studies UI. Multiplier controls will be missing.");
        }

        container.appendChild(this._createScalableItemsSection());
        container.appendChild(this._createUnlocksSection());

        parentElement.appendChild(container);
        this.updateDynamicElements();
    },

    _createScalableItemsSection() {
        const section = document.createElement('section');
        section.className = 'space-y-6';

        const itemsTitle = document.createElement('h3');
        itemsTitle.className = 'text-xl font-medium text-secondary border-b border-gray-700 pb-2 mb-4';
        itemsTitle.textContent = 'Consumables';
        section.appendChild(itemsTitle);
        
        const itemsGrid = document.createElement('div');
        itemsGrid.className = 'grid grid-cols-1 md:grid-cols-2 gap-6';

        for (const itemId in staticModuleData.marketItems) {
            const itemDef = staticModuleData.marketItems[itemId];
            const itemCard = this._createMarketItemCard(
                itemDef.id, itemDef.name, itemDef.description,
                () => moduleLogicRef.purchaseScalableItem(itemId), 
                `Buy 1 ${itemDef.name.replace('Acquire ', '')}`, 
                true, itemId
            );
            itemsGrid.appendChild(itemCard);
        }
        
        section.appendChild(itemsGrid);
        return section;
    },

    _createUnlocksSection() {
        const section = document.createElement('section');
        section.className = 'space-y-6';

        const unlocksTitle = document.createElement('h3');
        unlocksTitle.className = 'text-xl font-medium text-secondary border-b border-gray-700 pb-2 mb-4';
        unlocksTitle.textContent = 'Feature Unlocks';
        section.appendChild(unlocksTitle);
        
        const unlocksGrid = document.createElement('div');
        unlocksGrid.className = 'grid grid-cols-1 md:grid-cols-2 gap-6';

        for (const unlockKey in staticModuleData.marketUnlocks) { 
            const unlockDef = staticModuleData.marketUnlocks[unlockKey];
            const unlockCard = this._createMarketItemCard(
                unlockDef.id, unlockDef.name, unlockDef.description,
                () => moduleLogicRef.purchaseUnlock(unlockKey), 
                "Unlock", false, unlockKey
            );
            unlocksGrid.appendChild(unlockCard);
        }
        
        section.appendChild(unlocksGrid);
        return section;
    },
    
    _createMarketItemCard(domIdBase, nameText, descriptionText, purchaseCallback, initialButtonText, isScalable, itemKey) {
        const { coreUIManager } = coreSystemsRef;
        const card = document.createElement('div');
        card.id = isScalable ? `market-item-${domIdBase}` : `market-unlock-${domIdBase}`;
        card.className = 'bg-surface-dark p-5 rounded-lg shadow-lg flex flex-col justify-between';

        card.innerHTML = `
            <div>
                <h4 class="text-lg font-semibold text-textPrimary mb-2">${nameText}</h4>
                <p class="text-textSecondary text-sm mb-3">${descriptionText}</p>
                <p id="${card.id}-cost" class="text-sm text-yellow-400 mb-4"></p>
            </div>
        `;
        
        const button = coreUIManager.createButton(
            initialButtonText, 
            () => {
                purchaseCallback();
                this.updateDynamicElements();
            },
            ['w-full', 'mt-auto'], 
            `${card.id}-button`
        );
        card.appendChild(button);
        return card;
    },

    _updateScalableItemCard(cardElement, itemDef) {
        if (!cardElement || !itemDef) return;
        const { decimalUtility, coreResourceManager, buyMultiplierManager } = coreSystemsRef;
        const quantity = buyMultiplierManager.getMultiplier();

        const costDisplay = cardElement.querySelector(`#market-item-${itemDef.id}-cost`);
        const button = cardElement.querySelector(`#market-item-${itemDef.id}-button`);
        const currentCost = moduleLogicRef.calculateScalableItemCost(itemDef.id, quantity);
        
        costDisplay.textContent = `Cost for ${quantity}: ${decimalUtility.format(currentCost, 0)} ${itemDef.costResource}`;
        button.textContent = `Buy ${quantity} ${itemDef.name.replace('Acquire ', '')}${quantity > 1 ? 's': ''}`;
        
        const canAfford = coreResourceManager.canAfford(itemDef.costResource, currentCost);
        button.disabled = !canAfford;
        // (Styling for disabled/enabled is handled by global .game-button:disabled CSS)
    },

    _updateUnlockItemCard(cardElement, unlockKey, unlockDef) {
        if (!cardElement || !unlockDef) return;
        const { decimalUtility, loggingSystem, coreResourceManager } = coreSystemsRef;

        const costDisplay = cardElement.querySelector(`#market-unlock-${unlockDef.id}-cost`);
        const button = cardElement.querySelector(`#market-unlock-${unlockDef.id}-button`);

        const isPurchased = moduleLogicRef.isUnlockPurchased(unlockKey);
        
        if (isPurchased) { 
            costDisplay.textContent = "Already Unlocked!";
            button.textContent = "Unlocked";
            button.disabled = true;
            button.classList.add('bg-green-600', 'cursor-default');
            button.classList.remove('bg-primary');
        } else {
            const costAmount = decimalUtility.new(unlockDef.costAmount);
            costDisplay.textContent = `Cost: ${decimalUtility.format(costAmount, 0)} ${unlockDef.costResource}`;
            button.textContent = getCleanUnlockButtonText(unlockDef.name, loggingSystem);
            
            const canAfford = coreResourceManager.canAfford(unlockDef.costResource, costAmount);
            button.disabled = !canAfford;
            button.classList.remove('bg-green-600');
            button.classList.add('bg-primary');
        }
    },

    updateDynamicElements() {
        if (!parentElementCache || !moduleLogicRef || !coreSystemsRef) return;
        
        for (const itemId in staticModuleData.marketItems) { 
            const itemDef = staticModuleData.marketItems[itemId];
            const cardElement = parentElementCache.querySelector(`#market-item-${itemDef.id}`); 
            if (cardElement) this._updateScalableItemCard(cardElement, itemDef);
        }

        for (const unlockKey in staticModuleData.marketUnlocks) { 
            const unlockDef = staticModuleData.marketUnlocks[unlockKey];
            const cardElement = parentElementCache.querySelector(`#market-unlock-${unlockDef.id}`); 
            if (cardElement) this._updateUnlockItemCard(cardElement, unlockKey, unlockDef);
        }
    },

    onShow() {
        coreSystemsRef.loggingSystem.debug("MarketUI", "Market tab shown.");
        if (parentElementCache) { 
            this.renderMainContent(parentElementCache); 
        }
    },

    onHide() {
        coreSystemsRef.loggingSystem.debug("MarketUI", "Market tab hidden.");
    }
};
