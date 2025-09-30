const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const IoTSensorSimulator = require('./iot-simulator');
const BlockchainService = require('./blockchain-service');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

const iotSimulator = new IoTSensorSimulator();
const blockchainService = new BlockchainService();

let simulationActive = false;

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        simulation: {
            active: simulationActive,
            sensors: iotSimulator.sensors.length
        }
    });
});

app.post('/api/simulation/start', async (req, res) => {
    try {
        if (simulationActive) {
            return res.status(400).json({ error: 'Simulation already running' });
        }

        await blockchainService.initialize();

        iotSimulator.startContinuousSimulation(10000);
        simulationActive = true;

        blockchainService.listenForEvents();

        setTimeout(async () => {
            const readings = iotSimulator.getLatestReadings();
            for (const [sensorId, reading] of Object.entries(readings)) {
                await blockchainService.submitSensorData(
                    reading.sensorType,
                    reading.location,
                    reading.value,
                    reading.unit
                );

                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }, 2000);

        res.json({
            message: 'IoT simulation started successfully',
            sensors: iotSimulator.sensors.length,
            interval: '10 seconds'
        });

    } catch (error) {
        console.error('Error starting simulation:', error);
        res.status(500).json({ error: 'Failed to start simulation: ' + error.message });
    }
});

app.post('/api/simulation/stop', (req, res) => {
    try {
        iotSimulator.stopSimulation();
        simulationActive = false;

        res.json({ message: 'IoT simulation stopped successfully' });

    } catch (error) {
        console.error('Error stopping simulation:', error);
        res.status(500).json({ error: 'Failed to stop simulation: ' + error.message });
    }
});

app.get('/api/sensors/latest', (req, res) => {
    try {
        const latestReadings = iotSimulator.getLatestReadings();
        res.json(latestReadings);

    } catch (error) {
        console.error('Error getting latest readings:', error);
        res.status(500).json({ error: 'Failed to get latest readings' });
    }
});

app.get('/api/sensors/history', (req, res) => {
    try {
        const { sensorType, hours = 24 } = req.query;
        const historicalData = iotSimulator.getHistoricalData(sensorType, parseInt(hours));

        res.json({
            sensorType: sensorType || 'all',
            hours: parseInt(hours),
            dataPoints: historicalData.length,
            data: historicalData
        });

    } catch (error) {
        console.error('Error getting historical data:', error);
        res.status(500).json({ error: 'Failed to get historical data' });
    }
});

app.get('/api/sensors/stats', (req, res) => {
    try {
        const stats = iotSimulator.getSummaryStats();
        res.json(stats);

    } catch (error) {
        console.error('Error getting sensor stats:', error);
        res.status(500).json({ error: 'Failed to get sensor stats' });
    }
});

app.post('/api/citizen/report', async (req, res) => {
    try {
        const { location, issueType, description, evidenceHash } = req.body;

        if (!location || !issueType || !description) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const result = await blockchainService.submitCitizenReport(
            location,
            issueType,
            description,
            evidenceHash || 'QmHashExample123'
        );

        if (result.success) {
            res.json({
                message: 'Citizen report submitted successfully',
                transactionHash: result.transactionHash,
                blockNumber: result.blockNumber
            });
        } else {
            res.status(500).json({ error: result.error });
        }

    } catch (error) {
        console.error('Error submitting citizen report:', error);
        res.status(500).json({ error: 'Failed to submit citizen report' });
    }
});

app.get('/api/policy/compliance/:municipality/:sensorType', async (req, res) => {
    try {
        const { municipality, sensorType } = req.params;

        const compliance = await blockchainService.checkPolicyCompliance(municipality, sensorType);

        if (compliance) {
            res.json(compliance);
        } else {
            res.status(404).json({ error: 'Compliance data not found' });
        }

    } catch (error) {
        console.error('Error checking compliance:', error);
        res.status(500).json({ error: 'Failed to check compliance' });
    }
});

app.get('/api/token/balance/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const balance = await blockchainService.getTokenBalance(address);

        res.json({
            address,
            balance,
            symbol: 'ECO'
        });

    } catch (error) {
        console.error('Error getting token balance:', error);
        res.status(500).json({ error: 'Failed to get token balance' });
    }
});

app.get('/api/demo/generate-data', (req, res) => {
    try {
        const { hours = 24 } = req.query;
        const batchData = iotSimulator.generateBatchData(parseInt(hours));

        res.json({
            message: `Generated ${batchData.length} data points for demo`,
            hours: parseInt(hours),
            sensors: iotSimulator.sensors.length,
            data: batchData
        });

    } catch (error) {
        console.error('Error generating demo data:', error);
        res.status(500).json({ error: 'Failed to generate demo data' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 EcoGov Chain Backend Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🌱 Ready to start environmental monitoring simulation`);
});

module.exports = app;