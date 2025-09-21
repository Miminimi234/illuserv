# Oracle Service Setup

## Simple Setup

Just set one environment variable:

```bash
# Set your token contract
export ILLUSIO_CONTRACT=your_token_contract_address_here

# Start the service
npm run dev
```

## That's it!

The Oracle service will:
- ✅ Automatically fetch real token data from Jupiter API
- ✅ Focus conversations on YOUR project token
- ✅ Discuss specific metrics and values
- ✅ Use SOL as default if no contract is set

## Examples

```bash
# Track SOL (default)
npm run dev

# Track your token
export ILLUSIO_CONTRACT=So11111111111111111111111111111111111111112
npm run dev

# Track USDC
export ILLUSIO_CONTRACT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
npm run dev
```

## Production

Set the environment variable in your production environment and run `npm start`.
