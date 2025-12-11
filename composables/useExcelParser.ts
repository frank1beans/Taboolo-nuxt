/* eslint-disable @typescript-eslint/no-explicit-any */
import { ref } from 'vue'
import * as ExcelJS from 'exceljs'
import type { Worksheet, Cell } from 'exceljs'

export interface ExcelSheet {
  name: string
  rowCount: number
  columnCount: number
  headers: string[]
  data: any[][]
}

export interface ExcelParserOptions {
  detectHeaders?: boolean
  headerRow?: number
  startRow?: number
  endRow?: number
}

/**
 * Composable for parsing Excel files using ExcelJS
 * Provides utilities for reading, analyzing, and extracting data from Excel files
 */
export const useExcelParser = () => {
  const workbook = ref<ExcelJS.Workbook | null>(null)
  const sheets = ref<ExcelSheet[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Parse Excel file from File object
   */
  const parseFile = async (file: File): Promise<ExcelJS.Workbook> => {
    isLoading.value = true
    error.value = null

    try {
      const buffer = await file.arrayBuffer()
      const wb = new ExcelJS.Workbook()
      await wb.xlsx.load(buffer)

      workbook.value = wb
      sheets.value = wb.worksheets.map((ws) => extractSheetInfo(ws))

      return wb
    } catch (e: any) {
      error.value = e.message || 'Errore durante la lettura del file Excel'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Extract basic information from a worksheet
   */
  const extractSheetInfo = (worksheet: Worksheet): ExcelSheet => {
    const rowCount = worksheet.rowCount
    const columnCount = worksheet.columnCount

    // Extract headers (first row by default)
    const headers: string[] = []
    const firstRow = worksheet.getRow(1)
    firstRow.eachCell((cell, colNumber) => {
      headers[colNumber - 1] = cell.value?.toString() || `Column ${colNumber}`
    })

    // Extract all data
    const data: any[][] = []
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return // Skip header row
      const rowData: any[] = []
      row.eachCell((cell, colNumber) => {
        rowData[colNumber - 1] = getCellValue(cell)
      })
      data.push(rowData)
    })

    return {
      name: worksheet.name,
      rowCount,
      columnCount,
      headers,
      data,
    }
  }

  /**
   * Get cell value with proper type conversion
   */
  const getCellValue = (cell: Cell): any => {
    if (cell.value === null || cell.value === undefined) {
      return null
    }

    // Handle formula results
    if (cell.type === ExcelJS.ValueType.Formula) {
      return (cell.value as any).result
    }

    // Handle dates
    if (cell.type === ExcelJS.ValueType.Date) {
      return cell.value
    }

    // Handle rich text
    if (cell.type === ExcelJS.ValueType.RichText) {
      return (cell.value as any).richText.map((t: any) => t.text).join('')
    }

    // Handle hyperlinks
    if (cell.type === ExcelJS.ValueType.Hyperlink) {
      return (cell.value as any).text
    }

    // Handle merge cells
    if (cell.type === ExcelJS.ValueType.Merge) {
      return null
    }

    // Default: return as is
    return cell.value
  }

  /**
   * Get worksheet by name or index
   */
  const getSheet = (nameOrIndex: string | number): Worksheet | null => {
    if (!workbook.value) return null

    if (typeof nameOrIndex === 'string') {
      return workbook.value.getWorksheet(nameOrIndex) || null
    } else {
      return workbook.value.getWorksheet(nameOrIndex + 1) || null // ExcelJS uses 1-based index
    }
  }

  /**
   * Detect headers in a worksheet
   * Looks for the first row with string values
   */
  const detectHeaders = (worksheet: Worksheet): { row: number; headers: string[] } | null => {
    for (let rowNum = 1; rowNum <= Math.min(worksheet.rowCount, 10); rowNum++) {
      const row = worksheet.getRow(rowNum)
      const values: string[] = []
      let hasStringValues = false

      row.eachCell((cell, colNumber) => {
        const value = getCellValue(cell)
        if (typeof value === 'string' && value.trim() !== '') {
          hasStringValues = true
          values[colNumber - 1] = value.trim()
        } else {
          values[colNumber - 1] = `Column ${colNumber}`
        }
      })

      if (hasStringValues && values.length > 0) {
        return { row: rowNum, headers: values }
      }
    }

    return null
  }

  /**
   * Extract data from worksheet with options
   */
  const extractData = (
    worksheet: Worksheet,
    options: ExcelParserOptions = {}
  ): { headers: string[]; data: any[][] } => {
    const { detectHeaders: autoDetect = true, headerRow = 1, startRow, endRow } = options

    let headers: string[] = []
    let dataStartRow = headerRow + 1

    // Detect or use specified header row
    if (autoDetect) {
      const detected = detectHeaders(worksheet)
      if (detected) {
        headers = detected.headers
        dataStartRow = detected.row + 1
      }
    } else {
      const row = worksheet.getRow(headerRow)
      row.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = getCellValue(cell)?.toString() || `Column ${colNumber}`
      })
    }

    // Extract data rows
    const data: any[][] = []
    const actualStartRow = startRow || dataStartRow
    const actualEndRow = endRow || worksheet.rowCount

    for (let rowNum = actualStartRow; rowNum <= actualEndRow; rowNum++) {
      const row = worksheet.getRow(rowNum)
      const rowData: any[] = []
      let hasData = false

      row.eachCell((cell, colNumber) => {
        const value = getCellValue(cell)
        rowData[colNumber - 1] = value
        if (value !== null && value !== undefined && value !== '') {
          hasData = true
        }
      })

      // Only include rows with at least some data
      if (hasData) {
        data.push(rowData)
      }
    }

    return { headers, data }
  }

  /**
   * Get column data by header name
   */
  const getColumnData = (worksheet: Worksheet, columnName: string): any[] => {
    const { headers, data } = extractData(worksheet)
    const columnIndex = headers.findIndex((h) =>
      h.toLowerCase().includes(columnName.toLowerCase())
    )

    if (columnIndex === -1) {
      return []
    }

    return data.map((row) => row[columnIndex])
  }

  /**
   * Search for column by keywords
   * Returns column index if found, -1 otherwise
   */
  const findColumnByKeywords = (headers: string[], keywords: string[]): number => {
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].toLowerCase()
      for (const keyword of keywords) {
        if (header.includes(keyword.toLowerCase())) {
          return i
        }
      }
    }
    return -1
  }

  /**
   * Convert data to objects using headers as keys
   */
  const dataToObjects = (headers: string[], data: any[][]): Record<string, any>[] => {
    return data.map((row) => {
      const obj: Record<string, any> = {}
      headers.forEach((header, index) => {
        obj[header] = row[index]
      })
      return obj
    })
  }

  /**
   * Get sheet names
   */
  const getSheetNames = (): string[] => {
    if (!workbook.value) return []
    return workbook.value.worksheets.map((ws) => ws.name)
  }

  /**
   * Get sheet count
   */
  const getSheetCount = (): number => {
    return workbook.value?.worksheets.length || 0
  }

  /**
   * Reset parser state
   */
  const reset = () => {
    workbook.value = null
    sheets.value = []
    error.value = null
    isLoading.value = false
  }

  return {
    // State
    workbook,
    sheets,
    isLoading,
    error,

    // Methods
    parseFile,
    getSheet,
    detectHeaders,
    extractData,
    extractSheetInfo,
    getColumnData,
    findColumnByKeywords,
    dataToObjects,
    getSheetNames,
    getSheetCount,
    getCellValue,
    reset,
  }
}
