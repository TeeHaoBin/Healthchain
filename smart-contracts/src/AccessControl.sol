// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./libraries/DataTypes.sol";
import "./PatientRegistry.sol";
import "./ProviderRegistry.sol";

/**
 * @title AccessControl
 * @dev Contract for managing access permissions to health records
 */
contract AccessControl {
    using DataTypes for DataTypes.AccessPermission;
    using DataTypes for DataTypes.AccessRequest;
    
    PatientRegistry public patientRegistry;
    ProviderRegistry public providerRegistry;
    
    mapping(address => mapping(address => DataTypes.AccessPermission)) public permissions;
    mapping(address => mapping(address => DataTypes.AccessRequest)) public accessRequests;
    mapping(address => address[]) public patientProviders;
    mapping(address => address[]) public providerPatients;
    mapping(address => address[]) public patientPendingRequests;
    mapping(address => address[]) public providerPendingRequests;
    
    event AccessGranted(
        address indexed patient,
        address indexed provider,
        DataTypes.AccessLevel level,
        uint256 expiryTimestamp
    );
    event AccessRevoked(address indexed patient, address indexed provider);
    event AccessExpired(address indexed patient, address indexed provider);
    event AccessRequested(
        address indexed patient,
        address indexed provider,
        DataTypes.AccessLevel level,
        uint256 duration,
        string justification
    );
    event AccessRequestApproved(address indexed patient, address indexed provider);
    event AccessRequestRejected(address indexed patient, address indexed provider, string reason);
    
    modifier onlyRegisteredPatient() {
        require(patientRegistry.isRegisteredPatient(msg.sender), "Not a registered patient");
        _;
    }
    
    modifier onlyVerifiedProvider() {
        require(providerRegistry.isVerifiedProvider(msg.sender), "Not a verified provider");
        _;
    }
    
    constructor(address _patientRegistry, address _providerRegistry) {
        patientRegistry = PatientRegistry(_patientRegistry);
        providerRegistry = ProviderRegistry(_providerRegistry);
    }
    
    /**
     * @dev Provider requests access to patient's records
     * @param _patient Patient address
     * @param _level Requested access level
     * @param _duration Requested duration in seconds
     * @param _justification Reason for access request
     */
    function requestAccess(
        address _patient,
        DataTypes.AccessLevel _level,
        uint256 _duration,
        string memory _justification
    ) external onlyVerifiedProvider {
        require(patientRegistry.isRegisteredPatient(_patient), "Patient not registered");
        require(_level != DataTypes.AccessLevel.NONE, "Invalid access level");
        require(bytes(_justification).length > 0, "Justification required");
        require(
            accessRequests[_patient][msg.sender].status != DataTypes.RequestStatus.PENDING,
            "Request already pending"
        );
        
        // Create access request
        accessRequests[_patient][msg.sender] = DataTypes.AccessRequest({
            patient: _patient,
            provider: msg.sender,
            justification: _justification,
            requestedLevel: _level,
            requestedDuration: _duration,
            requestTimestamp: block.timestamp,
            status: DataTypes.RequestStatus.PENDING
        });
        
        // Add to tracking arrays
        patientPendingRequests[_patient].push(msg.sender);
        providerPendingRequests[msg.sender].push(_patient);
        
        emit AccessRequested(_patient, msg.sender, _level, _duration, _justification);
    }
    
    /**
     * @dev Patient approves access request
     * @param _provider Provider address
     */
    function approveAccessRequest(address _provider) external onlyRegisteredPatient {
        DataTypes.AccessRequest storage request = accessRequests[msg.sender][_provider];
        require(request.status == DataTypes.RequestStatus.PENDING, "No pending request");
        require(providerRegistry.isVerifiedProvider(_provider), "Provider not verified");
        
        // Update request status
        request.status = DataTypes.RequestStatus.APPROVED;
        
        // Grant the requested access
        uint256 expiryTime = request.requestedDuration == 0 ? 0 : block.timestamp + request.requestedDuration;
        
        // If this is a new permission, add to tracking arrays
        if (!permissions[msg.sender][_provider].isActive) {
            patientProviders[msg.sender].push(_provider);
            providerPatients[_provider].push(msg.sender);
        }
        
        permissions[msg.sender][_provider] = DataTypes.AccessPermission({
            patient: msg.sender,
            provider: _provider,
            level: request.requestedLevel,
            grantedTimestamp: block.timestamp,
            expiryTimestamp: expiryTime,
            isActive: true
        });
        
        // Remove from pending arrays
        _removePendingRequest(msg.sender, _provider);
        
        emit AccessRequestApproved(msg.sender, _provider);
        emit AccessGranted(msg.sender, _provider, request.requestedLevel, expiryTime);
    }
    
    /**
     * @dev Patient rejects access request
     * @param _provider Provider address
     * @param _reason Reason for rejection
     */
    function rejectAccessRequest(
        address _provider,
        string memory _reason
    ) external onlyRegisteredPatient {
        DataTypes.AccessRequest storage request = accessRequests[msg.sender][_provider];
        require(request.status == DataTypes.RequestStatus.PENDING, "No pending request");
        
        // Update request status
        request.status = DataTypes.RequestStatus.REJECTED;
        
        // Remove from pending arrays
        _removePendingRequest(msg.sender, _provider);
        
        emit AccessRequestRejected(msg.sender, _provider, _reason);
    }
    
    /**
     * @dev Internal function to remove from pending request arrays
     */
    function _removePendingRequest(address _patient, address _provider) internal {
        // Remove from patient's pending requests
        address[] storage patientRequests = patientPendingRequests[_patient];
        for (uint256 i = 0; i < patientRequests.length; i++) {
            if (patientRequests[i] == _provider) {
                patientRequests[i] = patientRequests[patientRequests.length - 1];
                patientRequests.pop();
                break;
            }
        }
        
        // Remove from provider's pending requests
        address[] storage providerRequests = providerPendingRequests[_provider];
        for (uint256 i = 0; i < providerRequests.length; i++) {
            if (providerRequests[i] == _patient) {
                providerRequests[i] = providerRequests[providerRequests.length - 1];
                providerRequests.pop();
                break;
            }
        }
    }
    
    /**
     * @dev Grant access to a provider (only by patient)
     * @param _provider Provider address
     * @param _level Access level to grant
     * @param _duration Duration in seconds (0 for permanent)
     */
    function grantAccess(
        address _provider,
        DataTypes.AccessLevel _level,
        uint256 _duration
    ) external onlyRegisteredPatient {
        require(providerRegistry.isVerifiedProvider(_provider), "Provider not verified");
        require(_level != DataTypes.AccessLevel.NONE, "Invalid access level");
        
        uint256 expiryTime = _duration == 0 ? 0 : block.timestamp + _duration;
        
        // If this is a new permission, add to tracking arrays
        if (!permissions[msg.sender][_provider].isActive) {
            patientProviders[msg.sender].push(_provider);
            providerPatients[_provider].push(msg.sender);
        }
        
        permissions[msg.sender][_provider] = DataTypes.AccessPermission({
            patient: msg.sender,
            provider: _provider,
            level: _level,
            grantedTimestamp: block.timestamp,
            expiryTimestamp: expiryTime,
            isActive: true
        });
        
        emit AccessGranted(msg.sender, _provider, _level, expiryTime);
    }
    
    /**
     * @dev Revoke access from a provider (only by patient)
     * @param _provider Provider address
     */
    function revokeAccess(address _provider) external onlyRegisteredPatient {
        require(permissions[msg.sender][_provider].isActive, "No active permission");
        
        permissions[msg.sender][_provider].isActive = false;
        
        emit AccessRevoked(msg.sender, _provider);
    }
    
    /**
     * @dev Check if provider has access to patient's records
     * @param _patient Patient address
     * @param _provider Provider address
     * @return bool indicating if access is granted
     */
    function hasAccess(address _patient, address _provider) external view returns (bool) {
        DataTypes.AccessPermission memory permission = permissions[_patient][_provider];
        
        if (!permission.isActive) {
            return false;
        }
        
        // Check if permission has expired
        if (permission.expiryTimestamp != 0 && block.timestamp > permission.expiryTimestamp) {
            return false;
        }
        
        return true;
    }
    
    /**
     * @dev Get access level for a provider to patient's records
     * @param _patient Patient address
     * @param _provider Provider address
     * @return AccessLevel granted to the provider
     */
    function getAccessLevel(
        address _patient,
        address _provider
    ) external view returns (DataTypes.AccessLevel) {
        if (!this.hasAccess(_patient, _provider)) {
            return DataTypes.AccessLevel.NONE;
        }
        
        return permissions[_patient][_provider].level;
    }
    
    /**
     * @dev Get permission details
     * @param _patient Patient address
     * @param _provider Provider address
     * @return AccessPermission struct
     */
    function getPermission(
        address _patient,
        address _provider
    ) external view returns (DataTypes.AccessPermission memory) {
        return permissions[_patient][_provider];
    }
    
    /**
     * @dev Get all providers with access to a patient's records
     * @param _patient Patient address
     * @return Array of provider addresses
     */
    function getPatientProviders(address _patient) external view returns (address[] memory) {
        return patientProviders[_patient];
    }
    
    /**
     * @dev Get all patients that granted access to a provider
     * @param _provider Provider address
     * @return Array of patient addresses
     */
    function getProviderPatients(address _provider) external view returns (address[] memory) {
        return providerPatients[_provider];
    }
    
    /**
     * @dev Clean up expired permissions (can be called by anyone)
     * @param _patient Patient address
     * @param _provider Provider address
     */
    function cleanExpiredPermission(address _patient, address _provider) external {
        DataTypes.AccessPermission storage permission = permissions[_patient][_provider];
        
        require(permission.isActive, "Permission not active");
        require(permission.expiryTimestamp != 0, "Permission has no expiry");
        require(block.timestamp > permission.expiryTimestamp, "Permission not expired");
        
        permission.isActive = false;
        
        emit AccessExpired(_patient, _provider);
    }
    
    /**
     * @dev Batch grant access to multiple providers
     * @param _providers Array of provider addresses
     * @param _levels Array of access levels
     * @param _durations Array of durations
     */
    function batchGrantAccess(
        address[] memory _providers,
        DataTypes.AccessLevel[] memory _levels,
        uint256[] memory _durations
    ) external onlyRegisteredPatient {
        require(
            _providers.length == _levels.length && _levels.length == _durations.length,
            "Array lengths must match"
        );
        
        for (uint256 i = 0; i < _providers.length; i++) {
            this.grantAccess(_providers[i], _levels[i], _durations[i]);
        }
    }
    
    /**
     * @dev Get access request details
     * @param _patient Patient address
     * @param _provider Provider address
     * @return AccessRequest struct
     */
    function getAccessRequest(
        address _patient,
        address _provider
    ) external view returns (DataTypes.AccessRequest memory) {
        return accessRequests[_patient][_provider];
    }
    
    /**
     * @dev Get all pending access requests for a patient
     * @param _patient Patient address
     * @return Array of provider addresses with pending requests
     */
    function getPatientPendingRequests(address _patient) external view returns (address[] memory) {
        return patientPendingRequests[_patient];
    }
    
    /**
     * @dev Get all pending access requests from a provider
     * @param _provider Provider address
     * @return Array of patient addresses with pending requests
     */
    function getProviderPendingRequests(address _provider) external view returns (address[] memory) {
        return providerPendingRequests[_provider];
    }
    
    /**
     * @dev Expire old pending requests (can be called by anyone)
     * @param _patient Patient address
     * @param _provider Provider address
     * @param _maxAge Maximum age in seconds for pending requests
     */
    function expirePendingRequest(
        address _patient,
        address _provider,
        uint256 _maxAge
    ) external {
        DataTypes.AccessRequest storage request = accessRequests[_patient][_provider];
        require(request.status == DataTypes.RequestStatus.PENDING, "Request not pending");
        require(
            block.timestamp > request.requestTimestamp + _maxAge,
            "Request not old enough"
        );
        
        request.status = DataTypes.RequestStatus.EXPIRED;
        _removePendingRequest(_patient, _provider);
    }
}