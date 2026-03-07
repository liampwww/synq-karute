"use client";

import { useEffect, useRef } from "react";

import type { Tables } from "@/types/database";
import { useAuthStore } from "@/stores/auth-store";
import { createClient } from "@/lib/supabase/client";

export function useAuth() {
  const staff = useAuthStore((s) => s.staff);
  const organization = useAuthStore((s) => s.organization);
  const isLoading = useAuthStore((s) => s.isLoading);
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    const store = useAuthStore.getState();
    const supabase = createClient();

    async function init() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          store.setLoading(false);
          return;
        }

        const { data: staffRow } = await supabase
          .from("staff")
          .select("*")
          .eq("user_id", session.user.id)
          .single();

        const typedStaff = staffRow as Tables<"staff"> | null;
        if (typedStaff) {
          store.setStaff(typedStaff);

          const { data: orgRow } = await supabase
            .from("organizations")
            .select("*")
            .eq("id", typedStaff.org_id)
            .single();

          if (orgRow) {
            store.setOrganization(orgRow as Tables<"organizations">);
          }
        }
      } catch {
        // auth failed silently — dashboard will render without data
      } finally {
        store.setLoading(false);
      }
    }

    init();
  }, []);

  return {
    staff,
    organization,
    isLoading,
    isAuthenticated: !!staff,
  };
}
