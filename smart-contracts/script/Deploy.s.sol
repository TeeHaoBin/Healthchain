// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/MyHealthEHR.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy the main EHR system (which deploys all sub-contracts)
        MyHealthEHR ehrSystem = new MyHealthEHR();
        
        console.log("MyHealthEHR deployed at:", address(ehrSystem));
        
        // Get all contract addresses
        (
            address patientRegistry,
            address providerRegistry,
            address ehrStorage,
            address accessControl,
            address emergencyAccess,
            address auditLog,
            address notificationManager
        ) = ehrSystem.getContractAddresses();
        
        console.log("PatientRegistry:", patientRegistry);
        console.log("ProviderRegistry:", providerRegistry);
        console.log("EHRStorage:", ehrStorage);
        console.log("AccessControl:", accessControl);
        console.log("EmergencyAccess:", emergencyAccess);
        console.log("AuditLog:", auditLog);
        console.log("NotificationManager:", notificationManager);
        
        vm.stopBroadcast();
    }
}