package com.crownfall.mosaic;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;

/** Result of an update install in staging: asks the player to confirm, or tells the game what went wrong. */
public class InstallResult extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
        if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            Intent confirm = intent.getParcelableExtra(Intent.EXTRA_INTENT);
            if (confirm != null) context.startActivity(confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            return;
        }
        if (status == PackageInstaller.STATUS_SUCCESS) return;
        String msg = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE);
        MainActivity game = MainActivity.visible();
        if (game != null) {
            game.report(new RuntimeException("Update install failed: " + status + " " + msg));
            String text = status == PackageInstaller.STATUS_FAILURE_ABORTED ? "Установка отменена"
                    : status == PackageInstaller.STATUS_FAILURE_STORAGE ? "Не хватает места на телефоне"
                    : status == PackageInstaller.STATUS_FAILURE_CONFLICT ? "Конфликт с установленной версией"
                    : "Не получилось установить обновление";
            game.js("window.onUpdateError && window.onUpdateError('" + text + "', true)");
        }
    }
}
