const { ethers } = require('ethers');
require('dotenv').config();

class IoTSensorSimulator {
    constructor() {
        this.sensors = [
            {
                id: 'air_quality_01',
                type: 'air_quality',
                location: 'Downtown District',
                unit: 'AQI',
                normalRange: [50, 100],
                alertRange: [101, 150]
            },
            {
                id: 'water_quality_01',
                type: 'water_quality',
                location: 'Central Water Treatment',
                unit: 'pH',
                normalRange: [6.5, 8.5],
                alertRange: [5.0, 6.4]
            },
            {
                id: 'noise_pollution_01',
                type: 'noise_pollution',
                location: 'Commercial Zone',
                unit: 'dB',
                normalRange: [40, 65],
                alertRange: [66, 85]
            },
            {
                id: 'air_quality_02',
                type: 'air_quality',
                location: 'Industrial Zone',
                unit: 'AQI',
                normalRange: [60, 110],
                alertRange: [111, 160]
            },
            {
                id: 'water_quality_02',
                type: 'water_quality',
                location: 'Riverside Park',
                unit: 'pH',
                normalRange: [6.8, 8.2],
                alertRange: [5.5, 6.7]
            }
        ];

        this.isRunning = false;
        this.dataHistory = [];
    }

    generateSensorReading(sensor) {
        const now = new Date();
        const hour = now.getHours();

        let baseRange = sensor.normalRange;
        let shouldAlert = false;

        if (Math.random() < 0.15) {
            baseRange = sensor.alertRange;
            shouldAlert = true;
        }

        if (sensor.type === 'air_quality' && (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
            baseRange = [baseRange[0] + 20, baseRange[1] + 30];
        }

        if (sensor.type === 'noise_pollution' && hour >= 22 || hour <= 6) {
            baseRange = [baseRange[0] - 10, baseRange[1] - 20];
        }

        const value = Math.random() * (baseRange[1] - baseRange[0]) + baseRange[0];

        return {
            sensorId: sensor.id,
            sensorType: sensor.type,
            location: sensor.location,
            value: Math.round(value * 100) / 100,
            unit: sensor.unit,
            timestamp: now.toISOString(),
            isAlert: shouldAlert
        };
    }

    generateBatchData(hours = 24) {
        const batchData = [];
        const now = new Date();

        for (let h = 0; h < hours; h++) {
            const timePoint = new Date(now.getTime() - (hours - h) * 60 * 60 * 1000);

            this.sensors.forEach(sensor => {
                const reading = this.generateSensorReading(sensor);
                reading.timestamp = timePoint.toISOString();
                batchData.push(reading);
            });
        }

        return batchData;
    }

    startContinuousSimulation(intervalMs = 30000) {
        if (this.isRunning) {
            console.log('Simulator already running');
            return;
        }

        this.isRunning = true;
        console.log(`Starting IoT sensor simulation with ${this.sensors.length} sensors...`);
        console.log(`Data generation interval: ${intervalMs}ms`);

        this.simulationInterval = setInterval(() => {
            const readings = [];

            this.sensors.forEach(sensor => {
                const reading = this.generateSensorReading(sensor);
                readings.push(reading);
                this.dataHistory.push(reading);

                if (reading.isAlert) {
                    console.log(`🚨 ALERT: ${reading.sensorType} at ${reading.location}: ${reading.value} ${reading.unit}`);
                } else {
                    console.log(`📊 ${reading.sensorType} at ${reading.location}: ${reading.value} ${reading.unit}`);
                }
            });

            if (this.dataHistory.length > 1000) {
                this.dataHistory = this.dataHistory.slice(-500);
            }

        }, intervalMs);
    }

    stopSimulation() {
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.isRunning = false;
            console.log('IoT sensor simulation stopped');
        }
    }

    getLatestReadings() {
        const latest = {};

        this.sensors.forEach(sensor => {
            const sensorReadings = this.dataHistory.filter(reading => reading.sensorId === sensor.id);
            if (sensorReadings.length > 0) {
                latest[sensor.id] = sensorReadings[sensorReadings.length - 1];
            }
        });

        return latest;
    }

    getHistoricalData(sensorType = null, hours = 24) {
        const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

        let filteredData = this.dataHistory.filter(reading =>
            new Date(reading.timestamp) >= cutoffTime
        );

        if (sensorType) {
            filteredData = filteredData.filter(reading => reading.sensorType === sensorType);
        }

        return filteredData;
    }

    getSummaryStats() {
        const stats = {};

        this.sensors.forEach(sensor => {
            const readings = this.dataHistory.filter(reading => reading.sensorId === sensor.id);

            if (readings.length > 0) {
                const values = readings.map(r => r.value);
                const alerts = readings.filter(r => r.isAlert).length;

                stats[sensor.id] = {
                    sensorType: sensor.type,
                    location: sensor.location,
                    totalReadings: readings.length,
                    averageValue: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
                    minValue: Math.min(...values).toFixed(2),
                    maxValue: Math.max(...values).toFixed(2),
                    alertCount: alerts,
                    alertPercentage: ((alerts / readings.length) * 100).toFixed(1)
                };
            }
        });

        return stats;
    }
}

module.exports = IoTSensorSimulator;