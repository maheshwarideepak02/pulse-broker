package com.pulsebroker.pulse_broker_api;

import com.pulsebroker.pulse_broker_api.controller.DealController;
import com.pulsebroker.pulse_broker_api.controller.ItemController;
import com.pulsebroker.pulse_broker_api.entity.*;
import com.pulsebroker.pulse_broker_api.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@Transactional
@org.springframework.test.context.TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb-val",
    "spring.datasource.driverClassName=org.h2.Driver"
})
public class ValidationIntegrationTest {

    @Autowired
    private DealController dealController;

    @Autowired
    private ItemController itemController;

    @Autowired
    private DealRepository dealRepository;
    
    @Autowired
    private BillRepository billRepository;

    @Autowired
    private FirmRepository firmRepository;

    @Autowired
    private ContactRepository contactRepository;

    @BeforeEach
    void setup() {
        dealRepository.deleteAll();
        billRepository.deleteAll();
        firmRepository.deleteAll();
        contactRepository.deleteAll();
    }

    @Test
    void testGhostDealPrevention_CannotLoadWithoutFirms() {
        Deal deal = new Deal();
        deal.setWeight(new BigDecimal("100"));
        deal.setStatus(DealStatus.PENDING);
        Deal savedDeal = dealRepository.save(deal);

        Map<String, Object> loadPayload = Map.of(
            "weight", "50",
            "loadDate", "2026-06-21"
        );

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            dealController.loadDeal(savedDeal.getId(), loadPayload);
        });
        
        assertTrue(exception.getMessage().contains("Cannot dispatch load. A loaded deal must have both a Purchaser and Seller firm assigned."));
    }

    @Test
    void testBilledModificationLock_CannotEditPartiallyBilledDeal() {
        Contact contact = new Contact();
        contact.setName("Test Contact");
        contactRepository.save(contact);

        Firm purchaser = new Firm();
        purchaser.setName("Purchaser Firm");
        purchaser.setContact(contact);
        firmRepository.save(purchaser);

        Firm seller = new Firm();
        seller.setName("Seller Firm");
        seller.setContact(contact);
        firmRepository.save(seller);

        Deal deal = new Deal();
        deal.setPurchaser(purchaser);
        deal.setSeller(seller);
        deal.setWeight(new BigDecimal("100"));
        deal.setRate(new BigDecimal("5000"));
        deal.setStatus(DealStatus.LOADED);

        Bill pBill = new Bill();
        pBill.setFirm(purchaser);
        pBill.setTotalAmount(new BigDecimal("1000"));
        billRepository.save(pBill);

        deal.setPurchaserBill(pBill);
        Deal savedDeal = dealRepository.save(deal);

        savedDeal.setWeight(new BigDecimal("200"));
        
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            dealController.updateDeal(savedDeal.getId(), savedDeal);
        });
        
        assertTrue(exception.getMessage().contains("Cannot edit a deal that has been billed or partially billed. Cancel the bill(s) first."));
    }

    @Test
    void testEmptyStringMasterDataBlock_CannotCreateEmptyItem() {
        Item emptyItem = new Item();
        emptyItem.setName("   "); // Blank string

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            itemController.create(emptyItem);
        });
        
        assertTrue(exception.getMessage().contains("Item name cannot be empty."));
    }
}
