package com.pulsebroker.pulse_broker_api.controller;

import com.pulsebroker.pulse_broker_api.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private AuthService authService;

    @GetMapping("/status")
    public ResponseEntity<Map<String, Boolean>> getStatus() {
        Map<String, Boolean> response = new HashMap<>();
        response.put("isSetup", authService.isAppSetup());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/setup")
    public ResponseEntity<Map<String, String>> setup(@RequestBody Map<String, String> payload) {
        String pin = payload.get("pin");
        String masterSecret = payload.get("masterSecret");
        
        try {
            authService.setupApp(pin, masterSecret);
            
            // Automatically log in after setup
            String token = authService.login(pin);
            Map<String, String> response = new HashMap<>();
            response.put("token", token);
            response.put("message", "App setup successfully");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException | IllegalStateException e) {
            Map<String, String> response = new HashMap<>();
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> login(@RequestBody Map<String, String> payload) {
        String pin = payload.get("pin");
        
        try {
            String token = authService.login(pin);
            Map<String, String> response = new HashMap<>();
            response.put("token", token);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException | IllegalStateException e) {
            Map<String, String> response = new HashMap<>();
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        authService.logout();
        return ResponseEntity.ok().build();
    }
}
