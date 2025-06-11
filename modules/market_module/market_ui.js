// modules/market_module/market_ui.js (v3.1 - Restored Consumables Section)

/**
 * @file market_ui.js
 * @description Handles the UI rendering and interactions for the Market module.
 * v3.1: Restored the Consumables section for purchasing Images.
 * v3.0: Complete UI overhaul for the new roadmap structure.
 */

import { staticModuleData } from './market_data.js';

let coreSystemsRef = null;
let moduleLogicRef = null;
let parentElementCache = null;

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

        container.innerHTML = `<h2 class="text-2xl font-semibold text-primary mb-2">Market</h2>`;
        
        // Append the new and restored sections
        container.appendChild(this._createFeatureUnlocksSection());
        container.appendChild(this._createConsumablesSection()); // Restored
        container.appendChild(this._createSkillPointsSection());
        container.appendChild(this._createAlreadyUnlockedSection());

        parentElement.appendChild(container);
        this.updateDynamicElements();
    },
    
    _createFeatureUnlocksSection() {
        const section = document.createElement('section');
        section.id = 'market-feature-unlocks-section';
        section.className = 'space-y-4';
        
        section.innerHTML = `<h3 class="text-xl font-medium text-secondary border-b border-gray-700 pb-2 mb-4">Feature Unlocks</h3>`;

        const itemsGrid = document.createElement('div');
        itemsGrid.id = 'market-feature-unlocks-grid';
        itemsGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
        
        for (const unlockId in staticModuleData.featureUnlocks) {
            const unlockDef = staticModuleData.featureUnlocks[unlockId];
            if (unlockDef.isFuture) continue;
            itemsGrid.appendChild(this._createCard(
                unlockId, 
                unlockDef,
                () => moduleLogicRef.purchaseUnlock(unlockId)
            ));
        }
        section.appendChild(itemsGrid);
        return section;
    },

    // NEW: Function to create the Consumables section
    _createConsumablesSection() {
        const section = document.createElement('section');
        section.id = 'market-consumables-section';
        section.className = 'space-y-4';
        
        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'flex justify-between items-center border-b border-gray-700 pb-2 mb-4';
        sectionHeader.innerHTML = `<h3 class="text-xl font-medium text-secondary">Consumables</h3>`;

        if (coreSystemsRef.buyMultiplierUI) {
            const multiplierControls = coreSystemsRef.buyMultiplierUI.createBuyMultiplierControls();
            multiplierControls.classList.remove('my-4');
            sectionHeader.appendChild(multiplierControls);
        }
        section.appendChild(sectionHeader);

        const itemsGrid = document.createElement('div');
        itemsGrid.id = 'market-consumables-grid';
        itemsGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';

        for (const itemId in staticModuleData.consumables) {
            const itemDef = staticModuleData.consumables[itemId];
            itemsGrid.appendChild(this._createCard(
                itemId, 
                itemDef,
                () => moduleLogicRef.purchaseScalableItem(itemId)
            ));
        }
        section.appendChild(itemsGrid);
        return section;
    },

    _createSkillPointsSection() {
        const section = document.createElement('section');
        section.id = 'market-skill-points-section';
        section.className = 'space-y-4';
        
        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'flex justify-between items-center border-b border-gray-700 pb-2 mb-4';
        sectionHeader.innerHTML = `<h3 class="text-xl font-medium text-secondary">Skill Points</h3>`;

        if (coreSystemsRef.buyMultiplierUI) {
            const multiplierControls = coreSystemsRef.buyMultiplierUI.createBuyMultiplierControls();
            multiplierControls.classList.remove('my-4');
            sectionHeader.appendChild(multiplierControls);
        }
        section.appendChild(sectionHeader);

        const itemsGrid = document.createElement('div');
        itemsGrid.id = 'market-skill-points-grid';
        itemsGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';

        for (const itemId in staticModuleData.skillPoints) {
            const itemDef = staticModuleData.skillPoints[itemId];
            itemsGrid.appendChild(this._createCard(
                itemId, 
                itemDef,
                () => moduleLogicRef.purchaseScalableItem(itemId)
            ));
        }
        section.appendChild(itemsGrid);
        return section;
    },

    _createAlreadyUnlockedSection() {
        const section = document.createElement('section');
        section.id = 'market-already-unlocked-section';
        section.className = 'space-y-4';
        section.style.display = 'none';

        section.innerHTML = `<h3 class="text-xl font-medium text-secondary border-b border-gray-700 pb-2 mb-4">Already Unlocked</h3>`;
        
        const unlockedGrid = document.createElement('div');
        unlockedGrid.id = 'market-already-unlocked-grid';
        unlockedGrid.className = 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-4';
        section.appendChild(unlockedGrid);
        
        return section;
    },

    _createCard(id, def, purchaseCallback) {
        const { coreUIManager } = coreSystemsRef;
        const card = document.createElement('div');
        card.id = `market-card-${id}`;
        card.className = 'bg-surface-dark p-5 rounded-lg shadow-lg flex flex-col justify-between transition-opacity duration-300';
        
        card.innerHTML = `
            <div>
                <h4 class="text-lg font-semibold text-textPrimary mb-2">${def.name}</h4>
                <p class="text-textSecondary text-sm mb-3 h-12">${def.description}</p>
                <p id="market-card-cost-${id}" class="text-sm text-yellow-400 mb-4 h-5"></p>
            </div>
        `;
        
        const button = coreUIManager.createButton(
            'Purchase', 
            () => {
                purchaseCallback();
                this.updateDynamicElements();
            }, 
            ['w-full', 'mt-auto'], 
            `market-card-button-${id}`
        );
        card.appendChild(button);

        return card;
    },

    updateDynamicElements() {
        if (!parentElementCache || !moduleLogicRef || !coreSystemsRef) return;
        
        // Update all categories of cards
        this._updateCardSet(staticModuleData.featureUnlocks, this._updateFeatureUnlockCard);
        this._updateCardSet(staticModuleData.consumables, this._updateScalableItemCard);
        this._updateCardSet(staticModuleData.skillPoints, this._updateScalableItemCard);
        
        this._updateAlreadyUnlockedGrid();
    },

    // Generic helper to update a set of cards
    _updateCardSet(dataSet, updateFunction) {
        for (const id in dataSet) {
            updateFunction.call(this, id);
        }
    },

    _updateFeatureUnlockCard(unlockId) {
        const unlockDef = staticModuleData.featureUnlocks[unlockId];
        if (unlockDef.isFuture) return;

        const cardElement = parentElementCache.querySelector(`#market-card-${unlockId}`);
        if (!cardElement) return;

        const isVisible = moduleLogicRef.isUnlockVisible(unlockId);
        cardElement.style.display = isVisible ? 'flex' : 'none';

        if (isVisible) {
            const { decimalUtility, coreResourceManager } = coreSystemsRef;
            const costDisplay = cardElement.querySelector(`#market-card-cost-${unlockId}`);
            const button = cardElement.querySelector(`#market-card-button-${unlockId}`);
            
            const costAmount = decimalUtility.new(unlockDef.costAmount);
            costDisplay.textContent = `Cost: ${decimalUtility.format(costAmount, 0)} ${coreResourceManager.getResource(unlockDef.costResource).name}`;
            button.textContent = `Unlock`;
            button.disabled = !moduleLogicRef.canAffordUnlock(unlockId);
        }
    },
    
    _updateScalableItemCard(itemId) {
        const itemDef = staticModuleData.consumables[itemId] || staticModuleData.skillPoints[itemId];
        const cardElement = parentElementCache.querySelector(`#market-card-${itemId}`);
        if (!cardElement) return;

        const isVisible = moduleLogicRef.isItemVisible(itemId);
        cardElement.style.display = isVisible ? 'flex' : 'none';

        if (isVisible) {
            const { decimalUtility, buyMultiplierManager, coreResourceManager } = coreSystemsRef;
            const costDisplay = cardElement.querySelector(`#market-card-cost-${itemId}`);
            const button = cardElement.querySelector(`#market-card-button-${itemId}`);

            const multiplier = buyMultiplierManager.getMultiplier();
            const quantityToBuy = (multiplier === -1) ? moduleLogicRef.calculateMaxBuyable(itemId) : decimalUtility.new(multiplier);
            const totalCost = moduleLogicRef.calculateScalableItemCost(itemId, quantityToBuy);

            const nameBase = itemDef.name.replace('Acquire ', '');
            button.textContent = `Acquire ${decimalUtility.format(quantityToBuy, 0)} ${nameBase}${decimalUtility.gt(quantityToBuy, 1) ? 's' : ''}`;
            costDisplay.textContent = `Cost: ${decimalUtility.format(totalCost, 2)} ${coreResourceManager.getResource(itemDef.costResource).name}`;
            button.disabled = !coreResourceManager.canAfford(itemDef.costResource, totalCost) || decimalUtility.lte(quantityToBuy, 0);
        }
    },

    _updateAlreadyUnlockedGrid() {
        const unlockedGrid = parentElementCache.querySelector('#market-already-unlocked-grid');
        const unlockedSection = parentElementCache.querySelector('#market-already-unlocked-section');
        if (!unlockedGrid || !unlockedSection) return;

        unlockedGrid.innerHTML = '';
        let unlockedCount = 0;

        for (const unlockId in staticModuleData.featureUnlocks) {
            if (moduleLogicRef.isUnlockPurchased(unlockId)) {
                unlockedCount++;
                const unlockDef = staticModuleData.featureUnlocks[unlockId];
                const item = document.createElement('div');
                item.className = 'text-textSecondary flex items-center';
                item.innerHTML = `<span class="text-green-400 mr-2">✓</span> ${unlockDef.name}`;
                unlockedGrid.appendChild(item);
            }
        }

        unlockedSection.style.display = unlockedCount > 0 ? 'block' : 'none';
    },

    onShow() {
        if (parentElementCache) {
            this.renderMainContent(parentElementCache); 
        }
    },

    onHide() {
        // Cleanup if needed when tab is hidden
    }
};
