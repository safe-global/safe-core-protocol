import hre, { deployments } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { MaxUint256, ZeroAddress } from "ethers";
import { getMockRegistryWithInvalidInterfaceSupport } from "../utils/mockRegistryBuilder";

describe("RegistryManager", async () => {
    let deployer: SignerWithAddress, owner: SignerWithAddress, user1: SignerWithAddress;

    before(async () => {
        [deployer, owner, user1] = await hre.ethers.getSigners();
    });

    const setupTests = deployments.createFixture(async ({ deployments }) => {
        await deployments.fixture();
        [deployer, owner, user1] = await hre.ethers.getSigners();
        const account = await hre.ethers.deployContract("TestExecutor", [ZeroAddress], { signer: deployer });
        const safeProtocolRegistry = await hre.ethers.deployContract("SafeProtocolRegistry", [account.target], { signer: deployer });

        const registryManager = await hre.ethers.deployContract(
            "RegistryManager",
            [await safeProtocolRegistry.getAddress(), account.target],
            {
                signer: deployer,
            },
        );

        await account.setFallbackHandler(registryManager.target);

        return { registryManager, safeProtocolRegistry, account };
    });

    it("Should revert when registry address does not implement valid interfaceId", async () => {
        const { registryManager, account } = await setupTests();

        const dataSetZeroAddressAsRegistry = registryManager.interface.encodeFunctionData("setRegistry", [ZeroAddress]);
        expect(account.executeCallViaMock(account.target, 0n, dataSetZeroAddressAsRegistry, MaxUint256)).to.be.revertedWithoutReason;

        const registry = await getMockRegistryWithInvalidInterfaceSupport();
        const data = registryManager.interface.encodeFunctionData("setRegistry", [registry.target]);
        await expect(account.executeCallViaMock(account.target, 0n, data, MaxUint256)).to.be.revertedWithCustomError(
            registryManager,
            "ContractDoesNotImplementValidInterfaceId",
        );
    });

    it("Should revert with ContractDoesNotImplementValidInterfaceId when creating registry manager with registry not supporting valid interfaceId", async () => {
        const registry = await getMockRegistryWithInvalidInterfaceSupport();
        await expect(hre.ethers.deployContract("RegistryManager", [await registry.getAddress(), owner.address], { signer: deployer })).to.be
            .reverted;
    });

    it("Should emit RegistryChanged change event when registry is updated", async () => {
        const { registryManager, account } = await setupTests();

        const safeProtocolRegistryAddress = await (
            await hre.ethers.deployContract("SafeProtocolRegistry", [owner.address], { signer: deployer })
        ).getAddress();

        const data = registryManager.interface.encodeFunctionData("setRegistry", [safeProtocolRegistryAddress]);
        const oldRegistryAddress = await registryManager.registry.staticCall();

        await expect(account.executeCallViaMock(account.target, 0n, data, MaxUint256))
            .to.emit(registryManager, "RegistryChanged")
            .withArgs(oldRegistryAddress, safeProtocolRegistryAddress);

        expect(await registryManager.registry.staticCall()).to.be.equal(safeProtocolRegistryAddress);
    });

    it("Should not allow non-owner to update registry", async () => {
        const account = await hre.ethers.deployContract("TestExecutor", [ZeroAddress]);

        const { registryManager } = await setupTests();
        await account.setModule(await registryManager.getAddress());

        await expect(registryManager.connect(user1).setRegistry(ZeroAddress)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should block calls to setRegistry(address) when caller address is not appended to calldata", async () => {
        const { registryManager, account } = await setupTests();
        const data = registryManager.interface.encodeFunctionData("setRegistry", [ZeroAddress]);

        await expect(account.executeCallViaMock(registryManager.target, 0n, data, MaxUint256)).to.be.revertedWithCustomError(
            registryManager,
            "InvalidSender",
        );
    });
});
