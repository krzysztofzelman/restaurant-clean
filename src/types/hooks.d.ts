// Deklaracje typów dla hooków i contextów pozostających w .js/.jsx
// (komponenty skonwertowane do .tsx mają własne typy)

interface UseKitchenNotificationsOptions {
  enabled: boolean;
}

declare module '../hooks/useKitchenNotifications' {
  export default function useKitchenNotifications(
    options: UseKitchenNotificationsOptions,
  ): { newOrdersCount: number };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const KitchenNotificationProvider: any;
}
