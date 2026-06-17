package com.pulsebroker.pulse_broker_api.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Entity
@Table(name = "bills")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Bill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String billNumber;

    private LocalDate billDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "firm_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Firm firm;

    @Column(precision = 19, scale = 2)
    private BigDecimal totalAmount;

    @Enumerated(EnumType.STRING)
    private BillStatus status = BillStatus.UNPAID;

    private LocalDate clearanceDate;
}
