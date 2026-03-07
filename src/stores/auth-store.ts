import { create } from "zustand";

import type { Tables } from "@/types/database";

interface AuthState {
  staff: Tables<"staff"> | null;
  organization: Tables<"organizations"> | null;
  isLoading: boolean;
  setStaff: (staff: Tables<"staff"> | null) => void;
  setOrganization: (org: Tables<"organizations"> | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  staff: null,
  organization: null,
  isLoading: true,
  setStaff: (staff) => set({ staff }),
  setOrganization: (organization) => set({ organization }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ staff: null, organization: null, isLoading: false }),
}));
