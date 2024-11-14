const Web3 = require('web3');

// 随机延时函数 (1-10秒)
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getRandomDelay() {
    return Math.floor(Math.random() * 9000) + 1000; // 1000-10000ms (1-10秒)
}

async function sendTransaction() {
    try {
        // 连接到RPC
        const web3 = new Web3('https://rivalz2.rpc.caldera.xyz');
        
        // 合约地址
        const contractAddress = '0xF0a66d18b46D4D5dd9947914ab3B2DDbdC19C2C0';
        
        // 创建钱包实例
        const privateKey = '0xe9b8e55b18db5c01e39137b5241abef8599a172aad9011a94b08818bb9e657d2';     //  填入你的私钥
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        web3.eth.accounts.wallet.add(account);

        // 执行20次交易
        for (let i = 1; i <= 20; i++) {
            try {
                // 获取当前gas价格和nonce
                const gasPrice = await web3.eth.getGasPrice();
                const nonce = await web3.eth.getTransactionCount(account.address);
                
                // 构建交易对象
                const tx = {
                    from: account.address,
                    to: contractAddress,
                    value: '0x0', // 0 ETH
                    data: '0x4e71d92d', // 方法ID
                    gas: 300000, // gas限制
                    gasPrice: gasPrice,
                    nonce: nonce
                };
                
                console.log(`\n正在发送第 ${i}/20 次交易...`);
                
                // 发送交易
                const receipt = await web3.eth.sendTransaction(tx);
                console.log(`第 ${i} 次交易已确认！`);
                console.log('交易哈希:', receipt.transactionHash);

                // 如果不是最后一次交易，则添加随机延时
                if (i < 20){
                    const delay = await getRandomDelay();
                    console.log(`等待 ${delay/1000} 秒后进行下一次交易...`);
                    await sleep(delay);
                }
                
            } catch (error) {
                console.error(`第 ${i} 次交易失败:`, error);
                // 如果某次交易失败，继续进行下一次
                continue;
            }
        }
        
        console.log('\n所有交易已完成！');
        
    } catch (error) {
        console.error('程序发生错误:', error);
    }
}

// 执行交易
sendTransaction();

module.exports = {
    sendTransaction
};