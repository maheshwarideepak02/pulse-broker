package com.pulsebroker.pulse_broker_api.repository;

import com.pulsebroker.pulse_broker_api.entity.Contact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ContactRepository extends JpaRepository<Contact, Long> {
    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT d.sellerContact FROM Deal d WHERE d.marginMarkup IS NOT NULL AND d.marginMarkup <> 0")
    java.util.List<Contact> findContactsWithMargins();
}
