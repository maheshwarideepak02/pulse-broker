package com.pulsebroker.pulse_broker_api;

import com.pulsebroker.pulse_broker_api.controller.DealController;
import com.pulsebroker.pulse_broker_api.entity.Deal;
import com.pulsebroker.pulse_broker_api.entity.DealStatus;
import com.pulsebroker.pulse_broker_api.repository.DealRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
@org.springframework.test.context.TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb",
    "spring.datasource.driverClassName=org.h2.Driver",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
class EdgeCaseIntegrationTest {

    @Autowired
    private DealController dealController;

    @Autowired
    private DealRepository dealRepository;

    @Test
    void testNegativeMarkupIsAllowedButChecked() {
        Deal dealDetails = new Deal();
        dealDetails.setWeight(new BigDecimal("100"));
        dealDetails.setRate(new BigDecimal("5000"));
        dealDetails.setMarginMarkup(new BigDecimal("-50"));
        dealDetails.setPacketWeight(new BigDecimal("50"));
        dealDetails.setDealDate(LocalDate.of(2023, 1, 1));
        
        Deal saved = dealController.create(dealDetails);
        
        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getMarginMarkup()).isEqualTo(new BigDecimal("-50"));
        assertThat(saved.getPurchaserRate()).isEqualTo(new BigDecimal("4950")); // 5000 - 50
    }

    @Test
    void testUpdateBilledDealIsBlocked() {
        Deal deal = new Deal();
        deal.setStatus(DealStatus.BILLED);
        deal.setWeight(new BigDecimal("100"));
        deal.setRate(new BigDecimal("5000"));
        deal = dealRepository.save(deal);

        Deal updateDetails = new Deal();
        updateDetails.setWeight(new BigDecimal("200"));
        
        final Long dealId = deal.getId();
        assertThatThrownBy(() -> dealController.updateDeal(dealId, updateDetails))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Cannot edit a billed deal");
    }

    @Test
    void testAutoLoadUpdatesStatusOnEdit() {
        Deal deal = new Deal();
        deal.setStatus(DealStatus.PENDING);
        deal.setWeight(new BigDecimal("100"));
        deal.setRate(new BigDecimal("5000"));
        deal = dealRepository.save(deal);

        Deal updateDetails = new Deal();
        updateDetails.setLoadDate("2023-10-10");
        updateDetails.setStatus(DealStatus.LOADED);
        updateDetails.setWeight(new BigDecimal("100"));
        
        Deal updated = dealController.updateDeal(deal.getId(), updateDetails);
        
        assertThat(updated.getStatus()).isEqualTo(DealStatus.LOADED);
        assertThat(updated.getLoadDate()).isEqualTo("2023-10-10");
    }
}
