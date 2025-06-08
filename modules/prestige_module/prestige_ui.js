// /game/modules/prestige_module/prestige_ui.js (v2.0 - Added Buy Multiplier)
import * as logic from './prestige_logic.js';
import { prestigeData } from './prestige_data.js';

let coreSystemsRef = null;
let parentElementCache = null;

export const ui = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        // FEATURE: Listen for changes in the buy multiplier to update the UI
        document.addEventListener('buyMultiplierChanged', () => {
            if (coreSystemsRef && coreSystemsRef.coreUIManager.isActiveTab('prestige')) {
                this.updateDynamicElements();
            }
        });
        coreSystemsRef.loggingSystem.info("PrestigeUI", "UI initialized.");
    },

    renderMainContent(parentElement) {
        parentElementCache = parentElement;
        parentElement.innerHTML = '';

        const container = document.createElement('div');
        container.className = 'p-4 space-y-6';
        
        // --- MODIFICATION: Added Tip ---
        const tipBox = document.createElement('div');
        tipBox.className = 'mb-6 p-3 bg-surface rounded-lg border border-red-500/50 text-center';
        const tipText = document.createElement('p');
        tipText.className = 'text-sm text-red-300 italic';
        tipText.textContent = '"The end already ?"';
        tipBox.appendChild(tipText);
        container.appendChild(tipBox);
        // --- END MODIFICATION ---

        const header = document.createElement('div');
        header.className = 'flex justify-between items-center bg-surface-dark p-4 rounded-lg';
        
        const statsContainer = document.createElement('div');
        statsContainer.className = 'text-lg space-y-1';

        const ppDisplay = document.createElement('div');
        ppDisplay.id = 'pp-display';
        ppDisplay.className = 'text-yellow-300 font-semibold';
        statsContainer.appendChild(ppDisplay);

        const prestigeCountDisplay = document.createElement('div');
        prestigeCountDisplay.id = 'prestige-count-display';
        prestigeCountDisplay.className = 'text-sm text-gray-400';
        statsContainer.appendChild(prestigeCountDisplay);
        
        header.appendChild(statsContainer);

        const prestigeButtonContainer = document.createElement('div');
        const prestigeButton = coreSystemsRef.coreUIManager.createButton('', () => logic.performPrestige(), ['font-bold', 'py-2', 'px-4']);
        prestigeButton.id = 'prestige-button';
        prestigeButtonContainer.appendChild(prestigeButton);
        header.appendChild(prestigeButtonContainer);
        
        container.appendChild(header);

        // --- FEATURE: Add Buy Multiplier Controls ---
        const multiplierContainer = document.createElement('div');
        multiplierContainer.className = 'flex justify-center items-center p-2 bg-surface-dark rounded-lg mt-4';
        this._createBuyMultiplierControls(multiplierContainer);
        container.appendChild(multiplierContainer);
        // --- END FEATURE ---

        const producersTitle = document.createElement('h3');
        producersTitle.className = 'text-xl font-semibold text-primary mt-6';
        producersTitle.textContent = 'Prestige Upgrades';
        container.appendChild(producersTitle);

        const producersGrid = document.createElement('div');
        producersGrid.id = 'prestige-producers-grid';
        producersGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
        
        for (const producerId in prestigeData.producers) {
            const producerDef = prestigeData.producers[producerId];
            producersGrid.appendChild(this._createProducerCard(producerDef));
        }

        container.appendChild(producersGrid);
        parentElement.appendChild(container);
        
        this.updateDynamicElements();
    },

    // --- FEATURE: Function to create multiplier buttons ---
    _createBuyMultiplierControls(container) {
        const { coreUIManager, buyMultiplierManager } = coreSystemsRef;
        const multipliers = [
            { label: 'x1', value: 1 },
            { label: 'x10', value: 10 },
            { label: 'x100', value: 100 },
            { label: 'Max', value: -1 }
        ];

        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'flex space-x-2';
        buttonGroup.id = 'prestige-buy-multiplier-controls';

        multipliers.forEach(m => {
            const button = coreUIManager.createButton(
                m.label,
                () => buyMultiplierManager.setMultiplier(m.value),
                ['px-4', 'py-1.5', 'text-sm', 'transition-colors', 'duration-200']
            );
            button.dataset.value = m.value;
            buttonGroup.appendChild(button);
        });

        container.appendChild(buttonGroup);
    },

    _createProducerCard(producerDef) {
        const { coreUIManager } = coreSystemsRef;
        const card = document.createElement('div');
        card.id = `prestige-card-${producerDef.id}`;
        card.className = 'bg-surface p-4 rounded-lg shadow-md flex flex-col';

        const name = document.createElement('h4');
        name.className = 'text-md font-semibold text-textPrimary mb-1';
        name.textContent = producerDef.name;
        card.appendChild(name);

        const description = document.createElement('p');
        description.className = 'text-textSecondary text-xs mb-2 flex-grow';
        description.textContent = producerDef.description;
        card.appendChild(description);

        const ownedDisplay = document.createElement('p');
        ownedDisplay.id = `prestige-owned-${producerDef.id}`;
        ownedDisplay.className = 'text-sm text-blue-400 mb-2';
        card.appendChild(ownedDisplay);

        const costDisplay = document.createElement('p');
        costDisplay.id = `prestige-cost-${producerDef.id}`;
        costDisplay.className = 'text-xs text-yellow-400 mb-3';
        card.appendChild(costDisplay);
        
        const purchaseButton = coreUIManager.createButton(
            'Buy', 
            () => logic.purchasePrestigeProducer(producerDef.id), 
            ['w-full', 'text-sm', 'py-1.5', 'mt-auto'], 
            `prestige-purchase-${producerDef.id}`
        );
        card.appendChild(purchaseButton);

        return card;
    },

    updateDynamicElements() {
        if (!parentElementCache) return;
        const { decimalUtility, coreResourceManager, buyMultiplierManager } = coreSystemsRef;

        const ppDisplay = parentElementCache.querySelector('#pp-display');
        if (ppDisplay) {
            const pp = coreResourceManager.getAmount('prestigePoints');
            ppDisplay.textContent = `Prestige Points: ${decimalUtility.format(pp, 2, 0)}`;
        }
        
        const prestigeCountDisplay = parentElementCache.querySelector('#prestige-count-display');
        if(prestigeCountDisplay) {
            const count = logic.getTotalPrestigeCount();
            prestigeCountDisplay.textContent = `Times Prestiged: ${decimalUtility.format(count, 0)}`;
        }

        const prestigeButton = parentElementCache.querySelector('#prestige-button');
        if (prestigeButton) {
            const gain = logic.calculatePrestigeGain();
            const canPrestige = logic.canPrestige();
            prestigeButton.disabled = !canPrestige || decimalUtility.eq(gain, 0);
            if (canPrestige) {
                prestigeButton.textContent = `Prestige for ${decimalUtility.format(gain, 2, 0)} PP`;
            } else {
                prestigeButton.textContent = 'Prestige Unlocked at 1k Images';
            }
        }
        
        // --- FEATURE: Update multiplier buttons active state ---
        const currentMultiplier = buyMultiplierManager.getMultiplier();
        const multiplierButtons = parentElementCache.querySelectorAll('#prestige-buy-multiplier-controls button');
        multiplierButtons.forEach(btn => {
            if (parseInt(btn.dataset.value, 10) === currentMultiplier) {
                btn.classList.add('bg-primary-dark', 'text-white');
                btn.classList.remove('bg-surface-light', 'text-textSecondary');
            } else {
                btn.classList.remove('bg-primary-dark', 'text-white');
                btn.classList.add('bg-surface-light', 'text-textSecondary');
            }
        });

        // --- FEATURE: Update producer cards with multiplier logic ---
        for (const producerId in prestigeData.producers) {
            const card = parentElementCache.querySelector(`#prestige-card-${producerId}`);
            if (card) {
                const owned = logic.getOwnedPrestigeProducerCount(producerId);
                card.querySelector(`#prestige-owned-${producerId}`).textContent = `Owned: ${decimalUtility.format(owned, 0)}`;

                let quantityToBuy;
                if (currentMultiplier === -1) {
                    quantityToBuy = logic.calculateMaxBuyablePrestigeProducer(producerId);
                } else {
                    quantityToBuy = decimalUtility.new(currentMultiplier);
                }

                const cost = logic.calculatePrestigeProducerCost(producerId, quantityToBuy);
                
                card.querySelector(`#prestige-cost-${producerId}`).textContent = `Cost: ${decimalUtility.format(cost, 2, 0)} PP`;
                
                const button = card.querySelector(`#prestige-purchase-${producerId}`);
                button.disabled = !coreResourceManager.canAfford('prestigePoints', cost) || quantityToBuy.lte(0);

                let buttonText = "Buy";
                if(quantityToBuy.gt(0)) {
                    buttonText += ` ${decimalUtility.format(quantityToBuy, 0)}`;
                }
                button.textContent = buttonText;
            }
        }
    },
    
    onShow() {
        if(parentElementCache) this.updateDynamicElements();
    }
};
