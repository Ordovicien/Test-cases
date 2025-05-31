// src/components/TestTableRow.jsx
import React, { useMemo } from 'react';
import StatusBadge from './StatusBadge'; // Importer le nouveau composant

// La fonction resolvePlaceholders doit être accessible ici.
// Soit on la passe en prop, soit on l'importe si elle est dans un fichier utilitaire.
// Pour l'instant, supposons qu'elle est passée en prop ou définie globalement.
// Idéalement, déplacez resolvePlaceholders dans un fichier utils.js et importez-la.

function TestTableRow({
  test,
  globalDataSets,
  resolvePlaceholders, // Prop pour la fonction de résolution
  onOpenEditModal,
  onDeleteTest,
  onQuickStatusChange
}) {
  const resolvedDatasetForDisplay = useMemo(
    () => resolvePlaceholders(test.dataset, globalDataSets),
    [test.dataset, globalDataSets, resolvePlaceholders]
  );

  return (
    <tr>
      <td>{test.id}</td>
      <td
        style={{ cursor: "pointer", textDecoration: "underline dotted", color: "#2563eb" }}
        onClick={() => onOpenEditModal(test)}
        title="Edit this test"
      >
        {test.description}
      </td>
      <td>{test.expectedData}</td>
      <td>
        <pre className="json-cell">
          {JSON.stringify(resolvedDatasetForDisplay, null, 2)}
        </pre>
      </td>
      <td>
        <StatusBadge
            testId={test.id}
            currentStatus={test.status}
            onStatusChange={onQuickStatusChange}
        />
      </td>
      <td>
        <button className="btn-edit" onClick={() => onOpenEditModal(test)}>✏️ Edit</button>
        <button className="btn-delete" onClick={() => onDeleteTest(test)}>🗑️ Delete</button>
      </td>
    </tr>
  );
}

export default TestTableRow;