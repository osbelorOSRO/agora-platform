import React from "react";
import { X } from "lucide-react";
import type { BulkImportResult } from "@/modules/accesos/services/salesRecordService";

interface Props {
  result: BulkImportResult;
  onClose: () => void;
}

export const CsvImportBanner: React.FC<Props> = ({ result, onClose }) => {
  const ok = result.errors.length === 0;
  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
        ok
          ? "border-green-800 bg-green-950/40 text-green-400"
          : "border-yellow-800 bg-yellow-950/40 text-yellow-400"
      }`}
    >
      <div className="space-y-1">
        <p className="font-medium">
          {result.inserted} de {result.total} filas importadas correctamente
        </p>
        {result.errors.length > 0 && (
          <ul className="space-y-0.5 text-xs text-yellow-500">
            {result.errors.map((e) => (
              <li key={e.index}>
                Fila {e.index + 1}: {e.error}
              </li>
            ))}
          </ul>
        )}
      </div>
      <button type="button" onClick={onClose} aria-label="Cerrar resultado">
        <X size={14} />
      </button>
    </div>
  );
};
