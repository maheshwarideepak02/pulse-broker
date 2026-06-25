package com.pulsebroker.pulse_broker_api.util;

import com.pulsebroker.pulse_broker_api.entity.Deal;
import java.math.BigDecimal;
import java.math.RoundingMode;

public class BrokerageCalculator {

    public static void computeBrokerages(Deal deal) {
        if (deal.getWeight() != null) {
            // compute P Brokerage
            if (deal.getPBrokVal() != null) {
                if ("FIXED".equals(deal.getPBrokType())) {
                    deal.setPBrokerage(deal.getPBrokVal().multiply(deal.getWeight()).setScale(2, RoundingMode.HALF_UP));
                } else if ("PERCENT".equals(deal.getPBrokType()) && deal.getRate() != null) {
                    BigDecimal totalValue = deal.getWeight().multiply(deal.getRate());
                    deal.setPBrokerage(totalValue.multiply(deal.getPBrokVal()).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP));
                } else {
                    deal.setPBrokerage(BigDecimal.ZERO);
                }
            } else {
                deal.setPBrokerage(BigDecimal.ZERO);
            }
            
            // compute S Brokerage
            if (deal.getSBrokVal() != null) {
                if ("FIXED".equals(deal.getSBrokType())) {
                    deal.setSBrokerage(deal.getSBrokVal().multiply(deal.getWeight()).setScale(2, RoundingMode.HALF_UP));
                } else if ("PERCENT".equals(deal.getSBrokType()) && deal.getRate() != null) {
                    BigDecimal totalValue = deal.getWeight().multiply(deal.getRate());
                    deal.setSBrokerage(totalValue.multiply(deal.getSBrokVal()).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP));
                } else {
                    deal.setSBrokerage(BigDecimal.ZERO);
                }
            } else {
                deal.setSBrokerage(BigDecimal.ZERO);
            }
        }
    }
}
