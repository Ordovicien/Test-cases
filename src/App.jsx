import { useState, useMemo, useRef, useEffect, useCallback } from "react"; // Ajout de useCallback
import toast, { Toaster } from 'react-hot-toast';
import "./App.css";

// IMPORTS MODULAIRES
import { STATUSES, initialTests, initialGlobalDataSets } from './constants';
import { generateNextId, generateGDSId, resolvePlaceholders } from './utils';
import Modal from './components/Modal';
import MiniStats from './components/MiniStats';
import TestTableRow from './components/TestTableRow';

export default function App() {
  // --- États principaux ---
  const [tests, setTests] = useState(() => {
    const saved = localStorage.getItem("cahierDeTests");
    try {
      const parsed = saved ? JSON.parse(saved) : initialTests;
      // Assurer que dataset est toujours une chaîne dans l'état
      return parsed.map(t => ({ ...t, dataset: typeof t.dataset === 'string' ? t.dataset : JSON.stringify(t.dataset ?? {}) }));
    } catch (e) {
      console.error("Error parsing cahierDeTests from localStorage, resetting.", e);
      localStorage.removeItem('cahierDeTests');
      return initialTests.map(t => ({ ...t, dataset: JSON.stringify(t.dataset ?? {}) }));
    }
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTest, setNewTest] = useState({ description: "", expectedData: "", dataset: "", status: "To do" });
  const [formErrors, setFormErrors] = useState({});
  const [editingTest, setEditingTest] = useState(null);
  const [editingFields, setEditingFields] = useState({ description: "", expectedData: "", dataset: "", status: "To do" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const [globalDataSets, setGlobalDataSets] = useState(() => {
    const saved = localStorage.getItem("globalDataSets");
    try { return saved ? JSON.parse(saved) : initialGlobalDataSets; }
    catch (e) {
      console.error("Error parsing globalDataSets from localStorage, resetting.", e);
      localStorage.removeItem('globalDataSets'); return initialGlobalDataSets;
    }
  });
  const [showManageDataSetsModal, setShowManageDataSetsModal] = useState(false);
  const [editingDataSet, setEditingDataSet] = useState(null);
  const [newDataSet, setNewDataSet] = useState({ name: "", variables: [{ key: "", value: "" }] });

  const addDatasetTextareaRef = useRef(null);
  const editDatasetTextareaRef = useRef(null);
  const [showVariableInserter, setShowVariableInserter] = useState(false);
  const variableInserterTargetRef = useRef(null); // Référence au bouton qui ouvre le popover
  const variableInserterPopoverRef = useRef(null); // Référence au popover lui-même

  // --- Effets pour persistance locale ---
  useEffect(() => {
    localStorage.setItem("cahierDeTests", JSON.stringify(tests));
  }, [tests]);

  useEffect(() => {
    localStorage.setItem("globalDataSets", JSON.stringify(globalDataSets));
  }, [globalDataSets]);

  useEffect(() => {
    if (!showVariableInserter) return;
    function handleClickOutside(event) {
      if (
        variableInserterPopoverRef.current &&
        !variableInserterPopoverRef.current.contains(event.target) &&
        variableInserterTargetRef.current && // S'assurer que la cible existe toujours
        !variableInserterTargetRef.current.contains(event.target)
      ) {
        setShowVariableInserter(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showVariableInserter]); // variableInserterTargetRef et variableInserterPopoverRef sont stables

  // --- Statistiques rapides ---
  const totalTests = tests.length;
  const doneTests = useMemo(() => tests.filter(t => t.status === "Success").length, [tests]);
  const failedTests = useMemo(() => tests.filter(t => t.status === "Failed").length, [tests]);
  const todoTests = useMemo(() => tests.filter(t => t.status === "To do").length, [tests]);

  // --- Helpers Form ---
  const validateTestForm = (testData) => {
    const errors = {};
    if (!testData.description.trim()) errors.description = "Description is required.";
    if (!testData.expectedData.trim()) errors.expectedData = "Expected Data is required.";
    if (testData.dataset.trim()) {
      try {
        JSON.parse(testData.dataset);
      } catch (error) {
        errors.dataset = "Invalid JSON format.";
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // --- Handlers TESTS ---
  const closeAddTestModal = useCallback(() => {
    setShowAddModal(false);
    setShowVariableInserter(false);
    setFormErrors({});
    setNewTest({ description: "", expectedData: "", dataset: "", status: "To do" });
  }, []); // Les setters d'état sont stables

  const handleAddTest = useCallback(() => {
    if (!validateTestForm(newTest)) return;
    const id = generateNextId(tests);
    setTests(prev => [...prev, {
      id,
      description: newTest.description.trim(),
      expectedData: newTest.expectedData.trim(),
      dataset: newTest.dataset.trim() || "{}", // Assurer un JSON valide si vide
      status: newTest.status
    }]);
    closeAddTestModal();
    toast.success('Test added successfully!');
  }, [newTest, tests, closeAddTestModal]); // validateTestForm n'est pas listé car non useCallback (ou alors le mettre en useCallback)

  const handleDeleteTestConfirmation = useCallback((testToDelete) => {
    setShowDeleteConfirm(testToDelete);
  }, []);

  const confirmDeleteTest = useCallback(() => {
    if (showDeleteConfirm) {
      setTests(prev => prev.filter((t) => t.id !== showDeleteConfirm.id));
      toast.success(`Test ${showDeleteConfirm.id} deleted.`);
      setShowDeleteConfirm(null);
    }
  }, [showDeleteConfirm]);

  const closeEditTestModal = useCallback(() => {
    setEditingTest(null);
    setShowVariableInserter(false);
    setFormErrors({});
  }, []);

  const handleOpenEditModal = useCallback((test) => {
    setEditingTest(test);
    let datasetString = test.dataset;
    // Assurer que dataset est une chaîne pour le formulaire
    if (typeof datasetString !== 'string') {
      try {
        datasetString = JSON.stringify(datasetString ?? {});
      } catch {
        datasetString = "{}"; // Fallback
      }
    }
    setEditingFields({
      description: test.description,
      expectedData: test.expectedData,
      dataset: datasetString,
      status: test.status
    });
    setFormErrors({});
    setShowVariableInserter(false); // Fermer au cas où il serait ouvert pour un autre modal
  }, []);


  const handleSaveEdit = useCallback(() => {
    if (!editingTest || !validateTestForm(editingFields)) return;
    setTests(prev => prev.map(t => t.id === editingTest.id ? {
      ...t,
      description: editingFields.description.trim(),
      expectedData: editingFields.expectedData.trim(),
      dataset: editingFields.dataset.trim() || "{}", // Assurer un JSON valide si vide
      status: editingFields.status
    } : t));
    closeEditTestModal();
    toast.success(`Test ${editingTest.id} updated!`);
  }, [editingTest, editingFields, closeEditTestModal]); // validateTestForm

  const handleQuickStatusChange = useCallback((testId, newStatus) => {
    setTests(prev => prev.map(t => t.id === testId ? { ...t, status: newStatus } : t));
    toast.success(`Status of test ${testId} changed to ${newStatus}.`);
  }, []);

  // --- Handlers DATASETS ---
  const handleOpenManageDataSets = useCallback(() => {
    setShowManageDataSetsModal(true);
    setEditingDataSet(null); // S'assurer qu'on n'est pas en mode édition
    setNewDataSet({ name: "", variables: [{ key: "", value: "" }] }); // Réinitialiser le formulaire d'ajout
  }, []);

  const handleDataSetVariableChange = useCallback((dataSetIdOrNew, varIndex, field, value) => {
    const targetStateSetter = dataSetIdOrNew === 'new' ? setNewDataSet : setEditingDataSet;
    targetStateSetter(prev => {
      // Vérification pour s'assurer que 'prev' existe et est le bon dataset pour l'édition
      if (!prev || (dataSetIdOrNew !== 'new' && prev.id !== dataSetIdOrNew)) return prev;

      const updatedVars = [...prev.variables];
      updatedVars[varIndex] = { ...updatedVars[varIndex], [field]: value };
      return { ...prev, variables: updatedVars };
    });
  }, []);

  const handleAddVariableToDsForm = useCallback((dataSetIdOrNew) => {
    const targetStateSetter = dataSetIdOrNew === 'new' ? setNewDataSet : setEditingDataSet;
    targetStateSetter(prev => {
      if (!prev || (dataSetIdOrNew !== 'new' && prev.id !== dataSetIdOrNew)) return prev;
      return { ...prev, variables: [...prev.variables, { key: "", value: "" }] };
    });
  }, []);

  const handleRemoveVariableFromDsForm = useCallback((dataSetIdOrNew, varIndex) => {
    const targetStateSetter = dataSetIdOrNew === 'new' ? setNewDataSet : setEditingDataSet;
    targetStateSetter(prev => {
      if (!prev || (dataSetIdOrNew !== 'new' && prev.id !== dataSetIdOrNew)) return prev;
      return { ...prev, variables: prev.variables.filter((_, i) => i !== varIndex) };
    });
  }, []);

  const handleSaveNewDataSet = useCallback(() => {
    if (!newDataSet.name.trim()) {
      toast.error("Data Set name is required.");
      return;
    }
    const finalVariables = {};
    newDataSet.variables.forEach(v => {
      if (v.key.trim()) finalVariables[v.key.trim()] = v.value;
    });
    setGlobalDataSets(prev => [...prev, {
      id: generateGDSId(),
      name: newDataSet.name.trim(),
      variables: finalVariables
    }]);
    setNewDataSet({ name: "", variables: [{ key: "", value: "" }] }); // Reset form
    toast.success('Global Data Set added!');
  }, [newDataSet]);

  const handleStartEditDataSet = useCallback((dataSet) => {
    let variablesArray = [];
    // Convertir l'objet variables en tableau pour le formulaire
    if (dataSet && dataSet.variables && typeof dataSet.variables === "object" && !Array.isArray(dataSet.variables)) {
      variablesArray = Object.entries(dataSet.variables).map(([key, value]) => ({ key, value }));
    }
    // S'assurer qu'il y a au moins un champ vide si pas de variables
    if (variablesArray.length === 0) {
      variablesArray = [{ key: "", value: "" }];
    }
    setEditingDataSet({ id: dataSet.id, name: dataSet.name, variables: variablesArray });
    setNewDataSet({ name: "", variables: [{ key: "", value: "" }] }); // Réinitialiser le formulaire d'ajout pour éviter confusion
  }, []);

  const handleSaveEditingDataSet = useCallback(() => {
    if (!editingDataSet || !editingDataSet.name.trim()) {
      toast.error("Data Set name is required.");
      return;
    }
    const finalVariables = {};
    editingDataSet.variables.forEach(v => {
      if (v.key.trim()) finalVariables[v.key.trim()] = v.value;
    });
    setGlobalDataSets(prev => prev.map(ds =>
      ds.id === editingDataSet.id ? { ...ds, name: editingDataSet.name.trim(), variables: finalVariables } : ds
    ));
    setEditingDataSet(null); // Quitter le mode édition
    toast.success('Global Data Set updated!');
  }, [editingDataSet]);

  const handleDeleteDataSet = useCallback((dataSetId) => {
    if (window.confirm(`Are you sure you want to delete this Data Set? This could affect tests using its variables.`)) {
      setGlobalDataSets(prev => prev.filter(ds => ds.id !== dataSetId));
      // Si le dataset supprimé était en cours d'édition, annuler l'édition
      if (editingDataSet && editingDataSet.id === dataSetId) {
        setEditingDataSet(null);
      }
      toast.success('Global Data Set deleted!');
    }
  }, [editingDataSet]);


  // --- Variable Inserter ---
  const allGlobalVariablesList = useMemo(() => {
    const varList = [];
    const seenKeys = new Set();
    // Parcourir en ordre inverse pour que les datasets "plus récents" ou "plus bas dans la liste UI" aient priorité
    [...globalDataSets].reverse().forEach(ds => {
      Object.keys(ds.variables).forEach(key => {
        if (!seenKeys.has(key)) {
          varList.push({ key, source: ds.name });
          seenKeys.add(key);
        }
      });
    });
    return varList.sort((a, b) => a.key.localeCompare(b.key)); // Trier alphabétiquement pour l'affichage
  }, [globalDataSets]);

  const insertVariableIntoTestDataset = useCallback((variableName) => {
    const textarea = showAddModal ? addDatasetTextareaRef.current : (editingTest ? editDatasetTextareaRef.current : null);
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const placeholder = `{{${variableName}}}`;
      const newText = text.substring(0, start) + placeholder + text.substring(end);

      const activeStateSetter = showAddModal ? setNewTest : (editingTest ? setEditingFields : null);
      if (activeStateSetter) {
        activeStateSetter(prev => ({ ...prev, dataset: newText }));
      }
      // Refocus and set cursor position after state update and re-render
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + placeholder.length;
      }, 0);
    }
    setShowVariableInserter(false);
  }, [showAddModal, editingTest]); // addDatasetTextareaRef, editDatasetTextareaRef sont stables


  return (
    <main>
      <Toaster position="top-right" reverseOrder={false} />
      <div className="page-header">
        <h1 className="title"><span role="img" aria-label="test document">📝</span><span role="img" aria-label="test tube">🧪</span> Interactive Test Book</h1>
        <MiniStats total={totalTests} todo={todoTests} done={doneTests} failed={failedTests} />
        <div>
          <button className="btn-header-manage-datasets" onClick={handleOpenManageDataSets}>⚙️ Manage Data Sets</button>
          <button
            className="btn-add-header"
            onClick={() => {
              setShowAddModal(true);
              setNewTest({ description: "", expectedData: "", dataset: "", status: "To do" }); // Reset form
              setFormErrors({});
              setShowVariableInserter(false);
            }}
            style={{ marginLeft: '10px' }}
          >
            + Add test
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="styled-table">
          <thead>
            <tr><th>ID</th><th>Description</th><th>Expected data</th><th>Dataset</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {tests.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-table-message">No tests yet. Click "+ Add test" to begin.</td>
              </tr>
            ) : (
              tests.map((test) => (
                <TestTableRow
                  key={test.id}
                  test={test}
                  globalDataSets={globalDataSets}
                  resolvePlaceholders={resolvePlaceholders}
                  onOpenEditModal={handleOpenEditModal}
                  onDeleteTest={handleDeleteTestConfirmation}
                  onQuickStatusChange={handleQuickStatusChange}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODALS */}
      <Modal
        isOpen={showAddModal}
        onClose={closeAddTestModal}
        title="Add a new test"
      >
        <form className="form-layout" onSubmit={e => { e.preventDefault(); handleAddTest(); }}>
          <div className="form-field">
            <label htmlFor="addTestDescription">Description:</label>
            <input id="addTestDescription" className={`input ${formErrors.description ? 'input-error' : ''}`} placeholder="Description (required)" value={newTest.description} onChange={e => setNewTest({ ...newTest, description: e.target.value })} />
            {formErrors.description && <small className="error-message">{formErrors.description}</small>}
          </div>
          <div className="form-field">
            <label htmlFor="addTestExpectedData">Expected Data:</label>
            <input id="addTestExpectedData" className={`input ${formErrors.expectedData ? 'input-error' : ''}`} placeholder="Expected data (required)" value={newTest.expectedData} onChange={e => setNewTest({ ...newTest, expectedData: e.target.value })} />
            {formErrors.expectedData && <small className="error-message">{formErrors.expectedData}</small>}
          </div>
          <div className="form-field dataset-field-wrapper">
            <label htmlFor="addTestDatasetTextarea">Dataset (JSON or use {'{{variables}}'}):</label>
            <textarea
              id="addTestDatasetTextarea" 
              ref={addDatasetTextareaRef}
              className={`input ${formErrors.dataset ? 'input-error' : ''}`}
              placeholder='e.g., {"userId": "{{defaultUserId}}", "isValid": true}'
              value={newTest.dataset}
              onChange={e => setNewTest({ ...newTest, dataset: e.target.value })}
            />
            {formErrors.dataset && <small className="error-message">{formErrors.dataset}</small>}
            <button
              type="button"
              className="btn-insert-variable"
              onClick={e => {
                variableInserterTargetRef.current = e.target; // Sauvegarder la référence du bouton cliqué
                setShowVariableInserter(prev => !prev);
              }}
            >
              {'{{}} Insert Variable'}
            </button>
          </div>
          <label htmlFor="addTestStatus">Status:</label>
          <select id="addTestStatus" className="select-input" value={newTest.status} onChange={e => setNewTest({ ...newTest, status: e.target.value })}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="modal-actions">
            <button className="btn-add" type="submit">+ Add Test</button>
            <button type="button" className="btn-cancel" onClick={closeAddTestModal}>Cancel</button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!editingTest}
        onClose={closeEditTestModal}
        title={editingTest ? `Edit test ${editingTest.id}` : "Edit Test"}
      >
        {editingTest && (
          <form className="form-layout" onSubmit={e => { e.preventDefault(); handleSaveEdit(); }}>
            <div className="form-field">
              <label htmlFor="editTestDescription">Description:</label>
              <input id="editTestDescription" className={`input ${formErrors.description ? 'input-error' : ''}`} placeholder="Description (required)" value={editingFields.description} onChange={e => setEditingFields({ ...editingFields, description: e.target.value })} />
              {formErrors.description && <small className="error-message">{formErrors.description}</small>}
            </div>
            <div className="form-field">
              <label htmlFor="editTestExpectedData">Expected Data:</label>
              <input id="editTestExpectedData" className={`input ${formErrors.expectedData ? 'input-error' : ''}`} placeholder="Expected data (required)" value={editingFields.expectedData} onChange={e => setEditingFields({ ...editingFields, expectedData: e.target.value })} />
              {formErrors.expectedData && <small className="error-message">{formErrors.expectedData}</small>}
            </div>
            <div className="form-field dataset-field-wrapper">
              <label htmlFor="editTestDatasetTextarea">Dataset (JSON or use {'{{variables}}'}):</label>
              <textarea
                id="editTestDatasetTextarea"
                ref={editDatasetTextareaRef}
                className={`input ${formErrors.dataset ? 'input-error' : ''}`}
                placeholder='e.g., {"userId": "{{defaultUserId}}", "isValid": true}'
                value={editingFields.dataset}
                onChange={e => setEditingFields({ ...editingFields, dataset: e.target.value })}
              />
              {formErrors.dataset && <small className="error-message">{formErrors.dataset}</small>}
              <button
                type="button"
                className="btn-insert-variable"
                onClick={e => {
                  variableInserterTargetRef.current = e.target;
                  setShowVariableInserter(prev => !prev);
                }}
              >
                {'{{}} Insert Variable'}
              </button>
            </div>
            <label htmlFor="editTestStatus">Status:</label>
            <select id="editTestStatus" className="select-input" value={editingFields.status} onChange={e => setEditingFields({ ...editingFields, status: e.target.value })}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="modal-actions">
              <button className="btn-add" type="submit">Save Changes</button>
              <button type="button" className="btn-cancel" onClick={closeEditTestModal}>Cancel</button>
            </div>
          </form>
        )}
      </Modal>

      {showVariableInserter && variableInserterTargetRef.current && (
        <div
          className="variable-inserter-popover"
          style={{
            position: 'absolute',
            top: variableInserterTargetRef.current.getBoundingClientRect().bottom + window.scrollY + 5, // +5 pour un petit espace
            left: variableInserterTargetRef.current.getBoundingClientRect().left + window.scrollX,
            zIndex: 1060 // S'assurer qu'il est au-dessus des autres éléments du modal (typiquement z-index 1050 pour les modals)
          }}
          ref={variableInserterPopoverRef} // Attacher la ref au popover lui-même
        >
          {allGlobalVariablesList.length > 0 ? (
            allGlobalVariablesList.map(variable => (
              <div
                key={`${variable.source}-${variable.key}`} // Clé plus unique
                className="variable-inserter-item"
                onClick={() => insertVariableIntoTestDataset(variable.key)}
                title={`From Global Data Set: ${variable.source}`}
              >
                {variable.key} <span className="variable-source-tag">({variable.source})</span>
              </div>
            ))
          ) : (
            <div className="variable-inserter-empty">No global variables defined. Manage Data Sets to add some.</div>
          )}
        </div>
      )}

      <Modal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} title="Confirm Deletion" size="sm">
        {showDeleteConfirm && (
          <>
            <p id="deleteConfirmDesc"> {/* Cet ID peut être utilisé par le Modal pour aria-describedby */}
              Are you sure you want to delete test <strong>{showDeleteConfirm.id}: {showDeleteConfirm.description}</strong>? This action cannot be undone.
            </p>
            <div className="modal-actions centered">
              <button className="btn-delete" onClick={confirmDeleteTest}>Yes, Delete</button>
              <button type="button" className="btn-cancel btn-cancel-delete-confirm" onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
            </div>
          </>
        )}
      </Modal>

      <Modal isOpen={showManageDataSetsModal} onClose={() => { setShowManageDataSetsModal(false); setEditingDataSet(null); }} title="Manage Global Data Sets" size="lg">
        {editingDataSet ? (
          // FORMULAIRE D'ÉDITION DE DATASET
          <div className="dataset-editor-form">
            <h3>Editing Data Set: <span className="dataset-editor-name">{editingDataSet.name || "(Unnamed)"}</span></h3>
            <div className="form-field">
              <label htmlFor="editDsName">Data Set Name:</label>
              <input type="text" id="editDsName" className="input" value={editingDataSet.name} onChange={e => setEditingDataSet(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., Staging Environment" required />
            </div>
            <h4>Variables:</h4>
            {editingDataSet.variables && Array.isArray(editingDataSet.variables) && editingDataSet.variables.map((variable, index) => (
              <div key={`edit-var-${index}`} className="variable-entry">
                <input type="text" className="input" value={variable.key} onChange={e => handleDataSetVariableChange(editingDataSet.id, index, 'key', e.target.value)} placeholder="Variable Key (e.g., username)" />
                <span className="variable-separator">:</span>
                <input type="text" className="input" value={variable.value} onChange={e => handleDataSetVariableChange(editingDataSet.id, index, 'value', e.target.value)} placeholder="Variable Value" />
                <button type="button" className="btn-remove-variable" title="Remove variable" onClick={() => handleRemoveVariableFromDsForm(editingDataSet.id, index)}>×</button>
              </div>
            ))}
            <button type="button" className="btn-add-variable" onClick={() => handleAddVariableToDsForm(editingDataSet.id)}>+ Add Variable</button>
            <div className="modal-actions">
              <button className="btn-save" onClick={handleSaveEditingDataSet}>Save Changes</button>
              <button type="button" className="btn-cancel" onClick={() => setEditingDataSet(null)}>Cancel Edit</button>
            </div>
          </div>
        ) : (
          // FORMULAIRE D'AJOUT DE DATASET
          <div className="dataset-editor-form">
            <h3>Add New Data Set</h3>
            <div className="form-field">
              <label htmlFor="newDsName">Data Set Name:</label>
              <input type="text" id="newDsName" className="input" value={newDataSet.name} onChange={e => setNewDataSet(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., Production Users" required />
            </div>
            <h4>Variables:</h4>
            {newDataSet.variables && Array.isArray(newDataSet.variables) && newDataSet.variables.map((variable, index) => (
              <div key={`new-var-${index}`} className="variable-entry">
                <input type="text" className="input" value={variable.key} onChange={e => handleDataSetVariableChange('new', index, 'key', e.target.value)} placeholder="Variable Key" />
                <span className="variable-separator">:</span>
                <input type="text" className="input" value={variable.value} onChange={e => handleDataSetVariableChange('new', index, 'value', e.target.value)} placeholder="Variable Value" />
                <button type="button" className="btn-remove-variable" title="Remove variable" onClick={() => handleRemoveVariableFromDsForm('new', index)}>×</button>
              </div>
            ))}
            <button type="button" className="btn-add-variable" onClick={() => handleAddVariableToDsForm('new')}>+ Add Variable</button>
            <div className="modal-actions">
              <button className="btn-add" onClick={handleSaveNewDataSet}>Add Data Set</button>
            </div>
          </div>
        )}
        <hr className="separator-hr" />
        <div className="datasets-list-container">
          <h3>Existing Data Sets ({globalDataSets.length})</h3>
          {globalDataSets.length === 0 ? (<p>No global data sets defined yet.</p>) : (
            <ul className="datasets-list">
              {globalDataSets.map(ds => (
                <li key={ds.id} className="dataset-list-item">
                  <div className="dataset-info">
                    <strong>{ds.name}</strong>
                    <span className="variable-count">({Object.keys(ds.variables).length} variable{Object.keys(ds.variables).length === 1 ? '' : 's'})</span>
                  </div>
                  <div className="dataset-actions">
                    <button className="btn-edit-sm" onClick={() => handleStartEditDataSet(ds)} disabled={!!editingDataSet && editingDataSet.id === ds.id}>Edit</button>
                    <button className="btn-delete-sm" onClick={() => handleDeleteDataSet(ds.id)} disabled={!!editingDataSet && editingDataSet.id === ds.id}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="modal-actions" style={{ marginTop: '20px', justifyContent: 'flex-end' }}>
          <button type="button" className="btn-cancel" onClick={() => { setShowManageDataSetsModal(false); setEditingDataSet(null); }}>Close</button>
        </div>
      </Modal>
    </main>
  );
}