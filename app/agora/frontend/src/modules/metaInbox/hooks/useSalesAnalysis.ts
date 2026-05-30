import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSalesAnalysis, upsertSalesAnalysis } from "@/services/metaInbox.service";
import type { SalesAnalysis, SalesAnalysisUpdate } from "@/types/metaInbox";

const DEFAULT_FORM: SalesAnalysisUpdate = {
  leadType: "DESCONOCIDO",
  ageRange: "NO_DEFINIDO",
  sex: "NO_IDENTIFICADO",
  customerType: "NO_DEFINIDO",
  purchaseIntent: "NO_DEFINIDO",
  result: "EN_PROCESO",
  planContracted: null,
  saleType: null,
  lossReason: null,
  verbalizationTags: [],
  verbalizationText: null,
};

const salesKey = (sessionId: string) => ["metaInbox", "salesAnalysis", sessionId] as const;

export function useSalesAnalysis(sessionId: string | null) {
  const qc = useQueryClient();
  const [form, setForm] = useState<SalesAnalysisUpdate>(DEFAULT_FORM);
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: salesKey(sessionId!),
    queryFn: () => getSalesAnalysis(sessionId!),
    enabled: !!sessionId,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (data) {
      setForm({
        leadType: data.leadType,
        ageRange: data.ageRange,
        sex: data.sex,
        customerType: data.customerType,
        purchaseIntent: data.purchaseIntent,
        result: data.result,
        planContracted: data.planContracted,
        saleType: data.saleType,
        lossReason: data.lossReason,
        verbalizationTags: data.verbalizationTags,
        verbalizationText: data.verbalizationText,
      });
    } else if (!isLoading) {
      setForm(DEFAULT_FORM);
    }
  }, [data, isLoading, sessionId]);

  useEffect(() => {
    setForm(DEFAULT_FORM);
    setSaved(false);
  }, [sessionId]);

  const { mutateAsync, isPending: saving } = useMutation({
    mutationFn: (payload: SalesAnalysisUpdate) => upsertSalesAnalysis(sessionId!, payload),
    onSuccess: (result: SalesAnalysis) => {
      qc.setQueryData(salesKey(sessionId!), result);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const handleChange = (patch: Partial<SalesAnalysisUpdate>) => {
    setSaved(false);
    setForm((prev) => {
      const next = { ...prev, ...patch };
      if (next.result !== "GANADO") { next.planContracted = null; next.saleType = null; }
      if (next.result !== "PERDIDO") { next.lossReason = null; }
      return next;
    });
  };

  const handleToggleTag = (tag: string) => {
    setForm((prev) => {
      const tags = prev.verbalizationTags ?? [];
      return {
        ...prev,
        verbalizationTags: tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag],
      };
    });
    setSaved(false);
  };

  const handleSave = () => {
    if (!sessionId) return;
    return mutateAsync(form);
  };

  return { form, isLoading, saving, saved, handleChange, handleToggleTag, handleSave };
}
