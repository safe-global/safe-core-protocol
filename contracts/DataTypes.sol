// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.18;

struct SafeProtocolAction {
    address to;
    uint256 value;
    bytes data;
}

struct SafeTransaction {
    SafeProtocolAction[] actions;
    uint256 nonce;
    bytes32 metaHash;
}

struct SafeRootAccess {
    SafeProtocolAction action;
    uint256 nonce;
    bytes32 metaHash;
}
