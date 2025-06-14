// js/core/coreUIManager.js (v8.2 - Final Translation Fix)
// This version correctly uses the translationManager to look up resource names and menu tab labels.

import { loggingSystem } from './loggingSystem.js';

function initializeSwipeMenu() {
    const body = document.body;
    let touchStartX = 0, touchStartY = 0;
    const swipeThreshold = 50, edgeThreshold = 40, verticalThreshold = 75;

    body.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    body.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;
        const swipeX = touchEndX - touchStartX;
        const swipeY = touchEndY - touchStartY;
        const isMenuVisible = body.classList.contains('menu-visible');

        if (Math.abs(swipeX) < swipeThreshold || Math.abs(swipeY) > verticalThreshold) return;
        if (!isMenuVisible && swipeX > 0 && touchStartX < edgeThreshold) body.classList.add('menu-visible');
        if (isMenuVisible && swipeX < 0) body.classList.remove('menu-visible');
    }, { passive: true });
    
    const menuOverlay = document.querySelector('.menu-overlay');
    if (menuOverlay) menuOverlay.addEventListener('click', () => body.classList.remove('menu-visible'));
    
    const menu = document.getElementById('main-menu');
    if (menu) menu.addEventListener('click', (e) => {
        if (e.target.classList.contains('menu-tab') && window.innerWidth <= 768) body.classList.remove('menu-visible');
    });
}


const UIElements = {
    resourceBar: null, resourcesDisplay: null, mainMenu: null, menuList: null, mainContent: null,
    modalContainer: null, tooltipContainer: null, gameContainer: null, body: null, htmlElement: null,
    notificationArea: null,
};

let registeredMenuTabs = {};
let activeTabId = null;
let currentTooltipTarget = null;
let coreSystemsRef = null;

export const coreUIManager = {
    initialize(systems) {
        coreSystemsRef = systems;

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
        UIElements.notificationArea = document.getElementById('notification-area');

        if (Object.values(UIElements).some(el => !el)) {
            loggingSystem.error("CoreUIManager_Init", "One or more critical UI elements not found.");
            return;
        }

        document.addEventListener('mousemove', this._handleTooltipPosition.bind(this));
        if (UIElements.menuList) {
            UIElements.menuList.addEventListener('click', this._handleMenuClick.bind(this));
        }
        
        initializeSwipeMenu();
        loggingSystem.info("CoreUIManager", "UI Manager initialized (v8.2).");
    },

    // The `labelKey` parameter now explicitly indicates it's a translation key.
    registerMenuTab(moduleId, labelKey, renderCallback, isUnlockedCheck = () => true, onShowCallback, onHideCallback, isDefaultTab = false) {
        if (!moduleId || typeof renderCallback !== 'function') {
            loggingSystem.warn("CoreUIManager_RegisterTab", `Invalid registration for moduleId '${moduleId}'.`);
            return;
        }
        // Store the key as `labelKey`
        registeredMenuTabs[moduleId] = { id: moduleId, labelKey, renderCallback, isUnlocked: isUnlockedCheck, onShowCallback, onHideCallback };
        if (isDefaultTab && !activeTabId && isUnlockedCheck()) {
            this.setActiveTab(moduleId, true);
        }
    },

    renderMenu() {
        if (!UIElements.menuList || !UIElements.body || !coreSystemsRef) return;
        const unlockedTabDefs = Object.values(registeredMenuTabs).filter(tab => tab.isUnlocked());
        const unlockedTabs = [...new Map(unlockedTabDefs.map(item => [item.id, item])).values()];
        
        UIElements.menuList.innerHTML = ''; 
        UIElements.body.classList.toggle('menu-hidden', unlockedTabs.length <= 1 && window.innerWidth > 768);

        let activeTabIsValid = false;
        unlockedTabs.forEach(tab => {
            // **THE FIX**: Use translationManager to get the text from the stored `labelKey`.
            const translatedLabel = coreSystemsRef.translationManager.get(tab.labelKey);
            const button = this.createButton(translatedLabel, null, ['menu-tab'], `menu-tab-${tab.id}`);
            button.dataset.tabTarget = tab.id;
            if (tab.id === activeTabId) {
                button.classList.add('active');
                activeTabIsValid = true;
            }
            const listItem = document.createElement('li');
            listItem.appendChild(button);
            UIElements.menuList.appendChild(listItem);
        });
        
        if (!activeTabIsValid && unlockedTabs.length > 0) {
            this.setActiveTab(unlockedTabs[0].id, true);
        } else if (unlockedTabs.length === 0) {
             this.clearMainContent();
        }
    },

    _handleMenuClick(event) {
        const target = event.target.closest('.menu-tab');
        if (target?.dataset.tabTarget) {
            this.setActiveTab(target.dataset.tabTarget);
        }
    },

    setActiveTab(tabId, forceRender = false) {
        if (!registeredMenuTabs[tabId]?.isUnlocked()) return;
        if (activeTabId === tabId && !forceRender) return;

        if (activeTabId && registeredMenuTabs[activeTabId]?.onHideCallback) {
            registeredMenuTabs[activeTabId].onHideCallback();
        }

        activeTabId = tabId;
        this.renderMenu(); 
        this.clearMainContent();

        registeredMenuTabs[tabId].renderCallback(UIElements.mainContent);
        if (registeredMenuTabs[tabId].onShowCallback) {
            registeredMenuTabs[tabId].onShowCallback();
        }
    },

    isActiveTab(tabId) { return activeTabId === tabId; },
    clearMainContent() { if (UIElements.mainContent) UIElements.mainContent.innerHTML = ''; },

    updateResourceDisplay() {
        if (!UIElements.resourcesDisplay || !coreSystemsRef) return;
        const { coreResourceManager, decimalUtility, translationManager } = coreSystemsRef;
        const allResources = coreResourceManager.getAllResources();
        
        for (const res of Object.values(allResources)) {
            let displayElement = document.getElementById(`resource-${res.id}-display`);
            if (res.isUnlocked && res.showInUI) {
                if (!displayElement) {
                    displayElement = document.createElement('div');
                    displayElement.id = `resource-${res.id}-display`;
                    displayElement.className = 'resource-item-display'; 
                    UIElements.resourcesDisplay.appendChild(displayElement);
                }
                const amountFormatted = decimalUtility.format(res.amount, res.id === 'prestigeCount' ? 0 : 2);
                let rateHTML = (res.hasProductionRate && decimalUtility.gt(res.totalProductionRate, 0))
                    ? ` (<span class="text-green-400">${decimalUtility.format(res.totalProductionRate, 2)}</span>/s)`
                    : '';

                // **THE FIX**: The resource's `name` property is now a translation key.
                const translatedName = translationManager.get(res.name); 
                
                displayElement.innerHTML = `<span class="font-semibold text-secondary">${translatedName}:</span> <span class="text-textPrimary font-medium ml-1">${amountFormatted}</span>${rateHTML}`;
            } else if (displayElement) {
                displayElement.remove();
            }
        }
    },
    
    showModal(title, content, buttons = []) {
        if (!UIElements.modalContainer || !coreSystemsRef) return;
        this.closeModal(); 
        
        const { translationManager } = coreSystemsRef;
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.addEventListener('click', () => this.closeModal()); 

        const modalElement = document.createElement('div');
        modalElement.className = 'modal'; 
        
        const headerDiv = document.createElement('div');
        headerDiv.className = 'flex justify-between items-start mb-4';
        headerDiv.innerHTML = `<h3 class="text-2xl font-bold text-primary">${title}</h3>`;
        const closeButton = this.createButton('&times;', () => this.closeModal(), ['text-3xl', 'leading-none', 'font-bold', 'p-0', 'w-8', 'h-8', 'flex', 'items-center', 'justify-center', 'bg-transparent', 'hover:bg-surface-dark']);
        headerDiv.appendChild(closeButton);
        
        const bodyDiv = document.createElement('div');
        bodyDiv.className = 'modal-body';
        bodyDiv.innerHTML = typeof content === 'string' ? content : '';
        if (content instanceof HTMLElement) bodyDiv.appendChild(content);

        const modalContentDiv = document.createElement('div');
        modalContentDiv.className = 'modal-content';
        modalContentDiv.append(headerDiv, bodyDiv);

        if (buttons.length > 0) {
            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'mt-6 flex justify-end items-center gap-4';
            buttons.forEach(btnInfo => {
                const label = translationManager.get(btnInfo.label);
                const button = this.createButton(label, btnInfo.callback, btnInfo.className);
                buttonsDiv.appendChild(button);
            });
            modalContentDiv.appendChild(buttonsDiv);
        }

        modalElement.appendChild(modalContentDiv);
        UIElements.modalContainer.append(modalOverlay, modalElement);
    },

    closeModal() {
        if (UIElements.modalContainer) UIElements.modalContainer.innerHTML = '';
    },

    showTooltip(content, targetElement) {
        if (!UIElements.tooltipContainer || !targetElement) return;
        UIElements.tooltipContainer.innerHTML = content;
        UIElements.tooltipContainer.style.display = 'block';
        currentTooltipTarget = targetElement;
        this._positionTooltip(targetElement);
    },

    hideTooltip() {
        if (UIElements.tooltipContainer) UIElements.tooltipContainer.style.display = 'none';
        currentTooltipTarget = null;
    },

    _positionTooltip(targetEl) {
        if (!UIElements.tooltipContainer || !targetEl) return;
        const targetRect = targetEl.getBoundingClientRect();
        const tooltipRect = UIElements.tooltipContainer.getBoundingClientRect();
        let top = targetRect.bottom + 5;
        let left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) left = window.innerWidth - tooltipRect.width - 10;
        if (top + tooltipRect.height > window.innerHeight - 10) top = targetRect.top - tooltipRect.height - 5;
        UIElements.tooltipContainer.style.top = `${top}px`;
        UIElements.tooltipContainer.style.left = `${left}px`;
    },

    _handleTooltipPosition(event) {
        if (currentTooltipTarget) this._positionTooltip(currentTooltipTarget);
    },

    showNotification(messageKey, type = 'info', duration = 3000, options = {}) {
        if (!UIElements.notificationArea || !coreSystemsRef) {
            console.error("UIManager.showNotification called before it was fully initialized.");
            return;
        }
        
        const message = options.isRawHtml ? messageKey : coreSystemsRef.translationManager.get(messageKey, options.replacements);

        const notification = document.createElement('div');
        const typeClasses = { info: 'bg-blue-600 border-blue-500', success: 'bg-green-600 border-green-500', warning: 'bg-yellow-600 border-yellow-500', error: 'bg-red-600 border-red-500', achievement: 'achievement-notification' };
        
        notification.className = 'p-4 rounded-lg shadow-lg text-white text-sm border-l-4 transform transition-all duration-300 ease-out';
        notification.classList.add(...(typeClasses[type] || typeClasses.info).split(' '));
        
        notification.innerHTML = message;
        notification.style.transform = 'translateX(100%)'; 
        notification.style.opacity = '0';
        UIElements.notificationArea.appendChild(notification);
        
        setTimeout(() => { notification.style.transform = 'translateX(0)'; notification.style.opacity = '1'; }, 10);

        if (duration > 0) {
            setTimeout(() => {
                notification.style.transform = 'translateX(100%)';
                notification.style.opacity = '0';
                notification.addEventListener('transitionend', () => notification.remove());
            }, duration);
        }
    },
    
    showAchievementNotification(achievementName, achievementIcon, achievementId, duration = 4000) {
        if (!coreSystemsRef) return;
        const translatedText = coreSystemsRef.translationManager.get('ui.notifications.achievement_unlocked');
        const messageHtml = `<span class="icon">${achievementIcon}</span> <span>${translatedText}: ${achievementName}!</span>`;
        this.showNotification(messageHtml, 'achievement', duration, { isRawHtml: true });
        
        const notifElement = UIElements.notificationArea.lastChild;
        if(notifElement) {
            notifElement.addEventListener('click', () => {
                this.setActiveTab('achievements', true);
                setTimeout(() => coreSystemsRef.moduleLoader.getModule('achievements')?.ui.scrollToAchievement(achievementId), 100);
            });
        }
    },

    applyTheme(themeName, mode) {
        if (!UIElements.htmlElement) return;
        UIElements.htmlElement.dataset.theme = themeName; 
        UIElements.htmlElement.dataset.mode = mode;
    },

    createButton(text, onClickCallback, additionalClasses = [], id) {
        const button = document.createElement('button');
        button.innerHTML = text;
        button.className = 'game-button';
        if (Array.isArray(additionalClasses)) {
            additionalClasses.forEach(cls => button.classList.add(...cls.split(' ')));
        }
        if (id) button.id = id;
        if (onClickCallback) button.addEventListener('click', onClickCallback);
        return button;
    },
    
    fullUIRefresh() {
        this.updateResourceDisplay();
        this.renderMenu(); 
        if (activeTabId && registeredMenuTabs[activeTabId] && registeredMenuTabs[activeTabId].isUnlocked()) {
            this.setActiveTab(activeTabId, true); 
        } else {
            const firstUnlocked = Object.values(registeredMenuTabs).find(t => t.isUnlocked());
            if (firstUnlocked) this.setActiveTab(firstUnlocked.id, true);
        }
    },
};
