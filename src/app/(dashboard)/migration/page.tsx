"use client";

import { MigrationWizard } from "@/features/migration/components/migration-wizard";

export default function MigrationPage() {
  return (
    <div className="container max-w-4xl py-6 space-y-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          データインポート
        </h1>
        <p className="text-muted-foreground">
          他のシステムからの顧客データを SYNQ Karute にインポート
        </p>
      </div>
      <MigrationWizard />
    </div>
  );
}
