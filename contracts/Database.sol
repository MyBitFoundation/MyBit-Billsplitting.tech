pragma solidity 0.4.24;


// ---------------------------------------------------------------------------------
// This contract holds all long-term data for the MyBit smart-contract systems
// All values are stored in mappings using a bytes32 keys.
// The bytes32 is derived from keccak256(variableName, uniqueID) => value
// ---------------------------------------------------------------------------------
contract Database {

    // --------------------------------------------------------------------------------------
    // Storage Variables
    // --------------------------------------------------------------------------------------
    mapping(bytes32 => uint) public uintStorage;
    mapping(bytes32 => string) public stringStorage;
    mapping(bytes32 => address) public addressStorage;
    mapping(bytes32 => bytes) public bytesStorage;
    mapping(bytes32 => bytes32) public bytes32Storage;
    mapping(bytes32 => bool) public boolStorage;
    mapping(bytes32 => int) public intStorage;



    // --------------------------------------------------------------------------------------
    // Constructor: Sets the owners of the platform
    // Owners must set the contract manager to add more contracts
    // --------------------------------------------------------------------------------------
    constructor(address _owner)
    public {
        boolStorage[keccak256(abi.encodePacked("owner", _owner))] = true;
        emit LogInitialized(_owner);
    }


    // --------------------------------------------------------------------------------------
    // ContractManager will be the only contract that can add/remove contracts on the platform.
    // Invariants: ContractManager address must not be null.
    // ContractManager must not be set, Only owner can call this function.
    // --------------------------------------------------------------------------------------
    function setContractManager(address _contractManager)
    external {
        require(_contractManager != address(0));
        require(boolStorage[keccak256(abi.encodePacked("owner", msg.sender))]);
        require(addressStorage[keccak256(abi.encodePacked("contract", "ContractManager"))] == address(0));
        addressStorage[keccak256(abi.encodePacked("contract", "ContractManager"))] = _contractManager;
        boolStorage[keccak256(abi.encodePacked("contract", _contractManager))] = true;
    }

    // --------------------------------------------------------------------------------------
    //  Storage functions
    // --------------------------------------------------------------------------------------

    function setAddress(bytes32 _key, address _value)
    onlyApprovedContract
    external {
        addressStorage[_key] = _value;
    }

    function setUint(bytes32 _key, uint _value)
    onlyApprovedContract
    external {
        uintStorage[_key] = _value;
    }

    function setString(bytes32 _key, string _value)
    onlyApprovedContract
    external {
        stringStorage[_key] = _value;
    }

    function setBytes(bytes32 _key, bytes _value)
    onlyApprovedContract
    external {
        bytesStorage[_key] = _value;
    }

    function setBytes32(bytes32 _key, bytes32 _value)
    onlyApprovedContract
    external {
        bytes32Storage[_key] = _value;
    }

    function setBool(bytes32 _key, bool _value)
    onlyApprovedContract
    external {
        boolStorage[_key] = _value;
    }

    function setInt(bytes32 _key, int _value)
    onlyApprovedContract
    external {
        intStorage[_key] = _value;
    }


    // --------------------------------------------------------------------------------------
    // Deletion functions: Can alternatively use setter functions and set to null value (ie. uint = 0)
    // --------------------------------------------------------------------------------------

    function deleteAddress(bytes32 _key)
    onlyApprovedContract
    external {
        delete addressStorage[_key];
    }

    function deleteUint(bytes32 _key)
    onlyApprovedContract
    external {
        delete uintStorage[_key];
    }

    function deleteString(bytes32 _key)
    onlyApprovedContract
    external {
        delete stringStorage[_key];
    }

    function deleteBytes(bytes32 _key)
    onlyApprovedContract
    external {
        delete bytesStorage[_key];
    }

    function deleteBytes32(bytes32 _key)
    onlyApprovedContract
    external {
        delete bytes32Storage[_key];
    }

    function deleteBool(bytes32 _key)
    onlyApprovedContract
    external {
        delete boolStorage[_key];
    }

    function deleteInt(bytes32 _key)
    onlyApprovedContract
    external {
        delete intStorage[_key];
    }



    // --------------------------------------------------------------------------------------
    // Caller must be registered as a contract through ContractManager.sol
    // --------------------------------------------------------------------------------------
    modifier onlyApprovedContract() {
        require(boolStorage[keccak256(abi.encodePacked("contract", msg.sender))]);
        _;
    }

    // --------------------------------------------------------------------------------------
    // Events
    // --------------------------------------------------------------------------------------
    event LogInitialized(address indexed _owner);
}
