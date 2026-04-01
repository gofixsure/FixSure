import { create } from "zustand";

export interface WhatsAppMessage {
  id: string;
  sender: "fixsure" | "customer";
  text: string;
  timestamp: Date;
  techName?: string;
  customerName?: string;
  repairType?: string;
  price?: string;
  type: "protection" | "review" | "followup" | "confirmation" | "text";
}

interface MessageStore {
  messages: WhatsAppMessage[];
  addConfirmation: (opts: { techName: string; customerName: string; description: string }) => void;
  addMessage: (msg: Omit<WhatsAppMessage, "id" | "timestamp">) => void;
  clear: () => void;
}

export const useMessageStore = create<MessageStore>((set) => ({
  messages: [],
  addConfirmation: ({ techName, customerName, description }) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: crypto.randomUUID(),
          sender: "fixsure" as const,
          text: `✅ Your repair booking with **${techName}** has been confirmed!\n\n📱 Repair: ${description}\n👤 Customer: ${customerName}\n🛡️ FixSure protection included`,
          timestamp: new Date(),
          techName,
          customerName,
          type: "confirmation" as const,
        },
      ],
    })),
  addMessage: (msg) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { ...msg, id: crypto.randomUUID(), timestamp: new Date() },
      ],
    })),
  clear: () => set({ messages: [] }),
}));
