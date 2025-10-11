// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libraries/DataTypes.sol";

/**
 * @title IEHR
 * @dev Interface for the EHR system contracts
 */
interface IEHR {
    
    // Events
    event RecordAdded(uint256 indexed recordId, address indexed patient, address indexed provider);
    event AccessGranted(address indexed patient, address indexed provider, DataTypes.AccessLevel level);
    event AccessRevoked(address indexed patient, address indexed provider);
    event EmergencyAccessGranted(address indexed patient, address indexed provider, uint256 expiryTime);
    
    // Patient Registry Interface
    function registerPatient(string memory _encryptionPublicKey, address _emergencyContact) external;
    function isRegisteredPatient(address _patient) external view returns (bool);
    
    // Provider Registry Interface
    function registerProvider(
        string memory _licenseNumber,
        string memory _specialty,
        string memory _institutionName,
        string memory _encryptionPublicKey
    ) external;
    function verifyProvider(address _provider) external;
    function isVerifiedProvider(address _provider) external view returns (bool);
    
    // EHR Storage Interface
    function addRecord(
        address _patient,
        string memory _ipfsHash,
        string memory _encryptedSymmetricKey,
        DataTypes.RecordType _recordType
    ) external returns (uint256);
    
    // Access Control Interface
    function grantAccess(
        address _provider,
        DataTypes.AccessLevel _level,
        uint256 _duration
    ) external;
    function revokeAccess(address _provider) external;
    function checkAccess(address _patient, address _provider) external view returns (bool);
}