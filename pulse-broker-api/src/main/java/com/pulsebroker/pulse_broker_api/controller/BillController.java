package com.pulsebroker.pulse_broker_api.controller;

import com.pulsebroker.pulse_broker_api.dto.BillDetailDTO;
import com.pulsebroker.pulse_broker_api.dto.BillPreviewDTO;
import com.pulsebroker.pulse_broker_api.entity.Bill;
import com.pulsebroker.pulse_broker_api.entity.Deal;
import com.pulsebroker.pulse_broker_api.entity.DealStatus;
import com.pulsebroker.pulse_broker_api.service.BillingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/billing")
public class BillController {

    @Autowired
    private BillingService billingService;

    @GetMapping("/preview")
    public BillPreviewDTO preview(
            @RequestParam Long firmId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        return billingService.previewBill(firmId, fromDate, toDate);
    }

    @PostMapping("/generate")
    public Bill generate(
            @RequestParam Long firmId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        return billingService.generateBill(firmId, fromDate, toDate);
    }

    @GetMapping
    public java.util.List<Bill> getAllBills() {
        return billingService.getAllBills();
    }

    @GetMapping("/{billId}/detail")
    public BillDetailDTO getBillDetail(@PathVariable Long billId) {
        return billingService.getBillDetail(billId);
    }

    @PostMapping("/{billId}/clear")
    public Bill clearBill(
            @PathVariable Long billId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate clearanceDate) {
        return billingService.clearBill(billId, clearanceDate);
    }

    @Autowired
    private com.pulsebroker.pulse_broker_api.repository.DealRepository dealRepository;

    @Autowired
    private com.pulsebroker.pulse_broker_api.repository.BillRepository billRepository;

    @DeleteMapping("/{id}")
    @org.springframework.web.bind.annotation.ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    @org.springframework.transaction.annotation.Transactional
    public void deleteBill(@PathVariable Long id) {
        Bill bill = billRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Bill not found"));
        
        if (bill.getStatus() == com.pulsebroker.pulse_broker_api.entity.BillStatus.PAID) {
            throw new IllegalStateException("Cannot delete a bill that has already been cleared.");
        }
        
        java.util.List<Deal> deals = dealRepository.findByPurchaserBillIdOrSellerBillId(id, id);
        for (Deal d : deals) {
            if (d.getPurchaserBill() != null && d.getPurchaserBill().getId().equals(id)) {
                d.setPurchaserBill(null);
            }
            if (d.getSellerBill() != null && d.getSellerBill().getId().equals(id)) {
                d.setSellerBill(null);
            }
            d.setStatus(DealStatus.LOADED);
            dealRepository.save(d);
        }
        
        billRepository.delete(bill);
    }
}

