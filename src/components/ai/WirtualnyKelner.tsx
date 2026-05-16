import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../hooks/useCart';
import { useToast } from '../../context/ToastContext';
import { sendChatMessage } from '../../services/aiChatService';
import { createReservation, checkReservationAvailability } from '../../services/api';
import type {
  ChatMessage,
  ChatAction,
  QuickAction,
  LocalConversation,
  CreateReservationPayload,
} from '../../types/ai';

/* ──────────────── Constants ──────────────── */

const STORAGE_KEY = 'ai-chat-conversation';
const MAX_HISTORY_LENGTH = 50;

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'menu',
    label: 'Pokaż menu',
    icon: '📋',
    prompt: 'Pokaż mi całe menu',
  },
  {
    id: 'wege',
    label: 'Dania wegetariańskie',
    icon: '🥗',
    prompt: 'Jakie macie dania wegetariańskie?',
  },
  {
    id: 'polecane',
    label: 'Polecane dania',
    icon: '⭐',
    prompt: 'Co polecacie?',
  },
  {
    id: 'godziny',
    label: 'Godziny otwarcia',
    icon: '🕐',
    prompt: 'Jakie macie godziny otwarcia?',
  },
  {
    id: 'rezerwacja',
    label: 'Zarezerwuj stolik',
    icon: '📅',
    prompt: 'Chcę zarezerwować stolik',
  },
];

/* ──────────────── Helpers ──────────────── */

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadConversation(): ChatMessage[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed: LocalConversation = JSON.parse(saved);
      if (parsed?.messages && Array.isArray(parsed.messages)) {
        return parsed.messages;
      }
    }
  } catch {
    // ignore corrupt data
  }
  return [];
}

function saveConversation(messages: ChatMessage[]): void {
  try {
    const data: LocalConversation = {
      id: 'local',
      messages,
      updatedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage full or unavailable — ignore
  }
}

/* ──────────────── Reservation inline form ──────────────── */

function ReservationForm({
  defaultDate,
  defaultTime,
  defaultGuests,
  userId,
  onClose,
  onSuccess,
}: {
  defaultDate?: string;
  defaultTime?: string;
  defaultGuests?: number;
  userId?: string;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(defaultDate || today);
  const [time, setTime] = useState(defaultTime || '18:00');
  const [guests, setGuests] = useState(defaultGuests || 2);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId) {
      showToast('Zaloguj się, aby dokonać rezerwacji.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await createReservation({
        user_id: userId,
        date,
        time,
        guests,
        notes: notes || null,
      });
      showToast('Rezerwacja została przyjęta!', 'success');
      onSuccess(`Rezerwacja na ${date} o ${time} dla ${guests} osób została przyjęta.`);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Błąd podczas rezerwacji.',
        'danger',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border rounded-3 p-3 mt-2">
      <h6 className="mb-3 fw-bold">📅 Nowa rezerwacja</h6>
      <form onSubmit={handleSubmit}>
        <div className="row g-2 mb-2">
          <div className="col-6">
            <label className="form-label small fw-medium">Data</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={date}
              min={today}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="col-4">
            <label className="form-label small fw-medium">Godzina</label>
            <input
              type="time"
              className="form-control form-control-sm"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>
          <div className="col-2">
            <label className="form-label small fw-medium">Osoby</label>
            <input
              type="number"
              className="form-control form-control-sm"
              value={guests}
              min={1}
              max={20}
              onChange={(e) => setGuests(Number(e.target.value))}
              required
            />
          </div>
        </div>
        <div className="mb-2">
          <label className="form-label small fw-medium">Uwagi (opcjonalnie)</label>
          <textarea
            className="form-control form-control-sm"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Np. alergia, preferowane miejsce..."
          />
        </div>
        <div className="d-flex gap-2">
          <button
            type="submit"
            className="btn btn-sm btn-success flex-grow-1"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" />
                Zapisywanie...
              </>
            ) : (
              'Potwierdź rezerwację'
            )}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={onClose}
          >
            Anuluj
          </button>
        </div>
      </form>
    </div>
  );
}

/* ──────────────── Main component ──────────────── */

export default function WirtualnyKelner() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [reservationPrefill, setReservationPrefill] = useState<{
    date?: string;
    time?: string;
    guests?: number;
  }>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatPanelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { showToast } = useToast();

  // Load conversation on mount — use lazy initializer to avoid setState in effect
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = loadConversation();
    if (saved.length > 0) return saved;
    return [
      {
        id: generateId(),
        role: 'assistant',
        content:
          'Witaj! 👋 Jestem wirtualnym kelnerem. Jak mogę Ci pomóc? Możesz zapytać o menu, zarezerwować stolik, zamówić jedzenie lub sprawdzić godziny otwarcia.',
        timestamp: Date.now(),
      },
    ];
  });

  // Save on change
  useEffect(() => {
    if (messages.length > 0) {
      saveConversation(messages);
    }
  }, [messages]);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  const addMessage = useCallback(
    (role: ChatMessage['role'], content: string, actions?: ChatAction[]) => {
      const msg: ChatMessage = {
        id: generateId(),
        role,
        content,
        timestamp: Date.now(),
        actions,
      };
      setMessages((prev) => {
        const next = [...prev, msg];
        return next.length > MAX_HISTORY_LENGTH
          ? next.slice(-MAX_HISTORY_LENGTH)
          : next;
      });
    },
    [setMessages],
  );

  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      setInputValue('');
      addMessage('user', trimmed);
      setIsLoading(true);
      setShowReservationForm(false);

      try {
        // Build history for AI (last 20 messages, exclude system-like)
        const history = messages
          .slice(-20)
          .filter((m) => m.role !== 'system')
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }));

        const response = await sendChatMessage(
          trimmed,
          history,
          user?.id || undefined,
        );

        if (response.actions && response.actions.length > 0) {
          addMessage('assistant', response.reply, response.actions as ChatAction[]);

          // Auto-show reservation form if applicable
          const reservationAction = response.actions.find(
            (a) => a.type === 'openReservation',
          );
          if (reservationAction?.payload) {
            const p = reservationAction.payload as {
              date?: string;
              time?: string;
              guests?: number;
            };
            setReservationPrefill({
              date: p.date,
              time: p.time,
              guests: p.guests,
            });
            // Don't auto-open — user clicks the action button
          }
        } else {
          addMessage('assistant', response.reply);
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Coś poszło nie tak. Spróbuj ponownie.';
        addMessage('assistant', `Przepraszam, ${errorMsg}`);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, addMessage, user],
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputValue);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    handleSend(action.prompt);
  };

  const handleChatAction = useCallback(
    async (action: ChatAction) => {
      switch (action.type) {
        case 'addToCart': {
          const payload = action.payload as { items: Array<{ id: string; name: string; price: number; image_url?: string | null; description?: string | null }> } | undefined;
          if (payload?.items) {
            for (const item of payload.items) {
              addToCart({
                id: item.id,
                name: item.name,
                price: item.price,
                image_url: item.image_url,
                description: item.description,
              });
            }
            showToast(
              `Dodano ${payload.items.length > 1 ? `${payload.items.length} pozycji` : payload.items[0]?.name || ''} do koszyka!`,
              'success',
            );
          }
          break;
        }
        case 'openReservation': {
          const payload = action.payload as { date?: string; time?: string; guests?: number } | undefined;
          if (payload) {
            setReservationPrefill({
              date: payload.date,
              time: payload.time,
              guests: payload.guests,
            });
          } else {
            setReservationPrefill({});
          }
          setShowReservationForm(true);
          scrollToBottom();
          break;
        }
        case 'showMenu':
          navigate('/menu');
          setIsOpen(false);
          showToast('Przekierowuję do menu...', 'info');
          break;
        case 'showOrders':
          navigate('/orders');
          setIsOpen(false);
          break;
        case 'createReservation': {
          const payload = action.payload as CreateReservationPayload | undefined;
          const actionData = action.data as CreateReservationPayload | undefined;
          const reservation = payload || actionData;

          if (!reservation || !reservation.date || !reservation.time || !reservation.guests) {
            showToast('Brak danych rezerwacji. Spróbuj ponownie przez czat.', 'warning');
            return;
          }

          if (!user) {
            showToast('Musisz być zalogowany aby zarezerwować stolik.', 'warning');
            return;
          }

          try {
            // Sprawdź dostępność
            const { available } = await checkReservationAvailability({
              date: reservation.date,
              time: reservation.time,
            });

            if (!available) {
              showToast(
                `⚠️ Niestety, termin ${reservation.date} o ${reservation.time} jest już zajęty. Wybierz inną godzinę.`,
                'warning',
              );
              return;
            }

            // Jeśli wolne – zapisz
            await createReservation({
              user_id: user.id,
              date: reservation.date,
              time: reservation.time,
              guests: reservation.guests,
              notes: null,
            });

            showToast(
              `✅ Rezerwacja potwierdzona! Do zobaczenia ${reservation.date} o ${reservation.time}.`,
              'success',
            );
          } catch (err) {
            console.error('[rezerwacja] Błąd:', err);
            showToast('❌ Nie udało się zapisać rezerwacji. Spróbuj ponownie.', 'danger');
          }
          break;
        }
      }
    },
    [addToCart, showToast, navigate, scrollToBottom, user],
  );

  const handleReservationSuccess = (msg: string) => {
    setShowReservationForm(false);
    addMessage('assistant', `✅ ${msg}\n\nJeśli chcesz zmienić lub anulować rezerwację, daj znać!`);
    scrollToBottom();
  };

  const handleClearConversation = () => {
    const welcome: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content:
        'Witaj! 👋 Jestem wirtualnym kelnerem. Jak mogę Ci pomóc? Możesz zapytać o menu, zarezerwować stolik, zamówić jedzenie lub sprawdzić godziny otwarcia.',
      timestamp: Date.now(),
    };
    setMessages([welcome]);
    localStorage.removeItem(STORAGE_KEY);
    showToast('Rozmowa została wyczyszczona.', 'info');
  };

  /* ──────────── Render ──────────── */

  return (
    <>
      {/* Floating button */}
      <button
        className="btn btn-dark rounded-circle shadow-lg d-flex align-items-center justify-content-center position-fixed"
        style={{
          width: 56,
          height: 56,
          bottom: 24,
          right: 24,
          zIndex: 1050,
          fontSize: 24,
        }}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Zamknij czat' : 'Otwórz czat'}
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {/* Chat panel */}
      <div
        ref={chatPanelRef}
        className="position-fixed shadow-lg bg-white rounded-4 d-flex flex-column"
        style={{
          bottom: 92,
          right: 24,
          width: 380,
          maxWidth: 'calc(100vw - 32px)',
          height: 560,
          maxHeight: 'calc(100vh - 140px)',
          zIndex: 1050,
          transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'transform 0.2s ease, opacity 0.2s ease',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom bg-dark text-white rounded-top-4">
          <div className="d-flex align-items-center gap-2">
            <span style={{ fontSize: 20 }}>🤖</span>
            <div>
              <div className="fw-semibold small">Wirtualny Kelner</div>
              <div className="small" style={{ fontSize: 11, opacity: 0.8 }}>
                {isLoading ? 'odpowiada...' : 'online'}
              </div>
            </div>
          </div>
          <button
            className="btn btn-sm text-white border-0"
            style={{ opacity: 0.7 }}
            onClick={handleClearConversation}
            title="Wyczyść rozmowę"
          >
            🗑️
          </button>
        </div>

        {/* Messages */}
        <div className="flex-grow-1 overflow-auto p-3" style={{ background: '#f8f9fa' }}>
          {messages.map((msg) => (
            <div key={msg.id} className="mb-3" style={{ maxWidth: '85%' }}>
              <div
                className={`rounded-3 px-3 py-2 ${
                  msg.role === 'user'
                    ? 'bg-dark text-white ms-auto'
                    : 'bg-white border shadow-sm'
                }`}
                style={{
                  width: 'fit-content',
                  ...(msg.role === 'user' ? { marginLeft: 'auto' } : {}),
                }}
              >
                <div className="small" style={{ whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </div>
                <div
                  className={`small mt-1 ${
                    msg.role === 'user'
                      ? 'text-white-50'
                      : 'text-muted'
                  }`}
                  style={{ fontSize: 10 }}
                >
                  {new Date(msg.timestamp).toLocaleTimeString('pl-PL', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              {/* Action buttons */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="d-flex flex-wrap gap-1 mt-1">
                  {msg.actions.map((action, idx) => (
                    <button
                      key={`${msg.id}-action-${idx}`}
                      className="btn btn-sm btn-outline-dark rounded-pill"
                      style={{ fontSize: 12 }}
                      onClick={() => handleChatAction(action)}
                    >
                      {action.type === 'addToCart' && '🛒 '}
                      {action.type === 'openReservation' && '📅 '}
                      {action.type === 'showMenu' && '📋 '}
                      {action.type === 'showOrders' && '📦 '}
                      {action.type === 'createReservation' && '✅ '}
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="mb-3" style={{ maxWidth: '75%' }}>
              <div className="bg-white border rounded-3 px-3 py-2 shadow-sm">
                <div className="d-flex gap-1" style={{ fontSize: 20 }}>
                  <span className="typing-dot">•</span>
                  <span className="typing-dot" style={{ animationDelay: '0.2s' }}>
                    •
                  </span>
                  <span className="typing-dot" style={{ animationDelay: '0.4s' }}>
                    •
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Reservation form */}
          {showReservationForm && (
            <ReservationForm
              defaultDate={reservationPrefill.date}
              defaultTime={reservationPrefill.time}
              defaultGuests={reservationPrefill.guests}
              userId={user?.id}
              onClose={() => setShowReservationForm(false)}
              onSuccess={handleReservationSuccess}
            />
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick actions */}
        {messages.length <= 2 && !isLoading && (
          <div className="px-3 pb-1">
            <div className="d-flex flex-wrap gap-1">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  className="btn btn-sm btn-outline-secondary rounded-pill"
                  style={{ fontSize: 12 }}
                  onClick={() => handleQuickAction(action)}
                >
                  {action.icon} {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-top">
          <div className="input-group input-group-sm">
            <input
              ref={inputRef}
              type="text"
              className="form-control"
              placeholder="Napisz wiadomość..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              aria-label="Wiadomość do wirtualnego kelnera"
            />
            <button
              className="btn btn-dark"
              onClick={() => handleSend(inputValue)}
              disabled={isLoading || !inputValue.trim()}
              aria-label="Wyślij"
            >
              {isLoading ? (
                <span
                  className="spinner-border spinner-border-sm"
                  role="status"
                />
              ) : (
                '➤'
              )}
            </button>
          </div>
          {!user && (
            <div className="small text-muted mt-1" style={{ fontSize: 11 }}>
              💡 Zaloguj się, aby zamawiać i rezerwować przez czat.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
