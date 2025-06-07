// js/core/coreUIManager.js (v5.0 - Themed Modal Restyle)

/**
 * @file coreUIManager.js
 * @description Manages the main UI structure.
 * v5.0: Complete overhaul of the modal system for a better look and feel, with full theme integration.
 * v4.8: Added swipe-to-toggle functionality for mobile menu.
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
        loggingSystem.info("CoreUIManager", "UI Manager initialized (v5.0).");
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
        UIElements.menuList.innerHTML = '';
        const unlockedTabs = Object.values(registeredMenuTabs).filter(tab => tab.isUnlocked());

        if (unlockedTabs.length <= 1) { UIElements.body.classList.add('menu-hidden'); } 
        else { UIElements.body.classList.remove('menu-hidden'); }

        let hasActiveTabBeenSetOrRemainsValid = false;
        unlockedTabs.forEach(tab => {
            const listItem = document.createElement('li');
            listItem.className = 'menu-tab';
            listItem.textContent = tab.label;
            listItem.dataset.tabTarget = tab.id;
            if (tab.id === activeTabId) {
                listItem.classList.add('active');
                hasActiveTabBeenSetOrRemainsValid = true;
            }
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

    // --- MODIFICATION: New Modal System ---
    showModal(title, content, buttons) {
        if (!UIElements.modalContainer) return;
        this.closeModal(); // Ensure no other modals are open

        // 1. Create the dark overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'modal-overlay';
        modalOverlay.className = 'modal-overlay'; // For CSS styling
        modalOverlay.addEventListener('click', () => this.closeModal()); // Close when clicking overlay

        // 2. Create the main modal window
        const modalElement = document.createElement('div');
        modalElement.className = 'modal'; // For CSS styling
        modalElement.id = 'active-modal';

        // 3. Create the inner content container
        const modalContentDiv = document.createElement('div');
        modalContentDiv.className = 'modal-content';
        
        // 4. Create the header with title and close button
        const headerDiv = document.createElement('div');
        headerDiv.className = 'flex justify-between items-start mb-4';
        headerDiv.innerHTML = `<h3 class="text-2xl font-bold text-primary">${title}</h3>`;
        const closeButton = this.createButton('&times;', () => this.closeModal(), ['text-3xl', 'leading-none', 'font-bold', 'p-0', 'w-8', 'h-8', 'flex', 'items-center', 'justify-center', 'bg-transparent', 'hover:bg-surface-dark']);
        closeButton.style.color = 'var(--color-text-secondary)';
        closeButton.onmouseover = () => closeButton.style.color = 'var(--color-primary)';
        closeButton.onmouseout = () => closeButton.style.color = 'var(--color-text-secondary)';

        headerDiv.appendChild(closeButton);
        modalContentDiv.appendChild(headerDiv);
        
        // 5. Create the body content area
        const bodyDiv = document.createElement('div');
        bodyDiv.className = 'modal-body';
        if (typeof content === 'string') {
            bodyDiv.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            bodyDiv.appendChild(content);
        }
        modalContentDiv.appendChild(bodyDiv);

        // 6. Create the button footer if buttons are provided
        if (buttons && buttons.length > 0) {
            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'mt-6 flex justify-end items-center gap-4';
            buttons.forEach(btnInfo => {
                // Ensure a default class is applied if none is given, for consistency
                const btnClasses = btnInfo.className ? (Array.isArray(btnInfo.className) ? btnInfo.className : [btnInfo.className]) : ['bg-primary'];
                const button = this.createButton(btnInfo.label, btnInfo.callback, btnClasses);
                buttonsDiv.appendChild(button);
            });
            modalContentDiv.appendChild(buttonsDiv);
        }

        // 7. Assemble and append to the DOM
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
    // --- END MODIFICATION ---

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

    showNotification(message, type = 'info', duration = 3000) {
        const notificationArea = document.getElementById('notification-area');
        if (!notificationArea) return;
        const notification = document.createElement('div');
        const typeClasses = {
            info: 'bg-blue-600 border-blue-500',
            success: 'bg-green-600 border-green-500',
            warning: 'bg-yellow-600 border-yellow-500',
            error: 'bg-red-600 border-red-500',
        };
        notification.className = `p-4 rounded-lg shadow-lg text-white text-sm border-l-4 transform transition-all duration-300 ease-out ${typeClasses[type] || typeClasses.info}`;
        notification.textContent = message;
        notificationArea.appendChild(notification);
        setTimeout(() => { notification.style.transform = 'translateX(0)'; notification.style.opacity = '1'; }, 10);
        if (duration > 0) {
            setTimeout(() => {
                notification.style.transform = 'translateX(100%)';
                notification.style.opacity = '0';
                notification.addEventListener('transitionend', () => notification.remove());
            }, duration);
        }
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
        button.innerHTML = text; // Use innerHTML to allow for entities like &times;
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
