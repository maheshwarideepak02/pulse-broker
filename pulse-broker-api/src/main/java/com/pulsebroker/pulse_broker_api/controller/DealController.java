package com.pulsebroker.pulse_broker_api.controller;

import com.pulsebroker.pulse_broker_api.entity.Deal;
import com.pulsebroker.pulse_broker_api.entity.DealStatus;
import com.pulsebroker.pulse_broker_api.repository.DealRepository;
import com.pulsebroker.pulse_broker_api.service.DealService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/deals")
public class DealController {

    @Autowired
    private DealRepository dealRepository;

    @Autowired
    private DealService dealService;

    @GetMapping
    public List<Deal> getAll() {
        return dealRepository.findAll();
    }

    @GetMapping("/pending")
    public List<Deal> getPending() {
        return dealRepository.findByStatus(DealStatus.PENDING);
    }

    @PostMapping
    public Deal create(@RequestBody Deal deal) {
        if (deal.getStatus() == null) {
            deal.setStatus(DealStatus.PENDING);
        }
        return dealRepository.save(deal);
    }

    @PostMapping("/{id}/load")
    public Deal loadDeal(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        java.math.BigDecimal weight = new java.math.BigDecimal(payload.get("weight").toString());
        LocalDate loadDate = LocalDate.parse(payload.get("loadDate").toString());
        return dealService.loadDeal(id, weight, loadDate);
    }

    @PutMapping("/{id}")
    public Deal updateDeal(@PathVariable Long id, @RequestBody Deal dealDetails) {
        Deal deal = dealRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Deal not found"));
        if (deal.getStatus() == DealStatus.BILLED) {
            throw new IllegalArgumentException("Cannot edit a billed deal.");
        }
        deal.setDealDate(dealDetails.getDealDate());
        deal.setPurchaser(dealDetails.getPurchaser());
        deal.setSeller(dealDetails.getSeller());
        deal.setItem(dealDetails.getItem());
        deal.setMarka(dealDetails.getMarka());
        deal.setWeight(dealDetails.getWeight());
        deal.setPacketWeight(dealDetails.getPacketWeight());
        deal.setNumberOfPackets(dealDetails.getNumberOfPackets());
        deal.setRate(dealDetails.getRate());
        deal.setPBrokerage(dealDetails.getPBrokerage());
        deal.setSBrokerage(dealDetails.getSBrokerage());
        deal.setBrokeragePayer(dealDetails.getBrokeragePayer());
        return dealRepository.save(deal);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @org.springframework.transaction.annotation.Transactional
    public void delete(@PathVariable Long id) {
        Deal deal = dealRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Deal not found"));
        
        if (deal.getStatus() == com.pulsebroker.pulse_broker_api.entity.DealStatus.BILLED || deal.getPurchaserBill() != null || deal.getSellerBill() != null) {
            throw new IllegalArgumentException("Cannot delete a billed deal. Cancel the bill first.");
        }
        
        if (deal.getParentDeal() != null) {
            Deal parent = deal.getParentDeal();
            parent.setWeight(parent.getWeight().add(deal.getWeight()));
            parent.setPBrokerage(parent.getPBrokerage().add(deal.getPBrokerage() != null ? deal.getPBrokerage() : java.math.BigDecimal.ZERO));
            parent.setSBrokerage(parent.getSBrokerage().add(deal.getSBrokerage() != null ? deal.getSBrokerage() : java.math.BigDecimal.ZERO));
            dealRepository.save(parent);
        }
        
        dealRepository.delete(deal);
    }
}
