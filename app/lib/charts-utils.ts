/**
 * Utilities to transform analysis data into the formats required by the new charts.
 */

// Base type for analysis data (from useAnalysisData)
export interface AnalysisData {
  amountsComparison: {
    company: string;
    amount: number;
    delta: number;
    color: string;
  }[];
  wbs6Analysis: {
    wbs6Id: string;
    wbs6Label: string;
    wbs6Code?: string;
    wbs6Description?: string;
    project: number;
    average: number;
    delta: number;
    absoluteDelta: number;
  }[];
  rounds: {
    number: number;
    label?: string;
  }[];
  companies: {
    name: string;
    label?: string;
    normalized?: string;
  }[];
}

// Data for the evolution trend
export interface TrendEvolutionData {
  company: string;
  color: string;
  offers: {
    round: number;
    roundLabel?: string;
    amount: number;
    delta?: number;
  }[];
  overallDelta?: number;
}

// Data for waterfall
export interface WaterfallData {
  category: string;
  projectAmount: number;
  offerAmount: number;
  delta: number;
  deltaPercentage: number;
}

// Data for heatmap
export interface HeatmapData {
  categories: {
    category: string;
    projectAmount: number;
  }[];
  companies: {
    company: string;
    categories: {
      category: string;
      offerAmount: number;
      delta: number;
    }[];
  }[];
}

/**
 * Prepares data for the Price Evolution Trend chart between Rounds
 * Note: This function requires detailed round data that might not be available
 * in the current hook. A specific hook or API extension might be needed.
 */
export function prepareTrendEvolutionData(
  amountsComparisonPerRound: {
    round: number;
    roundLabel?: string;
    offers: {
      company: string;
      amount: number;
      color: string;
    }[];
  }[]
): TrendEvolutionData[] {
  if (!amountsComparisonPerRound || amountsComparisonPerRound.length === 0) {
    return [];
  }

  // Collect all unique companies
  const companiesMap = new Map<string, { color: string; offers: TrendEvolutionData["offers"] }>();

  amountsComparisonPerRound.forEach((roundData) => {
    roundData.offers.forEach((offer) => {
      if (!companiesMap.has(offer.company)) {
        companiesMap.set(offer.company, {
          color: offer.color,
          offers: [],
        });
      }

      const companyData = companiesMap.get(offer.company)!;
      const prevOffer =
        companyData.offers.length > 0
          ? companyData.offers[companyData.offers.length - 1]
          : null;

      const delta = prevOffer
        ? ((offer.amount - prevOffer.amount) / prevOffer.amount) * 100
        : 0;

      companyData.offers.push({
        round: roundData.round,
        roundLabel: roundData.roundLabel || `Round ${roundData.round}`,
        amount: offer.amount,
        delta,
      });
    });
  });

  // Convert to array
  return Array.from(companiesMap.entries()).map(([company, data]) => {
    const offers = data.offers.sort((a, b) => a.round - b.round);
    const overallDelta =
      offers.length > 1
        ? ((offers[offers.length - 1]!.amount - offers[0]!.amount) /
            offers[0]!.amount) *
          100
        : 0;

    return {
      company,
      color: data.color,
      offers,
      overallDelta,
    };
  });
}

/**
 * Prepares data for the Waterfall Chart
 */
export function prepareWaterfallData(
  wbs6Analysis: AnalysisData["wbs6Analysis"],
  totalProjectAmount: number,
  totalOfferAmount: number
): {
  data: WaterfallData[];
  totalProjectAmount: number;
  totalOfferAmount: number;
} {
  if (!wbs6Analysis || wbs6Analysis.length === 0) {
    return {
      data: [],
      totalProjectAmount: 0,
      totalOfferAmount: 0,
    };
  }

  const data: WaterfallData[] = wbs6Analysis.map((wbs) => ({
    category: wbs.wbs6Label || wbs.wbs6Code || "N/A",
    projectAmount: wbs.project,
    offerAmount: wbs.average,
    delta: wbs.absoluteDelta,
    deltaPercentage: wbs.delta,
  }));

  return {
    data,
    totalProjectAmount,
    totalOfferAmount,
  };
}

/**
 * Prepare data for the competitiveness heatmap.
 * Note: requires detailed per-company/per-category data that may not be available.
 * The API might need to be extended.
 */
export function prepareHeatmapData(
  wbs6AnalysisPerCompany: {
    company: string;
    wbs6: {
      wbs6Id: string;
      wbs6Label: string;
      project: number;
      offer: number;
      delta: number;
    }[];
  }[]
): HeatmapData {
  if (
    !wbs6AnalysisPerCompany ||
    wbs6AnalysisPerCompany.length === 0
  ) {
    return { categories: [], companies: [] };
  }

  // Collect all unique categories
  const categoriesMap = new Map<
    string,
    { category: string; projectAmount: number }
  >();

  wbs6AnalysisPerCompany.forEach((company) => {
    company.wbs6.forEach((cat) => {
      if (!categoriesMap.has(cat.wbs6Id)) {
        categoriesMap.set(cat.wbs6Id, {
          category: cat.wbs6Label,
          projectAmount: cat.project,
        });
      }
    });
  });

  const categories = Array.from(categoriesMap.values());

  // Prepare data per company
  const companies = wbs6AnalysisPerCompany.map((comp) => ({
    company: comp.company,
    categories: comp.wbs6.map((cat) => ({
      category: cat.wbs6Label,
      offerAmount: cat.offer,
      delta: cat.delta,
    })),
  }));

  return { categories, companies };
}

/**
 * Generate mock data for Trend Evolution
 * Use only for demo/testing
 */
export function generateMockTrendData(
  companies: string[],
  numRounds: number = 3
): TrendEvolutionData[] {
  const colors = [
    "hsl(217 91% 60%)",
    "hsl(142 71% 45%)",
    "hsl(38 92% 55%)",
    "hsl(0 84% 60%)",
    "hsl(260 80% 65%)",
  ];

  return companies.map((company, idx) => {
    const baseAmount = 1000000 + Math.random() * 500000;
    const offers: { round: number; roundLabel: string; amount: number; delta: number }[] = [];

    for (let round = 1; round <= numRounds; round++) {
      const reduction = round === 1 ? 0 : Math.random() * 0.1; // 0-10% reduction
      const amount = baseAmount * (1 - reduction * (round - 1));
      const prevAmount: number = round > 1 ? offers[round - 2]?.amount ?? baseAmount : baseAmount;
      const delta = ((amount - prevAmount) / prevAmount) * 100;

      offers.push({
        round,
        roundLabel: `Round ${round}`,
        amount,
        delta,
      });
    }

    const lastOffer = offers[offers.length - 1];
    const firstOffer = offers[0];
    const overallDelta =
      lastOffer && firstOffer
        ? ((lastOffer.amount - firstOffer.amount) / firstOffer.amount) * 100
        : 0;

    return {
      company,
      color: colors[idx % colors.length] ?? "#000000",
      offers,
      overallDelta,
    };
  });
}
