"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, type Variants } from "framer-motion";
import {
  Building2,
  Brain,
  Mic,
  UsersRound,
  Globe,
  Moon,
  Sun,
  Mail,
  Shield,
} from "lucide-react";

import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/config";
import { useAuthStore } from "@/stores/auth-store";
import type { Tables } from "@/types/database";
import {
  BUSINESS_TYPES,
  BUSINESS_TYPE_KEYS,
  type BusinessTypeKey,
} from "@/lib/business-types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const pageVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

const ROLE_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  owner: "default",
  admin: "secondary",
  stylist: "outline",
  assistant: "outline",
};

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function useLocalStorageState(
  key: string,
  defaultValue: string
): [string, (val: string) => void] {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    const stored = localStorage.getItem(key);
    if (stored) setValue(stored);
  }, [key]);

  const set = useCallback(
    (val: string) => {
      setValue(val);
      localStorage.setItem(key, val);
    },
    [key]
  );

  return [value, set];
}

export default function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const { organization } = useAuthStore();

  const [staffMembers, setStaffMembers] = useState<Tables<"staff">[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);

  const [aiModel, setAiModel] = useLocalStorageState(
    "synq-karute-ai-model",
    "gpt-4o"
  );
  const [confidenceThreshold, setConfidenceThreshold] = useLocalStorageState(
    "synq-karute-confidence-threshold",
    "0.7"
  );
  const [audioQuality, setAudioQuality] = useLocalStorageState(
    "synq-karute-audio-quality",
    "standard"
  );
  const [autoStopTimer, setAutoStopTimer] = useLocalStorageState(
    "synq-karute-auto-stop",
    "30"
  );

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("synq-karute-theme");
    if (stored === "dark") {
      setIsDark(true);
    } else if (stored === "light") {
      setIsDark(false);
    } else {
      setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
  }, []);

  const toggleTheme = useCallback((dark: boolean) => {
    setIsDark(dark);
    localStorage.setItem("synq-karute-theme", dark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", dark);
    toast.success(dark ? "Dark mode enabled" : "Light mode enabled");
  }, []);

  useEffect(() => {
    async function fetchStaff() {
      if (!organization?.id) return;
      const supabase = createClient();
      const { data } = await supabase
        .from("staff")
        .select("*")
        .eq("org_id", organization.id)
        .order("name");
      setStaffMembers((data ?? []) as Tables<"staff">[]);
      setStaffLoading(false);
    }
    fetchStaff();
  }, [organization?.id]);

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("settings.title")}
        </h1>
      </div>

      <Tabs defaultValue={0}>
        <TabsList className="w-full flex-wrap h-auto gap-1">
          <TabsTrigger value={0} className="gap-1.5">
            <Building2 className="size-3.5" />
            {t("settings.organization")}
          </TabsTrigger>
          <TabsTrigger value={1} className="gap-1.5">
            <Brain className="size-3.5" />
            {t("settings.ai")}
          </TabsTrigger>
          <TabsTrigger value={2} className="gap-1.5">
            <Mic className="size-3.5" />
            {t("settings.recording")}
          </TabsTrigger>
          <TabsTrigger value={3} className="gap-1.5">
            <UsersRound className="size-3.5" />
            {t("settings.staff")}
          </TabsTrigger>
          <TabsTrigger value={4} className="gap-1.5">
            <Globe className="size-3.5" />
            {t("settings.language")}
          </TabsTrigger>
          <TabsTrigger value={5} className="gap-1.5">
            {isDark ? (
              <Moon className="size-3.5" />
            ) : (
              <Sun className="size-3.5" />
            )}
            {t("settings.theme")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={0} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.organization")}</CardTitle>
              <CardDescription>
                {locale === "ja"
                  ? "組織情報の確認"
                  : "View organization details"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>
                    {locale === "ja" ? "サロン名" : "Salon Name"}
                  </Label>
                  <div className="rounded-lg border bg-muted/50 px-3 py-2 text-sm">
                    {organization?.name ?? "—"}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>
                    {locale === "ja" ? "業種" : "Business Type"}
                  </Label>
                  <select
                    value={organization?.type ?? "hair"}
                    onChange={async (e) => {
                      const newType = e.target.value;
                      const supabase = createClient();
                      const { error } = await supabase
                        .from("organizations")
                        .update({ type: newType } as Record<string, unknown>)
                        .eq("id", organization?.id ?? "");
                      if (error) {
                        toast.error("業種の更新に失敗しました");
                      } else {
                        useAuthStore.getState().setOrganization({
                          ...organization!,
                          type: newType,
                        });
                        toast.success("業種を更新しました");
                      }
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {BUSINESS_TYPE_KEYS.map((key) => {
                      const bt = BUSINESS_TYPES[key];
                      return (
                        <option key={key} value={key}>
                          {bt.icon} {bt.label}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              <Separator />
              <p className="text-xs text-muted-foreground">
                {locale === "ja"
                  ? "業種に応じてAIの分類カテゴリが自動的に切り替わります。"
                  : "AI classification categories will automatically adjust based on the business type."}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value={1} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.ai")}</CardTitle>
              <CardDescription>
                {locale === "ja"
                  ? "AI処理の設定を管理します"
                  : "Manage AI processing preferences"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>
                  {locale === "ja" ? "AIモデル" : "Preferred AI Model"}
                </Label>
                <Select
                  value={aiModel}
                  onValueChange={(val: string | null) => {
                    if (val) {
                      setAiModel(val);
                      toast.success(
                        locale === "ja"
                          ? "AIモデルを更新しました"
                          : "AI model updated"
                      );
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="gemini-2.5-pro">
                      Gemini 2.5 Pro
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>
                    {locale === "ja"
                      ? "分類信頼度しきい値"
                      : "Classification Confidence Threshold"}
                  </Label>
                  <span className="text-sm font-medium tabular-nums text-muted-foreground">
                    {confidenceThreshold}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={confidenceThreshold}
                  onChange={(e) => {
                    setConfidenceThreshold(e.target.value);
                  }}
                  className="w-full accent-primary h-2 rounded-lg appearance-none bg-muted cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0</span>
                  <span>0.5</span>
                  <span>1.0</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value={2} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.recording")}</CardTitle>
              <CardDescription>
                {locale === "ja"
                  ? "録音品質と動作の設定"
                  : "Configure recording quality and behavior"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>
                  {locale === "ja" ? "音声品質" : "Audio Quality"}
                </Label>
                <Select
                  value={audioQuality}
                  onValueChange={(val: string | null) => {
                    if (val) {
                      setAudioQuality(val);
                      toast.success(
                        locale === "ja"
                          ? "音声品質を更新しました"
                          : "Audio quality updated"
                      );
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">
                      {locale === "ja" ? "標準 (128kbps)" : "Standard (128kbps)"}
                    </SelectItem>
                    <SelectItem value="high">
                      {locale === "ja" ? "高音質 (256kbps)" : "High (256kbps)"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>
                  {locale === "ja"
                    ? "自動停止タイマー"
                    : "Auto-Stop Timer"}
                </Label>
                <Select
                  value={autoStopTimer}
                  onValueChange={(val: string | null) => {
                    if (val) {
                      setAutoStopTimer(val);
                      toast.success(
                        locale === "ja"
                          ? "タイマーを更新しました"
                          : "Timer updated"
                      );
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">
                      {locale === "ja" ? "15分" : "15 minutes"}
                    </SelectItem>
                    <SelectItem value="30">
                      {locale === "ja" ? "30分" : "30 minutes"}
                    </SelectItem>
                    <SelectItem value="60">
                      {locale === "ja" ? "60分" : "60 minutes"}
                    </SelectItem>
                    <SelectItem value="90">
                      {locale === "ja" ? "90分" : "90 minutes"}
                    </SelectItem>
                    <SelectItem value="none">
                      {locale === "ja" ? "なし" : "None"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value={3} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.staff")}</CardTitle>
              <CardDescription>
                {locale === "ja"
                  ? "組織内のスタッフ一覧"
                  : "Staff members in your organization"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {staffLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((n) => (
                    <div
                      key={n}
                      className="h-16 animate-pulse rounded-lg bg-muted/50"
                    />
                  ))}
                </div>
              ) : staffMembers.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t("common.noData")}
                </p>
              ) : (
                <div className="space-y-2">
                  {staffMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <Avatar className="size-10">
                        <AvatarFallback className="text-xs">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {member.name}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="size-3" />
                          <span className="truncate">{member.email}</span>
                        </div>
                      </div>
                      <Badge variant={ROLE_VARIANT[member.role] ?? "outline"}>
                        <Shield className="size-3" />
                        {member.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
              <Separator className="my-4" />
              <p className="text-xs text-muted-foreground">
                {locale === "ja"
                  ? "スタッフの追加・編集は今後のアップデートで対応予定です。"
                  : "Adding and editing staff will be available in a future update."}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value={4} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.language")}</CardTitle>
              <CardDescription>
                {locale === "ja"
                  ? "表示言語を選択してください"
                  : "Choose your display language"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Globe className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">日本語 / English</p>
                    <p className="text-xs text-muted-foreground">
                      {locale === "ja"
                        ? "現在: 日本語"
                        : "Current: English"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-medium ${locale === "ja" ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    JP
                  </span>
                  <Switch
                    checked={locale === "en"}
                    onCheckedChange={(checked) => {
                      const newLocale: Locale = checked ? "en" : "ja";
                      setLocale(newLocale);
                      toast.success(
                        newLocale === "ja"
                          ? "日本語に切り替えました"
                          : "Switched to English"
                      );
                    }}
                  />
                  <span
                    className={`text-sm font-medium ${locale === "en" ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    EN
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value={5} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.theme")}</CardTitle>
              <CardDescription>
                {locale === "ja"
                  ? "アプリの外観を設定します"
                  : "Customize the app appearance"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  {isDark ? (
                    <Moon className="size-5 text-muted-foreground" />
                  ) : (
                    <Sun className="size-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {isDark
                        ? t("settings.darkMode")
                        : t("settings.lightMode")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {locale === "ja"
                        ? "ダーク/ライトモードを切り替え"
                        : "Toggle between dark and light mode"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isDark}
                  onCheckedChange={toggleTheme}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
