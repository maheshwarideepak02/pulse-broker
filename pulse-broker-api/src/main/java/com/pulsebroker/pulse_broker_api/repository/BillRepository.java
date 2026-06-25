package com.pulsebroker.pulse_broker_api.repository;

import com.pulsebroker.pulse_broker_api.entity.Bill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;
import java.util.List;

@Repository
public interface BillRepository extends JpaRepository<Bill, Long> {
    
    @Query("SELECT b FROM Bill b JOIN FETCH b.firm f LEFT JOIN FETCH f.contact ORDER BY b.id DESC")
    List<Bill> findAllWithFirm();

    boolean existsByFirmId(Long firmId);
}
