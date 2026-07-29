// Core domain types for Opportunity Radar.
// Everything the UI renders derives from these; keep them the single source of truth.

export type Category =
  | 'AI Services'
  | 'Micro-SaaS'
  | 'Local Business'
  | 'Creator Economy'
  | 'Education'
  | 'Health Technology'
  | 'Cybersecurity'
  | 'Business Automation'
  | 'Remote Work'
  | 'Sustainability';

export type OpportunityType =
  | 'Product'
  | 'Service'
  | 'Content'
  | 'Marketplace'
  | 'Consulting';

export type CompetitionLevel = 'Low' | 'Moderate' | 'High';
export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';
export type GrowthVelocity = 'Steady' | 'Rising' | 'Accelerating' | 'Explosive';
export type TimeWindow = 'Open now' | 'Opening' | 'Narrowing';
export type Confidence = 'Low' | 'Medium' | 'High';
export type LocationMode = 'Remote' | 'Local' | 'Hybrid';

/** Where the record's data comes from. Demo records must never claim verification. */
export type SourceStatus = 'demo' | 'ai-estimate' | 'human-reviewed' | 'verified';

export interface StartupCostRange {
  minUsd: number;
  maxUsd: number;
}

/** Raw factor inputs to the Opportunity Score, each 0–100. */
export interface ScoreComponents {
  marketGrowth: number;
  competitionAdvantage: number;
  revenuePotential: number;
  timingUrgency: number;
  easeOfExecution: number;
  dataConfidence: number;
}

export type SignalCategory =
  | 'Search growth'
  | 'Hiring demand'
  | 'Funding activity'
  | 'Regulatory change'
  | 'Technology improvement'
  | 'Consumer behavior'
  | 'Supply gap'
  | 'Competitor weakness'
  | 'Cost reduction'
  | 'Cultural momentum';

export type SignalStrength = 'Weak' | 'Moderate' | 'Strong';

export interface Signal {
  category: SignalCategory;
  headline: string;
  detail: string;
  strength: SignalStrength;
  /** 'estimate' = AI interpretation of demo data; 'verified' requires a human-checked citation. */
  evidence: 'estimate' | 'verified';
  sourceNote: string;
}

export interface RevenueModel {
  name: string;
  description: string;
}

export interface Risk {
  title: string;
  detail: string;
  severity: 'Low' | 'Medium' | 'High';
}

export interface Opportunity {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  category: Category;
  opportunityType: OpportunityType;
  targetCustomer: string;
  locationMode: LocationMode;
  /** Weighted 0–100 total; always derived from scoreComponents via computeScore(). */
  score: number;
  scoreComponents: ScoreComponents;
  growthVelocity: GrowthVelocity;
  competitionLevel: CompetitionLevel;
  startupCostRange: StartupCostRange;
  difficulty: Difficulty;
  timeToMarket: string;
  timeWindow: TimeWindow;
  confidence: Confidence;
  whyNow: string;
  signals: Signal[];
  revenueModels: RevenueModel[];
  risks: Risk[];
  actionPlan: string[];
  sevenDayPlan: string[];
  thirtyDayPlan: string[];
  relatedOpportunityIds: string[];
  createdAt: string;
  updatedAt: string;
  sourceStatus: SourceStatus;
  isDemo: boolean;
}

export const CATEGORIES: Category[] = [
  'AI Services',
  'Micro-SaaS',
  'Local Business',
  'Creator Economy',
  'Education',
  'Health Technology',
  'Cybersecurity',
  'Business Automation',
  'Remote Work',
  'Sustainability',
];
