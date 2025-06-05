// modules/market_module/market_ui.js (v1.1 - Unlock Cost Fix)

/**
 * @file market_ui.js
 * @description Handles the UI rendering and interactions for the Market module.
 * v1.1: Fixes display of cost and button state for fixed-cost unlocks.
 */

import { staticModuleData } from './market_data.js';

let coreSystemsRef = null;
let moduleLogicRef = null;
let parentElementCache = null;

export const ui = {
    initialize(coreSystems, stateRef, logicRef) {
        coreSystemsRef = coreSystems;
        moduleLogicRef = logicRef;
        coreSystemsRef.loggingSystem.info("MarketUI", "UI initialized (v1.1).");
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

        const buyImagesDef = staticModuleData.marketItems.buyImages;
        const imagesCard = this._createMarketItemCard(
            buyImagesDef.id,
            buyImagesDef.name,
            buyImagesDef.description,
            () => moduleLogicRef.purchaseScalableItem(buyImagesDef.id),
            'Buy 1 Image',
            true // isScalable = true
        );
        imagesCard.id = `market-item-${buyImagesDef.id}`;
        itemsGrid.appendChild(imagesCard);

        const buySSPDef = staticModuleData.marketItems.buyStudySkillPoints;
        const sspCard = this._createMarketItemCard(
            buySSPDef.id,
            buySSPDef.name,
            buySSPDef.description,
            () => moduleLogicRef.purchaseScalableItem(buySSPDef.id),
            'Buy 1 SSP', // Study Skill Point
            true // isScalable = true
        );
        sspCard.id = `market-item-${buySSPDef.id}`;
        itemsGrid.appendChild(sspCard);
        
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

        const settingsUnlockDef = staticModuleData.marketUnlocks.settingsTab;
        const settingsCard = this._createMarketItemCard(
            settingsUnlockDef.id,
            settingsUnlockDef.name,
            settingsUnlockDef.description,
            () => moduleLogicRef.purchaseUnlock(settingsUnlockDef.id),
            'Unlock Settings',
            false // isScalable = false
        );
        settingsCard.id = `market-unlock-${settingsUnlockDef.id}`;
        unlocksGrid.appendChild(settingsCard);

        const achievementsUnlockDef = staticModuleData.marketUnlocks.achievementsTab;
        const achievementsCard = this._createMarketItemCard(
            achievementsUnlockDef.id,
            achievementsUnlockDef.name,
            achievementsUnlockDef.description,
            () => moduleLogicRef.purchaseUnlock(achievementsUnlockDef.id),
            'Unlock Achievements',
            false // isScalable = false
        );
        achievementsCard.id = `market-unlock-${achievementsUnlockDef.id}`;
        unlocksGrid.appendChild(achievementsCard);
        
        section.appendChild(unlocksGrid);
        return section;
    },

    _createMarketItemCard(id, nameText, descriptionText, purchaseCallback, initialButtonText, isScalable) {
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
        costDisplay.id = `market-${id}-cost`; // Unique ID for cost display
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
            `market-${id}-button` // Unique ID for button
        );
        card.appendChild(button);
        return card;
    },

    updateDynamicElements() {
        if (!parentElementCache || !moduleLogicRef || !coreSystemsRef) return;
        const { decimalUtility, coreResourceManager } = coreSystemsRef;

        // Update Scalable Items (Images, Study Skill Points)
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
                // Update button text for clarity (e.g., "Buy 1 Image" or "Buy 1 SSP")
                let benefitName = itemDef.benefitResource === 'images' ? 'Image' : 
                                  itemDef.benefitResource === 'studySkillPoints' ? 'Study Skill Point' : itemDef.benefitResource;
                button.textContent = `Buy 1 ${benefitName}`;
                 if (canAfford) {
                    button.classList.remove('bg-gray-500', 'cursor-not-allowed', 'opacity-50');
                    button.classList.add('bg-primary', 'hover:bg-primary-lighter');
                } else {
                    button.classList.remove('bg-primary', 'hover:bg-primary-lighter');
                    button.classList.add('bg-gray-500', 'cursor-not-allowed', 'opacity-50');
                }
            }
        }

        // Update Feature Unlocks (Settings, Achievements)
        for (const unlockId in staticModuleData.marketUnlocks) {
            const unlockDef = staticModuleData.marketUnlocks[unlockId];
            const card = parentElementCache.querySelector(`#market-unlock-${unlockDef.id}`);
            if (!card) continue;

            const costDisplay = card.querySelector(`#market-${unlockDef.id}-cost`);
            const button = card.querySelector(`#market-${unlockDef.id}-button`);

            if (moduleLogicRef.isUnlockPurchased(unlockId)) {
                if (costDisplay) costDisplay.textContent = "Unlocked!";
                if (button) {
                    button.textContent = "Unlocked";
                    button.disabled = true;
                    button.classList.remove('bg-primary', 'hover:bg-primary-lighter', 'bg-gray-500', 'opacity-50');
                    button.classList.add('bg-green-600', 'cursor-default', 'text-white');
                }
            } else {
                const costAmount = decimalUtility.new(unlockDef.costAmount);
                 if (costDisplay) { // Display the fixed cost
                    costDisplay.textContent = `Cost: ${decimalUtility.format(costAmount, 0)} ${unlockDef.costResource}`;
                }
                if (button) {
                    const canAfford = moduleLogicRef.canAffordUnlock(unlockId);
                    button.disabled = !canAfford;
                    button.textContent = `Unlock ${unlockDef.name.replace(' Menu', '')}`; // Shorter button text
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
