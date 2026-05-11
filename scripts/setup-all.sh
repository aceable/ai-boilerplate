#!/bin/bash

# Full Development Environment Setup
# Purpose: Install all tools and dependencies in the correct order

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error()   { echo -e "${RED}❌ $1${NC}"; }
print_info()    { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_section() { echo ""; echo -e "${BLUE}🔸 $1${NC}"; echo "════════════════════════════════════════"; }
print_step()    { echo ""; echo -e "${YELLOW}📋 Step $1${NC}"; }

echo "🚀 Development Environment Setup"
echo ""

# ── Step 1: Node.js ───────────────────────────────────────────────────────────
print_step "1/4: Node.js"

NVMRC_VERSION=$(cat .nvmrc 2>/dev/null | tr -d '\n' || echo "22")

if command -v node &> /dev/null; then
  NODE_VERSION=$(node --version | sed 's/v//')
  if printf '%s\n%s\n' "22.0.0" "$NODE_VERSION" | sort -V -C; then
    print_success "Node.js $NODE_VERSION — OK"
  else
    print_warning "Node.js $NODE_VERSION found but >= 22.0.0 required"
    export NVM_DIR="$HOME/.nvm"
    [[ -s "$NVM_DIR/nvm.sh" ]] && source "$NVM_DIR/nvm.sh"
    if command -v nvm &> /dev/null; then
      nvm install "$NVMRC_VERSION" && nvm use "$NVMRC_VERSION"
      print_success "Switched to Node.js $NVMRC_VERSION"
    else
      print_error "NVM not found — install it: https://github.com/nvm-sh/nvm"
      exit 1
    fi
  fi
else
  print_info "Node.js not found, installing via NVM..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  source "$NVM_DIR/nvm.sh"
  nvm install "$NVMRC_VERSION" && nvm use "$NVMRC_VERSION"
  print_success "Node.js $NVMRC_VERSION installed"
fi

# ── Step 2: npm dependencies ──────────────────────────────────────────────────
print_step "2/4: Project Dependencies"

if [[ ! -f "package.json" ]]; then
  print_error "package.json not found — run this from the repo root"
  exit 1
fi

if [[ ! -d "node_modules" ]]; then
  print_info "Installing npm dependencies..."
  npm install
  print_success "Dependencies installed"
else
  print_success "Dependencies already present"
fi

# ── Step 3: GitHub CLI ────────────────────────────────────────────────────────
print_step "3/4: GitHub CLI"

if command -v gh &> /dev/null; then
  print_success "$(gh --version | head -n1) already installed"
  if ! gh auth status &> /dev/null; then
    print_info "Not authenticated — running: gh auth login"
    gh auth login
  else
    print_success "Authenticated as: $(gh api user --jq '.login' 2>/dev/null)"
  fi
else
  print_info "Installing GitHub CLI..."
  ./scripts/setup-github-cli.sh
fi

# ── Step 4: Environment variables ────────────────────────────────────────────
print_step "4/4: Environment Variables"

if [[ -f ".env.local" ]] || [[ -f ".env.development.local" ]]; then
  print_success "Environment file already exists"
else
  if [[ -f ".env.example" ]]; then
    print_info "Copying .env.example → .env.local"
    cp .env.example .env.local
    print_warning "Fill in your credentials in .env.local before running the app"
    print_info "Required: DATABASE_URL, OPENAI_API_KEY, CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
  else
    print_warning "No .env.example found — create .env.local manually"
    print_info "Required variables: DATABASE_URL, OPENAI_API_KEY, CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
  fi
fi

# ── Branch protection (optional, admins only) ────────────────────────────────
# Skipped silently unless the user opts in and has admin permission on the repo.
# Set SETUP_SKIP_BRANCH_PROTECTION=1 to suppress the prompt entirely.
if [[ "${SETUP_SKIP_BRANCH_PROTECTION:-0}" != "1" ]] && command -v gh &> /dev/null && gh auth status &> /dev/null; then
  print_section "Branch protection (optional)"
  print_info "Apply default-branch protection (1 review + required CI checks)?"
  print_info "Requires repo admin permission. Safe to skip and run later."
  read -r -p "Apply now? [y/N] " confirm_bp
  if [[ "${confirm_bp:-N}" =~ ^[Yy]$ ]]; then
    if ./scripts/setup-branch-protection.sh; then
      print_success "Branch protection applied"
    else
      print_warning "Branch protection skipped — see error above. Re-run: npm run setup:protect"
    fi
  else
    print_info "Skipped. Re-run later: npm run setup:protect"
  fi
fi

# ── Final check ───────────────────────────────────────────────────────────────
print_section "Running final verification..."
npm run check

if [[ $? -eq 0 ]]; then
  echo ""
  print_success "🎉 Setup complete — happy coding!"
  echo ""
  echo "  npm run dev        # Start dev server"
  echo "  npm run db:push    # Apply database schema"
else
  echo ""
  print_warning "Setup complete with some issues — check output above"
fi
