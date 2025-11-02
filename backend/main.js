const express = require('express');
const { ethers } = require('ethers');
const solc = require('solc');

const app = express();
app.use(express.json());

// Somnia Testnet RPC URL
const SOMNIA_TESTNET_RPC = 'https://dream-rpc.somnia.network';

// TokenFactory Contract Address
const FACTORY_ADDRESS = '0x19Fae13F4C2fac0539b5E0baC8Ad1785f1C7dEE1';

// TokenFactory ABI
const FACTORY_ABI = [
  "function createToken(string name, string symbol, uint256 initialSupply) returns (address)",
  "function getTotalTokensDeployed() view returns (uint256)",
  "function getTokensByCreator(address creator) view returns (address[])",
  "function getLatestTokens(uint256 count) view returns (address[])",
  "function getAllDeployedTokens() view returns (address[])",
  "function getTokenInfo(address tokenAddress) view returns (address creator, string name, string symbol, uint256 initialSupply, uint256 deployedAt, uint256 currentSupply, address owner)",
  "event TokenCreated(address indexed tokenAddress, address indexed creator, string name, string symbol, uint256 initialSupply, uint256 timestamp)"
];

// ERC20 Token Contract Source
const TOKEN_CONTRACT_SOURCE = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

contract CustomToken {
    string private _name;
    string private _symbol;
    uint8 private _decimals;
    uint256 private _totalSupply;
    address public owner;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 totalSupply_
    ) {
        owner = msg.sender;
        _name = name_;
        _symbol = symbol_;
        _decimals = decimals_;
        _totalSupply = totalSupply_;
        _balances[msg.sender] = totalSupply_;
        emit Transfer(address(0), msg.sender, totalSupply_);
    }

    function name() public view returns (string memory) {
        return _name;
    }

    function symbol() public view returns (string memory) {
        return _symbol;
    }

    function decimals() public view returns (uint8) {
        return _decimals;
    }

    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function allowance(address tokenOwner, address spender) public view returns (uint256) {
        return _allowances[tokenOwner][spender];
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        uint256 currentAllowance = _allowances[from][msg.sender];
        require(currentAllowance >= amount, "ERC20: transfer amount exceeds allowance");
        _transfer(from, to, amount);
        _approve(from, msg.sender, currentAllowance - amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");
        require(_balances[from] >= amount, "ERC20: transfer amount exceeds balance");
        _balances[from] -= amount;
        _balances[to] += amount;
        emit Transfer(from, to, amount);
    }

    function _approve(address tokenOwner, address spender, uint256 amount) internal {
        require(tokenOwner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");
        _allowances[tokenOwner][spender] = amount;
        emit Approval(tokenOwner, spender, amount);
    }

    function sendToken(address recipient, uint256 amount) external onlyOwner {
        _transfer(address(this), recipient, amount);
    }
}
`;

// Compile Solidity contract
function compileContract() {
  const input = {
    language: 'Solidity',
    sources: {
      'CustomToken.sol': {
        content: TOKEN_CONTRACT_SOURCE
      }
    },
    settings: {
      optimizer: {
        enabled: false,
        runs: 200
      },
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode']
        }
      }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  
  // Log compilation warnings
  if (output.errors) {
    const warnings = output.errors.filter(e => e.severity === 'warning');
    if (warnings.length > 0) {
      console.warn('Compilation warnings:', warnings);
    }
    
    const errors = output.errors.filter(e => e.severity === 'error');
    if (errors.length > 0) {
      throw new Error('Compilation failed: ' + JSON.stringify(errors, null, 2));
    }
  }

  if (!output.contracts || !output.contracts['CustomToken.sol'] || !output.contracts['CustomToken.sol']['CustomToken']) {
    throw new Error('Contract not found in compilation output');
  }

  const contract = output.contracts['CustomToken.sol']['CustomToken'];
  
  if (!contract.abi) {
    throw new Error('ABI not found in compilation output');
  }
  
  if (!contract.evm || !contract.evm.bytecode || !contract.evm.bytecode.object) {
    throw new Error('Bytecode not found in compilation output');
  }

  let bytecode = contract.evm.bytecode.object;
  
  // Ensure bytecode has 0x prefix
  if (!bytecode.startsWith('0x')) {
    bytecode = '0x' + bytecode;
  }
  
  if (bytecode === '0x' || bytecode.length < 4) {
    throw new Error('Invalid bytecode generated');
  }

  return {
    abi: contract.abi,
    bytecode: bytecode
  };
}

app.post('/transfer', async (req, res) => {
  try {
    const { privateKey, toAddress, amount, tokenAddress } = req.body;

    if (!privateKey || !toAddress || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: privateKey, toAddress, amount'
      });
    }

    const provider = new ethers.JsonRpcProvider(SOMNIA_TESTNET_RPC);
    const wallet = new ethers.Wallet(privateKey, provider);

    // If tokenAddress is provided, transfer ERC20 tokens
    if (tokenAddress) {
      console.log('Transferring ERC20 token:', tokenAddress);
      
      // ERC20 Token ABI for transfer
      const TOKEN_ABI = [
        'function transfer(address to, uint256 amount) returns (bool)',
        'function balanceOf(address account) view returns (uint256)',
        'function decimals() view returns (uint8)',
        'function symbol() view returns (string)',
        'function name() view returns (string)'
      ];

      const tokenContract = new ethers.Contract(tokenAddress, TOKEN_ABI, wallet);

      // Get token decimals
      let decimals;
      try {
        decimals = await tokenContract.decimals();
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: 'Invalid token address or token does not support decimals()'
        });
      }

      // Parse amount with proper decimals
      const amountInWei = ethers.parseUnits(amount.toString(), decimals);

      // Check token balance
      const tokenBalance = await tokenContract.balanceOf(wallet.address);
      if (tokenBalance < amountInWei) {
        const tokenSymbol = await tokenContract.symbol().catch(() => 'TOKEN');
        return res.status(400).json({
          success: false,
          error: 'Insufficient token balance',
          tokenAddress: tokenAddress,
          tokenSymbol: tokenSymbol,
          currentBalance: ethers.formatUnits(tokenBalance, decimals),
          requestedAmount: amount.toString()
        });
      }

      // Transfer tokens
      console.log(`Transferring ${amount} tokens (${amountInWei.toString()} with ${decimals} decimals)`);
      const tx = await tokenContract.transfer(toAddress, amountInWei);
      const receipt = await tx.wait();

      const tokenSymbol = await tokenContract.symbol().catch(() => 'TOKEN');
      const tokenName = await tokenContract.name().catch(() => 'Token');

      return res.json({
        success: true,
        type: 'ERC20',
        transactionHash: receipt.hash,
        from: wallet.address,
        to: toAddress,
        tokenAddress: tokenAddress,
        tokenName: tokenName,
        tokenSymbol: tokenSymbol,
        amount: amount,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        explorerUrl: `https://shannon-explorer.somnia.network/tx/${receipt.hash}`
      });
    }

    // Native token transfer (original behavior)
    console.log('Transferring native token (STT)');
    const balance = await provider.getBalance(wallet.address);
    const amountInWei = ethers.parseEther(amount.toString());

    if (balance < amountInWei) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
        currentBalance: ethers.formatEther(balance)
      });
    }

    const tx = {
      to: toAddress,
      value: amountInWei,
    };

    const transactionResponse = await wallet.sendTransaction(tx);
    const receipt = await transactionResponse.wait();

    return res.json({
      success: true,
      type: 'native',
      transactionHash: receipt.hash,
      from: wallet.address,
      to: toAddress,
      amount: amount,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      explorerUrl: `https://shannon-explorer.somnia.network/tx/${receipt.hash}`
    });

  } catch (error) {
    console.error('Transfer error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      details: error.reason || error.code
    });
  }
});

// Deploy ERC20 Token endpoint using TokenFactory
app.post('/deploy-token', async (req, res) => {
  try {
    const { 
      privateKey, 
      name, 
      symbol, 
      initialSupply 
    } = req.body;

    // Validation
    if (!privateKey || !name || !symbol || !initialSupply) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: privateKey, name, symbol, initialSupply'
      });
    }

    const provider = new ethers.JsonRpcProvider(SOMNIA_TESTNET_RPC);
    const wallet = new ethers.Wallet(privateKey, provider);

    // Check balance for gas
    const balance = await provider.getBalance(wallet.address);
    console.log('Wallet balance:', ethers.formatEther(balance), 'STT');
    
    if (balance === 0n) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance for gas fees',
        currentBalance: ethers.formatEther(balance),
        required: 'Some testnet tokens for gas'
      });
    }

    console.log('Creating token via TokenFactory:', { name, symbol, initialSupply });
    console.log('Factory address:', FACTORY_ADDRESS);

    // Connect to TokenFactory contract
    const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, wallet);

    // Convert initialSupply to BigInt (assuming it's provided as a number/string)
    const initialSupplyBigInt = BigInt(initialSupply.toString());

    // Estimate gas before sending transaction (for logging and optional gas limit)
    console.log('Estimating gas for createToken...');
    let gasEstimate;
    let estimatedCost = null;
    try {
      gasEstimate = await factory.createToken.estimateGas(name, symbol, initialSupplyBigInt);
      console.log('Estimated gas:', gasEstimate.toString());
      
      // Get current gas price for informational purposes only
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || feeData.maxFeePerGas;
      
      if (gasPrice && gasPrice > 0n) {
        estimatedCost = gasEstimate * gasPrice;
        console.log('Estimated transaction cost:', ethers.formatEther(estimatedCost), 'STT');
        console.log('Gas price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei');
        
        // Only warn if balance seems insufficient, but don't block the transaction
        // Let the network reject it if truly insufficient
        if (balance < estimatedCost) {
          console.warn('⚠️  Warning: Balance may be insufficient for transaction');
          console.warn('   Balance:', ethers.formatEther(balance), 'STT');
          console.warn('   Estimated cost:', ethers.formatEther(estimatedCost), 'STT');
          // Continue anyway - let the transaction fail naturally if needed
        }
      }
    } catch (estimateError) {
      console.warn('Gas estimation failed (will proceed anyway):', estimateError.message);
      // If estimation fails, we'll still try to send - ethers will handle it
      gasEstimate = null;
    }

    // Create token via factory with estimated gas
    console.log('Sending createToken transaction...');
    let tx;
    if (gasEstimate) {
      // Add 20% buffer to gas estimate
      const gasLimit = (gasEstimate * 120n) / 100n;
      console.log('Using gas limit:', gasLimit.toString());
      tx = await factory.createToken(name, symbol, initialSupplyBigInt, { gasLimit });
    } else {
      // Let ethers estimate automatically if our estimation failed
      tx = await factory.createToken(name, symbol, initialSupplyBigInt);
    }
    console.log('Transaction hash:', tx.hash);
    console.log('Waiting for confirmation...');

    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    console.log('Transaction confirmed in block:', receipt.blockNumber);

    // Parse the TokenCreated event to get the token address
    const factoryInterface = new ethers.Interface(FACTORY_ABI);
    let newTokenAddress = null;
    
    for (const log of receipt.logs) {
      try {
        const parsedLog = factoryInterface.parseLog(log);
        if (parsedLog && parsedLog.name === 'TokenCreated') {
          newTokenAddress = parsedLog.args.tokenAddress;
          break;
        }
      } catch (e) {
        // Not the event we're looking for
      }
    }

    if (!newTokenAddress) {
      throw new Error('TokenCreated event not found in transaction receipt. Token creation may have failed.');
    }

    console.log('Token created at address:', newTokenAddress);

    // Optionally get token info from factory
    let tokenInfo = null;
    try {
      const info = await factory.getTokenInfo(newTokenAddress);
      tokenInfo = {
        name: info.name,
        symbol: info.symbol,
        initialSupply: info.initialSupply.toString(),
        currentSupply: ethers.formatUnits(info.currentSupply, 18),
        creator: info.creator,
        owner: info.owner,
        deployedAt: new Date(Number(info.deployedAt) * 1000).toISOString()
      };
    } catch (infoError) {
      console.warn('Could not fetch token info from factory:', infoError.message);
      // Fallback to basic info
      tokenInfo = {
        name,
        symbol,
        initialSupply: initialSupply.toString()
      };
    }

    return res.json({
      success: true,
      message: 'Token created successfully via TokenFactory',
      contractAddress: newTokenAddress,
      tokenInfo: tokenInfo,
      creator: wallet.address,
      factoryAddress: FACTORY_ADDRESS,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      explorerUrl: `https://shannon-explorer.somnia.network/tx/${tx.hash}`
    });

  } catch (error) {
    console.error('Deploy token error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      details: error.reason || error.code
    });
  }
});

app.post('/swap', async (req, res) => {
  try {
    const { 
      privateKey, 
      tokenIn, 
      tokenOut, 
      amountIn, 
      slippageTolerance = 3 
    } = req.body;

    if (!privateKey || !tokenIn || !tokenOut || !amountIn) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: privateKey, tokenIn, tokenOut, amountIn'
      });
    }

    const provider = new ethers.JsonRpcProvider(SOMNIA_TESTNET_RPC);
    const wallet = new ethers.Wallet(privateKey, provider);

    const SWAP_ROUTER_ADDRESS = '0x6aac14f090a35eea150705f72d90e4cdc4a49b2c';
    const FEE = 500;

    const TOKEN_ABI = [
      'function approve(address spender, uint256 amount) returns (bool)',
      'function decimals() view returns (uint8)',
      'function allowance(address owner, address spender) view returns (uint256)'
    ];

    const SWAP_ROUTER_ABI = [
      {
        "inputs": [
          {
            "components": [
              {"name": "tokenIn", "type": "address"},
              {"name": "tokenOut", "type": "address"},
              {"name": "fee", "type": "uint24"},
              {"name": "recipient", "type": "address"},
              {"name": "amountIn", "type": "uint256"},
              {"name": "amountOutMinimum", "type": "uint256"},
              {"name": "sqrtPriceLimitX96", "type": "uint160"}
            ],
            "name": "params",
            "type": "tuple"
          }
        ],
        "name": "exactInputSingle",
        "outputs": [{"name": "amountOut", "type": "uint256"}],
        "stateMutability": "payable",
        "type": "function"
      }
    ];

    const tokenContract = new ethers.Contract(tokenIn, TOKEN_ABI, wallet);
    const decimals = await tokenContract.decimals();
    const amountInWei = ethers.parseUnits(amountIn.toString(), decimals);

    const amountOutMin = (amountInWei * BigInt(100 - slippageTolerance)) / BigInt(100);

    const currentAllowance = await tokenContract.allowance(wallet.address, SWAP_ROUTER_ADDRESS);
    
    let approveTxHash = null;
    if (currentAllowance < amountInWei) {
      console.log('Approving token...');
      const approveTx = await tokenContract.approve(SWAP_ROUTER_ADDRESS, amountInWei);
      const approveReceipt = await approveTx.wait();
      approveTxHash = approveReceipt.hash;
      console.log('Approval successful:', approveTxHash);
    }

    const swapRouter = new ethers.Contract(SWAP_ROUTER_ADDRESS, SWAP_ROUTER_ABI, wallet);

    const swapParams = {
      tokenIn: tokenIn,
      tokenOut: tokenOut,
      fee: FEE,
      recipient: wallet.address,
      amountIn: amountInWei,
      amountOutMinimum: amountOutMin,
      sqrtPriceLimitX96: 0
    };

    const swapTx = await swapRouter.exactInputSingle(
      swapParams,
      {
        gasLimit: 500000
      }
    );

    const swapReceipt = await swapTx.wait();

    return res.json({
      success: true,
      wallet: wallet.address,
      tokenIn,
      tokenOut,
      amountIn: amountIn.toString(),
      slippageTolerance,
      approveTxHash,
      swapTxHash: swapReceipt.hash,
      blockNumber: swapReceipt.blockNumber,
      gasUsed: swapReceipt.gasUsed.toString(),
      explorerUrl: `https://shannon-explorer.somnia.network/tx/${swapReceipt.hash}`
    });

  } catch (error) {
    console.error('Swap error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      details: error.reason || error.code
    });
  }
});

app.post('/swap-ping-pong', async (req, res) => {
  try {
    const { privateKey, amount, slippageTolerance = 3 } = req.body;

    if (!privateKey || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: privateKey, amount'
      });
    }

    const PING_ADDRESS = '0xbecd9b5f373877881d91cbdbaf013d97eb532154';
    const PONG_ADDRESS = '0x7968ac15a72629e05f41b8271e4e7292e0cc9f90';

    const provider = new ethers.JsonRpcProvider(SOMNIA_TESTNET_RPC);
    const wallet = new ethers.Wallet(privateKey, provider);

    const SWAP_ROUTER_ADDRESS = '0x6aac14f090a35eea150705f72d90e4cdc4a49b2c';
    const FEE = 500;

    const TOKEN_ABI = [
      'function approve(address spender, uint256 amount) returns (bool)',
      'function decimals() view returns (uint8)',
      'function allowance(address owner, address spender) view returns (uint256)'
    ];

    const SWAP_ROUTER_ABI = [
      {
        "inputs": [
          {
            "components": [
              {"name": "tokenIn", "type": "address"},
              {"name": "tokenOut", "type": "address"},
              {"name": "fee", "type": "uint24"},
              {"name": "recipient", "type": "address"},
              {"name": "amountIn", "type": "uint256"},
              {"name": "amountOutMinimum", "type": "uint256"},
              {"name": "sqrtPriceLimitX96", "type": "uint160"}
            ],
            "name": "params",
            "type": "tuple"
          }
        ],
        "name": "exactInputSingle",
        "outputs": [{"name": "amountOut", "type": "uint256"}],
        "stateMutability": "payable",
        "type": "function"
      }
    ];

    const tokenContract = new ethers.Contract(PING_ADDRESS, TOKEN_ABI, wallet);
    const decimals = await tokenContract.decimals();
    const amountInWei = ethers.parseUnits(amount.toString(), decimals);
    const amountOutMin = (amountInWei * BigInt(100 - slippageTolerance)) / BigInt(100);

    const currentAllowance = await tokenContract.allowance(wallet.address, SWAP_ROUTER_ADDRESS);
    
    let approveTxHash = null;
    if (currentAllowance < amountInWei) {
      const approveTx = await tokenContract.approve(SWAP_ROUTER_ADDRESS, amountInWei);
      const approveReceipt = await approveTx.wait();
      approveTxHash = approveReceipt.hash;
    }

    const swapRouter = new ethers.Contract(SWAP_ROUTER_ADDRESS, SWAP_ROUTER_ABI, wallet);

    const swapParams = {
      tokenIn: PING_ADDRESS,
      tokenOut: PONG_ADDRESS,
      fee: FEE,
      recipient: wallet.address,
      amountIn: amountInWei,
      amountOutMinimum: amountOutMin,
      sqrtPriceLimitX96: 0
    };

    const swapTx = await swapRouter.exactInputSingle(
      swapParams,
      {
        gasLimit: 500000
      }
    );

    const swapReceipt = await swapTx.wait();

    return res.json({
      success: true,
      wallet: wallet.address,
      swap: '$PING -> $PONG',
      amount: amount.toString(),
      slippageTolerance,
      approveTxHash,
      swapTxHash: swapReceipt.hash,
      blockNumber: swapReceipt.blockNumber,
      gasUsed: swapReceipt.gasUsed.toString(),
      explorerUrl: `https://shannon-explorer.somnia.network/tx/${swapReceipt.hash}`
    });

  } catch (error) {
    console.error('Swap error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      details: error.reason || error.code
    });
  }
});

app.get('/balance/:address/:token', async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(SOMNIA_TESTNET_RPC);
    const tokenAbi = [
      'function balanceOf(address) view returns (uint256)',
      'function decimals() view returns (uint8)',
      'function symbol() view returns (string)',
      'function name() view returns (string)'
    ];
    
    const contract = new ethers.Contract(req.params.token, tokenAbi, provider);
    const balance = await contract.balanceOf(req.params.address);
    const decimals = await contract.decimals();
    const symbol = await contract.symbol();
    const name = await contract.name();
    
    res.json({
      address: req.params.address,
      token: req.params.token,
      name,
      symbol,
      balance: ethers.formatUnits(balance, decimals),
      balanceWei: balance.toString(),
      decimals: Number(decimals)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/balance/:address', async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(SOMNIA_TESTNET_RPC);
    const balance = await provider.getBalance(req.params.address);
    
    res.json({
      address: req.params.address,
      balance: ethers.formatEther(balance),
      balanceWei: balance.toString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', network: 'Somnia Testnet' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Network: Somnia Testnet`);
});

module.exports = app;