# 🍽️ Restauracja – Zamów Online

Aplikacja webowa do składania zamówień w restauracji. Zbudowana z React + Vite + Supabase.

## Funkcje

- **Logowanie/rejestracja** – Supabase Auth z rolami: `user`, `kitchen`, `admin`
- **Panel klienta** – przeglądanie menu z kategoriami, koszyk (localStorage), składanie zamówień
- **Panel kuchni** – lista zamówień odświeżana co 10s, zmiana statusów
- **Panel admina** – zarządzanie menu, zamówieniami i użytkownikami
- **Automatyczne anulowanie** – nieopłacone zamówienia anulowane po 15 minutach (cron w Supabase)

## Wymagania

- Node.js 18+
- Konto Supabase (darmowe: https://supabase.com)

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
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── lib/
    │   └── supabaseClient.js
    ├── context/
    │   └── AuthContext.jsx
    ├── hooks/
    │   └── useCart.js
    ├── services/
    │   └── api.js
    ├── components/
    │   ├── Navbar.jsx
    │   ├── CartWidget.jsx
    │   └── MenuCard.jsx
    └── pages/
        ├── LoginPage.jsx
        ├── RegisterPage.jsx
        ├── MenuPage.jsx
        ├── CartPage.jsx
        ├── OrdersPage.jsx
        ├── KitchenPage.jsx
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
