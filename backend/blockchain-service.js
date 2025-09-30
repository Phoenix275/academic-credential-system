const { ethers } = require('ethers');
require('dotenv').config();

class BlockchainService {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.contracts = {};
        this.isConnected = false;
    }

    async initialize() {
        try {
            this.provider = new ethers.JsonRpcProvider('http://localhost:8545');

            const accounts = await this.provider.listAccounts();
            if (accounts.length === 0) {
                throw new Error('No accounts available');
            }

            this.signer = await this.provider.getSigner(0);
            console.log('Connected to blockchain with account:', await this.signer.getAddress());

            await this.loadContracts();
            this.isConnected = true;

            return true;
        } catch (error) {
            console.error('Failed to connect to blockchain:', error.message);
            return false;
        }
    }

    async loadContracts() {
        const EcoToken = require('../artifacts/contracts/EcoToken.sol/EcoToken.json');
        const EnvironmentalData = require('../artifacts/contracts/EnvironmentalData.sol/EnvironmentalData.json');
        const CitizenReporting = require('../artifacts/contracts/CitizenReporting.sol/CitizenReporting.json');
        const PolicyCompliance = require('../artifacts/contracts/PolicyCompliance.sol/PolicyCompliance.json');

        if (process.env.ECO_TOKEN_ADDRESS) {
            this.contracts.ecoToken = new ethers.Contract(
                process.env.ECO_TOKEN_ADDRESS,
                EcoToken.abi,
                this.signer
            );
        }

        if (process.env.ENVIRONMENTAL_DATA_ADDRESS) {
            this.contracts.environmentalData = new ethers.Contract(
                process.env.ENVIRONMENTAL_DATA_ADDRESS,
                EnvironmentalData.abi,
                this.signer
            );
        }

        if (process.env.CITIZEN_REPORTING_ADDRESS) {
            this.contracts.citizenReporting = new ethers.Contract(
                process.env.CITIZEN_REPORTING_ADDRESS,
                CitizenReporting.abi,
                this.signer
            );
        }

        if (process.env.POLICY_COMPLIANCE_ADDRESS) {
            this.contracts.policyCompliance = new ethers.Contract(
                process.env.POLICY_COMPLIANCE_ADDRESS,
                PolicyCompliance.abi,
                this.signer
            );
        }
    }

    async submitSensorData(sensorType, location, value, unit) {
        try {
            if (!this.contracts.environmentalData) {
                throw new Error('EnvironmentalData contract not loaded');
            }

            const valueInWei = ethers.parseUnits(value.toString(), 0);

            const tx = await this.contracts.environmentalData.submitSensorData(
                sensorType,
                location,
                valueInWei,
                unit
            );

            const receipt = await tx.wait();
            console.log(`Sensor data submitted: ${sensorType} = ${value} ${unit} at ${location}`);

            return {
                success: true,
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber
            };

        } catch (error) {
            console.error('Error submitting sensor data:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async submitCitizenReport(location, issueType, description, evidenceHash) {
        try {
            if (!this.contracts.citizenReporting) {
                throw new Error('CitizenReporting contract not loaded');
            }

            const tx = await this.contracts.citizenReporting.submitReport(
                location,
                issueType,
                description,
                evidenceHash
            );

            const receipt = await tx.wait();
            console.log(`Citizen report submitted: ${issueType} at ${location}`);

            return {
                success: true,
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber
            };

        } catch (error) {
            console.error('Error submitting citizen report:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async checkPolicyCompliance(municipality, sensorType) {
        try {
            if (!this.contracts.policyCompliance) {
                throw new Error('PolicyCompliance contract not loaded');
            }

            const result = await this.contracts.policyCompliance.checkCurrentCompliance(
                municipality,
                sensorType
            );

            return {
                isCompliant: result[0],
                actualValue: result[1].toString(),
                requiredValue: result[2].toString()
            };

        } catch (error) {
            console.error('Error checking policy compliance:', error.message);
            return null;
        }
    }

    async getTokenBalance(address) {
        try {
            if (!this.contracts.ecoToken) {
                throw new Error('EcoToken contract not loaded');
            }

            const balance = await this.contracts.ecoToken.balanceOf(address);
            return ethers.formatEther(balance);

        } catch (error) {
            console.error('Error getting token balance:', error.message);
            return '0';
        }
    }

    async getSensorData(dataId) {
        try {
            if (!this.contracts.environmentalData) {
                throw new Error('EnvironmentalData contract not loaded');
            }

            const data = await this.contracts.environmentalData.getSensorData(dataId);

            return {
                timestamp: data.timestamp.toString(),
                sensorType: data.sensorType,
                location: data.location,
                value: data.value.toString(),
                unit: data.unit,
                submittedBy: data.submittedBy,
                verified: data.verified
            };

        } catch (error) {
            console.error('Error getting sensor data:', error.message);
            return null;
        }
    }

    async getCitizenReport(reportId) {
        try {
            if (!this.contracts.citizenReporting) {
                throw new Error('CitizenReporting contract not loaded');
            }

            const report = await this.contracts.citizenReporting.getReport(reportId);

            return {
                reportId: report[0].toString(),
                reporter: report[1],
                location: report[2],
                issueType: report[3],
                description: report[4],
                evidenceHash: report[5],
                timestamp: report[6].toString(),
                status: report[7],
                validationCount: report[8].toString()
            };

        } catch (error) {
            console.error('Error getting citizen report:', error.message);
            return null;
        }
    }

    async listenForEvents() {
        if (!this.isConnected) {
            console.log('Not connected to blockchain');
            return;
        }

        if (this.contracts.environmentalData) {
            this.contracts.environmentalData.on('DataSubmitted', (dataId, sensorType, location, value) => {
                console.log(`📊 New sensor data: ${sensorType} at ${location} = ${value}`);
            });

            this.contracts.environmentalData.on('PolicyViolation', (policyName, location, actualValue, threshold) => {
                console.log(`🚨 Policy violation: ${policyName} at ${location} (${actualValue} vs ${threshold})`);
            });

            this.contracts.environmentalData.on('PolicyCompliance', (policyName, location, actualValue) => {
                console.log(`✅ Policy compliance: ${policyName} at ${location} (${actualValue})`);
            });
        }

        if (this.contracts.citizenReporting) {
            this.contracts.citizenReporting.on('ReportSubmitted', (reportId, reporter, location, issueType) => {
                console.log(`📝 New citizen report: ${issueType} at ${location} (ID: ${reportId})`);
            });

            this.contracts.citizenReporting.on('ReportVerified', (reportId, reporter) => {
                console.log(`✅ Report verified: ID ${reportId} by ${reporter}`);
            });
        }

        if (this.contracts.ecoToken) {
            this.contracts.ecoToken.on('TokensRewarded', (recipient, amount, reason) => {
                console.log(`🪙 Tokens rewarded: ${ethers.formatEther(amount)} ECO to ${recipient} for ${reason}`);
            });
        }
    }
}

module.exports = BlockchainService;