import { useState, useMemo, useRef, useEffect } from "react";
import "./App.css";

const STATUSES = ["To do", "Success", "Failed"];

function generateNextId(tests) {
  const numbers = tests
    .map(t => t.id.match(/^TC(\d+)$/))
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

const initialTests = [
  {
    id: "TC001",
    description: "Check login with valid credentials",
    expectedData: "Login successful, redirect to dashboard",
    dataset: "{\"username\": \"user1\", \"password\": \"pass1\"}",
    status: "To do"
  }
];

const initialGlobalDataSets = [
  {
    id: "gds-1",
    name: "Default User Credentials",
    variables: {
      default_username: "testuser",
      default_password: "password123",
    },
  },
  {
    id: "gds-2",
    name: "API Endpoints - Staging",
    variables: {
      baseUrl: "https://api.staging.example.com",
      loginPath: "/auth/login",
      user_id_alpha: "alphaUser123"
    },
  },
];

function generateGDSId() {
  return `gds-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
}

export default function App() {
  // --- ÉTATS POUR LES TESTS ---
  const [tests, setTests] = useState(() => {
    const savedTests = localStorage.getItem("cahierDeTests");
    try {
      const parsedSavedTests = savedTests ? JSON.parse(savedTests) : initialTests;
      return parsedSavedTests.map(test => ({
        ...test,
        dataset: typeof test.dataset === 'string' ? test.dataset : JSON.stringify(test.dataset ?? {})
      }));
    } catch (e) {
      console.error("Error parsing 'cahierDeTests' from localStorage or ensuring dataset is string.", e);
      localStorage.removeItem('cahierDeTests');
      return initialTests.map(test => ({
        ...test,
        dataset: typeof test.dataset === 'string' ? test.dataset : JSON.stringify(test.dataset ?? {})
      }));
    }
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTest, setNewTest] = useState({
    description: "",
    expectedData: "",
    dataset: "",
    status: "To do"
  });
  const [editingTest, setEditingTest] = useState(null);
  const [editingFields, setEditingFields] = useState({
    description: "",
    expectedData: "",
    dataset: "",
    status: "To do"
  });
  const [editingStatusId, setEditingStatusId] = useState(null);
  const statusDropdownRef = useRef(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // --- DATASETS GLOBAUX ---
  const [globalDataSets, setGlobalDataSets] = useState(() => {
    const savedDataSets = localStorage.getItem("globalDataSets");
    try {
      return savedDataSets ? JSON.parse(savedDataSets) : initialGlobalDataSets;
    } catch (e) {
      console.error("Error parsing 'globalDataSets' from localStorage", e);
      localStorage.removeItem('globalDataSets');
      return initialGlobalDataSets;
    }
  });
  const [showManageDataSetsModal, setShowManageDataSetsModal] = useState(false);
  const [editingDataSet, setEditingDataSet] = useState(null);
  const [newDataSet, setNewDataSet] = useState({ name: "", variables: [{ key: "", value: "" }] });

  // --- REFS TEXTAREA MODALS ---
  const addDatasetTextareaRef = useRef(null);
  const editDatasetTextareaRef = useRef(null);

  // --- INSERT VARIABLE ---
  const [showVariableInserter, setShowVariableInserter] = useState(false);
  const variableInserterTargetRef = useRef(null);
  const variableInserterPopoverRef = useRef(null);

  // --- EFFETS ---
  useEffect(() => {
    localStorage.setItem("cahierDeTests", JSON.stringify(tests));
  }, [tests]);

  useEffect(() => {
    localStorage.setItem("globalDataSets", JSON.stringify(globalDataSets));
  }, [globalDataSets]);

  useEffect(() => {
    function handleClickOutsideStatusDropdown(event) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        setEditingStatusId(null);
      }
    }
    if (editingStatusId) {
      document.addEventListener("mousedown", handleClickOutsideStatusDropdown);
    }
    return () => document.removeEventListener("mousedown", handleClickOutsideStatusDropdown);
  }, [editingStatusId]);

  // --- Click outside pour le variable-inserter ---
  useEffect(() => {
    if (!showVariableInserter) return;

    function handleClickOutside(event) {
      if (
        variableInserterPopoverRef.current &&
        !variableInserterPopoverRef.current.contains(event.target) &&
        variableInserterTargetRef.current &&
        !variableInserterTargetRef.current.contains(event.target)
      ) {
        setShowVariableInserter(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showVariableInserter]);

  // --- STATS CALCULÉES ---
  const totalTests = tests.length;
  const doneTests = useMemo(() => tests.filter(t => t.status === "Success").length, [tests]);
  const failedTests = useMemo(() => tests.filter(t => t.status === "Failed").length, [tests]);
  const todoTests = useMemo(() => tests.filter(t => t.status === "To do").length, [tests]);

  // --- RESOLVE PLACEHOLDERS ---
  const resolvePlaceholders = (jsonStringOrObject, allGlobalDataSets) => {
    let jsonString = jsonStringOrObject;
    if (typeof jsonString !== 'string') {
      try {
        jsonString = JSON.stringify(jsonStringOrObject ?? {});
      } catch (e) {
        console.error("Could not stringify dataset for placeholder resolution:", jsonStringOrObject, e);
        return { error: "Dataset is not a valid object/string." };
      }
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
        if (Array.isArray(currentPart)) {
          return currentPart.map(item => traverseAndReplace(item));
        } else if (typeof currentPart === 'object' && currentPart !== null) {
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
    } catch (error) {
      console.warn("Dataset JSON is invalid during resolution (after ensuring string):", error, jsonString);
      return { error: "Invalid JSON structure in dataset string." };
    }
  };

  // --- FONCTIONS CRUD POUR LES TESTS ---
  const handleAddTest = () => {
    if (!newTest.description.trim() || !newTest.expectedData.trim()) { alert("Description and Expected Data are required."); return; }
    if (newTest.dataset.trim()) { try { JSON.parse(newTest.dataset); } catch (error) { alert("Invalid JSON structure in Test Dataset. Please check syntax."); return; } }
    const id = generateNextId(tests);
    setTests(prev => [...prev, { id, description: newTest.description.trim(), expectedData: newTest.expectedData.trim(), dataset: newTest.dataset.trim(), status: newTest.status }]);
    setNewTest({ description: "", expectedData: "", dataset: "", status: "To do" });
    setShowAddModal(false); setShowVariableInserter(false);
  };
  const handleDeleteTestConfirmation = (testToDelete) => setShowDeleteConfirm(testToDelete);
  const confirmDeleteTest = () => {
    if (showDeleteConfirm) { setTests(prev => prev.filter((t) => t.id !== showDeleteConfirm.id)); setShowDeleteConfirm(null); }
  };
  const handleOpenEditModal = (test) => {
    setEditingTest(test);
    let datasetString = test.dataset;
    if (typeof datasetString !== 'string') { try { datasetString = JSON.stringify(datasetString ?? {}); } catch { datasetString = "{}"; } }
    setEditingFields({ description: test.description, expectedData: test.expectedData, dataset: datasetString, status: test.status });
    setShowVariableInserter(false);
  };
  const handleSaveEdit = () => {
    if (!editingTest) return;
    if (!editingFields.description.trim() || !editingFields.expectedData.trim()) { alert("Description and Expected Data are required."); return; }
    if (editingFields.dataset.trim()) { try { JSON.parse(editingFields.dataset); } catch (error) { alert("Invalid JSON structure in Test Dataset. Please check syntax."); return; } }
    setTests(prev => prev.map(t => t.id === editingTest.id ? { ...t, description: editingFields.description.trim(), expectedData: editingFields.expectedData.trim(), dataset: editingFields.dataset.trim(), status: editingFields.status } : t ));
    setEditingTest(null); setShowVariableInserter(false);
  };
  const handleQuickStatusChange = (testId, newStatus) => {
    setTests(prev => prev.map(t => t.id === testId ? { ...t, status: newStatus } : t)); setEditingStatusId(null);
  };

  // --- FONCTIONS CRUD POUR GLOBAL DATASETS ---
  const handleOpenManageDataSets = () => { setShowManageDataSetsModal(true); setEditingDataSet(null); setNewDataSet({ name: "", variables: [{ key: "", value: "" }] }); };
  const handleDataSetVariableChange = (dataSetIdOrNew, varIndex, field, value) => {
    const targetStateSetter = dataSetIdOrNew === 'new' ? setNewDataSet : setEditingDataSet;
    targetStateSetter(prev => {
      if (!prev || (dataSetIdOrNew !== 'new' && prev.id !== dataSetIdOrNew)) return prev;
      const updatedVars = [...prev.variables]; updatedVars[varIndex] = { ...updatedVars[varIndex], [field]: value };
      return { ...prev, variables: updatedVars };
    });
  };
  const handleAddVariableToDsForm = (dataSetIdOrNew) => {
    const targetStateSetter = dataSetIdOrNew === 'new' ? setNewDataSet : setEditingDataSet;
    targetStateSetter(prev => { if (!prev || (dataSetIdOrNew !== 'new' && prev.id !== dataSetIdOrNew)) return prev; return {...prev, variables: [...prev.variables, { key: "", value: "" }]}; });
  };
  const handleRemoveVariableFromDsForm = (dataSetIdOrNew, varIndex) => {
    const targetStateSetter = dataSetIdOrNew === 'new' ? setNewDataSet : setEditingDataSet;
    targetStateSetter(prev => { if (!prev || (dataSetIdOrNew !== 'new' && prev.id !== dataSetIdOrNew)) return prev; return {...prev, variables: prev.variables.filter((_, i) => i !== varIndex)}; });
  };
  const handleSaveNewDataSet = () => {
    if (!newDataSet.name.trim()) { alert("Data Set name is required."); return; }
    const finalVariables = {}; newDataSet.variables.forEach(v => { if (v.key.trim()) finalVariables[v.key.trim()] = v.value; });
    setGlobalDataSets(prev => [...prev, { id: generateGDSId(), name: newDataSet.name.trim(), variables: finalVariables }]);
    setNewDataSet({ name: "", variables: [{ key: "", value: "" }] });
  };
  const handleStartEditDataSet = (dataSet) => {
    const variablesArray = Object.entries(dataSet.variables).map(([key, value]) => ({ key, value }));
    if (variablesArray.length === 0) variablesArray.push({ key: "", value: "" });
    setEditingDataSet({ id: dataSet.id, name: dataSet.name, variables: variablesArray });
    setNewDataSet({ name: "", variables: [{ key: "", value: "" }] });
  };
  const handleSaveEditingDataSet = () => {
    if (!editingDataSet || !editingDataSet.name.trim()) { alert("Data Set name is required."); return; }
    const finalVariables = {}; editingDataSet.variables.forEach(v => { if (v.key.trim()) finalVariables[v.key.trim()] = v.value; });
    setGlobalDataSets(prev => prev.map(ds => ds.id === editingDataSet.id ? { ...ds, name: editingDataSet.name.trim(), variables: finalVariables } : ds ));
    setEditingDataSet(null);
  };
  const handleDeleteDataSet = (dataSetId) => {
    if (window.confirm(`Are you sure you want to delete this Data Set?`)) {
      setGlobalDataSets(prev => prev.filter(ds => ds.id !== dataSetId));
      if (editingDataSet && editingDataSet.id === dataSetId) setEditingDataSet(null);
    }
  };

  // --- POUR L'INSERTION DE VARIABLES ---
  const allGlobalVariablesList = useMemo(() => {
    const varList = []; const seenKeys = new Set();
    [...globalDataSets].reverse().forEach(ds => { Object.keys(ds.variables).forEach(key => { if (!seenKeys.has(key)) { varList.push({key, source: ds.name}); seenKeys.add(key); } }); });
    return varList.sort((a,b) => a.key.localeCompare(b.key));
  }, [globalDataSets]);
  const insertVariableIntoTestDataset = (variableName) => {
    const textarea = showAddModal ? addDatasetTextareaRef.current : (editingTest ? editDatasetTextareaRef.current : null);
    if (textarea) {
      const start = textarea.selectionStart, end = textarea.selectionEnd;
      const text = textarea.value, placeholder = `{{${variableName}}}`;
      const newText = text.substring(0, start) + placeholder + text.substring(end);
      const activeStateSetter = showAddModal ? setNewTest : (editingTest ? setEditingFields : null);
      if (activeStateSetter) { activeStateSetter(prev => ({ ...prev, dataset: newText })); }
      setTimeout(() => { textarea.focus(); textarea.selectionStart = textarea.selectionEnd = start + placeholder.length; }, 0);
    }
    setShowVariableInserter(false);
  };

  const closeAddTestModal = () => { setShowAddModal(false); setShowVariableInserter(false); };
  const closeEditTestModal = () => { setEditingTest(null); setShowVariableInserter(false); };

  // --- JSX DE L'APPLICATION ---
  return (
    <main>
      <div className="page-header">
        <h1 className="title"><span role="img" aria-label="test document">📝</span><span role="img" aria-label="test tube">🧪</span> Interactive Test Book</h1>
        <div className="mini-stats"><span className="mini-stat total" title="Total Tests">{totalTests}</span><span className="mini-stat todo" title="To do">{todoTests}</span><span className="mini-stat done" title="Success">{doneTests}</span><span className="mini-stat failed" title="Failed">{failedTests}</span></div>
        <div><button className="btn-header-manage-datasets" onClick={handleOpenManageDataSets}>⚙️ Manage Data Sets</button><button className="btn-add-header" onClick={() => {setShowAddModal(true); setShowVariableInserter(false);}} style={{marginLeft: '10px'}}>+ Add test</button></div>
      </div>
      <div className="table-wrapper">
        <table className="styled-table">
          <thead><tr><th>ID</th><th>Description</th><th>Expected data</th><th>Dataset (Resolved)</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {tests.length === 0 ? (<tr><td colSpan="6" className="empty-table-message">No tests yet. Click "+ Add test" to create one!</td></tr>) : (
              tests.map((test) => {
                const resolvedDatasetForDisplay = resolvePlaceholders(test.dataset, globalDataSets);
                return (
                  <tr key={test.id}>
                    <td>{test.id}</td><td style={{ cursor: "pointer", textDecoration: "underline dotted", color: "#2563eb" }} onClick={() => handleOpenEditModal(test)} title="Edit this test">{test.description}</td><td>{test.expectedData}</td>
                    <td><pre className="json-cell">{JSON.stringify(resolvedDatasetForDisplay, null, 2)}</pre></td>
                    <td style={{ position: "relative", minWidth: 120 }}>{editingStatusId === test.id ? (<div ref={statusDropdownRef} className="status-dropdown">{STATUSES.map((st) => (<div key={st} className={`status-dropdown-item badge badge-${st.replace(/\s/g, "").toLowerCase()}`} onClick={() => handleQuickStatusChange(test.id, st)}>{st}</div>))}</div>) : (<span className={`badge badge-${test.status.replace(/\s/g, "").toLowerCase()}`} style={{ cursor: "pointer" }} onClick={() => setEditingStatusId(test.id)} title="Click to change status" role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setEditingStatusId(test.id)}>{test.status}</span>)}</td>
                    <td><button className="btn-edit" onClick={() => handleOpenEditModal(test)}>✏️ Edit</button><button className="btn-delete" onClick={() => handleDeleteTestConfirmation(test)}>🗑️ Delete</button></td>
                  </tr>);
              }))}
          </tbody>
        </table>
      </div>

      {/* --- ADD TEST MODAL --- */}
      {showAddModal && (
        <div className="modal-overlay" onClick={closeAddTestModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="addTestTitle">
            <h2 className="modal-title" id="addTestTitle">Add a new test</h2>
            <form className="form-layout" onSubmit={e => { e.preventDefault(); handleAddTest(); }}>
              <input className="input" placeholder="Description (required)" value={newTest.description} onChange={e => setNewTest({ ...newTest, description: e.target.value })} required />
              <input className="input" placeholder="Expected data (required)" value={newTest.expectedData} onChange={e => setNewTest({ ...newTest, expectedData: e.target.value })} required />
              <div className="form-field dataset-field-wrapper">
                <label htmlFor="newTestDataset">Dataset (JSON with &#123;&#123;variables&#125;&#125;):</label>
                <textarea id="newTestDataset" className="input" placeholder='e.g., {"user": "{{default_username}}"}' value={newTest.dataset} onChange={e => setNewTest({ ...newTest, dataset: e.target.value })} rows={5} ref={addDatasetTextareaRef} />
                <button type="button" className="btn-insert-variable" onClick={e => { variableInserterTargetRef.current = e.target; setShowVariableInserter(prev => !prev); }}>{'{ Insert Variable {'}</button>
              </div>
              <select className="select-input" value={newTest.status} onChange={e => setNewTest({ ...newTest, status: e.target.value })}>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>
              <div className="modal-actions"><button className="btn-add" type="submit">+ Add Test</button><button type="button" className="btn-cancel" onClick={closeAddTestModal}>Cancel</button></div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT TEST MODAL --- */}
      {editingTest && (
        <div className="modal-overlay" onClick={closeEditTestModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby={`editTestTitle-${editingTest.id}`}>
            <h2 className="modal-title" id={`editTestTitle-${editingTest.id}`}>Edit test {editingTest.id}</h2>
            <form className="form-layout" onSubmit={e => { e.preventDefault(); handleSaveEdit(); }}>
              <input className="input" placeholder="Description (required)" value={editingFields.description} onChange={e => setEditingFields({ ...editingFields, description: e.target.value })} required />
              <input className="input" placeholder="Expected data (required)" value={editingFields.expectedData} onChange={e => setEditingFields({ ...editingFields, expectedData: e.target.value })} required />
              <div className="form-field dataset-field-wrapper">
                <label htmlFor="editTestDataset">Dataset (JSON with &#123;&#123;variables&#125;&#125;):</label>
                <textarea id="editTestDataset" className="input" placeholder='e.g., {"user": "{{default_username}}"}' value={editingFields.dataset} onChange={e => setEditingFields({ ...editingFields, dataset: e.target.value })} rows={5} ref={editDatasetTextareaRef} />
                <button type="button" className="btn-insert-variable" onClick={e => { variableInserterTargetRef.current = e.target; setShowVariableInserter(prev => !prev); }}>{'{ Insert Variable {'}</button>
              </div>
              <select className="select-input" value={editingFields.status} onChange={e => setEditingFields({ ...editingFields, status: e.target.value })}>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>
              <div className="modal-actions"><button className="btn-add" type="submit">Save Changes</button><button type="button" className="btn-cancel" onClick={closeEditTestModal}>Cancel</button></div>
            </form>
          </div>
        </div>
      )}

      {/* --- VARIABLE INSERTER POPOVER --- */}
      {showVariableInserter && variableInserterTargetRef.current && (
        <div
          className="variable-inserter-popover"
          style={{
            position: 'absolute',
            top: variableInserterTargetRef.current.getBoundingClientRect().bottom + window.scrollY + 5,
            left: variableInserterTargetRef.current.getBoundingClientRect().left + window.scrollX,
            zIndex: 50
          }}
          ref={variableInserterPopoverRef}
        >
          {allGlobalVariablesList.length > 0 ? (
            allGlobalVariablesList.map(variable => (
              <div key={variable.key} className="variable-inserter-item" onClick={() => insertVariableIntoTestDataset(variable.key)} title={`From: ${variable.source}`}>
                {variable.key} <span className="variable-source-tag">({variable.source})</span>
              </div>
            ))
          ) : (
            <div className="variable-inserter-empty">No global variables defined.</div>
          )}
        </div>
      )}

      {/* --- CONFIRM DELETE MODAL --- */}
      {showDeleteConfirm && (<div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)}><div className="modal-content" onClick={e => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-labelledby="deleteConfirmTitle" aria-describedby="deleteConfirmDesc"><h2 className="modal-title" id="deleteConfirmTitle">Confirm Deletion</h2><p id="deleteConfirmDesc">Are you sure you want to delete test <strong>{showDeleteConfirm.id}: {showDeleteConfirm.description}</strong>? This action cannot be undone.</p><div className="modal-actions centered"><button className="btn-delete" onClick={confirmDeleteTest} style={{backgroundColor: '#ffe3e3'}}>Yes, Delete</button><button type="button" className="btn-cancel" onClick={() => setShowDeleteConfirm(null)} style={{color: '#555', fontWeight: 'normal', border: '1px solid #ccc'}}>Cancel</button></div></div></div>)}

      {/* --- MANAGE DATASETS MODAL --- */}
      {showManageDataSetsModal && (<div className="modal-overlay" onClick={() => setShowManageDataSetsModal(false)}><div className="modal-content modal-lg" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="manageDataSetsTitle">
        <h2 className="modal-title" id="manageDataSetsTitle">Manage Global Data Sets</h2>
        {editingDataSet ? (<div className="dataset-editor-form"><h3>Editing: {editingDataSet.name}</h3><div className="form-field"><label htmlFor="editDsName">Data Set Name:</label><input type="text" id="editDsName" className="input" value={editingDataSet.name} onChange={e => setEditingDataSet(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., Staging Environment" required/></div><h4>Variables:</h4>{editingDataSet.variables && Array.isArray(editingDataSet.variables) && editingDataSet.variables.map((variable, index) => (<div key={`edit-var-${index}`} className="variable-entry"><input type="text" className="input" value={variable.key} onChange={e => handleDataSetVariableChange(editingDataSet.id, index, 'key', e.target.value)} placeholder="Variable Key (e.g., username)"/><span className="variable-separator">:</span><input type="text" className="input" value={variable.value} onChange={e => handleDataSetVariableChange(editingDataSet.id, index, 'value', e.target.value)} placeholder="Variable Value"/><button type="button" className="btn-remove-variable" title="Remove variable" onClick={() => handleRemoveVariableFromDsForm(editingDataSet.id, index)}>×</button></div>))}<button type="button" className="btn-add-variable" onClick={() => handleAddVariableToDsForm(editingDataSet.id)}>+ Add Variable</button><div className="modal-actions"><button className="btn-add" onClick={handleSaveEditingDataSet}>Save Changes</button><button type="button" className="btn-cancel" onClick={() => setEditingDataSet(null)}>Cancel Edit</button></div></div>
        ) : (<div className="dataset-editor-form"><h3>Add New Data Set</h3><div className="form-field"><label htmlFor="newDsName">Data Set Name:</label><input type="text" id="newDsName" className="input" value={newDataSet.name} onChange={e => setNewDataSet(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., Production Users" required/></div><h4>Variables:</h4>{newDataSet.variables && Array.isArray(newDataSet.variables) && newDataSet.variables.map((variable, index) => (<div key={`new-var-${index}`} className="variable-entry"><input type="text" className="input" value={variable.key} onChange={e => handleDataSetVariableChange('new', index, 'key', e.target.value)} placeholder="Variable Key"/><span className="variable-separator">:</span><input type="text" className="input" value={variable.value} onChange={e => handleDataSetVariableChange('new', index, 'value', e.target.value)} placeholder="Variable Value"/><button type="button" className="btn-remove-variable" title="Remove variable" onClick={() => handleRemoveVariableFromDsForm('new', index)}>×</button></div>))}<button type="button" className="btn-add-variable" onClick={() => handleAddVariableToDsForm('new')}>+ Add Variable</button><div className="modal-actions"><button className="btn-add" onClick={handleSaveNewDataSet}>Add Data Set</button></div></div>)}
        <hr className="separator-hr" />
        <div className="datasets-list-container"><h3>Existing Data Sets ({globalDataSets.length})</h3>{globalDataSets.length === 0 ? (<p>No global data sets defined yet.</p>) : (<ul className="datasets-list">{globalDataSets.map(ds => (<li key={ds.id} className="dataset-list-item"><div className="dataset-info"><strong>{ds.name}</strong><span className="variable-count">({Object.keys(ds.variables).length} variables)</span></div><div className="dataset-actions"><button className="btn-edit-sm" onClick={() => handleStartEditDataSet(ds)}>Edit</button><button className="btn-delete-sm" onClick={() => handleDeleteDataSet(ds.id)}>Delete</button></div></li>))}</ul>)}</div>
        <div className="modal-actions" style={{marginTop: '20px', justifyContent: 'flex-end'}}><button type="button" className="btn-cancel" onClick={() => setShowManageDataSetsModal(false)}>Close</button></div>
      </div></div>)}
    </main>
  );
}
