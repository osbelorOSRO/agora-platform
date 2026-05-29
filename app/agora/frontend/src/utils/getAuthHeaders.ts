import { storage } from "@/lib/storage";

export const getAuthHeaders = () => ({
  Authorization: `Bearer ${storage.getToken()}`,
  "Content-Type": "application/json",
});
