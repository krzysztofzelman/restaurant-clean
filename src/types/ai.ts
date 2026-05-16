// ============================================================
// AI Chat – Type definitions
// ============================================================

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  actions?: ChatAction[];
}

/**
 * An action that the frontend can execute based on AI response.
 * - `addToCart`: AI suggests adding item(s) to cart
 * - `openReservation`: AI confirmed availability, open reservation modal
 * - `showMenu`: Navigate to menu page
 * - `showOrders`: Navigate to orders page
 * - `createReservation`: AI collected reservation data, frontend saves to DB
 */
export interface ChatAction {
  type: 'addToCart' | 'openReservation' | 'showMenu' | 'showOrders' | 'createReservation';
  label: string;
  payload?: AddToCartPayload | ReservationPayload | CreateReservationPayload;
  data?: CreateReservationPayload;
}

export interface AddToCartPayload {
  items: Array<{
    id: string;
    name: string;
    price: number;
    image_url?: string | null;
    description?: string | null;
  }>;
}

export interface ReservationPayload {
  date: string;
  time: string;
  guests: number;
}

/** Payload for createReservation action (AI conversation → direct DB save) */
export interface CreateReservationPayload {
  date: string;   // format YYYY-MM-DD
  time: string;   // format HH:MM
  guests: number;
}

/** Quick action button shown below the chat input */
export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  prompt: string;
}

/** Response from the edge function */
export interface AIResponse {
  reply: string;
  actions?: ChatAction[];
  /** Pojedyncza akcja (alternatywny format – edge function może zwrócić action zamiast actions) */
  action?: ChatAction;
}

/** Request sent to the edge function */
export interface AIChatRequest {
  message: string;
  userId?: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

/** Conversation stored in localStorage */
export interface LocalConversation {
  id: string;
  messages: ChatMessage[];
  updatedAt: number;
}
