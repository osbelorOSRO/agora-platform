import { useEffect, useState } from "react";
import { updateMetaInboxContact } from "@/services/metaInbox.service";
import type { MetaInboxContactUpdate, MetaInboxThread } from "@/types/metaInbox";
import type { InboxRealtimePayload } from "../types";

const EMPTY_FORM: MetaInboxContactUpdate = {
  displayName: "",
  firstName: "",
  lastName: "",
  phone: "",
  rut: "",
  address: "",
  email: "",
  notes: "",
  city: "",
  region: "",
};

export function useContactForm(
  selectedThread: MetaInboxThread | null,
  mergeThread: (payload: InboxRealtimePayload) => void,
) {
  const [contactForm, setContactForm] = useState<MetaInboxContactUpdate>(EMPTY_FORM);
  const [savingContact, setSavingContact] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedThread) return;
    setContactForm({
      displayName: selectedThread.displayName || "",
      firstName: selectedThread.firstName || "",
      lastName: selectedThread.lastName || "",
      phone: selectedThread.phone || "",
      rut: selectedThread.rut || "",
      address: selectedThread.address || "",
      email: selectedThread.email || "",
      notes: selectedThread.notes || "",
      city: selectedThread.city || "",
      region: selectedThread.region || "",
    });
  }, [selectedThread]);

  const handleSaveContact = async () => {
    if (!selectedThread?.sessionId) return;
    setSavingContact(true);
    setContactError(null);
    try {
      const normalized: MetaInboxContactUpdate = {
        displayName: contactForm.displayName?.trim() || undefined,
        firstName: contactForm.firstName?.trim() || undefined,
        lastName: contactForm.lastName?.trim() || undefined,
        phone: contactForm.phone?.trim() || undefined,
        rut: contactForm.rut?.trim() || undefined,
        address: contactForm.address?.trim() || undefined,
        email: contactForm.email?.trim() || undefined,
        notes: contactForm.notes?.trim() || undefined,
        city: contactForm.city?.trim() || undefined,
        region: contactForm.region?.trim() || undefined,
      };
      await updateMetaInboxContact(selectedThread.sessionId, normalized);
      mergeThread({
        sessionId: selectedThread.sessionId,
        actorExternalId: selectedThread.actorExternalId,
        objectType: selectedThread.objectType,
        displayName: normalized.displayName,
        firstName: normalized.firstName ?? null,
        lastName: normalized.lastName ?? null,
        phone: normalized.phone,
        rut: normalized.rut ?? null,
        address: normalized.address ?? null,
        email: normalized.email,
        notes: normalized.notes,
        city: normalized.city,
        region: normalized.region ?? null,
      });
    } catch (e: unknown) {
      setContactError(e instanceof Error ? e.message : "Error guardando contacto");
    } finally {
      setSavingContact(false);
    }
  };

  return { contactForm, setContactForm, savingContact, contactError, handleSaveContact };
}
