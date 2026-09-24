/*
 VITALIS ESP32 starter.
 Sensors: MAX30102, MAX30205, AD8232, BME280, ENS160.
 MQTT topic: vitalis/{device_id}/health
 Replace demo values with readings from the exact breakout boards.
*/
#include <WiFi.h>
#include <PubSubClient.h>
const char* WIFI_SSID="YOUR_WIFI"; const char* WIFI_PASSWORD="YOUR_PASSWORD";
const char* MQTT_HOST="YOUR_MQTT_SERVER"; const int MQTT_PORT=1883;
WiFiClient wc; PubSubClient mqtt(wc); const char* DEVICE_ID="ESP32_001";
void setup(){Serial.begin(115200);WiFi.begin(WIFI_SSID,WIFI_PASSWORD);while(WiFi.status()!=WL_CONNECTED)delay(300);mqtt.setServer(MQTT_HOST,MQTT_PORT);}
void loop(){
 if(!mqtt.connected())mqtt.connect(DEVICE_ID); mqtt.loop();
 String p=String("{"device_id":"")+DEVICE_ID+
 "","heart_rate":76,"spo2":98,"body_temperature":36.7,"ecg":0.42,"ambient_temperature":28.4,"aqi":28,"battery_level":87}";
 mqtt.publish((String("vitalis/")+DEVICE_ID+"/health").c_str(),p.c_str()); delay(5000);
}
