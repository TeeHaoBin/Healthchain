// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/MyHealthEHR.sol";
import "../src/libraries/DataTypes.sol";

contract MyHealthEHRTest is Test {
    MyHealthEHR public ehrSystem;
    
    address public admin;
    address public patient1;
    address public patient2;
    address public provider1;
    address public provider2;
    address public emergencyContact;
    
    function setUp() public {
        admin = address(this);
        patient1 = address(0x1);
        patient2 = address(0x2);
        provider1 = address(0x3);
        provider2 = address(0x4);
        emergencyContact = address(0x5);
        
        ehrSystem = new MyHealthEHR();
    }
    
    function testPatientRegistration() public {
        vm.startPrank(patient1);
        
        ehrSystem.registerPatient("patient1_public_key", emergencyContact);
        
        assertTrue(ehrSystem.patientRegistry().isRegisteredPatient(patient1));
        
        vm.stopPrank();
    }
    
    function testProviderRegistration() public {
        vm.startPrank(provider1);
        
        ehrSystem.registerProvider(
            "MD123456",
            "Cardiology",
            "General Hospital",
            "provider1_public_key"
        );
        
        assertTrue(ehrSystem.providerRegistry().isPendingProvider(provider1));
        
        vm.stopPrank();
    }
    
    function testProviderVerification() public {
        // Register provider first
        vm.startPrank(provider1);
        ehrSystem.registerProvider(
            "MD123456",
            "Cardiology", 
            "General Hospital",
            "provider1_public_key"
        );
        vm.stopPrank();
        
        // Admin verifies provider
        ehrSystem.verifyProvider(provider1);
        
        assertTrue(ehrSystem.providerRegistry().isVerifiedProvider(provider1));
    }
    
    function testAddHealthRecord() public {
        // Register patient
        vm.startPrank(patient1);
        ehrSystem.registerPatient("patient1_public_key", emergencyContact);
        
        // Patient adds their own record
        uint256 recordId = ehrSystem.addHealthRecord(
            patient1,
            "QmTestHash123",
            "encrypted_key_123",
            DataTypes.RecordType.GENERAL
        );
        
        assertEq(recordId, 1);
        vm.stopPrank();
    }
    
    function testAccessControl() public {
        // Setup: Register patient and provider
        vm.startPrank(patient1);
        ehrSystem.registerPatient("patient1_public_key", emergencyContact);
        vm.stopPrank();
        
        vm.startPrank(provider1);
        ehrSystem.registerProvider(
            "MD123456",
            "Cardiology",
            "General Hospital", 
            "provider1_public_key"
        );
        vm.stopPrank();
        
        // Verify provider
        ehrSystem.verifyProvider(provider1);
        
        // Provider requests access
        vm.startPrank(provider1);
        ehrSystem.requestAccess(patient1, DataTypes.AccessLevel.READ_ONLY, 3600, "Need to review patient history");
        vm.stopPrank();
        
        // Patient approves access request
        vm.startPrank(patient1);
        ehrSystem.approveAccessRequest(provider1);
        vm.stopPrank();
        
        // Check access
        (bool hasRegular, bool hasEmergency) = ehrSystem.checkAccess(patient1, provider1);
        assertTrue(hasRegular);
        assertFalse(hasEmergency);
    }
    
    function testEmergencyAccess() public {
        // Setup: Register patient and provider
        vm.startPrank(patient1);
        ehrSystem.registerPatient("patient1_public_key", emergencyContact);
        vm.stopPrank();
        
        vm.startPrank(provider1);
        ehrSystem.registerProvider(
            "MD123456",
            "Emergency Medicine",
            "Emergency Hospital",
            "provider1_public_key"
        );
        vm.stopPrank();
        
        // Verify provider
        ehrSystem.verifyProvider(provider1);
        
        // Provider requests emergency access
        vm.startPrank(provider1);
        ehrSystem.grantEmergencyAccess(patient1, "Patient unconscious, need medical history");
        vm.stopPrank();
        
        // Check emergency access
        (bool hasRegular, bool hasEmergency) = ehrSystem.checkAccess(patient1, provider1);
        assertFalse(hasRegular);
        assertTrue(hasEmergency);
    }
    
    function testProviderCanAddRecordWithAccess() public {
        // Setup: Register patient and provider
        vm.startPrank(patient1);
        ehrSystem.registerPatient("patient1_public_key", emergencyContact);
        vm.stopPrank();
        
        vm.startPrank(provider1);
        ehrSystem.registerProvider(
            "MD123456",
            "Cardiology",
            "General Hospital",
            "provider1_public_key"
        );
        vm.stopPrank();
        
        // Verify provider
        ehrSystem.verifyProvider(provider1);
        
        // Provider requests access
        vm.startPrank(provider1);
        ehrSystem.requestAccess(patient1, DataTypes.AccessLevel.READ_WRITE, 3600, "Need to add lab results");
        vm.stopPrank();
        
        // Patient approves access
        vm.startPrank(patient1);
        ehrSystem.approveAccessRequest(provider1);
        vm.stopPrank();
        
        // Provider adds record for patient
        vm.startPrank(provider1);
        uint256 recordId = ehrSystem.addHealthRecord(
            patient1,
            "QmProviderHash123",
            "encrypted_key_456",
            DataTypes.RecordType.LAB_RESULT
        );
        
        assertEq(recordId, 1);
        vm.stopPrank();
    }
    
    function test_RevertWhen_ProviderCannotAddRecordWithoutAccess() public {
        // Setup: Register patient and provider (but no access granted)
        vm.startPrank(patient1);
        ehrSystem.registerPatient("patient1_public_key", emergencyContact);
        vm.stopPrank();
        
        vm.startPrank(provider1);
        ehrSystem.registerProvider(
            "MD123456",
            "Cardiology",
            "General Hospital",
            "provider1_public_key"
        );
        vm.stopPrank();
        
        // Verify provider
        ehrSystem.verifyProvider(provider1);
        
        // Provider tries to add record without access - should fail
        vm.startPrank(provider1);
        vm.expectRevert("No permission to add record for this patient");
        ehrSystem.addHealthRecord(
            patient1,
            "QmProviderHash123",
            "encrypted_key_456",
            DataTypes.RecordType.LAB_RESULT
        );
        vm.stopPrank();
    }
    
    function testSystemPause() public {
        // Pause system
        ehrSystem.pauseSystem(true);
        
        // Try to register patient while paused - should fail
        vm.startPrank(patient1);
        vm.expectRevert("System is paused");
        ehrSystem.registerPatient("patient1_public_key", emergencyContact);
        vm.stopPrank();
        
        // Unpause system
        ehrSystem.pauseSystem(false);
        
        // Now registration should work
        vm.startPrank(patient1);
        ehrSystem.registerPatient("patient1_public_key", emergencyContact);
        assertTrue(ehrSystem.patientRegistry().isRegisteredPatient(patient1));
        vm.stopPrank();
    }
    
    function testGetContractAddresses() public {
        (
            address patientReg,
            address providerReg,
            address storage_,
            address accessCtrl,
            address emergency,
            address audit,
            address notifications
        ) = ehrSystem.getContractAddresses();
        
        assertTrue(patientReg != address(0));
        assertTrue(providerReg != address(0));
        assertTrue(storage_ != address(0));
        assertTrue(accessCtrl != address(0));
        assertTrue(emergency != address(0));
        assertTrue(audit != address(0));
        assertTrue(notifications != address(0));
    }
}