import { useState, useMemo, useRef, useEffect } from "react";
import "./App.css";

const STATUSES = ["To do", "Success", "Failed"];

// Helper pour les IDs auto-incrémentés
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
    dataset: [
      { username: "user1", password: "pass1" },
      { username: "user2", password: "pass2" }
    ],
    status: "To do"
  }
];

export default function App() {
  const [tests, setTests] = useState(() => {
    // Lazy initializer: try to load from localStorage
    const savedTests = localStorage.getItem("cahierDeTests");
    return savedTests ? JSON.parse(savedTests) : initialTests;
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTest, setNewTest] = useState({
    description: "",
    expectedData: "",
    dataset: "", // Keep as string for input
    status: "To do"
  });

  // Edition state
  const [editingTest, setEditingTest] = useState(null); // Stores the whole test object being edited
  const [editingFields, setEditingFields] = useState({
    description: "",
    expectedData: "",
    dataset: "", // Keep as string for input
    status: "To do"
  });

  // Quick edit status
  const [editingStatusId, setEditingStatusId] = useState(null);
  const statusDropdownRef = useRef(null);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null); // Stores the test object to be deleted

  // Persist to localStorage whenever tests change
  useEffect(() => {
    localStorage.setItem("cahierDeTests", JSON.stringify(tests));
  }, [tests]);


  useEffect(() => {
    function handleClickOutside(event) {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target)
      ) {
        setEditingStatusId(null);
      }
    }
    if (editingStatusId) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editingStatusId]);

  // Stats
  const total = tests.length;
  const done = useMemo(() => tests.filter(t => t.status === "Success").length, [tests]);
  const failed = useMemo(() => tests.filter(t => t.status === "Failed").length, [tests]);
  const todo = useMemo(() => tests.filter(t => t.status === "To do").length, [tests]);

  // Add new test
  const handleAddTest = () => {
    if (!newTest.description.trim() || !newTest.expectedData.trim()) {
      alert("Description and Expected Data are required."); // Simple validation
      return;
    }
    let parsedDataset = [];
    if (newTest.dataset.trim()) {
      try {
        parsedDataset = JSON.parse(newTest.dataset);
      } catch (error) {
        alert("Invalid JSON format in Dataset. Please provide valid JSON or leave it empty.");
        return;
      }
    }

    const id = generateNextId(tests);
    setTests(prevTests => [
      ...prevTests,
      {
        id,
        description: newTest.description.trim(),
        expectedData: newTest.expectedData.trim(),
        dataset: parsedDataset,
        status: newTest.status
      }
    ]);
    setNewTest({
      description: "",
      expectedData: "",
      dataset: "",
      status: "To do"
    });
    setShowAddModal(false);
    // TODO: Add success notification (toast)
  };

  // Trigger delete confirmation
  const handleDeleteTest = (testToDelete) => {
    setShowDeleteConfirm(testToDelete);
  };

  // Confirm and execute deletion
  const confirmDeleteTest = () => {
    if (showDeleteConfirm) {
      setTests(prevTests => prevTests.filter((t) => t.id !== showDeleteConfirm.id));
      setShowDeleteConfirm(null);
      // TODO: Add success notification (toast)
    }
  };


  // Open modal for editing a test
  const handleOpenEditModal = (test) => {
    setEditingTest(test);
    setEditingFields({
      description: test.description,
      expectedData: test.expectedData,
      dataset: JSON.stringify(test.dataset ?? [], null, 2), // Prettify for editing
      status: test.status
    });
  };

  // Save edition
  const handleSaveEdit = () => {
    if (!editingTest) return;
    if (!editingFields.description.trim() || !editingFields.expectedData.trim()) {
      alert("Description and Expected Data are required.");
      return;
    }

    let parsedDataset = [];
    if (editingFields.dataset.trim()) {
      try {
        parsedDataset = JSON.parse(editingFields.dataset);
      } catch (error) {
        alert("Invalid JSON format in Dataset. Please provide valid JSON or leave it empty.");
        return;
      }
    }

    setTests(prevTests => prevTests.map(t =>
      t.id === editingTest.id
        ? {
            ...t,
            description: editingFields.description.trim(),
            expectedData: editingFields.expectedData.trim(),
            dataset: parsedDataset,
            status: editingFields.status
          }
        : t
    ));
    setEditingTest(null);
    // TODO: Add success notification (toast)
  };

  const handleQuickStatusChange = (testId, newStatus) => {
    setTests(prevTests =>
      prevTests.map(t =>
        t.id === testId ? { ...t, status: newStatus } : t
      )
    );
    setEditingStatusId(null);
  };


  return (
    <main>
      <div className="page-header">
        <h1 className="title">
          <span role="img" aria-label="test document">📝</span>
          <span role="img" aria-label="test tube">🧪</span>
          Interactive Test Book
        </h1>
        <div className="mini-stats">
          <span className="mini-stat total" title="Total">{total}</span>
          <span className="mini-stat todo" title="To do">{todo}</span>
          <span className="mini-stat done" title="Success">{done}</span>
          <span className="mini-stat failed" title="Failed">{failed}</span>
        </div>
        <button className="btn-add-header" onClick={() => setShowAddModal(true)}>
          + Add test
        </button>
      </div>

      {/* TABLE */}
      <div className="table-wrapper">
        <table className="styled-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Description</th>
              <th>Expected data</th>
              <th>Dataset (JSON)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tests.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-table-message">
                  No tests yet. Click "+ Add test" to create your first one!
                </td>
              </tr>
            ) : (
              tests.map((test) => (
                <tr key={test.id}>
                  <td>{test.id}</td>
                  <td
                    style={{ cursor: "pointer", textDecoration: "underline dotted", color: "#2563eb" }}
                    onClick={() => handleOpenEditModal(test)}
                    title="Edit this test (description, data, status)"
                  >
                    {test.description}
                  </td>
                  <td>{test.expectedData}</td>
                  <td>
                    <pre className="json-cell">
                      {JSON.stringify(test.dataset, null, 2)}
                    </pre>
                  </td>
                  <td style={{ position: "relative", minWidth: 120 }}>
                    {editingStatusId === test.id ? (
                      <div ref={statusDropdownRef} className="status-dropdown">
                        {STATUSES.map((st) => (
                          <div
                            key={st}
                            className={`status-dropdown-item badge badge-${st.replace(/\s/g, "").toLowerCase()}`}
                            onClick={() => handleQuickStatusChange(test.id, st)}
                          >
                            {st}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span
                        className={`badge badge-${test.status.replace(/\s/g, "").toLowerCase()}`}
                        style={{ cursor: "pointer" }}
                        onClick={() => setEditingStatusId(test.id)}
                        title="Click to quickly change status"
                        role="button" // Added for accessibility
                        tabIndex={0} // Make it focusable
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setEditingStatusId(test.id)}
                      >
                        {test.status}
                      </span>
                    )}
                  </td>
                  <td>
                    <button className="btn-edit" onClick={() => handleOpenEditModal(test)}>
                      ✏️ Edit
                    </button>
                    <button className="btn-delete" onClick={() => handleDeleteTest(test)}>
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL FOR ADD */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="addTestTitle">
            <h2 className="modal-title" id="addTestTitle">Add a new test</h2>
            <form className="form-layout" onSubmit={e => { e.preventDefault(); handleAddTest(); }}>
              <input
                className="input"
                placeholder="Description (required)"
                value={newTest.description}
                onChange={e => setNewTest({ ...newTest, description: e.target.value })}
                required // HTML5 validation
              />
              <input
                className="input"
                placeholder="Expected data (required)"
                value={newTest.expectedData}
                onChange={e => setNewTest({ ...newTest, expectedData: e.target.value })}
                required // HTML5 validation
              />
              <textarea // Changed to textarea for multiline JSON
                className="input"
                placeholder='Dataset (JSON format, e.g., [{"key":"value"}])'
                value={newTest.dataset}
                onChange={e => setNewTest({ ...newTest, dataset: e.target.value })}
                rows={4} // Provide some initial height
              />
              <select
                className="select-input" // Use specific class for select if needed
                value={newTest.status}
                onChange={e => setNewTest({ ...newTest, status: e.target.value })}
              >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="modal-actions">
                <button className="btn-add" type="submit">+ Add Test</button>
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FOR EDIT */}
      {editingTest && (
        <div className="modal-overlay" onClick={() => setEditingTest(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby={`editTestTitle-${editingTest.id}`}>
            <h2 className="modal-title" id={`editTestTitle-${editingTest.id}`}>Edit test {editingTest.id}</h2>
            <form className="form-layout" onSubmit={e => { e.preventDefault(); handleSaveEdit(); }}>
              <input
                className="input"
                placeholder="Description (required)"
                value={editingFields.description}
                onChange={e => setEditingFields({ ...editingFields, description: e.target.value })}
                required
              />
              <input
                className="input"
                placeholder="Expected data (required)"
                value={editingFields.expectedData}
                onChange={e => setEditingFields({ ...editingFields, expectedData: e.target.value })}
                required
              />
              <textarea // Changed to textarea for multiline JSON
                className="input"
                placeholder='Dataset (JSON format, e.g., [{"key":"value"}])'
                value={editingFields.dataset}
                onChange={e => setEditingFields({ ...editingFields, dataset: e.target.value })}
                rows={4}
              />
              <select
                className="select-input"
                value={editingFields.status}
                onChange={e => setEditingFields({ ...editingFields, status: e.target.value })}
              >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="modal-actions">
                <button className="btn-add" type="submit">Save Changes</button>
                <button type="button" className="btn-cancel" onClick={() => setEditingTest(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

       {/* MODAL FOR DELETE CONFIRMATION */}
       {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-labelledby="deleteConfirmTitle" aria-describedby="deleteConfirmDesc">
            <h2 className="modal-title" id="deleteConfirmTitle">Confirm Deletion</h2>
            <p id="deleteConfirmDesc">Are you sure you want to delete test <strong>{showDeleteConfirm.id}: {showDeleteConfirm.description}</strong>? This action cannot be undone.</p>
            <div className="modal-actions centered"> {/* Added centered for these buttons */}
              <button className="btn-delete" onClick={confirmDeleteTest} style={{backgroundColor: '#ffe3e3'}}>Yes, Delete</button>
              <button type="button" className="btn-cancel" onClick={() => setShowDeleteConfirm(null)} style={{color: '#555', fontWeight: 'normal', border: '1px solid #ccc'}}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}