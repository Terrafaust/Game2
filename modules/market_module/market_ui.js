// modules/market_module/market_ui.js (v3.0 - UI Overhaul)

/**
 * @file market_ui.js
 * @description Handles the UI rendering and interactions for the Market module.
 * v3.0: Complete UI overhaul to support new categorized layout.
 * v2.4: Placed multiplier controls on the same line as the section title.
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
        parentElementCache = parentElement;
        const { coreUIManager, buyMultiplierManager, coreGameStateManager, decimalUtility } = coreSystemsRef;
        
        parentElement.innerHTML = `
            <div class="market-container space-y-8">
                <!-- Sections will be injected here -->
            </div>
        `;
        const container = parentElement.querySelector('.market-container');

        // --- RENDER SECTIONS ---
        this._renderSection(container, 'Consumables', staticModuleData.consumables, this._createScalableItemCard, 'consumable');
        this._renderSection(container, 'Skill Points', staticModuleData.skillPoints, this._createScalableItemCard, 'skillpoint');
        this._renderSection(container, 'Feature Unlocks', staticModuleData.featureUnlocks, this._createUnlockItemCard, 'feature');
        this._renderSection(container, 'Already Unlocked', staticModuleData.featureUnlocks, this._createAlreadyUnlockedCard, 'unlocked-feature', 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4');
        
        // --- RENDER AUTOMATOR (if unlocked) ---
        const automatorTabUnlocked = coreGameStateManager.getGlobalFlag('automatorTabUnlocked', false);
        if (automatorTabUnlocked) {
             this._renderSection(container, 'Automators', staticModuleData.marketAutomations, this._createAutomationCard, 'automator');
        }

        buyMultiplierManager.createControls(container, 'buy-multiples-market-top');
        const buyMultiplesUnlocked = coreGameStateManager.getGlobalFlag('buyMultiplesUnlocked', false);
        buyMultiplierManager.toggleControlsVisibility(buyMultiplesUnlocked, 'buy-multiples-market-top');

        this.updateDynamicElements();
    },
    
    _renderSection(container, title, items, cardCreator, type, sectionClasses = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4') {
        const { coreUIManager } = coreSystemsRef;
        const sectionWrapper = document.createElement('div');
        sectionWrapper.className = 'market-section';

        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'flex justify-between items-center mb-4';
        sectionHeader.innerHTML = `<h2 class="text-2xl font-bold text-primary">${title}</h2>`;
        sectionWrapper.appendChild(sectionHeader);

        const gridContainer = document.createElement('div');
        gridContainer.id = `market-${type}-grid`;
        gridContainer.className = sectionClasses;
        
        let hasVisibleItems = false;
        Object.entries(items).forEach(([itemId, itemDef]) => {
            let card = null;
            if (type === 'unlocked-feature') {
                if (moduleLogicRef.isUnlockPurchased(itemId)) {
                    card = cardCreator.call(this, itemId, itemDef);
                }
            } else if (type === 'feature') {
                 if (moduleLogicRef.isUnlockVisible(itemId)) {
                    card = cardCreator.call(this, itemId, itemDef);
                 }
            } else {
                 card = cardCreator.call(this, itemId, itemDef);
            }

            if (card) {
                gridContainer.appendChild(card);
                hasVisibleItems = true;
            }
        });
        
        if (hasVisibleItems) {
            sectionWrapper.appendChild(gridContainer);
            container.appendChild(sectionWrapper);
        }
    },
    
    _createScalableItemCard(itemId, itemDef) {
        const { coreUIManager, coreResourceManager, decimalUtility } = coreSystemsRef;
        const card = document.createElement('div');
        card.id = `market-item-${itemId}`;
        card.className = 'card-standard';
        
        let tooltipHtml = '';
        if (itemDef.tooltip) {
            tooltipHtml = `<span class="tooltip-trigger" data-tooltip-content="${itemDef.tooltip}">&#9432;</span>`;
        }

        const costResource = coreResourceManager.getResource(itemDef.costResource);

        card.innerHTML = `
            <div class="card-header">
                <h3 class="card-title">${itemDef.name} ${tooltipHtml}</h3>
                <p class="card-description">${itemDef.description}</p>
            </div>
            <div class="card-content-row">
                <span>Owned: <span id="market-owned-${itemId}" class="font-bold">0</span></span>
            </div>
            <div class="card-footer">
                <div id="market-cost-${itemId}" class="item-cost">
                    Cost: <span class="font-bold">...</span> ${costResource.name}
                </div>
                <button id="market-buy-${itemId}" class="game-button bg-primary">Buy</button>
            </div>
        `;

        card.querySelector(`#market-buy-${itemId}`).addEventListener('click', () => {
            moduleLogicRef.purchaseScalableItem(itemId);
            this.updateDynamicElements();
        });
        
        if(itemDef.tooltip) {
             card.querySelector('.tooltip-trigger').addEventListener('mouseenter', (e) => coreUIManager.showTooltip(e.target.dataset.tooltipContent, e.target));
             card.querySelector('.tooltip-trigger').addEventListener('mouseleave', () => coreUIManager.hideTooltip());
        }

        return card;
    },
    
    _createUnlockItemCard(unlockId, unlockDef) {
        const { coreUIManager, coreResourceManager, decimalUtility } = coreSystemsRef;
        const card = document.createElement('div');
        card.id = `market-unlock-${unlockId}`;
        card.className = 'card-standard';

        const costResource = coreResourceManager.getResource(unlockDef.costResource);

        card.innerHTML = `
             <div class="card-header">
                <h3 class="card-title">${unlockDef.name}</h3>
                <p class="card-description">${unlockDef.description}</p>
            </div>
            <div class="card-footer">
                <div class="item-cost">
                    Cost: <span class="font-bold">${decimalUtility.format(unlockDef.costAmount, 0)}</span> ${costResource.name}
                </div>
                <button id="market-buy-${unlockId}" class="game-button bg-primary">Unlock</button>
            </div>
        `;
        card.querySelector(`#market-buy-${unlockId}`).addEventListener('click', () => {
            moduleLogicRef.purchaseUnlock(unlockId);
        });
        return card;
    },

    _createAlreadyUnlockedCard(unlockId, unlockDef) {
        const card = document.createElement('div');
        card.className = 'card-unlocked';
        card.innerHTML = `<span class="unlocked-icon">&#10004;</span> <span>${unlockDef.name}</span>`;
        return card;
    },

    _createAutomationCard(automatorId, automatorDef) {
        // This function remains largely the same, just for creation
        const card = document.createElement('div');
        card.id = `market-automator-${automatorId}`;
        card.className = 'card-standard';
        card.innerHTML = `
            <div class="card-header">
                <h3 class="card-title">${automatorDef.name}</h3>
                <p class="card-description">${automatorDef.description}</p>
            </div>
            <div class="card-content-row">
                 <span>Level: <span id="automator-level-${automatorId}" class="font-bold">0</span></span>
                 <span id="automator-effect-${automatorId}"></span>
            </div>
            <div class="card-footer">
                <div id="automator-cost-${automatorId}" class="item-cost">Cost: ...</div>
                <button id="automator-buy-${automatorId}" class="game-button bg-secondary">Upgrade</button>
            </div>
        `;
        card.querySelector(`#automator-buy-${automatorId}`).addEventListener('click', () => {
            if (moduleLogicRef.purchaseAutomatorUpgrade(automatorId)) {
                this._updateAutomationCard(card, automatorId, automatorDef);
            }
        });
        return card;
    },

    _updateScalableItemCard(cardElement, itemDef) {
        const { decimalUtility, coreResourceManager, buyMultiplierManager } = coreSystemsRef;
        const itemId = itemDef.id;
        
        const ownedCount = decimalUtility.new(moduleLogicRef.moduleState.purchaseCounts[itemDef.benefitResource] || "0");
        cardElement.querySelector(`#market-owned-${itemId}`).textContent = decimalUtility.format(ownedCount, 0);

        const buyAmount = buyMultiplierManager.getMultiplier();
        const cost = moduleLogicRef.calculateScalableItemCost(itemId, buyAmount);
        
        const costDisplay = cardElement.querySelector(`#market-cost-${itemId} span`);
        const buyButton = cardElement.querySelector(`#market-buy-${itemId}`);

        if (cost.isFinite()) {
            costDisplay.textContent = decimalUtility.format(cost, 2);
            const canAfford = coreResourceManager.canAfford(itemDef.costResource, cost);
            buyButton.disabled = !canAfford;
        } else {
            costDisplay.textContent = "---";
            buyButton.disabled = true;
        }
    },

    _updateUnlockItemCard(cardElement, unlockId, unlockDef) {
        const canAfford = moduleLogicRef.canAffordUnlock(unlockId);
        cardElement.querySelector('button').disabled = !canAfford;
    },

    _updateAutomationCard(cardElement, automatorId, automatorDef) {
        const { decimalUtility, coreResourceManager } = coreSystemsRef;
        const automatorInfo = moduleLogicRef.getAutomatorInfo(automatorId);
        if (!automatorInfo) return;

        cardElement.querySelector(`#automator-level-${automatorId}`).textContent = automatorInfo.currentLevel;
        const effectDisplay = cardElement.querySelector(`#automator-effect-${automatorId}`);
        const costDisplay = cardElement.querySelector(`#automator-cost-${automatorId}`);
        const button = cardElement.querySelector(`#automator-buy-${automatorId}`);
        const costResource = coreResourceManager.getResource(automatorDef.costResource);

        if (automatorInfo.currentLevel > 0) {
            const currentLevelDef = automatorDef.levels[automatorInfo.currentLevel - 1];
            effectDisplay.textContent = `+${decimalUtility.format(currentLevelDef.rate, 0)}/s`;
        } else {
            effectDisplay.textContent = 'Inactive';
        }

        if (automatorInfo.nextLevelInfo) {
            const cost = decimalUtility.new(automatorInfo.nextLevelInfo.cost);
            costDisplay.innerHTML = `Cost: <span class="font-bold">${decimalUtility.format(cost, 0)}</span> ${costResource.name}`;
            button.disabled = !coreResourceManager.canAfford(automatorDef.costResource, cost);
            costDisplay.style.display = 'block';
            button.textContent = "Upgrade";
            button.disabled = false;
        } else {
            costDisplay.style.display = 'none';
            button.textContent = "Max Level";
            button.disabled = true;
        }
    },

    updateDynamicElements() {
        if (!parentElementCache || !moduleLogicRef || !coreSystemsRef) return;
        
        const automatorTabUnlocked = coreSystemsRef.coreGameStateManager.getGlobalFlag('automatorTabUnlocked', false);
        if (automatorTabUnlocked) {
            for (const automatorId in staticModuleData.marketAutomations) {
                const automatorDef = staticModuleData.marketAutomations[automatorId];
                const cardElement = parentElementCache.querySelector(`#market-automator-${automatorId}`);
                if (cardElement) this._updateAutomationCard(cardElement, automatorId, automatorDef);
            }
        }
        
        const allScalableItems = { ...staticModuleData.consumables, ...staticModuleData.skillPoints };
        for (const itemId in allScalableItems) { 
            const itemDef = allScalableItems[itemId];
            const cardElement = parentElementCache.querySelector(`#market-item-${itemDef.id}`); 
            if (cardElement) this._updateScalableItemCard(cardElement, itemDef);
        }

        for (const unlockKey in staticModuleData.featureUnlocks) { 
            if(moduleLogicRef.isUnlockVisible(unlockKey)) {
                const unlockDef = staticModuleData.featureUnlocks[unlockKey];
                const cardElement = parentElementCache.querySelector(`#market-unlock-${unlockDef.id}`); 
                if (cardElement) this._updateUnlockItemCard(cardElement, unlockKey, unlockDef);
            }
        }
    },

    onShow() {
        if (parentElementCache) this.renderMainContent(parentElementCache); 
    },

    onHide() {
        parentElementCache = null;
    },
};
