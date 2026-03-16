"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Database, Upload, Settings, Play } from "lucide-react";

import { useI18n } from "@/lib/i18n/context";
import type {
  FieldMapping,
  DedupStrategy,
  AnalysisResult,
} from "@/lib/migration/types";
import { useAuthStore } from "@/stores/auth-store";
import { uploadMigrationFile, confirmMigration } from "@/features/migration/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUploader } from "./file-uploader";
import { MappingEditor } from "./mapping-editor";
import { MigrationProgress } from "./migration-progress";

type WizardStep = "upload" | "mapping" | "importing" | "done";

const STEP_CONFIG = [
  { key: "upload" as const, labelKey: "fileSelect", icon: Upload },
  { key: "mapping" as const, labelKey: "mapping", icon: Settings },
  { key: "importing" as const, labelKey: "import", icon: Play },
];

export function MigrationWizard() {
  const { t } = useI18n();
  const organization = useAuthStore((s) => s.organization);
  const activeStaff = useAuthStore((s) => s.staff);

  const [step, setStep] = useState<WizardStep>("upload");
  const [isUploading, setIsUploading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const handleFileSelected = async (file: File) => {
    if (!organization || !activeStaff) {
      toast.error(t("migration.orgError"));
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadMigrationFile(
        file,
        organization.id,
        activeStaff.id
      );
      setJobId(result.jobId);
      setAnalysis(result.analysis);
      setStep("mapping");
      toast.success(
        `${result.analysis.totalRows}${t("migration.recordsDetected")}`
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("migration.uploadFailed")
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmMapping = async (
    mappings: FieldMapping[],
    dedupStrategy: DedupStrategy
  ) => {
    if (!jobId) return;

    try {
      await confirmMigration(jobId, mappings, dedupStrategy);
      setStep("importing");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("migration.importStartFailed")
      );
    }
  };

  const handleComplete = () => {
    setStep("done");
  };

  const handleReset = () => {
    setStep("upload");
    setJobId(null);
    setAnalysis(null);
  };

  const currentStepIndex = STEP_CONFIG.findIndex((s) => s.key === step);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-6 py-2">
        {STEP_CONFIG.map((s, i) => {
          const Icon = s.icon;
          const isActive = s.key === step;
          const isDone = i < currentStepIndex || step === "done";

          return (
            <div key={s.key} className="flex items-center gap-2">
              <div
                className={`flex size-8 items-center justify-center rounded-full border-2 transition-colors ${
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : isDone
                      ? "border-green-500 bg-green-500 text-white"
                      : "border-muted-foreground/30 text-muted-foreground/50"
                }`}
              >
                <Icon className="size-4" />
              </div>
              <span
                className={`text-sm ${
                  isActive ? "font-medium" : "text-muted-foreground"
                }`}
              >
                {t(`migration.${s.labelKey}`)}
              </span>
              {i < STEP_CONFIG.length - 1 && (
                <div className="mx-2 h-px w-8 bg-border" />
              )}
            </div>
          );
        })}
      </div>

      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="size-5" />
              {t("migration.dataImport")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("migration.dataImportDesc")}
            </p>
          </CardHeader>
          <CardContent>
            <FileUploader
              onFileSelected={handleFileSelected}
              isUploading={isUploading}
            />
          </CardContent>
        </Card>
      )}

      {step === "mapping" && analysis && (
        <MappingEditor
          mappings={analysis.suggestedMappings}
          sampleRows={analysis.sampleRows}
          onConfirm={handleConfirmMapping}
          onBack={() => setStep("upload")}
        />
      )}

      {step === "importing" && jobId && (
        <MigrationProgress jobId={jobId} onComplete={handleComplete} />
      )}

      {step === "done" && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
            <div className="flex size-16 items-center justify-center rounded-full bg-green-100 text-green-600">
              <Database className="size-8" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-semibold">{t("migration.importComplete")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("migration.importCompleteDesc")}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 rounded-md border px-4 py-2 text-sm hover:bg-accent transition-colors"
              >
                <ArrowLeft className="size-4" />
                {t("migration.importAnother")}
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
