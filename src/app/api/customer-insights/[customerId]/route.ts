import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { calculateCustomerInsights } from "@/lib/insights/calculate-customer-insights";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { customerId } = await params;
    if (!customerId) {
      return NextResponse.json(
        { error: "customerId is required" },
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

    const { data: insight, error } = await supabase
      .from("customer_insights")
      .select("*")
      .eq("customer_id", customerId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ insight: null });
      }
      return NextResponse.json(
        { error: "Failed to fetch customer insights" },
        { status: 500 }
      );
    }

    return NextResponse.json({ insight });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { customerId } = await params;
    if (!customerId) {
      return NextResponse.json(
        { error: "customerId is required" },
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

    const { data: customer } = await supabase
      .from("customers")
      .select("org_id")
      .eq("id", customerId)
      .single();

    if (!customer?.org_id) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    await calculateCustomerInsights(
      supabase,
      customerId,
      customer.org_id as string
    );

    const { data: insight } = await supabase
      .from("customer_insights")
      .select("*")
      .eq("customer_id", customerId)
      .single();

    return NextResponse.json({
      success: true,
      insight: insight ?? null,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
