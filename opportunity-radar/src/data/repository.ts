import type { Opportunity } from '../types/opportunity';
import { OPPORTUNITIES } from './opportunities';

/**
 * Data-access seam. The UI only ever talks to an OpportunityRepository, so the
 * demo dataset can be swapped for an API/database-backed implementation
 * without touching components (see docs/OPPORTUNITY_RADAR_MVP.md, "Future data
 * strategy").
 */
export interface OpportunityRepository {
  listAll(): Promise<Opportunity[]>;
  getBySlug(slug: string): Promise<Opportunity | null>;
  getByIds(ids: string[]): Promise<Opportunity[]>;
}

/** Simulated latency so loading states are real, not decorative. */
const DEMO_LATENCY_MS = 350;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class DemoOpportunityRepository implements OpportunityRepository {
  constructor(private latencyMs: number = DEMO_LATENCY_MS) {}

  async listAll(): Promise<Opportunity[]> {
    await delay(this.latencyMs);
    return [...OPPORTUNITIES];
  }

  async getBySlug(slug: string): Promise<Opportunity | null> {
    await delay(this.latencyMs);
    return OPPORTUNITIES.find((o) => o.slug === slug) ?? null;
  }

  async getByIds(ids: string[]): Promise<Opportunity[]> {
    await delay(this.latencyMs);
    const byId = new Map(OPPORTUNITIES.map((o) => [o.id, o]));
    return ids.flatMap((id) => byId.get(id) ?? []);
  }
}

export const repository: OpportunityRepository = new DemoOpportunityRepository();
