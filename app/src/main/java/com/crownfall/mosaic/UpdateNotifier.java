package com.crownfall.mosaic;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

/**
 * Twice a day, with the game closed, asks the store whether a newer version exists (a fallback
 * for the Firebase push in PushService)
 * and shows a notification with what's new. Tapping it opens the game, which offers the update.
 */
public class UpdateNotifier extends JobService {
    private static final int JOB_ID = 42;
    private static final String CHANNEL = "updates";

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences("puzzlegrad", MODE_PRIVATE);
    }

    static void schedule(Context c) {
        JobScheduler js = (JobScheduler) c.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        if (js.getPendingJob(JOB_ID) != null) return;
        js.schedule(new JobInfo.Builder(JOB_ID, new ComponentName(c, UpdateNotifier.class))
                .setPeriodic(12 * 60 * 60 * 1000L)
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setPersisted(true)
                .build());
    }

    static void setEnabled(Context c, boolean on) {
        prefs(c).edit().putBoolean("notify", on).apply();
        PushService.subscribe(c, on);
    }

    /**
     * Shows the "new version" notification once per version, if the player allows it. A phone that was already told
     * about a version it has not installed yet gets no further update notifications (pushes go to a topic, so the
     * phone itself decides): they start again once the game is updated to at least that version.
     */
    static synchronized void announce(Context c, int code, String version, String notes) {
        int notified = prefs(c).getInt("notified", 0);
        if (!prefs(c).getBoolean("notify", true) || notified >= code || notified > BuildConfig.VERSION_CODE) return;
        if (show(c, version, notes)) prefs(c).edit().putInt("notified", code).apply();
    }

    @Override
    public boolean onStartJob(JobParameters params) {
        if (!prefs(this).getBoolean("notify", true)) return false;
        Updater.findUpdate(this, (code, version, notes) -> {
            if (code > 0) announce(this, code, version, notes);
            jobFinished(params, false);
        });
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters params) {
        return true;
    }

    static boolean show(Context c, String version, String notes) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return false;
        if (Build.VERSION.SDK_INT >= 24 && !nm.areNotificationsEnabled()) return false;
        if (Build.VERSION.SDK_INT >= 33 && c.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)
                != android.content.pm.PackageManager.PERMISSION_GRANTED) return false;
        if (Build.VERSION.SDK_INT >= 26) {
            nm.createNotificationChannel(new NotificationChannel(CHANNEL, "Обновления игры", NotificationManager.IMPORTANCE_DEFAULT));
            NotificationChannel channel = nm.getNotificationChannel(CHANNEL);
            if (channel != null && channel.getImportance() == NotificationManager.IMPORTANCE_NONE) return false;
        }
        PendingIntent open = PendingIntent.getActivity(c, 0, new Intent(c, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP), PendingIntent.FLAG_IMMUTABLE);
        String text = "Доступно новое обновление";
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, CHANNEL) : new Notification.Builder(c);
        try {
        nm.notify(1, b.setSmallIcon(R.drawable.ic_stat_update)
                .setContentTitle("Вышло обновление Tiletopia" + (version == null || version.isEmpty() ? "" : " " + version))
                .setContentText(text)
                .setStyle(new Notification.BigTextStyle().bigText(text))
                .setContentIntent(open)
                .setAutoCancel(true)
                .build());
        return true; // Submitted to Android, not proof of delivery or visibility.
        } catch (SecurityException denied) { return false; }
    }

    /** An announcement from the game's owner: its own channel, a new notification each time. */
    static void news(Context c, String title, String body) {
        if (title == null || title.isEmpty()) title = "Tiletopia";
        if (body == null) body = "";
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) {
            nm.createNotificationChannel(new NotificationChannel("news", "Новости игры", NotificationManager.IMPORTANCE_DEFAULT));
        }
        PendingIntent open = PendingIntent.getActivity(c, 0, new Intent(c, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP), PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, "news") : new Notification.Builder(c);
        nm.notify((int) (System.currentTimeMillis() / 1000), b.setSmallIcon(R.drawable.ic_stat_update)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new Notification.BigTextStyle().bigText(body))
                .setContentIntent(open)
                .setAutoCancel(true)
                .build());
    }

    interface Found {
        /** code is 0 when there is no newer version. */
        void found(int code, String version, String notes);
    }
}
