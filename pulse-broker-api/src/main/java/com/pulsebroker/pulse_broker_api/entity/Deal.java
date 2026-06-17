package com.pulsebroker.pulse_broker_api.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.math.BigDecimal;

@Data
@Entity
@Table(name = "deals")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Deal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    private Integer version;

    private LocalDate dealDate;
    
    private String loadDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchaser_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Firm purchaser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seller_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Firm seller;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Item item;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "marka_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Marka marka;

    @Column(precision = 19, scale = 2)
    private BigDecimal weight;
    
    @Column(precision = 19, scale = 2)
    private BigDecimal rate;

    @Column(precision = 19, scale = 2)
    @JsonProperty("pBrokerage")
    private BigDecimal pBrokerage; // Purchaser brokerage calculated
    
    @Column(precision = 19, scale = 2)
    @JsonProperty("sBrokerage")
    private BigDecimal sBrokerage; // Seller brokerage calculated

    @Column(precision = 19, scale = 2)
    private BigDecimal packetWeight;
    
    private Integer numberOfPackets;

    @Enumerated(EnumType.STRING)
    private DealStatus status;

    @Enumerated(EnumType.STRING)
    private BrokeragePayer brokeragePayer;
    
    // Parent deal reference, useful when splitting deals for partial load
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_deal_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Deal parentDeal;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchaser_bill_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Bill purchaserBill;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seller_bill_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Bill sellerBill;
}
