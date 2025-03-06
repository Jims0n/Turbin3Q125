#!/bin/bash

# Set up colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting deployment to Solana devnet...${NC}"

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

# Check if balance is sufficient (at least 2 SOL)
if (( $(echo "$BALANCE < 2" | bc -l) )); then
    echo -e "${RED}Warning: Your balance is low. You may need more SOL for deployment.${NC}"
    read -p "Do you want to continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Deployment cancelled.${NC}"
        exit 1
    fi
fi

# Build the program
echo -e "${YELLOW}Building the program...${NC}"
anchor build

# Try different RPC endpoints if the default one fails
ENDPOINTS=(
    "https://api.devnet.solana.com"
    "https://devnet.genesysgo.net"
    "https://api.devnet.rpcpool.com"
)

for ENDPOINT in "${ENDPOINTS[@]}"; do
    echo -e "${YELLOW}Trying deployment with endpoint: ${ENDPOINT}${NC}"
    
    # Set the RPC endpoint
    solana config set --url $ENDPOINT
    
    # Try to deploy
    echo -e "${YELLOW}Deploying program...${NC}"
    if anchor deploy; then
        echo -e "${GREEN}Deployment successful with endpoint: ${ENDPOINT}${NC}"
        
        # Get the program ID
        PROGRAM_ID=$(solana address -k target/deploy/soltix-keypair.json)
        echo -e "${GREEN}Program ID: ${PROGRAM_ID}${NC}"
        
        # Update the program ID in lib.rs if needed
        echo -e "${YELLOW}Checking if program ID needs to be updated in lib.rs...${NC}"
        CURRENT_ID=$(grep -o 'declare_id!("[^"]*")' programs/soltix/src/lib.rs | sed 's/declare_id!("\(.*\)")/\1/')
        
        if [ "$CURRENT_ID" != "$PROGRAM_ID" ]; then
            echo -e "${YELLOW}Updating program ID in lib.rs...${NC}"
            sed -i '' "s/declare_id!(\"$CURRENT_ID\")/declare_id!(\"$PROGRAM_ID\")/" programs/soltix/src/lib.rs
            echo -e "${GREEN}Program ID updated in lib.rs${NC}"
            
            # Rebuild and redeploy with the updated program ID
            echo -e "${YELLOW}Rebuilding and redeploying with updated program ID...${NC}"
            anchor build
            if anchor deploy; then
                echo -e "${GREEN}Redeployment successful!${NC}"
            else
                echo -e "${RED}Redeployment failed. Please check the error message above.${NC}"
                exit 1
            fi
        else
            echo -e "${GREEN}Program ID is already up to date in lib.rs${NC}"
        fi
        
        # Deployment successful, exit the loop
        break
    else
        echo -e "${RED}Deployment failed with endpoint: ${ENDPOINT}${NC}"
        
        # If this is the last endpoint, exit with error
        if [ "$ENDPOINT" == "${ENDPOINTS[-1]}" ]; then
            echo -e "${RED}All deployment attempts failed. Please try again later or check your network connection.${NC}"
            exit 1
        else
            echo -e "${YELLOW}Trying next endpoint...${NC}"
        fi
    fi
done

echo -e "${GREEN}Deployment process completed!${NC}"
echo -e "${YELLOW}You can now run the tests with: yarn test${NC}" 