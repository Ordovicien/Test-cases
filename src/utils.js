export function generateNextId(tests) {
  const numbers = tests.map(t => t.id.match(/^TC(\d+)$/)).filter(Boolean).map(m => parseInt(m[1], 10)).sort((a, b) => a - b);
  let next = 1;
  for (let i = 0; i < numbers.length; i++) {
    if (numbers[i] !== i + 1) { next = i + 1; break; }
    next = numbers.length + 1;
  }
  return `TC${String(next).padStart(3, "0")}`;
}

export function generateGDSId() {
  return `gds-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
}

export const resolvePlaceholders = (jsonStringOrObject, allGlobalDataSets) => {
  let jsonString = jsonStringOrObject;
  if (typeof jsonString !== 'string') {
    try { jsonString = JSON.stringify(jsonStringOrObject ?? {}); }
    catch (e) { console.error("Could not stringify dataset:", jsonStringOrObject, e); return { error: "Dataset invalid." }; }
  }
  if (!jsonString || !jsonString.trim()) {
    try { return JSON.parse(jsonString || "{}"); }
    catch { return {}; }
  }
  let activeVariables = {};
  allGlobalDataSets.forEach(ds => { activeVariables = { ...activeVariables, ...ds.variables }; });
  try {
    const parsedObject = JSON.parse(jsonString);
    function traverseAndReplace(currentPart) {
      if (Array.isArray(currentPart)) { return currentPart.map(traverseAndReplace); }
      else if (typeof currentPart === 'object' && currentPart !== null) {
        const newObj = {};
        for (const key in currentPart) { newObj[key] = traverseAndReplace(currentPart[key]); }
        return newObj;
      } else if (typeof currentPart === 'string') {
        return currentPart.replace(/\{\{(.*?)\}\}/g, (match, varName) => {
          const trimmedVarName = varName.trim();
          return activeVariables.hasOwnProperty(trimmedVarName) ? activeVariables[trimmedVarName] : match;
        });
      }
      return currentPart;
    }
    return traverseAndReplace(parsedObject);
  } catch {
    console.warn("Dataset JSON invalid in resolution:", jsonString);
    return { error: "Invalid JSON structure." };
  }
};