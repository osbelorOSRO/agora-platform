import React from "react";
import { Bot, Headset, Workflow } from "lucide-react";

export const attentionClass = (mode?: string) => {
  const normalized = String(mode || "").toUpperCase();
  if (normalized === "HUMAN") return "border-[#7BBFD6] bg-[#182D46] text-sky-300";
  if (normalized === "SYSTEM") return "border-[#6BC4A0] bg-[#173038] text-emerald-300";
  if (normalized === "PAUSED") return "border-[#D4A847] bg-[#352D27] text-amber-300";
  return "border-[#E87D95] bg-[#352135] text-rose-300";
};

interface Props {
  mode?: string;
  className?: string;
}

export const AttentionIcon: React.FC<Props> = ({ mode, className }) => {
  const normalized = String(mode || "").toUpperCase();
  if (normalized === "HUMAN") return <Headset className={className} />;
  if (normalized === "SYSTEM") return <Bot className={className} />;
  return <Workflow className={className} />;
};
