import { NextRequest, NextResponse } from "next/server";

import type { InsightStatus } from "@/types/database";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");
    const orgId = searchParams.get("orgId");
    const status = (searchParams.get("status") || "active") as InsightStatus;
    const limit = parseInt(searchParams.get("limit") || "10");

    let query = supabase
      .from("customer_ai_insights")
      .select("*, customers!inner(name)")
      .eq("status", status)
      .order("priority_score", { ascending: false })
      .limit(limit);

    if (customerId) {
      query = query.eq("customer_id", customerId);
    }
    if (orgId) {
      query = query.eq("org_id", orgId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
