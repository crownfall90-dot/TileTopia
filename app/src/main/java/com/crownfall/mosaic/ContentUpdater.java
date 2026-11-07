package com.crownfall.mosaic;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Base64;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.MessageDigest;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;

/**
 * Game updates over the air, as live games do: the game itself (index.html, the whole web game in one file) can be
 * replaced without a new APK. The APK keeps its own copy, so the game always starts even offline or if anything here fails.
 *
 * - Every release publishes web.json ({code, minApp, size, sha256, sig, url}) and the page it names. sig is an ECDSA
 *   P-256 signature (SHA256withECDSA) of "code\nminApp\nsha256" made in CI with the owner's private key; the app checks
 *   it with PUBLIC_KEY below, then the page's size and SHA-256. Nothing unsigned ever runs.
 * - A newer page is downloaded in the background and used from the next start. minApp: the oldest APK whose
 *   native side (the AndroidApp bridge) the page needs; older APKs keep their own page and are offered the APK update.
 * - Safety net: a page must call AndroidApp.contentReady() when it has started. If it does not within READY_MS, or a
 *   start of it is cut off twice, it is marked bad, removed, and the APK's own page is loaded at once.
 */
final class ContentUpdater {
    /** The owner's public key (X.509 DER, base64); its private half is the CI secret OTA_SIGNING_KEY (PEM). Empty: off.
     *  New pair: openssl ecparam -genkey -name prime256v1 -noout -out ota.pem;
     *  openssl ec -in ota.pem -pubout -outform DER | base64 -w0 (a new key needs a new APK). */
    static final String PUBLIC_KEY = "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE2VZZUxV9LrvJxadDxRSP81X+r8iN5ADf0FeJwq7l+Gav6bYhO+OdEXbxZiVQA89UDr1EevwQ3a/YKlgVnfkWUA==";
    static final long READY_MS = 25_000;
    static final String BUNDLED = "file:///android_asset/index.html";

    private final Context ctx;
    private final SharedPreferences prefs;
    private final File dir;
    /** The code of the page loaded now (0: the APK's own). */
    int loaded = 0;

    ContentUpdater(Context c) {
        ctx = c.getApplicationContext();
        prefs = ctx.getSharedPreferences("ota", Context.MODE_PRIVATE);
        dir = new File(ctx.getFilesDir(), "web");
    }

    private static boolean staging() {
        return BuildConfig.APPLICATION_ID.endsWith(".test");
    }

    private static String manifestUrl() {
        String repo = "https://github.com/crownfall90-dot/TileTopia/releases/";
        return (staging() ? repo + "download/staging-latest/web-staging.json" : repo + "latest/download/web.json") + "?t=" + System.currentTimeMillis();
    }

    /** The page to start with: the newest good downloaded one, or null for the APK's own. Promotes a waiting download. */
    String pageToLoad() {
        try {
            File next = new File(dir, "next.html"), nextMeta = new File(dir, "next.json");
            if (next.exists() && nextMeta.exists()) {
                File cur = new File(dir, "index.html"), curMeta = new File(dir, "index.json");
                cur.delete(); curMeta.delete();
                if (!next.renameTo(cur) || !nextMeta.renameTo(curMeta)) { clear(); return null; }
            }
            File page = new File(dir, "index.html"), meta = new File(dir, "index.json");
            if (PUBLIC_KEY.isEmpty() || !page.exists() || !meta.exists()) return null;
            JSONObject m = new JSONObject(read(meta));
            int code = m.getInt("code");
            if (code <= BuildConfig.VERSION_CODE || m.getInt("minApp") > BuildConfig.VERSION_CODE || code == prefs.getInt("bad", -1)) { clear(); return null; }
            if (!sha256(readBytes(page)).equals(m.getString("sha256"))) { clear(); return null; }
            // a start of this page that never reported back counts as a failed start; two of them and it is dropped
            if (prefs.getInt("ok", -1) != code) {
                int tries = prefs.getInt("tries", 0) + 1;
                if (tries > 2) { markBad(code); return null; }
                prefs.edit().putInt("tries", tries).apply();
            }
            loaded = code;
            return read(page);
        } catch (Exception e) {
            clear();
            return null;
        }
    }

    /** The page started (AndroidApp.contentReady): it is good. */
    void ready() {
        if (loaded > 0) prefs.edit().putInt("ok", loaded).putInt("tries", 0).apply();
    }

    /** The page did not start in time: drop it. */
    void markBad(int code) {
        prefs.edit().putInt("bad", code).putInt("tries", 0).apply();
        clear();
    }

    private void clear() {
        for (String f : new String[]{"index.html", "index.json", "next.html", "next.json"}) new File(dir, f).delete();
    }

    /** Looks for a newer page and downloads it for the next start (background thread). */
    void checkInBackground() {
        if (PUBLIC_KEY.isEmpty()) return;
        new Thread(() -> {
            try {
                JSONObject m = new JSONObject(new String(get(manifestUrl(), 64 * 1024), StandardCharsets.UTF_8));
                int code = m.getInt("code"), minApp = m.getInt("minApp");
                int have = Math.max(BuildConfig.VERSION_CODE, Math.max(loaded, waiting()));
                if (code <= have || minApp > BuildConfig.VERSION_CODE || code == prefs.getInt("bad", -1)) return;
                String sha = m.getString("sha256");
                if (!verify(code + "\n" + minApp + "\n" + sha, m.getString("sig"))) return;
                String url = m.getString("url");
                if (!url.startsWith("https://github.com/crownfall90-dot/TileTopia/releases/")) return;
                byte[] page = get(url, 12 * 1024 * 1024);
                if (page.length != m.getInt("size") || !sha256(page).equals(sha)) return;
                if (!dir.exists() && !dir.mkdirs()) return;
                File tmp = new File(dir, "next.part");
                try (FileOutputStream o = new FileOutputStream(tmp)) { o.write(page); }
                JSONObject meta = new JSONObject().put("code", code).put("minApp", minApp).put("sha256", sha);
                try (FileOutputStream o = new FileOutputStream(new File(dir, "next.json"))) { o.write(meta.toString().getBytes(StandardCharsets.UTF_8)); }
                if (!tmp.renameTo(new File(dir, "next.html"))) new File(dir, "next.json").delete();
            } catch (Exception ignored) {
                // no internet, no release yet, or a bad file: the game plays on as it is
            }
        }).start();
    }

    private int waiting() {
        try {
            File m = new File(dir, "next.json");
            return m.exists() ? new JSONObject(read(m)).getInt("code") : 0;
        } catch (Exception e) {
            return 0;
        }
    }

    static boolean verify(String data, String sigB64) {
        try {
            PublicKey k = KeyFactory.getInstance("EC").generatePublic(new X509EncodedKeySpec(Base64.decode(PUBLIC_KEY, Base64.DEFAULT)));
            Signature s = Signature.getInstance("SHA256withECDSA");
            s.initVerify(k);
            s.update(data.getBytes(StandardCharsets.UTF_8));
            return s.verify(Base64.decode(sigB64, Base64.DEFAULT));
        } catch (Exception e) {
            return false;
        }
    }

    static String sha256(byte[] b) throws Exception {
        StringBuilder sb = new StringBuilder();
        for (byte x : MessageDigest.getInstance("SHA-256").digest(b)) sb.append(String.format("%02x", x));
        return sb.toString();
    }

    private static byte[] get(String url, int max) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(10_000);
        c.setReadTimeout(20_000);
        c.setInstanceFollowRedirects(true);
        try (InputStream in = c.getInputStream(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[16384];
            int n;
            while ((n = in.read(buf)) > 0) {
                out.write(buf, 0, n);
                if (out.size() > max) throw new java.io.IOException("too big");
            }
            return out.toByteArray();
        } finally {
            c.disconnect();
        }
    }

    private static byte[] readBytes(File f) throws Exception {
        try (InputStream in = new java.io.FileInputStream(f); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[16384];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return out.toByteArray();
        }
    }

    private static String read(File f) throws Exception {
        return new String(readBytes(f), StandardCharsets.UTF_8);
    }
}
