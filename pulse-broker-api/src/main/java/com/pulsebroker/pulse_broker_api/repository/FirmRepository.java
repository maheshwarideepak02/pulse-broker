package com.pulsebroker.pulse_broker_api.repository;

import com.pulsebroker.pulse_broker_api.entity.Firm;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FirmRepository extends JpaRepository<Firm, Long> {
    java.util.List<Firm> findByContactId(Long contactId);

    @org.springframework.data.jpa.repository.Query("SELECT f FROM Firm f LEFT JOIN FETCH f.contact ORDER BY f.name ASC")
    java.util.List<Firm> findAllWithContact();
}
