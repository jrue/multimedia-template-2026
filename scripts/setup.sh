#!/usr/bin/env bash

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

EXAMPLE_DOC="https://docs.google.com/document/d/1JaxRkCqZyeWIPwXXocAwUoFaPsqULiQI_Oiby_F0JZ8/edit?usp=sharing"

echo ""
echo -e "${BOLD}Multimedia Template — Setup${NC}"
echo "============================="
echo ""

# ── Step 1: Git ──────────────────────────────────────────────────────────────
echo -e "${BOLD}[1/6] Checking for Git...${NC}"
if ! command -v git &> /dev/null; then
  echo -e "${YELLOW}Git not found. Launching Xcode Command Line Tools installer...${NC}"
  echo "A dialog box will appear — click Install and wait for it to finish."
  xcode-select --install 2>/dev/null || true
  echo ""
  echo -e "${RED}Re-run this script after the installation completes.${NC}"
  exit 1
else
  echo -e "${GREEN}Git found: $(git --version)${NC}"
fi
echo ""

# ── Step 2: nvm ──────────────────────────────────────────────────────────────
echo -e "${BOLD}[2/6] Checking for nvm...${NC}"
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  source "$NVM_DIR/nvm.sh"
fi

if ! type nvm &> /dev/null; then
  echo -e "${YELLOW}nvm not found. Installing nvm...${NC}"
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
  echo -e "${GREEN}nvm installed.${NC}"
else
  echo -e "${GREEN}nvm found: $(nvm --version)${NC}"
fi

echo ""
echo -e "${BOLD}Installing Node $(cat .nvmrc) and switching to it...${NC}"
nvm install
nvm use
echo -e "${GREEN}Using Node $(node --version)${NC}"
echo ""

# ── Step 3: npm install ───────────────────────────────────────────────────────
echo -e "${BOLD}[3/6] Installing dependencies...${NC}"
npm install
echo ""

# ── Step 4: .env setup ───────────────────────────────────────────────────────
echo -e "${BOLD}[4/6] Setting up environment file...${NC}"
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo -e "${GREEN}.env file created from .env.example${NC}"
else
  echo -e "${GREEN}.env already exists${NC}"
fi
echo ""

# ── Step 5: Google Doc URL ───────────────────────────────────────────────────
echo -e "${BOLD}[5/6] Google Doc setup${NC}"
echo ""
echo "This template pulls content from a Google Doc."
echo ""
echo -e "An example doc is available here for reference:"
echo -e "${BLUE}$EXAMPLE_DOC${NC}"
echo ""
echo "  1. Open the link above in your browser"
echo "  2. Go to File → Make a copy to create your own version"
echo "  3. Click the Share button and set access to 'Anyone with the link' → Viewer"
echo "  4. Click 'Copy link'"
echo ""

CURRENT_URL=$(grep "^DOC_URL=" .env | cut -d'=' -f2-)
if [ -n "$CURRENT_URL" ] && [ "$CURRENT_URL" != "$EXAMPLE_DOC" ]; then
  echo -e "Current DOC_URL: ${YELLOW}$CURRENT_URL${NC}"
  echo ""
  read -rp "Paste your Google Doc share URL (or press Enter to keep existing): " DOC_URL
else
  read -rp "Paste your Google Doc share URL: " DOC_URL
fi

if [ -n "$DOC_URL" ]; then
  sed -i.bak "s|^DOC_URL=.*|DOC_URL=$DOC_URL|" .env && rm .env.bak
  echo -e "${GREEN}Google Doc URL saved to .env${NC}"
fi
echo ""

# ── Step 6: Extract Google Doc ───────────────────────────────────────────────
echo -e "${BOLD}[6/6] Pulling content from your Google Doc...${NC}"
npm run build:extract-google-doc
echo ""

# ── Done ─────────────────────────────────────────────────────────────────────
echo -e "${GREEN}${BOLD}Setup complete!${NC}"
echo ""
echo "To start the development server, run:"
echo ""
echo -e "  ${BOLD}npm run dev${NC}"
echo ""
