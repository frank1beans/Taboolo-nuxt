/* eslint-disable @typescript-eslint/no-explicit-any */
import { ref, computed } from 'vue'
import type { Ref } from 'vue'

export type ColumnType =
  | 'code'
  | 'description'
  | 'price'
  | 'quantity'
  | 'unit'
  | 'amount'
  | 'category'
  | 'supplier'
  | 'notes'

export interface ColumnMapping {
  targetField: ColumnType
  sourceColumn: string | null
  sourceColumnIndex: number | null
  confidence: number // 0-100
  required: boolean
}

export interface ColumnMatchScore {
  columnName: string
  columnIndex: number
  score: number
  matchedKeywords: string[]
}

/**
 * Keywords for different column types (Italian and English)
 */
const COLUMN_KEYWORDS: Record<ColumnType, string[]> = {
  code: [
    'codice',
    'code',
    'cod',
    'art',
    'articolo',
    'article',
    'item code',
    'item',
    'sku',
    'id',
  ],
  description: [
    'descrizione',
    'description',
    'desc',
    'descr',
    'voce',
    'denominazione',
    'name',
    'nome',
    'dettaglio',
    'detail',
  ],
  price: [
    'prezzo',
    'price',
    'importo',
    'amount',
    'euro',
    'eur',
    'costo',
    'cost',
    'unitario',
    'unit price',
    'p.u.',
  ],
  quantity: [
    'quantita',
    'quantità',
    'quantity',
    'qta',
    'qty',
    'q.ta',
    'numero',
    'amount',
  ],
  unit: ['unita', 'unità', 'unit', 'u.m.', 'um', 'misura', 'measure'],
  amount: ['totale', 'total', 'importo totale', 'total amount', 'sum', 'somma'],
  category: ['categoria', 'category', 'cat', 'tipo', 'type', 'classe', 'class'],
  supplier: [
    'fornitore',
    'supplier',
    'vendor',
    'impresa',
    'company',
    'azienda',
    'empresa',
  ],
  notes: ['note', 'notes', 'commento', 'comment', 'osservazioni', 'remarks'],
}

/**
 * Composable for automatic column mapping and detection
 * Used in import wizards to map Excel columns to expected fields
 */
export const useColumnMapping = (headers: Ref<string[]> = ref([])) => {
  const mapping = ref<Record<ColumnType, ColumnMapping>>({} as any)
  const customMapping = ref<Record<string, string>>({}) // Custom field mappings

  /**
   * Score how well a column name matches a target type
   * Returns score 0-100
   */
  const scoreColumnMatch = (columnName: string, targetType: ColumnType): number => {
    if (!columnName) return 0

    const normalizedColumn = columnName.toLowerCase().trim()
    const keywords = COLUMN_KEYWORDS[targetType]

    let maxScore = 0

    for (const keyword of keywords) {
      const normalizedKeyword = keyword.toLowerCase()

      // Exact match: 100 points
      if (normalizedColumn === normalizedKeyword) {
        return 100
      }

      // Starts with keyword: 90 points
      if (normalizedColumn.startsWith(normalizedKeyword)) {
        maxScore = Math.max(maxScore, 90)
        continue
      }

      // Contains keyword as whole word: 80 points
      const regex = new RegExp(`\\b${normalizedKeyword}\\b`, 'i')
      if (regex.test(normalizedColumn)) {
        maxScore = Math.max(maxScore, 80)
        continue
      }

      // Contains keyword anywhere: 60 points
      if (normalizedColumn.includes(normalizedKeyword)) {
        maxScore = Math.max(maxScore, 60)
        continue
      }

      // Fuzzy match (Levenshtein distance): 20-50 points
      const distance = levenshteinDistance(normalizedColumn, normalizedKeyword)
      if (distance <= 3) {
        const fuzzyScore = Math.max(0, 50 - distance * 10)
        maxScore = Math.max(maxScore, fuzzyScore)
      }
    }

    return maxScore
  }

  /**
   * Find all possible matches for a target type
   */
  const findMatchesForType = (targetType: ColumnType): ColumnMatchScore[] => {
    const matches: ColumnMatchScore[] = []

    headers.value.forEach((header, index) => {
      const score = scoreColumnMatch(header, targetType)
      if (score > 0) {
        const matchedKeywords = COLUMN_KEYWORDS[targetType].filter((keyword) =>
          header.toLowerCase().includes(keyword.toLowerCase())
        )
        matches.push({
          columnName: header,
          columnIndex: index,
          score,
          matchedKeywords,
        })
      }
    })

    // Sort by score descending
    return matches.sort((a, b) => b.score - a.score)
  }

  /**
   * Auto-detect best mapping for all column types
   */
  const autoDetectMapping = (
    requiredFields: ColumnType[] = ['code', 'description', 'price']
  ): Record<ColumnType, ColumnMapping> => {
    const result: Record<string, ColumnMapping> = {}
    const usedColumns = new Set<number>()

    // Process in order of priority (required fields first)
    const allTypes: ColumnType[] = [
      'code',
      'description',
      'price',
      'quantity',
      'unit',
      'amount',
      'category',
      'supplier',
      'notes',
    ]

    // Sort to process required fields first
    allTypes.sort((a, b) => {
      const aRequired = requiredFields.includes(a)
      const bRequired = requiredFields.includes(b)
      if (aRequired && !bRequired) return -1
      if (!aRequired && bRequired) return 1
      return 0
    })

    for (const targetType of allTypes) {
      const matches = findMatchesForType(targetType)

      // Find best match that hasn't been used yet
      const bestMatch = matches.find((m) => !usedColumns.has(m.columnIndex))

      if (bestMatch) {
        usedColumns.add(bestMatch.columnIndex)
        result[targetType] = {
          targetField: targetType,
          sourceColumn: bestMatch.columnName,
          sourceColumnIndex: bestMatch.columnIndex,
          confidence: bestMatch.score,
          required: requiredFields.includes(targetType),
        }
      } else {
        result[targetType] = {
          targetField: targetType,
          sourceColumn: null,
          sourceColumnIndex: null,
          confidence: 0,
          required: requiredFields.includes(targetType),
        }
      }
    }

    mapping.value = result as any
    return result as any
  }

  /**
   * Manually set mapping for a field
   */
  const setMapping = (targetType: ColumnType, sourceColumnIndex: number | null) => {
    if (!mapping.value[targetType]) {
      mapping.value[targetType] = {
        targetField: targetType,
        sourceColumn: null,
        sourceColumnIndex: null,
        confidence: 0,
        required: false,
      }
    }

    if (sourceColumnIndex !== null && sourceColumnIndex >= 0) {
      mapping.value[targetType].sourceColumn = headers.value[sourceColumnIndex]
      mapping.value[targetType].sourceColumnIndex = sourceColumnIndex
      mapping.value[targetType].confidence = 100 // Manual mapping is 100% confident
    } else {
      mapping.value[targetType].sourceColumn = null
      mapping.value[targetType].sourceColumnIndex = null
      mapping.value[targetType].confidence = 0
    }
  }

  /**
   * Check if all required fields are mapped
   */
  const isValid = computed(() => {
    return Object.values(mapping.value).every((m) => {
      if (m.required) {
        return m.sourceColumn !== null && m.sourceColumnIndex !== null
      }
      return true
    })
  })

  /**
   * Get validation errors
   */
  const validationErrors = computed(() => {
    const errors: string[] = []
    Object.values(mapping.value).forEach((m) => {
      if (m.required && (m.sourceColumn === null || m.sourceColumnIndex === null)) {
        errors.push(`Campo obbligatorio "${m.targetField}" non mappato`)
      }
    })
    return errors
  })

  /**
   * Get mapping summary
   */
  const mappingSummary = computed(() => {
    const mapped = Object.values(mapping.value).filter((m) => m.sourceColumn !== null).length
    const required = Object.values(mapping.value).filter((m) => m.required).length
    const total = Object.keys(mapping.value).length

    return {
      mapped,
      required,
      total,
      isComplete: isValid.value,
    }
  })

  /**
   * Apply mapping to a data row
   * Converts array of values to object with mapped keys
   */
  const applyMapping = (row: any[]): Record<string, any> => {
    const result: Record<string, any> = {}

    Object.entries(mapping.value).forEach(([targetType, map]) => {
      if (map.sourceColumnIndex !== null) {
        result[targetType] = row[map.sourceColumnIndex]
      }
    })

    return result
  }

  /**
   * Apply mapping to all data rows
   */
  const applyMappingToAll = (data: any[][]): Record<string, any>[] => {
    return data.map((row) => applyMapping(row))
  }

  /**
   * Reset mapping
   */
  const reset = () => {
    mapping.value = {} as any
    customMapping.value = {}
  }

  /**
   * Get unmapped columns
   */
  const unmappedColumns = computed(() => {
    const mappedIndices = new Set(
      Object.values(mapping.value)
        .map((m) => m.sourceColumnIndex)
        .filter((i) => i !== null)
    )

    return headers.value
      .map((header, index) => ({ header, index }))
      .filter(({ index }) => !mappedIndices.has(index))
  })

  return {
    // State
    mapping,
    customMapping,
    isValid,
    validationErrors,
    mappingSummary,
    unmappedColumns,

    // Methods
    scoreColumnMatch,
    findMatchesForType,
    autoDetectMapping,
    setMapping,
    applyMapping,
    applyMappingToAll,
    reset,
  }
}

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length
  const len2 = str2.length
  const matrix: number[][] = []

  if (len1 === 0) return len2
  if (len2 === 0) return len1

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      )
    }
  }

  return matrix[len1][len2]
}
