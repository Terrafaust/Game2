// js/core/coreUIManager.js (v5.4 - Corrected Resource Visibility)

/**
 * @file coreUIManager.js
 * @description Manages the main UI structure.
 * v5.4: Corrected resource bar logic to hide unlocked resources while maintaining static layout.
 * v5.3: Implemented static resource bar layout as per roadmap.
 * v5.2: Added guards to renderMenu() to prevent duplication bug on unlock.
 * v5.1: Enhanced notification system with clickability and larger achievement notifications.
 * v5.0: Complete overhaul of the modal system for a better look and feel, with full theme integration.
 */

import { loggingSystem } from './loggingSystem.js';
import { coreResourceManager } from './coreResourceManager.js';
import { decimalUtility } from './decimalUtility.js';

function initializeSwipeMenu() {
    const body = document.body;
    let touchStartX = 0, touchStartY = 0, touchEndX = 0, touchEndY = 0;
    const swipeThreshold = 50, edgeThreshold = 40, verticalThreshold = 75;

    body.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    body.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleSwipeGesture();
    });

    function handleSwipeGesture() {
        const swipeX = touchEndX - touchStartX;
        const swipeY = touchEndY - touchStartY;
        const isMenuVisible = body.classList.contains('menu-visible');

        if (Math.abs(swipeX) < swipeThreshold || Math.abs(swipeY) > verticalThreshold) return;
        if (!isMenuVisible && swipeX > 0 && touchStartX < edgeThreshold) body.classList.add('menu-visible');
        if (isMenuVisible && swipeX < 0) body.classList.remove('menu-visible');
    }
    
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

export const coreUIManager = {
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
        UIElements.notificationArea = document.getElementById('notification-area');

        if (Object.values(UIElements).some(el => !el)) {
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
        
        initializeSwipeMenu();
        loggingSystem.info("CoreUIManager", "UI Manager initialized (v5.4).");
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
        
        if (registeredMenuTabs[moduleId]) {
            loggingSystem.warn("CoreUIManager_RegisterTab", `Module ID '${moduleId}' is being re-registered. This may indicate an initialization issue.`);
        }

        registeredMenuTabs[moduleId] = { id: moduleId, label, renderCallback, isUnlocked: isUnlockedCheck, onShowCallback, onHideCallback };
        this.renderMenu();

        if (isDefaultTab && !activeTabId) {
            const anyActive = Object.values(registeredMenuTabs).some(tab => tab.id === activeTabId && tab.isUnlocked());
            if(!anyActive && registeredMenuTabs[moduleId].isUnlocked()){
                 this.setActiveTab(moduleId);
            }
        } else if (!activeTabId && Object.keys(registeredMenuTabs).length > 0) {
            const firstUnlockedTab = Object.values(registeredMenuTabs).find(tab => tab.isUnlocked());
            if (firstUnlockedTab) this.setActiveTab(firstUnlockedTab.id);
        }
    },

    renderMenu() {
        if (!UIElements.menuList || !UIElements.body) {
            loggingSystem.warn("CoreUIManager_RenderMenu", "menuList or body element not found. Cannot render menu.");
            return;
        }

        const unlockedTabDefs = Object.values(registeredMenuTabs).filter(tab => tab.isUnlocked());
        const unlockedTabs = [...new Map(unlockedTabDefs.map(item => [item.id, item])).values()];
        
        UIElements.menuList.innerHTML = ''; 

        if (unlockedTabs.length <= 1 && window.innerWidth > 768) { 
            UIElements.body.classList.add('menu-hidden'); 
        } else { 
            UIElements.body.classList.remove('menu-hidden'); 
        }

        let hasActiveTabBeenSetOrRemainsValid = false;
        unlockedTabs.forEach(tab => {
            const listItem = document.createElement('li');
            const button = document.createElement('button');
            button.className = 'menu-tab';
            button.textContent = tab.label;
            button.dataset.tabTarget = tab.id;

            if (tab.id === activeTabId) {
                button.classList.add('active');
                hasActiveTabBeenSetOrRemainsValid = true;
            }
            listItem.appendChild(button);
            UIElements.menuList.appendChild(listItem);
        });
        
        if (!hasActiveTabBeenSetOrRemainsValid && unlockedTabs.length > 0) {
            activeTabId = null; 
            this.setActiveTab(unlockedTabs[0].id, true); 
        } else if (activeTabId && registeredMenuTabs[activeTabId] && !registeredMenuTabs[activeTabId].isUnlocked()){
            activeTabId = null;
            const firstUnlockedTab = unlockedTabs[0];
            if (firstUnlockedTab) this.setActiveTab(firstUnlockedTab.id, true);
        } else if (unlockedTabs.length === 0) {
             this.clearMainContent();
             if (UIElements.mainContent) UIElements.mainContent.innerHTML = '<p class="text-textSecondary text-center py-10">No modules loaded.</p>';
        }
    },

    _handleMenuClick(event) {
        const target = event.target.closest('.menu-tab');
        if (target && target.dataset.tabTarget) {
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

        // --- ROADMAP 1.1 MODIFICATION (v2) ---
        // This version maintains the static layout but correctly hides resources that are not yet unlocked.
        
        const prestigeModule = window.game?.moduleLoader?.getModule('prestige');
        if (prestigeModule) {
            const prestigeCount = prestigeModule.logic.getTotalPrestigeCount();
            coreResourceManager.setAmount('prestigeCount', prestigeCount);
        }
        
        const allResources = coreResourceManager.getAllResources();
        
        const resourceLayout = [
            { id: 'studyPoints', name: 'Study Points' }, { id: 'images', name: 'Images' }, { id: 'prestigeCount', name: 'Prestige count' },
            { id: 'knowledge', name: 'Knowledge' }, { id: 'prestigePoints', name: 'Prestige points' },
        ];
        // Add a placeholder to ensure the grid is always even if the last item is hidden.
        resourceLayout.push({ id: 'placeholder', name: '' });

        UIElements.resourcesDisplay.innerHTML = ''; 

        for (const item of resourceLayout) {
             if (item.id === 'placeholder') {
                const placeholder = document.createElement('div');
                placeholder.className = 'resource-item-display';
                placeholder.style.visibility = 'hidden';
                UIElements.resourcesDisplay.appendChild(placeholder);
                continue;
            }

            const resourceId = item.id;
            const resource = allResources[resourceId];
            
            let shouldShow = false;
            if (resource && resource.isUnlocked && resource.showInUI) {
                shouldShow = true;
            }
            
            if (resourceId === 'prestigeCount' && (!resource || decimalUtility.lte(resource.amount, 0))) {
                shouldShow = false;
            }
            
            const displayElement = document.createElement('div');
            displayElement.id = `resource-${resourceId}-display`;
            displayElement.className = 'resource-item-display';

            if (shouldShow) {
                const name = resource.name;
                const amount = resource.amount;
                const totalProductionRate = resource.totalProductionRate;
                const hasProductionRate = resource.hasProductionRate !== undefined ? resource.hasProductionRate : true;

                const amountFormatted = decimalUtility.format(amount, 2);
                const rateFormatted = decimalUtility.format(totalProductionRate, 2);

                let innerHTML;
                if (resourceId === 'prestigeCount') {
                    innerHTML = `<span class="font-semibold text-secondary">${name}:</span> <span id="resource-${resourceId}-amount" class="text-textPrimary font-medium ml-1">${decimalUtility.format(amount, 0)}</span>`;
                } else {
                    let rateHTML = '';
                    if (hasProductionRate && decimalUtility.gt(totalProductionRate, 0)) {
                        rateHTML = ` (<span id="resource-${resourceId}-rate" class="text-green-400">${rateFormatted}</span>/s)`;
                    }
                    innerHTML = `<span class="font-semibold text-secondary">${name}:</span> <span id="resource-${resourceId}-amount" class="text-textPrimary font-medium ml-1">${amountFormatted}</span>${rateHTML}`;
                }
                displayElement.innerHTML = innerHTML;
            } else {
                displayElement.style.visibility = 'hidden';
                displayElement.innerHTML = '&nbsp;';
            }
            UIElements.resourcesDisplay.appendChild(displayElement);
        }
        // --- ROADMAP 1.1 MODIFICATION (v2) END ---
    },
    
    showModal(title, content, buttons) {
        if (!UIElements.modalContainer) return;
        this.closeModal(); 

        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'modal-overlay';
        modalOverlay.className = 'modal-overlay'; 
        modalOverlay.addEventListener('click', () => this.closeModal()); 

        const modalElement = document.createElement('div');
        modalElement.className = 'modal'; 
        modalElement.id = 'active-modal';

        const modalContentDiv = document.createElement('div');
        modalContentDiv.className = 'modal-content';
        
        const headerDiv = document.createElement('div');
        headerDiv.className = 'flex justify-between items-start mb-4';
        headerDiv.innerHTML = `<h3 class="text-2xl font-bold text-primary">${title}</h3>`;
        const closeButton = this.createButton('&times;', () => this.closeModal(), ['text-3xl', 'leading-none', 'font-bold', 'p-0', 'w-8', 'h-8', 'flex', 'items-center', 'justify-center', 'bg-transparent', 'hover:bg-surface-dark']);
        closeButton.style.color = 'var(--color-text-secondary)';
        closeButton.onmouseover = () => closeButton.style.color = 'var(--color-primary)';
        closeButton.onmouseout = () => closeButton.style.color = 'var(--color-text-secondary)';

        headerDiv.appendChild(closeButton);
        modalContentDiv.appendChild(headerDiv);
        
        const bodyDiv = document.createElement('div');
        bodyDiv.className = 'modal-body';
        if (typeof content === 'string') {
            bodyDiv.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            bodyDiv.appendChild(content);
        }
        modalContentDiv.appendChild(bodyDiv);

        if (buttons && buttons.length > 0) {
            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'mt-6 flex justify-end items-center gap-4';
            buttons.forEach(btnInfo => {
                const btnClasses = btnInfo.className ? (Array.isArray(btnInfo.className) ? btnInfo.className : [btnInfo.className]) : ['bg-primary'];
                const button = this.createButton(btnInfo.label, btnInfo.callback, btnClasses);
                buttonsDiv.appendChild(button);
            });
            modalContentDiv.appendChild(buttonsDiv);
        }

        modalElement.appendChild(modalContentDiv);
        UIElements.modalContainer.appendChild(modalOverlay);
        UIElements.modalContainer.appendChild(modalElement);
    },

    closeModal() {
        if (!UIElements.modalContainer) return;
        const modal = UIElements.modalContainer.querySelector('.modal');
        const overlay = UIElements.modalContainer.querySelector('.modal-overlay');
        if (modal) modal.remove();
        if (overlay) overlay.remove();
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
        UIElements.tooltipContainer.style.left = `${left}px`;
        UIElements.tooltipContainer.style.top = `${top}px`;
    },

    _handleTooltipPosition(event) {
        if (currentTooltipTarget) this._positionTooltip(currentTooltipTarget);
    },

    showNotification(message, type = 'info', duration = 3000, options = {}) {
        if (!UIElements.notificationArea) return;
        const notification = document.createElement('div');
        
        let typeClasses = {
            info: 'bg-blue-600 border-blue-500',
            success: 'bg-green-600 border-green-500',
            warning: 'bg-yellow-600 border-yellow-500',
            error: 'bg-red-600 border-red-500',
        };

        if (type === 'achievement') {
            notification.className = `achievement-notification`; 
            notification.innerHTML = message; 
            notification.style.pointerEvents = 'auto'; 
            if (options.achievementId) {
                notification.addEventListener('click', () => {
                    import('./moduleLoader.js').then(({ moduleLoader }) => {
                        const achievementsModule = moduleLoader.getModule('achievements');
                        if (achievementsModule && achievementsModule.ui && achievementsModule.logic) {
                            this.setActiveTab('achievements', true); 
                            setTimeout(() => {
                                achievementsModule.ui.scrollToAchievement(options.achievementId);
                            }, 100); 
                        }
                    });
                    notification.remove();
                });
            }
            duration = duration > 0 ? duration : 4000;
        } else {
            notification.className = `p-4 rounded-lg shadow-lg text-white text-sm border-l-4 transform transition-all duration-300 ease-out ${typeClasses[type] || typeClasses.info}`;
            notification.textContent = message;
        }

        notification.style.transform = 'translateX(100%)'; 
        notification.style.opacity = '0';
        UIElements.notificationArea.appendChild(notification);
        
        setTimeout(() => { 
            notification.style.transform = 'translateX(0)'; 
            notification.style.opacity = '1'; 
        }, 10);

        if (duration > 0) {
            setTimeout(() => {
                notification.style.transform = 'translateX(100%)';
                notification.style.opacity = '0';
                notification.addEventListener('transitionend', () => notification.remove());
            }, duration);
        }
    },

    showAchievementNotification(achievementName, achievementIcon, achievementId, duration = 4000) {
        const messageHtml = `<span class="icon">${achievementIcon}</span> <span>Achievement Unlocked: ${achievementName}!</span>`;
        this.showNotification(messageHtml, 'achievement', duration, { achievementId: achievementId });
    },

    applyTheme(themeName, mode) {
        if (!UIElements.htmlElement || !UIElements.body) {
            loggingSystem.error("CoreUIManager_ApplyTheme", "HTML or body element not cached.");
            return;
        }
        const html = UIElements.htmlElement;
        const body = UIElements.body;

        html.dataset.theme = themeName; 
        html.dataset.mode = mode;     
        
        body.classList.add('theme-refresh-temp');
        void body.offsetHeight; 
        body.classList.remove('theme-refresh-temp');
        
        loggingSystem.info("CoreUIManager_ApplyTheme", `Theme applied: ${themeName}, Mode: ${mode}.`);
    },

    createButton(text, onClickCallback, additionalClasses = [], id) {
        const button = document.createElement('button');
        button.innerHTML = text;
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
        } else {
            const firstUnlocked = Object.values(registeredMenuTabs).find(t => t.isUnlocked());
            if (firstUnlocked) {
                this.setActiveTab(firstUnlocked.id, true);
            } else {
                if(UIElements.mainContent) UIElements.mainContent.innerHTML = '<p class="text-textSecondary text-center py-10">No features available after refresh.</p>';
            }
        }
    },
};
