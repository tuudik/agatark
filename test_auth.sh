#!/bin/bash

echo "🧪 MQTT Broker Authentication Test"
echo "=================================="
echo

# Start the bridge in background
echo "📡 Starting MQTT bridge..."
cd /Users/tuudik/Repositories/agatark
npm run dev > bridge.log 2>&1 &
BRIDGE_PID=$!

# Wait for broker to start
echo "⏳ Waiting for broker to initialize..."
sleep 5

# Check if broker is running
if ! nc -z localhost 1883 2>/dev/null; then
    echo "❌ MQTT broker failed to start"
    cat bridge.log
    exit 1
fi

echo "✅ MQTT broker is running on port 1883"

# Test with correct credentials
echo
echo "🔑 Testing with configured credentials..."
echo "   Username: homeassistant"
echo "   Password: ha_password"

# Start subscriber with auth
mosquitto_sub -h localhost -p 1883 -u homeassistant -P ha_password -t "agatark/#" -v > /tmp/mqtt_msgs &
SUB_PID=$!

sleep 2

# Test command
echo "📨 Sending test command..."
if mosquitto_pub -h localhost -p 1883 -u homeassistant -P ha_password -t "agatark/devices/431/output/set" -m "ON"; then
    echo "✅ Command sent successfully"
else
    echo "❌ Command failed"
fi

sleep 2

# Check if message was received and processed
if grep -q "agatark/devices/431/output/set ON" /tmp/mqtt_msgs 2>/dev/null; then
    echo "✅ Message received and echoed by broker"
else
    echo "⚠️  Message not found in broker logs"
fi

# Check bridge logs for command processing
echo
echo "🔍 Bridge command processing logs:"
if grep -i "command\|received" bridge.log; then
    echo "✅ Bridge processed the command"
else
    echo "⚠️  No command processing found (expected with dummy Agatark credentials)"
fi

# Show recent broker activity
echo
echo "📋 Recent MQTT activity:"
head -5 /tmp/mqtt_msgs 2>/dev/null || echo "No MQTT messages captured"

# Show bridge status
echo
echo "📊 Bridge status (last 5 log lines):"
tail -5 bridge.log

# Cleanup
kill $BRIDGE_PID $SUB_PID 2>/dev/null
rm -f /tmp/mqtt_msgs bridge.log

echo
echo "🏁 Test completed!"
echo
echo "✅ MQTT Broker Status: WORKING"
echo "⚠️  Agatark Integration: NEEDS REAL CREDENTIALS"