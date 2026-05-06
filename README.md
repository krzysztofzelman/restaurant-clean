# 🍽️ Restauracja – Zamów Online

Aplikacja webowa do składania zamówień w restauracji. Zbudowana z React + Vite + Supabase.

## Funkcje

- **Logowanie/rejestracja** – Supabase Auth z rolami: `user`, `kitchen`, `admin`
- **Panel klienta** – przeglądanie menu z kategoriami, koszyk (localStorage), składanie zamówień
- **Panel kuchni** – lista zamówień odświeżana co 10s, zmiana statusów; ukryty koszyk i przyciski "Dodaj do koszyka"
- **Panel admina** – zarządzanie menu, zamówieniami i użytkownikami
- **Strona główna (wizytówka)** – hero section, o nas, opinie, stopka
- **Płatności Stripe (sandbox)** – formularz karty po złożeniu zamówienia, integracja przez Supabase Edge Functions, status 'Opłacone'/'Nieopłacone'
- **Automatyczne anulowanie** – nieopłacone zamówienia anulowane po 15 minutach (cron w Supabase)
- **Panel kuriera** – rola `courier`, lista zamówień gotowych do odbioru i aktywnych dostaw, statusy dostawy (pending → assigned → in_delivery → delivered), odświeżanie co 15s
- **Historia zamówień kuriera** – zakładka "Historia" w panelu kuriera z zamówieniami dostarczonymi przez zalogowanego kuriera
- **Reset hasła** – formularz email na `/reset-password`, link resetujący przez Supabase Auth, strona ustawienia nowego hasła na `/update-password`
- **Receptury** – powiązanie dań ze składnikami w panelu admina, modal z listą składników, dodawanie i usuwanie pozycji receptury
- **Powiadomienia kuchni** – dźwięk (Web Audio API) przy nowym zamówieniu, browser push notifications, czerwony badge z licznikiem przy linku Kuchnia

## Wymagania

- Node.js 18+
- Konto Supabase (darmowe: https://supabase.com)

## Płatności Stripe

Integracja płatności kartą przez Stripe w trybie sandbox (testowym).

### 1. Załóż konto Stripe

Wejdź na [stripe.com](https://stripe.com) i zarejestruj się (darmowe konto sandbox).

### 2. Pobierz klucze API

W dashboardzie Stripe przejdź do **Developers → API keys** i skopiuj:

- **Publishable key** – zaczyna się od `pk_test_...`
- **Secret key** – zaczyna się od `sk_test_...`

### 3. Dodaj klucz publiczny do `.env`

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 4. Wgraj Edge Function

```bash
supabase functions deploy create-payment-intent
```

### 5. Dodaj klucz sekretny w Supabase

W Supabase Dashboard przejdź do **Edge Functions → Secrets** i dodaj:

```
STRIPE_SECRET_KEY=sk_test_...
```

### 6. Karta testowa

Do testowania użyj karty:

| Pole        | Wartość              |
|-------------|----------------------|
| Numer karty | `4242 4242 4242 4242` |
| Data        | dowolna przyszła     |
| CVC         | dowolne 3 cyfry      |

Pełna lista kart testowych: https://docs.stripe.com/testing

## Konta testowe

Proponowane konta do rejestracji przez formularz:

| Rola          | Email                    | Hasło (przykładowe) |
|---------------|--------------------------|---------------------|
| Administrator | admin@restauracja.pl     | admin123            |
| Kuchnia       | kitchen@restauracja.pl   | kitchen123          |
| Kurier        | kurier@restauracja.pl    | kurier123           |
| Klient        | jan@example.com          | user123             |

Po rejestracji admina wykonaj w Supabase SQL Editor:

```sql
UPDATE public.profiles SET role = 'admin'
WHERE email = 'admin@restauracja.pl';
```

Dla konta kuchni:

```sql
UPDATE public.profiles SET role = 'kitchen'
WHERE email = 'kitchen@restauracja.pl';
```

Dla konta kuriera:

```sql
UPDATE public.profiles SET role = 'courier'
WHERE email = 'kurier@restauracja.pl';
```

## Instalacja i uruchomienie lokalne

### 1. Sklonuj repozytorium

```bash
cd restaurant-clean
```

### 2. Zainstaluj zależności

```bash
npm install
```

### 3. Skonfiguruj Supabase

1. Załóż konto na [supabase.com](https://supabase.com) i utwórz nowy projekt
2. W SQL Editor projektu wklej całą zawartość pliku `supabase-schema.sql` i uruchom
3. Przejdź do **Project Settings → API** i skopiuj:
   - `Project URL` → to będzie `VITE_SUPABASE_URL`
   - `anon public key` → to będzie `VITE_SUPABASE_ANON_KEY`

### 4. Skonfiguruj zmienne środowiskowe

```bash
cp .env.example .env
```

Edytuj `.env` i wstaw swoje klucze:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Uruchom aplikację

```bash
npm run dev
```

Aplikacja będzie dostępna pod adresem `http://localhost:3000`.

### 6. Dodaj pierwszego admina

Po rejestracji pierwszego użytkownika, w SQL Editor Supabase wykonaj:

```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'twoj-email@example.com';
```

Odśwież stronę – pojawi się zakładka Admin.

## Struktura projektu

```
restaurant-clean/
├── index.html
├── package.json
├── vite.config.js
├── .env.example
├── supabase-schema.sql
├── supabase/
│   └── functions/
│       └── create-payment-intent/
│           └── index.ts
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── lib/
    │   └── supabaseClient.js
    ├── context/
    │   └── AuthContext.jsx
    ├── hooks/
    │   ├── useCart.js
    │   └── useKitchenNotifications.js
    ├── services/
    │   └── api.js
    ├── components/
    │   ├── Navbar.jsx
    │   ├── CartWidget.jsx
    │   ├── MenuCard.jsx
    │   └── StripePayment.jsx
    └── pages/
        ├── HomePage.jsx
        ├── LoginPage.jsx
        ├── RegisterPage.jsx
        ├── ResetPasswordPage.jsx
        ├── UpdatePasswordPage.jsx
        ├── MenuPage.jsx
        ├── CartPage.jsx
        ├── OrdersPage.jsx
        ├── KitchenPage.jsx
        ├── CourierPage.jsx
        ├── WarehousePage.jsx
        └── AdminPage.jsx
```

## Wdrożenie na Vercel

1. Zainstaluj CLI Vercel: `npm i -g vercel`
2. W katalogu projektu uruchom: `vercel`
3. Podczas konfiguracji:
   - Framework: **Vite**
   - Root directory: `./`
   - Build command: `npm run build`
   - Output directory: `dist`
4. Dodaj zmienne środowiskowe w dashboardzie Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy gotowy!

## Automatyczne anulowanie zamówień (cron)

W pliku `supabase-schema.sql` znajduje się funkcja `cancel_unpaid_orders()`. Aby ją uruchamiać automatycznie:

1. Włącz rozszerzenie **pg_cron** w Supabase Dashboard → Database → Extensions
2. Odkomentuj linię w SQL:
   ```sql
   SELECT cron.schedule('cancel-unpaid-orders', '* * * * *', 'SELECT public.cancel_unpaid_orders();');
   ```
3. Uruchom to zapytanie w SQL Editor

## Technologie

- **React 19** + **Vite 6**
- **React Router v7**
- **Supabase** (Auth + PostgreSQL + RLS)
- **Bootstrap 5** (CDN)
- **JavaScript** (brak TypeScript)
