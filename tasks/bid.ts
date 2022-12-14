import { toHex, submitAndWait } from "./utils";
import { BigNumber, ContractTransaction, ContractReceipt } from "ethers";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"
require("dotenv").config();
const mcdClipFauAAddress = `0xc45A29d6B2585B270a4A2221A94d44254C8FE756`
const VAT_ADDRESS = "0x1b1FE236166eD0Ac829fa230afE38E61bC281C5e";

const value1e18 = BigNumber.from("10").pow(18);
const value1e27 = BigNumber.from("10").pow(27);

const confirmationHeight = process.env.CONFIRMATION_HEIGHT ? parseInt(process.env.CONFIRMATION_HEIGHT!) : 0;

async function submitTx(tx: Promise<ContractTransaction>): Promise<ContractReceipt> {
    return submitAndWait(tx, confirmationHeight);
}

// 精算の実行
export const bid = async function (hre: HardhatRuntimeEnvironment, args: TaskArguments) {
    const ethers = hre.ethers
    const [myAccount] = await ethers.getSigners();

    const auctionId = args.auctionId ?? 1; // change it accordingly.
    const amountToTake = BigNumber.from(args.amountToTake ?? 200).mul(value1e18) // [10^18  ]
    const maxPrice = BigNumber.from(args.maxPrice ?? 150).mul(value1e27) // price for FAU token, [10^27]
    const receiver = args.receiver ?? myAccount.address

    const vatContract = await ethers.getContractAt("Vat", VAT_ADDRESS);
    const hopeIsAlreadyExecuted = await vatContract.can(myAccount.address, mcdClipFauAAddress)
    // console.log(`hopeIsAlreadyExecuted: ${hopeIsAlreadyExecuted}`)
    if (!parseInt(hopeIsAlreadyExecuted.toString())) {
        //required only once
        console.log(`enable hope for ${mcdClipFauAAddress}`)
        const vatHopeResult = await submitTx(
            vatContract.hope(mcdClipFauAAddress)
        );
        console.log(vatHopeResult)
    }


    let txOption: { [key: string]: any } = {}
    if (args.gasLimit !== undefined) {
        txOption.gasLimit = args.gasLimit
    }
    if (args.nonce !== undefined) {
        txOption.nonce = args.nonce
    }

    console.log(`bid auction`)
    const mcdClipFauAContract = await ethers.getContractAt("Clipper", mcdClipFauAAddress);
    const result = await submitTx(
        mcdClipFauAContract.take(
            auctionId,
            amountToTake,
            maxPrice,
            receiver,
            Buffer.from([]),
            txOption
        )
    );
    console.log(result)
}
