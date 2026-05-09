// Deklaracje typów dla hooków i contextów w plikach .jsx
// (TypeScript nie sprawdza .jsx, więc musimy jawnie zadeklarować typy)

import type { User } from '@supabase/supabase-js';
import type { Profile } from '../lib/database.types';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  image_url?: string | null;
  description?: string | null;
}

interface CartContextValue {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalAmount: number;
}

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<unknown>;
  signIn: (email: string, password: string) => Promise<unknown>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

interface ToastContextValue {
  showToast: (message: string, type?: string, duration?: number) => void;
  dismissToast: (id: number) => void;
}

interface UseKitchenNotificationsOptions {
  enabled: boolean;
}

declare module '../hooks/useCart.jsx' {
  export function useCart(): CartContextValue;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function CartProvider(props: { children: React.ReactNode }): any;
}

declare module '../context/AuthContext' {
  export function useAuth(): AuthContextValue;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function AuthProvider(props: { children: React.ReactNode }): any;
}

declare module '../context/ToastContext' {
  export function useToast(): ToastContextValue;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function ToastProvider(props: { children: React.ReactNode }): any;
}

declare module '../hooks/useKitchenNotifications' {
  export default function useKitchenNotifications(
    options: UseKitchenNotificationsOptions,
  ): { newOrdersCount: number };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const KitchenNotificationProvider: any;
}
