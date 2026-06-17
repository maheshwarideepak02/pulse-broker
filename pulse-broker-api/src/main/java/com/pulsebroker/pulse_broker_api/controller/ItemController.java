package com.pulsebroker.pulse_broker_api.controller;

import com.pulsebroker.pulse_broker_api.entity.Item;
import com.pulsebroker.pulse_broker_api.repository.ItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/items")
public class ItemController {

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private com.pulsebroker.pulse_broker_api.repository.DealRepository dealRepository;

    @GetMapping
    public List<Item> getAll() {
        return itemRepository.findAll();
    }

    @PostMapping
    public Item create(@RequestBody Item item) {
        return itemRepository.save(item);
    }

    @PutMapping("/{id}")
    public Item update(@PathVariable Long id, @RequestBody Item itemDetails) {
        Item item = itemRepository.findById(id).orElseThrow(() -> new RuntimeException("Item not found"));
        item.setName(itemDetails.getName());
        return itemRepository.save(item);
    }

    @DeleteMapping("/{id}")
    @org.springframework.web.bind.annotation.ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        Item item = itemRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Item not found"));
        
        if (dealRepository.existsByItemId(id)) {
            throw new IllegalArgumentException("Cannot delete item because it is referenced in deals.");
        }
        
        itemRepository.delete(item);
    }
}
