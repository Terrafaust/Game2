// /game/modules/prestige_module/prestige_ui.js (v4.2 - Full Translation)
// FIXED: Changed import to get the exported moduleLogic object directly.
import { moduleLogic } from './prestige_logic.js';
import { prestigeData } from './prestige_data.js';

let coreSystemsRef = null;
let parentElementCache = null;
// FIXED: A reference to the logic object passed during initialization.
let logicRef = null;

export const ui = {
    // FIXED: Accept the logic reference during initialization.
    initialize(coreSystems, logic) {
        coreSystemsRef = coreSystems;
        logicRef = logic; // Store the reference
        document.addEventListener('buyMultiplierChanged', () => {
            if (coreSystemsRef && coreSystemsRef.coreUIManager.isActiveTab('prestige')) {
                this.updateDynamicElements();
            }
        });
        document.addEventListener('languagePackChanged', () => {
            if (coreSystemsRef && coreSystemsRef.coreUIManager.isActiveTab('prestige')) {
                this.renderMainContent(parentElementCache);
            }
        });
        coreSystemsRef.loggingSystem.info("PrestigeUI", "UI initialized (v4.2).");
    },

    renderMainContent(parentElement) {
        parentElementCache = parentElement;
        parentElement.innerHTML = '';

        const { translationManager } = coreSystemsRef;
        const container = document.createElement('div');
        container.className = 'p-4 space-y-6';
        
        container.innerHTML = `
            <div class="mb-6 p-3 bg-surface rounded-lg border border-red-500/50 text-center">
                <p class="text-sm text-red-300 italic">${translationManager.get('prestige.ui.tip')}</p>
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
        sectionTitle.textContent = translationManager.get('prestige.ui.upgrades_title');
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
        const { coreUIManager, translationManager } = coreSystemsRef;
        const card = document.createElement('div');
        card.id = `prestige-card-${producerDef.id}`;
        card.className = 'bg-surface p-4 rounded-lg shadow-md flex flex-col';

        const name = document.createElement('h4');
        name.className = 'text-md font-semibold text-textPrimary mb-1';
        name.textContent = producerDef.name; // This should be a translation key in a real scenario
        card.appendChild(name);

        const description = document.createElement('p');
        description.className = 'text-textSecondary text-xs mb-2 flex-grow';
        description.textContent = producerDef.description; // This should be a translation key
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
            translationManager.get('ui.buttons.buy'), 
            () => logicRef.purchasePrestigeProducer(producerDef.id), 
            ['w-full', 'text-sm', 'py-1.5', 'mt-auto'], 
            `prestige-purchase-${producerDef.id}`
        );
        card.appendChild(purchaseButton);

        return card;
    },

    updateDynamicElements() {
        if (!parentElementCache || !coreSystemsRef || !logicRef) return;
        const { decimalUtility, coreResourceManager, buyMultiplierManager, staticDataAggregator, translationManager } = coreSystemsRef;

        const ppDisplay = parentElementCache.querySelector('#pp-display');
        if (ppDisplay) {
            const pp = coreResourceManager.getAmount('prestigePoints');
            ppDisplay.textContent = translationManager.get('prestige.ui.pp_display', { value: decimalUtility.format(pp, 2, 0) });
        }
        
        const prestigeCountDisplay = parentElementCache.querySelector('#prestige-count-display');
        if(prestigeCountDisplay) {
            const count = logicRef.getTotalPrestigeCount();
            prestigeCountDisplay.textContent = translationManager.get('prestige.ui.count_display', { value: decimalUtility.format(count, 0) });
        }

        const prestigeButton = parentElementCache.querySelector('#prestige-button');
        if (prestigeButton) {
            const gain = logicRef.calculatePrestigeGain();
            const canPrestige = logicRef.canPrestige();
            prestigeButton.disabled = !canPrestige || decimalUtility.eq(gain, 0);
            if (canPrestige) {
                prestigeButton.textContent = translationManager.get('prestige.ui.button_text', { pp: decimalUtility.format(gain, 2, 0) });
            } else {
                prestigeButton.textContent = translationManager.get('prestige.ui.button_locked');
            }
        }
        
        const currentMultiplier = buyMultiplierManager.getMultiplier();
        const postDocMultiplier = logicRef.getPostDocMultiplier();

        for (const producerId in prestigeData.producers) {
            const card = parentElementCache.querySelector(`#prestige-card-${producerId}`);
            if (card) {
                const producerDef = prestigeData.producers[producerId];
                const owned = logicRef.getOwnedPrestigeProducerCount(producerId);
                card.querySelector(`#prestige-owned-${producerId}`).textContent = `${translationManager.get('ui.generic.owned')}: ${decimalUtility.format(owned, 0)}`;

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
                                const producerName = studiesProducerData ? studiesProducerData.name : p.producerId; // Name could be a key
                                productionHtml += `<div>${translationManager.get('ui.generic.production')}: ${decimalUtility.format(finalRate, 2)} ${producerName}/s</div>`;
                            }
                        });
                        productionDisplay.innerHTML = productionHtml;
                    } else {
                        productionDisplay.innerHTML = '';
                    }
                }

                let quantityToBuy;
                if (currentMultiplier === -1) {
                    quantityToBuy = logicRef.calculateMaxBuyablePrestigeProducer(producerId);
                } else {
                    quantityToBuy = decimalUtility.new(currentMultiplier);
                }
                
                const cost = logicRef.calculatePrestigeProducerCost(producerId, quantityToBuy);
                card.querySelector(`#prestige-cost-${producerId}`).textContent = `${translationManager.get('ui.generic.cost')}: ${decimalUtility.format(cost, 2, 0)} PP`;
                
                const button = card.querySelector(`#prestige-purchase-${producerId}`);
                button.disabled = !coreResourceManager.canAfford('prestigePoints', cost) || quantityToBuy.lte(0);

                let buttonText = translationManager.get('ui.buttons.buy');
                if(quantityToBuy.gt(0)) {
                    buttonText = translationManager.get('ui.buttons.buy_X', {quantity: decimalUtility.format(quantityToBuy, 0) });
                }
                button.textContent = buttonText;
            }
        }
    },

    showPrestigeConfirmationModal() {
        const { coreUIManager, decimalUtility, translationManager } = coreSystemsRef;
        const details = logicRef.getPrestigeConfirmationDetails();

        if (!details.canPrestige) {
            coreUIManager.showNotification(details.reason, "warning");
            return;
        }

        const getOrdinal = (nStr) => {
            // This is english-specific, would need a more robust i18n solution for ordinals.
            const n = parseInt(nStr.replace(/,/g, ''), 10);
            const s = ["th", "st", "nd", "rd"];
            const v = n % 100;
            return n + (s[(v - 20) % 10] || s[v] || s[0]);
        };
        const prestigeOrdinal = getOrdinal(details.nextPrestigeNumber.toString());

        let gainsMessage = `
            <li>
                <span class="font-bold text-green-200">${translationManager.get('prestige.ui.gain_pp', { value: decimalUtility.format(details.ppGains, 2, 0)})}</span>
                <br><span class="text-xs text-gray-400 italic">${details.ppGainsExplanation}</span>
            </li>
            <li>
                ${translationManager.get('prestige.ui.gain_bonus', { current: decimalUtility.format(details.currentBonus, 2), next: decimalUtility.format(details.nextBonus, 2) })}
                <br><span class="text-xs text-gray-400 italic">${details.bonusExplanation}</span>
            </li>`;

        if (logicRef.getTotalPrestigeCount().eq(0)) {
            gainsMessage += `<li><span class="font-bold text-green-200">${translationManager.get('prestige.ui.modal.unlock_skills')}</span></li>`;
        }

        let keptResourcesMessage = '';
        if (decimalUtility.gt(details.retainedKnowledge, 0)) keptResourcesMessage += `<li><span class="font-bold text-yellow-300">${translationManager.get('prestige.ui.keep_knowledge', { value: decimalUtility.format(details.retainedKnowledge, 2)})}</span></li>`;
        if (decimalUtility.gt(details.retainedSsp, 0)) keptResourcesMessage += `<li><span class="font-bold text-yellow-300">${translationManager.get('prestige.ui.keep_ssp', { value: decimalUtility.format(details.retainedSsp, 0)})}</span></li>`;
        if (Object.keys(details.startingProducers).length > 0) {
            for(const prodId in details.startingProducers) {
                const name = coreSystemsRef.staticDataAggregator.getData(`studies.producers.${prodId}`)?.name || prodId;
                keptResourcesMessage += `<li><span class="font-bold text-yellow-300">${translationManager.get('prestige.ui.keep_producers', {value: decimalUtility.format(details.startingProducers[prodId], 0), name: name})}</span></li>`;
            }
        }
        
        const resetList = `
            <li>${translationManager.get('prestige.ui.modal.reset_list_item1')}</li>
            <li>${translationManager.get('prestige.ui.modal.reset_list_item2')}</li>
            <li>${translationManager.get('prestige.ui.modal.reset_list_item3')}</li>
            <li>${translationManager.get('prestige.ui.modal.reset_list_item4')}</li>
        `;

        const confirmationMessage = `
            <div class="space-y-3 text-left text-textPrimary">
                <p>${translationManager.get('prestige.ui.modal.confirm_intro', { ordinal: prestigeOrdinal })}</p>
                <div class="p-3 bg-green-900 bg-opacity-50 rounded-lg border border-green-700">
                    <p class="font-semibold text-green-300">${translationManager.get('prestige.ui.modal.gain_header')}</p>
                    <ul class="list-disc list-inside text-sm mt-1 text-textSecondary space-y-2">${gainsMessage}</ul>
                </div>
                ${keptResourcesMessage ? `
                <div class="p-3 bg-yellow-900 bg-opacity-50 rounded-lg border border-yellow-700">
                    <p class="font-semibold text-yellow-300">${translationManager.get('prestige.ui.modal.keep_header')}</p>
                    <ul class="list-disc list-inside text-sm mt-1 text-textSecondary">${keptResourcesMessage}</ul>
                </div>` : ''}
                <div class="p-3 bg-red-900 bg-opacity-50 rounded-lg border border-red-700">
                    <p class="font-semibold text-red-300">${translationManager.get('prestige.ui.modal.reset_header')}</p>
                    <ul class="list-disc list-inside text-sm mt-1 text-textSecondary">${resetList}</ul>
                </div>
                 <p class="text-xs text-gray-400">${translationManager.get('prestige.ui.modal.permanent_note')}</p>
            </div>
        `;

        coreUIManager.showModal(translationManager.get('prestige.ui.modal.title'), confirmationMessage, [
            {
                label: translationManager.get('prestige.ui.button_text', {pp: decimalUtility.format(details.ppGains, 2, 0)}),
                className: "bg-green-600 hover:bg-green-700",
                callback: () => {
                    logicRef.executePrestigeReset(details.ppGains);
                    coreUIManager.closeModal();
                }
            },
            { label: translationManager.get('ui.buttons.not_yet'), className:"bg-gray-600 hover:bg-gray-700", callback: () => coreUIManager.closeModal() }
        ]);
    },
    
    onShow() {
        if(parentElementCache) this.updateDynamicElements();
    }
};
