import { create } from "zustand";

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  currentRecordingId: string | null;
  currentCustomerId: string | null;
  currentAppointmentId: string | null;
  elapsedSeconds: number;
  audioLevel: number;
  setRecording: (isRecording: boolean) => void;
  setPaused: (isPaused: boolean) => void;
  setCurrentRecordingId: (id: string | null) => void;
  setCurrentCustomerId: (id: string | null) => void;
  setCurrentAppointmentId: (id: string | null) => void;
  setElapsedSeconds: (seconds: number) => void;
  setAudioLevel: (level: number) => void;
  startSession: (params: {
    recordingId: string;
    customerId: string;
    appointmentId: string | null;
  }) => void;
  endSession: () => void;
}

export const useRecordingStore = create<RecordingState>((set) => ({
  isRecording: false,
  isPaused: false,
  currentRecordingId: null,
  currentCustomerId: null,
  currentAppointmentId: null,
  elapsedSeconds: 0,
  audioLevel: 0,
  setRecording: (isRecording) => set({ isRecording }),
  setPaused: (isPaused) => set({ isPaused }),
  setCurrentRecordingId: (currentRecordingId) => set({ currentRecordingId }),
  setCurrentCustomerId: (currentCustomerId) => set({ currentCustomerId }),
  setCurrentAppointmentId: (currentAppointmentId) =>
    set({ currentAppointmentId }),
  setElapsedSeconds: (elapsedSeconds) => set({ elapsedSeconds }),
  setAudioLevel: (audioLevel) => set({ audioLevel }),
  startSession: ({ recordingId, customerId, appointmentId }) =>
    set({
      isRecording: true,
      isPaused: false,
      currentRecordingId: recordingId,
      currentCustomerId: customerId,
      currentAppointmentId: appointmentId,
      elapsedSeconds: 0,
      audioLevel: 0,
    }),
  endSession: () =>
    set({
      isRecording: false,
      isPaused: false,
      currentRecordingId: null,
      currentCustomerId: null,
      currentAppointmentId: null,
      elapsedSeconds: 0,
      audioLevel: 0,
    }),
}));
