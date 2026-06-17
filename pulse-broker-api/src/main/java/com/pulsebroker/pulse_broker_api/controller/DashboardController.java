package com.pulsebroker.pulse_broker_api.controller;

import com.pulsebroker.pulse_broker_api.dto.DashboardSummaryDTO;
import com.pulsebroker.pulse_broker_api.entity.Bill;
import com.pulsebroker.pulse_broker_api.entity.Deal;
import com.pulsebroker.pulse_broker_api.entity.DealStatus;
import com.pulsebroker.pulse_broker_api.entity.BrokeragePayer;
import com.pulsebroker.pulse_broker_api.repository.BillRepository;
import com.pulsebroker.pulse_broker_api.repository.DealRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import com.pulsebroker.pulse_broker_api.entity.BillStatus;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    @Autowired
    private DealRepository dealRepository;

    @Autowired
    private BillRepository billRepository;

    @GetMapping("/summary")
    public DashboardSummaryDTO getSummary() {
        DashboardSummaryDTO summary = new DashboardSummaryDTO();

        List<Bill> allBills = billRepository.findAll();
        
        // 1. Total Billed (Sum of all generated bills)
        BigDecimal totalBilled = allBills.stream()
                .map(Bill::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        summary.setTotalBilled(totalBilled);

        // 2. Total Outstanding (Sum of all UNPAID bills)
        BigDecimal totalOutstanding = allBills.stream()
                .filter(b -> b.getStatus() == null || b.getStatus() == BillStatus.UNPAID)
                .map(Bill::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        summary.setTotalOutstanding(totalOutstanding);

        // 2. Pending Loads (Count of PENDING deals)
        long pendingCount = dealRepository.findByStatus(DealStatus.PENDING).size();
        summary.setPendingLoads(pendingCount);

        // 3. Deals This Month (Count of all deals created this month)
        LocalDate startOfMonth = LocalDate.now().withDayOfMonth(1);
        long dealsThisMonth = dealRepository.countByDealDateGreaterThanEqual(startOfMonth);
        summary.setDealsThisMonth(dealsThisMonth);

        // 4. Total Unbilled (Sum of all PENDING and LOADED deals' brokerages)
        List<Deal> unbilledDeals = dealRepository.findAll().stream()
                .filter(d -> d.getStatus() == DealStatus.PENDING || d.getStatus() == DealStatus.LOADED)
                .toList();
                
        BigDecimal totalUnbilled = BigDecimal.ZERO;
        for (Deal d : unbilledDeals) {
            BigDecimal pBrok = d.getPBrokerage() != null ? d.getPBrokerage() : BigDecimal.ZERO;
            BigDecimal sBrok = d.getSBrokerage() != null ? d.getSBrokerage() : BigDecimal.ZERO;
            totalUnbilled = totalUnbilled.add(pBrok).add(sBrok);
        }
        summary.setTotalUnbilled(totalUnbilled);

        return summary;
    }
}
