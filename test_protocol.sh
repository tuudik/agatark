#!/bin/bash

echo "🧪 Testing Protocol Auto-Detection"
echo "=================================="
echo

cd /Users/tuudik/Repositories/agatark

# Test 1: HTTPS domain
echo "Test 1: HTTPS domain (teigaritee16viimsi.by.enlife.io)"
echo "AGATARK_HOST=teigaritee16viimsi.by.enlife.io" > .env.test1
echo "AGATARK_EMAIL=test@example.com" >> .env.test1
echo "AGATARK_PASSWORD=test" >> .env.test1
echo "MQTT_PORT=1883" >> .env.test1

# Test 2: HTTP domain (explicitly)
echo "Test 2: HTTP domain (http://example.com)"
echo "AGATARK_HOST=http://example.com" > .env.test2  
echo "AGATARK_EMAIL=test@example.com" >> .env.test2
echo "AGATARK_PASSWORD=test" >> .env.test2
echo "MQTT_PORT=1883" >> .env.test2

# Test 3: IP address 
echo "Test 3: IP address (192.168.1.100)"
echo "AGATARK_HOST=192.168.1.100" > .env.test3
echo "AGATARK_EMAIL=test@example.com" >> .env.test3
echo "AGATARK_PASSWORD=test" >> .env.test3
echo "MQTT_PORT=1883" >> .env.test3

# Test 4: Localhost
echo "Test 4: Localhost (localhost:8080)"
echo "AGATARK_HOST=localhost:8080" > .env.test4
echo "AGATARK_EMAIL=test@example.com" >> .env.test4
echo "AGATARK_PASSWORD=test" >> .env.test4
echo "MQTT_PORT=1883" >> .env.test4

# Test 5: HTTPS explicitly
echo "Test 5: HTTPS explicit (https://secure.example.com)"
echo "AGATARK_HOST=https://secure.example.com" > .env.test5
echo "AGATARK_EMAIL=test@example.com" >> .env.test5
echo "AGATARK_PASSWORD=test" >> .env.test5
echo "MQTT_PORT=1883" >> .env.test5

echo "Running protocol detection tests..."
echo

for i in {1..5}; do
    echo "🔍 Test $i:"
    
    # Start bridge with test config
    timeout 10 node -e "
    require('dotenv').config({ path: '.env.test$i' });
    const { AgatarkClient } = require('./dist/services/agatark-client');
    
    try {
      const client = new AgatarkClient(
        process.env.AGATARK_HOST,
        process.env.AGATARK_EMAIL, 
        process.env.AGATARK_PASSWORD
      );
      console.log('   ✅ Client created successfully');
    } catch (error) {
      console.log('   ❌ Client creation failed:', error.message);
    }
    " 2>&1 | grep -E "(Auto-detected|Using provided|Client created|failed)"
    
    echo
done

# Cleanup
rm -f .env.test{1..5}

echo "🏁 Protocol detection test completed!"
echo
echo "Expected behavior:"
echo "  • Domains (without protocol) → HTTPS"
echo "  • IP addresses → HTTP" 
echo "  • localhost → HTTP"
echo "  • Explicit protocols → Use as provided"