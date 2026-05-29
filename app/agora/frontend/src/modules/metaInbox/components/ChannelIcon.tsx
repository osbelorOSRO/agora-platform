import React from "react";
import { Facebook, Instagram, MessageCircle, ShoppingBag } from "lucide-react";

export const channelClass = (objectType?: string) => {
  const normalized = String(objectType || "").toUpperCase();
  if (normalized === "WHATSAPP") return "border-emerald-300/60 bg-[#173038] text-emerald-300";
  if (normalized === "INSTAGRAM") return "border-fuchsia-300/60 bg-[#322247] text-fuchsia-300";
  if (normalized === "FACEBOOK") return "border-blue-400/60 bg-[#1A2A3A] text-blue-300";
  return "border-sky-300/60 bg-[#182D46] text-sky-300";
};

interface Props {
  objectType?: string;
  className?: string;
}

export const ChannelIcon: React.FC<Props> = ({ objectType, className }) => {
  const normalized = String(objectType || "").toUpperCase();
  if (normalized === "INSTAGRAM") return <Instagram className={className} />;
  if (normalized === "WHATSAPP") return <MessageCircle className={className} />;
  if (normalized === "FACEBOOK") return <ShoppingBag className={className} />;
  return <Facebook className={className} />;
};
