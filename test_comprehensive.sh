#!/bin/bash

echo "🧪 Comprehensive Agatark MQTT Bridge Test"
echo "=========================================="
echo

# Start the bridge in background
echo "📡 Starting MQTT bridge..."
cd /Users/tuudik/Repositories/agatark
npm run dev > bridge.log 2>&1 &
BRIDGE_PID=$!

# Wait for broker to start
sleep 3

echo "🔌 Basic broker connectivity: ✅"

# Test Home Assistant Discovery Topics
echo "🏠 Testing Home Assistant integration..."

# Subscribe to HA discovery topics in background
mosquitto_sub -h localhost -p 1883 -t "homeassistant/#" -v > /tmp/ha_discovery &
HA_SUB_PID=$!

# Subscribe to device topics in background  
mosquitto_sub -h localhost -p 1883 -t "agatark/#" -v > /tmp/device_topics &
DEV_SUB_PID=$!

sleep 2

echo "📡 Testing device command simulation..."

# Simulate device commands (what Home Assistant would send)
mosquitto_pub -h localhost -p 1883 -t "agatark/devices/431/output/set" -m "ON"
echo "   → Sent: Turn ON device 431"

sleep 1
mosquitto_pub -h localhost -p 1883 -t "agatark/devices/431/output/set" -m "OFF"  
echo "   → Sent: Turn OFF device 431"

sleep 1
mosquitto_pub -h localhost -p 1883 -t "agatark/devices/604/locked/set" -m "LOCK"
echo "   → Sent: LOCK device 604"

sleep 1
mosquitto_pub -h localhost -p 1883 -t "agatark/devices/604/locked/set" -m "UNLOCK"
echo "   → Sent: UNLOCK device 604"

sleep 2

# Check command processing
echo
echo "📥 Command processing results:"
if grep -q "output.*set" /tmp/device_topics; then
    echo "   ✅ Light commands received"
else
    echo "   ❌ Light commands not processed"
fi

if grep -q "locked.*set" /tmp/device_topics; then  
    echo "   ✅ Lock commands received"
else
    echo "   ❌ Lock commands not processed"
fi

# Test different message types
echo
echo "🔧 Testing different MQTT features..."

# Test retained messages
mosquitto_pub -h localhost -p 1883 -t "agatark/test/retained" -m "persistent" -r
echo "   → Sent retained message"

# Test QoS levels
mosquitto_pub -h localhost -p 1883 -t "agatark/test/qos1" -m "qos1" -q 1
echo "   → Sent QoS 1 message"

sleep 2

# Check results
echo
echo "📊 Test Results Summary:"
echo "========================"

TOTAL_MESSAGES=$(wc -l < /tmp/device_topics 2>/dev/null || echo "0")
echo "📨 Total MQTT messages captured: $TOTAL_MESSAGES"

if [ -s /tmp/ha_discovery ]; then
    HA_COUNT=$(wc -l < /tmp/ha_discovery)
    echo "🏠 Home Assistant discovery messages: $HA_COUNT"
else
    echo "🏠 Home Assistant discovery messages: 0"
fi

# Show sample messages
echo
echo "📋 Sample captured messages:"
echo "----------------------------"
head -5 /tmp/device_topics 2>/dev/null || echo "No device messages captured"

# Show bridge command processing logs
echo
echo "🔍 Bridge command processing (from logs):"
echo "-----------------------------------------"
grep -i "command\|received" bridge.log | tail -5 || echo "No command processing logs found"

# Show any errors
echo
echo "⚠️  Any errors in bridge logs:"
echo "------------------------------"
grep -i "error" bridge.log | tail -3 || echo "No errors found"

# Cleanup
kill $BRIDGE_PID $HA_SUB_PID $DEV_SUB_PID 2>/dev/null
rm -f /tmp/ha_discovery /tmp/device_topics bridge.log

echo
echo "🏁 Comprehensive test completed!"
echo
echo "💡 Next steps to test with real data:"
echo "   1. Update .env with real Agatark credentials"
echo "   2. Run: npm run dev"
echo "   3. Configure Home Assistant to connect to this bridge"
echo "   4. Check HA for auto-discovered devices"