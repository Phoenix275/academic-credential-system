const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

    console.log("\n=== Deploying EcoToken ===");
    const EcoToken = await hre.ethers.getContractFactory("EcoToken");
    const ecoToken = await EcoToken.deploy();
    await ecoToken.waitForDeployment();
    console.log("EcoToken deployed to:", await ecoToken.getAddress());

    console.log("\n=== Deploying EnvironmentalData ===");
    const EnvironmentalData = await hre.ethers.getContractFactory("EnvironmentalData");
    const environmentalData = await EnvironmentalData.deploy();
    await environmentalData.waitForDeployment();
    console.log("EnvironmentalData deployed to:", await environmentalData.getAddress());

    console.log("\n=== Deploying CitizenReporting ===");
    const CitizenReporting = await hre.ethers.getContractFactory("CitizenReporting");
    const citizenReporting = await CitizenReporting.deploy(await ecoToken.getAddress());
    await citizenReporting.waitForDeployment();
    console.log("CitizenReporting deployed to:", await citizenReporting.getAddress());

    console.log("\n=== Deploying PolicyCompliance ===");
    const PolicyCompliance = await hre.ethers.getContractFactory("PolicyCompliance");
    const policyCompliance = await PolicyCompliance.deploy(
        await ecoToken.getAddress(),
        await environmentalData.getAddress()
    );
    await policyCompliance.waitForDeployment();
    console.log("PolicyCompliance deployed to:", await policyCompliance.getAddress());

    console.log("\n=== Setting up permissions ===");
    await ecoToken.authorizeContract(await citizenReporting.getAddress());
    console.log("✅ CitizenReporting authorized for EcoToken");

    await ecoToken.authorizeContract(await policyCompliance.getAddress());
    console.log("✅ PolicyCompliance authorized for EcoToken");

    console.log("\n=== Registering test municipality ===");
    await environmentalData.registerMunicipality(deployer.address);
    console.log("✅ Test municipality registered");

    await policyCompliance.registerMunicipality(deployer.address, "Test Municipality");
    console.log("✅ Test municipality registered in PolicyCompliance");

    console.log("\n=== Adding test sensor ===");
    await environmentalData.authorizeSensor(deployer.address);
    console.log("✅ Test sensor authorized");

    console.log("\n=== Setting policy standards ===");
    await environmentalData.setPolicyStandard("air_quality_standard", "air_quality", 100, true);
    await environmentalData.setPolicyStandard("water_quality_standard", "water_quality", 6, false);
    await environmentalData.setPolicyStandard("noise_pollution_standard", "noise_pollution", 70, true);
    console.log("✅ Policy standards set");

    console.log("\n=== Adding test validator ===");
    await citizenReporting.addValidator(deployer.address);
    console.log("✅ Test validator added");

    console.log("\n=== Deployment Summary ===");
    console.log("EcoToken:", await ecoToken.getAddress());
    console.log("EnvironmentalData:", await environmentalData.getAddress());
    console.log("CitizenReporting:", await citizenReporting.getAddress());
    console.log("PolicyCompliance:", await policyCompliance.getAddress());

    console.log("\n=== Creating .env file ===");
    const fs = require('fs');
    const envContent = `ECO_TOKEN_ADDRESS=${await ecoToken.getAddress()}
ENVIRONMENTAL_DATA_ADDRESS=${await environmentalData.getAddress()}
CITIZEN_REPORTING_ADDRESS=${await citizenReporting.getAddress()}
POLICY_COMPLIANCE_ADDRESS=${await policyCompliance.getAddress()}
DEPLOYER_ADDRESS=${deployer.address}
`;

    fs.writeFileSync('.env', envContent);
    console.log("✅ .env file created with contract addresses");

    console.log("\n🎉 Deployment completed successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });