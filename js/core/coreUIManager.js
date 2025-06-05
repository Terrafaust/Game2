// js/core/coreUIManager.js (v4.6 - Theme Apply Refinement & Logging)

/**
 * @file coreUIManager.js
 * @description Manages the main UI structure.
 * v4.6: Modified theme apply to add/remove a body class to help trigger reflow.
 * v4.5: Attempt to force style recalculation on theme apply.
 */

import { loggingSystem } from './loggingSystem.js';
import { coreResourceManager } from './coreResourceManager.js';
import { decimalUtility } from './decimalUtility.js';
// coreGameStateManager and staticDataAggregator are not directly used in this version of the file but often are in UIManagers.
// import { coreGameStateManager } from './coreGameStateManager.js';
// import { staticDataAggregator } from './staticDataAggregator.js';

const UIElements = {
    resourceBar: null,
    resourcesDisplay: null,
    mainMenu: null,
    menuList: null,
    mainContent: null,
    modalContainer: null,
    tooltipContainer: null,
    gameContainer: null,
    body: null,
    htmlElement: null,
};

let registeredMenuTabs = {};
let activeTabId = null;
let currentTooltipTarget = null;

const coreUIManager = {
    initialize() {
        UIElements.resourceBar = document.getElementById('resource-bar');
        UIElements.resourcesDisplay = document.getElementById('resources-display');
        UIElements.mainMenu = document.getElementById('main-menu');
        UIElements.menuList = document.getElementById('menu-list');
        UIElements.mainContent = document.getElementById('main-content');
        UIElements.modalContainer = document.getElementById('modal-container');
        UIElements.tooltipContainer = document.getElementById('tooltip-container');
        UIElements.gameContainer = document.getElementById('game-container');
        UIElements.body = document.body;
        UIElements.htmlElement = document.documentElement;

        if (!UIElements.resourceBar || !UIElements.resourcesDisplay || !UIElements.mainMenu || !UIElements.menuList || !UIElements.mainContent || !UIElements.modalContainer || !UIElements.tooltipContainer || !UIElements.gameContainer || !UIElements.body || !UIElements.htmlElement) {
            loggingSystem.error("CoreUIManager_Init", "One or more critical UI elements not found. Initialization failed.");
            return;
        }

        this.updateResourceDisplay();
        this.renderMenu();

        document.addEventListener('mousemove', this._handleTooltipPosition.bind(this));
        if (UIElements.menuList) {
            UIElements.menuList.addEventListener('click', this._handleMenuClick.bind(this));
        } else {
            loggingSystem.error("CoreUIManager_Init", "menuList element not found, click handler not attached.");
        }
        
        loggingSystem.info("CoreUIManager", "UI Manager initialized (v4.6).");
    },

    registerMenuTab(moduleId, label, renderCallback, isUnlockedCheck = () => true, onShowCallback, onHideCallback, isDefaultTab = false) {
        if (typeof moduleId !== 'string' || moduleId.trim() === '') {
            loggingSystem.warn("CoreUIManager_RegisterTab", "moduleId must be a non-empty string.");
            return;
        }
        if (typeof renderCallback !== 'function') {
            loggingSystem.warn("CoreUIManager_RegisterTab", `renderCallback for '${moduleId}' must be a function.`);
            return;
        }

        registeredMenuTabs[moduleId] = {
            id: moduleId,
            label: label,
            renderCallback: renderCallback,
            isUnlocked: isUnlockedCheck,
            onShowCallback: onShowCallback,
            onHideCallback: onHideCallback,
        };
        loggingSystem.info("CoreUIManager_RegisterTab", `Menu tab '${label}' (${moduleId}) registered.`);
        this.renderMenu();

        if (isDefaultTab && !activeTabId) {
            const anyActive = Object.values(registeredMenuTabs).some(tab => tab.id === activeTabId && tab.isUnlocked());
            if(!anyActive && registeredMenuTabs[moduleId].isUnlocked()){
                 this.setActiveTab(moduleId);
            }
        } else if (!activeTabId && Object.keys(registeredMenuTabs).length > 0) {
            const firstUnlockedTab = Object.values(registeredMenuTabs).find(tab => tab.isUnlocked());
            if (firstUnlockedTab) {
                this.setActiveTab(firstUnlockedTab.id);
            }
        }
    },

    renderMenu() {
        if (!UIElements.menuList) {
            loggingSystem.warn("CoreUIManager_RenderMenu", "menuList element not found. Cannot render menu.");
            return;
        }
        UIElements.menuList.innerHTML = '';

        let hasActiveTabBeenSetOrRemainsValid = false;
        Object.values(registeredMenuTabs).forEach(tab => {
            if (tab.isUnlocked()) {
                const listItem = document.createElement('li');
                listItem.className = 'menu-tab';
                listItem.textContent = tab.label;
                listItem.dataset.tabTarget = tab.id;
                if (tab.id === activeTabId) {
                    listItem.classList.add('active');
                    hasActiveTabBeenSetOrRemainsValid = true;
                }
                UIElements.menuList.appendChild(listItem);
            }
        });
        
        if (!hasActiveTabBeenSetOrRemainsValid && Object.keys(registeredMenuTabs).length > 0) {
            activeTabId = null; 
            const firstUnlockedTab = Object.values(registeredMenuTabs).find(tab => tab.isUnlocked());
            if (firstUnlockedTab) {
                this.setActiveTab(firstUnlockedTab.id, true); 
            } else {
                this.clearMainContent();
                if (UIElements.mainContent) UIElements.mainContent.innerHTML = '<p class="text-textSecondary text-center py-10">No features unlocked yet.</p>';
            }
        } else if (activeTabId && registeredMenuTabs[activeTabId] && !registeredMenuTabs[activeTabId].isUnlocked()){
            activeTabId = null;
            const firstUnlockedTab = Object.values(registeredMenuTabs).find(tab => tab.isUnlocked());
            if (firstUnlockedTab) this.setActiveTab(firstUnlockedTab.id, true);
        } else if (Object.keys(registeredMenuTabs).length === 0) {
             this.clearMainContent();
             if (UIElements.mainContent) UIElements.mainContent.innerHTML = '<p class="text-textSecondary text-center py-10">No modules loaded.</p>';
        }
    },

    _handleMenuClick(event) {
        const target = event.target;
        if (target.matches('.menu-tab') && target.dataset.tabTarget) {
            const tabId = target.dataset.tabTarget;
            if (registeredMenuTabs[tabId] && registeredMenuTabs[tabId].isUnlocked()) {
                this.setActiveTab(tabId);
            }
        }
    },

    setActiveTab(tabId, forceRender = false) {
        if (!registeredMenuTabs[tabId] || !registeredMenuTabs[tabId].isUnlocked()) {
            if (activeTabId === tabId || !activeTabId) { 
                const firstUnlocked = Object.values(registeredMenuTabs).find(t => t.isUnlocked());
                if (firstUnlocked && firstUnlocked.id !== tabId) { 
                    this.setActiveTab(firstUnlocked.id, true); 
                } else if (!firstUnlocked) { 
                     this.clearMainContent();
                     if (UIElements.mainContent) UIElements.mainContent.innerHTML = '<p class="text-textSecondary text-center py-10">No features available.</p>';
                     activeTabId = null; 
                     this.renderMenu(); 
                }
            }
            return;
        }

        if (activeTabId === tabId && !forceRender) return;

        if (activeTabId && registeredMenuTabs[activeTabId] && typeof registeredMenuTabs[activeTabId].onHideCallback === 'function') {
            try { registeredMenuTabs[activeTabId].onHideCallback(); } catch (e) { loggingSystem.error("CoreUIManager_SetActiveTab", `Error in onHideCallback for ${activeTabId}:`, e); }
        }

        activeTabId = tabId;
        this.renderMenu(); 
        this.clearMainContent();

        const tab = registeredMenuTabs[tabId];
        if (tab && typeof tab.renderCallback === 'function') {
            try { tab.renderCallback(UIElements.mainContent); } catch (error) { loggingSystem.error("CoreUIManager_SetActiveTab", `Error rendering content for tab '${tabId}':`, error); if (UIElements.mainContent) UIElements.mainContent.innerHTML = `<p class="text-red-500">Error loading content for ${tab.label}. Check console.</p>`; }
        } else { if (UIElements.mainContent) UIElements.mainContent.innerHTML = `<p>Content for ${tabId} is not available.</p>`;}
        
        if (tab && typeof tab.onShowCallback === 'function') {
            try { tab.onShowCallback(); } catch (e) { loggingSystem.error("CoreUIManager_SetActiveTab", `Error in onShowCallback for ${tabId}:`, e); }
        }
    },

    isActiveTab(tabId) { return activeTabId === tabId; },
    clearMainContent() { if (UIElements.mainContent) UIElements.mainContent.innerHTML = ''; },

    updateResourceDisplay() {
        if (!UIElements.resourcesDisplay) return;
        const allResources = coreResourceManager.getAllResources();
        let hasVisibleResources = false;
        UIElements.resourcesDisplay.innerHTML = ''; 
        Object.values(allResources).forEach(res => {
            const showRate = res.hasProductionRate !== undefined ? res.hasProductionRate : true;
            if (res.isUnlocked && res.showInUI) {
                hasVisibleResources = true;
                let displayElement = document.getElementById(`resource-${res.id}-display`);
                if (!displayElement) {
                    displayElement = document.createElement('div');
                    displayElement.id = `resource-${res.id}-display`;
                    displayElement.className = 'resource-item-display'; 
                    UIElements.resourcesDisplay.appendChild(displayElement);
                }
                const amountFormatted = decimalUtility.format(res.amount, 2);
                const rateFormatted = decimalUtility.format(res.totalProductionRate, 2);
                let rateHTML = '';
                if (showRate && (decimalUtility.gt(res.totalProductionRate, 0) || (res.productionSources && Object.keys(res.productionSources).length > 0) )) {
                    rateHTML = ` (<span id="resource-${res.id}-rate" class="text-green-400">${rateFormatted}</span>/s)`;
                }
                displayElement.innerHTML = `<span class="font-semibold text-secondary">${res.name}:</span> <span id="resource-${res.id}-amount" class="text-textPrimary font-medium ml-1">${amountFormatted}</span>${rateHTML}`;
            } else {
                let displayElement = document.getElementById(`resource-${res.id}-display`);
                if (displayElement) displayElement.remove();
            }
        });
        if (!hasVisibleResources) UIElements.resourcesDisplay.innerHTML = '<p class="text-textSecondary italic col-span-full text-center py-2">No resources to display yet.</p>';
    },

    showModal(title, content, buttons) {
        if (!UIElements.modalContainer) return;
        this.closeModal(); 
        const modalElement = document.createElement('div');
        modalElement.id = 'active-modal';
        modalElement.className = 'modal active'; 
        const modalContentDiv = document.createElement('div');
        modalContentDiv.className = 'modal-content'; 
        modalContentDiv.innerHTML = `<div class="flex justify-between items-center mb-4"><h3 class="text-xl font-semibold text-primary">${title}</h3><button id="modal-close-button" class="text-textSecondary hover:text-textPrimary text-2xl leading-none">&times;</button></div>`;
        const bodyDiv = document.createElement('div');
        if (typeof content === 'string') bodyDiv.innerHTML = content;
        else if (content instanceof HTMLElement) bodyDiv.appendChild(content);
        modalContentDiv.appendChild(bodyDiv);
        if (buttons && buttons.length > 0) {
            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'mt-6 flex justify-end space-x-3';
            buttons.forEach(btnInfo => {
                const classList = Array.isArray(btnInfo.className) ? btnInfo.className : (btnInfo.className ? [btnInfo.className] : ['bg-primary']);
                buttonsDiv.appendChild(this.createButton(btnInfo.label, btnInfo.callback, classList));
            });
            modalContentDiv.appendChild(buttonsDiv);
        }
        modalElement.appendChild(modalContentDiv);
        UIElements.modalContainer.appendChild(modalElement);
        document.getElementById('modal-close-button').addEventListener('click', () => this.closeModal());
        modalElement.addEventListener('click', (event) => { if (event.target === modalElement) this.closeModal(); });
    },

    closeModal() { const activeModal = document.getElementById('active-modal'); if (activeModal) activeModal.remove(); },
    showTooltip(content, targetElement) { /* ... (no changes) ... */ },
    hideTooltip() { /* ... (no changes) ... */ },
    _positionTooltip(targetEl) { /* ... (no changes) ... */ },
    _handleTooltipPosition(event) { /* ... (no changes) ... */ },
    showNotification(message, type = 'info', duration = 3000) { /* ... (no changes) ... */ },

    applyTheme(themeName, mode) {
        if (!UIElements.htmlElement || !UIElements.body) {
            loggingSystem.error("CoreUIManager_ApplyTheme", "HTML or body element not cached.");
            return;
        }
        const html = UIElements.htmlElement;
        const body = UIElements.body;

        html.dataset.theme = themeName; 
        html.dataset.mode = mode;     
        
        // Attempt to force style recalculation by toggling a class on the body
        body.classList.add('theme-refresh-temp');
        // Reading offsetHeight can trigger reflow
        void body.offsetHeight; 
        body.classList.remove('theme-refresh-temp');
        
        loggingSystem.info("CoreUIManager_ApplyTheme", `Theme applied: ${themeName}, Mode: ${mode}. Attributes set on <html>, style refresh attempted.`);
    },

    createButton(text, onClickCallback, additionalClasses = [], id) {
        const button = document.createElement('button');
        button.textContent = text;
        button.className = 'game-button'; 
        if (Array.isArray(additionalClasses)) {
            additionalClasses.forEach(cls => { if (typeof cls === 'string') { cls.split(' ').forEach(c => { if(c) button.classList.add(c);});}});
        } else if (typeof additionalClasses === 'string') {
            additionalClasses.split(' ').forEach(c => { if(c) button.classList.add(c);});
        }
        if (id) button.id = id;
        if (typeof onClickCallback === 'function') button.addEventListener('click', onClickCallback);
        return button;
    },
    
    fullUIRefresh() {
        this.updateResourceDisplay();
        this.renderMenu(); 
        if (activeTabId && registeredMenuTabs[activeTabId] && registeredMenuTabs[activeTabId].isUnlocked()) {
            this.setActiveTab(activeTabId, true); 
        } else if (Object.keys(registeredMenuTabs).length > 0) {
            const firstUnlocked = Object.values(registeredMenuTabs).find(t => t.isUnlocked());
            if (firstUnlocked) this.setActiveTab(firstUnlocked.id, true); 
            else { if(UIElements.mainContent) UIElements.mainContent.innerHTML = '<p class="text-textSecondary text-center py-10">No features available after refresh.</p>';}
        }
    },
};

export { coreUIManager };
