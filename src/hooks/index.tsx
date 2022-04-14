import { ethers } from "ethers";
import { Contract } from "@ethersproject/contracts";
import contractsInfo from '../utils/abi.json'
import { Interface } from '@ethersproject/abi'
const ContractAbi = new Interface(contractsInfo.timeLock.abi)

export function convertToBigNumber(val) {
    return ethers.utils.parseEther(val.toString()).toString();
  }

export async function deposit(receipent: string, tokenAddress: string, amount: string, expiry: number = 0, web3) {
    debugger
    amount = convertToBigNumber(amount)
    console.log(contractsInfo.timeLock.abi)
    const contract = new web3.eth.Contract(ContractAbi, contractsInfo.timeLock.address);    
    const txHash = await contract.functions.deposit(receipent, tokenAddress, amount, expiry).call()
    return txHash
  }
  


