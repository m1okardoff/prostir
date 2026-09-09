# Direct Messages & Group Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Створити підсистему особистих повідомлень та групових чатів у додатку Prostir з реактивним бекендом Convex та повною навчальною інструкцією `lesson-10-module-06/docs/16-chat.md`.

**Architecture:** Уніфікована модель «Conversations + Messages» у Convex. Реактивні підписки через `useQuery`, завантаження зображень у Convex Storage, інвертовані списки `FlatList` (`inverted={true}`) з підтримкою `KeyboardAvoidingView`.

**Tech Stack:** React Native 0.86, Expo 57, Expo Router 57, NativeWind / Tailwind CSS 3.4, Convex 1.45, Expo ImagePicker, date-fns.

**Spec:** [docs/superpowers/specs/2026-09-09-chat-design.md](file:///home/skmelyuk/Documents/react-native/Lessons-pv521/prostir/docs/superpowers/specs/2026-09-09-chat-design.md)

## Global Constraints

- Всі стилі створюються через Tailwind CSS класи (NativeWind) з використанням палітри кольорів Prostir (`primary`, `surface`, `surfaceLight`, `grey`, `white`).
- Усі бекенд-функції захищені авторизацією через `getAuthUserId(ctx)` з `@convex-dev/auth/server`.
- Навігація будується через типізовані роути Expo Router (`/messages`, `/messages/[id]`, `/messages/new`).
- Інструкція для студентів створюється українською мовою з детальним поясненням кожного кроку та повними готовими лістингами файлів.

---

### Task 1: Створення навчальної інструкції `lesson-10-module-06/docs/16-chat.md`

**Files:**
- Create: `/home/skmelyuk/Documents/react-native/Lessons-pv521/lesson-10-module-06/docs/16-chat.md`

- [ ] **Step 1: Підготувати структуру документа (вступ, зміст, архітектурний огляд)**
- [ ] **Step 2: Описати Крок 1 (Схема Convex: таблиці conversations та messages)**
- [ ] **Step 3: Описати Крок 2 (Backend-модуль convex/conversations.ts)**
- [ ] **Step 4: Описати Крок 3 (Backend-модуль convex/messages.ts та оновлення convex/users.ts)**
- [ ] **Step 5: Описати Крок 4 (UI-компоненти MessageBubble.tsx та ChatInput.tsx)**
- [ ] **Step 6: Описати Крок 5 (Екран списку чатів app/messages/index.tsx)**
- [ ] **Step 7: Описати Крок 6 (Екран створення нового чату/групи app/messages/new.tsx)**
- [ ] **Step 8: Описати Крок 7 (Екран кімнати чату app/messages/[id].tsx)**
- [ ] **Step 9: Описати Крок 8 (Точки входу: хедер app/(tabs)/index.tsx та кнопка в app/user/[id].tsx)**
- [ ] **Step 10: Додати повні лістинги файлів, тестування та перевірку результатів**
