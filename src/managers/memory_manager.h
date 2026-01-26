/*
 * ═══════════════════════════════════════════════════════════════════════════
 *                    MEMORY MANAGER - Dynamic Module Loading
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Manages heap memory for hot-swappable modules
 * Prevents memory leaks and fragmentation
 * ESP32-S3 has ~320KB RAM, need careful management
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

#ifndef MEMORY_MANAGER_H
#define MEMORY_MANAGER_H

#include <Arduino.h>
#include <esp_heap_caps.h>

class MemoryManager {
private:
    void* current_module = nullptr;
    size_t module_size = 0;
    
    // Memory thresholds
    static const size_t MIN_FREE_HEAP = 50000;      // 50KB minimum
    static const size_t MODULE_MAX_SIZE = 100000;   // 100KB max per module
    
public:
    // ───────────────────────────────────────────────────────────────────────
    // INITIALIZATION
    // ───────────────────────────────────────────────────────────────────────
    
    void begin() {
        Serial.println("[MEM] 🧠 Memory Manager initialized");
        printMemoryStats();
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // ALLOCATE MODULE MEMORY
    // ───────────────────────────────────────────────────────────────────────
    
    void* allocateModule(size_t size) {
        // Check if we have enough free memory
        if (getFreeHeap() < MIN_FREE_HEAP + size) {
            Serial.println("[MEM] ❌ Insufficient memory for module");
            return nullptr;
        }
        
        // Check module size limit
        if (size > MODULE_MAX_SIZE) {
            Serial.printf("[MEM] ❌ Module too large: %d bytes (max %d)\n", 
                         size, MODULE_MAX_SIZE);
            return nullptr;
        }
        
        // Free old module first
        freeCurrentModule();
        
        // Allocate new module memory
        current_module = heap_caps_malloc(size, MALLOC_CAP_8BIT);
        
        if (current_module) {
            module_size = size;
            Serial.printf("[MEM] ✅ Allocated %d bytes for module\n", size);
            printMemoryStats();
            return current_module;
        } else {
            Serial.println("[MEM] ❌ Allocation failed");
            return nullptr;
        }
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // FREE CURRENT MODULE
    // ───────────────────────────────────────────────────────────────────────
    
    void freeCurrentModule() {
        if (current_module) {
            heap_caps_free(current_module);
            Serial.printf("[MEM] 🗑️ Freed %d bytes\n", module_size);
            current_module = nullptr;
            module_size = 0;
            printMemoryStats();
        }
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // MEMORY STATISTICS
    // ───────────────────────────────────────────────────────────────────────
    
    size_t getFreeHeap() {
        return heap_caps_get_free_size(MALLOC_CAP_8BIT);
    }
    
    size_t getTotalHeap() {
        return heap_caps_get_total_size(MALLOC_CAP_8BIT);
    }
    
    size_t getLargestFreeBlock() {
        return heap_caps_get_largest_free_block(MALLOC_CAP_8BIT);
    }
    
    float getFragmentation() {
        size_t free = getFreeHeap();
        size_t largest = getLargestFreeBlock();
        return (free > 0) ? (1.0 - (float)largest / free) * 100.0 : 0;
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // GARBAGE COLLECTION (force defrag)
    // ───────────────────────────────────────────────────────────────────────
    
    void garbageCollect() {
        Serial.println("[MEM] 🗑️ Running garbage collection...");
        
        // Free current module
        freeCurrentModule();
        
        // On ESP32, we can't truly defragment, but we can:
        // 1. Free all temporary allocations
        // 2. Trigger heap consolidation by doing nothing
        
        delay(100);
        printMemoryStats();
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // CHECK MEMORY HEALTH
    // ───────────────────────────────────────────────────────────────────────
    
    bool isMemoryHealthy() {
        size_t free = getFreeHeap();
        float frag = getFragmentation();
        
        if (free < MIN_FREE_HEAP) {
            Serial.printf("[MEM] ⚠️ Low memory: %d bytes free\n", free);
            return false;
        }
        
        if (frag > 50.0) {
            Serial.printf("[MEM] ⚠️ High fragmentation: %.1f%%\n", frag);
            return false;
        }
        
        return true;
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // DEBUG OUTPUT
    // ───────────────────────────────────────────────────────────────────────
    
    void printMemoryStats() {
        size_t free = getFreeHeap();
        size_t total = getTotalHeap();
        size_t used = total - free;
        float usage = (float)used / total * 100.0;
        
        Serial.println("\n╔══════════════════════════════════════════════════════════╗");
        Serial.println("║                   MEMORY STATUS                          ║");
        Serial.println("╚══════════════════════════════════════════════════════════╝");
        Serial.printf("  Total Heap:      %6d KB\n", total / 1024);
        Serial.printf("  Used:            %6d KB (%.1f%%)\n", used / 1024, usage);
        Serial.printf("  Free:            %6d KB\n", free / 1024);
        Serial.printf("  Largest Block:   %6d KB\n", getLargestFreeBlock() / 1024);
        Serial.printf("  Fragmentation:   %6.1f%%\n", getFragmentation());
        Serial.printf("  Module Size:     %6d bytes\n", module_size);
        Serial.println("──────────────────────────────────────────────────────────\n");
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // PSRAM SUPPORT (if available on ESP32-S3)
    // ───────────────────────────────────────────────────────────────────────
    
    bool hasPSRAM() {
        return psramFound();
    }
    
    size_t getFreePSRAM() {
        return heap_caps_get_free_size(MALLOC_CAP_SPIRAM);
    }
    
    void* allocateModuleInPSRAM(size_t size) {
        if (!hasPSRAM()) {
            Serial.println("[MEM] ⚠️ PSRAM not available");
            return allocateModule(size);
        }
        
        void* ptr = heap_caps_malloc(size, MALLOC_CAP_SPIRAM);
        if (ptr) {
            Serial.printf("[MEM] ✅ Allocated %d bytes in PSRAM\n", size);
            current_module = ptr;
            module_size = size;
        }
        return ptr;
    }
};

#endif // MEMORY_MANAGER_H
