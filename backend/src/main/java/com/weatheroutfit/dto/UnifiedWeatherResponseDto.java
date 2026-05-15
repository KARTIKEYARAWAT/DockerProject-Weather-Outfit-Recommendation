package com.weatheroutfit.dto;

import java.util.ArrayList;
import java.util.List;

/**
 * Unified DTO that represents the weather response consumed by the frontend.
 * It aggregates current weather, hourly forecast (next 24h) and daily forecast (next 7 days).
 */
public class UnifiedWeatherResponseDto {

    /** Current weather fields */
    public static class CurrentWeather {
        private String city;
        private double temperature;
        private double feelsLike;
        private int humidity;
        private double windSpeed;
        private String condition;
        private double visibility; // metres, may be 0 if not provided
        private long sunrise; // epoch seconds (UTC)
        private long sunset;  // epoch seconds (UTC)
        private long timestamp; // epoch seconds (UTC) of the data point
        private int timezoneOffset; // seconds offset from UTC for the location

        // getters & setters
        public String getCity() { return city; }
        public void setCity(String city) { this.city = city; }
        public double getTemperature() { return temperature; }
        public void setTemperature(double temperature) { this.temperature = temperature; }
        public double getFeelsLike() { return feelsLike; }
        public void setFeelsLike(double feelsLike) { this.feelsLike = feelsLike; }
        public int getHumidity() { return humidity; }
        public void setHumidity(int humidity) { this.humidity = humidity; }
        public double getWindSpeed() { return windSpeed; }
        public void setWindSpeed(double windSpeed) { this.windSpeed = windSpeed; }
        public String getCondition() { return condition; }
        public void setCondition(String condition) { this.condition = condition; }
        public double getVisibility() { return visibility; }
        public void setVisibility(double visibility) { this.visibility = visibility; }
        public long getSunrise() { return sunrise; }
        public void setSunrise(long sunrise) { this.sunrise = sunrise; }
        public long getSunset() { return sunset; }
        public void setSunset(long sunset) { this.sunset = sunset; }
        public long getTimestamp() { return timestamp; }
        public void setTimestamp(long timestamp) { this.timestamp = timestamp; }
        public int getTimezoneOffset() { return timezoneOffset; }
        public void setTimezoneOffset(int timezoneOffset) { this.timezoneOffset = timezoneOffset; }
    }

    /** Hourly forecast entry (one hour) */
    public static class HourlyEntry {
        private long time; // epoch seconds (UTC)
        private double temperature;
        private double feelsLike;
        private int humidity;
        private String condition;
        private String icon; // optional Open-Meteo weathercode icon mapping can be added later

        // getters & setters
        public long getTime() { return time; }
        public void setTime(long time) { this.time = time; }
        public double getTemperature() { return temperature; }
        public void setTemperature(double temperature) { this.temperature = temperature; }
        public double getFeelsLike() { return feelsLike; }
        public void setFeelsLike(double feelsLike) { this.feelsLike = feelsLike; }
        public int getHumidity() { return humidity; }
        public void setHumidity(int humidity) { this.humidity = humidity; }
        public String getCondition() { return condition; }
        public void setCondition(String condition) { this.condition = condition; }
        public String getIcon() { return icon; }
        public void setIcon(String icon) { this.icon = icon; }
    }

    /** Daily forecast entry (one day) */
    public static class DailyEntry {
        private long date; // epoch seconds for the day's start (UTC)
        private double minTemp;
        private double maxTemp;
        private String condition;
        private String icon; // optional

        // getters & setters
        public long getDate() { return date; }
        public void setDate(long date) { this.date = date; }
        public double getMinTemp() { return minTemp; }
        public void setMinTemp(double minTemp) { this.minTemp = minTemp; }
        public double getMaxTemp() { return maxTemp; }
        public void setMaxTemp(double maxTemp) { this.maxTemp = maxTemp; }
        public String getCondition() { return condition; }
        public void setCondition(String condition) { this.condition = condition; }
        public String getIcon() { return icon; }
        public void setIcon(String icon) { this.icon = icon; }
    }

    private CurrentWeather current = new CurrentWeather();
    private List<HourlyEntry> hourly = new ArrayList<>();
    private List<DailyEntry> daily = new ArrayList<>();

    public CurrentWeather getCurrent() { return current; }
    public void setCurrent(CurrentWeather current) { this.current = current; }
    public List<HourlyEntry> getHourly() { return hourly; }
    public void setHourly(List<HourlyEntry> hourly) { this.hourly = hourly; }
    public List<DailyEntry> getDaily() { return daily; }
    public void setDaily(List<DailyEntry> daily) { this.daily = daily; }
}
