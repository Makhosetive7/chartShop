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
| Release | `https://chartshop.onrender.com/api/v1/` |
| Debug | `chartshop.debugApiBaseUrl` from Gradle properties (defaults to production) |

To point a debug build at your local backend from the emulator, add this to `~/.gradle/gradle.properties` (not the repo):

```properties
chartshop.debugApiBaseUrl=http://10.0.2.2:3006/api/v1/
```

`10.0.2.2` is the emulator's alias for your computer. Debug builds allow plain HTTP to that address only.

## How it's put together

```
app/src/main/java/com/chartshop/app/
  AppContainer.kt      manual dependency wiring (OkHttp, Retrofit, session, repositories)
  data/api/            Retrofit interfaces, auth interceptor, ApiResult / ApiError
  data/model/          @Serializable DTOs matching the API JSON
  data/session/        SessionManager + Keystore-encrypted DataStore storage
  data/auth/           AuthRepository
  data/consent/        which Privacy Policy / Terms version the user accepted
  domain/              username / PIN rules mirrored from the web app
  ui/welcome/          first-launch welcome screen with policy links
  ui/auth/             login, register + recovery codes, recover PIN, invite setup
  ui/shell/            bottom navigation, More menu, placeholder screens
  ui/components/       PIN pad, banners, buttons, auth layout
  ui/theme/            colors and shapes from frontend/src/styles/theme.ts
```

- **Sessions** last 24 hours after the last request (server rule). On a 401 the app returns to the PIN pad with the username remembered.
- **Token storage**: the session is encrypted with an Android Keystore key and excluded from backups.
- **Welcome screen**: shown until the user taps "Agree and continue", and again whenever `LegalConsent.CURRENT_VERSION` is raised. The policies themselves live on the website at `/privacy` and `/terms` (`frontend/src/content/legal.ts`); bump `LEGAL_VERSION` there and `CURRENT_VERSION` here together.
- **Slow first request**: Render's free tier can take 10–30 s to wake. Timeouts are long, and screens show a "waking up the server" note after a few seconds.

## Milestones

1. **Done** — project, theme, navigation shell, login, register, recover PIN, invite setup, logout.
2. Counter — products (variants, packs, stock), cash sale, sell to customer, recent sales, cancel / refund.
3. Books — customers and credit, orders, laybyes, expenses with till check.
4. Owner view — dashboard stats, reports, PDF share, activity, notifications.
5. Admin and extras — settings, team, in-app chat.
