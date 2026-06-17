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
    public Deal loadDeal(Long dealId, BigDecimal loadedWeight, String loadDate) {
        Deal deal = dealRepository.findById(dealId)
                .orElseThrow(() -> new RuntimeException("Deal not found"));

        if (deal.getStatus() != DealStatus.PENDING) {
            throw new RuntimeException("Only PENDING deals can be loaded");
        }

        if (loadedWeight.compareTo(deal.getWeight()) > 0) {
            throw new RuntimeException("Loaded weight cannot exceed pending weight");
        }

        if (loadedWeight.compareTo(deal.getWeight()) < 0) {
            // Partial Load: Create a child deal for the loaded amount
            Deal loadedDeal = new Deal();
            loadedDeal.setDealDate(deal.getDealDate());
            loadedDeal.setLoadDate(loadDate);
            loadedDeal.setPurchaser(deal.getPurchaser());
            loadedDeal.setSeller(deal.getSeller());
            loadedDeal.setItem(deal.getItem());
            loadedDeal.setMarka(deal.getMarka());
            loadedDeal.setRate(deal.getRate());
            loadedDeal.setPacketWeight(deal.getPacketWeight());
            loadedDeal.setBrokeragePayer(deal.getBrokeragePayer());
            loadedDeal.setParentDeal(deal); // Link to parent

            loadedDeal.setWeight(loadedWeight);
            if (deal.getPacketWeight() != null && deal.getPacketWeight().compareTo(BigDecimal.ZERO) > 0) {
                loadedDeal.setNumberOfPackets(
                    loadedWeight.multiply(new BigDecimal("100")).divide(deal.getPacketWeight(), 0, RoundingMode.HALF_UP).intValue()
                );
            }

            // Pro-rate brokerage
            BigDecimal ratio = loadedWeight.divide(deal.getWeight(), 10, RoundingMode.HALF_UP);
            if (deal.getPBrokerage() != null) {
                loadedDeal.setPBrokerage(deal.getPBrokerage().multiply(ratio).setScale(2, RoundingMode.HALF_UP));
                deal.setPBrokerage(deal.getPBrokerage().subtract(loadedDeal.getPBrokerage()));
            }
            if (deal.getSBrokerage() != null) {
                loadedDeal.setSBrokerage(deal.getSBrokerage().multiply(ratio).setScale(2, RoundingMode.HALF_UP));
                deal.setSBrokerage(deal.getSBrokerage().subtract(loadedDeal.getSBrokerage()));
            }

            loadedDeal.setStatus(DealStatus.LOADED);
            dealRepository.save(loadedDeal);

            // Update parent deal
            deal.setWeight(deal.getWeight().subtract(loadedWeight));
            if (deal.getPacketWeight() != null && deal.getPacketWeight().compareTo(BigDecimal.ZERO) > 0) {
                deal.setNumberOfPackets(
                    deal.getWeight().multiply(new BigDecimal("100")).divide(deal.getPacketWeight(), 0, RoundingMode.HALF_UP).intValue()
                );
            }
            return dealRepository.save(deal);
        } else {
            // Full Load
            deal.setStatus(DealStatus.LOADED);
            deal.setLoadDate(loadDate);
            return dealRepository.save(deal);
        }
    }
}
