package com.crownfall.mosaic;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.TextView;

import com.google.firebase.FirebaseApp;
import com.google.firebase.crashlytics.FirebaseCrashlytics;

import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.NoCredentialException;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

public class MainActivity extends Activity {
    private static final long RECHECK_MS = 15 * 60 * 1000L;
    /** The open game, if it is on screen; lets an update push show the in-game offer instead of a notification. */
    private static java.lang.ref.WeakReference<MainActivity> visible = new java.lang.ref.WeakReference<>(null);
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable recheck = () -> checkSoon();
    private FrameLayout root;
    private WebView web;
    private Updater updater;
    private boolean pageReady;
    /** An invite link the game was opened with; handed to the page once it has loaded. */
    private String pendingLink;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        updater = new Updater(this);
        // Background helpers must never stop the game from opening.
        try {
            UpdateNotifier.schedule(this);
            PushService.subscribe(this, UpdateNotifier.prefs(this).getBoolean("notify", true));
        } catch (Exception e) {
            report(e);
        }
        if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED
                && !UpdateNotifier.prefs(this).getBoolean("askedNotify", false)) {
            UpdateNotifier.prefs(this).edit().putBoolean("askedNotify", true).apply();
            requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 1);
        }

        // Full screen: the game draws under the status bar and camera cutout, system bars are hidden
        // (a swipe from the edge shows them for a moment). The page gets the cutout sizes as CSS
        // variables, so buttons stay clear of a camera hole in a corner.
        root = new FrameLayout(this);
        root.setBackgroundColor(0xFF101729);
        if (Build.VERSION.SDK_INT >= 28) {
            android.view.WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode = android.view.WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            sendInsets(insets);
            return insets;
        });
        setContentView(root);
        hideSystemBars();
        createWebView();
        grabLink(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        grabLink(intent);
        if (pageReady) deliverLink();
    }

    private void grabLink(Intent intent) {
        if (intent != null && Intent.ACTION_VIEW.equals(intent.getAction()) && intent.getData() != null) pendingLink = intent.getData().toString();
    }

    private void deliverLink() {
        if (pendingLink == null) return;
        String link = pendingLink;
        pendingLink = null;
        js("window.onDeepLink && window.onDeepLink(" + org.json.JSONObject.quote(link) + ")");
    }

    private String insetsJs = "";

    /** Camera cutout sizes in CSS pixels → --it/--ib/--il/--ir; --itg is the top gap for the game screen. */
    /** The reference phone the layout was tuned on: realme GT3 240W, 6.74 inches. It is shown at scale 1. */
    private static final double REFERENCE_INCHES = 6.74;

    /**
     * Every other phone scales the whole page by its screen size relative to the reference phone, so buttons and
     * text keep the same physical size. Limited to 0.85–1.2 (tablets are not stretched further).
     */
    float uiScale() {
        return (float) Math.max(0.85, Math.min(1.2, screenInches() / REFERENCE_INCHES));
    }

    /**
     * Screen diagonal in inches. A phone model whose diagonal is known exactly (KNOWN_INCHES, keyed by
     * "manufacturer model") uses that value; any other phone uses the size the panel reports (pixels / dpi).
     */
    double screenInches() {
        Double known = KNOWN_INCHES.get((Build.MANUFACTURER + " " + Build.MODEL).toLowerCase(java.util.Locale.ROOT).trim());
        if (known != null) return known;
        android.util.DisplayMetrics m = getResources().getDisplayMetrics();
        if (m.xdpi <= 0 || m.ydpi <= 0) return 6.1;
        double w = m.widthPixels / (double) m.xdpi, h = m.heightPixels / (double) m.ydpi;
        return Math.sqrt(w * w + h * h);
    }

    /** Diagonals of phone models measured or published exactly, by "manufacturer model" (lower case). */
    private static final java.util.Map<String, Double> KNOWN_INCHES = new java.util.HashMap<>();
    static {
        KNOWN_INCHES.put("realme rmx3709", 6.74); // realme GT3 240W
        // add a model here once its exact diagonal is known: "manufacturer model" in lower case
    }

    private void sendInsets(WindowInsets insets) {
        // The page is zoomed by uiScale(), so one CSS pixel is uiScale dp: insets are converted to that.
        float d = getResources().getDisplayMetrics().density * uiScale();
        int top = 0, bottom = 0, left = 0, right = 0;
        boolean cornerCut = false;
        if (Build.VERSION.SDK_INT >= 28 && insets.getDisplayCutout() != null) {
            android.view.DisplayCutout c = insets.getDisplayCutout();
            top = c.getSafeInsetTop(); bottom = c.getSafeInsetBottom(); left = c.getSafeInsetLeft(); right = c.getSafeInsetRight();
            // The top row of the menu has four buttons that reach the middle of the screen, so a camera
            // hole anywhere on the top edge (centre included) pushes the menu down.
            for (android.graphics.Rect r : c.getBoundingRects()) {
                if (r.top <= 0 && r.bottom > 0) cornerCut = true;
            }
        }
        // The navigation (gesture) bar stays on screen, see on top of the page: keep content clear of it.
        bottom = Math.max(bottom, navBottom(insets));
        // --itg: the menu starts below a camera hole on the top edge.
        insetsJs = String.format(java.util.Locale.US,
                "(function(s){s.setProperty('--it','%.1fpx');s.setProperty('--ib','%.1fpx');s.setProperty('--il','%.1fpx');s.setProperty('--ir','%.1fpx');s.setProperty('--itg','%.1fpx');})(document.documentElement.style)",
                top / d, bottom / d, left / d, right / d, (cornerCut ? top : 0) / d);
        if (pageReady) js(insetsJs);
    }

    @SuppressWarnings("deprecation")
    private int navBottom(WindowInsets insets) {
        if (Build.VERSION.SDK_INT >= 30) return insets.getInsets(WindowInsets.Type.navigationBars()).bottom;
        return insets.getSystemWindowInsetBottom();
    }

    /* Only the status bar is hidden. The navigation / gesture bar stays (transparent, drawn over the
       page), so a single edge swipe is the system "back" gesture: with the bar hidden too, Android
       needs a first swipe just to bring it back ("swipe again"). */
    @SuppressWarnings("deprecation")
    private void hideSystemBars() {
        getWindow().setNavigationBarColor(android.graphics.Color.TRANSPARENT);
        if (Build.VERSION.SDK_INT >= 29) getWindow().setNavigationBarContrastEnforced(false);
        if (Build.VERSION.SDK_INT >= 30) {
            android.view.WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                getWindow().setDecorFitsSystemWindows(false);
                c.hide(WindowInsets.Type.statusBars());
                c.show(WindowInsets.Type.navigationBars());
                c.setSystemBarsBehavior(android.view.WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    | View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    private void createWebView() {
        pageReady = false;
        try {
            web = new WebView(this);
        } catch (Exception e) {
            // No working Android System WebView on this phone (it is being updated or was disabled).
            report(e);
            TextView t = new TextView(this);
            t.setText("Не удалось запустить игру.\n\nОбновите или включите «Android System WebView» в Google Play и откройте игру снова.");
            t.setTextColor(0xFFEEF1F8);
            t.setTextSize(18);
            t.setGravity(Gravity.CENTER);
            t.setPadding(48, 48, 48, 48);
            root.addView(t, new FrameLayout.LayoutParams(-1, -1));
            return;
        }
        web.setBackgroundColor(0xFF101729);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setTextZoom(100); // large system fonts must not break the game layout
        web.addJavascriptInterface(new Bridge(), "AndroidApp");
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                pageReady = true;
                if (!insetsJs.isEmpty()) view.evaluateJavascript(insetsJs, null);
                deliverLink();
                checkSoon();
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if ("file".equals(u.getScheme())) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, u));
                } catch (Exception e) {
                    report(e);
                }
                return true;
            }

            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                // The browser engine crashed or was killed for memory: start a fresh one instead of
                // letting Android close the app. An offline game resumes from its save.
                report(new IllegalStateException("WebView renderer gone"));
                root.removeView(view);
                view.destroy();
                if (web == view) createWebView();
                return true;
            }
        });
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        web.loadUrl("file:///android_asset/index.html");
    }

    @Override
    protected void onResume() {
        super.onResume();
        visible = new java.lang.ref.WeakReference<>(this);
        updater.onResume();
        if (web != null) web.onResume();
        // Coming back to the game counts as entering it: look for a new version again.
        if (pageReady) checkSoon();
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (visible.get() == this) visible.clear();
        handler.removeCallbacks(recheck);
        if (web != null) web.onPause();
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacks(recheck);
        if (web != null) web.destroy();
        super.onDestroy();
    }

    static MainActivity visible() {
        return visible.get();
    }

    /** Checks for an update now and again every 15 minutes while the game stays on screen. */
    void checkSoon() {
        handler.removeCallbacks(recheck);
        try {
            updater.check(false);
        } catch (Exception e) {
            report(e);
        }
        handler.postDelayed(recheck, RECHECK_MS);
    }

    @Override
    public void onBackPressed() {
        if (web == null || !pageReady) { super.onBackPressed(); return; }
        // The game decides: close a dialog, open the game menu, go back a screen, or let the app close.
        web.evaluateJavascript("window.onBack ? window.onBack() : false", handled -> {
            if (!"true".equals(handled)) finish();
        });
    }

    /** Runs JavaScript in the game page from any thread. */
    void js(String code) {
        runOnUiThread(() -> {
            if (web != null) web.evaluateJavascript(code, null);
        });
    }

    /** Sends a problem to Firebase Crashlytics (if this build has Firebase) without crashing. */
    void report(Throwable e) {
        try {
            if (!FirebaseApp.getApps(this).isEmpty()) FirebaseCrashlytics.getInstance().recordException(e);
        } catch (Throwable ignored) {
        }
    }

    static String googleErrorCode(GetCredentialException e) {
        if (e instanceof GetCredentialCancellationException) return "canceled";
        if (e instanceof NoCredentialException) return "no_credentials";
        // Google refuses the token when this app's signing certificate (SHA-1) is not registered for the package in
        // the Firebase/Google Cloud project: the account picker opens, then this error comes back (code 28444).
        String m = String.valueOf(e.getMessage());
        if (m.contains("USER_CANCELED") || m.contains("Canceled") || m.contains("canceled") || m.contains("16: Cannot find")) return "canceled";
        if (m.contains("28444") || m.contains("28433") || m.contains("10:") || m.contains("DEVELOPER_ERROR") || m.contains("Developer console")) return "misconfigured";
        return "failed";
    }

    private class Bridge {
        /** The system page of this app (with its "Uninstall" button): used for the one-time reinstall after a key change. */
        @JavascriptInterface
        public void openAppSettings() {
            runOnUiThread(() -> {
                try {
                    startActivity(new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                            Uri.parse("package:" + getPackageName())).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                } catch (Exception e) {
                    report(e);
                }
            });
        }

        @JavascriptInterface
        public String versionName() { return BuildConfig.VERSION_NAME; }

        @JavascriptInterface
        public float uiScale() { return MainActivity.this.uiScale(); }

        @JavascriptInterface
        public String store() { return BuildConfig.FLAVOR; }

        /** Invite links: the system "share" sheet, so the player picks the messenger. */
        @JavascriptInterface
        public void share(String text) {
            runOnUiThread(() -> {
                android.content.Intent send = new android.content.Intent(android.content.Intent.ACTION_SEND);
                send.setType("text/plain");
                send.putExtra(android.content.Intent.EXTRA_TEXT, text);
                try { startActivity(android.content.Intent.createChooser(send, "Пригласить в Puzzlegrad")); } catch (Exception ignored) { }
            });
        }

        /** This phone, for the owner's statistics: model and screen diagonal. */
        @JavascriptInterface
        public String deviceInfo() {
            org.json.JSONObject o = new org.json.JSONObject();
            try {
                o.put("m", (Build.MANUFACTURER + " " + Build.MODEL).trim());
                o.put("i", Math.round(screenInches() * 10) / 10.0);
            } catch (Exception e) {
                report(e);
            }
            return o.toString();
        }

        @JavascriptInterface
        public void startUpdate(String url) { updater.download(url); }

        @JavascriptInterface
        public void checkUpdates() { updater.check(true); }

        @JavascriptInterface
        public void setUpdateNotifications(boolean on) {
            try {
                UpdateNotifier.setEnabled(MainActivity.this, on);
            } catch (Exception e) {
                report(e);
            }
        }

                @JavascriptInterface
        public void logError(String message) { report(new RuntimeException("JS: " + message)); }

        /** Whether this build can offer Google sign-in (a web OAuth client id is configured). */
        @JavascriptInterface
        public boolean googleReady() { return !BuildConfig.GOOGLE_CLIENT_ID.isEmpty(); }

        /**
         * Google sign-in for the WebView, which cannot run Google Identity Services itself.
         * Uses Credential Manager; the ID token is verified by Firebase in the game page.
         * Answers through window.onGoogleToken(token) or window.onGoogleError(code).
         */
        @JavascriptInterface
        public void googleSignIn() {
            runOnUiThread(() -> {
                if (BuildConfig.GOOGLE_CLIENT_ID.isEmpty()) {
                    js("window.onGoogleError && window.onGoogleError('not_configured')");
                    return;
                }
                try {
                    GetSignInWithGoogleOption opt = new GetSignInWithGoogleOption.Builder(BuildConfig.GOOGLE_CLIENT_ID)
                            .build();
                    GetCredentialRequest req = new GetCredentialRequest.Builder().addCredentialOption(opt).build();
                    CredentialManager cm = CredentialManager.create(MainActivity.this);
                    java.util.concurrent.Executor exec = new java.util.concurrent.Executor() {
                        @Override public void execute(Runnable r) { runOnUiThread(r); }
                    };
                    CredentialManagerCallback<GetCredentialResponse, GetCredentialException> cb =
                            new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                        @Override public void onResult(GetCredentialResponse res) {
                            try {
                                Credential cred = res.getCredential();
                                String idToken = null;
                                try {
                                    GoogleIdTokenCredential g = GoogleIdTokenCredential.createFrom(cred.getData());
                                    idToken = g.getIdToken();
                                } catch (Throwable t) {
                                    android.util.Log.w("MosaicGoogle", "GoogleIdTokenCredential.createFrom: " + t.getMessage());
                                }
                                if (idToken == null || idToken.isEmpty()) {
                                    android.os.Bundle b = cred.getData();
                                    if (b != null) {
                                        idToken = b.getString("com.google.android.libraries.identity.googleid.BUNDLE_KEY_ID_TOKEN");
                                        if (idToken == null) idToken = b.getString("id_token");
                                        if (idToken == null) idToken = b.getString("idToken");
                                    }
                                }
                                if (idToken != null && !idToken.isEmpty()) {
                                    android.util.Log.i("MosaicGoogle", "Google ID token obtained");
                                    js("window.onGoogleToken && window.onGoogleToken(" + org.json.JSONObject.quote(idToken) + ")");
                                } else {
                                    android.util.Log.e("MosaicGoogle", "Empty Google ID token");
                                    report(new RuntimeException("Empty Google ID token from credential type: " + (cred != null ? cred.getType() : "null")));
                                    js("window.onGoogleError && window.onGoogleError('bad_credential')");
                                }
                            } catch (Exception e) {
                                android.util.Log.e("MosaicGoogle", "onResult exception: " + e.getMessage(), e);
                                report(e);
                                js("window.onGoogleError && window.onGoogleError('bad_credential')");
                            }
                        }
                        @Override public void onError(GetCredentialException e) {
                            String code = googleErrorCode(e);
                            android.util.Log.w("MosaicGoogle", "onError: code=" + code + " ex=" + e.getClass().getSimpleName() + " msg=" + e.getMessage());
                            if ("failed".equals(code) || "misconfigured".equals(code)) report(e);
                            js("window.onGoogleError && window.onGoogleError(" + org.json.JSONObject.quote(code) + ")");
                        }
                    };
                    cm.getCredentialAsync(MainActivity.this, req, null, exec, cb);
                } catch (Exception e) {
                    report(e);
                    js("window.onGoogleError && window.onGoogleError('failed')");
                }
            });
        }

        /** Firebase Analytics event from the game: name and flat JSON params (strings and numbers). */
        @JavascriptInterface
        public void logEvent(String name, String json) {
            try {
                if (FirebaseApp.getApps(MainActivity.this).isEmpty()) return;
                android.os.Bundle b = new android.os.Bundle();
                org.json.JSONObject o = new org.json.JSONObject(json == null || json.isEmpty() ? "{}" : json);
                for (java.util.Iterator<String> it = o.keys(); it.hasNext(); ) {
                    String k = it.next();
                    Object v = o.get(k);
                    if (v instanceof Number) b.putDouble(k, ((Number) v).doubleValue());
                    else b.putString(k, String.valueOf(v));
                }
                com.google.firebase.analytics.FirebaseAnalytics.getInstance(MainActivity.this).logEvent(name, b);
            } catch (Exception e) {
                report(e);
            }
        }

        /** Whether Android lets the game show notifications (the system switch, not the in-game one). */
        @JavascriptInterface
        public boolean notificationsAllowed() {
            try {
                android.app.NotificationManager nm = (android.app.NotificationManager) getSystemService(NOTIFICATION_SERVICE);
                if (Build.VERSION.SDK_INT >= 24 && !nm.areNotificationsEnabled()) return false;
                return Build.VERSION.SDK_INT < 33 || checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) == android.content.pm.PackageManager.PERMISSION_GRANTED;
            } catch (Exception e) {
                report(e);
                return true;
            }
        }

        /** Asks Android to allow notifications: the system question if it may still be asked, else the app's notification settings. */
        @JavascriptInterface
        public void askNotifications() {
            runOnUiThread(() -> {
                try {
                    if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED
                            && shouldShowRequestPermissionRationale(android.Manifest.permission.POST_NOTIFICATIONS)) {
                        requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 1);
                        return;
                    }
                    Intent i = Build.VERSION.SDK_INT >= 26
                            ? new Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(android.provider.Settings.EXTRA_APP_PACKAGE, getPackageName())
                            : new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName()));
                    startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                } catch (Exception e) {
                    report(e);
                }
            });
        }

        /** Owner panel: the token and the panel switch survive a cleared page storage. */
        @JavascriptInterface
        public String getPref(String key) {
            if (!"devToken".equals(key) && !"devPanel".equals(key)) return "";
            return getSharedPreferences("owner", MODE_PRIVATE).getString(key, "");
        }

        @JavascriptInterface
        public void setPref(String key, String value) {
            if (!"devToken".equals(key) && !"devPanel".equals(key)) return;
            android.content.SharedPreferences.Editor e = getSharedPreferences("owner", MODE_PRIVATE).edit();
            if (value == null || value.isEmpty()) e.remove(key); else e.putString(key, value);
            e.apply();
        }

        /** Owner panel: this phone also gets test announcements. */
        @JavascriptInterface
        public void newsTest(boolean on) {
            try {
                PushService.testTopic(MainActivity.this, on);
            } catch (Exception e) {
                report(e);
            }
        }
    }
}
