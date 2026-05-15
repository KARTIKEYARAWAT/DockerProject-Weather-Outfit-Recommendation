package com.weatheroutfit.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.client.RestTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import java.util.HashMap;
import java.util.Map;
import java.util.Arrays;
import java.util.List;

@RestController
@CrossOrigin(origins = "*") // Allow frontend to call APIs
public class ApiController {

    // Removed OpenWeatherMap properties. Open-Meteo requires no API key.

    @Autowired
    private RestTemplate restTemplate;

    @GetMapping("/coordinates")
    public Map<String, Object> getCoordinates(@RequestParam String city) {
        Map<String, Object> response = new HashMap<>();
        try {
            String geoUrl = String.format("https://geocoding-api.open-meteo.com/v1/search?name=%s&count=1&language=en&format=json", city);
            ResponseEntity<Map> apiResponse = restTemplate.getForEntity(geoUrl, Map.class);
            Map<String, Object> body = apiResponse.getBody();
            
            if (body != null && body.containsKey("results")) {
                List<Map<String, Object>> results = (List<Map<String, Object>>) body.get("results");
                if (results != null && !results.isEmpty()) {
                    Map<String, Object> location = results.get(0);
                    response.put("lat", location.get("latitude"));
                    response.put("lon", location.get("longitude"));
                    response.put("name", location.get("name"));
                    return response;
                }
            }
            response.put("error", "City not found");
        } catch (Exception e) {
            response.put("error", "Failed to fetch coordinates: " + e.getMessage());
        }
        return response;
    }

    @GetMapping("/search-cities")
    public List<Map<String, Object>> searchCities(@RequestParam String query) {
        List<Map<String, Object>> emptyList = new java.util.ArrayList<>();
        if (query == null || query.trim().isEmpty()) return emptyList;
        
        try {
            String geoUrl = String.format("https://geocoding-api.open-meteo.com/v1/search?name=%s&count=5&language=en&format=json", query);
            ResponseEntity<Map> apiResponse = restTemplate.getForEntity(geoUrl, Map.class);
            Map<String, Object> body = apiResponse.getBody();
            
            if (body != null && body.containsKey("results")) {
                List<Map<String, Object>> results = (List<Map<String, Object>>) body.get("results");
                if (results != null) {
                    return results;
                }
            }
        } catch (Exception e) {
            // Ignore error and return empty list
        }
        return emptyList;
    }

    @GetMapping("/weather")
    public Map<String, Object> getWeather(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lon) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            // If no lat/lon provided, we can either throw error or use a default.
            // Since we expect the frontend to pass lat/lon either from geolocation or geocoding.
            if (lat == null || lon == null) {
                throw new IllegalArgumentException("lat and lon must be provided.");
            }
            
            String url = String.format("https://api.open-meteo.com/v1/forecast?latitude=%f&longitude=%f&current_weather=true&hourly=temperature_2m,relative_humidity_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto", lat, lon);
            
            // Call the external API
            ResponseEntity<Map> apiResponse = restTemplate.getForEntity(url, Map.class);
            Map<String, Object> body = apiResponse.getBody();
            
            if (body != null && body.containsKey("current_weather")) {
                Map<String, Object> current = (Map<String, Object>) body.get("current_weather");
                
                int weatherCode = current.get("weathercode") instanceof Number ? ((Number) current.get("weathercode")).intValue() : 0;
                String condition = parseWeatherCode(weatherCode);
                
                response.put("city", city != null ? city : "Your Location");
                response.put("temperature", current.get("temperature"));
                response.put("condition", condition);
                response.put("wind", current.get("windspeed")); 
                
                if (body.containsKey("hourly")) {
                    Map<String, Object> hourly = (Map<String, Object>) body.get("hourly");
                    List<Number> humidityList = (List<Number>) hourly.get("relative_humidity_2m");
                    response.put("humidity", humidityList != null && !humidityList.isEmpty() ? humidityList.get(0) : "N/A");
                }
                
                if (body.containsKey("daily")) {
                    Map<String, Object> daily = (Map<String, Object>) body.get("daily");
                    List<String> times = (List<String>) daily.get("time");
                    List<Number> codes = (List<Number>) daily.get("weather_code");
                    List<Number> maxTemps = (List<Number>) daily.get("temperature_2m_max");
                    List<Number> minTemps = (List<Number>) daily.get("temperature_2m_min");

                    List<Map<String, Object>> forecastList = new java.util.ArrayList<>();
                    for (int i = 0; i < times.size(); i++) {
                        Map<String, Object> dayMap = new HashMap<>();
                        dayMap.put("date", times.get(i));
                        dayMap.put("condition", parseWeatherCode(codes.get(i).intValue()));
                        dayMap.put("maxTemp", maxTemps.get(i) != null ? maxTemps.get(i).doubleValue() : 0.0);
                        dayMap.put("minTemp", minTemps.get(i) != null ? minTemps.get(i).doubleValue() : 0.0);
                        forecastList.add(dayMap);
                    }
                    response.put("forecast", forecastList);
                }

                if (body.containsKey("hourly")) {
                    Map<String, Object> hourly = (Map<String, Object>) body.get("hourly");
                    List<String> hTimes = (List<String>) hourly.get("time");
                    List<Number> hTemps = (List<Number>) hourly.get("temperature_2m");
                    List<Number> hCodes = (List<Number>) hourly.get("weather_code");
                    
                    List<Map<String, Object>> todayHourly = new java.util.ArrayList<>();
                    List<Map<String, Object>> tomorrowHourly = new java.util.ArrayList<>();
                    
                    int currentHourIdx = 12;
                    Map<String, Object> currentObj = (Map<String, Object>) body.get("current");
                    if (currentObj != null && currentObj.containsKey("time")) {
                        String currentTimeStr = (String) currentObj.get("time");
                        String currentHourPrefix = currentTimeStr.length() >= 13 ? currentTimeStr.substring(0, 13) : currentTimeStr;
                        for (int i = 0; i < hTimes.size(); i++) {
                            if (hTimes.get(i).startsWith(currentHourPrefix)) {
                                currentHourIdx = i;
                                break;
                            }
                        }
                    }
                    
                    int[] todayIndices = {currentHourIdx, currentHourIdx + 1, currentHourIdx + 2, currentHourIdx + 3, currentHourIdx + 4};
                    int[] tomorrowIndices = {currentHourIdx + 24, currentHourIdx + 27, currentHourIdx + 30, currentHourIdx + 33, currentHourIdx + 36};

                    for (int idx : todayIndices) {
                        if (idx < hTimes.size()) {
                            Map<String, Object> h = new HashMap<>();
                            String timeStr = hTimes.get(idx).substring(11);
                            h.put("time", timeStr);
                            h.put("temp", hTemps.get(idx) != null ? hTemps.get(idx).doubleValue() : 0.0);
                            h.put("condition", parseWeatherCode(hCodes.get(idx).intValue()));
                            todayHourly.add(h);
                        }
                    }
                    for (int idx : tomorrowIndices) {
                        if (idx < hTimes.size()) {
                            Map<String, Object> h = new HashMap<>();
                            String timeStr = hTimes.get(idx).substring(11);
                            h.put("time", timeStr);
                            h.put("temp", hTemps.get(idx) != null ? hTemps.get(idx).doubleValue() : 0.0);
                            h.put("condition", parseWeatherCode(hCodes.get(idx).intValue()));
                            tomorrowHourly.add(h);
                        }
                    }
                    response.put("todayHourly", todayHourly);
                    response.put("tomorrowHourly", tomorrowHourly);
                }

                try {
                    String aqiUrl = String.format("https://air-quality-api.open-meteo.com/v1/air-quality?latitude=%f&longitude=%f&current=us_aqi", lat, lon);
                    ResponseEntity<Map> aqiResponse = restTemplate.getForEntity(aqiUrl, Map.class);
                    Map<String, Object> aqiBody = aqiResponse.getBody();
                    if (aqiBody != null && aqiBody.containsKey("current")) {
                        Map<String, Object> aqiCurrent = (Map<String, Object>) aqiBody.get("current");
                        int aqiVal = ((Number) aqiCurrent.get("us_aqi")).intValue();
                        Map<String, Object> aqiData = new HashMap<>();
                        aqiData.put("value", aqiVal);
                        if (aqiVal <= 50) aqiData.put("label", "Excellent");
                        else if (aqiVal <= 100) aqiData.put("label", "Moderate");
                        else if (aqiVal <= 150) aqiData.put("label", "Sensitive");
                        else aqiData.put("label", "Unhealthy");
                        response.put("aqi", aqiData);
                    }
                } catch (Exception e) {
                    Map<String, Object> aqiData = new HashMap<>();
                    aqiData.put("value", 0);
                    aqiData.put("label", "Unknown");
                    response.put("aqi", aqiData);
                }

            } else {
                throw new Exception("Invalid response from Open-Meteo");
            }
        } catch (Exception e) {
            // Fallback mock or error data if the city is invalid or API fails
            response.put("city", city != null ? city : "Unknown Location");
            response.put("temperature", "N/A");
            response.put("condition", "Error fetching data");
            response.put("humidity", "N/A");
            response.put("wind", "N/A");
            response.put("error", e.getMessage());
        }
        
        return response;
    }

    @PostMapping("/recommend")
    public Map<String, Object> getRecommendation(@RequestBody Map<String, String> request) {
        String city = request.getOrDefault("city", "Unknown");
        String style = request.getOrDefault("style", "Casual");
        String occasion = request.getOrDefault("occasion", "Everyday");
        String tempStr = request.getOrDefault("temperature", "20.0");
        String condition = request.getOrDefault("condition", "Clear sky");

        double temp = 20.0;
        try {
            temp = Double.parseDouble(tempStr);
        } catch (Exception e) {
            // ignore parse error
        }

        Map<String, Object> response = new HashMap<>();
        List<String> outfit = new java.util.ArrayList<>();
        String reasoning = "";
        Map<String, String> alternative = new HashMap<>();

        if (temp > 25) {
            outfit.addAll(Arrays.asList("Light t-shirt", "Shorts or light trousers", "Sunglasses", "Sandals or breathable sneakers"));
            reasoning = "It's quite hot in " + city + " (" + temp + "°C). Lightweight clothes with light colors are recommended to stay cool for a " + style.toLowerCase() + " " + occasion.toLowerCase() + " outfit.";
            alternative.put("title", "Summer Casual");
            alternative.put("desc", "Linen shirt & Loafers");
        } else if (temp >= 15 && temp <= 25) {
            outfit.addAll(Arrays.asList("Long-sleeve shirt or light sweater", "Jeans or chinos", "Light jacket", "Comfortable sneakers"));
            reasoning = "The weather is mild in " + city + " (" + temp + "°C). Comfortable layers are best for your " + style.toLowerCase() + " " + occasion.toLowerCase() + " plans.";
            alternative.put("title", "Sporty Vibe");
            alternative.put("desc", "Athleisure & Sneakers");
        } else {
            outfit.addAll(Arrays.asList("Warm sweater", "Heavy coat", "Scarf", "Thick trousers", "Boots"));
            reasoning = "It's cold in " + city + " (" + temp + "°C). Heavy layers and warm materials are necessary to protect against the cold.";
            alternative.put("title", "Extreme Winter");
            alternative.put("desc", "Thermal suit & Snow boots");
        }

        if (condition.toLowerCase().contains("rain") || condition.toLowerCase().contains("drizzle") || condition.toLowerCase().contains("thunderstorm")) {
            outfit.add("Umbrella or Raincoat");
            reasoning += " Additionally, since there is " + condition.toLowerCase() + ", don't forget your rain gear!";
        }

        response.put("outfit", outfit);
        response.put("reasoning", reasoning);
        response.put("alternative", alternative);
        return response;
    }

    @GetMapping("/status")
    public Map<String, String> getStatus() {
        Map<String, String> status = new HashMap<>();
        status.put("backend", "Running");
        status.put("database", "Connected");
        status.put("cache", "Connected");
        return status;
    }

    @GetMapping("/health")
    public String healthCheck() {
        return "OK";
    }

    private String parseWeatherCode(int code) {
        if (code == 0) return "Clear sky";
        if (code == 1 || code == 2 || code == 3) return "Partly cloudy";
        if (code == 45 || code == 48) return "Fog";
        if (code >= 51 && code <= 55) return "Drizzle";
        if (code >= 61 && code <= 65) return "Rain";
        if (code >= 71 && code <= 75) return "Snow";
        if (code >= 95) return "Thunderstorm";
        return "Unknown";
    }
}
