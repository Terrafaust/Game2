// modules/market_module/market_ui.js (v3.0 - UI Restructure)

/**
 * @file market_ui.js
 * @description Handles the UI rendering and interactions for the Market module.
 * v3.0: Complete UI overhaul based on roadmap phase 3.
 * v2.1: Restored Consumables and Unlocks sections that were accidentally removed.
 * v2.0: Adds UI for the Image Automator.
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

        const titleContainer = document.createElement('div');
        titleContainer.className = 'flex justify-between items-center';
        
        const title = document.createElement('h2');
        title.className = 'text-2xl font-semibold text-primary';
        title.textContent = 'Trade & Unlocks Market';
        titleContainer.appendChild(title);
        
        const studiesUI = coreSystemsRef.moduleLoader.getModule('studies')?.ui;
        if (studiesUI && typeof studiesUI._createBuyMultiplierControls === 'function') {
            const buyMultiplesUnlocked = coreSystemsRef.coreGameStateManager.getGlobalFlag('buyMultiplesUnlocked');
            if (buyMultiplesUnlocked) {
                 titleContainer.appendChild(studiesUI._createBuyMultiplierControls());
            }
        }
        container.appendChild(titleContainer);

        // --- ROADMAP 3.1: Create new UI structure ---
        container.appendChild(this._createSection('Consumables', staticModuleData.consumables, this._createScalableItemCard.bind(this)));
        container.appendChild(this._createSection('Skill Points', staticModuleData.skillPoints, this._createScalableItemCard.bind(this)));
        container.appendChild(this._createSection('Feature Unlocks', staticModuleData.featureUnlocks, this._createUnlockItemCard.bind(this), 'unlocks-grid'));
        container.appendChild(this._createAlreadyUnlockedSection());
        // --- END ROADMAP 3.1 ---

        parentElement.appendChild(container);
        this.updateDynamicElements();
    },

    _createSection(title, items, cardCreator, gridId = null) {
        const section = document.createElement('section');
        section.className = 'space-y-6';
        section.innerHTML = `<h3 class="text-xl font-medium text-secondary border-b border-gray-700 pb-2 mb-4">${title}</h3>`;
        const itemsGrid = document.createElement('div');
        itemsGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
        if (gridId) itemsGrid.id = gridId;
        
        for (const itemId in items) {
            if (moduleLogicRef.isUnlockVisible(itemId)) {
                itemsGrid.appendChild(cardCreator(itemId, items[itemId]));
            }
        }
        section.appendChild(itemsGrid);
        return section;
    },
    
    _createAlreadyUnlockedSection() {
        const section = document.createElement('section');
        section.className = 'space-y-6';
        section.innerHTML = `<h3 class="text-xl font-medium text-secondary border-b border-gray-700 pb-2 mb-4">Already Unlocked</h3>`;
        const itemsGrid = document.createElement('div');
        itemsGrid.id = 'already-unlocked-grid';
        itemsGrid.className = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4';
        section.appendChild(itemsGrid);
        return section;
    },

    _createScalableItemCard(itemId, itemDef) {
        const { coreUIManager } = coreSystemsRef;
        const card = document.createElement('div');
        card.id = `market-item-${itemId}`;
        card.className = 'bg-surface-dark p-5 rounded-lg shadow-lg flex flex-col justify-between';
        
        let descriptionHTML = `<p class="text-textSecondary text-sm mb-3">${itemDef.description}</p>`;
        // --- ROADMAP 3.2: Add tooltip for prestige unlock message ---
        if (itemId === 'buyImage') {
             descriptionHTML = `<p class="text-textSecondary text-sm mb-3 flex items-center">${itemDef.description} 
                <span id="prestige-info-icon" class="ml-2 cursor-pointer text-blue-400 hover:text-blue-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-info-circle" viewBox="0 0 16 16">
                        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                        <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.055.492.116.559.127l.31.052c.24.043.376.12.433.223.058.104.084.242.084.385s-.027.282-.084.385c-.057.103-.193.18-.433.223l-.31.052c-.067.011-.265.072-.559.127l-.45.083-.082.381 2.29.287zM8 5.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
                    </svg>
                </span>
             </p>`;
        }
        
        card.innerHTML = `<div><h4 class="text-lg font-semibold text-textPrimary mb-2">${itemDef.name}</h4>${descriptionHTML}<p id="${card.id}-cost" class="text-sm text-yellow-400 mb-4"></p></div>`;
        const button = coreUIManager.createButton('', () => {
                moduleLogicRef.purchaseScalableItem(itemId);
                this.updateDynamicElements();
            }, ['w-full', 'mt-auto'], `${card.id}-button`);
        card.appendChild(button);

        if (itemId === 'buyImage') {
            const infoIcon = card.querySelector('#prestige-info-icon');
            if(infoIcon) {
                infoIcon.addEventListener('mouseenter', (e) => coreUIManager.showTooltip('Get 1000 images to unlock Prestige', e.currentTarget));
                infoIcon.addEventListener('mouseleave', () => coreUIManager.hideTooltip());
            }
        }
        return card;
    },

    _createUnlockItemCard(unlockId, unlockDef) {
        const { coreUIManager } = coreSystemsRef;
        const card = document.createElement('div');
        card.id = `market-unlock-${unlockId}`;
        card.className = 'bg-surface-dark p-5 rounded-lg shadow-lg flex flex-col justify-between';
        card.innerHTML = `<div><h4 class="text-lg font-semibold text-textPrimary mb-2">${unlockDef.name}</h4><p class="text-textSecondary text-sm mb-3">${unlockDef.description}</p><p id="${card.id}-cost" class="text-sm text-yellow-400 mb-4"></p></div>`;
        const button = coreUIManager.createButton(getCleanUnlockButtonText(unlockDef.name), () => {
                moduleLogicRef.purchaseUnlock(unlockId);
                this.updateDynamicElements();
            }, ['w-full', 'mt-auto'], `${card.id}-button`);
        card.appendChild(button);
        return card;
    },

    _updateScalableItemCard(cardElement, itemId, itemDef) {
        if (!cardElement || !itemDef) return;
        const { decimalUtility, coreResourceManager, buyMultiplierManager } = coreSystemsRef;
        
        const costDisplay = cardElement.querySelector(`#market-item-${itemId}-cost`);
        const button = cardElement.querySelector(`#market-item-${itemId}-button`);

        let quantity = buyMultiplierManager.getMultiplier();
        let quantityToBuy = (quantity === -1) ? moduleLogicRef.calculateMaxBuyable(itemId) : decimalUtility.new(quantity);
        
        const currentCost = moduleLogicRef.calculateScalableItemCost(itemId, quantityToBuy);
        
        const quantityToDisplay = (quantity === -1) ? quantityToBuy : decimalUtility.new(quantity);

        if (decimalUtility.gt(quantityToDisplay, 0)) {
            costDisplay.textContent = `Cost for ${decimalUtility.format(quantityToDisplay,0)}: ${decimalUtility.format(currentCost, 0)} ${itemDef.costResource}`;
            button.textContent = `${itemDef.name} (${decimalUtility.format(quantityToDisplay,0)})`;
        } else {
            const singleCost = moduleLogicRef.calculateScalableItemCost(itemId, 1);
            costDisplay.textContent = `Cost: ${decimalUtility.format(singleCost, 0)} ${itemDef.costResource}`;
            button.textContent = itemDef.name;
        }

        const canAfford = coreResourceManager.canAfford(itemDef.costResource, currentCost);
        button.disabled = !canAfford || decimalUtility.eq(quantityToBuy, 0);
    },

    _updateUnlockItemCard(unlockId, unlockDef, unlocksGrid, unlockedGrid) {
        const { decimalUtility, coreResourceManager } = coreSystemsRef;
        const isPurchased = moduleLogicRef.isUnlockPurchased(unlockId);
        const cardElement = parentElementCache.querySelector(`#market-unlock-${unlockId}`);

        if (isPurchased) {
            if (cardElement) cardElement.remove();
            
            let unlockedEntry = unlockedGrid.querySelector(`#unlocked-${unlockId}`);
            if (!unlockedEntry) {
                unlockedEntry = document.createElement('div');
                unlockedEntry.id = `unlocked-${unlockId}`;
                unlockedEntry.className = 'p-2 bg-surface rounded text-center text-textSecondary text-sm';
                unlockedEntry.textContent = unlockDef.name.replace('Unlock ', '');
                unlockedGrid.appendChild(unlockedEntry);
            }
        } else {
            if (!cardElement) return; // Should already be in the grid if not purchased
            const costDisplay = cardElement.querySelector(`#market-unlock-${unlockId}-cost`);
            const button = cardElement.querySelector(`#market-unlock-${unlockId}-button`);
            const costAmount = decimalUtility.new(unlockDef.costAmount);
            costDisplay.textContent = `Cost: ${decimalUtility.format(costAmount, 0)} ${unlockDef.costResource}`;
            button.textContent = getCleanUnlockButtonText(unlockDef.name);
            button.disabled = !coreResourceManager.canAfford(unlockDef.costResource, costAmount);
        }
    },
    
    updateDynamicElements() {
        if (!parentElementCache || !moduleLogicRef || !coreSystemsRef) return;
        
        const allScalableItems = {...staticModuleData.consumables, ...staticModuleData.skillPoints};
        for (const itemId in allScalableItems) { 
            const itemDef = allScalableItems[itemId];
            const cardElement = parentElementCache.querySelector(`#market-item-${itemId}`);
            if (cardElement && moduleLogicRef.isUnlockVisible(itemId)) {
                this._updateScalableItemCard(cardElement, itemId, itemDef);
            }
        }

        const unlocksGrid = parentElementCache.querySelector('#unlocks-grid');
        const unlockedGrid = parentElementCache.querySelector('#already-unlocked-grid');
        if (unlocksGrid && unlockedGrid) {
            unlockedGrid.innerHTML = ''; // Clear and rebuild
            for (const unlockId in staticModuleData.featureUnlocks) { 
                const unlockDef = staticModuleData.featureUnlocks[unlockId];
                 if (moduleLogicRef.isUnlockVisible(unlockId)) {
                    this._updateUnlockItemCard(unlockId, unlockDef, unlocksGrid, unlockedGrid);
                }
            }
        }
    },

    onShow() {
        if (parentElementCache) this.renderMainContent(parentElementCache); 
    },

    onHide() {
        coreSystemsRef.coreUIManager.hideTooltip();
    }
};
