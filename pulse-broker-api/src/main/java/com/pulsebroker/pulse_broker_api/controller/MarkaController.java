package com.pulsebroker.pulse_broker_api.controller;

import com.pulsebroker.pulse_broker_api.entity.Marka;
import com.pulsebroker.pulse_broker_api.repository.MarkaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/markas")
public class MarkaController {

    @Autowired
    private MarkaRepository markaRepository;

    @Autowired
    private com.pulsebroker.pulse_broker_api.repository.DealRepository dealRepository;

    @GetMapping
    public List<Marka> getAll() {
        return markaRepository.findAll(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "name"));
    }

    @PostMapping
    public Marka create(@RequestBody Marka marka) {
        return markaRepository.save(marka);
    }

    @PutMapping("/{id}")
    public Marka update(@PathVariable Long id, @RequestBody Marka markaDetails) {
        Marka marka = markaRepository.findById(id).orElseThrow(() -> new RuntimeException("Marka not found"));
        marka.setName(markaDetails.getName());
        return markaRepository.save(marka);
    }

    @DeleteMapping("/{id}")
    @org.springframework.web.bind.annotation.ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        Marka marka = markaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Marka not found"));
        
        if (dealRepository.existsByMarkaId(id)) {
            throw new IllegalArgumentException("Cannot delete marka because it is referenced in deals.");
        }
        
        markaRepository.delete(marka);
    }
}
