package com.pulsebroker.pulse_broker_api;

import com.pulsebroker.pulse_broker_api.entity.Deal;
import com.pulsebroker.pulse_broker_api.util.BrokerageCalculator;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.assertEquals;

public class BrokerageCalculatorTest {

    @Test
    public void testFixedBrokerage() {
        Deal deal = new Deal();
        deal.setWeight(new BigDecimal("100"));
        deal.setPBrokType("FIXED");
        deal.setPBrokVal(new BigDecimal("2.5"));
        deal.setSBrokType("FIXED");
        deal.setSBrokVal(new BigDecimal("1.5"));

        BrokerageCalculator.computeBrokerages(deal);

        assertEquals(new BigDecimal("250.00"), deal.getPBrokerage());
        assertEquals(new BigDecimal("150.00"), deal.getSBrokerage());
    }

    @Test
    public void testPercentBrokerage() {
        Deal deal = new Deal();
        deal.setWeight(new BigDecimal("100"));
        deal.setRate(new BigDecimal("500")); // total value = 50,000
        deal.setPBrokType("PERCENT");
        deal.setPBrokVal(new BigDecimal("1")); // 1% of 50,000 = 500
        deal.setSBrokType("PERCENT");
        deal.setSBrokVal(new BigDecimal("0.5")); // 0.5% of 50,000 = 250

        BrokerageCalculator.computeBrokerages(deal);

        assertEquals(new BigDecimal("500.00"), deal.getPBrokerage());
        assertEquals(new BigDecimal("250.00"), deal.getSBrokerage());
    }

    @Test
    public void testNullValuesGracefullyHandled() {
        Deal deal = new Deal();
        deal.setWeight(new BigDecimal("100"));
        deal.setRate(null);
        deal.setPBrokType("PERCENT");
        deal.setPBrokVal(new BigDecimal("1"));

        BrokerageCalculator.computeBrokerages(deal);

        assertEquals(BigDecimal.ZERO, deal.getPBrokerage());
        assertEquals(BigDecimal.ZERO, deal.getSBrokerage());
    }
}
