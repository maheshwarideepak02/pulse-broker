package com.pulsebroker.pulse_broker_api.service;

import com.pulsebroker.pulse_broker_api.entity.AppConfig;
import com.pulsebroker.pulse_broker_api.repository.AppConfigRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.UUID;

@Service
public class AuthService {

    @Autowired
    private AppConfigRepository configRepository;

    @Value("${pulse.security.master-secret}")
    private String masterSecret;

    private static final String APP_PIN_KEY = "app_pin_hash";
    private static final String AUTH_TOKEN_KEY = "auth_token";

    public boolean isAppSetup() {
        return configRepository.existsById(APP_PIN_KEY);
    }

    public void setupApp(String pin, String providedMasterSecret) {
        if (!masterSecret.equals(providedMasterSecret)) {
            throw new IllegalArgumentException("Invalid master secret");
        }
        if (isAppSetup()) {
            throw new IllegalStateException("App is already set up");
        }
        if (pin == null || pin.length() < 4) {
            throw new IllegalArgumentException("PIN must be at least 4 characters");
        }
        configRepository.save(new AppConfig(APP_PIN_KEY, hashPin(pin)));
    }

    public void resetApp(String providedMasterSecret) {
        if (!masterSecret.equals(providedMasterSecret)) {
            throw new IllegalArgumentException("Invalid master secret");
        }
        configRepository.deleteById(APP_PIN_KEY);
        configRepository.deleteById(AUTH_TOKEN_KEY);
    }

    public String login(String pin) {
        AppConfig pinConfig = configRepository.findById(APP_PIN_KEY)
                .orElseThrow(() -> new IllegalStateException("App is not set up"));

        if (!hashPin(pin).equals(pinConfig.getConfigValue())) {
            throw new IllegalArgumentException("Invalid PIN");
        }

        // Generate token
        String token = UUID.randomUUID().toString();
        configRepository.save(new AppConfig(AUTH_TOKEN_KEY, hashPin(token))); // Store hashed token

        return token;
    }

    public void logout() {
        configRepository.deleteById(AUTH_TOKEN_KEY);
    }

    public boolean validateToken(String token) {
        if (token == null) return false;
        return configRepository.findById(AUTH_TOKEN_KEY)
                .map(config -> config.getConfigValue().equals(hashPin(token)))
                .orElse(false);
    }

    private String hashPin(String pin) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(pin.getBytes());
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Error hashing PIN", e);
        }
    }
}
