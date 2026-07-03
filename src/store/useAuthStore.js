import { create } from "zustand";

// Holds the signed-in user's uid, role, and profile info.
// Populated after phone-auth login by reading users/{uid} from Firestore
// (see src/services/users.js -> fetchUserProfile).
export const useAuthStore = create((set) => ({
  uid: null,
  role: null, // "farmer" | "transport_owner" | "driver" | "sangam" | "shop_owner"
  name: null,
  language: "te",
  vehicleNumber: null,
  shopId: null,
  hasSelectedLanguage: false,

  setUser: (profile) => set({ ...profile }),
  setHasSelectedLanguage: (val) => set({ hasSelectedLanguage: val }),
  clearUser: () =>
    set({
      uid: null,
      role: null,
      name: null,
      language: "te",
      vehicleNumber: null,
      shopId: null,
      hasSelectedLanguage: false,
    }),
}));
