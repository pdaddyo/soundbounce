package org.soundbounce.soundbounce.interfaces;

import android.os.AsyncTask;

public interface OnTaskCompletedInterface
{
    void onTaskCompleted(AsyncTask<Object, Object, Boolean> thisTask, String callbackTag, Boolean returnStatus, String responseString);
}