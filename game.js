// game.js

// Utilisation de 'use strict' pour un code plus sûr
"use strict";

// Initialisation de la base de données Firebase (si nécessaire plus tard)
// Pour l'instant, nous utilisons localStorage pour la sauvegarde locale.
// const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
// const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
// let app, db, auth, userId;

// if (firebaseConfig) {
//     try {
//         app = initializeApp(firebaseConfig);
//         db = getFirestore(app);
//         auth = getAuth(app);
//         // setLogLevel('debug'); // Optionnel: pour les logs Firebase
//     } catch (error) {
//         console.error("Erreur d'initialisation de Firebase:", error);
//     }
// } else {
//     console.warn("Configuration Firebase non disponible. Certaines fonctionnalités pourraient être limitées.");
// }

// État du jeu
let game = {
    knowledgePoints: new Decimal(0),
    prestigePoints: new Decimal(0),
    ascensionPoints: new Decimal(0),
    generators: [
        {
            id: 0,
            name: "Lecture",
            baseCost: new Decimal(10),
            costMultiplier: new Decimal(1.15),
            baseProduction: new Decimal(1),
            owned: new Decimal(0),
            productionMultiplier: new Decimal(1), // Multiplicateur pour ce générateur spécifique
        },
        {
            id: 1,
            name: "École",
            baseCost: new Decimal(100),
            costMultiplier: new Decimal(1.20),
            baseProduction: new Decimal(5),
            owned: new Decimal(0),
            productionMultiplier: new Decimal(1),
        },
        {
            id: 2,
            name: "Collège",
            baseCost: new Decimal(1000),
            costMultiplier: new Decimal(1.25),
            baseProduction: new Decimal(25),
            owned: new Decimal(0),
            productionMultiplier: new Decimal(1),
        },
        {
            id: 3,
            name: "Lycée",
            baseCost: new Decimal(10000),
            costMultiplier: new Decimal(1.30),
            baseProduction: new Decimal(125),
            owned: new Decimal(0),
            productionMultiplier: new Decimal(1),
        },
        // Tier 4: Licence (débloqué après 10 Lycées) - Sera géré dynamiquement
    ],
    upgrades: {}, // Sera rempli plus tard
    achievements: {}, // Sera rempli plus tard
    lastUpdate: Date.now(),
    currentNotation: 'scientific', // 'scientific', 'standard', 'engineering', etc.
    settings: {
        autosaveInterval: 30000, // 30 secondes
    }
};

const INFINITY_THRESHOLD = new Decimal("1e308");

// Éléments du DOM
const knowledgePointsEl = document.getElementById('knowledge-points');
const prestigePointsEl = document.getElementById('prestige-points');
const ascensionPointsEl = document.getElementById('ascension-points');
const generatorsContainerEl = document.getElementById('generators-container');
const saveButtonEl = document.getElementById('save-button');
const loadButtonEl = document.getElementById('load-button');
const resetButtonEl = document.getElementById('reset-button');
const saveStatusEl = document.getElementById('save-status');
const prestigeButtonEl = document.getElementById('prestige-button');
const prestigeGainEl = document.getElementById('prestige-gain');
const toggleNotationButtonEl = document.getElementById('toggle-notation-button');
const numberNotationDisplayEl = document.getElementById('number-notation-display');


// --- Fonctions de formatage des nombres ---
function formatNumber(num, notation = game.currentNotation) {
    if (!(num instanceof Decimal)) {
        num = new Decimal(num);
    }
    if (num.isNaN()) return "NaN";
    if (!num.isFinite()) return num.toString(); // Infinity ou -Infinity

    if (num.lt(1000)) {
        return num.toFixed(num.e < 0 ? Math.max(0, -num.e + 1) : 0); // Affiche les décimales pour les petits nombres
    }

    switch (notation) {
        case 'scientific':
            return num.toExponential(2);
        case 'engineering': // Pas directement supporté par break_infinity, on simule ou on utilise scientific
            return num.toExponential(2); // Pour l'instant, utilise scientific
        case 'standard': // Suffixes courts (K, M, B, T, etc.)
            // break_infinity.js ne gère pas les suffixes par défaut.
            // Il faudrait une fonction personnalisée pour cela.
            // Pour l'instant, on utilise la notation scientifique pour les grands nombres.
            if (num.e >= 308) return num.toExponential(2); // Au-delà de ce que les suffixes standards couvrent facilement
            return num.toStringWithDecimalPlaces(2); // Ou une version plus simple pour l'instant
        default:
            return num.toExponential(2);
    }
}

// --- Fonctions des générateurs ---
function getGeneratorCost(generator) {
    // Formule: baseCost * costMultiplier ^ owned
    return generator.baseCost.times(generator.costMultiplier.pow(generator.owned));
}

function getGeneratorProduction(generator) {
    // Formule: baseProduction * owned * productionMultiplier * globalMultipliers
    // Pour l'instant, pas de globalMultipliers
    if (generator.owned.equals(0)) return new Decimal(0);
    return generator.baseProduction.times(generator.owned).times(generator.productionMultiplier);
}

function getTotalKnowledgePerSecond() {
    let totalKPS = new Decimal(0);
    game.generators.forEach(gen => {
        if (gen.owned.gt(0)) { // Seulement si on en possède au moins un
             totalKPS = totalKPS.add(getGeneratorProduction(gen));
        }
    });
    // Appliquer les multiplicateurs globaux (ex: prestige) ici
    if (game.prestigePoints.gt(0)) {
        const prestigeMultiplier = getPrestigeMultiplier();
        totalKPS = totalKPS.times(prestigeMultiplier);
    }
    return totalKPS;
}

function buyGenerator(generatorId) {
    const generator = game.generators.find(g => g.id === generatorId);
    if (!generator) return;

    const cost = getGeneratorCost(generator);
    if (game.knowledgePoints.gte(cost)) {
        game.knowledgePoints = game.knowledgePoints.sub(cost);
        generator.owned = generator.owned.add(1);
        // Déblocage de la Licence après 10 Lycées
        if (generator.name === "Lycée" && generator.owned.equals(10) && !game.generators.find(g => g.name === "Licence")) {
            addLicenceGenerator();
        }
        updateUI();
    }
}

function addLicenceGenerator() {
    if (!game.generators.find(g => g.name === "Licence")) {
        game.generators.push({
            id: game.generators.length, // ID unique
            name: "Licence",
            baseCost: new Decimal(1e7), // Exemple de coût
            costMultiplier: new Decimal(1.35),
            baseProduction: new Decimal(1000), // Exemple de production
            owned: new Decimal(0),
            productionMultiplier: new Decimal(1),
            unlocked: true // Marqueur pour l'UI
        });
        createGeneratorElements(); // Recréer les éléments pour inclure le nouveau
    }
}


// --- Fonctions de Prestige ---
function getPrestigePointsGain() {
    // Formule: floor(sqrt(connaissances / 1e10))
    if (game.knowledgePoints.lt(new Decimal("1e10"))) { // Ou un seuil plus bas pour tester
        return new Decimal(0);
    }
    // Le seuil de prestige est 1e308 dans la roadmap, mais la formule est donnée.
    // On va utiliser la formule pour le gain, mais le bouton ne sera actif qu'à 1e308.
    const gain = game.knowledgePoints.div(new Decimal("1e10")).sqrt().floor();
    return gain.max(0); // S'assurer que le gain n'est pas négatif
}

function getPrestigeMultiplier() {
    // Exemple : Chaque point de prestige donne +10% de production, multiplicatif.
    // (1 + 0.1 * prestigePoints) ou (1.1 ^ prestigePoints)
    // Pour l'instant, un simple multiplicateur additif pour chaque point, puis appliqué multiplicativement.
    // Un bonus de 1% par diplôme, pour commencer simple.
    // (1 + 0.01 * nombre de diplômes)
    if (game.prestigePoints.equals(0)) return new Decimal(1);
    return game.prestigePoints.times(0.01).add(1); // Chaque diplôme ajoute 1% à la production.
}


function canPrestige() {
    return game.knowledgePoints.gte(INFINITY_THRESHOLD);
}

function prestige() {
    if (!canPrestige()) return;

    const gainedPrestigePoints = getPrestigePointsGain();
    if (gainedPrestigePoints.lte(0)) return; // Ne pas prestigier si aucun gain

    game.prestigePoints = game.prestigePoints.add(gainedPrestigePoints);

    // Reset partiel
    game.knowledgePoints = new Decimal(10); // Valeur de départ après prestige
    game.generators.forEach(gen => {
        gen.owned = new Decimal(0);
        // Ne pas réinitialiser les coûts de base ou les multiplicateurs ici,
        // sauf si c'est une mécanique de prestige spécifique.
    });
    // Les générateurs débloqués comme "Licence" devraient être retirés ou leur condition de déblocage réévaluée.
    // Pour l'instant, on les garde mais à 0.
    // Si la Licence doit être redébloquée :
    const licenceIndex = game.generators.findIndex(g => g.name === "Licence");
    if (licenceIndex > -1 && game.generators[licenceIndex].unlocked) {
        // Option 1: Supprimer le générateur
        // game.generators.splice(licenceIndex, 1);
        // Option 2: Le marquer comme non possédé et potentiellement non débloqué (si condition de déblocage reset)
        game.generators[licenceIndex].owned = new Decimal(0);
        // Si la condition de déblocage (ex: 10 Lycées) est reset, il faudra le redébloquer.
    }


    // Les améliorations sont généralement perdues lors du prestige, sauf celles permanentes achetées avec des points de prestige.
    // game.upgrades = {}; // À affiner selon les types d'améliorations.

    game.lastUpdate = Date.now();
    saveGame();
    updateUI();
    createGeneratorElements(); // Recréer les éléments si la liste des générateurs a changé (ex: Licence retirée)
}


// --- Mise à jour de l'UI ---
function updateUI() {
    knowledgePointsEl.textContent = formatNumber(game.knowledgePoints);
    prestigePointsEl.textContent = formatNumber(game.prestigePoints);
    ascensionPointsEl.textContent = formatNumber(game.ascensionPoints);

    game.generators.forEach(generator => {
        const genProdEl = document.getElementById(`gen-${generator.id}-prod`);
        const genOwnedEl = document.getElementById(`gen-${generator.id}-owned`);
        const genCostEl = document.getElementById(`gen-${generator.id}-cost`);
        const buyGenButtonEl = document.getElementById(`buy-gen-${generator.id}`);

        if (genProdEl) genProdEl.textContent = formatNumber(getGeneratorProduction(generator));
        if (genOwnedEl) genOwnedEl.textContent = formatNumber(generator.owned);

        const cost = getGeneratorCost(generator);
        if (genCostEl) genCostEl.textContent = formatNumber(cost);
        if (buyGenButtonEl) buyGenButtonEl.disabled = game.knowledgePoints.lt(cost);
    });

    // Mise à jour du bouton Prestige
    const currentPrestigeGain = getPrestigePointsGain();
    prestigeGainEl.textContent = formatNumber(currentPrestigeGain);
    prestigeButtonEl.disabled = !canPrestige() || currentPrestigeGain.lte(0);
    if (canPrestige()) {
        prestigeButtonEl.classList.remove('disabled:opacity-50');
    } else {
        prestigeButtonEl.classList.add('disabled:opacity-50');
    }


    // Affichage de la notation
    numberNotationDisplayEl.textContent = game.currentNotation.charAt(0).toUpperCase() + game.currentNotation.slice(1);

    // Mise à jour du KPS total (pour l'affichage ou le debug)
    const kpsDisplay = document.getElementById('total-kps'); // Ajouter cet élément dans le HTML si besoin
    if (kpsDisplay) {
        kpsDisplay.textContent = formatNumber(getTotalKnowledgePerSecond());
    }
}

function createGeneratorElements() {
    generatorsContainerEl.innerHTML = ''; // Vider les anciens éléments

    game.generators.forEach(generator => {
        // Ne créer que si le générateur est débloqué (pour les futurs générateurs conditionnels)
        // Pour l'instant, tous les générateurs initiaux sont visibles, et "Licence" si unlocked.
        if (generator.name !== "Licence" || (generator.name === "Licence" && generator.unlocked)) {
            const cost = getGeneratorCost(generator);
            const production = getGeneratorProduction(generator);

            const div = document.createElement('div');
            div.className = 'generator-item p-3 border rounded-md bg-slate-50 shadow-sm';
            div.innerHTML = `
                <div class="flex flex-col sm:flex-row justify-between items-center">
                    <div class="flex-grow">
                        <h4 class="font-semibold text-lg text-sky-700">${generator.name}</h4>
                        <p class="text-sm text-slate-600">Produit: <span id="gen-${generator.id}-prod" class="font-medium">${formatNumber(production)}</span> Connaissance/s</p>
                        <p class="text-sm text-slate-600">Possédés: <span id="gen-${generator.id}-owned" class="font-medium">${formatNumber(generator.owned)}</span></p>
                        <p class="text-sm text-slate-500">Multiplicateur actuel: ${formatNumber(generator.productionMultiplier.times(getPrestigeMultiplier()))}x</p>
                    </div>
                    <button id="buy-gen-${generator.id}" class="mt-2 sm:mt-0 px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-600 transition duration-150 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed">
                        Acheter (Coût: <span id="gen-${generator.id}-cost">${formatNumber(cost)}</span>)
                    </button>
                </div>
            `;
            generatorsContainerEl.appendChild(div);

            const buyButton = document.getElementById(`buy-gen-${generator.id}`);
            buyButton.addEventListener('click', () => buyGenerator(generator.id));
            buyButton.disabled = game.knowledgePoints.lt(cost); // État initial du bouton
        }
    });
}


// --- Sauvegarde et Chargement ---
function saveGame() {
    try {
        // Conversion des Decimal en string pour la sauvegarde
        const gameToSave = JSON.parse(JSON.stringify(game)); // Deep copy
        gameToSave.knowledgePoints = game.knowledgePoints.toString();
        gameToSave.prestigePoints = game.prestigePoints.toString();
        gameToSave.ascensionPoints = game.ascensionPoints.toString();
        gameToSave.generators.forEach(gen => {
            gen.baseCost = gen.baseCost.toString();
            gen.costMultiplier = gen.costMultiplier.toString();
            gen.baseProduction = gen.baseProduction.toString();
            gen.owned = gen.owned.toString();
            gen.productionMultiplier = gen.productionMultiplier.toString();
        });

        localStorage.setItem('etudesIncrementalesSave', JSON.stringify(gameToSave));
        if (saveStatusEl) {
            saveStatusEl.textContent = `Sauvegardé à ${new Date().toLocaleTimeString()}`;
            setTimeout(() => { saveStatusEl.textContent = ''; }, 3000);
        }
        console.log("Jeu sauvegardé !");
    } catch (error) {
        console.error("Erreur lors de la sauvegarde :", error);
        if (saveStatusEl) saveStatusEl.textContent = "Erreur de sauvegarde.";
    }
}

function loadGame() {
    try {
        const savedGame = localStorage.getItem('etudesIncrementalesSave');
        if (savedGame) {
            const parsedGame = JSON.parse(savedGame);

            // Reconversion des strings en Decimal
            game.knowledgePoints = new Decimal(parsedGame.knowledgePoints);
            game.prestigePoints = new Decimal(parsedGame.prestigePoints || 0); // Pour compatibilité avec anciennes sauvegardes
            game.ascensionPoints = new Decimal(parsedGame.ascensionPoints || 0); // Idem

            // Mise à jour des générateurs existants et ajout des nouveaux si la sauvegarde est plus ancienne
            const loadedGenerators = parsedGame.generators;
            game.generators.forEach((defaultGen, index) => {
                const savedGenData = loadedGenerators.find(lg => lg.id === defaultGen.id || lg.name === defaultGen.name); // Recherche par ID ou nom pour flexibilité
                if (savedGenData) {
                    game.generators[index] = {
                        ...defaultGen, // Garde les valeurs par défaut (ex: fonctions ou nouvelles propriétés non sauvegardées)
                        baseCost: new Decimal(savedGenData.baseCost),
                        // costMultiplier est généralement fixe, mais on le charge s'il est sauvegardé
                        costMultiplier: defaultGen.costMultiplier, // Ou new Decimal(savedGenData.costMultiplier) si variable
                        baseProduction: new Decimal(savedGenData.baseProduction),
                        owned: new Decimal(savedGenData.owned),
                        productionMultiplier: new Decimal(savedGenData.productionMultiplier || 1), // Pour compatibilité
                        unlocked: savedGenData.unlocked !== undefined ? savedGenData.unlocked : defaultGen.unlocked, // Pour Licence
                    };
                }
            });

            // Gérer les générateurs qui pourraient avoir été ajoutés au jeu depuis la sauvegarde
            // et qui ne sont pas dans game.generators par défaut (ex: Licence si elle n'est pas dans la config initiale)
            loadedGenerators.forEach(savedGenData => {
                if (!game.generators.find(g => g.id === savedGenData.id || g.name === savedGenData.name)) {
                    // C'est un générateur sauvegardé qui n'existe plus ou a été renommé, ou un nouveau type
                    // Pour l'instant, on l'ignore s'il n'est pas dans la structure actuelle,
                    // sauf pour les générateurs dynamiques comme "Licence"
                    if (savedGenData.name === "Licence" && savedGenData.unlocked) {
                         if (!game.generators.find(g => g.name === "Licence")) {
                            game.generators.push({
                                id: savedGenData.id, // Utiliser l'ID sauvegardé
                                name: "Licence",
                                baseCost: new Decimal(savedGenData.baseCost),
                                costMultiplier: new Decimal(savedGenData.costMultiplier || 1.35), // Valeur par défaut si non sauvegardée
                                baseProduction: new Decimal(savedGenData.baseProduction),
                                owned: new Decimal(savedGenData.owned),
                                productionMultiplier: new Decimal(savedGenData.productionMultiplier || 1),
                                unlocked: true
                            });
                         }
                    }
                }
            });


            game.lastUpdate = parsedGame.lastUpdate ? parseInt(parsedGame.lastUpdate) : Date.now();
            game.currentNotation = parsedGame.currentNotation || 'scientific';
            // Charger les settings etc.

            console.log("Jeu chargé !");
        } else {
            console.log("Aucune sauvegarde trouvée.");
            // Initialiser avec les valeurs par défaut si aucune sauvegarde
            game.lastUpdate = Date.now();
        }
    } catch (error) {
        console.error("Erreur lors du chargement :", error);
        // En cas d'erreur (ex: sauvegarde corrompue), réinitialiser ou informer l'utilisateur
    }
    createGeneratorElements(); // Important pour refléter les générateurs chargés
    updateUI();
}

function resetGame() {
    // Utiliser un modal personnalisé au lieu de confirm()
    showCustomConfirm("Êtes-vous sûr de vouloir réinitialiser toute votre progression ? Cette action est irréversible.", () => {
        localStorage.removeItem('etudesIncrementalesSave');
        // Réinitialiser l'objet game à son état initial
        game.knowledgePoints = new Decimal(0);
        game.prestigePoints = new Decimal(0);
        game.ascensionPoints = new Decimal(0);
        game.generators = [ // Réinitialiser à la liste de base
            { id: 0, name: "Lecture", baseCost: new Decimal(10), costMultiplier: new Decimal(1.15), baseProduction: new Decimal(1), owned: new Decimal(0), productionMultiplier: new Decimal(1) },
            { id: 1, name: "École", baseCost: new Decimal(100), costMultiplier: new Decimal(1.20), baseProduction: new Decimal(5), owned: new Decimal(0), productionMultiplier: new Decimal(1) },
            { id: 2, name: "Collège", baseCost: new Decimal(1000), costMultiplier: new Decimal(1.25), baseProduction: new Decimal(25), owned: new Decimal(0), productionMultiplier: new Decimal(1) },
            { id: 3, name: "Lycée", baseCost: new Decimal(10000), costMultiplier: new Decimal(1.30), baseProduction: new Decimal(125), owned: new Decimal(0), productionMultiplier: new Decimal(1) },
        ];
        game.lastUpdate = Date.now();
        game.currentNotation = 'scientific';
        saveGame(); // Sauvegarde l'état réinitialisé
        createGeneratorElements();
        updateUI();
        console.log("Jeu réinitialisé.");
    });
}

// --- Boucle de jeu principale ---
function gameLoop() {
    const currentTime = Date.now();
    const deltaTime = (currentTime - game.lastUpdate) / 1000; // Delta time en secondes

    // Production hors ligne (simple pour l'instant)
    // Pour une meilleure gestion, calculer la production exacte pendant l'absence.
    // Ici, on ajoute simplement la production basée sur le temps écoulé.
    const offlineProduction = getTotalKnowledgePerSecond().times(deltaTime);
    game.knowledgePoints = game.knowledgePoints.add(offlineProduction);

    game.lastUpdate = currentTime;

    updateUI();

    requestAnimationFrame(gameLoop); // Appel récursif pour la boucle
}

// --- Gestion des onglets ---
function setupTabs() {
    const tabs = document.querySelectorAll('.ui-tab');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Désactiver tous les onglets et panneaux
            tabs.forEach(t => {
                t.classList.remove('active-tab');
                t.setAttribute('aria-selected', 'false');
            });
            tabPanels.forEach(p => p.classList.add('hidden'));

            // Activer l'onglet cliqué et le panneau correspondant
            tab.classList.add('active-tab');
            tab.setAttribute('aria-selected', 'true');
            const targetPanelId = tab.getAttribute('aria-controls');
            document.getElementById(targetPanelId).classList.remove('hidden');
        });
    });
}

// --- Gestion de la notation ---
function toggleNotation() {
    const notations = ['scientific', 'standard']; // Ajoutez 'engineering' si implémenté
    let currentIndex = notations.indexOf(game.currentNotation);
    currentIndex = (currentIndex + 1) % notations.length;
    game.currentNotation = notations[currentIndex];
    updateUI(); // Mettre à jour l'affichage immédiatement
}

// --- Modale de confirmation personnalisée ---
function showCustomConfirm(message, onConfirm) {
    // Supprimer une modale existante si elle existe
    const existingModal = document.getElementById('customConfirmModal');
    if (existingModal) {
        existingModal.remove();
    }

    const modalHTML = `
        <div id="customConfirmModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
            <div class="relative p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
                <div class="mt-3 text-center">
                    <h3 class="text-lg leading-6 font-medium text-gray-900">Confirmation</h3>
                    <div class="mt-2 px-7 py-3">
                        <p class="text-sm text-gray-500">${message}</p>
                    </div>
                    <div class="items-center px-4 py-3">
                        <button id="confirmBtn" class="px-4 py-2 bg-red-500 text-white text-base font-medium rounded-md w-auto shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300">
                            Confirmer
                        </button>
                        <button id="cancelBtn" class="ml-3 px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md w-auto shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300">
                            Annuler
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const confirmBtn = document.getElementById('confirmBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const modal = document.getElementById('customConfirmModal');

    confirmBtn.onclick = () => {
        onConfirm();
        modal.remove();
    };

    cancelBtn.onclick = () => {
        modal.remove();
    };
}


// --- Initialisation du jeu ---
function init() {
    // Attacher les écouteurs d'événements
    if (saveButtonEl) saveButtonEl.addEventListener('click', saveGame);
    if (loadButtonEl) loadButtonEl.addEventListener('click', () => {
        loadGame(); // Charger d'abord
        // createGeneratorElements(); // S'assurer que les éléments sont créés/mis à jour
        // updateUI(); // Puis mettre à jour l'UI
    });
    if (resetButtonEl) resetButtonEl.addEventListener('click', resetGame);
    if (prestigeButtonEl) prestigeButtonEl.addEventListener('click', prestige);
    if (toggleNotationButtonEl) toggleNotationButtonEl.addEventListener('click', toggleNotation);

    // Charger la sauvegarde (si elle existe) ou initialiser
    loadGame(); // loadGame s'occupe de l'initialisation si pas de sauvegarde

    // Créer les éléments HTML pour les générateurs
    createGeneratorElements(); // Appel initial pour afficher les générateurs

    // Mettre en place la gestion des onglets
    setupTabs();

    // Lancer la boucle de jeu
    gameLoop();

    // Sauvegarde automatique
    setInterval(saveGame, game.settings.autosaveInterval);

    console.log("Jeu initialisé et boucle démarrée.");
}

// Lancer l'initialisation après le chargement complet du DOM
window.addEventListener('load', init);
