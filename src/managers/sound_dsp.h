/*
 * ═══════════════════════════════════════════════════════════════════════════
 *                    SOUND DSP - Audio Pattern Analysis
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * I2S microphone input for guitar, musical instruments, bark detection, etc.
 * FFT analysis for frequency domain features
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

#ifndef SOUND_DSP_H
#define SOUND_DSP_H

#include <Arduino.h>
#include <driver/i2s.h>

// FFT library (add to platformio.ini: arduinoFFT)
// #include <arduinoFFT.h>

class SoundDSP {
private:
    // I2S configuration
    static const int SAMPLE_RATE = 16000;  // 16kHz
    static const int BUFFER_SIZE = 512;
    static const int FFT_SIZE = 512;
    
    int16_t audio_buffer[BUFFER_SIZE];
    double fft_real[FFT_SIZE];
    double fft_imag[FFT_SIZE];
    
    bool initialized = false;
    
    // ArduinoFFT fft(fft_real, fft_imag, FFT_SIZE, SAMPLE_RATE);
    
public:
    // ───────────────────────────────────────────────────────────────────────
    // INITIALIZATION (I2S Microphone)
    // ───────────────────────────────────────────────────────────────────────
    
    bool begin(int sck_pin, int ws_pin, int sd_pin) {
        Serial.println("[SOUND] 🎤 Initializing I2S microphone...");
        
        i2s_config_t i2s_config = {
            .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
            .sample_rate = SAMPLE_RATE,
            .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
            .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
            .communication_format = I2S_COMM_FORMAT_I2S,
            .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
            .dma_buf_count = 4,
            .dma_buf_len = 1024,
            .use_apll = false,
            .tx_desc_auto_clear = false,
            .fixed_mclk = 0
        };
        
        i2s_pin_config_t pin_config = {
            .bck_io_num = sck_pin,
            .ws_io_num = ws_pin,
            .data_out_num = I2S_PIN_NO_CHANGE,
            .data_in_num = sd_pin
        };
        
        esp_err_t err = i2s_driver_install(I2S_NUM_0, &i2s_config, 0, NULL);
        if (err != ESP_OK) {
            Serial.printf("[SOUND] ❌ Failed to install I2S driver: %d\n", err);
            return false;
        }
        
        err = i2s_set_pin(I2S_NUM_0, &pin_config);
        if (err != ESP_OK) {
            Serial.printf("[SOUND] ❌ Failed to set I2S pins: %d\n", err);
            return false;
        }
        
        initialized = true;
        Serial.println("[SOUND] ✅ I2S microphone initialized");
        return true;
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // READ AUDIO SAMPLES
    // ───────────────────────────────────────────────────────────────────────
    
    bool readSamples() {
        if (!initialized) return false;
        
        size_t bytes_read = 0;
        esp_err_t err = i2s_read(I2S_NUM_0, audio_buffer, 
                                 BUFFER_SIZE * sizeof(int16_t), 
                                 &bytes_read, portMAX_DELAY);
        
        if (err != ESP_OK || bytes_read == 0) {
            return false;
        }
        
        return true;
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // PERFORM FFT ANALYSIS
    // ───────────────────────────────────────────────────────────────────────
    
    void performFFT() {
        // Copy audio data to FFT buffers
        for (int i = 0; i < FFT_SIZE; i++) {
            fft_real[i] = (double)audio_buffer[i];
            fft_imag[i] = 0.0;
        }
        
        // Perform FFT (uncomment when arduinoFFT is installed)
        // fft.windowing(FFT_WIN_TYP_HAMMING, FFT_FORWARD);
        // fft.compute(FFT_FORWARD);
        // fft.complexToMagnitude();
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // GET DOMINANT FREQUENCY
    // ───────────────────────────────────────────────────────────────────────
    
    float getDominantFrequency() {
        // Find peak in FFT spectrum
        double peak_magnitude = 0;
        int peak_index = 0;
        
        for (int i = 1; i < FFT_SIZE / 2; i++) {
            if (fft_real[i] > peak_magnitude) {
                peak_magnitude = fft_real[i];
                peak_index = i;
            }
        }
        
        // Convert bin to frequency
        float frequency = (peak_index * SAMPLE_RATE) / (float)FFT_SIZE;
        return frequency;
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // DETECT MUSICAL NOTES (for guitar)
    // ───────────────────────────────────────────────────────────────────────
    
    String detectNote() {
        float freq = getDominantFrequency();
        
        // Standard guitar tuning frequencies (Hz)
        const float notes[][2] = {
            {82.41, 'E'}, {110.00, 'A'}, {146.83, 'D'},
            {196.00, 'G'}, {246.94, 'B'}, {329.63, 'E'}
        };
        
        float min_diff = 1000;
        char detected_note = '?';
        
        for (int i = 0; i < 6; i++) {
            float diff = abs(freq - notes[i][0]);
            if (diff < min_diff) {
                min_diff = diff;
                detected_note = (char)notes[i][1];
            }
        }
        
        // If difference is too large, not a guitar string
        if (min_diff > 10) {
            return "NONE";
        }
        
        return String(detected_note);
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // GET HARMONIC CONTENT (musicality score)
    // ───────────────────────────────────────────────────────────────────────
    
    float getHarmonicContent() {
        // Calculate ratio of harmonic energy to total energy
        float fundamental_freq = getDominantFrequency();
        float total_energy = 0;
        float harmonic_energy = 0;
        
        for (int i = 0; i < FFT_SIZE / 2; i++) {
            float freq = (i * SAMPLE_RATE) / (float)FFT_SIZE;
            total_energy += fft_real[i];
            
            // Check if this is a harmonic (2x, 3x, 4x fundamental)
            for (int h = 2; h <= 4; h++) {
                if (abs(freq - fundamental_freq * h) < 10) {
                    harmonic_energy += fft_real[i];
                }
            }
        }
        
        return (total_energy > 0) ? (harmonic_energy / total_energy) : 0;
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // DETECT BARK/SPEECH (for dog collar)
    // ───────────────────────────────────────────────────────────────────────
    
    bool detectBark() {
        // Bark frequency range: 500Hz - 3000Hz
        // High energy in mid-frequencies
        
        float energy_mid = 0;
        float energy_total = 0;
        
        for (int i = 0; i < FFT_SIZE / 2; i++) {
            float freq = (i * SAMPLE_RATE) / (float)FFT_SIZE;
            energy_total += fft_real[i];
            
            if (freq > 500 && freq < 3000) {
                energy_mid += fft_real[i];
            }
        }
        
        float ratio = (energy_total > 0) ? (energy_mid / energy_total) : 0;
        
        // Bark if >60% energy in mid-frequencies
        return (ratio > 0.6);
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // GET AUDIO FEATURES (for AI analysis)
    // ───────────────────────────────────────────────────────────────────────
    
    struct AudioFeatures {
        float dominant_frequency;
        float harmonic_content;
        float spectral_centroid;
        float energy_level;
        bool is_musical;
        bool is_speech;
    };
    
    AudioFeatures getAudioFeatures() {
        AudioFeatures features;
        
        performFFT();
        
        features.dominant_frequency = getDominantFrequency();
        features.harmonic_content = getHarmonicContent();
        features.is_musical = (features.harmonic_content > 0.5);
        features.is_speech = detectBark();
        
        // Calculate energy
        features.energy_level = 0;
        for (int i = 0; i < BUFFER_SIZE; i++) {
            features.energy_level += abs(audio_buffer[i]);
        }
        features.energy_level /= BUFFER_SIZE;
        
        // Spectral centroid (brightness)
        float weighted_sum = 0;
        float magnitude_sum = 0;
        for (int i = 0; i < FFT_SIZE / 2; i++) {
            float freq = (i * SAMPLE_RATE) / (float)FFT_SIZE;
            weighted_sum += freq * fft_real[i];
            magnitude_sum += fft_real[i];
        }
        features.spectral_centroid = (magnitude_sum > 0) ? 
                                     (weighted_sum / magnitude_sum) : 0;
        
        return features;
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // DEBUG
    // ───────────────────────────────────────────────────────────────────────
    
    void printAudioFeatures() {
        AudioFeatures features = getAudioFeatures();
        
        Serial.println("\n[SOUND] 🎵 Audio Features:");
        Serial.printf("  Dominant Freq:  %.1f Hz\n", features.dominant_frequency);
        Serial.printf("  Harmonic:       %.2f\n", features.harmonic_content);
        Serial.printf("  Musical:        %s\n", features.is_musical ? "YES" : "NO");
        Serial.printf("  Speech/Bark:    %s\n", features.is_speech ? "YES" : "NO");
        Serial.printf("  Energy:         %.1f\n", features.energy_level);
        Serial.printf("  Brightness:     %.1f Hz\n\n", features.spectral_centroid);
    }
};

#endif // SOUND_DSP_H
