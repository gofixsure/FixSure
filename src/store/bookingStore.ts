import { create } from "zustand";

export interface Booking {
  id: string;
  customerName: string;
  customerPhone: string;
  description: string;
  techId: string;
  timestamp: Date;
  status: "pending" | "accepted" | "declined";
}

interface BookingStore {
  bookings: Booking[];
  addBooking: (booking: Omit<Booking, "id" | "timestamp" | "status">) => void;
  updateStatus: (id: string, status: Booking["status"]) => void;
  getByTechId: (techId: string) => Booking[];
}

export const useBookingStore = create<BookingStore>((set, get) => ({
  bookings: [],
  addBooking: (booking) =>
    set((state) => ({
      bookings: [
        {
          ...booking,
          id: crypto.randomUUID(),
          timestamp: new Date(),
          status: "pending",
        },
        ...state.bookings,
      ],
    })),
  updateStatus: (id, status) =>
    set((state) => ({
      bookings: state.bookings.map((b) => (b.id === id ? { ...b, status } : b)),
    })),
  getByTechId: (techId) => get().bookings.filter((b) => b.techId === techId),
}));
