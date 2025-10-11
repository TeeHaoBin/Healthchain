// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./PatientRegistry.sol";
import "./ProviderRegistry.sol";
import "./EHRStorage.sol";
import "./AccessControl.sol";
import "./EmergencyAccess.sol";
import "./AuditLog.sol";
import "./NotificationManager.sol";
import "./libraries/DataTypes.sol";

/**
 * @title MyHealthEHR
 * @dev Main contract that orchestrates the entire EHR system
 */
contract MyHealthEHR {
    
    PatientRegistry public patientRegistry;
    ProviderRegistry public providerRegistry;
    EHRStorage public ehrStorage;
    AccessControl public accessControl;
    EmergencyAccess public emergencyAccess;
    AuditLog public auditLog;
    NotificationManager public notificationManager;
    
    address public admin;
    bool public systemPaused;
    
    event SystemDeployed(address indexed admin, uint256 timestamp);
    event SystemPaused(bool paused, uint256 timestamp);
    event ContractUpgraded(string contractName, address oldAddress, address newAddress);
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    modifier whenNotPaused() {
        require(!systemPaused, "System is paused");
        _;
    }
    
    constructor() {
        admin = msg.sender;
        
        // Deploy all contracts
        patientRegistry = new PatientRegistry();
        providerRegistry = new ProviderRegistry();
        ehrStorage = new EHRStorage(address(patientRegistry), address(providerRegistry));
        accessControl = new AccessControl(address(patientRegistry), address(providerRegistry));
        emergencyAccess = new EmergencyAccess(address(patientRegistry), address(providerRegistry));
        auditLog = new AuditLog(address(patientRegistry), address(providerRegistry));
        notificationManager = new NotificationManager(address(patientRegistry), address(providerRegistry));
        
        // Authorize this contract to register patients on behalf of users
        patientRegistry.authorizeCaller(address(this), true);
        
        // Authorize contracts to write to audit log
        auditLog.authorizeContract(address(ehrStorage), true);
        auditLog.authorizeContract(address(accessControl), true);
        auditLog.authorizeContract(address(emergencyAccess), true);
        auditLog.authorizeContract(address(this), true);
        
        // Authorize contracts to send notifications
        notificationManager.authorizeSender(address(accessControl), true);
        notificationManager.authorizeSender(address(emergencyAccess), true);
        notificationManager.authorizeSender(address(ehrStorage), true);
        notificationManager.authorizeSender(address(this), true);
        
        emit SystemDeployed(admin, block.timestamp);
    }
    
    /**
     * @dev Complete patient registration with audit logging
     * @param _encryptionPublicKey Patient's encryption public key
     * @param _emergencyContact Emergency contact address
     */
    function registerPatient(
        string memory _encryptionPublicKey,
        address _emergencyContact
    ) external whenNotPaused {
        // Register patient on behalf of the caller
        patientRegistry.registerPatientOnBehalf(msg.sender, _encryptionPublicKey, _emergencyContact);
        
        auditLog.logAction(
            msg.sender,
            msg.sender,
            "PATIENT_REGISTERED",
            ""
        );
    }
    
    /**
     * @dev Complete provider registration with audit logging
     * @param _licenseNumber Medical license number
     * @param _specialty Medical specialty
     * @param _institutionName Institution name
     * @param _encryptionPublicKey Provider's encryption public key
     */
    function registerProvider(
        string memory _licenseNumber,
        string memory _specialty,
        string memory _institutionName,
        string memory _encryptionPublicKey
    ) external whenNotPaused {
        providerRegistry.registerProvider(
            _licenseNumber,
            _specialty,
            _institutionName,
            _encryptionPublicKey
        );
        
        auditLog.logAction(
            msg.sender,
            address(0),
            "PROVIDER_REGISTERED",
            ""
        );
    }
    
    /**
     * @dev Verify a healthcare provider (admin only)
     * @param _provider Provider address to verify
     */
    function verifyProvider(address _provider) external onlyAdmin {
        providerRegistry.verifyProvider(_provider);
        
        auditLog.logAction(
            msg.sender,
            address(0),
            "PROVIDER_VERIFIED",
            ""
        );
    }
    
    /**
     * @dev Add health record with comprehensive access control and audit logging
     * @param _patient Patient address (can be self or if provider has access)
     * @param _ipfsHash IPFS hash of encrypted record
     * @param _encryptedSymmetricKey Encrypted symmetric key
     * @param _recordType Type of health record
     * @return recordId The ID of the created record
     */
    function addHealthRecord(
        address _patient,
        string memory _ipfsHash,
        string memory _encryptedSymmetricKey,
        DataTypes.RecordType _recordType
    ) external whenNotPaused returns (uint256) {
        
        // Check access permissions
        bool hasAccess = false;
        
        if (msg.sender == _patient) {
            // Patient adding their own record
            hasAccess = true;
        } else if (providerRegistry.isVerifiedProvider(msg.sender)) {
            // Provider adding record - check permissions
            hasAccess = accessControl.hasAccess(_patient, msg.sender) || 
                       emergencyAccess.hasEmergencyAccess(_patient, msg.sender);
        }
        
        require(hasAccess, "No permission to add record for this patient");
        
        uint256 recordId = ehrStorage.addRecord(
            _patient,
            _ipfsHash,
            _encryptedSymmetricKey,
            _recordType
        );
        
        // Send notification to patient (if added by provider)
        if (msg.sender != _patient) {
            notificationManager.createNewRecordNotification(_patient, msg.sender, _recordType);
        }
        
        // Log the action
        string memory action = msg.sender == _patient ? "RECORD_ADDED_BY_PATIENT" : "RECORD_ADDED_BY_PROVIDER";
        auditLog.logAction(
            msg.sender,
            _patient,
            action,
            _ipfsHash
        );
        
        return recordId;
    }
    
    /**
     * @dev Add FHIR-compliant health record
     * @param _patient Patient address
     * @param _ipfsHash IPFS hash of encrypted record
     * @param _encryptedSymmetricKey Encrypted symmetric key
     * @param _recordType Type of health record
     * @param _fhirData FHIR metadata
     * @return recordId The ID of the created record
     */
    function addFHIRHealthRecord(
        address _patient,
        string memory _ipfsHash,
        string memory _encryptedSymmetricKey,
        DataTypes.RecordType _recordType,
        DataTypes.FHIRMetadata memory _fhirData
    ) external whenNotPaused returns (uint256) {
        
        // Check access permissions
        bool hasAccess = false;
        
        if (msg.sender == _patient) {
            hasAccess = true;
        } else if (providerRegistry.isVerifiedProvider(msg.sender)) {
            hasAccess = accessControl.hasAccess(_patient, msg.sender) || 
                       emergencyAccess.hasEmergencyAccess(_patient, msg.sender);
        }
        
        require(hasAccess, "No permission to add record for this patient");
        
        uint256 recordId = ehrStorage.addRecordWithFHIR(
            _patient,
            _ipfsHash,
            _encryptedSymmetricKey,
            _recordType,
            _fhirData
        );
        
        // Send notification to patient (if added by provider)
        if (msg.sender != _patient) {
            notificationManager.createNewRecordNotification(_patient, msg.sender, _recordType);
        }
        
        // Log the action
        auditLog.logAction(
            msg.sender,
            _patient,
            "FHIR_RECORD_ADDED",
            _ipfsHash
        );
        
        return recordId;
    }
    
    /**
     * @dev Provider requests access to patient records
     * @param _patient Patient address
     * @param _level Requested access level
     * @param _duration Requested duration
     * @param _justification Justification for access
     */
    function requestAccess(
        address _patient,
        DataTypes.AccessLevel _level,
        uint256 _duration,
        string memory _justification
    ) external whenNotPaused {
        accessControl.requestAccess(_patient, _level, _duration, _justification);
        
        // Send notification to patient
        notificationManager.createAccessRequestNotification(_patient, msg.sender, _justification);
        
        auditLog.logAction(
            msg.sender,
            _patient,
            "ACCESS_REQUESTED",
            _justification
        );
    }
    
    /**
     * @dev Patient approves access request
     * @param _provider Provider address
     */
    function approveAccessRequest(address _provider) external whenNotPaused {
        accessControl.approveAccessRequest(_provider);
        
        // Get the approved request details for notification
        DataTypes.AccessRequest memory request = accessControl.getAccessRequest(msg.sender, _provider);
        
        // Send notification to provider
        notificationManager.createAccessGrantedNotification(_provider, msg.sender, request.requestedLevel);
        
        auditLog.logAction(
            msg.sender,
            msg.sender,
            "ACCESS_REQUEST_APPROVED",
            ""
        );
    }
    
    /**
     * @dev Patient rejects access request
     * @param _provider Provider address
     * @param _reason Reason for rejection
     */
    function rejectAccessRequest(
        address _provider,
        string memory _reason
    ) external whenNotPaused {
        accessControl.rejectAccessRequest(_provider, _reason);
        
        auditLog.logAction(
            msg.sender,
            msg.sender,
            "ACCESS_REQUEST_REJECTED",
            _reason
        );
    }
    
    /**
     * @dev Grant access with audit logging (direct grant - legacy function)
     * @param _provider Provider address
     * @param _level Access level
     * @param _duration Duration in seconds
     */
    function grantAccess(
        address _provider,
        DataTypes.AccessLevel _level,
        uint256 _duration
    ) external whenNotPaused {
        accessControl.grantAccess(_provider, _level, _duration);
        
        // Send notification to provider
        notificationManager.createAccessGrantedNotification(_provider, msg.sender, _level);
        
        auditLog.logAction(
            msg.sender,
            msg.sender,
            "ACCESS_GRANTED",
            ""
        );
    }
    
    /**
     * @dev Revoke access with audit logging
     * @param _provider Provider address
     */
    function revokeAccess(address _provider) external whenNotPaused {
        accessControl.revokeAccess(_provider);
        
        auditLog.logAction(
            msg.sender,
            msg.sender,
            "ACCESS_REVOKED",
            ""
        );
    }
    
    /**
     * @dev Grant emergency access with audit logging
     * @param _patient Patient address
     * @param _justification Justification for emergency access
     */
    function grantEmergencyAccess(
        address _patient,
        string memory _justification
    ) external whenNotPaused {
        emergencyAccess.grantEmergencyAccess(_patient, _justification);
        
        // Send emergency notification
        notificationManager.createEmergencyAccessNotification(_patient, msg.sender, _justification);
        
        auditLog.logAction(
            msg.sender,
            _patient,
            "EMERGENCY_ACCESS_GRANTED",
            _justification
        );
    }
    
    /**
     * @dev Check if provider can access patient's records
     * @param _patient Patient address
     * @param _provider Provider address
     * @return hasRegularAccess Whether provider has regular access
     * @return hasEmergencyAccess Whether provider has emergency access
     */
    function checkAccess(
        address _patient,
        address _provider
    ) external view returns (bool hasRegularAccess, bool hasEmergencyAccess) {
        hasRegularAccess = accessControl.hasAccess(_patient, _provider);
        hasEmergencyAccess = emergencyAccess.hasEmergencyAccess(_patient, _provider);
    }
    
    /**
     * @dev Get patient's health records (with access control)
     * @param _patient Patient address
     * @return Array of record IDs that the caller can access
     */
    function getAccessibleRecords(address _patient) external view returns (uint256[] memory) {
        require(
            msg.sender == _patient ||
            accessControl.hasAccess(_patient, msg.sender) ||
            emergencyAccess.hasEmergencyAccess(_patient, msg.sender),
            "No access to patient records"
        );
        
        return ehrStorage.getPatientRecords(_patient);
    }
    
    /**
     * @dev Get FHIR compliant records for a patient (with access control)
     * @param _patient Patient address
     * @return Array of FHIR compliant record IDs that the caller can access
     */
    function getFHIRCompliantRecords(address _patient) external view returns (uint256[] memory) {
        require(
            msg.sender == _patient ||
            accessControl.hasAccess(_patient, msg.sender) ||
            emergencyAccess.hasEmergencyAccess(_patient, msg.sender),
            "No access to patient records"
        );
        
        return ehrStorage.getFHIRCompliantRecords(_patient);
    }
    
    /**
     * @dev Get pending access requests for a patient
     * @param _patient Patient address
     * @return Array of provider addresses with pending requests
     */
    function getPendingAccessRequests(address _patient) external view returns (address[] memory) {
        require(msg.sender == _patient, "Only patient can view pending requests");
        return accessControl.getPatientPendingRequests(_patient);
    }
    
    /**
     * @dev Get user notifications
     * @param _user User address
     * @param _limit Maximum number of notifications
     * @param _offset Offset for pagination
     * @return Array of notification IDs
     */
    function getUserNotifications(
        address _user,
        uint256 _limit,
        uint256 _offset
    ) external view returns (uint256[] memory) {
        require(msg.sender == _user, "Can only view own notifications");
        return notificationManager.getUserNotifications(_user, _limit, _offset);
    }
    
    /**
     * @dev Mark notifications as read
     * @param _notificationIds Array of notification IDs to mark as read
     */
    function markNotificationsAsRead(uint256[] memory _notificationIds) external {
        notificationManager.markBatchAsRead(_notificationIds);
    }
    
    /**
     * @dev Get unread notification count
     * @param _user User address
     * @return Number of unread notifications
     */
    function getUnreadNotificationCount(address _user) external view returns (uint256) {
        require(msg.sender == _user, "Can only view own notification count");
        return notificationManager.getUnreadCount(_user);
    }
    
    /**
     * @dev Get system statistics
     * @return totalPatients Total number of registered patients
     * @return totalProviders Total number of verified providers
     * @return totalRecords Total number of health records
     * @return totalAudits Total number of audit entries
     */
    function getSystemStats() external view returns (
        uint256 totalPatients,
        uint256 totalProviders,
        uint256 totalRecords,
        uint256 totalAudits
    ) {
        // Note: These would need counter variables in the respective contracts
        // For now, returning placeholder implementation
        totalAudits = auditLog.getTotalAuditEntries();
        // totalPatients, totalProviders, totalRecords would need to be implemented
        // in their respective contracts
    }
    
    /**
     * @dev Pause/unpause the system (emergency function)
     * @param _paused Whether to pause the system
     */
    function pauseSystem(bool _paused) external onlyAdmin {
        systemPaused = _paused;
        emit SystemPaused(_paused, block.timestamp);
        
        auditLog.logAction(
            msg.sender,
            address(0),
            _paused ? "SYSTEM_PAUSED" : "SYSTEM_UNPAUSED",
            ""
        );
    }
    
    /**
     * @dev Transfer admin role
     * @param _newAdmin New admin address
     */
    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Invalid admin address");
        
        address oldAdmin = admin;
        admin = _newAdmin;
        
        // Update admin in all sub-contracts
        providerRegistry.transferAdmin(_newAdmin);
        auditLog.transferAdmin(_newAdmin);
        
        auditLog.logAction(
            oldAdmin,
            address(0),
            "ADMIN_TRANSFERRED",
            ""
        );
    }
    
    /**
     * @dev Get all contract addresses
     * @return _patientRegistry Address of PatientRegistry contract
     * @return _providerRegistry Address of ProviderRegistry contract
     * @return _ehrStorage Address of EHRStorage contract
     * @return _accessControl Address of AccessControl contract
     * @return _emergencyAccess Address of EmergencyAccess contract
     * @return _auditLog Address of AuditLog contract
     * @return _notificationManager Address of NotificationManager contract
     */
    function getContractAddresses() external view returns (
        address _patientRegistry,
        address _providerRegistry,
        address _ehrStorage,
        address _accessControl,
        address _emergencyAccess,
        address _auditLog,
        address _notificationManager
    ) {
        return (
            address(patientRegistry),
            address(providerRegistry),
            address(ehrStorage),
            address(accessControl),
            address(emergencyAccess),
            address(auditLog),
            address(notificationManager)
        );
    }
    
    /**
     * @dev Check if FHIR resource type is supported
     * @param _resourceType FHIR resource type
     * @return bool indicating if supported
     */
    function isFHIRResourceSupported(string memory _resourceType) external view returns (bool) {
        return ehrStorage.isFHIRResourceTypeSupported(_resourceType);
    }
    
    /**
     * @dev Check if FHIR version is supported
     * @param _version FHIR version
     * @return bool indicating if supported
     */
    function isFHIRVersionSupported(string memory _version) external view returns (bool) {
        return ehrStorage.isFHIRVersionSupported(_version);
    }
    
    /**
     * @dev Get comprehensive system status for monitoring
     * @return systemActive Whether system is active
     * @return totalAuditEntries Total number of audit entries
     * @return contractAddresses Array of all contract addresses
     */
    function getSystemStatus() external view returns (
        bool systemActive,
        uint256 totalAuditEntries,
        address[] memory contractAddresses
    ) {
        systemActive = !systemPaused;
        totalAuditEntries = auditLog.getTotalAuditEntries();
        
        contractAddresses = new address[](7);
        contractAddresses[0] = address(patientRegistry);
        contractAddresses[1] = address(providerRegistry);
        contractAddresses[2] = address(ehrStorage);
        contractAddresses[3] = address(accessControl);
        contractAddresses[4] = address(emergencyAccess);
        contractAddresses[5] = address(auditLog);
        contractAddresses[6] = address(notificationManager);
    }
}