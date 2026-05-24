export interface TransitionRule {
  id: string;
  target_state: "NEW" | "QUALIFIED" | "CHURNED" | "BLOCKED";
  score_operator: "lt" | "lte" | "gt" | "gte" | "eq" | null;
  score_threshold: string | null;
  required_current_state: "NEW" | "QUALIFIED" | "CHURNED" | "BLOCKED" | null;
  priority: number;
  is_active: boolean;
  description: string | null;
}

export interface SignalScoringRule {
  id: string;
  signal_type: string;
  polarity: "POSITIVE" | "NEGATIVE" | "NONE";
  delta: string;
  is_active: boolean;
  description: string | null;
}
