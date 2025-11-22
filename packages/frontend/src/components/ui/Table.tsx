import type { ReactNode } from 'react';
import styles from './Table.module.css';

interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  width?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

export function Table<T extends { id: string }>({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No data available',
}: TableProps<T>) {
  const isInteractive = Boolean(onRowClick);

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead className={styles.table__head}>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={styles.table__header}
                style={{ width: column.width }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={styles.table__body}>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className={styles.table__empty}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr
                key={item.id}
                className={`${styles.table__row} ${isInteractive ? styles['table__row--interactive'] : ''}`}
                onClick={() => onRowClick?.(item)}
                role={isInteractive ? 'button' : undefined}
                tabIndex={isInteractive ? 0 : undefined}
              >
                {columns.map((column) => (
                  <td key={`${item.id}-${column.key}`} className={styles.table__cell}>
                    {column.render(item)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
