#!/usr/bin/env node
/**
 * Creates or resets the admin user: staff@laestro.jp / synqkarute2026
 * Run: node scripts/create-admin-user.mjs
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (or pass as env var)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const EMAIL = "staff@laestro.jp";
const PASSWORD = "synqkarute2026";

function loadEnv() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return {};
  const content = readFileSync(path, "utf8");
  const env = {};
  for (const line of content.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Error: Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  console.error("Add SUPABASE_SERVICE_ROLE_KEY to .env.local (from Supabase Dashboard → Settings → API → service_role)");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("Creating/resetting admin user...");
  console.log(`  Email:    ${EMAIL}`);
  console.log(`  Password: ${PASSWORD}`);
  console.log();

  const { data: existing } = await supabase.auth.admin.listUsers();
  const found = existing?.users?.find((u) => u.email === EMAIL);

  if (found) {
    const { error } = await supabase.auth.admin.updateUserById(found.id, {
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) {
      console.error("Failed to reset password:", error.message);
      process.exit(1);
    }
    console.log("Password reset for existing user.");
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) {
      console.error("Failed to create user:", error.message);
      process.exit(1);
    }
    console.log("User created. User ID:", data.user.id);

    const { data: orgs } = await supabase.from("organizations").select("id").limit(1);
    const orgId = orgs?.[0]?.id;
    if (orgId) {
      const { error: staffErr } = await supabase.from("staff").insert({
        org_id: orgId,
        user_id: data.user.id,
        name: "Liam",
        role: "owner",
        email: EMAIL,
      });
      if (staffErr) {
        console.warn("Staff record may already exist:", staffErr.message);
      } else {
        console.log("Staff record created (owner).");
      }
    }
  }

  console.log("\nLogin with:");
  console.log(`  Email:    ${EMAIL}`);
  console.log(`  Password: ${PASSWORD}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
