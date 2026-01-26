# Heltec WiFi LoRa 32 V3 - Setup Guide

## 🔋 Battery Setup (CRITICAL WARNING)

**Do you need a charging module?**
❌ **NO.** The Heltec V3 board has a built-in battery charger. You can plug a Li-Po battery directly into the small orange/white connector on the bottom, and it will charge whenever the USB-C cable is plugged in.

### ⚠️ POLARITY WARNING ⚠️
**READ THIS BEFORE PLUGGING IN A BATTERY:**
Standard batteries from AliExpress often have the **Red (+)** and **Black (-)** wires FLIPPED compared to what Heltec expects.

1. **Check the Board**: Look for `+` and `-` markings near the battery connector on the Heltec board.
2. **Check the Battery**: Compare the red wire.
3. **If they don't match**: You MUST swap the pins in the battery connector (use a needle to lift the plastic tab and pull the wire out).

**Plugging in reverse polarity will destroy the board instantly.**

---

## 📌 Pinout Reference for UAD

Since we are using the Heltec V3, here is how you should wire your sensors:

### 1. MPU6050 (Motion Sensor)
*   **VCC** → 3.3V
*   **GND** → GND
*   **SDA** → Pin 41
*   **SCL** → Pin 42

### 2. INMP441 (Microphone)
*   **VDD** → 3.3V
*   **GND** → GND
*   **SD**  → Pin 46
*   **WS**  → Pin 45
*   **SCK** → Pin 44
*   **L/R** → GND (for Left channel)

### 3. Vibration Motor
*   **Red (+)** → Pin 4
*   **Black (-)** → GND

### 4. Red LED Power Button (Soft Latching)
Since the Heltec V3 is always powered by battery, we use **Deep Sleep** for "Off" state.
*   **LED +**  → Pin 7  (Controls the red ring light)
*   **LED -**  → GND
*   **C / COM** → GND
*   **NO**     → Pin 6  (Wake up / Input)

**Behavior:**
- **Press**: Wakes device, LED turns ON.
- **Hold 3s**: Device turns OFF (Deep Sleep), LED turns OFF.
- **Single Click while ON**: Switch context / Record specific event.

---

## 🛠️ Software Setup

The firmware is already configured for this board in `platformio.ini`:
*   **Board**: `heltec_wifi_lora_32_V3`
*   **LoRa**: Pre-configured for SX1262
*   **OLED**: Pre-configured (we will add code to display status on it)
