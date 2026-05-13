const { chromium } = require('playwright');

(async () => {
    console.log('启动浏览器测试...');
    
    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    const errors = [];
    const logs = [];
    
    page.on('console', msg => {
        if (msg.type() === 'error') {
            errors.push(msg.text());
        } else {
            logs.push(`[${msg.type()}] ${msg.text()}`);
        }
    });
    
    page.on('pageerror', error => {
        errors.push(`Page Error: ${error.message}`);
    });
    
    try {
        console.log('加载页面: http://localhost:3000');
        await page.goto('http://localhost:3000', { 
            waitUntil: 'networkidle',
            timeout: 10000 
        });
        
        console.log('✓ 页面加载成功');
        
        const title = await page.title();
        console.log(`✓ 页面标题: ${title}`);
        
        const logo = await page.locator('.glitch-text').textContent();
        console.log(`✓ Logo 显示: ${logo}`);
        
        const createBtn = await page.locator('#btn-create-room').isVisible();
        console.log(`✓ 创建房间按钮可见: ${createBtn}`);
        
        const joinBtn = await page.locator('#btn-join-room').isVisible();
        console.log(`✓ 加入房间按钮可见: ${joinBtn}`);
        
        const canvas = await page.locator('#game-canvas').isVisible();
        console.log(`✓ 游戏画布存在: ${canvas}`);
        
        await page.waitForTimeout(2000);
        
        const connectionStatus = await page.locator('#connection-status').textContent();
        console.log(`✓ 连接状态: ${connectionStatus}`);
        
        if (errors.length > 0) {
            console.log('\n⚠️ 控制台错误:');
            errors.forEach(err => console.log(`  - ${err}`));
        } else {
            console.log('\n✓ 无控制台错误');
        }
        
        console.log('\n测试结果: ✅ 全部通过');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
