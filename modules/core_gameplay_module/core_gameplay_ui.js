// js/modules/core_gameplay_module/core_gameplay_ui.js (v3.0 - Final Refactor)
// Fully integrated with translationManager.

import { moduleState } from './core_gameplay_state.js';
import { MODULES, RESOURCES } from '../../core/constants.js';

let coreSystemsRef = null;
let moduleLogicRef = null;
let parentElementCache = null;

export const ui = {
    initialize(coreSystems, logicRef) {
        coreSystemsRef = coreSystems;
        moduleLogicRef = logicRef;
        coreSystemsRef.loggingSystem.debug("CoreGameplayUI", "UI initialized (v3.0).");
        document.addEventListener('languagePackChanged', () => {
             if (coreSystemsRef.coreUIManager.isActiveTab(MODULES.CORE_GAMEPLAY)) {
                this.renderMainContent(parentElementCache);
            }
        });
    },

    renderMainContent(parentElement) {
        if (!parentElement || !coreSystemsRef || !moduleLogicRef) return;
        parentElementCache = parentElement;
        parentElement.innerHTML = '';

        const { coreUIManager, translationManager } = coreSystemsRef;

        const container = document.createElement('div');
        container.className = 'p-4 space-y-6 flex flex-col items-center';

        const title = document.createElement('h2');
        title.className = 'text-2xl font-semibold text-primary mb-4';
        title.textContent = translationManager.get('core_gameplay.ui.title');
        container.appendChild(title);

        const description = document.createElement('p');
        description.className = 'text-textSecondary';
        description.textContent = translationManager.get('core_gameplay.ui.description');
        container.appendChild(description);
        
        const tipBox = document.createElement('div');
        tipBox.className = 'mt-4 p-3 bg-surface rounded-lg border border-primary/50';
        tipBox.innerHTML = `<p class="text-sm text-accentOne italic text-center">${translationManager.get('core_gameplay.ui.tip')}</p>`;
        container.appendChild(tipBox);

        const buttonWrapper = document.createElement('div');
        buttonWrapper.className = 'flex flex-col items-center w-full max-w-xs space-y-2 mt-4';

        const studyButton = coreUIManager.createButton(
            translationManager.get('core_gameplay.ui.button_text'),
            () => {
                const result = moduleLogicRef.performManualStudy();
                if (result) {
                    this.updateDynamicElements();
                    coreUIManager.showNotification('ui.notifications.item_acquired', 'success', 1500, {
                        replacements: {
                            quantity: coreSystemsRef.decimalUtility.format(result.amountGained, 2),
                            itemName: "Study Points"
                        }
                    });
                }
            },
            ['bg-secondary', 'hover:bg-pink-700', 'text-white', 'py-3', 'px-6', 'text-lg', 'w-full'],
            'manual-study-button'
        );
        buttonWrapper.appendChild(studyButton);
        
        const clickGainDisplay = document.createElement('div');
        clickGainDisplay.id = 'core-gameplay-gain-display';
        clickGainDisplay.className = 'text-sm text-textSecondary text-center h-10';
        buttonWrapper.appendChild(clickGainDisplay);
        container.appendChild(buttonWrapper);

        const clicksDisplay = document.createElement('p');
        clicksDisplay.id = 'core-gameplay-clicks-display';
        clicksDisplay.className = 'text-sm text-textSecondary mt-4';
        container.appendChild(clicksDisplay);

        parentElement.appendChild(container);
        this.updateDynamicElements();
    },

    updateDynamicElements() {
        if (!parentElementCache || !moduleLogicRef || !coreSystemsRef) return;
        const { decimalUtility, translationManager } = coreSystemsRef;

        const clicksDisplay = parentElementCache.querySelector('#core-gameplay-clicks-display');
        if (clicksDisplay) {
            clicksDisplay.textContent = translationManager.get('core_gameplay.ui.total_clicks', { value: moduleLogicRef.getTotalClicks() });
        }
        
        const clickGainDisplay = parentElementCache.querySelector('#core-gameplay-gain-display');
        if(clickGainDisplay) {
            const gains = moduleLogicRef.calculateManualStudyGain();
            const spGain = gains[RESOURCES.STUDY_POINTS];
            const knowledgeGain = gains[RESOURCES.KNOWLEDGE];

            let gainText = translationManager.get('core_gameplay.ui.gain_sp', { value: decimalUtility.format(spGain, 2) });
            if (decimalUtility.gt(knowledgeGain, 0)) {
                gainText += `<br>${translationManager.get('core_gameplay.ui.gain_knowledge', { value: decimalUtility.format(knowledgeGain, 2) })}`;
            }
            clickGainDisplay.innerHTML = gainText;
        }
    },
    
    onShow() {
        if (parentElementCache) {
            this.renderMainContent(parentElementCache);
        }
    },

    onHide() { }
};
