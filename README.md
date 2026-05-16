# 🍽️ Restauracja – Wirtualny Kelner AI

[![Vercel](https://img.shields.io/badge/deploy-vercel-black?logo=vercel)](https://restaurant-clean-omega.vercel.app/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase)](https://supabase.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Nowoczesna aplikacja webowa dla restauracji, wyposażona w **Wirtualnego Kelnera AI** – czatbota opartego na DeepSeek, który zna prawdziwe menu, przyjmuje zamówienia i rezerwacje. Panel administracyjny umożliwia zarządzanie rezerwacjami, zamówieniami, magazynem i dostawami.

**🌐 Wersja live:** [restaurant-clean-omega.vercel.app](https://restaurant-clean-omega.vercel.app/)

---

## ✨ Funkcjonalności

| Funkcja | Opis |
|---------|------|
| 🤖 **Wirtualny Kelner AI** | Czat z modelem DeepSeek – mówi po polsku, zna menu, doradza dania, przyjmuje rezerwacje |
| 📋 **Menu online** | Pełna karta dań (38 pozycji w 6 kategoriach) z możliwością dodawania do koszyka |
| 🛒 **Koszyk i zamówienia** | Składanie zamówień online z płatnością przez Stripe |
| 📅 **System rezerwacji** | Rezerwacja stolików przez czat AI lub panel – statusy: pending / confirmed / cancelled |
| 👨‍🍳 **Panel kuchni** | Podgląd zamówień, zmiana statusu, powiadomienia dźwiękowe i push |
| 📦 **Panel magazynu** | Zarządzanie składnikami, partiami i stanami magazynowymi |
| 🚚 **Panel kuriera** | Przypisywanie i śledzenie dostaw |
| 🛡️ **Panel admina** | Zarządzanie rezerwacjami (tabela + kalendarz), menu, użytkownikami, zamówieniami i recepturami |
| 🔐 **Autoryzacja rolami** | Logowanie przez Supabase Auth – role: `admin`, `kitchen`, `courier`, `user` |
| 📱 **Responsywność** | Bootstrap 5 – działa na desktopie, tablecie i telefonie |

---

## 🧱 Tech Stack

| Warstwa | Technologia |
|---------|-------------|
| **Frontend** | React 19, TypeScript 6, Vite 6 |
| **Routing** | react-router-dom 7 |
| **Stylowanie** | Bootstrap 5.3 |
| **Backend / DB** | Supabase (PostgreSQL, Auth, Row Level Security, Storage) |
| **Płatności** | Stripe (Checkout + Payment Intents) |
| **AI / Czat** | DeepSeek API (OpenAI-kompatybilny) |
| **Edge Functions** | Supabase Edge Functions (Deno / TypeScript) |
| **Hosting** | Vercel (frontend) + Supabase (backend) |
| **Jakość kodu** | ESLint, Prettier, TypeScript strict mode |

---

## 🚀 Uruchomienie lokalne

### Wymagania

- Node.js ≥ 18
- Konto [Supabase](https://supabase.com) (projekt z włączoną autoryzacją)
- Klucz API [DeepSeek](https://platform.deepseek.com/) (dla czatu AI)
- Konto [Stripe](https://stripe.com) (tryb testowy – opcjonalnie dla płatności)

### Krok po kroku

```bash
# 1. Sklonuj repozytorium
git clone https://github.com/twoja-nazwa/restaurant-clean.git
cd restaurant-clean

# 2. Zainstaluj zależności
npm install

# 3. Skopiuj zmienne środowiskowe i uzupełnij je
cp .env.example .env

# 4. Uruchom w trybie deweloperskim
npm run dev
```

Aplikacja będzie dostępna pod adresem **http://localhost:5173**.

### Konfiguracja Supabase

1. Utwórz projekt w [Supabase Dashboard](https://supabase.com/dashboard)
2. Otwórz **SQL Editor** i wykonaj skrypt `supabase-schema.sql` – tworzy wszystkie tabele, RLS, triggery i seed danych (menu, konta testowe)
3. Wykonaj migrację: `supabase/migrations/20260515_add_ai_chat_tables.sql`
4. Włącz **Authentication → Providers → Email**
5. Skopiuj `Project URL` i `anon public key` z **Project Settings → API** do `.env`

### Konfiguracja Edge Functions

```bash
# Zainstaluj Supabase CLI
npm install -g supabase

# Zaloguj się do projektu
supabase login
supabase link --project-ref twoj-projekt-ref

# Wdróż funkcję czatu AI
supabase functions deploy chat-ai --no-verify-jwt

# Wdróż funkcję płatności (opcjonalnie)
supabase functions deploy create-payment-intent

# Ustaw sekrety
supabase secrets set DEEPSEEK_API_KEY=sk-twoj-klucz
supabase secrets set STRIPE_SECRET_KEY=sk_test_twoj-klucz
```

### Konfiguracja Storage (zdjęcia menu)

1. W Supabase Dashboard przejdź do **Storage**
2. Utwórz bucket `menu-images` (publiczny)
3. Dodaj politykę RLS: INSERT/UPDATE dla uwierzytelnionych z rolą `admin`

---

## 🔐 Zmienne środowiskowe

Utwórz plik `.env` na podstawie `.env.example`:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_TUTAJ_WKLEJ
```

Sekrety dla Edge Functions (ustawiane przez `supabase secrets set`):

| Sekret | Opis |
|--------|------|
| `DEEPSEEK_API_KEY` | Klucz API DeepSeek – wymagany dla czatu AI |
| `SUPABASE_URL` | Automatycznie wstrzykiwany przez Supabase |
| `SUPABASE_ANON_KEY` | Automatycznie wstrzykiwany przez Supabase |
| `STRIPE_SECRET_KEY` | Sekretny klucz Stripe – dla `create-payment-intent` |

---

## 📁 Struktura projektu

```
restaurant-clean/
├── public/                          # Statyczne assety (favicon)
├── src/
│   ├── components/
│   │   ├── admin/
│   │   │   ├── ReservationCalendar.tsx   # Kalendarz rezerwacji
│   │   │   ├── ReservationList.tsx        # Lista rezerwacji z filtrami
│   │   │   └── ReservationModal.tsx       # Modal szczegółów rezerwacji
│   │   ├── ai/
│   │   │   └── WirtualnyKelner.tsx        # Główny komponent czatu AI
│   │   ├── CartWidget.tsx                 # Widget koszyka w navbarze
│   │   ├── ErrorBoundary.tsx              # Globalny catcher błędów UI
│   │   ├── MenuCard.tsx                   # Karta dania w menu
│   │   ├── Navbar.tsx                     # Nawigacja zależna od roli
│   │   └── StripePayment.tsx              # Formularz płatności Stripe
│   ├── pages/
│   │   ├── admin/
│   │   │   └── ReservationsAdmin.tsx      # Panel rezerwacji (admin/kitchen)
│   │   ├── AdminPage.tsx                  # Panel admina (menu, użytkownicy, zamówienia)
│   │   ├── CartPage.tsx                   # Koszyk + płatność
│   │   ├── CourierPage.tsx                # Panel kuriera
│   │   ├── HomePage.tsx                   # Strona główna (wizytówka)
│   │   ├── KitchenPage.tsx                # Panel kuchni
│   │   ├── LoginPage.tsx                  # Logowanie z kontami testowymi
│   │   ├── MenuPage.tsx                   # Menu z kategoriami
│   │   ├── OrdersPage.tsx                 # Historia zamówień klienta
│   │   ├── RegisterPage.tsx               # Rejestracja
│   │   ├── ResetPasswordPage.tsx          # Reset hasła
│   │   ├── StaffDashboard.tsx             # Dashboard personelu
│   │   ├── UpdatePasswordPage.tsx         # Ustawienie nowego hasła
│   │   └── WarehousePage.tsx              # Panel magazynu
│   ├── services/
│   │   ├── aiChatService.ts               # Komunikacja z Edge Function czatu
│   │   └── api.ts                         # Klient Supabase (zapytania)
│   ├── context/
│   │   ├── AuthContext.tsx                 # Kontekst autoryzacji
│   │   └── ToastContext.tsx                # System powiadomień toast
│   ├── hooks/
│   │   └── useCart.tsx                     # Hook koszyka (localStorage)
│   ├── lib/
│   │   ├── database.types.ts               # Typy TS dla schematu bazy
│   │   └── supabaseClient.ts               # Inicjalizacja klienta Supabase
│   ├── types/
│   │   └── ai.ts                           # Typy dla czatu AI
│   ├── App.tsx                             # Routing + provider hierarchy
│   └── main.tsx                            # Entry point
├── supabase/
│   ├── functions/
│   │   ├── chat-ai/
│   │   │   └── index.ts                    # Edge Function – czat z DeepSeek
│   │   └── create-payment-intent/
│   │       └── index.ts                    # Edge Function – płatności Stripe
│   └── migrations/
│       └── 20260515_add_ai_chat_tables.sql # Migracja tabel czatu AI
├── supabase-schema.sql                     # Pełny schemat bazy + RLS + seed
├── .env.example                            # Szablon zmiennych środowiskowych
├── package.json
├── tsconfig.json
├── vite.config.ts
└── eslint.config.js
```

---

## 🗄️ Baza danych (Supabase)

Schemat obejmuje 7 głównych tabel:

| Tabela | Opis |
|--------|------|
| `profiles` | Profile użytkowników (synchronizowane z `auth.users`), kolumna `role` z CHECK constraint |
| `menu_items` | 38 dań w 6 kategoriach (przystawki, zupy, dania główne, pizza, desery, napoje) |
| `orders` | Zamówienia ze statusem (pending → delivered), płatnością i przypisanym kurierem |
| `order_items` | Pozycje zamówienia (produkt, ilość, cena jednostkowa) |
| `rezerwacje` | Rezerwacje stolików – data, godzina, liczba gości, status, notatki |
| `ai_chat_sessions` | Sesje czatu AI do utrzymania kontekstu rozmowy |
| `ingredients` / `ingredient_batches` / `menu_item_ingredients` | Składniki, partie i receptury (moduł magazynowy) |

**Bezpieczeństwo:** RLS (Row Level Security) – każdy widzi tylko swoje dane, personel widzi wszystko. Wszystkie polityki zdefiniowane w `supabase-schema.sql`.

### Konta testowe

| Email | Rola | Opis |
|-------|------|------|
| `admin@restauracja.pl` | `admin` | Pełny dostęp do panelu admina |
| `kitchen@restauracja.pl` | `kitchen` | Panel kuchni i magazynu |
| `kurier@restauracja.pl` | `courier` | Panel kuriera |
| `jan@example.com` | `user` | Klient – menu, koszyk, zamówienia |

---

## 🤖 AI – Wirtualny Kelner

### Jak działa

Edge Function `chat-ai` działa jako pośrednik między frontendem a DeepSeek API:

1. Użytkownik pisze wiadomość w czacie (widget w prawym dolnym rogu)
2. Frontend wysyła `POST /functions/v1/chat-ai` z historią konwersacji
3. Funkcja analizuje wiadomość pod kątem słów kluczowych:
   - **Menu/polecasz/cena** → do promptu dołączane jest aktualne menu z bazy danych
   - **Rezerwacja/stolik** → funkcja może utworzyć rezerwację w tabeli `rezerwacje`
4. DeepSeek generuje odpowiedź – po polsku, w roli kelnera
5. Jeśli dotyczy rezerwacji – zwracane jest ID utworzonej rezerwacji

### Typy akcji czatu

| Akcja | Opis |
|-------|------|
| `order` | Zamówienie (przekierowanie do menu/koszyka) |
| `reservation` | Rezerwacja stolika |
| `menu_info` | Pytanie o menu, składniki, ceny |
| `general` | Ogólna rozmowa (godziny otwarcia, lokalizacja itp.) |

### Obsługiwane tematy

- Menu i polecenia dań (z rzeczywistą bazą danych)
- Składniki i ceny
- Rezerwacje stolików (data, godzina, liczba gości)
- Godziny otwarcia, adres restauracji
- Naturalna, swobodna rozmowa po polsku

---

## 💳 Płatności (Stripe)

- Edge Function `create-payment-intent` tworzy Payment Intent dla koszyka
- Frontend używa `@stripe/react-stripe-js` do bezpiecznego wprowadzenia danych karty
- Karta testowa: `4242 4242 4242 4242`, dowolna przyszła data, dowolny CVC
- Statusy płatności: `unpaid` → `paid` → `refunded`
- Automatyczne anulowanie nieopłaconych zamówień po 15 minutach (pg_cron)

---

## 🧪 Skrypty

```bash
npm run dev          # Uruchom serwer deweloperski (Vite)
npm run build        # Buduj wersję produkcyjną
npm run preview      # Podgląd zbudowanej wersji
npm run typecheck    # Sprawdź typy TypeScript (tsc --noEmit)
npm run lint         # ESLint całego kodu w src/
```

---

## 🌐 Wdrożenie na Vercel

1. Podłącz repozytorium do [Vercel](https://vercel.com) (Import Git Repository)
2. Ustawienia:

   | Ustawienie | Wartość |
   |---|---|
   | **Framework** | Vite |
   | **Build Command** | `npm run build` |
   | **Output Directory** | `dist` |

3. Dodaj zmienne środowiskowe: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`
4. Kliknij **Deploy**

---

## 📸 Screenshoty

*Do dodania – zrzuty ekranu głównych widoków: strona główna, menu, czat AI, panel rezerwacji admina.*

---

## 👤 Autor

**Krzysztof Zelman**

---

## 📄 Licencja

MIT
