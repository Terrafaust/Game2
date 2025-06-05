// modules/market_module/market_ui.js (v1.6 - Refined Button Text Logic)

/**
 * @file market_ui.js
 * @description Handles the UI rendering and interactions for the Market module.
 * v1.6: Implemented helper for consistent unlock button text.
 * v1.5: Further refinement of button text logic for unlocks.
 */

import { staticModuleData } from './market_data.js';

let coreSystemsRef = null;
let moduleLogicRef = null;
let parentElementCache = null;

// Helper function for consistent unlock button text
function getCleanUnlockButtonText(unlockDefName, loggingSystem) {
    let text = unlockDefName;
    // loggingSystem.debug("MarketUI_GetCleanText", `Original name: '${unlockDefName}'`);
    if (typeof text === 'string') {
        text = text.replace(/^unlock\s+/i, ''); // Remove "Unlock " from the beginning (case-insensitive)
        // loggingSystem.debug("MarketUI_GetCleanText", `After removing 'Unlock ': '${text}'`);
        text = text.replace(/\s+menu$/i, '');    // Remove " Menu" from the end (case-insensitive)
        // loggingSystem.debug("MarketUI_GetCleanText", `After removing ' Menu': '${text}'`);
    } else {
        loggingSystem.warn("MarketUI_GetCleanText", `unlockDefName is not a string: ${unlockDefName}`);
        text = "Feature"; // Fallback
    }
    return `Unlock ${text}`;
}


export const ui = {
    initialize(coreSystems, stateRef, logicRef) {
        coreSystemsRef = coreSystems;
        moduleLogicRef = logicRef;
        coreSystemsRef.loggingSystem.info("MarketUI", "UI initialized (v1.6).");
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

        container.appendChild(this._createScalableItemsSection());
        container.appendChild(this._createUnlocksSection());

        parentElement.appendChild(container);
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
            let buttonText = `Buy 1 ${itemDef.name.replace('Acquire ', '')}`; 

            const itemCard = this._createMarketItemCard(
                itemDef.id, 
                itemDef.name,
                itemDef.description,
                () => moduleLogicRef.purchaseScalableItem(itemId), 
                buttonText, 
                true,
                itemId // Pass itemId for scalable items
            );
            itemCard.id = `market-item-${itemDef.id}`; 
            this._updateScalableItemCard(itemCard, itemDef); 
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
            let buttonText;
            if (moduleLogicRef.isUnlockPurchased(unlockKey)) {
                buttonText = "Unlocked";
            } else {
                buttonText = getCleanUnlockButtonText(unlockDef.name, coreSystemsRef.loggingSystem);
            }
            coreSystemsRef.loggingSystem.debug("MarketUI_CreateUnlockSection", `UnlockKey: ${unlockKey}, Initial Button Text: '${buttonText}' from name '${unlockDef.name}'`);
            
            const unlockCard = this._createMarketItemCard(
                unlockDef.id, 
                unlockDef.name,
                unlockDef.description,
                () => moduleLogicRef.purchaseUnlock(unlockKey), 
                buttonText, 
                false,
                unlockKey // Pass unlockKey for unlock items
            );
            unlockCard.id = `market-unlock-${unlockDef.id}`; 
            this._updateUnlockItemCard(unlockCard, unlockKey, unlockDef); 
            unlocksGrid.appendChild(unlockCard);
        }
        
        section.appendChild(unlocksGrid);
        return section;
    },
    
    _createMarketItemCard(domIdBase, nameText, descriptionText, purchaseCallback, initialButtonText, isScalable, itemKey) {
        const { coreUIManager, loggingSystem } = coreSystemsRef;
        const card = document.createElement('div');
        card.className = 'bg-surface-dark p-5 rounded-lg shadow-lg flex flex-col justify-between';

        const contentDiv = document.createElement('div');
        const name = document.createElement('h4');
        name.className = 'text-lg font-semibold text-textPrimary mb-2';
        name.textContent = nameText;
        contentDiv.appendChild(name);

        const description = document.createElement('p');
        description.className = 'text-textSecondary text-sm mb-3';
        description.textContent = descriptionText;
        contentDiv.appendChild(description);

        const costDisplay = document.createElement('p');
        costDisplay.id = `market-${domIdBase}-cost`; 
        costDisplay.className = 'text-sm text-yellow-400 mb-4'; 
        contentDiv.appendChild(costDisplay);
        
        card.appendChild(contentDiv);

        const button = coreUIManager.createButton(
            initialButtonText, 
            async () => { // Made async to potentially await purchaseCallback if it becomes async
                const success = purchaseCallback(); 
                // The `purchaseScalableItem` and `purchaseUnlock` in logic already handle notifications.
                // We need to ensure the UI card itself updates.
                if (isScalable) {
                    // itemKey here is the itemId like 'buyImages'
                    const currentItemDef = staticModuleData.marketItems[itemKey];
                    if (currentItemDef) this._updateScalableItemCard(card, currentItemDef);
                    else loggingSystem.error("MarketUI_Callback", `Scalable itemDef not found for key: ${itemKey}`);
                } else {
                    // itemKey here is the unlockKey like 'settingsTab'
                    const currentUnlockDef = staticModuleData.marketUnlocks[itemKey];
                     if (currentUnlockDef) this._updateUnlockItemCard(card, itemKey, currentUnlockDef);
                     else loggingSystem.error("MarketUI_Callback", `Unlock itemDef not found for key: ${itemKey}`);
                }
            },
            ['w-full', 'mt-auto'], 
            `market-${domIdBase}-button` 
        );
        card.appendChild(button);
        return card;
    },

    _updateScalableItemCard(cardElement, itemDef) {
        if (!cardElement || !itemDef) return;
        const { decimalUtility, coreResourceManager } = coreSystemsRef;

        const costDisplay = cardElement.querySelector(`#market-${itemDef.id}-cost`);
        const button = cardElement.querySelector(`#market-${itemDef.id}-button`);

        const currentCost = moduleLogicRef.calculateScalableItemCost(itemDef.id); 
        if (costDisplay) {
            costDisplay.textContent = `Cost: ${decimalUtility.format(currentCost, 0)} ${itemDef.costResource}`;
        }
        if (button) {
            const canAfford = coreResourceManager.canAfford(itemDef.costResource, currentCost);
            button.disabled = !canAfford;
            // Text for scalable items is usually static after creation, like "Buy 1 Image"
            // button.textContent = `Buy 1 ${itemDef.name.replace('Acquire ', '')}`; 
             if (canAfford) {
                button.classList.remove('bg-gray-500', 'cursor-not-allowed', 'opacity-50');
                button.classList.add('bg-primary', 'hover:bg-primary-lighter');
            } else {
                button.classList.remove('bg-primary', 'hover:bg-primary-lighter');
                button.classList.add('bg-gray-500', 'cursor-not-allowed', 'opacity-50');
            }
        }
    },

    _updateUnlockItemCard(cardElement, unlockKey, unlockDef) {
        if (!cardElement || !unlockDef) return;
        const { decimalUtility, loggingSystem, coreResourceManager } = coreSystemsRef;

        const costDisplay = cardElement.querySelector(`#market-${unlockDef.id}-cost`);
        const button = cardElement.querySelector(`#market-${unlockDef.id}-button`);

        if (!button || !costDisplay) {
            loggingSystem.warn("MarketUI_UpdateUnlockCard", `Button or costDisplay missing for ${unlockKey}`);
            return;
        }

        const isPurchased = moduleLogicRef.isUnlockPurchased(unlockKey);
        loggingSystem.debug("MarketUI_UpdateUnlockCard", `Updating card for ${unlockKey} ('${unlockDef.name}'). isPurchased: ${isPurchased}`);
        
        if (isPurchased) { 
            costDisplay.textContent = "Already Unlocked via Market!";
            button.textContent = "Unlocked";
            button.disabled = true;
            button.classList.remove('bg-primary', 'hover:bg-primary-lighter', 'bg-gray-500', 'opacity-50');
            button.classList.add('bg-green-600', 'cursor-default', 'text-white');
        } else {
            const costAmount = decimalUtility.new(unlockDef.costAmount);
            costDisplay.textContent = `Cost: ${decimalUtility.format(costAmount, 0)} ${unlockDef.costResource}`;
            
            const canAfford = coreResourceManager.canAfford(unlockDef.costResource, costAmount); // Re-check affordability
            button.disabled = !canAfford;
            button.textContent = getCleanUnlockButtonText(unlockDef.name, loggingSystem); // Use helper
            
             if (canAfford) {
                button.classList.remove('bg-gray-500', 'cursor-not-allowed', 'opacity-50', 'bg-green-600');
                button.classList.add('bg-primary', 'hover:bg-primary-lighter');
            } else {
                button.classList.remove('bg-primary', 'hover:bg-primary-lighter', 'bg-green-600');
                button.classList.add('bg-gray-500', 'cursor-not-allowed', 'opacity-50');
            }
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
