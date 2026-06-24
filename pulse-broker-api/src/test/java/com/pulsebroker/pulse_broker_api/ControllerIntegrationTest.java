package com.pulsebroker.pulse_broker_api;

import tools.jackson.databind.ObjectMapper;
import com.pulsebroker.pulse_broker_api.entity.*;
import com.pulsebroker.pulse_broker_api.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@org.springframework.test.context.TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:controllertestdb",
    "spring.datasource.driverClassName=org.h2.Driver",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
public class ControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private org.springframework.test.web.servlet.ResultActions performAuth(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder builder) throws Exception {
        return mockMvc.perform(builder.header("Authorization", "Bearer PULSE99"));
    }

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ContactRepository contactRepository;

    @Autowired
    private FirmRepository firmRepository;

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private MarkaRepository markaRepository;

    @Autowired
    private DealRepository dealRepository;

    @Autowired
    private BillRepository billRepository;

    @org.springframework.test.context.bean.override.mockito.MockitoBean
    private com.pulsebroker.pulse_broker_api.service.AuthService authService;

    private Contact contact;
    private Contact purchaserContact;
    private Contact sellerContact;
    private Firm purchaser;
    private Firm seller;
    private Item item;
    private Marka marka;

    @BeforeEach
    void setup() {
        org.mockito.Mockito.when(authService.validateToken("PULSE99")).thenReturn(true);

        contact = new Contact();
        contact.setName("Test Contact");
        contact.setPhone("1234567890");
        contact.setCity("Bareilly");
        contact = contactRepository.save(contact);

        purchaserContact = new Contact();
        purchaserContact.setName("Purchaser Contact");
        purchaserContact.setDefaultBrokType(BrokType.PERCENT);
        purchaserContact.setDefaultBrokVal(new BigDecimal("1.0"));
        purchaserContact = contactRepository.save(purchaserContact);

        purchaser = new Firm();
        purchaser.setName("Purchaser Firm");
        purchaser.setContact(purchaserContact);
        purchaser = firmRepository.save(purchaser);

        sellerContact = new Contact();
        sellerContact.setName("Seller Contact");
        sellerContact.setDefaultBrokType(BrokType.FIXED);
        sellerContact.setDefaultBrokVal(new BigDecimal("2.5"));
        sellerContact = contactRepository.save(sellerContact);

        seller = new Firm();
        seller.setName("Seller Firm");
        seller.setContact(sellerContact);
        seller = firmRepository.save(seller);

        item = new Item();
        item.setName("Chana");
        item = itemRepository.save(item);

        marka = new Marka();
        marka.setName("A-One");
        marka = markaRepository.save(marka);
    }

    @Test
    void testContactEndpoints() throws Exception {
        // Test GET all
        performAuth(get("/api/contacts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Purchaser Contact"));

        // Test POST (create)
        Contact newContact = new Contact();
        newContact.setName("Another Contact");
        performAuth(post("/api/contacts")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newContact)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Another Contact"));

        // Test PUT (update)
        contact.setName("Updated Contact");
        performAuth(put("/api/contacts/" + contact.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(contact)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Contact"));
    }

    @Test
    void testContactDeleteSuccess() throws Exception {
        // Create a contact with no deals
        Contact tempContact = new Contact();
        tempContact.setName("Temp Contact");
        tempContact = contactRepository.save(tempContact);

        Firm tempFirm = new Firm();
        tempFirm.setName("Temp Firm");
        tempFirm.setContact(tempContact);
        firmRepository.save(tempFirm);

        // Delete Contact (should delete tempFirm too)
        performAuth(delete("/api/contacts/" + tempContact.getId()))
                .andExpect(status().isNoContent());

        assertThat(contactRepository.findById(tempContact.getId())).isEmpty();
        assertThat(firmRepository.findById(tempFirm.getId())).isEmpty();
    }

    @Test
    void testFirmEndpoints() throws Exception {
        // Test GET all
        performAuth(get("/api/firms"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Purchaser Firm"));

        // Test PUT (update)
        purchaser.setName("Updated Purchaser");
        performAuth(put("/api/firms/" + purchaser.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(purchaser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Purchaser"));

        // Test DELETE (success since no deals exist)
        performAuth(delete("/api/firms/" + purchaser.getId()))
                .andExpect(status().isNoContent());
        assertThat(firmRepository.findById(purchaser.getId())).isEmpty();
    }

    @Test
    void testItemMarkaEndpoints() throws Exception {
        // Test Item Endpoints
        performAuth(get("/api/items"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Chana"));

        performAuth(delete("/api/items/" + item.getId()))
                .andExpect(status().isNoContent());
        assertThat(itemRepository.findById(item.getId())).isEmpty();

        // Test Marka Endpoints
        performAuth(get("/api/markas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("A-One"));

        performAuth(delete("/api/markas/" + marka.getId()))
                .andExpect(status().isNoContent());
        assertThat(markaRepository.findById(marka.getId())).isEmpty();
    }

    @Test
    void testDealAndBillingEndpoints() throws Exception {
        // Create Deal
        Deal deal = new Deal();
        deal.setDealDate(LocalDate.now());
        deal.setPurchaserContact(purchaserContact);
        deal.setSellerContact(sellerContact);
        deal.setPurchaser(purchaser);
        deal.setSeller(seller);
        deal.setItem(item);
        deal.setMarka(marka);
        deal.setWeight(new BigDecimal("50.00"));
        deal.setRate(new BigDecimal("100.00"));
        deal.setPBrokerage(new BigDecimal("75.00"));
        deal.setSBrokerage(new BigDecimal("500.00"));
        deal.setStatus(DealStatus.PENDING);
        deal.setBrokeragePayer(BrokeragePayer.SEPARATE);
        deal = dealRepository.save(deal);

        // Deleting item should fail because it is referenced in deal
        performAuth(delete("/api/items/" + item.getId()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Cannot delete item because it is referenced in deals."));

        // Deleting firm should fail because it has deal
        performAuth(delete("/api/firms/" + purchaser.getId()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Cannot delete firm because it has associated deals."));

        // Load Deal (Full Load)
        performAuth(post("/api/deals/" + deal.getId() + "/load")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"weight\":\"50.00\",\"loadDate\":\"" + LocalDate.now() + "\"}"))
                .andExpect(status().isOk());

        Deal loadedDeal = dealRepository.findById(deal.getId()).orElseThrow();
        assertThat(loadedDeal.getStatus()).isEqualTo(DealStatus.LOADED);

        // Generate Bill
        performAuth(post("/api/billing/generate?firmId=" + purchaser.getId()))
                .andExpect(status().isOk());

        loadedDeal = dealRepository.findById(deal.getId()).orElseThrow();
        assertThat(loadedDeal.getStatus()).isEqualTo(DealStatus.LOADED); // Remains LOADED because seller isn't billed yet
        Bill bill = loadedDeal.getPurchaserBill();
        assertThat(bill).isNotNull();

        // Attempting to delete billed deal should fail
        performAuth(delete("/api/deals/" + deal.getId()))
                .andExpect(status().isBadRequest());

        // Delete Bill (should revert deal back to LOADED and remove bill link)
        performAuth(delete("/api/billing/" + bill.getId()))
                .andExpect(status().isNoContent());

        loadedDeal = dealRepository.findById(deal.getId()).orElseThrow();
        assertThat(loadedDeal.getStatus()).isEqualTo(DealStatus.LOADED);
        assertThat(loadedDeal.getPurchaserBill()).isNull();
    }
}
