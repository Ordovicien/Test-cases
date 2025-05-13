let compteur = 1;

window.addEventListener("DOMContentLoaded", () => {
  chargerDepuisStockage();
  mettreAJourStats();
});

function ajouterLigne(data = {}) {
  const container = document.getElementById("testCards");
  const id = data.id || `TC${String(compteur++).padStart(3, "0")}`;
  const statut = data.status || "À tester";

  const div = document.createElement("div");
  div.className = "card";
  div.setAttribute("data-id", id);

  if (statut === "OK") div.classList.add("ok");
  else if (statut === "KO") div.classList.add("ko");
  else if (statut === "Bloqué") div.classList.add("bloque");
  else div.classList.add("attente");

  const tagsHTML = (data.tags || "")
    .split(",")
    .map(t => `<span class="tag">#${t.trim()}</span>`)
    .join(" ");
  const star = data.favori ? "★" : "☆";

  div.innerHTML = `
    <div class="card-top">
      <span class="star" onclick="toggleFavori('${id}', event)">${star}</span>
      <strong>${id}</strong> - ${data.feature || "Fonctionnalité..."}
    </div>
    <div class="tags">${tagsHTML}</div>
  `;
  div.addEventListener("click", () => ouvrirModale(data, id));
  container.appendChild(div);
}

function ouvrirModale(data, id) {
  const modal = document.getElementById("modal");
  const body = document.getElementById("modalBody");

  modal.classList.remove("hidden", "ok", "ko", "bloque", "attente");
  modal.classList.add(statusToClass(data.status || "À tester"));

  body.innerHTML = `
    <label>ID<input value="${id}" readonly></label>
    <label>Fonctionnalité<input id="mod-f" value="${data.feature || ""}"></label>
    <label>Résultat attendu<input id="mod-e" value="${data.expected || ""}"></label>
    <label>Statut
      <select id="mod-s">
        <option>À tester</option>
        <option>OK</option>
        <option>KO</option>
        <option>Bloqué</option>
      </select>
    </label>
    <label>Testé par<input id="mod-t" value="${data.testeur || ""}"></label>
    <label>Tags (séparés par virgules)<input id="mod-tags" value="${data.tags || ""}"></label>
    <button onclick="sauvegarderModale('${id}')">Enregistrer</button>
    <button onclick="dupliquerDepuisModale('${id}')">Dupliquer</button>
    <button onclick="supprimerTest('${id}')">Supprimer</button>
  `;
  document.getElementById("mod-s").value = data.status || "À tester";
}

function sauvegarderModale(id) {
  let cards = JSON.parse(localStorage.getItem("tests") || "[]");
  const index = cards.findIndex(c => c.id === id);
  const updated = {
    id,
    feature: document.getElementById("mod-f").value,
    expected: document.getElementById("mod-e").value,
    status: document.getElementById("mod-s").value,
    testeur: document.getElementById("mod-t").value,
    tags: document.getElementById("mod-tags").value,
    favori: cards[index]?.favori || false
  };
  if (index >= 0) {
    cards[index] = updated;
  } else {
    cards.push(updated);
  }

  localStorage.setItem("tests", JSON.stringify(cards));
  fermerModale();
  rechargerCartes();
  showToast("Test sauvegardé !");
}

function dupliquerDepuisModale(id) {
  const feature = document.getElementById("mod-f").value;
  const expected = document.getElementById("mod-e").value;
  const status = document.getElementById("mod-s").value;
  const testeur = document.getElementById("mod-t").value;
  const tags = document.getElementById("mod-tags").value;

  ajouterLigne({ feature, expected, status, testeur, tags, favori: false });
  showToast("Test dupliqué !");
  fermerModale();
}

function supprimerTest(id) {
  if (!confirm("Supprimer ce test ?")) return;

  let data = JSON.parse(localStorage.getItem("tests") || "[]");
  data = data.filter(t => t.id !== id);
  localStorage.setItem("tests", JSON.stringify(data));
  fermerModale();
  rechargerCartes();
  showToast("Test supprimé !");
}

function fermerModale() {
  document.getElementById("modal").classList.add("hidden");
}

function toggleFavori(id, e) {
  e.stopPropagation();
  let data = JSON.parse(localStorage.getItem("tests") || "[]");
  const index = data.findIndex(t => t.id === id);
  if (index >= 0) {
    data[index].favori = !data[index].favori;
    localStorage.setItem("tests", JSON.stringify(data));
    rechargerCartes();
  }
}

function rechargerCartes() {
  document.getElementById("testCards").innerHTML = "";
  chargerDepuisStockage();
  mettreAJourStats();
}

function chargerDepuisStockage() {
  const container = document.getElementById("testCards");
  const data = JSON.parse(localStorage.getItem("tests") || "[]");

  // Tri favoris en haut
  data.sort((a, b) => (b.favori === true) - (a.favori === true));

  container.innerHTML = "";

  if (!data.length) {
    container.innerHTML = `<p class="no-tests">Aucun test à afficher.</p>`;
  } else {
    data.forEach(ajouterLigne);
  }

  // Mise à jour du compteur selon le max trouvé
  const lastIdNum = data
    .map(d => parseInt(d.id?.replace("TC", "")))
    .filter(n => !isNaN(n))
    .sort((a, b) => b - a)[0];
  compteur = lastIdNum ? lastIdNum + 1 : 1;
}

function resetTable() {
  if (confirm("Effacer tous les tests ?")) {
    localStorage.removeItem("tests");
    compteur = 1;
    rechargerCartes();
    showToast("Tests réinitialisés !");
  }
}

function exporterCSV() {
  const data = JSON.parse(localStorage.getItem("tests") || "[]");
  if (!data.length) return alert("Aucune donnée à exporter.");

  let csv = "ID,Fonctionnalité,Attendu,Statut,Testé par,Tags,Favori\n";
  data.forEach(d => {
    const row = [d.id, d.feature, d.expected, d.status, d.testeur, d.tags, d.favori ? "Oui" : ""]
      .map(v => `"${(v || "").replace(/"/g, '""')}"`).join(",");
    csv += row + "\n";
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "cahier_de_tests.csv";
  a.click();
}

function toggleFullscreen() {
  const el = document.documentElement;
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    el.requestFullscreen().catch(err => alert("Plein écran non supporté"));
  }
}

function mettreAJourStats() {
  const data = JSON.parse(localStorage.getItem("tests") || "[]");
  let ok = 0, ko = 0, atester = 0;
  data.forEach(t => {
    if (t.status === "OK") ok++;
    else if (t.status === "KO") ko++;
    else atester++;
  });
  document.getElementById("stats").textContent =
    `Total : ${ok + ko + atester} | ✅ OK : ${ok} | ❌ KO : ${ko} | ⏳ À tester : ${atester}`;
}

function filtrerLignes() {
  const statut = document.getElementById("filtreStatut").value;
  const recherche = document.getElementById("recherche").value.toLowerCase();
  document.querySelectorAll(".card").forEach(card => {
    const text = card.textContent.toLowerCase();
    const s = card.className;
    const visible =
      (statut === "Tous" || s.includes(statut.toLowerCase())) &&
      text.includes(recherche);
    card.style.display = visible ? "" : "none";
  });
}

function statusToClass(status) {
  switch (status) {
    case "OK": return "ok";
    case "KO": return "ko";
    case "Bloqué": return "bloque";
    default: return "attente";
  }
}

function showToast(msg = "Sauvegardé !") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
                          }
