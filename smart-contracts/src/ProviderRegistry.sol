// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./libraries/DataTypes.sol";

/**
 * @title ProviderRegistry
 * @dev Contract for healthcare provider verification and management
 */
contract ProviderRegistry {
    using DataTypes for DataTypes.Provider;
    
    address public admin;
    mapping(address => DataTypes.Provider) public providers;
    mapping(address => bool) public verifiedProviders;
    mapping(address => bool) public pendingProviders;
    
    event ProviderRegistered(address indexed provider, string licenseNumber, uint256 timestamp);
    event ProviderVerified(address indexed provider, address indexed admin, uint256 timestamp);
    event ProviderRevoked(address indexed provider, address indexed admin, uint256 timestamp);
    event AdminTransferred(address indexed oldAdmin, address indexed newAdmin);
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    modifier onlyVerifiedProvider() {
        require(verifiedProviders[msg.sender], "Not a verified provider");
        _;
    }
    
    constructor() {
        admin = msg.sender;
    }
    
    /**
     * @dev Register as a healthcare provider (pending verification)
     * @param _licenseNumber Medical license number
     * @param _specialty Medical specialty
     * @param _institutionName Name of institution/hospital
     * @param _encryptionPublicKey Provider's encryption public key
     */
    function registerProvider(
        string memory _licenseNumber,
        string memory _specialty,
        string memory _institutionName,
        string memory _encryptionPublicKey
    ) external {
        require(!verifiedProviders[msg.sender] && !pendingProviders[msg.sender], "Provider already registered");
        require(bytes(_licenseNumber).length > 0, "License number required");
        require(bytes(_specialty).length > 0, "Specialty required");
        
        providers[msg.sender] = DataTypes.Provider({
            providerAddress: msg.sender,
            licenseNumber: _licenseNumber,
            specialty: _specialty,
            institutionName: _institutionName,
            encryptionPublicKey: _encryptionPublicKey,
            isVerified: false,
            registrationTimestamp: block.timestamp,
            verificationTimestamp: 0
        });
        
        pendingProviders[msg.sender] = true;
        
        emit ProviderRegistered(msg.sender, _licenseNumber, block.timestamp);
    }
    
    /**
     * @dev Verify a pending provider (admin only)
     * @param _provider Provider address to verify
     */
    function verifyProvider(address _provider) external onlyAdmin {
        require(pendingProviders[_provider], "Provider not pending verification");
        require(!verifiedProviders[_provider], "Provider already verified");
        
        providers[_provider].isVerified = true;
        providers[_provider].verificationTimestamp = block.timestamp;
        
        verifiedProviders[_provider] = true;
        pendingProviders[_provider] = false;
        
        emit ProviderVerified(_provider, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Revoke provider verification (admin only)
     * @param _provider Provider address to revoke
     */
    function revokeProvider(address _provider) external onlyAdmin {
        require(verifiedProviders[_provider], "Provider not verified");
        
        providers[_provider].isVerified = false;
        verifiedProviders[_provider] = false;
        
        emit ProviderRevoked(_provider, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Transfer admin role
     * @param _newAdmin New admin address
     */
    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Invalid admin address");
        
        address oldAdmin = admin;
        admin = _newAdmin;
        
        emit AdminTransferred(oldAdmin, _newAdmin);
    }
    
    /**
     * @dev Get provider information
     * @param _provider Provider address
     * @return Provider struct
     */
    function getProvider(address _provider) external view returns (DataTypes.Provider memory) {
        return providers[_provider];
    }
    
    /**
     * @dev Check if address is a verified provider
     * @param _provider Provider address to check
     * @return bool indicating if provider is verified
     */
    function isVerifiedProvider(address _provider) external view returns (bool) {
        return verifiedProviders[_provider];
    }
    
    /**
     * @dev Check if address is a pending provider
     * @param _provider Provider address to check
     * @return bool indicating if provider is pending
     */
    function isPendingProvider(address _provider) external view returns (bool) {
        return pendingProviders[_provider];
    }
}