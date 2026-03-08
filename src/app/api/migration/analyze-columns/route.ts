import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

import { createClient } from "@/lib/supabase/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { unmappedColumns, sampleData, existingMappings } =
      await request.json();

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a data schema detection assistant for a Japanese salon/clinic customer management system.
Given unmapped column headers and sample data, determine the best mapping.

Target tables and fields:
- customers: name, name_kana, phone, email, notes, tags, date_of_birth, gender, address
- timeline_events: event_date, title (service/treatment name), staff_name, notes, amount

Return a JSON object with key "mappings" containing an array of objects:
{ sourceField, targetTable, targetField, transform, confidence }

transform can be: "none", "date_parse", "phone_normalize", "name_split", "kana_convert", "tags_split"
confidence is 0.0-1.0

If a column doesn't map to anything useful, set targetField to "" and confidence to 0.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            unmappedColumns,
            sampleData: sampleData?.slice(0, 3),
            existingMappings,
          }),
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json([]);
    }

    const parsed = JSON.parse(content);
    return NextResponse.json(parsed.mappings || []);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
