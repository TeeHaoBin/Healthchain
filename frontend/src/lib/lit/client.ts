
import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { LIT_NETWORK } from "@lit-protocol/constants";
import { encryptUint8Array, decryptToString, decryptToUint8Array } from "@lit-protocol/encryption";

// TypeScript declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

export class LitProtocolClient {
  private litNodeClient: LitNodeClient | null = null;
  private chain = "ethereum";

  async connect() {
    if (this.litNodeClient) {
      return this.litNodeClient;
    }

    try {
      this.litNodeClient = new LitNodeClient({
        litNetwork: "datil-dev", // Use DatilDev for development (v7 uses string for this network)
        debug: false,
      });

      await this.litNodeClient.connect();
      console.log("✅ Connected to Lit Protocol");
      return this.litNodeClient;
    } catch (error) {
      console.error("❌ Failed to connect to Lit Protocol:", error);
      throw error;
    }
  }

  async disconnect() {
    if (this.litNodeClient) {
      await this.litNodeClient.disconnect();
      this.litNodeClient = null;
      console.log("🔌 Disconnected from Lit Protocol");
    }
  }

  // Generate access control conditions for healthcare data
  generateAccessControlConditions(patientAddress: string, authorizedDoctors: string[] = []) {
    const conditions = [
      {
        contractAddress: "",
        standardContractType: "",
        chain: this.chain,
        method: "",
        parameters: [":userAddress"],
        returnValueTest: {
          comparator: "=",
          value: patientAddress.toLowerCase(),
        },
      },
    ];

    // Critical Fix #5: Fix access control conditions logic
    if (authorizedDoctors.length > 0) {
      authorizedDoctors.forEach((doctorAddress) => {
        // Add OR operator before each doctor condition
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        conditions.push({ operator: "or" } as any);

        // Add doctor condition
        conditions.push({
          contractAddress: "",
          standardContractType: "",
          chain: this.chain,
          method: "",
          parameters: [":userAddress"],
          returnValueTest: {
            comparator: "=",
            value: doctorAddress.toLowerCase(),
          },
        });
      });
    }

    return conditions;
  }

  // Legacy encrypt file data method - now redirects to the new method
  async encryptFile(
    fileData: ArrayBuffer,
    patientAddress: string,
    authorizedDoctors: string[] = []
  ): Promise<{
    encryptedData: Blob;
    encryptedSymmetricKey: string;
    accessControlConditions: any[];
  }> {
    // Convert ArrayBuffer to File object and use the new encryption method
    const file = new File([fileData], 'encrypted-file', {
      type: 'application/octet-stream'
    });

    return this.encryptFileBinary(file, patientAddress, authorizedDoctors);
  }

  // Encrypt file as binary data using proper file encryption
  async encryptFileBinary(
    file: File,
    patientAddress: string,
    authorizedDoctors: string[] = []
  ): Promise<{
    encryptedData: Blob;
    encryptedSymmetricKey: string;
    accessControlConditions: any[];
  }> {
    if (!this.litNodeClient) {
      await this.connect();
    }

    try {
      // Validate inputs
      if (!file) {
        throw new Error('File is required for encryption');
      }

      if (!patientAddress || patientAddress.trim().length === 0) {
        throw new Error('Patient address is required for encryption');
      }

      if (file.size === 0) {
        throw new Error('Cannot encrypt empty file');
      }

      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        throw new Error('File too large for encryption (max 100MB)');
      }

      console.log('🔐 Generating access control conditions...', {
        patientAddress,
        doctorCount: authorizedDoctors.length,
        fileName: file.name,
        fileSize: file.size
      });

      const accessControlConditions = this.generateAccessControlConditions(
        patientAddress,
        authorizedDoctors
      );

      if (!accessControlConditions || accessControlConditions.length === 0) {
        throw new Error('Failed to generate access control conditions');
      }

      console.log('🔒 Starting file encryption with Lit Protocol...', {
        fileSize: file.size,
        fileType: file.type,
        conditionsCount: accessControlConditions.length
      });

      // Convert file to base64 for encryption
      const fileBuffer = await file.arrayBuffer();
      const fileUint8Array = new Uint8Array(fileBuffer);

      // Convert to base64 string
      let binary = '';
      for (let i = 0; i < fileUint8Array.length; i++) {
        binary += String.fromCharCode(fileUint8Array[i]);
      }
      const base64Data = btoa(binary);

      // Create file data object with metadata
      const fileDataToEncrypt = JSON.stringify({
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        data: base64Data,
        uploadedAt: new Date().toISOString(),
        patientAddress
      });

      console.log('📝 File converted to base64, starting encryption...');

      // v7 update: authSig is not required for encryption
      // const authSig = await this.getAuthSig();

      console.log('🔑 Auth signature obtained, preparing data for encryption...');

      // Convert string to Uint8Array for encryption
      const encoder = new TextEncoder();
      const dataToEncryptBytes = encoder.encode(fileDataToEncrypt);

      console.log('📦 Data prepared for encryption:', {
        originalLength: fileDataToEncrypt.length,
        bytesLength: dataToEncryptBytes.length,
        dataType: typeof dataToEncryptBytes
      });

      // Encrypt the file data bytes
      // v7 update: use encryptUint8Array from @lit-protocol/encryption
      // v7 update: authSig is not required for encryption
      const { ciphertext, dataToEncryptHash } = await encryptUint8Array(
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          accessControlConditions: accessControlConditions as any,
          dataToEncrypt: dataToEncryptBytes
        },
        this.litNodeClient!
      );

      if (!ciphertext || !dataToEncryptHash) {
        throw new Error('Encryption failed - no ciphertext returned');
      }

      console.log('✅ File encryption completed successfully', {
        originalSize: file.size,
        ciphertextLength: ciphertext.length,
        hasHash: !!dataToEncryptHash
      });

      // Convert ciphertext to blob for consistent API
      const encryptedBlob = new Blob([ciphertext], { type: 'application/octet-stream' });

      return {
        encryptedData: encryptedBlob,
        encryptedSymmetricKey: dataToEncryptHash,
        accessControlConditions,
      };
    } catch (error) {
      console.error("❌ Failed to encrypt file binary:", error);

      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('connection')) {
          throw new Error('Network error: Unable to connect to Lit Protocol. Please check your internet connection and try again.');
        } else if (error.message.includes('wallet') || error.message.includes('signature')) {
          throw new Error('Wallet error: Please make sure your wallet is connected and try again.');
        } else if (error.message.includes('access control')) {
          throw new Error('Access control error: Invalid wallet addresses provided.');
        } else {
          throw new Error(`Encryption failed: ${error.message} `);
        }
      } else {
        throw new Error('Encryption failed: Unknown error');
      }
    }
  }

  // Get authentication signature from wallet using Lit Protocol's built-in SIWE helper
  async getAuthSig(): Promise<any> {
    try {
      // Import Lit's official auth helper
      const { checkAndSignAuthMessage } = await import('@lit-protocol/lit-node-client');

      // Use Lit's official SIWE generator - this ensures proper EIP-4361 compliance
      // Each user (patient, doctor) signs with their own wallet when accessing data
      const authSig = await checkAndSignAuthMessage({
        chain: this.chain as any,
        nonce: await this.generateNonce(), // Required parameter
        // Optional: Add resources if needed for access control
        // resources: [],
      });

      console.log("✅ Generated auth signature using Lit Protocol's SIWE helper");
      return authSig;
    } catch (error) {
      console.error("❌ Failed to get auth signature:", error);
      throw new Error("Failed to authenticate with wallet");
    }
  }

  // Generate a random nonce for SIWE messages
  private async generateNonce(): Promise<string> {
    return Math.floor(Math.random() * 1000000000).toString();
  }

  // Decrypt file data - supports both new string format and legacy formats
  async decryptFile(
    encryptedData: string | Blob,
    encryptedSymmetricKey: string,
    accessControlConditions: any[]
  ): Promise<ArrayBuffer | string | Blob> {
    if (!this.litNodeClient) {
      await this.connect();
    }

    try {
      const authSig = await this.getAuthSig();

      console.log('🔓 Starting file decryption...', {
        encryptedDataType: typeof encryptedData,
        isBlob: encryptedData instanceof Blob,
        hasSymmetricKey: !!encryptedSymmetricKey
      });

      // For our new string-based encryption format
      if (typeof encryptedData === 'string') {
        console.log('📝 Decrypting string-based encrypted file...');

        // v7 update: use decryptToString from @lit-protocol/encryption
        const decryptedString = await decryptToString(
          {
            accessControlConditions,
            ciphertext: encryptedData,
            dataToEncryptHash: encryptedSymmetricKey,
            authSig,
            chain: this.chain,
          },
          this.litNodeClient!
        );

        console.log('📝 Parsing decrypted file data...');

        // Parse the decrypted JSON to get file metadata and data
        const fileData = JSON.parse(decryptedString);

        // Convert base64 back to binary
        const binaryString = atob(fileData.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Create blob with original file type
        const blob = new Blob([bytes], { type: fileData.type || "application/octet-stream" });

        console.log('✅ File decryption completed successfully', {
          fileName: fileData.name,
          fileType: fileData.type,
          originalSize: fileData.size,
          decryptedSize: blob.size
        });

        return blob;
      } else if (encryptedData instanceof Blob) {
        // Handle blob-based encryption (if any legacy data exists)
        console.log('📦 Decrypting blob-based encrypted file...');

        // Convert blob to string first
        const blobText = await encryptedData.text();

        // v7 update: use decryptToString or decryptToUint8Array?
        // If blobText is the ciphertext string, use decryptToString
        const decryptedString = await decryptToString(
          {
            accessControlConditions,
            ciphertext: blobText,
            dataToEncryptHash: encryptedSymmetricKey,
            authSig,
            chain: this.chain,
          },
          this.litNodeClient!
        );

        return decryptedString;
      } else {
        throw new Error('Invalid encrypted data format');
      }
    } catch (error) {
      console.error("❌ Failed to decrypt file:", error);
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'} `);
    }
  }

  // Generate metadata for encrypted file
  generateFileMetadata(
    file: File,
    ipfsHash: string,
    patientAddress: string,
    authorizedDoctors: string[] = []
  ) {
    return {
      id: crypto.randomUUID(),
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
      patientAddress: patientAddress.toLowerCase(),
      authorizedDoctors: authorizedDoctors.map(addr => addr.toLowerCase()),
      ipfsHash,
      encrypted: true,
      litProtocol: {
        network: "datil-dev",
        version: "v7",
      },
    };
  }
}

// Singleton instance
export const litClient = new LitProtocolClient();