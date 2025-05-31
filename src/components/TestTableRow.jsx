// src/components/TestTableRow.jsx
import React, { useMemo } from 'react';
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
  const resolvedDatasetForDisplay = useMemo(
    () => resolvePlaceholders(test.dataset, globalDataSets),
    [test.dataset, globalDataSets, resolvePlaceholders]
  );

  return (
    <tr>
      <td>{test.id}</td>
      <td
        className="description-cell"
        onClick={() => onOpenEditModal(test)}
        title="Edit this test's details (description, data, status, etc.)"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpenEditModal(test)}
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
      <td className="table-actions">
        <div className="table-actions-inner">
          <button
            type="button"
            className="btn-icon btn-edit-action"
            onClick={e => {
              e.stopPropagation();
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
              e.stopPropagation();
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

export default TestTableRow;
