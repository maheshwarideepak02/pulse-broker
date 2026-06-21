package com.pulsebroker.pulse_broker_api.controller;

import com.pulsebroker.pulse_broker_api.entity.Deal;
import com.pulsebroker.pulse_broker_api.entity.DealStatus;
import com.pulsebroker.pulse_broker_api.repository.DealRepository;
import com.pulsebroker.pulse_broker_api.service.DealService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.Arrays;
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
        return dealRepository.findByStatusIn(Arrays.asList(DealStatus.PENDING, DealStatus.OPEN_UNASSIGNED));
    }

    @GetMapping("/margins/{partyId}")
    public List<Deal> getMarginDeals(@PathVariable Long partyId) {
        return dealRepository.findMarginDealsByParty(partyId);
    }

    @PostMapping
    public Deal create(@RequestBody Deal deal) {
        if (deal.getWeight() == null || deal.getWeight().compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Weight must be greater than zero.");
        }
        if (deal.getRate() != null && deal.getRate().compareTo(java.math.BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Rate cannot be negative.");
        }
        if (deal.getPurchaser() != null && deal.getSeller() != null && deal.getPurchaser().getId().equals(deal.getSeller().getId())) {
            throw new IllegalArgumentException("Purchaser and Seller firms cannot be the same.");
        }
        if (deal.getStatus() == null) {
            deal.setStatus(DealStatus.PENDING);
        }
        if ((deal.getStatus() == DealStatus.LOADED || deal.getStatus() == DealStatus.BILLED) && (deal.getPurchaser() == null || deal.getSeller() == null)) {
            throw new IllegalArgumentException("A Loaded or Billed deal must have both a Purchaser and Seller firm assigned.");
        }
        if (deal.getMarginMarkup() == null) {
            deal.setMarginMarkup(java.math.BigDecimal.ZERO);
        }
        if (deal.getRate() != null) {
            deal.setPurchaserRate(deal.getRate().add(deal.getMarginMarkup()));
        }
        return dealRepository.save(deal);
    }

    @PostMapping("/{id}/load")
    public Deal loadDeal(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        java.math.BigDecimal weight = new java.math.BigDecimal(payload.get("weight").toString());
        String loadDate = payload.get("loadDate").toString();
        Long purchaserId = payload.containsKey("purchaserId") && payload.get("purchaserId") != null ? Long.valueOf(payload.get("purchaserId").toString()) : null;
        Long sellerId = payload.containsKey("sellerId") && payload.get("sellerId") != null ? Long.valueOf(payload.get("sellerId").toString()) : null;
        return dealService.loadDeal(id, weight, loadDate, purchaserId, sellerId);
    }

    @PutMapping("/{id}")
    public Deal updateDeal(@PathVariable Long id, @RequestBody Deal dealDetails) {
        Deal deal = dealRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Deal not found"));
        if (deal.getStatus() == DealStatus.BILLED || deal.getPurchaserBill() != null || deal.getSellerBill() != null) {
            throw new IllegalArgumentException("Cannot edit a deal that has been billed or partially billed. Cancel the bill(s) first.");
        }
        if (deal.getStatus() == DealStatus.LOADED && deal.getParentDeal() != null) {
            throw new IllegalArgumentException("Cannot directly edit the weight or rate of a loaded deal dispatch. Please revert the dispatch instead.");
        }
        if (dealDetails.getWeight() == null || dealDetails.getWeight().compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Weight must be greater than zero.");
        }
        if (dealDetails.getPurchaser() != null && dealDetails.getSeller() != null && dealDetails.getPurchaser().getId().equals(dealDetails.getSeller().getId())) {
            throw new IllegalArgumentException("Purchaser and Seller firms cannot be the same.");
        }
        
        if (Boolean.TRUE.equals(deal.getMarginCleared())) {
            boolean weightChanged = dealDetails.getWeight() != null && deal.getWeight() != null && dealDetails.getWeight().compareTo(deal.getWeight()) != 0;
            boolean markupChanged = dealDetails.getMarginMarkup() != null && (deal.getMarginMarkup() == null || dealDetails.getMarginMarkup().compareTo(deal.getMarginMarkup()) != 0);
            if (weightChanged || markupChanged) {
                throw new IllegalArgumentException("Cannot edit weight or margin markup of this deal because its margin has already been settled. Please unclear the margin from the Ledger first.");
            }
        }
        
        deal.setDealDate(dealDetails.getDealDate());
        deal.setPurchaserDealDate(dealDetails.getPurchaserDealDate());
        deal.setPurchaserContact(dealDetails.getPurchaserContact());
        deal.setSellerContact(dealDetails.getSellerContact());
        deal.setPurchaser(dealDetails.getPurchaser());
        deal.setSeller(dealDetails.getSeller());
        deal.setItem(dealDetails.getItem());
        deal.setMarka(dealDetails.getMarka());
        deal.setWeight(dealDetails.getWeight());
        deal.setPacketWeight(dealDetails.getPacketWeight());
        deal.setNumberOfPackets(dealDetails.getNumberOfPackets());
        deal.setRate(dealDetails.getRate());
        deal.setMarginMarkup(dealDetails.getMarginMarkup() != null ? dealDetails.getMarginMarkup() : java.math.BigDecimal.ZERO);
        if (deal.getRate() != null) {
            deal.setPurchaserRate(deal.getRate().add(deal.getMarginMarkup()));
        }
        deal.setPBrokerage(dealDetails.getPBrokerage());
        deal.setPBrokType(dealDetails.getPBrokType());
        deal.setPBrokVal(dealDetails.getPBrokVal());
        
        deal.setSBrokerage(dealDetails.getSBrokerage());
        deal.setSBrokType(dealDetails.getSBrokType());
        deal.setSBrokVal(dealDetails.getSBrokVal());
        
        deal.setBrokeragePayer(dealDetails.getBrokeragePayer());
        deal.setLoadDate(dealDetails.getLoadDate());
        if (dealDetails.getStatus() != null) {
            deal.setStatus(dealDetails.getStatus());
        }
        if ((deal.getStatus() == DealStatus.LOADED || deal.getStatus() == DealStatus.BILLED) && (deal.getPurchaser() == null || deal.getSeller() == null)) {
            throw new IllegalArgumentException("A Loaded or Billed deal must have both a Purchaser and Seller firm assigned.");
        }
        return dealRepository.save(deal);
    }

    @PostMapping("/{id}/revert")
    @org.springframework.transaction.annotation.Transactional
    public Deal revertDeal(@PathVariable Long id) {
        Deal deal = dealRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Deal not found"));
        if (deal.getStatus() == DealStatus.BILLED || deal.getPurchaserBill() != null || deal.getSellerBill() != null) {
            throw new IllegalArgumentException("Cannot revert a billed deal.");
        }
        
        if (deal.getParentDeal() != null) {
            Deal parent = deal.getParentDeal();
            parent.setWeight(parent.getWeight().add(deal.getWeight()));
            parent.setPBrokerage(parent.getPBrokerage().add(deal.getPBrokerage() != null ? deal.getPBrokerage() : java.math.BigDecimal.ZERO));
            parent.setSBrokerage(parent.getSBrokerage().add(deal.getSBrokerage() != null ? deal.getSBrokerage() : java.math.BigDecimal.ZERO));
            if (parent.getPacketWeight() != null && parent.getPacketWeight().compareTo(java.math.BigDecimal.ZERO) > 0) {
                parent.setNumberOfPackets(
                    parent.getWeight().multiply(new java.math.BigDecimal("100")).divide(parent.getPacketWeight(), 0, java.math.RoundingMode.HALF_UP).intValue()
                );
            }
            if (deal.getLoadDate() != null && !deal.getLoadDate().trim().isEmpty()) {
                if (parent.getLoadDate() == null || parent.getLoadDate().trim().isEmpty()) {
                    parent.setLoadDate(deal.getLoadDate());
                } else if (!parent.getLoadDate().contains(deal.getLoadDate())) {
                    parent.setLoadDate(parent.getLoadDate() + ", " + deal.getLoadDate());
                }
            }
            dealRepository.save(parent);
            dealRepository.delete(deal);
            return parent;
        } else {
            deal.setStatus(DealStatus.PENDING);
            // Preserve the loadDate so it pre-populates in the Edit screen
            return dealRepository.save(deal);
        }
    }

    @PostMapping("/revert-bulk")
    @org.springframework.transaction.annotation.Transactional
    public void revertDealsBulk(@RequestBody java.util.List<Long> ids) {
        for (Long id : ids) {
            revertDeal(id);
        }
    }

    @PostMapping("/{id}/cancel")
    @org.springframework.transaction.annotation.Transactional
    public Deal cancelDeal(@PathVariable Long id) {
        Deal deal = dealRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Deal not found"));
        
        if (deal.getStatus() == DealStatus.BILLED || deal.getPurchaserBill() != null || deal.getSellerBill() != null) {
            throw new IllegalArgumentException("Cannot cancel a billed deal.");
        }
        
        deal.setStatus(com.pulsebroker.pulse_broker_api.entity.DealStatus.CANCELLED);
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
        if (Boolean.TRUE.equals(deal.getMarginCleared())) {
            throw new IllegalArgumentException("Cannot delete this deal because its margin has already been settled. Please unclear the margin from the Ledger first.");
        }
        
        // Prevent deleting a parent deal if it has children
        if (dealRepository.existsById(id) && dealRepository.countByParentDeal(deal) > 0) {
            throw new IllegalArgumentException("Cannot delete this deal because it has active loaded dispatches. Please revert the dispatches first.");
        }
        
        if (deal.getParentDeal() != null) {
            Deal parent = deal.getParentDeal();
            parent.setWeight(parent.getWeight().add(deal.getWeight()));
            parent.setPBrokerage(parent.getPBrokerage().add(deal.getPBrokerage() != null ? deal.getPBrokerage() : java.math.BigDecimal.ZERO));
            parent.setSBrokerage(parent.getSBrokerage().add(deal.getSBrokerage() != null ? deal.getSBrokerage() : java.math.BigDecimal.ZERO));
            if (parent.getPacketWeight() != null && parent.getPacketWeight().compareTo(java.math.BigDecimal.ZERO) > 0) {
                parent.setNumberOfPackets(
                    parent.getWeight().multiply(new java.math.BigDecimal("100")).divide(parent.getPacketWeight(), 0, java.math.RoundingMode.HALF_UP).intValue()
                );
            }
            dealRepository.save(parent);
        }
        
        dealRepository.delete(deal);
    }

    @PostMapping("/margin/clear")
    public ResponseEntity<Void> clearMargins(@RequestBody List<Long> dealIds) {
        List<Deal> deals = dealRepository.findAllById(dealIds);
        LocalDate today = LocalDate.now();
        for (Deal d : deals) {
            d.setMarginCleared(true);
            d.setMarginClearanceDate(today);
        }
        dealRepository.saveAll(deals);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/margin/unclear")
    public ResponseEntity<Void> unclearMargins(@RequestBody List<Long> dealIds) {
        List<Deal> deals = dealRepository.findAllById(dealIds);
        for (Deal d : deals) {
            d.setMarginCleared(false);
            d.setMarginClearanceDate(null);
        }
        dealRepository.saveAll(deals);
        return ResponseEntity.ok().build();
    }
}
