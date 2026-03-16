"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mic, Clock, User, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import { useAuthStore } from "@/stores/auth-store";
import { getTodayAppointments } from "@/features/recording/api";
import { RecordingControls } from "@/features/recording/components/recording-controls";
import type { Tables } from "@/types/database";

type AppointmentWithCustomer = Tables<"appointments"> & {
  customers: Tables<"customers"> | null;
};

function RecordingPageContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const router = useRouter();
  const staff = useAuthStore((s) => s.staff);
  const organization = useAuthStore((s) => s.organization);

  const customerId = searchParams.get("customerId");
  const appointmentId = searchParams.get("appointmentId") ?? undefined;
  const customerName = searchParams.get("customerName") ?? "";

  const [appointments, setAppointments] = useState<AppointmentWithCustomer[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());

  const loadAppointments = useCallback(async () => {
    if (!organization || !staff) return;
    try {
      const data = await getTodayAppointments(organization.id, staff.id);
      setAppointments(data);
    } catch {
      toast.error(t("recording.loadFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [organization, staff, t]);

  useEffect(() => {
    if (!customerId) {
      loadAppointments();
    } else {
      setIsLoading(false);
    }
  }, [customerId, loadAppointments]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const activeAppointment = useMemo(() => {
    if (appointments.length === 0) return null;
    const nowMs = now.getTime();

    const current = appointments.find((appt) => {
      const start = new Date(appt.start_time).getTime();
      const end = new Date(appt.end_time).getTime();
      return start <= nowMs && nowMs <= end;
    });
    if (current) return { appointment: current, type: "current" as const };

    const upcoming = appointments
      .filter((appt) => new Date(appt.start_time).getTime() > nowMs)
      .sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
    if (upcoming.length > 0)
      return { appointment: upcoming[0], type: "next" as const };

    return null;
  }, [appointments, now]);

  const handleSelectAppointment = (appt: AppointmentWithCustomer) => {
    if (!appt.customers) return;
    const params = new URLSearchParams({
      customerId: appt.customer_id,
      appointmentId: appt.id,
      customerName: appt.customers.name,
    });
    router.push(`/recording?${params.toString()}`);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (customerId && customerName) {
    return (
      <div className="flex flex-col items-center">
        <div className="w-full max-w-md">
          <Card>
            <CardContent>
              <RecordingControls
                customerId={customerId}
                customerName={customerName}
                appointmentId={appointmentId}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("recording.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("recording.subtitle")}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : appointments.length === 0 ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center gap-4 py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Mic className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-medium">{t("recording.noAppointmentsToday")}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("recording.noAppointmentsHint")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {activeAppointment && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="border-2 border-primary/50 bg-gradient-to-r from-primary/5 to-transparent">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                        {activeAppointment.type === "current"
                          ? t("recording.currentAppointment")
                          : t("recording.nextAppointmentLabel")}
                      </span>
                      <p className="mt-2 truncate text-lg font-bold">
                        {activeAppointment.appointment.customers?.name ?? t("common.unknown")}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {formatTime(
                            activeAppointment.appointment.start_time
                          )}{" "}
                          –{" "}
                          {formatTime(activeAppointment.appointment.end_time)}
                        </span>
                        {activeAppointment.appointment.service_type && (
                          <>
                            <span className="text-muted-foreground/40">·</span>
                            <span>
                              {activeAppointment.appointment.service_type}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <Button
                      size="lg"
                      className="shrink-0 gap-2 bg-red-500 text-white shadow-lg shadow-red-500/25 hover:bg-red-600"
                      onClick={() =>
                        handleSelectAppointment(
                          activeAppointment.appointment
                        )
                      }
                    >
                      <Mic className="h-5 w-5" />
                      {t("recording.start")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <div className="grid gap-3">
            {appointments.map((appt, i) => (
              <motion.div
                key={appt.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-muted/50",
                    activeAppointment?.appointment.id === appt.id &&
                      "ring-2 ring-primary/50 bg-primary/5"
                  )}
                  onClick={() => handleSelectAppointment(appt)}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle>
                          {appt.customers?.name ?? t("common.unknown")}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {formatTime(appt.start_time)} –{" "}
                          {formatTime(appt.end_time)}
                          {appt.service_type && (
                            <>
                              <span className="text-muted-foreground/40">
                                ·
                              </span>
                              {appt.service_type}
                            </>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10">
                        <Mic className="h-5 w-5 text-red-500" />
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function RecordingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <RecordingPageContent />
    </Suspense>
  );
}
