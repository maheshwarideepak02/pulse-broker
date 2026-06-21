package com.pulsebroker.pulse_broker_api.controller;

import com.pulsebroker.pulse_broker_api.entity.Contact;
import com.pulsebroker.pulse_broker_api.repository.ContactRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/contacts")
public class ContactController {

    @Autowired
    private ContactRepository contactRepository;

    @Autowired
    private com.pulsebroker.pulse_broker_api.repository.FirmRepository firmRepository;

    @Autowired
    private com.pulsebroker.pulse_broker_api.repository.DealRepository dealRepository;

    @Autowired
    private com.pulsebroker.pulse_broker_api.repository.BillRepository billRepository;

    @GetMapping
    public List<Contact> getAll() {
        return contactRepository.findAll(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "name"));
    }

    @GetMapping("/with-margins")
    public List<Contact> getContactsWithMargins() {
        return contactRepository.findContactsWithMargins();
    }

    @PostMapping
    public Contact create(@RequestBody Contact contact) {
        return contactRepository.save(contact);
    }

    @PutMapping("/{id}")
    public Contact update(@PathVariable Long id, @RequestBody Contact contactDetails) {
        Contact contact = contactRepository.findById(id).orElseThrow(() -> new RuntimeException("Contact not found"));
        contact.setName(contactDetails.getName());
        contact.setPhone(contactDetails.getPhone());
        contact.setCity(contactDetails.getCity());
        contact.setDefaultBrokType(contactDetails.getDefaultBrokType());
        contact.setDefaultBrokVal(contactDetails.getDefaultBrokVal());
        return contactRepository.save(contact);
    }

    @DeleteMapping("/{id}")
    @org.springframework.web.bind.annotation.ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    @org.springframework.transaction.annotation.Transactional
    public void delete(@PathVariable Long id) {
        Contact contact = contactRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Contact not found"));
        
        if (dealRepository.existsByPurchaserContactIdOrSellerContactId(id, id)) {
            throw new IllegalArgumentException("Cannot delete contact because it is directly associated with one or more deals.");
        }

        List<com.pulsebroker.pulse_broker_api.entity.Firm> linkedFirms = firmRepository.findByContactId(id);
        for (com.pulsebroker.pulse_broker_api.entity.Firm f : linkedFirms) {
            if (dealRepository.existsByPurchaserIdOrSellerId(f.getId(), f.getId())) {
                throw new IllegalArgumentException("Cannot delete contact because firm '" + f.getName() + "' has associated deals.");
            }
            if (billRepository.existsByFirmId(f.getId())) {
                throw new IllegalArgumentException("Cannot delete contact because firm '" + f.getName() + "' has generated bills.");
            }
        }
        
        for (com.pulsebroker.pulse_broker_api.entity.Firm f : linkedFirms) {
            firmRepository.delete(f);
        }
        contactRepository.delete(contact);
    }
}
