function log(message, type = 'info') {
    const output = document.getElementById('output');
    const timestamp = new Date().toLocaleTimeString();
    let className = '';
    
    switch(type) {
        case 'success':
            className = 'success';
            break;
        case 'error':
            className = 'error';
            break;
        case 'pending':
            className = 'pending';
            break;
    }
    
    output.innerHTML += `<div class="${className}">[${timestamp}] ${message}</div>`;
    output.scrollTop = output.scrollHeight;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getRandomDelay() {
    return Math.floor(Math.random() * 9000) + 1000;
}

async function startTransactions() {
    try {
        let fromAddress;
        let web3;

        // 获取表单元素
        const privateKeyInput = document.getElementById('privateKey');
        const contractAddressInput = document.getElementById('contractAddress');
        const gasLimitInput = document.getElementById('gasLimit');
        const methodIdInput = document.getElementById('methodId');
        const txCountInput = document.getElementById('txCount');
        const rpcUrlInput = document.getElementById('rpcUrl');
        const chainSelect = document.getElementById('chainSelect');

        // 检查并设置默认值
        if (!chainSelect) {
            console.error('Chain select element not found');
            throw new Error('无法找到链选择器');
        }

        // 如果没有选择链，默认设置为 Rivalz2
        if (!chainSelect.value) {
            chainSelect.value = 'rivalz2';
        }

        // 设置默认 RPC URL
        const selectedChain = chainConfigs[chainSelect.value];
        const rpcUrl = selectedChain?.rpcUrl || 'https://rivalz2.rpc.caldera.xyz';

        // 验证必要的表单元素
        if (!privateKeyInput) {
            console.error('Private key input not found');
            throw new Error('无法找到私钥输入框');
        }
        if (!contractAddressInput) {
            console.error('Contract address input not found');
            throw new Error('无法找到合约地址输入框');
        }
        if (!gasLimitInput) {
            console.error('Gas limit input not found');
            throw new Error('无法找到 Gas 限制输入框');
        }
        if (!methodIdInput) {
            console.error('Method ID input not found');
            throw new Error('无法找到方法 ID 输入框');
        }
        if (!txCountInput) {
            console.error('Transaction count input not found');
            throw new Error('无法找到交易次数输入框');
        }

        // 设置默认值
        if (!contractAddressInput.value) {
            contractAddressInput.value = '0xF0a66d18b46D4D5dd9947914ab3B2DDbdC19C2C0';
        }
        if (!gasLimitInput.value) {
            gasLimitInput.value = '300000';
        }
        if (!methodIdInput.value) {
            methodIdInput.value = '0x4e71d92d';
        }
        if (!txCountInput.value) {
            txCountInput.value = '1';
        }

        // 获取交易次数并确保是数字
        const txCount = parseInt(txCountInput.value) || 1;
        if (isNaN(txCount) || txCount <= 0) {
            throw new Error('请输入有效的交易次数');
        }

        // 清空输出区域
        const outputElement = document.getElementById('output');
        if (outputElement) {
            outputElement.innerHTML = '';
        }
        log(translations[currentLang].startTx, 'info');

        if (isWalletConnected) {
            // 使用 MetaMask
            web3 = web3Instance;
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            fromAddress = accounts[0];
        } else {
            // 使用私钥
            const privateKey = privateKeyInput.value.trim();
            if (!privateKey) {
                log(translations[currentLang].inputPrivateKey, 'error');
                return;
            }

            // 获取 RPC URL
            const rpcUrl = selectedChain.rpcUrl;
            web3 = new Web3(rpcUrl);
            log(`连接到网络: ${selectedChain.name}`, 'info');

            try {
                const account = web3.eth.accounts.privateKeyToAccount(privateKey);
                web3.eth.accounts.wallet.add(account);
                fromAddress = account.address;
                log(`钱包地址: ${fromAddress}`, 'info');
            } catch (error) {
                log('私钥格式错误: ' + error.message, 'error');
                return;
            }
        }

        // 执行交易
        for (let i = 1; i <= txCount; i++) {
            try {
                const gasPrice = await web3.eth.getGasPrice();
                const nonce = await web3.eth.getTransactionCount(fromAddress);
                
                log(`正在构建第 ${i}/${txCount} 笔交易...`, 'pending');
                log(`Gas Price: ${web3.utils.fromWei(gasPrice, 'gwei')} Gwei`, 'info');
                
                const tx = {
                    from: fromAddress,
                    to: contractAddressInput.value.trim(),
                    value: '0x0',
                    data: methodIdInput.value.trim(),
                    gas: gasLimitInput.value.trim(),
                    gasPrice: gasPrice,
                    nonce: nonce
                };

                log(`请在钱包中确认交易 ${i}/${txCount}...`, 'pending');

                let receipt;
                if (isWalletConnected) {
                    // 使用 MetaMask 发送交易，会自动弹出签名确认
                    receipt = await window.ethereum.request({
                        method: 'eth_sendTransaction',
                        params: [tx],
                    });
                    log(`交易已提交到链上: ${receipt}`, 'success');
                    
                    // 等待交易确认
                    log('等待交易确认...', 'pending');
                    let confirmedReceipt = null;
                    while (!confirmedReceipt) {
                        try {
                            confirmedReceipt = await web3.eth.getTransactionReceipt(receipt);
                            await sleep(2000); // 每2秒检查一次
                        } catch (e) {
                            console.log('等待确认中...');
                        }
                    }
                    
                    if (confirmedReceipt.status) {
                        log(`交易 ${i} 已确认`, 'success');
                        log(`交易哈希: ${receipt}`, 'success');
                        log(`区块号: ${confirmedReceipt.blockNumber}`, 'success');
                        log(`Gas Used: ${confirmedReceipt.gasUsed}`, 'info');
                    } else {
                        throw new Error('交易执行失败');
                    }
                } else {
                    // 使用私钥发送交易
                    receipt = await web3.eth.sendTransaction(tx);
                    log(`交易 ${i} 已确认`, 'success');
                    log(`交易哈希: ${receipt.transactionHash}`, 'success');
                    log(`区块号: ${receipt.blockNumber}`, 'success');
                    log(`Gas Used: ${receipt.gasUsed}`, 'info');
                }

                if (i < txCount) {
                    const delay = await getRandomDelay();
                    log(`等待 ${(delay/1000).toFixed(1)} 秒后发送下一笔交易...`, 'pending');
                    await sleep(delay);
                }
            } catch (error) {
                if (error.code === 4001) {
                    log('用户取消了交易签名', 'error');
                    break;
                }
                log(`交易 ${i} 失败: ${error.message}`, 'error');
                if (error.message.includes('insufficient funds')) {
                    log('错误原因: 余额不足', 'error');
                    break; // 如果是余额不足，直接终止后续交易
                }
                continue;
            }
        }
        
        log('所有交易执行完成', 'success');
        
    } catch (error) {
        log(`发生错误: ${error.message}`, 'error');
        console.error('Transaction error:', error);
    }
}

// 更新翻译对象，确保包含所有文本
const translations = {
    zh: {
        title: 'Web3 交易工具',
        subtitle: '自动化交易执行工具',
        connectWallet: '连接钱包',
        connected: '已连接',
        gasPrice: '当前 Gas 价格',
        ethPrice: 'ETH 价格',
        rpcUrl: 'RPC URL',
        contractAddress: '合约地址',
        privateKey: '私钥',
        gasLimit: 'Gas 限制',
        methodId: '方法 ID (十六进制)',
        txCount: '交易次数',
        startTx: '开始交易',
        inputPrivateKey: '输入你的私钥',
        installMetamask: '请安装 MetaMask!',
        walletConnectError: '钱包连接失败',
        copyright: '© 2024 Web3 Tool. All rights reserved.',
        startTransaction: '开始交易',
        walletAddress: '钱包地址',
        transactionSuccess: '交易成功',
        transactionFailed: '交易失败',
        waitingNext: '等待下一次交易',
        allCompleted: '所有交易已完成',
        errorOccurred: '发生错误',
        selectChain: '选择公链',
        ethereum: '以太坊',
        bnbChain: 'BNB Chain',
        rivalz2: 'Rivalz2'
    },
    en: {
        title: 'Web3 Transaction Tool',
        subtitle: 'Automated Transaction Tool',
        connectWallet: 'Connect Wallet',
        connected: 'Connected',
        gasPrice: 'Current Gas Price',
        ethPrice: 'ETH Price',
        rpcUrl: 'RPC URL',
        contractAddress: 'Contract Address',
        privateKey: 'Private Key',
        gasLimit: 'Gas Limit',
        methodId: 'Method ID (Hex)',
        txCount: 'Transaction Count',
        startTx: 'Start Transaction',
        inputPrivateKey: 'Enter your private key',
        installMetamask: 'Please install MetaMask!',
        walletConnectError: 'Wallet connection failed',
        copyright: '© 2024 Web3 Tool. All rights reserved.',
        startTransaction: 'Start Transaction',
        walletAddress: 'Wallet Address',
        transactionSuccess: 'Transaction Success',
        transactionFailed: 'Transaction Failed',
        waitingNext: 'Waiting for next transaction',
        allCompleted: 'All transactions completed',
        errorOccurred: 'Error occurred',
        selectChain: 'Select Chain',
        ethereum: 'Ethereum',
        bnbChain: 'BNB Chain',
        rivalz2: 'Rivalz2'
    }
};

// 添加链的配置
const chainConfigs = {
    rivalz2: {
        name: 'Rivalz2',
        chainId: '0x1234',
        rpcUrl: 'https://rivalz2.rpc.caldera.xyz',
        symbol: 'RVZ',
        explorer: 'https://rivalz2.explorer.caldera.xyz'
    },
    eth: {
        name: '以太坊主网',
        chainId: '0x1',
        rpcUrl: 'https://mainnet.infura.io',
        symbol: 'ETH',
        explorer: 'https://etherscan.io'
    },
    arbitrum: {
        name: 'Arbitrum One',
        chainId: '0xa4b1',
        rpcUrl: 'https://arb1.arbitrum.io/rpc',
        symbol: 'ETH',
        explorer: 'https://arbiscan.io'
    },
    optimism: {
        name: 'Optimism',
        chainId: '0xa',
        rpcUrl: 'https://mainnet.optimism.io',
        symbol: 'ETH',
        explorer: 'https://optimistic.etherscan.io'
    },
    base: {
        name: 'Base',
        chainId: '0x2105',
        rpcUrl: 'https://mainnet.base.org',
        symbol: 'ETH',
        explorer: 'https://basescan.org'
    },
    bnb: {
        name: 'BNB Chain',
        chainId: '0x38',
        rpcUrl: 'https://bsc-dataseed.binance.org',
        symbol: 'BNB',
        explorer: 'https://bscscan.com'
    }
};

let currentLang = localStorage.getItem('language') || 'zh';
let web3Instance = null;
let isWalletConnected = false;

// 添加 Web3 初始化函数
async function initWeb3() {
    if (window.ethereum) {
        try {
            console.log('Modern dapp browser detected');
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            web3Instance = new Web3(window.ethereum);
            console.log('Web3 initialized with ethereum provider');
            return true;
        } catch (error) {
            console.error('User denied account access:', error);
            return false;
        }
    } else if (window.web3) {
        web3Instance = new Web3(window.web3.currentProvider);
        console.log('Web3 initialized with legacy web3 provider');
        return true;
    } else {
        console.log('No web3 instance detected, using default RPC URL');
        web3Instance = new Web3('https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY');
        return false;
    }
}

// 修改钱包连接功能
async function connectWallet() {
    try {
        // 初始化 Web3
        const initialized = await initWeb3();
        if (!initialized) {
            alert('请安装 MetaMask 或使用支持的 Web3 钱包！');
            return null;
        }

        // 获取账户
        const accounts = await web3Instance.eth.getAccounts();
        console.log('Connected accounts:', accounts);

        if (accounts && accounts.length > 0) {
            isWalletConnected = true;
            const shortAddress = `${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`;
            
            // 更新钱包按钮状态和下拉菜单
            const walletBtn = document.getElementById('connectWallet');
            walletBtn.innerHTML = `
                <i class="fas fa-wallet"></i>
                <span>${shortAddress}</span>
                <div class="wallet-dropdown">
                    <button onclick="switchNetwork()" class="dropdown-item">
                        <i class="fas fa-exchange-alt"></i> 切换网络
                    </button>
                    <button onclick="disconnectWallet()" class="dropdown-item">
                        <i class="fas fa-sign-out-alt"></i> 断开连接
                    </button>
                </div>
            `;
            walletBtn.classList.add('connected');

            // 连接成功后禁用私钥输入框
            const privateKeyInput = document.getElementById('privateKey');
            if (privateKeyInput) {
                privateKeyInput.value = '已连接钱包，无需输入私钥';
                privateKeyInput.disabled = true;
                privateKeyInput.style.backgroundColor = '#f5f5f5';
                privateKeyInput.style.color = '#666';
            }

            return accounts[0];
        }
    } catch (error) {
        console.error('Wallet connection error:', error);
        alert('连接钱包失败: ' + error.message);
        return null;
    }
}

// 添加断开钱包功能
async function disconnectWallet() {
    isWalletConnected = false;
    const walletStatus = document.getElementById('walletStatus');
    walletStatus.innerHTML = translations[currentLang].connectWallet;
    walletStatus.classList.remove('connected');

    // 启用私钥输入
    const privateKeyInput = document.getElementById('privateKey');
    if (privateKeyInput) {
        privateKeyInput.value = '';
        privateKeyInput.disabled = false;
        privateKeyInput.style.backgroundColor = '';
        privateKeyInput.style.color = '';
    }
}

// 修改网络切换函数
async function switchNetwork(targetNetwork = 'rivalz2') {
    try {
        const selectedChain = chainConfigs[targetNetwork];
        if (!selectedChain) {
            throw new Error('未选择有效的网络');
        }

        try {
            // 尝试切换到选定的网络
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: selectedChain.chainId }],
            });
        } catch (switchError) {
            // 如果网络不存在，则添加网络
            if (switchError.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: selectedChain.chainId,
                        chainName: selectedChain.name,
                        nativeCurrency: {
                            name: selectedChain.symbol,
                            symbol: selectedChain.symbol,
                            decimals: 18
                        },
                        rpcUrls: [selectedChain.rpcUrl],
                        blockExplorerUrls: [selectedChain.explorer]
                    }]
                });
            } else {
                throw switchError;
            }
        }
        
        log(`已切换到 ${selectedChain.name}`, 'success');
    } catch (error) {
        log(`切换网络失败: ${error.message}`, 'error');
        console.error('Network switch failed:', error);
    }
}

// 修改初始化函数
async function initializePage() {
    try {
        console.log('Initializing page...');
        
        // 检查是否已连接钱包
        if (window.ethereum) {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                // 如果已经连接了钱包，自动连接并切换到 Rivalz2
                await connectWallet();
            }
        }
        
        // 初始化链选择器
        const chainSelect = document.getElementById('chainSelect');
        if (chainSelect) {
            chainSelect.value = 'rivalz2'; // 设置默认选择为 Rivalz2
        }

        // 设置默认值
        const defaultValues = {
            'contractAddress': '0xF0a66d18b46D4D5dd9947914ab3B2DDbdC19C2C0',
            'gasLimit': '300000',
            'methodId': '0x4e71d92d',
            'txCount': '1'
        };

        // 设置各输入框的默认值
        Object.entries(defaultValues).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element && !element.value) {
                element.value = value;
            }
        });
        
        // 初始化 Web3
        await initWeb3();
        
        // 更新语言
        updateLanguage();
        
        // 立即更新价格
        await updateAllPrices();
        
        // 设置价格更新间隔
        setInterval(updateAllPrices, 1000);
        
        console.log('Page initialization completed');
    } catch (error) {
        console.error('Initialization error:', error);
        log('初始化失败: ' + error.message, 'error');
    }
}

// 确保在页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing...');
    initializePage();
    
    // 设置事件监听器
    const langToggle = document.getElementById('languageToggle');
    if (langToggle) {
        langToggle.addEventListener('click', () => {
            currentLang = currentLang === 'zh' ? 'en' : 'zh';
            updateLanguage();
        });
    }
    
    const walletBtn = document.getElementById('connectWallet');
    if (walletBtn) {
        walletBtn.addEventListener('click', connectWallet);
    }

    // 添加链选择器事件监听
    const chainSelect = document.getElementById('chainSelect');
    const customRpc = document.getElementById('customRpc');
    
    if (chainSelect) {
        chainSelect.addEventListener('change', function(e) {
            if (e.target.value === 'custom') {
                customRpc.style.display = 'block';
                customRpc.value = '';
            } else {
                customRpc.style.display = 'none';
                const selectedChain = chainConfigs[e.target.value];
                if (selectedChain && isWalletConnected) {
                    switchNetwork(selectedChain.chainId);
                }
                // 更新 RPC URL
                document.getElementById('rpcUrl').value = selectedChain.rpcUrl;
            }
        });
    }

    if (customRpc) {
        customRpc.addEventListener('change', function(e) {
            document.getElementById('rpcUrl').value = e.target.value;
        });
    }
});

// 修改语言切换功能
function updateLanguage() {
    try {
        // 更新所有带有 data-i18n 属性的元素
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (translations[currentLang][key]) {
                if (element.tagName === 'INPUT' && element.getAttribute('placeholder')) {
                    element.placeholder = translations[currentLang][key];
                } else {
                    element.textContent = translations[currentLang][key];
                }
            }
        });

        // 更新所有标签文本
        document.querySelectorAll('label').forEach(label => {
            const forAttr = label.getAttribute('for');
            if (forAttr && translations[currentLang][forAttr]) {
                label.textContent = translations[currentLang][forAttr];
            }
        });

        // 更新按钮文本
        const startButton = document.querySelector('.button-container button');
        if (startButton) {
            startButton.textContent = translations[currentLang].startTransaction;
        }

        // 更新钱包状态文本
        if (!isWalletConnected) {
            document.getElementById('walletStatus').textContent = translations[currentLang].connectWallet;
        }

        // 更新统计卡片标题
        const statTitles = document.querySelectorAll('.stat-title');
        statTitles[0].textContent = translations[currentLang].gasPrice;
        statTitles[1].textContent = translations[currentLang].ethPrice;

        // 更新页脚版权信息
        document.querySelector('.footer div:first-child').textContent = translations[currentLang].copyright;

        console.log('Language updated to:', currentLang);
    } catch (error) {
        console.error('Language update error:', error);
    }
}

// 修改价格更新动画函数
function updatePriceWithAnimation(elementId, newValue, oldValue) {
    const element = document.getElementById(elementId);
    if (element) {
        const newPrice = parseFloat(newValue.replace(/[^0-9.]/g, ''));
        const oldPrice = parseFloat(oldValue.replace(/[^0-9.]/g, ''));
        
        element.classList.remove('price-up', 'price-down');
        element.style.transition = 'transform 0.3s ease, color 0.3s ease';
        
        element.textContent = newValue;
        
        if (newPrice > oldPrice) {
            element.classList.add('price-up');
            element.style.transform = 'scale(1.05)';
        } else if (newPrice < oldPrice) {
            element.classList.add('price-down');
            element.style.transform = 'scale(0.95)';
        }
        
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 300);
        
        setTimeout(() => {
            element.classList.remove('price-up', 'price-down');
        }, 1500);
    }
}

// 修改价格更新函数
async function updateAllPrices() {
    try {
        // 更新加密货币价格
        const symbols = ['ETHUSDT', 'BTCUSDT', 'SOLUSDT'];
        const responses = await Promise.all(
            symbols.map(symbol => 
                fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`)
                    .then(res => res.json())
            )
        );

        responses.forEach(data => {
            const price = parseFloat(data.price);
            const elementId = getPriceElementId(data.symbol);
            const element = document.getElementById(elementId);
            if (element) {
                const oldValue = element.textContent;
                const newValue = `$${price.toFixed(2)}`;
                updatePriceWithAnimation(elementId, newValue, oldValue);
                
                // 添加更新动画
                element.classList.add('price-update');
                setTimeout(() => {
                    element.classList.remove('price-update');
                }, 500);
            }
        });

        // 更新 Gas 价格
        const gasResponse = await fetch('https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=YOUR_ETHERSCAN_API_KEY');
        const gasData = await gasResponse.json();
        if (gasData.status === '1' && gasData.result) {
            const gasPrice = gasData.result.SafeGasPrice;
            const element = document.getElementById('gasPrice');
            if (element) {
                const oldValue = element.textContent;
                const newValue = `${gasPrice} Gwei`;
                updatePriceWithAnimation('gasPrice', newValue, oldValue);
            }
        }

    } catch (error) {
        console.error('Price update failed:', error);
    }
}

// 辅助函数：获取价格元素ID
function getPriceElementId(symbol) {
    switch(symbol) {
        case 'ETHUSDT':
            return 'ethPrice';
        case 'BTCUSDT':
            return 'btcPrice';
        case 'SOLUSDT':
            return 'solPrice';
        default:
            return null;
    }
}

// 处理账户变化
function handleAccountsChanged(accounts) {
    console.log('Accounts changed:', accounts);
    const privateKeyInput = document.getElementById('privateKey');
    
    if (accounts.length === 0) {
        // 用户断开钱包
        isWalletConnected = false;
        document.getElementById('walletStatus').textContent = translations[currentLang].connectWallet;
        
        // 启用私钥输入
        if (privateKeyInput) {
            privateKeyInput.value = '';
            privateKeyInput.disabled = false;
            privateKeyInput.style.backgroundColor = '';
            privateKeyInput.style.color = '';
        }
    } else {
        // 更新当前连接的账户
        const shortAddr = `${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`;
        document.getElementById('walletStatus').textContent = shortAddr;
        
        // 禁用私钥输入
        if (privateKeyInput) {
            privateKeyInput.value = '已连接钱包，无需输入私钥';
            privateKeyInput.disabled = true;
            privateKeyInput.style.backgroundColor = '#f5f5f5';
            privateKeyInput.style.color = '#666';
        }
    }
}

// 处理链变化
function handleChainChanged(chainId) {
    console.log('Chain changed:', chainId);
    window.location.reload();
}

// 添加页面加载完成检查
window.addEventListener('load', () => {
    console.log('页面加载完成');
    if (typeof window.ethereum !== 'undefined') {
        console.log('MetaMask 已加载');
    } else {
        console.log('MetaMask 未加载');
    }
});

// 修改初始化链选择器函数
function initChainSelector() {
    const rpcGroup = document.querySelector('.form-group:has(#rpcUrl)');
    const selectHtml = `
        <label for="chainSelect" data-i18n="selectChain">${translations[currentLang].selectChain}</label>
        <div class="chain-select-container">
            <select id="chainSelect" class="form-control">
                <option value="eth">以太坊主网</option>
                <option value="arbitrum">Arbitrum One</option>
                <option value="optimism">Optimism</option>
                <option value="base">Base</option>
                <option value="bnb">BNB Chain</option>
                <option value="rivalz2">Rivalz2</option>
                <option value="custom">自定义 RPC</option>
            </select>
            <input type="text" id="customRpc" class="form-control" placeholder="输入自定义 RPC URL" style="display: none;">
        </div>
    `;
    rpcGroup.innerHTML = selectHtml;
    
    // 添加链切换事件监听
    const chainSelect = document.getElementById('chainSelect');
    const customRpc = document.getElementById('customRpc');
    
    chainSelect.addEventListener('change', function(e) {
        if (e.target.value === 'custom') {
            customRpc.style.display = 'block';
            customRpc.value = '';
        } else {
            customRpc.style.display = 'none';
            const selectedChain = chainConfigs[e.target.value];
            if (selectedChain && isWalletConnected) {
                switchNetwork(selectedChain.chainId);
            }
        }
    });
}

// 添加网络切换函数
async function switchNetwork(chainId) {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainId }],
        });
    } catch (error) {
        console.error('Failed to switch network:', error);
    }
}

// 修改 Gas 价格更新函数，始终显示 ETH 主网的 Gas
async function updateGasPrice() {
    try {
        // 创建一个永远连接到以太坊主网的 Web3 实例
        const ethMainnetWeb3 = new Web3('https://eth-mainnet.g.alchemy.com/v2/your-api-key');
        const gasPrice = await ethMainnetWeb3.eth.getGasPrice();
        const gasPriceGwei = ethMainnetWeb3.utils.fromWei(gasPrice, 'gwei');
        const element = document.getElementById('gasPrice');
        if (element) {
            const oldValue = element.textContent;
            const newValue = `${parseFloat(gasPriceGwei).toFixed(2)} Gwei`;
            updatePriceWithAnimation('gasPrice', newValue, oldValue);
        }
    } catch (error) {
        console.error('ETH Gas price update failed:', error);
    }
} 