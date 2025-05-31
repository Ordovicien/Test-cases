import { useState, useMemo, useRef, useEffect } from "react";
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
      return parsed.map(t => ({ ...t, dataset: typeof t.dataset === 'string' ? t.dataset : JSON.stringify(t.dataset ?? {}) }));
    } catch (e) {
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
    catch (e) { localStorage.removeItem('globalDataSets'); return initialGlobalDataSets; }
  });
  const [showManageDataSetsModal, setShowManageDataSetsModal] = useState(false);
  const [editingDataSet, setEditingDataSet] = useState(null);
  const [newDataSet, setNewDataSet] = useState({ name: "", variables: [{ key: "", value: "" }] });

  const addDatasetTextareaRef = useRef(null);
  const editDatasetTextareaRef = useRef(null);
  const [showVariableInserter, setShowVariableInserter] = useState(false);
  const variableInserterTargetRef = useRef(null);
  const variableInserterPopoverRef = useRef(null);

  // --- Effets pour persistance locale ---
  useEffect(() => { localStorage.setItem("cahierDeTests", JSON.stringify(tests)); }, [tests]);
  useEffect(() => { localStorage.setItem("globalDataSets", JSON.stringify(globalDataSets)); }, [globalDataSets]);
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
    if (testData.dataset.trim()) { try { JSON.parse(testData.dataset); } catch (error) { errors.dataset = "Invalid JSON format."; } }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // --- Handlers TESTS ---
  const handleAddTest = () => {
    if (!validateTestForm(newTest)) return;
    const id = generateNextId(tests);
    setTests(prev => [...prev, {
      id,
      description: newTest.description.trim(),
      expectedData: newTest.expectedData.trim(),
      dataset: newTest.dataset.trim(),
      status: newTest.status
    }]);
    setNewTest({ description: "", expectedData: "", dataset: "", status: "To do" });
    closeAddTestModal();
    toast.success('Test added successfully!');
  };
  const handleDeleteTestConfirmation = (testToDelete) => setShowDeleteConfirm(testToDelete);
  const confirmDeleteTest = () => {
    if (showDeleteConfirm) {
      setTests(prev => prev.filter((t) => t.id !== showDeleteConfirm.id));
      setShowDeleteConfirm(null);
      toast.success(`Test ${showDeleteConfirm.id} deleted.`);
    }
  };
  const handleOpenEditModal = (test) => {
    setEditingTest(test);
    let datasetString = test.dataset;
    if (typeof datasetString !== 'string') {
      try { datasetString = JSON.stringify(datasetString ?? {}); } catch { datasetString = "{}"; }
    }
    setEditingFields({
      description: test.description,
      expectedData: test.expectedData,
      dataset: datasetString,
      status: test.status
    });
    setFormErrors({});
    setShowVariableInserter(false);
  };
  const handleSaveEdit = () => {
    if (!editingTest || !validateTestForm(editingFields)) return;
    setTests(prev => prev.map(t => t.id === editingTest.id ? {
      ...t,
      description: editingFields.description.trim(),
      expectedData: editingFields.expectedData.trim(),
      dataset: editingFields.dataset.trim(),
      status: editingFields.status
    } : t));
    closeEditTestModal();
    toast.success(`Test ${editingTest.id} updated!`);
  };
  const handleQuickStatusChange = (testId, newStatus) => {
    setTests(prev => prev.map(t => t.id === testId ? { ...t, status: newStatus } : t));
    toast.success(`Status of test ${testId} changed to ${newStatus}.`);
  };

  // --- Handlers DATASETS ---
  const handleOpenManageDataSets = () => {
    setShowManageDataSetsModal(true);
    setEditingDataSet(null);
    setNewDataSet({ name: "", variables: [{ key: "", value: "" }] });
  };
  const handleDataSetVariableChange = (dataSetIdOrNew, varIndex, field, value) => {
    const targetStateSetter = dataSetIdOrNew === 'new' ? setNewDataSet : setEditingDataSet;
    targetStateSetter(prev => {
      if (!prev || (dataSetIdOrNew !== 'new' && prev.id !== dataSetIdOrNew)) return prev;
      const updatedVars = [...prev.variables];
      updatedVars[varIndex] = { ...updatedVars[varIndex], [field]: value };
      return { ...prev, variables: updatedVars };
    });
  };
  const handleAddVariableToDsForm = (dataSetIdOrNew) => {
    const targetStateSetter = dataSetIdOrNew === 'new' ? setNewDataSet : setEditingDataSet;
    targetStateSetter(prev => {
      if (!prev || (dataSetIdOrNew !== 'new' && prev.id !== dataSetIdOrNew)) return prev;
      return { ...prev, variables: [...prev.variables, { key: "", value: "" }] };
    });
  };
  const handleRemoveVariableFromDsForm = (dataSetIdOrNew, varIndex) => {
    const targetStateSetter = dataSetIdOrNew === 'new' ? setNewDataSet : setEditingDataSet;
    targetStateSetter(prev => {
      if (!prev || (dataSetIdOrNew !== 'new' && prev.id !== dataSetIdOrNew)) return prev;
      return { ...prev, variables: prev.variables.filter((_, i) => i !== varIndex) };
    });
  };
  const handleSaveNewDataSet = () => {
    if (!newDataSet.name.trim()) { alert("Data Set name is required."); return; }
    const finalVariables = {};
    newDataSet.variables.forEach(v => { if (v.key.trim()) finalVariables[v.key.trim()] = v.value; });
    setGlobalDataSets(prev => [...prev, { id: generateGDSId(), name: newDataSet.name.trim(), variables: finalVariables }]);
    setNewDataSet({ name: "", variables: [{ key: "", value: "" }] });
    toast.success('Global Data Set added!');
  };
  const handleStartEditDataSet = (dataSet) => {
    let variablesArray = [];
    if (dataSet && dataSet.variables && typeof dataSet.variables === "object" && !Array.isArray(dataSet.variables)) {
      variablesArray = Object.entries(dataSet.variables).map(([key, value]) => ({ key, value }));
    }
    if (variablesArray.length === 0) variablesArray = [{ key: "", value: "" }];
    setEditingDataSet({ id: dataSet.id, name: dataSet.name, variables: variablesArray });
    setNewDataSet({ name: "", variables: [{ key: "", value: "" }] });
  };
  const handleSaveEditingDataSet = () => {
    if (!editingDataSet || !editingDataSet.name.trim()) { alert("Data Set name is required."); return; }
    const finalVariables = {};
    editingDataSet.variables.forEach(v => { if (v.key.trim()) finalVariables[v.key.trim()] = v.value; });
    setGlobalDataSets(prev => prev.map(ds => ds.id === editingDataSet.id ? { ...ds, name: editingDataSet.name.trim(), variables: finalVariables } : ds));
    setEditingDataSet(null);
    toast.success('Global Data Set updated!');
  };
  const handleDeleteDataSet = (dataSetId) => {
    if (window.confirm(`Are you sure you want to delete this Data Set?`)) {
      setGlobalDataSets(prev => prev.filter(ds => ds.id !== dataSetId));
      if (editingDataSet && editingDataSet.id === dataSetId) setEditingDataSet(null);
      toast.success('Global Data Set deleted!');
    }
  };

  // --- Variable Inserter ---
  const allGlobalVariablesList = useMemo(() => {
    const varList = [];
    const seenKeys = new Set();
    [...globalDataSets].reverse().forEach(ds => {
      Object.keys(ds.variables).forEach(key => {
        if (!seenKeys.has(key)) { varList.push({ key, source: ds.name }); seenKeys.add(key); }
      });
    });
    return varList.sort((a, b) => a.key.localeCompare(b.key));
  }, [globalDataSets]);
  const insertVariableIntoTestDataset = (variableName) => {
    const textarea = showAddModal ? addDatasetTextareaRef.current : (editingTest ? editDatasetTextareaRef.current : null);
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const placeholder = `{{${variableName}}}`;
      const newText = text.substring(0, start) + placeholder + text.substring(end);
      const activeStateSetter = showAddModal ? setNewTest : (editingTest ? setEditingFields : null);
      if (activeStateSetter) { activeStateSetter(prev => ({ ...prev, dataset: newText })); }
      setTimeout(() => { textarea.focus(); textarea.selectionStart = textarea.selectionEnd = start + placeholder.length; }, 0);
    }
    setShowVariableInserter(false);
  };

  const closeAddTestModal = () => { setShowAddModal(false); setShowVariableInserter(false); setFormErrors({}); };
  const closeEditTestModal = () => { setEditingTest(null); setShowVariableInserter(false); setFormErrors({}); };

  return (
    <main>
      <Toaster position="top-right" reverseOrder={false} />
      <div className="page-header">
        <h1 className="title"><span role="img" aria-label="test document">📝</span><span role="img" aria-label="test tube">🧪</span> Interactive Test Book</h1>
        <MiniStats total={totalTests} todo={todoTests} done={doneTests} failed={failedTests} />
        <div>
          <button className="btn-header-manage-datasets" onClick={handleOpenManageDataSets}>⚙️ Manage Data Sets</button>
          <button className="btn-add-header" onClick={() => { setShowAddModal(true); setShowVariableInserter(false); setFormErrors({}); }} style={{ marginLeft: '10px' }}>+ Add test</button>
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
                <td colSpan="6" className="empty-table-message">No tests yet.</td>
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
            <input className={`input ${formErrors.description ? 'input-error' : ''}`} placeholder="Description (required)" value={newTest.description} onChange={e => setNewTest({ ...newTest, description: e.target.value })} />
            {formErrors.description && <small className="error-message">{formErrors.description}</small>}
          </div>
          <div className="form-field">
            <input className={`input ${formErrors.expectedData ? 'input-error' : ''}`} placeholder="Expected data (required)" value={newTest.expectedData} onChange={e => setNewTest({ ...newTest, expectedData: e.target.value })} />
            {formErrors.expectedData && <small className="error-message">{formErrors.expectedData}</small>}
          </div>
          <div className="form-field dataset-field-wrapper">
            <label htmlFor="editTestDataset">Dataset (JSON with {'{{variables}}'}):</label>
            <textarea
              id="editTestDataset"
              ref={addDatasetTextareaRef}
              className={`input ${formErrors.dataset ? 'input-error' : ''}`}
              value={newTest.dataset}
              onChange={e => setNewTest({ ...newTest, dataset: e.target.value })}
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
              {'Insert Variable'}
            </button>
          </div>
          <select className="select-input" value={newTest.status} onChange={e => setNewTest({ ...newTest, status: e.target.value })}>
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
              <input className={`input ${formErrors.description ? 'input-error' : ''}`} placeholder="Description (required)" value={editingFields.description} onChange={e => setEditingFields({ ...editingFields, description: e.target.value })} />
              {formErrors.description && <small className="error-message">{formErrors.description}</small>}
            </div>
            <div className="form-field">
              <input className={`input ${formErrors.expectedData ? 'input-error' : ''}`} placeholder="Expected data (required)" value={editingFields.expectedData} onChange={e => setEditingFields({ ...editingFields, expectedData: e.target.value })} />
              {formErrors.expectedData && <small className="error-message">{formErrors.expectedData}</small>}
            </div>
            <div className="form-field dataset-field-wrapper">
              <label htmlFor="editTestDataset">Dataset (JSON with {'{{variables}}'}):</label>
              <textarea
                id="editTestDataset"
                ref={editDatasetTextareaRef}
                className={`input ${formErrors.dataset ? 'input-error' : ''}`}
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
                {'Insert Variable'}
              </button>
            </div>
            <select className="select-input" value={editingFields.status} onChange={e => setEditingFields({ ...editingFields, status: e.target.value })}>
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
            top: variableInserterTargetRef.current.getBoundingClientRect().bottom + window.scrollY + 5,
            left: variableInserterTargetRef.current.getBoundingClientRect().left + window.scrollX,
            zIndex: 1060
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

      <Modal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} title="Confirm Deletion" size="sm">
        {showDeleteConfirm && (
          <>
            <p id="deleteConfirmDesc">
              Are you sure you want to delete test <strong>{showDeleteConfirm.id}: {showDeleteConfirm.description}</strong>? This action cannot be undone.
            </p>
            <div className="modal-actions centered">
              <button className="btn-delete" onClick={confirmDeleteTest}>Yes, Delete</button>
              <button type="button" className="btn-cancel btn-cancel-delete-confirm" onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
            </div>
          </>
        )}
      </Modal>

      <Modal isOpen={showManageDataSetsModal} onClose={() => setShowManageDataSetsModal(false)} title="Manage Global Data Sets" size="lg">
        {editingDataSet ? (
          <div className="dataset-editor-form">
            <h3>Editing: {editingDataSet.name}</h3>
            <div className="form-field"><label htmlFor="editDsName">Data Set Name:</label><input type="text" id="editDsName" className="input" value={editingDataSet.name} onChange={e => setEditingDataSet(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., Staging Environment" required /></div>
            <h4>Variables:</h4>
            {editingDataSet.variables && Array.isArray(editingDataSet.variables) && editingDataSet.variables.map((variable, index) => (<div key={`edit-var-${index}`} className="variable-entry"><input type="text" className="input" value={variable.key} onChange={e => handleDataSetVariableChange(editingDataSet.id, index, 'key', e.target.value)} placeholder="Variable Key (e.g., username)" /><span className="variable-separator">:</span><input type="text" className="input" value={variable.value} onChange={e => handleDataSetVariableChange(editingDataSet.id, index, 'value', e.target.value)} placeholder="Variable Value" /><button type="button" className="btn-remove-variable" title="Remove variable" onClick={() => handleRemoveVariableFromDsForm(editingDataSet.id, index)}>×</button></div>))}
            <button type="button" className="btn-add-variable" onClick={() => handleAddVariableToDsForm(editingDataSet.id)}>+ Add Variable</button>
            <div className="modal-actions">
              <button className="btn-save" onClick={handleSaveEditingDataSet}>Save Changes</button>
              <button type="button" className="btn-cancel" onClick={() => setEditingDataSet(null)}>Cancel Edit</button>
            </div>
          </div>
        ) : (
          <div className="dataset-editor-form">
            <h3>Add New Data Set</h3>
            <div className="form-field"><label htmlFor="newDsName">Data Set Name:</label><input type="text" id="newDsName" className="input" value={newDataSet.name} onChange={e => setNewDataSet(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., Production Users" required /></div>
            <h4>Variables:</h4>
            {newDataSet.variables && Array.isArray(newDataSet.variables) && newDataSet.variables.map((variable, index) => (<div key={`new-var-${index}`} className="variable-entry"><input type="text" className="input" value={variable.key} onChange={e => handleDataSetVariableChange('new', index, 'key', e.target.value)} placeholder="Variable Key" /><span className="variable-separator">:</span><input type="text" className="input" value={variable.value} onChange={e => handleDataSetVariableChange('new', index, 'value', e.target.value)} placeholder="Variable Value" /><button type="button" className="btn-remove-variable" title="Remove variable" onClick={() => handleRemoveVariableFromDsForm('new', index)}>×</button></div>))}
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
                  <div className="dataset-info"><strong>{ds.name}</strong><span className="variable-count">({Object.keys(ds.variables).length} variables)</span></div>
                  <div className="dataset-actions">
                    <button className="btn-edit-sm" onClick={() => handleStartEditDataSet(ds)}>Edit</button>
                    <button className="btn-delete-sm" onClick={() => handleDeleteDataSet(ds.id)}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="modal-actions" style={{ marginTop: '20px', justifyContent: 'flex-end' }}>
          <button type="button" className="btn-cancel" onClick={() => setShowManageDataSetsModal(false)}>Close</button>
        </div>
      </Modal>
    </main>
  );
}
