package com.pulsebroker.pulse_broker_api.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "contacts")
public class Contact {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String phone;
    private String city;

    @Enumerated(EnumType.STRING)
    private BrokType defaultBrokType;

    @Column(precision = 19, scale = 2)
    private java.math.BigDecimal defaultBrokVal;
}
