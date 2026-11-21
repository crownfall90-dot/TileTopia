package com.crownfall.mosaic;

import android.content.Context;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.graphics.Typeface;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.ForegroundColorSpan;
import android.util.TypedValue;
import android.view.Gravity;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.io.IOException;
import java.io.InputStream;

/** Shows the launch art while Android starts the WebView renderer. */
final class LaunchCover extends LinearLayout {
    private final ImageView art;
    private final TextView name;
    private final GradientDrawable background;

    LaunchCover(Context context) {
        super(context);
        setOrientation(VERTICAL);
        setGravity(Gravity.CENTER);
        setClickable(true);
        background = new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM,
                new int[]{0xFF293D56, 0xFF18263E, 0xFF101729});
        background.setGradientType(GradientDrawable.RADIAL_GRADIENT);
        background.setGradientCenter(.5f, .39f);
        setBackground(background);

        art = new ImageView(context);
        art.setScaleType(ImageView.ScaleType.FIT_CENTER);
        art.setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);
        try (InputStream stream = context.getAssets().open("launch-cover.webp")) {
            art.setImageDrawable(Drawable.createFromStream(stream, null));
        } catch (IOException ignored) {
            art.setImageDrawable(context.getApplicationInfo().loadIcon(context.getPackageManager()));
        }
        addView(art, new LayoutParams(0, 0));

        name = new TextView(context);
        SpannableString title = new SpannableString("Tiletopia");
        title.setSpan(new ForegroundColorSpan(0xFFF2BF70), 4, title.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        name.setText(title);
        name.setTextColor(0xFFFFEFCE);
        name.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        name.setGravity(Gravity.CENTER);
        addView(name, new LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT));

        TextView status = new TextView(context);
        status.setText(R.string.launch_preparing);
        status.setTextColor(0xFFC1CCE0);
        status.setTextSize(TypedValue.COMPLEX_UNIT_DIP, 13);
        LayoutParams statusParams = new LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT);
        statusParams.topMargin = dp(12);
        addView(status, statusParams);
    }

    private int dp(float value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    @Override
    protected void onMeasure(int widthSpec, int heightSpec) {
        int width = MeasureSpec.getSize(widthSpec);
        int height = MeasureSpec.getSize(heightSpec);
        boolean compact = height <= dp(480);
        int artWidth = compact ? Math.min(dp(280), Math.min(width * 65 / 100, height * 46 / 100))
                : Math.min(dp(360), width * 89 / 100);
        LayoutParams params = (LayoutParams) art.getLayoutParams();
        params.width = artWidth;
        params.height = artWidth * 443 / 576;
        float titleSize = Math.min(dp(compact ? 46 : 54), (compact ? height * .095f : width * .105f));
        if (name.getTextSize() != titleSize) name.setTextSize(TypedValue.COMPLEX_UNIT_PX, titleSize);
        background.setGradientRadius(Math.max(1, height * .55f));
        super.onMeasure(widthSpec, heightSpec);
    }
}
