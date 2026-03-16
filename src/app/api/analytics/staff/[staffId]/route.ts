import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import {
  calculateStaffAnalytics,
  getDefaultPeriod,
} from "@/lib/insights/calculate-staff-analytics";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const { staffId } = await params;
    if (!staffId) {
      return NextResponse.json(
        { error: "staffId is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const periodStart = searchParams.get("periodStart");
    const periodEnd = searchParams.get("periodEnd");

    let start: string;
    let end: string;

    if (periodStart && periodEnd) {
      start = periodStart;
      end = periodEnd;
    } else {
      const def = getDefaultPeriod();
      start = format(def.start, "yyyy-MM-dd");
      end = format(def.end, "yyyy-MM-dd");
    }

    const { data: analytics, error } = await supabase
      .from("staff_analytics")
      .select("*")
      .eq("staff_id", staffId)
      .eq("period_start", start)
      .eq("period_end", end)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch staff analytics" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      analytics: analytics ?? null,
      period: { start, end },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const { staffId } = await params;
    if (!staffId) {
      return NextResponse.json(
        { error: "staffId is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: staff } = await supabase
      .from("staff")
      .select("org_id")
      .eq("id", staffId)
      .single();

    if (!staff?.org_id) {
      return NextResponse.json(
        { error: "Staff not found" },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const periodStart = body.periodStart
      ? new Date(body.periodStart)
      : getDefaultPeriod().start;
    const periodEnd = body.periodEnd
      ? new Date(body.periodEnd)
      : getDefaultPeriod().end;

    await calculateStaffAnalytics(supabase, {
      staffId,
      orgId: staff.org_id as string,
      periodStart,
      periodEnd,
    });

    const startStr = format(periodStart, "yyyy-MM-dd");
    const endStr = format(periodEnd, "yyyy-MM-dd");

    const { data: analytics } = await supabase
      .from("staff_analytics")
      .select("*")
      .eq("staff_id", staffId)
      .eq("period_start", startStr)
      .eq("period_end", endStr)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      analytics: analytics ?? null,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
