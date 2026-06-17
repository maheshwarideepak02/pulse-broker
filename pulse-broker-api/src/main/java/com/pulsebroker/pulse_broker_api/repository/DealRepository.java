package com.pulsebroker.pulse_broker_api.repository;

import com.pulsebroker.pulse_broker_api.entity.Deal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import com.pulsebroker.pulse_broker_api.entity.DealStatus;

import java.time.LocalDate;

@Repository
public interface DealRepository extends JpaRepository<Deal, Long> {
    List<Deal> findByStatus(DealStatus status);
    List<Deal> findByStatusIn(List<DealStatus> statuses);
    long countByDealDateGreaterThanEqual(LocalDate date);
    boolean existsByPurchaserIdOrSellerId(Long purchaserId, Long sellerId);
    boolean existsByItemId(Long itemId);
    boolean existsByMarkaId(Long markaId);
    List<Deal> findByPurchaserBillIdOrSellerBillId(Long purchaserBillId, Long sellerBillId);
}
