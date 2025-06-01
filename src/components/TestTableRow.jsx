import React from 'react';
import StatusBadge from './StatusBadge';
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';

function TestTableRow({
  test,
  globalDataSets,
  resolvePlaceholders,
  onOpenEditModal,
  onDeleteTest,
  onQuickStatusChange
}) {
  // Helpers pour éviter le bug si resolvePlaceholders retourne un objet { error }
  const getResolvedOrError = value => {
    const result = resolvePlaceholders(value, globalDataSets);
    // Vérifie si result est un objet, non null, et a une propriété 'error'
    if (typeof result === "object" && result !== null && result.hasOwnProperty('error')) {
      return <span style={{ color: "red", fontStyle: "italic" }}>Invalid: {result.error}</span>;
    }
    // React gère bien le rendu de chaînes, nombres, null, undefined (ces deux derniers ne rendent rien)
    return result;
  };

  return (
    <tr>
      <td>{test.id}</td>
      <td
        className="description-cell"
        onClick={() => onOpenEditModal(test)}
        title="Click to edit this test's details" // Titre plus explicite pour l'action du clic
        role="button"
        tabIndex={0}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onOpenEditModal(test)}
      >
        {getResolvedOrError(test.description)}
      </td>
      <td>
        {getResolvedOrError(test.expectedData)}
      </td>
      <td>
        <StatusBadge
          testId={test.id}
          currentStatus={test.status}
          onStatusChange={onQuickStatusChange}
        />
      </td>
      <td className="table-actions">
        <div className="table-actions-inner"> {/* Bon pour le layout des boutons */}
          <button
            type="button"
            className="btn-icon btn-edit-action"
            onClick={e => {
              e.stopPropagation(); // Important pour éviter le déclenchement du onClick de la cellule
              onOpenEditModal(test);
            }}
            title="Edit Test Case"
            aria-label={`Edit test case ${test.id}`}
          >
            <PencilSquareIcon style={{ width: 20, height: 20 }} />
          </button>
          <button
            type="button"
            className="btn-icon btn-delete-action"
            onClick={e => {
              e.stopPropagation(); // Important
              onDeleteTest(test);
            }}
            title="Delete Test Case"
            aria-label={`Delete test case ${test.id}`}
          >
            <TrashIcon style={{ width: 20, height: 20 }} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// Envisagez React.memo pour optimiser les performances si la table est grande
// ou si le parent se re-rend fréquemment.
export default React.memo(TestTableRow);