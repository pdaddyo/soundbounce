package org.soundbounce.soundbounce.tasks;

import android.annotation.SuppressLint;
import android.content.Context;
import android.os.AsyncTask;

import org.apache.http.HttpResponse;
import org.apache.http.NameValuePair;
import org.apache.http.auth.AuthScope;
import org.apache.http.auth.UsernamePasswordCredentials;
import org.apache.http.client.CredentialsProvider;
import org.apache.http.client.entity.UrlEncodedFormEntity;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.client.utils.URLEncodedUtils;
import org.apache.http.entity.InputStreamEntity;
import org.apache.http.impl.client.BasicCredentialsProvider;
import org.apache.http.impl.client.BasicResponseHandler;
import org.apache.http.impl.client.DefaultHttpClient;
import org.apache.http.message.BasicHeader;
import org.apache.http.message.BasicNameValuePair;
import org.apache.http.params.CoreProtocolPNames;
import org.soundbounce.soundbounce.activities.MainActivity;
import org.soundbounce.soundbounce.helpers.CustomLog;
import org.soundbounce.soundbounce.helpers.Utilities;
import org.soundbounce.soundbounce.interfaces.OnTaskCompletedInterface;

import java.io.File;
import java.io.FileInputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@SuppressLint("DefaultLocale")
public class HttpRequestAsyncTask extends AsyncTask<Object, Object, Boolean>
{
    // Used to write to the system log from this class.
    protected static final String LOG_TAG = "HttpRequestAsyncTask";
    protected Context mainContext;
    protected OnTaskCompletedInterface listener;
    protected String requestType;
    protected String requestURL;
    protected Object credentials;
    protected Object parameters;
    protected Object headers;
    protected String callbackTag;
    protected Integer timeout;
    protected String responseString;
    protected HttpPost httpPost;
    protected HttpGet httpGet;
    protected HttpResponse httpResponse;
    protected boolean requestTypeGet = false;
    protected boolean requestTypePost = false;
    protected List<NameValuePair> parameterNameValuePairs = new ArrayList<NameValuePair>();
    protected String filePath;

    public HttpRequestAsyncTask(Context mainContext, OnTaskCompletedInterface listener, String callbackTag, String requestType, String requestURL, Integer timeout, Object credentials, Object headers, Object parameters, String filePath)
    {

        this.mainContext = mainContext;
        this.listener = listener;
        this.callbackTag = callbackTag;
        this.timeout = timeout;
        this.requestType = requestType;
        this.requestURL = requestURL;
        this.credentials = credentials;
        this.headers = headers;
        this.parameters = parameters;
        this.filePath = filePath;

        CustomLog.d(LOG_TAG, "HttpRequestAsyncTask initialised with credentials: " + String.valueOf(credentials) + ", headers: " + String.valueOf(headers) + ", parameters: " + String.valueOf(parameters) + " and context class: " + mainContext.getClass());
    }

    @SuppressWarnings("unchecked")
    public HashMap<String, String> getParameters()
    {
        return (HashMap<String, String>) parameters;
    }

    @Override
    @SuppressWarnings("unchecked")
    protected Boolean doInBackground(Object... args)
    {

        CustomLog.d(LOG_TAG, "Inside doInBackground, making " + requestType + " request to URL: " + requestURL + " with timeout: " + timeout);

        try
        {
            // Start HTTP Client to make request
            DefaultHttpClient httpClient = new DefaultHttpClient();

            // Set HTTP user agent, applicable for all requests
            httpClient.getParams().setParameter(CoreProtocolPNames.USER_AGENT, MainActivity.getInstance().getUserAgentString());

            // Set HTTP timeout for request, should be applicable for all requests but check for null anyway
            if (timeout != null)
            {
                httpClient.getParams().setParameter("http.socket.timeout", timeout);
                httpClient.getParams().setParameter("http.connection.timeout", timeout);
            }

            // Set HTTP Basic Auth credentials if they have been provided
            if (credentials != null)
            {
                HashMap<String, String> credentialsHashMap = (HashMap<String, String>) credentials;

                String username = credentialsHashMap.get("username");
                String password = credentialsHashMap.get("password");
                CustomLog.d(LOG_TAG, "Credentials provided for HTTP Basic Auth; username = " + username + ", password = " + password);

                CredentialsProvider credProvider = new BasicCredentialsProvider();
                credProvider.setCredentials(
                        new AuthScope(AuthScope.ANY_HOST, AuthScope.ANY_PORT),
                        new UsernamePasswordCredentials(username, password)
                );
                httpClient.setCredentialsProvider(credProvider);
            }

            // Check specified HTTP request type
            if (Utilities.compare(requestType.toUpperCase(), "GET"))
            {
                requestTypeGet = true;
                requestTypePost = false;
            }
            else if (Utilities.compare(requestType.toUpperCase(), "POST"))
            {
                requestTypeGet = false;
                requestTypePost = true;
            }
            else
            {
                responseString = "Incorrect HTTP request type specified.";
                return false;
            }

            // Build parameter pairs if they have been provided            
            if (parameters != null)
            {
                HashMap<String, String> parametersHashMap = (HashMap<String, String>) parameters;

                for (Object parameterObject : parametersHashMap.entrySet())
                {
                    Map.Entry<String, String> parameterEntry = (Map.Entry<String, String>) parameterObject;

                    String name = String.valueOf(parameterEntry.getKey());
                    String value = String.valueOf(parameterEntry.getValue());
                    CustomLog.d(LOG_TAG, "Adding HTTP parameter name value pair; name = " + name + ", value = " + value);

                    parameterNameValuePairs.add(new BasicNameValuePair(name, value));
                }

                // Add parameter pairs to GET request URL if they have been provided
                if (requestTypeGet)
                {
                    String parameterString = URLEncodedUtils.format(parameterNameValuePairs, "utf-8");
                    requestURL += "?" + parameterString;
                }
            }

            // Create HTTP request of specified type
            if (requestTypeGet)
            {
                // This HTTP GET request is now complete, as we added the parameters to the URL earlier
                httpGet = new HttpGet(requestURL);

                // Set header pairs if they have been provided
                if (headers != null)
                {
                    CustomLog.d(LOG_TAG, "headers was not null, string value: " + String.valueOf(headers));

                    HashMap<String, String> headersHashMap = (HashMap<String, String>) headers;

                    for (Object headerObject : headersHashMap.entrySet())
                    {
                        Map.Entry<String, String> headerEntry = (Map.Entry<String, String>) headerObject;

                        String name = String.valueOf(headerEntry.getKey());
                        String value = String.valueOf(headerEntry.getValue());
                        CustomLog.d(LOG_TAG, "Adding HTTP header name value pair; name = " + name + ", value = " + value);

                        httpGet.addHeader(new BasicHeader(name, value));
                    }
                }
                else
                {
                    CustomLog.d(LOG_TAG, "headers was null, string value: " + String.valueOf(headers));
                }

                // Execute HTTP request
                httpResponse = httpClient.execute(httpGet);
            }
            else if (requestTypePost)
            {
                httpPost = new HttpPost(requestURL);

                // Add any specified parameters to POSt request
                if (parameters != null)
                {
                    httpPost.setEntity(new UrlEncodedFormEntity(parameterNameValuePairs));
                }

                // Set header pairs if they have been provided
                if (headers != null)
                {
                    HashMap<String, String> headersHashMap = (HashMap<String, String>) headers;

                    for (Object headerObject : headersHashMap.entrySet())
                    {
                        Map.Entry<String, String> headerEntry = (Map.Entry<String, String>) headerObject;

                        String name = String.valueOf(headerEntry.getKey());
                        String value = String.valueOf(headerEntry.getValue());
                        CustomLog.d(LOG_TAG, "Adding HTTP header name value pair; name = " + name + ", value = " + value);

                        httpPost.addHeader(new BasicHeader(name, value));
                    }
                }

                // Add contents of file as POST request entity if specified
                if (filePath != null)
                {
                    File uploadFile = new File(filePath);
                    InputStreamEntity reqEntity = new InputStreamEntity(new FileInputStream(uploadFile), uploadFile.length());
                    reqEntity.setContentType("binary/octet-stream");
                    httpPost.setEntity(reqEntity);
                }

                // Execute HTTP request
                httpResponse = httpClient.execute(httpPost);
            }

            responseString = new BasicResponseHandler().handleResponse(httpResponse);
            return true;
        } catch (Exception e)
        {
            responseString = e.getMessage();
            return false;
        }
    }

    @Override
    protected void onPostExecute(Boolean returnStatus)
    {

        CustomLog.d(LOG_TAG, "onPostExecute, returnStatus = " + String.valueOf(returnStatus));

        listener.onTaskCompleted(this, callbackTag, returnStatus, responseString);
    }

}