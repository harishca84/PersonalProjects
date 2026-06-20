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

export type StageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'awaiting_approval';

export type Tier = 'starter' | 'standard' | 'pro';

export type StageName =
  | 'discovery'
  | 'prd'
  | 'architecture'
  | 'tech_stack'
  | 'build'
  | 'test'
  | 'deploy';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface JobStage {
  name: string;
  status: StageStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface TierFeatures {
  name: string;
  price: string;
  description: string;
  features: string[];
  recommended?: boolean;
}

export interface PRD {
  executiveSummary: string;
  businessContext: string;
  personas: { name: string; role: string; needs: string[] }[];
  tiers: {
    starter: TierFeatures;
    standard: TierFeatures;
    pro: TierFeatures;
  };
  successMetrics: string[];
}

export interface ArchComponent {
  name: string;
  purpose: string;
  technology: string;
}

export interface DataModel {
  name: string;
  fields: string[];
}

export interface ApiEndpoint {
  method: string;
  path: string;
  purpose: string;
}

export interface Architecture {
  overview: string;
  components: ArchComponent[];
  dataModels: DataModel[];
  apiEndpoints: ApiEndpoint[];
  integrations: string[];
  deploymentTarget: string;
}

export interface TechStackComponent {
  layer: string;
  technology: string;
  reason: string;
}

export interface TechStack {
  name: string;
  reason: string;
  components: TechStackComponent[];
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

export interface Job {
  id: string;
  businessName: string;
  businessType: string;
  ownerName: string;
  description: string;
  status: JobStatus;
  chosenTier?: Tier;
  discoveryChat: ChatMessage[];
  discoverySummary?: string;
  prd?: PRD;
  architecture?: Architecture;
  techStack?: TechStack;
  buildOutput?: BuildOutput;
  liveUrl?: string;
  stages: Record<StageName, JobStage>;
  createdAt: string;
  updatedAt: string;
}
