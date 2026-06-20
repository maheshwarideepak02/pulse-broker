package com.pulsebroker.pulse_broker_api.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class DashboardSummaryDTO {
    private BigDecimal totalBilled;
    private BigDecimal totalOutstanding;
    private BigDecimal totalUnbilled;
    private long dealsThisMonth;
    private long dealsPreviousMonth;
    private long pendingLoads;
}
