#!/bin/bash

# Set up colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Testing whitelist functionality on Solana devnet...${NC}"

# Check if solana is installed
if ! command -v solana &> /dev/null; then
    echo -e "${RED}Error: Solana CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if anchor is installed
if ! command -v anchor &> /dev/null; then
    echo -e "${RED}Error: Anchor CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Ensure we're on devnet
echo -e "${YELLOW}Setting Solana config to devnet...${NC}"
solana config set --url https://api.devnet.solana.com

# Check SOL balance
BALANCE=$(solana balance | awk '{print $1}')
echo -e "${YELLOW}Current SOL balance: ${BALANCE}${NC}"

# Check if balance is sufficient (at least 0.5 SOL)
if (( $(echo "$BALANCE < 0.5" | bc -l) )); then
    echo -e "${RED}Warning: Your balance is low. You may need more SOL for testing.${NC}"
    read -p "Do you want to continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Testing cancelled.${NC}"
        exit 1
    fi
fi

# Build the program
echo -e "${YELLOW}Building the program...${NC}"
anchor build

# Run only the whitelist test
echo -e "${YELLOW}Running whitelist test...${NC}"
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
ANCHOR_WALLET=~/.config/solana/id.json \
ts-mocha -p ./tsconfig.json tests/soltix.ts --grep "Add wallet to whitelist" --timeout 120000

echo -e "${GREEN}Test completed!${NC}" 