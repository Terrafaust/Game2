// --- Initialisation Firebase et Authentification ---
let app;
let db;
let auth;
let userId = 'anonymous'; // Valeur par défaut avant authentification
let isAuthReady = false; // Indicateur que l'authentification est prête

// Variables globales fournies par l'environnement Canvas
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Initialiser Firebase et gérer l'authentification
const initFirebase = async () => {
    try {
        // Utilisation des objets globaux de Firebase
        app = firebase.initializeApp(firebaseConfig);
        db = firebase.firestore(); // getFirestore(app)
        auth = firebase.auth(); // getAuth(app)

        // Écouteur de l'état d'authentification
        auth.onAuthStateChanged(async (user) => { // onAuthStateChanged(auth, ...)
            if (user) {
                userId = user.uid;
                console.log("Utilisateur authentifié:", userId);
            } else {
                // Si pas d'utilisateur, et pas de token initial, se connecter anonymement
                if (!initialAuthToken) {
                    await auth.signInAnonymously(); // signInAnonymously(auth)
                    console.log("Connecté anonymement.");
                }
            }
            document.getElementById('user-id').textContent = userId;
            isAuthReady = true; // L'authentification est prête
            loadGame(); // Charger le jeu une fois l'authentification prête
        });

        // Tenter de se connecter avec le token initial si disponible
        if (initialAuthToken) {
            await auth.signInWithCustomToken(initialAuthToken); // signInWithCustomToken(auth, ...)
            console.log("Connecté avec le token personnalisé.");
        } else {
            console.log("Aucun token personnalisé fourni, attente de connexion anonyme.");
        }

    } catch (error) {
        console.error("Erreur d'initialisation Firebase ou d'authentification:", error);
        // Fallback si Firebase ne peut pas être initialisé (ex: pas de config)
        isAuthReady = true; // Permettre au jeu de démarrer sans persistance
        loadGame();
    }
};

// --- Configuration de BigNumber.js ---
// Utilisation de BigNumber pour gérer les très grands nombres
BigNumber.config({ DECIMAL_PLACES: 2, EXPONENTIAL_AT: 1e9 });

// --- État du Jeu ---
let gameState = {
    // Ressources
    bonsPoints: new BigNumber(0),
    bonsPointsPerSecond: new BigNumber(0),
    images: new BigNumber(0),
    professeurs: new BigNumber(0),
    pointsAscension: new BigNumber(0),

    // Constructions
    student: {
        quantity: new BigNumber(0),
        baseCost: new BigNumber(10),
        costMultiplier: new BigNumber(1.15),
        baseBps: new BigNumber(0.5),
        costIncreaseThreshold: 10, // Le coût commence à augmenter après le 10ème
    },
    classe: {
        quantity: new BigNumber(0),
        baseCost: new BigNumber(300),
        costMultiplier: new BigNumber(1.15),
        baseBps: new BigNumber(25),
        costIncreaseThreshold: 10,
    },

    // Achats spéciaux
    imagePurchase: {
        cost: new BigNumber(1000), // Coût fixe
    },
    professorPurchase: {
        quantity: new BigNumber(0),
        fibonacciSequence: [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765, 10946, 17711, 28657, 46368, 75025, 121393, 196418, 317811, 514229, 832040, 1346269, 2178309, 3524578, 5702887, 9227465, 14930352, 24157817, 39088169, 63245986, 102334155], // Pré-calculé pour éviter les calculs coûteux avec BigNumber
        productionMultiplier: new BigNumber(1.5),
    },

    // Ascension
    ascension: {
        totalAscensions: new BigNumber(0),
        primeNumbers: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199], // Jusqu'au 46ème nombre premier
        bonusMultiplier: new BigNumber(1), // Multiplicateur de production BP global
        showAscensionWarning: true,
    },

    // Réglages
    theme: 'light', // 'light' ou 'dark'
    hasBoughtTheme: false,
    multiBuyMode: 1, // 1, 10, 100, 'max'
    hasMultiBuyX10X100: false,
    hasMultiBuyXMax: false,

    // Automatisations
    automateStudent: false,
    automateClass: false,
    automateImage: false,
    automateProfessor: false,
    automationCosts: {
        student: new BigNumber(100),
        classe: new BigNumber(1000),
        image: new BigNumber(10000),
        professor: new BigNumber(100000),
    },

    // Déblocages (palier)
    unlocked: {
        class: false,
        image: false,
        professor: false,
        settings: false,
        ascension: false,
        skills: false, // Débloqué après la première ascension
        multiBuyX10X100Option: false, // Option d'achat dans les réglages
        multiBuyXMaxOption: false, // Option d'achat dans les réglages
        automateStudent: false,
        automateClass: false,
        automateImage: false,
        automateProfessor: false,
    },

    // Compétences (Arbre de compétences)
    skills: {
        // Structure: { id: { level: 0, maxLevel: X, cost: [prof_cost_level1, prof_cost_level2], effect: 'description' } }
        // Les coûts sont en professeurs
        "pedagogie_fondamentale": { level: 0, maxLevel: 1, cost: [1], effect: "Augmente la production des Élèves de 10%.", type: "production", target: "student", value: new BigNumber(0.1) },
        "gestion_de_classe": { level: 0, maxLevel: 2, cost: [2, 4], effect: "Augmente la production des Classes de 15% par niveau.", type: "production", target: "class", value: new BigNumber(0.15) },
        "optimisation_didactique": { level: 0, maxLevel: 1, cost: [3], effect: "Réduit le coût des Élèves de 5%.", type: "cost_reduction", target: "student", value: new BigNumber(0.05) },
        "recherche_avancee": { level: 0, maxLevel: 3, cost: [5, 7, 10], effect: "Augmente le gain de PA de 10% par niveau.", type: "pa_gain", value: new BigNumber(0.1) },
        "innovation_educative": { level: 0, maxLevel: 1, cost: [8], effect: "Réduit le coût des Images de 10%.", type: "cost_reduction", target: "image", value: new BigNumber(0.1) },
        "mentorat_expert": { level: 0, maxLevel: 2, cost: [12, 15], effect: "Augmente la production des Professeurs de 20% par niveau (bonus BP).", type: "production", target: "professor_bp", value: new BigNumber(0.2) },
        "synergie_interdisciplinaire": { level: 0, maxLevel: 1, cost: [18], effect: "Augmente la production totale de BP de 5%.", type: "total_production", value: new BigNumber(0.05) },
        "developpement_continu": { level: 0, maxLevel: 1, cost: [20], effect: "Réduit le seuil d'augmentation de coût des constructions de 1.", type: "cost_threshold", target: "student", value: 1 },
        "maitrise_numerique": { level: 0, maxLevel: 1, cost: [25], effect: "Augmente la vitesse des automatisations de 10%.", type: "automation_speed", value: new BigNumber(0.1) },
        "vision_strategique": { level: 0, maxLevel: 1, cost: [30], effect: "Augmente le bonus d'ascension de 0.01.", type: "ascension_bonus", value: new BigNumber(0.01) },
        "specialisation_pedagogique": { level: 0, maxLevel: 2, cost: [35, 40], effect: "Augmente la production des Élèves et Classes de 5% par niveau.", type: "production", target: "all_buildings", value: new BigNumber(0.05) },
        "expansion_des_connaissances": { level: 0, maxLevel: 1, cost: [45], effect: "Réduit le coût des Professeurs de 5%.", type: "cost_reduction", target: "professor", value: new BigNumber(0.05) },
        "acceleration_cognitive": { level: 0, maxLevel: 1, cost: [50], effect: "Augmente le gain de PA de 20%.", type: "pa_gain", value: new BigNumber(0.2) },
        "perfectionnement_academique": { level: 0, maxLevel: 1, cost: [60], effect: "Augmente la production totale de BP de 10%.", type: "total_production", value: new BigNumber(0.1) },
        "heritage_savant": { level: 0, maxLevel: 1, cost: [70], effect: "Débloque une nouvelle automatisation (si applicable, à définir).", type: "unlock_automation", target: "future_automation" }, // Exemple, à adapter
    },
    // Dépendances de l'arbre de compétences (si une bulle dépend d'une autre)
    skillDependencies: {
        "gestion_de_classe": ["pedagogie_fondamentale"],
        "optimisation_didactique": ["pedagogie_fondamentale"],
        "recherche_avancee": ["gestion_de_classe", "optimisation_didactique"],
        "innovation_educative": ["recherche_avancee"],
        "mentorat_expert": ["recherche_avancee"],
        "synergie_interdisciplinaire": ["innovation_educative", "mentorat_expert"],
        "developpement_continu": ["synergie_interdisciplinaire"],
        "maitrise_numerique": ["synergie_interdisciplinaire"],
        "vision_strategique": ["developpement_continu", "maitrise_numerique"],
        "specialisation_pedagogique": ["vision_strategique"],
        "expansion_des_connaissances": ["specialisation_pedagogique"],
        "acceleration_cognitive": ["expansion_des_connaissances"],
        "perfectionnement_academique": ["acceleration_cognitive"],
        "heritage_savant": ["perfectionnement_academique"],
    }
};

// --- Références aux Éléments du DOM ---
const dom = {
    // Ressources
    bpValue: document.getElementById('bp-value'),
    bpPerSecValue: document.getElementById('bp-per-sec-value'),
    imgValue: document.getElementById('img-value'),
    profValue: document.getElementById('prof-value'),
    paValue: document.getElementById('pa-value'),
    resourceBpDisplay: document.getElementById('resource-bp-display'),
    resourceImgDisplay: document.getElementById('resource-img-display'),
    resourceProfDisplay: document.getElementById('resource-prof-display'),
    resourcePaDisplay: document.getElementById('resource-pa-display'),
    resourceSectionPa: document.getElementById('resource-section-pa'),

    // Boutons de construction/achat
    buyStudent: document.getElementById('buy-student'),
    studentCost: document.getElementById('student-cost'),
    studentQuantity: document.getElementById('student-quantity'),
    studentBps: document.getElementById('student-bps'),
    buyClass: document.getElementById('buy-class'),
    classCost: document.getElementById('class-cost'),
    classQuantity: document.getElementById('class-quantity'),
    classBps: document.getElementById('class-bps'),
    buyImage: document.getElementById('buy-image'),
    imageCost: document.getElementById('image-cost'),
    imageQuantity: document.getElementById('image-quantity'),
    buyProfessor: document.getElementById('buy-professor'),
    professorCost: document.getElementById('professor-cost'),
    professorQuantity: document.getElementById('professor-quantity'),

    // Options d'achat multiple
    multiBuyOptions: document.getElementById('multi-buy-options'),
    buyX1: document.getElementById('buy-x1'),
    buyX10: document.getElementById('buy-x10'),
    buyX100: document.getElementById('buy-x100'),
    buyXMax: document.getElementById('buy-xMax'),
    multiBuyButtons: [], // Rempli dynamiquement

    // Panneaux latéraux
    buildingsSection: document.getElementById('buildings-section'),
    purchasesSection: document.getElementById('purchases-section'),

    // Modals et leurs boutons
    openSettingsModal: document.getElementById('open-settings-modal'),
    settingsModal: document.getElementById('settings-modal'),
    closeSettingsModal: document.getElementById('close-settings-modal'),
    toggleTheme: document.getElementById('toggle-theme'),
    themeOption: document.getElementById('theme-option'),
    themeCost: document.getElementById('theme-cost'),
    multiBuyX10X100Option: document.getElementById('multi-buy-x10-x100-option'),
    buyMultiX10X100: document.getElementById('buy-multi-x10-x100'),
    multiBuyXMaxOption: document.getElementById('multi-buy-xMax-option'),
    buyMultiXMax: document.getElementById('buy-multi-xMax'),

    openAscensionModal: document.getElementById('open-ascension-modal'),
    ascensionModal: document.getElementById('ascension-modal'),
    confirmAscension: document.getElementById('confirm-ascension'),
    cancelAscension: document.getElementById('cancel-ascension'),
    ascensionPaGain: document.getElementById('ascension-pa-gain'),
    ascensionMultiplier: document.getElementById('ascension-multiplier'),
    dontShowAscensionWarning: document.getElementById('dont-show-ascension-warning'),

    openSkillsModal: document.getElementById('open-skills-modal'),
    skillsModal: document.getElementById('skills-modal'),
    closeSkillsModal: document.getElementById('close-skills-modal'),
    skillTreeContainer: document.getElementById('skill-tree-container'),

    // Automatisations
    automateStudentContainer: document.getElementById('automate-student-container'),
    automateStudentCheckbox: document.getElementById('automate-student'),
    automateClassContainer: document.getElementById('automate-class-container'),
    automateClassCheckbox: document.getElementById('automate-class'),
    automateImageContainer: document.getElementById('automate-image-container'),
    automateImageCheckbox: document.getElementById('automate-image'),
    automateProfessorContainer: document.getElementById('automate-professor-container'),
    automateProfessorCheckbox: document.getElementById('automate-professor'),

    // Notifications
    notificationContainer: document.getElementById('notification-container'),
};

// Remplir multiBuyButtons
dom.multiBuyButtons = [dom.buyX1, dom.buyX10, dom.buyX100, dom.buyXMax];

// --- Fonctions Utilitaires ---

/**
 * Formate un nombre BigNumber en notation scientifique ou abrégée.
 * @param {BigNumber} num Le nombre à formater.
 * @returns {string} Le nombre formaté.
 */
function formatNumber(num) {
    if (num.isLessThan(1000000)) { // Moins d'un million, affiche le nombre entier ou avec décimales si pertinent
        return num.toFormat(num.isInteger() ? 0 : 2);
    } else if (num.isLessThan(new BigNumber('1e+9'))) { // Millions
        return num.dividedBy('1e+6').toFormat(2) + 'M';
    } else if (num.isLessThan(new BigNumber('1e+12'))) { // Milliards
        return num.dividedBy('1e+9').toFormat(2) + 'B';
    } else if (num.isLessThan(new BigNumber('1e+15'))) { // Trillions
        return num.dividedBy('1e+12').toFormat(2) + 'T';
    } else if (num.isLessThan(new BigNumber('1e+18'))) { // Quadrillions
        return num.dividedBy('1e+15').toFormat(2) + 'Q';
    }
    // Pour les très grands nombres, utiliser la notation scientifique par défaut de BigNumber
    return num.toExponential(2);
}

/**
 * Affiche une notification temporaire en haut à droite.
 * @param {string} message Le message de la notification.
 * @param {string} type Le type de notification (ex: 'success', 'error', 'info').
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.classList.add('notification');
    if (gameState.theme === 'dark') {
        notification.classList.add('dark-theme');
    }
    // Ajouter des classes spécifiques au type si nécessaire (ex: bg-green-500 pour success)
    if (type === 'success') notification.classList.add('bg-green-600');
    if (type === 'error') notification.classList.add('bg-red-600');

    notification.textContent = message;
    dom.notificationContainer.appendChild(notification);

    // Force le reflow pour l'animation CSS
    notification.offsetWidth;
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
        notification.addEventListener('transitionend', () => {
            notification.remove();
        }, { once: true });
    }, 2000); // Disparaît après 2 secondes
}

/**
 * Ouvre un modal spécifique.
 * @param {HTMLElement} modalElement L'élément du modal à ouvrir.
 */
function openModal(modalElement) {
    modalElement.classList.remove('hidden');
    // Appliquer le thème au modal si nécessaire
    const modalContent = modalElement.querySelector('.modal-content');
    if (gameState.theme === 'dark') {
        modalContent.classList.add('dark-theme');
    } else {
        modalContent.classList.remove('dark-theme');
    }
}

/**
 * Ferme un modal spécifique.
 * @param {HTMLElement} modalElement L'élément du modal à fermer.
 */
function closeModal(modalElement) {
    modalElement.classList.add('hidden');
}

/**
 * Calcule le N-ième nombre de Fibonacci.
 * @param {number} n L'index du nombre de Fibonacci (commence à 0).
 * @returns {BigNumber} Le N-ième nombre de Fibonacci.
 */
function getFibonacci(n) {
    if (n < gameState.professorPurchase.fibonacciSequence.length) {
        return new BigNumber(gameState.professorPurchase.fibonacciSequence[n]);
    }
    // Calculer les nombres de Fibonacci au-delà de la séquence pré-calculée
    let a = new BigNumber(gameState.professorPurchase.fibonacciSequence[gameState.professorPurchase.fibonacciSequence.length - 2]);
    let b = new BigNumber(gameState.professorPurchase.fibonacciSequence[gameState.professorPurchase.fibonacciSequence.length - 1]);
    for (let i = gameState.professorPurchase.fibonacciSequence.length; i <= n; i++) {
        let next = a.plus(b);
        a = b;
        b = next;
        gameState.professorPurchase.fibonacciSequence.push(next.toNumber()); // Stocker pour référence future si nécessaire, mais attention à la taille du tableau
    }
    return b;
}

/**
 * Calcule le N-ième nombre premier.
 * @param {number} n L'index du nombre premier (commence à 0).
 * @returns {BigNumber} Le N-ième nombre premier.
 */
function getPrimeNumber(n) {
    if (n < gameState.ascension.primeNumbers.length) {
        return new BigNumber(gameState.ascension.primeNumbers[n]);
    }
    // Si n est trop grand, cela nécessiterait un calcul lourd.
    // Pour l'instant, on se limite à la liste pré-calculée.
    console.warn(`Le nombre premier à l'index ${n} n'est pas pré-calculé.`);
    return new BigNumber(0); // Ou gérer une erreur/un fallback
}

// --- Fonctions de Calcul des Coûts et Productions ---

/**
 * Calcule le coût d'une construction ou d'un achat.
 * @param {Object} item L'objet de la construction/achat (ex: gameState.student).
 * @param {BigNumber} baseCost Le coût de base de l'élément.
 * @param {BigNumber} currentQuantity La quantité actuelle possédée de l'élément.
 * @param {BigNumber} costMultiplier Le multiplicateur de coût par achat.
 * @param {number} costIncreaseThreshold Le seuil à partir duquel le coût augmente.
 * @param {BigNumber} quantityToBuy La quantité que l'on souhaite acheter.
 * @returns {BigNumber} Le coût total pour la quantité spécifiée.
 */
function calculateCost(item, baseCost, currentQuantity, costMultiplier, costIncreaseThreshold, quantityToBuy) {
    let totalCost = new BigNumber(0);
    let currentQ = currentQuantity;

    // Appliquer les réductions de coût des compétences
    let finalBaseCost = new BigNumber(baseCost);
    if (item === gameState.student && gameState.unlocked.skills) {
        const skill = gameState.skills["optimisation_didactique"];
        if (skill.level > 0) {
            finalBaseCost = finalBaseCost.multipliedBy(new BigNumber(1).minus(skill.value));
        }
    }
    if (item === gameState.imagePurchase && gameState.unlocked.skills) {
        const skill = gameState.skills["innovation_educative"];
        if (skill.level > 0) {
            finalBaseCost = finalBaseCost.multipliedBy(new BigNumber(1).minus(skill.value));
        }
    }
    if (item === gameState.professorPurchase && gameState.unlocked.skills) {
        const skill = gameState.skills["expansion_des_connaissances"];
        if (skill.level > 0) {
            finalBaseCost = finalBaseCost.multipliedBy(new BigNumber(1).minus(skill.value));
        }
    }


    for (let i = 0; i < quantityToBuy.toNumber(); i++) {
        let cost;
        if (currentQ.plus(i).isGreaterThanOrEqualTo(costIncreaseThreshold)) {
            // Le coût augmente après le seuil
            cost = finalBaseCost.multipliedBy(costMultiplier.pow(currentQ.plus(i).minus(costIncreaseThreshold)));
        } else {
            cost = finalBaseCost;
        }
        totalCost = totalCost.plus(cost);
    }
    return totalCost;
}


/**
 * Calcule la production de BP par seconde pour une construction donnée.
 * @param {Object} item L'objet de la construction (ex: gameState.student).
 * @returns {BigNumber} La production totale de BP/s pour cette construction.
 */
function calculateBuildingBps(item) {
    let production = item.quantity.multipliedBy(item.baseBps);

    // Appliquer les bonus des compétences
    if (gameState.unlocked.skills) {
        if (item === gameState.student) {
            const skill = gameState.skills["pedagogie_fondamentale"];
            if (skill.level > 0) {
                production = production.multipliedBy(new BigNumber(1).plus(skill.value));
            }
        } else if (item === gameState.classe) {
            const skill = gameState.skills["gestion_de_classe"];
            if (skill.level > 0) {
                production = production.multipliedBy(new BigNumber(1).plus(skill.value.multipliedBy(skill.level)));
            }
        }
        // Compétence qui affecte toutes les constructions
        const allBuildingsSkill = gameState.skills["specialisation_pedagogique"];
        if (allBuildingsSkill.level > 0) {
            production = production.multipliedBy(new BigNumber(1).plus(allBuildingsSkill.value.multipliedBy(allBuildingsSkill.level)));
        }
    }
    return production;
}

/**
 * Met à jour le total des bons points par seconde.
 */
function updateBps() {
    let totalBps = new BigNumber(0);

    // Production des Élèves
    totalBps = totalBps.plus(calculateBuildingBps(gameState.student));

    // Production des Classes
    totalBps = totalBps.plus(calculateBuildingBps(gameState.classe));

    // Multiplicateur des Professeurs
    let professorMultiplier = gameState.professorPurchase.productionMultiplier.pow(gameState.professeurs);
    // Appliquer le bonus de compétence des professeurs
    if (gameState.unlocked.skills) {
        const skill = gameState.skills["mentorat_expert"];
        if (skill.level > 0) {
            professorMultiplier = professorMultiplier.multipliedBy(new BigNumber(1).plus(skill.value.multipliedBy(skill.level)));
        }
    }
    totalBps = totalBps.multipliedBy(professorMultiplier);

    // Multiplicateur d'Ascension
    totalBps = totalBps.multipliedBy(gameState.ascension.bonusMultiplier);

    // Multiplicateur de compétence de production totale
    if (gameState.unlocked.skills) {
        const skillTotalProd1 = gameState.skills["synergie_interdisciplinaire"];
        if (skillTotalProd1.level > 0) {
            totalBps = totalBps.multipliedBy(new BigNumber(1).plus(skillTotalProd1.value));
        }
        const skillTotalProd2 = gameState.skills["perfectionnement_academique"];
        if (skillTotalProd2.level > 0) {
            totalBps = totalBps.multipliedBy(new BigNumber(1).plus(skillTotalProd2.value));
        }
    }

    gameState.bonsPointsPerSecond = totalBps;
}

// --- Fonctions de Mise à Jour de l'Interface Utilisateur (UI) ---

/**
 * Met à jour l'affichage de toutes les ressources.
 */
function updateResourceDisplay() {
    dom.bpValue.textContent = formatNumber(gameState.bonsPoints);
    dom.bpPerSecValue.textContent = formatNumber(gameState.bonsPointsPerSecond);
    dom.imgValue.textContent = formatNumber(gameState.images);
    dom.profValue.textContent = formatNumber(gameState.professeurs);
    dom.paValue.textContent = formatNumber(gameState.pointsAscension);

    // Afficher les ressources si débloquées
    if (gameState.bonsPoints.isGreaterThan(0) || gameState.student.quantity.isGreaterThan(0)) {
        dom.resourceBpDisplay.classList.remove('hidden');
    }
    if (gameState.images.isGreaterThan(0) || gameState.unlocked.image) {
        dom.resourceImgDisplay.classList.remove('hidden');
    }
    if (gameState.professeurs.isGreaterThan(0) || gameState.unlocked.professor) {
        dom.resourceProfDisplay.classList.remove('hidden');
    }
    if (gameState.pointsAscension.isGreaterThan(0) || gameState.ascension.totalAscensions.isGreaterThan(0)) {
        dom.resourceSectionPa.classList.remove('hidden');
    }
}

/**
 * Met à jour l'affichage des boutons d'achat (coût, quantité, état).
 */
function updateButtonDisplay() {
    // Élève
    const studentCost = calculateCost(gameState.student, gameState.student.baseCost, gameState.student.quantity, gameState.student.costMultiplier, gameState.student.costIncreaseThreshold, new BigNumber(gameState.multiBuyMode === 'max' ? 1 : gameState.multiBuyMode));
    dom.studentCost.textContent = formatNumber(studentCost);
    dom.studentQuantity.textContent = formatNumber(gameState.student.quantity);
    dom.studentBps.textContent = formatNumber(calculateBuildingBps(gameState.student));
    updateButtonState(dom.buyStudent, gameState.bonsPoints.isGreaterThanOrEqualTo(studentCost));

    // Classe
    if (gameState.unlocked.class) {
        dom.buyClass.classList.remove('hidden');
        const classCost = calculateCost(gameState.classe, gameState.classe.baseCost, gameState.classe.quantity, gameState.classe.costMultiplier, gameState.classe.costIncreaseThreshold, new BigNumber(gameState.multiBuyMode === 'max' ? 1 : gameState.multiBuyMode));
        dom.classCost.textContent = formatNumber(classCost);
        dom.classQuantity.textContent = formatNumber(gameState.classe.quantity);
        dom.classBps.textContent = formatNumber(calculateBuildingBps(gameState.classe));
        updateButtonState(dom.buyClass, gameState.bonsPoints.isGreaterThanOrEqualTo(classCost));
    }

    // Image
    if (gameState.unlocked.image) {
        dom.buyImage.classList.remove('hidden');
        const imageCost = gameState.imagePurchase.cost.multipliedBy(new BigNumber(gameState.multiBuyMode === 'max' ? 1 : gameState.multiBuyMode));
        dom.imageCost.textContent = formatNumber(imageCost);
        dom.imageQuantity.textContent = formatNumber(gameState.images);
        updateButtonState(dom.buyImage, gameState.bonsPoints.isGreaterThanOrEqualTo(imageCost));
    }

    // Professeur
    if (gameState.unlocked.professor) {
        dom.buyProfessor.classList.remove('hidden');
        let professorCost;
        if (gameState.multiBuyMode === 'max') {
            // Pour xMax, le coût est calculé pour 1, la logique d'achat gérera le max
            professorCost = getFibonacci(gameState.professorPurchase.quantity.toNumber());
        } else {
            professorCost = getFibonacci(gameState.professorPurchase.quantity.toNumber() + gameState.multiBuyMode - 1);
        }
        // Appliquer la réduction de coût des compétences
        if (gameState.unlocked.skills) {
            const skill = gameState.skills["expansion_des_connaissances"];
            if (skill.level > 0) {
                professorCost = professorCost.multipliedBy(new BigNumber(1).minus(skill.value));
            }
        }
        dom.professorCost.textContent = formatNumber(professorCost);
        dom.professorQuantity.textContent = formatNumber(gameState.professorPurchase.quantity);
        updateButtonState(dom.buyProfessor, gameState.images.isGreaterThanOrEqualTo(professorCost));
    }

    // Mettre à jour l'état des boutons d'achat multiple
    dom.multiBuyButtons.forEach(button => {
        if (button.dataset.buyMode == gameState.multiBuyMode) {
            button.classList.add('active-buy-mode', 'bg-blue-500', 'text-white');
            button.classList.remove('bg-gray-300', 'text-gray-800');
        } else {
            button.classList.remove('active-buy-mode', 'bg-blue-500', 'text-white');
            button.classList.add('bg-gray-300', 'text-gray-800');
        }
    });

    // Mettre à jour l'affichage des automatisations
    if (gameState.unlocked.automateStudent) dom.automateStudentContainer.classList.remove('hidden');
    if (gameState.unlocked.automateClass) dom.automateClassContainer.classList.remove('hidden');
    if (gameState.unlocked.automateImage) dom.automateImageContainer.classList.remove('hidden');
    if (gameState.unlocked.automateProfessor) dom.automateProfessorContainer.classList.remove('hidden');

    dom.automateStudentCheckbox.checked = gameState.automateStudent;
    dom.automateClassCheckbox.checked = gameState.automateClass;
    dom.automateImageCheckbox.checked = gameState.automateImage;
    dom.automateProfessorCheckbox.checked = gameState.automateProfessor;

    // Mettre à jour l'état des boutons de réglages
    if (gameState.unlocked.settings) {
        dom.openSettingsModal.classList.remove('hidden');
    }
    if (gameState.unlocked.ascension) {
        dom.openAscensionModal.classList.remove('hidden');
    }
    if (gameState.unlocked.skills) {
        dom.openSkillsModal.classList.remove('hidden');
    }
}

/**
 * Met à jour l'état visuel d'un bouton (achetable/non achetable).
 * @param {HTMLElement} button L'élément bouton.
 * @param {boolean} canAfford Indique si l'achat est possible.
 */
function updateButtonState(button, canAfford) {
    if (canAfford) {
        button.classList.add('can-afford');
        button.classList.remove('cannot-afford');
    } else {
        button.classList.add('cannot-afford');
        button.classList.remove('can-afford');
    }
    // Appliquer le thème
    if (gameState.theme === 'dark') {
        button.classList.add('dark-theme');
    } else {
        button.classList.remove('dark-theme');
    }
}

/**
 * Met à jour le thème (jour/nuit) de l'interface.
 */
function updateTheme() {
    if (gameState.theme === 'dark') {
        document.body.classList.add('dark-theme');
        dom.settingsModal.querySelector('.modal-content').classList.add('dark-theme');
        dom.ascensionModal.querySelector('.modal-content').classList.add('dark-theme');
        dom.skillsModal.querySelector('.modal-content').classList.add('dark-theme');
        // Appliquer le thème aux asides
        document.querySelectorAll('aside').forEach(aside => {
            aside.classList.add('dark:bg-gray-900', 'dark:text-gray-200');
            aside.classList.remove('bg-gray-100');
        });
        // Appliquer le thème à la zone de contenu centrale
        dom.gameContent.classList.add('dark:bg-gray-800');
        // Appliquer le thème aux options d'achat multiple
        dom.multiBuyOptions.classList.add('dark:bg-gray-700');
        // Appliquer le thème aux séparateurs
        document.querySelectorAll('hr').forEach(hr => hr.classList.add('dark:border-gray-700'));
        // Appliquer le thème aux options de réglages
        dom.themeOption.classList.add('dark:bg-gray-700');
        dom.multiBuyX10X100Option.classList.add('dark:bg-gray-700');
        dom.multiBuyXMaxOption.classList.add('dark:bg-gray-700');
    } else {
        document.body.classList.remove('dark-theme');
        dom.settingsModal.querySelector('.modal-content').classList.remove('dark-theme');
        dom.ascensionModal.querySelector('.modal-content').classList.remove('dark-theme');
        dom.skillsModal.querySelector('.modal-content').classList.remove('dark-theme');
        // Retirer le thème des asides
        document.querySelectorAll('aside').forEach(aside => {
            aside.classList.remove('dark:bg-gray-900', 'dark:text-gray-200');
            aside.classList.add('bg-gray-100');
        });
        // Retirer le thème de la zone de contenu centrale
        dom.gameContent.classList.remove('dark:bg-gray-800');
        // Retirer le thème des options d'achat multiple
        dom.multiBuyOptions.classList.remove('dark:bg-gray-700');
        // Retirer le thème des séparateurs
        document.querySelectorAll('hr').forEach(hr => hr.classList.remove('dark:border-gray-700'));
        // Retirer le thème des options de réglages
        dom.themeOption.classList.remove('dark:bg-gray-700');
        dom.multiBuyX10X100Option.classList.remove('dark:bg-gray-700');
        dom.multiBuyXMaxOption.classList.remove('dark:bg-gray-700');
    }
    // Mettre à jour l'état des boutons pour le thème
    updateButtonDisplay();
}

/**
 * Met à jour l'affichage de l'arbre de compétences.
 */
function updateSkillTreeDisplay() {
    dom.skillTreeContainer.innerHTML = ''; // Nettoyer l'arbre existant
    const skills = Object.keys(gameState.skills);

    skills.forEach(skillId => {
        const skill = gameState.skills[skillId];
        const canUnlock = canAffordSkill(skillId);
        const isMaxLevel = skill.level >= skill.maxLevel;
        const isUnlocked = isSkillUnlockedByDependencies(skillId);

        const skillDiv = document.createElement('div');
        skillDiv.classList.add('relative', 'p-4', 'rounded-lg', 'shadow-md', 'text-center', 'cursor-pointer', 'transition-all', 'duration-200', 'ease-in-out');
        skillDiv.classList.add(gameState.theme === 'dark' ? 'bg-gray-700' : 'bg-white');

        if (!isUnlocked) {
            skillDiv.classList.add('opacity-50', 'cursor-not-allowed');
            skillDiv.innerHTML = `<span class="text-lg font-semibold text-gray-500">Verrouillé</span>`;
        } else if (isMaxLevel) {
            skillDiv.classList.add('border-4', 'border-yellow-500');
            skillDiv.innerHTML = `
                <span class="text-lg font-semibold">${skillId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                <span class="block text-sm text-gray-400">Niveau Max</span>
            `;
        } else if (canUnlock) {
            skillDiv.classList.add('border-4', 'border-green-500', 'hover:bg-green-100');
            skillDiv.innerHTML = `
                <span class="text-lg font-semibold">${skillId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                <span class="block text-sm text-gray-500">Coût: ${skill.cost[skill.level]} P</span>
                <span class="block text-sm text-gray-500">Niveau ${skill.level}/${skill.maxLevel}</span>
            `;
            skillDiv.dataset.skillId = skillId;
            skillDiv.addEventListener('click', () => buySkill(skillId));
        } else {
            skillDiv.classList.add('border-4', 'border-red-500', 'cursor-not-allowed');
            skillDiv.innerHTML = `
                <span class="text-lg font-semibold">${skillId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                <span class="block text-sm text-gray-500">Coût: ${skill.cost[skill.level]} P</span>
                <span class="block text-sm text-gray-500">Niveau ${skill.level}/${skill.maxLevel}</span>
            `;
        }

        // Description en hover
        const descriptionSpan = document.createElement('span');
        descriptionSpan.classList.add('absolute', 'bottom-full', 'left-1/2', '-translate-x-1/2', 'mb-2', 'bg-gray-800', 'text-white', 'text-xs', 'p-2', 'rounded-md', 'opacity-0', 'group-hover:opacity-100', 'transition-opacity', 'duration-200', 'whitespace-nowrap', 'pointer-events-none');
        descriptionSpan.textContent = skill.effect;
        skillDiv.classList.add('group'); // Pour le hover
        skillDiv.appendChild(descriptionSpan);

        dom.skillTreeContainer.appendChild(skillDiv);
    });
}

// --- Fonctions de Logique du Jeu ---

/**
 * Gère l'achat d'une construction ou d'un achat.
 * @param {string} type Le type d'élément à acheter ('student', 'class', 'image', 'professor').
 */
function buyItem(type) {
    let item;
    let currentResource;
    let costResource;
    let costMultiplier = new BigNumber(1);
    let quantityToBuy = new BigNumber(gameState.multiBuyMode);

    switch (type) {
        case 'student':
            item = gameState.student;
            currentResource = gameState.bonsPoints;
            costResource = 'bonsPoints';
            break;
        case 'class':
            item = gameState.classe;
            currentResource = gameState.bonsPoints;
            costResource = 'bonsPoints';
            break;
        case 'image':
            item = gameState.imagePurchase;
            currentResource = gameState.bonsPoints;
            costResource = 'bonsPoints';
            break;
        case 'professor':
            item = gameState.professorPurchase;
            currentResource = gameState.images;
            costResource = 'images';
            break;
        default:
            return;
    }

    let actualCost;
    if (type === 'professor') {
        if (gameState.multiBuyMode === 'max') {
            quantityToBuy = new BigNumber(0);
            let tempProfQuantity = item.quantity;
            let tempCost = getFibonacci(tempProfQuantity.toNumber());
            let currentImages = gameState.images;

            while (currentImages.isGreaterThanOrEqualTo(tempCost)) {
                currentImages = currentImages.minus(tempCost);
                tempProfQuantity = tempProfQuantity.plus(1);
                quantityToBuy = quantityToBuy.plus(1);
                tempCost = getFibonacci(tempProfQuantity.toNumber());
            }
            actualCost = gameState.images.minus(currentImages); // Coût total de tous les professeurs achetés
        } else {
            actualCost = new BigNumber(0);
            for (let i = 0; i < quantityToBuy.toNumber(); i++) {
                actualCost = actualCost.plus(getFibonacci(item.quantity.plus(i).toNumber()));
            }
        }
        // Appliquer la réduction de coût des compétences pour les professeurs
        if (gameState.unlocked.skills) {
            const skill = gameState.skills["expansion_des_connaissances"];
            if (skill.level > 0) {
                actualCost = actualCost.multipliedBy(new BigNumber(1).minus(skill.value));
            }
        }
    } else if (type === 'image') {
        actualCost = item.cost.multipliedBy(quantityToBuy);
        // Appliquer la réduction de coût des compétences pour les images
        if (gameState.unlocked.skills) {
            const skill = gameState.skills["innovation_educative"];
            if (skill.level > 0) {
                actualCost = actualCost.multipliedBy(new BigNumber(1).minus(skill.value));
            }
        }
    } else { // Student or Class
        if (gameState.multiBuyMode === 'max') {
            quantityToBuy = new BigNumber(0);
            let tempQuantity = item.quantity;
            let tempCost = calculateCost(item, item.baseCost, tempQuantity, item.costMultiplier, item.costIncreaseThreshold, new BigNumber(1));
            let currentBonsPoints = gameState.bonsPoints;

            while (currentBonsPoints.isGreaterThanOrEqualTo(tempCost)) {
                currentBonsPoints = currentBonsPoints.minus(tempCost);
                tempQuantity = tempQuantity.plus(1);
                quantityToBuy = quantityToBuy.plus(1);
                tempCost = calculateCost(item, item.baseCost, tempQuantity, item.costMultiplier, item.costIncreaseThreshold, new BigNumber(1));
            }
            actualCost = gameState.bonsPoints.minus(currentBonsPoints); // Coût total de toutes les unités achetées
        } else {
            actualCost = calculateCost(item, item.baseCost, item.quantity, item.costMultiplier, item.costIncreaseThreshold, quantityToBuy);
        }
    }

    if (currentResource.isGreaterThanOrEqualTo(actualCost)) {
        gameState[costResource] = gameState[costResource].minus(actualCost);
        if (type === 'student' || type === 'class') {
            item.quantity = item.quantity.plus(quantityToBuy);
        } else if (type === 'image') {
            gameState.images = gameState.images.plus(quantityToBuy);
        } else if (type === 'professor') {
            item.quantity = item.quantity.plus(quantityToBuy);
        }
        updateBps();
        updateUI();
        showNotification(`${formatNumber(quantityToBuy)} ${type} acheté(s)!`, 'success');
        saveGame(); // Sauvegarder après chaque achat important
    } else {
        showNotification(`Pas assez de ${costResource} pour acheter ${formatNumber(quantityToBuy)} ${type}(s).`, 'error');
    }
}

/**
 * Met à jour l'état du jeu en fonction des déblocages.
 */
function checkUnlocks() {
    // Débloquer Classe
    if (gameState.bonsPoints.isGreaterThanOrEqualTo(300) && !gameState.unlocked.class) {
        gameState.unlocked.class = true;
        showNotification("Nouvelle construction débloquée : Classe !", 'info');
    }

    // Débloquer Images
    if (gameState.bonsPoints.isGreaterThanOrEqualTo(1000) && !gameState.unlocked.image) {
        gameState.unlocked.image = true;
        showNotification("Nouvelle ressource débloquée : Images !", 'info');
    }

    // Débloquer Professeurs (après la première image)
    if (gameState.images.isGreaterThanOrEqualTo(1) && !gameState.unlocked.professor) {
        gameState.unlocked.professor = true;
        showNotification("Nouvel achat débloqué : Professeurs !", 'info');
    }

    // Débloquer Réglages (après la première image)
    if (gameState.images.isGreaterThanOrEqualTo(1) && !gameState.unlocked.settings) {
        gameState.unlocked.settings = true;
        showNotification("Menu 'Réglages' débloqué !", 'info');
    }

    // Débloquer Ascension (après 5 professeurs)
    if (gameState.professeurs.isGreaterThanOrEqualTo(5) && !gameState.unlocked.ascension) {
        gameState.unlocked.ascension = true;
        showNotification("Mécanique d'Ascension débloquée !", 'info');
    }

    // Débloquer Compétences (après la première ascension)
    if (gameState.ascension.totalAscensions.isGreaterThan(0) && !gameState.unlocked.skills) {
        gameState.unlocked.skills = true;
        showNotification("Menu 'Compétences' débloqué : Arbre de Compétences !", 'info');
    }

    // Débloquer les options d'achat multiple dans les réglages
    if (gameState.pointsAscension.isGreaterThanOrEqualTo(10) && !gameState.unlocked.multiBuyX10X100Option) {
        gameState.unlocked.multiBuyX10X100Option = true;
        showNotification("Option 'Achat multiple x10 et x100' disponible dans les Réglages !", 'info');
    }
    if (gameState.pointsAscension.isGreaterThanOrEqualTo(100) && !gameState.unlocked.multiBuyXMaxOption) {
        gameState.unlocked.multiBuyXMaxOption = true;
        showNotification("Option 'Achat multiple xMax' disponible dans les Réglages !", 'info');
    }

    // Débloquer les automatisations
    if (gameState.pointsAscension.isGreaterThanOrEqualTo(gameState.automationCosts.student) && !gameState.unlocked.automateStudent) {
        dom.automateStudentContainer.classList.remove('hidden');
    }
    if (gameState.pointsAscension.isGreaterThanOrEqualTo(gameState.automationCosts.classe) && !gameState.unlocked.automateClass) {
        dom.automateClassContainer.classList.remove('hidden');
    }
    if (gameState.pointsAscension.isGreaterThanOrEqualTo(gameState.automationCosts.image) && !gameState.unlocked.automateImage) {
        dom.automateImageContainer.classList.remove('hidden');
    }
    if (gameState.pointsAscension.isGreaterThanOrEqualTo(gameState.automationCosts.professor) && !gameState.unlocked.automateProfessor) {
        dom.automateProfessorContainer.classList.remove('hidden');
    }
}

/**
 * Gère la logique d'ascension.
 */
function performAscension() {
    // Calculer le gain de PA
    const professorsCount = gameState.professeurs.toNumber();
    let paGain = new BigNumber(0);
    if (professorsCount > 0) {
        paGain = getPrimeNumber(professorsCount - 1); // N-ième professeur donne le N-ième nombre premier de PA
        // Appliquer le bonus de compétence au gain de PA
        if (gameState.unlocked.skills) {
            const skill1 = gameState.skills["recherche_avancee"];
            if (skill1.level > 0) {
                paGain = paGain.multipliedBy(new BigNumber(1).plus(skill1.value.multipliedBy(skill1.level)));
            }
            const skill2 = gameState.skills["acceleration_cognitive"];
            if (skill2.level > 0) {
                paGain = paGain.multipliedBy(new BigNumber(1).plus(skill2.value));
            }
        }
    }


    // Calculer le nouveau multiplicateur de bonus
    const currentBonus = gameState.ascension.bonusMultiplier;
    let newBonusValue = new BigNumber(1).plus(new BigNumber(professorsCount).multipliedBy(gameState.ascension.totalAscensions.plus(1)).multipliedBy(0.05));
    // Appliquer le bonus de compétence au multiplicateur d'ascension
    if (gameState.unlocked.skills) {
        const skill = gameState.skills["vision_strategique"];
        if (skill.level > 0) {
            newBonusValue = newBonusValue.plus(skill.value);
        }
    }

    // Mettre à jour l'état du jeu pour l'ascension
    gameState.pointsAscension = gameState.pointsAscension.plus(paGain);
    gameState.ascension.totalAscensions = gameState.ascension.totalAscensions.plus(1);
    gameState.ascension.bonusMultiplier = newBonusValue;

    // Réinitialiser le jeu (perte des ressources, constructions, etc.)
    gameState.bonsPoints = new BigNumber(0);
    gameState.bonsPointsPerSecond = new BigNumber(0);
    gameState.images = new BigNumber(0);
    gameState.professeurs = new BigNumber(0);

    gameState.student.quantity = new BigNumber(0);
    gameState.classe.quantity = new BigNumber(0);
    gameState.professorPurchase.quantity = new BigNumber(0);

    // Réinitialiser les déblocages liés à la progression normale
    gameState.unlocked.class = false;
    gameState.unlocked.image = false;
    gameState.unlocked.professor = false;
    gameState.unlocked.settings = false; // Les réglages se débloquent à nouveau avec la première image
    gameState.unlocked.ascension = false; // L'ascension se débloque à nouveau au 5ème professeur

    // Réinitialiser les automatisations (elles doivent être rachetées)
    gameState.automateStudent = false;
    gameState.automateClass = false;
    gameState.automateImage = false;
    gameState.automateProfessor = false;
    dom.automateStudentCheckbox.checked = false;
    dom.automateClassCheckbox.checked = false;
    dom.automateImageCheckbox.checked = false;
    dom.automateProfessorCheckbox.checked = false;
    dom.automateStudentContainer.classList.add('hidden');
    dom.automateClassContainer.classList.add('hidden');
    dom.automateImageContainer.classList.add('hidden');
    dom.automateProfessorContainer.classList.add('hidden');

    // Cacher les options d'achat multiple si elles n'ont pas été rachetées avec PA
    if (!gameState.hasMultiBuyX10X100) dom.multiBuyX10X100Option.classList.add('hidden');
    if (!gameState.hasMultiBuyXMax) dom.multiBuyXMaxOption.classList.add('hidden');

    // Réinitialiser le mode d'achat à x1
    gameState.multiBuyMode = 1;
    dom.buyX1.click(); // Simuler un clic pour mettre à jour l'UI

    updateBps();
    updateUI();
    saveGame();
    closeModal(dom.ascensionModal);
    showNotification(`Ascension réussie ! Vous avez gagné ${formatNumber(paGain)} PA et votre multiplicateur est maintenant de ${formatNumber(newBonusValue)}x.`, 'success');
}

/**
 * Vérifie si une compétence peut être achetée.
 * @param {string} skillId L'ID de la compétence.
 * @returns {boolean} Vrai si la compétence peut être achetée.
 */
function canAffordSkill(skillId) {
    const skill = gameState.skills[skillId];
    if (!skill || skill.level >= skill.maxLevel) return false;

    const cost = skill.cost[skill.level];
    return gameState.professeurs.isGreaterThanOrEqualTo(cost) && isSkillUnlockedByDependencies(skillId);
}

/**
 * Vérifie si les dépendances d'une compétence sont remplies.
 * @param {string} skillId L'ID de la compétence.
 * @returns {boolean} Vrai si toutes les dépendances sont débloquées.
 */
function isSkillUnlockedByDependencies(skillId) {
    const dependencies = gameState.skillDependencies[skillId];
    if (!dependencies) return true; // Pas de dépendances

    for (const depId of dependencies) {
        if (!gameState.skills[depId] || gameState.skills[depId].level === 0) {
            return false; // Une dépendance n'est pas débloquée
        }
    }
    return true;
}

/**
 * Achète une compétence.
 * @param {string} skillId L'ID de la compétence à acheter.
 */
function buySkill(skillId) {
    const skill = gameState.skills[skillId];
    if (!skill || skill.level >= skill.maxLevel) {
        showNotification("Cette compétence est déjà au niveau maximum.", 'error');
        return;
    }

    if (!isSkillUnlockedByDependencies(skillId)) {
        showNotification("Vous devez débloquer les compétences précédentes avant d'acheter celle-ci.", 'error');
        return;
    }

    const cost = new BigNumber(skill.cost[skill.level]);
    if (gameState.professeurs.isGreaterThanOrEqualTo(cost)) {
        gameState.professeurs = gameState.professeurs.minus(cost);
        skill.level++;
        updateBps(); // Les compétences peuvent affecter la production
        updateUI();
        updateSkillTreeDisplay(); // Mettre à jour l'affichage de l'arbre
        saveGame();
        showNotification(`Compétence '${skillId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}' améliorée au niveau ${skill.level}!`, 'success');
    } else {
        showNotification(`Pas assez de Professeurs pour acheter cette compétence. Coût: ${formatNumber(cost)} P.`, 'error');
    }
}

/**
 * Gère l'automatisation des achats.
 */
function handleAutomations() {
    // Appliquer le bonus de vitesse d'automatisation
    let automationSpeedMultiplier = new BigNumber(1);
    if (gameState.unlocked.skills) {
        const skill = gameState.skills["maitrise_numerique"];
        if (skill.level > 0) {
            automationSpeedMultiplier = automationSpeedMultiplier.plus(skill.value);
        }
    }

    // Pour simplifier, nous allons laisser les automatisations s'exécuter à chaque tick,
    // mais une vitesse pourrait être implémentée en vérifiant un compteur interne
    // ou en divisant le nombre d'achats par le multiplicateur.
    // Pour l'instant, le multiplicateur pourrait être utilisé pour augmenter le nombre d'achats par tick.

    // Professeurs (priorité car ils boostent tout)
    if (gameState.automateProfessor) {
        const professorCost = new BigNumber(gameState.professorPurchase.fibonacciSequence[gameState.professorPurchase.quantity.toNumber()]);
        // Appliquer la réduction de coût des compétences
        let finalProfessorCost = professorCost;
        if (gameState.unlocked.skills) {
            const skill = gameState.skills["expansion_des_connaissances"];
            if (skill.level > 0) {
                finalProfessorCost = finalProfessorCost.multipliedBy(new BigNumber(1).minus(skill.value));
            }
        }
        if (gameState.images.isGreaterThanOrEqualTo(finalProfessorCost)) {
            buyItem('professor');
        }
    }

    // Images
    if (gameState.automateImage) {
        const imageCost = gameState.imagePurchase.cost;
        // Appliquer la réduction de coût des compétences
        let finalImageCost = imageCost;
        if (gameState.unlocked.skills) {
            const skill = gameState.skills["innovation_educative"];
            if (skill.level > 0) {
                finalImageCost = finalImageCost.multipliedBy(new BigNumber(1).minus(skill.value));
            }
        }
        if (gameState.bonsPoints.isGreaterThanOrEqualTo(finalImageCost)) {
            buyItem('image');
        }
    }

    // Classes
    if (gameState.automateClass) {
        const classCost = calculateCost(gameState.classe, gameState.classe.baseCost, gameState.classe.quantity, gameState.classe.costMultiplier, gameState.classe.costIncreaseThreshold, new BigNumber(1));
        if (gameState.bonsPoints.isGreaterThanOrEqualTo(classCost)) {
            buyItem('class');
        }
    }

    // Élèves
    if (gameState.automateStudent) {
        const studentCost = calculateCost(gameState.student, gameState.student.baseCost, gameState.student.quantity, gameState.student.costMultiplier, gameState.student.costIncreaseThreshold, new BigNumber(1));
        if (gameState.bonsPoints.isGreaterThanOrEqualTo(studentCost)) {
            buyItem('student');
        }
    }
}


// --- Fonctions de Sauvegarde et Chargement ---

/**
 * Sauvegarde l'état du jeu dans Firestore.
 */
async function saveGame() {
    if (!isAuthReady || !db || !userId) {
        console.warn("Firebase non prêt ou userId non défini pour la sauvegarde.");
        return;
    }
    try {
        // Convertir les BigNumber en chaînes pour la sauvegarde
        const serializableState = JSON.parse(JSON.stringify(gameState, (key, value) => {
            if (value instanceof BigNumber) {
                return value.toString();
            }
            return value;
        }));
        await db.collection(`artifacts/${appId}/users/${userId}/gameData`).doc('current').set(serializableState); // doc(db, `artifacts/${appId}/users/${userId}/gameData/current`)
        // console.log("Jeu sauvegardé !");
    } catch (error) {
        console.error("Erreur lors de la sauvegarde du jeu:", error);
    }
}

/**
 * Charge l'état du jeu depuis Firestore.
 */
async function loadGame() {
    if (!isAuthReady || !db || !userId) {
        console.warn("Firebase non prêt ou userId non défini pour le chargement.");
        return;
    }
    try {
        const docRef = db.collection(`artifacts/${appId}/users/${userId}/gameData`).doc('current'); // doc(db, `artifacts/${appId}/users/${userId}/gameData/current`)
        const docSnap = await docRef.get(); // getDoc(docRef)

        if (docSnap.exists) { // docSnap.exists()
            const loadedState = docSnap.data();
            // Convertir les chaînes en BigNumber
            for (const key in loadedState) {
                if (typeof loadedState[key] === 'string' && !isNaN(loadedState[key]) && loadedState[key].includes('e')) { // Heuristique simple pour les BigNumber
                    gameState[key] = new BigNumber(loadedState[key]);
                } else if (typeof loadedState[key] === 'object' && loadedState[key] !== null) {
                    // Gérer les objets imbriqués comme student, class, etc.
                    for (const subKey in loadedState[key]) {
                        if (typeof loadedState[key][subKey] === 'string' && !isNaN(loadedState[key][subKey]) && loadedState[key][subKey].includes('e')) {
                            gameState[key][subKey] = new BigNumber(loadedState[key][subKey]);
                        } else if (typeof loadedState[key][subKey] === 'number' && subKey === 'costIncreaseThreshold') {
                            gameState[key][subKey] = loadedState[key][subKey]; // Garder les nombres normaux
                        } else if (typeof loadedState[key][subKey] === 'boolean') {
                            gameState[key][subKey] = loadedState[key][subKey];
                        } else if (typeof loadedState[key][subKey] === 'object' && loadedState[key][subKey] !== null) {
                            // Gérer les objets encore plus imbriqués (ex: skills)
                            for (const deepKey in loadedState[key][subKey]) {
                                if (typeof loadedState[key][subKey][deepKey] === 'string' && !isNaN(loadedState[key][subKey][deepKey]) && loadedState[key][deepKey].includes('e')) {
                                    gameState[key][subKey][deepKey] = new BigNumber(loadedState[key][subKey][deepKey]);
                                } else if (deepKey === 'cost' && Array.isArray(loadedState[key][subKey][deepKey])) {
                                    gameState[key][subKey][deepKey] = loadedState[key][subKey][deepKey]; // Conserver les tableaux de coûts
                                } else if (deepKey === 'value' && typeof loadedState[key][subKey][deepKey] === 'string') {
                                     gameState[key][subKey][deepKey] = new BigNumber(loadedState[key][subKey][deepKey]);
                                } else {
                                    gameState[key][subKey][deepKey] = loadedState[key][subKey][deepKey];
                                }
                            }
                        } else {
                            gameState[key][subKey] = loadedState[key][subKey];
                        }
                    }
                } else {
                    gameState[key] = loadedState[key];
                }
            }
            // Assurez-vous que les BigNumber sont correctement re-instanciés pour les propriétés de premier niveau
            gameState.bonsPoints = new BigNumber(loadedState.bonsPoints || 0);
            gameState.bonsPointsPerSecond = new BigNumber(loadedState.bonsPointsPerSecond || 0);
            gameState.images = new BigNumber(loadedState.images || 0);
            gameState.professeurs = new BigNumber(loadedState.professeurs || 0);
            gameState.pointsAscension = new BigNumber(loadedState.pointsAscension || 0);

            gameState.student.quantity = new BigNumber(loadedState.student.quantity || 0);
            gameState.student.baseCost = new BigNumber(loadedState.student.baseCost || 10);
            gameState.student.costMultiplier = new BigNumber(loadedState.student.costMultiplier || 1.15);
            gameState.student.baseBps = new BigNumber(loadedState.student.baseBps || 0.5);

            gameState.classe.quantity = new BigNumber(loadedState.classe.quantity || 0);
            gameState.classe.baseCost = new BigNumber(loadedState.classe.baseCost || 300);
            gameState.classe.costMultiplier = new BigNumber(loadedState.classe.costMultiplier || 1.15);
            gameState.classe.baseBps = new BigNumber(loadedState.classe.baseBps || 25);

            gameState.imagePurchase.cost = new BigNumber(loadedState.imagePurchase.cost || 1000);

            gameState.professorPurchase.quantity = new BigNumber(loadedState.professorPurchase.quantity || 0);
            gameState.professorPurchase.productionMultiplier = new BigNumber(loadedState.professorPurchase.productionMultiplier || 1.5);
            // Reconstruire la séquence de Fibonacci si elle n'est pas complète
            if (loadedState.professorPurchase.fibonacciSequence && loadedState.professorPurchase.fibonacciSequence.length > 0) {
                gameState.professorPurchase.fibonacciSequence = loadedState.professorPurchase.fibonacciSequence;
            } else {
                // Fallback si la séquence n'est pas sauvegardée (nouvelle partie ou ancienne sauvegarde)
                gameState.professorPurchase.fibonacciSequence = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765, 10946, 17711, 28657, 46368, 75025, 121393, 196418, 317811, 514229, 832040, 1346269, 2178309, 3524578, 5702887, 9227465, 14930352, 24157817, 39088169, 63245986, 102334155];
            }


            gameState.ascension.totalAscensions = new BigNumber(loadedState.ascension.totalAscensions || 0);
            gameState.ascension.bonusMultiplier = new BigNumber(loadedState.ascension.bonusMultiplier || 1);
            gameState.ascension.showAscensionWarning = loadedState.ascension.showAscensionWarning !== undefined ? loadedState.ascension.showAscensionWarning : true;

            gameState.automationCosts.student = new BigNumber(loadedState.automationCosts.student || 100);
            gameState.automationCosts.classe = new BigNumber(loadedState.automationCosts.classe || 1000);
            gameState.automationCosts.image = new BigNumber(loadedState.automationCosts.image || 10000);
            gameState.automationCosts.professor = new BigNumber(loadedState.automationCosts.professor || 100000);

            console.log("Jeu chargé !", gameState);
        } else {
            console.log("Aucune donnée de jeu trouvée, démarrage d'une nouvelle partie.");
        }
    } catch (error) {
        console.error("Erreur lors du chargement du jeu:", error);
    } finally {
        updateBps();
        updateUI();
        gameLoopInterval = setInterval(gameLoop, 50); // Démarrer la boucle de jeu après le chargement
        saveGameInterval = setInterval(saveGame, 10000); // Sauvegarde automatique toutes les 10 secondes
    }
}

// --- Boucle de Jeu ---
let lastTick = Date.now();
let gameLoopInterval;
let saveGameInterval;

function gameLoop() {
    const now = Date.now();
    const deltaTime = (now - lastTick) / 1000; // Delta time en secondes
    lastTick = now;

    // Ajouter les bons points par seconde
    gameState.bonsPoints = gameState.bonsPoints.plus(gameState.bonsPointsPerSecond.multipliedBy(deltaTime));

    // Gérer les automatisations
    handleAutomations();

    // Vérifier les déblocages
    checkUnlocks();

    // Mettre à jour l'interface utilisateur
    updateUI();
}

/**
 * Fonction principale de mise à jour de l'UI.
 * Appelle toutes les fonctions de mise à jour de l'affichage.
 */
function updateUI() {
    updateResourceDisplay();
    updateButtonDisplay();
    updateTheme(); // S'assurer que le thème est toujours appliqué
}

// --- Gestionnaires d'Événements ---

// Boutons de construction/achat
dom.buyStudent.addEventListener('click', () => buyItem('student'));
dom.buyClass.addEventListener('click', () => buyItem('class'));
dom.buyImage.addEventListener('click', () => buyItem('image'));
dom.buyProfessor.addEventListener('click', () => buyItem('professor'));

// Boutons d'achat multiple
dom.multiBuyButtons.forEach(button => {
    button.addEventListener('click', () => {
        gameState.multiBuyMode = button.dataset.buyMode === 'max' ? 'max' : parseInt(button.dataset.buyMode);
        updateButtonDisplay(); // Mettre à jour les coûts affichés
    });
});

// Modals
dom.openSettingsModal.addEventListener('click', () => {
    openModal(dom.settingsModal);
    // Afficher/cacher les options d'achat multiple dans les réglages
    if (gameState.unlocked.multiBuyX10X100Option) {
        dom.multiBuyX10X100Option.classList.remove('hidden');
    } else {
        dom.multiBuyX10X100Option.classList.add('hidden');
    }
    if (gameState.unlocked.multiBuyXMaxOption) {
        dom.multiBuyXMaxOption.classList.remove('hidden');
    } else {
        dom.multiBuyXMaxOption.classList.add('hidden');
    }
    // Gérer l'affichage du coût du thème
    if (gameState.hasBoughtTheme) {
        dom.themeCost.classList.add('hidden');
    } else {
        dom.themeCost.classList.remove('hidden');
    }
});
dom.closeSettingsModal.addEventListener('click', () => closeModal(dom.settingsModal));

dom.openAscensionModal.addEventListener('click', () => {
    // Pré-calculer et afficher les gains d'ascension
    const professorsCount = gameState.professeurs.toNumber();
    let paGain = new BigNumber(0);
    if (professorsCount > 0) {
        paGain = getPrimeNumber(professorsCount - 1);
        // Appliquer le bonus de compétence au gain de PA
        if (gameState.unlocked.skills) {
            const skill1 = gameState.skills["recherche_avancee"];
            if (skill1.level > 0) {
                paGain = paGain.multipliedBy(new BigNumber(1).plus(skill1.value.multipliedBy(skill1.level)));
            }
            const skill2 = gameState.skills["acceleration_cognitive"];
            if (skill2.level > 0) {
                paGain = paGain.multipliedBy(new BigNumber(1).plus(skill2.value));
            }
        }
    }

    let newBonusValue = new BigNumber(1).plus(new BigNumber(professorsCount).multipliedBy(gameState.ascension.totalAscensions.plus(1)).multipliedBy(0.05));
    // Appliquer le bonus de compétence au multiplicateur d'ascension
    if (gameState.unlocked.skills) {
        const skill = gameState.skills["vision_strategique"];
        if (skill.level > 0) {
            newBonusValue = newBonusValue.plus(skill.value);
        }
    }

    dom.ascensionPaGain.textContent = formatNumber(paGain);
    dom.ascensionMultiplier.textContent = formatNumber(newBonusValue);

    // Gérer l'affichage de l'avertissement
    if (gameState.ascension.showAscensionWarning) {
        openModal(dom.ascensionModal);
    } else {
        performAscension(); // Si l'avertissement est désactivé, effectuer directement l'ascension
    }
});
dom.confirmAscension.addEventListener('click', () => {
    gameState.ascension.showAscensionWarning = !dom.dontShowAscensionWarning.checked;
    performAscension();
});
dom.cancelAscension.addEventListener('click', () => closeModal(dom.ascensionModal));

dom.openSkillsModal.addEventListener('click', () => {
    updateSkillTreeDisplay(); // Mettre à jour l'arbre avant d'ouvrir
    openModal(dom.skillsModal);
});
dom.closeSkillsModal.addEventListener('click', () => closeModal(dom.skillsModal));


// Réglages
dom.toggleTheme.addEventListener('click', () => {
    if (!gameState.hasBoughtTheme) {
        if (gameState.images.isGreaterThanOrEqualTo(10)) {
            gameState.images = gameState.images.minus(10);
            gameState.hasBoughtTheme = true;
            dom.themeCost.classList.add('hidden');
            showNotification("Option 'Thème Jour / Nuit' achetée !", 'success');
        } else {
            showNotification("Pas assez d'Images pour acheter le thème (Coût: 10 Images).", 'error');
            return;
        }
    }
    gameState.theme = gameState.theme === 'light' ? 'dark' : 'light';
    updateTheme();
    saveGame();
});

dom.buyMultiX10X100.addEventListener('click', () => {
    if (gameState.pointsAscension.isGreaterThanOrEqualTo(10)) {
        gameState.pointsAscension = gameState.pointsAscension.minus(10);
        gameState.hasMultiBuyX10X100 = true;
        dom.multiBuyX10X100Option.classList.add('hidden');
        dom.multiBuyOptions.classList.remove('hidden'); // Afficher les boutons x10 et x100
        dom.buyX10.classList.remove('hidden');
        dom.buyX100.classList.remove('hidden');
        showNotification("Achat multiple x10 et x100 débloqué !", 'success');
        updateUI();
        saveGame();
    } else {
        showNotification("Pas assez de Points d'Ascension (Coût: 10 PA).", 'error');
    }
});

dom.buyMultiXMax.addEventListener('click', () => {
    if (gameState.pointsAscension.isGreaterThanOrEqualTo(100)) {
        gameState.pointsAscension = gameState.pointsAscension.minus(100);
        gameState.hasMultiBuyXMax = true;
        dom.multiBuyXMaxOption.classList.add('hidden');
        dom.multiBuyOptions.classList.remove('hidden'); // Afficher le bouton xMax
        dom.buyXMax.classList.remove('hidden');
        showNotification("Achat multiple xMax débloqué !", 'success');
        updateUI();
        saveGame();
    } else {
        showNotification("Pas assez de Points d'Ascension (Coût: 100 PA).", 'error');
    }
});

// Automatisations
dom.automateStudentCheckbox.addEventListener('change', () => {
    if (dom.automateStudentCheckbox.checked) {
        if (gameState.pointsAscension.isGreaterThanOrEqualTo(gameState.automationCosts.student)) {
            gameState.pointsAscension = gameState.pointsAscension.minus(gameState.automationCosts.student);
            gameState.automateStudent = true;
            showNotification("Automatisation Élève activée !", 'success');
        } else {
            dom.automateStudentCheckbox.checked = false; // Annuler le coche
            showNotification(`Pas assez de PA pour automatiser les Élèves (Coût: ${formatNumber(gameState.automationCosts.student)} PA).`, 'error');
        }
    } else {
        gameState.automateStudent = false;
        showNotification("Automatisation Élève désactivée.", 'info');
    }
    saveGame();
    updateUI();
});

dom.automateClassCheckbox.addEventListener('change', () => {
    if (dom.automateClassCheckbox.checked) {
        if (gameState.pointsAscension.isGreaterThanOrEqualTo(gameState.automationCosts.classe)) {
            gameState.pointsAscension = gameState.pointsAscension.minus(gameState.automationCosts.classe);
            gameState.automateClass = true;
            showNotification("Automatisation Classe activée !", 'success');
        } else {
            dom.automateClassCheckbox.checked = false;
            showNotification(`Pas assez de PA pour automatiser les Classes (Coût: ${formatNumber(gameState.automationCosts.classe)} PA).`, 'error');
        }
    } else {
        gameState.automateClass = false;
        showNotification("Automatisation Classe désactivée.", 'info');
    }
    saveGame();
    updateUI();
});

dom.automateImageCheckbox.addEventListener('change', () => {
    if (dom.automateImageCheckbox.checked) {
        if (gameState.pointsAscension.isGreaterThanOrEqualTo(gameState.automationCosts.image)) {
            gameState.pointsAscension = gameState.pointsAscension.minus(gameState.automationCosts.image);
            gameState.automateImage = true;
            showNotification("Automatisation Image activée !", 'success');
        } else {
            dom.automateImageCheckbox.checked = false;
            showNotification(`Pas assez de PA pour automatiser les Images (Coût: ${formatNumber(gameState.automationCosts.image)} PA).`, 'error');
        }
    } else {
        gameState.automateImage = false;
        showNotification("Automatisation Image désactivée.", 'info');
    }
    saveGame();
    updateUI();
});

dom.automateProfessorCheckbox.addEventListener('change', () => {
    if (dom.automateProfessorCheckbox.checked) {
        if (gameState.pointsAscension.isGreaterThanOrEqualTo(gameState.automationCosts.professor)) {
            gameState.pointsAscension = gameState.pointsAscension.minus(gameState.automationCosts.professor);
            gameState.automateProfessor = true;
            showNotification("Automatisation Professeur activée !", 'success');
        } else {
            dom.automateProfessorCheckbox.checked = false;
            showNotification(`Pas assez de PA pour automatiser les Professeurs (Coût: ${formatNumber(gameState.automationCosts.professor)} PA).`, 'error');
        }
    } else {
        gameState.automateProfessor = false;
        showNotification("Automatisation Professeur désactivée.", 'info');
    }
    saveGame();
    updateUI();
});


// --- Démarrage du Jeu ---
window.onload = initFirebase; // Initialiser Firebase au chargement de la page
