package com.weatheroutfit.service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.weatheroutfit.dto.UnifiedWeatherResponseDto;
import com.weatheroutfit.dto.UnifiedWeatherResponseDto.CurrentWeather;
import com.weatheroutfit.dto.UnifiedWeatherResponseDto.HourlyEntry;
import com.weatheroutfit.dto.UnifiedWeatherResponseDto.DailyEntry;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Service that retrieves weather data from the Open-Meteo API.
 * It provides current weather, hourly (next 24h) and daily (next 7d) forecasts.
 * Responses are cached for a short period to avoid duplicate API calls.
 */
@Service
public class WeatherService {

    private final WebClient webClient;
    private final String baseUrl = "https://api.open-meteo.com/v1/forecast";
    private final Cache<String, UnifiedWeatherResponseDto> cache;

    public WeatherService() {
        this.webClient = WebClient.builder().baseUrl(baseUrl).build();
        this.cache = Caffeine.newBuilder()
                .expireAfterWrite(5, TimeUnit.MINUTES) // cache ttl for current data
                .maximumSize(500)
                .build();
    }

    /**
     * Returns a unified weather DTO for the given coordinates.
     * @param lat latitude
     * @param lon longitude
     * @param city optional city name (used only for response field)
     */
    public UnifiedWeatherResponseDto getWeather(double lat, double lon, String city) {
        String cacheKey = String.format("weather:%f:%f", lat, lon);
        UnifiedWeatherResponseDto cached = cache.getIfPresent(cacheKey);
        if (cached != null) {
            if (city != null && !city.isBlank()) {
                cached.getCurrent().setCity(city);
            }
            return cached;
        }

        // Build request URL with required parameters
        String url = String.format("?latitude=%f&longitude=%f&current_weather=true&hourly=temperature_2m,relative_humidity_2m,weathercode&daily=weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto", lat, lon);

        Mono<OpenMeteoResponse> mono = webClient.get()
                .uri(url)
                .retrieve()
                .onStatus(status -> status.isError(), resp -> resp.createException())
                .bodyToMono(OpenMeteoResponse.class);

        OpenMeteoResponse apiResp = mono.block(); // block because controller is sync
        UnifiedWeatherResponseDto dto = mapToDto(apiResp, city);
        cache.put(cacheKey, dto);
        return dto;
    }

    // -----------------------------------------------------------------
    // Internal POJOs that reflect only the fields we need from Open-Meteo
    // -----------------------------------------------------------------
    private static class OpenMeteoResponse {
        public CurrentWeatherBlock current_weather;
        public HourlyBlock hourly;
        public DailyBlock daily;
        public int timezone_offset; // seconds offset from UTC for the location
    }
    private static class CurrentWeatherBlock {
        public double temperature;
        public double windspeed;
        public int weathercode;
        public long time; // epoch seconds (UTC)
    }
    private static class HourlyBlock {
        public List<Long> time;
        public List<Double> temperature_2m;
        public List<Integer> relative_humidity_2m;
        public List<Integer> weathercode;
    }
    private static class DailyBlock {
        public List<Long> time; // each day start epoch seconds
        public List<Double> temperature_2m_max;
        public List<Double> temperature_2m_min;
        public List<Integer> weathercode;
        public List<Long> sunrise;
        public List<Long> sunset;
    }

    // -----------------------------------------------------------------
    // Mapping logic
    // -----------------------------------------------------------------
    private UnifiedWeatherResponseDto mapToDto(OpenMeteoResponse src, String city) {
        UnifiedWeatherResponseDto dto = new UnifiedWeatherResponseDto();
        // ----- Current -----
        CurrentWeather cw = new CurrentWeather();
        cw.setCity(city);
        cw.setTemperature(src.current_weather.temperature);
        cw.setFeelsLike(src.current_weather.temperature); // Open-Meteo does not provide feels_like; using temperature
        cw.setWindSpeed(src.current_weather.windspeed);
        cw.setCondition(parseWeatherCode(src.current_weather.weathercode));
        cw.setTimestamp(src.current_weather.time);
        cw.setTimezoneOffset(src.timezone_offset);
        // humidity for current is taken from the first hourly value (closest hour)
        if (src.hourly != null && src.hourly.relative_humidity_2m != null && !src.hourly.relative_humidity_2m.isEmpty()) {
            cw.setHumidity(src.hourly.relative_humidity_2m.get(0));
        } else {
            cw.setHumidity(0);
        }
        // visibility is not provided by Open-Meteo; set to 0 as placeholder
        cw.setVisibility(0);
        // sunrise / sunset from daily (first day)
        if (src.daily != null && src.daily.sunrise != null && !src.daily.sunrise.isEmpty()) {
            cw.setSunrise(src.daily.sunrise.get(0));
            cw.setSunset(src.daily.sunset.get(0));
        }
        dto.setCurrent(cw);

        // ----- Hourly (next 24h) -----
        if (src.hourly != null && src.hourly.time != null) {
            int limit = Math.min(src.hourly.time.size(), 24);
            for (int i = 0; i < limit; i++) {
                HourlyEntry he = new HourlyEntry();
                he.setTime(src.hourly.time.get(i));
                he.setTemperature(src.hourly.temperature_2m.get(i));
                he.setFeelsLike(src.hourly.temperature_2m.get(i)); // no feels_like field
                he.setHumidity(src.hourly.relative_humidity_2m.get(i));
                he.setCondition(parseWeatherCode(src.hourly.weathercode.get(i)));
                // icon can be derived later; keep null for now
                dto.getHourly().add(he);
            }
        }

        // ----- Daily (next 7 days) -----
        if (src.daily != null && src.daily.time != null) {
            int dlimit = Math.min(src.daily.time.size(), 7);
            for (int i = 0; i < dlimit; i++) {
                DailyEntry de = new DailyEntry();
                de.setDate(src.daily.time.get(i));
                de.setMinTemp(src.daily.temperature_2m_min.get(i));
                de.setMaxTemp(src.daily.temperature_2m_max.get(i));
                de.setCondition(parseWeatherCode(src.daily.weathercode.get(i)));
                // icons placeholder
                dto.getDaily().add(de);
            }
        }
        return dto;
    }

    // Basic mapping from Open-Meteo weathercode to human readable description
    private String parseWeatherCode(int code) {
        // Simplified mapping – you can expand as needed
        return switch (code) {
            case 0 -> "Clear sky";
            case 1, 2, 3 -> "Mainly clear";
            case 45, 48 -> "Fog";
            case 51, 53, 55 -> "Drizzle";
            case 61, 63, 65 -> "Rain";
            case 71, 73, 75 -> "Snow";
            case 80, 81, 82 -> "Rain showers";
            case 95 -> "Thunderstorm";
            default -> "Unknown";
        };
    }
}
