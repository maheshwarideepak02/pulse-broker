package com.pulsebroker.pulse_broker_api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pulsebroker.pulse_broker_api.entity.Contact;
import com.pulsebroker.pulse_broker_api.entity.Firm;
import org.junit.jupiter.api.Test;

public class FirmControllerTest {
    @Test
    public void dump() throws Exception {
        Firm f = new Firm();
        f.setId(10L);
        f.setName("Test Firm");
        Contact c = new Contact();
        c.setId(5L);
        c.setName("Test Contact");
        f.setContact(c);
        
        System.out.println("FIRM DUMP: " + new ObjectMapper().writeValueAsString(f));
    }
}
