import { create } from "zustand";

// Lightweight cache of the shipment currently being viewed/acted on.
// Screens subscribe to Firestore directly via onSnapshot (see services/shipments.js)
// and push updates here so multiple screens can share the same active shipment
// without re-querying.
export const useShipmentStore = create((set) => ({
  activeShipment: null,
  setActiveShipment: (shipment) => set({ activeShipment: shipment }),
  clearActiveShipment: () => set({ activeShipment: null }),
}));
