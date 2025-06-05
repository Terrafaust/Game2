// modules/market_module/market_ui.js (v1.3 - Button Text Fix)

/**
 * @file market_ui.js
 * @description Handles the UI rendering and interactions for the Market module.
 * v1.3: Improved button text for unlocks.
 * v1.2: Corrects the ID passed to purchaseUnlock logic.
 */

import { staticModuleData } from './market_data.js';

let coreSystemsRef = null;
let moduleLogicRef = null;
let parentElementCache = null;

export const ui = {
    initialize(coreSystems, stateRef, logicRef) {
        coreSystemsRef = coreSystems;
        moduleLogicRef = logicRef;
        coreSystemsRef.loggingSystem.info("MarketUI", "UI initialized (v1.3).");
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
            let buttonText = `Buy 1 ${itemDef.name.replace('Acquire ', '')}`; // Cleaner button text

            const itemCard = this._createMarketItemCard(
                itemDef.id, 
                itemDef.name,
                itemDef.description,
                () => moduleLogicRef.purchaseScalableItem(itemId), 
                buttonText,
                true 
            );
            itemCard.id = `market-item-${itemDef.id}`; 
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
            // Cleaner button text for unlocks
            let buttonText = `Unlock ${unlockDef.name.replace('Unlock ', '').replace(' Menu', '')}`;
            
            const unlockCard = this._createMarketItemCard(
                unlockDef.id, 
                unlockDef.name,
                unlockDef.description,
                () => moduleLogicRef.purchaseUnlock(unlockKey), 
                buttonText, 
                false 
            );
            unlockCard.id = `market-unlock-${unlockDef.id}`; 
            unlocksGrid.appendChild(unlockCard);
        }
        
        section.appendChild(unlocksGrid);
        return section;
    },

    _createMarketItemCard(domIdBase, nameText, descriptionText, purchaseCallback, initialButtonText, isScalable) {
        const { coreUIManager } = coreSystemsRef;
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
            () => {
                purchaseCallback(); 
                this.updateDynamicElements(); 
            },
            ['w-full', 'mt-auto'], 
            `market-${domIdBase}-button` 
        );
        card.appendChild(button);
        return card;
    },

    updateDynamicElements() {
        if (!parentElementCache || !moduleLogicRef || !coreSystemsRef) return;
        const { decimalUtility, coreResourceManager } = coreSystemsRef;

        for (const itemId in staticModuleData.marketItems) { 
            const itemDef = staticModuleData.marketItems[itemId];
            const card = parentElementCache.querySelector(`#market-item-${itemDef.id}`); 
            if (!card) continue;

            const costDisplay = card.querySelector(`#market-${itemDef.id}-cost`);
            const button = card.querySelector(`#market-${itemDef.id}-button`);

            const currentCost = moduleLogicRef.calculateScalableItemCost(itemId); 
            if (costDisplay) {
                costDisplay.textContent = `Cost: ${decimalUtility.format(currentCost, 0)} ${itemDef.costResource}`;
            }
            if (button) {
                const canAfford = coreResourceManager.canAfford(itemDef.costResource, currentCost);
                button.disabled = !canAfford;
                // Update button text if it was generic initially or if needed
                button.textContent = `Buy 1 ${itemDef.name.replace('Acquire ', '')}`;
                 if (canAfford) {
                    button.classList.remove('bg-gray-500', 'cursor-not-allowed', 'opacity-50');
                    button.classList.add('bg-primary', 'hover:bg-primary-lighter');
                } else {
                    button.classList.remove('bg-primary', 'hover:bg-primary-lighter');
                    button.classList.add('bg-gray-500', 'cursor-not-allowed', 'opacity-50');
                }
            }
        }

        for (const unlockKey in staticModuleData.marketUnlocks) { 
            const unlockDef = staticModuleData.marketUnlocks[unlockKey];
            const card = parentElementCache.querySelector(`#market-unlock-${unlockDef.id}`); 
            if (!card) continue;

            const costDisplay = card.querySelector(`#market-${unlockDef.id}-cost`);
            const button = card.querySelector(`#market-${unlockDef.id}-button`);

            if (moduleLogicRef.isUnlockPurchased(unlockKey)) { 
                if (costDisplay) costDisplay.textContent = "Already Unlocked via Market!";
                if (button) {
                    button.textContent = "Unlocked";
                    button.disabled = true;
                    button.classList.remove('bg-primary', 'hover:bg-primary-lighter', 'bg-gray-500', 'opacity-50');
                    button.classList.add('bg-green-600', 'cursor-default', 'text-white');
                }
            } else {
                const costAmount = decimalUtility.new(unlockDef.costAmount);
                 if (costDisplay) { 
                    costDisplay.textContent = `Cost: ${decimalUtility.format(costAmount, 0)} ${unlockDef.costResource}`;
                }
                if (button) {
                    const canAfford = moduleLogicRef.canAffordUnlock(unlockKey); 
                    button.disabled = !canAfford;
                    // Use the cleaner button text
                    button.textContent = `Unlock ${unlockDef.name.replace('Unlock ', '').replace(' Menu', '')}`;
                     if (canAfford) {
                        button.classList.remove('bg-gray-500', 'cursor-not-allowed', 'opacity-50', 'bg-green-600');
                        button.classList.add('bg-primary', 'hover:bg-primary-lighter');
                    } else {
                        button.classList.remove('bg-primary', 'hover:bg-primary-lighter', 'bg-green-600');
                        button.classList.add('bg-gray-500', 'cursor-not-allowed', 'opacity-50');
                    }
                }
            }
        }
    },

    onShow() {
        coreSystemsRef.loggingSystem.debug("MarketUI", "Market tab shown.");
        if (parentElementCache) { 
            this.updateDynamicElements();
        }
    },

    onHide() {
        coreSystemsRef.loggingSystem.debug("MarketUI", "Market tab hidden.");
    }
};
