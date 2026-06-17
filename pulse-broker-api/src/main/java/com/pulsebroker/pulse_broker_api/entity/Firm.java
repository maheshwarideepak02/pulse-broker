package com.pulsebroker.pulse_broker_api.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Entity
@Table(name = "firms")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Firm {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contact_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Contact contact;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    private BrokType defaultBrokType;

    @Column(precision = 19, scale = 2)
    private BigDecimal defaultBrokVal;
}
