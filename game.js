// game.js
"use strict";

// --- Vérification initiale des dépendances ---
if (typeof Decimal === 'undefined') {
    console.error("ERREUR CRITIQUE: break_infinity.js n'a pas été chargé. Le jeu ne peut pas démarrer.");
    // Afficher un message à l'utilisateur directement sur la page si possible
    document.body.innerHTML = '<div style="font-family: Arial, sans-serif; text-align: center; padding: 50px; color: red;"><h1>Erreur Critique</h1><p>Un composant essentiel du jeu (Decimal) n\'a pas pu être chargé. Veuillez vérifier votre connexion internet, les éventuels bloqueurs de scripts, et la console du navigateur (F12) pour plus de détails. Essayez de recharger la page.</p></div>';
    throw new Error("Decimal library not found. Game cannot start.");
}

// --- Constantes et Configuration Globale ---
const SAVE_KEY = 'etudesIncrementalesSave_v3'; // Changer si la structure de sauvegarde change radicalement
const TICK_RATE = 1000 / 20; // 20 ticks par seconde pour la boucle de jeu principale
const AUTOSAVE_INTERVAL_DEFAULT = 30000; // 30 secondes
const INFINITY_THRESHOLD = new Decimal("1e308");
const KNOWLEDGE_START_AFTER_PRESTIGE = new Decimal(10);
const MAX_OFFLINE_TIME = 24 * 60 * 60; // Maximum 24h de progression hors ligne

// --- État du Jeu (Game State) ---
let game = {}; // Sera initialisé par loadGame ou resetGameToInitialState

const initialGeneratorDefinitions = [
    // Tier 1
    { id: 0, name: "Lecture", tier: 1, baseCost: new Decimal(10), costMultiplier: 1.12, baseProduction: new Decimal(0.1), unlocked: true },
    { id: 1, name: "École Primaire", tier: 1, baseCost: new Decimal(100), costMultiplier: 1.15, baseProduction: new Decimal(1), unlocked: true },
    // Tier 2
    { id: 2, name: "Collège", tier: 2, baseCost: new Decimal(1200), costMultiplier: 1.18, baseProduction: new Decimal(8), unlocked: true },
    // Tier 3
    { id: 3, name: "Lycée", tier: 3, baseCost: new Decimal(15000), costMultiplier: 1.20, baseProduction: new Decimal(45), unlocked: true },
    // Tier 4: Licence (débloqué après 10 Lycées)
    { id: 4, name: "Licence", tier: 4, baseCost: new Decimal(2.5e5), costMultiplier: 1.22, baseProduction: new Decimal(260), unlocked: false, unlockCondition: { type: 'generator', id: 3, requiredOwned: 10 }},
    // Tier 5: Master
    { id: 5, name: "Master", tier: 5, baseCost: new Decimal(5e6), costMultiplier: 1.25, baseProduction: new Decimal(1800), unlocked: false, unlockCondition: { type: 'generator', id: 4, requiredOwned: 5 }},
    // Tier 6: Doctorat
    { id: 6, name: "Doctorat", tier: 6, baseCost: new Decimal(1e8), costMultiplier: 1.28, baseProduction: new Decimal(12000), unlocked: false, unlockCondition: { type: 'generator', id: 5, requiredOwned: 3 }},
    // Tier 7: Post-Doctorat
    { id: 7, name: "Post-Doctorat", tier: 7, baseCost: new Decimal(2.5e9), costMultiplier: 1.30, baseProduction: new Decimal(80000), unlocked: false, unlockCondition: { type: 'generator', id: 6, requiredOwned: 1 }},
];

function createInitialGameState() {
    return {
        knowledgePoints: new Decimal(0),
        prestigePoints: new Decimal(0), // Diplômes
        ascensionPoints: new Decimal(0), // Points de Sagesse

        generators: initialGeneratorDefinitions.map(def => ({
            id: def.id,
            name: def.name, // Nom pour affichage
            tier: def.tier,
            baseCost: new Decimal(def.baseCost),
            costMultiplier: def.costMultiplier, // C'est un nombre, pas un Decimal
            baseProduction: new Decimal(def.baseProduction),
            owned: new Decimal(0),
            productionMultiplier: new Decimal(1), // Multiplicateur spécifique à ce générateur (ex: par améliorations)
            unlocked: def.unlocked,
            unlockCondition: def.unlockCondition || null, // { type: 'generator'/'knowledge', id: (if generator), requiredOwned/requiredAmount: ... }
        })),

        upgrades: {
            // 'upgradeId': { name: "...", description: "...", cost: new Decimal(...), purchased: false, effect: (game) => { ... }, type: 'generator_multiplier'/'global_multiplier', targetId: (if generator) }
        },

        achievements: {
            // 'achId': { name: "...", description: "...", unlocked: false, condition: (game) => { return boolean; }, reward: (game) => { ... } }
        },

        stats: {
            totalKnowledgeGained: new Decimal(0),
            totalPrestigePointsGained: new Decimal(0),
            timePlayed: 0, // en secondes
            prestigeCount: 0,
            gameStartTime: Date.now(),
            // ... autres statistiques
        },

        options: {
            autosaveInterval: AUTOSAVE_INTERVAL_DEFAULT,
            currentNotation: 'standard', // scientific, standard, engineering
            offlineProgressEnabled: true,
            theme: 'light', // 'light', 'dark' (futur)
        },

        lastUpdate: Date.now(),
        saveVersion: "3.0.0",
    };
}

// --- Éléments du DOM (DOM Elements Cache) ---
const DOMElements = {};
function cacheDOMElements() {
    const ids = [
        'knowledge-points', 'kps-display', 'prestige-points', 'ascension-points',
        'main-tabs', 'tab-content-container',
        'generators-container', 'upgrades-container', 'achievements-container',
        'prestige-threshold-display', 'prestige-bonus-percentage', 'prestige-gain', 'prestige-button',
        'save-button', 'load-button', 'reset-button', 'save-status',
        'number-notation-display', 'toggle-notation-button',
        'customConfirmModalContainer', 'current-year'
    ];
    ids.forEach(id => {
        DOMElements[id] = document.getElementById(id);
        if (!DOMElements[id] && !['customConfirmModalContainer', 'current-year'].includes(id)) {
            console.warn(`DOM Element not found: #${id}. UI might not update correctly.`);
        }
    });
    DOMElements.tabPanels = document.querySelectorAll('.tab-panel'); // NodeList
}

// --- Fonctions Utilitaires (Utility Functions) ---
function formatNumber(num, notation = game.options.currentNotation) {
    if (!(num instanceof Decimal)) num = new Decimal(num);
    if (num.isNaN()) return "NaN";
    if (!num.isFinite()) return num.toString(); // Infinity, -Infinity

    if (num.abs().lt(0.001) && num.neq(0)) return num.toExponential(2);
    if (num.abs().lt(1000)) { // Gère les nombres entre -999 et 999
        if (num.isInteger()) return num.toFixed(0);
        return num.toFixed(2); // Deux décimales pour les petits nombres non entiers
    }

    switch (notation) {
        case 'scientific': return num.toExponential(2);
        case 'engineering': return num.toEngineering(2);
        case 'standard':
            const suffixes = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc", "UDc", "DDc", "TDc", "QtDc"];
            const sign = num.s < 0 ? "-" : "";
            const absNum = num.abs();
            const tier = absNum.e >= 3 ? Math.floor(absNum.e / 3) : 0;
            if (tier < suffixes.length) {
                const scale = Decimal.pow(1000, tier);
                const scaledNum = absNum.div(scale);
                return sign + scaledNum.toFixed(2) + suffixes[tier];
            }
            return sign + absNum.toExponential(2); // Fallback
        default: return num.toExponential(2);
    }
}

// --- Logique des Générateurs (Generator Logic) ---
function getGeneratorCost(generator) {
    // Formule: baseCost * costMultiplier ^ owned
    return generator.baseCost.times(Decimal.pow(generator.costMultiplier, generator.owned));
}

function getSingleGeneratorEffectiveProduction(generator) {
    // Production de ce générateur SEUL, incluant son multiplicateur spécifique, avant multiplicateurs globaux (comme prestige)
    if (generator.owned.equals(0)) return new Decimal(0);
    return generator.baseProduction.times(generator.owned).times(generator.productionMultiplier);
}

function getTotalKnowledgePerSecond() {
    let totalKPS = new Decimal(0);
    game.generators.forEach(gen => {
        if (gen.unlocked && gen.owned.gt(0)) {
            totalKPS = totalKPS.add(getSingleGeneratorEffectiveProduction(gen));
        }
    });
    // Appliquer les multiplicateurs globaux (ex: prestige, améliorations globales)
    totalKPS = totalKPS.times(getPrestigeProductionMultiplier());
    // totalKPS = totalKPS.times(getGlobalUpgradeMultiplier()); // Exemple pour futures améliorations
    return totalKPS;
}

function buyGenerator(generatorId) {
    const generator = game.generators.find(g => g.id === generatorId);
    if (!generator || !generator.unlocked) {
        console.warn(`Attempted to buy non-existent or locked generator: ID ${generatorId}`);
        return;
    }

    const cost = getGeneratorCost(generator);
    if (game.knowledgePoints.gte(cost)) {
        game.knowledgePoints = game.knowledgePoints.sub(cost);
        generator.owned = generator.owned.add(1);
        checkAllUnlocks(); // Vérifier si cet achat débloque d'autres éléments (générateurs, améliorations)
        updateGeneratorUIDisplay(generatorId); // Met à jour seulement ce générateur et les ressources
        updateResourceUIDisplay();
    }
}

function checkAllUnlocks() {
    let newUnlockOccurred = false;
    // Générateurs
    game.generators.forEach(gen => {
        if (!gen.unlocked && gen.unlockCondition) {
            let conditionMet = false;
            if (gen.unlockCondition.type === 'generator') {
                const requiredGen = game.generators.find(g => g.id === gen.unlockCondition.id);
                if (requiredGen && requiredGen.owned.gte(gen.unlockCondition.requiredOwned)) {
                    conditionMet = true;
                }
            } else if (gen.unlockCondition.type === 'knowledge') {
                if (game.knowledgePoints.gte(gen.unlockCondition.requiredAmount)) {
                    conditionMet = true;
                }
            }
            // Ajouter d'autres types de conditions ici (ex: prestige points, achievements)

            if (conditionMet) {
                gen.unlocked = true;
                newUnlockOccurred = true;
                showNotification(`${gen.name} débloqué !`, 'success');
            }
        }
    });

    // Améliorations (futur)
    // for (const upgradeId in game.upgrades) { ... }

    // Succès (futur)
    // for (const achId in game.achievements) { ... }

    if (newUnlockOccurred) {
        createGeneratorElements(); // Recréer si la liste des générateurs affichables a changé
        // createUpgradeElements(); // Si des améliorations sont débloquées
    }
}

// --- Logique de Prestige (Prestige Logic) ---
function getPrestigeProductionMultiplier() {
    if (game.prestigePoints.equals(0)) return new Decimal(1);
    // Chaque Diplôme augmente la production de 1%
    return game.prestigePoints.times(0.01).add(1);
}

function getPrestigePointsGain() {
    // Formule Roadmap: floor(sqrt(connaissances / 1e10))
    if (game.knowledgePoints.lt(new Decimal("1e10"))) return new Decimal(0);
    return game.knowledgePoints.div(new Decimal("1e10")).sqrt().floor().max(0);
}

function canPrestige() {
    return game.knowledgePoints.gte(INFINITY_THRESHOLD) && getPrestigePointsGain().gt(0);
}

function executePrestige() {
    if (!canPrestige()) return;

    const gainedPrestige = getPrestigePointsGain();
    if (gainedPrestige.lte(0)) return; // Double sécurité

    // Sauvegarder certaines statistiques avant le reset
    game.stats.totalPrestigePointsGained = game.stats.totalPrestigePointsGained.add(gainedPrestige);
    game.stats.prestigeCount++;

    // Appliquer les points de prestige
    game.prestigePoints = game.prestigePoints.add(gainedPrestige);

    // Reset des ressources et générateurs (comme défini dans initialGameState mais garde les points de prestige/ascension)
    const prestigePointsBefore = game.prestigePoints; // Conserver
    const ascensionPointsBefore = game.ascensionPoints; // Conserver
    const statsBefore = { ...game.stats }; // Conserver certaines stats
    const optionsBefore = { ...game.options }; // Conserver les options

    // Réinitialiser les parties volatiles de l'état
    const freshState = createInitialGameState();
    game.knowledgePoints = KNOWLEDGE_START_AFTER_PRESTIGE; // Valeur de départ après prestige
    game.generators = freshState.generators; // Réinitialise owned, unlocked (selon la définition initiale)
    game.upgrades = freshState.upgrades; // Réinitialise les améliorations non permanentes

    // Restaurer les éléments persistants
    game.prestigePoints = prestigePointsBefore;
    game.ascensionPoints = ascensionPointsBefore;
    game.stats = {
        ...freshState.stats, // Prend la base des stats initiales (ex: reset du totalKnowledgeGained pour cette run)
        totalKnowledgeGained: new Decimal(0), // Reset pour la nouvelle run de prestige
        totalPrestigePointsGained: statsBefore.totalPrestigePointsGained,
        timePlayed: statsBefore.timePlayed, // Le temps de jeu total continue
        prestigeCount: statsBefore.prestigeCount,
        gameStartTime: statsBefore.gameStartTime, // Le début du jeu reste le même
    };
    game.options = optionsBefore;
    game.lastUpdate = Date.now(); // Important pour éviter un grand saut de production offline

    checkAllUnlocks(); // Pour ré-évaluer les unlocks après reset (certains pourraient être basés sur les points de prestige)
    saveGame();
    createGeneratorElements();
    // createUpgradeElements();
    updateUI();

    showNotification(`Prestige réussi ! Vous avez obtenu ${formatNumber(gainedPrestige)} Diplômes. Votre production est maintenant multipliée par ${formatNumber(getPrestigeProductionMultiplier())}x.`, 'success');
}

// --- Mise à Jour de l'UI (UI Update Functions) ---
function updateResourceUIDisplay() {
    if (DOMElements['knowledge-points']) DOMElements['knowledge-points'].textContent = formatNumber(game.knowledgePoints);
    if (DOMElements['kps-display']) DOMElements['kps-display'].textContent = formatNumber(getTotalKnowledgePerSecond());
    if (DOMElements['prestige-points']) DOMElements['prestige-points'].textContent = formatNumber(game.prestigePoints);
    if (DOMElements['ascension-points']) DOMElements['ascension-points'].textContent = formatNumber(game.ascensionPoints);
}

function updateGeneratorUIDisplay(generatorId) {
    const generator = game.generators.find(g => g.id === generatorId);
    if (!generator || !generator.unlocked) return;

    const genItemEl = document.getElementById(`gen-item-${generator.id}`);
    if (!genItemEl) return;

    const prodEl = genItemEl.querySelector(`#gen-${generator.id}-prod`);
    const ownedEl = genItemEl.querySelector(`#gen-${generator.id}-owned`);
    const costEl = genItemEl.querySelector(`#gen-${generator.id}-cost`);
    const buyBtn = genItemEl.querySelector(`#buy-gen-${generator.id}`);
    const multiplierEl = genItemEl.querySelector(`#gen-${generator.id}-multiplier`);

    if (prodEl) prodEl.textContent = formatNumber(getSingleGeneratorEffectiveProduction(generator));
    if (ownedEl) ownedEl.textContent = formatNumber(generator.owned);

    const currentCost = getGeneratorCost(generator);
    if (costEl) costEl.textContent = formatNumber(currentCost);
    if (buyBtn) buyBtn.disabled = game.knowledgePoints.lt(currentCost);
    
    // Multiplicateur affiché = multiplicateur spécifique du générateur * multiplicateur global de prestige
    if (multiplierEl) multiplierEl.textContent = formatNumber(generator.productionMultiplier.times(getPrestigeProductionMultiplier()), 'standard');
}

function updatePrestigeUIDisplay() {
    if (DOMElements['prestige-threshold-display']) DOMElements['prestige-threshold-display'].textContent = formatNumber(INFINITY_THRESHOLD);
    if (DOMElements['prestige-bonus-percentage']) DOMElements['prestige-bonus-percentage'].textContent = formatNumber(getPrestigeProductionMultiplier().sub(1).times(100), 'standard'); // Affiche en pourcentage
    if (DOMElements['prestige-gain']) DOMElements['prestige-gain'].textContent = formatNumber(getPrestigePointsGain());
    if (DOMElements['prestige-button']) DOMElements['prestige-button'].disabled = !canPrestige();
}

function updateOptionsUIDisplay() {
    if (DOMElements['number-notation-display']) DOMElements['number-notation-display'].textContent = game.options.currentNotation.charAt(0).toUpperCase() + game.options.currentNotation.slice(1);
}

function updateUI() {
    if (!game || !game.options) return; // S'assurer que `game` est initialisé
    updateResourceUIDisplay();
    game.generators.forEach(gen => {
        if (gen.unlocked) updateGeneratorUIDisplay(gen.id);
    });
    updatePrestigeUIDisplay();
    updateOptionsUIDisplay();
    // Mettre à jour d'autres sections (améliorations, succès...)
}

function createGeneratorElements() {
    const container = DOMElements['generators-container'];
    if (!container) return;
    container.innerHTML = ''; // Vider

    let displayedCount = 0;
    game.generators.forEach(generator => {
        if (!generator.unlocked) return;
        displayedCount++;

        const cost = getGeneratorCost(generator);
        const effectiveProduction = getSingleGeneratorEffectiveProduction(generator); // Production de ce générateur (avant prestige global)

        const div = document.createElement('div');
        div.id = `gen-item-${generator.id}`;
        div.className = 'generator-item p-3 sm:p-4 border border-slate-200 rounded-lg bg-slate-50 shadow-sm hover:shadow-md transition-shadow duration-150';
        
        div.innerHTML = `
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div class="flex-grow">
                    <h4 class="text-md sm:text-lg font-semibold text-sky-700">${generator.name} <span class="text-xs text-slate-400">(Tier ${generator.tier})</span></h4>
                    <p class="text-xs sm:text-sm text-slate-600" title="Production de base de cette ligne de générateurs">Produit: <span id="gen-${generator.id}-prod" class="font-medium text-sky-600">${formatNumber(effectiveProduction)}</span> /s</p>
                    <p class="text-xs sm:text-sm text-slate-600">Possédés: <span id="gen-${generator.id}-owned" class="font-medium">${formatNumber(generator.owned)}</span></p>
                    <p class="text-xs text-slate-500" title="Multiplicateur (local x prestige global)">Bonus total: <span id="gen-${generator.id}-multiplier" class="font-medium">${formatNumber(generator.productionMultiplier.times(getPrestigeProductionMultiplier()), 'standard')}</span>x</p>
                </div>
                <div class="w-full sm:w-auto flex-shrink-0 mt-2 sm:mt-0">
                    <button id="buy-gen-${generator.id}" 
                            class="w-full sm:w-auto px-4 py-2 bg-sky-500 text-white text-sm font-medium rounded-md hover:bg-sky-600 transition duration-150 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-60 disabled:bg-slate-400 disabled:hover:bg-slate-400 disabled:cursor-not-allowed">
                        Acheter (Coût: <span id="gen-${generator.id}-cost">${formatNumber(cost)}</span>)
                    </button>
                </div>
            </div>
        `;
        container.appendChild(div);

        const buyButton = div.querySelector(`#buy-gen-${generator.id}`);
        if (buyButton) {
            buyButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Évite la propagation si d'autres listeners sont sur l'item
                buyGenerator(generator.id);
            });
            buyButton.disabled = game.knowledgePoints.lt(cost);
        }
    });

    if (displayedCount === 0) {
        container.innerHTML = '<p class="text-slate-500 text-center py-4">Débloquez plus de générateurs en progressant !</p>';
    }
}

// --- Sauvegarde et Chargement (Save & Load) ---
// Fonctions pour convertir l'état du jeu avec des Decimals en JSON et vice-versa
function serializeGameStateForSave(gameState) {
    const copy = JSON.parse(JSON.stringify(gameState)); // Deep copy pour éviter de modifier l'état original

    // Convertir les Decimals en string
    function convertDecimalsToString(obj) {
        for (const key in obj) {
            if (obj[key] instanceof Decimal) {
                obj[key] = obj[key].toString();
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                convertDecimalsToString(obj[key]);
            }
        }
    }
    convertDecimalsToString(copy);
    return copy;
}

function deserializeGameStateFromLoad(savedData) {
    // Partir d'une copie de l'état initial pour s'assurer que toutes les clés sont présentes
    // et que les nouvelles propriétés non sauvegardées sont incluses.
    const initialStateCopy = createInitialGameState();
    
    // Fusionner l'état sauvegardé par-dessus l'état initial.
    // Cela nécessite une fonction de fusion profonde qui gère bien les objets et les tableaux.
    const mergedState = deepMerge(initialStateCopy, savedData);

    // Convertir les strings numériques en Decimals pour les champs connus
    function convertStringsToDecimals(obj) {
        for (const key in obj) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                convertStringsToDecimals(obj[key]);
            } else {
                 // Logique de conversion spécifique basée sur la structure de `game`
                if (key === 'knowledgePoints' || key === 'prestigePoints' || key === 'ascensionPoints' ||
                    key === 'totalKnowledgeGained' || key === 'totalPrestigePointsGained' ||
                    key === 'baseCost' || key === 'baseProduction' || key === 'owned' || key === 'productionMultiplier') {
                    if (typeof obj[key] === 'string' || typeof obj[key] === 'number') {
                         try {
                            obj[key] = new Decimal(obj[key]);
                        } catch (e) {
                            console.warn(`Failed to convert ${key}: ${obj[key]} to Decimal. Using 0 or default.`, e);
                            // Gérer l'erreur, par exemple en utilisant une valeur par défaut
                            if (key === 'owned' || key === 'knowledgePoints' || key === 'prestigePoints' || key === 'ascensionPoints') obj[key] = new Decimal(0);
                            else if (key === 'productionMultiplier') obj[key] = new Decimal(1);
                            // Pour baseCost et baseProduction, il faudrait une valeur par défaut plus intelligente ou logger l'erreur.
                        }
                    } else if (obj[key] === null || obj[key] === undefined) {
                        // Gérer les cas où la propriété est null/undefined dans la sauvegarde
                         if (key === 'owned' || key === 'knowledgePoints' || key === 'prestigePoints' || key === 'ascensionPoints') obj[key] = new Decimal(0);
                         else if (key === 'productionMultiplier') obj[key] = new Decimal(1);
                    }
                }
            }
        }
    }
    convertStringsToDecimals(mergedState);
    return mergedState;
}

// Fonction utilitaire pour fusionner les objets (améliorée)
function deepMerge(target, source) {
    const output = { ...target }; // Commence avec une copie de la cible
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target)) {
                    output[key] = source[key]; // Si la clé n'existe pas dans la cible, ajouter la source
                } else {
                    output[key] = deepMerge(target[key], source[key]); // Fusion récursive
                }
            } else if (Array.isArray(source[key])) {
                 // Pour les tableaux (comme `generators`), on préfère souvent remplacer
                 // ou avoir une logique de fusion plus spécifique si on veut fusionner les éléments.
                 // Ici, on remplace si la source a un tableau.
                output[key] = source[key];
            }
            else {
                output[key] = source[key]; // Valeurs primitives ou non-objets
            }
        });
    }
    return output;
}
function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item) && !(item instanceof Decimal));
}


function saveGame() {
    try {
        game.lastUpdate = Date.now();
        const saveData = serializeGameStateForSave(game);
        localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
        if (DOMElements['save-status']) {
            DOMElements['save-status'].textContent = `Jeu sauvegardé à ${new Date().toLocaleTimeString()}.`;
            DOMElements['save-status'].className = 'mt-2 text-sm h-5 text-green-600';
            setTimeout(() => { if (DOMElements['save-status']) DOMElements['save-status'].textContent = ''; }, 3000);
        }
    } catch (error) {
        console.error("Erreur lors de la sauvegarde :", error);
        if (DOMElements['save-status']) {
            DOMElements['save-status'].textContent = "Erreur de sauvegarde.";
            DOMElements['save-status'].className = 'mt-2 text-sm h-5 text-red-500';
        }
        showNotification("Erreur lors de la sauvegarde du jeu.", "error");
    }
}

function loadGame() {
    try {
        const savedGameString = localStorage.getItem(SAVE_KEY);
        if (savedGameString) {
            const parsedJson = JSON.parse(savedGameString);
            game = deserializeGameStateFromLoad(parsedJson);
            
            // S'assurer que les générateurs ont bien leurs propriétés de base si elles manquent dans la sauvegarde
            game.generators = game.generators.map(savedGen => {
                const def = initialGeneratorDefinitions.find(d => d.id === savedGen.id);
                return {
                    ...(def ? createInitialGameState().generators.find(g => g.id === def.id) : {}), // Base de la définition actuelle
                    ...savedGen, // Valeurs sauvegardées
                    // S'assurer que les champs clés sont des Decimals
                    baseCost: new Decimal(savedGen.baseCost || (def ? def.baseCost : 0)),
                    baseProduction: new Decimal(savedGen.baseProduction || (def ? def.baseProduction : 0)),
                    owned: new Decimal(savedGen.owned || 0),
                    productionMultiplier: new Decimal(savedGen.productionMultiplier || 1),
                    // costMultiplier est un nombre
                    costMultiplier: savedGen.costMultiplier || (def ? def.costMultiplier : 1.1),
                };
            });


            // Calcul de la progression hors ligne
            const timeDiffSeconds = Math.min((Date.now() - (game.lastUpdate || Date.now())) / 1000, MAX_OFFLINE_TIME);
            if (game.options.offlineProgressEnabled && timeDiffSeconds > 5) { // Plus de 5s d'absence
                const offlineKPS = getTotalKnowledgePerSecond(); // KPS avant d'ajouter la production offline
                if (offlineKPS.gt(0)) {
                    const offlineGains = offlineKPS.times(timeDiffSeconds);
                    game.knowledgePoints = game.knowledgePoints.add(offlineGains);
                    if (game.stats && game.stats.totalKnowledgeGained) {
                        game.stats.totalKnowledgeGained = game.stats.totalKnowledgeGained.add(offlineGains);
                    }
                    const duration = timeDiffSeconds < 60 ? `${Math.floor(timeDiffSeconds)}s` :
                                   timeDiffSeconds < 3600 ? `${Math.floor(timeDiffSeconds/60)}m` :
                                   `${Math.floor(timeDiffSeconds/3600)}h`;
                    showNotification(`Bienvenue ! Vous avez gagné ${formatNumber(offlineGains)} Connaissances pendant votre absence (${duration}).`, "info");
                }
            }
        } else {
            resetGameToInitialState(false); // false pour ne pas afficher de notif de reset
            showNotification("Aucune sauvegarde trouvée. Une nouvelle partie a commencé.", "info");
        }
    } catch (error) {
        console.error("Erreur critique lors du chargement du jeu :", error);
        resetGameToInitialState(false);
        showNotification("Erreur de chargement de la sauvegarde. Le jeu a été réinitialisé.", "error");
    } finally {
        game.lastUpdate = Date.now();
        checkAllUnlocks();
        createGeneratorElements();
        // createUpgradeElements();
        updateUI();
    }
}

function resetGameToInitialState(notify = true) {
    game = createInitialGameState();
    game.lastUpdate = Date.now();
    if (notify) {
        showNotification("Jeu réinitialisé.", "info");
    }
}

function confirmAndResetGame() {
    showCustomConfirm(
        "Réinitialiser le Jeu",
        "Êtes-vous sûr de vouloir effacer TOUTE votre progression ? Cette action est irréversible et supprimera votre sauvegarde locale.",
        () => {
            localStorage.removeItem(SAVE_KEY);
            resetGameToInitialState();
            saveGame(); // Sauvegarde l'état réinitialisé pour éviter de recharger une ancienne sauvegarde par erreur
            checkAllUnlocks();
            createGeneratorElements();
            // createUpgradeElements();
            updateUI();
        },
        "Attention !" // Titre de la modale
    );
}

// --- Boucle de Jeu (Game Loop) ---
let lastTick = 0;
let uiUpdateCounter = 0;
const UI_UPDATE_FREQUENCY = 5; // Met à jour l'UI tous les 5 ticks pour optimiser les performances

function gameLoop(timestamp) {
    if (!game || !game.options) { // Attendre que `game` soit initialisé
        requestAnimationFrame(gameLoop);
        return;
    }
    
    const now = Date.now(); // Utiliser Date.now() pour la cohérence
    if (!lastTick) lastTick = now; // Initialisation du premier tick

    const deltaTime = (now - lastTick) / 1000; // Delta en secondes

    // Logique de jeu principale (production, etc.)
    if (deltaTime > 0) {
        const kps = getTotalKnowledgePerSecond();
        if (kps.gt(0)) {
            const gainedKnowledge = kps.times(deltaTime);
            game.knowledgePoints = game.knowledgePoints.add(gainedKnowledge);
            if (game.stats && game.stats.totalKnowledgeGained) { // Vérifier si stats existe
                 game.stats.totalKnowledgeGained = game.stats.totalKnowledgeGained.add(gainedKnowledge);
            }
        }
        if (game.stats) game.stats.timePlayed += deltaTime;
    }
    
    // Mise à jour de l'UI (moins fréquente pour optimiser)
    uiUpdateCounter++;
    if (uiUpdateCounter >= UI_UPDATE_FREQUENCY) {
        updateUI();
        uiUpdateCounter = 0;
    }
    
    lastTick = now;
    requestAnimationFrame(gameLoop); // Boucle continue
}


// --- Gestion des Onglets (Tab Management) ---
function setupTabs() {
    const tabs = DOMElements['main-tabs'] ? DOMElements['main-tabs'].querySelectorAll('.ui-tab') : [];
    const panels = DOMElements.tabPanels; // Ceci est un NodeList

    if (!tabs.length || !panels || !panels.length) {
        console.warn("Éléments d'onglets ou panneaux non trouvés. La navigation par onglets pourrait ne pas fonctionner.");
        return;
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Désactiver tous les onglets et cacher tous les panneaux
            tabs.forEach(t => {
                t.classList.remove('active-tab');
                t.setAttribute('aria-selected', 'false');
            });
            panels.forEach(p => p.classList.add('hidden')); // Utiliser la classe 'hidden' de Tailwind

            // Activer l'onglet cliqué et afficher le panneau correspondant
            tab.classList.add('active-tab');
            tab.setAttribute('aria-selected', 'true');
            const targetPanelId = tab.getAttribute('aria-controls');
            const targetPanel = document.getElementById(targetPanelId);
            if (targetPanel) {
                targetPanel.classList.remove('hidden');
            } else {
                console.warn(`Panneau cible non trouvé: ${targetPanelId}`);
            }
        });
    });

    // Activer le premier onglet par défaut si aucun n'est actif
    const activeTab = DOMElements['main-tabs'] ? DOMElements['main-tabs'].querySelector('.ui-tab.active-tab') : null;
    if (!activeTab && tabs.length > 0) {
        tabs[0].click();
    }
}

// --- Options du Jeu (Game Options Logic) ---
function toggleNotation() {
    const notations = ['standard', 'scientific', 'engineering'];
    let currentIndex = notations.indexOf(game.options.currentNotation);
    currentIndex = (currentIndex + 1) % notations.length;
    game.options.currentNotation = notations[currentIndex];
    // Pas besoin de recréer tous les éléments, updateUI devrait suffire si bien fait
    updateUI();
}

// --- Notifications et Modales (UI Feedback) ---
function showNotification(message, type = 'info', duration = 3500) {
    const container = document.body;
    const notif = document.createElement('div');
    notif.textContent = message;
    // Classes de base pour la notification
    notif.className = 'fixed bottom-5 right-5 p-4 rounded-lg shadow-xl text-white text-sm z-[100] transition-all duration-300 ease-out transform opacity-0 translate-y-4';

    // Appliquer la couleur basée sur le type
    if (type === 'success') notif.classList.add('bg-green-500');
    else if (type === 'error') notif.classList.add('bg-red-500');
    else if (type === 'warning') notif.classList.add('bg-amber-500');
    else notif.classList.add('bg-sky-600'); // info

    container.appendChild(notif);

    // Animation d'apparition
    requestAnimationFrame(() => { // Assure que l'élément est dans le DOM avant d'animer
        notif.classList.remove('opacity-0', 'translate-y-4');
        notif.classList.add('opacity-100', 'translate-y-0');
    });

    // Disparition automatique
    setTimeout(() => {
        notif.classList.remove('opacity-100', 'translate-y-0');
        notif.classList.add('opacity-0', 'translate-y-4');
        setTimeout(() => notif.remove(), 300); // Nettoyer du DOM après la transition
    }, duration);
}

function showCustomConfirm(title, message, onConfirm, modalTitle = "Confirmation Requise") {
    const container = DOMElements['customConfirmModalContainer'];
    if (!container) {
        console.error("Conteneur de modale non trouvé. Impossible d'afficher la confirmation.");
        // Fallback simple si la modale ne peut pas s'afficher
        if (confirm(`${modalTitle}\n${title}\n${message}`)) {
            onConfirm();
        }
        return;
    }

    container.innerHTML = `
        <div id="customConfirmModal" class="fixed inset-0 bg-slate-900 bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-[200] transition-opacity duration-150 ease-out opacity-0" role="alertdialog" aria-modal="true" aria-labelledby="modalTitle" aria-describedby="modalMessage">
            <div class="bg-white p-5 sm:p-6 rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-150 ease-out scale-95 opacity-0">
                <h3 id="modalTitle" class="text-lg font-semibold text-slate-800 mb-2">${modalTitle}</h3>
                <p id="modalMessageSub" class="text-md text-slate-700 font-medium mb-1">${title}</p>
                <p id="modalMessage" class="text-sm text-slate-600 mb-6">${message}</p>
                <div class="flex justify-end gap-3">
                    <button id="modalCancelBtn" class="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors focus-visible:ring-slate-400">Annuler</button>
                    <button id="modalConfirmBtn" class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors focus-visible:ring-red-500">Confirmer</button>
                </div>
            </div>
        </div>
    `;

    const modal = container.querySelector('#customConfirmModal');
    const dialog = modal.querySelector(':scope > div');
    const confirmBtn = container.querySelector('#modalConfirmBtn');
    const cancelBtn = container.querySelector('#modalCancelBtn');

    // Animation d'apparition
    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        dialog.classList.remove('scale-95', 'opacity-0');
        dialog.classList.add('scale-100', 'opacity-100');
        modal.classList.add('opacity-100');
        cancelBtn.focus(); // Mettre le focus sur annuler par défaut
    });

    const closeModal = () => {
        dialog.classList.remove('scale-100', 'opacity-100');
        dialog.classList.add('scale-95', 'opacity-0');
        modal.classList.remove('opacity-100');
        modal.classList.add('opacity-0');
        setTimeout(() => container.innerHTML = '', 150);
    };

    confirmBtn.onclick = () => { onConfirm(); closeModal(); };
    cancelBtn.onclick = closeModal;
    // Fermer si on clique en dehors de la modale
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal();
    });
     // Fermer avec la touche Echap
    const escapeListener = (event) => {
        if (event.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escapeListener);
        }
    };
    document.addEventListener('keydown', escapeListener);
}

// --- Initialisation du Jeu (Game Initialization) ---
function main() {
    console.log("Études Incrémentales - Initialisation v3.0.0...");
    cacheDOMElements(); // Récupérer les références aux éléments HTML

    // Attacher les écouteurs d'événements principaux
    if (DOMElements['save-button']) DOMElements['save-button'].addEventListener('click', saveGame);
    if (DOMElements['load-button']) DOMElements['load-button'].addEventListener('click', loadGame);
    if (DOMElements['reset-button']) DOMElements['reset-button'].addEventListener('click', confirmAndResetGame);
    if (DOMElements['prestige-button']) DOMElements['prestige-button'].addEventListener('click', executePrestige);
    if (DOMElements['toggle-notation-button']) DOMElements['toggle-notation-button'].addEventListener('click', toggleNotation);

    loadGame(); // Charge la sauvegarde ou initialise avec les valeurs par défaut
    setupTabs(); // Configurer la navigation par onglets

    // Configurer la sauvegarde automatique
    if (game.options && game.options.autosaveInterval > 0) {
        setInterval(saveGame, game.options.autosaveInterval);
        console.log(`Sauvegarde automatique configurée toutes les ${game.options.autosaveInterval/1000} secondes.`);
    }

    // Mettre à jour l'année dans le footer
    if (DOMElements['current-year']) DOMElements['current-year'].textContent = new Date().getFullYear();

    console.log("Jeu initialisé. Démarrage de la boucle principale.");
    lastTick = Date.now(); // Initialiser lastTick avant de démarrer la boucle
    requestAnimationFrame(gameLoop); // Démarrer la boucle de jeu
}

// Lancer l'initialisation après le chargement complet du DOM
window.addEventListener('DOMContentLoaded', main);
