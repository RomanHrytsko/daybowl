# Чаша дня

Local-first PWA, що показує, наскільки заповнений кожен день тижня і скільки часу лишається для себе. Специфікація — [daybowl_spec.md](daybowl_spec.md).

## Запуск

```bash
npm install
npm run dev        # http://localhost:5173
npm run test:run   # юніт- і сценарні тести
npm run build      # статика + service worker у dist/
```

## Структура

```text
src/
  domain/      чисті функції: типи, dayStats/weekStats, повтори, копія тижня (+ тести)
  data/        Dexie-схема, репозиторії, стартовий набір, експорт/імпорт JSON
  state/       useWeek / useDay (useLiveQuery), uiStore (Zustand + хеш-маршрути)
  components/  BowlSvg, TemplateChips, ActivityRow, SizePicker
  screens/     Тиждень, День, Підсумок, Шаблони, Налаштування, Онбординг
  i18n/        uk.ts — усі тексти
```

Дані зберігаються лише в IndexedDB браузера. Резервна копія — Налаштування → Експортувати JSON.
