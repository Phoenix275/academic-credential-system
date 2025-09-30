// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract EnvironmentalData is Ownable {
    struct SensorData {
        uint256 timestamp;
        string sensorType;
        string location;
        uint256 value;
        string unit;
        address submittedBy;
        bool verified;
    }

    struct PolicyStandard {
        string policyName;
        string metric;
        uint256 threshold;
        bool isMaxThreshold;
        bool active;
    }

    mapping(uint256 => SensorData) public sensorDataRecords;
    mapping(string => PolicyStandard) public policyStandards;
    mapping(address => bool) public authorizedSensors;
    mapping(address => bool) public municipalities;

    uint256 public nextDataId = 1;
    uint256 public constant VERIFICATION_THRESHOLD = 3;

    event DataSubmitted(uint256 indexed dataId, string sensorType, string location, uint256 value);
    event PolicyViolation(string policyName, string location, uint256 actualValue, uint256 threshold);
    event PolicyCompliance(string policyName, string location, uint256 actualValue);

    constructor() Ownable(msg.sender) {}

    modifier onlyMunicipality() {
        require(municipalities[msg.sender], "Not a registered municipality");
        _;
    }

    modifier onlyAuthorizedSensor() {
        require(authorizedSensors[msg.sender], "Not an authorized sensor");
        _;
    }

    function registerMunicipality(address municipality) external onlyOwner {
        municipalities[municipality] = true;
    }

    function authorizeSensor(address sensor) external onlyMunicipality {
        authorizedSensors[sensor] = true;
    }

    function setPolicyStandard(
        string memory policyName,
        string memory metric,
        uint256 threshold,
        bool isMaxThreshold
    ) external onlyMunicipality {
        policyStandards[policyName] = PolicyStandard({
            policyName: policyName,
            metric: metric,
            threshold: threshold,
            isMaxThreshold: isMaxThreshold,
            active: true
        });
    }

    function submitSensorData(
        string memory sensorType,
        string memory location,
        uint256 value,
        string memory unit
    ) external onlyAuthorizedSensor {
        sensorDataRecords[nextDataId] = SensorData({
            timestamp: block.timestamp,
            sensorType: sensorType,
            location: location,
            value: value,
            unit: unit,
            submittedBy: msg.sender,
            verified: true
        });

        emit DataSubmitted(nextDataId, sensorType, location, value);

        _checkPolicyCompliance(sensorType, location, value);

        nextDataId++;
    }

    function _checkPolicyCompliance(
        string memory sensorType,
        string memory location,
        uint256 value
    ) internal {
        string memory policyKey = string(abi.encodePacked(sensorType, "_standard"));
        PolicyStandard memory policy = policyStandards[policyKey];

        if (policy.active) {
            if (policy.isMaxThreshold) {
                if (value > policy.threshold) {
                    emit PolicyViolation(policy.policyName, location, value, policy.threshold);
                } else {
                    emit PolicyCompliance(policy.policyName, location, value);
                }
            } else {
                if (value < policy.threshold) {
                    emit PolicyViolation(policy.policyName, location, value, policy.threshold);
                } else {
                    emit PolicyCompliance(policy.policyName, location, value);
                }
            }
        }
    }

    function getSensorData(uint256 dataId) external view returns (SensorData memory) {
        return sensorDataRecords[dataId];
    }

    function getLatestDataByType(string memory sensorType) external view returns (SensorData memory) {
        for (uint256 i = nextDataId - 1; i >= 1; i--) {
            if (keccak256(abi.encodePacked(sensorDataRecords[i].sensorType)) == keccak256(abi.encodePacked(sensorType))) {
                return sensorDataRecords[i];
            }
        }
        revert("No data found for sensor type");
    }
}