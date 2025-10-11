// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./libraries/DataTypes.sol";
import "./PatientRegistry.sol";
import "./ProviderRegistry.sol";

/**
 * @title EHRStorage
 * @dev Contract for storing health record metadata and IPFS hashes
 */
contract EHRStorage {
    using DataTypes for DataTypes.HealthRecord;
    using DataTypes for DataTypes.FHIRMetadata;
    
    PatientRegistry public patientRegistry;
    ProviderRegistry public providerRegistry;
    
    uint256 private recordCounter;
    mapping(uint256 => DataTypes.HealthRecord) public healthRecords;
    mapping(uint256 => DataTypes.FHIRMetadata) public fhirMetadata;
    mapping(address => uint256[]) public patientRecords;
    mapping(address => uint256[]) public providerRecords;
    mapping(string => bool) public supportedFHIRResourceTypes;
    mapping(string => bool) public supportedFHIRVersions;
    
    event RecordAdded(
        uint256 indexed recordId,
        address indexed patient,
        address indexed provider,
        DataTypes.RecordType recordType,
        uint256 timestamp
    );
    event RecordUpdated(uint256 indexed recordId, string newIpfsHash, uint256 timestamp);
    event RecordDeactivated(uint256 indexed recordId, uint256 timestamp);
    event FHIRResourceAdded(
        uint256 indexed recordId,
        string resourceType,
        string version,
        bool isCompliant
    );
    event FHIRResourceTypeEnabled(string resourceType, bool enabled);
    event FHIRVersionEnabled(string version, bool enabled);
    
    modifier onlyRegisteredPatient() {
        require(patientRegistry.isRegisteredPatient(msg.sender), "Not a registered patient");
        _;
    }
    
    modifier onlyVerifiedProvider() {
        require(providerRegistry.isVerifiedProvider(msg.sender), "Not a verified provider");
        _;
    }
    
    modifier onlyPatientOrProvider(address _patient) {
        require(
            msg.sender == _patient || providerRegistry.isVerifiedProvider(msg.sender),
            "Unauthorized"
        );
        _;
    }
    
    constructor(address _patientRegistry, address _providerRegistry) {
        patientRegistry = PatientRegistry(_patientRegistry);
        providerRegistry = ProviderRegistry(_providerRegistry);
        recordCounter = 1;
        
        // Initialize supported FHIR resource types
        _initializeFHIRSupport();
    }
    
    /**
     * @dev Initialize supported FHIR resource types and versions
     */
    function _initializeFHIRSupport() internal {
        // FHIR R4 Resource Types
        supportedFHIRResourceTypes["Patient"] = true;
        supportedFHIRResourceTypes["Observation"] = true;
        supportedFHIRResourceTypes["DiagnosticReport"] = true;
        supportedFHIRResourceTypes["MedicationRequest"] = true;
        supportedFHIRResourceTypes["Immunization"] = true;
        supportedFHIRResourceTypes["Procedure"] = true;
        supportedFHIRResourceTypes["Condition"] = true;
        supportedFHIRResourceTypes["Encounter"] = true;
        supportedFHIRResourceTypes["DocumentReference"] = true;
        supportedFHIRResourceTypes["ImagingStudy"] = true;
        
        // FHIR Versions
        supportedFHIRVersions["R4"] = true;
        supportedFHIRVersions["R5"] = true;
    }
    
    /**
     * @dev Add a new health record
     * @param _patient Patient address
     * @param _ipfsHash IPFS hash of the encrypted health record
     * @param _encryptedSymmetricKey Encrypted symmetric key for the record
     * @param _recordType Type of the health record
     * @return recordId The ID of the newly created record
     */
    function addRecord(
        address _patient,
        string memory _ipfsHash,
        string memory _encryptedSymmetricKey,
        DataTypes.RecordType _recordType
    ) external onlyPatientOrProvider(_patient) returns (uint256) {
        require(patientRegistry.isRegisteredPatient(_patient), "Patient not registered");
        require(bytes(_ipfsHash).length > 0, "Invalid IPFS hash");
        require(bytes(_encryptedSymmetricKey).length > 0, "Invalid encrypted key");
        
        uint256 recordId = recordCounter++;
        
        healthRecords[recordId] = DataTypes.HealthRecord({
            recordId: recordId,
            patient: _patient,
            provider: msg.sender,
            ipfsHash: _ipfsHash,
            encryptedSymmetricKey: _encryptedSymmetricKey,
            recordType: _recordType,
            timestamp: block.timestamp,
            isActive: true
        });
        
        patientRecords[_patient].push(recordId);
        if (msg.sender != _patient) {
            providerRecords[msg.sender].push(recordId);
        }
        
        emit RecordAdded(recordId, _patient, msg.sender, _recordType, block.timestamp);
        return recordId;
    }
    
    /**
     * @dev Add a new health record with FHIR compliance
     * @param _patient Patient address
     * @param _ipfsHash IPFS hash of the encrypted health record
     * @param _encryptedSymmetricKey Encrypted symmetric key for the record
     * @param _recordType Type of the health record
     * @param _fhirData FHIR metadata for compliance
     * @return recordId The ID of the newly created record
     */
    function addRecordWithFHIR(
        address _patient,
        string memory _ipfsHash,
        string memory _encryptedSymmetricKey,
        DataTypes.RecordType _recordType,
        DataTypes.FHIRMetadata memory _fhirData
    ) external onlyPatientOrProvider(_patient) returns (uint256) {
        require(patientRegistry.isRegisteredPatient(_patient), "Patient not registered");
        require(bytes(_ipfsHash).length > 0, "Invalid IPFS hash");
        require(bytes(_encryptedSymmetricKey).length > 0, "Invalid encrypted key");
        
        // Validate FHIR compliance
        bool isCompliant = _validateFHIRCompliance(_fhirData);
        
        uint256 recordId = recordCounter++;
        
        // Store health record
        healthRecords[recordId] = DataTypes.HealthRecord({
            recordId: recordId,
            patient: _patient,
            provider: msg.sender,
            ipfsHash: _ipfsHash,
            encryptedSymmetricKey: _encryptedSymmetricKey,
            recordType: _recordType,
            timestamp: block.timestamp,
            isActive: true
        });
        
        // Store FHIR metadata
        fhirMetadata[recordId] = DataTypes.FHIRMetadata({
            resourceType: _fhirData.resourceType,
            version: _fhirData.version,
            categories: _fhirData.categories,
            isCompliant: isCompliant,
            profile: _fhirData.profile
        });
        
        patientRecords[_patient].push(recordId);
        if (msg.sender != _patient) {
            providerRecords[msg.sender].push(recordId);
        }
        
        emit RecordAdded(recordId, _patient, msg.sender, _recordType, block.timestamp);
        emit FHIRResourceAdded(recordId, _fhirData.resourceType, _fhirData.version, isCompliant);
        
        return recordId;
    }
    
    /**
     * @dev Validate FHIR compliance
     * @param _fhirData FHIR metadata to validate
     * @return bool indicating if the data is FHIR compliant
     */
    function _validateFHIRCompliance(
        DataTypes.FHIRMetadata memory _fhirData
    ) internal view returns (bool) {
        // Check if resource type is supported
        if (!supportedFHIRResourceTypes[_fhirData.resourceType]) {
            return false;
        }
        
        // Check if FHIR version is supported
        if (!supportedFHIRVersions[_fhirData.version]) {
            return false;
        }
        
        // Check if resource type is not empty
        if (bytes(_fhirData.resourceType).length == 0) {
            return false;
        }
        
        // Additional validation can be added here
        return true;
    }
    
    /**
     * @dev Update an existing health record (only by original provider or patient)
     * @param _recordId Record ID to update
     * @param _newIpfsHash New IPFS hash
     * @param _newEncryptedKey New encrypted symmetric key
     */
    function updateRecord(
        uint256 _recordId,
        string memory _newIpfsHash,
        string memory _newEncryptedKey
    ) external {
        DataTypes.HealthRecord storage record = healthRecords[_recordId];
        require(record.isActive, "Record not active");
        require(
            msg.sender == record.patient || msg.sender == record.provider,
            "Unauthorized to update"
        );
        require(bytes(_newIpfsHash).length > 0, "Invalid IPFS hash");
        
        record.ipfsHash = _newIpfsHash;
        if (bytes(_newEncryptedKey).length > 0) {
            record.encryptedSymmetricKey = _newEncryptedKey;
        }
        
        emit RecordUpdated(_recordId, _newIpfsHash, block.timestamp);
    }
    
    /**
     * @dev Deactivate a health record (only by patient)
     * @param _recordId Record ID to deactivate
     */
    function deactivateRecord(uint256 _recordId) external {
        DataTypes.HealthRecord storage record = healthRecords[_recordId];
        require(record.isActive, "Record already inactive");
        require(msg.sender == record.patient, "Only patient can deactivate");
        
        record.isActive = false;
        
        emit RecordDeactivated(_recordId, block.timestamp);
    }
    
    /**
     * @dev Get health record by ID
     * @param _recordId Record ID
     * @return HealthRecord struct
     */
    function getRecord(uint256 _recordId) external view returns (DataTypes.HealthRecord memory) {
        require(healthRecords[_recordId].recordId != 0, "Record does not exist");
        return healthRecords[_recordId];
    }
    
    /**
     * @dev Get all record IDs for a patient
     * @param _patient Patient address
     * @return Array of record IDs
     */
    function getPatientRecords(address _patient) external view returns (uint256[] memory) {
        return patientRecords[_patient];
    }
    
    /**
     * @dev Get all record IDs for a provider
     * @param _provider Provider address
     * @return Array of record IDs
     */
    function getProviderRecords(address _provider) external view returns (uint256[] memory) {
        return providerRecords[_provider];
    }
    
    /**
     * @dev Get records by type for a patient
     * @param _patient Patient address
     * @param _recordType Type of records to retrieve
     * @return Array of record IDs
     */
    function getRecordsByType(
        address _patient,
        DataTypes.RecordType _recordType
    ) external view returns (uint256[] memory) {
        uint256[] memory allRecords = patientRecords[_patient];
        uint256[] memory tempResults = new uint256[](allRecords.length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < allRecords.length; i++) {
            if (healthRecords[allRecords[i]].recordType == _recordType && 
                healthRecords[allRecords[i]].isActive) {
                tempResults[count] = allRecords[i];
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
     * @dev Get FHIR metadata for a record
     * @param _recordId Record ID
     * @return FHIRMetadata struct
     */
    function getFHIRMetadata(uint256 _recordId) external view returns (DataTypes.FHIRMetadata memory) {
        require(healthRecords[_recordId].recordId != 0, "Record does not exist");
        return fhirMetadata[_recordId];
    }
    
    /**
     * @dev Get FHIR compliant records for a patient
     * @param _patient Patient address
     * @return Array of record IDs that are FHIR compliant
     */
    function getFHIRCompliantRecords(address _patient) external view returns (uint256[] memory) {
        uint256[] memory allRecords = patientRecords[_patient];
        uint256[] memory tempResults = new uint256[](allRecords.length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < allRecords.length; i++) {
            if (fhirMetadata[allRecords[i]].isCompliant && 
                healthRecords[allRecords[i]].isActive) {
                tempResults[count] = allRecords[i];
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
     * @dev Enable/disable FHIR resource type (admin only)
     * @param _resourceType FHIR resource type
     * @param _enabled Whether to enable or disable
     */
    function setFHIRResourceTypeSupport(
        string memory _resourceType,
        bool _enabled
    ) external {
        // This should have admin access control in production
        supportedFHIRResourceTypes[_resourceType] = _enabled;
        emit FHIRResourceTypeEnabled(_resourceType, _enabled);
    }
    
    /**
     * @dev Enable/disable FHIR version (admin only)
     * @param _version FHIR version
     * @param _enabled Whether to enable or disable
     */
    function setFHIRVersionSupport(
        string memory _version,
        bool _enabled
    ) external {
        // This should have admin access control in production
        supportedFHIRVersions[_version] = _enabled;
        emit FHIRVersionEnabled(_version, _enabled);
    }
    
    /**
     * @dev Check if FHIR resource type is supported
     * @param _resourceType FHIR resource type
     * @return bool indicating if supported
     */
    function isFHIRResourceTypeSupported(string memory _resourceType) external view returns (bool) {
        return supportedFHIRResourceTypes[_resourceType];
    }
    
    /**
     * @dev Check if FHIR version is supported
     * @param _version FHIR version
     * @return bool indicating if supported
     */
    function isFHIRVersionSupported(string memory _version) external view returns (bool) {
        return supportedFHIRVersions[_version];
    }
}