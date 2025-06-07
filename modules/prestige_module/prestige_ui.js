// /game/modules/prestige_module/prestige_ui.js (v1.2 - UI Text and Count Fixes)
import * as logic from './prestige_logic.js';
import { prestigeData } from './prestige_data.js';

let coreSystemsRef = null;
let parentElementCache = null;

export const ui = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("PrestigeUI", "UI initialized.");
    },

    renderMainContent(parentElement) {
        parentElementCache = parentElement;
        parentElement.innerHTML = ''; // Clear previous content

        const container = document.createElement('div');
        container.className = 'p-4 space-y-6';
        
        const header = document.createElement('div');
        header.className = 'flex justify-between items-center bg-surface-dark p-4 rounded-lg';
        
        // --- FIX: Container for PP and Prestige Count ---
        const statsContainer = document.createElement('div');
        statsContainer.className = 'text-lg space-y-1';

        const ppDisplay = document.createElement('div');
        ppDisplay.id = 'pp-display';
        ppDisplay.className = 'text-yellow-300 font-semibold';
        statsContainer.appendChild(ppDisplay);

        // --- FEATURE: Added Prestige Count Display ---
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
        const { decimalUtility, coreResourceManager } = coreSystemsRef;

        // --- FIX: Update PP display and Prestige Count display ---
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
                // --- FIX: Changed AP to PP ---
                prestigeButton.textContent = `Prestige for ${decimalUtility.format(gain, 2, 0)} PP`;
            } else {
                prestigeButton.textContent = 'Prestige Unlocked at 1k Images';
            }
        }
        
        for (const producerId in prestigeData.producers) {
            const card = parentElementCache.querySelector(`#prestige-card-${producerId}`);
            if (card) {
                const owned = logic.getOwnedPrestigeProducerCount(producerId);
                const cost = logic.calculatePrestigeProducerCost(producerId);

                card.querySelector(`#prestige-owned-${producerId}`).textContent = `Owned: ${decimalUtility.format(owned, 0)}`;
                // --- FIX: Changed AP to PP ---
                card.querySelector(`#prestige-cost-${producerId}`).textContent = `Cost: ${decimalUtility.format(cost, 2, 0)} PP`;
                
                const button = card.querySelector(`#prestige-purchase-${producerId}`);
                button.disabled = !coreResourceManager.canAfford('prestigePoints', cost);
            }
        }
    },
    
    onShow() {
        if(parentElementCache) this.updateDynamicElements();
    }
};
