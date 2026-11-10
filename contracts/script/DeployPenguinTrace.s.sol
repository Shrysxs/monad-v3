// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Script, console2 } from "forge-std/Script.sol";
import { PenguinTraceRegistry } from "../src/PenguinTraceRegistry.sol";

contract DeployPenguinTrace is Script {
    function run() external returns (PenguinTraceRegistry registry) {
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0));
        address deployer;

        if (deployerPrivateKey != 0) {
            deployer = vm.addr(deployerPrivateKey);
            console2.log("Deploying PenguinTraceRegistry using PRIVATE_KEY environment variable...");
            console2.log("Deployer address:", deployer);
            vm.startBroadcast(deployerPrivateKey);
            registry = new PenguinTraceRegistry(deployer);
            vm.stopBroadcast();
        } else {
            console2.log("Deploying PenguinTraceRegistry using keystore / CLI signer...");
            deployer = msg.sender;
            console2.log("Deployer address:", deployer);
            vm.startBroadcast();
            registry = new PenguinTraceRegistry(deployer);
            vm.stopBroadcast();
        }

        console2.log("PenguinTraceRegistry deployed at:", address(registry));
    }
}
