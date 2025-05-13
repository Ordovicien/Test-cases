// --- Constantes ---
const LS_TESTS_KEY = "tests_checklist_app"; // Clé unique pour localStorage
const CARDS_CONTAINER_ID = "testCards";
const MODAL_ID = "modal";
const MODAL_BODY_ID = "modalBody";
const STATS_ID = "stats";
const FILTRE_STATUT_ID = "filtreStatut";
const RECHERCHE_ID = "recherche";

// --- État Global ---
let compteurIdGlobal = 1; // Pour générer des ID uniques
let testsData = []; // Cache local des données pour éviter de lire localStorage trop souvent
let sortableInstance = null; // Pour gérer l'instance SortableJS

// --- Initialisation au chargement du DOM ---
window.addEventListener("DOMContentLoaded", () => {
  chargerDepuisStockage(); // Charge les données et met à jour le compteurIdGlobal
  renderAllCards();      // Affiche les cartes initiales
  mettreAJourStats();
  initialiserDragDrop();
  attacherListenersGlobaux(); // Attache les listeners qui ne sont pas en ligne dans l'HTML
});

// --- Gestion du Menu Latéral ---
function toggleMenu() {
  const body = document.body;
  const menuToggleBtn = document.querySelector(".menu-toggle");
  const sideMenu = document.getElementById("sideMenu");

  body.classList.toggle("show-menu");

  if (body.classList.contains("show-menu")) {
    menuToggleBtn.setAttribute("aria-expanded", "true");
    sideMenu.setAttribute("aria-hidden", "false");
    // Optionnel: Mettre le focus sur le premier élément du menu
    // sideMenu.querySelector('button')?.focus();
  } else {
    menuToggleBtn.setAttribute("aria-expanded", "false");
    sideMenu.setAttribute("aria-hidden", "true");
    menuToggleBtn.focus(); // Remettre le focus sur le bouton du menu
  }
}

// --- Gestion des Cartes (Ajout, Rendu) ---
function genererNouvelId() {
  // Assure que le compteur global est toujours à jour avant de générer un ID
  // Cette fonction est un peu redondante si chargerDepuisStockage met bien à jour compteurIdGlobal
  let maxIdNum = 0;
  testsData.forEach(t => {
    if (t.id && t.id.startsWith("TC")) {
      const numPart = parseInt(t.id.substring(2), 10);
      if (!isNaN(numPart) && numPart > maxIdNum) {
        maxIdNum = numPart;
      }
    }
  });
  compteurIdGlobal = Math.max(compteurIdGlobal, maxIdNum + 1);
  return `TC${String(compteurIdGlobal++).padStart(3, "0")}`;
}

function ajouterLigneVide() {
  const nouveauTest = {
    id: genererNouvelId(),
    feature: "",
    expected: "",
    status: "À tester",
    testeur: "",
    tags: [],
    checklist: [{ label: "Étape 1", done: false }] // Une étape par défaut
  };
  testsData.push(nouveauTest);
  sauvegarderTests();
  renderCard(nouveauTest); // Ajoute seulement la nouvelle carte au DOM
  mettreAJourStats();
  // Optionnel: ouvrir la modale pour éditer directement
  ouvrirModale(nouveauTest);
  if (document.body.classList.contains("show-menu")) { // Ferme le menu si ouvert
      toggleMenu();
  }
}

function renderCard(data) {
  const container = document.getElementById(CARDS_CONTAINER_ID);
  if (!container) return;

  const statut = data.status || "À tester";
  const checklist = data.checklist || [];

  const div = document.createElement("div");
  div.className = "card"; // Classe de base
  div.setAttribute("data-id", data.id);
  div.setAttribute("data-statut", statut.toLowerCase().replace(" ", "-")); // ex: "a-tester"

  // Ajout des classes de statut pour le style de la bordure
  if (statut === "OK") div.classList.add("ok");
  else if (statut === "KO") div.classList.add("ko");
  else if (statut === "Bloqué") div.classList.add("bloque");
  else if (statut === "À tester") div.classList.add("attente");

  // Aseptisation basique pour éviter XSS simple (peut être amélioré)
  const escapeHTML = (str) => String(str || '').replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"');

  const checklistHTML = checklist
    .slice(0, 3) // Afficher un aperçu des 3 premières étapes max
    .map(item => `<label><input type="checkbox" ${item.done ? "checked" : ""} disabled> ${escapeHTML(item.label)}</label>`)
    .join("<br>");
  const moreChecklistItems = checklist.length > 3 ? `<br>...et ${checklist.length - 3} autre(s)` : "";

  div.innerHTML = `
    <div class="card-top">
      <strong>${escapeHTML(data.id)}</strong> - ${escapeHTML(data.feature) || "Nouvelle Fonctionnalité"}
    </div>
    <div class="tags">${(data.tags || []).map(t => `<span class="tag">#${escapeHTML(t.trim())}</span>`).join(" ")}</div>
    <div class="checklist-preview">${checklistHTML}${moreChecklistItems}</div>
  `;

  // Gestion de la sélection des cartes
  div.addEventListener("click", (e) => {
    e.stopPropagation(); // Empêche le clic de se propager à des éléments parents
    if (e.ctrlKey || e.metaKey) { // Sélection multiple avec Ctrl (Windows/Linux) ou Cmd (Mac)
      div.classList.toggle("selected");
    } else { // Sélection simple
      document.querySelectorAll(`#${CARDS_CONTAINER_ID} .card`).forEach(c => c.classList.remove("selected"));
      div.classList.add("selected");
    }
  });

  // Ouvrir la modale au double-clic
  div.addEventListener("dblclick", () => {
    const test = testsData.find(t => t.id === data.id);
    if (test) ouvrirModale(test);
  });

  container.appendChild(div);
}

function renderAllCards() {
  const container = document.getElementById(CARDS_CONTAINER_ID);
  if (!container) return;
  container.innerHTML = ""; // Vider le conteneur avant de tout redessiner
  testsData.forEach(test => renderCard(test));
  // La réinitialisation de SortableJS est gérée après chargement/modification de données
}

// --- Gestion de la Modale ---
function ouvrirModale(data) {
  const modal = document.getElementById(MODAL_ID);
  const modalBody = document.getElementById(MODAL_BODY_ID);
  const modalTitle = document.getElementById("modalTitle"); // Assurez-vous que cet ID existe dans l'HTML
  if (!modal || !modalBody || !modalTitle) return;

  const checklist = data.checklist || [];
  const escapeHTML = (str) => String(str || '').replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"');

  modalTitle.textContent = `Éditer Test: ${escapeHTML(data.id)}`;

  modalBody.innerHTML = `
    <label for="mod-id">ID</label>
    <input type="text" id="mod-id" value="${escapeHTML(data.id)}" readonly>

    <label for="mod-feature">Fonctionnalité</label>
    <input type="text" id="mod-feature" value="${escapeHTML(data.feature)}">

    <label for="mod-expected">Résultat attendu</label>
    <textarea id="mod-expected">${escapeHTML(data.expected)}</textarea>

    <label for="mod-status">Statut</label>
    <select id="mod-status">
      <option value="À tester">À tester</option>
      <option value="OK">OK</option>
      <option value="KO">KO</option>
      <option value="Bloqué">Bloqué</option>
    </select>

    <label for="mod-tester">Testé par</label>
    <input type="text" id="mod-tester" value="${escapeHTML(data.testeur)}">

    <label for="mod-tags">Tags (séparés par des virgules)</label>
    <input type="text" id="mod-tags" value="${escapeHTML((data.tags || []).join(', '))}">

    <div id="checklist-container-modal" style="margin-top: 20px; border-top: 1px solid #eee; padding-top:15px;">
      <label style="margin-bottom:10px;">Checklist</label>
      ${checklist.map((item, index) => `
        <div class="check-item">
          <input type="text" value="${escapeHTML(item.label)}" data-index="${index}" placeholder="Description de l'étape" />
          <input type="checkbox" ${item.done ? "checked" : ""} data-check-index="${index}" title="Marquer comme fait/à faire"/>
          <button type="button" class="btn-remove-check-item" onclick="supprimerEtapeChecklist(this, '${data.id}')" title="Supprimer étape" style="background:none;border:none;color:red;cursor:pointer;font-size:1.2em;">×</button>
        </div>`).join("")}
      <button type="button" onclick="ajouterEtapeChecklistModale()" style="margin-top:10px;">+ Ajouter une étape</button>
    </div>

    <div style="margin-top:25px; display:flex; justify-content:flex-end; gap:10px;">
      <button onclick="sauvegarderModale('${data.id}')">Enregistrer</button>
      <button type="button" onclick="fermerModale()" style="background-color: var(--text-muted);">Annuler</button>
    </div>
  `;
  document.getElementById("mod-status").value = data.status || "À tester";
  modal.classList.remove("hidden");
  document.getElementById("mod-feature").focus(); // Focus sur le premier champ éditable
}

function ajouterEtapeChecklistModale() {
  const container = document.getElementById("checklist-container-modal");
  if (!container) return;
  const index = container.querySelectorAll(".check-item").length;
  const div = document.createElement("div");
  div.className = "check-item";
  div.innerHTML = `
    <input type="text" value="" data-index="${index}" placeholder="Description de l'étape" />
    <input type="checkbox" data-check-index="${index}" title="Marquer comme fait/à faire"/>
    <button type="button" class="btn-remove-check-item" onclick="supprimerEtapeChecklist(this)" title="Supprimer étape" style="background:none;border:none;color:red;cursor:pointer;font-size:1.2em;">×</button>
  `;
  // Insérer avant le bouton "+ Ajouter une étape"
  container.insertBefore(div, container.querySelector('button[onclick="ajouterEtapeChecklistModale()"]'));
}

function supprimerEtapeChecklist(buttonElement) {
    // Pas besoin de l'id du test ici, on manipule juste le DOM de la modale.
    // La sauvegarde finale prendra en compte les éléments restants.
    buttonElement.closest('.check-item').remove();
    // Réindexer si nécessaire, ou gérer à la sauvegarde. Pour l'instant, la sauvegarde se base sur l'ordre.
}


function sauvegarderModale(id) {
  const index = testsData.findIndex(t => t.id === id);
  if (index === -1) {
    console.error("Test non trouvé pour la sauvegarde :", id);
    fermerModale();
    return;
  }

  const checklistItemsModal = document.querySelectorAll("#checklist-container-modal .check-item");
  const nouvelleChecklist = Array.from(checklistItemModal).map(itemDiv => ({
    label: itemDiv.querySelector("input[type='text']").value.trim(),
    done: itemDiv.querySelector("input[type='checkbox']").checked
  })).filter(item => item.label !== ""); // Ignorer les étapes de checklist vides

  const tagsInput = document.getElementById("mod-tags").value;

  const testModifie = {
    ...testsData[index], // Garde les propriétés non modifiées (comme l'ID d'origine)
    id: document.getElementById("mod-id").value, // Au cas où on permettrait de changer l'ID (non recommandé ici)
    feature: document.getElementById("mod-feature").value.trim(),
    expected: document.getElementById("mod-expected").value.trim(),
    status: document.getElementById("mod-status").value,
    testeur: document.getElementById("mod-tester").value.trim(),
    tags: tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
    checklist: nouvelleChecklist
  };

  testsData[index] = testModifie;
  sauvegarderTests();
  fermerModale();
  renderAllCards(); // Redessine toutes les cartes pour refléter les changements
  mettreAJourStats();
  initialiserDragDrop(); // Réinitialise le drag & drop car le DOM a changé
}

function fermerModale() {
  const modal = document.getElementById(MODAL_ID);
  if (modal) modal.classList.add("hidden");
}

// --- Actions Globales (Réinitialiser, Exporter, etc.) ---
function resetTable() {
  if (confirm("Êtes-vous sûr de vouloir effacer tous les tests ? Cette action est irréversible.")) {
    testsData = [];
    compteurIdGlobal = 1; // Réinitialiser le compteur
    sauvegarderTests();
    renderAllCards();
    mettreAJourStats();
    // Optionnel: ajouter une carte vide par défaut après reset
    // ajouterLigneVide();
  }
   if (document.body.classList.contains("show-menu")) { toggleMenu(); }
}

function exporterCSV() {
  if (!testsData.length) {
    alert("Aucun test à exporter.");
    return;
  }

  let csvContent = "ID,Fonctionnalité,Résultat Attendu,Statut,Testé par,Tags,Checklist Items (Label;Fait)\n";

  testsData.forEach(test => {
    const tags = (test.tags || []).join(' | '); // Utiliser pipe pour tags multi-valeurs
    const checklistItems = (test.checklist || [])
      .map(item => `${item.label.replace(/"/g, '""')};${item.done ? 'Oui':'Non'}`) // Échapper guillemets dans label
      .join(' || '); // Double pipe pour séparer les items de checklist

    const row = [
      test.id,
      test.feature,
      test.expected,
      test.status,
      test.testeur,
      tags,
      checklistItems
    ].map(field => `"${String(field || '').replace(/"/g, '""')}"`).join(',');
    csvContent += row + "\n";
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", "cahier_de_tests.csv");
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  if (document.body.classList.contains("show-menu")) { toggleMenu(); }
}

function toggleFullscreen() {
  const isInFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;

  if (!isInFullscreen) {
    const element = document.documentElement; // Plein écran sur toute la page
    if (element.requestFullscreen) element.requestFullscreen();
    else if (element.webkitRequestFullscreen) element.webkitRequestFullscreen();
    else if (element.mozRequestFullScreen) element.mozRequestFullScreen();
    else if (element.msRequestFullscreen) element.msRequestFullscreen();
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
    else if (document.msExitFullscreen) document.msExitFullscreen();
  }
  if (document.body.classList.contains("show-menu")) { toggleMenu(); }
}

// --- Sauvegarde et Chargement LocalStorage ---
function sauvegarderTests() {
  localStorage.setItem(LS_TESTS_KEY, JSON.stringify(testsData));
}

function chargerDepuisStockage() {
  const dataBrute = localStorage.getItem(LS_TESTS_KEY);
  testsData = dataBrute ? JSON.parse(dataBrute) : [];

  // Mettre à jour le compteurIdGlobal basé sur les ID existants
  let maxIdNum = 0;
  testsData.forEach(t => {
    if (t.id && t.id.startsWith("TC")) {
      const numPart = parseInt(t.id.substring(2), 10);
      if (!isNaN(numPart) && numPart > maxIdNum) {
        maxIdNum = numPart;
      }
    }
  });
  compteurIdGlobal = maxIdNum + 1;

  if (!testsData.length && localStorage.getItem(LS_TESTS_KEY) === null) { // Seulement si c'est la toute première fois
    // Optionnel: Ajouter une carte exemple à la première ouverture
    // ajouterLigneVide(); // Ou plusieurs exemples
  }
}

// --- Statistiques et Filtres ---
function mettreAJourStats() {
  const statsElement = document.getElementById(STATS_ID);
  if (!statsElement) return;

  let ok = 0, ko = 0, aTester = 0, bloque = 0, total = testsData.length;
  testsData.forEach(t => {
    if (t.status === "OK") ok++;
    else if (t.status === "KO") ko++;
    else if (t.status === "Bloqué") bloque++;
    else if (t.status === "À tester") aTester++;
  });
  statsElement.innerHTML = // Utilisation de spans pour un style potentiel via CSS
    `Total : <span class="stat-val">${total}</span> | <span class="stat-ok">✅ OK : ${ok}</span> | <span class="stat-ko">❌ KO : ${ko}</span> | <span class="stat-attente">⏳ À tester : ${aTester}</span> | <span class="stat-bloque">🚫 Bloqué : ${bloque}</span>`;
}

function filtrerLignes() {
  const statutFiltre = document.getElementById(FILTRE_STATUT_ID).value;
  const termeRecherche = document.getElementById(RECHERCHE_ID).value.toLowerCase().trim();
  const cartes = document.querySelectorAll(`#${CARDS_CONTAINER_ID} .card`);

  cartes.forEach(card => {
    const statutCarte = card.getAttribute("data-statut"); // ex: "ok", "a-tester"
    const idCarte = card.getAttribute("data-id").toLowerCase();
    // Pour une recherche plus complète, il faudrait accéder aux données JS de la carte
    // ou stocker plus d'infos en data-attributes (peut devenir lourd)
    // Ici, on se base sur le texte visible et l'ID + les tags pour la recherche
    const contenuCarteText = card.innerText.toLowerCase();

    const matchStatut = (statutFiltre === "Tous" || statutCarte === statutFiltre.toLowerCase().replace(" ", "-"));
    
    let matchRecherche = true;
    if (termeRecherche) {
        const termes = termeRecherche.split(/\s+/).filter(t => t); // Gérer plusieurs mots-clés
        matchRecherche = termes.every(terme => {
            if (terme.startsWith("#")) { // Recherche de tag
                return contenuCarteText.includes(terme); // Simple, suppose que #tag est dans innerText
            }
            return idCarte.includes(terme) || contenuCarteText.includes(terme);
        });
    }

    card.style.display = (matchStatut && matchRecherche) ? "" : "none";
  });
}

// --- Drag & Drop (SortableJS) ---
function initialiserDragDrop() {
  const container = document.getElementById(CARDS_CONTAINER_ID);
  if (!container) return;

  if (sortableInstance) {
    sortableInstance.destroy(); // Détruire l'instance précédente si elle existe
  }

  sortableInstance = Sortable.create(container, {
    animation: 150, // ms, animation de glissement
    ghostClass: 'sortable-ghost',  // Classe pour l'élément fantôme
    chosenClass: 'sortable-chosen', // Classe pour l'élément choisi
    dragClass: 'sortable-drag',    // Classe pour l'élément en cours de glissement
    onEnd: (evt) => {
      // evt.oldIndex, evt.newIndex contiennent les indices de déplacement
      const elementDeplace = testsData.splice(evt.oldIndex, 1)[0];
      testsData.splice(evt.newIndex, 0, elementDeplace);
      sauvegarderTests(); // Sauvegarder le nouvel ordre
      // Pas besoin de re-render toutes les cartes, SortableJS met à jour le DOM
    }
  });
}

// --- Duplication et Suppression (basées sur la sélection) ---
function getSelectedCardIds() {
    return Array.from(document.querySelectorAll(`#${CARDS_CONTAINER_ID} .card.selected`))
                .map(card => card.getAttribute('data-id'));
}

function dupliquerCartesSelectionnees() {
  const idsSelectionnes = getSelectedCardIds();
  if (!idsSelectionnes.length) {
    alert("Veuillez sélectionner au moins une carte à dupliquer.");
    return;
  }

  idsSelectionnes.forEach(idOriginal => {
    const testOriginal = testsData.find(t => t.id === idOriginal);
    if (testOriginal) {
      const copie = JSON.parse(JSON.stringify(testOriginal)); // Copie profonde
      copie.id = genererNouvelId(); // Nouvel ID unique
      copie.status = "À tester"; // Réinitialiser le statut
      // Optionnel: vider testeur, etc.
      // copie.testeur = "";
      testsData.push(copie);
    }
  });

  sauvegarderTests();
  renderAllCards(); // Pour afficher les nouvelles cartes
  mettreAJourStats();
  initialiserDragDrop();
  if (document.body.classList.contains("show-menu")) { toggleMenu(); }
}

function supprimerCartesSelectionnees() {
  const idsASupprimer = getSelectedCardIds();
  if (!idsASupprimer.length) {
    alert("Veuillez sélectionner au moins une carte à supprimer.");
    return;
  }

  if (confirm(`Êtes-vous sûr de vouloir supprimer ${idsASupprimer.length} carte(s) sélectionnée(s) ?`)) {
    testsData = testsData.filter(test => !idsASupprimer.includes(test.id));
    sauvegarderTests();
    renderAllCards(); // Redessiner les cartes restantes
    mettreAJourStats();
    initialiserDragDrop();
  }
  if (document.body.classList.contains("show-menu")) { toggleMenu(); }
}


// --- Attacher des listeners non-inline ---
// (Utile si on retire les onclick de l'HTML pour une meilleure séparation)
function attacherListenersGlobaux() {
    // Exemples (si vous retirez les onclick de l'HTML):
   
