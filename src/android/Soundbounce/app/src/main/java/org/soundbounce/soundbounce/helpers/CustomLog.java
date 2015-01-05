package org.soundbounce.soundbounce.helpers;

import android.util.Log;

import java.io.PrintWriter;
import java.io.StringWriter;

/**
 * The type Custom log.
 */
public class CustomLog
{
    /**
     * The LOG_TAG for log entries written from here... these should only ever occur if there is a filesystem issue
     */
    public static final String LOG_TAG = "CustomLog";

    /**
     * Write WARNING log level message to file and system log
     *
     * @param TAG     the TAG
     * @param message the message
     */
    public static void w(String TAG, String message)
    {
        // Print log entry message to LogCat console as normal
        Log.w("SB." + TAG, message);
    }

    /**
     * Write INFO log level message to file and system log
     *
     * @param TAG     the TAG
     * @param message the message
     */
    public static void i(String TAG, String message)
    {
        // Print log entry message to LogCat console as normal
        Log.i("SB." + TAG, message);
    }

    /**
     * Write DEBUG log level message to file and system log
     *
     * @param TAG     the TAG
     * @param message the message
     */
    public static void d(String TAG, String message)
    {
        // Print log entry message to LogCat console as normal
        Log.d("SB." + TAG, message);
    }

    /**
     * Write ERROR log level message to file and system log
     *
     * @param TAG     the TAG
     * @param message the message
     */
    public static void e(String TAG, String message)
    {
        // Print log entry message to LogCat console as normal
        Log.e("SB." + TAG, message);
    }

    /**
     * Write VERBOSE log level message to file and system log
     *
     * @param TAG     the TAG
     * @param message the message
     */
    public static void v(String TAG, String message)
    {
        // Print log entry message to LogCat console as normal
        Log.v("SB." + TAG, message);
    }

    /**
     * Exception void.
     *
     * @param TAG the tAG
     * @param e   the e
     */
    public static void exception(String TAG, Throwable e)
    {
        CustomLog.callingMethod(LOG_TAG);

        String exceptionErrorString = "Throwable caught, printing stack trace! Class: " + e.getClass() + " Message: " + e.getMessage();
        CustomLog.w(TAG, exceptionErrorString);
        
        StringWriter sw = new StringWriter();
        PrintWriter pw = new PrintWriter(sw);
        e.printStackTrace(pw);
        
        CustomLog.w(TAG, sw.toString());
    }
    
    public static void callingMethod(String TAG)
    {
        StackTraceElement[] stackTraceElements = Thread.currentThread().getStackTrace();
        StackTraceElement methodAboutToRun = stackTraceElements[3];
        StackTraceElement methodWhichCalledIt = stackTraceElements[4];
        
        String callingMethodString = "In method: " + methodAboutToRun.getMethodName() + ", called by: " + methodWhichCalledIt.getMethodName();

        CustomLog.d(TAG, callingMethodString);
    }
}
