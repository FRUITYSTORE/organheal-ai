export const HEALTH_INTELLIGENCE_RULES = {
  score: {
    strongMinimum: 80,
    stableMinimum: 60,

    comparison: {
      alignedMaximumDifference: 5,
    },
  },
  momentum: {
    minimumMeaningfulChange: 3,
  },

    confidence: {
    highMinimumScore: 75,
    moderateMinimumScore: 45,

    weights: {
      sourceCategory: 15,
      dataPoint: 4,
      dataPointMaximum: 40,
      comparableHistorySource: 10,
      comparableHistoryMaximum: 20,
    },
  },
  
  evidence: {
    comprehensive: {
      minimumSourceCount: 4,
      minimumCompleteness: 85,
    },

    connected: {
      minimumSourceCount: 3,
      minimumCompleteness: 65,
    },

    developing: {
      minimumSourceCount: 2,
      minimumCompleteness: 35,
    },
  },
} as const;