// Génération d'ID pour les tests (pas besoin de changer)
export function generateNextId(tests) {
  const numbers = tests
    .map(t => t.id && t.id.match(/^TC(\d+)$/))
    .filter(Boolean)
    .map(m => parseInt(m[1], 10))
    .sort((a, b) => a - b);

  let next = 1;
  for (let i = 0; i < numbers.length; i++) {
    if (numbers[i] !== i + 1) {
      next = i + 1;
      break;
    }
    next = numbers.length + 1;
  }
  return `TC${String(next).padStart(3, "0")}`;
}

export function generateGDSId() {
  return `gds-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
}

/**
 * Résout les placeholders {{variable}} dans une string OU dans un objet JSON,
 * en se servant de la liste allGlobalDataSets (tableau d'objets { variables: { ... } })
 *
 * - Si la valeur fournie est une string, applique le replace sur la string entière.
 * - Si c'est un objet/array, traverse récursivement et remplace dans toutes les strings rencontrées.
 */
export const resolvePlaceholders = (input, allGlobalDataSets) => {
  // 1. Fusionner toutes les variables disponibles
  let activeVariables = {};
  allGlobalDataSets.forEach(ds => {
    activeVariables = { ...activeVariables, ...ds.variables };
  });

  // 2. Si string simple → replace direct
  if (typeof input === "string") {
    // Si la string ressemble à du JSON, essayer de parser !
    const isMaybeJSON = input.trim().startsWith("{") || input.trim().startsWith("[");
    if (isMaybeJSON) {
      try {
        const parsed = JSON.parse(input);
        return resolvePlaceholders(parsed, allGlobalDataSets);
      } catch {
        // Pas grave, traiter comme une string simple (permet les descriptions qui commencent par {)
      }
    }
    return input.replace(/\{\{(.*?)\}\}/g, (match, varName) => {
      const trimmedVarName = varName.trim();
      return Object.prototype.hasOwnProperty.call(activeVariables, trimmedVarName)
        ? activeVariables[trimmedVarName]
        : match;
    });
  }

  // 3. Si array → traverse chaque item
  if (Array.isArray(input)) {
    return input.map(item => resolvePlaceholders(item, allGlobalDataSets));
  }

  // 4. Si objet (non null) → traverse toutes les clés/valeurs
  if (typeof input === "object" && input !== null) {
    const newObj = {};
    for (const key in input) {
      newObj[key] = resolvePlaceholders(input[key], allGlobalDataSets);
    }
    return newObj;
  }

  // 5. Sinon, retourner tel quel (bool, null, etc)
  return input;
};
