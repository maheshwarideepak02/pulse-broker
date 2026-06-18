package com.pulsebroker.pulse_broker_api;

import com.pulsebroker.pulse_broker_api.entity.*;
import com.pulsebroker.pulse_broker_api.repository.*;
import com.pulsebroker.pulse_broker_api.service.BillingService;
import com.pulsebroker.pulse_broker_api.service.DealService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

@SpringBootTest
@Transactional
@org.springframework.test.context.TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb",
    "spring.datasource.driverClassName=org.h2.Driver",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
class FinancialFlowIntegrationTest {

    @Autowired
    private DealService dealService;

    @Autowired
    private BillingService billingService;

    @Autowired
    private DealRepository dealRepository;

    @Autowired
    private com.pulsebroker.pulse_broker_api.repository.ContactRepository contactRepository;

    @Autowired
    private FirmRepository firmRepository;

    @Autowired
    private BillRepository billRepository;

    private Firm testFirmPurchaser;
    private Firm testFirmSeller;

    @BeforeEach
    void setup() {
        Contact c1 = new Contact();
        c1.setName("C1");
        c1 = contactRepository.save(c1);

        Contact c2 = new Contact();
        c2.setName("C2");
        c2 = contactRepository.save(c2);

        testFirmPurchaser = new Firm();
        testFirmPurchaser.setName("Test Purchaser Firm");
        testFirmPurchaser.setContact(c1);
        testFirmPurchaser = firmRepository.save(testFirmPurchaser);

        testFirmSeller = new Firm();
        testFirmSeller.setName("Test Seller Firm");
        testFirmSeller.setContact(c2);
        testFirmSeller = firmRepository.save(testFirmSeller);
    }

    @Test
    void testNullSafetyEdgeCase() {
        // Scenario: Create a deal with null brokerages and null date
        Deal emptyDeal = new Deal();
        emptyDeal.setWeight(new BigDecimal("100.00"));
        emptyDeal.setRate(new BigDecimal("5000.00"));
        emptyDeal.setBrokeragePayer(BrokeragePayer.SEPARATE);
        emptyDeal.setPurchaserContact(testFirmPurchaser.getContact());
        emptyDeal.setSellerContact(testFirmSeller.getContact());
        emptyDeal.setPurchaser(testFirmPurchaser);
        emptyDeal.setSeller(testFirmSeller);
        emptyDeal.setStatus(DealStatus.PENDING);
        // Note: pBrokerage, sBrokerage, and dealDate are intentionally null!
        emptyDeal = dealRepository.save(emptyDeal);

        final Long emptyDealId = emptyDeal.getId();

        // --- 3. Partial Load 50qtl ---
        Deal partialLoad1 = dealService.loadDeal(emptyDeal.getId(), new BigDecimal("50.00"), LocalDate.now().toString(), null, null);
        assertThat(partialLoad1.getStatus()).isEqualTo(DealStatus.LOADED);
        assertThat(partialLoad1.getWeight()).isEqualByComparingTo("50.00");
        assertThat(partialLoad1.getParentDeal()).isNotNull();

        // Refresh original deal
        emptyDeal = dealRepository.findById(emptyDeal.getId()).orElseThrow();
        assertThat(emptyDeal.getWeight()).isEqualByComparingTo("50.00"); // 100 - 50
        assertThat(emptyDeal.getStatus()).isEqualTo(DealStatus.PENDING);
        
        // --- 4. Partial Load Remaining 50qtl ---
        Deal partialLoad2 = dealService.loadDeal(emptyDeal.getId(), new BigDecimal("50.00"), LocalDate.now().toString(), null, null);
    }

    @Test
    void testComplexMathPartialLoad() {
        // Scenario: Deal of 100 Qtl. Purchaser pays 500 fixed. Seller pays 200 fixed.
        Deal deal = new Deal();
        deal.setWeight(new BigDecimal("100.00"));
        deal.setRate(new BigDecimal("5000.00"));
        deal.setPBrokerage(new BigDecimal("500.00"));
        deal.setSBrokerage(new BigDecimal("200.00"));
        deal.setBrokeragePayer(BrokeragePayer.SEPARATE);
        deal.setPurchaserContact(testFirmPurchaser.getContact());
        deal.setSellerContact(testFirmSeller.getContact());
        deal.setPurchaser(testFirmPurchaser);
        deal.setSeller(testFirmSeller);
        deal.setDealDate(LocalDate.now());
        deal.setStatus(DealStatus.PENDING);
        deal = dealRepository.save(deal);

        // Action: Load exactly 33.33 Qtl (1/3rd)
        BigDecimal loadWeight = new BigDecimal("33.33");
        Deal loadedDeal = dealService.loadDeal(deal.getId(), loadWeight, LocalDate.now().toString(), null, null);
        assertThat(loadedDeal.getWeight()).isEqualByComparingTo("33.33");

        // Proof: Original deal should have exactly 66.67 weight left
        Deal remaining = dealRepository.findById(deal.getId()).orElseThrow();
        assertThat(remaining.getWeight()).isEqualByComparingTo("66.67");
        // Remaining pBrok: 500 - 166.65 = 333.35
        assertThat(remaining.getPBrokerage()).isEqualByComparingTo("333.35");
        // Remaining sBrok: 200 - 66.66 = 133.34
        assertThat(remaining.getSBrokerage()).isEqualByComparingTo("133.34");

        // Find the newly loaded portion
        final Long parentDealId = deal.getId();
        List<Deal> children = dealRepository.findAll().stream()
            .filter(d -> parentDealId.equals(d.getParentDeal() != null ? d.getParentDeal().getId() : null))
            .toList();
        
        assertThat(children).hasSize(1);
        Deal loadedPortion = children.get(0);
        
        // Proof: Loaded portion should be roughly 1/3rd of the brokerages
        assertThat(loadedPortion.getPBrokerage()).isEqualByComparingTo("166.65");
        assertThat(loadedPortion.getSBrokerage()).isEqualByComparingTo("66.66");
    }

    @Test
    void testPartialLoadWithDifferentFirms() {
        // Create an unassigned parent deal (only Contact, no Firm)
        Deal deal = new Deal();
        deal.setWeight(new BigDecimal("100.00"));
        deal.setRate(new BigDecimal("5000.00"));
        deal.setPBrokerage(new BigDecimal("100.00"));
        deal.setSBrokerage(new BigDecimal("100.00"));
        deal.setBrokeragePayer(BrokeragePayer.SEPARATE);
        deal.setPurchaserContact(testFirmPurchaser.getContact());
        deal.setSellerContact(testFirmSeller.getContact());
        deal.setPurchaser(null); // Explicitly unassigned
        deal.setSeller(null);
        deal.setDealDate(LocalDate.now());
        deal.setStatus(DealStatus.PENDING);
        deal = dealRepository.save(deal);

        // Load 1: 50 Qtl assigned to testFirmPurchaser
        Deal load1 = dealService.loadDeal(deal.getId(), new BigDecimal("50.00"), LocalDate.now().toString(), testFirmPurchaser.getId(), null);
        assertThat(load1.getWeight()).isEqualByComparingTo("50.00");
        assertThat(load1.getPurchaser().getId()).isEqualTo(testFirmPurchaser.getId());

        // Create a second firm for the same contact
        Firm secondPurchaserFirm = new Firm();
        secondPurchaserFirm.setName("Second Purchaser Firm");
        secondPurchaserFirm.setContact(testFirmPurchaser.getContact());
        secondPurchaserFirm = firmRepository.save(secondPurchaserFirm);

        // Load 2: Remaining 50 Qtl assigned to secondPurchaserFirm
        Deal load2 = dealService.loadDeal(deal.getId(), new BigDecimal("50.00"), LocalDate.now().toString(), secondPurchaserFirm.getId(), null);
        assertThat(load2.getWeight()).isEqualByComparingTo("50.00");
        assertThat(load2.getPurchaser().getId()).isEqualTo(secondPurchaserFirm.getId());

        // Original deal should now be fully LOADED and have weight 50.00 (the remaining portion)
        Deal remaining = dealRepository.findById(deal.getId()).orElseThrow();
        assertThat(remaining.getWeight()).isEqualByComparingTo("50.00");
        assertThat(remaining.getStatus()).isEqualTo(DealStatus.LOADED);

        // Verify Billing Isolation
        com.pulsebroker.pulse_broker_api.dto.BillPreviewDTO bill1 = billingService.previewBill(testFirmPurchaser.getId(), null, null);
        assertThat(bill1.getItems()).hasSize(1);
        assertThat(bill1.getItems().get(0).getDealId()).isEqualTo(load1.getId());

        com.pulsebroker.pulse_broker_api.dto.BillPreviewDTO bill2 = billingService.previewBill(secondPurchaserFirm.getId(), null, null);
        assertThat(bill2.getItems()).hasSize(1);
        assertThat(bill2.getItems().get(0).getDealId()).isEqualTo(remaining.getId());
    }

    @Autowired
    private ItemRepository itemRepository;

    @Test
    void testDoubleBillingPrevention() {
        // Create an item
        Item testItem = new Item();
        testItem.setName("Test Item");
        testItem = itemRepository.save(testItem);

        // Scenario: 1 LOADED deal for Purchaser
        Deal loadedDeal = new Deal();
        loadedDeal.setWeight(new BigDecimal("100.00"));
        loadedDeal.setRate(new BigDecimal("5000.00"));
        loadedDeal.setPBrokerage(new BigDecimal("1000.00"));
        loadedDeal.setBrokeragePayer(BrokeragePayer.PURCHASER_BOTH);
        loadedDeal.setPurchaserContact(testFirmPurchaser.getContact());
        loadedDeal.setSellerContact(testFirmSeller.getContact());
        loadedDeal.setPurchaser(testFirmPurchaser);
        loadedDeal.setSeller(testFirmSeller); // Need a seller for DB constraints
        loadedDeal.setItem(testItem);
        loadedDeal.setStatus(DealStatus.LOADED);
        loadedDeal.setDealDate(LocalDate.now());
        loadedDeal.setPacketWeight(new BigDecimal("20.00"));
        loadedDeal.setNumberOfPackets(500);
        dealRepository.save(loadedDeal);

        // Action: Generate Bill 1
        Bill firstBill = billingService.generateBill(testFirmPurchaser.getId(), null, null);
        assertThat(firstBill.getTotalAmount()).isEqualByComparingTo("1000.00");

        // Proof: Deal is now BILLED and packets are preserved
        Deal lockedDeal = dealRepository.findById(loadedDeal.getId()).orElseThrow();
        assertThat(lockedDeal.getStatus()).isEqualTo(DealStatus.BILLED);
        assertThat(lockedDeal.getNumberOfPackets()).isEqualTo(500);
        assertThat(lockedDeal.getPacketWeight()).isEqualByComparingTo("20.00");

        // Action: Generate Bill 2 immediately
        assertThatCode(() -> {
            billingService.generateBill(testFirmPurchaser.getId(), null, null);
        }).hasMessageContaining("No billable deals found");
    }

    @Test
    void testPaymentClearance() {
        // Scenario: Generate an unpaid bill
        Bill bill = new Bill();
        bill.setFirm(testFirmPurchaser);
        bill.setBillNumber("TEST-123");
        bill.setTotalAmount(new BigDecimal("5000.00"));
        bill.setStatus(BillStatus.UNPAID);
        bill = billRepository.save(bill);

        // Action: Clear the bill with Kasar
        LocalDate clearanceDate = LocalDate.now().plusDays(2);
        BigDecimal kasar = new BigDecimal("150.00");
        Bill clearedBill = billingService.clearBill(bill.getId(), clearanceDate, kasar);

        // Proof: Status is PAID, date is set, and Kasar is saved
        assertThat(clearedBill.getStatus()).isEqualTo(BillStatus.PAID);
        assertThat(clearedBill.getClearanceDate()).isNotNull();
        assertThat(clearedBill.getDiscountAmount()).isEqualByComparingTo("150.00");

        // Proof: Cannot clear an already cleared bill
        assertThatCode(() -> {
            billingService.clearBill(clearedBill.getId(), clearanceDate, null);
        }).hasMessageContaining("already cleared");
    }
}
