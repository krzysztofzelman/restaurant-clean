import { apiRequest } from '../lib/apiClient';
import type { AIResponse } from '../types/ai';

interface ChatResponse {
  conversation_id: string;
  reply: string;
  messages: Array<{ role: string; content: string }>;
}

/**
 * AI Chat Service
 *
 * Sends a message to the AI assistant via the backend API.
 * The backend manages conversation history in the database — the frontend
 * only needs to pass the conversation_id for follow-up messages.
 *
 * @param message - User's message
 * @param _conversationHistory - Ignored (history is handled server-side). Kept for API compatibility.
 * @param _userId - Ignored (auth is handled via JWT). Kept for API compatibility.
 */
export async function sendChatMessage(
  message: string,
  _conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
  _userId?: string,
): Promise<AIResponse> {
  // Try to restore conversation_id from localStorage for continuation
  let conversationId: string | undefined;
  try {
    const saved = localStorage.getItem('ai-conversation-id');
    if (saved) {
      conversationId = saved;
    }
  } catch {
    // localStorage unavailable — ignore
  }

  const body: Record<string, unknown> = { message };
  if (conversationId) {
    body.conversation_id = conversationId;
  }

  const data = await apiRequest<ChatResponse>('/api/chat', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  // Save conversation_id for next message
  try {
    localStorage.setItem('ai-conversation-id', data.conversation_id);
  } catch {
    // ignore
  }

  return {
    reply: data.reply,
  };
}
