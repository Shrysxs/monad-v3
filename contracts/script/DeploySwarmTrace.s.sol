// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Script, console2 } from "forge-std/Script.sol";
import { SwarmTraceRegistry } from "../src/SwarmTraceRegistry.sol";

contract DeploySwarmTrace is Script {
    function run() external returns (SwarmTraceRegistry registry) {
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0));
        address deployer;

        if (deployerPrivateKey != 0) {
            deployer = vm.addr(deployerPrivateKey);
            console2.log("Deploying SwarmTraceRegistry using PRIVATE_KEY environment variable...");
            console2.log("Deployer address:", deployer);
            vm.startBroadcast(deployerPrivateKey);
            registry = new SwarmTraceRegistry(deployer);
            vm.stopBroadcast();
        } else {
            console2.log("Deploying SwarmTraceRegistry using keystore / CLI signer...");
            deployer = msg.sender;
            console2.log("Deployer address:", deployer);
            vm.startBroadcast();
            registry = new SwarmTraceRegistry(deployer);
            vm.stopBroadcast();
        }

        console2.log("SwarmTraceRegistry deployed at:", address(registry));
    }
}
