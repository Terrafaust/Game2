// modules/market_module/market_ui.js (v4.0 - Final Refactor)
// Fully integrated with translationManager.

import { staticModuleData } from './market_data.js';
import { MODULES } from '../../core/constants.js';

let coreSystemsRef = null;
let moduleLogicRef = null;
let parentElementCache = null;

export const ui = {
    initialize(coreSystems, stateRef, logicRef) {
        coreSystemsRef = coreSystems;
        moduleLogicRef = logicRef;
        coreSystemsRef.loggingSystem.info("MarketUI", "UI initialized (v4.0).");
        
        document.addEventListener('buyMultiplierChanged', () => {
            if (coreSystemsRef.coreUIManager.isActiveTab(MODULES.MARKET)) this.updateDynamicElements();
        });
        document.addEventListener('languagePackChanged', () => {
            if (coreSystemsRef.coreUIManager.isActiveTab(MODULES.MARKET)) this.renderMainContent(parentElementCache);
        });
    },

    renderMainContent(parentElement) {
        if (!parentElement || !coreSystemsRef || !moduleLogicRef) return;
        parentElementCache = parentElement;
        parentElement.innerHTML = ''; 

        const { translationManager } = coreSystemsRef;
        const container = document.createElement('div');
        container.className = 'p-4 space-y-8'; 

        container.innerHTML = `<h2 class="text-2xl font-semibold text-primary mb-2">${translationManager.get('market.ui.title')}</h2>`;
        
        container.appendChild(this._createFeatureUnlocksSection());
        container.appendChild(this._createConsumablesSection());
        container.appendChild(this._createSkillPointsSection());
        container.appendChild(this._createAlreadyUnlockedSection());

        parentElement.appendChild(container);
        this.updateDynamicElements();
    },
    
    _createSection(id, titleKey, addMultiplierControls = false) {
        const { translationManager } = coreSystemsRef;
        const section = document.createElement('section');
        section.id = `market-${id}-section`;
        section.className = 'space-y-4';
        
        const header = document.createElement('div');
        header.className = 'flex justify-between items-center border-b border-gray-700 pb-2 mb-4';
        header.innerHTML = `<h3 class="text-xl font-medium text-secondary">${translationManager.get(titleKey)}</h3>`;

        if (addMultiplierControls && coreSystemsRef.buyMultiplierUI) {
            const multiplierControls = coreSystemsRef.buyMultiplierUI.createBuyMultiplierControls();
            multiplierControls.classList.remove('my-4');
            header.appendChild(multiplierControls);
        }
        section.appendChild(header);

        const grid = document.createElement('div');
        grid.id = `market-${id}-grid`;
        grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
        section.appendChild(grid);
        
        return section;
    },

    _createFeatureUnlocksSection() {
        const section = this._createSection('feature-unlocks', 'market.ui.feature_unlocks_title');
        const grid = section.querySelector('#market-feature-unlocks-grid');
        for (const unlockId in staticModuleData.featureUnlocks) {
            const unlockDef = staticModuleData.featureUnlocks[unlockId];
            if (unlockDef.isFuture) continue;
            grid.appendChild(this._createCard(unlockId, unlockDef, () => moduleLogicRef.purchaseUnlock(unlockId)));
        }
        return section;
    },

    _createConsumablesSection() {
        const section = this._createSection('consumables', 'market.ui.consumables_title', true);
        const grid = section.querySelector('#market-consumables-grid');
        for (const itemId in staticModuleData.consumables) {
            grid.appendChild(this._createCard(itemId, staticModuleData.consumables[itemId], () => moduleLogicRef.purchaseScalableItem(itemId)));
        }
        return section;
    },

    _createSkillPointsSection() {
        const section = this._createSection('skill-points', 'market.ui.skill_points_title', true);
        const grid = section.querySelector('#market-skill-points-grid');
        for (const itemId in staticModuleData.skillPoints) {
            grid.appendChild(this._createCard(itemId, staticModuleData.skillPoints[itemId], () => moduleLogicRef.purchaseScalableItem(itemId)));
        }
        return section;
    },

    _createAlreadyUnlockedSection() {
        const section = this._createSection('already-unlocked', 'market.ui.already_unlocked_title');
        section.style.display = 'none';
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
        
        const button = coreUIManager.createButton('', () => {
            purchaseCallback();
            this.updateDynamicElements();
        }, ['w-full', 'mt-auto'], `market-card-button-${id}`);
        card.appendChild(button);

        return card;
    },

    updateDynamicElements() {
        if (!parentElementCache) return;
        this._updateCardSet(staticModuleData.featureUnlocks, this._updateFeatureUnlockCard);
        this._updateCardSet(staticModuleData.consumables, this._updateScalableItemCard);
        this._updateCardSet(staticModuleData.skillPoints, this._updateScalableItemCard);
        this._updateAlreadyUnlockedGrid();
    },

    _updateCardSet(dataSet, updateFunction) {
        for (const id in dataSet) {
            if (parentElementCache.querySelector(`#market-card-${id}`)) {
                updateFunction.call(this, id);
            }
        }
    },

    _updateFeatureUnlockCard(unlockId) {
        const unlockDef = staticModuleData.featureUnlocks[unlockId];
        const card = parentElementCache.querySelector(`#market-card-${unlockId}`);
        if (!card || unlockDef.isFuture) return;

        const { decimalUtility, coreResourceManager, translationManager } = coreSystemsRef;
        const isVisible = moduleLogicRef.isUnlockVisible(unlockId);
        card.style.display = isVisible ? 'flex' : 'none';

        if (isVisible) {
            const costDisplay = card.querySelector(`#market-card-cost-${unlockId}`);
            const button = card.querySelector(`#market-card-button-${unlockId}`);
            const cost = decimalUtility.new(unlockDef.costAmount);
            costDisplay.textContent = `${translationManager.get('ui.generic.cost')}: ${decimalUtility.format(cost, 0)} ${coreResourceManager.getResource(unlockDef.costResource).name}`;
            button.textContent = translationManager.get('ui.buttons.unlock');
            button.disabled = !moduleLogicRef.canAffordUnlock(unlockId);
        }
    },
    
    _updateScalableItemCard(itemId) {
        const itemDef = staticModuleData.consumables[itemId] || staticModuleData.skillPoints[itemId];
        const card = parentElementCache.querySelector(`#market-card-${itemId}`);
        if (!card) return;

        const { decimalUtility, buyMultiplierManager, coreResourceManager, translationManager } = coreSystemsRef;
        const isVisible = moduleLogicRef.isItemVisible(itemId);
        card.style.display = isVisible ? 'flex' : 'none';

        if (isVisible) {
            const costDisplay = card.querySelector(`#market-card-cost-${itemId}`);
            const button = card.querySelector(`#market-card-button-${itemId}`);

            const multiplier = buyMultiplierManager.getMultiplier();
            const quantityToBuy = (multiplier === -1) ? moduleLogicRef.calculateMaxBuyable(itemId) : decimalUtility.new(multiplier);
            const totalCost = moduleLogicRef.calculateScalableItemCost(itemId, quantityToBuy);

            const nameBase = itemDef.name.replace('Acquire ', '');
            button.textContent = translationManager.get('market.ui.acquire_X', { quantity: decimalUtility.format(quantityToBuy, 0), name: nameBase + (decimalUtility.gt(quantityToBuy, 1) ? 's' : '')});
            costDisplay.textContent = `${translationManager.get('ui.generic.cost')}: ${decimalUtility.format(totalCost, 2)} ${coreResourceManager.getResource(itemDef.costResource).name}`;
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
                const item = document.createElement('div');
                item.className = 'text-textSecondary flex items-center';
                item.innerHTML = `<span class="text-green-400 mr-2">✓</span> ${staticModuleData.featureUnlocks[unlockId].name}`;
                unlockedGrid.appendChild(item);
            }
        }
        unlockedSection.style.display = unlockedCount > 0 ? 'block' : 'none';
    },

    onShow() {
        if (parentElementCache) this.renderMainContent(parentElementCache);
    },

    onHide() {}
};
