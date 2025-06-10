// /game/modules/prestige_module/prestige_ui.js (v4.1 - Bugfix)
import * as logic from './prestige_logic.js';
import { prestigeData } from './prestige_data.js';

let coreSystemsRef = null;
let parentElementCache = null;

export const ui = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        document.addEventListener('buyMultiplierChanged', () => {
            if (coreSystemsRef && coreSystemsRef.coreUIManager.isActiveTab('prestige')) {
                this.updateDynamicElements();
            }
        });
        coreSystemsRef.loggingSystem.info("PrestigeUI", "UI initialized (v4.1).");
    },

    renderMainContent(parentElement) {
        parentElementCache = parentElement;
        parentElement.innerHTML = '';

        const container = document.createElement('div');
        container.className = 'p-4 space-y-6';
        
        container.innerHTML = `
            <div class="mb-6 p-3 bg-surface rounded-lg border border-red-500/50 text-center">
                <p class="text-sm text-red-300 italic">"The end already ?"</p>
            </div>
        `;

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
        const prestigeButton = coreSystemsRef.coreUIManager.createButton('', () => this.showPrestigeConfirmationModal(), ['font-bold', 'py-2', 'px-4']);
        prestigeButton.id = 'prestige-button';
        prestigeButtonContainer.appendChild(prestigeButton);
        header.appendChild(prestigeButtonContainer);
        
        container.appendChild(header);

        const producersSection = document.createElement('div');
        
        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'flex justify-between items-center mt-6 mb-4';
        
        const sectionTitle = document.createElement('h3');
        sectionTitle.className = 'text-xl font-semibold text-primary';
        sectionTitle.textContent = 'Prestige Upgrades';
        sectionHeader.appendChild(sectionTitle);

        if (coreSystemsRef.buyMultiplierUI) {
            const multiplierControls = coreSystemsRef.buyMultiplierUI.createBuyMultiplierControls();
            multiplierControls.classList.remove('my-4');
            sectionHeader.appendChild(multiplierControls);
        } else {
            coreSystemsRef.loggingSystem.error("PrestigeUI", "buyMultiplierUI helper not found!");
        }
        producersSection.appendChild(sectionHeader);

        const producersGrid = document.createElement('div');
        producersGrid.id = 'prestige-producers-grid';
        producersGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
        
        for (const producerId in prestigeData.producers) {
            const producerDef = prestigeData.producers[producerId];
            producersGrid.appendChild(this._createProducerCard(producerDef));
        }
        producersSection.appendChild(producersGrid);
        container.appendChild(producersSection);

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
        
        if (producerDef.passiveProduction) {
            const productionDisplay = document.createElement('div');
            productionDisplay.id = `prestige-production-${producerDef.id}`;
            productionDisplay.className = 'text-xs text-green-400 mb-2 space-y-1';
            card.appendChild(productionDisplay);
        }

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
        if (!parentElementCache || !coreSystemsRef) return;
        const { decimalUtility, coreResourceManager, buyMultiplierManager, staticDataAggregator } = coreSystemsRef;

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
            // FIX: Call the original calculatePrestigeGain which returns a Decimal, not an object.
            const gain = logic.calculatePrestigeGain();
            const canPrestige = logic.canPrestige();
            // FIX: Use the Decimal 'gain' directly.
            prestigeButton.disabled = !canPrestige || decimalUtility.eq(gain, 0);
            if (canPrestige) {
                prestigeButton.textContent = `Prestige for ${decimalUtility.format(gain, 2, 0)} PP`;
            } else {
                prestigeButton.textContent = 'Prestige Unlocked at 1k Images';
            }
        }
        
        const currentMultiplier = buyMultiplierManager.getMultiplier();
        const postDocMultiplier = logic.getPostDocMultiplier();

        for (const producerId in prestigeData.producers) {
            const card = parentElementCache.querySelector(`#prestige-card-${producerId}`);
            if (card) {
                const producerDef = prestigeData.producers[producerId];
                const owned = logic.getOwnedPrestigeProducerCount(producerId);
                card.querySelector(`#prestige-owned-${producerId}`).textContent = `Owned: ${decimalUtility.format(owned, 0)}`;

                const productionDisplay = card.querySelector(`#prestige-production-${producerId}`);
                if (productionDisplay) {
                    if (producerDef.passiveProduction && decimalUtility.gt(owned, 0)) {
                        let productionHtml = '';
                        producerDef.passiveProduction.forEach(p => {
                            const baseRate = decimalUtility.new(p.baseRate);
                            let finalRate = decimalUtility.multiply(baseRate, owned);
                            if(producerId !== 'postDoc') {
                                finalRate = decimalUtility.multiply(finalRate, postDocMultiplier);
                            }

                            if (decimalUtility.gt(finalRate, 0)) {
                                const studiesProducerData = staticDataAggregator.getData(`studies.producers.${p.producerId}`);
                                const producerName = studiesProducerData ? studiesProducerData.name : p.producerId;
                                productionHtml += `<div>Production: ${decimalUtility.format(finalRate, 2)} ${producerName}/s</div>`;
                            }
                        });
                        productionDisplay.innerHTML = productionHtml;
                    } else {
                        productionDisplay.innerHTML = '';
                    }
                }

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

    showPrestigeConfirmationModal() {
        const { coreUIManager, decimalUtility } = coreSystemsRef;
        const details = logic.getPrestigeConfirmationDetails();

        if (!details.canPrestige) {
            coreUIManager.showNotification(details.reason, "warning");
            return;
        }

        const getOrdinal = (nStr) => {
            const n = parseInt(nStr.replace(/,/g, ''), 10);
            const s = ["th", "st", "nd", "rd"];
            const v = n % 100;
            return n + (s[(v - 20) % 10] || s[v] || s[0]);
        };
        const prestigeOrdinal = getOrdinal(details.nextPrestigeNumber.toString());

        let gainsMessage = `
            <li>
                <span class="font-bold text-green-200">${decimalUtility.format(details.ppGains, 2, 0)}</span> Prestige Points
                <br><span class="text-xs text-gray-400 italic">${details.ppGainsExplanation}</span>
            </li>
            <li>
                All Production Boost: <span class="font-bold text-yellow-300">${decimalUtility.format(details.currentBonus, 2)}x</span> -> <span class="font-bold text-green-200">${decimalUtility.format(details.nextBonus, 2)}x</span>
                <br><span class="text-xs text-gray-400 italic">${details.bonusExplanation}</span>
            </li>`;

        if (logic.getTotalPrestigeCount().eq(0)) {
            gainsMessage += `<li><span class="font-bold text-green-200">Unlock Prestige Skills</span></li>`;
        }

        let keptResourcesMessage = '';
        if (decimalUtility.gt(details.retainedKnowledge, 0)) keptResourcesMessage += `<li><span class="font-bold text-yellow-300">${decimalUtility.format(details.retainedKnowledge, 2)}</span> Knowledge</li>`;
        if (decimalUtility.gt(details.retainedSsp, 0)) keptResourcesMessage += `<li><span class="font-bold text-yellow-300">${decimalUtility.format(details.retainedSsp, 0)}</span> Study Skill Points</li>`;
        if (Object.keys(details.startingProducers).length > 0) {
            for(const prodId in details.startingProducers) {
                 keptResourcesMessage += `<li><span class="font-bold text-yellow-300">${decimalUtility.format(details.startingProducers[prodId], 0)}</span> starting ${prodId}s</li>`;
            }
        }

        const confirmationMessage = `
            <div class="space-y-3 text-left text-textPrimary">
                <p>Are you sure you want to proceed with your ${prestigeOrdinal} prestige?</p>
                <div class="p-3 bg-green-900 bg-opacity-50 rounded-lg border border-green-700">
                    <p class="font-semibold text-green-300">You will gain:</p>
                    <ul class="list-disc list-inside text-sm mt-1 text-textSecondary space-y-2">${gainsMessage}</ul>
                </div>
                ${keptResourcesMessage ? `
                <div class="p-3 bg-yellow-900 bg-opacity-50 rounded-lg border border-yellow-700">
                    <p class="font-semibold text-yellow-300">You will keep (from Prestige Skills):</p>
                    <ul class="list-disc list-inside text-sm mt-1 text-textSecondary">${keptResourcesMessage}</ul>
                </div>` : ''}
                <div class="p-3 bg-red-900 bg-opacity-50 rounded-lg border border-red-700">
                    <p class="font-semibold text-red-300">The following will be reset:</p>
                    <ul class="list-disc list-inside text-sm mt-1 text-textSecondary">
                        <li>Study Points, Knowledge, and Images</li>
                        <li>All Study Producers (Students, Classrooms, etc.)</li>
                        <li>Market Item costs and Automator Progress</li>
                        <li>Regular Skill levels and their SSP cost</li>
                    </ul>
                </div>
                 <p class="text-xs text-gray-400">Achievements, Unlocked Tabs, Prestige producers, Automator Levels, and Prestige Skills are kept.</p>
            </div>
        `;

        coreUIManager.showModal("Confirm Prestige", confirmationMessage, [
            {
                label: `Prestige for ${decimalUtility.format(details.ppGains, 2, 0)} PP`,
                className: "bg-green-600 hover:bg-green-700",
                callback: () => {
                    logic.executePrestigeReset(details.ppGains);
                    coreUIManager.closeModal();
                }
            },
            { label: "Not yet", className:"bg-gray-600 hover:bg-gray-700", callback: () => coreUIManager.closeModal() }
        ]);
    },
    
    onShow() {
        if(parentElementCache) this.updateDynamicElements();
    }
};
