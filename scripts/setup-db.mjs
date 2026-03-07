import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = "https://ypkcgktperdnuprriatn.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlwa2Nna3RwZXJkbnVwcnJpYXRuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjg4ODI1NCwiZXhwIjoyMDg4NDY0MjU0fQ.gvfJLvo_EtQVRZWkzpU6O8B_p3wiPIwhTvhZBjcxbA0";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createStorageBucket() {
  console.log("Creating 'recordings' storage bucket...");

  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === "recordings");

  if (exists) {
    console.log("  Bucket 'recordings' already exists.");
    return;
  }

  const { error } = await supabase.storage.createBucket("recordings", {
    public: false,
    fileSizeLimit: 104857600,
    allowedMimeTypes: ["audio/webm", "audio/mp4", "audio/wav", "audio/ogg"],
  });

  if (error) {
    console.error("  Failed to create bucket:", error.message);
  } else {
    console.log("  Bucket 'recordings' created successfully.");
  }
}

async function createTestUser() {
  console.log("Creating test staff user...");

  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  if (existingUsers?.users?.length > 0) {
    console.log(
      `  ${existingUsers.users.length} user(s) already exist. Skipping.`
    );
    return existingUsers.users[0];
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: "staff@laestro.jp",
    password: "synqkarute2026",
    email_confirm: true,
  });

  if (error) {
    console.error("  Failed to create user:", error.message);
    return null;
  }

  console.log("  User created:", data.user.email);
  console.log("  User ID:", data.user.id);
  return data.user;
}

async function seedOrganizationAndStaff(userId) {
  if (!userId) return;

  console.log("Creating organization and staff record...");

  const { data: existingOrgs } = await supabase
    .from("organizations")
    .select("id")
    .limit(1);

  if (existingOrgs?.length > 0) {
    console.log("  Organization already exists. Skipping seed.");
    return;
  }

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name: "La Estro 代官山",
      type: "salon",
      settings: {
        address: "東京都渋谷区代官山町",
        phone: "03-1234-5678",
        business_hours: { open: "10:00", close: "20:00" },
      },
    })
    .select()
    .single();

  if (orgError) {
    console.error("  Failed to create org:", orgError.message);
    return;
  }

  console.log("  Organization created:", org.name, "(", org.id, ")");

  const { error: staffError } = await supabase.from("staff").insert({
    org_id: org.id,
    user_id: userId,
    name: "Liam",
    role: "owner",
    email: "staff@laestro.jp",
  });

  if (staffError) {
    console.error("  Failed to create staff:", staffError.message);
    return;
  }

  console.log("  Staff record created (owner).");

  const customers = [
    { name: "田中 花子", name_kana: "タナカ ハナコ", phone: "090-1111-2222", tags: ["常連", "カラー"] },
    { name: "鈴木 美咲", name_kana: "スズキ ミサキ", phone: "090-3333-4444", tags: ["新規"] },
    { name: "山田 太郎", name_kana: "ヤマダ タロウ", phone: "090-5555-6666", tags: ["常連", "カット"] },
  ];

  for (const c of customers) {
    const { error } = await supabase
      .from("customers")
      .insert({ ...c, org_id: org.id });
    if (error) {
      console.error(`  Failed to create customer ${c.name}:`, error.message);
    } else {
      console.log(`  Customer created: ${c.name}`);
    }
  }
}

async function main() {
  console.log("=== SYNQ Karute Setup ===\n");

  await createStorageBucket();
  console.log();

  const user = await createTestUser();
  console.log();

  await seedOrganizationAndStaff(user?.id);

  console.log("\n=== Setup complete! ===");
  console.log("\nLogin credentials:");
  console.log("  Email:    staff@laestro.jp");
  console.log("  Password: synqkarute2026");
  console.log("\nRun: npm run dev");
  console.log("Open: http://localhost:3000");
}

main().catch(console.error);
