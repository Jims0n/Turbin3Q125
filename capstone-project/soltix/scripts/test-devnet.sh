#!/bin/bash

# Set up colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Setting up Solana configuration for devnet...${NC}"
solana config set --url https://api.devnet.solana.com

echo -e "${YELLOW}Checking Solana balance...${NC}"
BALANCE=$(solana balance)
echo -e "Current balance: ${GREEN}$BALANCE${NC}"

echo -e "${YELLOW}Building the program...${NC}"
anchor build

echo -e "${YELLOW}Running tests...${NC}"
yarn test

echo -e "${YELLOW}Done!${NC}" 