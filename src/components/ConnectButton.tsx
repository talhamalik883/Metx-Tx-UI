import { Button, Box, Text } from "@chakra-ui/react";
import Identicon from "./Identicon";
import MetaTrx from "./MetaTrx";
import { useMetaMask } from 'metamask-react';

type Props = {
  handleOpenModal: any;
};

export default function ConnectButton({ handleOpenModal }: Props) {
  const { status, connect, account } = useMetaMask();

  async function handleConnectWallet() {
    connect();
    console.log('connected successfully', status)
  }

  return account ? (
    <Box w="100%">
      <Box
      display="flex"
      alignItems="center"
      background="gray.700"
      borderRadius="xl"
      py="0"
      h="fit-content"
      width="fit-content"
      marginLeft="auto"
      marginTop="5"
    >
      <Box px="3">
        <Text color="white" fontSize="md">
        {/* etherBalance && parseFloat(formatEther(etherBalance)).toFixed(3) */}
          {} Address
        </Text>
      </Box>
      <Button
        onClick={handleOpenModal}
        bg="gray.800"
        border="1px solid transparent"
        _hover={{
          border: "1px",
          borderStyle: "solid",
          borderColor: "blue.400",
          backgroundColor: "gray.700",
        }}
        borderRadius="xl"
        m="1px"
        px={3}
        height="38px"
      >
        <Text color="white" fontSize="md" fontWeight="medium" mr="2">
          {account &&
            `${account.slice(0, 6)}...${account.slice(
              account.length - 4,
              account.length
            )}`}
        </Text>
        <Identicon />
      </Button>
      </Box>
      <MetaTrx/>
    </Box>
  ) : (
    <Button
      onClick={handleConnectWallet}
      bg="blue.800"
      color="blue.300"
      fontSize="lg"
      fontWeight="medium"
      borderRadius="xl"
      border="1px solid transparent"
      marginTop="5"
      marginLeft="auto"
      _hover={{
        borderColor: "blue.700",
        color: "blue.400",
      }}
      _active={{
        backgroundColor: "blue.800",
        borderColor: "blue.700",
      }}
    >
      Connect to a wallet
    </Button>
  );
}
