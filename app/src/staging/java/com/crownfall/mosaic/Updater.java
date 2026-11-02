package com.crownfall.mosaic;

import android.app.PendingIntent;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;


import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Scanner;

/** Staging build: checks GitHub Releases, shows "what's new" in the game and installs updates just like the public build. */
class Updater {
    private final MainActivity activity;
    private File pendingApk;

    Updater(MainActivity activity) {
        this.activity = activity;
    }

    private static String get(String url, String accept) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setInstanceFollowRedirects(true);
        c.setUseCaches(false);
        c.setRequestProperty("Cache-Control", "no-cache");
        if (accept != null) c.setRequestProperty("Accept", accept);
        c.setConnectTimeout(8000);
        c.setReadTimeout(8000);
        if (c.getResponseCode() != 200) throw new java.io.IOException("HTTP " + c.getResponseCode() + " " + url);
        try (Scanner sc = new Scanner(c.getInputStream(), "UTF-8").useDelimiter("\\A")) {
            return sc.hasNext() ? sc.next() : "";
        }
    }

    /**
     * Latest release newer than this build, or null when this build is the newest; throws when it
     * cannot be checked. First the latest.json file attached to every release (a plain download,
     * no limits); the GitHub API is only a fallback, because without a login it allows just 60
     * requests an hour per address, and players behind one VPN or mobile network share that.
     */
    /**
     * SHA-256 of the certificate this copy is signed with (lower-case hex), "" if Android does not say. A release
     * signed with a different key cannot be installed over this copy: the game then asks for a one-time reinstall.
     */
    static String myCert(android.content.Context c) {
        try {
            android.content.pm.PackageManager pm = c.getPackageManager();
            android.content.pm.Signature[] sigs;
            if (Build.VERSION.SDK_INT >= 28) {
                sigs = pm.getPackageInfo(c.getPackageName(), android.content.pm.PackageManager.GET_SIGNING_CERTIFICATES).signingInfo.getApkContentsSigners();
            } else {
                sigs = pm.getPackageInfo(c.getPackageName(), android.content.pm.PackageManager.GET_SIGNATURES).signatures;
            }
            byte[] d = java.security.MessageDigest.getInstance("SHA-256").digest(sigs[0].toByteArray());
            StringBuilder sb = new StringBuilder();
            for (byte x : d) sb.append(String.format("%02x", x));
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }

    private static JSONObject latest(android.content.Context ctx, boolean deep) throws Exception {
        boolean saidCurrent = false;
        try {
            // The release CDN may serve a stale copy for a few minutes after a release: a changing query dodges it.
            JSONObject f = new JSONObject(get("https://github.com/" + BuildConfig.UPDATE_REPO + "/releases/latest/download/latest.json?t=" + System.currentTimeMillis(), null));
            // A check the player asked for double-checks a "no update" answer with the API before saying so.
            if (f.getInt("code") <= BuildConfig.VERSION_CODE) { if (!deep) return null; saidCurrent = true; throw new java.io.IOException("no newer in latest.json"); }
            JSONObject info = new JSONObject();
            info.put("code", f.getInt("code"));
            info.put("version", f.optString("version", "1.0." + f.getInt("code")));
            info.put("notes", f.optString("notes", ""));
            info.put("url", f.getString("url"));
            // "cert": the release is signed with this key; when it is not ours, an in-place update is impossible.
            String cert = f.optString("cert", "").replace(":", "").toLowerCase(java.util.Locale.ROOT);
            String mine = myCert(ctx);
            info.put("reinstall", !cert.isEmpty() && !mine.isEmpty() && !cert.equals(mine));
            return info;
        } catch (Exception ignored) {
            // An older release without latest.json, or the download failed: ask the API.
        }
        try {
            JSONObject rel = new JSONObject(get("https://api.github.com/repos/" + BuildConfig.UPDATE_REPO + "/releases/latest", "application/vnd.github+json"));
            int code = Integer.parseInt(rel.getString("tag_name").replaceAll("[^0-9]", ""));
            if (code <= BuildConfig.VERSION_CODE) return null;
            String url = null;
            JSONArray assets = rel.getJSONArray("assets");
            for (int i = 0; i < assets.length(); i++) {
                JSONObject a = assets.getJSONObject(i);
                if (a.getString("name").endsWith(".apk")) url = a.getString("browser_download_url");
            }
            if (url == null) return null;
            JSONObject info = new JSONObject();
            info.put("code", code);
            info.put("version", rel.optString("name", "1.0." + code));
            info.put("notes", rel.optString("body", ""));
            info.put("url", url);
            return info;
        } catch (Exception e) {
            if (saidCurrent) return null; // the file said this build is current and the API could not be asked
            throw e;
        }
    }

    /** On launch (and from Settings): offer the newer version in the game. */
    void check(boolean manual) {
        new Thread(() -> {
            JSONObject info;
            try {
                info = latest(activity, manual);
            } catch (Exception e) {
                // No internet or GitHub refused: play on; say so only when the player asked.
                activity.js(manual ? "window.onCheckFailed && window.onCheckFailed()" : "window.onUpdateChecked && window.onUpdateChecked(false)");
                return;
            }
            if (info != null) activity.js("window.onUpdateAvailable && window.onUpdateAvailable(" + info + ", " + manual + ")");
            else activity.js(manual ? "window.onNoUpdate && window.onNoUpdate()" : "window.onUpdateChecked && window.onUpdateChecked(false)");
        }).start();
    }

    /** Background check for the update notification. */
    static void findUpdate(android.content.Context c, UpdateNotifier.Found cb) {
        new Thread(() -> {
            try {
                JSONObject info = latest(c, false);
                if (info != null) { cb.found(info.getInt("code"), info.getString("version"), info.getString("notes")); return; }
            } catch (Exception ignored) {
            }
            cb.found(0, "", "");
        }).start();
    }

    void onResume() {
        // Returning from the "allow installs from this source" screen.
        if (pendingApk != null && canInstall()) {
            File apk = pendingApk;
            pendingApk = null;
            install(apk);
        }
    }

    void download(String url) {
        new Thread(() -> {
            try {
                File dir = new File(activity.getCacheDir(), "updates");
                dir.mkdirs();
                File apk = new File(dir, "update.apk");
                HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
                c.setInstanceFollowRedirects(true);
                c.setConnectTimeout(15000);
                c.setReadTimeout(30000);
                if (c.getResponseCode() != 200) throw new java.io.IOException("HTTP " + c.getResponseCode());
                long total = c.getContentLengthLong();
                try (InputStream in = c.getInputStream(); OutputStream out = new FileOutputStream(apk)) {
                    byte[] buf = new byte[64 * 1024];
                    long done = 0;
                    int n, last = -1;
                    while ((n = in.read(buf)) > 0) {
                        out.write(buf, 0, n);
                        done += n;
                        int pct = total > 0 ? (int) (done * 100 / total) : 50;
                        if (pct != last) { last = pct; activity.js("window.onUpdateProgress && window.onUpdateProgress(" + pct + ")"); }
                    }
                    // A cut-off download must never reach the installer.
                    if (total > 0 && done != total) throw new java.io.IOException("short download " + done + "/" + total);
                }
                activity.runOnUiThread(() -> {
                    if (canInstall()) install(apk);
                    else {
                        pendingApk = apk;
                        activity.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                                Uri.parse("package:" + activity.getPackageName())));
                    }
                });
            } catch (Exception e) {
                activity.report(e);
                activity.js("window.onUpdateError && window.onUpdateError('Не получилось скачать обновление, проверьте интернет')");
            }
        }).start();
    }

    private boolean canInstall() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.O || activity.getPackageManager().canRequestPackageInstalls();
    }

    /**
     * Hands the APK to Android through a PackageInstaller session. Passing a content:// link to
     * the installer instead fails on some phones (Realme/OPPO "Анализ не выполнен"), because their
     * installer scans the file and cannot read it through that link.
     */
    private void install(File apk) {
        new Thread(() -> {
            try {
                android.content.pm.PackageInstaller pi = activity.getPackageManager().getPackageInstaller();
                android.content.pm.PackageInstaller.SessionParams params = new android.content.pm.PackageInstaller.SessionParams(
                        android.content.pm.PackageInstaller.SessionParams.MODE_FULL_INSTALL);
                params.setAppPackageName(activity.getPackageName());
                params.setSize(apk.length());
                int id = pi.createSession(params);
                try (android.content.pm.PackageInstaller.Session session = pi.openSession(id)) {
                    try (InputStream in = new java.io.FileInputStream(apk);
                         OutputStream out = session.openWrite("base.apk", 0, apk.length())) {
                        byte[] buf = new byte[64 * 1024];
                        int n;
                        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                        session.fsync(out);
                    }
                    int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0);
                    PendingIntent done = PendingIntent.getBroadcast(activity, id,
                            new Intent(activity, InstallResult.class).setPackage(activity.getPackageName()), flags);
                    session.commit(done.getIntentSender());
                }
            } catch (Exception e) {
                activity.report(e);
                activity.js("window.onUpdateError && window.onUpdateError('Не получилось установить обновление')");
            }
        }).start();
    }
}
