package com.pulsebroker.pulse_broker_api.repository;

import com.pulsebroker.pulse_broker_api.entity.Item;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ItemRepository extends JpaRepository<Item, Long> {
}
