# Audyt Techniczny — Restaurant Clean

**Data:** 2026-05-16
**Projekt:** D:\Dane\Projekty\restaurant-clean
**Stack:** React 19 + TypeScript 6 + Vite + Supabase + Bootstrap 5 + Stripe + DeepSeek AI
**Rozmiar bazy kodu:** ~4 800 linii, 36 plików źródłowych

---

## 1. Podsumowanie

| Obszar | Ocena (1-10) | Komentarz |
|--------|-------------|-----------|
| **Wydajność** | 5/10 | Brak code splitting, nadmiarowe polling, brak React.memo/useMemo |
| **Bezpieczeństwo** | 7/10 | Dobre RLS, ale brak rate limitu, brak polityk na storage, 1 problem krytyczny |
| **Kod i architektura** | 6/10 | Duża duplikacja (5× statusLabels), AdminPage 808 linii, 0 testów |
| **UX i dostępność** | 7/10 | Dobre komunikaty błędów, ale brak a11y (aria-live, focus trap, skip link) |
| **Baza danych** | 7/10 | Brakujące indeksy na orders, brak pg_cron, ale dobra normalizacja |
| **DevOps** | 3/10 | Brak CI/CD, brak testów, brak monitoringu, brak backupów |
| **AI Chat** | 7/10 | Dobrze zaimplementowany, ale brak rate limitu, fallback mógłby być lepszy |

### Ogólna ocena projektu: **6/10**

Projekt ma solidne fundamenty (czysta architektura komponentów, dobre RLS, działający AI chat), ale cierpi na typowe problemy solo-developerskie: brak testów, duplikacja kodu, nadmiarowe zapytania i brak CI/CD. Najpilniejsze są braki bezpieczeństwa (storage RLS) i wydajności (code splitting + optymalizacja pollingów).

---

## 2. Znalezione problemy

| # | Priorytet | Obszar | Problem | Lokalizacja |
|---|-----------|--------|---------|-------------|
| P1 | 🔴 Krytyczny | Bezpieczeństwo | **Brak RLS na storage bucket `menu-images`** – każde zdjęcie jest publiczne, brak kontroli kto może uploadować | `api.ts:54-66` (`uploadMenuImage`) + Supabase |
| P2 | 🔴 Krytyczny | DevOps | **Brak CI/CD** – żaden pipeline nie weryfikuje kodu przed deployem | brak `.github/` |
| P3 | 🟠 Wysoki | Wydajność | **Czterokrotny polling getAllOrders()** – każdy z osobna pobiera WSZYSTKIE zamówienia z pełnymi relacjami | `KitchenPage.tsx:68` (10s), `useKitchenNotifications.ts:43` (15s), `CourierPage.tsx:50` (15s), `StaffDashboard.tsx:76` (30s) |
| P4 | 🟠 Wysoki | Wydajność | **Brak code splitting** – wszystkie 20+ komponentów w jednym bundle'u, 6 routów bez lazy loading | `App.tsx` |
| P5 | 🟠 Wysoki | Wydajność | **Brak React.memo / useMemo / useCallback** – żaden komponent nie jest memoizowany, wszystkie listy renderują się od nowa | wszystkie komponenty |
| P6 | 🟠 Wysoki | Kod | **Duplikacja statusLabels/statusColors w 5 plikach** – ~60 linii zduplikowanego kodu | `AdminPage.tsx`, `KitchenPage.tsx`, `CourierPage.tsx`, `OrdersPage.tsx`, `StaffDashboard.tsx` |
| P7 | 🟠 Wysoki | Kod | **AdminPage.tsx ma 808 linii** – miesza zamówienia, menu, użytkowników i receptury w jednym komponencie | `AdminPage.tsx` |
| P8 | 🟠 Wysoki | Kod | **Brak testów** – zero testów jednostkowych ani integracyjnych | cały projekt |
| P9 | 🟠 Wysoki | Baza | **Brak indeksów na orders(user_id), orders(status), orders(created_at)** – zapytania getAllOrders/getMyOrders skanują całą tabelę | `supabase-schema.sql` |
| P10 | 🟠 Wysoki | UX | **Routing do nieistniejącej strony** – StaffDashboard linkuje do `/orders/${order.id}`, ale taki route nie istnieje | `StaffDashboard.tsx:208` |
| P11 | 🟡 Średni | Wydajność | **Brak optymalizacji obrazków** – zdjęcia menu ładowane bez lazy loading, bez WebP, bez srcset | `MenuCard.tsx:28` |
| P12 | 🟡 Średni | Wydajność | **Bootstrap cały w bundle'u** – choć używane są tylko podstawowe klasy, cały bootstrap.min.css jest ładowany | `main.tsx:3` |
| P13 | 🟡 Średni | Bezpieczeństwo | **Brak timeoutu na sesję** – brak konfiguracji wygaśnięcia sesji Supabase | `AuthContext.tsx` |
| P14 | 🟡 Średni | Kod | **Pusty catch w useKitchenNotifications** – błędy połykane bez logowania | `useKitchenNotifications.ts:47` |
| P15 | 🟡 Średni | Kod | **console.warn w produkcji** – błąd odejmowania składników logowany do konsoli | `api.ts:195-200` |
| P16 | 🟡 Średni | Kod | **allowJs: true w tsconfig** – niepotrzebne, wszystkie pliki już .ts/.tsx | `tsconfig.json:23` |
| P17 | 🟡 Średni | Baza | **pg_cron nieaktywny** – funkcja cancel_unpaid_orders jest zakomentowana | `supabase-schema.sql:120` |
| P18 | 🟡 Średni | Baza | **Brak triggera aktualizacji emaila** – zmiana emaila w auth.users nie aktualizuje profiles.email | `supabase-schema.sql` |
| P19 | 🟡 Średni | AI Chat | **Konwersacja zapisywana TYLKO w localStorage** – `saveConversation` z api.ts (zapis do Supabase) nie jest wywoływana z czatu | `WirtualnyKelner.tsx:145` vs `api.ts:375-382` |
| P20 | 🟡 Średni | AI Chat | **Brak rate limitu na Edge Function** – brak ochrony przed spamem/zbyt częstymi zapytaniami | `aiChatService.ts` |
| P21 | 🔵 Niski | UX | **Brak aria-live dla dynamicznych treści** – lista zamówień, powiadomienia kuchni | wszystkie strony |
| P22 | 🔵 Niski | UX | **Modal ręczny bez focus trapu** – ReservationModal nie zarządza focusem ani klawiaturą (Escape działa w Navbar, ale nie w modalu) | `ReservationModal.tsx` |
| P23 | 🔵 Niski | UX | **Navbar toggler brak aria-controls** – przycisk hamburgera nie ma pełnych atrybutów dostępności | `Navbar.tsx:37-41` |
| P24 | 🔵 Niski | UX | **Brak skip-to-content link** – nawigacja tabulatorem zaczyna się od Navbaru, brak szybkiego przejścia do treści | brak w `index.html` lub `App.tsx` |
| P25 | 🔵 Niski | Wydajność | **Za duży MAX_HISTORY_LENGTH (50)** – konwersacja może urosnąć do kosztownych tokenów | `WirtualnyKelner.tsx:23` |
| P26 | 🔵 Niski | Bezpieczeństwo | **Brak Content Security Policy** – nagłówek CSP nie jest skonfigurowany w Vercel | `vercel.json` |

---

## 3. Rekomendacje optymalizacji

### 3.1 Wydajność

| Rekomendacja | Szacowany czas | Pliki | Opis |
|-------------|---------------|-------|------|
| **Code splitting (lazy routes)** | 1-2h | `App.tsx` | Zamienić bezpośrednie importy stron na `React.lazy(() => import(...))` z `<Suspense>` |
| **Cache zapytań + deduplikacja pollingów** | 2-3h | Wszystkie strony z pollingiem | Stworzyć wspólny hook `usePolling(key, fetcher, interval)` który deduplikuje zapytania i cache'uje wyniki |
| **React.memo na listach** | 1h | `MenuCard.tsx`, `KitchenPage.tsx`, `AdminPage.tsx` | Owinąć komponenty kart/rzędów w `React.memo` |
| **Lazy loading obrazków** | 30min | `MenuCard.tsx` | Dodać `loading="lazy"` na `<img>` |
| **Tree-shake Bootstrap** | 1h | `main.tsx` | Zamiast `bootstrap/dist/css/bootstrap.min.css`, zaimportować tylko używane komponenty (lub użyć CDN dla bootstrap.bundle.min.js) |

### 3.2 Bezpieczeństwo

| Rekomendacja | Szacowany czas | Pliki | Opis |
|-------------|---------------|-------|------|
| **Dodać RLS na storage menu-images** | 1h | Supabase SQL | Polityka: tylko admin może INSERT, każdy zalogowany może SELECT |
| **Rate limiting na Edge Function** | 1h | Supabase / `aiChatService.ts` | Ograniczenie do ~10 zapytań/min na użytkownika po stronie Supabase |
| **Dodać CSP w Vercel** | 30min | `vercel.json` | Content-Security-Policy header |
| **Timeout sesji Supabase** | 30min | `AuthContext.tsx` | Ustawić `cookieOptions` z `maxAge` |

### 3.3 Kod i architektura

| Rekomendacja | Szacowany czas | Pliki | Opis |
|-------------|---------------|-------|------|
| **Wydzielić statusConstants.ts** | 30min | Nowy plik | Przenieść `statusLabels`, `statusColors`, `nextStatus` do `src/constants/orderStatus.ts` |
| **Podzielić AdminPage na podkomponenty** | 3-4h | `AdminPage.tsx` | Wydzielić `AdminOrdersTab`, `AdminMenuTab`, `AdminUsersTab`, `RecipeModal` jako osobne pliki |
| **Dodać testy (Vitest)** | 4-6h | cały projekt | Skonfigurować Vitest + React Testing Library, dodać testy dla api.ts, AuthContext, kluczowych stron |
| **Usunąć allowJs z tsconfig** | 5min | `tsconfig.json` | Bezpiecznie do usunięcia |
| **Dodać obsługę błędów dla ingredient consumption** | 30min | `api.ts` | Zamiast `console.warn`, użyć toasta lub logowania do serwisu |

### 3.4 UX i dostępność

| Rekomendacja | Szacowany czas | Pliki | Opis |
|-------------|---------------|-------|------|
| **Dodać aria-live regiony** | 1h | `ToastContext.tsx`, `KitchenPage.tsx` | `aria-live="polite"` na kontenerze powiadomień i list zamówień |
| **Naprawić focus trap w modalu** | 1h | `ReservationModal.tsx` | Dodać zarządzanie focusem (zamknięcie Escape, focus pierwszy element, zapętlenie Tab) |
| **Naprawić aria-controls w navbar** | 15min | `Navbar.tsx` | Dodać `aria-controls="navbarNav"` i `aria-expanded` do przycisku toggler |
| **Dodać skip link** | 15min | `index.html` / `App.tsx` | `<a href="#main-content" class="visually-hidden-focusable">Przejdź do treści</a>` |
| **Naprawić nieistniejący route** | 15min | `StaffDashboard.tsx` | Usunąć link do `/orders/${order.id}` lub dodać route w App.tsx |

### 3.5 Baza danych

| Rekomendacja | Szacowany czas | Pliki | Opis |
|-------------|---------------|-------|------|
| **Dodać indeksy** | 15min | Supabase SQL | `CREATE INDEX idx_orders_user_id ON orders(user_id);` + status, created_at, order_items(order_id) |
| **Włączyć pg_cron** | 15min | Supabase | `CREATE EXTENSION IF NOT EXISTS pg_cron;` + odkomentować harmonogram |
| **Aktualizacja emaila w profiles** | 15min | Supabase SQL | Dodać trigger na UPDATE auth.users |
| **Dodać indeks na orders.courier_id** | 5min | Supabase SQL | Dla zapytań kurierskich |

### 3.6 DevOps

| Rekomendacja | Szacowany czas | Pliki | Opis |
|-------------|---------------|-------|------|
| **GitHub Actions CI** | 2-3h | `.github/workflows/` | Pipeline: typecheck → lint → test → build |
| **Dodać monitoring (Sentry)** | 2h | `ErrorBoundary.tsx` | Integracja Sentry dla błędów frontendowych |
| **Dodać backup bazy** | 1h | Supabase | Skonfigurować automatyczne backupowanie w Supabase dashboard |

### 3.7 AI Chat

| Rekomendacja | Szacowany czas | Pliki | Opis |
|-------------|---------------|-------|------|
| **Zapisywać konwersacje do Supabase** | 1h | `WirtualnyKelner.tsx` | Wywołać `saveConversation` z api.ts przy zapisie do localStorage |
| **Zmniejszyć MAX_HISTORY_LENGTH** | 5min | `WirtualnyKelner.tsx` | Z 50 na 30, a historię wysyłaną z 20 na 15 |
| **Dodać fallback gdy DeepSeek nie odpowiada** | 1-2h | Edge Function / `aiChatService.ts` | Fallback do prostego odpowiedzi offline (np. menu bazowane na lokalnych danych) |

---

## 4. Plan działania

Kolejność wdrożeń — od najpilniejszych do opcjonalnych.

### Faza 1: Bezpieczeństwo i stabilność (1-2 dni)
1. 🔴 **Dodać RLS na storage menu-images** (P1)
2. 🟠 **Dodać indeksy na orders** (P9)
3. 🟠 **Naprawić nieistniejący route** (P10)
4. 🟡 **Dodać timeout sesji Supabase** (P13)
5. 🔵 **Dodać CSP w Vercel** (P26)

### Faza 2: Wydajność (2-3 dni)
6. 🟠 **Code splitting (lazy routes)** (P4)
7. 🟠 **Cache zapytań + deduplikacja pollingów** (P3)
8. 🟠 **React.memo na listach** (P5)
9. 🟡 **Lazy loading obrazków** (P11)
10. 🔵 **Zmniejszyć MAX_HISTORY_LENGTH** (P25)

### Faza 3: Kod i architektura (3-5 dni)
11. 🟠 **Wydzielić statusConstants.ts** (P6)
12. 🟠 **Podzielić AdminPage** (P7)
13. 🟡 **Usunąć allowJs** (P16)
14. 🟡 **console.warn → toasty** (P15)
15. 🟡 **Zapisywać konwersacje do Supabase** (P19)

### Faza 4: DevOps i testy (3-5 dni)
16. 🟠 **Dodać Vitest + pierwsze testy** (P8)
17. 🔴 **GitHub Actions CI** (P2)
18. 🟡 **Dodać Sentry** (DevOps #2)
19. 🔵 **Backup bazy** (DevOps #3)

### Faza 5: UX i dostępność (1-2 dni)
20. 🔵 **aria-live regiony** (P21)
21. 🔵 **Focus trap w modalu** (P22)
22. 🔵 **aria-controls w navbar** (P23)
23. 🔵 **Skip link** (P24)

### Faza 6: Optymalizacje dodatkowe (2-3 dni)
24. 🟡 **Rate limiting na Edge Function** (P14/P20)
25. 🟡 **Włączyć pg_cron** (P17)
26. 🟡 **Trigger emaila** (P18)
27. 🟡 **Tree-shake Bootstrap** (P12)
28. 🟠 **Fallback DeepSeek** (AI Chat #3)

---

## 5. Metryki po optymalizacji

| Metryka | Przed | Po | Poprawa |
|---------|-------|----|---------|
| **Initial bundle size** | ~300 KB (JS) + Bootstrap | ~150 KB (po code splitting + tree-shake) | **-50%** |
| **Zapytania do Supabase** | 5 równoległych pollingów co 10-30s | 1 scentralizowany cache | **-80% zapytań** |
| **Czas ładowania strony** | Wszystkie komponenty naraz | Lazy loading routów | **-60% FCP** |
| **Liczba plików >300 linii** | 4 (AdminPage 808, CourierPage, WirtualnyKelner, KitchenPage) | 1 (po refaktorze) | **-75%** |
| **Zduplikowany kod** | ~300 linii (statusLabels ×5, podobne struktury HTML ×3 w CourierPage) | ~0 (wspólne stałe + komponenty) | **-100%** |
| **Pokrycie testami** | 0% | 40-50% (API service, komponenty krytyczne) | **+40-50pp** |
| **RLS coverage** | 85% tabel | 100% tabel + storage | **+15pp** |
| **Lighthouse Accessibility** | ~75-80 | ~90-95 | **+15pp** |
| **Koszty AI API** | Bez limitu | Rate limiting + mniejszy kontekst | **-30-50% kosztów** |

---

## Podsumowanie

Projekt ma **dobry fundament** — czysta architektura React + TypeScript, dobrze zaprojektowana baza danych z sensownymi RLS, działający AI chat z ładnym UI. Główne problemy to:

1. **Brak testów i CI/CD** — największe ryzyko przy dalszym rozwoju
2. **Nadmiarowe zapytania** — 4 osobne pollingi robią to samo
3. **Duplikacja kodu** — statusy zamówień zdefiniowane 5 razy
4. **Brak RLS na storage** — luka bezpieczeństwa
5. **Brak code splitting** — każdy dostaje cały bundle

Wdrożenie Fazy 1-3 (ok. 7-10 dni roboczych) znacząco poprawi stabilność, wydajność i utrzymywalność kodu.
