# Plan migracji: Supabase → FastAPI + PostgreSQL na VPS

## 1. Architektura docelowa

```
┌──────────────────────────────────────────────────┐
│                  VPS (Linux)                      │
│                                                   │
│  ┌──────────┐     ┌────────────┐  ┌───────────┐  │
│  │  React    │     │  FastAPI   │  │ PostgreSQL │  │
│  │  (SPA)    │ ←→  │  (Uvicorn) │ ←→ │            │  │
│  │           │     │            │  │            │  │
│  │ Nginx     │     │ Celery     │  │ - 9 tabel  │  │
│  │ (statyk)  │     │ (zadania)  │  │ - indeksy  │  │
│  └──────────┘     └────────────┘  └───────────┘  │
│                          │                        │
│                          ▼                        │
│                   ┌────────────┐                  │
│                   │  Redis     │                  │
│                   │ (kolejka)  │                  │
│                   └────────────┘                  │
│                                                   │
│  Zewnętrzne API: Stripe, DeepSeek/OpenAI          │
└──────────────────────────────────────────────────┘
```

**Co się zmienia w przepływie danych:**
- Obecnie: React → Supabase JS (bezpośrednio z przeglądarki)
- Po migracji: React → fetch/axios → FastAPI → PostgreSQL

---

## 2. Lista zastępowanych komponentów Supabase

| Komponent | Obecnie (Supabase) | Docelowo (VPS) |
|---|---|---|
| **Baza danych** | PostgreSQL na Supabase | PostgreSQL na VPS (ten sam schemat) |
| **Auth** | Supabase Auth (email/hasło, JWT, magic link) | FastAPI + bcrypt + PyJWT + email |
| **Row Level Security** | RLS na każdej tabeli ~38 polityk | Middleware autoryzacyjne w FastAPI |
| **Triggers auth.users → profiles** | Trigger PostgreSQL na `auth.users` | Kod w FastAPI przy rejestracji |
| **RPC: create_order_with_items** | Funkcja PostgreSQL | Endpoint POST /api/orders |
| **RPC: update_order_status** | Funkcja PostgreSQL (maszyna stanów) | Endpoint PATCH /api/orders/{id}/status |
| **RPC: consume_ingredients_for_order** | Funkcja PostgreSQL (FIFO) | Logika w Pythonie (serwis) |
| **RPC: track_revenue** | Funkcja PostgreSQL (agregacja) | Zapisane zapytanie SQL w kodzie |
| **RPC: get_warehouse_stats** | Funkcja PostgreSQL (agregacja) | Zapisane zapytanie SQL w kodzie |
| **RPC: cancel_unpaid_orders** | Funkcja PostgreSQL (pg_cron - wyłączone) | Celery Beat (co 5 min) |
| **Edge Function: chat-ai** | Deno + DeepSeek SDK + Supabase JS | FastAPI endpoint + LangChain |
| **Edge Function: create-payment-intent** | Deno + Stripe SDK + Supabase JS | FastAPI endpoint + Stripe SDK |
| **Storage: menu-images** | Supabase Storage (S3-compatible) | Dysk VPS (katalog /var/www/images/) |
| **Session management** | Supabase Auth (cookie + localStorage) | JWT (access/refresh token) + httpOnly cookie |
| **Password reset** | Supabase Auth email + magic link | FastAPI + SMTP (SendGrid / Mailgun / własny) |
| **Realtime** | Supabase Realtime (WebSocket) | Opcjonalnie: Redis pub/sub lub WebSocket |

---

## 3. Stack technologiczny

| Warstwa | Technologia | Uzasadnienie |
|---|---|---|
| **Język** | Python 3.12+ | AI/LLM, narzędzia data, jeden język backendu |
| **Framework web** | FastAPI | Async, automatyczna dokumentacja (Swagger), Pydantic |
| **ORM** | SQLAlchemy 2.0 + Alembic | Dojrzały, migracje, pełna kontrola nad SQL |
| **Serwer ASGI** | Uvicorn + Gunicorn | Wydajność, production-ready |
| **Auth** | bcrypt + PyJWT + python-jose | Ręczna kontrola nad JWT |
| **Walidacja** | Pydantic v2 | Wbudowana w FastAPI, typowanie |
| **AI** | LangChain + OpenAI SDK (DeepSeek) | Więcej możliwości niż obecna implementacja |
| **Płatności** | Stripe Python SDK | Oficjalne SDK |
| **Kolejka zadań** | Celery + Redis / ARQ | Background jobs, scheduled tasks |
| **Storage** | Dysk lokalny (lub MinIO potem) | Najprostsze, brak zależności |
| **Frontend** | React + Vite (bez zmian) | Tylko podmiana warstwy API |
| **Konteneryzacja** | Docker + docker-compose | Reprodukowalne środowisko |
| **Reverse proxy** | Nginx | Serwowanie statyk, SSL (certbot), proxy na FastAPI |
| **System** | Ubuntu 24.04 LTS na VPS | Stabilność, długie wsparcie |

---

## 4. Fazy migracji (krok po kroku)

### Faza 0: Przygotowanie środowiska (Docker local)

**Cel:** Postawić cały stack lokalnie w Dockerze do开发.

- `docker-compose.yml` z:
  - `postgres:16` (inicjalizowany schematem z `supabase-schema.sql`)
  - `redis:7` (kolejka Celery)
  - Aplikacja FastAPI (uwaga: na razie pusta)
  - Nginx (opcjonalnie lokalnie)
- Plik `init.sql` na bazie `supabase-schema.sql` z modyfikacjami:
  - Usunąć `auth.users` i powiązane triggery (to nie istnieje w naszej bazie)
  - Dodać tabelę `users` na potrzeby auth
  - Usunąć RLS (role przeniesione do middlewaru)
  - Dodać indeksy
- Wypchnąć do GitHub

---

### Faza 1: Implementacja autoryzacji (Auth)

**Endpointy FastAPI:**

| Endpoint | Metoda | Opis |
|---|---|---|
| `/api/auth/register` | POST | Rejestracja (email, hasło, full_name) → tworzy user + profil |
| `/api/auth/login` | POST | Logowanie → zwraca access token (JWT) + refresh token |
| `/api/auth/refresh` | POST | Odświeżenie tokena |
| `/api/auth/me` | GET | Profil bieżącego użytkownika |
| `/api/auth/password-reset` | POST | Wysyła email z linkiem resetującym |
| `/api/auth/password-reset/confirm` | POST | Ustawia nowe hasło (token z emaila) |

**Model `users` w bazie:**

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'kitchen', 'admin', 'courier')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Tabela `profiles` → scalona z `users`** – role i dane osobowe są w tej samej tabeli, nie ma osobnej `profiles`. Obecna tabela `profiles` w projekcie to i tak kopia z `auth.users` – możemy to uprościć.

> **Uwaga:** Wszystkie obecne tabele mają `user_id → profiles(id)`. Zmieniamy FK na `user_id → users(id)`. Kolumna `email` już istnieje w `profiles`, więc przenosimy dane.

**Przebieg auth:**
1. Rejestracja → hash hasła (bcrypt) → INSERT do `users` → zwraca JWT
2. Logowanie → sprawdza hash → zwraca access_token (15 min) + refresh_token (7 dni)
3. Każdy endpoint autoryzowany przez zależność FastAPI `get_current_user()` (wydobywa JWT z nagłówka `Authorization: Bearer`)
4. Rolę sprawdzamy dekoratorem `@require_role(['admin', 'kitchen'])`

---

### Faza 2: API endpoints (wszystkie tabele)

**Struktura projektu (backend):**

```
backend/
├── app/
│   ├── main.py              # FastAPI app, CORS, lifespan
│   ├── config.py            # Ustawienia z env (pydantic-settings)
│   ├── database.py          # SQLAlchemy engine + session
│   ├── models/              # SQLAlchemy modele
│   │   ├── user.py
│   │   ├── menu_item.py
│   │   ├── order.py
│   │   ├── ingredient.py
│   │   └── reservation.py
│   ├── schemas/             # Pydantic schematy (request/response)
│   │   ├── auth.py
│   │   ├── menu.py
│   │   ├── order.py
│   │   ├── warehouse.py
│   │   └── reservation.py
│   ├── api/                 # Endpointy (routery)
│   │   ├── auth.py
│   │   ├── menu.py
│   │   ├── orders.py
│   │   ├── warehouse.py
│   │   ├── reservation.py
│   │   └── payments.py
│   ├── services/            # Logika biznesowa
│   │   ├── order_service.py     # create_order, update_status, consume_ingredients
│   │   ├── warehouse_service.py # FIFO, stats
│   │   ├── payment_service.py   # Stripe PaymentIntent
│   │   └── ai_service.py        # DeepSeek/LangChain
│   ├── dependencies.py      # Zależności FastAPI (get_current_user, require_role)
│   └── tasks.py             # Zadania Celery
├── alembic/                 # Migracje bazy danych
├── requirements.txt / pyproject.toml
├── Dockerfile
└── docker-compose.yml
```

**Mapowanie endpointów (wszystkie, 1:1 z obecnym api.ts):**

| Obecna funkcja (api.ts) | Nowy endpoint FastAPI | Uwagi |
|---|---|---|
| `getMenuItems()` | `GET /api/menu?available=true` | Filtrowanie po parametrze |
| `getAllMenuItems()` | `GET /api/menu` | Widoczne tylko dla admin/kitchen |
| `addMenuItem()` | `POST /api/menu` | |
| `updateMenuItem()` | `PUT /api/menu/{id}` | |
| `deleteMenuItem()` | `DELETE /api/menu/{id}` | |
| `toggleMenuItemAvailability()` | `PATCH /api/menu/{id}/availability` | Częściowa aktualizacja |
| `uploadMenuImage()` | `POST /api/menu/{id}/image` | Multipart upload, zapis na dysk |
| `createOrder()` | `POST /api/orders` | Logika z `create_order_with_items` w Pythonie |
| `getMyOrders()` | `GET /api/orders/my` | |
| `getAllOrders()` | `GET /api/orders` | |
| `updateOrderStatus()` | `PATCH /api/orders/{id}/status` | Maszyna stanów w Pythonie |
| `updatePaymentStatus()` | `PATCH /api/orders/{id}/payment` | |
| `getCourierOrders()` | `GET /api/orders/courier/available` | |
| `getCourierHistory()` | `GET /api/orders/courier/history` | |
| `updateDeliveryStatus()` | `PATCH /api/orders/{id}/delivery` | |
| `createPaymentIntent()` | `POST /api/payments/create-intent` | Stripe SDK |
| `getUserProfile()` | `GET /api/auth/me` | Już w auth |
| `updateUserRole()` | `PATCH /api/users/{id}/role` | Tylko admin |
| `getAllProfiles()` | `GET /api/users` | Tylko admin/kitchen |
| `getIngredients()` | `GET /api/warehouse/ingredients` | |
| `getIngredientBatches()` | `GET /api/warehouse/ingredients/{id}/batches` | |
| `addIngredient()` | `POST /api/warehouse/ingredients` | |
| `updateIngredient()` | `PUT /api/warehouse/ingredients/{id}` | |
| `deleteIngredient()` | `DELETE /api/warehouse/ingredients/{id}` | |
| `addBatch()` | `POST /api/warehouse/batches` | |
| `deleteIngredientBatch()` | `DELETE /api/warehouse/batches/{id}` | |
| `getWarehouseStats()` | `GET /api/warehouse/stats` | |
| `getMenuItemIngredients()` | `GET /api/menu/{id}/ingredients` | |
| `addMenuItemIngredient()` | `POST /api/menu/{id}/ingredients` | |
| `deleteMenuItemIngredient()` | `DELETE /api/menu/ingredients/{id}` | |
| `saveConversation()` | `POST /api/ai/conversations` | |
| `getUserConversations()` | `GET /api/ai/conversations` | |
| `checkReservationAvailability()` | `GET /api/reservations/availability` | |
| `createReservation()` | `POST /api/reservations` | |
| `getUserReservations()` | `GET /api/reservations/my` | |
| `getAllReservations()` | `GET /api/reservations` | |
| `updateReservationStatus()` | `PATCH /api/reservations/{id}` | |
| `trackRevenue()` | `GET /api/dashboard/revenue` | |

---

### Faza 2b: Logika biznesowa przeniesiona z PostgreSQL do Pythona

Obecnie logika tkwi w funkcjach PostgreSQL. Przenosimy ją w testowalne serwisy:

**`services/order_service.py`:**
- `create_order(user_id, items, total_amount, delivery_address, notes)` – atomiczna transakcja: INSERT order + INSERT order_items (SQLAlchemy unit of work)
- `update_order_status(order_id, new_status, courier_id=None)` – maszyna stanów (dict przejść, walidacja, wyjątki)
- `consume_ingredients(order_id)` – FIFO: SELECT batches ORDER BY received_at, odejmowanie, usuwanie wyczerpanych, warningi o brakach

**`services/warehouse_service.py`:**
- `get_stats()` – zapytania SQL: low_stock, expiring_soon (7 dni), expired

**`services/payment_service.py`:**
- `create_payment_intent(order_id, amount)` – Stripe API (kwota × 100, currency='pln')
- Obsługa webhooka Stripe (`POST /api/payments/webhook`) – nasłuchiwanie `payment_intent.succeeded` → `updatePaymentStatus(order_id, 'paid')`

> **Ważne:** Obecny kod ma błędne RLS – blokuje zmianę `payment_status` przez użytkownika. Webhook Stripe rozwiązuje to poprawnie, bo przychodzi z zewnątrz (bez JWT użytkownika).

**`services/ai_service.py`:**
- `chat(message, user_id, history)` – LangChain z callbackami, DeepSeek jako model, narzędzia (tools) do odczytu menu i rezerwacji
- **Przewaga nad Edge Function:** możemy dodać RAG (wektorowa baza wiedzy o menu, składnikach), streaming odpowiedzi, lepsze tool calling

---

### Faza 3: AI Chat (przeniesienie Edge Function)

Obecnie chat-ai to osobna Edge Function w Deno. Przenosimy do FastAPI.

**Endpointy:**

| Endpoint | Metoda | Opis |
|---|---|---|
| `POST /api/ai/chat` | POST | Ten sam contract co obecny `{ message, userId, conversationHistory }` → `{ reply, actions }` |
| `POST /api/ai/conversations` | POST | Zapis konwersacji do DB (obecnie bug – nie działa) |
| `GET /api/ai/conversations` | GET | Historia konwersacji usera |

**Korzyści z Pythona:**
- LangChain zamiast ręcznego formatowania prompta
- Tool calling (zamiast parsowania JSON z odpowiedzi)
- Możliwość dodania streamingu odpowiedzi
- Łatwe testowanie

---

### Faza 4: Płatności (Stripe webhook)

Ważna zmiana architektoniczna: obecnie frontend wywołuje `updatePaymentStatus` po potwierdzeniu karty, ale RLS to blokuje. Poprawiamy to przez Stripe webhook.

**Przepływ po migracji:**

```
1. Frontend: POST /api/payments/create-intent → { clientSecret }
2. Frontend: stripe.confirmCardPayment(clientSecret) ← bez zmian
3. Stripe:   webhook → POST /api/payments/webhook → payment_intent.succeeded
4. Backend:  update order.payment_status = 'paid' (bez JWT, webhook secret)
5. Frontend: poll GET /api/orders/{id} lub WebSocket → widzi payment_status = 'paid'
```

**Lub prościej** – endpoint `POST /api/payments/confirm` przyjmuje `{ orderId, paymentIntentId }`, backend weryfikuje w Stripe status i aktualizuje DB. Frontend woła to po udanym `confirmCardPayment`.

---

### Faza 5: Storage (zdjęcia menu)

Obecnie: Supabase Storage (obiektowy). Docelowo: dysk VPS.

**Endpointy:**

| Endpoint | Metoda | Opis |
|---|---|---|
| `POST /api/menu/{id}/image` | POST | Multipart upload, zapis do `/var/www/images/menu/{id}.{ext}` |
| `GET /images/menu/{filename}` | GET | Serwowane przez Nginx (szybciej niż przez Python) |
| `DELETE /api/menu/{id}/image` | DELETE | Usuwa plik z dysku |

**Nginx config:**
```nginx
location /images/ {
    alias /var/www/images/;
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

---

### Faza 6: Background jobs (Celery)

Obecnie: `cancel_unpaid_orders()` przez pg_cron (wyłączone). Docelowo: Celery Beat.

| Zadanie | Harmonogram | Opis |
|---|---|---|
| `cancel_unpaid_orders` | Co 5 minut | Anuluje zamówienia `pending` + `unpaid` starsze niż 15 min |
| `check_low_stock` | Codziennie | Opcjonalne powiadomienie o niskich stanach magazynowych |

---

### Faza 7: Frontend – podmiana warstwy API

**Najmniej inwazyjna zmiana po stronie frontendu:**

1. Usunąć `@supabase/supabase-js` z zależności
2. Usunąć `src/lib/supabaseClient.ts`
3. Dodać `src/services/httpClient.ts` – wrapper na fetch/axios z:
   - Bazowym URL (`VITE_API_URL=http://localhost:8000`)
   - Automatycznym dołączaniem JWT (`Authorization: Bearer <token>`)
   - Odświeżaniem tokena przy 401
4. **Przepisać `api.ts`** – każde wywołanie `supabase.from(...)` → wywołanie REST endpointu
5. **Przepisać `AuthContext.tsx`** – zamiast `supabase.auth.signIn()` → `POST /api/auth/login`

**Zmiany w `AuthContext.tsx`:**
```typescript
// Obecnie:
const { data } = await supabase.auth.signInWithPassword({ email, password });

// Po migracji:
const { data } = await httpClient.post('/api/auth/login', { email, password });
localStorage.setItem('access_token', data.access_token);
localStorage.setItem('refresh_token', data.refresh_token);
```

**Zmiany w `App.tsx`:** Żadne – routing, ProtectedRoute, PublicRoute działają bez zmian (tylko patrzą na stan `user` i `profile` z AuthContext).

**Zmiany w `aiChatService.ts`:**
```typescript
// Obecnie:
const { data, error } = await supabase.functions.invoke('chat-ai', { body });

// Po migracji:
const { data } = await httpClient.post('/api/ai/chat', body);
```

---

### Faza 8: Deployment na VPS

**Wymagania VPS:**
- Min 2 GB RAM, 2 vCPU, 20 GB SSD
- Ubuntu 24.04 LTS
- Docker + docker-compose
- Domena + SSL (Let's Encrypt)

**Struktura deploymentu:**

```
/opt/restaurant/
├── docker-compose.yml
├── nginx/
│   └── default.conf         # Proxy, statyki, SSL
├── backend/
│   ├── Dockerfile
│   └── app/
├── postgres/
│   └── init.sql
├── images/                   # Zdjęcia menu (volumen)
└── .env                      # Zmienne środowiskowe
```

**docker-compose.yml (szkic):**
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    environment:
      POSTGRES_DB: restaurant
      POSTGRES_USER: restaurant
      POSTGRES_PASSWORD: ${DB_PASSWORD}

  redis:
    image: redis:7

  backend:
    build: ./backend
    depends_on: [postgres, redis]
    environment:
      DATABASE_URL: postgresql://restaurant:${DB_PASSWORD}@postgres/restaurant
      REDIS_URL: redis://redis:6379
      SECRET_KEY: ${SECRET_KEY}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
      DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY}
      SMTP_PASSWORD: ${SMTP_PASSWORD}
    volumes:
      - images:/app/images

  celery_worker:
    build: ./backend
    command: celery -A app.tasks worker --loglevel=info
    depends_on: [postgres, redis, backend]

  celery_beat:
    build: ./backend
    command: celery -A app.tasks beat --loglevel=info
    depends_on: [postgres, redis, backend]

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf
      - images:/var/www/images:ro
      - certbot_data:/etc/letsencrypt
    depends_on: [backend]

volumes:
  postgres_data:
  images:
  certbot_data:
```

---

## 5. Kolejność implementacji (osobne PR/y)

Poniżej podział na zadania, każde osobny etap. **Po każdym etapie aplikacja działa** – migracja jest inkrementalna.

| Etap | Opis | Szacowany czas | Testowanie |
|---|---|---|---|
| **0** | Repo + Docker + init.sql lokalnie | 1 dzień | `docker-compose up`, psql, schema OK |
| **1** | Auth: rejestracja, logowanie, JWT, profile | 2-3 dni | Rejestracja, login, JWT, rola w tokenie |
| **2** | CRUD menu + zdjęcia (storage) | 2 dni | Dodaj/edytuj/usuń danie, upload zdjęcia |
| **3** | Zamówienia: create, lista, szczegóły | 3 dni | Złóż zamówienie, zobacz historię |
| **4** | Status zamówień (maszyna stanów) + FIFO | 2 dni | Zmiana statusu, magazyn się zmniejsza |
| **5** | Płatności: Stripe intent + webhook | 2 dni | Zapłać, status się zmienia na paid |
| **6** | Magazyn: CRUD składników + batchy + statystyki | 2 dni | Dodaj składnik, batch, statystyki |
| **7** | Rezerwacje: CRUD + dostępność | 1 dzień | Zarezerwuj, sprawdź dostępność |
| **8** | AI chat: LangChain + DeepSeek | 3 dni | Czat, rezerwacja przez AI |
| **9** | Dashboard: revenue + statystyki | 0.5 dnia | Revenue, wykresy |
| **10** | Background jobs: Celery + cancel_unpaid | 1 dzień | Zamówienie anulowane po 15 min |
| **11** | Frontend: przepisanie api.ts + AuthContext | 3-4 dni | Wszystkie strony działają lokalnie |
| **12** | End-to-end testy + poprawki | 2-3 dni | Wszystkie flow przechodzą |
| **13** | Deployment na VPS: Docker, Nginx, SSL | 1-2 dni | Aplikacja live na domenie |
| **14** | Backup, monitoring, logowanie | 1 dzień | pg_dump cron, prometheus/grafana? |

**Łącznie:** około 25-30 dni roboczych (przy pracy solo).

---

## 6. Obsługa haseł i emaili (ważne)

Obecnie Supabase wysyła emaile resetowania haseł. Po migracji potrzebujesz własnego SMTP.

**Opcje:**
- **Mailgun / SendGrid / Brevo** – darmowe limity (100-300 emaili/dzień)
- **Własny serwer SMTP** – jeśli VPS ma otwarty port 25 (często blokowany)
- **SMTP Gmail** – tylko do testów (wymaga hasła aplikacji)

---

## 7. Ryzyka i uwagi

| Ryzyko | Prawdopodobieństwo | Mitigacja |
|---|---|---|
| **Błąd w FIFO ingredient** | Średnie | Testy jednostkowe `consume_ingredients()` |
| **Utrata danych podczas migracji** | Niskie | Eksport Supabase → dump SQL, import na VPS |
| **Czas przestoju** | Średnie | Przełączanie DNS, migracja w oknie serwisowym |
| **Email resetowania hasła nie działa** | Średnie | Testy SMTP przed deploymentem |
| **Stripe webhook nie przychodzi** | Niskie | Stripe Dashboard → webhook endpoint test |
| **AI chat gorszy niż obecnie** | Niskie | Testy porównawcze promptów |

---

## 8. Pierwsze kroki (gdybyśmy zaczęli teraz)

Jeśli chcesz zacząć, sugeruję:

1. Stworzyć fork/katalog `backend/` w tym repozytorium
2. Postawić PostgreSQL w Dockerze z `init.sql`
3. Zaimplementować **Fazę 0 + 1** (auth) jako pierwszy PR
4. Po potwierdzeniu – **Faza 2** (endpoint menu)
5. I tak dalej, zgodnie z planem powyżej

Po każdej fazie frontend można testować przez Swagger UI (dostępny pod `/docs` na FastAPI) zanim przepiszemy `api.ts`.
