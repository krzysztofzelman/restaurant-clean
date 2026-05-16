import { supabase } from '../lib/supabaseClient';
import type { AIResponse, AIChatRequest } from '../types/ai';

const EDGE_FUNCTION = 'chat-ai';

/**
 * AI Chat Service
 *
 * Sends a message to the AI and returns the response.
 * @param message - User's message
 * @param conversationHistory - Previous messages for context
 * @param userId - Optional authenticated user ID
 */
export async function sendChatMessage(
  message: string,
  conversationHistory: AIChatRequest['conversationHistory'],
  userId?: string,
): Promise<AIResponse> {
  const body: AIChatRequest = {
    message,
    userId: userId || undefined,
    conversationHistory,
  };

  const { data, error } = await supabase.functions.invoke(EDGE_FUNCTION, {
    body,
  });

  if (error) {
    console.error('[aiChatService] Edge function error:', error);
    throw new Error(
      error.message || 'Nie udało się połączyć z asystentem. Spróbuj ponownie.',
    );
  }

  // Edge function może zwrócić { reply, action } zamiast { reply, actions }
  // Konwertuj na ujednolicony format z tablicą actions
  if (data && data.reply && data.action && !data.actions) {
    return {
      reply: data.reply,
      action: data.action,
      actions: [data.action],
    };
  }

  const result = data as AIResponse;

  if (!result || !result.reply) {
    throw new Error('Otrzymano pustą odpowiedź od asystenta.');
  }

  return result;
}
