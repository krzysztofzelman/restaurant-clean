# 🍽️ Restauracja – Wirtualny Kelner AI

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.136-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://docs.docker.com/compose/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-57%20passing-28a745?logo=pytest)](backend/tests)

Nowoczesna aplikacja webowa dla restauracji, wyposażona w **Wirtualnego Kelnera AI** – czatbota opartego na DeepSeek, który zna prawdziwe menu, przyjmuje zamówienia i rezerwacje.

Aplikacja działa w modelu **self-hosted** na własnym VPS: Python/FastAPI + PostgreSQL + Redis + Celery zamiast zewnętrznych usług (Supabase). Pełna kontrola nad danymi i infrastrukturą.

> **🌐 Produkcja:** [https://restauracja.kzelman.pl](https://restauracja.kzelman.pl) — SSL (Let's Encrypt), Nginx reverse proxy, 5 kontenerów Docker

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
| 🔐 **Autoryzacja rolami** | JWT (bcrypt + PyJWT) – role: `admin`, `kitchen`, `courier`, `user` |
| 📱 **Responsywność** | Bootstrap 5 – działa na desktopie, tablecie i telefonie |

---

## 🧱 Stack technologiczny

### Backend (Python / FastAPI)

| Składnik | Technologia |
|----------|-------------|
| **Framework** | FastAPI 0.136 (Python 3.12+) |
| **ORM** | SQLAlchemy 2.0 + Alembic (migracje) |
| **Baza danych** | PostgreSQL 16 |
| **Kolejka zadań** | Celery + Redis (wysyłka emaili, anulowanie zamówień) |
| **Autoryzacja** | bcrypt (hasła) + PyJWT (tokeny access/refresh w httpOnly cookie) |
| **Rate limiting** | slowapi (5/min register, 10/min login/refresh) |
| **AI** | LangChain + DeepSeek (API OpenAI-compatible) |
| **Płatności** | Stripe SDK (webhook z idempotencją) |
| **Wysyłka emaili** | SMTP (potwierdzenia zamówień, statusy) |

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
| **Konteneryzacja** | Docker Compose (5 serwisów) |
| **Serwer** | postgres:16, redis:7-alpine, backend (uvicorn), celery-worker, celery-beat |
| **VPS** | Dowolny VPS z Docker (zalecane: 2 vCPU, 4 GB RAM, 40 GB SSD) |
| **Reverse proxy** | Nginx + Let's Encrypt SSL (zalecane) |

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

# 4. Poczekaj aż baza będzie gotowa (~10s), backend uruchomi seed danych testowych
#    Backend: http://localhost:8000
#    Frontend (dev): http://localhost:5173
#    Health check: http://localhost:8000/api/health

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
| `redis` | 6379 | Kolejka Celery + cache |
| `backend` | 8000 | API FastAPI (uvicorn) |
| `celery-worker` | – | Worker kolejki zadań |
| `celery-beat` | – | Harmonogram (anulowanie nieopłaconych zamówień co 5 min) |

```bash
# Zatrzymanie
docker compose down

# Zatrzymanie + usunięcie danych (uwaga!)
docker compose down -v

# Podgląd logów
docker compose logs -f backend
```

---

## 🔒 Bezpieczeństwo

| Obszar | Zabezpieczenie |
|--------|---------------|
| 🔑 **Klucze / sekrety** | Żadne sekrety nie są hardcodowane – wymagane przez zmienne środowiskowe. `SECRET_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` muszą być ustawione w `.env`. `deploy.py` generuje losowy klucz. |
| 🍪 **JWT** | Access token w pamięci (JS), refresh token w httpOnly cookie – brak dostępu z `localStorage`, odporne na XSS. |
| ⏱️ **Rate limiting** | 5 zapytań/min na rejestrację, 10/min na login/refresh (slowapi). |
| 🔄 **Webhook idempotencja** | Stripe webhook zdarzenia deduplikowane w pamięci przez 24h TTL. |
| 📁 **Upload plików** | Walidacja content-type + limit 5 MB. |
| 🔐 **Hasła** | bcrypt (solone, + koszt 12). |
| 📦 **Zależności** | `python-jose` → `PyJWT` (CVE naprawione), `react-router-dom` zaktualizowane (DoS CVE). |
| ✅ **Testy** | 57 testów (23 backend + 34 frontend) – pokrycie autoryzacji, JWT, API endpointów. |

---

## 🔐 Zmienne środowiskowe

Aplikacja używa jednego pliku `.env` w katalogu głównym projektu (wzór: `.env.example`):

```env
# ── Frontend ──
VITE_API_URL=http://localhost:8000
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxx

# ── Backend ──
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
```

> **⚠️ Ważne:** W produkcji wymagany jest silny, losowy `SECRET_KEY` (min. 64 znaki). `deploy.py` generuje go automatycznie.

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

### 2. Deploy (automatyczny)

```bash
# Sklonuj repo
git clone https://github.com/krzysztofzelman/restaurant-clean.git
cd restaurant-clean

# Skrypt deploy.py poprosi o dane VPS (lub użyje zmiennych środowiskowych)
# i automatycznie:
#   - generuje losowy SECRET_KEY
#   - przesyła pliki na serwer
#   - uruchamia docker compose
python deploy.py
```

> Skrypt nie przechowuje żadnych haseł w kodzie – wszystkie dane logowania podawane są interaktywnie lub przez zmienne środowiskowe (`VPS_HOST`, `VPS_PORT`, `VPS_USER`, `VPS_PASS`).

### 3. Nginx + SSL

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
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90s;
    }

    location /images/ {
        proxy_pass http://127.0.0.1:8000;
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

Certyfikat SSL uzyskany przez Let's Encrypt (certbot --webroot), auto-odnowienie.

### 4. Automatyczny restart

```bash
# Docker compose uruchomi się automatycznie po restarcie VPS
# (docker compose up -d już ustawia restart policy)
```

---

## 🗄️ Baza danych

9 tabel zarządzanych przez PostgreSQL + SQLAlchemy:

| Tabela | Opis |
|--------|------|
| `users` | Użytkownicy (email, hasło bcrypt, rola, status aktywności) |
| `menu_items` | 38 dań w 6 kategoriach (przystawki, zupy, dania główne, pizza, desery, napoje) |
| `orders` / `order_items` | Zamówienia z pełną historią statusów i pozycjami |
| `ingredients` / `ingredient_batches` / `menu_item_ingredients` | Składniki, partie i receptury (moduł magazynowy) |
| `konwersacje` | Sesje czatu AI (JSONB – pełna historia rozmowy) |
| `rezerwacje` | Rezerwacje stolików z walidacją CheckConstraint |

6 funkcji PostgreSQL (migracja z Supabase PL/pgSQL):
- `create_order_with_items` – atomowe tworzenie zamówienia z pozycjami
- `consume_ingredients_for_order` – automatyczne odjęcie składników z magazynu
- `update_order_status` – walidacja przejść stanu (state machine)
- `track_revenue` – agregacja przychodów (dzień/tydzień/miesiąc)
- `get_warehouse_stats` – statystyki magazynu (niskie stany, przeterminowania)
- `cancel_unpaid_orders` – automatyczne anulowanie (uruchamiane przez Celery Beat co 5 min)

---

## 📁 Struktura projektu

```
restaurant-clean/
├── backend/
│   ├── app/
│   │   ├── api/           # Routery FastAPI (auth, menu, orders, payment, chat, reservations, warehouse, upload)
│   │   ├── models/        # SQLAlchemy ORM modele (user, menu_item, order, ingredient, konwersacje, rezerwacje)
│   │   ├── schemas/       # Pydantic schematy walidacji
│   │   ├── services/      # Logika biznesowa (auth, menu, order, payment, chat, warehouse, reservation)
│   │   ├── main.py        # Entry point FastAPI
│   │   ├── config.py      # pydantic-settings
│   │   ├── database.py    # Engine + Session
│   │   ├── seed.py        # Seed danych testowych
│   │   └── celery_app.py  # Konfiguracja Celery
│   ├── postgres/
│   │   └── init.sql       # Pełny schemat SQL + funkcje + indeksy
│   ├── Dockerfile         # Obraz produkcyjny
│   ├── Dockerfile.dev     # Obraz deweloperski (hot reload)
│   └── pyproject.toml     # Zależności Python
├── src/                   # Frontend React/TypeScript
│   ├── components/        # Komponenty UI (Navbar, MenuCard, StripePayment, WirtualnyKelner...)
│   ├── pages/             # Strony (LoginPage, HomePage, MenuPage, CartPage, AdminPage...)
│   ├── services/          # api.ts (klient HTTP), aiChatService.ts
│   ├── context/           # AuthContext (JWT), ToastContext
│   ├── hooks/             # useCart (koszyk w localStorage)
│   ├── lib/               # apiClient.ts, tokenStorage.ts, database.types.ts
│   └── types/             # ai.ts (typy dla czatu)
├── docker-compose.yml     # 5 serwisów
├── .env.example           # Szablon zmiennych
└── PLAN_MIGRACJI.md       # Plan migracji Supabase → self-hosted
```

---

## 🧪 Skrypty

```bash
# Backend (przez Docker)
docker compose logs -f backend          # Logi backendu
docker compose logs -f celery-worker    # Logi Celery worker
docker compose exec backend alembic ... # Migracje (jeśli dodane)

# Backend testy (Python, wymaga pip install -e ".[dev]")
cd backend && python -m pytest tests/ -v

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
- **Kontekst:** Backend przechowuje historię rozmowy w tabeli `konwersacje` (JSONB)
- **Fallback:** Jeśli klucz DeepSeek nie jest skonfigurowany, czat zwraca komunikat o niedostępności
- **Prompt systemowy:** Asystent restauracji mówiący po polsku, znający menu

---

## 📄 Licencja

MIT

---

## 👤 Autor

**Krzysztof Zelman**
