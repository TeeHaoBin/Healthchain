// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/IEHR.sol";
import "./libraries/DataTypes.sol";

/**
 * @title PatientRegistry
 * @dev Core contract for patient identity and profile management
 */
contract PatientRegistry {
    using DataTypes for DataTypes.Patient;
    
    mapping(address => DataTypes.Patient) public patients;
    mapping(address => bool) public registeredPatients;
    mapping(address => bool) public authorizedCallers;
    address public owner;
    
    event PatientRegistered(address indexed patient, uint256 timestamp);
    event PatientProfileUpdated(address indexed patient, uint256 timestamp);
    event EmergencyContactUpdated(address indexed patient, address indexed emergencyContact);
    event CallerAuthorized(address indexed caller, bool authorized);
    
    modifier onlyRegisteredPatient() {
        require(registeredPatients[msg.sender], "Not a registered patient");
        _;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        authorizedCallers[msg.sender] = true;
    }
    
    /**
     * @dev Register a new patient
     * @param _encryptionPublicKey Patient's encryption public key
     * @param _emergencyContact Emergency contact address
     */
    function registerPatient(
        string memory _encryptionPublicKey,
        address _emergencyContact
    ) external {
        registerPatientInternal(msg.sender, _encryptionPublicKey, _emergencyContact);
    }
    
    /**
     * @dev Register a patient on behalf of another address (authorized callers only)
     * @param _patientAddress Patient address to register
     * @param _encryptionPublicKey Patient's encryption public key
     * @param _emergencyContact Emergency contact address
     */
    function registerPatientOnBehalf(
        address _patientAddress,
        string memory _encryptionPublicKey,
        address _emergencyContact
    ) external {
        require(authorizedCallers[msg.sender], "Not authorized to register on behalf");
        registerPatientInternal(_patientAddress, _encryptionPublicKey, _emergencyContact);
    }
    
    /**
     * @dev Internal registration function
     */
    function registerPatientInternal(
        address _patientAddress,
        string memory _encryptionPublicKey,
        address _emergencyContact
    ) internal {
        require(!registeredPatients[_patientAddress], "Patient already registered");
        require(bytes(_encryptionPublicKey).length > 0, "Invalid encryption key");
        
        patients[_patientAddress] = DataTypes.Patient({
            patientAddress: _patientAddress,
            encryptionPublicKey: _encryptionPublicKey,
            emergencyContact: _emergencyContact,
            registrationTimestamp: block.timestamp,
            isActive: true
        });
        
        registeredPatients[_patientAddress] = true;
        
        emit PatientRegistered(_patientAddress, block.timestamp);
    }
    
    /**
     * @dev Authorize a caller to register patients on behalf of others
     * @param _caller Address to authorize
     * @param _authorized Whether to authorize or deauthorize
     */
    function authorizeCaller(address _caller, bool _authorized) external onlyOwner {
        authorizedCallers[_caller] = _authorized;
        emit CallerAuthorized(_caller, _authorized);
    }
    
    /**
     * @dev Update patient's encryption key
     * @param _newEncryptionKey New encryption public key
     */
    function updateEncryptionKey(string memory _newEncryptionKey) external onlyRegisteredPatient {
        require(bytes(_newEncryptionKey).length > 0, "Invalid encryption key");
        patients[msg.sender].encryptionPublicKey = _newEncryptionKey;
        
        emit PatientProfileUpdated(msg.sender, block.timestamp);
    }
    
    /**
     * @dev Update emergency contact
     * @param _newEmergencyContact New emergency contact address
     */
    function updateEmergencyContact(address _newEmergencyContact) external onlyRegisteredPatient {
        patients[msg.sender].emergencyContact = _newEmergencyContact;
        
        emit EmergencyContactUpdated(msg.sender, _newEmergencyContact);
    }
    
    /**
     * @dev Get patient information
     * @param _patient Patient address
     * @return Patient struct
     */
    function getPatient(address _patient) external view returns (DataTypes.Patient memory) {
        require(registeredPatients[_patient], "Patient not registered");
        return patients[_patient];
    }
    
    /**
     * @dev Check if address is a registered patient
     * @param _patient Patient address to check
     * @return bool indicating if patient is registered
     */
    function isRegisteredPatient(address _patient) external view returns (bool) {
        return registeredPatients[_patient];
    }
}
