"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import {
  Mic,
  Users,
  FileText,
  Calendar,
  Clock,
  ArrowRight,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { startOfWeek, startOfDay, endOfDay, format } from "date-fns";

import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/context";
import { useAuthStore } from "@/stores/auth-store";
import { useRecordingStore } from "@/stores/recording-store";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InsightCards } from "@/features/insights/components/insight-cards";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

const STATUS_TRANSLATION_KEY: Record<string, string> = {
  scheduled: "appointments.scheduled",
  in_progress: "appointments.inProgress",
  completed: "appointments.completed",
  cancelled: "appointments.cancelled",
};

const STATUS_BADGE_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  scheduled: "outline",
  in_progress: "default",
  completed: "secondary",
  cancelled: "destructive",
};

const KARUTE_STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline"
> = {
  draft: "outline",
  review: "secondary",
  approved: "default",
};

interface StatCardDef {
  titleKey: string;
  icon: LucideIcon;
  gradient: string;
}

const STAT_DEFS: StatCardDef[] = [
  {
    titleKey: "dashboard.stats.recordingsThisWeek",
    icon: Mic,
    gradient: "from-rose-500/10 to-orange-500/10",
  },
  {
    titleKey: "dashboard.stats.customersServed",
    icon: Users,
    gradient: "from-blue-500/10 to-cyan-500/10",
  },
  {
    titleKey: "dashboard.stats.karteGenerated",
    icon: FileText,
    gradient: "from-emerald-500/10 to-teal-500/10",
  },
];

interface AppointmentRow {
  id: string;
  customer_id: string;
  start_time: string;
  end_time: string;
  status: string;
  service_type: string | null;
  customers: { id: string; name: string };
}

interface KaruteRow {
  id: string;
  customer_id: string;
  status: string;
  created_at: string;
  ai_summary: string | null;
  customers: { id: string; name: string };
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function DashboardPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { staff, organization } = useAuthStore();
  const { isRecording, elapsedSeconds, currentCustomerId } =
    useRecordingStore();

  const [stats, setStats] = useState([0, 0, 0]);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [recentKarute, setRecentKarute] = useState<KaruteRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    if (!organization?.id) {
      setIsLoading(false);
      return;
    }

    const supabase = createClient();
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
    const todayStart = startOfDay(now).toISOString();
    const todayEnd = endOfDay(now).toISOString();
    const orgId = organization.id;

    const [
      recordingsResult,
      appointmentsWeekResult,
      karuteCountResult,
      todayAppointmentsResult,
      recentKaruteResult,
    ] = await Promise.all([
      supabase
        .from("recording_sessions")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId)
        .gte("started_at", weekStart),
      supabase
        .from("appointments")
        .select("customer_id")
        .eq("org_id", orgId)
        .gte("start_time", weekStart),
      supabase
        .from("karute_records")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId)
        .gte("created_at", weekStart),
      supabase
        .from("appointments")
        .select("*, customers(id, name)")
        .eq("org_id", orgId)
        .gte("start_time", todayStart)
        .lte("start_time", todayEnd)
        .order("start_time"),
      supabase
        .from("karute_records")
        .select("*, customers(id, name)")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const uniqueCustomers = new Set(
      (appointmentsWeekResult.data ?? []).map(
        (a: { customer_id: string }) => a.customer_id
      )
    );

    setStats([
      recordingsResult.count ?? 0,
      uniqueCustomers.size,
      karuteCountResult.count ?? 0,
    ]);
    setAppointments(
      (todayAppointmentsResult.data ?? []) as unknown as AppointmentRow[]
    );
    setRecentKarute(
      (recentKaruteResult.data ?? []) as unknown as KaruteRow[]
    );
    setIsLoading(false);
  }, [organization?.id]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("dashboard.title")}
        </h1>
        {staff && (
          <p className="text-sm text-muted-foreground mt-1">
            {t("common.welcome") !== "common.welcome"
              ? t("common.welcome")
              : `Welcome back, ${staff.name}`}
          </p>
        )}
      </motion.div>

      {isRecording && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-red-500/20 bg-red-500/10 p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="relative flex size-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex size-3 rounded-full bg-red-500" />
              </span>
              <span className="text-sm font-medium text-red-700 dark:text-red-400">
                {t("recording.recording")}
              </span>
              <span className="text-sm tabular-nums text-red-600 dark:text-red-300">
                {formatElapsed(elapsedSeconds)}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-red-500/30 text-red-700 hover:bg-red-500/10 dark:text-red-400"
              onClick={() => router.push("/recording")}
            >
              {t("recording.title")}
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {STAT_DEFS.map((def, i) => (
          <motion.div key={def.titleKey} variants={itemVariants}>
            <Card
              className={`bg-gradient-to-br ${def.gradient} border-0 shadow-sm`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardDescription>{t(def.titleKey)}</CardDescription>
                  <def.icon className="size-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-3xl font-bold tabular-nums">
                  {isLoading ? "—" : stats[i]}
                </CardTitle>
              </CardHeader>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="size-4" />
                  {t("dashboard.todayAppointments")}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/appointments")}
                >
                  <span>{t("common.next")}</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((n) => (
                    <div
                      key={n}
                      className="h-14 animate-pulse rounded-lg bg-muted/50"
                    />
                  ))}
                </div>
              ) : appointments.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t("common.noData")}
                </p>
              ) : (
                <div className="space-y-1">
                  {appointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums w-14">
                          <Clock className="size-3.5 shrink-0" />
                          {format(new Date(apt.start_time), "HH:mm")}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {apt.customers?.name ?? "—"}
                          </p>
                          {apt.service_type && (
                            <p className="text-xs text-muted-foreground">
                              {apt.service_type}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            STATUS_BADGE_VARIANT[apt.status] ?? "outline"
                          }
                        >
                          {t(
                            STATUS_TRANSLATION_KEY[apt.status] ?? apt.status
                          )}
                        </Badge>
                        {(apt.status === "scheduled" ||
                          apt.status === "in_progress") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() =>
                              router.push(
                                `/recording?customerId=${apt.customer_id}&appointmentId=${apt.id}&customerName=${encodeURIComponent(apt.customers?.name ?? "")}`
                              )
                            }
                          >
                            <Mic className="size-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="size-4" />
                  {t("dashboard.recentKarute")}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/karute")}
                >
                  <span>{t("common.next")}</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((n) => (
                    <div
                      key={n}
                      className="h-14 animate-pulse rounded-lg bg-muted/50"
                    />
                  ))}
                </div>
              ) : recentKarute.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t("common.noData")}
                </p>
              ) : (
                <div className="space-y-1">
                  {recentKarute.map((karute) => (
                    <div
                      key={karute.id}
                      className="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-muted/50 cursor-pointer"
                      onClick={() => router.push(`/karute/${karute.id}`)}
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {karute.customers?.name ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(karute.created_at), "yyyy/MM/dd")}
                        </p>
                      </div>
                      <Badge
                        variant={
                          KARUTE_STATUS_VARIANT[karute.status] ?? "outline"
                        }
                      >
                        {karute.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                AI推奨アクション
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/customers")}
              >
                <span>顧客一覧</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
            <CardDescription>
              顧客のタイムライン・カルテデータからAIが推奨するアクション
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <InsightCards
              showCustomerName
              limit={5}
              onNavigateToCustomer={(id) => router.push(`/customers/${id}`)}
            />
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.quickActions")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                className="gap-2"
                onClick={() => router.push("/recording")}
              >
                <Mic className="size-4" />
                {t("dashboard.startRecording")}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/customers?action=add")}
              >
                <UserPlus className="size-4" />
                {t("customers.addCustomer")}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/karute")}
              >
                <FileText className="size-4" />
                {t("karute.title")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
