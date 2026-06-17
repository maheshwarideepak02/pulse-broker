package com.pulsebroker.pulse_broker_api.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class BillDetailDTO {
    private Long billId;
    private String billNumber;
    private LocalDate billDate;
    private String firmName;
    private BigDecimal totalAmount;
    private String status;
    private LocalDate clearanceDate;
    private List<DealBillItemDTO> items;
}
