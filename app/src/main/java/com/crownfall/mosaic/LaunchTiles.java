package com.crownfall.mosaic;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Rect;
import android.os.Build;
import android.provider.Settings;
import android.view.View;
import android.view.animation.PathInterpolator;
import android.widget.FrameLayout;
import android.widget.ImageView;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;

/** Nine small display lists sample the same texture. Android animates only their transforms. */
final class LaunchTiles extends FrameLayout {
    private final ImageView finished;
    private final float motionScale;
    private int sceneWidth, sceneHeight, duration, lastDelay;
    private boolean started, settled;
    private Runnable onSettled;
    private final Runnable settle = this::finish;
    private final Runnable startMotion = this::animatePieces;

    LaunchTiles(Context context) {
        super(context);
        setClipChildren(false);
        setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);
        finished = new ImageView(context);
        finished.setScaleType(ImageView.ScaleType.FIT_XY);
        try (InputStream input = context.getAssets().open("launch-cover.webp")) {
            finished.setImageBitmap(BitmapFactory.decodeStream(input));
        } catch (IOException ignored) {
            finished.setImageDrawable(context.getApplicationInfo().loadIcon(context.getPackageManager()));
        }
        addView(finished, new LayoutParams(-1, -1));
        motionScale = Build.VERSION.SDK_INT >= 26 && !ValueAnimator.areAnimatorsEnabled() ? 0
                : Settings.Global.getFloat(context.getContentResolver(),
                Settings.Global.ANIMATOR_DURATION_SCALE, 1f);
        if (motionScale <= 0) {
            settled = true;
            return;
        }
        try (InputStream meta = context.getAssets().open("splash-tiles.json");
             InputStream image = context.getAssets().open("splash-tiles.webp")) {
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            byte[] chunk = new byte[2048];
            int count;
            while ((count = meta.read(chunk)) != -1) bytes.write(chunk, 0, count);
            JSONObject scene = new JSONObject(bytes.toString("UTF-8"));
            Bitmap atlas = BitmapFactory.decodeStream(image);
            if (atlas == null) throw new IOException("Invalid splash atlas");
            sceneWidth = scene.getJSONArray("size").getInt(0);
            sceneHeight = scene.getJSONArray("size").getInt(1);
            duration = scene.getInt("duration");
            JSONArray tiles = scene.getJSONArray("tiles");
            for (int i = 0; i < tiles.length(); i++) {
                Piece piece = new Piece(context, atlas, tiles.getJSONObject(i));
                lastDelay = Math.max(lastDelay, piece.delay);
                addView(piece);
            }
            finished.setVisibility(INVISIBLE);
        } catch (IOException | JSONException ignored) {
            finish();
        }
    }

    boolean usesMotion() {
        return motionScale > 0;
    }

    void whenSettled(Runnable action) {
        onSettled = action;
        if (settled && action != null) {
            onSettled = null;
            action.run();
        }
    }

    @Override protected void onLayout(boolean changed, int left, int top, int right, int bottom) {
        finished.layout(0, 0, getWidth(), getHeight());
        if (settled) return;
        float sx = getWidth() / (float) sceneWidth, sy = getHeight() / (float) sceneHeight;
        for (int i = 1; i < getChildCount(); i++) {
            Piece p = (Piece) getChildAt(i);
            p.layout(Math.round(p.x * sx), Math.round(p.y * sy),
                    Math.round((p.x + p.source.width()) * sx), Math.round((p.y + p.source.height()) * sy));
            if (!started) {
                p.setTranslationX(p.dx * sx);
                p.setTranslationY(p.dy * sy);
                p.setAlpha(.18f);
            }
        }
        if (!started) {
            started = true;
            // Let the system splash expose this view before it consumes the animation's first frames.
            postOnAnimationDelayed(startMotion, 100);
        }
    }

    private void animatePieces() {
        for (int i = 1; i < getChildCount(); i++) {
            Piece p = (Piece) getChildAt(i);
            p.animate().translationX(0f).translationY(0f).alpha(1f)
                    .setInterpolator(EASING).setDuration(duration).setStartDelay(p.delay).start();
        }
        postDelayed(settle, Math.round((duration + lastDelay) * motionScale) + 32L);
    }

    private void finish() {
        settled = true;
        finished.setVisibility(VISIBLE);
        if (getChildCount() > 1) removeViews(1, getChildCount() - 1);
        whenSettled(onSettled);
    }

    @Override protected void onDetachedFromWindow() {
        removeCallbacks(startMotion);
        removeCallbacks(settle);
        onSettled = null;
        super.onDetachedFromWindow();
    }

    private static final PathInterpolator EASING = new PathInterpolator(.18f, .72f, .22f, 1f);
    private static final class Piece extends View {
        final Bitmap atlas;
        final Rect source, destination = new Rect();
        final Paint paint = new Paint(Paint.FILTER_BITMAP_FLAG);
        final int x, y, dx, dy, delay;

        Piece(Context context, Bitmap atlas, JSONObject tile) throws JSONException {
            super(context);
            this.atlas = atlas;
            JSONArray f = tile.getJSONArray("frame");
            source = new Rect(f.getInt(0), f.getInt(1), f.getInt(0) + f.getInt(2), f.getInt(1) + f.getInt(3));
            JSONArray anchor = tile.getJSONArray("anchor"), travel = tile.getJSONArray("travel");
            x = anchor.getInt(0);
            y = anchor.getInt(1);
            dx = travel.getInt(0);
            dy = travel.getInt(1);
            delay = tile.getInt("delay");
        }

        @Override protected void onDraw(Canvas canvas) {
            destination.set(0, 0, getWidth(), getHeight());
            canvas.drawBitmap(atlas, source, destination, paint);
        }
    }
}
