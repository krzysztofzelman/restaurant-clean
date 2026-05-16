import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
// DeepSeek uses OpenAI-compatible API — same SDK, different baseURL
import OpenAI from 'https://esm.sh/openai@4.86.2';

/* ──────────────── CORS ──────────────── */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/* ───────────────┐
  │  Stałe        │
  └────────────────*/

/** Słowa kluczowe – jeśli wystąpią, do promptu trafia aktualne menu z bazy. */
const MENU_KEYWORDS = [
  'menu', 'pizza', 'burger', 'danie', 'jedzenie', 'obiad', 'zupa', 'deser',
  'napoje', 'polecasz', 'macie', 'cena', 'koszt', 'jem', 'zjeść', 'głodny',
  'karta', 'oferta', 'wszystko',
];

/** Słowa kluczowe dotyczące rezerwacji – nie potrzebują menu. */
const RESERVATION_KEYWORDS = [
  'rezerw', 'stolik', 'zarezerwuj', 'booking', 'miejsce', 'gości',
  'osób', 'osoby', 'przyjść',
];

/** Informacje stałe – zawsze w promptcie. */
const RESTAURANT_INFO = `Informacje o restauracji:
- Adres: ul. Restauracyjna 15, Warszawa
- Godziny otwarcia: Pon-Pt 12:00-22:00, Sob-Nd 11:00-23:00
- Telefon: +48 123 456 789`;

/* ───────────────┐
  │  Menu z bazy │
  └────────────────*/

interface MenuItem {
  name: string;
  description: string | null;
  price: number;
  category: string;
}

/**
 * Pobiera aktualne menu z Supabase i formatuje jako czytelny tekst.
 */
async function getMenuText(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('name, description, price, category')
    .eq('is_available', true)
    .order('category')
    .order('name');

  if (error) {
    console.error('[chat-ai] Błąd pobierania menu:', error.message);
    return '';
  }

  if (!data || data.length === 0) {
    return '';
  }

  const items = data as MenuItem[];

  // Grupuj po kategoriach
  const groups = new Map<string, MenuItem[]>();
  for (const item of items) {
    const cat = item.category;
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(item);
  }

  // Formatuj: === KATEGORIA ===\n- nazwa (cena zł): opis
  const lines: string[] = [];
  for (const [category, catItems] of groups) {
    lines.push(`=== ${category.toUpperCase()} ===`);
    for (const item of catItems) {
      const price = item.price.toFixed(2);
      const desc = item.description ? `: ${item.description}` : '';
      lines.push(`- ${item.name} (${price} zł)${desc}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Sprawdza czy wiadomość zawiera słowa kluczowe dotyczące jedzenia/menu.
 */
function mentionsFood(text: string): boolean {
  const lower = text.toLowerCase();
  return MENU_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Sprawdza czy wiadomość dotyczy rezerwacji (oszczędza zapytanie o menu).
 */
function mentionsReservation(text: string): boolean {
  const lower = text.toLowerCase();
  return RESERVATION_KEYWORDS.some((kw) => lower.includes(kw));
}

/* ───────────────┐
  │  System prompt │
  └────────────────*/

function buildSystemPrompt(menuText: string): string {
  const menuSection = menuText
    ? `\n\nAKTUALNE MENU (z bazy danych):\n${menuText}`
    : '';

  return `Jesteś "Restauracyjny Bot", przyjazny wirtualny kelner w restauracji.
Mów WYŁĄCZNIE po polsku.
Zawsze bądź zwięzły (maksymalnie 2-3 zdania na odpowiedź).
Przy rekomendacjach proponuj 2-3 konkretne dania.
Nigdy nie wymyślaj informacji – opieraj się wyłącznie na kontekście poniżej.
W kwestii alergenów zawsze zalecaj konsultację z kuchnią.

WSZYSTKIE informacje o menu (dania, ceny, opisy) masz w kontekście poniżej.
NIGDY nie mów że dania nie ma, jeśli nie widzisz go w kontekście – powiedz że sprawdzisz i zapytaj ponownie.

${RESTAURANT_INFO}${menuSection}

Prowadź rozmowę naturalnie, jak prawdziwy kelner.

## OBSŁUGA REZERWACJI STOLIKÓW

Gdy użytkownik chce zarezerwować stolik (mówi: "chcę zarezerwować", "zarezerwuj stolik", "rezerwacja", "stolik dla X osób"):

Krok 1: Zapytaj o datę i godzinę
- "Na jaki dzień i godzinę chcesz zarezerwować stolik? (np. jutro 19:00)"

Krok 2: Po podaniu daty i godziny, zapytaj o liczbę osób
- "Na ile osób ma być rezerwacja?"

Krok 3: Po podaniu liczby osób, PODSUMUJ i ZAPYTAJ O POTWIERDZENIE:
- "Rezerwacja na {data} o {godzina} dla {osoby} osób. Czy chcesz potwierdzić?"

Krok 4: Po potwierdzeniu (użytkownik mówi "tak", "potwierdzam", "ok", "potwierdzić"):
- Powiedz: "Dziękuję! Rezerwacja została zapisana. Do zobaczenia!"
- **WAŻNE: W tym momencie zwróć odpowiedź WYŁĄCZNIE jako poniższy JSON – bez żadnego innego tekstu:**

\`\`\`json
{
  "reply": "Dziękuję! Rezerwacja na {data} o {godzina} dla {osoby} osób została potwierdzona. Do zobaczenia!",
  "action": {
    "type": "createReservation",
    "data": {
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "guests": LICZBA
    }
  }
}
\`\`\`

Jeśli użytkownik nie jest zalogowany (w kontekście nie ma ID użytkownika), powiedz: "Aby dokonać rezerwacji, musisz być zalogowany. Proszę się zalogować." – bez JSON.`;
}

/* ───────────────┐
  │  Wywołanie AI │
  └────────────────*/

async function callDeepSeek(
  client: OpenAI,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
): Promise<string> {
  const TIMEOUT_MS = 30_000;

  const result = await Promise.race([
    client.chat.completions.create({
      model: 'deepseek-chat',
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), TIMEOUT_MS),
    ),
  ]);

  const completion = result as OpenAI.Chat.Completions.ChatCompletion;
  return completion.choices?.[0]?.message?.content?.trim() ?? '';
}

/* ───────────────┐
  │  Parsowanie   │
  │  odpowiedzi   │
  └────────────────*/

/**
 * Próbuje sparsować odpowiedź AI jako JSON.
 * AI może zwrócić czysty JSON lub JSON w bloku ```json ... ```.
 * Jeśli się nie uda – zwraca plain text.
 */
function parseAIResponse(
  raw: string,
): { reply: string; action?: { type: string; data: Record<string, unknown> } } {
  // 1. Spróbuj wyciągnąć JSON z bloku ```json ... ```
  const jsonBlockMatch = raw.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  const jsonStr = jsonBlockMatch?.[1] ?? raw;

  // 2. Spróbuj sparsować
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed && typeof parsed.reply === 'string') {
      return {
        reply: parsed.reply,
        action: parsed.action || undefined,
      };
    }
  } catch {
    // nie jest JSON – idź dalej
  }

  // 3. Fallback – zwykły tekst
  return { reply: raw };
}

/* ───────────────┐
  │  Handler      │
  └────────────────*/

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- Parse request ---
    const { message, userId, conversationHistory } = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Brakujące lub nieprawidłowe pole "message".' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // --- Validate API key ---
    const apiKey = Deno.env.get('DEEPSEEK_API_KEY');
    if (!apiKey) {
      console.error('[chat-ai] Brak DEEPSEEK_API_KEY.');
      return new Response(
        JSON.stringify({
          error: 'Brak klucza API DeepSeek. Skontaktuj się z administratorem.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // --- Init clients ---
    const deepseek = new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com/v1',
    });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // --- Zdecyduj czy dołożyć menu do promptu ---
    // Nie pobieraj menu jeśli rozmowa dotyczy tylko rezerwacji (oszczędność tokenów)
    let menuText = '';
    const isFoodQuery = mentionsFood(message);
    const isResQuery = mentionsReservation(message);

    if (isFoodQuery) {
      menuText = await getMenuText(supabase);
    } else if (!isResQuery && conversationHistory?.length) {
      const lastUserMsgs = conversationHistory
        .filter((m: { role: string }) => m.role === 'user')
        .slice(-3);
      if (lastUserMsgs.some((m: { content: string }) => mentionsFood(m.content))) {
        menuText = await getMenuText(supabase);
      }
    }

    if (menuText) {
      console.log('[chat-ai] Menu dołączone do promptu (%d znaków).', menuText.length);
    }

    // --- Build messages ---
    const systemPrompt = buildSystemPrompt(menuText);
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ];

    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory.slice(-10)) {
        if (msg.role === 'user') {
          messages.push({ role: 'user', content: msg.content });
        } else if (msg.role === 'assistant') {
          messages.push({ role: 'assistant', content: msg.content });
        }
      }
    }

    const userContent = userId
      ? `[Użytkownik ID: ${userId}] ${message}`
      : message;
    messages.push({ role: 'user', content: userContent });

    // --- Call DeepSeek ---
    const rawReply = await callDeepSeek(deepseek, messages);

    if (!rawReply) {
      console.error('[chat-ai] Pusta odpowiedź.');
      return new Response(
        JSON.stringify({
          reply: 'Przepraszam, nie udało mi się wygenerować odpowiedzi. Spróbuj ponownie.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // --- Sparsuj odpowiedź (JSON lub plain text) ---
    const parsed = parseAIResponse(rawReply);

    const body: Record<string, unknown> = { reply: parsed.reply };
    if (parsed.action) {
      // Konwertuj na format zrozumiały dla frontendu (z label)
      body.action = {
        type: parsed.action.type,
        label:
          parsed.action.type === 'createReservation'
            ? 'Zarezerwuj stolik'
            : 'Wykonaj akcję',
        data: parsed.action.data,
      };
    }

    return new Response(
      JSON.stringify(body),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Nieznany błąd';

    if (msg === 'TIMEOUT') {
      console.error('[chat-ai] Timeout – 30s.');
      return new Response(
        JSON.stringify({ reply: 'Przepraszam, odpowiedź trwała zbyt długo. Spróbuj ponownie za chwilę.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.error('[chat-ai] Błąd:', msg);
    return new Response(
      JSON.stringify({ reply: 'Przepraszam, wystąpił błąd. Spróbuj ponownie.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
