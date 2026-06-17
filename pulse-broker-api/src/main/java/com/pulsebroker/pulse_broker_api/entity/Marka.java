package com.pulsebroker.pulse_broker_api.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "markas")
public class Marka {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;
}
