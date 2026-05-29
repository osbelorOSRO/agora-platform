import * as React from "react";

interface SelectProps {
  children: React.ReactNode;
  value?: string;
  onValueChange: (value: string) => void;
}

export const Select = ({ children, value, onValueChange }: SelectProps) => {
  return (
    <select
      className="w-full border rounded-md p-2 shadow-sm"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      {children}
    </select>
  );
};

export const SelectTrigger = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export const SelectValue = ({ placeholder }: { placeholder: string }) => {
  return <option value="">{placeholder}</option>;
};

export const SelectContent = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export const SelectItem = ({ value, children }: { value: string; children: React.ReactNode }) => {
  return <option value={value}>{children}</option>;
};
