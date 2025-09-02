#!/bin/bash

# Test script for updated authentication
echo "Testing updated Agatark authentication..."

# Create test environment variables
export AGATARK_HOST="192.168.1.127"
export AGATARK_EMAIL="marko@radr.eu"
export AGATARK_PASSWORD="dummy"  # Not used in new auth format
export MQTT_PORT="1883"

# Build the project
echo "Building project..."
npm run build

if [ $? -eq 0 ]; then
    echo "Build successful, starting bridge..."
    node dist/index.js &
    BRIDGE_PID=$!
    
    # Give it time to start
    sleep 3
    
    # Test MQTT connection
    echo "Testing MQTT connection..."
    mosquitto_pub -h localhost -p 1883 -t "agatark/test" -m "test message"
    
    # Kill the bridge
    kill $BRIDGE_PID
    echo "Test completed"
else
    echo "Build failed"
    exit 1
fi