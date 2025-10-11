// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./libraries/DataTypes.sol";
import "./PatientRegistry.sol";
import "./ProviderRegistry.sol";

/**
 * @title EmergencyAccess
 * @dev Contract for handling emergency access to health records
 */
contract EmergencyAccess {
    using DataTypes for DataTypes.EmergencyAccess;
    
    PatientRegistry public patientRegistry;
    ProviderRegistry public providerRegistry;
    
    uint256 public constant EMERGENCY_ACCESS_DURATION = 24 hours;
    uint256 public constant EMERGENCY_COOLDOWN = 1 hours;
    
    mapping(address => mapping(address => DataTypes.EmergencyAccess)) public emergencyAccess;
    mapping(address => uint256) public lastEmergencyAccess;
    mapping(address => address[]) public patientEmergencyProviders;
    
    event EmergencyAccessGranted(
        address indexed patient,
        address indexed provider,
        uint256 expiryTimestamp,
        string justification
    );
    event EmergencyAccessRevoked(address indexed patient, address indexed provider);
    event EmergencyAccessExpired(address indexed patient, address indexed provider);
    
    modifier onlyVerifiedProvider() {
        require(providerRegistry.isVerifiedProvider(msg.sender), "Not a verified provider");
        _;
    }
    
    modifier onlyPatientOrEmergencyContact(address _patient) {
        DataTypes.Patient memory patient = patientRegistry.getPatient(_patient);
        require(
            msg.sender == _patient || msg.sender == patient.emergencyContact,
            "Unauthorized"
        );
        _;
    }
    
    constructor(address _patientRegistry, address _providerRegistry) {
        patientRegistry = PatientRegistry(_patientRegistry);
        providerRegistry = ProviderRegistry(_providerRegistry);
    }
    
    /**
     * @dev Grant emergency access to a provider
     * @param _patient Patient address
     * @param _justification Reason for emergency access
     */
    function grantEmergencyAccess(
        address _patient,
        string memory _justification
    ) external onlyVerifiedProvider {
        require(patientRegistry.isRegisteredPatient(_patient), "Patient not registered");
        require(bytes(_justification).length > 0, "Justification required");
        require(
            block.timestamp >= lastEmergencyAccess[_patient] + EMERGENCY_COOLDOWN,
            "Emergency cooldown period active"
        );
        
        uint256 expiryTime = block.timestamp + EMERGENCY_ACCESS_DURATION;
        
        // If this is a new emergency access, add to tracking array
        if (!emergencyAccess[_patient][msg.sender].isActive) {
            patientEmergencyProviders[_patient].push(msg.sender);
        }
        
        emergencyAccess[_patient][msg.sender] = DataTypes.EmergencyAccess({
            patient: _patient,
            emergencyProvider: msg.sender,
            startTimestamp: block.timestamp,
            expiryTimestamp: expiryTime,
            justification: _justification,
            isActive: true
        });
        
        lastEmergencyAccess[_patient] = block.timestamp;
        
        emit EmergencyAccessGranted(_patient, msg.sender, expiryTime, _justification);
    }
    
    /**
     * @dev Revoke emergency access (by patient or emergency contact)
     * @param _patient Patient address
     * @param _provider Provider address to revoke access from
     */
    function revokeEmergencyAccess(
        address _patient,
        address _provider
    ) external onlyPatientOrEmergencyContact(_patient) {
        require(emergencyAccess[_patient][_provider].isActive, "No active emergency access");
        
        emergencyAccess[_patient][_provider].isActive = false;
        
        emit EmergencyAccessRevoked(_patient, _provider);
    }
    
    /**
     * @dev Check if provider has emergency access to patient's records
     * @param _patient Patient address
     * @param _provider Provider address
     * @return bool indicating if emergency access is active
     */
    function hasEmergencyAccess(address _patient, address _provider) external view returns (bool) {
        DataTypes.EmergencyAccess memory access = emergencyAccess[_patient][_provider];
        
        if (!access.isActive) {
            return false;
        }
        
        // Check if emergency access has expired
        if (block.timestamp > access.expiryTimestamp) {
            return false;
        }
        
        return true;
    }
    
    /**
     * @dev Get emergency access details
     * @param _patient Patient address
     * @param _provider Provider address
     * @return EmergencyAccess struct
     */
    function getEmergencyAccess(
        address _patient,
        address _provider
    ) external view returns (DataTypes.EmergencyAccess memory) {
        return emergencyAccess[_patient][_provider];
    }
    
    /**
     * @dev Get all providers with emergency access to a patient
     * @param _patient Patient address
     * @return Array of provider addresses
     */
    function getPatientEmergencyProviders(address _patient) external view returns (address[] memory) {
        return patientEmergencyProviders[_patient];
    }
    
    /**
     * @dev Clean up expired emergency access (can be called by anyone)
     * @param _patient Patient address
     * @param _provider Provider address
     */
    function cleanExpiredEmergencyAccess(address _patient, address _provider) external {
        DataTypes.EmergencyAccess storage access = emergencyAccess[_patient][_provider];
        
        require(access.isActive, "Emergency access not active");
        require(block.timestamp > access.expiryTimestamp, "Emergency access not expired");
        
        access.isActive = false;
        
        emit EmergencyAccessExpired(_patient, _provider);
    }
    
    /**
     * @dev Extend emergency access duration (only by patient or emergency contact)
     * @param _patient Patient address
     * @param _provider Provider address
     * @param _additionalTime Additional time in seconds
     */
    function extendEmergencyAccess(
        address _patient,
        address _provider,
        uint256 _additionalTime
    ) external onlyPatientOrEmergencyContact(_patient) {
        require(emergencyAccess[_patient][_provider].isActive, "No active emergency access");
        require(_additionalTime <= EMERGENCY_ACCESS_DURATION, "Extension too long");
        
        emergencyAccess[_patient][_provider].expiryTimestamp += _additionalTime;
        
        emit EmergencyAccessGranted(
            _patient,
            _provider,
            emergencyAccess[_patient][_provider].expiryTimestamp,
            "Access extended"
        );
    }
    
    /**
     * @dev Get remaining emergency access time
     * @param _patient Patient address
     * @param _provider Provider address
     * @return Remaining time in seconds (0 if expired or no access)
     */
    function getRemainingEmergencyTime(
        address _patient,
        address _provider
    ) external view returns (uint256) {
        DataTypes.EmergencyAccess memory access = emergencyAccess[_patient][_provider];
        
        if (!access.isActive || block.timestamp >= access.expiryTimestamp) {
            return 0;
        }
        
        return access.expiryTimestamp - block.timestamp;
    }
}