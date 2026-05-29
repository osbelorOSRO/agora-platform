import React from "react";

interface Props {
  onMouseDown: (e: React.MouseEvent) => void;
}

export const ResizeHandle: React.FC<Props> = ({ onMouseDown }) => (
  <div
    className="group relative z-10 w-[5px] shrink-0 cursor-col-resize bg-border transition-colors hover:bg-primary/50 active:bg-primary/70"
    onMouseDown={onMouseDown}
    role="separator"
    aria-orientation="vertical"
    title="Arrastra para redimensionar"
  >
    {/* área de hit más ancha que la visual */}
    <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
    {/* grip visual */}
    <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
      <div className="flex flex-col gap-[3px]">
        <div className="h-[3px] w-[3px] rounded-full bg-primary/70" />
        <div className="h-[3px] w-[3px] rounded-full bg-primary/70" />
        <div className="h-[3px] w-[3px] rounded-full bg-primary/70" />
        <div className="h-[3px] w-[3px] rounded-full bg-primary/70" />
        <div className="h-[3px] w-[3px] rounded-full bg-primary/70" />
      </div>
    </div>
  </div>
);
