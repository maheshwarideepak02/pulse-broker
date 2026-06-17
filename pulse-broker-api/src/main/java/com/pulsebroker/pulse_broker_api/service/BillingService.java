package com.pulsebroker.pulse_broker_api.service;

import com.pulsebroker.pulse_broker_api.dto.BillDetailDTO;
import com.pulsebroker.pulse_broker_api.dto.BillPreviewDTO;
import com.pulsebroker.pulse_broker_api.dto.DealBillItemDTO;
import com.pulsebroker.pulse_broker_api.entity.*;
import com.pulsebroker.pulse_broker_api.repository.BillRepository;
import com.pulsebroker.pulse_broker_api.repository.DealRepository;
import com.pulsebroker.pulse_broker_api.repository.FirmRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Year;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class BillingService {

    @Autowired
    private DealRepository dealRepository;

    @Autowired
    private FirmRepository firmRepository;

    @Autowired
    private BillRepository billRepository;

    public BillPreviewDTO previewBill(Long firmId, LocalDate fromDate, LocalDate toDate) {
        Firm firm = firmRepository.findById(firmId).orElseThrow(() -> new RuntimeException("Firm not found"));
        
        // Find all loaded or billed deals where this firm is involved
        List<Deal> loadedDeals = dealRepository.findByStatusIn(java.util.Arrays.asList(DealStatus.LOADED, DealStatus.BILLED)).stream()
                .filter(d -> {
                    boolean include = false;
                    if (d.getPurchaser() != null && d.getPurchaser().getId().equals(firmId) && d.getPurchaserBill() == null) {
                        include = true;
                    }
                    if (d.getSeller() != null && d.getSeller().getId().equals(firmId) && d.getSellerBill() == null) {
                        include = true;
                    }
                    return include;
                })
                .filter(d -> {
                    if (d.getDealDate() == null) return true; // Include deals without dates so they don't get lost
                    boolean afterFrom = fromDate == null || !d.getDealDate().isBefore(fromDate);
                    boolean beforeTo = toDate == null || !d.getDealDate().isAfter(toDate);
                    return afterFrom && beforeTo;
                })
                .collect(Collectors.toList());

        List<DealBillItemDTO> items = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (Deal d : loadedDeals) {
            BigDecimal computedBrokerage = calculateOwedBrokerage(d, firmId);
            if (computedBrokerage.compareTo(BigDecimal.ZERO) == 0) {
                continue; // Skip if they owe nothing for this deal
            }

            DealBillItemDTO dto = buildDealBillItemDTO(d, firmId, computedBrokerage);
            items.add(dto);
            totalAmount = totalAmount.add(computedBrokerage);
        }

        BillPreviewDTO preview = new BillPreviewDTO();
        preview.setFirmName(firm.getName());
        preview.setItems(items);
        preview.setTotalAmount(totalAmount);
        return preview;
    }

    @Transactional
    public Bill generateBill(Long firmId, LocalDate fromDate, LocalDate toDate) {
        BillPreviewDTO preview = previewBill(firmId, fromDate, toDate);
        
        if (preview.getItems().isEmpty()) {
            throw new IllegalArgumentException("No billable deals found for this firm in the given date range.");
        }

        Firm firm = firmRepository.findById(firmId).orElseThrow();

        Bill bill = new Bill();
        bill.setFirm(firm);
        bill.setBillDate(LocalDate.now());
        bill.setTotalAmount(preview.getTotalAmount());
        // Generate a bill number: BILL-2026-X
        bill.setBillNumber("BILL-" + Year.now().getValue() + "-" + System.currentTimeMillis() % 100000);
        
        Bill savedBill = billRepository.save(bill);

        // Update deals
        for (DealBillItemDTO item : preview.getItems()) {
            Deal d = dealRepository.findById(item.getDealId()).orElseThrow();
            
            boolean isPurchaser = d.getPurchaser() != null && d.getPurchaser().getId().equals(firmId);
            boolean isSeller = d.getSeller() != null && d.getSeller().getId().equals(firmId);
            
            if (isPurchaser) d.setPurchaserBill(savedBill);
            if (isSeller) d.setSellerBill(savedBill);
            
            // Check if fully billed
            boolean purchaserFullyBilled = d.getPurchaser() == null || d.getPurchaserBill() != null || calculateOwedBrokerage(d, d.getPurchaser().getId()).compareTo(BigDecimal.ZERO) == 0;
            boolean sellerFullyBilled = d.getSeller() == null || d.getSellerBill() != null || calculateOwedBrokerage(d, d.getSeller().getId()).compareTo(BigDecimal.ZERO) == 0;
            
            if (purchaserFullyBilled && sellerFullyBilled) {
                d.setStatus(DealStatus.BILLED);
            }
            
            dealRepository.save(d);
        }

        return savedBill;
    }

    public List<Bill> getAllBills() {
        return billRepository.findAllWithFirm();
    }

    @Transactional
    public Bill clearBill(Long billId, LocalDate clearanceDate, BigDecimal discountAmount) {
        Bill bill = billRepository.findById(billId).orElseThrow(() -> new RuntimeException("Bill not found"));
        if (bill.getStatus() == BillStatus.PAID) {
            throw new IllegalArgumentException("Bill is already cleared.");
        }
        bill.setStatus(BillStatus.PAID);
        bill.setClearanceDate(clearanceDate != null ? clearanceDate : LocalDate.now());
        if (discountAmount != null) {
            bill.setDiscountAmount(discountAmount);
        }
        return billRepository.save(bill);
    }

    /**
     * Retrieve full detail of a locked/generated bill including all its deal line items.
     */
    @Transactional(readOnly = true)
    public BillDetailDTO getBillDetail(Long billId) {
        Bill bill = billRepository.findById(billId)
                .orElseThrow(() -> new RuntimeException("Bill not found with ID: " + billId));
        
        Long firmId = bill.getFirm().getId();
        List<Deal> deals = dealRepository.findByPurchaserBillIdOrSellerBillId(billId, billId);

        List<DealBillItemDTO> items = new ArrayList<>();
        for (Deal d : deals) {
            BigDecimal computedBrokerage = calculateOwedBrokerage(d, firmId);
            DealBillItemDTO dto = buildDealBillItemDTO(d, firmId, computedBrokerage);
            items.add(dto);
        }

        BillDetailDTO detail = new BillDetailDTO();
        detail.setBillId(bill.getId());
        detail.setBillNumber(bill.getBillNumber());
        detail.setBillDate(bill.getBillDate());
        detail.setFirmName(bill.getFirm().getName());
        detail.setTotalAmount(bill.getTotalAmount());
        detail.setDiscountAmount(bill.getDiscountAmount());
        detail.setStatus(bill.getStatus() != null ? bill.getStatus().name() : "UNPAID");
        detail.setClearanceDate(bill.getClearanceDate());
        detail.setItems(items);
        return detail;
    }

    /**
     * Build a DealBillItemDTO from a Deal, including brokerage breakdown fields.
     */
    private DealBillItemDTO buildDealBillItemDTO(Deal d, Long firmId, BigDecimal computedBrokerage) {
        DealBillItemDTO dto = new DealBillItemDTO();
        dto.setDealId(d.getId());
        if (d.getParentDeal() != null) {
            dto.setParentDealId(d.getParentDeal().getId());
        }
        dto.setDealDate(d.getDealDate());
        dto.setLoadDate(d.getLoadDate());
        dto.setOppositePartyName(getOppositePartyName(d, firmId));
        String itemName = d.getItem() != null ? d.getItem().getName() : "Unknown Item";
        String markaName = d.getMarka() != null ? d.getMarka().getName() : "Unknown Marka";
        dto.setItemMarka(itemName + " (" + markaName + ")");
        dto.setWeight(d.getWeight());
        dto.setNumberOfPackets(d.getNumberOfPackets());
        dto.setRate(d.getRate());
        dto.setComputedBrokerage(computedBrokerage);
        
        // Breakdown fields for transparency
        dto.setPBrokerage(d.getPBrokerage() != null ? d.getPBrokerage() : BigDecimal.ZERO);
        dto.setSBrokerage(d.getSBrokerage() != null ? d.getSBrokerage() : BigDecimal.ZERO);
        dto.setBrokeragePayer(d.getBrokeragePayer() != null ? d.getBrokeragePayer().name() : "SEPARATE");
        
        return dto;
    }

    private BigDecimal calculateOwedBrokerage(Deal deal, Long firmId) {
        boolean isPurchaser = deal.getPurchaser() != null && deal.getPurchaser().getId().equals(firmId);
        boolean isSeller = deal.getSeller() != null && deal.getSeller().getId().equals(firmId);
        
        BigDecimal pBrok = deal.getPBrokerage() != null ? deal.getPBrokerage() : BigDecimal.ZERO;
        BigDecimal sBrok = deal.getSBrokerage() != null ? deal.getSBrokerage() : BigDecimal.ZERO;

        if (deal.getBrokeragePayer() == BrokeragePayer.PURCHASER_BOTH) {
            if (isPurchaser) return pBrok.add(sBrok);
            if (isSeller) return BigDecimal.ZERO;
        } else if (deal.getBrokeragePayer() == BrokeragePayer.SELLER_BOTH) {
            if (isSeller) return pBrok.add(sBrok);
            if (isPurchaser) return BigDecimal.ZERO;
        }

        // SEPARATE
        if (isPurchaser) return pBrok;
        if (isSeller) return sBrok;
        
        return BigDecimal.ZERO;
    }

    private String getOppositePartyName(Deal deal, Long firmId) {
        if (deal.getPurchaser() != null && deal.getPurchaser().getId().equals(firmId)) {
            return deal.getSeller() != null ? deal.getSeller().getName() : "";
        }
        if (deal.getSeller() != null && deal.getSeller().getId().equals(firmId)) {
            return deal.getPurchaser() != null ? deal.getPurchaser().getName() : "";
        }
        return "";
    }
}

