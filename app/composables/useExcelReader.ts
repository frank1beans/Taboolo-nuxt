import { read, utils } from 'xlsx';

export interface ExcelReaderResult {
    headers: string[];
    sheets: string[];
    effectiveSheet: string;
    headerRowIndex: number;
    previewRows: { index: number; cells: string[]; filledCount: number }[];
}

export interface AutoDetectedColumns {
    code: string[];
    description: string[];
    price: string | null;
    quantity: string | null;
    progressive: string | null;
}

/**
 * Composable per la lettura di file Excel e l'estrazione degli headers
 */
export function useExcelReader() {

    /**
     * Conta le celle non vuote in una riga
     */
    function countFilledCells(row: (string | number)[]): number {
        return row.filter(cell => String(cell).trim().length > 0).length;
    }

    /**
     * Legge il file e restituisce preview delle prime righe per selezione manuale
     */
    async function readHeadersFromFile(
        file: File,
        sheetName?: string,
        manualHeaderRow?: number
    ): Promise<ExcelReaderResult> {
        const buffer = await file.arrayBuffer();
        const workbook = read(buffer, { type: 'array' });

        const sheetNames = workbook.SheetNames || [];

        const targetSheet = sheetName && sheetNames.includes(sheetName)
            ? sheetName
            : sheetNames[0];

        const sheet = targetSheet ? workbook.Sheets[targetSheet] : undefined;

        if (!sheet) {
            return {
                headers: [],
                sheets: sheetNames,
                effectiveSheet: targetSheet || '',
                headerRowIndex: -1,
                previewRows: []
            };
        }

        // Legge tutte le righe come array
        const rows = utils.sheet_to_json(sheet, {
            header: 1,
            blankrows: false,
            defval: ''
        }) as (string | number)[][];

        if (rows.length === 0) {
            return {
                headers: [],
                sheets: sheetNames,
                effectiveSheet: targetSheet || '',
                headerRowIndex: -1,
                previewRows: []
            };
        }

        // Crea preview delle prime 15 righe
        const previewRows: ExcelReaderResult['previewRows'] = [];
        for (let i = 0; i < Math.min(rows.length, 15); i++) {
            const row = rows[i];
            if (!row) continue;
            const cells = row.map(cell => String(cell).trim()).slice(0, 8);
            previewRows.push({
                index: i,
                cells,
                filledCount: countFilledCells(row)
            });
        }

        // Se l'utente ha specificato manualmente la riga header, usa quella
        let headerRowIndex = manualHeaderRow ?? -1;

        // Auto-detect se non specificato
        if (headerRowIndex === -1) {
            // Trova il numero massimo di colonne
            let maxColumns = 0;
            for (const row of rows) {
                if (row && row.length > maxColumns) maxColumns = row.length;
            }

            // Soglia: almeno 60% colonne riempite (minimo 4)
            const threshold = Math.max(4, Math.floor(maxColumns * 0.6));

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                if (!row) continue;
                const filledCount = countFilledCells(row);
                if (filledCount >= threshold) {
                    headerRowIndex = i;
                    break;
                }
            }

            // Fallback
            if (headerRowIndex === -1) {
                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    if (!row) continue;
                    if (countFilledCells(row) >= 3) {
                        headerRowIndex = i;
                        break;
                    }
                }
            }
        }

        const headerRow = headerRowIndex >= 0 && headerRowIndex < rows.length
            ? rows[headerRowIndex]
            : undefined;

        const headers = headerRow
            ? headerRow.map(cell => String(cell).trim()).filter(Boolean)
            : [];

        console.log('[useExcelReader] Sheet:', targetSheet);
        console.log('[useExcelReader] Header row index:', headerRowIndex);
        console.log('[useExcelReader] Headers found:', headers);

        return {
            headers,
            sheets: sheetNames,
            effectiveSheet: targetSheet || '',
            headerRowIndex,
            previewRows
        };
    }

    /**
     * Auto-rileva le colonne basandosi su pattern comuni
     */
    function autoDetectColumns(headers: string[]): AutoDetectedColumns {
        const result: AutoDetectedColumns = {
            code: [],
            description: [],
            price: null,
            quantity: null,
            progressive: null
        };

        for (const header of headers) {
            const lower = header.toLowerCase();

            if (lower.includes('cod') || lower.includes('art') || lower === 'n.' || lower === 'n') {
                result.code.push(header);
            }

            if (lower.includes('desc') || lower.includes('voce') || lower.includes('lavor')) {
                result.description.push(header);
            }

            if (!result.price && (lower.includes('prezzo') || lower.includes('price') || lower.includes('importo'))) {
                result.price = header;
            }

            if (!result.quantity && (lower.includes('quant') || lower.includes('qta') || lower.includes('qty'))) {
                result.quantity = header;
            }

            if (!result.progressive && (lower.includes('prog') || lower.includes('num'))) {
                result.progressive = header;
            }
        }

        return result;
    }

    return {
        readHeadersFromFile,
        autoDetectColumns
    };
}
