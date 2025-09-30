// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./EcoToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CitizenReporting is Ownable {
    EcoToken public ecoToken;

    struct EnvironmentalReport {
        uint256 reportId;
        address reporter;
        string location;
        string issueType;
        string description;
        string evidenceHash;
        uint256 timestamp;
        ReportStatus status;
        uint256 validationCount;
        mapping(address => bool) validators;
    }

    enum ReportStatus { Submitted, UnderReview, Verified, Rejected, Resolved }

    mapping(uint256 => EnvironmentalReport) public reports;
    mapping(address => uint256[]) public userReports;
    mapping(address => bool) public validators;

    uint256 public nextReportId = 1;
    uint256 public constant VALIDATION_THRESHOLD = 3;
    uint256 public constant REPORT_REWARD = 50 * 10**18;
    uint256 public constant VALIDATION_REWARD = 10 * 10**18;

    event ReportSubmitted(uint256 indexed reportId, address indexed reporter, string location, string issueType);
    event ReportValidated(uint256 indexed reportId, address indexed validator);
    event ReportVerified(uint256 indexed reportId, address indexed reporter);
    event ReportResolved(uint256 indexed reportId);

    constructor(address _ecoToken) Ownable(msg.sender) {
        ecoToken = EcoToken(_ecoToken);
    }

    function addValidator(address validator) external onlyOwner {
        validators[validator] = true;
    }

    function submitReport(
        string memory location,
        string memory issueType,
        string memory description,
        string memory evidenceHash
    ) external {
        uint256 reportId = nextReportId;

        EnvironmentalReport storage newReport = reports[reportId];
        newReport.reportId = reportId;
        newReport.reporter = msg.sender;
        newReport.location = location;
        newReport.issueType = issueType;
        newReport.description = description;
        newReport.evidenceHash = evidenceHash;
        newReport.timestamp = block.timestamp;
        newReport.status = ReportStatus.Submitted;
        newReport.validationCount = 0;

        userReports[msg.sender].push(reportId);

        emit ReportSubmitted(reportId, msg.sender, location, issueType);

        nextReportId++;
    }

    function validateReport(uint256 reportId) external {
        require(validators[msg.sender], "Not authorized validator");
        require(reports[reportId].reportId != 0, "Report does not exist");
        require(reports[reportId].status == ReportStatus.Submitted || reports[reportId].status == ReportStatus.UnderReview, "Cannot validate this report");
        require(!reports[reportId].validators[msg.sender], "Already validated by this validator");

        reports[reportId].validators[msg.sender] = true;
        reports[reportId].validationCount++;
        reports[reportId].status = ReportStatus.UnderReview;

        emit ReportValidated(reportId, msg.sender);

        ecoToken.rewardTokens(msg.sender, VALIDATION_REWARD, "Report validation");

        if (reports[reportId].validationCount >= VALIDATION_THRESHOLD) {
            reports[reportId].status = ReportStatus.Verified;
            ecoToken.rewardTokens(reports[reportId].reporter, REPORT_REWARD, "Verified environmental report");
            emit ReportVerified(reportId, reports[reportId].reporter);
        }
    }

    function resolveReport(uint256 reportId) external onlyOwner {
        require(reports[reportId].status == ReportStatus.Verified, "Report must be verified first");
        reports[reportId].status = ReportStatus.Resolved;
        emit ReportResolved(reportId);
    }

    function getReport(uint256 reportId) external view returns (
        uint256,
        address,
        string memory,
        string memory,
        string memory,
        string memory,
        uint256,
        ReportStatus,
        uint256
    ) {
        EnvironmentalReport storage report = reports[reportId];
        return (
            report.reportId,
            report.reporter,
            report.location,
            report.issueType,
            report.description,
            report.evidenceHash,
            report.timestamp,
            report.status,
            report.validationCount
        );
    }

    function getUserReports(address user) external view returns (uint256[] memory) {
        return userReports[user];
    }
}