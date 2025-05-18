import { useState, useMemo } from "react";
import "./App.css";

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
  const [tests, setTests] = useState(initialTests);
  const [showAdd, setShowAdd] = useState(false);
  const [newTest, setNewTest] = useState({
    description: "",
    expectedData: "",
    dataset: "",
    status: "To do"
  });

  // Stats
  const total = tests.length;
  const done = useMemo(() => tests.filter(t => t.status === "Success").length, [tests]);
  const failed = useMemo(() => tests.filter(t => t.status === "Failed").length, [tests]);
  const todo = useMemo(() => tests.filter(t => t.status === "To do").length, [tests]);

  // Add new test
  const handleAddTest = () => {
    if (!newTest.description || !newTest.expectedData) return;
    const id = generateNextId(tests);
    setTests([
      ...tests,
      {
        id,
        description: newTest.description,
        expectedData: newTest.expectedData,
        dataset: newTest.dataset
          ? JSON.parse(newTest.dataset)
          : [],
        status: newTest.status
      }
    ]);
    setNewTest({
      description: "",
      expectedData: "",
      dataset: "",
      status: "To do"
    });
    setShowAdd(false);
  };

  // Delete test
  const handleDeleteTest = (id) => {
    setTests(tests.filter((t) => t.id !== id));
  };

  return (
    <main>
      <div className="page-header">
        <h1 className="title">
          <span role="img" aria-label="test">📝</span>
          <span role="img" aria-label="monitor">🧪</span>
          Interactive Test Book
        </h1>
        <div className="mini-stats">
          <span className="mini-stat total" title="Total">{total}</span>
          <span className="mini-stat todo" title="To do">{todo}</span>
          <span className="mini-stat done" title="Success">{done}</span>
          <span className="mini-stat failed" title="Failed">{failed}</span>
        </div>
        <button className="btn-add-header" onClick={() => setShowAdd(true)}>
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
            {tests.map((test) => (
              <tr key={test.id}>
                <td>{test.id}</td>
                <td>{test.description}</td>
                <td>{test.expectedData}</td>
                <td>
                  <pre className="json-cell">
                    {JSON.stringify(test.dataset, null, 2)}
                  </pre>
                </td>
                <td>
                  <span className={`badge badge-${test.status.replace(/\s/g, "").toLowerCase()}`}>
                    {test.status}
                  </span>
                </td>
                <td>
                  <button className="btn-delete" onClick={() => handleDeleteTest(test.id)}>
                    🗑️ Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Add a new test</h2>
            <form className="add-form" onSubmit={e => { e.preventDefault(); handleAddTest(); }}>
              <input
                className="input"
                placeholder="Description"
                value={newTest.description}
                onChange={e => setNewTest({ ...newTest, description: e.target.value })}
              />
              <input
                className="input"
                placeholder="Expected data"
                value={newTest.expectedData}
                onChange={e => setNewTest({ ...newTest, expectedData: e.target.value })}
              />
              <input
                className="input"
                placeholder='Dataset (ex: [{"username":"u","password":"p"}])'
                value={newTest.dataset}
                onChange={e => setNewTest({ ...newTest, dataset: e.target.value })}
              />
              <select
                className="input"
                value={newTest.status}
                onChange={e => setNewTest({ ...newTest, status: e.target.value })}
              >
                <option>To do</option>
                <option>Success</option>
                <option>Failed</option>
              </select>
              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button className="btn-add" type="submit">+ Add</button>
                <button type="button" className="btn-cancel" onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
