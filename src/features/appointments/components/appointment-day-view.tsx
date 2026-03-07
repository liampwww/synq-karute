"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  format,
  addDays,
  subDays,
  isToday,
  parseISO,
  differenceInMinutes,
  setHours,
  setMinutes,
  startOfDay,
} from "date-fns";
import { ja } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Mic,
  Clock,
  User,
  Scissors,
} from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n/context";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AppointmentStatus } from "@/types/database";
import {
  getAppointments,
  updateAppointment,
  deleteAppointment,
  type AppointmentWithRelations,
} from "../api";
import { AppointmentForm } from "./appointment-form";

const HOUR_HEIGHT = 72;
const START_HOUR = 9;
const END_HOUR = 21;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const TIME_SLOTS = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);

const STATUS_CONFIG: Record<
  AppointmentStatus,
  { bg: string; text: string; border: string; label: string }
> = {
  scheduled: {
    bg: "bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-l-blue-500",
    label: "予約済み",
  },
  in_progress: {
    bg: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-l-amber-500",
    label: "施術中",
  },
  completed: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-l-emerald-500",
    label: "完了",
  },
  cancelled: {
    bg: "bg-red-500/10",
    text: "text-red-700 dark:text-red-400",
    border: "border-l-red-500",
    label: "キャンセル",
  },
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

interface AppointmentDayViewProps {
  date: Date;
  onDateChange: (date: Date) => void;
}

export function AppointmentDayView({
  date,
  onDateChange,
}: AppointmentDayViewProps) {
  const { t, locale } = useI18n();
  const { organization } = useAuthStore();
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentWithRelations | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] =
    useState<AppointmentWithRelations | null>(null);

  const dateLocale = locale === "ja" ? ja : undefined;

  const fetchAppointments = useCallback(async () => {
    if (!organization?.id) return;
    setIsLoading(true);
    try {
      const data = await getAppointments(organization.id, date);
      setAppointments(data);
    } catch {
      toast.error(t("appointments.fetchError"));
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id, date, t]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const getAppointmentPosition = useCallback(
    (appointment: AppointmentWithRelations) => {
      const start = parseISO(appointment.start_time);
      const end = parseISO(appointment.end_time);
      const dayStart = setMinutes(setHours(startOfDay(date), START_HOUR), 0);

      const topMinutes = differenceInMinutes(start, dayStart);
      const durationMinutes = differenceInMinutes(end, start);

      const top = (topMinutes / 60) * HOUR_HEIGHT;
      const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 28);

      return { top, height };
    },
    [date]
  );

  const handleStatusChange = useCallback(
    async (id: string, status: AppointmentStatus) => {
      try {
        await updateAppointment(id, { status });
        await fetchAppointments();
        toast.success(t("appointments.statusUpdated"));
      } catch {
        toast.error(t("appointments.updateError"));
      }
    },
    [fetchAppointments, t]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteAppointment(id);
        setSelectedAppointment(null);
        await fetchAppointments();
        toast.success(t("appointments.deleted"));
      } catch {
        toast.error(t("appointments.deleteError"));
      }
    },
    [fetchAppointments, t]
  );

  const handleFormSuccess = useCallback(() => {
    setFormOpen(false);
    setEditingAppointment(null);
    fetchAppointments();
  }, [fetchAppointments]);

  const handleEditClick = useCallback(
    (appointment: AppointmentWithRelations) => {
      setEditingAppointment(appointment);
      setSelectedAppointment(null);
      setFormOpen(true);
    },
    []
  );

  const nowIndicatorTop = useMemo(() => {
    if (!isToday(date)) return null;
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    if (hours < START_HOUR || hours >= END_HOUR) return null;
    return ((hours - START_HOUR + minutes / 60) / TOTAL_HOURS) * 100;
  }, [date]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onDateChange(subDays(date, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <div className="min-w-[160px] text-center">
            <h2 className="text-lg font-semibold tabular-nums">
              {format(date, "M月d日 (EEEE)", { locale: dateLocale })}
            </h2>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onDateChange(addDays(date, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
          {!isToday(date) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDateChange(new Date())}
            >
              {t("appointments.today")}
            </Button>
          )}
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="size-4" data-icon="inline-start" />
          {t("appointments.addAppointment")}
        </Button>
      </motion.div>

      <motion.div variants={itemVariants}>
        <ScrollArea className="h-[calc(100vh-200px)] rounded-xl border bg-card ring-1 ring-foreground/5">
          <div className="relative" style={{ minHeight: TOTAL_HOURS * HOUR_HEIGHT }}>
            {TIME_SLOTS.map((hour) => (
              <div
                key={hour}
                className="absolute left-0 right-0 flex"
                style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }}
              >
                <div className="w-16 shrink-0 pr-3 pt-[-1px] text-right text-xs font-medium text-muted-foreground tabular-nums">
                  {`${hour}:00`}
                </div>
                <div className="flex-1 border-t border-dashed border-border/50" />
              </div>
            ))}

            {nowIndicatorTop !== null && (
              <div
                className="absolute left-16 right-0 z-20 flex items-center"
                style={{ top: `${nowIndicatorTop}%` }}
              >
                <div className="size-2 rounded-full bg-red-500" />
                <div className="h-px flex-1 bg-red-500/60" />
              </div>
            )}

            <div className="relative ml-16">
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center py-20"
                  >
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="size-4 animate-spin" />
                      {t("common.loading")}
                    </div>
                  </motion.div>
                ) : appointments.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground"
                  >
                    <Clock className="size-8 opacity-40" />
                    <p className="text-sm">{t("appointments.noAppointments")}</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="appointments"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {appointments.map((appointment) => {
                      const { top, height } =
                        getAppointmentPosition(appointment);
                      const status = STATUS_CONFIG[appointment.status];
                      const isSelected =
                        selectedAppointment?.id === appointment.id;
                      const canRecord =
                        appointment.status === "scheduled" ||
                        appointment.status === "in_progress";

                      return (
                        <motion.div
                          key={appointment.id}
                          layout
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute right-3 left-1"
                          style={{ top, height }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedAppointment(
                                isSelected ? null : appointment
                              )
                            }
                            className={cn(
                              "flex h-full w-full flex-col gap-1 rounded-lg border-l-[3px] px-3 py-2 text-left transition-all",
                              status.border,
                              status.bg,
                              isSelected
                                ? "ring-2 ring-primary/30 shadow-md"
                                : "hover:shadow-sm"
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-medium">
                                {appointment.customer?.name ?? "—"}
                              </span>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "shrink-0 text-[10px]",
                                  status.text,
                                  status.bg
                                )}
                              >
                                {status.label}
                              </Badge>
                            </div>
                            {height > 44 && (
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="size-3" />
                                  {format(
                                    parseISO(appointment.start_time),
                                    "H:mm"
                                  )}
                                  –
                                  {format(
                                    parseISO(appointment.end_time),
                                    "H:mm"
                                  )}
                                </span>
                                {appointment.staff?.name && (
                                  <span className="flex items-center gap-1">
                                    <User className="size-3" />
                                    {appointment.staff.name}
                                  </span>
                                )}
                                {appointment.service_type && (
                                  <span className="flex items-center gap-1">
                                    <Scissors className="size-3" />
                                    {appointment.service_type}
                                  </span>
                                )}
                              </div>
                            )}
                          </button>

                          <AnimatePresence>
                            {isSelected && (
                              <motion.div
                                initial={{ opacity: 0, y: -4, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: "auto" }}
                                exit={{ opacity: 0, y: -4, height: 0 }}
                                className="mt-1 overflow-hidden rounded-lg border bg-card p-3 shadow-lg"
                              >
                                <div className="flex flex-wrap gap-2">
                                  {canRecord && (
                                    <Button size="sm" className="gap-1.5">
                                      <Mic
                                        className="size-3.5"
                                        data-icon="inline-start"
                                      />
                                      {t("appointments.startRecording")}
                                    </Button>
                                  )}
                                  {appointment.status === "scheduled" && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatusChange(
                                          appointment.id,
                                          "in_progress"
                                        );
                                      }}
                                    >
                                      {t("appointments.markInProgress")}
                                    </Button>
                                  )}
                                  {appointment.status === "in_progress" && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatusChange(
                                          appointment.id,
                                          "completed"
                                        );
                                      }}
                                    >
                                      {t("appointments.markCompleted")}
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditClick(appointment);
                                    }}
                                  >
                                    {t("common.edit")}
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(appointment.id);
                                    }}
                                  >
                                    {t("common.delete")}
                                  </Button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </ScrollArea>
      </motion.div>

      <AppointmentForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingAppointment(null);
        }}
        initialData={editingAppointment}
        date={date}
        onSuccess={handleFormSuccess}
      />
    </motion.div>
  );
}
