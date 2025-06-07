// modules/market_module/market_ui.js (v2.0 - Added Automator UI)

/**
 * @file market_ui.js
 * @description Handles the UI rendering and interactions for the Market module.
 * v2.0: Adds UI for the Image Automator.
 */

import { staticModuleData } from './market_data.js';

let coreSystemsRef = null;
let moduleLogicRef = null;
let parentElementCache = null;

function getCleanUnlockButtonText(unlockDefName, loggingSystem) {
    let text = unlockDefName;
    if (typeof text === 'string') {
        text = text.replace(/^unlock\s+/i, '').replace(/\s+menu$/i, '');
    } else { text = "Feature"; }
    return `Unlock ${text}`;
}

export const ui = {
    initialize(coreSystems, stateRef, logicRef) {
        coreSystemsRef = coreSystems;
        moduleLogicRef = logicRef;
        coreSystemsRef.loggingSystem.info("MarketUI", "UI initialized (v2.0).");
        
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

        const studiesUI = coreSystemsRef.moduleLoader.getModule('studies')?.ui;
        if (studiesUI && typeof studiesUI._createBuyMultiplierControls === 'function') {
            container.appendChild(studiesUI._createBuyMultiplierControls());
        } else {
            coreSystemsRef.loggingSystem.warn("MarketUI", "Could not find _createBuyMultiplierControls from Studies UI. Multiplier controls will be missing.");
        }
        
        // --- FEATURE: Added Automator section ---
        container.appendChild(this._createAutomationsSection());
        // --- END FEATURE ---
        container.appendChild(this._createScalableItemsSection());
        container.appendChild(this._createUnlocksSection());

        parentElement.appendChild(container);
        this.updateDynamicElements();
    },

    _createScalableItemsSection() { /* ... unchanged ... */ return document.createElement('div'); },
    _createUnlocksSection() { /* ... unchanged ... */ return document.createElement('div'); },
    _createMarketItemCard(domIdBase, nameText, descriptionText, purchaseCallback, initialButtonText, isScalable, itemKey) { /* ... unchanged ... */ return document.createElement('div'); },
    _updateScalableItemCard(cardElement, itemDef) { /* ... unchanged ... */ },
    _updateUnlockItemCard(cardElement, unlockKey, unlockDef) { /* ... unchanged ... */ },

    // --- FEATURE: Functions to create and update automation UI ---
    _createAutomationsSection() {
        const section = document.createElement('section');
        section.className = 'space-y-6';
        section.innerHTML = `<h3 class="text-xl font-medium text-accentOne border-b border-gray-700 pb-2 mb-4">Automations</h3>`;
        
        const itemsGrid = document.createElement('div');
        itemsGrid.className = 'grid grid-cols-1 md:grid-cols-2 gap-6';

        for (const automatorId in staticModuleData.marketAutomations) {
            const automatorDef = staticModuleData.marketAutomations[automatorId];
            itemsGrid.appendChild(this._createAutomationCard(automatorDef));
        }

        section.appendChild(itemsGrid);
        return section;
    },

    _createAutomationCard(automatorDef) {
        const card = document.createElement('div');
        card.id = `market-automator-${automatorDef.id}`;
        card.className = 'bg-surface-dark p-5 rounded-lg shadow-lg flex flex-col justify-between';
        
        const content = `
            <div>
                <h4 class="text-lg font-semibold text-accentOne mb-2">${automatorDef.name}</h4>
                <p class="text-textSecondary text-sm mb-3" id="${card.id}-description">${automatorDef.description}</p>
                <p id="${card.id}-level" class="text-sm text-blue-400 mb-2"></p>
                <p id="${card.id}-effect" class="text-sm text-green-400 mb-2"></p>
                <p id="${card.id}-cost" class="text-sm text-yellow-400 mb-4"></p>
            </div>
        `;
        card.innerHTML = content;

        const button = coreSystemsRef.coreUIManager.createButton(
            'Upgrade', 
            () => {
                moduleLogicRef.purchaseAutomatorUpgrade(automatorDef.id);
                this.updateDynamicElements(); // Re-render to reflect new state
            }, 
            ['w-full', 'mt-auto', 'bg-accentOne', 'hover:bg-accentOne-dark'], 
            `${card.id}-button`
        );
        card.appendChild(button);
        return card;
    },

    _updateAutomationCard(cardElement, automatorId, automatorDef) {
        if (!cardElement || !automatorDef) return;
        const { decimalUtility, coreResourceManager } = coreSystemsRef;
        const info = moduleLogicRef.getAutomatorInfo(automatorId);

        const levelDisplay = cardElement.querySelector(`#market-automator-${automatorId}-level`);
        const effectDisplay = cardElement.querySelector(`#market-automator-${automatorId}-effect`);
        const costDisplay = cardElement.querySelector(`#market-automator-${automatorId}-cost`);
        const descDisplay = cardElement.querySelector(`#market-automator-${automatorId}-description`);
        const button = cardElement.querySelector(`#market-automator-${automatorId}-button`);

        levelDisplay.textContent = `Current Level: ${info.currentLevel} / ${info.maxLevel}`;

        if (info.currentLevel > 0) {
            const currentEffect = automatorDef.levels[info.currentLevel - 1];
            effectDisplay.textContent = `Effect: ${decimalUtility.format(currentEffect.rate, 0)} Images/sec`;
            effectDisplay.style.display = 'block';
        } else {
            effectDisplay.style.display = 'none';
        }

        if (info.nextLevelInfo) {
            const cost = decimalUtility.new(info.nextLevelInfo.cost);
            const costResource = coreResourceManager.getResource(automatorDef.costResource);
            costDisplay.textContent = `Upgrade Cost: ${decimalUtility.format(cost, 2)} ${costResource.name}`;
            descDisplay.textContent = info.nextLevelInfo.description;
            button.textContent = `Upgrade to Level ${info.nextLevelInfo.level}`;
            button.disabled = !coreResourceManager.canAfford(automatorDef.costResource, cost);
            button.style.display = 'block';
            costDisplay.style.display = 'block';

        } else {
            descDisplay.textContent = "This automator is fully upgraded.";
            costDisplay.style.display = 'none';
            button.textContent = "Max Level";
            button.disabled = true;
        }
    },
    // --- END FEATURE ---

    updateDynamicElements() {
        if (!parentElementCache || !moduleLogicRef || !coreSystemsRef) return;
        
        // Update automators
        for (const automatorId in staticModuleData.marketAutomations) {
            const automatorDef = staticModuleData.marketAutomations[automatorId];
            const cardElement = parentElementCache.querySelector(`#market-automator-${automatorId}`);
            if (cardElement) this._updateAutomationCard(cardElement, automatorId, automatorDef);
        }

        // Update scalable items
        for (const itemId in staticModuleData.marketItems) { 
            const itemDef = staticModuleData.marketItems[itemId];
            const cardElement = parentElementCache.querySelector(`#market-item-${itemDef.id}`); 
            if (cardElement) this._updateScalableItemCard(cardElement, itemDef);
        }

        // Update unlocks
        for (const unlockKey in staticModuleData.marketUnlocks) { 
            const unlockDef = staticModuleData.marketUnlocks[unlockKey];
            const cardElement = parentElementCache.querySelector(`#market-unlock-${unlockDef.id}`); 
            if (cardElement) this._updateUnlockItemCard(cardElement, unlockKey, unlockDef);
        }
    },

    onShow() { if (parentElementCache) this.renderMainContent(parentElementCache); },
    onHide() { coreSystemsRef.coreUIManager.hideTooltip(); }
};
