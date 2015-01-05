package org.soundbounce.soundbounce.helpers;

import java.io.File;
import java.math.BigDecimal;

public class Utilities
{
    public static final String LOG_TAG = "Utilities";

    public static void directoryPathCreate(String directoryPath)
    {

        if (stringIsNotEmpty(directoryPath))
        {
            File directory = new File(directoryPath);

            if (!directory.isDirectory())
            {
                directory.mkdirs();
            }
        }
    }

    // Make a string Proper Case
    public static String capitalize(String s)
    {

        if (stringIsEmpty(s))
        {
            return "";
        }
        char first = s.charAt(0);
        if (Character.isUpperCase(first))
        {
            return s;
        }
        else
        {
            return Character.toUpperCase(first) + s.substring(1);
        }
    }

    public static double round(double unrounded, int precision, int roundingMode)
    {

        BigDecimal bd = new BigDecimal(unrounded);
        BigDecimal rounded = bd.setScale(precision, roundingMode);
        return rounded.doubleValue();
    }

    public static boolean compare(Object obj1, Object obj2)
    {

        return (obj1 == null ? obj2 == null : obj1.equals(obj2));
    }

    public static boolean insensitiveCompare(String str1, String str2)
    {

        return (str1 == null ? str2 == null : str1.toLowerCase().equals(str2.toLowerCase()));
    }

    public static boolean insensitiveContains(String str1, String str2)
    {

        return str1.toLowerCase().contains(str2.toLowerCase());
    }

    public static boolean stringIsEmpty(Object inputObject)
    {

        if (inputObject == null)
        {
            return true;
        }

        if (inputObject instanceof String)
        {
            String stringObject = (String) inputObject;
            return stringObject.isEmpty();
        }

        return true;
    }

    public static boolean stringIsNotEmpty(Object inputObject)
    {

        return (!Utilities.stringIsEmpty(inputObject));
    }
}