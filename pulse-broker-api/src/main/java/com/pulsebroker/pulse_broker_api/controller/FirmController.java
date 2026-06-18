package com.pulsebroker.pulse_broker_api.controller;

import com.pulsebroker.pulse_broker_api.entity.Firm;
import com.pulsebroker.pulse_broker_api.repository.FirmRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/firms")
public class FirmController {

    @Autowired
    private FirmRepository firmRepository;

    @Autowired
    private com.pulsebroker.pulse_broker_api.repository.DealRepository dealRepository;

    @Autowired
    private com.pulsebroker.pulse_broker_api.repository.BillRepository billRepository;

    @GetMapping
    public List<Firm> getAll() {
        return firmRepository.findAll();
    }

    @PostMapping
    public Firm create(@RequestBody Firm firm) {
        return firmRepository.save(firm);
    }

    @PutMapping("/{id}")
    public Firm update(@PathVariable Long id, @RequestBody Firm firmDetails) {
        Firm firm = firmRepository.findById(id).orElseThrow(() -> new RuntimeException("Firm not found"));
        firm.setName(firmDetails.getName());
        if (firmDetails.getContact() != null) {
            firm.setContact(firmDetails.getContact());
        }
        return firmRepository.save(firm);
    }

    @DeleteMapping("/{id}")
    @org.springframework.web.bind.annotation.ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    @org.springframework.transaction.annotation.Transactional
    public void delete(@PathVariable Long id) {
        Firm firm = firmRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Firm not found"));
        
        if (dealRepository.existsByPurchaserIdOrSellerId(id, id)) {
            throw new IllegalArgumentException("Cannot delete firm because it has associated deals.");
        }
        if (billRepository.existsByFirmId(id)) {
            throw new IllegalArgumentException("Cannot delete firm because it has generated bills.");
        }
        
        firmRepository.delete(firm);
    }
}
