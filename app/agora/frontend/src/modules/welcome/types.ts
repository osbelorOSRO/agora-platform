export type WeeklyBucket = {
  weekStart: string;
  weekEnd: string;
  total: number;
};

export type ModuleCard = {
  title: string;
  value: string;
  subtitle: string;
  to?: string;
  actionLabel?: string;
  onAction?: () => void;
  enabled: boolean;
  Icon: React.ComponentType<{ className?: string }>;
};
