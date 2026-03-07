"use client";

import { useCallback, useEffect, useState } from "react";
import { format, setHours, setMinutes, startOfDay } from "date-fns";
import { ja } from "date-fns/locale";
import {
  CalendarIcon,
  ChevronsUpDown,
  Search,
  User,
  Scissors,
} from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n/context";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Tables } from "@/types/database";
import {
  createAppointment,
  updateAppointment,
  getCustomers,
  getStaff,
  type AppointmentWithRelations,
} from "../api";

interface AppointmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: AppointmentWithRelations | null;
  date: Date;
  onSuccess: () => void;
}

type CustomerOption = Pick<Tables<"customers">, "id" | "name" | "name_kana">;
type StaffOption = Pick<Tables<"staff">, "id" | "name">;

const HOUR_OPTIONS = Array.from({ length: 13 }, (_, i) => i + 9);
const MINUTE_OPTIONS = [0, 15, 30, 45];

function onSelectChange(setter: (v: string) => void) {
  return (value: string | null) => {
    if (value !== null) setter(value);
  };
}

function formatTimeOption(h: number, m: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function AppointmentForm({
  open,
  onOpenChange,
  initialData,
  date,
  onSuccess,
}: AppointmentFormProps) {
  const { t, locale } = useI18n();
  const { organization } = useAuthStore();

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(date);
  const [startHour, setStartHour] = useState("10");
  const [startMinute, setStartMinute] = useState("00");
  const [endHour, setEndHour] = useState("11");
  const [endMinute, setEndMinute] = useState("00");
  const [serviceType, setServiceType] = useState("");
  const [notes, setNotes] = useState("");

  const dateLocale = locale === "ja" ? ja : undefined;
  const isEditing = !!initialData;

  useEffect(() => {
    if (!open || !organization?.id) return;

    const load = async () => {
      try {
        const [c, s] = await Promise.all([
          getCustomers(organization.id),
          getStaff(organization.id),
        ]);
        setCustomers(c);
        setStaffList(s);
      } catch {
        toast.error(t("appointments.loadError"));
      }
    };
    load();
  }, [open, organization?.id, t]);

  useEffect(() => {
    if (!open) return;

    if (initialData) {
      const start = new Date(initialData.start_time);
      const end = new Date(initialData.end_time);
      setCustomerId(initialData.customer_id);
      setStaffId(initialData.staff_id);
      setSelectedDate(startOfDay(start));
      setStartHour(String(start.getHours()));
      setStartMinute(String(start.getMinutes()));
      setEndHour(String(end.getHours()));
      setEndMinute(String(end.getMinutes()));
      setServiceType(initialData.service_type ?? "");
      setNotes(initialData.notes ?? "");
    } else {
      setCustomerId("");
      setStaffId("");
      setSelectedDate(date);
      setStartHour("10");
      setStartMinute("00");
      setEndHour("11");
      setEndMinute("00");
      setServiceType("");
      setNotes("");
    }
  }, [open, initialData, date]);

  const selectedCustomer = customers.find((c) => c.id === customerId);

  const handleSubmit = useCallback(async () => {
    if (!organization?.id || !customerId || !staffId) {
      toast.error(t("appointments.requiredFields"));
      return;
    }

    const startTime = setMinutes(
      setHours(selectedDate, Number(startHour)),
      Number(startMinute)
    );
    const endTime = setMinutes(
      setHours(selectedDate, Number(endHour)),
      Number(endMinute)
    );

    if (endTime <= startTime) {
      toast.error(t("appointments.invalidTimeRange"));
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && initialData) {
        await updateAppointment(initialData.id, {
          customer_id: customerId,
          staff_id: staffId,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          service_type: serviceType || null,
          notes: notes || null,
        });
        toast.success(t("appointments.updated"));
      } else {
        await createAppointment({
          org_id: organization.id,
          customer_id: customerId,
          staff_id: staffId,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          service_type: serviceType || null,
          notes: notes || null,
        });
        toast.success(t("appointments.created"));
      }
      onSuccess();
    } catch {
      toast.error(t("appointments.saveError"));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    organization?.id,
    customerId,
    staffId,
    selectedDate,
    startHour,
    startMinute,
    endHour,
    endMinute,
    serviceType,
    notes,
    isEditing,
    initialData,
    onSuccess,
    t,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? t("appointments.editAppointment")
              : t("appointments.addAppointment")}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t("appointments.editDescription")
              : t("appointments.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>{t("appointments.customer")}</Label>
            <Popover
              open={customerPopoverOpen}
              onOpenChange={setCustomerPopoverOpen}
            >
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    className="w-full justify-between font-normal"
                  />
                }
              >
                {selectedCustomer ? (
                  <span className="flex items-center gap-2">
                    <User className="size-3.5 text-muted-foreground" />
                    {selectedCustomer.name}
                    {selectedCustomer.name_kana && (
                      <span className="text-xs text-muted-foreground">
                        ({selectedCustomer.name_kana})
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    {t("appointments.selectCustomer")}
                  </span>
                )}
                <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
              </PopoverTrigger>
              <PopoverContent className="w-[--anchor-width] p-0">
                <Command>
                  <CommandInput
                    placeholder={t("appointments.searchCustomer")}
                  />
                  <CommandList>
                    <CommandEmpty>
                      <div className="flex flex-col items-center gap-1 py-2 text-muted-foreground">
                        <Search className="size-4" />
                        <span>{t("appointments.noCustomersFound")}</span>
                      </div>
                    </CommandEmpty>
                    <CommandGroup>
                      {customers.map((customer) => (
                        <CommandItem
                          key={customer.id}
                          value={`${customer.name} ${customer.name_kana ?? ""}`}
                          data-checked={customerId === customer.id}
                          onSelect={() => {
                            setCustomerId(customer.id);
                            setCustomerPopoverOpen(false);
                          }}
                        >
                          <User className="size-3.5 text-muted-foreground" />
                          <span>{customer.name}</span>
                          {customer.name_kana && (
                            <span className="text-xs text-muted-foreground">
                              {customer.name_kana}
                            </span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-2">
            <Label>{t("appointments.staff")}</Label>
            <Select value={staffId} onValueChange={onSelectChange(setStaffId)}>
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={t("appointments.selectStaff")}
                />
              </SelectTrigger>
              <SelectContent>
                {staffList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>{t("appointments.date")}</Label>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start gap-2 font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  />
                }
              >
                <CalendarIcon className="size-3.5" />
                {format(selectedDate, "yyyy年M月d日 (EEE)", {
                  locale: dateLocale,
                })}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => d && setSelectedDate(d)}
                  locale={dateLocale}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("appointments.startTime")}</Label>
              <div className="flex gap-1.5">
                <Select value={startHour} onValueChange={onSelectChange(setStartHour)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOUR_OPTIONS.map((h) => (
                      <SelectItem key={h} value={String(h)}>
                        {String(h).padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="flex items-center text-sm text-muted-foreground">
                  :
                </span>
                <Select value={startMinute} onValueChange={onSelectChange(setStartMinute)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MINUTE_OPTIONS.map((m) => (
                      <SelectItem key={m} value={String(m).padStart(2, "0")}>
                        {String(m).padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>{t("appointments.endTime")}</Label>
              <div className="flex gap-1.5">
                <Select value={endHour} onValueChange={onSelectChange(setEndHour)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOUR_OPTIONS.map((h) => (
                      <SelectItem key={h} value={String(h)}>
                        {String(h).padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="flex items-center text-sm text-muted-foreground">
                  :
                </span>
                <Select value={endMinute} onValueChange={onSelectChange(setEndMinute)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MINUTE_OPTIONS.map((m) => (
                      <SelectItem key={m} value={String(m).padStart(2, "0")}>
                        {String(m).padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>{t("appointments.serviceType")}</Label>
            <div className="relative">
              <Scissors className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                placeholder={t("appointments.serviceTypePlaceholder")}
                className="pl-8"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>{t("appointments.notes")}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("appointments.notesPlaceholder")}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !customerId || !staffId}
          >
            {isSubmitting
              ? t("common.saving")
              : isEditing
                ? t("common.save")
                : t("appointments.addAppointment")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
