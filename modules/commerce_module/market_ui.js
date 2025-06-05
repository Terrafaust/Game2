// modules/market_module/market_ui.js (v1)

/**
 * @file market_ui.js
 * @description Handles the UI rendering and interactions for the Market module.
 */

import { staticModuleData } from './market_data.js';
// moduleState is not directly used by UI here but passed for consistency if needed later.
// moduleLogicRef is used for actions and getting dynamic data.

let coreSystemsRef = null;
let moduleLogicRef = null;
let parentElementCache = null;

export const ui = {
    /**
     * Initializes the UI component.
     * @param {object} coreSystems - References to core game systems.
     * @param {object} stateRef - Reference to the module's reactive state (unused directly here).
     * @param {object} logicRef - Reference to the module's logic component.
     */
    initialize(coreSystems, stateRef, logicRef) {
        coreSystemsRef = coreSystems;
        moduleLogicRef = logicRef;
        coreSystemsRef.loggingSystem.info("MarketUI", "UI initialized (v1).");
    },

    /**
     * Renders the main content for the Market module.
     * @param {HTMLElement} parentElement - The DOM element to render content into.
     */
    renderMainContent(parentElement) {
        if (!coreSystemsRef || !moduleLogicRef) {
            parentElement.innerHTML = '<p class="text-red-500">Market UI not properly initialized.</p>';
            return;
        }
        parentElementCache = parentElement;
        parentElement.innerHTML = ''; // Clear previous content

        const container = document.createElement('div');
        container.className = 'p-4 space-y-8'; // Tailwind classes

        const title = document.createElement('h2');
        title.className = 'text-2xl font-semibold text-primary mb-6';
        title.textContent = 'Trade & Unlocks Market';
        container.appendChild(title);

        // Section for purchasing scalable items (Images, Study Skill Points)
        container.appendChild(this._createScalableItemsSection());

        // Section for unlocking features (Settings, Achievements)
        container.appendChild(this._createUnlocksSection());

        parentElement.appendChild(container);
        this.updateDynamicElements(); // Initial update for all dynamic elements
    },

    /**
     * Creates the section for purchasing scalable items.
     * @returns {HTMLElement}
     * @private
     */
    _createScalableItemsSection() {
        const { coreUIManager } = coreSystemsRef;
        const section = document.createElement('section');
        section.className = 'space-y-6';

        const itemsTitle = document.createElement('h3');
        itemsTitle.className = 'text-xl font-medium text-secondary border-b border-gray-700 pb-2 mb-4';
        itemsTitle.textContent = 'Consumables';
        section.appendChild(itemsTitle);
        
        const itemsGrid = document.createElement('div');
        itemsGrid.className = 'grid grid-cols-1 md:grid-cols-2 gap-6';

        // Buy Images
        const buyImagesDef = staticModuleData.marketItems.buyImages;
        const imagesCard = this._createMarketItemCard(
            buyImagesDef.id,
            buyImagesDef.name,
            buyImagesDef.description,
            () => moduleLogicRef.purchaseScalableItem(buyImagesDef.id),
            'Buy 1 Image' // Initial button text
        );
        imagesCard.id = `market-item-${buyImagesDef.id}`;
        itemsGrid.appendChild(imagesCard);

        // Buy Study Skill Points
        const buySSPDef = staticModuleData.marketItems.buyStudySkillPoints;
        const sspCard = this._createMarketItemCard(
            buySSPDef.id,
            buySSPDef.name,
            buySSPDef.description,
            () => moduleLogicRef.purchaseScalableItem(buySSPDef.id),
            'Buy 1 SPP' // Initial button text (Study Point Point? Let's use SSP)
        );
        sspCard.id = `market-item-${buySSPDef.id}`;
        itemsGrid.appendChild(sspCard);
        
        section.appendChild(itemsGrid);
        return section;
    },

    /**
     * Creates the section for feature unlocks.
     * @returns {HTMLElement}
     * @private
     */
    _createUnlocksSection() {
        const section = document.createElement('section');
        section.className = 'space-y-6';

        const unlocksTitle = document.createElement('h3');
        unlocksTitle.className = 'text-xl font-medium text-secondary border-b border-gray-700 pb-2 mb-4';
        unlocksTitle.textContent = 'Feature Unlocks';
        section.appendChild(unlocksTitle);
        
        const unlocksGrid = document.createElement('div');
        unlocksGrid.className = 'grid grid-cols-1 md:grid-cols-2 gap-6';

        // Unlock Settings Tab
        const settingsUnlockDef = staticModuleData.marketUnlocks.settingsTab;
        const settingsCard = this._createMarketItemCard(
            settingsUnlockDef.id,
            settingsUnlockDef.name,
            settingsUnlockDef.description,
            () => moduleLogicRef.purchaseUnlock(settingsUnlockDef.id),
            'Unlock Settings'
        );
        settingsCard.id = `market-unlock-${settingsUnlockDef.id}`;
        unlocksGrid.appendChild(settingsCard);

        // Unlock Achievements Tab
        const achievementsUnlockDef = staticModuleData.marketUnlocks.achievementsTab;
        const achievementsCard = this._createMarketItemCard(
            achievementsUnlockDef.id,
            achievementsUnlockDef.name,
            achievementsUnlockDef.description,
            () => moduleLogicRef.purchaseUnlock(achievementsUnlockDef.id),
            'Unlock Achievements'
        );
        achievementsCard.id = `market-unlock-${achievementsUnlockDef.id}`;
        unlocksGrid.appendChild(achievementsCard);
        
        section.appendChild(unlocksGrid);
        return section;
    },

    /**
     * Helper to create a generic card for a market item or unlock.
     * @param {string} id - Base ID for elements within the card.
     * @param {string} nameText - Title of the card.
     * @param {string} descriptionText - Description.
     * @param {function} purchaseCallback - Function to call on button click.
     * @param {string} initialButtonText - Text for the purchase button.
     * @returns {HTMLElement}
     * @private
     */
    _createMarketItemCard(id, nameText, descriptionText, purchaseCallback, initialButtonText) {
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
        costDisplay.id = `market-${id}-cost`;
        costDisplay.className = 'text-sm text-yellow-400 mb-4'; // Cost display
        contentDiv.appendChild(costDisplay);
        
        card.appendChild(contentDiv);

        const button = coreUIManager.createButton(
            initialButtonText,
            () => {
                purchaseCallback();
                this.updateDynamicElements(); // Re-render after action
            },
            ['w-full', 'mt-auto'], // Ensure button is at the bottom and full width
            `market-${id}-button`
        );
        card.appendChild(button);
        return card;
    },

    /**
     * Updates dynamic parts of the Market UI (costs, button states).
     */
    updateDynamicElements() {
        if (!parentElementCache || !moduleLogicRef || !coreSystemsRef) return;
        const { decimalUtility, coreResourceManager, coreUIManager } = coreSystemsRef;

        // Update Scalable Items
        for (const itemId in staticModuleData.marketItems) {
            const itemDef = staticModuleData.marketItems[itemId];
            const card = parentElementCache.querySelector(`#market-item-${itemDef.id}`);
            if (!card) continue;

            const costDisplay = card.querySelector(`#market-${itemId}-cost`);
            const button = card.querySelector(`#market-${itemId}-button`);

            const currentCost = moduleLogicRef.calculateScalableItemCost(itemId);
            if (costDisplay) {
                costDisplay.textContent = `Cost: ${decimalUtility.format(currentCost, 0)} ${itemDef.costResource}`;
            }
            if (button) {
                const canAfford = coreResourceManager.canAfford(itemDef.costResource, currentCost);
                button.disabled = !canAfford;
                button.textContent = `Buy 1 ${itemDef.benefitResource === 'images' ? 'Image' : 'Study Skill Pt'}`;
                 if (canAfford) {
                    button.classList.remove('bg-gray-500', 'cursor-not-allowed', 'opacity-50');
                    button.classList.add('bg-primary', 'hover:bg-primary-lighter');
                } else {
                    button.classList.remove('bg-primary', 'hover:bg-primary-lighter');
                    button.classList.add('bg-gray-500', 'cursor-not-allowed', 'opacity-50');
                }
            }
        }

        // Update Unlocks
        for (const unlockId in staticModuleData.marketUnlocks) {
            const unlockDef = staticModuleData.marketUnlocks[unlockId];
            const card = parentElementCache.querySelector(`#market-unlock-${unlockDef.id}`);
            if (!card) continue;

            const costDisplay = card.querySelector(`#market-${unlockId}-cost`);
            const button = card.querySelector(`#market-${unlockId}-button`);

            if (moduleLogicRef.isUnlockPurchased(unlockId)) {
                if (costDisplay) costDisplay.textContent = "Unlocked!";
                if (button) {
                    button.textContent = "Unlocked";
                    button.disabled = true;
                    button.classList.remove('bg-primary', 'hover:bg-primary-lighter');
                    button.classList.add('bg-green-600', 'cursor-default');
                }
            } else {
                const costAmount = decimalUtility.new(unlockDef.costAmount);
                 if (costDisplay) {
                    costDisplay.textContent = `Cost: ${decimalUtility.format(costAmount, 0)} ${unlockDef.costResource}`;
                }
                if (button) {
                    const canAfford = moduleLogicRef.canAffordUnlock(unlockId);
                    button.disabled = !canAfford;
                    button.textContent = `Unlock ${unlockDef.name}`;
                     if (canAfford) {
                        button.classList.remove('bg-gray-500', 'cursor-not-allowed', 'opacity-50');
                        button.classList.add('bg-primary', 'hover:bg-primary-lighter');
                    } else {
                        button.classList.remove('bg-primary', 'hover:bg-primary-lighter');
                        button.classList.add('bg-gray-500', 'cursor-not-allowed', 'opacity-50');
                    }
                }
            }
        }
    },

    /**
     * Called when the module's tab is shown.
     */
    onShow() {
        coreSystemsRef.loggingSystem.debug("MarketUI", "Market tab shown.");
        if (parentElementCache) { // If already rendered once, just update
            this.updateDynamicElements();
        }
        // If not rendered, renderMainContent will be called by UIManager which then calls updateDynamicElements
    },

    /**
     * Called when the module's tab is hidden.
     */
    onHide() {
        coreSystemsRef.loggingSystem.debug("MarketUI", "Market tab hidden.");
    }
};
