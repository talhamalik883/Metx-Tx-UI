import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  Select
} from "@chakra-ui/react";
import contractsInfo from '../utils/abi.json'
import { useState, useEffect } from 'react'
import { useForm } from "react-hook-form";
import { utils } from 'ethers'
import Biconomy from "@biconomy/mexa";
import Web3 from 'web3'
import { useConnectedMetaMask  } from 'metamask-react';
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css';

let sigUtil = require("eth-sig-util");


let web3, contract, biconomy, expireTime = 0, receipient, buttonState = false;
const zeroAddress = '0x0000000000000000000000000000000000000000'
let tokenAddress = zeroAddress

const domainType = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" }
];

const metaTransactionType = [
  { name: "nonce", type: "uint256" },
  { name: "from", type: "address" },
  { name: "functionSignature", type: "bytes" }
];

let domainData = {
  name: "MetaTrx",
  version: "1",
  chainId: 42,
  verifyingContract: ""
};

export default function MetaTrx() {
  const { account, ethereum, chainId } = useConnectedMetaMask();
  const contractAddress: string = contractsInfo.timeLock.address
  const ContractAbi = contractsInfo.timeLock.abi
  const erc20Abi = contractsInfo.erc20.abi
  const approveMaxTokens = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm();

  const [amount, setAmount] = useState('0')
  // const [tokenAddress, setTokenAddress] = useState(zeroAddress)
  const [ buttonText, setButtonText ] = useState("Deposit")
  useEffect(() => {
    async function init() {    
      console.log('chainId ', chainId)
        if (!ethereum || web3){
          return
        }
        if ( chainId != '0x2a' ){
          toast('Please Install MetaMask and Switch to Kovan Network')

          return
        }
        console.log('Initializing web3')
        web3 = new Web3(ethereum);
        biconomy = new Biconomy(ethereum, {apiKey: "QjBKADdwL.473dafe2-8346-403a-9fdc-c721f6f31618" }); 
        contract = new web3.eth.Contract(ContractAbi, contractAddress);

        biconomy.onEvent(biconomy.READY, async () => {
          console.log('Inside biconomy event')
          // Initialize your dapp here like getting user accounts etc
          const provider = ethereum;
          await provider.enable();
          console.log(web3)
          console.log('Contract is Initialized')
        }).onEvent(biconomy.ERROR, (error, message) => {
          // Handle error while initializing mexa
          console.log(error)
        });    
    }
      init()
    
    }, [])
  const OnSubmit = async (values: any) =>{
    debugger
    console.log('web3 ', web3)
    const value = utils.parseEther(amount.toString()).toString()
    const ethValue = tokenAddress === zeroAddress ? value : 0
    console.log(contract);
    if (tokenAddress !== zeroAddress){
      const erc20Instance = new web3.eth.Contract(erc20Abi, tokenAddress);
      const balance = await erc20Instance.methods.balanceOf(account).call()
      if ( balance < value ){
        setButtonText(' InSufficient Token Balance to Make transaction')
        toast(' InSufficient Token Balance to Make transaction ')
      }
      setButtonText('Approving....')
      const allowance = await erc20Instance.methods.allowance(account, contractAddress).call()
      if ( allowance == 0 ){
        console.log('You Have Approved the tokens')
        toast('Please Approve Tokens')
        const erc20Hash = await erc20Instance.methods.approve(contractAddress, approveMaxTokens).send({from: account})
        toast('Tokens Approve Successfully')
        console.log(erc20Hash);          
      }
      setButtonText('Deposit Tokens')
    }
    const txHash = await contract.methods.deposit(receipient, tokenAddress, value, expireTime).send({from: account, value: ethValue})
    console.log(txHash)
    setButtonText('Deposit Is Made SuccessFully')
    toast('Deposit Is Made SuccessFully')
  }

  const onClaim = async event => {
        console.log("Sending meta transaction");
        let userAddress = account;
        let claimTrxCount = await contract.methods.claimableCount().call({from: account})
        console.log('Claim Trx Count ', claimTrxCount)
        if ( claimTrxCount === 0){
          toast('You have no deposits to be claimed')
          return
        }
        let nonce = await contract.methods.getNonce(userAddress).call();
        let functionSignature = contract.methods.claim().encodeABI();
        let message:any = {};
        message.nonce = parseInt(nonce);
        message.from = userAddress;
        message.functionSignature = functionSignature;

        domainData.chainId = 42;
        domainData.verifyingContract = contractAddress
        const dataToSign = JSON.stringify({
          types: {
            EIP712Domain: domainType,
            MetaTransaction: metaTransactionType
          },
          domain: domainData,
          primaryType: "MetaTransaction",
          message: message
        });
        console.log(domainData);
        console.log();
        web3.currentProvider.send(
          {
            jsonrpc: "2.0",
            id: 999999999999,
            method: "eth_signTypedData_v4",
            params: [userAddress, dataToSign]
          },
          function(error, response) {
            console.info(`User signature is ${response.result}`);
            if (error || (response && response.error)) {
              // showErrorMessage("Could not get user signature");
            } else if (response && response.result) {
              let { r, s, v } = getSignatureParameters(response.result);
              console.log(userAddress);
              console.log(JSON.stringify(message));
              console.log(message);
              console.log(getSignatureParameters(response.result));

              const recovered = sigUtil.recoverTypedSignature_v4({
                data: JSON.parse(dataToSign),
                sig: response.result
              });
              console.log(`Recovered ${recovered}`);
              sendTransaction(userAddress, functionSignature, r, s, v);
            }
          }
        );


  };
  const sendTransaction = async (userAddress, functionData, r, s, v) => {

    if (web3 && contract) {
      try {
        let gasLimit = await contract.methods
          .executeMetaTransaction(userAddress, functionData, r, s, v)
          .estimateGas({ from: userAddress });
        let gasPrice = await web3.eth.getGasPrice();
        console.log(gasLimit);
        console.log(gasPrice);
        let txInfo = await contract.methods
          .executeMetaTransaction(userAddress, functionData, r, s, v)
          .send({
            from: userAddress,
            gasPrice: web3.utils.toHex(gasPrice),
            gasLimit: web3.utils.toHex(gasLimit)
          });
        console.log(txInfo.hash);    
        toast('Transaction is made successfully')
      } catch (error) {
        console.log(error);
      }

    }
  };
  const getSignatureParameters = signature => {
    if (!web3.utils.isHexStrict(signature)) {
      throw new Error(
        'Given value "'.concat(signature, '" is not a valid hex string.')
      );
    }
    var r = signature.slice(0, 66);
    var s = "0x".concat(signature.slice(66, 130));
    var v: any = "0x".concat(signature.slice(130, 132));
    v = web3.utils.hexToNumber(v);
    if (![27, 28].includes(v)) v += 27;
    return {
      r: r,
      s: s,
      v: v
    };
  };

   return (
    <Box
      bg="gray.800"
      width={"35%"}
      minWidth="35%"
      maxWidth={"100%"}
      margin="5% auto"
      color="white"
      padding="3rem"
      paddingBottom="20"
      boxShadow="0 0 10px"
      borderRadius={"10px"}
    >
      <Box marginBottom={5} fontSize="3xl" textAlign={"center"}>
        Meta Transaction{" "}
        </Box>
        <Box marginBottom={5} fontSize="1xl" textAlign={"center"}>
        You can Claim any of the deposit by clicking claim button        </Box>
      <Box marginBottom={5} fontSize="1xl" textAlign={"center"}>
        
        <Button
          bg="blue.800"
          color="blue.300"
          fontSize="lg"
          fontWeight="medium"
          borderRadius="xl"
          border="1px solid transparent"
          disabled={buttonState}
          display={"block"}
          margin={"auto"}
          minWidth={"200px"}
          isLoading={isSubmitting}
          onClick= {(e)=>{
            console.log('Button is Clicked')
            onClaim(e)
          }}
          _hover={{
            borderColor: "red.700",
            color: "red.400",
          }}
          _active={{
            backgroundColor: "red.800",
            borderColor: "red.700",
          }}
        >
          Claim
        </Button>
      </Box>
      <Box marginBottom={3} fontSize="3xl" textAlign={"center"}>
      Perform Deposit{" "} 
        </Box>
      <form onSubmit={handleSubmit(OnSubmit)}>
        <FormControl isInvalid={errors.walletAddress} marginBottom="4">
          <FormLabel htmlFor="walletAddress">Wallet Address</FormLabel>
          <Input
            id="walletAddress"
            readOnly
            size="lg"
            value = { account ? account : ""}
          />
          <FormErrorMessage>
            {errors.walletAddress && errors.walletAddress.message}
          </FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={errors.receipient} marginBottom="4">
          <FormLabel htmlFor="receipient">Receipient Address</FormLabel>
          <Input
            id="receipient"
            placeholder="Receipient Address"
            type = "text"
            size="lg"
            {...register("receipient", {
              required: "Receipient Address is required",
            })}
            onChange={(e) => {
              if (!utils.isAddress(e.target.value)){
                buttonState = true
                errors.receipient = 'Invalid address'
              }else
              receipient = (e.target.value)
            }}
          />
         <FormErrorMessage>
            {errors.receipient && errors.receipient.message}
          </FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={errors.Amount} marginBottom="4">
          <FormLabel htmlFor="Amount">Amount</FormLabel>
          <Input
            id="Amount"
            placeholder="Amount"
            size="lg"
            type = "text"
            {...register("Amount", {
              required: "Amount is required",
            })}
            onChange={(e)=>{setAmount(e.target.value)}}
          />
          <FormErrorMessage>
            {errors.Amount && errors.Amount.message}
          </FormErrorMessage>
        </FormControl>
        <FormControl isInvalid={errors.tokenlist} marginBottom="4">
          <FormLabel htmlFor="receipient">Select Token</FormLabel>
          <Select 
          id="tokenlist"
          placeholder='Select ERC20 Token'
          onChange={(e)=>{
            const selectOption = e.target.value
            console.log(selectOption);
            if (selectOption !=""){
              setButtonText("Approve")
              tokenAddress = (e.target.value)
            }else{
              setButtonText("Deposit")
              tokenAddress = (zeroAddress)
            }
            console.log('tokenAddress', tokenAddress)
          }}

          >
            <option value='0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa'>DAI</option>
            <option value='0xf3e0d7bF58c5d455D31ef1c2d5375904dF525105'>USDC</option>
          </Select>
          <FormErrorMessage>
            {errors.tokenlist && errors.tokenlist}
          </FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={errors.expireTime} marginBottom="4">
          <FormLabel htmlFor="receipient">Select Expire Time</FormLabel>
          <Select 
          id="expireTime"
          placeholder='Select Expire Time'
          onChange={(e)=>{
            const selectOption = e.target.value
            console.log(selectOption);
            if (selectOption !=""){
              setButtonText("Approve")
              expireTime = parseInt(e.target.value)
            }else{
              setButtonText("Deposit")
              expireTime = 0
            }
            console.log('expireTime', expireTime)
          }}
          >
            <option value='60'>1 Minute</option>
            <option value='120'>2 Minute</option>
            <option value='300'>5 Minute</option>
          </Select>
          <FormErrorMessage>
            {errors.expireTime && errors.expireTime}
          </FormErrorMessage>
        </FormControl>

        <Button
          bg="blue.800"
          color="blue.300"
          fontSize="lg"
          fontWeight="medium"
          borderRadius="xl"
          border="1px solid transparent"
          disabled={buttonState}
          display={"block"}
          margin={"auto"}
          minWidth={"200px"}
          isLoading={isSubmitting}
          _hover={{
            borderColor: "blue.700",
            color: "blue.400",
          }}
          _active={{
            backgroundColor: "blue.800",
            borderColor: "blue.700",
          }}
          type="submit"
        >
          {buttonText}
        </Button>
      </form>
    </Box>
  );
}
