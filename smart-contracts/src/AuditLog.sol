// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./libraries/DataTypes.sol";
import "./PatientRegistry.sol";
import "./ProviderRegistry.sol";

/**
 * @title AuditLog
 * @dev Contract for maintaining immutable audit trail of all EHR actions
 */
contract AuditLog {
    using DataTypes for DataTypes.AuditEntry;
    
    PatientRegistry public patientRegistry;
    ProviderRegistry public providerRegistry;
    
    uint256 private auditCounter;
    mapping(uint256 => DataTypes.AuditEntry) public auditEntries;
    mapping(address => uint256[]) public patientAudits;
    mapping(address => uint256[]) public providerAudits;
    mapping(string => uint256[]) public actionAudits;
    
    // Authorized contracts that can write to audit log
    mapping(address => bool) public authorizedContracts;
    address public admin;
    
    event AuditEntryCreated(
        uint256 indexed entryId,
        address indexed actor,
        address indexed patient,
        string action,
        uint256 timestamp
    );
    event ContractAuthorized(address indexed contractAddress, bool authorized);
    
    modifier onlyAuthorized() {
        require(authorizedContracts[msg.sender] || msg.sender == admin, "Unauthorized");
        _;
    }
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }
    
    constructor(address _patientRegistry, address _providerRegistry) {
        patientRegistry = PatientRegistry(_patientRegistry);
        providerRegistry = ProviderRegistry(_providerRegistry);
        admin = msg.sender;
        auditCounter = 1;
    }
    
    /**
     * @dev Log an action in the audit trail
     * @param _actor Address performing the action
     * @param _patient Patient address affected
     * @param _action Description of the action
     * @param _ipfsHash Optional IPFS hash for additional data
     * @return entryId The ID of the audit entry
     */
    function logAction(
        address _actor,
        address _patient,
        string memory _action,
        string memory _ipfsHash
    ) external onlyAuthorized returns (uint256) {
        require(_actor != address(0), "Invalid actor address");
        // Allow zero patient address for system-level actions (like provider registration)
        require(bytes(_action).length > 0, "Action description required");
        
        uint256 entryId = auditCounter++;
        
        auditEntries[entryId] = DataTypes.AuditEntry({
            entryId: entryId,
            actor: _actor,
            patient: _patient,
            action: _action,
            timestamp: block.timestamp,
            ipfsHash: _ipfsHash
        });
        
        patientAudits[_patient].push(entryId);
        if (_actor != _patient) {
            providerAudits[_actor].push(entryId);
        }
        actionAudits[_action].push(entryId);
        
        emit AuditEntryCreated(entryId, _actor, _patient, _action, block.timestamp);
        return entryId;
    }
    
    /**
     * @dev Authorize a contract to write to audit log
     * @param _contract Contract address
     * @param _authorized Whether to authorize or deauthorize
     */
    function authorizeContract(address _contract, bool _authorized) external onlyAdmin {
        authorizedContracts[_contract] = _authorized;
        emit ContractAuthorized(_contract, _authorized);
    }
    
    /**
     * @dev Get audit entry by ID
     * @param _entryId Audit entry ID
     * @return AuditEntry struct
     */
    function getAuditEntry(uint256 _entryId) external view returns (DataTypes.AuditEntry memory) {
        require(auditEntries[_entryId].entryId != 0, "Audit entry does not exist");
        return auditEntries[_entryId];
    }
    
    /**
     * @dev Get all audit entries for a patient
     * @param _patient Patient address
     * @return Array of audit entry IDs
     */
    function getPatientAudits(address _patient) external view returns (uint256[] memory) {
        return patientAudits[_patient];
    }
    
    /**
     * @dev Get all audit entries for a provider
     * @param _provider Provider address
     * @return Array of audit entry IDs
     */
    function getProviderAudits(address _provider) external view returns (uint256[] memory) {
        return providerAudits[_provider];
    }
    
    /**
     * @dev Get audit entries by action type
     * @param _action Action description
     * @return Array of audit entry IDs
     */
    function getAuditsByAction(string memory _action) external view returns (uint256[] memory) {
        return actionAudits[_action];
    }
    
    /**
     * @dev Get audit entries within a time range
     * @param _startTime Start timestamp
     * @param _endTime End timestamp
     * @param _limit Maximum number of results
     * @return Array of audit entry IDs
     */
    function getAuditsByTimeRange(
        uint256 _startTime,
        uint256 _endTime,
        uint256 _limit
    ) external view returns (uint256[] memory) {
        require(_startTime <= _endTime, "Invalid time range");
        require(_limit > 0 && _limit <= 1000, "Invalid limit");
        
        uint256[] memory tempResults = new uint256[](_limit);
        uint256 count = 0;
        
        // Search backwards from latest entries
        for (uint256 i = auditCounter - 1; i >= 1 && count < _limit; i--) {
            DataTypes.AuditEntry memory entry = auditEntries[i];
            if (entry.timestamp >= _startTime && entry.timestamp <= _endTime) {
                tempResults[count] = i;
                count++;
            }
        }
        
        uint256[] memory results = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            results[i] = tempResults[i];
        }
        
        return results;
    }
    
    /**
     * @dev Get audit entries for a patient within a time range
     * @param _patient Patient address
     * @param _startTime Start timestamp
     * @param _endTime End timestamp
     * @return Array of audit entry IDs
     */
    function getPatientAuditsByTimeRange(
        address _patient,
        uint256 _startTime,
        uint256 _endTime
    ) external view returns (uint256[] memory) {
        require(_startTime <= _endTime, "Invalid time range");
        
        uint256[] memory allPatientAudits = patientAudits[_patient];
        uint256[] memory tempResults = new uint256[](allPatientAudits.length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < allPatientAudits.length; i++) {
            DataTypes.AuditEntry memory entry = auditEntries[allPatientAudits[i]];
            if (entry.timestamp >= _startTime && entry.timestamp <= _endTime) {
                tempResults[count] = allPatientAudits[i];
                count++;
            }
        }
        
        uint256[] memory results = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            results[i] = tempResults[i];
        }
        
        return results;
    }
    
    /**
     * @dev Get total number of audit entries
     * @return Total count of audit entries
     */
    function getTotalAuditEntries() external view returns (uint256) {
        return auditCounter - 1;
    }
    
    /**
     * @dev Transfer admin role
     * @param _newAdmin New admin address
     */
    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Invalid admin address");
        admin = _newAdmin;
    }
}