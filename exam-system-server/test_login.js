const http = require('http');

const data = JSON.stringify({
    username: 'student',
    password: '123456',
    role: 'STUDENT'
});

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
};

const req = http.request(options, res => {
    console.log('状态码:', res.statusCode);
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        console.log('响应:', body);
        try {
            const json = JSON.parse(body);
            if (json.success) {
                console.log('✅ 登录成功！');
                console.log('用户信息:', json.data);
            } else {
                console.log('❌ 登录失败:', json.message);
            }
        } catch (e) {
            console.log('解析错误:', e.message);
        }
    });
});

req.on('error', e => {
    console.error('请求错误:', e.message);
    console.log('\n请确保后端服务器正在运行：http://localhost:3001');
});

req.write(data);
req.end();

console.log('正在测试后端登录接口...\n');
