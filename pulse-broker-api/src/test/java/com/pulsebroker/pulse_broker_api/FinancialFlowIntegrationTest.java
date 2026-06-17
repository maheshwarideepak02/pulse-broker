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
    private FirmRepository firmRepository;

    @Autowired
    private BillRepository billRepository;

    private Firm testFirmPurchaser;
    private Firm testFirmSeller;

    @BeforeEach
    void setup() {
        testFirmPurchaser = new Firm();
        testFirmPurchaser.setName("Test Purchaser Firm");
        testFirmPurchaser = firmRepository.save(testFirmPurchaser);

        testFirmSeller = new Firm();
        testFirmSeller.setName("Test Seller Firm");
        testFirmSeller = firmRepository.save(testFirmSeller);
    }

    @Test
    void testNullSafetyEdgeCase() {
        // Scenario: Create a deal with null brokerages and null date
        Deal emptyDeal = new Deal();
        emptyDeal.setWeight(new BigDecimal("100.00"));
        emptyDeal.setRate(new BigDecimal("5000.00"));
        emptyDeal.setBrokeragePayer(BrokeragePayer.SEPARATE);
        emptyDeal.setPurchaser(testFirmPurchaser);
        emptyDeal.setSeller(testFirmSeller);
        emptyDeal.setStatus(DealStatus.PENDING);
        // Note: pBrokerage, sBrokerage, and dealDate are intentionally null!
        emptyDeal = dealRepository.save(emptyDeal);

        final Long emptyDealId = emptyDeal.getId();

        // Action: Partial load
        assertThatCode(() -> {
            dealService.loadDeal(emptyDealId, new BigDecimal("50.00"), LocalDate.now());
        }).doesNotThrowAnyException(); // Proves the NullPointerException is fixed

        Deal remainingPending = dealRepository.findById(emptyDealId).orElseThrow();
        assertThat(remainingPending.getWeight()).isEqualByComparingTo("50.00");
        assertThat(remainingPending.getPBrokerage()).isEqualByComparingTo("0.00");
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
        deal.setPurchaser(testFirmPurchaser);
        deal.setSeller(testFirmSeller);
        deal.setDealDate(LocalDate.now());
        deal.setStatus(DealStatus.PENDING);
        deal = dealRepository.save(deal);

        // Action: Load exactly 33.33 Qtl (1/3rd)
        BigDecimal loadWeight = new BigDecimal("33.33");
        Deal remaining = dealService.loadDeal(deal.getId(), loadWeight, LocalDate.now());

        // Proof: Original deal should have exactly 66.67 weight left
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
        loadedDeal.setPurchaser(testFirmPurchaser);
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
