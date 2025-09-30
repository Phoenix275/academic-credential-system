// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./EcoToken.sol";
import "./EnvironmentalData.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PolicyCompliance is Ownable {
    EcoToken public ecoToken;
    EnvironmentalData public environmentalData;

    struct Municipality {
        string name;
        address walletAddress;
        bool registered;
        uint256 complianceScore;
        uint256 totalRewards;
        uint256 totalPenalties;
    }

    struct ComplianceRecord {
        address municipality;
        string policyName;
        uint256 timestamp;
        bool isCompliant;
        uint256 actualValue;
        uint256 requiredValue;
        uint256 rewardOrPenalty;
    }

    mapping(address => Municipality) public municipalities;
    mapping(uint256 => ComplianceRecord) public complianceRecords;
    mapping(string => uint256) public policyRewards;
    mapping(string => uint256) public policyPenalties;

    uint256 public nextRecordId = 1;
    uint256 public constant BASE_COMPLIANCE_REWARD = 100 * 10**18;
    uint256 public constant BASE_VIOLATION_PENALTY = 50 * 10**18;

    event MunicipalityRegistered(address indexed municipality, string name);
    event ComplianceRecorded(uint256 indexed recordId, address indexed municipality, string policyName, bool isCompliant);
    event RewardIssued(address indexed municipality, uint256 amount, string reason);
    event PenaltyIssued(address indexed municipality, uint256 amount, string reason);

    constructor(address _ecoToken, address _environmentalData) Ownable(msg.sender) {
        ecoToken = EcoToken(_ecoToken);
        environmentalData = EnvironmentalData(_environmentalData);

        _setPolicyRewardsAndPenalties();
    }

    function _setPolicyRewardsAndPenalties() internal {
        policyRewards["air_quality_standard"] = BASE_COMPLIANCE_REWARD;
        policyRewards["water_quality_standard"] = BASE_COMPLIANCE_REWARD;
        policyRewards["noise_pollution_standard"] = BASE_COMPLIANCE_REWARD * 75 / 100;

        policyPenalties["air_quality_standard"] = BASE_VIOLATION_PENALTY * 2;
        policyPenalties["water_quality_standard"] = BASE_VIOLATION_PENALTY * 2;
        policyPenalties["noise_pollution_standard"] = BASE_VIOLATION_PENALTY;
    }

    function registerMunicipality(address municipalityAddress, string memory name) external onlyOwner {
        municipalities[municipalityAddress] = Municipality({
            name: name,
            walletAddress: municipalityAddress,
            registered: true,
            complianceScore: 100,
            totalRewards: 0,
            totalPenalties: 0
        });

        emit MunicipalityRegistered(municipalityAddress, name);
    }

    function recordCompliance(
        address municipality,
        string memory policyName,
        bool isCompliant,
        uint256 actualValue,
        uint256 requiredValue
    ) external onlyOwner {
        require(municipalities[municipality].registered, "Municipality not registered");

        uint256 rewardOrPenalty = 0;

        if (isCompliant) {
            rewardOrPenalty = policyRewards[policyName];
            if (rewardOrPenalty > 0) {
                municipalities[municipality].totalRewards += rewardOrPenalty;
                municipalities[municipality].complianceScore = _min(municipalities[municipality].complianceScore + 5, 100);
                ecoToken.rewardTokens(municipality, rewardOrPenalty, string(abi.encodePacked("Policy compliance: ", policyName)));
                emit RewardIssued(municipality, rewardOrPenalty, policyName);
            }
        } else {
            rewardOrPenalty = policyPenalties[policyName];
            if (rewardOrPenalty > 0) {
                municipalities[municipality].totalPenalties += rewardOrPenalty;
                municipalities[municipality].complianceScore = _max(municipalities[municipality].complianceScore - 10, 0);
                emit PenaltyIssued(municipality, rewardOrPenalty, policyName);
            }
        }

        complianceRecords[nextRecordId] = ComplianceRecord({
            municipality: municipality,
            policyName: policyName,
            timestamp: block.timestamp,
            isCompliant: isCompliant,
            actualValue: actualValue,
            requiredValue: requiredValue,
            rewardOrPenalty: rewardOrPenalty
        });

        emit ComplianceRecorded(nextRecordId, municipality, policyName, isCompliant);
        nextRecordId++;
    }

    function getMunicipality(address municipalityAddress) external view returns (Municipality memory) {
        return municipalities[municipalityAddress];
    }

    function getComplianceRecord(uint256 recordId) external view returns (ComplianceRecord memory) {
        return complianceRecords[recordId];
    }

    function checkCurrentCompliance(address municipality, string memory sensorType) external view returns (bool, uint256, uint256) {
        try environmentalData.getLatestDataByType(sensorType) returns (EnvironmentalData.SensorData memory data) {
            string memory policyKey = string(abi.encodePacked(sensorType, "_standard"));
            (,, uint256 threshold, bool isMaxThreshold,) = environmentalData.policyStandards(policyKey);

            bool isCompliant;
            if (isMaxThreshold) {
                isCompliant = data.value <= threshold;
            } else {
                isCompliant = data.value >= threshold;
            }

            return (isCompliant, data.value, threshold);
        } catch {
            return (false, 0, 0);
        }
    }

    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    function _max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a : b;
    }
}