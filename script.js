// =============================================================================
// Document 1: Architecture du Cœur du Jeu et Gestion des Nombres (Backend Logic)
// Document 3: Arbre de Compétences et Automatisation (Gameplay Features)
// Document 4: Intégration, Performance et Déploiement (Overall System)
// =============================================================================

// --- Variables Globales du Jeu ---
let bonsPoints = 0; // Monnaie principale
let images = 0;     // Ressource pour les professeurs et améliorations
let professeurs = 0; // Multiplicateurs de production et débloque des fonctionnalités
let pointsAscension = 0; // Monnaie d'ascension

let bonsPointsParSeconde = 0; // Production automatique de BP

// Constructions
let nbEleves = 0;
let coutEleve = 10;
let bpsEleveParUnite = 0.5; // BP/s par élève

let nbClasses = 0;
let coutClasse = 300;
let bpsClasseParUnite = 25; // BP/s par classe

// Achats Spéciaux
let coutImage = 1000;
let coutProfesseur = 1; // Suit la suite de Fibonacci

// Ascension
let ascensionsTotales = 0;
let multiplicateurBonusAscension = 1; // Multiplicateur global de production de BP

// Options d'Achat Multiples
let currentBuyMultiplier = 1; // x1, x10, x100, xMax
let multiBuyX10Unlocked = false;
let multiBuyX100Unlocked = false;
let multiBuyXMaxUnlocked = false;

// Réglages
let isDayTheme = true; // Thème jour/nuit
let themeCost = 10; // Coût pour débloquer le thème
let doNotShowAscensionWarning = false; // Ne plus afficher l'avertissement d'ascension

// Nombres Premiers pour l'Ascension (les 25 premiers)
const primeNumbers = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];

// Suite de Fibonacci pour le coût des professeurs (pré-calculée pour éviter des calculs lourds)
const fibonacciSequence = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765, 10946, 17711, 28657, 46368, 75025, 121393, 196418, 317811, 514229, 832040, 1346269, 2178309, 3524578, 5702887, 9227465, 14930352, 24157817, 39088169, 63245986, 102334155, 165580141, 267914296, 433494437, 701408733, 1134903170];

// Compétences (Skill Tree)
const skills = {
    pedagogie: [
        { id: 'pedagogie1', name: 'Méthodes Actives', description: 'Augmente la production de BP des Élèves de {0}%', levels: 3, costs: [1, 2, 3], effects: [0.1, 0.2, 0.3], currentLevel: 0, unlocked: false },
        { id: 'pedagogie2', name: 'Pédagogie Différenciée', description: 'Réduit le coût des Classes de {0}%', levels: 3, costs: [2, 4, 6], effects: [0.05, 0.1, 0.15], currentLevel: 0, unlocked: false },
        { id: 'pedagogie3', name: 'Motivation Intrinsèque', description: 'Augmente la production de BP de base de {0}%', levels: 3, costs: [3, 6, 9], effects: [0.1, 0.25, 0.4], currentLevel: 0, unlocked: false },
        { id: 'pedagogie4', name: 'Évaluation Formative', description: 'Augmente le gain du bouton "Étudier Sagement" de {0}%', levels: 3, costs: [4, 8, 12], effects: [0.15, 0.3, 0.5], currentLevel: 0, unlocked: false },
        { id: 'pedagogie5', name: 'Apprentissage Collaboratif', description: 'Augmente la production de BP des Professeurs de {0}%', levels: 3, costs: [5, 10, 15], effects: [0.05, 0.1, 0.15], currentLevel: 0, unlocked: false }
    ],
    science: [
        { id: 'science1', name: 'Recherche Fondamentale', description: 'Augmente la production de BP des Classes de {0}%', levels: 3, costs: [1, 2, 3], effects: [0.1, 0.2, 0.3], currentLevel: 0, unlocked: false },
        { id: 'science2', name: 'Expérimentation Pratique', description: 'Réduit le coût des Images de {0}%', levels: 3, costs: [2, 4, 6], effects: [0.05, 0.1, 0.15], currentLevel: 0, unlocked: false },
        { id: 'science3', name: 'Théorie des Cordes', description: 'Augmente le multiplicateur d\'Ascension de {0}%', levels: 3, costs: [3, 6, 9], effects: [0.01, 0.02, 0.03], currentLevel: 0, unlocked: false },
        { id: 'science4', name: 'Modélisation Numérique', description: 'Augmente le gain de PA par Ascension de {0}%', levels: 3, costs: [4, 8, 12], effects: [0.1, 0.2, 0.3], currentLevel: 0, unlocked: false },
        { id: 'science5', name: 'Découverte Majeure', description: 'Augmente la production de BP de toutes les sources de {0}%', levels: 3, costs: [5, 10, 15], effects: [0.05, 0.1, 0.15], currentLevel: 0, unlocked: false }
    ],
    innovation: [
        { id: 'innovation1', name: 'Pensée Latérale', description: 'Réduit le coût des Élèves de {0}%', levels: 3, costs: [1, 2, 3], effects: [0.05, 0.1, 0.15], currentLevel: 0, unlocked: false },
        { id: 'innovation2', name: 'Prototypage Rapide', description: 'Augmente la vitesse d\'automatisation de {0}%', levels: 3, costs: [2, 4, 6], effects: [0.1, 0.2, 0.3], currentLevel: 0, unlocked: false },
        { id: 'innovation3', name: 'Optimisation des Flux', description: 'Réduit le coût des automatisations de {0}%', levels: 3, costs: [3, 6, 9], effects: [0.05, 0.1, 0.15], currentLevel: 0, unlocked: false },
        { id: 'innovation4', name: 'Synergie Interdisciplinaire', description: 'Augmente le gain de PA de base de {0}%', levels: 3, costs: [4, 8, 12], effects: [0.1, 0.2, 0.3], currentLevel: 0, unlocked: false },
        { id: 'innovation5', name: 'Révolution Pédagogique', description: 'Augmente toutes les productions de {0}%', levels: 3, costs: [5, 10, 15], effects: [0.05, 0.1, 0.15], currentLevel: 0, unlocked: false }
    ]
};

// Automatisation
let autoEleveActive = false;
let autoClasseActive = false;
let autoImageActive = false;
let autoProfesseurActive = false;

const autoCosts = {
    eleve: 100,
    classe: 1000,
    image: 10000,
    professeur: 100000
};


// --- Éléments du DOM (pour la mise à jour de l'interface) ---
const bpNombreElement = document.getElementById('bp-nombre');
const bpsElement = document.getElementById('bp-par-seconde');
const imgNombreElement = document.getElementById('img-nombre');
const profNombreElement = document.getElementById('prof-nombre');
const paNombreElement = document.getElementById('pa-nombre');

const acheterEleveBouton = document.getElementById('acheter-eleve');
const eleveCoutElement = document.getElementById('eleve-cout');
const eleveQuantiteElement = document.getElementById('eleve-quantite');
const eleveBpsTotalElement = document.getElementById('eleve-bps-total');
const eleveCard = document.getElementById('eleve-card');

const classeCard = document.getElementById('classe-card');
const acheterClasseBouton = document.getElementById('acheter-classe');
const classeCoutElement = document.getElementById('classe-cout');
const classeQuantiteElement = document.getElementById('classe-quantite');
const classeBpsTotalElement = document.getElementById('classe-bps-total');

const imageCard = document.getElementById('image-card');
const acheterImageBouton = document.getElementById('acheter-image');
const imageCoutElement = document.getElementById('image-cout');
const imageQuantiteElement = document.getElementById('image-quantite');

const professeurCard = document.getElementById('professeur-card');
const acheterProfesseurBouton = document.getElementById('acheter-professeur');
const professeurCoutElement = document.getElementById('professeur-cout');
const professeurQuantiteElement = document.getElementById('professeur-quantite');

const etudierSagementBtn = document.getElementById('etudier-sagement-btn');
const etudierGainDisplay = document.getElementById('etudier-gain-display');

const imagesDiv = document.getElementById('images');
const professeursDiv = document.getElementById('professeurs');
const pointsAscensionDiv = document.getElementById('points-ascension');

const boutonAscension = document.getElementById('bouton-ascension');
const ouvrirReglagesBtn = document.getElementById('ouvrir-reglages');
const ouvrirCompetencesBtn = document.getElementById('ouvrir-competences');
const ouvrirAutomatisationBtn = document.getElementById('ouvrir-automatisation');

const reglagesModal = document.getElementById('reglages-modal');
const fermerReglagesModalBtn = document.getElementById('fermer-reglages-modal');
const toggleThemeBtn = document.getElementById('toggle-theme');
const themeCostElement = document.getElementById('theme-cost');
const acheterMultiX10X100Btn = document.getElementById('acheter-multi-x10-x100');
const multiX10X100CostElement = document.getElementById('multi-x10-x100-cost');
const acheterMultiXMaxBtn = document.getElementById('acheter-multi-xMax');
const multiXMaxCostElement = document.getElementById('multi-xMax-cost');

// Nouveaux éléments pour la sauvegarde/chargement
const saveGameBtn = document.getElementById('save-game-btn');
const loadGameBtn = document.getElementById('load-game-btn');
const resetGameBtn = document.getElementById('reset-game-btn');


const multiBuyOptionsDiv = document.getElementById('multi-buy-options');
const buyX1Btn = document.getElementById('buy-x1');
const buyX10Btn = document.getElementById('buy-x10');
const buyX100Btn = document = document.getElementById('buy-x100');
const buyXMaxBtn = document.getElementById('buy-xMax');

const competencesModal = document.getElementById('competences-modal');
const fermerCompetencesModalBtn = document.getElementById('fermer-competences-modal');
const pedagogieBranch = document.getElementById('pedagogie-branch');
const scienceBranch = document.getElementById('science-branch');
const innovationBranch = document.getElementById('innovation-branch');

const automatisationModal = document.getElementById('automatisation-modal');
const fermerAutomatisationModalBtn = document.getElementById('fermer-automatisation-modal');
const autoEleveToggle = document.getElementById('auto-eleve-toggle');
const autoClasseToggle = document.getElementById('auto-classe-toggle');
const autoImageToggle = document.getElementById('auto-image-toggle');
const autoProfesseurToggle = document.getElementById('auto-professeur-toggle');

const ascensionWarningModal = document.getElementById('ascension-warning-modal');
const fermerAscensionWarningModalBtn = document.getElementById('fermer-ascension-warning-modal');
const paGagnesAscensionElement = document.getElementById('pa-gagnes-ascension');
const multiplicateurBonusAscensionElement = document.getElementById('multiplicateur-bonus-ascension');
const nePlusAfficherAvertissementCheckbox = document.getElementById('ne-plus-afficher-avertissement');
const confirmerAscensionBtn = document.getElementById('confirmer-ascension');

const notificationsContainer = document.getElementById('notifications-container');


// --- Fonctions de Formatage des Nombres ---
// NOTE: Pour la gestion des très grands nombres (au-delà de 1e308),
// il est fortement recommandé d'utiliser une bibliothèque dédiée comme 'break_infinity.js'
// ou d'implémenter une logique de notation scientifique personnalisée.
// Pour l'instant, nous utilisons Math.floor et toFixed pour la simplicité.
function formatNumber(num) {
    if (num >= 1e9) { // Milliards
        return (num / 1e9).toFixed(2) + ' Md';
    }
    if (num >= 1e6) { // Millions
        return (num / 1e6).toFixed(2) + ' M';
    }
    if (num >= 1e3) { // Milliers
        return (num / 1e3).toFixed(2) + ' K';
    }
    return Math.floor(num).toLocaleString('fr-FR');
}

function formatDecimal(num) {
    return num.toFixed(2);
}

// --- Fonctions de Mise à Jour de l'Interface Utilisateur (UI) ---

// Met à jour l'affichage de toutes les ressources
function updateRessourcesDisplay() {
    bpNombreElement.textContent = formatNumber(bonsPoints);
    bpsElement.textContent = formatDecimal(bonsPointsParSeconde);
    imgNombreElement.textContent = formatNumber(images);
    profNombreElement.textContent = formatNumber(professeurs);
    paNombreElement.textContent = formatNumber(pointsAscension);

    // Afficher/cacher les divs de ressources si elles ont été obtenues
    if (images > 0) imagesDiv.classList.remove('hidden');
    if (professeurs > 0) professeursDiv.classList.remove('hidden');
    if (pointsAscension > 0 || ascensionsTotales > 0) pointsAscensionDiv.classList.remove('hidden');
}

// Met à jour l'affichage des constructions (Élèves, Classes)
function updateConstructionDisplay() {
    eleveCoutElement.textContent = formatNumber(coutEleve);
    eleveQuantiteElement.textContent = formatNumber(nbEleves);
    eleveBpsTotalElement.textContent = formatDecimal(nbEleves * bpsEleveParUnite);

    classeCoutElement.textContent = formatNumber(coutClasse);
    classeQuantiteElement.textContent = formatNumber(nbClasses);
    classeBpsTotalElement.textContent = formatDecimal(nbClasses * bpsClasseParUnite);

    imageCoutElement.textContent = formatNumber(coutImage);
    imageQuantiteElement.textContent = formatNumber(images);

    professeurCoutElement.textContent = formatNumber(coutProfesseur);
    professeurQuantiteElement.textContent = formatNumber(professeurs);

    // Met à jour le gain du bouton "Étudier Sagement"
    etudierGainDisplay.textContent = formatDecimal(getEtudierSagementGain());

    // Met à jour le coût des automatisations
    document.getElementById('auto-eleve-cost').textContent = formatNumber(autoCosts.eleve);
    document.getElementById('auto-classe-cost').textContent = formatNumber(autoCosts.classe);
    document.getElementById('auto-image-cost').textContent = formatNumber(autoCosts.image);
    document.getElementById('auto-professeur-cost').textContent = formatNumber(autoCosts.professeur);
}

// Met à jour l'état des boutons (couleur de bordure et désactivation)
function updateButtonStates() {
    // Élève
    if (bonsPoints >= coutEleve) {
        eleveCard.classList.remove('btn-border-red');
        eleveCard.classList.add('btn-border-green');
        acheterEleveBouton.disabled = false;
    } else {
        eleveCard.classList.remove('btn-border-green');
        eleveCard.classList.add('btn-border-red');
        acheterEleveBouton.disabled = true;
    }

    // Classe
    if (bonsPoints >= coutClasse) {
        classeCard.classList.remove('btn-border-red');
        classeCard.classList.add('btn-border-green');
        acheterClasseBouton.disabled = false;
    } else {
        classeCard.classList.remove('btn-border-green');
        classeCard.classList.add('btn-border-red');
        acheterClasseBouton.disabled = true;
    }

    // Image
    if (bonsPoints >= coutImage) {
        imageCard.classList.remove('btn-border-red');
        imageCard.classList.add('btn-border-green');
        acheterImageBouton.disabled = false;
    } else {
        imageCard.classList.remove('btn-border-green');
        imageCard.classList.add('btn-border-red');
        acheterImageBouton.disabled = true;
    }

    // Professeur
    if (images >= coutProfesseur) {
        professeurCard.classList.remove('btn-border-red');
        professeurCard.classList.add('btn-border-green');
        acheterProfesseurBouton.disabled = false;
    } else {
        professeurCard.classList.remove('btn-border-green');
        professeurCard.classList.add('btn-border-red');
        acheterProfesseurBouton.disabled = true;
    }

    // Boutons des réglages
    toggleThemeBtn.disabled = images < themeCost;
    acheterMultiX10X100Btn.disabled = pointsAscension < 10 || multiBuyX100Unlocked; // Désactive si déjà débloqué
    acheterMultiXMaxBtn.disabled = pointsAscension < 100 || multiBuyXMaxUnlocked; // Désactive si déjà débloqué

    // Bouton d'ascension
    if (professeurs >= 5) {
        boutonAscension.classList.remove('hidden');
    } else {
        boutonAscension.classList.add('hidden');
    }

    // Mettre à jour l'état des toggles d'automatisation
    autoEleveToggle.checked = autoEleveActive;
    autoClasseToggle.checked = autoClasseActive;
    autoImageToggle.checked = autoImageActive;
    autoProfesseurToggle.checked = autoProfesseurActive;
}

// Affiche une notification temporaire en haut à droite
function showNotification(message, type = 'info', duration = 2000) {
    const notification = document.createElement('div');
    notification.className = `p-3 rounded-lg shadow-md text-white transition-all duration-300 transform translate-x-full opacity-0`;

    if (type === 'success') {
        notification.classList.add('bg-green-500');
    } else if (type === 'error') {
        notification.classList.add('bg-red-500');
    } else {
        notification.classList.add('bg-blue-500');
    }

    notification.textContent = message;
    notificationsContainer.appendChild(notification);

    // Animer l'entrée
    setTimeout(() => {
        notification.classList.remove('translate-x-full', 'opacity-0');
        notification.classList.add('translate-x-0', 'opacity-100');
    }, 10); // Petit délai pour que la transition s'applique

    // Animer la sortie et supprimer
    setTimeout(() => {
        notification.classList.remove('translate-x-0', 'opacity-100');
        notification.classList.add('translate-x-full', 'opacity-0');
        notification.addEventListener('transitionend', () => notification.remove());
    }, duration);
}

// --- Fonctions de Logique du Jeu ---

// Calcule la production totale de Bons Points par seconde
function calculateBPS() {
    let totalBPS = (nbEleves * bpsEleveParUnite) + (nbClasses * bpsClasseParUnite);

    // Appliquer les multiplicateurs des professeurs
    let profMultiplier = 1 + (professeurs * 0.5);
    // Appliquer bonus compétence "Apprentissage Collaboratif"
    const apprentissageCollaboratifSkill = skills.pedagogie.find(s => s.id === 'pedagogie5');
    if (apprentissageCollaboratifSkill && apprentissageCollaboratifSkill.currentLevel > 0) {
        profMultiplier *= (1 + apprentissageCollaboratifSkill.effects[apprentissageCollaboratifSkill.currentLevel - 1]);
    }
    totalBPS *= profMultiplier;

    // Appliquer le multiplicateur d'ascension
    totalBPS *= multiplicateurBonusAscension;

    // Appliquer les bonus des compétences générales
    const pedagogie3Skill = skills.pedagogie.find(s => s.id === 'pedagogie3'); // Motivation Intrinsèque
    if (pedagogie3Skill && pedagogie3Skill.currentLevel > 0) {
        totalBPS *= (1 + pedagogie3Skill.effects[pedagogie3Skill.currentLevel - 1]);
    }
    const science5Skill = skills.science.find(s => s.id === 'science5'); // Découverte Majeure
    if (science5Skill && science5Skill.currentLevel > 0) {
        totalBPS *= (1 + science5Skill.effects[science5Skill.currentLevel - 1]);
    }
    const innovation5Skill = skills.innovation.find(s => s.id === 'innovation5'); // Révolution Pédagogique
    if (innovation5Skill && innovation5Skill.currentLevel > 0) {
        totalBPS *= (1 + innovation5Skill.effects[innovation5Skill.currentLevel - 1]);
    }

    bonsPointsParSeconde = totalBPS;
}

// Calcule le gain du bouton "Étudier Sagement"
function getEtudierSagementGain() {
    let baseGain = 1 + (0.1 * bonsPointsParSeconde);
    const evaluationFormativeSkill = skills.pedagogie.find(s => s.id === 'pedagogie4');
    if (evaluationFormativeSkill && evaluationFormativeSkill.currentLevel > 0) {
        baseGain *= (1 + evaluationFormativeSkill.effects[evaluationFormativeSkill.currentLevel - 1]);
    }
    return baseGain;
}

// Fonction pour "Étudier Sagement" (gain manuel de BP)
function etudierSagement() {
    bonsPoints += getEtudierSagementGain();
    updateRessourcesDisplay();
    showNotification(`+${formatDecimal(getEtudierSagementGain())} Bons Points !`, 'success', 1000);
}

// Fonction pour acheter une construction/objet
function buyItem(type, quantity = currentBuyMultiplier) {
    let boughtCount = 0;
    let currentCost = 0;
    let originalCost = 0; // Pour référence lors du calcul de max

    // Appliquer les réductions de coût des compétences
    let costReductionEleve = 0;
    const innovation1Skill = skills.innovation.find(s => s.id === 'innovation1');
    if (innovation1Skill && innovation1Skill.currentLevel > 0) {
        costReductionEleve = innovation1Skill.effects[innovation1Skill.currentLevel - 1];
    }

    let costReductionClasse = 0;
    const pedagogie2Skill = skills.pedagogie.find(s => s.id === 'pedagogie2');
    if (pedagogie2Skill && pedagogie2Skill.currentLevel > 0) {
        costReductionClasse = pedagogie2Skill.effects[pedagogie2Skill.currentLevel - 1];
    }

    let costReductionImage = 0;
    const science2Skill = skills.science.find(s => s.id === 'science2');
    if (science2Skill && science2Skill.currentLevel > 0) {
        costReductionImage = science2Skill.effects[science2Skill.currentLevel - 1];
    }


    if (quantity === 'max') {
        quantity = calculateMaxBuy(type);
        if (quantity === 0) {
            showNotification(`Pas assez de ressources pour acheter plus de ${type}s !`, 'error');
            return;
        }
    }

    for (let i = 0; i < quantity; i++) {
        let canAfford = false;

        if (type === 'eleve') {
            originalCost = 10; // Base cost for eleve
            currentCost = Math.ceil(originalCost * (1 - costReductionEleve));
            if (nbEleves + i >= 10) currentCost = Math.ceil(currentCost * Math.pow(1.15, (nbEleves + i) - 9)); // Apply 1.15x starting from 10th
            if (bonsPoints >= currentCost) {
                canAfford = true;
                bonsPoints -= currentCost;
                nbEleves++;
            }
        } else if (type === 'classe') {
            originalCost = 300; // Base cost for classe
            currentCost = Math.ceil(originalCost * (1 - costReductionClasse));
            if (nbClasses + i >= 10) currentCost = Math.ceil(currentCost * Math.pow(1.15, (nbClasses + i) - 9)); // Apply 1.15x starting from 10th
            if (bonsPoints >= currentCost) {
                canAfford = true;
                bonsPoints -= currentCost;
                nbClasses++;
            }
        } else if (type === 'image') {
            originalCost = 1000; // Base cost for image
            currentCost = Math.ceil(originalCost * (1 - costReductionImage));
            if (bonsPoints >= currentCost) {
                canAfford = true;
                bonsPoints -= currentCost;
                images++;
            }
        } else if (type === 'professeur') {
            originalCost = fibonacciSequence[professeurs + i + 1] || Math.ceil(coutProfesseur * 1.618); // Use fib sequence or golden ratio
            currentCost = originalCost; // No skill affects prof cost directly yet
            if (images >= currentCost) {
                canAfford = true;
                images -= currentCost;
                professeurs++;
            }
        }

        if (canAfford) {
            boughtCount++;
        } else {
            if (boughtCount === 0) {
                showNotification(`Pas assez de ressources pour acheter ${type}!`, 'error');
            }
            break;
        }
    }

    if (boughtCount > 0) {
        // Recalculer les coûts après les achats multiples pour le prochain achat unitaire
        // Ceci est important car les coûts peuvent dépendre du nombre d'unités possédées
        coutEleve = (nbEleves >= 10) ? Math.ceil(10 * Math.pow(1.15, nbEleves - 9) * (1 - costReductionEleve)) : Math.ceil(10 * (1 - costReductionEleve));
        coutClasse = (nbClasses >= 10) ? Math.ceil(300 * Math.pow(1.15, nbClasses - 9) * (1 - costReductionClasse)) : Math.ceil(300 * (1 - costReductionClasse));
        coutImage = Math.ceil(1000 * (1 - costReductionImage));
        coutProfesseur = (professeurs < fibonacciSequence.length) ? fibonacciSequence[professeurs + 1] : Math.ceil(fibonacciSequence[fibonacciSequence.length - 1] * Math.pow(1.618, professeurs - (fibonacciSequence.length - 1)));


        calculateBPS(); // Recalcule le BPS après l'achat
        updateRessourcesDisplay();
        updateConstructionDisplay();
        updateButtonStates();
        checkUnlocks();
        showNotification(`Acheté ${boughtCount} ${type}(s)!`, 'success');
    }
}

// Calcule les PA gagnés lors de l'ascension
function calculateAscensionPA() {
    if (professeurs <= 0) return 0;
    let paGain = 0;
    if (professeurs > primeNumbers.length) {
        paGain = primeNumbers[primeNumbers.length - 1]; // Plafonne au dernier nombre premier
    } else {
        paGain = primeNumbers[professeurs - 1]; // -1 car les tableaux sont basés sur 0
    }

    // Appliquer bonus compétence "Modélisation Numérique"
    const science4Skill = skills.science.find(s => s.id === 'science4');
    if (science4Skill && science4Skill.currentLevel > 0) {
        paGain *= (1 + science4Skill.effects[science4Skill.currentLevel - 1]);
    }
    // Appliquer bonus compétence "Synergie Interdisciplinaire"
    const innovation4Skill = skills.innovation.find(s => s.id === 'innovation4');
    if (innovation4Skill && innovation4Skill.currentLevel > 0) {
        paGain *= (1 + innovation4Skill.effects[innovation4Skill.currentLevel - 1]);
    }

    return paGain;
}

// Calcule le multiplicateur de bonus d'ascension
function calculateAscensionMultiplier() {
    let multiplier = 1 + (professeurs * ascensionsTotales * 0.05);
    // Appliquer bonus compétence "Théorie des Cordes"
    const science3Skill = skills.science.find(s => s.id === 'science3');
    if (science3Skill && science3Skill.currentLevel > 0) {
        multiplier += science3Skill.effects[science3Skill.currentLevel - 1]; // Ajoute directement au multiplicateur
    }
    return multiplier;
}

// Effectue l'ascension
function performAscension() {
    const paGained = calculateAscensionPA();
    const newMultiplier = calculateAscensionMultiplier();

    // Réinitialisation des ressources et constructions
    bonsPoints = 0;
    images = 0;
    professeurs = 0;
    nbEleves = 0;
    nbClasses = 0;

    // Réinitialisation des coûts (sauf si les compétences les affectent)
    // Les coûts sont recalculés par updateConstructionDisplay et buyItem
    coutEleve = 10;
    coutClasse = 300;
    coutImage = 1000;
    coutProfesseur = 1;

    // Gain de PA et mise à jour du multiplicateur
    pointsAscension += paGained;
    ascensionsTotales++;
    multiplicateurBonusAscension = newMultiplier;

    // Réinitialiser les niveaux de compétences (si l'ascension doit les réinitialiser)
    // Pour l'instant, les compétences sont persistantes après l'ascension.
    // Si elles doivent être réinitialisées, ajouter ici:
    // for (const branch in skills) {
    //     skills[branch].forEach(skill => skill.currentLevel = 0);
    // }

    // Cacher les modales après l'ascension
    reglagesModal.classList.add('hidden');
    competencesModal.classList.add('hidden');
    automatisationModal.classList.add('hidden');
    ascensionWarningModal.classList.add('hidden');

    // Mettre à jour l'affichage
    calculateBPS();
    updateRessourcesDisplay();
    updateConstructionDisplay();
    updateButtonStates();
    checkUnlocks(); // Pour ré-afficher les panneaux de compétences/automatisation

    showNotification(`Ascension réussie ! Vous avez gagné ${formatNumber(paGained)} PA et votre production est multipliée par ${formatDecimal(newMultiplier)} !`, 'success', 5000);
    saveGame(); // Sauvegarder après l'ascension
}

// --- Fonctions de Déblocage des Fonctionnalités ---
function checkUnlocks() {
    // Débloque les images
    if (images > 0) {
        imagesDiv.classList.remove('hidden');
        professeurCard.classList.remove('hidden'); // Débloque l'achat de professeurs
    }

    // Débloque les classes
    if (bonsPoints >= 300 || nbClasses > 0) { // Si on a assez de BP ou si on a déjà des classes
        classeCard.classList.remove('hidden');
    }

    // Débloque les panneaux de droite après la première ascension
    if (ascensionsTotales > 0) {
        ouvrirCompetencesBtn.classList.remove('hidden');
        ouvrirAutomatisationBtn.classList.remove('hidden');
    }

    // Débloque les options d'achat multiple
    if (multiBuyX10Unlocked || multiBuyX100Unlocked || multiBuyXMaxUnlocked) {
        multiBuyOptionsDiv.classList.remove('hidden');
    }
    if (multiBuyX10Unlocked) buyX10Btn.classList.remove('hidden');
    if (multiBuyX100Unlocked) buyX100Btn.classList.remove('hidden');
    if (multiBuyXMaxUnlocked) buyXMaxBtn.classList.remove('hidden');

    updateButtonStates(); // Toujours mettre à jour l'état des boutons après les déblocages
}

// --- Gestion des Modales ---
function openModal(modalElement) {
    modalElement.classList.remove('hidden');
}

function closeModal(modalElement) {
    modalElement.classList.add('hidden');
}

// --- Gestion du Thème Jour/Nuit ---
function toggleTheme() {
    if (images >= themeCost) {
        if (isDayTheme) {
            // Passer en mode Nuit
            document.body.classList.add('bg-gray-900', 'text-gray-100');
            document.body.classList.remove('bg-f3f4f6', 'text-374151');
            document.getElementById('haut-panneau').classList.add('bg-gray-800', 'text-gray-100');
            document.getElementById('haut-panneau').classList.remove('bg-white', 'text-gray-800');
            document.getElementById('gauche-panneau').classList.add('bg-gray-700');
            document.getElementById('gauche-panneau').classList.remove('bg-gray-100');
            document.getElementById('droite-panneau').classList.add('bg-gray-700');
            document.getElementById('droite-panneau').classList.remove('bg-gray-100');
            // Mettre à jour les couleurs des cartes de construction/achat
            document.querySelectorAll('.bg-white').forEach(el => {
                el.classList.remove('bg-white');
                el.classList.add('bg-gray-800');
            });
            document.querySelectorAll('.bg-gray-50').forEach(el => {
                el.classList.remove('bg-gray-50');
                el.classList.add('bg-gray-700');
            });
            document.querySelectorAll('.text-gray-600').forEach(el => {
                el.classList.remove('text-gray-600');
                el.classList.add('text-gray-300');
            });
            document.querySelectorAll('.text-gray-700').forEach(el => {
                el.classList.remove('text-gray-700');
                el.classList.add('text-gray-200');
            });
            document.querySelectorAll('.text-gray-800').forEach(el => {
                el.classList.remove('text-gray-800');
                el.classList.add('text-gray-100');
            });
            document.querySelectorAll('.text-gray-500').forEach(el => {
                el.classList.remove('text-gray-500');
                el.classList.add('text-gray-400');
            });
            document.querySelectorAll('.text-gray-400').forEach(el => {
                el.classList.remove('text-gray-400');
                el.classList.add('text-gray-500');
            });
            document.querySelectorAll('.shadow-md').forEach(el => {
                el.classList.add('shadow-lg');
            });
            reglagesModal.querySelector('.modal-content').classList.remove('bg-white');
            reglagesModal.querySelector('.modal-content').classList.add('bg-gray-800');
            competencesModal.querySelector('.modal-content').classList.remove('bg-white');
            competencesModal.querySelector('.modal-content').classList.add('bg-gray-800');
            automatisationModal.querySelector('.modal-content').classList.remove('bg-white');
            automatisationModal.querySelector('.modal-content').classList.add('bg-gray-800');
            ascensionWarningModal.querySelector('.modal-content').classList.remove('bg-white');
            ascensionWarningModal.querySelector('.modal-content').classList.add('bg-gray-800');

            isDayTheme = false;
            showNotification("Thème Nuit activé !", 'info');
        } else {
            // Passer en mode Jour
            document.body.classList.remove('bg-gray-900', 'text-gray-100');
            document.body.classList.add('bg-f3f4f6', 'text-374151');
            document.getElementById('haut-panneau').classList.remove('bg-gray-800', 'text-gray-100');
            document.getElementById('haut-panneau').classList.add('bg-white', 'text-gray-800');
            document.getElementById('gauche-panneau').classList.remove('bg-gray-700');
            document.getElementById('gauche-panneau').classList.add('bg-gray-100');
            document.getElementById('droite-panneau').classList.remove('bg-gray-700');
            document.getElementById('droite-panneau').classList.add('bg-gray-100');
            // Revenir aux couleurs originales des cartes
            document.querySelectorAll('.bg-gray-800').forEach(el => {
                el.classList.remove('bg-gray-800');
                el.classList.add('bg-white');
            });
            document.querySelectorAll('.bg-gray-700').forEach(el => {
                el.classList.remove('bg-gray-700');
                el.classList.add('bg-gray-50');
            });
            document.querySelectorAll('.text-gray-300').forEach(el => {
                el.classList.remove('text-gray-300');
                el.classList.add('text-gray-600');
            });
            document.querySelectorAll('.text-gray-200').forEach(el => {
                el.classList.remove('text-gray-200');
                el.classList.add('text-gray-700');
            });
            document.querySelectorAll('.text-gray-100').forEach(el => {
                el.classList.remove('text-gray-100');
                el.classList.add('text-gray-800');
            });
            document.querySelectorAll('.text-gray-400').forEach(el => {
                el.classList.remove('text-gray-400');
                el.classList.add('text-gray-500');
            });
            document.querySelectorAll('.text-gray-500').forEach(el => {
                el.classList.remove('text-gray-500');
                el.classList.add('text-gray-400');
            });
            document.querySelectorAll('.shadow-lg').forEach(el => {
                el.classList.remove('shadow-lg');
            });
            reglagesModal.querySelector('.modal-content').classList.remove('bg-gray-800');
            reglagesModal.querySelector('.modal-content').classList.add('bg-white');
            competencesModal.querySelector('.modal-content').classList.remove('bg-gray-800');
            competencesModal.querySelector('.modal-content').classList.add('bg-white');
            automatisationModal.querySelector('.modal-content').classList.remove('bg-gray-800');
            automatisationModal.querySelector('.modal-content').classList.add('bg-white');
            ascensionWarningModal.querySelector('.modal-content').classList.remove('bg-gray-800');
            ascensionWarningModal.querySelector('.modal-content').classList.add('bg-white');

            isDayTheme = true;
            showNotification("Thème Jour activé !", 'info');
        }
    } else {
        showNotification(`Vous avez besoin de ${themeCost} Images pour changer de thème.`, 'error');
    }
    updateButtonStates();
}

// --- Gestion des Options d'Achat Multiple ---
function setBuyMultiplier(multiplier) {
    currentBuyMultiplier = multiplier;
    // Mettre en évidence le bouton actif
    buyX1Btn.classList.remove('bg-blue-700');
    buyX10Btn.classList.remove('bg-blue-700');
    buyX100Btn.classList.remove('bg-blue-700');
    buyXMaxBtn.classList.remove('bg-blue-700');

    if (multiplier === 1) buyX1Btn.classList.add('bg-blue-700');
    else if (multiplier === 10) buyX10Btn.classList.add('bg-blue-700');
    else if (multiplier === 100) buyX100Btn.classList.add('bg-blue-700');
    else if (multiplier === 'max') buyXMaxBtn.classList.add('bg-blue-700');
}

function calculateMaxBuy(itemType) {
    let maxBuy = 0;
    let tempResource = bonsPoints;
    let tempCost = 0;
    let currentNbEleves = nbEleves; // Use current values for calculation
    let currentNbClasses = nbClasses;
    let currentProfessors = professeurs;

    // Apply skill cost reductions for calculation
    let costReductionEleve = 0;
    const innovation1Skill = skills.innovation.find(s => s.id === 'innovation1');
    if (innovation1Skill && innovation1Skill.currentLevel > 0) {
        costReductionEleve = innovation1Skill.effects[innovation1Skill.currentLevel - 1];
    }

    let costReductionClasse = 0;
    const pedagogie2Skill = skills.pedagogie.find(s => s.id === 'pedagogie2');
    if (pedagogie2Skill && pedagogie2Skill.currentLevel > 0) {
        costReductionClasse = pedagogie2Skill.effects[pedagogie2Skill.currentLevel - 1];
    }

    let costReductionImage = 0;
    const science2Skill = skills.science.find(s => s.id === 'science2');
    if (science2Skill && science2Skill.currentLevel > 0) {
        costReductionImage = science2Skill.effects[science2Skill.currentLevel - 1];
    }

    if (itemType === 'eleve') {
        let baseEleveCost = 10;
        while (tempResource >= tempCost) {
            let effectiveCost = Math.ceil(baseEleveCost * (1 - costReductionEleve));
            if (currentNbEleves + maxBuy >= 10) effectiveCost = Math.ceil(effectiveCost * Math.pow(1.15, (currentNbEleves + maxBuy) - 9));
            if (tempResource >= effectiveCost) {
                tempResource -= effectiveCost;
                maxBuy++;
            } else {
                break;
            }
        }
    } else if (itemType === 'classe') {
        let baseClasseCost = 300;
        while (tempResource >= tempCost) {
            let effectiveCost = Math.ceil(baseClasseCost * (1 - costReductionClasse));
            if (currentNbClasses + maxBuy >= 10) effectiveCost = Math.ceil(effectiveCost * Math.pow(1.15, (currentNbClasses + maxBuy) - 9));
            if (tempResource >= effectiveCost) {
                tempResource -= effectiveCost;
                maxBuy++;
            } else {
                break;
            }
        }
    } else if (itemType === 'image') {
        tempCost = Math.ceil(1000 * (1 - costReductionImage));
        maxBuy = Math.floor(tempResource / tempCost);
    } else if (itemType === 'professeur') {
        tempResource = images; // Professeurs coûtent des images
        let fibIndex = currentProfessors + 1;
        let currentProfCost = (fibIndex < fibonacciSequence.length) ? fibonacciSequence[fibIndex] : Math.ceil(fibonacciSequence[fibonacciSequence.length - 1] * Math.pow(1.618, fibIndex - (fibonacciSequence.length - 1)));

        while (tempResource >= currentProfCost) {
            tempResource -= currentProfCost;
            maxBuy++;
            fibIndex++;
            currentProfCost = (fibIndex < fibonacciSequence.length) ? fibonacciSequence[fibIndex] : Math.ceil(fibonacciSequence[fibonacciSequence.length - 1] * Math.pow(1.618, fibIndex - (fibonacciSequence.length - 1)));
        }
    }
    return maxBuy;
}

// --- Gestion des Compétences ---
function renderSkillTree() {
    pedagogieBranch.innerHTML = '';
    scienceBranch.innerHTML = '';
    innovationBranch.innerHTML = '';

    for (const branchName in skills) {
        const branchElement = document.getElementById(`${branchName}-branch`);
        skills[branchName].forEach(skill => {
            const skillDiv = document.createElement('div');
            skillDiv.className = `skill-bubble bg-gray-200 p-3 rounded-lg shadow-md cursor-pointer relative group transition-all duration-200 ${skill.currentLevel === skill.levels ? 'bg-green-300' : (professeurs >= skill.costs[skill.currentLevel] ? 'border-2 border-green-500 hover:bg-green-100' : 'border-2 border-red-500')}`;
            skillDiv.innerHTML = `
                <h4 class="font-semibold text-gray-800">${skill.name} (Niv. ${skill.currentLevel}/${skill.levels})</h4>
                <p class="text-sm text-gray-600">Coût: ${skill.currentLevel < skill.levels ? skill.costs[skill.currentLevel] : 'Max'} Professeurs</p>
                <div class="skill-description absolute hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded-md bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap z-10">
                    ${skill.description.replace('{0}', skill.effects[skill.currentLevel] * 100)}
                </div>
            `;
            skillDiv.addEventListener('click', () => upgradeSkill(branchName, skill.id));
            branchElement.appendChild(skillDiv);
        });
    }
}

function upgradeSkill(branchName, skillId) {
    const skill = skills[branchName].find(s => s.id === skillId);
    if (!skill) return;

    if (skill.currentLevel < skill.levels) {
        const cost = skill.costs[skill.currentLevel];
        if (professeurs >= cost) {
            professeurs -= cost; // Les compétences coûtent des professeurs
            skill.currentLevel++;
            skill.unlocked = true; // Mark skill as unlocked
            showNotification(`Compétence "${skill.name}" améliorée au niveau ${skill.currentLevel} !`, 'success');
            calculateBPS(); // Recalculate BPS as skills can affect it
            updateRessourcesDisplay();
            updateButtonStates();
            renderSkillTree(); // Re-render the tree to update display
        } else {
            showNotification(`Pas assez de Professeurs pour améliorer "${skill.name}". Il vous faut ${cost} Professeurs.`, 'error');
        }
    } else {
        showNotification(`"${skill.name}" est déjà au niveau maximum.`, 'info');
    }
}

// --- Gestion de l'Automatisation ---
function toggleAutomation(itemType) {
    let currentStatus;
    let cost;
    let autoToggleElement;

    // Déterminer le statut actuel et le coût
    if (itemType === 'eleve') {
        currentStatus = autoEleveActive;
        cost = autoCosts.eleve;
        autoToggleElement = autoEleveToggle;
    } else if (itemType === 'classe') {
        currentStatus = autoClasseActive;
        cost = autoCosts.classe;
        autoToggleElement = autoClasseToggle;
    } else if (itemType === 'image') {
        currentStatus = autoImageActive;
        cost = autoCosts.image;
        autoToggleElement = autoImageToggle;
    } else if (itemType === 'professeur') {
        currentStatus = autoProfesseurActive;
        cost = autoCosts.professeur;
        autoToggleElement = autoProfesseurToggle;
    }

    if (currentStatus) {
        // Si l'automatisation est active, la désactiver
        if (itemType === 'eleve') autoEleveActive = false;
        else if (itemType === 'classe') autoClasseActive = false;
        else if (itemType === 'image') autoImageActive = false;
        else if (itemType === 'professeur') autoProfesseurActive = false;
        showNotification(`Automatisation ${itemType} désactivée.`, 'info');
    } else {
        // Si l'automatisation est inactive, tenter de l'activer
        // Appliquer la réduction de coût des automatisations
        let costReductionAuto = 0;
        const innovation3Skill = skills.innovation.find(s => s.id === 'innovation3');
        if (innovation3Skill && innovation3Skill.currentLevel > 0) {
            costReductionAuto = innovation3Skill.effects[innovation3Skill.currentLevel - 1];
        }
        const effectiveCost = Math.ceil(cost * (1 - costReductionAuto));

        if (pointsAscension >= effectiveCost) {
            pointsAscension -= effectiveCost;
            if (itemType === 'eleve') autoEleveActive = true;
            else if (itemType === 'classe') autoClasseActive = true;
            else if (itemType === 'image') autoImageActive = true;
            else if (itemType === 'professeur') autoProfesseurActive = true;
            showNotification(`Automatisation ${itemType} activée !`, 'success');
        } else {
            showNotification(`Pas assez de PA pour activer l'automatisation ${itemType}. Coût: ${effectiveCost} PA.`, 'error');
            autoToggleElement.checked = false; // Remet le toggle à l'état précédent
        }
    }
    updateRessourcesDisplay();
    updateButtonStates();
}

// Fonction d'automatisation exécutée à chaque tick de la gameLoop
function runAutomations() {
    // Appliquer le bonus de vitesse d'automatisation
    let automationSpeedMultiplier = 1;
    const innovation2Skill = skills.innovation.find(s => s.id === 'innovation2');
    if (innovation2Skill && innovation2Skill.currentLevel > 0) {
        automationSpeedMultiplier += innovation2Skill.effects[innovation2Skill.currentLevel - 1];
    }

    // Chaque automatisation tente d'acheter à chaque tick, mais on peut ajouter un délai
    // ou une chance de succès basée sur automationSpeedMultiplier si on veut un système plus complexe.
    // Pour l'instant, cela signifie que si l'automatisation est active, elle essaie d'acheter à chaque seconde.

    // Pour simuler la vitesse, on peut faire plusieurs tentatives d'achat par tick
    // ou ajuster la fréquence de l'appel à runAutomations.
    // Pour l'instant, nous allons simplement appeler buyItem une fois par tick
    // et la "vitesse" sera gérée par l'efficacité de buyItem et les ressources disponibles.
    // Une implémentation plus complexe pourrait gérer des "ticks" d'automatisation internes.

    if (autoEleveActive) {
        buyItem('eleve', 1); // Achète 1 élève par tick
    }
    if (autoClasseActive) {
        buyItem('classe', 1); // Achète 1 classe par tick
    }
    if (autoImageActive) {
        buyItem('image', 1); // Achète 1 image par tick
    }
    if (autoProfesseurActive) {
        buyItem('professeur', 1); // Achète 1 professeur par tick
    }
}

// --- Sauvegarde et Chargement du Jeu ---
function saveGame() {
    const gameState = {
        bonsPoints,
        images,
        professeurs,
        pointsAscension,
        nbEleves,
        coutEleve,
        nbClasses,
        coutClasse,
        coutImage,
        coutProfesseur,
        ascensionsTotales,
        multiplicateurBonusAscension,
        currentBuyMultiplier,
        multiBuyX10Unlocked,
        multiBuyX100Unlocked,
        multiBuyXMaxUnlocked,
        isDayTheme,
        doNotShowAscensionWarning,
        autoEleveActive,
        autoClasseActive,
        autoImageActive,
        autoProfesseurActive,
        skills: JSON.parse(JSON.stringify(skills)) // Deep copy for skills
    };
    localStorage.setItem('incrementalGameSave', JSON.stringify(gameState));
    showNotification('Jeu sauvegardé !', 'success');
}

function loadGame() {
    const savedState = localStorage.getItem('incrementalGameSave');
    if (savedState) {
        const gameState = JSON.parse(savedState);
        bonsPoints = gameState.bonsPoints || 0;
        images = gameState.images || 0;
        professeurs = gameState.professeurs || 0;
        pointsAscension = gameState.pointsAscension || 0;
        nbEleves = gameState.nbEleves || 0;
        coutEleve = gameState.coutEleve || 10;
        nbClasses = gameState.nbClasses || 0;
        coutClasse = gameState.coutClasse || 300;
        coutImage = gameState.coutImage || 1000;
        coutProfesseur = gameState.coutProfesseur || 1;
        ascensionsTotales = gameState.ascensionsTotales || 0;
        multiplicateurBonusAscension = gameState.multiplicateurBonusAscension || 1;
        currentBuyMultiplier = gameState.currentBuyMultiplier || 1;
        multiBuyX10Unlocked = gameState.multiBuyX10Unlocked || false;
        multiBuyX100Unlocked = gameState.multiBuyX100Unlocked || false;
        multiBuyXMaxUnlocked = gameState.multiBuyXMaxUnlocked || false;
        isDayTheme = gameState.isDayTheme !== undefined ? gameState.isDayTheme : true;
        doNotShowAscensionWarning = gameState.doNotShowAscensionWarning || false;
        autoEleveActive = gameState.autoEleveActive || false;
        autoClasseActive = gameState.autoClasseActive || false;
        autoImageActive = gameState.autoImageActive || false;
        autoProfesseurActive = gameState.autoProfesseurActive || false;

        // Load skills, ensuring to merge with default structure for new skills
        if (gameState.skills) {
            for (const branchName in skills) {
                if (gameState.skills[branchName]) {
                    skills[branchName].forEach(defaultSkill => {
                        const savedSkill = gameState.skills[branchName].find(s => s.id === defaultSkill.id);
                        if (savedSkill) {
                            defaultSkill.currentLevel = savedSkill.currentLevel;
                            defaultSkill.unlocked = savedSkill.unlocked;
                        }
                    });
                }
            }
        }

        // Apply theme if saved as night mode
        if (!isDayTheme) {
            // Temporarily set isDayTheme to true so toggleTheme can correctly switch to night
            isDayTheme = true;
            toggleTheme();
        }

        showNotification('Jeu chargé !', 'success');
        return true;
    }
    showNotification('Aucune sauvegarde trouvée.', 'info');
    return false;
}

function resetGame() {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser le jeu ? Toutes vos données seront perdues !')) {
        localStorage.removeItem('incrementalGameSave');
        // Réinitialiser toutes les variables à leur état initial
        bonsPoints = 0;
        images = 0;
        professeurs = 0;
        pointsAscension = 0;
        nbEleves = 0;
        coutEleve = 10;
        bpsEleveParUnite = 0.5;
        nbClasses = 0;
        coutClasse = 300;
        bpsClasseParUnite = 25;
        coutImage = 1000;
        coutProfesseur = 1;
        ascensionsTotales = 0;
        multiplicateurBonusAscension = 1;
        currentBuyMultiplier = 1;
        multiBuyX10Unlocked = false;
        multiBuyX100Unlocked = false;
        multiBuyXMaxUnlocked = false;
        isDayTheme = true;
        doNotShowAscensionWarning = false;
        autoEleveActive = false;
        autoClasseActive = false;
        autoImageActive = false;
        autoProfesseurActive = false;

        // Réinitialiser les compétences
        for (const branch in skills) {
            skills[branch].forEach(skill => {
                skill.currentLevel = 0;
                skill.unlocked = false;
            });
        }

        calculateBPS();
        updateRessourcesDisplay();
        updateConstructionDisplay();
        updateButtonStates();
        checkUnlocks();
        renderSkillTree();
        setBuyMultiplier(1); // Reset buy multiplier display
        showNotification('Jeu réinitialisé !', 'info');
    }
}

// --- Boucle de Jeu Principale ---
function gameLoop() {
    // Production automatique de Bons Points
    bonsPoints += bonsPointsParSeconde / 10; // Divisé par 10 car la boucle est maintenant toutes les 100ms
                                            // pour une meilleure réactivité d'automatisation
    // Exécuter les automatisations
    runAutomations();

    // Mise à jour de l'interface
    updateRessourcesDisplay();
    updateButtonStates();
    checkUnlocks(); // Vérifie les déblocages à chaque tick
}

// =============================================================================
// Initialisation et Écouteurs d'Événements
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Charger le jeu au démarrage
    loadGame();

    // Initialiser l'affichage après le chargement
    calculateBPS();
    updateRessourcesDisplay();
    updateConstructionDisplay();
    updateButtonStates();
    checkUnlocks();
    renderSkillTree(); // Rendre l'arbre de compétences au démarrage (avec les niveaux chargés)

    // Démarrer la boucle de jeu (mise à jour toutes les 100ms pour plus de fluidité)
    setInterval(gameLoop, 100);

    // Sauvegarder le jeu toutes les 10 secondes
    setInterval(saveGame, 10000);

    // --- Écouteurs d'événements pour les boutons d'achat ---
    acheterEleveBouton.addEventListener('click', () => buyItem('eleve'));
    acheterClasseBouton.addEventListener('click', () => buyItem('classe'));
    acheterImageBouton.addEventListener('click', () => buyItem('image'));
    acheterProfesseurBouton.addEventListener('click', () => buyItem('professeur'));
    etudierSagementBtn.addEventListener('click', etudierSagement);

    // --- Écouteurs d'événements pour les modales ---
    ouvrirReglagesBtn.addEventListener('click', () => openModal(reglagesModal));
    fermerReglagesModalBtn.addEventListener('click', () => closeModal(reglagesModal));

    boutonAscension.addEventListener('click', () => {
        if (!doNotShowAscensionWarning) {
            // Mettre à jour les infos de la modale d'avertissement
            paGagnesAscensionElement.textContent = formatNumber(calculateAscensionPA());
            multiplicateurBonusAscensionElement.textContent = `x${formatDecimal(calculateAscensionMultiplier())}`;
            openModal(ascensionWarningModal);
        } else {
            performAscension();
        }
    });
    fermerAscensionWarningModalBtn.addEventListener('click', () => closeModal(ascensionWarningModal));
    confirmerAscensionBtn.addEventListener('click', () => {
        if (nePlusAfficherAvertissementCheckbox.checked) {
            doNotShowAscensionWarning = true;
        }
        performAscension();
    });

    ouvrirCompetencesBtn.addEventListener('click', () => {
        renderSkillTree(); // S'assurer que l'arbre est à jour avant d'ouvrir
        openModal(competencesModal);
    });
    fermerCompetencesModalBtn.addEventListener('click', () => closeModal(competencesModal));

    ouvrirAutomatisationBtn.addEventListener('click', () => openModal(automatisationModal));
    fermerAutomatisationModalBtn.addEventListener('click', () => closeModal(automatisationModal));

    // --- Écouteurs d'événements pour les réglages ---
    toggleThemeBtn.addEventListener('click', toggleTheme);
    acheterMultiX10X100Btn.addEventListener('click', () => {
        if (pointsAscension >= 10 && !multiBuyX100Unlocked) {
            pointsAscension -= 10;
            multiBuyX10Unlocked = true;
            multiBuyX100Unlocked = true; // Débloque les deux en même temps
            showNotification("Options d'achat x10 et x100 débloquées !", 'success');
            updateButtonStates();
            checkUnlocks();
            saveGame(); // Sauvegarder après l'achat d'amélioration
        } else if (multiBuyX100Unlocked) {
            showNotification("Options x10 et x100 déjà débloquées !", 'info');
        } else {
            showNotification("Pas assez de PA pour débloquer les options x10 et x100.", 'error');
        }
    });
    acheterMultiXMaxBtn.addEventListener('click', () => {
        if (pointsAscension >= 100 && !multiBuyXMaxUnlocked) {
            pointsAscension -= 100;
            multiBuyXMaxUnlocked = true;
            showNotification("Option d'achat xMax débloquée !", 'success');
            updateButtonStates();
            checkUnlocks();
            saveGame(); // Sauvegarder après l'achat d'amélioration
        } else if (multiBuyXMaxUnlocked) {
            showNotification("Option xMax déjà débloquée !", 'info');
        } else {
            showNotification("Pas assez de PA pour débloquer l'option xMax.", 'error');
        }
    });

    // --- Écouteurs d'événements pour les multiplicateurs d'achat ---
    buyX1Btn.addEventListener('click', () => setBuyMultiplier(1));
    buyX10Btn.addEventListener('click', () => setBuyMultiplier(10));
    buyX100Btn.addEventListener('click', () => setBuyMultiplier(100));
    buyXMaxBtn.addEventListener('click', () => setBuyMultiplier('max'));

    // Initialiser le multiplicateur d'achat à x1
    setBuyMultiplier(1);

    // --- Écouteurs d'événements pour les toggles d'automatisation ---
    autoEleveToggle.addEventListener('change', () => { toggleAutomation('eleve'); saveGame(); });
    autoClasseToggle.addEventListener('change', () => { toggleAutomation('classe'); saveGame(); });
    autoImageToggle.addEventListener('change', () => { toggleAutomation('image'); saveGame(); });
    autoProfesseurToggle.addEventListener('change', () => { toggleAutomation('professeur'); saveGame(); });

    // --- Écouteurs d'événements pour la sauvegarde/chargement/réinitialisation ---
    saveGameBtn.addEventListener('click', saveGame);
    loadGameBtn.addEventListener('click', () => {
        if (loadGame()) { // Only update if load was successful
            calculateBPS();
            updateRessourcesDisplay();
            updateConstructionDisplay();
            updateButtonStates();
            checkUnlocks();
            renderSkillTree();
            setBuyMultiplier(currentBuyMultiplier); // Ensure correct multiplier is highlighted
        }
    });
    resetGameBtn.addEventListener('click', resetGame);
});
