"use client";

import { useState } from "react";

import { AppointmentDayView } from "@/features/appointments/components/appointment-day-view";

export default function AppointmentsPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  return (
    <AppointmentDayView date={selectedDate} onDateChange={setSelectedDate} />
  );
}
