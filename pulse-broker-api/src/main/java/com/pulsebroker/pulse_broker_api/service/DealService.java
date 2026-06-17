package com.pulsebroker.pulse_broker_api.service;

import com.pulsebroker.pulse_broker_api.entity.Deal;
import com.pulsebroker.pulse_broker_api.entity.DealStatus;
import com.pulsebroker.pulse_broker_api.repository.DealRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

@Service
public class DealService {

    @Autowired
    private DealRepository dealRepository;

    @Transactional
    public Deal loadDeal(Long dealId, BigDecimal loadedWeight, LocalDate loadDate) {
        Deal deal = dealRepository.findById(dealId)
                .orElseThrow(() -> new RuntimeException("Deal not found"));

        if (deal.getStatus() == DealStatus.LOADED) {
            throw new IllegalArgumentException("Deal is already loaded");
        }

        if (loadedWeight.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Loaded weight must be greater than zero");
        }

        if (loadedWeight.compareTo(deal.getWeight()) > 0) {
            throw new IllegalArgumentException("Loaded weight cannot be greater than pending weight");
        }

        if (loadedWeight.compareTo(deal.getWeight()) < 0) {
            // Partial Load: Split the deal
            Deal loadedDeal = new Deal();
            loadedDeal.setDealDate(deal.getDealDate());
            loadedDeal.setLoadDate(loadDate);
            loadedDeal.setPurchaser(deal.getPurchaser());
            loadedDeal.setSeller(deal.getSeller());
            loadedDeal.setItem(deal.getItem());
            loadedDeal.setMarka(deal.getMarka());
            loadedDeal.setRate(deal.getRate());
            loadedDeal.setStatus(DealStatus.LOADED);
            loadedDeal.setBrokeragePayer(deal.getBrokeragePayer());
            loadedDeal.setParentDeal(deal);
            loadedDeal.setWeight(loadedWeight);

            // Prevent divide by zero if deal weight is somehow 0
            if (deal.getWeight().compareTo(BigDecimal.ZERO) <= 0) {
                throw new RuntimeException("Cannot calculate brokerage ratio. Pending weight is invalid (zero or negative).");
            }
            
            // Calculate proportional brokerage securely
            BigDecimal ratio = loadedWeight.divide(deal.getWeight(), 10, RoundingMode.HALF_UP);
            
            BigDecimal currentPBrok = deal.getPBrokerage() != null ? deal.getPBrokerage() : BigDecimal.ZERO;
            BigDecimal currentSBrok = deal.getSBrokerage() != null ? deal.getSBrokerage() : BigDecimal.ZERO;
            
            BigDecimal newPBrokerage = currentPBrok.multiply(ratio).setScale(2, RoundingMode.HALF_UP);
            BigDecimal newSBrokerage = currentSBrok.multiply(ratio).setScale(2, RoundingMode.HALF_UP);
            
            loadedDeal.setPBrokerage(newPBrokerage);
            loadedDeal.setSBrokerage(newSBrokerage);

            // Save the new loaded portion
            dealRepository.save(loadedDeal);

            // Update the original pending portion
            deal.setWeight(deal.getWeight().subtract(loadedWeight));
            deal.setPBrokerage(currentPBrok.subtract(newPBrokerage));
            deal.setSBrokerage(currentSBrok.subtract(newSBrokerage));
            return dealRepository.save(deal);
        } else {
            // Full Load
            deal.setStatus(DealStatus.LOADED);
            deal.setLoadDate(loadDate);
            return dealRepository.save(deal);
        }
    }
}
