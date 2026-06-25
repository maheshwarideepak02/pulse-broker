package com.pulsebroker.pulse_broker_api;

import com.pulsebroker.pulse_broker_api.entity.Deal;
import com.pulsebroker.pulse_broker_api.entity.Firm;
import com.pulsebroker.pulse_broker_api.entity.DealStatus;
import com.pulsebroker.pulse_broker_api.repository.DealRepository;
import com.pulsebroker.pulse_broker_api.repository.FirmRepository;
import com.pulsebroker.pulse_broker_api.service.DealService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class DealServiceTest {

    @Mock
    private DealRepository dealRepository;

    @Mock
    private FirmRepository firmRepository;

    @InjectMocks
    private DealService dealService;

    @Test
    public void testLoadDealPartialSubtractsBagsProperly() {
        // Setup parent deal
        Deal parentDeal = new Deal();
        parentDeal.setId(1L);
        parentDeal.setStatus(DealStatus.PENDING);
        parentDeal.setWeight(new BigDecimal("100")); // Original weight 100
        parentDeal.setPacketWeight(new BigDecimal("50"));
        parentDeal.setNumberOfPackets(200); // 100 quintals = 10000kg / 50kg = 200 bags

        Firm purchaser = new Firm();
        purchaser.setId(10L);
        Firm seller = new Firm();
        seller.setId(20L);
        parentDeal.setPurchaser(purchaser);
        parentDeal.setSeller(seller);

        when(dealRepository.findById(1L)).thenReturn(Optional.of(parentDeal));
        when(dealRepository.save(any(Deal.class))).thenAnswer(i -> i.getArguments()[0]);

        // Execute load Deal: load 40 weight
        Deal childDeal = dealService.loadDeal(1L, new BigDecimal("40"), "2024-01-01", null, null);

        // Child should have 80 packets (40 quintals = 4000kg / 50kg = 80 bags)
        assertEquals(Integer.valueOf(80), childDeal.getNumberOfPackets());
        
        // Parent should have exactly 120 packets (200 - 80) avoiding rounding drift
        assertEquals(Integer.valueOf(120), parentDeal.getNumberOfPackets());
        assertEquals(new BigDecimal("60"), parentDeal.getWeight());
        assertEquals(DealStatus.PENDING, parentDeal.getStatus());
    }
}
