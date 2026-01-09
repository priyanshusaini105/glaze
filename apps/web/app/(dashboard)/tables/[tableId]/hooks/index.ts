/**
 * Table Page Hooks
 * Reusable hooks extracted from the monolithic table page
 */

export { useTableData, type UseTableDataOptions, type UseTableDataReturn, type TableDataState } from './use-table-data';
export { useTableSelection, type UseTableSelectionOptions, type UseTableSelectionReturn, type SelectionRange, type CellPosition } from './use-table-selection';
export { useColumnManagement, type UseColumnManagementOptions, type UseColumnManagementReturn } from './use-column-management';
export { useCellEditing, type UseCellEditingOptions, type UseCellEditingReturn, type EditingCell } from './use-cell-editing';
