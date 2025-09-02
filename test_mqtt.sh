#!/bin/bash

echo "🧪 Testing Agatark MQTT Bridge"
echo "==============================="
echo

# Start the bridge in background
echo "📡 Starting MQTT bridge..."
cd /Users/tuudik/Repositories/agatark
npm run dev > bridge.log 2>&1 &
BRIDGE_PID=$!

# Wait for broker to start
sleep 3

echo "🔌 Testing MQTT broker connection..."

# Test 1: Check if broker is listening
if nc -z localhost 1883 2>/dev/null; then
    echo "✅ MQTT broker is listening on port 1883"
else
    echo "❌ MQTT broker is not accessible on port 1883"
    kill $BRIDGE_PID 2>/dev/null
    exit 1
fi

# Test 2: Try to connect without credentials
echo "🔑 Testing connection without credentials..."
timeout 5 mosquitto_sub -h localhost -p 1883 -t "test" -C 1 >/dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Connection successful without credentials"
else
    echo "⚠️  Connection failed without credentials (this is OK if auth is required)"
fi

# Test 3: Try to connect with credentials
echo "🔑 Testing connection with credentials..."
timeout 5 mosquitto_sub -h localhost -p 1883 -u homeassistant -P ha_password -t "test" -C 1 >/dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Connection successful with credentials"
else
    echo "⚠️  Connection failed with credentials"
fi

# Test 4: Test publish/subscribe
echo "📨 Testing publish/subscribe..."
mosquitto_sub -h localhost -p 1883 -u homeassistant -P ha_password -t "agatark/test" -C 1 > /tmp/mqtt_test &
SUB_PID=$!
sleep 1
mosquitto_pub -h localhost -p 1883 -u homeassistant -P ha_password -t "agatark/test" -m "hello"
sleep 1

if grep -q "hello" /tmp/mqtt_test 2>/dev/null; then
    echo "✅ Publish/Subscribe working correctly"
else
    echo "❌ Publish/Subscribe failed"
fi

# Show bridge logs
echo
echo "📋 Bridge logs (last 10 lines):"
echo "================================"
tail -10 bridge.log

# Cleanup
kill $BRIDGE_PID 2>/dev/null
kill $SUB_PID 2>/dev/null
rm -f /tmp/mqtt_test bridge.log

echo
echo "🏁 Test completed!"