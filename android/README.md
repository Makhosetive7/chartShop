# ChartShop for Android

Native Android client for the same shop account as the web dashboard, Telegram, and WhatsApp. It talks to the existing REST API ([backend/scripts/WEB_API_V1.md](../backend/scripts/WEB_API_V1.md)); there is no separate backend.

| | |
|---|---|
| Application ID | `com.chartshop.app` (debug builds: `com.chartshop.app.debug`) |
| Min / target SDK | 26 (Android 8) / 37 |
| Stack | Kotlin, Jetpack Compose, Material 3, Navigation Compose, Retrofit + OkHttp, kotlinx.serialization, DataStore |
| Network | Online only |

## Run it

Open `android/` in Android Studio and run the `app` configuration, or from a terminal:

```bash
cd android
./gradlew :app:installDebug        # build and install on a connected device / emulator
./gradlew :app:testDebugUnitTest   # JVM unit tests
./gradlew :app:lintDebug
```

The first `./gradlew` run downloads Gradle 9.6 (~130 MB).

### Which API the app uses

| Build | API |
|-------|-----|
| Release | `https://chartshop.onrender.com/api/v1/` (production database) |
| Debug | `http://10.0.2.2:3006/api/v1/`: your local backend and the development database |

Debug builds never touch production data. Start the local backend before running the app:

```bash
cd backend
npm run dev    # reads backend/.env: port 3006, development database
```

`10.0.2.2` is the emulator's alias for your computer. Debug builds allow plain HTTP to that address and `localhost` only. To use a different API, set `chartshop.debugApiBaseUrl` in `~/.gradle/gradle.properties` (not the repo).

On a real phone, or if requests to `10.0.2.2` time out, forward the port instead and use `localhost`:

```bash
adb reverse tcp:3006 tcp:3006
./gradlew :app:installDebug -Pchartshop.debugApiBaseUrl=http://localhost:3006/api/v1/
```

## How it's put together

```
app/src/main/java/com/chartshop/app/
  AppContainer.kt      manual dependency wiring (OkHttp, Retrofit, session, repositories)
  data/api/            Retrofit interfaces, auth interceptor, ApiResult / ApiError
  data/model/          @Serializable DTOs matching the API JSON
  data/session/        SessionManager + Keystore-encrypted DataStore storage
  data/auth/           AuthRepository
  data/products/       ProductRepository: the shop's catalog, shared by every product screen
  data/shop/           ShopRepository: every other /shop and owner endpoint, a `changes` signal after writes, PDF download
  data/notifications/  NotificationCenter: feeds + server read state behind the Notifications page and bell badge
  data/consent/        which Privacy Policy / Terms version the user accepted
  domain/              username / PIN rules, money, stock status, shop-timezone dates, product line picker,
                       notification feed copy (mirrors the web app and server)
  ui/welcome/          first-launch welcome screen with policy links
  ui/auth/             login, register + recovery codes, recover PIN, invite setup
  ui/home/             dashboard: KPIs, highlights, weekday / mix / busy-hour charts, panels
  ui/sales/            cash, credit and sell-to-customer, recent sales, cancel, refunds
  ui/products/         Products page: add card, filtered table, edit dialog (stock, options, packs)
  ui/books/            customers, laybyes, orders, expenses (with the till cash check)
  ui/reports/          daily / weekly / monthly cash flow, best sellers, profit, PDF share
  ui/activity/         activity log with channel / action / detail filters
  ui/notifications/    notification feed, unread filter, mark all as read
  ui/settings/         preferences, display name, username, business details, PIN, team, recovery codes
  ui/chat/             in-app chat with the same commands as Telegram
  ui/shell/            bottom navigation, bell badge, More menu
  ui/components/       Primitives.kt (web buttons, inputs, card, tabs, modal, toast), Layout.kt (page, tables,
                       stats, date / suggest inputs), Charts.kt, ProductLineFields.kt, PIN pad, banners
  ui/theme/            colors and shapes from frontend/src/styles/theme.ts
```

- **Sessions** last 24 hours after the last request (server rule). On a 401 the app returns to the PIN pad with the username remembered.
- **Token storage**: the session is encrypted with an Android Keystore key and excluded from backups.
- **Welcome screen**: shown until the user taps "Agree and continue", and again whenever `LegalConsent.CURRENT_VERSION` is raised. The policies themselves live on the website at `/privacy` and `/terms` (`frontend/src/content/legal.ts`); bump `LEGAL_VERSION` there and `CURRENT_VERSION` here together.
- **Slow first request**: Render's free tier can take 10–30 s to wake. Timeouts are long, and screens show a "waking up the server" note after a few seconds.
- **Screen design matches the web app on a phone.** Each feature screen copies the small-screen layout, wording and validation of its web page (for Products, `frontend/src/pages/ProductsPage.tsx`), built from the shared pieces in `ui/components/Primitives.kt`. When the web page changes, change the app screen with it.
- **Products** follow the Product → Variant → Pack model in [docs/design-product-variants-packs.md](../docs/design-product-variants-packs.md). The app calls variants "options". Stock is counted per option; the table, summary and Low/Out tabs read the product's server-synced totals, like the web. Each write returns the updated product, which replaces the cached copy without a refetch. Demo shops can look but writes show a "changes aren't saved" toast.
- **Fresh data after writes**: every save goes through `ShopRepository`, which bumps `changes`; open screens and the notification badge reload on it (the app's version of the web's query invalidation). Sales, laybyes, orders and chat also refresh the product cache.
- **Notifications** poll every 60 s while signed in. Read state lives on the server, so it matches the web.
- **Chat in demo shops** allows only read commands (help, list, daily, best…), like the web.

## Milestones

All five are built and compile; on-device testing and debugging is next.

1. **Built** — project, theme, navigation shell, login, register, recover PIN, invite setup, logout.
2. **Built** — counter: products, cash / credit / sell-to-customer sales, recent sales, cancel, refunds.
3. **Built** — books: customers and credit, orders, laybyes, expenses with till check.
4. **Built** — owner view: dashboard stats, reports, PDF share, activity, notifications with bell badge.
5. **Built** — admin and extras: settings, team, recovery codes, in-app chat.
