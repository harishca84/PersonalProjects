export type Tier = 'starter' | 'standard' | 'pro';

export type JobStatus =
  | 'discovery'
  | 'prd'
  | 'prd_review'
  | 'architecture'
  | 'arch_review'
  | 'tech_stack'
  | 'building'
  | 'live'
  | 'failed';

export type StageName =
  | 'discovery'
  | 'prd'
  | 'architecture'
  | 'tech_stack'
  | 'build'
  | 'test'
  | 'deploy';

export type StageStatus =
  | 'pending'
  | 'running'
  | 'awaiting_approval'
  | 'completed'
  | 'done'
  | 'failed';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface TierDefinition {
  name: string;
  price: string;
  description: string;
  features: string[];
  recommended: boolean;
}

export interface PRD {
  executiveSummary: string;
  businessContext: string;
  personas: { name: string; role: string; needs: string[] }[];
  tiers: {
    starter: TierDefinition;
    standard: TierDefinition;
    pro: TierDefinition;
  };
  successMetrics: string[];
}

export interface Architecture {
  overview: string;
  components: { name: string; purpose: string; technology: string }[];
  dataModels: { name: string; fields: string[] }[];
  apiEndpoints: { method: string; path: string; purpose: string }[];
  integrations: string[];
  deploymentTarget: string;
}

export interface TechStack {
  name: string;
  reason: string;
  components: { layer: string; technology: string; reason: string }[];
  deployTarget: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
  description: string;
}

export interface BuildOutput {
  files: GeneratedFile[];
  setupInstructions: string;
  envVariables: { key: string; description: string }[];
}

export interface StageState {
  name: string;
  status: StageStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface Job {
  id: string;
  businessName: string;
  businessType: string;
  ownerName: string;
  description?: string;
  status: JobStatus;
  stages: Record<StageName, StageState>;

  discoveryChat: ChatMessage[];
  discoverySummary?: string;

  prd?: PRD;
  chosenTier?: Tier;

  architecture?: Architecture;
  archApproved?: boolean;

  techStack?: TechStack;

  buildOutput?: BuildOutput;
  liveUrl?: string;

  createdAt: string;
  updatedAt: string;
}
