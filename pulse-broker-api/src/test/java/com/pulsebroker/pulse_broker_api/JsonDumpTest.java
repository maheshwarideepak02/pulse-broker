package com.pulsebroker.pulse_broker_api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.pulsebroker.pulse_broker_api.entity.Contact;
import com.pulsebroker.pulse_broker_api.entity.Deal;
import com.pulsebroker.pulse_broker_api.entity.Firm;
import org.junit.jupiter.api.Test;

public class JsonDumpTest {
    @Test
    public void dump() throws Exception {
        Deal deal = new Deal();
        Contact c = new Contact();
        c.setId(1L);
        deal.setPurchaserContact(c);
        Firm f = new Firm();
        f.setId(2L);
        f.setContact(c);
        deal.setPurchaser(f);
        
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        System.out.println("DUMP: " + mapper.writeValueAsString(deal));
    }
}
