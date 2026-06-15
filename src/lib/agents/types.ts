import type { OutputFormat, RewriteResult } from "../dna/types";

export type AgentName =
  | "Voice Profile Agent"
  | "Intent Agent"
  | "Knowledge Grounding Agent"
  | "Rewrite Agent"
  | "Evaluation Harness Agent";

export type AgentStatus = "completed" | "skipped" | "failed";

export interface AgentTraceStep {
  name: AgentName;
  status: AgentStatus;
  detail: string;
  result?: string;
  timestamp: string;
}

export type TaskType = OutputFormat;
export type UserGoal =
  | "request"
  | "announcement"
  | "thanks"
  | "apology"
  | "follow-up"
  | "general";
export type RecommendedTone = "casual" | "warm" | "polished" | "confident" | "concise";

export interface IntentResult {
  taskType: TaskType;
  userGoal: UserGoal;
  recommendedTone: RecommendedTone;
  confidence: number;
  rationale: string;
}

export interface EvaluationDimension {
  label: string;
  score: number;
  detail: string;
}

export interface EvaluationResult {
  overall: number;
  dimensions: EvaluationDimension[];
  verdict: string;
  revisionHints: string[];
  passed: boolean;
}

export interface AgentPipelineResult extends RewriteResult {
  intent: IntentResult;
  evaluation: EvaluationResult;
  agentTrace: AgentTraceStep[];
}
