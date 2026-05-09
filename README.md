# 🍽️ Restauracja – Zamów Online

Nowoczesna aplikacja webowa do składania zamówień w restauracji z systemem ról, płatnościami Stripe i dashboardami dla personelu. Zbudowana z **React 19 + TypeScript + Vite + Supabase**.

🌐 **Demo:** [restaurant-clean-omega.vercel.app](https://restaurant-clean-omega.vercel.app)

---

## Status projektu

Aplikacja została **w pełni zmigrowana na TypeScript** (100% plików `.ts`/`.tsx`), przeszła **pełny audyt kodu** i wszystkie **krytyczne błędy zostały naprawione**. Build produkcyjny i ESLint przechodzą bez błędów.

---

## Funkcje

### System autoryzacji
- Rejestracja i logowanie przez Supabase Auth (email + hasło)
- 4 role użytkowników: `user` (klient), `kitchen` (kuchnia), `admin`, `courier` (kurier)
- Chronione route'y – przekierowanie na `/login` dla niezalogowanych
- Route'y ograniczone rolami – przekierowanie na `/menu` przy braku uprawnień
- Reset hasła przez email (Supabase Auth) z dedykowaną stroną `/update-password`
- Publiczna strona główna (wizytówka) dla niezalogowanych

### Panel klienta
- Przeglądanie menu z podziałem na kategorie
- Dodawanie dań do koszyka (przechowywany w localStorage)
- Koszyk z podsumowaniem i możliwością edycji
- Składanie zamówienia z wyborem adresu i uwagami
- **Płatności kartą przez Stripe** (sandbox) po złożeniu zamówienia
- Historia zamówień ze statusami i możliwością płatności
- Powiadomienia **toast** po dodaniu do koszyka

### Panel kuchni
- Lista zamówień odświeżana co 10 sekund
- Zmiana statusów: Oczekujące → Potwierdzone → W przygotowaniu → Gotowe
- **Powiadomienia dźwiękowe** (Web Audio API) przy nowym zamówieniu
- **Browser push notifications** o nowych zamówieniach
- Czerwony badge z licznikiem nowych zamówień w navbarze
- Ukryty koszyk i przyciski "Dodaj do koszyka" (widoczne tylko dla roli `user`)

### Panel admina
- Zarządzanie menu: dodawanie, edycja, usuwanie dań, przełączanie dostępności
- Upload zdjęć do Supabase Storage (bucket `menu-images`)
- Zarządzanie zamówieniami: zmiana statusu, anulowanie, przełączanie płatności
- Zarządzanie użytkownikami: zmiana roli (user/kitchen/admin/courier)
- **Receptury**: modal z listą składników dla każdego dania, dodawanie i usuwanie
- Automatyczne anulowanie nieopłaconych zamówień (cron)

### Panel magazynu
- Zarządzanie składnikami: dodawanie, edycja, usuwanie
- Partie składników (batches) z datami ważności i kosztem jednostkowym
- Śledzenie stanu magazynowego (ilość, minimalny stan, jednostka)
- Powiązanie z recepturami dań

### Panel kuriera
- Lista zamówień gotowych do odbioru (`ready`, bez przypisanego kuriera)
- Aktywne dostawy (`in_transit`) z możliwością zmiany statusu na `delivered`
- **Historia dostaw** – zakończone zamówienia z przypisanym kurierem
- Automatyczne odświeżanie co 15 sekund

### Obsługa błędów i UX
- **ErrorBoundary** – łapanie błędów renderowania UI z przyciskiem resetu
- System **toast** (powiadomienia sukces/błąd/info)
- Responsywny interfejs (Bootstrap 5)
- Automatyczne przekierowanie do koszyka po zalogowaniu (jeśli użytkownik przyszedł z koszyka)

---

## Wymagania

- **Node.js 18+**
- **Konto Supabase** (darmowe: https://supabase.com)
- **Konto Stripe** (darmowe sandbox: https://stripe.com) – opcjonalnie dla płatności

---

## Konfiguracja Supabase

### 1. Utwórz projekt
1. Załóż konto na [supabase.com](https://supabase.com)
2. Kliknij **New project** i podaj nazwę (np. `restaurant-clean`)
3. Zapisz hasło do bazy danych – będzie potrzebne później
4. Poczekaj na zakończenie inicjalizacji (ok. 2 min)

### 2. Wykonaj schema SQL
1. Otwórz plik `supabase-schema.sql` z repozytorium
2. W Supabase Dashboard przejdź do **SQL Editor**
3. Wklej całą zawartość i kliknij **Run**
4. Schema utworzy: tabele (`profiles`, `menu_items`, `orders`, `order_items`, `ingredients`, `ingredient_batches`, `menu_item_ingredients`), RLS policies, funkcję `cancel_unpaid_orders()` i trigger automatycznego tworzenia profilu

### 3. Skopiuj klucze API
1. W Supabase Dashboard przejdź do **Project Settings → API**
2. Skopiuj:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

### 4. RLS (Row Level Security)
Wszystkie polityki RLS są zdefiniowane w `supabase-schema.sql` i zostaną automatycznie utworzone po wykonaniu skryptu. Obejmują one:
- Użytkownik widzi tylko swoje zamówienia i pozycje
- Kuchnia/admin widzi wszystkie zamówienia i pozycje
- Kurier widzi zamówienia gotowe do odbioru (`ready`, bez kuriera), swoje aktywne dostawy (`in_transit`) i historię (`delivered`)
- Admin może zarządzać menu i użytkownikami
- Magazyn jest dostępny dla adminów

### 5. Storage (zdjęcia menu)
Aby działał upload zdjęć w panelu admina:
1. W Supabase Dashboard przejdź do **Storage**
2. Utwórz bucket o nazwie `menu-images`
3. Ustaw **Public bucket** (lub skonfiguruj własne RLS dla storage)
4. W **Policies** dodaj politykę zezwalającą na INSERT/UPDATE dla uwierzytelnionych użytkowników z rolą `admin`

---

## Konfiguracja Stripe

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

### 4. Wgraj Edge Function do Supabase
```bash
# Zainstaluj Supabase CLI, jeśli nie masz
npm i -g supabase

# Zaloguj się
supabase login

# Wgraj funkcję
cd supabase/functions/create-payment-intent
supabase functions deploy create-payment-intent
```

### 5. Dodaj klucz sekretny w Supabase
W Supabase Dashboard przejdź do **Edge Functions → Secrets** i dodaj:
```
STRIPE_SECRET_KEY=sk_test_...
```

### 6. Karta testowa
Do testowania płatności użyj karty sandboxowej:

| Pole        | Wartość              |
|-------------|----------------------|
| Numer karty | `4242 4242 4242 4242` |
| Data        | dowolna przyszła     |
| CVC         | dowolne 3 cyfry      |

Pełna lista kart testowych: https://docs.stripe.com/testing

---

## Konta testowe

Po rejestracji przez formularz domyślnie konto ma rolę `user`. Aby nadać inne role, wykonaj odpowiednie zapytania SQL w Supabase SQL Editor.

### Rejestracja kont
Zarejestruj cztery konta przez formularz rejestracji:

| Rola          | Email                    | Hasło       |
|---------------|--------------------------|-------------|
| Administrator | admin@restauracja.pl     | admin123    |
| Kuchnia       | kitchen@restauracja.pl   | kitchen123  |
| Kurier        | kurier@restauracja.pl    | kurier123   |
| Klient        | jan@example.com          | user123     |

### Nadanie ról (SQL)
```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@restauracja.pl';
UPDATE public.profiles SET role = 'kitchen' WHERE email = 'kitchen@restauracja.pl';
UPDATE public.profiles SET role = 'courier' WHERE email = 'kurier@restauracja.pl';
```

Po odświeżeniu strony w navbarze pojawią się odpowiednie zakładki.

---

## Instalacja i uruchomienie lokalne

### 1. Sklonuj repozytorium
```bash
git clone https://github.com/krzysztofzelman/restaurant-clean.git
cd restaurant-clean
```

### 2. Zainstaluj zależności
```bash
npm install
```

### 3. Skonfiguruj zmienne środowiskowe
```bash
cp .env.example .env
```
Edytuj `.env` i wstaw swoje klucze Supabase i Stripe:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...  # opcjonalnie
```

### 4. Uruchom aplikację
```bash
npm run dev
```

Aplikacja będzie dostępna pod adresem **http://localhost:3000**.

### Dodatkowe polecenia
```bash
npm run build      # build produkcyjny do dist/
npm run preview    # podgląd builda
npm run typecheck  # sprawdzenie typów TypeScript
npm run lint       # ESLint
```

---

## Struktura projektu

```
restaurant-clean/
├── index.html                   # Entry point HTML
├── package.json                 # Zależności i skrypty
├── tsconfig.json                # Konfiguracja TypeScript
├── vite.config.ts               # Konfiguracja Vite
├── .env.example                 # Szablon zmiennych środowiskowych
├── supabase-schema.sql          # Pełny schemat bazy + RLS + cron
├── supabase/
│   └── functions/
│       └── create-payment-intent/
│           └── index.ts         # Edge Function Stripe
└── src/
    ├── main.tsx                 # Entry point React
    ├── App.tsx                  # Routing + provider hierarchy
    ├── index.css                # Style globalne
    ├── vite-env.d.ts            # Typy dla Vite env
    ├── lib/
    │   ├── supabaseClient.ts    # Klient Supabase
    │   └── database.types.ts    # Typy TypeScript dla bazy
    ├── context/
    │   ├── AuthContext.tsx       # Kontekst autoryzacji
    │   └── ToastContext.tsx      # System powiadomień toast
    ├── hooks/
    │   ├── useCart.tsx          # Hook koszyka (localStorage)
    │   └── useKitchenNotifications.ts  # Polling + powiadomienia
    ├── services/
    │   └── api.ts               # Warstwa API (Supabase queries)
    ├── components/
    │   ├── Navbar.tsx           # Nawigacja zależna od roli
    │   ├── CartWidget.tsx       # Widget koszyka (tylko user)
    │   ├── MenuCard.tsx         # Karta dania w menu
    │   ├── StripePayment.tsx    # Formularz płatności Stripe
    │   └── ErrorBoundary.tsx    # Łapanie błędów UI
    └── pages/
        ├── HomePage.tsx         # Strona główna (wizytówka)
        ├── LoginPage.tsx        # Logowanie z kontami testowymi
        ├── RegisterPage.tsx     # Rejestracja
        ├── ResetPasswordPage.tsx    # Formularz resetu hasła
        ├── UpdatePasswordPage.tsx   # Ustawienie nowego hasła
        ├── MenuPage.tsx         # Menu z kategoriami
        ├── CartPage.tsx         # Koszyk + płatność
        ├── OrdersPage.tsx       # Historia zamówień klienta
        ├── KitchenPage.tsx      # Panel kuchni
        ├── StaffDashboard.tsx   # Dashboard personelu
        ├── CourierPage.tsx      # Panel kuriera
        ├── WarehousePage.tsx    # Panel magazynu
        └── AdminPage.tsx        # Panel admina
```

---

## Technologie

| Technologia          | Wersja   | Zastosowanie                     |
|----------------------|----------|----------------------------------|
| **React**            | 19       | Framework UI                     |
| **TypeScript**       | 6        | Typowanie                        |
| **Vite**             | 6        | Bundler / dev server             |
| **React Router**     | 7        | Routing                          |
| **Supabase**         | 2        | Auth, baza danych PostgreSQL, RLS, Storage |
| **Bootstrap**        | 5        | CSS framework (npm)              |
| **Stripe**           | 9 / 6    | Płatności kartą (sandbox)        |
| **ESLint**           | 10       | Linter                            |
| **Prettier**         | 3        | Formatowanie kodu                 |

---

## Wdrożenie na Vercel

1. **Zainstaluj CLI Vercel** (opcjonalnie):
   ```bash
   npm i -g vercel
   ```

2. **Połącz repozytorium** z Vercel (dashboard → Add New → Project → Import Git Repository)

3. **Podczas konfiguracji**:
   | Ustawienie          | Wartość            |
   |---------------------|--------------------|
   | **Framework**       | Vite               |
   | **Root Directory**  | `./`               |
   | **Build Command**   | `npm run build`    |
   | **Output Directory**| `dist`             |

4. **Dodaj zmienne środowiskowe** w dashboardzie Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_STRIPE_PUBLISHABLE_KEY`

5. Kliknij **Deploy** – gotowe!

---

## Automatyczne anulowanie zamówień (pg_cron)

W pliku `supabase-schema.sql` znajduje się funkcja `cancel_unpaid_orders()` anulująca nieopłacone zamówienia starsze niż 15 minut.

Aby uruchamiać ją automatycznie:

1. **Włącz rozszerzenie pg_cron** w Supabase Dashboard → Database → Extensions → wyszukaj `pg_cron` → Enable
2. **Odkomentuj** linię w `supabase-schema.sql`:
   ```sql
   SELECT cron.schedule('cancel-unpaid-orders', '* * * * *', 'SELECT public.cancel_unpaid_orders();');
   ```
3. **Wykonaj** to zapytanie w SQL Editor (lub odkomentuj i uruchom cały schema od nowa)

Funkcja uruchamia się co minutę i anuluje zamówienia ze statusem `pending` i `payment_status = 'unpaid'` starsze niż 15 minut (ustawione przez `interval '15 minutes'`).

---

## Ostatnie zmiany

### Commit `103e84a` – fix: critical bugs after audit

Pełny audyt aplikacji wykrył ~50 błędów. Poniżej najważniejsze poprawki:

| Kategoria | Zmiana |
|-----------|--------|
| **Krytyczny** | `index.html`: naprawiono entry point z `main.jsx` → `main.tsx` |
| **Krytyczny** | `.env.txt` skopiowany → `.env` (Vite wymaga `.env`), dodany do `.gitignore` |
| **Krytyczny** | `ProtectedRoute` – null profile nie pomija już checka ról (security) |
| **Krytyczny** | `OrdersPage` – nieskończony spinner dla niezalogowanego naprawiony |
| **Krytyczny** | `api.ts` – FK join syntax `:` → `!` (zgodność z Supabase v2) |
| **Krytyczny** | `supabase-schema.sql` – RLS kuriera: historia (`delivered`) i `order_items` dla `ready` |
| **Admin** | NaN price guard, double-submit guard, pojedynczy upload zdjęcia |
| **Admin** | Payment toggle nie dotyka `refunded`, duplicate ingredient guard |
| **Warehouse** | Batch qty > 0, min_stock ≥ 0, mocniejsze ostrzeżenie przy usuwaniu |
| **Auth** | `LoginPage` – usunięto redundantny `getUserProfile` (race condition z AuthContext) |
| **Auth** | `RegisterPage`, `UpdatePasswordPage` – `setTimeout` z cleanup na unmount |
| **Auth** | `UpdatePasswordPage` – akceptuje tylko `PASSWORD_RECOVERY`, nie byle jaki session |
| **UX** | CDN Bootstrap usunięty (wersja npm wystarcza) |
| **UX** | `useKitchenNotifications` – akumulacja delty zamiast nadpisywania |

---

## Licencja

MIT
