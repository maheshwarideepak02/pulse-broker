package com.pulsebroker.pulse_broker_api.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class DealBillItemDTO {
    private Long dealId;
    private Long parentDealId;
    private LocalDate dealDate;
    private String loadDate;
    private String oppositePartyName;
    private String itemMarka;
    private BigDecimal weight;
    private Integer numberOfPackets;
    private BigDecimal rate;
    private BigDecimal computedBrokerage;
    
    // Breakdown fields for transparency (PURCHASER_BOTH / SELLER_BOTH)
    private BigDecimal pBrokerage;
    private BigDecimal sBrokerage;
    private String brokeragePayer;
}
