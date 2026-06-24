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

    @Autowired
    private com.pulsebroker.pulse_broker_api.repository.FirmRepository firmRepository;

    @Transactional
    public Deal loadDeal(Long dealId, BigDecimal loadedWeight, String loadDate, Long purchaserId, Long sellerId) {
        Deal deal = dealRepository.findById(dealId)
                .orElseThrow(() -> new RuntimeException("Deal not found"));

        if (deal.getStatus() != DealStatus.PENDING) {
            throw new RuntimeException("Only PENDING deals can be loaded");
        }

        if (loadedWeight.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Loaded weight must be greater than zero");
        }

        if (loadedWeight.compareTo(deal.getWeight()) > 0) {
            throw new RuntimeException("Loaded weight cannot exceed pending weight");
        }

        if (loadedWeight.compareTo(deal.getWeight()) < 0) {
            // Partial Load: Create a child deal for the loaded amount
            Deal loadedDeal = new Deal();
            loadedDeal.setDealDate(deal.getDealDate());
            loadedDeal.setLoadDate(loadDate);
            loadedDeal.setPurchaserContact(deal.getPurchaserContact());
            loadedDeal.setSellerContact(deal.getSellerContact());
            if (purchaserId != null) {
                loadedDeal.setPurchaser(firmRepository.findById(purchaserId).orElseThrow(() -> new IllegalArgumentException("Purchaser firm not found")));
            } else {
                loadedDeal.setPurchaser(deal.getPurchaser());
            }
            if (sellerId != null) {
                loadedDeal.setSeller(firmRepository.findById(sellerId).orElseThrow(() -> new IllegalArgumentException("Seller firm not found")));
            } else {
                loadedDeal.setSeller(deal.getSeller());
            }
            loadedDeal.setItem(deal.getItem());
            loadedDeal.setMarka(deal.getMarka());
            loadedDeal.setRate(deal.getRate());
            loadedDeal.setMarginMarkup(deal.getMarginMarkup() != null ? deal.getMarginMarkup() : java.math.BigDecimal.ZERO);
            loadedDeal.setPurchaserRate(deal.getPurchaserRate() != null ? deal.getPurchaserRate() : deal.getRate());
            loadedDeal.setPacketWeight(deal.getPacketWeight());
            loadedDeal.setBrokeragePayer(deal.getBrokeragePayer());
            loadedDeal.setPBrokType(deal.getPBrokType());
            loadedDeal.setPBrokVal(deal.getPBrokVal());
            loadedDeal.setSBrokType(deal.getSBrokType());
            loadedDeal.setSBrokVal(deal.getSBrokVal());
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

            if (loadedDeal.getPurchaser() == null || loadedDeal.getSeller() == null) {
                throw new IllegalArgumentException("Cannot dispatch load. A loaded deal must have both a Purchaser and Seller firm assigned.");
            }
            loadedDeal.setStatus(DealStatus.LOADED);
            dealRepository.save(loadedDeal);

            // Update parent deal
            deal.setWeight(deal.getWeight().subtract(loadedWeight));
            if (deal.getPacketWeight() != null && deal.getPacketWeight().compareTo(BigDecimal.ZERO) > 0) {
                if (deal.getNumberOfPackets() != null && loadedDeal.getNumberOfPackets() != null) {
                    deal.setNumberOfPackets(deal.getNumberOfPackets() - loadedDeal.getNumberOfPackets());
                } else {
                    deal.setNumberOfPackets(
                        deal.getWeight().multiply(new BigDecimal("100")).divide(deal.getPacketWeight(), 0, RoundingMode.HALF_UP).intValue()
                    );
                }
            }
            dealRepository.save(deal);
            return loadedDeal;
        } else {
            // Full Load
            deal.setLoadDate(loadDate);
            if (purchaserId != null) {
                deal.setPurchaser(firmRepository.findById(purchaserId).orElseThrow(() -> new IllegalArgumentException("Purchaser firm not found")));
            }
            if (sellerId != null) {
                deal.setSeller(firmRepository.findById(sellerId).orElseThrow(() -> new IllegalArgumentException("Seller firm not found")));
            }

            if (deal.getPurchaser() == null || deal.getSeller() == null) {
                throw new IllegalArgumentException("Cannot dispatch load. A loaded deal must have both a Purchaser and Seller firm assigned.");
            }
            deal.setStatus(DealStatus.LOADED);
            return dealRepository.save(deal);
        }
    }
}
