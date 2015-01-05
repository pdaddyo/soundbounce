package org.soundbounce.soundbounce;

import android.app.Application;

import org.acra.ACRA;
import org.acra.ReportingInteractionMode;
import org.acra.annotation.ReportsCrashes;

@ReportsCrashes(
        formKey = "",
        httpMethod = org.acra.sender.HttpSender.Method.PUT,
        reportType = org.acra.sender.HttpSender.Type.JSON,
        formUri = "http://couch.andrewbeveridge.co.uk/acra-soundbounce/_design/acra-storage/_update/report",
        formUriBasicAuthLogin = "acrasoundbounce",
        formUriBasicAuthPassword = "acrasoundbounce",
        // Your usual ACRA configuration
        mode = ReportingInteractionMode.TOAST,
        resToastText = R.string.crash_toast_text
)

public class SoundbounceApplication extends Application {
    private static SoundbounceApplication singleton;

    public static SoundbounceApplication getInstance() {
        return singleton;
    }

    @Override
    public void onCreate() {
        // The following line triggers the initialization of ACRA
        super.onCreate();
        ACRA.init(this);

        // Set up singleton pattern with this instance
        singleton = this;
    }
}