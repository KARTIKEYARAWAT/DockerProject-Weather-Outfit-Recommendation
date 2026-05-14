package com.weatheroutfit.controller;

import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;
import java.util.Arrays;
import java.util.List;

@RestController
@CrossOrigin(origins = "*") // Allow frontend to call APIs
public class ApiController {

    @GetMapping("/weather")
    public Map<String, Object> getWeather(@RequestParam String city) {
        Map<String, Object> response = new HashMap<>();
        // Mocking weather data
        response.put("city", city);
        response.put("temperature", 22);
        response.put("condition", "Sunny");
        response.put("humidity", 45);
        response.put("wind", 15);
        return response;
    }

    @PostMapping("/recommend")
    public Map<String, Object> getRecommendation(@RequestBody Map<String, String> request) {
        String city = request.getOrDefault("city", "Unknown");
        String style = request.getOrDefault("style", "Casual");
        String occasion = request.getOrDefault("occasion", "Everyday");

        Map<String, Object> response = new HashMap<>();
        // Mocking recommendation logic
        response.put("outfit", Arrays.asList("Light t-shirt", "Sunglasses", "Comfortable sneakers", "Jeans"));
        response.put("reasoning", "It's sunny and 22°C in " + city + ", perfect for a " + style.toLowerCase() + " " + occasion.toLowerCase() + " outfit.");
        return response;
    }

    @GetMapping("/status")
    public Map<String, String> getStatus() {
        Map<String, String> status = new HashMap<>();
        status.put("backend", "Running");
        // Normally we'd check redis and mysql connections here
        status.put("database", "Connected");
        status.put("cache", "Connected");
        return status;
    }

    @GetMapping("/health")
    public String healthCheck() {
        return "OK";
    }
}
