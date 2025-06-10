// modules/market_module/market_ui.js (v3.2 - UI & Crash Fix)

/**
 * @file market_ui.js
 * @description Handles the UI rendering and interactions for the Market module.
 * v3.2: Reverted to original UI structure to fix styling and crash issues.
 * v3.1: Renders new categorized layout based on market_data v3.1.
 */

import { staticModuleData } from './market_data.js';

let coreSystemsRef = null;
let moduleLogicRef = null;
let parentElementCache = null;

// --- FIX: This function was in the original file and helps create clean button text. ---
function getCleanUnlockButtonText(unlockDefName) {
    let text = unlockDefName;
    if (typeof text === 'string') {
        text = text.replace(/^unlock\s+/i, '').replace(/(\s+menu|\s+tab)$/i, '');
    } else {
        text = "Feature";
    }
    return `Unlock ${text}`;
}


export const ui = {
    initialize(coreSystems, stateRef, logicRef) {
        coreSystemsRef = coreSystems;
        moduleLogicRef = logicRef;
        coreSystemsRef.loggingSystem.info("MarketUI", "UI initialized (v3.2).");
        
        document.addEventListener('buyMultiplierChanged', () => {
            if (coreSystemsRef.coreUIManager.isActiveTab('market')) {
                this.updateDynamicElements();
            }
        });
    },

    renderMainContent(parentElement) {
        parentElementCache = parentElement;
        const { coreUIManager, buyMultiplierManager, coreGameStateManager } = coreSystemsRef;
        
        // --- FIX: Reverted to original, more stable layout structure. ---
        parentElement.innerHTML = `
            <div class="market-container p-4">
                <div id="market-header-container" class="flex justify-between items-center mb-4">
                    <h1 class="text-2xl font-bold text-primary">Market</h1>
                    <!-- Buy multiplier controls will be inserted here -->
                </div>
                <div id="market-items-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <!-- Market items will be generated here -->
                </div>
                <div id="market-already-unlocked-container" class="mt-8">
                    <!-- Already unlocked items will be listed here -->
                </div>
            </div>
        `;

        const grid = parentElement.querySelector('#market-items-grid');
        
        // --- FIX: Correctly handle buy multiplier controls placement and potential errors. ---
        const buyMultiplesUnlocked = coreGameStateManager.getGlobalFlag('buyMultiplesUnlocked', false);
        if (buyMultiplesUnlocked && typeof buyMultiplierManager.createControls === 'function') {
            const headerContainer = parentElement.querySelector('#market-header-container');
            const controlsContainer = document.createElement('div');
            controlsContainer.id = 'buy-multiples-market-top';
            headerContainer.appendChild(controlsContainer);
            buyMultiplierManager.createControls(controlsContainer);
        } else if (buyMultiplesUnlocked) {
            coreSystemsRef.loggingSystem.error("MarketUI", "buyMultiplesUnlocked is true, but buyMultiplierManager.createControls is not a function.");
        }

        const addItemsToGrid = (items) => {
            Object.entries(items).forEach(([itemId, itemDef]) => {
                if (!itemDef.unlockCondition || itemDef.unlockCondition(coreSystemsRef)) {
                    if (moduleLogicRef.isUnlockVisible(itemId)) {
                        const card = (itemDef.costGrowthFactor)
                            ? this._createScalableItemCard(itemId, itemDef)
                            : this._createUnlockItemCard(itemId, itemDef);
                        if (card) grid.appendChild(card);
                    }
                }
            });
        };

        // Add items in order from the new data structure
        addItemsToGrid(staticModuleData.consumables);
        addItemsToGrid(staticModuleData.skillPoints);
        addItemsToGrid(staticModuleData.featureUnlocks);
        
        const automatorTabUnlocked = coreGameStateManager.getGlobalFlag('automatorTabUnlocked', false);
        if (automatorTabUnlocked) {
             Object.entries(staticModuleData.marketAutomations).forEach(([autoId, autoDef]) => {
                const card = this._createAutomationCard(autoId, autoDef);
                if(card) grid.appendChild(card);
             });
        }
        
        this._renderAlreadyUnlocked();
        this.updateDynamicElements();
    },

    _renderAlreadyUnlocked() {
        if (!parentElementCache) return;
        const unlockedContainer = parentElementCache.querySelector('#market-already-unlocked-container');
        unlockedContainer.innerHTML = ''; 

        const unlockedItems = Object.entries(staticModuleData.featureUnlocks).filter(([unlockId, unlockDef]) => 
            moduleLogicRef.isUnlockPurchased(unlockId)
        );
        
        if (unlockedItems.length > 0) {
            unlockedContainer.innerHTML = `<h2 class="text-xl font-bold text-primary mb-4 border-t border-surface-dark pt-4">Already Unlocked</h2>`;
            const list = document.createElement('div');
            list.className = 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4';
            unlockedItems.forEach(([unlockId, unlockDef]) => {
                const itemEl = document.createElement('div');
                itemEl.className = 'card-unlocked';
                itemEl.innerHTML = `<span class="unlocked-icon">&#10004;</span> <span>${unlockDef.name}</span>`;
                list.appendChild(itemEl);
            });
            unlockedContainer.appendChild(list);
        }
    },
    
    _createScalableItemCard(itemId, itemDef) {
        const { coreUIManager, coreResourceManager } = coreSystemsRef;
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
                <span>Owned: <span id="market-owned-${itemDef.benefitResource}" class="font-bold">0</span></span>
            </div>
            <div class="card-footer">
                <div id="market-cost-${itemId}" class="item-cost">
                    Cost: <span class="font-bold">...</span> ${costResource.name}
                </div>
                <button id="market-buy-${itemId}" class="game-button bg-primary">Buy</button>
            </div>
        `;

        card.querySelector(`#market-buy-${itemId}`).addEventListener('click', () => {
            if(moduleLogicRef.purchaseScalableItem(itemId)) {
               this.updateDynamicElements();
            }
        });
        
        if(itemDef.tooltip) {
             card.querySelector('.tooltip-trigger').addEventListener('mouseenter', (e) => coreUIManager.showTooltip(e.target.dataset.tooltipContent, e.target));
             card.querySelector('.tooltip-trigger').addEventListener('mouseleave', () => coreUIManager.hideTooltip());
        }

        return card;
    },
    
    _createUnlockItemCard(unlockId, unlockDef) {
        const { coreResourceManager, decimalUtility } = coreSystemsRef;
        const card = document.createElement('div');
        card.id = `market-unlock-${unlockId}`;
        card.className = 'card-standard';

        const costResource = coreResourceManager.getResource(unlockDef.costResource);
        const buttonText = getCleanUnlockButtonText(unlockDef.name);

        card.innerHTML = `
             <div class="card-header">
                <h3 class="card-title">${unlockDef.name}</h3>
                <p class="card-description">${unlockDef.description}</p>
            </div>
            <div class="card-footer">
                <div class="item-cost">
                    Cost: <span class="font-bold">${decimalUtility.format(unlockDef.costAmount, 0)}</span> ${costResource.name}
                </div>
                <button id="market-buy-${unlockId}" class="game-button bg-primary">${buttonText}</button>
            </div>
        `;
        card.querySelector(`#market-buy-${unlockId}`).addEventListener('click', () => {
            if (moduleLogicRef.purchaseUnlock(unlockId)) {
                card.remove(); // Remove the card from view after purchase
                this._renderAlreadyUnlocked(); // Refresh the unlocked list
            }
        });
        return card;
    },

    _createAutomationCard(automatorId, automatorDef) {
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
        if (!cardElement) return;
        const { decimalUtility, coreResourceManager, buyMultiplierManager } = coreSystemsRef;
        const itemId = itemDef.id;
        
        const ownedCount = decimalUtility.new(moduleLogicRef.moduleState.purchaseCounts[itemDef.benefitResource] || "0");
        cardElement.querySelector(`#market-owned-${itemDef.benefitResource}`).textContent = decimalUtility.format(ownedCount, 0);

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
        if (!cardElement) return;
        const canAfford = moduleLogicRef.canAffordUnlock(unlockId);
        cardElement.querySelector('button').disabled = !canAfford;
    },

    _updateAutomationCard(cardElement, automatorId, automatorDef) {
        if (!cardElement) return;
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
            Object.keys(staticModuleData.marketAutomations).forEach(automatorId => {
                const card = parentElementCache.querySelector(`#market-automator-${automatorId}`);
                if (card) this._updateAutomationCard(card, automatorId, staticModuleData.marketAutomations[automatorId]);
            });
        }
        
        Object.keys(staticModuleData.marketItems).forEach(itemId => {
            const card = parentElementCache.querySelector(`#market-item-${itemId}`);
            if (card) this._updateScalableItemCard(card, staticModuleData.marketItems[itemId]);
        });
        
        Object.keys(staticModuleData.marketUnlocks).forEach(unlockId => {
            if(moduleLogicRef.isUnlockVisible(unlockId)) {
                const card = parentElementCache.querySelector(`#market-unlock-${unlockId}`);
                if (card) this._updateUnlockItemCard(card, unlockId, staticModuleData.marketUnlocks[unlockId]);
            }
        });
    },

    onShow() {
        if (parentElementCache) this.renderMainContent(parentElementCache); 
    },

    onHide() {
        parentElementCache = null;
    },
};
