package org.soundbounce.soundbounce;

import android.app.Application;

import org.acra.ACRA;
import org.acra.ReportField;
import org.acra.ReportingInteractionMode;
import org.acra.annotation.ReportsCrashes;

@ReportsCrashes(
        mode = ReportingInteractionMode.DIALOG,
        resToastText = R.string.crash_toast_text, // optional, displayed as soon as the crash occurs, before collecting data which can take a few seconds
        resDialogText = R.string.crash_dialog_text,
        resDialogIcon = android.R.drawable.ic_dialog_info, //optional. default is a warning sign
        resDialogTitle = R.string.crash_dialog_title, // optional. default is your application name
        resDialogCommentPrompt = R.string.crash_dialog_comment_prompt, // optional. when defined, adds a user text field input with this text resource as a label
        resDialogOkToast = R.string.crash_dialog_ok_toast, // optional. displays a Toast message when the user accepts to send a report.

        customReportContent = {
                ReportField.ANDROID_VERSION,
                ReportField.APP_VERSION_CODE,
                ReportField.APP_VERSION_NAME,
                ReportField.AVAILABLE_MEM_SIZE,
                ReportField.BRAND,
                ReportField.BUILD,
                ReportField.CRASH_CONFIGURATION,
                ReportField.CUSTOM_DATA,
                ReportField.DEVICE_FEATURES,
                ReportField.DEVICE_ID,
                ReportField.DISPLAY,
                ReportField.ENVIRONMENT,
                ReportField.FILE_PATH,
                ReportField.INITIAL_CONFIGURATION,
                ReportField.INSTALLATION_ID,
                ReportField.IS_SILENT,
                ReportField.LOGCAT,
                ReportField.PACKAGE_NAME,
                ReportField.PHONE_MODEL,
                ReportField.PRODUCT,
                ReportField.REPORT_ID,
                ReportField.SETTINGS_GLOBAL,
                ReportField.SETTINGS_SECURE,
                ReportField.SETTINGS_SYSTEM,
                ReportField.SHARED_PREFERENCES,
                ReportField.STACK_TRACE,
                ReportField.THREAD_DETAILS,
                ReportField.TOTAL_MEM_SIZE,
                ReportField.USER_APP_START_DATE,
                ReportField.USER_COMMENT,
                ReportField.USER_CRASH_DATE,
                ReportField.USER_EMAIL
        },

        httpMethod = org.acra.sender.HttpSender.Method.PUT,
        reportType = org.acra.sender.HttpSender.Type.JSON,
        formUri = "http://couch.andrewbeveridge.co.uk/acra-soundbounce/_design/acra-storage/_update/report",
        formUriBasicAuthLogin = "acrasoundbounce",
        formUriBasicAuthPassword = "acrasoundbounce",
        logcatArguments = { "-t", "2000", "-v", "time" }
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