import { type Ref } from 'vue';
import * as XLSX from 'xlsx';

export function useDataGridExport(gridApi: Ref<any>) {
  const exportToXlsx = (filename: string = 'export.xlsx') => {
    if (!gridApi.value) return;

    const rowData: any[] = [];

    // Export solo righe visibili dopo filtri
    gridApi.value.forEachNodeAfterFilter((node: any) => {
      rowData.push(node.data);
    });

    if (rowData.length === 0) {
      console.warn('No data to export');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(rowData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

    // Genera filename con timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const finalFilename = filename.replace('.xlsx', '') + `_${timestamp}.xlsx`;

    XLSX.writeFile(workbook, finalFilename);
  };

  const exportToCsv = (filename: string = 'export.csv') => {
    if (!gridApi.value) return;

    const rowData: any[] = [];

    gridApi.value.forEachNodeAfterFilter((node: any) => {
      rowData.push(node.data);
    });

    if (rowData.length === 0) {
      console.warn('No data to export');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(rowData);
    const csv = XLSX.utils.sheet_to_csv(worksheet);

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const finalFilename = filename.replace('.csv', '') + `_${timestamp}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', finalFilename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    exportToXlsx,
    exportToCsv,
  };
}
