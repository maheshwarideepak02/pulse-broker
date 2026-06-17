package com.pulsebroker.pulse_broker_api.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class BillPreviewDTO {
    private List<DealBillItemDTO> items;
    private BigDecimal totalAmount;
    private String firmName;
}
