# 🍽️ Restauracja – Wirtualny Kelner AI

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![.NET](https://img.shields.io/badge/.NET-10-512BD4?logo=dotnet)](https://dotnet.microsoft.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://docs.docker.com/compose/)
[![Hangfire](https://img.shields.io/badge/Hangfire-PostgreSQL-FF6600)](https://www.hangfire.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Nowoczesna aplikacja webowa dla restauracji, wyposażona w **Wirtualnego Kelnera AI** – czatbota opartego na DeepSeek, który zna prawdziwe menu, przyjmuje zamówienia i rezerwacje.

Aplikacja działa w modelu **self-hosted** na własnym VPS: **.NET 10** + PostgreSQL zamiast zewnętrznych usług (Supabase). Pełna kontrola nad danymi i infrastrukturą.

> **🌐 Produkcja:** [https://restauracja.kzelman.pl](https://restauracja.kzelman.pl) — SSL (Let's Encrypt), Nginx reverse proxy, 3 kontenery Docker

---

## ✨ Funkcjonalności

| Funkcja | Opis |
|---------|------|
| 🤖 **Wirtualny Kelner AI** | Czat z modelem DeepSeek – mówi po polsku, zna menu, doradza dania, przyjmuje rezerwacje przez LangChain |
| 📋 **Menu online** | Pełna karta dań z kategoriami, zdjęciami i możliwością dodawania do koszyka |
| 🛒 **Koszyk i zamówienia** | Składanie zamówień online z płatnością przez Stripe |
| 📅 **System rezerwacji** | Rezerwacja stolików – statusy: pending → confirmed → cancelled |
| 👨‍🍳 **Panel kuchni** | Podgląd zamówień, zmiana statusu (preparing → ready), powiadomienia |
| 📦 **Panel magazynu** | Zarządzanie składnikami, partiami, stanami magazynowymi, recepturami i przychodami |
| 🚚 **Panel kuriera** | Przypisywanie i śledzenie dostaw (ready → in_transit → delivered) |
| 🛡️ **Panel admina** | Zarządzanie rezerwacjami (tabela + filtrowanie), menu, użytkownikami, zamówieniami i rolami |
| 🔐 **Autoryzacja rolami** | JWT (BCrypt + httpOnly cookie) – role: `admin`, `kitchen`, `courier`, `user` |
| 📱 **Responsywność** | Bootstrap 5 – działa na desktopie, tablecie i telefonie |

---

## 🧱 Stack technologiczny

### Backend (.NET 10 / C#)

| Składnik | Technologia |
|----------|-------------|
| **Framework** | .NET 10 (C# 14) — Clean Architecture |
| **ORM** | Entity Framework Core 10 + Npgsql (PostgreSQL) |
| **Baza danych** | PostgreSQL 16 |
| **Kolejka zadań** | Hangfire + PostgreSQL (recurring job co 5 min – anulowanie nieopłaconych zamówień) |
| **Autoryzacja** | BCrypt (hasła) + System.IdentityModel.Tokens.Jwt (access/refresh tokeny w httpOnly cookie) |
| **API** | ASP.NET Core Web API + OpenAPI (Scalar/NSwag) |
| **Płatności** | Stripe SDK (webhook z idempotencją) |
| **Architektura** | Clean Architecture: Domain → Application → Infrastructure → WebAPI |
| **Migracje** | EF Core Migrations (auto-apply na starcie kontenera) |

### Frontend (React / TypeScript)

| Składnik | Technologia |
|----------|-------------|
| **Framework** | React 19, TypeScript 6, Vite 6 |
| **Routing** | react-router-dom 7 |
| **Stylowanie** | Bootstrap 5.3 |
| **HTTP** | Fetch API z `apiClient.ts` (httpOnly cookie refresh, automatyczne odświeżanie tokenów) |
| **Płatności** | Stripe Elements (`@stripe/react-stripe-js`) |

### Infrastruktura

| Składnik | Technologia |
|----------|-------------|
| **Konteneryzacja** | Docker Compose (3 serwisy) |
| **Serwery** | postgres:16, redis:7-alpine, backend-dotnet |
| **VPS** | Dowolny VPS z Docker (zalecane: 2 vCPU, 4 GB RAM, 40 GB SSD) |
| **Reverse proxy** | Nginx + Let's Encrypt SSL |

---

## 🚀 Uruchomienie lokalne (Docker)

### Wymagania

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Git
- Klucz API [DeepSeek](https://platform.deepseek.com/) (opcjonalnie – czat AI działa z fallbackiem)
- Konto [Stripe](https://stripe.com) (tryb testowy – opcjonalnie)

### Krok po kroku

```bash
# 1. Sklonuj repozytorium
git clone https://github.com/krzysztofzelman/restaurant-clean.git
cd restaurant-clean

# 2. Skopiuj i uzupełnij zmienne środowiskowe
cp .env.example .env
# Edytuj .env – ustaw DEEPSEEK_API_KEY i klucze Stripe (opcjonalnie)

# 3. Uruchom wszystkie serwisy
docker compose up -d

# 4. Poczekaj aż baza będzie gotowa (~10s), backend-dotnet uruchomi migracje i seed
#    Backend: http://localhost:8080
#    Frontend (dev): http://localhost:5173
#    Health check: http://localhost:8080/health
#    Hangfire Dashboard: http://localhost:8080/hangfire

# 5. Uruchom frontend (w osobnym terminalu)
npm install
npm run dev
```

### Konta testowe

| Email | Hasło | Rola |
|-------|-------|------|
| `admin@restauracja.pl` | `admin123` | admin |
| `kitchen@restauracja.pl` | `kitchen123` | kitchen |
| `kurier@restauracja.pl` | `kurier123` | courier |
| `jan@example.com` | `user123` | user |

### Serwisy Docker

| Serwis | Port | Opis |
|--------|------|------|
| `postgres` | 5432 | Baza danych PostgreSQL 16 |
| `redis` | 6379 | Cache (rezerwowany dla przyszłych funkcji) |
| `backend-dotnet` | 8080 | API .NET 10 (Kestrel) z Hangfire |

```bash
# Zatrzymanie
docker compose down

# Zatrzymanie + usunięcie danych (uwaga!)
docker compose down -v

# Podgląd logów
docker compose logs -f backend-dotnet
```

---

## 🔒 Bezpieczeństwo

| Obszar | Zabezpieczenie |
|--------|---------------|
| 🔑 **Klucze / sekrety** | Żadne sekrety nie są hardcodowane – wymagane przez zmienne środowiskowe (`Jwt__SecretKey`, `STRIPE_SECRET_KEY`, `DEEPSEEK_API_KEY`). |
| 🍪 **JWT** | Access token w pamięci (JS), refresh token w httpOnly cookie – brak dostępu z `localStorage`, odporne na XSS. |
| 🔐 **Hasła** | BCrypt (solone). |
| 🔄 **Webhook idempotencja** | Stripe webhook zdarzenia deduplikowane. |
| 📁 **Upload plików** | Walidacja typu + limit rozmiaru. |
| ✅ **Testy** | Backend: xUnit + EF InMemory — testy jednostkowe serwisów i repozytoriów. Frontend: Vitest. |

---

## 🔐 Zmienne środowiskowe

Aplikacja używa jednego pliku `.env` w katalogu głównym projektu (wzór: `.env.example`):

```env
# ── Frontend ──
VITE_API_URL=http://localhost:8080
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxx

# ── Backend (Docker) ──
DATABASE_URL=postgresql://restaurant:restaurant_dev@postgres:5432/restaurant
REDIS_URL=redis://redis:6379/0
SECRET_KEY=dev-secret-key-change-in-production
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxx
DEEPSEEK_API_KEY=sk_xxxxxxxxxxxxxxx
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
FRONTEND_URL=http://localhost:5173

# ── .NET Backend (override docker-compose defaults) ──
# ConnectionStrings__DefaultConnection=Host=postgres;Port=5432;Database=restaurant_dotnet;Username=restaurant;Password=restaurant_dev
# Jwt__SecretKey=super-secret-key-change-in-production
# Jwt__Issuer=restaurant-api
# Jwt__Audience=restaurant-app
# Jwt__AccessTokenExpireMinutes=15
# Jwt__RefreshTokenExpireDays=7
```

.NET backend używa konwencji `__` (podwójne podkreślenie) do override'owania zagnieżdżonych sekcji `appsettings.json` przez zmienne środowiskowe.

---

## 🌐 Wdrożenie na VPS

Aplikacja działa na **https://restauracja.kzelman.pl** — VPS 31.3.218.196.

### 1. Przygotowanie VPS

```bash
# Połącz się przez SSH
ssh root@twoj-vps-ip -p 2022

# Zainstaluj Docker
apt update && apt install -y docker.io docker-compose-v2
```

### 2. Deploy (CI/CD – GitHub Actions)

Po pushu do gałęzi `main` GitHub Actions automatycznie:
1. Buduje i testuje frontend (Node.js 20)
2. Buduje i testuje backend (.NET 10)
3. Kopiuje pliki na VPS przez SCP
4. Wykonuje backup bazy danych (`pg_dump`)
5. Zatrzymuje stare kontenery (Python/Celery jeśli istnieją)
6. Uruchamia nowe kontenery z backend-dotnet
7. Weryfikuje endpoint `/health`

> Wymagane sekrety GitHub: `SSH_HOST`, `SSH_PORT`, `SSH_USER`, `SSH_PASSWORD`.

### 3. Ręczny deploy (awaryjny)

```bash
git clone https://github.com/krzysztofzelman/restaurant-clean.git
cd restaurant-clean

# Backup przed deployem
docker exec restaurant-db pg_dump -U restaurant restaurant > backup_$(date +%Y%m%d).sql

# Pull nowego kodu i restart
git pull
docker compose up -d --build backend-dotnet
```

### 4. Nginx + SSL

Przykładowa konfiguracja (użyta na produkcji dla **restauracja.kzelman.pl**):

```nginx
# HTTP → HTTPS redirect
server {
    listen 80;
    server_name restauracja.kzelman.pl;
    return 301 https://$host$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name restauracja.kzelman.pl;

    ssl_certificate /etc/letsencrypt/live/restauracja/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/restauracja/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90s;
    }

    location /images/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        root /var/www/restaurant/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

> **Uwaga:** Backend został przeniesiony z portu 8000 (Python/FastAPI) na port 8080 (.NET 10). Należy zaktualizować `proxy_pass` w konfiguracji Nginx.

Certyfikat SSL uzyskany przez Let's Encrypt (certbot --webroot), auto-odnowienie.

---

## 🤖 Hangfire – kolejka zadań

Zadania w tle są obsługiwane przez **Hangfire** z PostgreSQL (zamiast poprzedniego Celery + Redis).

| Zadanie | Harmonogram | Opis |
|---------|-------------|------|
| `cancel-unpaid-orders` | Co 5 minut | Automatycznie anuluje zamówienia nieopłacone od >30 minut |

Dashboard dostępny pod `/hangfire` (w produkcji zabezpieczony autoryzacją).

---

## 🗄️ Baza danych

.NET backend używa bazy `restaurant_dotnet` (EF Core + migracje automatyczne przy starcie). Struktura odwzorowuje oryginalne 9 tabel:

| Tabela | Opis |
|--------|------|
| `Users` | Użytkownicy (email, hasło BCrypt, rola, status aktywności) |
| `MenuItems` | 38 dań w 6 kategoriach (przystawki, zupy, dania główne, pizza, desery, napoje) |
| `Orders` / `OrderItems` | Zamówienia z pełną historią statusów i pozycjami |
| `Ingredients` / `IngredientBatches` / `MenuItemIngredients` | Składniki, partie i receptury (moduł magazynowy) |
| `Konwersacjas` | Sesje czatu AI (JSONB – pełna historia rozmowy) |
| `Rezerwacjas` | Rezerwacje stolików |

Logika biznesowa (state machine zamówień, odliczanie składników, agregacja przychodów) zaimplementowana w C# zamiast w funkcjach PostgreSQL.

---

## 📁 Struktura projektu

```
restaurant-clean/
├── backend-dotnet/                 # 🆕 Backend .NET 10 (Clean Architecture)
│   ├── Restaurant.slnx             # Plik rozwiązania (.slnx – nowy format XML)
│   └── src/
│       ├── Restaurant.Domain/      # Encje, enums, interfejsy repozytoriów
│       ├── Restaurant.Application/ # DTO, serwisy, interfejsy aplikacyjne
│       ├── Restaurant.Infrastructure/ # EF Core, repozytoria, JWT, BCrypt, migracje
│       └── Restaurant.WebAPI/      # Kontrolery, middleware, Hangfire jobs, Program.cs
├── backend/                        # ⚠️ Legacy – Python/FastAPI (backup)
│   ├── app/
│   │   ├── api/           # Routery FastAPI
│   │   ├── models/        # SQLAlchemy ORM modele
│   │   ├── schemas/       # Pydantic schematy
│   │   ├── services/      # Logika biznesowa
│   │   ├── main.py        # Entry point
│   │   └── ...
│   ├── Dockerfile
│   └── pyproject.toml
├── src/                           # Frontend React/TypeScript
│   ├── components/        # Komponenty UI
│   ├── pages/             # Strony (LoginPage, HomePage, MenuPage, CartPage, AdminPage...)
│   ├── services/          # api.ts (klient HTTP), aiChatService.ts
│   ├── context/           # AuthContext (JWT), ToastContext
│   ├── hooks/             # useCart (koszyk w localStorage)
│   └── lib/               # apiClient.ts, tokenStorage.ts
├── docker-compose.yml     # 3 serwisy (postgres, redis, backend-dotnet)
├── .env.example           # Szablon zmiennych środowiskowych
└── .github/
    └── workflows/
        └── ci.yml         # CI/CD: frontend → backend-dotnet → deploy na VPS
```

---

## 🧪 Testy

```bash
# Backend (.NET)
dotnet test backend-dotnet/Restaurant.slnx --verbosity normal

# Frontend
npm run dev          # Serwer deweloperski (Vite) – http://localhost:5173
npm run build        # Buduj wersję produkcyjną
npm run test         # Uruchom testy frontendu (Vitest)
npm run typecheck    # Sprawdź typy TypeScript (tsc --noEmit)
npm run lint         # ESLint
```

---

## 🤖 AI – Wirtualny Kelner

- **Silnik:** LangChain + DeepSeek (`deepseek-chat` przez API OpenAI-compatible)
- **Uwaga:** Integracja AI działa przez legacy Python backend (FastAPI) – nie została jeszcze przeniesiona do .NET. Aby czat AI działał, wymagany jest działający backend Python.
- **Kontekst:** Historia rozmowy w tabeli `konwersacje` (JSONB)
- **Fallback:** Jeśli klucz DeepSeek nie jest skonfigurowany, czat zwraca komunikat o niedostępności

---

## 📄 Licencja

MIT

---

## 👤 Autor

**Krzysztof Zelman**
