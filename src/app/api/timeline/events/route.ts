import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      customer_id,
      org_id,
      staff_id,
      event_type,
      source,
      source_ref,
      title,
      description,
      structured_data,
      event_date,
      linked_record_id,
      linked_record_type,
    } = body;

    if (!customer_id || !org_id || !event_type || !title || !event_date) {
      return NextResponse.json(
        {
          error:
            "customer_id, org_id, event_type, title, and event_date are required",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("timeline_events")
      .insert({
        customer_id,
        org_id,
        staff_id: staff_id || null,
        event_type,
        source: source || "manual",
        source_ref: source_ref || null,
        title,
        description: description || null,
        structured_data: structured_data || {},
        event_date,
        linked_record_id: linked_record_id || null,
        linked_record_type: linked_record_type || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
