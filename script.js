let compteur = 1;

window.addEventListener("DOMContentLoaded", () => {
  chargerDepuisStockage();
  mettreAJourStats();
  if (window.lucide) lucide.createIcons();
});

function ajouterLigne(data = {}) {
  const container = document.getElementById("testCards");
  const id = data.id || `TC${String(compteur++).padStart(3, "0")}`;
  const statut = data.status || "À tester";

  const card = document.createElement("div");
  card.className = "card";
  card.setAttribute("data-statut", statut);

  card.innerHTML = `
    <label>ID<input value="${id}" readonly></label>
    <label>Fonctionnalité<input value="${data.feature || ''}"></label>
    <label>Résultat attendu<input value="${data.expected || ''}"></label>
    <label>Statut
      <select>
        <option>À tester</option>
        <option>OK</option>
        <option>KO</option>
        <option>Bloqué</option>
      </select>
    </label>
    <label>Testé par<input value="${data.testeur || ''}"></label>
    <div class="actions">
      <button onclick="dupliquerCarte(this)">
        <i data-lucide='copy'></i>
      </button>
    </div>
  `;

  const selects = card.querySelectorAll("select");
  selects[0].value = statut;
  selects[0].addEventListener("change", () => {
    card.setAttribute("data-statut", selects[0].value);
    sauvegarder();
    mettreAJourStats();
  });

  card.querySelectorAll("input").forEach(el =>
    el.addEventListener("input", sauvegarder)
  );

  container.appendChild(card);
  sauvegarder();
  mettreAJourStats();
  if (window.lucide) lucide.createIcons();
}

function dupliquerCarte(btn) {
  const card = btn.closest(".card");
  const inputs = card.querySelectorAll("input, select");
  ajouterLigne({
    feature: inputs[1].value,
    expected: inputs[2].value,
    status: inputs[3].value,
    testeur: inputs[4].value
  });
}

function sauvegarder() {
  const cards = document.querySelectorAll(".card");
  const data = Array.from(cards).map(card => {
    const inputs = card.querySelectorAll("input, select");
    return {
      id: inputs[0].value,
      feature: inputs[1].value,
      expected: inputs[2].value,
      status: inputs[3].value,
      testeur: inputs[4].value
    };
  });
  localStorage.setItem("tests", JSON.stringify(data));
}

function chargerDepuisStockage() {
  const sauvegarde = localStorage.getItem("tests");
  if (sauvegarde) {
    const tests = JSON.parse(sauvegarde);
    tests.forEach(ajouterLigne);
  } else {
    ajouterLigne();
  }
}

function mettreAJourStats() {
  const cards = document.querySelectorAll(".card");
  let ok = 0, ko = 0, atester = 0;
  cards.forEach(card => {
    const statut = card.querySelector("select").value;
    if (statut === "OK") ok++;
    else if (statut === "KO") ko++;
    else atester++;
  });
  document.getElementById("stats").textContent =
    `Total : ${ok + ko + atester} | ✅ OK : ${ok} | ❌ KO : ${ko} | ⏳ À tester : ${atester}`;
}

function exporterCSV() {
  const cards = document.querySelectorAll(".card");
  let csv = "ID,Fonctionnalité,Attendu,Statut,Testé par\n";
  cards.forEach(card => {
    const inputs = card.querySelectorAll("input, select");
    const row = Array.from(inputs)
      .map(i => `"${i.value.replace(/"/g, '""')}"`)
      .join(",");
    csv += row + "\n";
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "cahier_de_tests.csv";
  a.click();
}

function exporterPDF() {
  alert("Export PDF non disponible sur cette version mobile simplifiée.");
}

function resetTable() {
  if (confirm("Tout effacer ?")) {
    localStorage.removeItem("tests");
    document.getElementById("testCards").innerHTML = "";
    compteur = 1;
    ajouterLigne();
  }
}

function filtrerLignes() {
  const statut = document.getElementById("filtreStatut").value;
  const recherche = document.getElementById("recherche").value.toLowerCase();
  document.querySelectorAll(".card").forEach(card => {
    const text = card.innerText.toLowerCase();
    const s = card.querySelector("select").value;
    card.style.display =
      (statut === "Tous" || s === statut) && text.includes(recherche) ? "" : "none";
  });
}

function toggleFullscreen() {
  document.documentElement.requestFullscreen();
}
